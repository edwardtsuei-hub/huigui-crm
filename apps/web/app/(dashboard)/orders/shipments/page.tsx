"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { OrdersScaffold } from "../../../../components/orders/OrdersScaffold";
import {
  DataTable,
  EmptyState,
  FilterBar,
  SectionCard,
  StatusBadge,
} from "../../../../components/system/primitives";
import {
  createOrderShipment,
  fetchOrderDetail,
  fetchOrderShipments,
  fetchOrders,
  ORDER_PICKER_PAGE_SIZE,
  type OrderDetailResponse,
  type OrderListItem,
  type ShipmentsListResponse,
} from "../../../../lib/orders";

function nowDateTimeValue() {
  return new Date().toISOString().slice(0, 16);
}

function formatDateLabel(value?: string | null) {
  if (!value) {
    return "未填写";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function shipmentTone(status: string) {
  if (status === "DELIVERED") {
    return "success" as const;
  }

  if (status === "SHIPPED" || status === "PARTIAL") {
    return "warning" as const;
  }

  return "neutral" as const;
}

export default function OrderShipmentsPage() {
  const [data, setData] = useState<ShipmentsListResponse | null>(null);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [selectedOrderDetail, setSelectedOrderDetail] =
    useState<OrderDetailResponse | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    keyword: "",
    status: "",
    courierCompany: "",
  });
  const [form, setForm] = useState({
    orderId: "",
    warehouseName: "",
    courierCompany: "",
    trackingNo: "",
    shippedAt: nowDateTimeValue(),
    recipientName: "",
    recipientPhone: "",
    recipientAddress: "",
    remark: "",
    quantities: {} as Record<string, string>,
  });

  async function loadRecords() {
    const query = new URLSearchParams();
    if (filters.keyword.trim()) {
      query.set("keyword", filters.keyword.trim());
    }
    if (filters.status) {
      query.set("status", filters.status);
    }
    if (filters.courierCompany.trim()) {
      query.set("courierCompany", filters.courierCompany.trim());
    }

    const response = await fetchOrderShipments(query);
    setData(response);
  }

  async function loadOrders() {
    const response = await fetchOrders(`pageSize=${ORDER_PICKER_PAGE_SIZE}`);
    setOrders(response.items);
  }

  useEffect(() => {
    Promise.all([loadRecords(), loadOrders()]).catch((requestError) =>
      setError(
        requestError instanceof Error
          ? requestError.message
          : "加载发货记录失败",
      ),
    );
  }, []);

  useEffect(() => {
    loadRecords().catch((requestError) =>
      setError(
        requestError instanceof Error
          ? requestError.message
          : "加载发货记录失败",
      ),
    );
  }, [filters.courierCompany, filters.keyword, filters.status]);

  const pendingOrders = useMemo(
    () =>
      orders.filter(
        (item) =>
          item.status !== "CANCELED" &&
          !["DELIVERED", "CANCELED"].includes(item.shipmentStatus),
      ),
    [orders],
  );

  const selectedOrder = useMemo(
    () =>
      orders.find((item) => item.id === form.orderId) ??
      pendingOrders[0] ??
      orders[0] ??
      null,
    [form.orderId, orders, pendingOrders],
  );

  useEffect(() => {
    if (!selectedOrder) {
      return;
    }

    if (!form.orderId) {
      setForm((current) => ({
        ...current,
        orderId: selectedOrder.id,
      }));
      return;
    }

    fetchOrderDetail(selectedOrder.id)
      .then((detail) => {
        setSelectedOrderDetail(detail);
        setForm((current) => ({
          ...current,
          warehouseName:
            current.warehouseName || selectedOrder.warehouseName || "",
          recipientName:
            current.recipientName || selectedOrder.recipientName || "",
          quantities:
            Object.keys(current.quantities).length > 0 &&
            current.orderId === selectedOrder.id
              ? current.quantities
              : Object.fromEntries(detail.items.map((item) => [item.id, "0"])),
        }));
      })
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : "加载订单发货详情失败",
        ),
      );
  }, [form.orderId, selectedOrder]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.orderId || !selectedOrderDetail) {
      setError("请先选择订单");
      return;
    }

    const items = Object.entries(form.quantities)
      .map(([orderItemId, quantity]) => ({
        orderItemId,
        quantity: Number(quantity || 0),
      }))
      .filter((item) => item.quantity > 0);

    if (!items.length) {
      setError("请至少填写一条发货数量");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await createOrderShipment(form.orderId, {
        warehouseName: form.warehouseName || undefined,
        courierCompany: form.courierCompany || undefined,
        trackingNo: form.trackingNo || undefined,
        shippedAt: form.shippedAt,
        recipientName: form.recipientName || undefined,
        recipientPhone: form.recipientPhone || undefined,
        recipientAddress: form.recipientAddress || undefined,
        remark: form.remark || undefined,
        items,
      });

      setMessage(response.message);
      setForm((current) => ({
        ...current,
        courierCompany: "",
        trackingNo: "",
        remark: "",
        quantities: Object.fromEntries(
          (selectedOrderDetail?.items ?? []).map((item) => [item.id, "0"]),
        ),
      }));
      await Promise.all([loadRecords(), loadOrders()]);
      const detail = await fetchOrderDetail(form.orderId);
      setSelectedOrderDetail(detail);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "创建发货记录失败",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const summary = data?.summary;

  return (
    <OrdersScaffold
      actions={[
        { href: "/orders", label: "返回订单管理", tone: "secondary" },
        { href: "/files", label: "查看关联档案", tone: "secondary" },
      ]}
      aside={[
        {
          title: "当前状态",
          description: error
            ? `接口加载失败：${error}`
            : data?.source === "database"
              ? "发货页已经支持直接创建发货记录。"
              : "发货页当前仍保留 fallback 数据做结构联调。",
          items: [
            `可选订单 ${orders.length} 条 · 待发订单 ${pendingOrders.length} 条`,
            "发货后会自动回写订单发货状态，后续继续承接签收与补发",
          ],
        },
        {
          title: "当前推荐动作",
          items: [
            "先在这里录入仓库、快递与发货数量",
            "再回到订单详情继续补录收款、档案或结算信息",
          ],
        },
      ]}
      description="发货记录页现在既能做回查，也能直接录入本次发货，先把履约高频动作收进同一页。"
      eyebrow="订单履约"
      meta={[
        {
          label: "发货笔数",
          value: summary ? String(summary.totalRecords) : "...",
        },
        {
          label: "待处理",
          value: summary ? String(summary.pendingCount) : "...",
        },
        {
          label: "活跃快递",
          value: summary ? String(summary.activeCourierCount) : "...",
        },
      ]}
      sections={[
        {
          title: "这一页现在能做什么",
          description: "把待发订单选择、发货录入和列表核对放到同一个工作区。",
          items: [
            "直接选择订单创建发货记录，不必先跳详情页",
            "按状态、快递和关键字筛选现有发货记录",
            "一键跳回订单详情继续处理收款和渠道结算",
          ],
        },
      ]}
      title="发货记录"
    >
      <SectionCard
        description={
          selectedOrder
            ? `${selectedOrder.orderNo} · ${selectedOrder.customer.name} · 当前发货状态 ${selectedOrder.shipmentStatus}`
            : "先选择订单，再录入本次发货信息。"
        }
        title="快速创建发货"
      >
        {orders.length ? (
          <form className="stack" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="shipment-order">订单</label>
                <select
                  id="shipment-order"
                  onChange={(event) => {
                    setSelectedOrderDetail(null);
                    setForm((current) => ({
                      ...current,
                      orderId: event.target.value,
                      warehouseName: "",
                      recipientName: "",
                      recipientPhone: "",
                      recipientAddress: "",
                      remark: "",
                      quantities: {},
                    }));
                  }}
                  value={form.orderId}
                >
                  <option value="">请选择订单</option>
                  {pendingOrders.length
                    ? pendingOrders.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.orderNo} · {item.customer.name} ·{" "}
                          {item.shipmentStatus}
                        </option>
                      ))
                    : orders.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.orderNo} · {item.customer.name}
                        </option>
                      ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="shipment-warehouse">出货仓</label>
                <input
                  id="shipment-warehouse"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      warehouseName: event.target.value,
                    }))
                  }
                  value={form.warehouseName}
                />
              </div>

              <div className="field">
                <label htmlFor="shipment-courier">快递公司</label>
                <input
                  id="shipment-courier"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      courierCompany: event.target.value,
                    }))
                  }
                  placeholder="例如：顺丰"
                  value={form.courierCompany}
                />
              </div>

              <div className="field">
                <label htmlFor="shipment-tracking">物流单号</label>
                <input
                  id="shipment-tracking"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      trackingNo: event.target.value,
                    }))
                  }
                  placeholder="例如：SF1234567890"
                  value={form.trackingNo}
                />
              </div>

              <div className="field">
                <label htmlFor="shipment-shipped-at">发货时间</label>
                <input
                  id="shipment-shipped-at"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      shippedAt: event.target.value,
                    }))
                  }
                  type="datetime-local"
                  value={form.shippedAt}
                />
              </div>

              <div className="field">
                <label htmlFor="shipment-recipient-name">收货人</label>
                <input
                  id="shipment-recipient-name"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      recipientName: event.target.value,
                    }))
                  }
                  value={form.recipientName}
                />
              </div>

              <div className="field">
                <label htmlFor="shipment-recipient-phone">联系电话</label>
                <input
                  id="shipment-recipient-phone"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      recipientPhone: event.target.value,
                    }))
                  }
                  value={form.recipientPhone}
                />
              </div>

              <div className="field full">
                <label htmlFor="shipment-recipient-address">收货地址</label>
                <input
                  id="shipment-recipient-address"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      recipientAddress: event.target.value,
                    }))
                  }
                  value={form.recipientAddress}
                />
              </div>
            </div>

            <div className="stack compact-gap">
              <div className="small muted">本次发货数量</div>
              {selectedOrderDetail?.items.length ? (
                selectedOrderDetail.items.map((item) => (
                  <div className="form-grid" key={item.id}>
                    <div className="field full">
                      <label htmlFor={`shipment-item-${item.id}`}>
                        {item.itemName} · 当前订单数量 {item.quantity}
                        {item.unit ?? ""}
                      </label>
                      <input
                        id={`shipment-item-${item.id}`}
                        min="0"
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            quantities: {
                              ...current.quantities,
                              [item.id]: event.target.value,
                            },
                          }))
                        }
                        step="0.01"
                        type="number"
                        value={form.quantities[item.id] ?? "0"}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="small muted">
                  选择订单后，这里会加载可发货的商品明细。
                </div>
              )}
            </div>

            <div className="field full">
              <label htmlFor="shipment-remark">备注</label>
              <textarea
                id="shipment-remark"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    remark: event.target.value,
                  }))
                }
                placeholder="补充发货批次、签收说明或异常信息"
                value={form.remark}
              />
            </div>

            <div className="action-row">
              <button
                disabled={submitting || !form.orderId || !selectedOrderDetail}
                type="submit"
              >
                {submitting ? "创建中..." : "创建发货记录"}
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
            description="当前还没有订单数据，先去订单页创建订单后再录入发货。"
            title="还没有可发货订单"
          />
        )}
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
        description="按关键字、发货状态和快递筛选，统一回查物流进度与最近批次。"
        title="发货记录列表"
      >
        <FilterBar
          actions={
            <button
              className="button ghost inline"
              onClick={() =>
                setFilters({
                  keyword: "",
                  status: "",
                  courierCompany: "",
                })
              }
              type="button"
            >
              清空筛选
            </button>
          }
        >
          <div className="field filter-field--wide">
            <label htmlFor="shipment-search">搜索</label>
            <input
              id="shipment-search"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  keyword: event.target.value,
                }))
              }
              placeholder="搜索发货单号 / 物流单号 / 订单 / 客户"
              value={filters.keyword}
            />
          </div>

          <div className="field filter-field">
            <label htmlFor="shipment-status-filter">状态</label>
            <select
              id="shipment-status-filter"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
              value={filters.status}
            >
              <option value="">全部状态</option>
              <option value="PENDING">待处理</option>
              <option value="SHIPPED">已发出</option>
              <option value="DELIVERED">已签收</option>
            </select>
          </div>

          <div className="field filter-field">
            <label htmlFor="shipment-courier-filter">快递</label>
            <input
              id="shipment-courier-filter"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  courierCompany: event.target.value,
                }))
              }
              placeholder="例如：顺丰"
              value={filters.courierCompany}
            />
          </div>
        </FilterBar>

        {data?.items.length ? (
          <DataTable className="dense-table">
            <thead>
              <tr>
                <th>发货单</th>
                <th>订单 / 客户</th>
                <th>仓库 / 快递</th>
                <th>物流信息</th>
                <th>状态</th>
                <th>发货时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.shipmentNo ?? "待生成编号"}</strong>
                    <div className="small muted">条目 {item.itemCount}</div>
                  </td>
                  <td>
                    <div>{item.order.orderNo}</div>
                    <div className="small muted">{item.order.customerName}</div>
                  </td>
                  <td>
                    <div>{item.warehouseName || "未填仓库"}</div>
                    <div className="small muted">
                      {item.courierCompany || "未填快递"}
                    </div>
                  </td>
                  <td>
                    <div>{item.trackingNo || "未录入物流单号"}</div>
                    <div className="small muted">
                      {item.deliveredAt
                        ? `签收 ${formatDateLabel(item.deliveredAt)}`
                        : "待签收"}
                    </div>
                  </td>
                  <td>
                    <StatusBadge tone={shipmentTone(item.status)}>
                      {item.status}
                    </StatusBadge>
                  </td>
                  <td>{formatDateLabel(item.shippedAt)}</td>
                  <td>
                    <Link
                      className="button secondary inline"
                      href={`/orders/${item.order.id}`}
                    >
                      查看订单
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState
            description="当前筛选条件下还没有发货记录，先创建一笔发货或调整筛选条件。"
            title="暂无发货记录"
          />
        )}
      </SectionCard>
    </OrdersScaffold>
  );
}
