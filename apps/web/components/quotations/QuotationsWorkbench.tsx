"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { apiFetch, getCurrentUser, hasPermission } from "../../lib/api";
import { formatDateLabel, formatMoney } from "../../lib/workspace";
import styles from "./QuotationsWorkbench.module.css";

type QuotationType =
  | "AGRICULTURE"
  | "GENERAL"
  | "INDUSTRY"
  | "SERVICE"
  | "BREEDING";

type ApprovalStatus = "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";
type FocusKey = "pending" | "export" | "recent";
type Tone = "neutral" | "success" | "warning" | "danger";
type ReviewType = "discount" | "export";
type ReviewDecision = "approve" | "reject";

type QuotationRecord = {
  id: string;
  quotationNo: string;
  type: QuotationType;
  subtotal: string;
  totalAmount: string;
  approvalStatus: ApprovalStatus;
  exportApprovalStatus: ApprovalStatus;
  createdAt: string;
  customer: { name: string };
  creator: { displayName: string };
  items: Array<{ id: string }>;
};

type BatchReviewSummary = {
  total: number;
  completed: number;
  successCount: number;
  decision: ReviewDecision;
  failedItems: Array<{
    id: string;
    quotationNo: string;
    reason: string;
  }>;
  active: boolean;
};

const quotationTypeOptions: Array<{
  value: "" | QuotationType;
  label: string;
}> = [
  { value: "", label: "全部类型" },
  { value: "AGRICULTURE", label: "农业方案" },
  { value: "GENERAL", label: "通用报价" },
  { value: "INDUSTRY", label: "行业报价" },
  { value: "SERVICE", label: "服务报价" },
  { value: "BREEDING", label: "养殖报价" },
];

const focusTabs: Array<{ key: FocusKey; label: string; helper: string }> = [
  {
    key: "pending",
    label: "待审批",
    helper: "先清掉直接影响对外推进的报价。",
  },
  {
    key: "export",
    label: "待导出放行",
    helper: "把已经能成交的报价从卡点里拉出来。",
  },
  {
    key: "recent",
    label: "最近新增",
    helper: "快速判断团队今天在推进什么类型的生意。",
  },
];

const quickNotes = [
  {
    label: "今天先批",
    title: "先处理已经接近外发的单",
    note: "高金额折扣审批和外发导出审批，不应该继续藏在明细页里。",
  },
  {
    label: "今天先发",
    title: "导出阻塞应该被单独看见",
    note: "已经通过金额审批但还没放开导出的报价，是最容易延误成交的队列。",
  },
  {
    label: "今天先看",
    title: "按类型判断本周业务重心",
    note: "农业方案、通用报价和服务单，不该只是一列标签，而该形成经营判断。",
  },
];

function quotationTypeLabel(type: QuotationType) {
  return (
    quotationTypeOptions.find((option) => option.value === type)?.label ?? "报价"
  );
}

function approvalTone(status: ApprovalStatus): Tone {
  switch (status) {
    case "APPROVED":
      return "success";
    case "PENDING":
      return "warning";
    case "REJECTED":
      return "danger";
    default:
      return "neutral";
  }
}

function approvalLabel(status: ApprovalStatus, mode: "approval" | "export") {
  if (status === "PENDING") {
    return "待审批";
  }

  if (status === "REJECTED") {
    return "已驳回";
  }

  if (status === "APPROVED") {
    return mode === "export" ? "已解锁" : "已通过";
  }

  return mode === "export" ? "无需解锁" : "免审批";
}

function quotationInsight(record: QuotationRecord) {
  if (record.approvalStatus === "PENDING") {
    return "折扣或金额审批仍在阻塞外发节奏";
  }

  if (record.exportApprovalStatus === "PENDING") {
    return "报价内容已基本就绪，但导出权限尚未释放";
  }

  if (record.approvalStatus === "REJECTED") {
    return "当前版本被驳回，建议先确认条款或折扣策略";
  }

  if (record.exportApprovalStatus === "APPROVED") {
    return "这笔报价已具备正式对外交付条件";
  }

  return "当前报价可以作为稳定推进中的业务管道";
}

function nextAction(record: QuotationRecord) {
  if (record.approvalStatus === "PENDING") {
    return "优先完成金额审批，避免继续卡在内部确认。";
  }

  if (record.exportApprovalStatus === "PENDING") {
    return "确认导出权限后直接外发客户版本。";
  }

  if (record.approvalStatus === "REJECTED") {
    return "回看被驳回原因，修正版本后重新提交。";
  }

  return "保持跟进节奏，把客户确认节点写回系统。";
}

