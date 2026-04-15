"use client";

import {
  MAPPABLE_FIELD_LABELS,
  hasValue,
  type IndustryGroupOption,
  type ProductFormValues,
  type ProductParseFieldKey,
  type ProductParseResponse,
  type ProductParserMappableField
} from "./types";

type ParserFieldMapperProps = {
  result: ProductParseResponse | null;
  form: ProductFormValues;
  industries: IndustryGroupOption[];
  mappingValues: Partial<ProductFormValues>;
  fieldModes: Partial<Record<ProductParserMappableField, "apply" | "keep">>;
  applyMessage: string;
  onModeChange: (field: ProductParserMappableField, mode: "apply" | "keep") => void;
  onFieldChange: (field: ProductParserMappableField, value: string) => void;
  onConflictSelect: (field: ProductParseFieldKey, value: string) => void;
  onApply: () => void;
  onClear: () => void;
};

const directFieldToConflictKey: Partial<Record<ProductParserMappableField, ProductParseFieldKey>> = {
  name: "name",
  displayName: "displayName",
  spec: "spec",
  unit: "unit",
  enterpriseStandardNo: "enterpriseStandardNo",
  intro: "intro",
  scenarios: "scenarios",
  tagText: "labelText",
  remark: "remark",
  outputTemplateType: "outputTemplateTypeSuggestion"
};

export function ParserFieldMapper(props: ParserFieldMapperProps) {
  const {
    result,
    form,
    industries,
    mappingValues,
    fieldModes,
    applyMessage,
    onModeChange,
    onFieldChange,
    onConflictSelect,
    onApply,
    onClear
  } = props;

  if (!result) {
    return null;
  }

  const selectedGroup = industries.find((industry) => industry.id === mappingValues.industryGroupId);
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
    { key: "outputTemplateType", type: "select" }
  ];

  return (
    <section className="panel stack">
      <div>
        <h3>填表确认区</h3>
        <p className="muted">每个字段都可以继续修正。已有表单值默认保留，你可以逐项切换成覆盖解析值。</p>
      </div>

      <div className="stack">
        {fields.map((field) => {
          const currentValue = String(form[field.key] ?? "");
          const mappedValue = String(mappingValues[field.key] ?? "");
          const conflictKey =
            directFieldToConflictKey[field.key] ??
            (field.key === "industryGroupId"
              ? "industryGroupSuggestion"
              : field.key === "industrySubgroupId"
                ? "industrySubgroupSuggestion"
                : undefined);
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
                        onChange={() => onModeChange(field.key, "keep")}
                      />{" "}
                      保留原值
                    </label>
                    <label className="small">
                      <input
                        type="radio"
                        checked={(fieldModes[field.key] ?? "keep") === "apply"}
                        onChange={() => onModeChange(field.key, "apply")}
                      />{" "}
                      覆盖
                    </label>
                  </div>
                ) : null}
              </div>

              {hasExisting ? (
                <div className="small muted" style={{ marginTop: 8 }}>
                  当前表单值：{currentValue}
                </div>
              ) : null}

              {conflict ? (
                <div style={{ marginTop: 12 }}>
                  <div className="small muted">检测到冲突候选，请先选择一个候选值：</div>
                  <div className="toolbar" style={{ marginTop: 8 }}>
                    {conflict.candidates.map((candidate, index) => (
                      <button
                        type="button"
                        key={`${field.key}-${index}`}
                        className="button secondary inline"
                        onClick={() => onConflictSelect(conflict.field, candidate.value)}
                      >
                        {candidate.source}：{candidate.value}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div style={{ marginTop: 12 }}>
                {field.type === "textarea" ? (
                  <textarea
                    value={mappedValue}
                    onChange={(event) => onFieldChange(field.key, event.target.value)}
                    style={{ minHeight: 100 }}
                  />
                ) : null}

                {field.type === "input" ? (
                  <input
                    value={mappedValue}
                    onChange={(event) => onFieldChange(field.key, event.target.value)}
                  />
                ) : null}

                {field.type === "select" && field.key === "industryGroupId" ? (
                  <select
                    value={mappedValue}
                    onChange={(event) => onFieldChange(field.key, event.target.value)}
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
                    onChange={(event) => onFieldChange(field.key, event.target.value)}
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
                    onChange={(event) => onFieldChange(field.key, event.target.value)}
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
        <button type="button" onClick={onApply}>
          确认填入表单
        </button>
        <button type="button" className="button secondary" onClick={onClear}>
          清空解析结果
        </button>
      </div>
    </section>
  );
}
