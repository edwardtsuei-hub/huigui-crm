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
  owner: { id: string; displayName: string; role: { name: string } };
  industryGroup?: { id: string; name: string } | null;
  industrySubgroup?: { id: string; name: string } | null;
};

export const customerStatusOptions = [
  { value: "UNCONTACTED", label: "未联系" },
  { value: "CONTACTED", label: "已联系" },
  { value: "MET", label: "已拜访" },
  { value: "COOPERATING", label: "合作中" },
  { value: "PAUSED", label: "暂停跟进" }
] as const;

export const customerStatusLabelMap: Record<string, string> = Object.fromEntries(
  customerStatusOptions.map((option) => [option.value, option.label])
);

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
  remark: ""
};

export function createCustomerForm(ownerUserId = ""): CustomerFormValues {
  return {
    ...defaultCustomerForm,
    ownerUserId
  };
}

export function customerToFormValues(customer: CustomerDetail): CustomerFormValues {
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
      customer.successProbability === null || customer.successProbability === undefined
        ? ""
        : String(customer.successProbability),
    remark: customer.remark ?? ""
  };
}

export function toCustomerPayload(form: CustomerFormValues) {
  return {
    ...form,
    estimatedAmount: form.estimatedAmount ? Number(form.estimatedAmount) : undefined,
    dealProbability: form.dealProbability ? Number(form.dealProbability) : undefined
  };
}

export function formatCustomerMoney(value?: string | null) {
  if (!value) {
    return "--";
  }

  return `¥${Number(value).toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}