function isPendingDiscountRecord(record: QuotationRecord) {
  return record.approvalStatus === "PENDING";
}

function isRejectedDiscountRecord(record: QuotationRecord) {
  return record.approvalStatus === "REJECTED";
}

function isPendingExportRecord(record: QuotationRecord) {
  return record.exportApprovalStatus === "PENDING";
}

function getReviewTypeByTab(tab: FocusKey): ReviewType | null {
  if (tab === "pending") {
    return "discount";
  }

  if (tab === "export") {
    return "export";
  }

  return null;
}

function isActionableRecord(tab: FocusKey, record: QuotationRecord) {
  if (tab === "pending") {
    return isPendingDiscountRecord(record);
  }

  if (tab === "export") {
    return isPendingExportRecord(record);
  }

  return false;
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function ToneBadge({
  children,
  tone,
}: {
  children: string;
  tone: Tone;
}) {
  return (
    <span
      className={cx(
        styles.badge,
        styles[`badge${tone[0].toUpperCase()}${tone.slice(1)}`],
      )}
    >
      {children}
    </span>
  );
}

export function QuotationsWorkbench() {
  const currentUser = getCurrentUser();
  const canApprove = hasPermission(currentUser, "action.quotation.approve");
  const canReject = hasPermission(currentUser, "action.quotation.reject");
  const [records, setRecords] = useState<QuotationRecord[]>([]);
  const [activeTab, setActiveTab] = useState<FocusKey>("pending");
  const [keyword, setKeyword] = useState("");
  const deferredKeyword = useDeferredValue(keyword);
  const [type, setType] = useState<"" | QuotationType>("");
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [batchRejectRemark, setBatchRejectRemark] = useState("");
  const [batchReviewLoading, setBatchReviewLoading] =
    useState<ReviewDecision | null>(null);
  const [batchReviewSummary, setBatchReviewSummary] =
    useState<BatchReviewSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      setIsLoading(true);

      try {
        const payload = await apiFetch<QuotationRecord[]>("/quotations");
        if (cancelled) {
          return;
        }

        setRecords(Array.isArray(payload) ? payload : []);
        setSelectedId(payload[0]?.id ?? "");
        setError("");
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setRecords([]);
        setSelectedId("");
        setError(
          requestError instanceof Error
            ? requestError.message
            : "加载报价记录失败",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRecords();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const filteredRecords = useMemo(() => {
    const normalizedKeyword = deferredKeyword.trim().toLowerCase();

    return records
      .filter((record) => {
        const haystack =
          `${record.quotationNo} ${record.customer.name} ${record.creator.displayName}`.toLowerCase();
        const matchesKeyword =
          !normalizedKeyword || haystack.includes(normalizedKeyword);
        const matchesType = !type || record.type === type;
        return matchesKeyword && matchesType;
      })
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      );
  }, [deferredKeyword, records, type]);

  const pendingApprovalCount = useMemo(
    () =>
      filteredRecords.filter((record) => record.approvalStatus === "PENDING")
        .length,
    [filteredRecords],
  );

  const pendingExportCount = useMemo(
    () =>
      filteredRecords.filter(
        (record) => record.exportApprovalStatus === "PENDING",
      ).length,
    [filteredRecords],
  );

  const recentCount = useMemo(
    () =>
      filteredRecords.filter((record) => {
        const createdAt = new Date(record.createdAt).getTime();
        return Date.now() - createdAt <= 7 * 24 * 60 * 60 * 1000;
      }).length,
    [filteredRecords],
  );

  const totalAmount = useMemo(
    () =>
      filteredRecords.reduce(
        (sum, record) => sum + Number(record.totalAmount || 0),
        0,
      ),
    [filteredRecords],
  );

  const focusRecords = useMemo(() => {
    switch (activeTab) {
      case "pending":
        return filteredRecords.filter(
          (record) =>
            record.approvalStatus === "PENDING" ||
            record.approvalStatus === "REJECTED",
        );
      case "export":
        return filteredRecords.filter(
          (record) => record.exportApprovalStatus === "PENDING",
        );
      default:
        return filteredRecords.slice(0, 6);
    }
  }, [activeTab, filteredRecords]);

  const selectedRecord =
    focusRecords.find((record) => record.id === selectedId) ??
    focusRecords[0] ??
    null;
  const reviewType = getReviewTypeByTab(activeTab);
  const canUseBatchMode =
    reviewType !== null && (canApprove || canReject) && focusRecords.length > 0;
  const actionableRecords = useMemo(
    () => focusRecords.filter((record) => isActionableRecord(activeTab, record)),
    [activeTab, focusRecords],
  );
  const selectedBatchIdSet = useMemo(() => new Set(selectedBatchIds), [selectedBatchIds]);
  const selectedBatchRecords = useMemo(
    () => actionableRecords.filter((record) => selectedBatchIdSet.has(record.id)),
    [actionableRecords, selectedBatchIdSet],
  );
  const isBatchSubmitting = batchReviewLoading !== null;

  useEffect(() => {
    const visibleIds = new Set(focusRecords.map((record) => record.id));

    if (!visibleIds.size) {
      if (selectedId) {
        setSelectedId("");
      }
      return;
    }

    if (!visibleIds.has(selectedId)) {
      setSelectedId(focusRecords[0]?.id ?? "");
    }
  }, [focusRecords, selectedId]);

  useEffect(() => {
    if (canUseBatchMode) {
      return;
    }

    setIsBatchMode(false);
    setSelectedBatchIds([]);
    setBatchRejectRemark("");
    setBatchReviewSummary(null);
  }, [canUseBatchMode]);

  useEffect(() => {
    setSelectedBatchIds((current) =>
      current.filter((id) => actionableRecords.some((record) => record.id === id)),
    );
  }, [actionableRecords]);

  useEffect(() => {
    if (isBatchMode) {
      return;
    }

    setSelectedBatchIds([]);
    setBatchRejectRemark("");
    setBatchReviewSummary(null);
  }, [isBatchMode]);

  const typeMix = useMemo(() => {
    const map = filteredRecords.reduce<Record<QuotationType, number>>(
      (result, record) => {
        result[record.type] = (result[record.type] ?? 0) + 1;
        return result;
      },
      {
        AGRICULTURE: 0,
        GENERAL: 0,
        INDUSTRY: 0,
        SERVICE: 0,
        BREEDING: 0,
      },
    );

    return Object.entries(map)
      .map(([key, value]) => ({
        key: key as QuotationType,
        label: quotationTypeLabel(key as QuotationType),
        value,
      }))
      .filter((item) => item.value > 0)
      .sort((left, right) => right.value - left.value);
  }, [filteredRecords]);

  const topCustomers = useMemo(() => {
    const map = filteredRecords.reduce<Record<string, number>>((result, record) => {
      result[record.customer.name] =
        (result[record.customer.name] ?? 0) + Number(record.totalAmount || 0);
      return result;
    }, {});

    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 3);
  }, [filteredRecords]);

  const livePanelTitle = isLoading
    ? "正在载入报价数据"
    : error
      ? "数据载入受阻"
      : "实时报价数据已接入";

  const livePanelBody = error
    ? error
    : filteredRecords.length
      ? `待审批 ${pendingApprovalCount} 条 · 待导出放行 ${pendingExportCount} 条`
      : "当前筛选范围内暂无报价记录";

  function toggleBatchSelection(recordId: string) {
    setSelectedBatchIds((current) =>
      current.includes(recordId)
        ? current.filter((id) => id !== recordId)
        : [...current, recordId],
    );
  }

  async function handleBatchReview(decision: ReviewDecision) {
    if (!reviewType) {
      return;
    }

    if (!selectedBatchRecords.length) {
      setError("请先选择要处理的报价");
      return;
    }

    const remark = batchRejectRemark.trim();

    if (decision === "reject" && !remark) {
      setError("批量驳回前请填写统一备注");
      return;
    }

    setError("");
    setBatchReviewLoading(decision);
    setBatchReviewSummary({
      total: selectedBatchRecords.length,
      completed: 0,
      successCount: 0,
      decision,
      failedItems: [],
      active: true,
    });

    let completed = 0;
    let successCount = 0;
    const failedItems: BatchReviewSummary["failedItems"] = [];

    for (const record of selectedBatchRecords) {
      try {
        await apiFetch(`/quotations/${record.id}/review-approval`, {
          method: "POST",
          body: JSON.stringify({
            type: reviewType,
            decision,
            ...(decision === "reject" && remark ? { remark } : {}),
          }),
        });

        successCount += 1;
      } catch (requestError) {
        failedItems.push({
          id: record.id,
          quotationNo: record.quotationNo,
          reason:
            requestError instanceof Error ? requestError.message : "批量审批处理失败",
        });
      } finally {
        completed += 1;
        setBatchReviewSummary({
          total: selectedBatchRecords.length,
          completed,
          successCount,
          decision,
          failedItems: [...failedItems],
          active: completed < selectedBatchRecords.length,
        });
      }
    }

    setBatchReviewLoading(null);
    setSelectedBatchIds(failedItems.map((item) => item.id));

    if (decision === "reject" && !failedItems.length) {
      setBatchRejectRemark("");
    }

    if (successCount > 0) {
      setReloadKey((current) => current + 1);
    }

    if (failedItems.length) {
      setError(
        `批量${decision === "approve" ? "通过" : "驳回"}完成，成功 ${successCount} 条，失败 ${failedItems.length} 条。失败单号：${failedItems
          .map((item) => item.quotationNo)
          .join("、")}`,
      );
    }
  }

  return (
    <div className={styles.workbench}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Quotation command deck</span>
          <h1>报价中心工作台</h1>
          <p>
            这版把报价页从“查表入口”改成“经营中的报价指挥面”。
            第一眼先看待审批、待导出和最近新增，再决定今天先推进哪一笔。
          </p>

          <div className={styles.heroSignals}>
            <span>把成交临界点直接抬到首页</span>
            <span>把导出阻塞从细节动作升级成主任务</span>
            <span>让类型结构能读出经营重心</span>
          </div>
        </div>

        <div className={styles.heroAside}>
          <div className={styles.livePanel}>
            <span>当前状态</span>
            <strong>{livePanelTitle}</strong>
            <p>{livePanelBody}</p>
          </div>

          <div className={styles.heroActions}>
            <Link
              className={styles.secondaryAction}
              href="/solutions/agriculture/new"
            >
              新建农业方案
            </Link>
            <Link className={styles.primaryAction} href="/quotes/general">
              新建通用报价
            </Link>
          </div>
        </div>
      </section>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <section className={styles.signalGrid}>
        <article className={cx(styles.signalCard, styles.signalWarning)}>
          <span>待金额审批</span>
          <strong>{String(pendingApprovalCount).padStart(2, "0")}</strong>
          <h2>先清最影响对外节奏的报价</h2>
          <p>这类报价已经接近外发或成交，应该优先获得管理确认。</p>
        </article>

        <article className={cx(styles.signalCard, styles.signalDanger)}>
          <span>待导出放行</span>
          <strong>{String(pendingExportCount).padStart(2, "0")}</strong>
          <h2>导出阻塞应该成为单独战情</h2>
          <p>金额过了但导出还没放开的单，是最容易拖慢客户确认的点。</p>
        </article>

        <article className={cx(styles.signalCard, styles.signalSuccess)}>
          <span>近 7 天新增</span>
          <strong>{String(recentCount).padStart(2, "0")}</strong>
          <h2>这周的业务方向需要被看见</h2>
          <p>最近新增的类型结构，可以直接读出团队现在在卖什么。</p>
        </article>
      </section>

      <section className={styles.metricRibbon}>
        <article className={styles.metricCard}>
          <span>筛选后总额</span>
          <strong>{formatMoney(totalAmount)}</strong>
          <small>当前视角下的报价资金盘</small>
        </article>
        <article className={styles.metricCard}>
          <span>报价数量</span>
          <strong>{filteredRecords.length}</strong>
          <small>当前关键词与类型的结果数</small>
        </article>
        <article className={styles.metricCard}>
          <span>最高单笔</span>
          <strong>
            {formatMoney(
              Math.max(
                0,
                ...filteredRecords.map((record) => Number(record.totalAmount || 0)),
              ),
            )}
          </strong>
          <small>适合优先关注的大额机会</small>
        </article>
        <article className={styles.metricCard}>
          <span>均单金额</span>
          <strong>
            {formatMoney(
              filteredRecords.length ? totalAmount / filteredRecords.length : 0,
            )}
          </strong>
          <small>帮助判断报价结构是否偏大单</small>
        </article>
      </section>

      <section className={styles.workspace}>
        <div className={styles.mainColumn}>
          <section className={styles.queuePanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>报价推进队列</span>
                <h2>先处理会改变经营节奏的报价，而不是先翻全表。</h2>
              </div>
            </div>

            <div className={styles.filterRow}>
              <label className={styles.field}>
                <span>搜索</span>
                <input
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="报价单号 / 客户 / 创建人"
                  value={keyword}
                />
              </label>

              <label className={styles.field}>
                <span>报价类型</span>
                <select
                  onChange={(event) =>
                    setType(event.target.value as "" | QuotationType)
                  }
                  value={type}
                >
                  {quotationTypeOptions.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className={styles.filterReset}
                onClick={() => {
                  setKeyword("");
                  setType("");
                }}
                type="button"
              >
                清空筛选
              </button>
              {canUseBatchMode ? (
                <button
                  className={styles.filterReset}
                  onClick={() => setIsBatchMode((current) => !current)}
                  type="button"
                >
                  {isBatchMode ? "退出批量" : "开启批量处理"}
                </button>
              ) : null}
            </div>

            <div className={styles.tabRow}>
              {focusTabs.map((tab) => {
                const count =
                  tab.key === "pending"
                    ? filteredRecords.filter(
                        (record) =>
                          record.approvalStatus === "PENDING" ||
                          record.approvalStatus === "REJECTED",
                      ).length
                    : tab.key === "export"
                      ? filteredRecords.filter(
                          (record) => record.exportApprovalStatus === "PENDING",
                        ).length
                      : Math.min(filteredRecords.length, 6);

                return (
                  <button
                    className={cx(
                      styles.tabButton,
                      activeTab === tab.key && styles.tabButtonActive,
                    )}
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    type="button"
                  >
                    <strong>{tab.label}</strong>
                    <span>{tab.helper}</span>
                    <em>{String(count).padStart(2, "0")}</em>
                  </button>
                );
              })}
            </div>

            {isBatchMode && canUseBatchMode ? (
              <div className={styles.batchToolbar}>
                <div className={styles.batchToolbarTop}>
                  <div className={styles.batchToolbarCopy}>
                    <span>批量动作</span>
                    <strong>
                      {activeTab === "pending"
                        ? "直接清待金额审批队列，不再逐条进详情。"
                        : "直接清待导出放行队列，不再来回切页面。"}
                    </strong>
                    <p>
                      已选 {selectedBatchRecords.length} 条。
                      {activeTab === "pending"
                        ? "已驳回记录保留可见，但不进入本次批量处理。"
                        : "这一队列只处理仍待放行的报价。"}
                    </p>
                  </div>

                  <div className={styles.batchToolbarActions}>
                    <button
                      className={styles.secondaryAction}
                      disabled={isBatchSubmitting}
                      onClick={() =>
                        setSelectedBatchIds(actionableRecords.map((record) => record.id))
                      }
                      type="button"
                    >
                      全选当前队列
                    </button>
                    <button
                      className={styles.secondaryAction}
                      disabled={isBatchSubmitting || selectedBatchRecords.length === 0}
                      onClick={() => setSelectedBatchIds([])}
                      type="button"
                    >
                      清空已选
                    </button>
                  </div>
                </div>

                {canReject ? (
                  <label className={styles.field}>
                    <span>批量驳回备注</span>
                    <textarea
                      disabled={isBatchSubmitting}
                      onChange={(event) => setBatchRejectRemark(event.target.value)}
                      placeholder="批量驳回时统一写明原因，例如：折扣依据不足，需补充说明。"
                      rows={3}
                      value={batchRejectRemark}
                    />
                  </label>
                ) : null}

                <div className={styles.batchToolbarActions}>
                  {canApprove ? (
                    <button
                      className={styles.primaryAction}
                      disabled={isBatchSubmitting || selectedBatchRecords.length === 0}
                      onClick={() => void handleBatchReview("approve")}
                      type="button"
                    >
                      {batchReviewLoading === "approve" ? "批量通过中..." : "批量通过"}
                    </button>
                  ) : null}
                  {canReject ? (
                    <button
                      className={styles.dangerAction}
                      disabled={isBatchSubmitting || selectedBatchRecords.length === 0}
                      onClick={() => void handleBatchReview("reject")}
                      type="button"
                    >
                      {batchReviewLoading === "reject" ? "批量驳回中..." : "批量驳回"}
                    </button>
                  ) : null}
                </div>

                {batchReviewSummary ? (
                  <div className={styles.batchProgress}>
                    <div className={styles.batchProgressMeta}>
                      <span>执行反馈</span>
                      <strong>
                        {batchReviewSummary.active
                          ? `处理中 ${batchReviewSummary.completed}/${batchReviewSummary.total}`
                          : `本次${batchReviewSummary.decision === "approve" ? "通过" : "驳回"} ${batchReviewSummary.total} 条，成功 ${batchReviewSummary.successCount} 条，失败 ${batchReviewSummary.failedItems.length} 条`}
                      </strong>
                    </div>
                    {batchReviewSummary.failedItems.length ? (
                      <p className={styles.batchProgressText}>
                        失败记录：{batchReviewSummary.failedItems
                          .map((item) => item.quotationNo)
                          .join("、")}
                      </p>
                    ) : (
                      <p className={styles.batchProgressText}>
                        {batchReviewSummary.active
                          ? "系统会沿用现有单笔审批接口逐条处理，失败项会自动保留，方便直接重试。"
                          : "本次没有失败项，刷新后已处理记录会从当前队列中自然移出。"}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className={styles.queueList}>
              {isLoading ? (
                <div className={styles.emptyState}>
                  <strong>正在整理报价数据</strong>
                  <p>稍等一下，工作台正在汇总今天需要优先推进的报价。</p>
                </div>
              ) : focusRecords.length ? (
                focusRecords.map((record) => (
                  <div className={styles.queueItemShell} key={record.id}>
                    {isBatchMode ? (
                      isActionableRecord(activeTab, record) ? (
                        <button
                          aria-pressed={selectedBatchIdSet.has(record.id)}
                          className={cx(
                            styles.queueSelector,
                            selectedBatchIdSet.has(record.id) && styles.queueSelectorActive,
                          )}
                          disabled={isBatchSubmitting}
                          onClick={() => toggleBatchSelection(record.id)}
                          type="button"
                        >
                          {selectedBatchIdSet.has(record.id) ? "已选" : "选择"}
                        </button>
                      ) : (
                        <div className={styles.queueSelectorStatic}>待回改</div>
                      )
                    ) : null}

                    <button
                      className={cx(
                        styles.queueItem,
                        selectedRecord?.id === record.id && styles.queueItemActive,
                        selectedBatchIdSet.has(record.id) && styles.queueItemSelected,
                      )}
                      onClick={() => setSelectedId(record.id)}
                      type="button"
                    >
                      <div className={styles.queueTop}>
                        <div>
                          <span className={styles.queueEyebrow}>
                            {quotationTypeLabel(record.type)}
                          </span>
                          <h3>{record.quotationNo}</h3>
                        </div>
                        <ToneBadge tone={approvalTone(record.approvalStatus)}>
                          {approvalLabel(record.approvalStatus, "approval")}
                        </ToneBadge>
                      </div>

                      <p>{quotationInsight(record)}</p>

                      <div className={styles.queueMeta}>
                        <span>{record.customer.name}</span>
                        <span>{record.creator.displayName}</span>
                        <span>{formatDateLabel(record.createdAt)}</span>
                      </div>

                      <div className={styles.queueFoot}>
                        <strong>{formatMoney(record.totalAmount)}</strong>
                        <ToneBadge tone={approvalTone(record.exportApprovalStatus)}>
                          {approvalLabel(record.exportApprovalStatus, "export")}
                        </ToneBadge>
                      </div>
                    </button>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <strong>当前筛选下没有匹配报价</strong>
                  <p>可以切换队列、调整关键词，或直接清空筛选重新看整盘报价。</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.inspectorPanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>右侧检视面</span>
                <h2>选中一笔报价时，右侧应该给出足够判断依据。</h2>
              </div>
            </div>

            {selectedRecord ? (
              <div className={styles.inspectorBody}>
                <div className={styles.selectedHeadline}>
                  <div>
                    <span>{selectedRecord.customer.name}</span>
                    <h3>{selectedRecord.quotationNo}</h3>
                  </div>
                  <strong>{formatMoney(selectedRecord.totalAmount)}</strong>
                </div>

                {isBatchMode && canUseBatchMode ? (
                  <div className={styles.inspectorNotice}>
                    <span>批量模式</span>
                    <strong>
                      {isActionableRecord(activeTab, selectedRecord)
                        ? selectedBatchIdSet.has(selectedRecord.id)
                          ? "当前报价已加入本次批量处理"
                          : "当前报价可加入本次批量处理"
                        : "当前报价仅保留查看，不进入本次批量处理"}
                    </strong>
                    <p>
                      {isActionableRecord(activeTab, selectedRecord)
                        ? "你可以继续看右侧判断，再决定要不要把这条加入当前批次。"
                        : "这条报价当前不属于可批量处理项，建议进入详情继续回改或复核。"}
                    </p>
                    {isActionableRecord(activeTab, selectedRecord) ? (
                      <button
                        className={styles.secondaryAction}
                        disabled={isBatchSubmitting}
                        onClick={() => toggleBatchSelection(selectedRecord.id)}
                        type="button"
                      >
                        {selectedBatchIdSet.has(selectedRecord.id) ? "移出已选" : "加入已选"}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <div className={styles.badgeRow}>
                  <ToneBadge tone={approvalTone(selectedRecord.approvalStatus)}>
                    {approvalLabel(selectedRecord.approvalStatus, "approval")}
                  </ToneBadge>
                  <ToneBadge
                    tone={approvalTone(selectedRecord.exportApprovalStatus)}
                  >
                    {approvalLabel(selectedRecord.exportApprovalStatus, "export")}
                  </ToneBadge>
                  <ToneBadge
                    tone={
                      selectedRecord.type === "AGRICULTURE"
                        ? "success"
                        : "neutral"
                    }
                  >
                    {quotationTypeLabel(selectedRecord.type)}
                  </ToneBadge>
                </div>

                <p className={styles.selectedSummary}>
                  {quotationInsight(selectedRecord)}
                </p>

                <div className={styles.selectedGrid}>
                  <article>
                    <span>创建人</span>
                    <strong>{selectedRecord.creator.displayName}</strong>
                  </article>
                  <article>
                    <span>条目数</span>
                    <strong>{selectedRecord.items.length}</strong>
                  </article>
                  <article>
                    <span>小计</span>
                    <strong>{formatMoney(selectedRecord.subtotal)}</strong>
                  </article>
                  <article>
                    <span>创建时间</span>
                    <strong>{formatDateLabel(selectedRecord.createdAt)}</strong>
                  </article>
                </div>

                <div className={styles.nextAction}>
                  <span>建议下一步</span>
                  <strong>{nextAction(selectedRecord)}</strong>
                </div>

                <div className={styles.linkRow}>
                  <Link
                    className={styles.primaryAction}
                    href={`/quotations/${selectedRecord.id}`}
                  >
                    查看详情
                  </Link>
                  <Link className={styles.secondaryAction} href="/quotes/general">
                    新建报价
                  </Link>
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <strong>还没有可检视的报价</strong>
                <p>调整筛选条件后，这里会展示被选中的报价详情与处理建议。</p>
              </div>
            )}
          </section>

          <section className={styles.sidePanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>经营结构</span>
                <h2>报价类型不只是分类，更是本周业务重心。</h2>
              </div>
            </div>

            <div className={styles.mixList}>
              {typeMix.length ? (
                typeMix.map((item) => (
                  <article className={styles.mixCard} key={item.key}>
                    <div>
                      <span>{item.label}</span>
                      <strong>{String(item.value).padStart(2, "0")}</strong>
                    </div>
                    <div
                      className={styles.mixBar}
                      style={{
                        width: `${Math.max(
                          24,
                          (item.value / Math.max(1, filteredRecords.length)) * 100,
                        )}%`,
                      }}
                    />
                  </article>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <strong>暂无类型结构</strong>
                  <p>当前筛选范围内还没有足够数据形成结构判断。</p>
                </div>
              )}
            </div>
          </section>

          <section className={styles.sidePanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>重点客户金额</span>
                <h2>右侧应该顺手告诉你，现在最大的盘子在哪。</h2>
              </div>
            </div>

            <div className={styles.customerList}>
              {topCustomers.length ? (
                topCustomers.map((customer) => (
                  <article className={styles.customerCard} key={customer.name}>
                    <span>{customer.name}</span>
                    <strong>{formatMoney(customer.amount)}</strong>
                  </article>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <strong>暂无重点客户金额</strong>
                  <p>等报价记录进来后，这里会直接浮出最大的客户金额盘子。</p>
                </div>
              )}
            </div>
          </section>
        </aside>
      </section>

      <section className={styles.quickBoard}>
        {quickNotes.map((item) => (
          <article className={styles.quickCard} key={item.label}>
            <span>{item.label}</span>
            <h3>{item.title}</h3>
            <p>{item.note}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
