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
  createOrderPayment,
  fetchFinanceAccounts,
  fetchOrderPayments,
  fetchOrders,
  ORDER_PICKER_PAGE_SIZE,
  type FinanceAccountRecord,
  type OrderListItem,
  type PaymentsListResponse,
} from "../../../../lib/orders";

function nowDateTimeValue() {
  return new Date().toISOString().slice(0, 16);
}

function parseMoney(value?: string | null) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
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

function paymentMethodLabel(method: string) {
  return (
    {
      BANK_TRANSFER: "银行转账",
      WECHAT: "微信",
      ALIPAY: "支付宝",
      CASH: "现金",
      OTHER: "其他",
    }[method] ?? method
  );
}

function paymentStatusTone(status: string) {
  if (status === "CONFIRMED") {
    return "success" as const;
  }

  if (status === "PENDING") {
    return "warning" as const;
  }

  return "neutral" as const;
}

export default function OrderPaymentsPage() {
  const [data, setData] = useState<PaymentsListResponse | null>(null);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [financeAccounts, setFinanceAccounts] = useState<
    FinanceAccountRecord[]
  >([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    keyword: "",
    status: "",
    paymentMethod: "",
  });
  const [form, setForm] = useState({
    orderId: "",
    amount: "",
    paymentMethod: "BANK_TRANSFER",
    financeAccountId: "",
    payerName: "",
    referenceNo: "",
    paidAt: nowDateTimeValue(),
    remark: "",
  });

  async function loadRecords() {
    const query = new URLSearchParams();
    if (filters.keyword.trim()) {
      query.set("keyword", filters.keyword.trim());
    }
    if (filters.status) {
      query.set("status", filters.status);
    }
    if (filters.paymentMethod) {
      query.set("paymentMethod", filters.paymentMethod);
    }

    const response = await fetchOrderPayments(query);
    setData(response);
  }

  async function loadBootstrap() {
    const [ordersResponse, financeResponse] = await Promise.all([
      fetchOrders(`pageSize=${ORDER_PICKER_PAGE_SIZE}`),
      fetchFinanceAccounts(),
    ]);

    setOrders(ordersResponse.items);
    setFinanceAccounts(financeResponse.items);
  }

  useEffect(() => {
    Promise.all([loadRecords(), loadBootstrap()]).catch((requestError) =>
      setError(
        requestError instanceof Error
          ? requestError.message
          : "加载收款记录失败",
      ),
    );
  }, []);

  useEffect(() => {
    loadRecords().catch((requestError) =>
      setError(
        requestError instanceof Error
          ? requestError.message
          : "加载收款记录失败",
      ),
    );
  }, [filters.keyword, filters.paymentMethod, filters.status]);

  const pendingOrders = useMemo(
    () =>
      orders.filter(
        (item) => item.status !== "CANCELED" && item.paymentStatus !== "PAID",
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

    const defaultAccountId =
      financeAccounts.find((item) => item.isDefault)?.id ?? "";
    const remainingAmount = Math.max(
      parseMoney(selectedOrder.receivableAmount) -
        parseMoney(selectedOrder.receivedAmount),
      0,
    );

    setForm((current) => ({
      ...current,
      orderId: current.orderId || selectedOrder.id,
      amount:
        current.amount || (remainingAmount ? String(remainingAmount) : ""),
      financeAccountId: current.financeAccountId || defaultAccountId,
      payerName: current.payerName || selectedOrder.customer.name,
    }));
  }, [financeAccounts, selectedOrder]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.orderId) {
      setError("请先选择订单");
      return;
    }

    if (!selectedOrder) {
      setError("请选择有效订单");
      return;
    }

    const paymentAmount = Number(form.amount || 0);
    const nextRemainingAmount = Math.max(
      parseMoney(selectedOrder.receivableAmount) -
        parseMoney(selectedOrder.receivedAmount),
      0,
    );

    if (paymentAmount <= 0) {
      setError("收款金额必须大于 0");
      return;
    }

    if (nextRemainingAmount <= 0) {
      setError("该订单已收齐，不能继续登记收款");
      return;
    }

    if (paymentAmount > nextRemainingAmount) {
      setError(`本次收款不能超过剩余应收 ${nextRemainingAmount.toFixed(2)}`);
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await createOrderPayment(form.orderId, {
        amount: paymentAmount,
        paymentMethod: form.paymentMethod,
        financeAccountId: form.financeAccountId || undefined,
        payerName: form.payerName || undefined,
        referenceNo: form.referenceNo || undefined,
        paidAt: form.paidAt,
        remark: form.remark || undefined,
      });

      setMessage(response.message);
      setForm((current) => ({
        ...current,
        amount: "",
        referenceNo: "",
        remark: "",
      }));
      await Promise.all([loadRecords(), loadBootstrap()]);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "登记收款失败",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const summary = data?.summary;
  const remainingAmount = selectedOrder
    ? Math.max(
        parseMoney(selectedOrder.receivableAmount) -
          parseMoney(selectedOrder.receivedAmount),
        0,
      )
    : 0;

  return (
    <OrdersScaffold
      actions={[
        { href: "/orders", label: "返回订单管理", tone: "secondary" },
        {
          href: "/settings/finance-accounts",
          label: "财务账户配置",
          tone: "secondary",
        },
      ]}
      aside={[
        {
          title: "当前状态",
          description: error
            ? `接口加载失败：${error}`
            : data?.source === "database"
              ? "收款页已经支持真实录入与列表回查。"
              : "收款页当前仍可用 fallback 数据承接结构联调。",
          items: [
            `可选订单 ${orders.length} 条 · 收款账户 ${financeAccounts.length} 个`,
            "支持一单多次收款，登记后会同步回写订单收款状态",
          ],
        },
        {
          title: "建议用法",
          items: [
            "销售可先在这里补录回款，再进入订单详情核对发货",
            "财务可按收款方式、状态和关键字快速回查流水",
          ],
        },
      ]}
      description="收款记录页现在不只是看板，上方可直接登记回款，下方保留筛选、核对和回到订单详情的动作。"
      eyebrow="订单履约"
      meta={[
        {
          label: "收款笔数",
          value: summary ? String(summary.totalRecords) : "...",
        },
        {
          label: "已确认",
          value: summary ? String(summary.confirmedCount) : "...",
        },
        { label: "收款合计", value: summary ? summary.totalAmount : "..." },
      ]}
      sections={[
        {
          title: "这一页现在能做什么",
          description: "把回款补录、状态核对和订单跳转先收进同一个工作区。",
          items: [
            "直接选择订单登记收款，不必先回订单详情页",
            "按收款方式、状态和关键字过滤当前收款列表",
            "需要继续追踪履约时，一键跳回对应订单详情",
          ],
        },
      ]}
      title="收款记录"
    >
      <SectionCard
        description={
          selectedOrder
            ? `${selectedOrder.orderNo} · ${selectedOrder.customer.name} · 剩余待收 ${remainingAmount.toFixed(2)}`
            : "先选择订单，再登记本次回款信息。"
        }
        title="快速登记收款"
      >
        {orders.length ? (
          <form className="stack" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="payment-order">订单</label>
                <select
                  id="payment-order"
                  onChange={(event) => {
                    const nextOrder = orders.find(
                      (item) => item.id === event.target.value,
                    );
                    const nextRemaining = nextOrder
                      ? Math.max(
                          parseMoney(nextOrder.receivableAmount) -
                            parseMoney(nextOrder.receivedAmount),
                          0,
                        )
                      : 0;

                    setForm((current) => ({
                      ...current,
                      orderId: event.target.value,
                      payerName: nextOrder?.customer.name ?? "",
                      amount: nextRemaining ? String(nextRemaining) : "",
                    }));
                  }}
                  value={form.orderId}
                >
                  <option value="">请选择订单</option>
                  {pendingOrders.length
                    ? pendingOrders.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.orderNo} · {item.customer.name} · 待收{" "}
                          {(
                            parseMoney(item.receivableAmount) -
                            parseMoney(item.receivedAmount)
                          ).toFixed(2)}
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
                <label htmlFor="payment-amount">收款金额</label>
                <input
                  id="payment-amount"
                  min="0.01"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  step="0.01"
                  type="number"
                  value={form.amount}
                />
              </div>

              <div className="field">
                <label htmlFor="payment-method">收款方式</label>
                <select
                  id="payment-method"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      paymentMethod: event.target.value,
                    }))
                  }
                  value={form.paymentMethod}
                >
                  <option value="BANK_TRANSFER">银行转账</option>
                  <option value="WECHAT">微信</option>
                  <option value="ALIPAY">支付宝</option>
                  <option value="CASH">现金</option>
                  <option value="OTHER">其他</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="payment-account">收款账户</label>
                <select
                  id="payment-account"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      financeAccountId: event.target.value,
                    }))
                  }
                  value={form.financeAccountId}
                >
                  <option value="">未指定账户</option>
                  {financeAccounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.companyName} · {item.accountName ?? item.accountNo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="payment-paid-at">收款时间</label>
                <input
                  id="payment-paid-at"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      paidAt: event.target.value,
                    }))
                  }
                  type="datetime-local"
                  value={form.paidAt}
                />
              </div>

              <div className="field">
                <label htmlFor="payment-payer">付款人</label>
                <input
                  id="payment-payer"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      payerName: event.target.value,
                    }))
                  }
                  value={form.payerName}
                />
              </div>

              <div className="field">
                <label htmlFor="payment-reference">流水号</label>
                <input
                  id="payment-reference"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      referenceNo: event.target.value,
                    }))
                  }
                  placeholder="例如：BANK-20260417-01"
                  value={form.referenceNo}
                />
              </div>

              <div className="field full">
                <label htmlFor="payment-remark">备注</label>
                <textarea
                  id="payment-remark"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      remark: event.target.value,
                    }))
                  }
                  placeholder="补充收款确认、折扣来源或对账说明"
                  value={form.remark}
                />
              </div>
            </div>

            <div className="action-row">
              <button
                disabled={submitting || !form.orderId || remainingAmount <= 0}
                type="submit"
              >
                {submitting ? "登记中..." : "登记收款"}
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
            description="当前还没有可登记收款的订单，先去订单页创建订单后再回来补录回款。"
            title="还没有订单数据"
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
        description="按关键字、收款状态和收款方式筛选，快速回查最近回款与未确认流水。"
        title="收款记录列表"
      >
        <FilterBar
          actions={
            <button
              className="button ghost inline"
              onClick={() =>
                setFilters({
                  keyword: "",
                  status: "",
                  paymentMethod: "",
                })
              }
              type="button"
            >
              清空筛选
            </button>
          }
        >
          <div className="field filter-field--wide">
            <label htmlFor="payment-search">搜索</label>
            <input
              id="payment-search"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  keyword: event.target.value,
                }))
              }
              placeholder="搜索收款单号 / 订单 / 客户 / 流水号"
              value={filters.keyword}
            />
          </div>

          <div className="field filter-field">
            <label htmlFor="payment-status-filter">状态</label>
            <select
              id="payment-status-filter"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
              value={filters.status}
            >
              <option value="">全部状态</option>
              <option value="PENDING">待确认</option>
              <option value="CONFIRMED">已确认</option>
            </select>
          </div>

          <div className="field filter-field">
            <label htmlFor="payment-method-filter">方式</label>
            <select
              id="payment-method-filter"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  paymentMethod: event.target.value,
                }))
              }
              value={filters.paymentMethod}
            >
              <option value="">全部方式</option>
              <option value="BANK_TRANSFER">银行转账</option>
              <option value="WECHAT">微信</option>
              <option value="ALIPAY">支付宝</option>
              <option value="CASH">现金</option>
              <option value="OTHER">其他</option>
            </select>
          </div>
        </FilterBar>

        {data?.items.length ? (
          <DataTable className="dense-table">
            <thead>
              <tr>
                <th>收款单</th>
                <th>订单 / 客户</th>
                <th>金额</th>
                <th>收款方式</th>
                <th>收款账户</th>
                <th>收款时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.paymentNo ?? "待生成编号"}</strong>
                    <div className="small muted">
                      {item.payerName || "未填付款人"}
                    </div>
                  </td>
                  <td>
                    <div>{item.order.orderNo}</div>
                    <div className="small muted">{item.order.customerName}</div>
                  </td>
                  <td>
                    <strong>{item.amount}</strong>
                    <div className="small muted">
                      {item.referenceNo || "未填写流水号"}
                    </div>
                  </td>
                  <td>
                    <div>{paymentMethodLabel(item.paymentMethod)}</div>
                    <div className="small muted">
                      <StatusBadge tone={paymentStatusTone(item.status)}>
                        {item.status === "CONFIRMED" ? "已确认" : "待确认"}
                      </StatusBadge>
                    </div>
                  </td>
                  <td>
                    {item.financeAccount ? (
                      <>
                        <div>{item.financeAccount.companyName}</div>
                        <div className="small muted">
                          {item.financeAccount.accountNo}
                        </div>
                      </>
                    ) : (
                      <span className="small muted">未指定账户</span>
                    )}
                  </td>
                  <td>{formatDateLabel(item.paidAt)}</td>
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
            description="当前筛选条件下还没有收款记录，先登记一笔回款或调整筛选条件。"
            title="暂无收款记录"
          />
        )}
      </SectionCard>
    </OrdersScaffold>
  );
}
