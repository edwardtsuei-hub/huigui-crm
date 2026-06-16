"use client";

import { apiFetch } from "./api";

export type DataSourceMode = "database" | "mock";

export type OrderListItem = {
  id: string;
  orderNo: string;
  orderDate: string;
  customer: {
    id: string;
    name: string;
  };
  channelPartnerId: string | null;
  channelPartnerName: string | null;
  recipientName: string | null;
  warehouseName: string | null;
  totalProductAmount: string;
  receivableAmount: string;
  receivedAmount: string;
  itemCount: number;
  paymentStatus: string;
  shipmentStatus: string;
  settlementStatus: string;
  status: string;
  sourceLabel: string;
};

export type OrdersListResponse = {
  source: DataSourceMode;
  summary: {
    totalOrders: number;
    unpaidOrders: number;
    pendingShipments: number;
    pendingSettlements: number;
    totalReceivable: string;
    totalReceived: string;
  };
  items: OrderListItem[];
};

export type OrderPaymentRecord = {
  id: string;
  paymentNo: string | null;
  payerName: string | null;
  paymentMethod: string;
  amount: string;
  paidAt: string;
  status: string;
  referenceNo: string | null;
  order: {
    id: string;
    orderNo: string;
    customerName: string;
  };
  financeAccount: {
    id: string;
    companyName: string;
    accountNo: string;
  } | null;
};

export type PaymentsListResponse = {
  source: DataSourceMode;
  summary: {
    totalRecords: number;
    confirmedCount: number;
    pendingCount: number;
    totalAmount: string;
  };
  items: OrderPaymentRecord[];
};

export type OrderShipmentRecord = {
  id: string;
  shipmentNo: string | null;
  warehouseName: string | null;
  courierCompany: string | null;
  trackingNo: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  status: string;
  itemCount: number;
  order: {
    id: string;
    orderNo: string;
    customerName: string;
  };
};

export type ShipmentsListResponse = {
  source: DataSourceMode;
  summary: {
    totalRecords: number;
    pendingCount: number;
    deliveredCount: number;
    activeCourierCount: number;
  };
  items: OrderShipmentRecord[];
};

export type ChannelSettlementRecord = {
  id: string;
  settlementNo: string;
  channelPartnerName: string;
  periodStart: string | null;
  periodEnd: string | null;
  totalSupplyAmount: string;
  totalCostAmount: string;
  totalProfitAmount: string;
  totalPaidAmount: string;
  status: string;
  items: number;
};

export type ChannelSettlementsListResponse = {
  source: DataSourceMode;
  summary: {
    totalRecords: number;
    pendingCount: number;
    settledCount: number;
    totalProfitAmount: string;
  };
  items: ChannelSettlementRecord[];
};

export type FinanceAccountRecord = {
  id: string;
  companyName: string;
  accountName: string | null;
  accountNo: string;
  bankName: string | null;
  accountType: string | null;
  usageScene: string | null;
  isDefault: boolean;
  enabled: boolean;
  remark: string | null;
};

export type FinanceAccountsListResponse = {
  source: DataSourceMode;
  summary: {
    totalAccounts: number;
    enabledAccounts: number;
    defaultAccounts: number;
  };
  items: FinanceAccountRecord[];
};

export type ChannelPartnerRecord = {
  id: string;
  partnerName: string;
  contactName: string | null;
  mobile: string | null;
  city: string | null;
  settlementType: string | null;
  settlementRuleText: string | null;
  remark: string | null;
  createdAt: string;
  owner: {
    id: string;
    displayName: string;
  } | null;
};

export type ChannelPartnersListResponse = {
  items: ChannelPartnerRecord[];
};

