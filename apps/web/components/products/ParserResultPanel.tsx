"use client";

import {
  PRODUCT_PARSE_FIELD_LABELS,
  type ProductParseConfidence,
  type ProductParseResponse
} from "./types";

function confidenceText(value?: ProductParseConfidence) {
  if (value === "high") return "高";
  if (value === "medium") return "中";
  if (value === "low") return "低";
  return "-";
}

function confidenceColor(value?: ProductParseConfidence) {
  if (value === "high") return "#0f766e";
  if (value === "medium") return "#b45309";
  return "#64748b";
}

export function ParserResultPanel({ result }: { result: ProductParseResponse | null }) {
  if (!result) {
    return null;
  }

  const entries = Object.entries(result.parsed).filter(([, value]) => value);

  return (
    <section className="panel stack">
      <div>
        <h3>解析结果预览</h3>
        <p className="muted">先看原始识别文本和结构化结果，再决定是否写入正式产品表单。</p>
      </div>

      <div className="grid-2">
        <div className="quote-card">
          <strong>原始识别文本</strong>
          <pre
            style={{
              marginTop: 12,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily: "inherit"
            }}
          >
            {result.rawText || "暂无识别文本"}
          </pre>
        </div>

        <div className="quote-card">
          <strong>冲突字段提示</strong>
          <div style={{ marginTop: 12 }}>
            {result.conflicts.length ? (
              result.conflicts.map((conflict) => (
                <div key={conflict.field} style={{ marginBottom: 12 }}>
                  <div>
                    {PRODUCT_PARSE_FIELD_LABELS[conflict.field]}：检测到候选值冲突
                  </div>
                  <div className="small muted">
                    {conflict.candidates.map((candidate) => `${candidate.source}:${candidate.value}`).join(" / ")}
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
                <strong>{PRODUCT_PARSE_FIELD_LABELS[field as keyof typeof PRODUCT_PARSE_FIELD_LABELS]}</strong>
                <span
                  className="small"
                  style={{
                    color: confidenceColor(result.confidence[field as keyof typeof result.confidence]),
                    fontWeight: 600
                  }}
                >
                  {confidenceText(result.confidence[field as keyof typeof result.confidence])}
                </span>
              </div>
              <div style={{ marginTop: 8 }}>{value}</div>
              <div className="small muted" style={{ marginTop: 8 }}>
                来源：{result.sources[field as keyof typeof result.sources] || "-"} ·
                说明：{result.reasons[field as keyof typeof result.reasons] || "无"}
              </div>
            </div>
          ))
        ) : (
          <div className="empty">当前没有提取到可用字段，请调整文字内容或上传更清晰的标签图。</div>
        )}
      </div>
    </section>
  );
}
