"use client";

export type IndustryGroupOption = {
  id: string;
  name: string;
  subgroups: Array<{ id: string; name: string }>;
};

export type ProductFormValues = {
  id: string;
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

export const defaultProductForm: ProductFormValues = {
  id: "",
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
