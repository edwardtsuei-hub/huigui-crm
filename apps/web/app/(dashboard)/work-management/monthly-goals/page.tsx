"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DiscussionPanel } from "../../../../components/discussions/DiscussionPanel";
import { ManagementDrawer } from "../../../../components/management/ManagementDrawer";
import {
  AutoSaveStatus,
  GoalItemCard,
  HistoryListCard,
  ReminderListCard,
  TeamSubmissionCard,
  WorkManagementPageHeader,
} from "../../../../components/work-management/WorkManagementUI";
import { EmptyState, SectionCard, StatusBadge } from "../../../../components/system/primitives";
import { apiFetch } from "../../../../lib/api";
import {
  type GoalProgress,
  type GoalRiskLevel,
  type MonthlyGoalAiSummary,
  type MonthlyGoalAiSummarySnapshot,
  type MonthlyGoalDetail,
  type MonthlyGoalEditorItem,
  type MonthlyGoalSummary,
  type MonthlySummaryEditorState,
  type PendingMonthlyGoalSummary,
  type WeeklyReportArchiveResponse,
  GOAL_PROGRESS_LABELS,
  PLAN_STATUS_LABELS,
  RISK_LEVEL_LABELS,
  formatWorkDate,
  formatWorkDay,
  fromMonthlyGoalEditorItem,
  labelForWeeklyReportStatus,
  labelForMonthlyGoalStatus,
  parseMonthlySummaryState,
  statusTone,
  toMonthlyGoalEditorItem,
} from "../../../../lib/work-management";

type MonthlyGoalListResponse = {
  pendingMonthlyGoal: PendingMonthlyGoalSummary;
  items: MonthlyGoalSummary[];
  teamItems: MonthlyGoalSummary[];
};

const GOAL_PROGRESS_OPTIONS = Object.entries(GOAL_PROGRESS_LABELS) as Array<
  [GoalProgress, string]
