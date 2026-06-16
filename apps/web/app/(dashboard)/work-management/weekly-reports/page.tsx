"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DiscussionPanel } from "../../../../components/discussions/DiscussionPanel";
import { ManagementDrawer } from "../../../../components/management/ManagementDrawer";
import {
  AutoSaveStatus,
  CarryoverItemRow,
  HistoryListCard,
  PlanItemCard,
  ReminderListCard,
  TeamSubmissionCard,
  WorkManagementPageHeader,
} from "../../../../components/work-management/WorkManagementUI";
import { FirstRunGuide } from "../../../../components/system/FirstRunGuide";
import { EmptyState, SectionCard, StatusBadge } from "../../../../components/system/primitives";
import { apiFetch, getCurrentUser, hasPermission } from "../../../../lib/api";
import {
  type DeriveWeeklyReportTasksResponse,
  type PendingWeeklyReportSummary,
  type RemindWeeklyReportsResponse,
  type WeeklyReportArchiveResponse,
  type WeeklyPlanEditorItem,
  type WeeklyPlanType,
  type WeeklyPublicDigest,
  type WeeklyReportDetail,
  type WeeklyReportPlanItem,
  type WeeklyReportReviewItem,
  type WeeklyReportSummary,
  type WeeklyReportTeamClosureResponse,
  type WeeklyReportTeamClosureRow,
  type WeeklySummaryEditorState,
  PLAN_STATUS_LABELS,
  PLAN_TYPE_LABELS,
  PRIORITY_LABELS,
  encodeAbandonedReason,
  formatWorkDate,
  formatWorkDay,
  fromWeeklyPlanEditorItem,
  labelForWeeklyReportStatus,
  parseWeeklySummaryState,
  statusTone,
  toWeeklyPlanEditorItem,
} from "../../../../lib/work-management";

type WeeklyReportListResponse = {
  pendingWeeklyReport: PendingWeeklyReportSummary;
  items: WeeklyReportSummary[];
  teamItems: WeeklyReportSummary[];
};

const PLAN_TYPE_OPTIONS = Object.entries(PLAN_TYPE_LABELS) as Array<
  [WeeklyPlanType, string]
>;
const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS) as Array<
  ["HIGH" | "MEDIUM" | "LOW", string]
