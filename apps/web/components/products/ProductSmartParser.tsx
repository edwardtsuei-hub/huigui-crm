"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { ParserFieldMapper } from "./ParserFieldMapper";
import { ParserInputPanel } from "./ParserInputPanel";
import { ParserResultPanel } from "./ParserResultPanel";
import {
  defaultProductForm,
  hasValue,
  matchIndustryGroupIdByName,
  matchIndustrySubgroupIdByName,
  type IndustryGroupOption,
  type ProductFormValues,
  type ProductParseFieldKey,
  type ProductParseResponse,
  type ProductParserMappableField
} from "./types";

type ProductSmartParserProps = {
  form: ProductFormValues;
  industries: IndustryGroupOption[];
  onApplyParsedData: (patch: Partial<ProductFormValues>) => void;
};

function initialMappingFromResult(
  result: ProductParseResponse,
  form: ProductFormValues,
  industries: IndustryGroupOption[]
) {
  const industryGroupId = matchIndustryGroupIdByName(
    industries,
    result.parsed.industryGroupSuggestion
  );
  const industrySubgroupId = matchIndustrySubgroupIdByName(
    industries,
    industryGroupId,
    result.parsed.industrySubgroupSuggestion
  );

  const values: Partial<ProductFormValues> = {
    name: result.parsed.name ?? "",
    displayName: result.parsed.displayName ?? "",
    spec: result.parsed.spec ?? "",
    unit: result.parsed.unit ?? "",
    enterpriseStandardNo: result.parsed.enterpriseStandardNo ?? "",
    intro: result.parsed.intro ?? "",
    scenarios: result.parsed.scenarios ?? "",
    tagText: result.parsed.labelText ?? "",
    remark: result.parsed.remark ?? "",
    industryGroupId,
    industrySubgroupId,
    outputTemplateType: result.parsed.outputTemplateTypeSuggestion ?? ""
  };

  const fields: ProductParserMappableField[] = [
    "name",
    "displayName",
    "spec",
    "unit",
    "enterpriseStandardNo",
    "intro",
    "scenarios",
    "tagText",
    "remark",
    "industryGroupId",
    "industrySubgroupId",
    "outputTemplateType"
  ];

  const modes = fields.reduce<Partial<Record<ProductParserMappableField, "apply" | "keep">>>(
    (accumulator, field) => {
      const currentValue = String(form[field] ?? "");
      const mappedValue = String(values[field] ?? "");
      accumulator[field] = hasValue(currentValue) && hasValue(mappedValue) ? "keep" : "apply";
      return accumulator;
    },
    {}
  );

  return { values, modes };
}

