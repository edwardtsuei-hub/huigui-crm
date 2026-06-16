"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OrdersScaffold } from "../../../../components/orders/OrdersScaffold";
import {
  DataTable,
  EmptyState,
  FilterBar,
  SectionCard,
  StatusBadge,
} from "../../../../components/system/primitives";
import {
  createChannelPartner,
  createChannelSettlement,
  fetchChannelPartners,
  fetchChannelSettlements,
  fetchOrderDetail,
  fetchOrders,
  ORDER_PICKER_PAGE_SIZE,
  type ChannelPartnersListResponse,
  type ChannelSettlementsListResponse,
  type OrderDetailResponse,
  type OrderListItem,
} from "../../../../lib/orders";

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(value?: string | null) {
  if (!value) {
    return "未填写";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function settlementTone(status: string) {
  if (status === "SETTLED") {
    return "success" as const;
  }

  if (status === "PARTIAL" || status === "PENDING") {
    return "warning" as const;
  }

  return "neutral" as const;
}

type SettlementLineState = Record<
  string,
  {
    quantity: string;
    supplyUnitPrice: string;
    costUnitPrice: string;
    cashPaymentAmount: string;
    paymentNote: string;
    remark: string;
  }
>;

function buildLineState(
  detail: OrderDetailResponse | null,
): SettlementLineState {
  if (!detail) {
    return {};
  }

  return Object.fromEntries(
    detail.items.map((item) => [
      item.id,
      {
        quantity: item.quantity,
        supplyUnitPrice: item.unitPrice,
        costUnitPrice: "",
        cashPaymentAmount: "",
        paymentNote: "",
        remark: "",
      },
    ]),
  );
}

export default function ChannelSettlementsPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ChannelSettlementsListResponse | null>(null);
  const [partners, setPartners] = useState<ChannelPartnersListResponse | null>(
    null,
  );
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [selectedOrderDetail, setSelectedOrderDetail] =
    useState<OrderDetailResponse | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [partnerMessage, setPartnerMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [filters, setFilters] = useState({
    keyword: "",
    status: "",
    channelPartnerId: "",
  });
  const [settlementForm, setSettlementForm] = useState({
    channelPartnerId: "",
    orderId: "",
    periodStart: todayValue(),
    periodEnd: todayValue(),
    totalPaidAmount: "",
    status: "PENDING",
    remark: "",
    lines: {} as SettlementLineState,
  });
  const [partnerForm, setPartnerForm] = useState({
    partnerName: "",
    contactName: "",
    mobile: "",
    city: "",
    settlementRuleText: "",
    remark: "",
  });

  async function loadSettlements() {
    const query = new URLSearchParams();
    if (filters.keyword.trim()) {
      query.set("keyword", filters.keyword.trim());
    }
    if (filters.status) {
      query.set("status", filters.status);
    }
    if (filters.channelPartnerId) {
      query.set("channelPartnerId", filters.channelPartnerId);
    }

    const response = await fetchChannelSettlements(query);
    setData(response);
  }

  async function loadBootstrap() {
    const [partnerResponse, orderResponse] = await Promise.all([
      fetchChannelPartners(),
      fetchOrders(`pageSize=${ORDER_PICKER_PAGE_SIZE}`),
    ]);

    setPartners(partnerResponse);
    setOrders(orderResponse.items);

    const presetPartnerId = searchParams.get("partnerId") ?? "";
    const nextPartnerId =
      presetPartnerId ||
      settlementForm.channelPartnerId ||
      partnerResponse.items[0]?.id ||
      "";
    const nextOrderId =
      searchParams.get("orderId") ||
      settlementForm.orderId ||
      orderResponse.items.find(
        (item) =>
          item.channelPartnerId === nextPartnerId &&
          !["SETTLED", "NOT_REQUIRED"].includes(item.settlementStatus),
      )?.id ||
      "";

    setSettlementForm((current) => ({
      ...current,
      channelPartnerId: current.channelPartnerId || nextPartnerId,
      orderId: current.orderId || nextOrderId,
    }));
    setFilters((current) => ({
      ...current,
      channelPartnerId: current.channelPartnerId || presetPartnerId,
    }));
  }

  useEffect(() => {
    Promise.all([loadSettlements(), loadBootstrap()]).catch((requestError) =>
      setError(
        requestError instanceof Error
          ? requestError.message
          : "加载渠道结算失败",
      ),
    );
  }, []);

  useEffect(() => {
    loadSettlements().catch((requestError) =>
      setError(
        requestError instanceof Error
          ? requestError.message
          : "加载渠道结算失败",
      ),
    );
  }, [filters.channelPartnerId, filters.keyword, filters.status]);

  const candidateOrders = useMemo(
    () =>
      orders.filter(
        (item) =>
          item.channelPartnerId === settlementForm.channelPartnerId &&
          item.status !== "CANCELED" &&
          !["SETTLED", "NOT_REQUIRED"].includes(item.settlementStatus),
      ),
    [orders, settlementForm.channelPartnerId],
  );

  const selectedOrder = useMemo(
    () =>
      orders.find((item) => item.id === settlementForm.orderId) ??
      candidateOrders[0] ??
      null,
    [candidateOrders, orders, settlementForm.orderId],
  );

  useEffect(() => {
    if (!settlementForm.channelPartnerId) {
      return;
    }

    const matchedOrder =
      candidateOrders.find((item) => item.id === settlementForm.orderId) ??
      candidateOrders[0] ??
      null;

    if (matchedOrder && matchedOrder.id !== settlementForm.orderId) {
      setSettlementForm((current) => ({
        ...current,
        orderId: matchedOrder.id,
      }));
    }
  }, [
    candidateOrders,
    settlementForm.channelPartnerId,
    settlementForm.orderId,
  ]);

  useEffect(() => {
    if (!selectedOrder) {
      setSelectedOrderDetail(null);
      return;
    }

    fetchOrderDetail(selectedOrder.id)
      .then((detail) => {
        setSelectedOrderDetail(detail);
        setSettlementForm((current) => ({
          ...current,
          lines:
            Object.keys(current.lines).length > 0 &&
            current.orderId === selectedOrder.id
              ? current.lines
              : buildLineState(detail),
        }));
      })
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : "加载订单结算详情失败",
        ),
      );
  }, [selectedOrder, settlementForm.orderId]);

  async function handleCreatePartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPartnerLoading(true);
    setError("");
    setPartnerMessage("");

    try {
      const response = await createChannelPartner({
        partnerName: partnerForm.partnerName,
        contactName: partnerForm.contactName || undefined,
        mobile: partnerForm.mobile || undefined,
        city: partnerForm.city || undefined,
        settlementRuleText: partnerForm.settlementRuleText || undefined,
        remark: partnerForm.remark || undefined,
      });

      setPartnerMessage(response.message);
      setPartnerForm({
        partnerName: "",
        contactName: "",
        mobile: "",
        city: "",
        settlementRuleText: "",
        remark: "",
      });
      await loadBootstrap();
      setSettlementForm((current) => ({
        ...current,
        channelPartnerId: response.item.id,
      }));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "创建渠道商家失败",
      );
    } finally {
      setPartnerLoading(false);
    }
  }

  async function handleCreateSettlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settlementForm.channelPartnerId || !selectedOrderDetail) {
      setError("请先选择渠道商家和订单");
      return;
    }

    const items = Object.entries(settlementForm.lines)
      .map(([orderItemId, item]) => ({
        orderItemId,
        quantity: Number(item.quantity || 0),
        supplyUnitPrice: Number(item.supplyUnitPrice || 0),
        costUnitPrice: Number(item.costUnitPrice || 0),
        cashPaymentAmount: item.cashPaymentAmount
          ? Number(item.cashPaymentAmount)
          : undefined,
        paymentNote: item.paymentNote || undefined,
        remark: item.remark || undefined,
      }))
      .filter((item) => item.quantity > 0);

    if (!items.length) {
      setError("请至少保留一条结算明细");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await createChannelSettlement({
        channelPartnerId: settlementForm.channelPartnerId,
        periodStart: settlementForm.periodStart || undefined,
        periodEnd: settlementForm.periodEnd || undefined,
        totalPaidAmount: settlementForm.totalPaidAmount
          ? Number(settlementForm.totalPaidAmount)
          : undefined,
        status: settlementForm.status || undefined,
        remark: settlementForm.remark || undefined,
        items,
      });

      setMessage(response.message);
      setSettlementForm((current) => ({
        ...current,
        totalPaidAmount: "",
        remark: "",
        lines: buildLineState(selectedOrderDetail),
      }));
      await Promise.all([loadSettlements(), loadBootstrap()]);
      if (selectedOrder) {
        const detail = await fetchOrderDetail(selectedOrder.id);
        setSelectedOrderDetail(detail);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "创建渠道结算失败",
      );
    } finally {
      setLoading(false);
    }
  }

  const summary = data?.summary;

  return (
    <OrdersScaffold
      actions={[
        { href: "/orders", label: "返回订单管理", tone: "secondary" },
        { href: "/orders/payments", label: "查看收款记录", tone: "secondary" },
      ]}
      aside={[
        {
          title: "当前状态",
          description: error
            ? `接口加载失败：${error}`
            : data?.source === "database"
              ? "渠道结算页已经支持真实建单与回查。"
              : "渠道结算页当前仍保留 fallback 结构联调。",
          items: [
            `当前商家 ${partners?.items.length ?? 0} 个 · 可结订单 ${candidateOrders.length} 条`,
            "本轮先支持单张订单生成结算单，后面再扩到多订单批量对账",
          ],
        },
        {
          title: "这一页的价值",
          items: [
            "把渠道商家、订单明细、成本和利润口径收进同一处",
            "避免继续把供货价、成本价和利润散落在 Excel 里",
          ],
        },
      ]}
      description="渠道结算页现在既能维护商家主数据，也能直接按订单生成结算单，让利润与对账口径开始真实落库。"
      eyebrow="渠道口径"
      meta={[
        {
          label: "结算单数",
          value: summary ? String(summary.totalRecords) : "...",
        },
        {
          label: "待结算",
          value: summary ? String(summary.pendingCount) : "...",
        },
        {
          label: "利润合计",
          value: summary ? summary.totalProfitAmount : "...",
        },
      ]}
      sections={[
        {
          title: "这一页现在能做什么",
          description:
            "先把最短的渠道结算闭环打通，再继续扩成多订单对账工作区。",
          items: [
            "先维护渠道商家，再从该商家的订单生成结算单",
            "逐行录入供货价、成本价和现结金额，自动汇总利润",
            "创建成功后自动回写订单的渠道结算状态",
          ],
        },
      ]}
      title="渠道结算"
    >
      <SectionCard
        description={
          selectedOrder
            ? `${selectedOrder.orderNo} · ${selectedOrder.customer.name} · 当前结算状态 ${selectedOrder.settlementStatus}`
            : "先选择渠道商家，再从可结订单中创建结算单。"
        }
        title="创建渠道结算单"
      >
        {partners?.items.length ? (
          <form className="stack" onSubmit={handleCreateSettlement}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="settlement-partner">渠道商家</label>
                <select
                  id="settlement-partner"
                  onChange={(event) =>
                    setSettlementForm((current) => ({
                      ...current,
                      channelPartnerId: event.target.value,
                      orderId: "",
                      lines: {},
                    }))
                  }
                  value={settlementForm.channelPartnerId}
                >
                  <option value="">请选择商家</option>
                  {partners.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.partnerName}
                      {item.city ? ` · ${item.city}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="settlement-order">订单</label>
                <select
                  id="settlement-order"
                  onChange={(event) =>
                    setSettlementForm((current) => ({
                      ...current,
                      orderId: event.target.value,
                      lines: {},
                    }))
                  }
                  value={settlementForm.orderId}
                >
                  <option value="">请选择订单</option>
                  {candidateOrders.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.orderNo} · {item.customer.name} ·{" "}
                      {item.settlementStatus}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="settlement-period-start">结算开始</label>
                <input
                  id="settlement-period-start"
                  onChange={(event) =>
                    setSettlementForm((current) => ({
                      ...current,
                      periodStart: event.target.value,
                    }))
                  }
                  type="date"
                  value={settlementForm.periodStart}
                />
              </div>

              <div className="field">
                <label htmlFor="settlement-period-end">结算结束</label>
                <input
                  id="settlement-period-end"
                  onChange={(event) =>
                    setSettlementForm((current) => ({
                      ...current,
                      periodEnd: event.target.value,
                    }))
                  }
                  type="date"
                  value={settlementForm.periodEnd}
                />
              </div>

              <div className="field">
                <label htmlFor="settlement-paid">已结金额</label>
                <input
                  id="settlement-paid"
                  min="0"
                  onChange={(event) =>
                    setSettlementForm((current) => ({
                      ...current,
                      totalPaidAmount: event.target.value,
                    }))
                  }
                  step="0.01"
                  type="number"
                  value={settlementForm.totalPaidAmount}
                />
              </div>

              <div className="field">
                <label htmlFor="settlement-status">结算状态</label>
                <select
                  id="settlement-status"
                  onChange={(event) =>
                    setSettlementForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  value={settlementForm.status}
                >
                  <option value="PENDING">待结算</option>
                  <option value="PARTIAL">部分结算</option>
                  <option value="SETTLED">已结算</option>
                </select>
              </div>
            </div>

            <div className="stack compact-gap">
              <div className="small muted">结算明细</div>
              {selectedOrderDetail?.items.length ? (
                selectedOrderDetail.items.map((item) => {
                  const line = settlementForm.lines[item.id];
                  return (
                    <div
                      className="summary-card stack compact-gap"
                      key={item.id}
                    >
                      <strong>
                        {item.itemName} · 数量 {item.quantity}
                        {item.unit ?? ""}
                      </strong>
                      <div className="form-grid">
                        <div className="field">
                          <label htmlFor={`settlement-quantity-${item.id}`}>
                            结算数量
                          </label>
                          <input
                            id={`settlement-quantity-${item.id}`}
                            min="0"
                            onChange={(event) =>
                              setSettlementForm((current) => ({
                                ...current,
                                lines: {
                                  ...current.lines,
                                  [item.id]: {
                                    ...current.lines[item.id],
                                    quantity: event.target.value,
                                  },
                                },
                              }))
                            }
                            step="0.01"
                            type="number"
                            value={line?.quantity ?? item.quantity}
                          />
                        </div>

                        <div className="field">
                          <label htmlFor={`settlement-supply-${item.id}`}>
                            供货单价
                          </label>
                          <input
                            id={`settlement-supply-${item.id}`}
                            min="0"
                            onChange={(event) =>
                              setSettlementForm((current) => ({
                                ...current,
                                lines: {
                                  ...current.lines,
                                  [item.id]: {
                                    ...current.lines[item.id],
                                    supplyUnitPrice: event.target.value,
                                  },
                                },
                              }))
                            }
                            step="0.01"
                            type="number"
                            value={line?.supplyUnitPrice ?? item.unitPrice}
                          />
                        </div>

                        <div className="field">
                          <label htmlFor={`settlement-cost-${item.id}`}>
                            成本单价
                          </label>
                          <input
                            id={`settlement-cost-${item.id}`}
                            min="0"
                            onChange={(event) =>
                              setSettlementForm((current) => ({
                                ...current,
                                lines: {
                                  ...current.lines,
                                  [item.id]: {
                                    ...current.lines[item.id],
                                    costUnitPrice: event.target.value,
                                  },
                                },
                              }))
                            }
                            step="0.01"
                            type="number"
                            value={line?.costUnitPrice ?? ""}
                          />
                        </div>

                        <div className="field">
                          <label htmlFor={`settlement-cash-${item.id}`}>
                            现结金额
                          </label>
                          <input
                            id={`settlement-cash-${item.id}`}
                            min="0"
                            onChange={(event) =>
                              setSettlementForm((current) => ({
                                ...current,
                                lines: {
                                  ...current.lines,
                                  [item.id]: {
                                    ...current.lines[item.id],
                                    cashPaymentAmount: event.target.value,
                                  },
                                },
                              }))
                            }
                            step="0.01"
                            type="number"
                            value={line?.cashPaymentAmount ?? ""}
                          />
                        </div>

                        <div className="field">
                          <label htmlFor={`settlement-note-${item.id}`}>
                            付款说明
                          </label>
                          <input
                            id={`settlement-note-${item.id}`}
                            onChange={(event) =>
                              setSettlementForm((current) => ({
                                ...current,
                                lines: {
                                  ...current.lines,
                                  [item.id]: {
                                    ...current.lines[item.id],
                                    paymentNote: event.target.value,
                                  },
                                },
                              }))
                            }
                            placeholder="例如：部分现结"
                            value={line?.paymentNote ?? ""}
                          />
                        </div>

                        <div className="field">
                          <label htmlFor={`settlement-remark-${item.id}`}>
                            明细备注
                          </label>
                          <input
                            id={`settlement-remark-${item.id}`}
                            onChange={(event) =>
                              setSettlementForm((current) => ({
                                ...current,
                                lines: {
                                  ...current.lines,
                                  [item.id]: {
                                    ...current.lines[item.id],
                                    remark: event.target.value,
                                  },
                                },
                              }))
                            }
                            placeholder="补充折扣、返利或异常说明"
                            value={line?.remark ?? ""}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="small muted">
                  选择商家与订单后，这里会加载可结算的订单明细。
                </div>
              )}
            </div>

            <div className="field full">
              <label htmlFor="settlement-remark">结算备注</label>
              <textarea
                id="settlement-remark"
                onChange={(event) =>
                  setSettlementForm((current) => ({
                    ...current,
                    remark: event.target.value,
                  }))
                }
                placeholder="补充本次结算周期、对账说明或异常情况"
                value={settlementForm.remark}
              />
            </div>

            <div className="action-row">
              <button
                disabled={
                  loading ||
                  !settlementForm.channelPartnerId ||
                  !selectedOrderDetail
                }
                type="submit"
              >
                {loading ? "创建中..." : "创建结算单"}
              </button>
              {selectedOrder ? (
                <Link
                  className="button secondary inline"
                  href={`/orders/${selectedOrder.id}`}
                >
                  查看订单详情
                </Link>
              ) : null}
              {message ? (
                <div className="small success-text">{message}</div>
              ) : null}
            </div>
          </form>
        ) : (
          <EmptyState
            description="当前还没有渠道商家主数据，先新增一个商家后再创建结算单。"
            title="还没有渠道商家"
          />
        )}
      </SectionCard>

      <SectionCard
        description="先把渠道商家主数据从 Excel 里挪进 CRM，后面订单和结算单就能直接引用。"
        title="新增渠道商家"
      >
        <form className="stack" onSubmit={handleCreatePartner}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="partner-name">商家名称</label>
              <input
                id="partner-name"
                onChange={(event) =>
                  setPartnerForm((current) => ({
                    ...current,
                    partnerName: event.target.value,
                  }))
                }
                placeholder="例如：海能量潍坊示范商家"
                value={partnerForm.partnerName}
              />
            </div>
            <div className="field">
              <label htmlFor="partner-contact-name">联系人</label>
              <input
                id="partner-contact-name"
                onChange={(event) =>
                  setPartnerForm((current) => ({
                    ...current,
                    contactName: event.target.value,
                  }))
                }
                value={partnerForm.contactName}
              />
            </div>
            <div className="field">
              <label htmlFor="partner-mobile">联系电话</label>
              <input
                id="partner-mobile"
                onChange={(event) =>
                  setPartnerForm((current) => ({
                    ...current,
                    mobile: event.target.value,
                  }))
                }
                value={partnerForm.mobile}
              />
            </div>
            <div className="field">
              <label htmlFor="partner-city">城市</label>
              <input
                id="partner-city"
                onChange={(event) =>
                  setPartnerForm((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
                value={partnerForm.city}
              />
            </div>
            <div className="field full">
              <label htmlFor="partner-rule">结算规则</label>
              <input
                id="partner-rule"
                onChange={(event) =>
                  setPartnerForm((current) => ({
                    ...current,
                    settlementRuleText: event.target.value,
                  }))
                }
                placeholder="例如：供货价结算，每月对账一次"
                value={partnerForm.settlementRuleText}
              />
            </div>
            <div className="field full">
              <label htmlFor="partner-remark">备注</label>
              <textarea
                id="partner-remark"
                onChange={(event) =>
                  setPartnerForm((current) => ({
                    ...current,
                    remark: event.target.value,
                  }))
                }
                placeholder="补充商家说明、合作背景或返利约定"
                value={partnerForm.remark}
              />
            </div>
          </div>

          <div className="action-row">
            <button disabled={partnerLoading} type="submit">
              {partnerLoading ? "保存中..." : "新增商家"}
            </button>
            {partnerMessage ? (
              <div className="small success-text">{partnerMessage}</div>
            ) : null}
          </div>
        </form>
      </SectionCard>

      <SectionCard
        actions={
          <StatusBadge
            tone={data?.items.length ? "success" : "neutral"}
            variant="badge"
          >
            筛选结果 {data?.items.length ?? 0}
          </StatusBadge>
        }
        description="按关键字、商家和状态回查历史结算单，后续这里会继续扩到多订单对账视图。"
        title="当前渠道结算"
      >
        <FilterBar
          actions={
            <button
              className="button ghost inline"
              onClick={() =>
                setFilters({
                  keyword: "",
                  status: "",
                  channelPartnerId: "",
                })
              }
              type="button"
            >
              清空筛选
            </button>
          }
        >
          <div className="field filter-field--wide">
            <label htmlFor="settlement-search">搜索</label>
            <input
              id="settlement-search"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  keyword: event.target.value,
                }))
              }
              placeholder="搜索结算单号 / 商家名称"
              value={filters.keyword}
            />
          </div>

          <div className="field filter-field">
            <label htmlFor="settlement-status-filter">状态</label>
            <select
              id="settlement-status-filter"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
              value={filters.status}
            >
              <option value="">全部状态</option>
              <option value="PENDING">待结算</option>
              <option value="PARTIAL">部分结算</option>
              <option value="SETTLED">已结算</option>
            </select>
          </div>

          <div className="field filter-field">
            <label htmlFor="settlement-partner-filter">商家</label>
            <select
              id="settlement-partner-filter"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  channelPartnerId: event.target.value,
                }))
              }
              value={filters.channelPartnerId}
            >
              <option value="">全部商家</option>
              {partners?.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.partnerName}
                </option>
              ))}
            </select>
          </div>
        </FilterBar>

        {data?.items.length ? (
          <DataTable className="dense-table">
            <thead>
              <tr>
                <th>结算单</th>
                <th>渠道商家</th>
                <th>结算周期</th>
                <th>金额</th>
                <th>状态</th>
                <th>明细行</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.settlementNo}</strong>
                    <div className="small muted">
                      已结 {item.totalPaidAmount}
                    </div>
                  </td>
                  <td>{item.channelPartnerName}</td>
                  <td>
                    {item.periodStart || item.periodEnd
                      ? `${formatDateLabel(item.periodStart)} ~ ${formatDateLabel(item.periodEnd)}`
                      : "未填写周期"}
                  </td>
                  <td>
                    <div>供货 {item.totalSupplyAmount}</div>
                    <div className="small muted">
                      成本 {item.totalCostAmount} · 利润{" "}
                      {item.totalProfitAmount}
                    </div>
                  </td>
                  <td>
                    <StatusBadge tone={settlementTone(item.status)}>
                      {item.status}
                    </StatusBadge>
                  </td>
                  <td>{item.items}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState
            description="当前筛选条件下还没有结算单，先选择商家和订单创建一张新的结算单。"
            title="暂无渠道结算记录"
          />
        )}
      </SectionCard>
    </OrdersScaffold>
  );
}
