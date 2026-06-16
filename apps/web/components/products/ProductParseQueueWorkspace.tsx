"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDateLabel } from "../../lib/workspace";
import {
  EmptyState,
  SectionCard,
  StatusBadge,
  SummaryCard,
} from "../system/primitives";
import {
  PRODUCT_PARSE_FIELD_LABELS,
  type ProductParseQueueItem,
  type ProductParseReviewStatus,
} from "./types";
import styles from "./ProductParseQueueWorkspace.module.css";

type QueueFocus = "pending" | "conflict" | "low" | "mixed" | "reviewed";

type ProductParseQueueWorkspaceProps = {
  items: ProductParseQueueItem[];
  loading?: boolean;
  error?: string;
  statusText?: string;
  canReview?: boolean;
  previewMode?: boolean;
  reviewingId?: string | null;
  onReview?: (id: string, reviewStatus: ProductParseReviewStatus) => void;
  links?: {
    productListHref?: string;
    newProductHref?: string;
    parserPreviewHref?: string;
  };
};

const focusOptions: Array<{
  key: QueueFocus;
  label: string;
  helper: string;
}> = [
  {
    key: "pending",
    label: "待确认",
    helper: "先处理刚解析完、还没人工确认的结果。",
  },
  {
    key: "conflict",
    label: "有冲突",
    helper: "优先看图文不一致或候选值冲突的记录。",
  },
  {
    key: "low",
    label: "低置信度",
    helper: "这批字段更容易写偏，适合先人工复核。",
  },
  {
    key: "mixed",
    label: "图文混合",
    helper: "这批更接近真实标签导入场景，值得先收口。",
  },
  {
    key: "reviewed",
    label: "最近已处理",
    helper: "回看最近已经确认或忽略过的解析记录。",
  },
];

function reviewTone(status: ProductParseReviewStatus) {
  switch (status) {
    case "CONFIRMED":
      return "success" as const;
    case "IGNORED":
      return "neutral" as const;
    default:
      return "warning" as const;
  }
}

function reviewLabel(status: ProductParseReviewStatus) {
  switch (status) {
    case "CONFIRMED":
      return "已确认";
    case "IGNORED":
      return "已忽略";
    default:
      return "待确认";
  }
}

function sourceLabel(value: string) {
  switch (value) {
    case "TEXT":
      return "文本";
    case "IMAGE":
      return "图片";
    case "MIXED":
      return "图文混合";
    default:
      return value;
  }
}

function rowSignalText(item: ProductParseQueueItem) {
  if (item.conflictCount > 0) {
    return `存在 ${item.conflictCount} 个冲突字段，建议先比对候选值。`;
  }

  if (item.lowConfidenceCount > 0) {
    return `有 ${item.lowConfidenceCount} 个低置信度字段，建议人工复核。`;
  }

  if (item.mediumConfidenceCount > 0) {
    return `有 ${item.mediumConfidenceCount} 个中置信度字段，适合再确认模板和行业。`;
  }

  return "当前解析结果较完整，可直接带入正式产品录入页继续处理。";
}

function buildParsedFieldEntries(item: ProductParseQueueItem) {
  return Object.entries(item.parsed)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => ({
      key,
      label:
        PRODUCT_PARSE_FIELD_LABELS[
          key as keyof typeof PRODUCT_PARSE_FIELD_LABELS
        ] ?? key,
      value: String(value),
      confidence: item.confidence[key as keyof typeof item.confidence],
    }));
}