export function ProductSmartParser(props: ProductSmartParserProps) {
  const { form, industries, onApplyParsedData } = props;
  const [rawText, setRawText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [applyMessage, setApplyMessage] = useState("");
  const [result, setResult] = useState<ProductParseResponse | null>(null);
  const [mappingValues, setMappingValues] = useState<Partial<ProductFormValues>>({});
  const [fieldModes, setFieldModes] = useState<
    Partial<Record<ProductParserMappableField, "apply" | "keep">>
  >({});

  useEffect(() => {
    if (!result) {
      setMappingValues({});
      setFieldModes({});
      return;
    }

    const initialState = initialMappingFromResult(result, form, industries);
    setMappingValues(initialState.values);
    setFieldModes(initialState.modes);
  }, [result]);

  async function handleParse() {
    setError("");
    setApplyMessage("");
    setStatusMessage("");

    if (!rawText.trim() && !imageFile) {
      setError("请至少粘贴一段文字或上传一张标签图片。");
      return;
    }

    setLoading(true);

    try {
      let response: ProductParseResponse;

      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        if (rawText.trim()) {
          formData.append("rawText", rawText.trim());
        }
        setStatusMessage(rawText.trim() ? "正在进行图文融合解析..." : "正在解析图片内容...");
        response = await apiFetch<ProductParseResponse>("/products/parse-mixed", {
          method: "POST",
          body: formData
        });
      } else if (rawText.trim()) {
        setStatusMessage("正在解析文字内容...");
        response = await apiFetch<ProductParseResponse>("/products/parse-text", {
          method: "POST",
          body: JSON.stringify({
            rawText
          })
        });
      } else {
        throw new Error("请至少粘贴一段文字或上传一张标签图片。");
      }

      setResult(response);
      setStatusMessage(imageFile ? "图片已上传并完成智能解析。" : "解析完成。");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "解析失败");
      setStatusMessage("");
    } finally {
      setLoading(false);
    }
  }

  function handleImageSelect(file: File | null) {
    setError("");
    setStatusMessage("");
    if (!file) {
      setImageFile(null);
      setImagePreview("");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleClear() {
    setResult(null);
    setApplyMessage("");
    setStatusMessage(imageFile ? "已保留当前图片，可继续调整文字后再次解析。" : "");
  }

  function handleModeChange(field: ProductParserMappableField, mode: "apply" | "keep") {
    setFieldModes((prev) => ({
      ...prev,
      [field]: mode
    }));
  }

  function handleFieldChange(field: ProductParserMappableField, value: string) {
    setMappingValues((prev) => {
      const nextValues = {
        ...prev,
        [field]: value
      };

      if (field === "industryGroupId") {
        const nextGroup = industries.find((industry) => industry.id === value);
        const subgroupStillValid = nextGroup?.subgroups.some(
          (subgroup) => subgroup.id === prev.industrySubgroupId
        );
        if (!subgroupStillValid) {
          nextValues.industrySubgroupId = "";
        }
      }

      return nextValues;
    });
  }

  function handleConflictSelect(field: ProductParseFieldKey, value: string) {
    const fieldMapping: Partial<Record<ProductParseFieldKey, ProductParserMappableField>> = {
      name: "name",
      displayName: "displayName",
      spec: "spec",
      unit: "unit",
      enterpriseStandardNo: "enterpriseStandardNo",
      intro: "intro",
      scenarios: "scenarios",
      labelText: "tagText",
      remark: "remark",
      industryGroupSuggestion: "industryGroupId",
      industrySubgroupSuggestion: "industrySubgroupId",
      outputTemplateTypeSuggestion: "outputTemplateType"
    };

    const targetField = fieldMapping[field];
    if (!targetField) {
      return;
    }

    setMappingValues((prev) => ({
      ...prev,
      [targetField]: value
    }));
    setFieldModes((prev) => ({
      ...prev,
      [targetField]: "apply"
    }));
  }

  function handleApply() {
    const fields: ProductParserMappableField[] = [
      "name",
      "displayName",
      "spec",
      "unit",
      "enterpriseStandardNo",
      "intro",
      "scenarios",
      "tagText",
      "remark",
      "industryGroupId",
      "industrySubgroupId",
      "outputTemplateType"
    ];

    const patch = fields.reduce<Partial<ProductFormValues>>((accumulator, field) => {
      if ((fieldModes[field] ?? "apply") === "keep") {
        return accumulator;
      }

      const value = String(mappingValues[field] ?? "");
      if (!hasValue(value)) {
        return accumulator;
      }

      accumulator[field] = value as never;
      return accumulator;
    }, {});

    if (!Object.keys(patch).length) {
      setApplyMessage("当前没有可写入表单的新字段，或你已经选择全部保留原值。");
      return;
    }

    onApplyParsedData(patch);
    setApplyMessage(`已将 ${Object.keys(patch).length} 个解析字段写入正式产品表单。`);
  }

  return (
    <div className="stack">
      <ParserInputPanel
        rawText={rawText}
        imagePreview={imagePreview}
        loading={loading}
        error={error}
        statusMessage={statusMessage}
        onRawTextChange={setRawText}
        onImageSelect={handleImageSelect}
        onRemoveImage={() => handleImageSelect(null)}
        onParse={handleParse}
      />

      <ParserResultPanel result={result} />

      <ParserFieldMapper
        result={result}
        form={form}
        industries={industries}
        mappingValues={mappingValues}
        fieldModes={fieldModes}
        applyMessage={applyMessage}
        onModeChange={handleModeChange}
        onFieldChange={handleFieldChange}
        onConflictSelect={handleConflictSelect}
        onApply={handleApply}
        onClear={handleClear}
      />
    </div>
  );
}
