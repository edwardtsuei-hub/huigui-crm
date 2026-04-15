export const PRODUCT_PARSE_CONFIDENCE = ["high", "medium", "low"] as const;

export type ProductParseConfidence = (typeof PRODUCT_PARSE_CONFIDENCE)[number];

export const PRODUCT_PARSE_FIELDS = [
  "name",
  "displayName",
  "spec",
  "unit",
  "enterpriseStandardNo",
  "intro",
  "scenarios",
  "labelText",
  "remark",
  "industryGroupSuggestion",
  "industrySubgroupSuggestion",
  "outputTemplateTypeSuggestion"
] as const;

export type ProductParseFieldKey = (typeof PRODUCT_PARSE_FIELDS)[number];

export type ProductParseSource = "text" | "image" | "mixed" | "rule";

export type ProductParsedData = Partial<Record<ProductParseFieldKey, string>>;
export type ProductConfidenceMap = Partial<Record<ProductParseFieldKey, ProductParseConfidence>>;
export type ProductSourceMap = Partial<Record<ProductParseFieldKey, ProductParseSource>>;
export type ProductReasonMap = Partial<Record<ProductParseFieldKey, string>>;

export type ProductFieldExtraction = {
  value: string;
  confidence: ProductParseConfidence;
  source: ProductParseSource;
  reason: string;
};

export type ProductParseDraft = {
  rawText: string;
  fields: Partial<Record<ProductParseFieldKey, ProductFieldExtraction>>;
};

export type ProductParseConflict = {
  field: ProductParseFieldKey;
  preferredValue?: string;
  candidates: ProductFieldExtraction[];
};

export type ProductParseResponse = {
  rawText: string;
  originalText?: string;
  imageText?: string;
  parsed: ProductParsedData;
  confidence: ProductConfidenceMap;
  sources: ProductSourceMap;
  reasons: ProductReasonMap;
  conflicts: ProductParseConflict[];
};

export type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};