>;
const PLAN_STATUS_OPTIONS = Object.entries(PLAN_STATUS_LABELS) as Array<
  ["NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "AT_RISK" | "DELAYED" | "CANCELLED", string]
>;

function createEmptyPlanItem(sortOrder: number): WeeklyPlanEditorItem {
  return {
    title: "",
    detail: "",
    planType: "OTHER",
    priority: "MEDIUM",
    itemStatus: "NOT_STARTED",
    relatedEntity: "",
    plannedAt: "",
    syncToCalendar: true,
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

function formatArchiveMonthLabel(value: string) {
  if (!value) {
    return "全部月份";
  }

  const [year, month] = value.split("-");
  return `${year} 年 ${month} 月`;
}

function normalizeArchiveMonthKey(value: string | null) {
  if (!value) {
    return "";
  }

  const [year, month] = value.split("-");
  if (!year || !month) {
    return "";
  }

  return `${year}-${month.padStart(2, "0")}`;
}

export default function WeeklyReportsPage() {
  const searchParams = useSearchParams();
  const currentUser = getCurrentUser();
  const canReviewTeamReports = hasPermission(
    currentUser,
    "action.work_management.review",
  );
  const targetReportId = searchParams.get("reportId") ?? undefined;
  const archiveMonthParam = normalizeArchiveMonthKey(searchParams.get("archiveMonth"));
  const explicitArchiveView = searchParams.get("archiveView");
  const archiveViewParam =
    explicitArchiveView === "team" || (!explicitArchiveView && canReviewTeamReports)
      ? "team"
      : "mine";
  const shouldOpenArchive =
    searchParams.get("archive") === "1" || Boolean(archiveMonthParam);

  const [listData, setListData] = useState<WeeklyReportListResponse | null>(null);
  const [detail, setDetail] = useState<WeeklyReportDetail | null>(null);
  const [summary, setSummary] = useState<WeeklySummaryEditorState>({
    achievements: "",
    progress: "",
    risks: "",
    assistance: "",
  });
  const [reviewItems, setReviewItems] = useState<WeeklyReportReviewItem[]>([]);
  const [planItems, setPlanItems] = useState<WeeklyPlanEditorItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [planDrawerOpen, setPlanDrawerOpen] = useState(false);
  const [planEditingIndex, setPlanEditingIndex] = useState<number | null>(null);
  const [planDraft, setPlanDraft] = useState<WeeklyPlanEditorItem>(createEmptyPlanItem(0));
  const [abandonDrawerOpen, setAbandonDrawerOpen] = useState(false);
  const [abandonTargetId, setAbandonTargetId] = useState<string | null>(null);
  const [abandonReason, setAbandonReason] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveData, setArchiveData] = useState<WeeklyReportArchiveResponse | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [archiveView, setArchiveView] = useState<"mine" | "team">("mine");
  const [archiveMonthKey, setArchiveMonthKey] = useState("");
  const [archiveStatus, setArchiveStatus] = useState<
    "" | "DRAFT" | "SUBMITTED" | "RETURNED" | "APPROVED"
  >("");
  const [archivePage, setArchivePage] = useState(1);
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<"approve" | "return">("approve");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [publicDigest, setPublicDigest] = useState<WeeklyPublicDigest | null>(null);
  const [publicDigestDraft, setPublicDigestDraft] = useState("");
  const [publicDigestLoading, setPublicDigestLoading] = useState(false);
  const [publicDigestSaving, setPublicDigestSaving] = useState(false);
  const [publicDigestError, setPublicDigestError] = useState("");
  const [publicDigestCopyFeedback, setPublicDigestCopyFeedback] = useState("");
  const [teamClosure, setTeamClosure] = useState<WeeklyReportTeamClosureResponse | null>(null);
  const [teamClosureLoading, setTeamClosureLoading] = useState(false);
  const [teamClosureError, setTeamClosureError] = useState("");
  const [teamActionMessage, setTeamActionMessage] = useState("");
  const [remindingWeeklyReports, setRemindingWeeklyReports] = useState(false);
  const [derivingTasks, setDerivingTasks] = useState(false);
  const dragIndexRef = useRef<number | null>(null);
  const lastSavedSnapshotRef = useRef("");
  const hydratedRef = useRef(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    void bootstrap(targetReportId);
  }, [targetReportId]);

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
      void saveReport("save", true);
    }, 1800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [detail?.canEdit, reviewItems, planItems, summary]);

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
    if (!archiveOpen) {
      return;
    }

    void loadArchive();
  }, [archiveMonthKey, archiveOpen, archivePage, archiveStatus, archiveView]);

  useEffect(() => {
    if (!shouldOpenArchive) {
      return;
    }

    setArchiveView(archiveViewParam);
    setArchiveStatus("");
    setArchiveMonthKey(archiveMonthParam);
    setArchivePage(1);
    setArchiveOpen(true);
  }, [archiveMonthParam, archiveViewParam, shouldOpenArchive]);

  useEffect(() => {
    if (!detail) {
      setPublicDigest(null);
      setPublicDigestDraft("");
      setPublicDigestError("");
      setPublicDigestCopyFeedback("");
      return;
    }

    let cancelled = false;
    const reportId = detail.id;

    async function loadPublicDigest() {
      setPublicDigestLoading(true);
      setPublicDigestError("");

      try {
        const response = await apiFetch<WeeklyPublicDigest>(
          `/work-management/weekly-reports/${reportId}/public-digest`,
        );

        if (cancelled) {
          return;
        }

        setPublicDigest(response);
        setPublicDigestDraft(
          response.publishedSummary?.trim()
            ? response.publishedSummary
            : response.finalSummary,
        );
      } catch (requestError) {
        if (!cancelled) {
          setPublicDigest(null);
          setPublicDigestDraft("");
          setPublicDigestError(
            requestError instanceof Error
              ? requestError.message
              : "公开版周报汇总加载失败",
          );
        }
      } finally {
        if (!cancelled) {
          setPublicDigestLoading(false);
        }
      }
    }

    void loadPublicDigest();

    return () => {
      cancelled = true;
    };
  }, [detail?.id, detail?.status, detail?.submittedAt, detail?.reviewedAt]);

  async function bootstrap(prefetchedId?: string) {
    setLoading(true);
    setError("");

    try {
      const [response] = await Promise.all([
        apiFetch<WeeklyReportListResponse>("/work-management/weekly-reports"),
        loadTeamClosure(),
      ]);
      setListData(response);

      const targetId =
        prefetchedId ||
        response.pendingWeeklyReport?.reportId ||
        response.items[0]?.id ||
        response.teamItems[0]?.id ||
        "";

      if (targetId) {
        await loadDetail(targetId);
      } else if (response.pendingWeeklyReport?.needsAttention && !prefetchedId) {
        await createDraft();
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "周报列表加载失败",
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshList() {
    const [response] = await Promise.all([
      apiFetch<WeeklyReportListResponse>("/work-management/weekly-reports"),
      loadTeamClosure(),
    ]);
    setListData(response);
    return response;
  }

  async function loadTeamClosure(weekStartDate?: string | null) {
    setTeamClosureLoading(true);
    setTeamClosureError("");

    try {
      const params = new URLSearchParams();
      if (weekStartDate) {
        params.set("weekStartDate", weekStartDate);
      }

      const response = await apiFetch<WeeklyReportTeamClosureResponse>(
        `/work-management/weekly-reports/team-closure${params.toString() ? `?${params.toString()}` : ""}`,
      );
      setTeamClosure(response);
      return response;
    } catch (requestError) {
      setTeamClosure(null);
      setTeamClosureError(
        requestError instanceof Error
          ? requestError.message
          : "团队周报闭环加载失败",
      );
      return null;
    } finally {
      setTeamClosureLoading(false);
    }
  }

  async function loadArchive() {
    setArchiveLoading(true);
    setArchiveError("");

    try {
      const params = new URLSearchParams();
      params.set("view", archiveView);
      params.set("page", String(archivePage));
      params.set("pageSize", "12");
      if (archiveView === "mine" && archiveStatus) {
        params.set("status", archiveStatus);
      }
      if (archiveMonthKey) {
        const [year, month] = archiveMonthKey.split("-");
        if (year && month) {
          params.set("year", year);
          params.set("month", month);
        }
      }

      const response = await apiFetch<WeeklyReportArchiveResponse>(
        `/work-management/weekly-reports/archive?${params.toString()}`,
      );
      setArchiveData(response);
    } catch (requestError) {
      setArchiveError(
        requestError instanceof Error
          ? requestError.message
          : "历史周报加载失败",
      );
    } finally {
      setArchiveLoading(false);
    }
  }

  function applyDetailState(response: WeeklyReportDetail) {
    setSelectedId(response.id);
    setDetail(response);
    setSummary(
      parseWeeklySummaryState(response.completedSummary, response.focusSummary),
    );
    setReviewItems(response.reviewItems);
    setPlanItems(response.planItems.map(toWeeklyPlanEditorItem));
    setAutosaveState("saved");
    hydratedRef.current = true;
    const nextSnapshot = buildSnapshotFromState(
      response,
      parseWeeklySummaryState(response.completedSummary, response.focusSummary),
      response.reviewItems,
      response.planItems.map(toWeeklyPlanEditorItem),
    );
    lastSavedSnapshotRef.current = nextSnapshot;
    setDirty(false);
  }

  async function loadDetail(id: string) {
    setDetailLoading(true);
    setError("");

    try {
      const response = await apiFetch<WeeklyReportDetail>(
        `/work-management/weekly-reports/${id}`,
      );
      applyDetailState(response);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "周报详情加载失败",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function createDraft() {
    setDetailLoading(true);
    setError("");

    try {
      const response = await apiFetch<WeeklyReportDetail>(
        "/work-management/weekly-reports/draft",
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
          : "周报草稿创建失败",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function buildPayload() {
    const completedSummary = summary.achievements.trim();
    const focusSummary = [
      summary.progress.trim()
        ? `[本周推进说明]\n${summary.progress.trim()}`
        : "",
      summary.risks.trim()
        ? `[本周问题 / 风险]\n${summary.risks.trim()}`
        : "",
      summary.assistance.trim()
        ? `[需要协助事项]\n${summary.assistance.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      completedSummary,
      focusSummary,
      reviewItems: reviewItems.map((item) => ({
        id: item.id,
        status: item.status,
        incompleteReason: item.incompleteReason ?? "",
      })),
      planItems: planItems.map((item, index) => {
        const normalized = fromWeeklyPlanEditorItem(item, index);
        return {
          id: normalized.id ?? "",
          sourceReviewItemId: normalized.sourceReviewItemId ?? "",
          title: normalized.title,
          description: normalized.description ?? "",
          plannedAt: normalized.plannedAt ?? "",
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
    _currentDetail: WeeklyReportDetail,
    currentSummary: WeeklySummaryEditorState,
    currentReviewItems: WeeklyReportReviewItem[],
    currentPlanItems: WeeklyPlanEditorItem[],
  ) {
    const completedSummary = currentSummary.achievements.trim();
    const focusSummary = [
      currentSummary.progress.trim()
        ? `[本周推进说明]\n${currentSummary.progress.trim()}`
        : "",
      currentSummary.risks.trim()
        ? `[本周问题 / 风险]\n${currentSummary.risks.trim()}`
        : "",
      currentSummary.assistance.trim()
        ? `[需要协助事项]\n${currentSummary.assistance.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    return JSON.stringify({
      completedSummary,
      focusSummary,
      reviewItems: currentReviewItems.map((item) => ({
        id: item.id,
        status: item.status,
        incompleteReason: item.incompleteReason ?? "",
      })),
      planItems: currentPlanItems.map((item, index) => {
        const normalized = fromWeeklyPlanEditorItem(item, index);
        return {
          id: normalized.id ?? "",
          sourceReviewItemId: normalized.sourceReviewItemId ?? "",
          title: normalized.title,
          description: normalized.description ?? "",
          plannedAt: normalized.plannedAt ?? "",
          sortOrder: index,
        };
      }),
    });
  }

  async function saveReport(mode: "save" | "submit", silent = false) {
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
      const response = await apiFetch<WeeklyReportDetail>(
        mode === "submit"
          ? `/work-management/weekly-reports/${detail.id}/submit`
          : `/work-management/weekly-reports/${detail.id}`,
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
          parseWeeklySummaryState(response.completedSummary, response.focusSummary),
          response.reviewItems,
          response.planItems.map(toWeeklyPlanEditorItem),
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
          : "周报保存失败",
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

  function openReviewDrawer(decision: "approve" | "return") {
    setReviewDecision(decision);
    setReviewComment(decision === "return" ? detail?.reviewComment ?? "" : "");
    setReviewDrawerOpen(true);
  }

  async function reviewReport() {
    if (!detail) {
      return;
    }

    if (reviewDecision === "return" && !reviewComment.trim()) {
      setError("退回修改时请填写说明");
      return;
    }

    setReviewing(true);
    setError("");

    try {
      const response = await apiFetch<WeeklyReportDetail>(
        `/work-management/weekly-reports/${detail.id}/review`,
        {
          method: "POST",
          body: JSON.stringify({
            decision: reviewDecision,
            comment: reviewComment,
          }),
        },
      );
      applyDetailState(response);
      await refreshList();
      setReviewDrawerOpen(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "主管审阅失败",
      );
    } finally {
      setReviewing(false);
    }
  }

  async function remindTeamReports(userIds?: string[]) {
    if (!canReviewTeamReports) {
      return;
    }

    setRemindingWeeklyReports(true);
    setTeamClosureError("");
    setTeamActionMessage("");

    try {
      const response = await apiFetch<RemindWeeklyReportsResponse>(
        "/work-management/weekly-reports/remind",
        {
          method: "POST",
          body: JSON.stringify({
            weekStartDate: teamClosure?.weekStartDate,
            userIds,
          }),
        },
      );

      setTeamActionMessage(
        response.remindedCount
          ? `已催交 ${response.remindedCount} 位成员`
          : "当前没有需要催交的成员",
      );
      await refreshList();
    } catch (requestError) {
      setTeamClosureError(
        requestError instanceof Error
          ? requestError.message
          : "团队周报催交失败",
      );
    } finally {
      setRemindingWeeklyReports(false);
    }
  }

  async function deriveTasksFromDetail() {
    if (!detail?.canReview || detail.canEdit) {
      return;
    }

    const planItemIds = planItems
      .filter((item) => item.id && item.plannedAt && !item.taskId)
      .map((item) => item.id as string);
    if (!planItemIds.length) {
      setTeamActionMessage("当前周报没有可派生为待办的计划项");
      return;
    }

    setDerivingTasks(true);
    setTeamClosureError("");
    setTeamActionMessage("");

    try {
      const response = await apiFetch<DeriveWeeklyReportTasksResponse>(
        `/work-management/weekly-reports/${detail.id}/derive-tasks`,
        {
          method: "POST",
          body: JSON.stringify({ planItemIds }),
        },
      );

      if (response.report) {
        applyDetailState(response.report);
      } else {
        await loadDetail(detail.id);
      }
      setTeamActionMessage(
        response.createdCount
          ? `已派生 ${response.createdCount} 个待办`
          : "当前周报没有新的待办需要派生",
      );
      await refreshList();
    } catch (requestError) {
      setTeamClosureError(
        requestError instanceof Error
          ? requestError.message
          : "周报计划派生待办失败",
      );
    } finally {
      setDerivingTasks(false);
    }
  }

  function publicDigestBaseText(currentDigest: WeeklyPublicDigest | null) {
    return (
      currentDigest?.publishedSummary?.trim() ||
      currentDigest?.finalSummary ||
      ""
    ).trim();
  }

  async function regeneratePublicDigest() {
    if (!detail) {
      return;
    }

    const hasLocalEdits =
      publicDigestDraft.trim() !== publicDigestBaseText(publicDigest);

    setPublicDigestSaving(true);
    setPublicDigestError("");
    setPublicDigestCopyFeedback("");

    try {
      const response = await apiFetch<WeeklyPublicDigest>(
        `/work-management/weekly-reports/${detail.id}/public-digest/regenerate`,
        {
          method: "POST",
        },
      );

      setPublicDigest(response);
      if (!hasLocalEdits) {
        setPublicDigestDraft(
          response.publishedSummary?.trim()
            ? response.publishedSummary
            : response.finalSummary,
        );
      }
    } catch (requestError) {
      setPublicDigestError(
        requestError instanceof Error
          ? requestError.message
          : "公开版周报汇总生成失败",
      );
    } finally {
      setPublicDigestSaving(false);
    }
  }

  async function savePublicDigest() {
    if (!detail) {
      return;
    }

    setPublicDigestSaving(true);
    setPublicDigestError("");

    try {
      const response = await apiFetch<WeeklyPublicDigest>(
        `/work-management/weekly-reports/${detail.id}/public-digest`,
        {
          method: "PATCH",
          body: JSON.stringify({
            summary: publicDigestDraft,
          }),
        },
      );

      setPublicDigest(response);
      setPublicDigestDraft(
        response.publishedSummary?.trim()
          ? response.publishedSummary
          : response.finalSummary,
      );
    } catch (requestError) {
      setPublicDigestError(
        requestError instanceof Error
          ? requestError.message
          : "公开版周报汇总保存失败",
      );
    } finally {
      setPublicDigestSaving(false);
    }
  }

  async function copyPublicDigest() {
    const text = publicDigestDraft.trim() || publicDigest?.finalSummary || "";
    if (!text || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setPublicDigestCopyFeedback("已复制到剪贴板");
      window.setTimeout(() => setPublicDigestCopyFeedback(""), 2400);
    } catch {
      setPublicDigestCopyFeedback("复制失败，请手动复制");
      window.setTimeout(() => setPublicDigestCopyFeedback(""), 2400);
    }
  }

  function markReviewCompleted(reviewId: string) {
    setReviewItems((current) =>
      current.map((item) =>
        item.id === reviewId
          ? { ...item, status: "COMPLETED", incompleteReason: "" }
          : item,
      ),
    );
    setPlanItems((current) =>
      current.filter((item) => item.sourceReviewItemId !== reviewId),
    );
  }

  function carryReviewForward(reviewId: string) {
    const reviewItem = reviewItems.find((item) => item.id === reviewId);
    if (!reviewItem) {
      return;
    }

    setReviewItems((current) =>
      current.map((item) =>
        item.id === reviewId
          ? { ...item, status: "INCOMPLETE", incompleteReason: item.incompleteReason ?? "" }
          : item,
      ),
    );

    setPlanItems((current) => {
      if (current.some((item) => item.sourceReviewItemId === reviewId)) {
        return current;
      }

      return [
        ...current,
        {
          ...createEmptyPlanItem(current.length),
          sourceReviewItemId: reviewItem.id,
          title: reviewItem.title,
          detail: reviewItem.description ?? "",
          plannedAt: reviewItem.plannedAt ?? "",
          syncToCalendar: Boolean(reviewItem.plannedAt),
        },
      ];
    });
  }

  function confirmAbandonReview() {
    if (!abandonTargetId || !abandonReason.trim()) {
      return;
    }

    setReviewItems((current) =>
      current.map((item) =>
        item.id === abandonTargetId
          ? {
              ...item,
              status: "INCOMPLETE",
              incompleteReason: encodeAbandonedReason(abandonReason),
            }
          : item,
      ),
    );
    setPlanItems((current) =>
      current.filter((item) => item.sourceReviewItemId !== abandonTargetId),
    );
    setAbandonDrawerOpen(false);
    setAbandonTargetId(null);
    setAbandonReason("");
  }

  function openPlanDrawer(index?: number) {
    if (index === undefined) {
      setPlanEditingIndex(null);
      setPlanDraft(createEmptyPlanItem(planItems.length));
    } else {
      setPlanEditingIndex(index);
      setPlanDraft({ ...planItems[index] });
    }
    setPlanDrawerOpen(true);
  }

  function persistPlanDraft(mode: "save" | "save-and-new") {
    if (!planDraft.title.trim()) {
      return;
    }

    setPlanItems((current) => {
      if (planEditingIndex === null) {
        return [
          ...current,
          {
            ...planDraft,
            sortOrder: current.length,
          },
        ];
      }

      return current.map((item, index) =>
        index === planEditingIndex ? { ...planDraft, sortOrder: index } : item,
      );
    });

    if (mode === "save-and-new") {
      setPlanEditingIndex(null);
      setPlanDraft(createEmptyPlanItem(planItems.length + 1));
      return;
    }

    setPlanDrawerOpen(false);
    setPlanEditingIndex(null);
  }

  const reminders = useMemo(() => {
    if (!detail) {
      return [];
    }

    const dueSoonCount = planItems.filter((item) => {
      if (!item.plannedAt) {
        return false;
      }

      const dueAt = new Date(item.plannedAt).getTime();
      const now = Date.now();
      return dueAt >= now && dueAt - now <= 1000 * 60 * 60 * 24 * 2;
    }).length;

    const items = [];
    if (detail.status === "RETURNED") {
      items.push({
        id: "returned",
        title: "主管已退回本周周报",
        meta: "请根据退回说明修改后重新提交",
        tone: "danger" as const,
      });
    } else if (detail.status === "DRAFT") {
      items.push({
        id: "submit",
        title: "周五前提交周报",
        meta: `${detail.label} 仍处于${labelForWeeklyReportStatus(detail.status)}状态`,
        tone: "warning" as const,
      });
    }

    if (dueSoonCount) {
      items.push({
        id: "due-soon",
        title: `有 ${dueSoonCount} 项计划即将到期`,
        meta: "未来 2 天内截止的计划会持续提醒",
        tone: "danger" as const,
      });
    }

    if (reviewItems.some((item) => item.status !== "COMPLETED")) {
      items.push({
        id: "carryover",
        title: "上周遗留事项尚未处理完",
        meta: "请先确认完成、承接或放弃原因",
        tone: "warning" as const,
      });
    }

    return items;
  }, [detail, planItems, reviewItems]);

  const historyItems = (listData?.items ?? []).map((item) => ({
    id: item.id,
    title: item.label,
    meta: `待回顾 ${item.openReviewCount} · 本周计划 ${item.planItemCount}`,
    statusLabel: labelForWeeklyReportStatus(item.status),
    statusTone: statusTone(item.status),
  }));

  const relatedScheduleItems = planItems.filter(
    (item) => item.syncToCalendar && item.plannedAt,
  );
  const archiveMonthOptions =
    archiveData?.availableMonths.map((item) => ({
      value: `${item.year}-${String(item.month).padStart(2, "0")}`,
      label: `${item.year} 年 ${String(item.month).padStart(2, "0")} 月（${item.count}）`,
    })) ?? [];
  const publicDigestDirty =
    publicDigestDraft.trim() !== publicDigestBaseText(publicDigest);
  const teamClosureRows = teamClosure?.rows ?? [];
  const reminderRows = teamClosureRows
    .filter((item) => item.needsReminder)
    .sort((left, right) => {
      const rank = { MISSING: 0, RETURNED: 1, DRAFT: 2, SUBMITTED: 3, APPROVED: 4 } as const;
      return rank[left.status] - rank[right.status] || left.displayName.localeCompare(right.displayName);
    });
  const displayedTeamClosureRows = reminderRows.length
    ? reminderRows.slice(0, 6)
    : teamClosureRows.slice(0, 6);
  const derivablePlanItemCount =
    detail?.canReview && !detail.canEdit
      ? planItems.filter((item) => item.id && item.plannedAt && !item.taskId).length
      : 0;
  const teamClosureStats = teamClosure
    ? [
        { label: "总成员", value: teamClosure.summary.totalMembers },
        { label: "待催交", value: teamClosure.summary.needsReminderCount },
        { label: "已提交", value: teamClosure.summary.submittedCount },
        { label: "已通过", value: teamClosure.summary.approvedCount },
      ]
    : [];

  return (
    <div className="workspace-stack wm-weekly-page">
      <WorkManagementPageHeader
        title="周报"
        description="承接上周计划，整理本周重点，并把预计完成时间直接放进日程。"
        actions={
          <div className="wm-page-header-actions">
            <Link className="button secondary inline" href="/schedule">
              查看日程
            </Link>
            <button className="button inline" onClick={() => void createDraft()} type="button">
              新增周报
            </button>
          </div>
        }
        meta={[
          { label: "提醒", value: "每周五填写下周周报" },
          { label: "联动", value: "计划完成时间直接进入日程" },
        ]}
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      <FirstRunGuide
        className="wm-weekly-guide"
        actions={[
          {
            label: "新增周报",
            onClick: () => void createDraft(),
          },
          {
            label: "查看日程",
            href: "/schedule",
            variant: "secondary",
          },
        ]}
        description="周报会先承接上周遗留，再整理本周总结和下周计划，提交后团队就能围绕同一份计划推进。"
        guideKey="work-management-weekly-reports"
        steps={[
          {
            label: "先处理上周遗留",
            description: "逐项确认哪些已经完成，哪些要承接到本周，避免计划断层或重复填写。",
          },
          {
            label: "再写本周总结",
            description: "把成果、推进说明、风险和协助需求拆开填写，团队更容易快速读懂重点。",
          },
          {
            label: "最后同步下周计划",
            description: "有明确时间的计划可以直接进入日程，后面推进时就不需要再重复抄一次。",
          },
        ]}
        title="先回顾，再规划下一周"
      />

      {listData?.pendingWeeklyReport?.needsAttention ? (
        <section className="wm-alert-card">
          <div className="summary-row">
            <strong>待完成周报：{listData.pendingWeeklyReport.label}</strong>
            <StatusBadge tone={statusTone(listData.pendingWeeklyReport.status)}>
              {labelForWeeklyReportStatus(listData.pendingWeeklyReport.status)}
            </StatusBadge>
          </div>
          <div className="small muted">
            待回顾 {listData.pendingWeeklyReport.openReviewCount} 项，当前计划 {listData.pendingWeeklyReport.planItemCount} 项。
          </div>
        </section>
      ) : null}

      <section className="split-workspace">
        <div className="workspace-main">
          <SectionCard
            title={detail?.label ?? "本周周报"}
            description="先处理上周遗留，再按结构填写本周总结和计划，减少重复补写。"
            actions={
              detail ? (
                <div className="wm-header-actions">
                  <StatusBadge tone={statusTone(detail.status)}>
                    {labelForWeeklyReportStatus(detail.status)}
                  </StatusBadge>
                  {detail.canEdit ? (
                    <AutoSaveStatus status={autosaveState} updatedAt={detail.updatedAt} />
                  ) : null}
                  {!detail.canEdit ? (
                    <>
                      <span className="small muted">
                        当前查看：{detail.owner.displayName} 的周报
                      </span>
                      {detail.canReview && detail.status === "SUBMITTED" ? (
                        <>
                          <button
                            className="button secondary inline"
                            disabled={reviewing}
                            onClick={() => openReviewDrawer("return")}
                            type="button"
                          >
                            退回修改
                          </button>
                          <button
                            className="button inline"
                            disabled={reviewing}
                            onClick={() => openReviewDrawer("approve")}
                            type="button"
                          >
                            主管通过
                          </button>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <button
                        className="button secondary inline"
                        disabled={saving}
                        onClick={() => void saveReport("save")}
                        type="button"
                      >
                        保存草稿
                      </button>
                      <button
                        className="button inline"
                        disabled={saving}
                        onClick={() => void saveReport("submit")}
                        type="button"
                      >
                        {detail.status === "APPROVED"
                          ? "更新后重新提交"
                          : detail.status === "RETURNED"
                            ? "重新提交周报"
                            : detail.status === "SUBMITTED"
                              ? "重新提交"
                              : "提交周报"}
                      </button>
                    </>
                  )}
                </div>
              ) : null
            }
          >
            {loading || detailLoading ? (
              <div className="small muted">正在加载周报内容...</div>
            ) : detail ? (
              <div className="stack">
                {detail.status === "SUBMITTED" ? (
                  <div className="list-card stack">
                    <div className="summary-row">
                      <strong>本周周报已提交</strong>
                      <StatusBadge tone="success">等待主管审阅</StatusBadge>
                    </div>
                    <div className="small muted">
                      {detail.submittedAt
                        ? `提交于 ${formatWorkDay(detail.submittedAt)}`
                        : "已进入主管审阅队列"}
                    </div>
                  </div>
                ) : null}

                {detail.status === "RETURNED" ? (
                  <div className="list-card stack">
                    <div className="summary-row">
                      <strong>本周周报已被退回</strong>
                      <StatusBadge tone="danger">请修改后重新提交</StatusBadge>
                    </div>
                    <div className="small muted">
                      {detail.reviewer?.displayName ?? "主管"}
                      {detail.reviewedAt
                        ? ` · ${formatWorkDay(detail.reviewedAt)}`
                        : ""}
                    </div>
                    {detail.reviewComment ? (
                      <div className="small">{detail.reviewComment}</div>
                    ) : null}
                  </div>
                ) : null}

                {detail.status === "APPROVED" ? (
                  <div className="list-card stack">
                    <div className="summary-row">
                      <strong>本周周报已通过主管审阅</strong>
                      <StatusBadge tone="success">已通过</StatusBadge>
                    </div>
                    <div className="small muted">
                      {detail.reviewer?.displayName ?? "主管"}
                      {detail.reviewedAt
                        ? ` · ${formatWorkDay(detail.reviewedAt)}`
                        : ""}
                    </div>
                    {detail.reviewComment ? (
                      <div className="small">{detail.reviewComment}</div>
                    ) : null}
                  </div>
                ) : null}

                <div id="weekly-carryovers">
                  <SectionCard
                    className="wm-section-muted"
                    title="上周遗留事项"
                    description="逐项确认是否完成，未完成事项可以自动承接到本周计划。"
                  >
                    <div className="stack">
                      {reviewItems.length ? (
                        reviewItems.map((item) => (
                          <div className="stack" key={item.id}>
                            <CarryoverItemRow
                              canEdit={detail.canEdit}
                              isCarriedForward={planItems.some(
                                (planItem) => planItem.sourceReviewItemId === item.id,
                              )}
                              item={item}
                              onAbandon={() => {
                                setAbandonTargetId(item.id);
                                setAbandonReason("");
                                setAbandonDrawerOpen(true);
                              }}
                              onCarryForward={() => carryReviewForward(item.id)}
                              onComplete={() => markReviewCompleted(item.id)}
                            />
                            {detail.canEdit && item.status === "INCOMPLETE" && !item.incompleteReason?.startsWith("已放弃：") ? (
                              <div className="field">
                                <label>未完成原因</label>
                                <input
                                  onChange={(event) =>
                                    setReviewItems((current) =>
                                      current.map((reviewItem) =>
                                        reviewItem.id === item.id
                                          ? {
                                              ...reviewItem,
                                              incompleteReason: event.target.value,
                                            }
                                          : reviewItem,
                                      ),
                                    )
                                  }
                                  placeholder="例如：等待主管确认 / 依赖资料未齐"
                                  value={item.incompleteReason ?? ""}
                                />
                              </div>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          title="没有需要承接的上周计划"
                          description="当前这份周报没有上周计划回顾项，可以直接填写本周计划。"
                        />
                      )}
                    </div>
                  </SectionCard>
                </div>

                <SectionCard
                  className="wm-section-muted"
                  title="本周总结"
                  description="拆成清晰字段后，回顾、风险和协助请求会更容易被团队理解。"
                >
                  <div className="wm-form-grid">
                    <div className="field full">
                      <label htmlFor="weekly-achievements">本周关键成果</label>
                      <textarea
                        disabled={!detail.canEdit}
                        id="weekly-achievements"
                        onChange={(event) =>
                          setSummary((current) => ({
                            ...current,
                            achievements: event.target.value,
                          }))
                        }
                        placeholder="请简要填写本周已经推进完成的关键结果，例如班表调整、活动执行、内部培训安排等。"
                        value={summary.achievements}
                      />
                    </div>
                    <div className="field full">
                      <label htmlFor="weekly-progress">本周推进说明</label>
                      <textarea
                        disabled={!detail.canEdit}
                        id="weekly-progress"
                        onChange={(event) =>
                          setSummary((current) => ({
                            ...current,
                            progress: event.target.value,
                          }))
                        }
                        placeholder="补充本周主要推进过程、阶段性成果和背景信息。"
                        value={summary.progress}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="weekly-risks">本周问题 / 风险</label>
                      <textarea
                        disabled={!detail.canEdit}
                        id="weekly-risks"
                        onChange={(event) =>
                          setSummary((current) => ({
                            ...current,
                            risks: event.target.value,
                          }))
                        }
                        placeholder="填写当前存在的阻碍、风险点或需要提前说明的问题。"
                        value={summary.risks}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="weekly-assistance">需要协助事项</label>
                      <textarea
                        disabled={!detail.canEdit}
                        id="weekly-assistance"
                        onChange={(event) =>
                          setSummary((current) => ({
                            ...current,
                            assistance: event.target.value,
                          }))
                        }
                        placeholder="如需要他人支持，请写明需要谁协助、协助内容和紧急程度。"
                        value={summary.assistance}
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  className="wm-section-muted"
                  title="部门公开版周报汇总"
                  description="会按当前周次与当前周报所属部门自动汇整。主编账号可润色公开版文案，确认没问题后直接复制给团队。"
                  actions={
                    <div className="action-row wm-digest-actions">
                      {publicDigest?.canEdit ? (
                        <>
                          <button
                            className="button secondary inline"
                            disabled={publicDigestSaving || publicDigestLoading}
                            onClick={() => void regeneratePublicDigest()}
                            type="button"
                          >
                            {publicDigestLoading || publicDigestSaving ? "更新中..." : "更新自动稿"}
                          </button>
                          <button
                            className="button ghost inline"
                            disabled={!publicDigest?.generatedSummary}
                            onClick={() =>
                              setPublicDigestDraft(publicDigest?.generatedSummary ?? "")
                            }
                            type="button"
                          >
                            带入公开版
                          </button>
                          <button
                            className="button inline"
                            disabled={
                              publicDigestSaving || !publicDigest || !publicDigestDirty
                            }
                            onClick={() => void savePublicDigest()}
                            type="button"
                          >
                            保存公开版
                          </button>
                        </>
                      ) : null}
                      <button
                        className="button ghost inline"
                        disabled={!publicDigestDraft.trim() && !publicDigest?.finalSummary}
                        onClick={() => void copyPublicDigest()}
                        type="button"
                      >
                        复制文字
                      </button>
                    </div>
                  }
                >
                  {publicDigestLoading ? (
                    <div className="small muted">正在生成该部门的公开版周报...</div>
                  ) : publicDigest ? (
                    <div className="stack">
                      {publicDigestError ? (
                        <div className="danger-text small">{publicDigestError}</div>
                      ) : null}
                      {publicDigestCopyFeedback ? (
                        <div className="small muted">{publicDigestCopyFeedback}</div>
                      ) : null}

                      <div className="wm-form-grid">
                        <div className="field">
                          <label>汇总部门</label>
                          <div className="list-card stack">
                            <div className="summary-row">
                              <strong>{publicDigest.department.label}</strong>
                              <StatusBadge tone="neutral">按部门汇总</StatusBadge>
                            </div>
                            <div className="small muted">
                              已纳入 {publicDigest.source.includedReportCount} / {publicDigest.source.totalReportCount} 份周报，
                              其中 {publicDigest.source.approvedReportCount} 份已通过主管审阅。
                            </div>
                          </div>
                        </div>
                        <div className="field">
                          <label>公开版状态</label>
                          <div className="list-card stack">
                            <div className="summary-row">
                              <strong>
                                {publicDigest.publishedSummary?.trim()
                                  ? "已保存公开版"
                                  : "暂未单独保存"}
                              </strong>
                              <StatusBadge
                                tone={
                                  publicDigest.publishedSummary?.trim()
                                    ? "success"
                                    : "warning"
                                }
                              >
                                {publicDigest.publishedSummary?.trim()
                                  ? "可直接发布"
                                  : "默认使用自动稿"}
                              </StatusBadge>
                            </div>
                            <div className="small muted">
                              {publicDigest.publisher?.displayName
                                ? `${publicDigest.publisher.displayName} 最后编辑`
                                : "尚未有主编修订记录"}
                              {publicDigest.publishedAt
                                ? ` · ${formatWorkDay(publicDigest.publishedAt)}`
                                : ""}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="field full">
                        <label htmlFor="weekly-public-digest-generated">自动生成稿</label>
                        <textarea
                          disabled
                          id="weekly-public-digest-generated"
                          rows={10}
                          value={publicDigest.generatedSummary ?? ""}
                        />
                        <div className="small muted">
                          系统会根据 {publicDigest.department.label} 当前周次已提交的周报自动整理，更新自动稿不会直接覆盖主编已保存的公开版。
                        </div>
                      </div>

                      <div className="field full">
                        <label htmlFor="weekly-public-digest-published">公开版文案</label>
                        <textarea
                          disabled={!publicDigest.canEdit}
                          id="weekly-public-digest-published"
                          onChange={(event) =>
                            setPublicDigestDraft(event.target.value)
                          }
                          placeholder="这里会作为可直接复制给团队的公开版周报文案。"
                          rows={10}
                          value={publicDigestDraft}
                        />
                        <div className="small muted">
                          {publicDigest.canEdit
                            ? publicDigestDirty
                              ? "公开版文案有未保存修改。"
                              : "当前公开版已与已保存版本同步。"
                            : "当前账号可查看该部门公开版，但不能编辑。"}
                        </div>
                      </div>

                      <SectionCard
                        title="本次纳入的部门周报"
                        description="只会纳入当前部门、当前周次中已提交且未退回的周报。"
                      >
                        <div className="stack">
                          {publicDigest.sourceReports.length ? (
                            publicDigest.sourceReports.map((item) => (
                              <div className="list-card stack" key={item.id}>
                                <div className="summary-row">
                                  <strong>{item.owner.displayName}</strong>
                                  <StatusBadge tone={statusTone(item.status)}>
                                    {labelForWeeklyReportStatus(item.status)}
                                  </StatusBadge>
                                </div>
                                <div className="small muted">
                                  {item.label}
                                  {item.submittedAt
                                    ? ` · 提交于 ${formatWorkDay(item.submittedAt)}`
                                    : ""}
                                </div>
                                <div className="action-row">
                                  <Link className="button ghost inline" href={item.href}>
                                    查看原周报
                                  </Link>
                                </div>
                              </div>
                            ))
                          ) : (
                            <EmptyState
                              title="该部门本周还没有可纳入的周报"
                              description="待成员提交后，这里会自动出现来源清单与公开版草稿。"
                            />
                          )}
                        </div>
                      </SectionCard>
                    </div>
                  ) : (
                    <EmptyState
                      title="公开版周报暂未生成"
                      description="当前部门周报汇总尚未就绪，稍后会自动生成。"
                    />
                  )}
                </SectionCard>

                <SectionCard
                  className="wm-section-muted"
                  title="本周计划"
                  description="这里的计划完成时间会直接影响日程安排；支持弹窗编辑、复制和拖动排序。"
                  actions={
                    detail.canEdit ? (
                      <button className="button secondary inline" onClick={() => openPlanDrawer()} type="button">
                        新增计划项
                      </button>
                    ) : null
                  }
                >
                  <div className="stack">
                    {planItems.length ? (
                      planItems.map((item, index) => (
                        <PlanItemCard
                          canEdit={detail.canEdit}
                          item={item}
                          key={`${item.id ?? "draft"}-${index}`}
                          onCopy={() =>
                            setPlanItems((current) => [
                              ...current,
                              {
                                ...item,
                                id: undefined,
                                taskId: undefined,
                                sourceReviewItemId: undefined,
                                title: `${item.title}（复制）`,
                                sortOrder: current.length,
                              },
                            ])
                          }
                          onDelete={() =>
                            setPlanItems((current) =>
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

                            setPlanItems((current) =>
                              reorderItems(current, dragIndexRef.current as number, index).map(
                                (planItem, itemIndex) => ({
                                  ...planItem,
                                  sortOrder: itemIndex,
                                }),
                              ),
                            );
                            dragIndexRef.current = null;
                          }}
                          onEdit={() => openPlanDrawer(index)}
                        />
                      ))
                    ) : (
                      <EmptyState
                        title="还没有本周计划"
                        description="可以新增计划项，或先把上周未完成事项承接到本周。"
                      />
                    )}
                  </div>
                </SectionCard>

                <DiscussionPanel
                  commentsPath={
                    detail ? `/work-management/weekly-reports/${detail.id}/comments` : null
                  }
                  description="周报提交后，团队可以直接在这里补充背景、回复进度与交接信息。"
                  title="周报讨论"
                />
              </div>
            ) : (
              <EmptyState
                title="还没有可编辑的周报"
                description="点击“新增周报”后，系统会按当前时间自动创建本周或下周周报草稿。"
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
            description="最近 4 条周报会保留在这里，方便快速切换查看。"
            emptyDescription="当前账号还没有周报记录，创建后会按周次显示在这里。"
            emptyTitle="暂无历史周报"
            items={historyItems.slice(0, 4)}
            onSelect={(id) => void loadDetail(id)}
            selectedId={selectedId}
            title="历史周报"
          />

          <div className="action-row wm-weekly-side-actions">
            <button
              className="button ghost inline"
              onClick={() => {
                setArchiveView("mine");
                setArchiveStatus("");
                setArchiveMonthKey("");
                setArchivePage(1);
                setArchiveOpen(true);
              }}
              type="button"
            >
              查看全部历史
            </button>
          </div>

          <SectionCard
            title="团队周报闭环"
            description="按当前周次查看缺交、草稿和退回状态，主管可直接催交或从计划派生待办。"
            actions={
              canReviewTeamReports ? (
                <button
                  className="button inline"
                  disabled={
                    remindingWeeklyReports ||
                    teamClosureLoading ||
                    !teamClosure?.summary.needsReminderCount
                  }
                  onClick={() => void remindTeamReports()}
                  type="button"
                >
                  {remindingWeeklyReports ? "催交中..." : "一键催交"}
                </button>
              ) : null
            }
          >
            <div className="stack">
              {teamClosureLoading ? (
                <div className="small muted">正在加载团队周报状态...</div>
              ) : null}
              {teamClosureError ? (
                <div className="danger-text small">{teamClosureError}</div>
              ) : null}
              {teamActionMessage ? (
                <div className="small muted">{teamActionMessage}</div>
              ) : null}

              {teamClosure ? (
                <>
                  <div className="wm-mini-stats">
                    {teamClosureStats.map((item) => (
                      <div className="wm-mini-stat" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="small muted">
                    {teamClosure.label} · 缺交 {teamClosure.summary.missingCount}，草稿 {teamClosure.summary.draftCount}，退回 {teamClosure.summary.returnedCount}
                  </div>

                  {detail?.canReview && !detail.canEdit ? (
                    <button
                      className="button secondary inline"
                      disabled={derivingTasks || !derivablePlanItemCount}
                      onClick={() => void deriveTasksFromDetail()}
                      type="button"
                    >
                      {derivingTasks
                        ? "派生中..."
                        : `派生待办${derivablePlanItemCount ? `（${derivablePlanItemCount}）` : ""}`}
                    </button>
                  ) : null}

                  <div className="stack compact-gap">
                    {displayedTeamClosureRows.length ? (
                      displayedTeamClosureRows.map((row) => {
                        const rowContent = (
                          <>
                            <div className="summary-row">
                              <strong>{row.displayName}</strong>
                              <StatusBadge tone={statusTone(row.status)}>
                                {labelForWeeklyReportStatus(row.status)}
                              </StatusBadge>
                            </div>
                            <div className="small muted">
                              {row.department || "未分配部门"} · 待回顾 {row.openReviewCount} · 计划 {row.planItemCount}
                            </div>
                            {row.needsReminder && canReviewTeamReports ? (
                              <div className="action-row">
                                <button
                                  className="button ghost inline"
                                  disabled={remindingWeeklyReports}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    void remindTeamReports([row.userId]);
                                  }}
                                  type="button"
                                >
                                  催交此人
                                </button>
                              </div>
                            ) : null}
                          </>
                        );

                        return row.reportId ? (
                          <Link className="list-card stack" href={row.href} key={row.userId}>
                            {rowContent}
                          </Link>
                        ) : (
                          <div className="list-card stack" key={row.userId}>
                            {rowContent}
                          </div>
                        );
                      })
                    ) : (
                      <EmptyState
                        title="暂无团队成员"
                        description="当前账号还没有可管理的周报成员。"
                      />
                    )}
                  </div>
                </>
              ) : !teamClosureLoading ? (
                <EmptyState
                  title="团队闭环暂未加载"
                  description="刷新页面后会重新读取当前周次的团队周报状态。"
                />
              ) : null}
            </div>
          </SectionCard>

          <TeamSubmissionCard
            description="这里展示团队已提交的周报，可直接切换查看内容并讨论。"
            emptyDescription="其他成员提交后，这里会显示最近可讨论的周报。"
            emptyTitle="暂时没有团队周报"
            items={(listData?.teamItems ?? []).map((item) => ({
              ...item,
              href: `/work-management/weekly-reports?reportId=${item.id}`,
            }))}
            title="团队已提交周报"
          />

          <SectionCard
            title="相关日程"
            description="本周计划中已同步到日程的事项会出现在这里。"
          >
            <div className="stack">
              {relatedScheduleItems.length ? (
                relatedScheduleItems.map((item, index) => (
                  <div className="list-card stack" key={`${item.title}-${index}`}>
                    <div className="summary-row">
                      <strong>{item.title}</strong>
                      <StatusBadge tone="success">已同步</StatusBadge>
                    </div>
                    <div className="small muted">
                      {item.plannedAt ? formatWorkDate(item.plannedAt) : "未安排"}
                    </div>
                    {item.relatedEntity ? (
                      <div className="small muted">关联：{item.relatedEntity}</div>
                    ) : null}
                  </div>
                ))
              ) : (
                <EmptyState
                  title="还没有同步到日程的事项"
                  description="给计划项设置完成时间后，会自动进入日程中心。"
                />
              )}
            </div>
          </SectionCard>

          <ReminderListCard title="本周提醒" items={reminders} />
        </aside>
      </section>

      <ManagementDrawer
        actions={
          <div className="action-row wm-archive-actions">
            <button className="button secondary inline" onClick={() => setArchiveOpen(false)} type="button">
              关闭
            </button>
          </div>
        }
        eyebrow="Weekly Report Archive"
        onClose={() => setArchiveOpen(false)}
        open={archiveOpen}
        size="large"
        subtitle="按月份回看历史周报，方便做月度回顾和承接分析。"
        title="历史周报归档"
      >
        <div className="stack">
          <div className="action-row wm-archive-view-switch">
            <button
              className={`button ${archiveView === "mine" ? "" : "secondary"} inline`}
              onClick={() => {
                setArchiveView("mine");
                setArchiveStatus("");
                setArchivePage(1);
              }}
              type="button"
            >
              我的历史
            </button>
            <button
              className={`button ${archiveView === "team" ? "" : "secondary"} inline`}
              onClick={() => {
                setArchiveView("team");
                setArchiveStatus("");
                setArchivePage(1);
              }}
              type="button"
            >
              团队已提交
            </button>
          </div>

          <div className="wm-form-grid">
            <div className="field">
              <label htmlFor="weekly-archive-month">月份</label>
              <select
                id="weekly-archive-month"
                onChange={(event) => {
                  setArchiveMonthKey(event.target.value);
                  setArchivePage(1);
                }}
                value={archiveMonthKey}
              >
                <option value="">全部月份</option>
                {archiveMonthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="weekly-archive-status">状态</label>
              <select
                disabled={archiveView !== "mine"}
                id="weekly-archive-status"
                onChange={(event) => {
                  setArchiveStatus(
                    event.target.value as
                      | ""
                      | "DRAFT"
                      | "SUBMITTED"
                      | "RETURNED"
                      | "APPROVED",
                  );
                  setArchivePage(1);
                }}
                value={archiveView === "mine" ? archiveStatus : "SUBMITTED"}
              >
                <option value="">全部状态</option>
                <option value="DRAFT">草稿</option>
                <option value="SUBMITTED">待主管审阅</option>
                <option value="RETURNED">已退回</option>
                <option value="APPROVED">已通过</option>
              </select>
            </div>
            <div className="field">
              <label>当前筛选</label>
              <div className="list-card stack">
                <div className="summary-row">
                  <strong>{archiveView === "mine" ? "我的周报" : "团队已提交"}</strong>
                  <StatusBadge tone="neutral">
                    {archiveData ? `${archiveData.total} 条` : "加载中"}
                  </StatusBadge>
                </div>
                <div className="small muted">
                  {formatArchiveMonthLabel(archiveMonthKey)}
                  {archiveView === "mine" && archiveStatus ? ` · ${labelForWeeklyReportStatus(archiveStatus)}` : ""}
                </div>
              </div>
            </div>
          </div>

          {archiveError ? <div className="danger-text small">{archiveError}</div> : null}

          <SectionCard
            title="历史记录"
            description="点击任意一条即可切换到该周报详情，方便回顾成果、风险和遗留事项。"
          >
            <div className="stack">
              {archiveLoading ? (
                <div className="small muted">正在加载历史周报...</div>
              ) : archiveData?.items.length ? (
                archiveData.items.map((item) => (
                  <button
                    className={`list-card list-card--button stack ${selectedId === item.id ? "is-selected" : ""}`}
                    key={item.id}
                    onClick={() => {
                      void loadDetail(item.id);
                      setArchiveOpen(false);
                    }}
                    type="button"
                  >
                    <div className="summary-row">
                      <strong>{item.label}</strong>
                      <StatusBadge tone={statusTone(item.status)}>
                        {labelForWeeklyReportStatus(item.status)}
                      </StatusBadge>
                    </div>
                    <div className="small muted">
                      {archiveView === "team" ? `${item.owner.displayName} · ` : ""}
                      待回顾 {item.openReviewCount} 项 · 本周计划 {item.planItemCount} 项
                    </div>
                    <div className="small muted">
                      {item.submittedAt
                        ? `提交于 ${formatWorkDay(item.submittedAt)}`
                        : `更新于 ${formatWorkDay(item.updatedAt ?? item.weekEndDate)}`}
                    </div>
                  </button>
                ))
              ) : (
                <EmptyState
                  title="当前筛选下没有历史周报"
                  description="可以切换月份或视角，查看其他周期的周报记录。"
                />
              )}
            </div>
          </SectionCard>

          {archiveData && archiveData.totalPages > 1 ? (
            <div className="action-row wm-archive-pagination">
              <button
                className="button secondary inline"
                disabled={archivePage <= 1}
                onClick={() => setArchivePage((current) => Math.max(current - 1, 1))}
                type="button"
              >
                上一页
              </button>
              <span className="small muted">
                第 {archiveData.page} / {archiveData.totalPages} 页
              </span>
              <button
                className="button secondary inline"
                disabled={archivePage >= archiveData.totalPages}
                onClick={() =>
                  setArchivePage((current) =>
                    archiveData ? Math.min(current + 1, archiveData.totalPages) : current + 1,
                  )
                }
                type="button"
              >
                下一页
              </button>
            </div>
          ) : null}
        </div>
      </ManagementDrawer>

      <ManagementDrawer
        actions={
          <>
            <button
              className="button secondary inline"
              onClick={() => setReviewDrawerOpen(false)}
              type="button"
            >
              取消
            </button>
            <button
              className="button inline"
              disabled={reviewing}
              onClick={() => void reviewReport()}
              type="button"
            >
              {reviewing
                ? "处理中..."
                : reviewDecision === "approve"
                  ? "确认通过"
                  : "确认退回"}
            </button>
          </>
        }
        eyebrow="Weekly Report Review"
        onClose={() => setReviewDrawerOpen(false)}
        open={reviewDrawerOpen}
        size="medium"
        subtitle={
          reviewDecision === "approve"
            ? "通过后，该周报会进入月底汇总的正式来源范围。"
            : "退回时请写明需要修改的地方，方便成员直接按说明补正。"
        }
        title={reviewDecision === "approve" ? "主管通过周报" : "退回周报修改"}
      >
        <div className="stack">
          <div className="list-card stack">
            <div className="summary-row">
              <strong>{detail?.owner.displayName ?? "当前成员"}</strong>
              <StatusBadge tone={statusTone(detail?.status ?? "MISSING")}>
                {detail ? labelForWeeklyReportStatus(detail.status) : "--"}
              </StatusBadge>
            </div>
            <div className="small muted">{detail?.label ?? "当前周报"}</div>
          </div>

          <div className="field">
            <label htmlFor="weekly-review-comment">
              {reviewDecision === "approve" ? "审阅备注（选填）" : "退回说明"}
            </label>
            <textarea
              id="weekly-review-comment"
              onChange={(event) => setReviewComment(event.target.value)}
              placeholder={
                reviewDecision === "approve"
                  ? "例如：本周内容完整，可按当前版本进入月底汇总。"
                  : "请说明需要补充或修改的部分，例如：风险项没有写清楚、计划时间需要补齐。"
              }
              value={reviewComment}
            />
          </div>
        </div>
      </ManagementDrawer>

      <ManagementDrawer
        actions={
          <>
            <button className="button secondary inline" onClick={() => setPlanDrawerOpen(false)} type="button">
              取消
            </button>
            <button
              className="button secondary inline"
              onClick={() => persistPlanDraft("save-and-new")}
              type="button"
            >
              保存并继续新增
            </button>
            <button className="button inline" onClick={() => persistPlanDraft("save")} type="button">
              保存
            </button>
          </>
        }
        eyebrow="Weekly Plan Item"
        onClose={() => setPlanDrawerOpen(false)}
        open={planDrawerOpen}
        size="medium"
        subtitle="把计划拆成结构化字段后，后续同步到日程和复盘都会更清晰。"
        title={planEditingIndex === null ? "新增计划项" : "编辑计划项"}
      >
        <div className="stack">
          <div className="field">
            <label htmlFor="plan-title">计划标题</label>
            <input
              id="plan-title"
              onChange={(event) =>
                setPlanDraft((current) => ({ ...current, title: event.target.value }))
              }
              value={planDraft.title}
            />
          </div>
          <div className="wm-form-grid">
            <div className="field">
              <label htmlFor="plan-type">计划类型</label>
              <select
                id="plan-type"
                onChange={(event) =>
                  setPlanDraft((current) => ({
                    ...current,
                    planType: event.target.value as WeeklyPlanType,
                  }))
                }
                value={planDraft.planType}
              >
                {PLAN_TYPE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="plan-priority">优先级</label>
              <select
                id="plan-priority"
                onChange={(event) =>
                  setPlanDraft((current) => ({
                    ...current,
                    priority: event.target.value as WeeklyPlanEditorItem["priority"],
                  }))
                }
                value={planDraft.priority}
              >
                {PRIORITY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="plan-status">当前状态</label>
              <select
                id="plan-status"
                onChange={(event) =>
                  setPlanDraft((current) => ({
                    ...current,
                    itemStatus: event.target.value as WeeklyPlanEditorItem["itemStatus"],
                  }))
                }
                value={planDraft.itemStatus}
              >
                {PLAN_STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="plan-related">关联事项 / 项目</label>
              <input
                id="plan-related"
                onChange={(event) =>
                  setPlanDraft((current) => ({
                    ...current,
                    relatedEntity: event.target.value,
                  }))
                }
                placeholder="例如：4 月班表调整 / 五月活动筹备"
                value={planDraft.relatedEntity}
              />
            </div>
            <div className="field">
              <label htmlFor="plan-deadline">截止日期</label>
              <input
                id="plan-deadline"
                onChange={(event) =>
                  setPlanDraft((current) => ({
                    ...current,
                    plannedAt: event.target.value,
                  }))
                }
                type="datetime-local"
                value={formatDateTimeInput(planDraft.plannedAt)}
              />
            </div>
            <label className="checkbox-row">
              <input
                checked={planDraft.syncToCalendar}
                onChange={(event) =>
                  setPlanDraft((current) => ({
                    ...current,
                    syncToCalendar: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              <span>同步到日程</span>
            </label>
          </div>
          <div className="field">
            <label htmlFor="plan-detail">详细说明</label>
            <textarea
              id="plan-detail"
              onChange={(event) =>
                setPlanDraft((current) => ({ ...current, detail: event.target.value }))
              }
              placeholder="补充协作对象、依赖资料或交付要求。"
              value={planDraft.detail}
            />
          </div>
        </div>
      </ManagementDrawer>

      <ManagementDrawer
        actions={
          <>
            <button
              className="button secondary inline"
              onClick={() => {
                setAbandonDrawerOpen(false);
                setAbandonTargetId(null);
                setAbandonReason("");
              }}
              type="button"
            >
              返回
            </button>
            <button className="button danger inline" onClick={confirmAbandonReview} type="button">
              确认放弃
            </button>
          </>
        }
        eyebrow="Abandon Carryover"
        onClose={() => setAbandonDrawerOpen(false)}
        open={abandonDrawerOpen}
        size="medium"
        subtitle="该事项不会自动进入本周计划，请填写原因，便于后续复盘。"
        title="确认不再承接此事项？"
      >
        <div className="field">
          <label htmlFor="abandon-reason">放弃原因</label>
          <textarea
            id="abandon-reason"
            onChange={(event) => setAbandonReason(event.target.value)}
            placeholder="请说明为什么不再继续承接该事项。"
            value={abandonReason}
          />
        </div>
      </ManagementDrawer>
    </div>
  );
}
