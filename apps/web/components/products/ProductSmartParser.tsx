"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, getToken } from "../../lib/api";
import { ParserFieldMapper } from "./ParserFieldMapper";
import { ParserInputPanel } from "./ParserInputPanel";
import { ParserResultPanel } from "./ParserResultPanel";
import styles from "./ProductSmartParser.module.css";
import {
  hasValue,
  matchIndustryGroupIdByName,
  matchIndustrySubgroupIdByName,
  type IndustryGroupOption,
  type ProductFormValues,
  type ProductParseFieldKey,
  type ProductParseQueueDetail,
  type ProductParseResponse,
  type ProductParserMappableField,
} from "./types";

type ProductSmartParserProps = {
  form: ProductFormValues;
  industries: IndustryGroupOption[];
  onApplyParsedData: (patch: Partial<ProductFormValues>) => void;
  previewMode?: boolean;
  importedQueueItem?: ProductParseQueueDetail | null;
};

function buildPreviewParseResponse(input: {
  rawText: string;
  hasImage: boolean;
}): ProductParseResponse {
  const normalizedText = input.rawText.trim();
  const fallbackText = input.hasImage
    ? "演示标签图片识别文本：富硒营养液，适用于农业种植场景，建议搭配标准交付方案。"
    : "演示文本：富硒营养液，适用于农业种植场景，建议搭配标准交付方案。";
  const mergedText = normalizedText || fallbackText;

  return {
    rawText: mergedText,
    parsed: {
      name: "富硒营养液",
      displayName: "富硒营养液标准包",
      spec: "500ml / 瓶",
      unit: "瓶",
      enterpriseStandardNo: "Q/HH 2026-01",
      intro: mergedText.slice(0, 80),
      scenarios: "农业种植、示范农场、区域交付",
      labelText: "营养升级",
      remark: "演示模式下生成的建议值，仅用于确认界面结构。",
      industryGroupSuggestion: "农业",
      industrySubgroupSuggestion: "示范农场",
      outputTemplateTypeSuggestion: "SOLUTION_QUOTE",
    },
    confidence: {
      name: "high",
      displayName: "medium",
      spec: "medium",
      unit: "high",
      enterpriseStandardNo: "medium",
      intro: "medium",
      scenarios: "medium",
      labelText: "medium",
      remark: "low",
      industryGroupSuggestion: "high",
      industrySubgroupSuggestion: "medium",
      outputTemplateTypeSuggestion: "medium",
    },
    sources: {
      name: input.hasImage && normalizedText ? "mixed" : input.hasImage ? "image" : "text",
      displayName: "rule",
      spec: input.hasImage ? "image" : "text",
      unit: "rule",
      enterpriseStandardNo: input.hasImage ? "image" : "text",
      intro: input.hasImage && normalizedText ? "mixed" : "text",
      scenarios: "rule",
      labelText: input.hasImage ? "image" : "text",
      remark: "rule",
      industryGroupSuggestion: "rule",
      industrySubgroupSuggestion: "rule",
      outputTemplateTypeSuggestion: "rule",
    },
    reasons: {
      name: "根据主标题关键词与标签语义合并得到。",
      displayName: "根据名称与标准化展示规则自动生成。",
      spec: "从标签规格与包装信息中提取。",
      unit: "根据规格自动推断单位。",
      enterpriseStandardNo: "识别到企业标准号格式。",
      intro: "根据输入文本摘要生成。",
      scenarios: "根据行业词与使用语境推断。",
      labelText: "从标签核心卖点抽取。",
      remark: "演示模式补充说明。",
      industryGroupSuggestion: "根据场景词匹配行业大类。",
      industrySubgroupSuggestion: "根据行业大类下的高频场景匹配。",
      outputTemplateTypeSuggestion: "根据内容更像标准方案类产品给出建议。",
    },
    conflicts:
      input.hasImage && normalizedText
        ? [
            {
              field: "labelText",
              preferredValue: "营养升级",
              candidates: [
                {
                  value: "营养升级",
                  confidence: "medium",
                  source: "image",
                  reason: "图片标签主视觉更强调卖点词。",
                },
                {
                  value: "富硒补充",
                  confidence: "medium",
                  source: "text",
                  reason: "文字说明里重复出现补充相关表述。",
                },
              ],
            },
          ]
        : [],
  };
}