function buildCarryHref(baseHref: string, parseLogId: string) {
  const [path, hash = ""] = baseHref.split("#");
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}parseLogId=${encodeURIComponent(parseLogId)}${
    hash ? `#${hash}` : ""
  }`;
}

export function ProductParseQueueWorkspace({
  items,
  loading = false,
  error,
  statusText,
  canReview = false,
  previewMode = false,
  reviewingId,
  onReview,
  links,
}: ProductParseQueueWorkspaceProps) {
  const [focus, setFocus] = useState<QueueFocus>("pending");
  const [keyword, setKeyword] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const stats = useMemo(
    () => ({
      pending: items.filter((item) => item.reviewStatus === "PENDING").length,
      conflict: items.filter(
        (item) => item.reviewStatus === "PENDING" && item.conflictCount > 0,
      ).length,
      low: items.filter(
        (item) => item.reviewStatus === "PENDING" && item.lowConfidenceCount > 0,
      ).length,
      mixed: items.filter(
        (item) => item.reviewStatus === "PENDING" && item.sourceType === "MIXED",
      ).length,
      reviewed: items.filter((item) => item.reviewStatus !== "PENDING").length,
    }),
    [items],
  );

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return items.filter((item) => {
      if (sourceType && item.sourceType !== sourceType) {
        return false;
      }

      if (normalizedKeyword) {
        const haystack = [
          item.title,
          item.summary,
          item.rawText,
          item.parsed.name,
          item.parsed.displayName,
          item.parsed.scenarios,
          item.operator.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(normalizedKeyword)) {
          return false;
        }
      }

      switch (focus) {
        case "conflict":
          return item.reviewStatus === "PENDING" && item.conflictCount > 0;
        case "low":
          return item.reviewStatus === "PENDING" && item.lowConfidenceCount > 0;
        case "mixed":
          return item.reviewStatus === "PENDING" && item.sourceType === "MIXED";
        case "reviewed":
          return item.reviewStatus !== "PENDING";
        default:
          return item.reviewStatus === "PENDING";
      }
    });
  }, [focus, items, keyword, sourceType]);

  useEffect(() => {
    if (!filteredItems.some((item) => item.id === selectedId)) {
      setSelectedId(filteredItems[0]?.id ?? "");
    }
  }, [filteredItems, selectedId]);

  const selectedItem =
    filteredItems.find((item) => item.id === selectedId) ?? null;
  const selectedFields = selectedItem ? buildParsedFieldEntries(selectedItem) : [];

  const noteText =
    error ||
    statusText ||
    (previewMode
      ? "这版用静态样例验证解析队列结构、焦点切片和右侧处置面板。"
      : "正式模式会把解析日志集中在这里，先人工确认，再决定是否进入产品库。");

  return (
    <div className={styles.workspace}>
      {error ? <div className="danger-text small">{error}</div> : null}

      <section className="split-workspace">
        <div className="workspace-main">
          <SectionCard
            actions={
              <div className={styles.sectionBadges}>
                <StatusBadge tone="warning" variant="badge">
                  待确认 {stats.pending}
                </StatusBadge>
                <StatusBadge tone="neutral" variant="badge">
                  {previewMode ? "预览模式" : "正式数据"}
                </StatusBadge>
              </div>
            }
            className={styles.mainCard}
            description="把图文解析结果先收进待确认队列，再由人工确认是否进入正式产品录入或维护。"
            title="AI 解析待确认队列"
          >
            <div className={styles.dataNote}>
              <span className={styles.dataNoteDot} />
              <span>{noteText}</span>
            </div>

            <div className={styles.filterBar}>
              <label className={styles.field}>
                <span>搜索记录</span>
                <input
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="搜索解析名称、场景、原文或操作人"
                  value={keyword}
                />
              </label>

              <label className={styles.field}>
                <span>输入来源</span>
                <select
                  onChange={(event) => setSourceType(event.target.value)}
                  value={sourceType}
                >
                  <option value="">全部来源</option>
                  <option value="TEXT">文本</option>
                  <option value="IMAGE">图片</option>
                  <option value="MIXED">图文混合</option>
                </select>
              </label>
            </div>

            <div className={styles.focusRow}>
              {focusOptions.map((option) => {
                const count =
                  option.key === "pending"
                    ? stats.pending
                    : option.key === "conflict"
                      ? stats.conflict
                      : option.key === "low"
                        ? stats.low
                        : option.key === "mixed"
                          ? stats.mixed
                          : stats.reviewed;

                return (
                  <button
                    className={[
                      styles.focusButton,
                      focus === option.key ? styles.focusButtonActive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={option.key}
                    onClick={() => setFocus(option.key)}
                    type="button"
                  >
                    <strong>
                      {option.label} {count}
                    </strong>
                    <span>{option.helper}</span>
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div className="small muted">正在加载解析队列...</div>
            ) : filteredItems.length ? (
              <div className={styles.queueList}>
                {filteredItems.map((item) => (
                  <article
                    className={[
                      styles.queueRow,
                      item.id === selectedId ? styles.queueRowActive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(item.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.queueTop}>
                      <div className={styles.queuePrimary}>
                        <div className={styles.queueTitleRow}>
                          <strong>{item.title}</strong>
                          <div className={styles.queueBadges}>
                            <StatusBadge tone={reviewTone(item.reviewStatus)}>
                              {reviewLabel(item.reviewStatus)}
                            </StatusBadge>
                            <StatusBadge tone="neutral" variant="badge">
                              {sourceLabel(item.sourceType)}
                            </StatusBadge>
                          </div>
                        </div>
                        <p>{item.summary}</p>
                      </div>

                      <div className={styles.queueMeta}>
                        <span>{formatDateLabel(item.createdAt)}</span>
                        <span>{item.operator.name}</span>
                      </div>
                    </div>

                    <div className={styles.signalRow}>
                      <span className={styles.signalChip}>
                        解析字段 {item.parsedFieldCount}
                      </span>
                      <span className={styles.signalChip}>
                        冲突 {item.conflictCount}
                      </span>
                      <span className={styles.signalChip}>
                        低置信度 {item.lowConfidenceCount}
                      </span>
                      {item.mediumConfidenceCount ? (
                        <span className={styles.signalChip}>
                          中置信度 {item.mediumConfidenceCount}
                        </span>
                      ) : null}
                    </div>

                    <div className={styles.queueFooter}>
                      <div className={styles.queueInsight}>{rowSignalText(item)}</div>

                      <div className={styles.queueActions}>
                        <button
                          className="button ghost inline"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(item.id);
                          }}
                          type="button"
                        >
                          查看详情
                        </button>
                        {links?.newProductHref ? (
                          <Link
                            className="button ghost inline"
                            href={buildCarryHref(links.newProductHref, item.id)}
                            onClick={(event) => event.stopPropagation()}
                          >
                            带入新增产品
                          </Link>
                        ) : null}
                        {item.reviewStatus === "PENDING" && canReview && onReview ? (
                          <>
                            <button
                              className="button secondary inline"
                              disabled={reviewingId === item.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                onReview(item.id, "CONFIRMED");
                              }}
                              type="button"
                            >
                              {reviewingId === item.id ? "处理中..." : "标记已确认"}
                            </button>
                            <button
                              className="button ghost inline"
                              disabled={reviewingId === item.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                onReview(item.id, "IGNORED");
                              }}
                              type="button"
                            >
                              忽略
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                description="当前筛选条件下没有解析记录，建议切换焦点或清空搜索。"
                title="暂无匹配记录"
              />
            )}
          </SectionCard>
        </div>

        <aside className="workspace-side sticky-side">
          <SummaryCard
            className={styles.sideCard}
            description="先看待确认总量，再判断应该先处理冲突、低置信度还是图文混合记录。"
            title="队列概览"
          >
            <div className={styles.summaryGrid}>
              <article>
                <span>待确认</span>
                <strong>{stats.pending}</strong>
                <small>还没有人工确认的解析记录</small>
              </article>
              <article>
                <span>有冲突</span>
                <strong>{stats.conflict}</strong>
                <small>图文候选值还没统一</small>
              </article>
              <article>
                <span>低置信度</span>
                <strong>{stats.low}</strong>
                <small>更容易把模板和文案写偏</small>
              </article>
              <article>
                <span>最近已处理</span>
                <strong>{stats.reviewed}</strong>
                <small>最近已经确认或忽略过的记录</small>
              </article>
            </div>
          </SummaryCard>

          <SummaryCard
            className={styles.sideCard}
            description="右侧面板只聚焦当前选中的解析项，帮助你决定是确认、忽略还是回到正式录入页继续完善。"
            title={selectedItem ? "当前记录" : "当前记录为空"}
          >
            {selectedItem ? (
              <div className={styles.sideStack}>
                <div className={styles.detailHeader}>
                  <div>
                    <strong>{selectedItem.title}</strong>
                    <p>{selectedItem.summary}</p>
                  </div>
                  <StatusBadge tone={reviewTone(selectedItem.reviewStatus)}>
                    {reviewLabel(selectedItem.reviewStatus)}
                  </StatusBadge>
                </div>

                <div className={styles.summaryList}>
                  <div className={styles.summaryRow}>
                    <span>输入来源</span>
                    <strong>{sourceLabel(selectedItem.sourceType)}</strong>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>创建时间</span>
                    <strong>{formatDateLabel(selectedItem.createdAt)}</strong>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>操作人</span>
                    <strong>{selectedItem.operator.name}</strong>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>解析字段</span>
                    <strong>{selectedItem.parsedFieldCount}</strong>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>冲突字段</span>
                    <strong>{selectedItem.conflictCount}</strong>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>低置信度</span>
                    <strong>{selectedItem.lowConfidenceCount}</strong>
                  </div>
                </div>

                  {selectedFields.length ? (
                  <div className={styles.fieldList}>
                    {selectedFields.slice(0, 8).map((field) => (
                      <article className={styles.fieldCard} key={field.key}>
                        <span>{field.label}</span>
                        <strong>{field.value}</strong>
                        <small>
                          置信度 {field.confidence === "high"
                            ? "高"
                            : field.confidence === "medium"
                              ? "中"
                              : "低"}
                        </small>
                      </article>
                    ))}
                  </div>
                ) : null}

                {selectedItem.conflicts.length ? (
                  <div className={styles.conflictList}>
                    {selectedItem.conflicts.map((conflict) => (
                      <article className={styles.conflictCard} key={conflict.field}>
                        <div className={styles.conflictHeader}>
                          <strong>
                            {PRODUCT_PARSE_FIELD_LABELS[conflict.field] ??
                              conflict.field}
                          </strong>
                          <StatusBadge tone="warning" variant="badge">
                            候选 {conflict.candidates.length}
                          </StatusBadge>
                        </div>
                        <p>
                          {conflict.preferredValue
                            ? `当前建议值：${conflict.preferredValue}`
                            : "当前还没有明确建议值，建议优先人工判定。"}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : null}

                {selectedItem.rawText ? (
                  <div className={styles.textPreview}>
                    <strong>原始文本摘要</strong>
                    <p>{selectedItem.rawText.slice(0, 220)}</p>
                  </div>
                ) : null}

                {selectedItem.reviewStatus !== "PENDING" && selectedItem.reviewedAt ? (
                  <div className={styles.reviewFootnote}>
                    最近处理于 {formatDateLabel(selectedItem.reviewedAt)} ·{" "}
                    {selectedItem.reviewer?.name || "系统"}。
                  </div>
                ) : null}

                <div className={styles.sideActions}>
                  {links?.newProductHref ? (
                    <Link
                      className="button inline"
                      href={buildCarryHref(
                        links.newProductHref,
                        selectedItem.id,
                      )}
                    >
                      带入新增产品
                    </Link>
                  ) : null}
                  <Link
                    className="button secondary inline"
                    href={links?.productListHref ?? "/products"}
                  >
                    返回产品列表
                  </Link>
                  {links?.parserPreviewHref ? (
                    <Link
                      className="button ghost inline"
                      href={links.parserPreviewHref}
                    >
                      查看解析器预览
                    </Link>
                  ) : null}
                  {selectedItem.reviewStatus === "PENDING" && canReview && onReview ? (
                    <>
                      <button
                        className="button secondary"
                        disabled={reviewingId === selectedItem.id}
                        onClick={() => onReview(selectedItem.id, "CONFIRMED")}
                        type="button"
                      >
                        {reviewingId === selectedItem.id ? "处理中..." : "标记已确认"}
                      </button>
                      <button
                        className="button ghost"
                        disabled={reviewingId === selectedItem.id}
                        onClick={() => onReview(selectedItem.id, "IGNORED")}
                        type="button"
                      >
                        忽略当前记录
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ) : (
              <EmptyState
                description="先从左侧选中一条解析记录，这里会展示冲突、候选字段和建议动作。"
                title="当前没有选中记录"
              />
            )}
          </SummaryCard>
        </aside>
      </section>
    </div>
  );
}