>;
const GOAL_STATUS_OPTIONS = Object.entries(PLAN_STATUS_LABELS) as Array<
  ["NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "AT_RISK" | "DELAYED" | "CANCELLED", string]
>;
const GOAL_RISK_OPTIONS = Object.entries(RISK_LEVEL_LABELS) as Array<
  [GoalRiskLevel, string]
>;

function createEmptyGoalItem(sortOrder: number): MonthlyGoalEditorItem {
  return {
    title: "",
    deliverable: "",
    metricValue: "",
    dueAt: "",
    progress: "0",
    itemStatus: "NOT_STARTED",
    progressDescription: "",
    supportNeeded: "",
    ownerName: "",
    riskLevel: "LOW",
    riskDescription: "",
    sortOrder,
  };
}

function formatDateTimeInput(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function reorderItems<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function formatAiSummaryForClipboard(summary: MonthlyGoalAiSummary) {
  return [
    `月底汇总 · ${summary.sourcePeriod.label}`,
    "",
    "[本月核心成果]",
    summary.sections.highlights,
    "",
    "[推进节奏与模式]",
    summary.sections.patterns,
    "",
    "[主要风险 / 阻塞]",
    summary.sections.risks,
    "",
    "[未完成与延续事项]",
    summary.sections.carryovers,
    "",
    "[下月建议重点]",
    summary.sections.nextMonthSuggestions,
  ].join("\n");
}

function formatMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function formatMonthLabel(year: number, month: number) {
  return `${year} 年 ${month} 月`;
}

function buildAiArchiveHref(monthKey: string) {
  return monthKey
    ? `/work-management/weekly-reports?archive=1&archiveMonth=${monthKey}`
    : "/work-management/weekly-reports?archive=1";
}

function sortAiSummaries(items: MonthlyGoalAiSummarySnapshot[]) {
  return [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function getAiSummarySnapshotMonthKey(snapshot: MonthlyGoalAiSummarySnapshot) {
  return formatMonthKey(snapshot.sourcePeriod.year, snapshot.sourcePeriod.month);
}

function findAiSummarySnapshotByMonthKey(
  snapshots: MonthlyGoalAiSummarySnapshot[],
  monthKey: string,
) {
  return snapshots.find((item) => getAiSummarySnapshotMonthKey(item) === monthKey) ?? null;
}

export default function MonthlyGoalsPage() {
  const searchParams = useSearchParams();
  const targetGoalId = searchParams.get("goalId") ?? undefined;

  const [listData, setListData] = useState<MonthlyGoalListResponse | null>(null);
  const [detail, setDetail] = useState<MonthlyGoalDetail | null>(null);
  const [summary, setSummary] = useState<MonthlySummaryEditorState>({
    priorities: "",
    deliverables: "",
    risks: "",
  });
  const [goalItems, setGoalItems] = useState<MonthlyGoalEditorItem[]>([]);
  const [previousGoal, setPreviousGoal] = useState<MonthlyGoalDetail | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [goalDrawerOpen, setGoalDrawerOpen] = useState(false);
  const [goalEditingIndex, setGoalEditingIndex] = useState<number | null>(null);
  const [goalDraft, setGoalDraft] = useState<MonthlyGoalEditorItem>(createEmptyGoalItem(0));
  const [aiSummary, setAiSummary] = useState<MonthlyGoalAiSummarySnapshot | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSourceMonthKey, setAiSourceMonthKey] = useState("auto");
  const [aiSourceMonths, setAiSourceMonths] = useState<
    WeeklyReportArchiveResponse["availableMonths"]
  >([]);
  const [aiSourceMonthsLoading, setAiSourceMonthsLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");
  const dragIndexRef = useRef<number | null>(null);
  const lastSavedSnapshotRef = useRef("");
  const hydratedRef = useRef(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    void bootstrap(targetGoalId);
  }, [targetGoalId]);

  useEffect(() => {
    if (!detail?.canEdit || !hydratedRef.current) {
      return;
    }

    const snapshot = buildSnapshot();
    if (snapshot === lastSavedSnapshotRef.current) {
      setDirty(false);
      return;
    }

    setDirty(true);
    setAutosaveState("idle");
    const timer = window.setTimeout(() => {
      void saveGoal("save", true);
    }, 1800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [detail?.canEdit, goalItems, summary]);

  useEffect(() => {
    if (!detail?.canEdit || !dirty) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [detail?.canEdit, dirty]);

  useEffect(() => {
    if (!detail) {
      setAiSummary(null);
      setAiSourceMonthKey("auto");
      setAiError("");
      setCopyFeedback("");
      return;
    }

    const latestSnapshot = detail.aiSummaries[0] ?? null;
    setAiSummary(latestSnapshot);
    setAiSourceMonthKey(
      latestSnapshot ? getAiSummarySnapshotMonthKey(latestSnapshot) : "auto",
    );
    setAiError("");
    setCopyFeedback("");
  }, [detail?.id]);

  useEffect(() => {
    if (!detail) {
      setAiSourceMonths([]);
      return;
    }

    let cancelled = false;

    async function loadAiSourceMonths() {
      setAiSourceMonthsLoading(true);

      try {
        const response = await apiFetch<WeeklyReportArchiveResponse>(
          "/work-management/weekly-reports/archive?view=mine&page=1&pageSize=1",
        );

        if (!cancelled) {
          setAiSourceMonths(response.availableMonths);
        }
      } catch {
        if (!cancelled) {
          setAiSourceMonths([]);
        }
      } finally {
        if (!cancelled) {
          setAiSourceMonthsLoading(false);
        }
      }
    }

    void loadAiSourceMonths();

    return () => {
      cancelled = true;
    };
  }, [detail?.id]);

  useEffect(() => {
    if (!detail || !listData?.items?.length) {
      setPreviousGoal(null);
      return;
    }

    const candidate = listData.items.find((item) => item.id !== detail.id);
    if (!candidate) {
      setPreviousGoal(null);
      return;
    }
    const candidateId = candidate.id;

    let cancelled = false;

    async function loadPreviousGoal() {
      try {
        const response = await apiFetch<MonthlyGoalDetail>(
          `/work-management/monthly-goals/${candidateId}`,
        );
        if (!cancelled) {
          setPreviousGoal(response);
        }
      } catch {
        if (!cancelled) {
          setPreviousGoal(null);
        }
      }
    }

    void loadPreviousGoal();

    return () => {
      cancelled = true;
    };
  }, [detail, listData?.items]);

  const aiSourceMonthOptions = useMemo(() => {
    if (!detail) {
      return [];
    }

    const optionMap = new Map<
      string,
      { key: string; label: string; count: number; isTargetMonth: boolean }
    >();

    optionMap.set("auto", {
      key: "auto",
      label: `自动判断（优先 ${formatMonthLabel(detail.targetYear, detail.targetMonth)}，无记录则回退）`,
      count: 0,
      isTargetMonth: false,
    });

    aiSourceMonths.forEach((item) => {
      const key = formatMonthKey(item.year, item.month);
      optionMap.set(key, {
        key,
        label: `${formatMonthLabel(item.year, item.month)} · ${item.count} 份周报`,
        count: item.count,
        isTargetMonth:
          item.year === detail.targetYear && item.month === detail.targetMonth,
      });
    });

    const targetKey = formatMonthKey(detail.targetYear, detail.targetMonth);
    if (!optionMap.has(targetKey)) {
      optionMap.set(targetKey, {
        key: targetKey,
        label: `${formatMonthLabel(detail.targetYear, detail.targetMonth)} · 当前月目标`,
        count: 0,
        isTargetMonth: true,
      });
    }

    return [...optionMap.values()];
  }, [aiSourceMonths, detail]);

  const aiArchiveMonthKey =
    aiSummary
      ? formatMonthKey(aiSummary.sourcePeriod.year, aiSummary.sourcePeriod.month)
      : aiSourceMonthKey !== "auto"
        ? aiSourceMonthKey
        : detail
          ? formatMonthKey(detail.targetYear, detail.targetMonth)
          : "";

  const aiArchiveHref = buildAiArchiveHref(aiArchiveMonthKey);

  async function bootstrap(prefetchedId?: string) {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch<MonthlyGoalListResponse>(
        "/work-management/monthly-goals",
      );
      setListData(response);

      const targetId =
        prefetchedId ||
        response.pendingMonthlyGoal?.goalId ||
        response.items[0]?.id ||
        response.teamItems[0]?.id ||
        "";

      if (targetId) {
        await loadDetail(targetId);
      } else if (response.pendingMonthlyGoal?.needsAttention && !prefetchedId) {
        await createDraft();
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "月目标列表加载失败",
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshList() {
    const response = await apiFetch<MonthlyGoalListResponse>(
      "/work-management/monthly-goals",
    );
    setListData(response);
    return response;
  }

  function applyDetailState(response: MonthlyGoalDetail) {
    setSelectedId(response.id);
    setDetail(response);
    setSummary(parseMonthlySummaryState(response.summary));
    setGoalItems(response.items.map(toMonthlyGoalEditorItem));
    setAutosaveState("saved");
    hydratedRef.current = true;
    lastSavedSnapshotRef.current = buildSnapshotFromState(
      response,
      parseMonthlySummaryState(response.summary),
      response.items.map(toMonthlyGoalEditorItem),
    );
    setDirty(false);
  }

  async function loadDetail(id: string) {
    setDetailLoading(true);
    setError("");

    try {
      const response = await apiFetch<MonthlyGoalDetail>(
        `/work-management/monthly-goals/${id}`,
      );
      applyDetailState(response);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "月目标详情加载失败",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function createDraft() {
    setDetailLoading(true);
    setError("");

    try {
      const response = await apiFetch<MonthlyGoalDetail>(
        "/work-management/monthly-goals/draft",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      applyDetailState(response);
      await refreshList();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "月目标草稿创建失败",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function generateAiSummary() {
    if (!detail) {
      return;
    }

    setAiLoading(true);
    setAiError("");
    setCopyFeedback("");

    try {
      const [sourceYear, sourceMonth] =
        aiSourceMonthKey !== "auto" ? aiSourceMonthKey.split("-") : [];
      const response = await apiFetch<MonthlyGoalAiSummarySnapshot>(
        `/work-management/monthly-goals/${detail.id}/ai-summary`,
        {
          method: "POST",
          body: JSON.stringify(
            sourceYear && sourceMonth
              ? {
                  sourceYear: Number(sourceYear),
                  sourceMonth: Number(sourceMonth),
                }
              : {},
          ),
        },
      );
      setAiSummary(response);
      setDetail((current) =>
        current
          ? {
              ...current,
              aiSummaries: sortAiSummaries([
                response,
                ...current.aiSummaries.filter(
                  (item) => item.snapshotId !== response.snapshotId,
                ),
              ]),
            }
          : current,
      );
    } catch (requestError) {
      setAiError(
        requestError instanceof Error
          ? requestError.message
          : "月底汇总生成失败",
      );
    } finally {
      setAiLoading(false);
    }
  }

  async function copyAiSummary() {
    if (!aiSummary || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(formatAiSummaryForClipboard(aiSummary));
      setCopyFeedback("已复制到剪贴板");
      window.setTimeout(() => setCopyFeedback(""), 2400);
    } catch {
      setCopyFeedback("复制失败，请手动复制");
      window.setTimeout(() => setCopyFeedback(""), 2400);
    }
  }

  function fillSummaryFromAi() {
    if (!aiSummary) {
      return;
    }

    setSummary({
      priorities: aiSummary.sections.highlights,
      deliverables: [
        aiSummary.sections.patterns,
        aiSummary.sections.nextMonthSuggestions,
      ]
        .filter(Boolean)
        .join("\n\n"),
      risks: [
        aiSummary.sections.risks,
        aiSummary.sections.carryovers,
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
  }

  function viewAiSummarySnapshot(snapshot: MonthlyGoalAiSummarySnapshot) {
    setAiSummary(snapshot);
    setAiSourceMonthKey(getAiSummarySnapshotMonthKey(snapshot));
    setAiError("");
    setCopyFeedback("");
  }

  function buildPayload() {
    const normalizedSummary = [
      summary.priorities.trim() ? `[本月工作重点]\n${summary.priorities.trim()}` : "",
      summary.deliverables.trim() ? `[核心交付方向]\n${summary.deliverables.trim()}` : "",
      summary.risks.trim() ? `[风险与注意事项]\n${summary.risks.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      summary: normalizedSummary,
      items: goalItems.map((item, index) => {
        const normalized = fromMonthlyGoalEditorItem(item, index);
        return {
          id: normalized.id ?? "",
          title: normalized.title,
          metric: normalized.metric ?? "",
          dueAt: normalized.dueAt ?? "",
          progressNote: normalized.progressNote ?? "",
          riskNote: normalized.riskNote ?? "",
          sortOrder: index,
        };
      }),
    };
  }

  function buildSnapshot() {
    if (!detail) {
      return "";
    }

    return JSON.stringify(buildPayload());
  }

  function buildSnapshotFromState(
    _currentDetail: MonthlyGoalDetail,
    currentSummary: MonthlySummaryEditorState,
    currentGoalItems: MonthlyGoalEditorItem[],
  ) {
    const normalizedSummary = [
      currentSummary.priorities.trim()
        ? `[本月工作重点]\n${currentSummary.priorities.trim()}`
        : "",
      currentSummary.deliverables.trim()
        ? `[核心交付方向]\n${currentSummary.deliverables.trim()}`
        : "",
      currentSummary.risks.trim()
        ? `[风险与注意事项]\n${currentSummary.risks.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    return JSON.stringify({
      summary: normalizedSummary,
      items: currentGoalItems.map((item, index) => {
        const normalized = fromMonthlyGoalEditorItem(item, index);
        return {
          id: normalized.id ?? "",
          title: normalized.title,
          metric: normalized.metric ?? "",
          dueAt: normalized.dueAt ?? "",
          progressNote: normalized.progressNote ?? "",
          riskNote: normalized.riskNote ?? "",
          sortOrder: index,
        };
      }),
    });
  }

  async function saveGoal(mode: "save" | "submit", silent = false) {
    if (!detail) {
      return;
    }

    const requestSnapshot = buildSnapshot();
    if (mode === "save" && requestSnapshot === lastSavedSnapshotRef.current) {
      setAutosaveState("saved");
      return;
    }

    setSaving(true);
    setError("");
    setAutosaveState(mode === "save" ? "saving" : autosaveState);

    try {
      const response = await apiFetch<MonthlyGoalDetail>(
        mode === "submit"
          ? `/work-management/monthly-goals/${detail.id}/submit`
          : `/work-management/monthly-goals/${detail.id}`,
        {
          method: mode === "submit" ? "POST" : "PATCH",
          body: JSON.stringify(buildPayload()),
        },
      );

      const latestSnapshot = buildSnapshot();
      lastSavedSnapshotRef.current = requestSnapshot;

      if (mode === "save" && latestSnapshot !== requestSnapshot) {
        setDetail((current) =>
          current
            ? {
                ...current,
                status: response.status,
                updatedAt: response.updatedAt,
                submittedAt: response.submittedAt,
              }
            : current,
        );
      } else {
        applyDetailState(response);
        lastSavedSnapshotRef.current = buildSnapshotFromState(
          response,
          parseMonthlySummaryState(response.summary),
          response.items.map(toMonthlyGoalEditorItem),
        );
      }

      await refreshList();
      if (mode === "save") {
        setAutosaveState("saved");
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "月目标保存失败",
      );
      if (mode === "save") {
        setAutosaveState("error");
      }
    } finally {
      setSaving(false);
      if (!silent && mode === "submit") {
        setAutosaveState("saved");
      }
    }
  }

  function openGoalDrawer(index?: number) {
    if (index === undefined) {
      setGoalEditingIndex(null);
      setGoalDraft(createEmptyGoalItem(goalItems.length));
    } else {
      setGoalEditingIndex(index);
      setGoalDraft({ ...goalItems[index] });
    }
    setGoalDrawerOpen(true);
  }

  function persistGoalDraft(mode: "save" | "save-and-new") {
    if (!goalDraft.title.trim()) {
      return;
    }

    setGoalItems((current) => {
      if (goalEditingIndex === null) {
        return [
          ...current,
          {
            ...goalDraft,
            sortOrder: current.length,
          },
        ];
      }

      return current.map((item, index) =>
        index === goalEditingIndex ? { ...goalDraft, sortOrder: index } : item,
      );
    });

    if (mode === "save-and-new") {
      setGoalEditingIndex(null);
      setGoalDraft(createEmptyGoalItem(goalItems.length + 1));
      return;
    }

    setGoalDrawerOpen(false);
    setGoalEditingIndex(null);
  }

  const carryoverPool = useMemo(() => {
    if (!previousGoal) {
      return [];
    }

    return previousGoal.items
      .map(toMonthlyGoalEditorItem)
      .filter(
        (item) => item.progress !== "100" || item.itemStatus !== "COMPLETED",
      );
  }, [previousGoal]);

  const reminders = useMemo(() => {
    if (!detail) {
      return [];
    }

    const dueSoonCount = goalItems.filter((item) => {
      if (!item.dueAt) {
        return false;
      }

      const dueAt = new Date(item.dueAt).getTime();
      const now = Date.now();
      return dueAt >= now && dueAt - now <= 1000 * 60 * 60 * 24 * 3;
    }).length;

    const riskCount = goalItems.filter((item) => item.riskLevel !== "LOW").length;
    const items = [];

    if (detail.status !== "SUBMITTED") {
      items.push({
        id: "submit",
        title: "每月 28 日前提交目标",
        meta: `${detail.label} 仍处于${labelForMonthlyGoalStatus(detail.status)}状态`,
        tone: "warning" as const,
      });
    }

    if (dueSoonCount) {
      items.push({
        id: "due-soon",
        title: `有 ${dueSoonCount} 个目标即将到期`,
        meta: "未来 3 天内截止的目标会在这里提醒",
        tone: "danger" as const,
      });
    }

    if (riskCount) {
      items.push({
        id: "risk-items",
        title: `${riskCount} 个目标存在风险`,
        meta: "建议尽快补充风险说明或调整协作安排",
        tone: "warning" as const,
      });
    }

    return items;
  }, [detail, goalItems]);

  const historyItems = (listData?.items ?? []).map((item) => ({
    id: item.id,
    title: item.label,
    meta: `目标项 ${item.itemCount} · 最近提交 ${item.submittedAt ? formatWorkDay(item.submittedAt) : "未提交"}`,
    statusLabel: labelForMonthlyGoalStatus(item.status),
    statusTone: statusTone(item.status),
  }));

  const progressSummary = useMemo(() => {
    const total = goalItems.length;
    const completed = goalItems.filter((item) => item.progress === "100").length;
    const risks = goalItems.filter((item) => item.riskLevel !== "LOW").length;
    const delayed = goalItems.filter((item) => item.itemStatus === "DELAYED").length;
    return { total, completed, risks, delayed };
  }, [goalItems]);

  return (
    <div className="workspace-stack">
      <WorkManagementPageHeader
        title="本月目标"
        description="把月目标从一段大文本升级成可跟踪、可复盘、可协同的结构化目标系统。"
        actions={
          <button className="button inline" onClick={() => void createDraft()} type="button">
            新增本月目标
          </button>
        }
        meta={[
          { label: "提醒", value: "每月 28 日填写下一月目标" },
          { label: "结构", value: "目标 / 交付 / 进度 / 风险" },
        ]}
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      {listData?.pendingMonthlyGoal?.needsAttention ? (
        <section className="wm-alert-card">
          <div className="summary-row">
            <strong>待处理月目标：{listData.pendingMonthlyGoal.label}</strong>
            <StatusBadge tone={statusTone(listData.pendingMonthlyGoal.status)}>
              {labelForMonthlyGoalStatus(listData.pendingMonthlyGoal.status)}
            </StatusBadge>
          </div>
          <div className="small muted">
            当前目标项 {listData.pendingMonthlyGoal.itemCount} 条。
          </div>
        </section>
      ) : null}

      <section className="split-workspace">
        <div className="workspace-main">
          <SectionCard
            title={detail?.label ?? "本月目标"}
            description="建议把目标拆成可交付、可追踪的条目，而不是写成一整段概述。"
            actions={
              detail ? (
                <div className="wm-header-actions">
                  <StatusBadge tone={statusTone(detail.status)}>
                    {labelForMonthlyGoalStatus(detail.status)}
                  </StatusBadge>
                  <AutoSaveStatus status={autosaveState} updatedAt={detail.updatedAt} />
                  {!detail.canEdit ? (
                    <span className="small muted">当前查看：{detail.owner.displayName} 的已提交目标</span>
                  ) : (
                    <>
                      <button
                        className="button secondary inline"
                        disabled={saving}
                        onClick={() => void saveGoal("save")}
                        type="button"
                      >
                        保存草稿
                      </button>
                      <button
                        className="button inline"
                        disabled={saving}
                        onClick={() => void saveGoal("submit")}
                        type="button"
                      >
                        {detail.status === "SUBMITTED" ? "重新提交" : "提交目标"}
                      </button>
                    </>
                  )}
                </div>
              ) : null
            }
          >
            {loading || detailLoading ? (
              <div className="small muted">正在加载月目标内容...</div>
            ) : detail ? (
              <div className="stack">
                <SectionCard
                  className="wm-section-muted"
                  title="本月概述"
                  description="先明确重点和交付方向，再拆分具体目标项，月底回看会更清楚。"
                >
                  <div className="wm-form-grid">
                    <div className="field full">
                      <label htmlFor="monthly-priorities">本月工作重点</label>
                      <textarea
                        disabled={!detail.canEdit}
                        id="monthly-priorities"
                        onChange={(event) =>
                          setSummary((current) => ({
                            ...current,
                            priorities: event.target.value,
                          }))
                        }
                        placeholder="请概括本月最重要的推进方向与优先级。"
                        value={summary.priorities}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="monthly-deliverables">核心交付方向</label>
                      <textarea
                        disabled={!detail.canEdit}
                        id="monthly-deliverables"
                        onChange={(event) =>
                          setSummary((current) => ({
                            ...current,
                            deliverables: event.target.value,
                          }))
                        }
                        placeholder="请写明本月最关键的交付结果，例如班表稳定运行、活动落地、内部培训上线等。"
                        value={summary.deliverables}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="monthly-risks">风险与注意事项</label>
                      <textarea
                        disabled={!detail.canEdit}
                        id="monthly-risks"
                        onChange={(event) =>
                          setSummary((current) => ({
                            ...current,
                            risks: event.target.value,
                          }))
                        }
                        placeholder="填写本月存在的潜在风险、资源问题或需要提前协调的事项。"
                        value={summary.risks}
                      />
                    </div>
                  </div>
                </SectionCard>

                <div id="monthly-ai-summary" style={{ scrollMarginTop: "96px" }}>
                  <SectionCard
                    className="wm-section-muted"
                    title="月底汇总"
                    description="会优先纳入当月已提交且未退回的周报；如果当前月份暂无记录，则自动回退到上一个有周报的月份。"
                    actions={
                      <div className="action-row">
                        <button
                          className="button secondary inline"
                          disabled={aiLoading}
                          onClick={() => void generateAiSummary()}
                          type="button"
                        >
                          {aiSummary ? (aiLoading ? "重新生成中..." : "重新生成") : aiLoading ? "生成中..." : "生成月底汇总"}
                        </button>
                        {aiSummary ? (
                          <>
                            <button className="button ghost inline" onClick={() => void copyAiSummary()} type="button">
                              复制全文
                            </button>
                            {detail.canEdit ? (
                              <button className="button ghost inline" onClick={fillSummaryFromAi} type="button">
                                填入本月概述
                              </button>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    }
                  >
                    <div className="stack">
                      {aiError ? <div className="danger-text small">{aiError}</div> : null}
                      {copyFeedback ? <div className="small muted">{copyFeedback}</div> : null}

                    <div className="wm-form-grid">
                      <div className="field">
                        <label htmlFor="monthly-ai-source-month">回顾周报月份</label>
                        <select
                          disabled={aiLoading || aiSourceMonthsLoading}
                          id="monthly-ai-source-month"
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            setAiSourceMonthKey(nextValue);
                            setAiSummary(
                              detail && nextValue !== "auto"
                                ? findAiSummarySnapshotByMonthKey(
                                    detail.aiSummaries,
                                    nextValue,
                                  )
                                : null,
                            );
                            setAiError("");
                            setCopyFeedback("");
                          }}
                          value={aiSourceMonthKey}
                        >
                          {aiSourceMonthOptions.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.isTargetMonth ? `${option.label}（当前目标）` : option.label}
                            </option>
                          ))}
                        </select>
                        <div className="small muted">
                          {aiSourceMonthsLoading
                            ? "正在加载可回顾月份..."
                            : aiSourceMonthKey === "auto"
                              ? "默认先尝试当前月目标月份；若没有可用周报，会自动回退到上一个有记录的月份。"
                              : "已固定为指定月份重算，生成结果会严格使用这个月的周报上下文。"}
                        </div>
                      </div>
                      <div className="field">
                        <label>历史周报归档</label>
                        <div className="action-row">
                          <Link className="button ghost inline" href={aiArchiveHref}>
                            查看该月周报
                          </Link>
                        </div>
                        <div className="small muted">
                          先回看原始周报，再生成月底汇总会更容易判断成果、风险和延续事项。
                        </div>
                      </div>
                    </div>

                    {detail.aiSummaries.length ? (
                      <SectionCard
                        title="已保存的汇总快照"
                        description="每个来源月份会保存最近一次月底汇总，方便回看和重算。"
                      >
                        <div className="stack">
                          {detail.aiSummaries.map((item, index) => {
                            const snapshotMonthKey = formatMonthKey(
                              item.sourcePeriod.year,
                              item.sourcePeriod.month,
                            );
                            const isActive = aiSummary?.snapshotId === item.snapshotId;

                            return (
                              <div className="list-card stack" key={item.snapshotId}>
                                <div className="summary-row">
                                  <strong>{item.sourcePeriod.label}</strong>
                                  <StatusBadge tone={isActive ? "success" : "neutral"}>
                                    {isActive ? "当前查看" : index === 0 ? "最近生成" : "已保存"}
                                  </StatusBadge>
                                </div>
                                <div className="small muted">
                                  更新于 {formatWorkDay(item.updatedAt)} · 纳入周报 {item.source.submittedWeeklyReportCount} /
                                  周期总数 {item.source.weeklyReportCount}
                                </div>
                                <div className="action-row">
                                  <button
                                    className="button ghost inline"
                                    onClick={() => viewAiSummarySnapshot(item)}
                                    type="button"
                                  >
                                    {isActive ? "正在查看" : "查看快照"}
                                  </button>
                                  <Link
                                    className="button ghost inline"
                                    href={buildAiArchiveHref(snapshotMonthKey)}
                                  >
                                    查看该月周报
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </SectionCard>
                    ) : null}

                    {aiSummary ? (
                      <>
                        <div className="wm-mini-stats">
                          <div className="wm-mini-stat">
                              <span>来源月份</span>
                              <strong>{aiSummary.sourcePeriod.label}</strong>
                            </div>
                            <div className="wm-mini-stat">
                              <span>纳入周报</span>
                              <strong>{aiSummary.source.submittedWeeklyReportCount}</strong>
                            </div>
                            <div className="wm-mini-stat">
                              <span>周期周报总数</span>
                              <strong>{aiSummary.source.weeklyReportCount}</strong>
                            </div>
                            <div className="wm-mini-stat">
                              <span>目标项</span>
                              <strong>{aiSummary.source.goalItemCount}</strong>
                            </div>
                          </div>

                          <SectionCard
                            title="纳入汇总的周报"
                            description="点击可直接回到对应周报查看原始上下文。"
                          >
                            <div className="stack">
                              {aiSummary.weeklyReports.length ? (
                                aiSummary.weeklyReports.map((item) => (
                                  <Link className="list-card stack" href={item.href} key={item.id}>
                                    <div className="summary-row">
                                      <strong>{item.label}</strong>
                                      <StatusBadge tone={statusTone(item.status)}>
                                        {labelForWeeklyReportStatus(item.status)}
                                      </StatusBadge>
                                    </div>
                                    <div className="small muted">
                                      {item.submittedAt ? `提交于 ${formatWorkDay(item.submittedAt)}` : "已纳入总结"}
                                    </div>
                                  </Link>
                                ))
                              ) : (
                                <EmptyState
                                  title="当前没有纳入周报"
                                  description="如果该月份还没有可用周报，月底汇总会退化成结构化提示草稿。"
                                />
                              )}
                            </div>
                          </SectionCard>

                          {[
                            ["本月核心成果", aiSummary.sections.highlights],
                            ["推进节奏与模式", aiSummary.sections.patterns],
                            ["主要风险 / 阻塞", aiSummary.sections.risks],
                            ["未完成与延续事项", aiSummary.sections.carryovers],
                            ["下月建议重点", aiSummary.sections.nextMonthSuggestions],
                          ].map(([title, content]) => (
                            <div className="list-card stack" key={title}>
                              <div className="summary-row">
                                <strong>{title}</strong>
                                <StatusBadge tone="neutral">AI</StatusBadge>
                              </div>
                              <div className="small muted" style={{ whiteSpace: "pre-wrap" }}>
                                {content}
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <EmptyState
                          title={detail.aiSummaries.length ? "请选择一个历史汇总或重新生成" : "还没有月底汇总"}
                          description={
                            detail.aiSummaries.length
                              ? "可以先查看上方已保存结果，也可以切换月份后重新生成新的月底汇总。"
                              : "先从历史周报里提炼本月成果、风险和延续事项，再决定是否写入本月概述。"
                          }
                          action={
                            <button className="button inline" disabled={aiLoading} onClick={() => void generateAiSummary()} type="button">
                              {aiLoading ? "生成中..." : "立即生成"}
                            </button>
                          }
                        />
                      )}
                    </div>
                  </SectionCard>
                </div>

                <SectionCard
                  className="wm-section-muted"
                  title="目标条目"
                  description="每个目标项都可以独立维护交付、进度、风险和协作责任。"
                  actions={
                    detail.canEdit ? (
                      <div className="action-row">
                        <button className="button secondary inline" onClick={() => openGoalDrawer()} type="button">
                          新增目标项
                        </button>
                        {carryoverPool.length ? (
                          <button
                            className="button ghost inline"
                            onClick={() =>
                              setGoalItems((current) => [
                                ...current,
                                ...carryoverPool.map((item, index) => ({
                                  ...item,
                                  id: undefined,
                                  title: `${item.title}（延续）`,
                                  sortOrder: current.length + index,
                                })),
                              ])
                            }
                            type="button"
                          >
                            复制上月目标
                          </button>
                        ) : null}
                      </div>
                    ) : null
                  }
                >
                  <div className="stack">
                    {goalItems.length ? (
                      goalItems.map((item, index) => (
                        <GoalItemCard
                          canEdit={detail.canEdit}
                          item={item}
                          key={`${item.id ?? "draft"}-${index}`}
                          onCopy={() =>
                            setGoalItems((current) => [
                              ...current,
                              {
                                ...item,
                                id: undefined,
                                title: `${item.title}（复制）`,
                                sortOrder: current.length,
                              },
                            ])
                          }
                          onDelete={() =>
                            setGoalItems((current) =>
                              current.filter((_, itemIndex) => itemIndex !== index),
                            )
                          }
                          onDragOver={(event) => event.preventDefault()}
                          onDragStart={() => {
                            dragIndexRef.current = index;
                          }}
                          onDrop={() => {
                            if (dragIndexRef.current === null || dragIndexRef.current === index) {
                              return;
                            }

                            setGoalItems((current) =>
                              reorderItems(current, dragIndexRef.current as number, index).map(
                                (goalItem, itemIndex) => ({
                                  ...goalItem,
                                  sortOrder: itemIndex,
                                }),
                              ),
                            );
                            dragIndexRef.current = null;
                          }}
                          onEdit={() => openGoalDrawer(index)}
                        />
                      ))
                    ) : (
                      <EmptyState
                        title="还没有目标项"
                        description="建议按结果、截止时间和风险逐项拆分，不要只写成一整段概述。"
                      />
                    )}
                  </div>
                </SectionCard>

                <div id="monthly-carryovers">
                  <SectionCard
                    className="wm-section-muted"
                    title="上月未完成目标候选"
                    description="可将上月未完成目标延续、拆分或转为本月重点任务。"
                  >
                    <div className="stack">
                      {carryoverPool.length ? (
                        carryoverPool.map((item, index) => (
                          <div className="list-card stack" key={`${item.title}-${index}`}>
                            <div className="summary-row">
                              <strong>{item.title}</strong>
                              <StatusBadge tone="warning">待承接</StatusBadge>
                            </div>
                            <div className="small muted">
                              上月进度 {GOAL_PROGRESS_LABELS[item.progress]} · 风险 {RISK_LEVEL_LABELS[item.riskLevel]}
                            </div>
                            <div className="action-row">
                              <button
                                className="button secondary inline"
                                onClick={() =>
                                  setGoalItems((current) => [
                                    ...current,
                                    {
                                      ...item,
                                      id: undefined,
                                      title: `${item.title}（延续）`,
                                      sortOrder: current.length,
                                    },
                                  ])
                                }
                                type="button"
                              >
                                延续到本月
                              </button>
                              <button
                                className="button ghost inline"
                                onClick={() => openGoalDrawer()}
                                type="button"
                              >
                                拆分目标
                              </button>
                              <Link className="button ghost inline" href="/work-management/weekly-reports">
                                转成周报计划项
                              </Link>
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          title="暂时没有候选承接项"
                          description="若上月目标仍未完成，会在这里进入本月候选承接池。"
                        />
                      )}
                    </div>
                  </SectionCard>
                </div>

                <DiscussionPanel
                  commentsPath={
                    detail ? `/work-management/monthly-goals/${detail.id}/comments` : null
                  }
                  description="目标提交后，团队可以在这里沟通风险、协作节点与补充说明。"
                  title="目标讨论"
                />
              </div>
            ) : (
              <EmptyState
                title="还没有可编辑的月目标"
                description="点击“新增本月目标”后，系统会按当前时间自动创建本月或下一月目标草稿。"
                action={
                  <button className="button inline" onClick={() => void createDraft()} type="button">
                    立即创建
                  </button>
                }
              />
            )}
          </SectionCard>
        </div>

        <aside className="workspace-side sticky-side">
          <HistoryListCard
            description="最近 4 个月的目标记录会保留在这里，方便切换复盘。"
            emptyDescription="当前账号还没有月目标记录，创建后会按月份显示在这里。"
            emptyTitle="暂无历史月目标"
            items={historyItems.slice(0, 4)}
            onSelect={(id) => void loadDetail(id)}
            selectedId={selectedId}
            title="历史月目标"
          />

          <TeamSubmissionCard
            description="这里展示团队已提交的目标，便于横向查看与留言讨论。"
            emptyDescription="其他成员提交后，这里会显示最近可讨论的月目标。"
            emptyTitle="暂时没有团队目标"
            items={(listData?.teamItems ?? []).map((item) => ({
              ...item,
              href: `/work-management/monthly-goals?goalId=${item.id}`,
            }))}
            title="团队已提交目标"
          />

          <SectionCard
            title="本月完成度概览"
            description="用几个核心数字快速判断当前目标结构是否平衡。"
          >
            <div className="wm-mini-stats">
              <div className="wm-mini-stat">
                <span>目标总数</span>
                <strong>{progressSummary.total}</strong>
              </div>
              <div className="wm-mini-stat">
                <span>已完成</span>
                <strong>{progressSummary.completed}</strong>
              </div>
              <div className="wm-mini-stat">
                <span>风险项</span>
                <strong>{progressSummary.risks}</strong>
              </div>
              <div className="wm-mini-stat">
                <span>延期项</span>
                <strong>{progressSummary.delayed}</strong>
              </div>
            </div>
          </SectionCard>

          <ReminderListCard title="本月提醒" items={reminders} />
        </aside>
      </section>

      <ManagementDrawer
        actions={
          <>
            <button className="button secondary inline" onClick={() => setGoalDrawerOpen(false)} type="button">
              取消
            </button>
            <button
              className="button secondary inline"
              onClick={() => persistGoalDraft("save-and-new")}
              type="button"
            >
              保存并继续新增
            </button>
            <button className="button inline" onClick={() => persistGoalDraft("save")} type="button">
              保存
            </button>
          </>
        }
        eyebrow="Monthly Goal Item"
        onClose={() => setGoalDrawerOpen(false)}
        open={goalDrawerOpen}
        size="medium"
        subtitle="把目标拆分成结构化字段后，月底复盘和主管查看都会更顺畅。"
        title={goalEditingIndex === null ? "新增目标项" : "编辑目标项"}
      >
        <div className="stack">
          <div className="field">
            <label htmlFor="goal-title">目标名称</label>
            <input
              id="goal-title"
              onChange={(event) =>
                setGoalDraft((current) => ({ ...current, title: event.target.value }))
              }
              value={goalDraft.title}
            />
          </div>

          <div className="wm-form-grid">
            <div className="field">
              <label htmlFor="goal-deliverable">交付结果</label>
              <textarea
                id="goal-deliverable"
                onChange={(event) =>
                  setGoalDraft((current) => ({
                    ...current,
                    deliverable: event.target.value,
                  }))
                }
                value={goalDraft.deliverable}
              />
            </div>
            <div className="field">
              <label htmlFor="goal-metric">量化指标</label>
              <textarea
                id="goal-metric"
                onChange={(event) =>
                  setGoalDraft((current) => ({
                    ...current,
                    metricValue: event.target.value,
                  }))
                }
                value={goalDraft.metricValue}
              />
            </div>
            <div className="field">
              <label htmlFor="goal-dueAt">截止时间</label>
              <input
                id="goal-dueAt"
                onChange={(event) =>
                  setGoalDraft((current) => ({ ...current, dueAt: event.target.value }))
                }
                type="datetime-local"
                value={formatDateTimeInput(goalDraft.dueAt)}
              />
            </div>
            <div className="field">
              <label htmlFor="goal-progress">当前进度</label>
              <select
                id="goal-progress"
                onChange={(event) =>
                  setGoalDraft((current) => ({
                    ...current,
                    progress: event.target.value as GoalProgress,
                  }))
                }
                value={goalDraft.progress}
              >
                {GOAL_PROGRESS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="goal-status">当前状态</label>
              <select
                id="goal-status"
                onChange={(event) =>
                  setGoalDraft((current) => ({
                    ...current,
                    itemStatus: event.target.value as MonthlyGoalEditorItem["itemStatus"],
                  }))
                }
                value={goalDraft.itemStatus}
              >
                {GOAL_STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="goal-owner">责任人</label>
              <input
                id="goal-owner"
                onChange={(event) =>
                  setGoalDraft((current) => ({
                    ...current,
                    ownerName: event.target.value,
                  }))
                }
                placeholder="未填写时默认视为本人"
                value={goalDraft.ownerName}
              />
            </div>
            <div className="field">
              <label htmlFor="goal-riskLevel">风险等级</label>
              <select
                id="goal-riskLevel"
                onChange={(event) =>
                  setGoalDraft((current) => ({
                    ...current,
                    riskLevel: event.target.value as GoalRiskLevel,
                  }))
                }
                value={goalDraft.riskLevel}
              >
                {GOAL_RISK_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="goal-support">所需协助</label>
              <textarea
                id="goal-support"
                onChange={(event) =>
                  setGoalDraft((current) => ({
                    ...current,
                    supportNeeded: event.target.value,
                  }))
                }
                value={goalDraft.supportNeeded}
              />
            </div>
            <div className="field full">
              <label htmlFor="goal-progressDescription">进展说明</label>
              <textarea
                id="goal-progressDescription"
                onChange={(event) =>
                  setGoalDraft((current) => ({
                    ...current,
                    progressDescription: event.target.value,
                  }))
                }
                value={goalDraft.progressDescription}
              />
            </div>
            <div className="field full">
              <label htmlFor="goal-riskDescription">风险说明</label>
              <textarea
                id="goal-riskDescription"
                onChange={(event) =>
                  setGoalDraft((current) => ({
                    ...current,
                    riskDescription: event.target.value,
                  }))
                }
                value={goalDraft.riskDescription}
              />
            </div>
          </div>
        </div>
      </ManagementDrawer>
    </div>
  );
}
