"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch, getCurrentUser, hasPermission } from "../../lib/api";
import {
  createOrder,
  createOrderPayment,
  fetchChannelPartners,
  fetchFinanceAccounts,
  fetchOrders,
  updateOrder,
  type ChannelPartnerRecord,
  type FinanceAccountRecord,
  type OrderListItem,
  type OrdersListResponse,
} from "../../lib/orders";
import styles from "./OrdersWorkbench.module.css";

type PreviewLaneKey = "payment" | "shipment" | "settlement";
type PreviewTone = "neutral" | "success" | "warning" | "danger";
type BatchLaneAction = "payment" | "shipment";

type CustomerOption = {
  id: string;
  name: string;
  companyName?: string | null;
};

type CustomerDetailOption = {
  id: string;
  name: string;
  companyName?: string | null;
};

type CustomerListResponse = {
  items: CustomerOption[];
};

type ProductOption = {
  id: string;
  displayName: string;
  suggestedPrice?: string | number | null;
  unit?: string | null;
  specification?: string | null;
};

type LaneOrderCard = {
  id: string;
  orderNo: string;
  customer: string;
  lane: PreviewLaneKey;
  statusLabel: string;
  tone: PreviewTone;
  amountLabel: string;
  summary: string;
  nextAction: string;
  blocker: string;
  sideMetaLabel: string;
  sideMetaValue: string;
  updatedAt: string;
  timeline: Array<{ label: string; value: string }>;
};

type BatchActionSummary = {
  action: BatchLaneAction;
  total: number;
  completed: number;
  successCount: number;
  failedItems: Array<{
    id: string;
    orderNo: string;
    customer: string;
    reason: string;
  }>;
  active: boolean;
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function todayValue() {
  return new Date().toISOString().slice(0, 16);
}

function parseMoney(value?: string | number | null) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatCurrency(value?: string | number | null) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(parseMoney(value));
}

