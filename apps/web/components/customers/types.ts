"use client";

export type IndustryGroupOption = {
  id: string;
  name: string;
  subgroups: Array<{ id: string; name: string }>;
};

export type UserOption = {
  id: string;
  displayName: string;
  roleName: string;
};

export type CustomerFormValues = {
  customerName: string;
  companyName: string;
  contactName: string;
  mobile: string;
  wechatId: string;
  email: string;
  province: string;
  city: string;
  district: string;
  address: string;
  source: string;
  industryGroupId: string;
  industrySubgroupId: string;
  status: string;
  ownerUserId: string;
  cooperationDirection: string;
  cooperationContent: string;
  estimatedAmount: string;
  dealProbability: string;
  remark: string;
};

export type CustomerStage =
  | "new"
  | "contacted"
  | "following"
  | "quoted"
  | "cooperating"
  | "paused";

export type CustomerPriority = "normal" | "high" | "urgent";

export type CustomerQuoteStatus = "none" | "linked" | "waiting_reply";

export interface CustomerItem {
  id: string;
  name: string;
  code?: string;
  stage: CustomerStage;
  priority?: CustomerPriority;
  ownerName?: string;
  industry?: string;
  source?: string;
  nextAction?: string;
  recentActivityAt?: string;
  recentActivitySummary?: string;
  intentionScore?: number;
  quoteAmount?: number;
  followUpCount?: number;
  quoteStatus?: CustomerQuoteStatus;
  tags?: string[];
  lastUpdatedAt?: string;
  priorityReason?: string;
}

export type CustomerDetail = {
  id: string;
  name: string;
  companyName?: string | null;
  contactName?: string | null;
  mobile?: string | null;
  wechat?: string | null;
  email?: string | null;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  source?: string | null;
  status: string;
  cooperationDirection?: string | null;
  cooperationContent?: string | null;
  estimatedAmount?: string | null;
  successProbability?: number | null;
  remark?: string | null;
  ownerAssignedAt: string;
  ownerProtectionMonths: number;
  ownerProtectedUntil: string;
  ownerProtectionStatus: "PROTECTED" | "PENDING_MAINTENANCE";
  canClaimOwnership?: boolean;
  approvalRequests?: Array<{
    id: string;
    type: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "NOT_REQUIRED";
    title: string;
    summary?: string | null;
    requiredRoleCode?: string | null;
    decisionRemark?: string | null;
    createdAt: string;
    decidedAt?: string | null;
    requester?: {
      id: string;
      displayName: string;
      roleName: string;
    } | null;
    actor?: {
      id: string;
      displayName: string;
      roleName: string;
    } | null;
  }>;
  owner: { id: string; displayName: string; role: { name: string } };
  industryGroup?: { id: string; name: string } | null;
  industrySubgroup?: { id: string; name: string } | null;
};

export const customerStatusOptions = [
  { value: "UNCONTACTED", label: "未联系" },
  { value: "CONTACTED", label: "已联系" },
  { value: "MET", label: "已拜访" },
  { value: "COOPERATING", label: "合作中" },
  { value: "PAUSED", label: "暂停跟进" },
] as const;

export const customerStatusLabelMap: Record<string, string> =
  Object.fromEntries(
    customerStatusOptions.map((option) => [option.value, option.label]),
  );

export function customerStageFromStatus(
  status: string,
  hasQuotation = false,
): CustomerStage {
  if (hasQuotation && status !== "COOPERATING") {
    return "quoted";
  }

  switch (status) {
    case "CONTACTED":
      return "contacted";
    case "MET":
      return "following";
    case "COOPERATING":
      return "cooperating";
    case "PAUSED":
      return "paused";
    default:
      return "new";
  }
}

export function customerQuoteStatusLabel(status?: CustomerQuoteStatus) {
  switch (status) {
    case "linked":
      return "已关联";
    case "waiting_reply":
      return "待回复";
    case "none":
    default:
      return "未报价";
  }
}

export function customerStatusTone(status: string) {
  switch (status) {
    case "COOPERATING":
      return "success";
    case "PAUSED":
      return "danger";
    case "MET":
      return "warning";
    default:
      return "neutral";
  }
}

export function customerOwnerProtectionTone(
  status: CustomerDetail["ownerProtectionStatus"],
) {
  return status === "PROTECTED" ? "success" : "warning";
}

export function customerOwnerProtectionLabel(
  status: CustomerDetail["ownerProtectionStatus"],
) {
  return status === "PROTECTED" ? "保护中" : "待维护";
}

export const defaultCustomerForm: CustomerFormValues = {
  customerName: "",
  companyName: "",
  contactName: "",
  mobile: "",
  wechatId: "",
  email: "",
  province: "",
  city: "",
  district: "",
  address: "",
  source: "",
  industryGroupId: "",
  industrySubgroupId: "",
  status: "UNCONTACTED",
  ownerUserId: "",
  cooperationDirection: "",
  cooperationContent: "",
  estimatedAmount: "",
  dealProbability: "50",
  remark: "",
};

export function createCustomerForm(ownerUserId = ""): CustomerFormValues {
  return {
    ...defaultCustomerForm,
    ownerUserId,
  };
}

export function customerToFormValues(
  customer: CustomerDetail,
): CustomerFormValues {
  return {
    customerName: customer.name,
    companyName: customer.companyName ?? "",
    contactName: customer.contactName ?? "",
    mobile: customer.mobile ?? "",
    wechatId: customer.wechat ?? "",
    email: customer.email ?? "",
    province: customer.province ?? "",
    city: customer.city ?? "",
    district: customer.district ?? "",
    address: customer.address ?? "",
    source: customer.source ?? "",
    industryGroupId: customer.industryGroup?.id ?? "",
    industrySubgroupId: customer.industrySubgroup?.id ?? "",
    status: customer.status,
    ownerUserId: customer.owner.id,
    cooperationDirection: customer.cooperationDirection ?? "",
    cooperationContent: customer.cooperationContent ?? "",
    estimatedAmount: customer.estimatedAmount ?? "",
    dealProbability:
      customer.successProbability === null ||
      customer.successProbability === undefined
        ? ""
        : String(customer.successProbability),
    remark: customer.remark ?? "",
  };
}

function normalizeOptionalText(value: string) {
  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue : undefined;
}

export function toCustomerPayload(form: CustomerFormValues) {
  return {
    customerName: form.customerName.trim(),
    companyName: normalizeOptionalText(form.companyName),
    contactName: normalizeOptionalText(form.contactName),
    mobile: normalizeOptionalText(form.mobile),
    wechatId: normalizeOptionalText(form.wechatId),
    email: normalizeOptionalText(form.email),
    province: normalizeOptionalText(form.province),
    city: normalizeOptionalText(form.city),
    district: normalizeOptionalText(form.district),
    address: normalizeOptionalText(form.address),
    source: normalizeOptionalText(form.source),
    industryGroupId: normalizeOptionalText(form.industryGroupId),
    industrySubgroupId: normalizeOptionalText(form.industrySubgroupId),
    status: form.status,
    ownerUserId: form.ownerUserId,
    cooperationDirection: normalizeOptionalText(form.cooperationDirection),
    cooperationContent: normalizeOptionalText(form.cooperationContent),
    estimatedAmount: form.estimatedAmount
      ? Number(form.estimatedAmount)
      : undefined,
    dealProbability: form.dealProbability
      ? Number(form.dealProbability)
      : undefined,
    remark: normalizeOptionalText(form.remark),
  };
}

export function formatCustomerMoney(value?: string | null) {
  if (!value) {
    return "--";
  }

  return `¥${Number(value).toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
