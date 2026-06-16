"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  PRODUCT_PARSE_FIELD_LABELS,
  MAPPABLE_FIELD_LABELS,
  hasValue,
  matchIndustryGroupIdByName,
  matchIndustrySubgroupIdByName,
  type IndustryGroupOption,
  type ProductFormValues,
  type ProductParseConfidence,
  type ProductParseFieldKey,
  type ProductParseResponse,
  type ProductParserMappableField,
} from "./types";

type ProductSmartParserOriginalPreviewProps = {
  form: ProductFormValues;
  industries: IndustryGroupOption[];
  onApplyParsedData: (patch: Partial<ProductFormValues>) => void;
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
      remark: "演示模式下生成的建议值，仅用于确认原版界面结构。",
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

function confidenceText(value?: ProductParseConfidence) {
  if (value === "high") return "高";
  if (value === "medium") return "中";
  if (value === "low") return "低";
  return "-";
}

function confidenceClass(value?: ProductParseConfidence) {
  if (value === "high") return "parser-original-confidence--high";
  if (value === "medium") return "parser-original-confidence--medium";
  return "parser-original-confidence--low";
}

export function ProductSmartParserOriginalPreview({
  form,
  industries,
  onApplyParsedData,
}: ProductSmartParserOriginalPreviewProps) {
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
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!selectedFileName && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [selectedFileName]);

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
      const response = buildPreviewParseResponse({
        rawText,
        hasImage: Boolean(imageFile),
      });

      setResult(response);
      setStatusMessage("当前为原版公开预览：已生成演示解析结果。");
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

  const selectedGroup = industries.find(
    (industry) => industry.id === mappingValues.industryGroupId,
  );
  const subgroupOptions = selectedGroup?.subgroups ?? [];

  const fields: Array<{
    key: ProductParserMappableField;
    type: "input" | "textarea" | "select";
  }> = [
    { key: "name", type: "input" },
    { key: "displayName", type: "input" },
    { key: "spec", type: "input" },
    { key: "unit", type: "input" },
    { key: "enterpriseStandardNo", type: "input" },
    { key: "intro", type: "textarea" },
    { key: "scenarios", type: "textarea" },
    { key: "tagText", type: "textarea" },
    { key: "remark", type: "textarea" },
    { key: "industryGroupId", type: "select" },
    { key: "industrySubgroupId", type: "select" },
    { key: "outputTemplateType", type: "select" },
  ];

  const entries = result
    ? Object.entries(result.parsed).filter(([, value]) => value)
    : [];

  return (
    <div className="stack">
      <section className="panel stack">
        <div>
          <h3>产品信息智能解析</h3>
          <p className="muted">
            支持粘贴产品说明文字或上传标签截图，先生成解析建议，再人工确认后填入正式表单。
          </p>
        </div>

        <div className="form-grid">
          <div className="field full">
            <label>文本粘贴框</label>
            <textarea
              className="parser-original-source-textarea"
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              placeholder="可粘贴标签全文、宣传文案、产品介绍、企业标准说明、成分说明、使用方法等"
            />
          </div>

          <div className="field full">
            <label>标签图片上传</label>
            <input
              id={inputId}
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => handleImageSelect(event.target.files?.[0] ?? null)}
              className="parser-original-file-input"
            />
            <div className="toolbar parser-original-upload-toolbar">
              <button
                type="button"
                className="button secondary inline"
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFileName ? "重新选择图片" : "选择标签图片"}
              </button>
              <div className="small muted">
                {selectedFileName || "尚未选择文件"}
              </div>
            </div>
            <div className="small muted">
              支持 jpg / png / webp，第一版仅支持单张图片。
            </div>
            {imagePreview ? (
              <div className="quote-card parser-original-image-card">
                <img
                  className="parser-original-image"
                  src={imagePreview}
                  alt="产品标签预览"
                />
                <div className="toolbar parser-original-image-actions">
                  <button
                    type="button"
                    className="button secondary inline"
                    onClick={() => handleImageSelect(null)}
                  >
                    删除图片
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {error ? <div className="danger-text small">{error}</div> : null}
        {statusMessage ? <div className="small muted">{statusMessage}</div> : null}

        <div className="toolbar">
          <button type="button" onClick={handleParse} disabled={loading}>
            {loading ? "解析中..." : "开始解析"}
          </button>
        </div>
      </section>

      {result ? (
        <section className="panel stack">
          <div>
            <h3>解析结果预览</h3>
            <p className="muted">
              先看原始识别文本和结构化结果，再决定是否写入正式产品表单。
            </p>
          </div>

          <div className="grid-2">
            <div className="quote-card">
              <strong>原始识别文本</strong>
              <pre className="parser-original-raw-text">
                {result.rawText || "暂无识别文本"}
              </pre>
            </div>

            <div className="quote-card">
              <strong>冲突字段提示</strong>
              <div className="parser-original-conflict-list">
                {result.conflicts.length ? (
                  result.conflicts.map((conflict) => (
                    <div className="parser-original-conflict-item" key={conflict.field}>
                      <div>
                        {PRODUCT_PARSE_FIELD_LABELS[conflict.field]}：检测到候选值冲突
                      </div>
                      <div className="small muted">
                        {conflict.candidates
                          .map(
                            (candidate) =>
                              `${candidate.source}:${candidate.value}`,
                          )
                          .join(" / ")}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="small muted">当前没有检测到图文冲突字段。</div>
                )}
              </div>
            </div>
          </div>

          <div className="stack">
            {entries.length ? (
              entries.map(([field, value]) => (
                <div className="quote-card" key={field}>
                  <div className="toolbar">
                    <strong>
                      {
                        PRODUCT_PARSE_FIELD_LABELS[
                          field as keyof typeof PRODUCT_PARSE_FIELD_LABELS
                        ]
                      }
                    </strong>
                    <span
                      className={`small parser-original-confidence ${confidenceClass(
                        result.confidence[
                          field as keyof typeof result.confidence
                        ],
                      )}`}
                    >
                      {confidenceText(
                        result.confidence[
                          field as keyof typeof result.confidence
                        ],
                      )}
                    </span>
                  </div>
                  <div className="parser-original-field-value">{value}</div>
                  <div className="small muted parser-original-field-meta">
                    来源：
                    {result.sources[field as keyof typeof result.sources] || "-"} ·
                    说明：
                    {result.reasons[field as keyof typeof result.reasons] || "无"}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty">
                当前没有提取到可用字段，请调整文字内容或上传更清晰的标签图。
              </div>
            )}
          </div>
        </section>
      ) : null}

      {result ? (
        <section className="panel stack">
          <div>
            <h3>填表确认区</h3>
            <p className="muted">
              每个字段都可以继续修正。已有表单值默认保留，你可以逐项切换成覆盖解析值。
            </p>
          </div>

          <div className="stack">
            {fields.map((field) => {
              const currentValue = String(form[field.key] ?? "");
              const mappedValue = String(mappingValues[field.key] ?? "");
              const conflictKey =
                field.key === "name"
                  ? "name"
                  : field.key === "displayName"
                    ? "displayName"
                    : field.key === "spec"
                      ? "spec"
                      : field.key === "unit"
                        ? "unit"
                        : field.key === "enterpriseStandardNo"
                          ? "enterpriseStandardNo"
                          : field.key === "intro"
                            ? "intro"
                            : field.key === "scenarios"
                              ? "scenarios"
                              : field.key === "tagText"
                                ? "labelText"
                                : field.key === "remark"
                                  ? "remark"
                                  : field.key === "outputTemplateType"
                                    ? "outputTemplateTypeSuggestion"
                                    : field.key === "industryGroupId"
                                      ? "industryGroupSuggestion"
                                      : field.key === "industrySubgroupId"
                                        ? "industrySubgroupSuggestion"
                                        : undefined;
              const conflict = conflictKey
                ? result.conflicts.find((item) => item.field === conflictKey)
                : undefined;
              const hasExisting = hasValue(currentValue);
              const hasMapped = hasValue(mappedValue);

              return (
                <div className="quote-card" key={field.key}>
                  <div className="toolbar">
                    <strong>{MAPPABLE_FIELD_LABELS[field.key]}</strong>
                    {hasExisting && hasMapped ? (
                      <div className="toolbar">
                        <label className="small">
                          <input
                            type="radio"
                            checked={(fieldModes[field.key] ?? "keep") === "keep"}
                            onChange={() => handleModeChange(field.key, "keep")}
                          />{" "}
                          保留原值
                        </label>
                        <label className="small">
                          <input
                            type="radio"
                            checked={(fieldModes[field.key] ?? "keep") === "apply"}
                            onChange={() => handleModeChange(field.key, "apply")}
                          />{" "}
                          覆盖
                        </label>
                      </div>
                    ) : null}
                  </div>

                  {hasExisting ? (
                    <div className="small muted parser-original-existing-value">
                      当前表单值：{currentValue}
                    </div>
                  ) : null}

                  {conflict ? (
                    <div className="parser-original-field-conflict">
                      <div className="small muted">
                        检测到冲突候选，请先选择一个候选值：
                      </div>
                      <div className="toolbar parser-original-conflict-actions">
                        {conflict.candidates.map((candidate, index) => (
                          <button
                            type="button"
                            key={`${field.key}-${index}`}
                            className="button secondary inline"
                            onClick={() =>
                              handleConflictSelect(conflict.field, candidate.value)
                            }
                          >
                            {candidate.source}：{candidate.value}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="parser-original-mapped-input">
                    {field.type === "textarea" ? (
                      <textarea
                        className="parser-original-mapped-textarea"
                        value={mappedValue}
                        onChange={(event) =>
                          handleFieldChange(field.key, event.target.value)
                        }
                      />
                    ) : null}

                    {field.type === "input" ? (
                      <input
                        value={mappedValue}
                        onChange={(event) =>
                          handleFieldChange(field.key, event.target.value)
                        }
                      />
                    ) : null}

                    {field.type === "select" && field.key === "industryGroupId" ? (
                      <select
                        value={mappedValue}
                        onChange={(event) =>
                          handleFieldChange(field.key, event.target.value)
                        }
                      >
                        <option value="">请选择行业大类</option>
                        {industries.map((industry) => (
                          <option key={industry.id} value={industry.id}>
                            {industry.name}
                          </option>
                        ))}
                      </select>
                    ) : null}

                    {field.type === "select" && field.key === "industrySubgroupId" ? (
                      <select
                        value={mappedValue}
                        onChange={(event) =>
                          handleFieldChange(field.key, event.target.value)
                        }
                      >
                        <option value="">请选择细分行业</option>
                        {subgroupOptions.map((subgroup) => (
                          <option key={subgroup.id} value={subgroup.id}>
                            {subgroup.name}
                          </option>
                        ))}
                      </select>
                    ) : null}

                    {field.type === "select" && field.key === "outputTemplateType" ? (
                      <select
                        value={mappedValue}
                        onChange={(event) =>
                          handleFieldChange(field.key, event.target.value)
                        }
                      >
                        <option value="">请选择输出模板</option>
                        <option value="AGRICULTURE_PLAN">AGRICULTURE_PLAN</option>
                        <option value="PRODUCT_QUOTE">PRODUCT_QUOTE</option>
                        <option value="SOLUTION_QUOTE">SOLUTION_QUOTE</option>
                      </select>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {applyMessage ? <div className="small">{applyMessage}</div> : null}

          <div className="toolbar">
            <button type="button" onClick={handleApply}>
              确认填入表单
            </button>
            <button type="button" className="button secondary" onClick={handleClear}>
              清空解析结果
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
