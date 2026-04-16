"use client";

export type IndustryGroupOption = {
  id: string;
  name: string;
  subgroups: Array<{ id: string; name: string }>;
};

export type ProductFormValues = {
  name: string;
  displayName: string;
  industryGroupId: string;
  industrySubgroupId: string;
  spec: string;
  unit: string;
  costPrice: string;
  salePrice: string;
  enterpriseStandardNo: string;
  intro: string;
  scenarios: string;
  tagText: string;
  labelImageUrl: string;
  productImageUrl: string;
  outputTemplateType: string;
  status: string;
  remark: string;
};

export type ProductRecord = {
  id: string;
  name: string;
  displayName: string;
  industryGroupId?: string | null;
  industrySubgroupId?: string | null;
  specification?: string | null;
  unit?: string | null;
  costPrice?: string | null;
  suggestedPrice: string;
  outputTemplateType: string;
  status: string;
  enabled: boolean;
  standardNumber?: string | null;
  summary?: string | null;
  scenarios?: string | null;
  remark?: string | null;
  labelText?: string | null;
  industryGroup?: { id?: string; name: string } | null;
  industrySubgroup?: { id?: string; name: string } | null;
  imageUrl?: string | null;
  tagScreenshotUrl?: string | null;
  quoteEnabled?: boolean;
  employeeVisible?: boolean;
  customerVisible?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export const defaultProductForm: ProductFormValues = {
  name: "",
  displayName: "",
  industryGroupId: "",
  industrySubgroupId: "",
  spec: "",
  unit: "项",
  costPrice: "",
  salePrice: "",
  enterpriseStandardNo: "",
  intro: "",
  scenarios: "",
  tagText: "",
  labelImageUrl: "",
  productImageUrl: "",
  outputTemplateType: "SOLUTION_QUOTE",
  status: "ENABLED",
  remark: ""
};

export const productStatusOptions = [
  { value: "ENABLED", label: "启用" },
  { value: "DISABLED", label: "停用" }
] as const;

export const outputTemplateOptions = [
  { value: "AGRICULTURE_PLAN", label: "农业方案" },
  { value: "PRODUCT_QUOTE", label: "产品报价" },
  { value: "SOLUTION_QUOTE", label: "方案报价" }
] as const;

export const outputTemplateLabelMap: Record<string, string> = Object.fromEntries(
  outputTemplateOptions.map((option) => [option.value, option.label])
);

export function productToFormValues(product: ProductRecord): ProductFormValues {
  return {
    name: product.name,
    displayName: product.displayName,
    industryGroupId: product.industryGroupId ?? "",
    industrySubgroupId: product.industrySubgroupId ?? "",
    spec: product.specification ?? "",
    unit: product.unit ?? "项",
    costPrice: product.costPrice ?? "",
    salePrice: product.suggestedPrice ?? "",
    enterpriseStandardNo: product.standardNumber ?? "",
    intro: product.summary ?? "",
    scenarios: product.scenarios ?? "",
    tagText: product.labelText ?? "",
    labelImageUrl: product.tagScreenshotUrl ?? "",
    productImageUrl: product.imageUrl ?? "",
    outputTemplateType: product.outputTemplateType,
    status: product.enabled ? "ENABLED" : product.status,
    remark: product.remark ?? ""
  };
}

export function toProductPayload(form: ProductFormValues) {
  return {
    name: form.name,
    displayName: form.displayName,
    industryGroupId: form.industryGroupId || undefined,
    industrySubgroupId: form.industrySubgroupId || undefined,
    spec: form.spec || undefined,
    unit: form.unit || undefined,
    costPrice: form.costPrice ? Number(form.costPrice) : undefined,
    salePrice: Number(form.salePrice),
    enterpriseStandardNo: form.enterpriseStandardNo || undefined,
    intro: form.intro || undefined,
    scenarios: form.scenarios || undefined,
    labelText: form.tagText || undefined,
    labelImageUrl: form.labelImageUrl || undefined,
    productImageUrl: form.productImageUrl || undefined,
    outputTemplateType: form.outputTemplateType,
    status: form.status,
    remark: form.remark || undefined
  };
}

export function formatProductMoney(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  const amount = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(amount)) {
    return "--";
  }

  return `¥${amount.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

export const PRODUCT_PARSE_FIELD_LABELS = {
  name: "产品名称",
  displayName: "对外显示名称",
  spec: "规格",
  unit: "单位",
  enterpriseStandardNo: "企业标准号",
  intro: "产品简介",
  scenarios: "适用场景",
  labelText: "标签文字",
  remark: "备注建议",
  industryGroupSuggestion: "行业大类建议",
  industrySubgroupSuggestion: "细分行业建议",
  outputTemplateTypeSuggestion: "输出模板类型建议"
} as const;

export type ProductParseFieldKey = keyof typeof PRODUCT_PARSE_FIELD_LABELS;
export type ProductParseConfidence = "high" | "medium" | "low";
export type ProductParseSource = "text" | "image" | "mixed" | "rule";

export type ProductParseResponse = {
  rawText: string;
  originalText?: string;
  imageText?: string;
  parsed: Partial<Record<ProductParseFieldKey, string>>;
  confidence: Partial<Record<ProductParseFieldKey, ProductParseConfidence>>;
  sources: Partial<Record<ProductParseFieldKey, ProductParseSource>>;
  reasons: Partial<Record<ProductParseFieldKey, string>>;
  conflicts: Array<{
    field: ProductParseFieldKey;
    preferredValue?: string;
    candidates: Array<{
      value: string;
      confidence: ProductParseConfidence;
      source: ProductParseSource;
      reason: string;
    }>;
  }>;
};

export type ProductParserMappableField =
  | "name"
  | "displayName"
  | "spec"
  | "unit"
  | "enterpriseStandardNo"
  | "intro"
  | "scenarios"
  | "tagText"
  | "remark"
  | "industryGroupId"
  | "industrySubgroupId"
  | "outputTemplateType";

export const MAPPABLE_FIELD_LABELS: Record<ProductParserMappableField, string> = {
  name: "产品名称",
  displayName: "对外显示名称",
  spec: "规格",
  unit: "单位",
  enterpriseStandardNo: "企业标准号",
  intro: "产品简介",
  scenarios: "适用场景",
  tagText: "标签文字",
  remark: "备注建议",
  industryGroupId: "行业大类",
  industrySubgroupId: "细分行业",
  outputTemplateType: "输出模板类型"
};

export function hasValue(value: string | undefined | null) {
  return Boolean(value && value.trim());
}

export function matchIndustryGroupIdByName(
  industries: IndustryGroupOption[],
  suggestion?: string
) {
  if (!suggestion) {
    return "";
  }

  const normalized = suggestion.trim();
  const matched = industries.find(
    (industry) => industry.name === normalized || industry.name.includes(normalized) || normalized.includes(industry.name)
  );

  return matched?.id ?? "";
}

export function matchIndustrySubgroupIdByName(
  industries: IndustryGroupOption[],
  groupId: string,
  suggestion?: string
) {
  if (!suggestion) {
    return "";
  }

  const normalized = suggestion.trim();
  const group = industries.find((industry) => industry.id === groupId);
  const subgroups = group?.subgroups ?? industries.flatMap((industry) => industry.subgroups);
  const matched = subgroups.find(
    (subgroup) =>
      subgroup.name === normalized ||
      subgroup.name.includes(normalized) ||
      normalized.includes(subgroup.name)
  );

  return matched?.id ?? "";
}