export type OrderDetailResponse = {
  source: DataSourceMode;
  order: OrderListItem;
  items: Array<{
    id: string;
    lineNo: number;
    itemName: string;
    spec: string | null;
    unit: string | null;
    quantity: string;
    unitPrice: string;
    lineAmount: string;
    usagePurpose: string | null;
  }>;
  payments: Array<{
    id: string;
    paymentNo: string | null;
    payerName: string | null;
    paymentMethod: string;
    amount: string;
    paidAt: string;
    status: string;
    referenceNo: string | null;
    financeAccount: {
      id: string;
      companyName: string;
      accountNo: string;
    } | null;
  }>;
  shipments: Array<{
    id: string;
    shipmentNo: string | null;
    warehouseName: string | null;
    courierCompany: string | null;
    trackingNo: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    status: string;
    items: Array<{
      id: string;
      itemName: string;
      quantity: string;
    }>;
  }>;
  settlements: Array<{
    id: string;
    settlementNo: string | null;
    channelPartnerName: string | null;
    itemName: string;
    quantity: string;
    supplyAmount: string;
    cashPaymentAmount: string;
    costAmount: string;
    profitAmount: string;
    paymentNote: string | null;
    remark: string | null;
  }>;
};

export type CreateSalesOrderPayload = {
  customerId: string;
  quotationId?: string;
  contractId?: string;
  channelPartnerId?: string;
  orderDate?: string;
  orderType?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientProvince?: string;
  recipientCity?: string;
  recipientDistrict?: string;
  recipientAddress?: string;
  usagePurpose?: string;
  warehouseName?: string;
  discountAmount?: number;
  shippingFee?: number;
  remark?: string;
  items: Array<{
    productId?: string;
    itemName?: string;
    spec?: string;
    unit?: string;
    quantity: number;
    unitPrice?: number;
    usagePurpose?: string;
    remark?: string;
  }>;
};

export type CreateSalesOrderResult = {
  message: string;
  order: OrderListItem;
};

export type UpdateSalesOrderPayload = {
  orderDate?: string;
  orderType?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientProvince?: string;
  recipientCity?: string;
  recipientDistrict?: string;
  recipientAddress?: string;
  usagePurpose?: string;
  warehouseName?: string;
  remark?: string;
};

export type UpdateSalesOrderResult = {
  message: string;
  order: OrderListItem;
};

export type CreatePaymentRecordPayload = {
  financeAccountId?: string;
  payerName?: string;
  paymentMethod: string;
  amount: number;
  paidAt?: string;
  status?: string;
  referenceNo?: string;
  remark?: string;
};

export type CreatePaymentRecordResult = {
  message: string;
  payment: OrderPaymentRecord;
  order: {
    id: string;
    paymentStatus: string;
    receivedAmount: string;
    status: string;
  };
};

export type CreateShipmentRecordPayload = {
  warehouseName?: string;
  courierCompany?: string;
  trackingNo?: string;
  shippedAt?: string;
  deliveredAt?: string;
  status?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  remark?: string;
  items: Array<{
    orderItemId: string;
    quantity: number;
  }>;
};

export type CreateShipmentRecordResult = {
  message: string;
  shipment: {
    id: string;
    shipmentNo: string | null;
    warehouseName: string | null;
    courierCompany: string | null;
    trackingNo: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    status: string;
    itemCount: number;
  };
  order: {
    id: string;
    shipmentStatus: string;
    status: string;
  };
};

export type CreateFinanceAccountPayload = {
  companyName: string;
  accountName?: string;
  accountNo: string;
  bankName?: string;
  accountType?: string;
  usageScene?: string;
  isDefault?: boolean;
  enabled?: boolean;
  remark?: string;
};

export type UpdateFinanceAccountPayload = Partial<CreateFinanceAccountPayload>;

export type CreateFinanceAccountResult = {
  message: string;
  item: FinanceAccountRecord;
};

export type CreateChannelPartnerPayload = {
  partnerName: string;
  contactName?: string;
  mobile?: string;
  wechatId?: string;
  province?: string;
  city?: string;
  district?: string;
  address?: string;
  settlementRuleText?: string;
  remark?: string;
};

export type CreateChannelPartnerResult = {
  message: string;
  item: ChannelPartnerRecord;
};