function initialMappingFromResult(
  result: ProductParseResponse,
  form: ProductFormValues,
  industries: IndustryGroupOption[],
) {
  const industryGroupId = matchIndustryGroupIdByName(
    industries,
    result.parsed.industryGroupSuggestion,
  );
  const industrySubgroupId = matchIndustrySubgroupIdByName(
    industries,
    industryGroupId,
    result.parsed.industrySubgroupSuggestion,
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
    outputTemplateType: result.parsed.outputTemplateTypeSuggestion ?? "",
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
    "outputTemplateType",
  ];

  const modes = fields.reduce<
    Partial<Record<ProductParserMappableField, "apply" | "keep">>
  >((accumulator, field) => {
    const currentValue = String(form[field] ?? "");
    const mappedValue = String(values[field] ?? "");
    accumulator[field] =
      hasValue(currentValue) && hasValue(mappedValue) ? "keep" : "apply";
    return accumulator;
  }, {});

  return { values, modes };
}

export function ProductSmartParser(props: ProductSmartParserProps) {
  const {
    form,
    industries,
    onApplyParsedData,
    previewMode = false,
    importedQueueItem,
  } = props;
  const [rawText, setRawText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [applyMessage, setApplyMessage] = useState("");
  const [result, setResult] = useState<ProductParseResponse | null>(null);
  const [mappingValues, setMappingValues] = useState<Partial<ProductFormValues>>(
    {},
  );
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
  }, [form, industries, result]);

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  useEffect(() => {
    if (!importedQueueItem) {
      return;
    }

    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setError("");
    setApplyMessage("");
    setLoading(false);
    setImageFile(null);
    setRawText(importedQueueItem.rawText || importedQueueItem.result.rawText || "");
    setResult(importedQueueItem.result);
    setImagePreview(importedQueueItem.imageUrl || "");
    setSelectedFileName(
      importedQueueItem.imageUrl ? "已带入队列图片" : "",
    );
    setStatusMessage(
      `已从待确认队列带入解析记录：${importedQueueItem.title}。你可以先复核，再写回正式表单。`,
    );
  }, [importedQueueItem?.id]);

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

      if (previewMode && !getToken()) {
        response = buildPreviewParseResponse({
          rawText,
          hasImage: Boolean(imageFile),
        });
        setResult(response);
        setStatusMessage("当前为公开预览模式：已生成演示解析结果。");
        return;
      }

      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        if (rawText.trim()) {
          formData.append("rawText", rawText.trim());
        }
        setStatusMessage(
          rawText.trim() ? "正在进行图文融合解析..." : "正在解析图片内容...",
        );
        response = await apiFetch<ProductParseResponse>("/products/parse-mixed", {
          method: "POST",
          body: formData,
        });
      } else if (rawText.trim()) {
        setStatusMessage("正在解析文字内容...");
        response = await apiFetch<ProductParseResponse>("/products/parse-text", {
          method: "POST",
          body: JSON.stringify({
            rawText,
          }),
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

    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    if (!file) {
      setImageFile(null);
      setSelectedFileName("");
      setImagePreview("");
      return;
    }

    setImageFile(file);
    setSelectedFileName(file.name);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleClear() {
    setResult(null);
    setApplyMessage("");
    setStatusMessage(imageFile ? "已保留当前图片，可继续调整文字后再次解析。" : "");
  }

  function handleModeChange(
    field: ProductParserMappableField,
    mode: "apply" | "keep",
  ) {
    setFieldModes((prev) => ({
      ...prev,
      [field]: mode,
    }));
  }

  function handleFieldChange(field: ProductParserMappableField, value: string) {
    setMappingValues((prev) => {
      const nextValues = {
        ...prev,
        [field]: value,
      };

      if (field === "industryGroupId") {
        const nextGroup = industries.find((industry) => industry.id === value);
        const subgroupStillValid = nextGroup?.subgroups.some(
          (subgroup) => subgroup.id === prev.industrySubgroupId,
        );
        if (!subgroupStillValid) {
          nextValues.industrySubgroupId = "";
        }
      }

      return nextValues;
    });
  }

  function handleConflictSelect(field: ProductParseFieldKey, value: string) {
    const fieldMapping: Partial<
      Record<ProductParseFieldKey, ProductParserMappableField>
    > = {
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
      outputTemplateTypeSuggestion: "outputTemplateType",
    };

    const targetField = fieldMapping[field];
    if (!targetField) {
      return;
    }

    setMappingValues((prev) => ({
      ...prev,
      [targetField]: value,
    }));
    setFieldModes((prev) => ({
      ...prev,
      [targetField]: "apply",
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
      "outputTemplateType",
    ];

    const patch = fields.reduce<Partial<ProductFormValues>>(
      (accumulator, field) => {
        if ((fieldModes[field] ?? "apply") === "keep") {
          return accumulator;
        }

        const value = String(mappingValues[field] ?? "");
        if (!hasValue(value)) {
          return accumulator;
        }

        accumulator[field] = value as never;
        return accumulator;
      },
      {},
    );

    if (!Object.keys(patch).length) {
      setApplyMessage("当前没有可写入表单的新字段，或你已经选择全部保留原值。");
      return;
    }

    onApplyParsedData(patch);
    setApplyMessage(`已将 ${Object.keys(patch).length} 个解析字段写入正式产品表单。`);
  }

  const parsedCount = useMemo(
    () =>
      result
        ? Object.values(result.parsed).filter((value) => Boolean(value)).length
        : 0,
    [result],
  );
  const conflictCount = result?.conflicts.length ?? 0;
  const sourceLabel = imageFile && rawText.trim()
    ? "图文混合"
    : imageFile
      ? "图片"
      : rawText.trim()
        ? "文本"
        : "待输入";

  return (
    <div className={styles.parserWorkspace}>
      <section className={styles.heroCard}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Smart parser</span>
          <h3>AI 解析辅助入口</h3>
          <p>
            先把标签文字、图片和说明文案吸收成结构化建议，再由你确认后写回正式产品表单。
            它是辅助录入，不会替你跳过人工校对。
          </p>

          <div className={styles.heroPills}>
            <span>支持文本与标签图混合输入</span>
            <span>冲突字段会先提示候选值</span>
            <span>已有表单值默认优先保留</span>
          </div>
        </div>

        <div className={styles.heroMetrics}>
          <article>
            <span>当前输入</span>
            <strong>{sourceLabel}</strong>
          </article>
          <article>
            <span>解析字段</span>
            <strong>{String(parsedCount).padStart(2, "0")}</strong>
          </article>
          <article>
            <span>冲突提醒</span>
            <strong>{String(conflictCount).padStart(2, "0")}</strong>
          </article>
        </div>
      </section>

      {importedQueueItem ? (
        <section className={styles.importedBanner}>
          <div className={styles.importedBannerCopy}>
            <strong>已带入待确认解析记录</strong>
            <p>
              当前记录来自队列中的“{importedQueueItem.title}”，来源为
              {importedQueueItem.sourceType === "MIXED"
                ? "图文混合"
                : importedQueueItem.sourceType === "IMAGE"
                  ? "图片"
                  : "文本"}
              ，当前状态为
              {importedQueueItem.reviewStatus === "CONFIRMED"
                ? "已确认"
                : importedQueueItem.reviewStatus === "IGNORED"
                  ? "已忽略"
                  : "待确认"}
              。
            </p>
          </div>
          <div className={styles.importedBannerMeta}>
            <span>解析字段 {importedQueueItem.parsedFieldCount}</span>
            <span>冲突 {importedQueueItem.conflictCount}</span>
            <span>低置信度 {importedQueueItem.lowConfidenceCount}</span>
          </div>
        </section>
      ) : null}

      <section className={styles.guideStrip}>
        <article>
          <span>01</span>
          <strong>贴文字或上传标签图</strong>
          <p>先把产品信息集中给解析器，不需要一开始就手动逐项录入。</p>
        </article>
        <article>
          <span>02</span>
          <strong>先看解析结果和冲突</strong>
          <p>解析器会先给建议值，再把图文不一致的字段单独抬出来。</p>
        </article>
        <article>
          <span>03</span>
          <strong>确认后再写入表单</strong>
          <p>只有你点确认填入后，建议值才会进入正式产品录入流程。</p>
        </article>
      </section>

      <div className={styles.surfaceStack}>
        <ParserInputPanel
          rawText={rawText}
          imagePreview={imagePreview}
          selectedFileName={selectedFileName}
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
    </div>
  );
}
