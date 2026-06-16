"use client";

import styles from "./ProductParserPanels.module.css";
import {
  PRODUCT_PARSE_FIELD_LABELS,
  type ProductParseConfidence,
  type ProductParseResponse,
} from "./types";

function confidenceText(value?: ProductParseConfidence) {
  if (value === "high") return "高可信";
  if (value === "medium") return "中可信";
  if (value === "low") return "低可信";
  return "未评估";
}

function confidenceClassName(value?: ProductParseConfidence) {
  if (value === "high") return `${styles.confidenceBadge} ${styles.confidenceHigh}`;
  if (value === "medium") {
    return `${styles.confidenceBadge} ${styles.confidenceMedium}`;
  }

  return `${styles.confidenceBadge} ${styles.confidenceLow}`;
}

export function ParserResultPanel({ result }: { result: ProductParseResponse | null }) {
  if (!result) {
    return null;
  }

  const entries = Object.entries(result.parsed).filter(([, value]) => value);

  return (
    <section className={`panel ${styles.panelShell}`}>
      <div className={styles.panelHeader}>
        <div className={styles.panelHeaderMain}>
          <span className={styles.stepTag}>Step 2</span>
          <h3>查看解析结果</h3>
          <p>
            先看原始识别文本、结构化结果和冲突提醒，再决定哪些字段要进入正式产品表单。
          </p>
        </div>
        <div className={styles.headerMeta}>
          已提取 {entries.length} 个字段
        </div>
      </div>

      <div className={styles.summaryStats}>
        <article className={styles.statCard}>
          <span>解析字段</span>
          <strong>{String(entries.length).padStart(2, "0")}</strong>
        </article>
        <article className={styles.statCard}>
          <span>冲突字段</span>
          <strong>{String(result.conflicts.length).padStart(2, "0")}</strong>
        </article>
        <article className={styles.statCard}>
          <span>原始文本</span>
          <strong>{result.rawText ? "已识别" : "为空"}</strong>
        </article>
      </div>

      <div className={styles.resultGrid}>
        <div className={styles.surfaceCard}>
          <div className={styles.surfaceHeading}>
            <strong>原始识别文本</strong>
            <span>这里是解析器最终使用的文本依据，适合先快速过一遍。</span>
          </div>

          <pre className={styles.rawTextBlock}>
            {result.rawText || "暂无识别文本"}
          </pre>
        </div>

        <div className={styles.surfaceCard}>
          <div className={styles.surfaceHeading}>
            <strong>冲突字段提示</strong>
            <span>如果图文识别给出不同候选值，会先在这里汇总提醒。</span>
          </div>

          <div className={styles.conflictList}>
            {result.conflicts.length ? (
              result.conflicts.map((conflict) => (
                <div className={styles.conflictCard} key={conflict.field}>
                  <strong>
                    {PRODUCT_PARSE_FIELD_LABELS[conflict.field]}：检测到候选值冲突
                  </strong>
                  <span>
                    {conflict.candidates
                      .map(
                        (candidate) =>
                          `${candidate.source} · ${candidate.value}`,
                      )
                      .join(" / ")}
                  </span>
                </div>
              ))
            ) : (
              <div className={styles.emptyText}>当前没有检测到图文冲突字段。</div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.fieldList}>
        {entries.length ? (
          entries.map(([field, value]) => (
            <article className={styles.fieldCard} key={field}>
              <div className={styles.fieldHeader}>
                <div className={styles.fieldLabel}>
                  <strong>
                    {
                      PRODUCT_PARSE_FIELD_LABELS[
                        field as keyof typeof PRODUCT_PARSE_FIELD_LABELS
                      ]
                    }
                  </strong>
                  <span>结构化候选值</span>
                </div>
                <span
                  className={confidenceClassName(
                    result.confidence[field as keyof typeof result.confidence],
                  )}
                >
                  {confidenceText(
                    result.confidence[field as keyof typeof result.confidence],
                  )}
                </span>
              </div>

              <div className={styles.currentValue}>
                <strong>{value}</strong>
              </div>

              <div className={styles.detailMeta}>
                <span>
                  来源：
                  {result.sources[field as keyof typeof result.sources] || "-"} ·
                  说明：
                  {result.reasons[field as keyof typeof result.reasons] || "无"}
                </span>
              </div>
            </article>
          ))
        ) : (
          <div className={styles.surfaceCard}>
            <div className={styles.emptyText}>
              当前没有提取到可用字段，请调整文字内容或上传更清晰的标签图。
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