export type CreateChannelSettlementPayload = {
  channelPartnerId: string;
  periodStart?: string;
  periodEnd?: string;
  totalPaidAmount?: number;
  status?: string;
  remark?: string;
  items: Array<{
    orderItemId: string;
    quantity?: number;
    supplyUnitPrice?: number;
    cashPaymentAmount?: number;
    paymentNote?: string;
    costUnitPrice?: number;
    remark?: string;
  }>;
};

export type CreateChannelSettlementResult = {
  message: string;
  settlement: ChannelSettlementRecord;
  affectedOrders: Array<{
    id: string;
    settlementStatus: string;
  }>;
};

export const ORDER_PICKER_PAGE_SIZE = 200;

export async function fetchOrders(query?: URLSearchParams | string) {
  const suffix = query
    ? `?${typeof query === "string" ? query : query.toString()}`
    : "";
  return apiFetch<OrdersListResponse>(`/orders${suffix}`);
}

export async function fetchOrderPayments(query?: URLSearchParams | string) {
  const suffix = query
    ? `?${typeof query === "string" ? query : query.toString()}`
    : "";
  return apiFetch<PaymentsListResponse>(`/orders/payments${suffix}`);
}

export async function fetchOrderShipments(query?: URLSearchParams | string) {
  const suffix = query
    ? `?${typeof query === "string" ? query : query.toString()}`
    : "";
  return apiFetch<ShipmentsListResponse>(`/orders/shipments${suffix}`);
}

export async function fetchChannelSettlements(
  query?: URLSearchParams | string,
) {
  const suffix = query
    ? `?${typeof query === "string" ? query : query.toString()}`
    : "";
  return apiFetch<ChannelSettlementsListResponse>(
    `/orders/channel-settlements${suffix}`,
  );
}

export async function fetchOrderDetail(id: string) {
  return apiFetch<OrderDetailResponse>(`/orders/${id}`);
}

export async function fetchFinanceAccounts(query?: URLSearchParams | string) {
  const suffix = query
    ? `?${typeof query === "string" ? query : query.toString()}`
    : "";
  return apiFetch<FinanceAccountsListResponse>(`/finance-accounts${suffix}`);
}

export async function fetchChannelPartners(query?: URLSearchParams | string) {
  const suffix = query
    ? `?${typeof query === "string" ? query : query.toString()}`
    : "";
  return apiFetch<ChannelPartnersListResponse>(`/channel-partners${suffix}`);
}

export async function createOrder(payload: CreateSalesOrderPayload) {
  return apiFetch<CreateSalesOrderResult>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateOrder(
  id: string,
  payload: UpdateSalesOrderPayload,
) {
  return apiFetch<UpdateSalesOrderResult>(`/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function confirmOrder(id: string) {
  return apiFetch<UpdateSalesOrderResult>(`/orders/${id}/confirm`, {
    method: "POST",
  });
}

export async function cancelOrder(id: string) {
  return apiFetch<UpdateSalesOrderResult>(`/orders/${id}/cancel`, {
    method: "POST",
  });
}

export async function createOrderPayment(
  orderId: string,
  payload: CreatePaymentRecordPayload,
) {
  return apiFetch<CreatePaymentRecordResult>(`/orders/${orderId}/payments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createOrderShipment(
  orderId: string,
  payload: CreateShipmentRecordPayload,
) {
  return apiFetch<CreateShipmentRecordResult>(`/orders/${orderId}/shipments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createFinanceAccount(
  payload: CreateFinanceAccountPayload,
) {
  return apiFetch<CreateFinanceAccountResult>("/finance-accounts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFinanceAccount(
  id: string,
  payload: UpdateFinanceAccountPayload,
) {
  return apiFetch<CreateFinanceAccountResult>(`/finance-accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function createChannelPartner(
  payload: CreateChannelPartnerPayload,
) {
  return apiFetch<CreateChannelPartnerResult>("/channel-partners", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createChannelSettlement(
  payload: CreateChannelSettlementPayload,
) {
  return apiFetch<CreateChannelSettlementResult>(
    "/orders/channel-settlements",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