function formatDateLabel(value?: string | null) {
  if (!value) {
    return "未填写";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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

function remainingReceivable(order: OrderListItem) {
  return Math.max(
    parseMoney(order.receivableAmount) - parseMoney(order.receivedAmount),
    0,
  );
}

function paymentStatusLabel(status: string) {
  switch (status) {
    case "PAID":
      return "已收清";
    case "PARTIAL":
      return "尾款待收";
    case "UNPAID":
    default:
      return "待收款";
  }
}

function shipmentStatusLabel(status: string) {
  switch (status) {
    case "DELIVERED":
      return "已签收";
    case "SHIPPED":
      return "已发出";
    case "PARTIAL":
      return "部分待发";
    case "NOT_REQUIRED":
      return "无需发货";
    case "PENDING":
    default:
      return "待发货";
  }
}

function settlementStatusLabel(status: string) {
  switch (status) {
    case "SETTLED":
      return "已结算";
    case "PARTIAL":
      return "部分结算";
    case "NOT_REQUIRED":
      return "无需结算";
    case "PENDING":
    default:
      return "待结算";
  }
}

function orderStatusLabel(status: string) {
  switch (status) {
    case "DRAFT":
      return "草稿";
    case "CONFIRMED":
      return "已确认";
    case "IN_FULFILLMENT":
      return "履约中";
    case "COMPLETED":
      return "已完成";
    case "CANCELED":
      return "已取消";
    default:
      return status;
  }
}

function toneForPaymentStatus(status: string): PreviewTone {
  switch (status) {
    case "PAID":
      return "success";
    case "PARTIAL":
      return "warning";
    case "UNPAID":
    default:
      return "danger";
  }
}

function toneForShipmentStatus(status: string): PreviewTone {
  switch (status) {
    case "DELIVERED":
      return "success";
    case "PARTIAL":
      return "warning";
    case "SHIPPED":
      return "neutral";
    case "PENDING":
    default:
      return "warning";
  }
}

function toneForSettlementStatus(status: string): PreviewTone {
  switch (status) {
    case "SETTLED":
      return "success";
    case "PARTIAL":
      return "warning";
    case "PENDING":
    default:
      return "danger";
  }
}

function buildLaneCard(
  order: OrderListItem,
  lane: PreviewLaneKey,
): LaneOrderCard {
  const outstanding = Math.max(
    parseMoney(order.receivableAmount) - parseMoney(order.receivedAmount),
    0,
  );
  const warehouseLabel = order.warehouseName || "待分配仓";
  const partnerLabel = order.channelPartnerName || "直营";
  const orderDateLabel = formatDateLabel(order.orderDate);

  if (lane === "payment") {
    return {
      id: order.id,
      orderNo: order.orderNo,
      customer: order.customer.name,
      lane,
      statusLabel: paymentStatusLabel(order.paymentStatus),
      tone: toneForPaymentStatus(order.paymentStatus),
      amountLabel: `待收 ${formatCurrency(outstanding)}`,
      summary:
        outstanding > 0
          ? `这笔订单还有 ${formatCurrency(outstanding)} 未到账，当前应先确认回款登记与节奏。`
          : "当前主要差一步财务确认，可以直接登记为已收清。",
      nextAction:
        order.paymentStatus === "PARTIAL"
          ? "补齐尾款时间并登记新一笔回款"
          : "确认到账后登记收款记录",
      blocker:
        order.paymentStatus === "PARTIAL"
          ? "尾款节点还未锁定"
          : "到账记录尚未录入系统",
      sideMetaLabel: "来源 / 渠道",
      sideMetaValue: `${order.sourceLabel} · ${partnerLabel}`,
      updatedAt: orderDateLabel,
      timeline: [
        { label: "下单时间", value: orderDateLabel },
        { label: "已收金额", value: formatCurrency(order.receivedAmount) },
        { label: "订单状态", value: orderStatusLabel(order.status) },
      ],
    };
  }

  if (lane === "shipment") {
    return {
      id: order.id,
      orderNo: order.orderNo,
      customer: order.customer.name,
      lane,
      statusLabel: shipmentStatusLabel(order.shipmentStatus),
      tone: toneForShipmentStatus(order.shipmentStatus),
      amountLabel: `${order.itemCount} 项 · ${warehouseLabel}`,
      summary:
        order.shipmentStatus === "PARTIAL"
          ? "第一批已推进，但仍有部分货品待出库，适合今天继续拆批处理。"
          : "仓配与收货信息还没完全变成发货动作，今天应先释放出库节奏。",
      nextAction:
        order.shipmentStatus === "PARTIAL"
          ? "补齐剩余数量并安排下一批发货"
          : "确认物流与出库批次后发货",
      blocker:
        order.warehouseName?.trim()
          ? "物流与出库记录仍未完整"
          : "出货仓还没有补齐",
      sideMetaLabel: "收货人 / 渠道",
      sideMetaValue: `${order.recipientName || "待补收货人"} · ${partnerLabel}`,
      updatedAt: orderDateLabel,
      timeline: [
        { label: "下单时间", value: orderDateLabel },
        { label: "发货状态", value: shipmentStatusLabel(order.shipmentStatus) },
        { label: "订单状态", value: orderStatusLabel(order.status) },
      ],
    };
  }

  return {
    id: order.id,
    orderNo: order.orderNo,
    customer: order.customer.name,
    lane,
    statusLabel: settlementStatusLabel(order.settlementStatus),
    tone: toneForSettlementStatus(order.settlementStatus),
    amountLabel: `${partnerLabel} · ${formatCurrency(order.receivableAmount)}`,
    summary:
      order.settlementStatus === "PARTIAL"
        ? "这笔订单的渠道结算已经开始，但利润或补差信息还没有完全闭环。"
        : "渠道侧仍未生成完整结算动作，利润与账期都还需要被明确记录。",
    nextAction:
      order.channelPartnerId
        ? "生成结算单并补齐利润说明"
        : "先补绑定渠道信息，再进入结算",
    blocker: order.channelPartnerId ? "结算单据尚未闭环" : "尚未绑定渠道商家",
    sideMetaLabel: "结算渠道 / 来源",
    sideMetaValue: `${partnerLabel} · ${order.sourceLabel}`,
    updatedAt: orderDateLabel,
    timeline: [
      { label: "下单时间", value: orderDateLabel },
      { label: "结算状态", value: settlementStatusLabel(order.settlementStatus) },
      { label: "订单状态", value: orderStatusLabel(order.status) },
    ],
  };
}

function ToneBadge({
  tone,
  children,
}: {
  tone: PreviewTone;
  children: string;
}) {
  return (
    <span
      className={cx(
        styles.badge,
        styles[`badge${tone[0].toUpperCase()}${tone.slice(1)}`],
      )}
    >
      {children}
    </span>
  );
}

export function OrdersWorkbench() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = getCurrentUser();
  const canRecordPayment = hasPermission(
    currentUser,
    "action.order.record_payment",
  );
  const canBatchPrefillShipment = hasPermission(
    currentUser,
    "action.order.update",
  );
  const canSettleChannel = hasPermission(
    currentUser,
    "action.order.settle_channel",
  );
  const prefillCustomerId = searchParams.get("customerId") ?? "";
  const prefillQuotationId = searchParams.get("quotationId") ?? "";
  const [data, setData] = useState<OrdersListResponse | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [channelPartners, setChannelPartners] = useState<ChannelPartnerRecord[]>(
    [],
  );
  const [financeAccounts, setFinanceAccounts] = useState<FinanceAccountRecord[]>(
    [],
  );
  const [bootstrapping, setBootstrapping] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeLane, setActiveLane] = useState<PreviewLaneKey>("payment");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [batchActionLoading, setBatchActionLoading] =
    useState<BatchLaneAction | null>(null);
  const [batchActionSummary, setBatchActionSummary] =
    useState<BatchActionSummary | null>(null);
  const [batchPaymentForm, setBatchPaymentForm] = useState({
    paymentMethod: "BANK_TRANSFER",
    financeAccountId: "",
    paidAt: todayValue(),
    remark: "",
  });
  const [batchShipmentForm, setBatchShipmentForm] = useState({
    warehouseName: "",
    recipientName: "",
    recipientPhone: "",
    recipientAddress: "",
  });
  const [form, setForm] = useState({
    customerId: "",
    productId: "",
    quantity: "1",
    unitPrice: "",
    orderDate: todayValue(),
    recipientName: "",
    recipientPhone: "",
    recipientAddress: "",
    warehouseName: "",
    channelPartnerId: "",
    shippingFee: "0",
    discountAmount: "0",
    usagePurpose: "",
    remark: "",
  });

  async function loadPage() {
    const [ordersResponse, customerResponse, productResponse, partnerResponse] =
      await Promise.all([
        fetchOrders(),
        apiFetch<CustomerListResponse>("/customers?pageSize=200"),
        apiFetch<ProductOption[]>("/products?status=ENABLED"),
        fetchChannelPartners(),
      ]);
    let nextFinanceAccounts: FinanceAccountRecord[] = [];

    let nextCustomers = customerResponse.items;

    if (
      prefillCustomerId &&
      !customerResponse.items.some((item) => item.id === prefillCustomerId)
    ) {
      try {
        const prefillCustomer = await apiFetch<CustomerDetailOption>(
          `/customers/${prefillCustomerId}`,
        );
        nextCustomers = [
          {
            id: prefillCustomer.id,
            name: prefillCustomer.name,
            companyName: prefillCustomer.companyName ?? null,
          },
          ...customerResponse.items,
        ];
      } catch {
        nextCustomers = customerResponse.items;
      }
    }

    if (canRecordPayment) {
      try {
        const financeResponse = await fetchFinanceAccounts();
        nextFinanceAccounts = financeResponse.items;
      } catch {
        nextFinanceAccounts = [];
      }
    }

    setData(ordersResponse);
    setCustomers(nextCustomers);
    setProducts(productResponse);
    setChannelPartners(partnerResponse.items);
    setFinanceAccounts(nextFinanceAccounts);
  }

  useEffect(() => {
    let cancelled = false;

    loadPage()
      .then(() => {
        if (!cancelled) {
          setError("");
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error ? requestError.message : "加载订单数据失败",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBootstrapping(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [prefillCustomerId]);

  useEffect(() => {
    if (!customers.length && !products.length) {
      return;
    }

    setForm((current) => ({
      ...current,
      customerId:
        current.customerId ||
        (customers.some((item) => item.id === prefillCustomerId)
          ? prefillCustomerId
          : customers[0]?.id || ""),
      productId: current.productId || products[0]?.id || "",
    }));
  }, [customers, prefillCustomerId, products]);

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === form.productId),
    [form.productId, products],
  );
  const selectedCustomer = useMemo(
    () => customers.find((item) => item.id === form.customerId),
    [customers, form.customerId],
  );
  const defaultFinanceAccountId = useMemo(
    () =>
      financeAccounts.find((item) => item.isDefault && item.enabled)?.id ??
      financeAccounts.find((item) => item.enabled)?.id ??
      "",
    [financeAccounts],
  );

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    setForm((current) => {
      if (current.unitPrice) {
        return current;
      }

      const nextPrice =
        selectedProduct.suggestedPrice === null ||
        selectedProduct.suggestedPrice === undefined
          ? ""
          : String(selectedProduct.suggestedPrice);

      return {
        ...current,
        unitPrice: nextPrice,
      };
    });
  }, [selectedProduct]);

  useEffect(() => {
    if (!defaultFinanceAccountId) {
      return;
    }

    setBatchPaymentForm((current) => ({
      ...current,
      financeAccountId: current.financeAccountId || defaultFinanceAccountId,
    }));
  }, [defaultFinanceAccountId]);

  const laneCollections = useMemo(() => {
    const items = data?.items ?? [];
    const availableOrders = items.filter((item) => item.status !== "CANCELED");

    return {
      payment: availableOrders.filter((item) => item.paymentStatus !== "PAID"),
      shipment: availableOrders.filter(
        (item) =>
          !["DELIVERED", "SHIPPED", "NOT_REQUIRED"].includes(item.shipmentStatus),
      ),
      settlement: availableOrders.filter(
        (item) => !["SETTLED", "NOT_REQUIRED"].includes(item.settlementStatus),
      ),
    };
  }, [data?.items]);

  const laneOptions = useMemo(
    () => [
      {
        key: "payment" as const,
        label: "待收款",
        helper: "优先处理已经接近到账的订单",
        count: laneCollections.payment.length,
      },
      {
        key: "shipment" as const,
        label: "待发货",
        helper: "今天先释放仓配和物流动作",
        count: laneCollections.shipment.length,
      },
      {
        key: "settlement" as const,
        label: "待结算",
        helper: "避免渠道利润继续堆在附属页",
        count: laneCollections.settlement.length,
      },
    ],
    [laneCollections.payment.length, laneCollections.settlement.length, laneCollections.shipment.length],
  );

  useEffect(() => {
    if (laneCollections[activeLane].length) {
      return;
    }

    const fallbackLane =
      (["payment", "shipment", "settlement"] as PreviewLaneKey[]).find(
        (lane) => laneCollections[lane].length > 0,
      ) ?? "payment";

    if (fallbackLane !== activeLane) {
      setActiveLane(fallbackLane);
    }
  }, [activeLane, laneCollections]);

  const visibleOrders = useMemo(
    () => laneCollections[activeLane].map((item) => buildLaneCard(item, activeLane)),
    [activeLane, laneCollections],
  );
  const actionableBatchOrders = useMemo(() => {
    if (activeLane === "payment") {
      return laneCollections.payment;
    }

    if (activeLane === "shipment") {
      return laneCollections.shipment;
    }

    return [];
  }, [activeLane, laneCollections]);
  const canUseBatchMode =
    ((activeLane === "payment" && canRecordPayment) ||
      (activeLane === "shipment" && canBatchPrefillShipment)) &&
    actionableBatchOrders.length > 0;
  const selectedBatchIdSet = useMemo(
    () => new Set(selectedBatchIds),
    [selectedBatchIds],
  );
  const selectedBatchOrders = useMemo(
    () => actionableBatchOrders.filter((item) => selectedBatchIdSet.has(item.id)),
    [actionableBatchOrders, selectedBatchIdSet],
  );
  const isBatchSubmitting = batchActionLoading !== null;
  const batchPaymentTotal = useMemo(
    () =>
      selectedBatchOrders.reduce(
        (total, item) => total + remainingReceivable(item),
        0,
      ),
    [selectedBatchOrders],
  );
  const batchShipmentFilledFields = useMemo(
    () =>
      [
        batchShipmentForm.warehouseName,
        batchShipmentForm.recipientName,
        batchShipmentForm.recipientPhone,
        batchShipmentForm.recipientAddress,
      ].filter((value) => value.trim()).length,
    [batchShipmentForm],
  );

  useEffect(() => {
    if (canUseBatchMode) {
      return;
    }

    setIsBatchMode(false);
    setSelectedBatchIds([]);
    setBatchActionSummary(null);
  }, [canUseBatchMode]);

  useEffect(() => {
    setSelectedBatchIds((current) =>
      current.filter((id) => actionableBatchOrders.some((item) => item.id === id)),
    );
  }, [actionableBatchOrders]);

  useEffect(() => {
    if (isBatchMode) {
      return;
    }

    setSelectedBatchIds([]);
    setBatchActionSummary(null);
  }, [isBatchMode]);

  useEffect(() => {
    if (!visibleOrders.length) {
      setSelectedOrderId(null);
      return;
    }

    const hasSelected = visibleOrders.some((item) => item.id === selectedOrderId);
    if (!selectedOrderId || !hasSelected) {
      setSelectedOrderId(visibleOrders[0].id);
    }
  }, [selectedOrderId, visibleOrders]);

  const selectedOrder =
    visibleOrders.find((item) => item.id === selectedOrderId) ??
    visibleOrders[0] ??
    null;

  const totalOutstanding = useMemo(
    () =>
      laneCollections.payment.reduce(
        (total, item) =>
          total +
          Math.max(
            parseMoney(item.receivableAmount) - parseMoney(item.receivedAmount),
            0,
          ),
        0,
      ),
    [laneCollections.payment],
  );

  const focusTracks = useMemo(
    () => [
      {
        label: "待收款",
        value: String(laneCollections.payment.length),
        title: "先清最接近到账的订单",
        note: `当前还有 ${formatCurrency(totalOutstanding)} 未到账，财务动作应该被放到第一屏。`,
        tone: "warning" as const,
      },
      {
        label: "待发货",
        value: String(laneCollections.shipment.length),
        title: "先推进已具备发货条件的单",
        note: "仓配、物流和收货信息都该直接挂在订单工作台，不必先点进细页。",
        tone: "success" as const,
      },
      {
        label: "待结算",
        value: String(laneCollections.settlement.length),
        title: "渠道利润问题不要留到最后",
        note: "只要还影响账期和利润，就应该在订单页上直接看到。",
        tone: "danger" as const,
      },
    ],
    [
      laneCollections.payment.length,
      laneCollections.settlement.length,
      laneCollections.shipment.length,
      totalOutstanding,
    ],
  );

  const summary = data?.summary;

  function openComposer() {
    document.getElementById("orders-composer")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function openSelectedOrder() {
    if (!selectedOrder?.id) {
      return;
    }

    router.push(`/orders/${selectedOrder.id}`);
  }

  function toggleBatchSelection(orderId: string) {
    setSelectedBatchIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    );
  }

  function openLaneAction() {
    if (!selectedOrder?.id) {
      return;
    }

    if (activeLane === "payment") {
      router.push("/orders/payments");
      return;
    }

    if (activeLane === "shipment") {
      router.push("/orders/shipments");
      return;
    }

    const source = laneCollections.settlement.find(
      (item) => item.id === selectedOrder.id,
    );
    const query = new URLSearchParams();
    if (source?.channelPartnerId) {
      query.set("partnerId", source.channelPartnerId);
    }
    query.set("orderId", selectedOrder.id);
    router.push(`/orders/channel-settlements?${query.toString()}`);
  }

  async function handleBatchRecordPayments() {
    if (!selectedBatchOrders.length) {
      setError("请先选择要登记收款的订单");
      return;
    }

    if (!batchPaymentForm.financeAccountId) {
      setError("请先选择统一收款账户");
      return;
    }

    setError("");
    setMessage("");
    setBatchActionLoading("payment");
    setBatchActionSummary({
      action: "payment",
      total: selectedBatchOrders.length,
      completed: 0,
      successCount: 0,
      failedItems: [],
      active: true,
    });

    let completed = 0;
    let successCount = 0;
    const failedItems: BatchActionSummary["failedItems"] = [];

    for (const order of selectedBatchOrders) {
      const amount = remainingReceivable(order);

      try {
        if (amount <= 0) {
          throw new Error("该订单当前剩余应收为 0，无法继续登记");
        }

        await createOrderPayment(order.id, {
          amount,
          paymentMethod: batchPaymentForm.paymentMethod,
          financeAccountId: batchPaymentForm.financeAccountId,
          payerName: order.customer.name,
          paidAt: batchPaymentForm.paidAt || undefined,
          remark: batchPaymentForm.remark.trim() || undefined,
        });

        successCount += 1;
      } catch (requestError) {
        failedItems.push({
          id: order.id,
          orderNo: order.orderNo,
          customer: order.customer.name,
          reason:
            requestError instanceof Error
              ? requestError.message
              : "批量登记收款失败",
        });
      } finally {
        completed += 1;
        setBatchActionSummary({
          action: "payment",
          total: selectedBatchOrders.length,
          completed,
          successCount,
          failedItems: [...failedItems],
          active: completed < selectedBatchOrders.length,
        });
      }
    }

    setBatchActionLoading(null);
    setSelectedBatchIds(failedItems.map((item) => item.id));

    if (successCount > 0) {
      await loadPage();
      setMessage(
        `批量登记收款完成，成功 ${successCount} 条${
          failedItems.length ? `，失败 ${failedItems.length} 条` : ""
        }。`,
      );
    }

    if (failedItems.length) {
      setError(
        `批量登记收款完成，失败 ${failedItems.length} 条：${failedItems
          .map((item) => item.orderNo)
          .join("、")}`,
      );
    }
  }

  async function handleBatchPrefillShipment() {
    if (!selectedBatchOrders.length) {
      setError("请先选择要补齐资料的订单");
      return;
    }

    const payload = {
      ...(batchShipmentForm.warehouseName.trim()
        ? { warehouseName: batchShipmentForm.warehouseName.trim() }
        : {}),
      ...(batchShipmentForm.recipientName.trim()
        ? { recipientName: batchShipmentForm.recipientName.trim() }
        : {}),
      ...(batchShipmentForm.recipientPhone.trim()
        ? { recipientPhone: batchShipmentForm.recipientPhone.trim() }
        : {}),
      ...(batchShipmentForm.recipientAddress.trim()
        ? { recipientAddress: batchShipmentForm.recipientAddress.trim() }
        : {}),
    };

    if (!Object.keys(payload).length) {
      setError("请至少填写一个要批量补齐的发货前置字段");
      return;
    }

    setError("");
    setMessage("");
    setBatchActionLoading("shipment");
    setBatchActionSummary({
      action: "shipment",
      total: selectedBatchOrders.length,
      completed: 0,
      successCount: 0,
      failedItems: [],
      active: true,
    });

    let completed = 0;
    let successCount = 0;
    const failedItems: BatchActionSummary["failedItems"] = [];

    for (const order of selectedBatchOrders) {
      try {
        await updateOrder(order.id, payload);
        successCount += 1;
      } catch (requestError) {
        failedItems.push({
          id: order.id,
          orderNo: order.orderNo,
          customer: order.customer.name,
          reason:
            requestError instanceof Error
              ? requestError.message
              : "批量补齐发货资料失败",
        });
      } finally {
        completed += 1;
        setBatchActionSummary({
          action: "shipment",
          total: selectedBatchOrders.length,
          completed,
          successCount,
          failedItems: [...failedItems],
          active: completed < selectedBatchOrders.length,
        });
      }
    }

    setBatchActionLoading(null);
    setSelectedBatchIds(failedItems.map((item) => item.id));

    if (successCount > 0) {
      await loadPage();
      setMessage(
        `批量补齐发货前资料完成，成功 ${successCount} 条${
          failedItems.length ? `，失败 ${failedItems.length} 条` : ""
        }。`,
      );
    }

    if (failedItems.length) {
      setError(
        `批量补齐发货资料完成，失败 ${failedItems.length} 条：${failedItems
          .map((item) => item.orderNo)
          .join("、")}`,
      );
    }
  }

  async function handleCreateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.customerId || !form.productId) {
      setError("请先选择客户和商品");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await createOrder({
        customerId: form.customerId,
        quotationId: prefillQuotationId || undefined,
        channelPartnerId: form.channelPartnerId || undefined,
        orderDate: form.orderDate,
        recipientName: form.recipientName || selectedCustomer?.name || undefined,
        recipientPhone: form.recipientPhone || undefined,
        recipientAddress: form.recipientAddress || undefined,
        warehouseName: form.warehouseName || undefined,
        shippingFee: Number(form.shippingFee || 0),
        discountAmount: Number(form.discountAmount || 0),
        usagePurpose: form.usagePurpose || undefined,
        remark: form.remark || undefined,
        items: [
          {
            productId: form.productId,
            quantity: Number(form.quantity || 0),
            unitPrice: Number(form.unitPrice || 0),
            usagePurpose: form.usagePurpose || undefined,
          },
        ],
      });

      setMessage(response.message);
      await loadPage();
      router.push(`/orders/${response.order.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "创建订单失败",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cx("workspace-stack", styles.workbench)}>
      <section className={styles.commandDeck}>
        <div className={styles.commandCopy}>
          <span className={styles.eyebrow}>履约工作台</span>
          <h1>订单履约工作台</h1>
          <p>
            先判断今天先收哪笔、先发哪笔、哪笔卡在渠道结算，再进入具体订单详情。
            订单页第一眼应该给团队处理顺序，而不是一张大表单。
          </p>
        </div>

        <div className={styles.commandMeta}>
          <div className={styles.liveCard}>
            <span>当前履约节奏</span>
            <strong>
              待收款 {laneCollections.payment.length} 笔 · 待发货{" "}
              {laneCollections.shipment.length} 笔
            </strong>
            <small>
              待结算 {laneCollections.settlement.length} 笔，当前订单总量{" "}
              {summary?.totalOrders ?? 0} 笔。
            </small>
          </div>
          <div className={styles.commandActions}>
            <button className={styles.primaryAction} onClick={openComposer} type="button">
              快速新建订单
            </button>
            <button
              className={styles.secondaryAction}
              onClick={() => router.push("/orders/payments")}
              type="button"
            >
              查看收款记录
            </button>
            <button
              className={styles.secondaryAction}
              onClick={() => router.push("/orders/shipments")}
              type="button"
            >
              查看发货记录
            </button>
            <button
              className={styles.secondaryAction}
              onClick={() => router.push("/orders/channel-settlements")}
              type="button"
            >
              查看渠道结算
            </button>
          </div>
        </div>
      </section>

      {error ? <div className="danger-text small">{error}</div> : null}
      {message ? <div className="success-text small">{message}</div> : null}

      <section className={styles.focusBoard}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionEyebrow}>履约优先级</span>
            <strong>先给处理顺序，再给表单和字段。</strong>
            <p>
              把现金流、仓配与渠道利润的阻塞点抬到第一层，团队才知道今天该先做什么。
            </p>
          </div>
        </div>

        <div className={styles.trackGrid}>
          {focusTracks.map((track, index) => (
            <article
              className={cx(
                styles.trackCard,
                styles[`track${track.tone[0].toUpperCase()}${track.tone.slice(1)}`],
              )}
              key={track.label}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span>{track.label}</span>
              <strong>{track.value}</strong>
              <h2>{track.title}</h2>
              <p>{track.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.metricRibbon}>
        <article className={styles.metricCard}>
          <span>订单总数</span>
          <strong>{summary?.totalOrders ?? 0}</strong>
          <p>当前进入履约主链的订单量。</p>
        </article>
        <article className={styles.metricCard}>
          <span>待收款金额</span>
          <strong>{formatCurrency(totalOutstanding)}</strong>
          <p>优先影响现金流的未到账部分。</p>
        </article>
        <article className={styles.metricCard}>
          <span>待发货订单</span>
          <strong>{summary?.pendingShipments ?? laneCollections.shipment.length}</strong>
          <p>还未完成出库或拆批发货的订单。</p>
        </article>
        <article className={styles.metricCard}>
          <span>待结算订单</span>
          <strong>
            {summary?.pendingSettlements ?? laneCollections.settlement.length}
          </strong>
          <p>仍影响渠道利润与账期确认的订单。</p>
        </article>
      </section>

      <section className={styles.workspace}>
        <div className={styles.mainColumn}>
          <section className={styles.lanePanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>今日履约泳道</span>
                <strong>先按动作类型分泳道，再看具体订单。</strong>
                <p>收款、发货、结算各自成队列，避免所有动作都混在一页里。</p>
              </div>
            </div>

            <div className={styles.laneTabs}>
              {laneOptions.map((lane) => (
                <button
                  className={cx(
                    styles.laneTab,
                    activeLane === lane.key && styles.laneTabActive,
                  )}
                  key={lane.key}
                  onClick={() => setActiveLane(lane.key)}
                  type="button"
                >
                  <div className={styles.laneTabCopy}>
                    <strong>{lane.label}</strong>
                    <span>{lane.helper}</span>
                  </div>
                  <div className={styles.laneTabCount}>{lane.count}</div>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.queuePanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>当前订单队列</span>
                <strong>
                  {laneOptions.find((lane) => lane.key === activeLane)?.label}
                </strong>
                <p>卡片只保留会影响履约判断的信息，不再让操作人先读一长串字段。</p>
              </div>
            </div>

            {canUseBatchMode ? (
              <div className={styles.batchToolbar}>
                <div className={styles.batchToolbarTop}>
                  <div className={styles.batchToolbarCopy}>
                    <span>批量动作</span>
                    <strong>
                      {activeLane === "payment"
                        ? "先把剩余应收直接批量登记，不再一单一单跳收款页。"
                        : "先把发货前置资料批量补齐，再进入正式发货动作。"}
                    </strong>
                    <p>
                      {activeLane === "payment"
                        ? "默认按每张订单的剩余应收金额全额登记到账。"
                        : "这一版只补齐仓库与收货资料，不会直接创建发货单。"}
                    </p>
                  </div>

                  <div className={styles.batchToolbarActions}>
                    <button
                      className={styles.secondaryAction}
                      onClick={() => setIsBatchMode((current) => !current)}
                      type="button"
                    >
                      {isBatchMode ? "退出批量" : "开启批量"}
                    </button>
                    {isBatchMode ? (
                      <>
                        <button
                          className={styles.secondaryAction}
                          disabled={isBatchSubmitting}
                          onClick={() =>
                            setSelectedBatchIds(
                              actionableBatchOrders.map((item) => item.id),
                            )
                          }
                          type="button"
                        >
                          全选当前泳道
                        </button>
                        <button
                          className={styles.secondaryAction}
                          disabled={
                            isBatchSubmitting || selectedBatchOrders.length === 0
                          }
                          onClick={() => setSelectedBatchIds([])}
                          type="button"
                        >
                          清空已选
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                {isBatchMode ? (
                  <>
                    <div className={styles.batchToolbarMeta}>
                      <span className={styles.batchPill}>
                        已选 {selectedBatchOrders.length} / {actionableBatchOrders.length}
                      </span>
                      {activeLane === "payment" ? (
                        <span className={styles.batchPill}>
                          本次预计登记 {formatCurrency(batchPaymentTotal)}
                        </span>
                      ) : (
                        <span className={styles.batchPill}>
                          已填写 {batchShipmentFilledFields} 个前置字段
                        </span>
                      )}
                    </div>

                    {activeLane === "payment" ? (
                      <>
                        <div className={styles.batchFormGrid}>
                          <label className={styles.batchField}>
                            <span>收款方式</span>
                            <select
                              onChange={(event) =>
                                setBatchPaymentForm((current) => ({
                                  ...current,
                                  paymentMethod: event.target.value,
                                }))
                              }
                              value={batchPaymentForm.paymentMethod}
                            >
                              <option value="BANK_TRANSFER">银行转账</option>
                              <option value="WECHAT">微信</option>
                              <option value="ALIPAY">支付宝</option>
                              <option value="CASH">现金</option>
                              <option value="OTHER">其他</option>
                            </select>
                          </label>

                          <label className={styles.batchField}>
                            <span>收款账户</span>
                            <select
                              onChange={(event) =>
                                setBatchPaymentForm((current) => ({
                                  ...current,
                                  financeAccountId: event.target.value,
                                }))
                              }
                              value={batchPaymentForm.financeAccountId}
                            >
                              <option value="">请选择账户</option>
                              {financeAccounts.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.companyName} · {item.accountNo}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className={styles.batchField}>
                            <span>收款时间</span>
                            <input
                              onChange={(event) =>
                                setBatchPaymentForm((current) => ({
                                  ...current,
                                  paidAt: event.target.value,
                                }))
                              }
                              type="datetime-local"
                              value={batchPaymentForm.paidAt}
                            />
                          </label>

                          <label className={cx(styles.batchField, styles.batchFieldWide)}>
                            <span>统一备注</span>
                            <input
                              onChange={(event) =>
                                setBatchPaymentForm((current) => ({
                                  ...current,
                                  remark: event.target.value,
                                }))
                              }
                              placeholder="例如：4 月尾款集中到账"
                              value={batchPaymentForm.remark}
                            />
                          </label>
                        </div>

                        {!financeAccounts.length ? (
                          <p className={styles.batchToolbarHint}>
                            当前未取到可用财务账户，请先到财务账户配置里确认账户资料。
                          </p>
                        ) : null}

                        <div className={styles.batchToolbarActions}>
                          <button
                            className={styles.primaryAction}
                            disabled={
                              isBatchSubmitting ||
                              selectedBatchOrders.length === 0 ||
                              !batchPaymentForm.financeAccountId
                            }
                            onClick={handleBatchRecordPayments}
                            type="button"
                          >
                            {batchActionLoading === "payment"
                              ? "批量登记中..."
                              : "批量登记到账"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={styles.batchFormGrid}>
                          <label className={styles.batchField}>
                            <span>出货仓</span>
                            <input
                              onChange={(event) =>
                                setBatchShipmentForm((current) => ({
                                  ...current,
                                  warehouseName: event.target.value,
                                }))
                              }
                              placeholder="例如：潍坊仓"
                              value={batchShipmentForm.warehouseName}
                            />
                          </label>

                          <label className={styles.batchField}>
                            <span>收货人</span>
                            <input
                              onChange={(event) =>
                                setBatchShipmentForm((current) => ({
                                  ...current,
                                  recipientName: event.target.value,
                                }))
                              }
                              placeholder="例如：张小兰"
                              value={batchShipmentForm.recipientName}
                            />
                          </label>

                          <label className={styles.batchField}>
                            <span>联系电话</span>
                            <input
                              onChange={(event) =>
                                setBatchShipmentForm((current) => ({
                                  ...current,
                                  recipientPhone: event.target.value,
                                }))
                              }
                              placeholder="例如：13800000000"
                              value={batchShipmentForm.recipientPhone}
                            />
                          </label>

                          <label className={cx(styles.batchField, styles.batchFieldWide)}>
                            <span>收货地址</span>
                            <input
                              onChange={(event) =>
                                setBatchShipmentForm((current) => ({
                                  ...current,
                                  recipientAddress: event.target.value,
                                }))
                              }
                              placeholder="例如：山东省青岛市黄岛区示范基地"
                              value={batchShipmentForm.recipientAddress}
                            />
                          </label>
                        </div>

                        <p className={styles.batchToolbarHint}>
                          空字段不会清空原资料，只会把你填写的内容批量写入选中订单。
                        </p>

                        <div className={styles.batchToolbarActions}>
                          <button
                            className={styles.primaryAction}
                            disabled={
                              isBatchSubmitting ||
                              selectedBatchOrders.length === 0 ||
                              batchShipmentFilledFields === 0
                            }
                            onClick={handleBatchPrefillShipment}
                            type="button"
                          >
                            {batchActionLoading === "shipment"
                              ? "批量补齐中..."
                              : "批量补齐发货资料"}
                          </button>
                        </div>
                      </>
                    )}

                    {batchActionSummary ? (
                      <div className={styles.batchProgress}>
                        <div className={styles.batchProgressMeta}>
                          <strong>
                            {batchActionSummary.active
                              ? `处理中 ${batchActionSummary.completed}/${batchActionSummary.total}`
                              : `本次${batchActionSummary.action === "payment" ? "收款登记" : "资料补齐"} ${batchActionSummary.total} 条，成功 ${batchActionSummary.successCount} 条，失败 ${batchActionSummary.failedItems.length} 条`}
                          </strong>
                          <span>
                            {batchActionSummary.action === "payment"
                              ? "失败订单会保留勾选，方便继续重试。"
                              : "资料补齐按现有接口逐条提交，失败项可直接二次执行。"}
                          </span>
                        </div>

                        {batchActionSummary.failedItems.length ? (
                          <p className={styles.batchProgressText}>
                            失败项：
                            {batchActionSummary.failedItems
                              .map(
                                (item) =>
                                  `${item.orderNo}（${item.customer}：${item.reason}）`,
                              )
                              .join("；")}
                          </p>
                        ) : (
                          <p className={styles.batchProgressText}>
                            {batchActionSummary.active
                              ? "系统正在逐条提交，期间不会插入新的批量任务。"
                              : "本次没有失败项，可以继续切换泳道处理下一批。"}
                          </p>
                        )}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : activeLane === "settlement" ? (
              <div className={styles.infoBanner}>
                <strong>待结算 V1 先保持单笔处理。</strong>
                <p>
                  这一泳道先保留“打开结算台”的单笔入口，避免把订单行、渠道利润和补差逻辑一起做成高风险半成品。
                </p>
              </div>
            ) : null}

            <div className={styles.orderList}>
              {visibleOrders.length ? (
                visibleOrders.map((order, index) =>
                  isBatchMode && canUseBatchMode ? (
                    <label
                      className={cx(
                        styles.orderCard,
                        styles.orderCardSelectable,
                        selectedBatchIdSet.has(order.id) && styles.orderCardActive,
                      )}
                      key={order.id}
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      <div className={styles.orderCardTop}>
                        <div className={styles.orderCardTitle}>
                          <span>{order.orderNo}</span>
                          <strong>{order.customer}</strong>
                        </div>
                        <div className={styles.orderCardSelect}>
                          <ToneBadge tone={order.tone}>{order.statusLabel}</ToneBadge>
                          <input
                            checked={selectedBatchIdSet.has(order.id)}
                            className={styles.orderCheckbox}
                            disabled={isBatchSubmitting}
                            onChange={() => toggleBatchSelection(order.id)}
                            type="checkbox"
                          />
                        </div>
                      </div>

                      <p>{order.summary}</p>

                      <div className={styles.orderMetaGrid}>
                        <div>
                          <span>关键数值</span>
                          <strong>{order.amountLabel}</strong>
                        </div>
                        <div>
                          <span>{order.sideMetaLabel}</span>
                          <strong>{order.sideMetaValue}</strong>
                        </div>
                      </div>

                      <div className={styles.orderFooter}>
                        <div>
                          <span>下一步</span>
                          <strong>{order.nextAction}</strong>
                        </div>
                        <small>下单时间 {order.updatedAt}</small>
                      </div>
                    </label>
                  ) : (
                    <button
                      className={cx(
                        styles.orderCard,
                        selectedOrder?.id === order.id && styles.orderCardActive,
                      )}
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      style={{ animationDelay: `${index * 60}ms` }}
                      type="button"
                    >
                      <div className={styles.orderCardTop}>
                        <div className={styles.orderCardTitle}>
                          <span>{order.orderNo}</span>
                          <strong>{order.customer}</strong>
                        </div>
                        <ToneBadge tone={order.tone}>{order.statusLabel}</ToneBadge>
                      </div>

                      <p>{order.summary}</p>

                      <div className={styles.orderMetaGrid}>
                        <div>
                          <span>关键数值</span>
                          <strong>{order.amountLabel}</strong>
                        </div>
                        <div>
                          <span>{order.sideMetaLabel}</span>
                          <strong>{order.sideMetaValue}</strong>
                        </div>
                      </div>

                      <div className={styles.orderFooter}>
                        <div>
                          <span>下一步</span>
                          <strong>{order.nextAction}</strong>
                        </div>
                        <small>下单时间 {order.updatedAt}</small>
                      </div>
                    </button>
                  ),
                )
              ) : (
                <div className="empty-state">
                  <strong>当前泳道没有待处理订单</strong>
                  <p>可以切换到其他履约泳道，或直接创建一笔新订单。</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.inspectorPanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>订单 Inspector</span>
                <strong>
                  {isBatchMode && canUseBatchMode
                    ? "右侧固定看当前批量动作的执行范围。"
                    : "右侧固定看当前单最该处理什么。"}
                </strong>
              </div>
            </div>

            {isBatchMode && canUseBatchMode ? (
              <div className={styles.inspectorBody}>
                <div className={styles.selectedOrder}>
                  <span>{activeLane === "payment" ? "批量到账" : "批量补资料"}</span>
                  <strong>
                    {selectedBatchOrders.length
                      ? `已选 ${selectedBatchOrders.length} 条订单`
                      : "先从左侧勾选需要处理的订单"}
                  </strong>
                  <p>
                    {activeLane === "payment"
                      ? `本次按统一方式登记到账，预计回写 ${formatCurrency(batchPaymentTotal)}。`
                      : "这一版只补齐发货前置资料，不会直接创建发货记录。"}
                  </p>
                </div>

                <div className={styles.selectedGrid}>
                  <div>
                    <span>执行方式</span>
                    <strong>
                      {activeLane === "payment"
                        ? paymentMethodLabel(batchPaymentForm.paymentMethod)
                        : "PATCH 订单资料"}
                    </strong>
                  </div>
                  <div>
                    <span>统一配置</span>
                    <strong>
                      {activeLane === "payment"
                        ? financeAccounts.find(
                            (item) => item.id === batchPaymentForm.financeAccountId,
                          )?.companyName || "待选择账户"
                        : `${batchShipmentFilledFields} 个字段待回写`}
                    </strong>
                  </div>
                  <div>
                    <span>处理中状态</span>
                    <strong>
                      {batchActionSummary?.active
                        ? `${batchActionSummary.completed}/${batchActionSummary.total}`
                        : isBatchSubmitting
                          ? "提交中"
                          : "待执行"}
                    </strong>
                  </div>
                  <div>
                    <span>失败保留</span>
                    <strong>
                      {batchActionSummary?.failedItems.length
                        ? `${batchActionSummary.failedItems.length} 条`
                        : "无"}
                    </strong>
                  </div>
                </div>

                <div className={styles.timelinePanel}>
                  <span>当前勾选订单</span>
                  <div className={styles.batchSelectionList}>
                    {selectedBatchOrders.length ? (
                      selectedBatchOrders.slice(0, 5).map((item) => (
                        <div className={styles.batchSelectionItem} key={item.id}>
                          <strong>{item.orderNo}</strong>
                          <span>{item.customer.name}</span>
                        </div>
                      ))
                    ) : (
                      <div className={styles.batchSelectionEmpty}>
                        还没有选中订单，左侧勾选后这里会同步显示。
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.inspectorActions}>
                  <button
                    className={styles.secondaryAction}
                    disabled={isBatchSubmitting}
                    onClick={() =>
                      setSelectedBatchIds(actionableBatchOrders.map((item) => item.id))
                    }
                    type="button"
                  >
                    全选本泳道
                  </button>
                  <button
                    className={styles.primaryAction}
                    disabled={
                      isBatchSubmitting ||
                      selectedBatchOrders.length === 0 ||
                      (activeLane === "payment"
                        ? !batchPaymentForm.financeAccountId
                        : batchShipmentFilledFields === 0)
                    }
                    onClick={
                      activeLane === "payment"
                        ? handleBatchRecordPayments
                        : handleBatchPrefillShipment
                    }
                    type="button"
                  >
                    {activeLane === "payment" ? "执行批量到账" : "执行批量补齐"}
                  </button>
                </div>
              </div>
            ) : selectedOrder ? (
              <div className={styles.inspectorBody}>
                <div className={styles.selectedOrder}>
                  <span>{selectedOrder.orderNo}</span>
                  <strong>{selectedOrder.customer}</strong>
                  <p>{selectedOrder.summary}</p>
                </div>

                <div className={styles.selectedGrid}>
                  <div>
                    <span>当前阻塞</span>
                    <strong>{selectedOrder.blocker}</strong>
                  </div>
                  <div>
                    <span>下一步动作</span>
                    <strong>{selectedOrder.nextAction}</strong>
                  </div>
                  <div>
                    <span>关键数值</span>
                    <strong>{selectedOrder.amountLabel}</strong>
                  </div>
                  <div>
                    <span>{selectedOrder.sideMetaLabel}</span>
                    <strong>{selectedOrder.sideMetaValue}</strong>
                  </div>
                </div>

                <div className={styles.timelinePanel}>
                  <span>当前订单时间线</span>
                  <div className={styles.timelineList}>
                    {selectedOrder.timeline.map((item) => (
                      <div className={styles.timelineItem} key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.inspectorActions}>
                  <button className={styles.primaryAction} onClick={openSelectedOrder} type="button">
                    打开订单详情
                  </button>
                  <button
                    className={styles.secondaryAction}
                    disabled={activeLane === "settlement" && !canSettleChannel}
                    onClick={openLaneAction}
                    type="button"
                  >
                    {activeLane === "payment"
                      ? "打开收款台"
                      : activeLane === "shipment"
                        ? "打开发货台"
                        : "打开结算台"}
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className={styles.linkPanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>相关履约入口</span>
                <strong>履约页应该串起整条执行链。</strong>
              </div>
            </div>

            <div className={styles.linkList}>
              <button
                className={styles.linkCard}
                onClick={() => router.push("/orders/payments")}
                type="button"
              >
                <span>收款记录</span>
                <strong>财务到账确认</strong>
                <p>把到账确认、账户登记和尾款节奏统一处理。</p>
              </button>
              <button
                className={styles.linkCard}
                onClick={() => router.push("/orders/shipments")}
                type="button"
              >
                <span>发货记录</span>
                <strong>仓配与物流动作</strong>
                <p>从出库到签收都应该可追踪，而不是只在详情页里补字段。</p>
              </button>
              <button
                className={styles.linkCard}
                onClick={() => router.push("/orders/channel-settlements")}
                type="button"
              >
                <span>渠道结算</span>
                <strong>利润与账期闭环</strong>
                <p>渠道商家、补差和利润核销应该成为正式链路的一部分。</p>
              </button>
            </div>
          </section>
        </aside>
      </section>

      <section className={styles.composerPanel} id="orders-composer">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionEyebrow}>快速新建订单</span>
            <strong>保留落库能力，但不再让表单盖过履约优先级。</strong>
            <p>
              先看今天该推进哪笔，再在这里快速录入新订单。旧能力保留，但位置退到第二层。
            </p>
          </div>
        </div>

        <div className={styles.composerGrid}>
          <aside className={styles.composerAside}>
            <div className={styles.composerInfo}>
              <span>当前基础资料</span>
              <strong>客户 {customers.length} 条 · 商品 {products.length} 条</strong>
              <p className={styles.composerHint}>
                渠道商家 {channelPartners.length} 条。支持从客户页或报价页带入客户后直接生成订单。
              </p>
            </div>
            <div className={styles.composerSummary}>
              <div className={styles.composerInfo}>
                <span>订单来源</span>
                <strong>{data?.source === "mock" ? "结构占位数据" : "真实数据"}</strong>
              </div>
              <div className={styles.composerInfo}>
                <span>当前商品</span>
                <strong>
                  {selectedProduct
                    ? `${selectedProduct.displayName}${selectedProduct.unit ? ` · ${selectedProduct.unit}` : ""}`
                    : "待选择"}
                </strong>
              </div>
            </div>
          </aside>

          <form className={styles.composerForm} onSubmit={handleCreateOrder}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="order-customer">客户</label>
                <select
                  id="order-customer"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      customerId: event.target.value,
                      recipientName:
                        current.recipientName ||
                        customers.find((item) => item.id === event.target.value)?.name ||
                        "",
                    }))
                  }
                  value={form.customerId}
                >
                  <option value="">请选择客户</option>
                  {customers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.companyName ? ` · ${item.companyName}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="order-product">商品</label>
                <select
                  id="order-product"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      productId: event.target.value,
                      unitPrice:
                        String(
                          products.find((item) => item.id === event.target.value)
                            ?.suggestedPrice ?? "",
                        ) || "",
                    }))
                  }
                  value={form.productId}
                >
                  <option value="">请选择商品</option>
                  {products.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.displayName}
                      {item.specification ? ` · ${item.specification}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="order-quantity">数量</label>
                <input
                  id="order-quantity"
                  min="0.01"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, quantity: event.target.value }))
                  }
                  step="0.01"
                  type="number"
                  value={form.quantity}
                />
              </div>

              <div className="field">
                <label htmlFor="order-unit-price">单价</label>
                <input
                  id="order-unit-price"
                  min="0"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, unitPrice: event.target.value }))
                  }
                  step="0.01"
                  type="number"
                  value={form.unitPrice}
                />
              </div>

              <div className="field">
                <label htmlFor="order-date">下单时间</label>
                <input
                  id="order-date"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, orderDate: event.target.value }))
                  }
                  type="datetime-local"
                  value={form.orderDate}
                />
              </div>

              <div className="field">
                <label htmlFor="order-channel-partner">渠道商家</label>
                <select
                  id="order-channel-partner"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      channelPartnerId: event.target.value,
                    }))
                  }
                  value={form.channelPartnerId}
                >
                  <option value="">不绑定渠道商家</option>
                  {channelPartners.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.partnerName}
                      {item.city ? ` · ${item.city}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="order-recipient-name">收货人</label>
                <input
                  id="order-recipient-name"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      recipientName: event.target.value,
                    }))
                  }
                  placeholder="例如：赵千谊"
                  value={form.recipientName}
                />
              </div>

              <div className="field">
                <label htmlFor="order-recipient-phone">联系电话</label>
                <input
                  id="order-recipient-phone"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      recipientPhone: event.target.value,
                    }))
                  }
                  placeholder="例如：13800000000"
                  value={form.recipientPhone}
                />
              </div>

              <div className="field">
                <label htmlFor="order-warehouse">出货仓</label>
                <input
                  id="order-warehouse"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      warehouseName: event.target.value,
                    }))
                  }
                  placeholder="例如：潍坊仓"
                  value={form.warehouseName}
                />
              </div>

              <div className="field">
                <label htmlFor="order-shipping-fee">运费</label>
                <input
                  id="order-shipping-fee"
                  min="0"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      shippingFee: event.target.value,
                    }))
                  }
                  step="0.01"
                  type="number"
                  value={form.shippingFee}
                />
              </div>

              <div className="field">
                <label htmlFor="order-discount-amount">优惠金额</label>
                <input
                  id="order-discount-amount"
                  min="0"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      discountAmount: event.target.value,
                    }))
                  }
                  step="0.01"
                  type="number"
                  value={form.discountAmount}
                />
              </div>

              <div className="field full">
                <label htmlFor="order-recipient-address">收货地址</label>
                <input
                  id="order-recipient-address"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      recipientAddress: event.target.value,
                    }))
                  }
                  placeholder="例如：山东省潍坊市寿光市示范基地"
                  value={form.recipientAddress}
                />
              </div>

              <div className="field full">
                <label htmlFor="order-usage-purpose">用途说明</label>
                <input
                  id="order-usage-purpose"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      usagePurpose: event.target.value,
                    }))
                  }
                  placeholder="例如：西红柿试验与示范点补货"
                  value={form.usagePurpose}
                />
              </div>

              <div className="field full">
                <label htmlFor="order-remark">备注</label>
                <textarea
                  id="order-remark"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, remark: event.target.value }))
                  }
                  placeholder="补充订单说明、折扣原因或收货备注"
                  value={form.remark}
                />
              </div>
            </div>

            <div className={styles.composerActions}>
              <button
                className="button inline"
                disabled={loading || bootstrapping}
                type="submit"
              >
                {loading ? "创建中..." : "创建订单"}
              </button>
              {message ? (
                <div className="small success-text">{message}</div>
              ) : null}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
