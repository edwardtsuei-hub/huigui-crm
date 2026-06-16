"use client";

import styles from "./ProductParserPanels.module.css";
import {
  MAPPABLE_FIELD_LABELS,
  hasValue,
  outputTemplateOptions,
  type IndustryGroupOption,
  type ProductFormValues,
  type ProductParseFieldKey,
  type ProductParseResponse,
  type ProductParserMappableField,
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

const directFieldToConflictKey: Partial<
  Record<ProductParserMappableField, ProductParseFieldKey>
> = {
  name: "name",
  displayName: "displayName",
  spec: "spec",
  unit: "unit",
  enterpriseStandardNo: "enterpriseStandardNo",
  intro: "intro",
  scenarios: "scenarios",
  tagText: "labelText",
  remark: "remark",
  outputTemplateType: "outputTemplateTypeSuggestion",
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
    onClear,
  } = props;

  if (!result) {
    return null;
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

  return (
    <section className={`panel ${styles.panelShell}`}>
      <div className={styles.panelHeader}>
        <div className={styles.panelHeaderMain}>
          <span className={styles.stepTag}>Step 3</span>
          <h3>字段确认并写回表单</h3>
          <p>
            每个字段都可以继续修正。已有表单值默认保留，你可以逐项切换成覆盖解析值，再统一写入。
          </p>
        </div>
        <div className={styles.headerMeta}>确认后才会进入正式表单</div>
      </div>

      <div className={styles.fieldList}>
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
          const mode = fieldModes[field.key] ?? "keep";

          return (
            <article className={styles.fieldCard} key={field.key}>
              <div className={styles.fieldTop}>
                <div className={styles.fieldLabel}>
                  <strong>{MAPPABLE_FIELD_LABELS[field.key]}</strong>
                  <span>{hasMapped ? "已生成解析建议" : "当前没有建议值"}</span>
                </div>

                {hasExisting && hasMapped ? (
                  <div className={styles.segmented}>
                    <button
                      type="button"
                      className={`${styles.segmentButton} ${
                        mode === "keep" ? styles.segmentButtonActive : ""
                      }`}
                      onClick={() => onModeChange(field.key, "keep")}
                    >
                      保留原值
                    </button>
                    <button
                      type="button"
                      className={`${styles.segmentButton} ${
                        mode === "apply" ? styles.segmentButtonActive : ""
                      }`}
                      onClick={() => onModeChange(field.key, "apply")}
                    >
                      覆盖解析值
                    </button>
                  </div>
                ) : null}
              </div>

              {hasExisting ? (
                <div className={styles.currentValue}>
                  <span>当前表单值</span>
                  <strong>{currentValue}</strong>
                </div>
              ) : null}

              {conflict ? (
                <div className={styles.surfaceCard}>
                  <div className={styles.surfaceHeading}>
                    <strong>冲突候选值</strong>
                    <span>图文识别结果不一致，建议先选一个候选值再继续。</span>
                  </div>
                  <div className={styles.candidateRow}>
                    {conflict.candidates.map((candidate, index) => (
                      <button
                        type="button"
                        key={`${field.key}-${index}`}
                        className={styles.candidateButton}
                        onClick={() =>
                          onConflictSelect(conflict.field, candidate.value)
                        }
                      >
                        {candidate.source} · {candidate.value}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className={styles.fieldEditor}>
                {field.type === "textarea" ? (
                  <textarea
                    className={styles.textArea}
                    value={mappedValue}
                    onChange={(event) => onFieldChange(field.key, event.target.value)}
                  />
                ) : null}

                {field.type === "input" ? (
                  <input
                    className={styles.textInput}
                    value={mappedValue}
                    onChange={(event) => onFieldChange(field.key, event.target.value)}
                  />
                ) : null}

                {field.type === "select" && field.key === "industryGroupId" ? (
                  <select
                    className={styles.selectInput}
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
                    className={styles.selectInput}
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
                    className={styles.selectInput}
                    value={mappedValue}
                    onChange={(event) => onFieldChange(field.key, event.target.value)}
                  >
                    <option value="">请选择输出模板</option>
                    {outputTemplateOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className={styles.fieldFooter}>
        <div>
          {applyMessage ? (
            <div className={styles.messagePositive}>{applyMessage}</div>
          ) : (
            <div className={styles.statusText}>
              只有点击“确认填入表单”后，这些建议值才会进入正式产品录入表单。
            </div>
          )}
        </div>

        <div className={styles.footerBar}>
          <button type="button" onClick={onApply}>
            确认填入表单
          </button>
          <button type="button" className="button secondary" onClick={onClear}>
            清空解析结果
          </button>
        </div>
      </div>
    </section>
  );
}
