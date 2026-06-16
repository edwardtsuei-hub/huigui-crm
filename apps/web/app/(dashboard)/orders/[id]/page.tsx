"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { BusinessFilePanel } from "../../../../components/business-files/BusinessFilePanel";
import { OrdersScaffold } from "../../../../components/orders/OrdersScaffold";
import {
  SectionCard,
  StatusBadge,
} from "../../../../components/system/primitives";
import {
  cancelOrder,
  confirmOrder,
  createOrderPayment,
  createOrderShipment,
  fetchFinanceAccounts,
  fetchOrderDetail,
  type FinanceAccountRecord,
  type OrderDetailResponse,
} from "../../../../lib/orders";
import { getCurrentUser, hasPermission } from "../../../../lib/api";

function parseMoney(value?: string | null) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function nowDateTimeValue() {
  return new Date().toISOString().slice(0, 16);
}

export default function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const canManageFiles = hasPermission(currentUser, "page.files.center");
  const [data, setData] = useState<OrderDetailResponse | null>(null);
  const [financeAccounts, setFinanceAccounts] = useState<
    FinanceAccountRecord[]
  >([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [shipmentLoading, setShipmentLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState<"" | "confirm" | "cancel">(
    "",
  );
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "BANK_TRANSFER",
    financeAccountId: "",
    payerName: "",
    referenceNo: "",
    paidAt: nowDateTimeValue(),
    remark: "",
  });
  const [shipmentForm, setShipmentForm] = useState({
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

  async function loadDetail() {
    const [orderResponse, financeResponse] = await Promise.all([
      fetchOrderDetail(params.id),
      fetchFinanceAccounts(),
    ]);

    setData(orderResponse);
    setFinanceAccounts(financeResponse.items);

    const remainingAmount = Math.max(
      parseMoney(orderResponse.order.receivableAmount) -
        parseMoney(orderResponse.order.receivedAmount),
      0,
    );
    const defaultAccountId =
      financeResponse.items.find((item) => item.isDefault)?.id ?? "";

    setPaymentForm((current) => ({
      ...current,
      amount: current.amount || String(remainingAmount || ""),
      financeAccountId: current.financeAccountId || defaultAccountId,
      payerName: current.payerName || orderResponse.order.customer.name,
    }));

    setShipmentForm((current) => ({
      ...current,
      warehouseName:
        current.warehouseName || orderResponse.order.warehouseName || "",
      recipientName:
        current.recipientName || orderResponse.order.recipientName || "",
      recipientPhone: current.recipientPhone || "",
      recipientAddress: current.recipientAddress || "",
      quantities:
        Object.keys(current.quantities).length > 0
          ? current.quantities
          : Object.fromEntries(
              orderResponse.items.map((item) => [item.id, "0"]),
            ),
    }));
  }

  useEffect(() => {
    loadDetail().catch((requestError) =>
      setError(
        requestError instanceof Error
          ? requestError.message
          : "加载订单详情失败",
      ),
    );
  }, [params.id]);

  const order = data?.order;

  const remainingAmount = useMemo(() => {
    if (!order) {
      return 0;
    }
    return Math.max(
      parseMoney(order.receivableAmount) - parseMoney(order.receivedAmount),
      0,
    );
  }, [order]);

  async function handleStatusAction(action: "confirm" | "cancel") {
    if (!order) {
      return;
    }

    setStatusLoading(action);
    setError("");
    setMessage("");

    try {
      const response =
        action === "confirm"
          ? await confirmOrder(order.id)
          : await cancelOrder(order.id);
      setMessage(response.message);
      await loadDetail();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "更新订单状态失败",
      );
    } finally {
      setStatusLoading("");
    }
  }

  async function handleCreatePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) {
      return;
    }

    setPaymentLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await createOrderPayment(order.id, {
        amount: Number(paymentForm.amount || 0),
        paymentMethod: paymentForm.paymentMethod,
        financeAccountId: paymentForm.financeAccountId || undefined,
        payerName: paymentForm.payerName || undefined,
        referenceNo: paymentForm.referenceNo || undefined,
        paidAt: paymentForm.paidAt,
        remark: paymentForm.remark || undefined,
      });

      setMessage(response.message);
      setPaymentForm((current) => ({
        ...current,
        amount: "",
        referenceNo: "",
        remark: "",
      }));
      await loadDetail();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "登记收款失败",
      );
    } finally {
      setPaymentLoading(false);
    }
  }

  async function handleCreateShipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order || !data) {
      return;
    }

    const items = Object.entries(shipmentForm.quantities)
      .map(([orderItemId, quantity]) => ({
        orderItemId,
        quantity: Number(quantity || 0),
      }))
      .filter((item) => item.quantity > 0);

    if (!items.length) {
      setError("请至少填写一条发货数量");
      return;
    }

    setShipmentLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await createOrderShipment(order.id, {
        warehouseName: shipmentForm.warehouseName || undefined,
        courierCompany: shipmentForm.courierCompany || undefined,
        trackingNo: shipmentForm.trackingNo || undefined,
        shippedAt: shipmentForm.shippedAt,
        recipientName: shipmentForm.recipientName || undefined,
        recipientPhone: shipmentForm.recipientPhone || undefined,
        recipientAddress: shipmentForm.recipientAddress || undefined,
        remark: shipmentForm.remark || undefined,
        items,
      });

      setMessage(response.message);
      setShipmentForm((current) => ({
        ...current,
        courierCompany: "",
        trackingNo: "",
        remark: "",
        quantities: Object.fromEntries(
          data.items.map((item) => [item.id, "0"]),
        ),
      }));
      await loadDetail();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "创建发货记录失败",
      );
    } finally {
      setShipmentLoading(false);
    }
  }

  return (
    <OrdersScaffold
      actions={[
        { href: "/orders", label: "返回订单列表", tone: "secondary" },
        { href: "/orders/payments", label: "查看收款记录", tone: "secondary" },
      ]}
      aside={[
        {
          title: "当前详情状态",
          description: error
            ? `接口加载失败：${error}`
            : data?.source === "database"
              ? "订单详情已经接入真实接口结构。"
              : "订单详情当前先用 fallback 数据承接页面结构。",
          items: [
            order ? `当前订单：${order.orderNo}` : `当前订单标识：${params.id}`,
            `已载入收款账户 ${financeAccounts.length} 个`,
          ],
        },
        {
          title: "当前详情区块",
          items: [
            "订单头信息、商品明细、收款记录、发货记录、渠道结算",
            "现在已经支持直接在详情页登记收款和创建发货",
          ],
        },
      ]}
      description="订单详情页会成为后续交易主链的总入口，用来统一查看订单头信息、明细、收款、发货、结算和关联档案。"
      eyebrow="订单详情"
      meta={[
        { label: "订单号", value: order?.orderNo ?? "..." },
        { label: "客户", value: order?.customer.name ?? "..." },
        { label: "状态", value: order?.status ?? "..." },
      ]}
      sections={[
        {
          title: "商品明细",
          description: "先把订单行结构接进详情页，后续再扩成表格和写入动作。",
          items: data?.items.length
            ? data.items.map(
                (item) =>
                  `${item.lineNo}. ${item.itemName} · ${item.quantity}${item.unit ?? ""} · 小计 ${item.lineAmount}`,
              )
            : ["当前还没有商品明细。"],
        },
        {
          title: "收款记录",
          description: "订单详情已可直接登记回款，下面会同步展示已登记记录。",
          items: data?.payments.length
            ? data.payments.map(
                (item) =>
                  `${item.amount} · ${item.paymentMethod} · ${item.status} · ${item.paymentNo ?? "未生成收款号"}`,
              )
            : ["当前还没有收款记录。"],
        },
        {
          title: "发货记录",
          description: "发货会和订单详情一起看，下面可继续补录物流和数量。",
          items: data?.shipments.length
            ? data.shipments.map(
                (item) =>
                  `${item.courierCompany ?? "待定快递"} · ${item.status} · ${item.trackingNo ?? "未录入物流单号"}`,
              )
            : ["当前还没有发货记录。"],
        },
        {
          title: "渠道结算",
          description: "如果这张订单进入了商家结算链路，后续会在这里同步看到。",
          items: data?.settlements.length
            ? data.settlements.map(
                (item) =>
                  `${item.itemName} · 利润 ${item.profitAmount} · ${item.channelPartnerName ?? "未绑定商家"}`,
              )
            : ["当前还没有渠道结算记录。"],
        },
      ]}
      title="订单详情"
    >
      <SectionCard
        actions={
          <div className="table-actions">
            <StatusBadge tone="neutral">
              {order?.status ?? "待加载"}
            </StatusBadge>
            {order ? (
              <StatusBadge
                tone={
                  order.paymentStatus === "PAID"
                    ? "success"
                    : order.paymentStatus === "PARTIAL"
                      ? "warning"
                      : "neutral"
                }
              >
                收款 {order.paymentStatus}
              </StatusBadge>
            ) : null}
            {order ? (
              <StatusBadge
                tone={
                  ["DELIVERED", "SHIPPED"].includes(order.shipmentStatus)
                    ? "success"
                    : order.shipmentStatus === "PARTIAL"
                      ? "warning"
                      : "neutral"
                }
              >
                发货 {order.shipmentStatus}
              </StatusBadge>
            ) : null}
            {order ? (
              <StatusBadge
                tone={
                  order.settlementStatus === "SETTLED"
                    ? "success"
                    : order.settlementStatus === "PARTIAL"
                      ? "warning"
                      : "neutral"
                }
              >
                结算 {order.settlementStatus}
              </StatusBadge>
            ) : null}
          </div>
        }
        description="先把订单状态动作收敛到详情页，销售和财务都能在同一处完成确认、取消和继续进入结算。"
        title="订单动作"
      >
        <div className="table-actions">
          <button
            disabled={
              !order || statusLoading !== "" || order?.status === "CANCELED"
            }
            onClick={() => handleStatusAction("confirm")}
            type="button"
          >
            {statusLoading === "confirm" ? "确认中..." : "确认订单"}
          </button>
          <button
            className="button secondary inline"
            disabled={
              !order ||
              statusLoading !== "" ||
              order?.status === "COMPLETED" ||
              order?.status === "CANCELED"
            }
            onClick={() => handleStatusAction("cancel")}
            type="button"
          >
            {statusLoading === "cancel" ? "取消中..." : "取消订单"}
          </button>
          {order?.channelPartnerId ? (
            <Link
              className="button secondary inline"
              href={`/orders/channel-settlements?partnerId=${order.channelPartnerId}&orderId=${order.id}`}
            >
              去创建结算
            </Link>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        description={`订单剩余待收 ${remainingAmount.toFixed(2)}，可直接补录回款并自动更新订单收款状态。`}
        title="登记收款"
      >
        <form className="stack" onSubmit={handleCreatePayment}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="payment-amount">收款金额</label>
              <input
                id="payment-amount"
                min="0.01"
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                step="0.01"
                type="number"
                value={paymentForm.amount}
              />
            </div>
            <div className="field">
              <label htmlFor="payment-method">收款方式</label>
              <select
                id="payment-method"
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    paymentMethod: event.target.value,
                  }))
                }
                value={paymentForm.paymentMethod}
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
                  setPaymentForm((current) => ({
                    ...current,
                    financeAccountId: event.target.value,
                  }))
                }
                value={paymentForm.financeAccountId}
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
                  setPaymentForm((current) => ({
                    ...current,
                    paidAt: event.target.value,
                  }))
                }
                type="datetime-local"
                value={paymentForm.paidAt}
              />
            </div>
            <div className="field">
              <label htmlFor="payment-payer">付款人</label>
              <input
                id="payment-payer"
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    payerName: event.target.value,
                  }))
                }
                value={paymentForm.payerName}
              />
            </div>
            <div className="field">
              <label htmlFor="payment-reference">流水号</label>
              <input
                id="payment-reference"
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    referenceNo: event.target.value,
                  }))
                }
                placeholder="例如：BANK-20260417-01"
                value={paymentForm.referenceNo}
              />
            </div>
            <div className="field full">
              <label htmlFor="payment-remark">备注</label>
              <textarea
                id="payment-remark"
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    remark: event.target.value,
                  }))
                }
                placeholder="补充收款说明、折扣原因或确认信息"
                value={paymentForm.remark}
              />
            </div>
          </div>
          <div className="action-row">
            <button disabled={paymentLoading} type="submit">
              {paymentLoading ? "登记中..." : "登记收款"}
            </button>
            {message ? (
              <div className="small success-text">{message}</div>
            ) : null}
          </div>
        </form>
      </SectionCard>

      <SectionCard
        description="按订单商品填写本次发货数量，系统会自动校验是否超出剩余可发数量，并回写订单发货状态。"
        title="创建发货"
      >
        <form className="stack" onSubmit={handleCreateShipment}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="shipment-warehouse">出货仓</label>
              <input
                id="shipment-warehouse"
                onChange={(event) =>
                  setShipmentForm((current) => ({
                    ...current,
                    warehouseName: event.target.value,
                  }))
                }
                value={shipmentForm.warehouseName}
              />
            </div>
            <div className="field">
              <label htmlFor="shipment-courier">快递公司</label>
              <input
                id="shipment-courier"
                onChange={(event) =>
                  setShipmentForm((current) => ({
                    ...current,
                    courierCompany: event.target.value,
                  }))
                }
                placeholder="例如：顺丰"
                value={shipmentForm.courierCompany}
              />
            </div>
            <div className="field">
              <label htmlFor="shipment-tracking">物流单号</label>
              <input
                id="shipment-tracking"
                onChange={(event) =>
                  setShipmentForm((current) => ({
                    ...current,
                    trackingNo: event.target.value,
                  }))
                }
                placeholder="例如：SF1234567890"
                value={shipmentForm.trackingNo}
              />
            </div>
            <div className="field">
              <label htmlFor="shipment-shipped-at">发货时间</label>
              <input
                id="shipment-shipped-at"
                onChange={(event) =>
                  setShipmentForm((current) => ({
                    ...current,
                    shippedAt: event.target.value,
                  }))
                }
                type="datetime-local"
                value={shipmentForm.shippedAt}
              />
            </div>
            <div className="field">
              <label htmlFor="shipment-recipient-name">收货人</label>
              <input
                id="shipment-recipient-name"
                onChange={(event) =>
                  setShipmentForm((current) => ({
                    ...current,
                    recipientName: event.target.value,
                  }))
                }
                value={shipmentForm.recipientName}
              />
            </div>
            <div className="field">
              <label htmlFor="shipment-recipient-phone">联系电话</label>
              <input
                id="shipment-recipient-phone"
                onChange={(event) =>
                  setShipmentForm((current) => ({
                    ...current,
                    recipientPhone: event.target.value,
                  }))
                }
                value={shipmentForm.recipientPhone}
              />
            </div>
            <div className="field full">
              <label htmlFor="shipment-recipient-address">收货地址</label>
              <input
                id="shipment-recipient-address"
                onChange={(event) =>
                  setShipmentForm((current) => ({
                    ...current,
                    recipientAddress: event.target.value,
                  }))
                }
                value={shipmentForm.recipientAddress}
              />
            </div>
          </div>

          <div className="stack compact-gap">
            <div className="small muted">本次发货数量</div>
            {data?.items.map((item) => (
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
                      setShipmentForm((current) => ({
                        ...current,
                        quantities: {
                          ...current.quantities,
                          [item.id]: event.target.value,
                        },
                      }))
                    }
                    step="0.01"
                    type="number"
                    value={shipmentForm.quantities[item.id] ?? "0"}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="field full">
            <label htmlFor="shipment-remark">备注</label>
            <textarea
              id="shipment-remark"
              onChange={(event) =>
                setShipmentForm((current) => ({
                  ...current,
                  remark: event.target.value,
                }))
              }
              placeholder="补充发货批次、签收说明或异常信息"
              value={shipmentForm.remark}
            />
          </div>

          <div className="action-row">
            <button disabled={shipmentLoading} type="submit">
              {shipmentLoading ? "创建中..." : "创建发货记录"}
            </button>
          </div>
        </form>
      </SectionCard>

      {order ? (
        <BusinessFilePanel
          businessId={order.id}
          businessType="SALES_ORDER"
          canUpload={canManageFiles}
          canView={canManageFiles}
          categoryOptions={[
            { value: "订单附件", label: "订单附件" },
            { value: "客户交付", label: "客户交付" },
            { value: "合同文件", label: "合同文件" },
            { value: "内部资料", label: "内部资料" },
          ]}
          defaultCategory="订单附件"
          description="订单合同、付款回单、发货凭证和交付资料统一归到这张订单下。"
          emptyText="当前订单还没有关联附件。"
          title="订单附件"
        />
      ) : null}
    </OrdersScaffold>
  );
}
