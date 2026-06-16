"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "../../../components/inspections/InspectionsWorkspacePreview.module.css";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "../../../components/system/SearchableSelect";
import { EmptyState, StatusBadge } from "../../../components/system/primitives";
import {
  type InspectionCustomerOption,
  type InspectionListItem,
  type InspectionListResponse,
  type InspectionProductOption,
  inspectionPaymentStatusLabel,
  inspectionPaymentStatusTone,
  inspectionStatusLabel,
  inspectionStatusTone,
} from "../../../components/inspections/types";
import { apiFetch, getCurrentUser, hasAnyPermission } from "../../../lib/api";
import { formatDateLabel, formatMoney } from "../../../lib/workspace";

type InspectionQueueKey = "linking" | "report" | "payment";

type CustomerListResponse = {
  items: InspectionCustomerOption[];
};

type QuickLinkDraft = {
  customerId: string;
  productId: string;
};

type BatchSubmitSummary = {
  total: number;
  completed: number;
  successCount: number;
  failedItems: Array<{
    id: string;
    inspectionNo: string;
    reason: string;
  }>;
  active: boolean;
};

type InspectionFilters = {
  search: string;
  status: string;
  paymentStatus: string;
  labName: string;
  customerId: string;
  productId: string;
  customerLinked: string;
  productLinked: string;
};

function getInitialQueue(searchParams: URLSearchParams): InspectionQueueKey {
  if (
    searchParams.get("needsLinking") === "true" ||
    searchParams.get("customerLinked") === "false" ||
    searchParams.get("productLinked") === "false"
  ) {
    return "linking";
  }

  if (["UNPAID", "PARTIAL"].includes(searchParams.get("paymentStatus") ?? "")) {
    return "payment";
  }

  return "report";
}

function createInitialFilters(searchParams: URLSearchParams): InspectionFilters {
  return {
    search: searchParams.get("keyword") ?? "",
    status: searchParams.get("status") ?? "",
    paymentStatus: searchParams.get("paymentStatus") ?? "",
    labName: searchParams.get("labName") ?? "",
    customerId: searchParams.get("customerId") ?? "",
    productId: searchParams.get("productId") ?? "",
    customerLinked: searchParams.get("customerLinked") ?? "",
    productLinked: searchParams.get("productLinked") ?? "",
  };
}

function hasActiveAdvancedFilters(filters: InspectionFilters) {
  return Boolean(
    filters.status ||
      filters.paymentStatus ||
      filters.labName ||
      filters.customerId ||
      filters.productId ||
      filters.customerLinked ||
      filters.productLinked,
  );
}

function isInspectionUnlinked(item: InspectionListItem) {
  return !item.customer?.id || !item.product?.id;
}

function createQuickLinkDraft(item: InspectionListItem): QuickLinkDraft {
  return {
    customerId: item.customer?.id ?? "",
    productId: item.product?.id ?? "",
  };
}

function buildQuickLinkPayload(item: InspectionListItem, draft: QuickLinkDraft) {
  const payload: { customerId?: string | null; productId?: string | null } = {};

  if (draft.customerId !== (item.customer?.id ?? "")) {
    payload.customerId = draft.customerId || null;
  }

  if (draft.productId !== (item.product?.id ?? "")) {
    payload.productId = draft.productId || null;
  }

  return payload;
}

function isInspectionReportPending(item: InspectionListItem) {
  if (["COMPLETED", "ARCHIVED", "CANCELED"].includes(item.status)) {
    return false;
  }

  if (["SUBMITTED", "RECEIVED", "IN_PROGRESS", "PARTIAL_REPORTED"].includes(item.status)) {
    return true;
  }

  return item.itemCount > 0 && item.reportedItemCount < item.itemCount;
}

function isInspectionPaymentPending(item: InspectionListItem) {
  if (["UNPAID", "PARTIAL"].includes(item.paymentStatus)) {
    return true;
  }

  const totalFee = Number(item.totalFee ?? 0);
  const totalPaid = Number(item.totalPaidAmount ?? 0);

  return totalPaid < totalFee;
}

function matchInspectionQueue(queue: InspectionQueueKey, item: InspectionListItem) {
  switch (queue) {
    case "linking":
      return isInspectionUnlinked(item);
    case "report":
      return isInspectionReportPending(item);
    case "payment":
      return isInspectionPaymentPending(item);
    default:
      return false;
  }
}

function buildQueueTitle(queue: InspectionQueueKey) {
  switch (queue) {
    case "linking":
      return "先补齐客户和产品关联";
    case "report":
      return "先催会影响交付的报告";
    case "payment":
      return "先把付款和回单登记完整";
    default:
      return "检测待办";
  }
}

function buildQueueDescription(queue: InspectionQueueKey) {
  switch (queue) {
    case "linking":
      return "这一队列的重点不是看进度，而是先把断掉的关系链补上。";
    case "report":
      return "这一队列聚焦已经送检、客户也在等结果的检测单。";
    case "payment":
      return "这一队列处理的是费用动作，避免检测已经推进但账务还挂着。";
    default:
      return "从今天最需要处理的队列开始。";
  }
}

function buildInspectionSummary(queue: InspectionQueueKey, item: InspectionListItem) {
  if (queue === "linking") {
    if (!item.customer?.id && !item.product?.id) {
      return "客户和产品都还没挂上，后续客户页、产品页和档案归集都会断链。";
    }

    if (!item.customer?.id) {
      return "产品已挂接，但客户还没补齐，后续客户跟进和对账会断掉。";
    }

    return "客户已挂接，但产品还没补齐，产品主档和检测资料无法串起来。";
  }

  if (queue === "report") {
    if (item.latestTimeline?.content) {
      return `最近进展：${item.latestTimeline.content}`;
    }

    return "这张检测单已经在推进，但还需要继续追实验室结果或整理阶段性报告。";
  }

  return `费用 ${formatMoney(item.totalFee)}，已付 ${formatMoney(
    item.totalPaidAmount,
  )}，还需要继续补付款或登记回单。`;
}

function buildInspectionIssue(queue: InspectionQueueKey, item: InspectionListItem) {
  if (queue === "linking") {
    if (!item.customer?.id && !item.product?.id) {
      return "客户和产品都未关联";
    }

    if (!item.customer?.id) {
      return "缺客户关联";
    }

    return "缺产品关联";
  }

  if (queue === "report") {
    if (item.status === "PARTIAL_REPORTED") {
      return "已出部分结果，但还没形成完整交付";
    }

    if (item.status === "RECEIVED") {
      return "实验室已收样，但结果还没回传";
    }

    if (item.status === "SUBMITTED") {
      return "已经送检，当前要跟实验室确认排期";
    }

    return "报告仍在推进中";
  }

  if (item.paymentStatus === "UNPAID") {
    return "检测费用尚未登记付款";
  }

  if (item.paymentStatus === "PARTIAL") {
    return "检测费用仍有尾款待处理";
  }

  return "付款状态和金额仍需复核";
}

function buildInspectionNextAction(queue: InspectionQueueKey, item: InspectionListItem) {
  if (queue === "linking") {
    if (!item.customer?.id && !item.product?.id) {
      return "先补客户和产品，再回到详情页继续维护样本和附件。";
    }

    if (!item.customer?.id) {
      return "先补客户关联，让客户详情和检测对账能看见这张单。";
    }

    return "先补产品关联，让产品主档和检测资料能串起来。";
  }

  if (queue === "report") {
    if (item.status === "PARTIAL_REPORTED") {
      return "先整理已回项目，判断是否可以先给客户阶段性结果。";
    }

    return "先联系实验室确认结果窗口，再决定是否要同步客户预期。";
  }

  if (item.paymentStatus === "UNPAID") {
    return "先确认是否已打款，再补付款记录或回单。";
  }

  return "先补齐尾款或回单，让费用状态和检测进度保持一致。";
}

function buildInspectionTimeline(queue: InspectionQueueKey, item: InspectionListItem) {
  const progressLabel = `样本 ${item.sampleCount} / 项目 ${item.itemCount} / 已出 ${item.reportedItemCount}`;
  const latestProgress = item.latestTimeline
    ? `${formatDateLabel(item.latestTimeline.eventAt)} · ${item.latestTimeline.content}`
    : `更新 ${formatDateLabel(item.updatedAt)}`;

  if (queue === "payment") {
    return [
      { label: "检测单号", value: item.inspectionNo },
      {
        label: "费用进度",
        value: `${formatMoney(item.totalFee)} / 已付 ${formatMoney(item.totalPaidAmount)}`,
      },
      { label: "最近进展", value: latestProgress },
    ];
  }

  return [
    { label: "检测单号", value: item.inspectionNo },
    { label: "项目进度", value: progressLabel },
    { label: "最近进展", value: latestProgress },
  ];
}

function sortInspectionItems(items: InspectionListItem[]) {
  return [...items].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export default function InspectionsPage() {
  const currentUser = getCurrentUser();
  const canMaintain = hasAnyPermission(currentUser, [
    "action.inspection.create",
    "action.inspection.update",
  ]);
  const searchParams = useSearchParams();
  const [activeQueue, setActiveQueue] = useState<InspectionQueueKey>(() =>
    getInitialQueue(searchParams),
  );
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() =>
    hasActiveAdvancedFilters(createInitialFilters(searchParams)),
  );
  const [selectedInspectionId, setSelectedInspectionId] = useState("");
  const [customers, setCustomers] = useState<InspectionCustomerOption[]>([]);
  const [products, setProducts] = useState<InspectionProductOption[]>([]);
  const [items, setItems] = useState<InspectionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [savingInspectionId, setSavingInspectionId] = useState("");
  const [quickLinkDrafts, setQuickLinkDrafts] = useState<Record<string, QuickLinkDraft>>({});
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [batchDraft, setBatchDraft] = useState<QuickLinkDraft>({
    customerId: "",
    productId: "",
  });
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [batchSubmitSummary, setBatchSubmitSummary] = useState<BatchSubmitSummary | null>(null);
  const [filters, setFilters] = useState<InspectionFilters>(() =>
    createInitialFilters(searchParams),
  );

  const customerOptions = useMemo<SearchableSelectOption[]>(
    () =>
      customers.map((customer) => ({
        id: customer.id,
        label: customer.name,
        description: customer.companyName || "客户档案",
        keywords: [customer.name, customer.companyName].filter(Boolean).join(" "),
      })),
    [customers],
  );

  const productOptions = useMemo<SearchableSelectOption[]>(
    () =>
      products.map((product) => ({
        id: product.id,
        label: product.displayName,
        description:
          [product.specification, product.unit].filter(Boolean).join(" · ") ||
          "产品档案",
        keywords: [
          product.displayName,
          product.specification,
          product.unit,
          product.suggestedPrice,
        ]
          .filter(Boolean)
          .join(" "),
      })),
    [products],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        const [customerResponse, productResponse] = await Promise.all([
          apiFetch<CustomerListResponse>("/customers?pageSize=200"),
          apiFetch<InspectionProductOption[]>("/products"),
        ]);

        if (cancelled) {
          return;
        }

        setCustomers(customerResponse.items);
        setProducts(productResponse);
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "加载检测筛选项失败",
          );
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setQuickLinkDrafts((current) => {
      const next: Record<string, QuickLinkDraft> = {};

      for (const item of items) {
        if (item.customer?.id && item.product?.id) {
          continue;
        }

        next[item.id] = current[item.id] ?? createQuickLinkDraft(item);
      }

      return next;
    });
  }, [items]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: "100",
        });

        if (filters.search) params.set("keyword", filters.search);
        if (filters.status) params.set("status", filters.status);
        if (filters.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
        if (filters.labName) params.set("labName", filters.labName);
        if (filters.customerId) params.set("customerId", filters.customerId);
        if (filters.productId) params.set("productId", filters.productId);
        if (filters.customerLinked) {
          params.set("customerLinked", filters.customerLinked);
        }
        if (filters.productLinked) {
          params.set("productLinked", filters.productLinked);
        }

        const response = await apiFetch<InspectionListResponse>(
          `/inspections?${params.toString()}`,
        );

        if (cancelled) {
          return;
        }

        setItems(response.items);
        setTotal(response.total);
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "加载检测列表失败",
          );
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [
    filters.customerId,
    filters.customerLinked,
    filters.labName,
    filters.paymentStatus,
    filters.productId,
    filters.productLinked,
    reloadKey,
    filters.search,
    filters.status,
  ]);

  const queueCounts = useMemo(
    () => ({
      linking: items.filter(isInspectionUnlinked).length,
      report: items.filter(isInspectionReportPending).length,
      payment: items.filter(isInspectionPaymentPending).length,
    }),
    [items],
  );

  const activeQueueItems = useMemo(
    () => sortInspectionItems(items.filter((item) => matchInspectionQueue(activeQueue, item))),
    [activeQueue, items],
  );
  const isLinkingQueue = activeQueue === "linking";
  const selectedBatchIdSet = useMemo(() => new Set(selectedBatchIds), [selectedBatchIds]);
  const selectedBatchItems = useMemo(
    () => activeQueueItems.filter((item) => selectedBatchIdSet.has(item.id)),
    [activeQueueItems, selectedBatchIdSet],
  );

  useEffect(() => {
    if (!activeQueueItems.length) {
      setSelectedInspectionId("");
      return;
    }

    setSelectedInspectionId((current) =>
      activeQueueItems.some((item) => item.id === current)
        ? current
        : activeQueueItems[0]?.id ?? "",
    );
  }, [activeQueueItems]);

  useEffect(() => {
    if (activeQueue !== "linking") {
      setIsBatchMode(false);
      setSelectedBatchIds([]);
      setBatchDraft({
        customerId: "",
        productId: "",
      });
      setBatchSubmitSummary(null);
    }
  }, [activeQueue]);

  useEffect(() => {
    setSelectedBatchIds((current) =>
      current.filter((id) => activeQueueItems.some((item) => item.id === id)),
    );
  }, [activeQueueItems]);

  useEffect(() => {
    if (isBatchMode) {
      return;
    }

    setSelectedBatchIds([]);
    setBatchDraft({
      customerId: "",
      productId: "",
    });
    setBatchSubmitSummary(null);
  }, [isBatchMode]);

  const selectedRecord =
    activeQueueItems.find((item) => item.id === selectedInspectionId) ?? null;

  const selectedDraft = selectedRecord
    ? quickLinkDrafts[selectedRecord.id] ?? createQuickLinkDraft(selectedRecord)
    : null;

  const selectedHasPendingChange = selectedRecord && selectedDraft
    ? selectedDraft.customerId !== (selectedRecord.customer?.id ?? "") ||
      selectedDraft.productId !== (selectedRecord.product?.id ?? "")
    : false;

  async function handleQuickLinkSave(item: InspectionListItem) {
    const draft = quickLinkDrafts[item.id] ?? createQuickLinkDraft(item);
    const payload = buildQuickLinkPayload(item, draft);

    if (!Object.keys(payload).length) {
      return;
    }

    try {
      setSavingInspectionId(item.id);
      setError("");
      setMessage("");

      await apiFetch(`/inspections/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setMessage(`${item.inspectionNo} 的关联信息已更新`);
      setReloadKey((current) => current + 1);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "保存检测关联失败",
      );
    } finally {
      setSavingInspectionId("");
    }
  }

  function toggleBatchSelection(itemId: string) {
    setSelectedBatchIds((current) =>
      current.includes(itemId)
        ? current.filter((currentId) => currentId !== itemId)
        : [...current, itemId],
    );
  }

  function handleApplyBatchDraft() {
    if (!selectedBatchItems.length) {
      setError("请先选择要批量补关联的检测单");
      setMessage("");
      return;
    }

    if (!batchDraft.customerId && !batchDraft.productId) {
      setError("请先选择要批量套用的客户或产品");
      setMessage("");
      return;
    }

    setQuickLinkDrafts((current) => {
      const next = { ...current };

      for (const item of selectedBatchItems) {
        const baseDraft = current[item.id] ?? createQuickLinkDraft(item);
        next[item.id] = {
          customerId:
            batchDraft.customerId && !baseDraft.customerId
              ? batchDraft.customerId
              : baseDraft.customerId,
          productId:
            batchDraft.productId && !baseDraft.productId
              ? batchDraft.productId
              : baseDraft.productId,
        };
      }

      return next;
    });

    setError("");
    setMessage(`已把批量草稿套用到 ${selectedBatchItems.length} 张检测单，仅补空缺字段`);
  }

  async function handleBatchSave() {
    if (!selectedBatchItems.length) {
      setError("请先选择要提交的检测单");
      setMessage("");
      return;
    }

    setError("");
    setMessage("");
    setIsBatchSaving(true);
    setBatchSubmitSummary({
      total: selectedBatchItems.length,
      completed: 0,
      successCount: 0,
      failedItems: [],
      active: true,
    });

    let completed = 0;
    let successCount = 0;
    const failedItems: BatchSubmitSummary["failedItems"] = [];

    for (const item of selectedBatchItems) {
      const draft = quickLinkDrafts[item.id] ?? createQuickLinkDraft(item);
      const payload = buildQuickLinkPayload(item, draft);

      try {
        setSavingInspectionId(item.id);

        if (Object.keys(payload).length) {
          await apiFetch(`/inspections/${item.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
        }

        successCount += 1;
      } catch (requestError) {
        failedItems.push({
          id: item.id,
          inspectionNo: item.inspectionNo,
          reason:
            requestError instanceof Error ? requestError.message : "保存检测关联失败",
        });
      } finally {
        completed += 1;
        setBatchSubmitSummary({
          total: selectedBatchItems.length,
          completed,
          successCount,
          failedItems: [...failedItems],
          active: completed < selectedBatchItems.length,
        });
      }
    }

    setSavingInspectionId("");
    setIsBatchSaving(false);
    setSelectedBatchIds(failedItems.map((item) => item.id));

    if (successCount > 0) {
      setReloadKey((current) => current + 1);
    }

    if (failedItems.length) {
      setError(
        `批量提交完成，成功 ${successCount} 张，失败 ${failedItems.length} 张。失败单号：${failedItems
          .map((item) => item.inspectionNo)
          .join("、")}`,
      );
      return;
    }

    setMessage(`批量补关联已完成，共处理 ${successCount} 张检测单`);
  }

  return (
    <div className={`workspace-stack ${styles.previewPage}`}>
      <section className={styles.commandDeck}>
        <div className={styles.commandCopy}>
          <span className={styles.eyebrow}>Inspections workspace</span>
          <h1>检测待办工作台</h1>
          <p>
            这页只做一件事：帮你决定今天先处理哪一批检测单。
            先选队列，再点一张单，右侧就告诉你这张单卡在哪、下一步该做什么。
          </p>
          <div className={styles.statsStrip}>
            <div className={styles.statChip}>
              <span>待补关联</span>
              <strong>{String(queueCounts.linking)}</strong>
            </div>
            <div className={styles.statChip}>
              <span>待催报告</span>
              <strong>{String(queueCounts.report)}</strong>
            </div>
            <div className={styles.statChip}>
              <span>待登记付款</span>
              <strong>{String(queueCounts.payment)}</strong>
            </div>
          </div>
          <div className={styles.commandActions}>
            {canMaintain ? (
              <Link className={styles.primaryAction} href="/inspections/new">
                新建检测
              </Link>
            ) : null}
            <Link className={styles.secondaryAction} href="/files">
              查看档案中心
            </Link>
          </div>
        </div>

        <div className={styles.commandMeta}>
          <div className={styles.liveCard}>
            <span>这页怎么用</span>
            <strong>{isLinkingQueue && isBatchMode ? "先圈记录，再统一补齐" : "先选队列，再处理单笔"}</strong>
            <small>当前筛选结果共 {total} 张检测单，这不是总览页，而是一张处理台。</small>
            <StatusBadge tone="warning">正式数据</StatusBadge>
            <div className={styles.stepList}>
              <div className={styles.stepItem}>
                <b>1</b>
                <span>先选今天要处理的队列</span>
              </div>
              <div className={styles.stepItem}>
                <b>2</b>
                <span>再选一张当前最重要的检测单</span>
              </div>
              <div className={styles.stepItem}>
                <b>3</b>
                <span>右侧直接看卡点和下一步动作</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="danger-text small">{error}</div> : null}
      {message ? <div className="success-text small">{message}</div> : null}

      <section className={styles.workspace}>
        <div className={styles.mainColumn}>
          <section className={styles.queuePanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>主工作区</span>
                <strong>先选今天要处理的队列。</strong>
                <p className={styles.headerText}>
                  每个队列代表一种动作，不是普通状态分类。先确定动作，再进入单笔处理。
                </p>
              </div>
              <div className={styles.queueTabs}>
                <button
                  className={`${styles.queueTab} ${
                    activeQueue === "linking" ? styles.queueTabActive : ""
                  }`}
                  onClick={() => setActiveQueue("linking")}
                  type="button"
                >
                  <span>待补关联</span>
                  <strong>{String(queueCounts.linking)}</strong>
                  <small>先把缺客户、缺产品的记录补齐</small>
                </button>
                <button
                  className={`${styles.queueTab} ${
                    activeQueue === "report" ? styles.queueTabActive : ""
                  }`}
                  onClick={() => setActiveQueue("report")}
                  type="button"
                >
                  <span>待催报告</span>
                  <strong>{String(queueCounts.report)}</strong>
                  <small>优先催已经送检但还没回结果的单</small>
                </button>
                <button
                  className={`${styles.queueTab} ${
                    activeQueue === "payment" ? styles.queueTabActive : ""
                  }`}
                  onClick={() => setActiveQueue("payment")}
                  type="button"
                >
                  <span>待登记付款</span>
                  <strong>{String(queueCounts.payment)}</strong>
                  <small>避免检测费用和回单继续堆积</small>
                </button>
              </div>
            </div>

            <div className={styles.queueIntro}>
              <div className={styles.queueIntroCopy}>
                <span>
                  {activeQueue === "linking"
                    ? "待补关联"
                    : activeQueue === "report"
                      ? "待催报告"
                      : "待登记付款"}
                </span>
                <strong>{buildQueueTitle(activeQueue)}</strong>
                <p>
                  {buildQueueDescription(activeQueue)} 当前真实数据显示 {activeQueueItems.length} 张重点单。
                </p>
              </div>

              <div className="field filter-field--wide">
                <label htmlFor="inspection-search">搜索</label>
                <input
                  id="inspection-search"
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      search: event.target.value,
                    }))
                  }
                  placeholder="搜索编号 / 标题 / 检测对象 / 样本 / 检测项目"
                  value={filters.search}
                />
              </div>

              <div className={styles.filterCluster}>
                <button
                  className={styles.filterChip}
                  onClick={() => setShowAdvancedFilters((current) => !current)}
                  type="button"
                >
                  {showAdvancedFilters ? "收起筛选" : "更多筛选"}
                </button>
                <button
                  className={styles.filterChip}
                  onClick={() => {
                    setFilters({
                      search: "",
                      status: "",
                      paymentStatus: "",
                      labName: "",
                      customerId: "",
                      productId: "",
                      customerLinked: "",
                      productLinked: "",
                    });
                    setShowAdvancedFilters(false);
                  }}
                  type="button"
                >
                  清空筛选
                </button>
                <button
                  className={styles.filterChip}
                  onClick={() => setActiveQueue("linking")}
                  type="button"
                >
                  只看待补关联
                </button>
                {isLinkingQueue && canMaintain ? (
                  <button
                    className={styles.filterChip}
                    onClick={() => setIsBatchMode((current) => !current)}
                    type="button"
                  >
                    {isBatchMode ? "退出批量" : "开启批量处理"}
                  </button>
                ) : null}
              </div>
            </div>

            {showAdvancedFilters ? (
              <div className={styles.formGrid}>
                <div className="field filter-field">
                  <label htmlFor="inspection-status">检测状态</label>
                  <select
                    id="inspection-status"
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                    value={filters.status}
                  >
                    <option value="">全部状态</option>
                    <option value="DRAFT">草稿</option>
                    <option value="SAMPLED">已取样</option>
                    <option value="SUBMITTED">已送检</option>
                    <option value="RECEIVED">已收样</option>
                    <option value="IN_PROGRESS">检测中</option>
                    <option value="PARTIAL_REPORTED">部分出报告</option>
                    <option value="COMPLETED">已完成</option>
                    <option value="ARCHIVED">已归档</option>
                  </select>
                </div>

                <div className="field filter-field">
                  <label htmlFor="inspection-payment-status">付款状态</label>
                  <select
                    id="inspection-payment-status"
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        paymentStatus: event.target.value,
                      }))
                    }
                    value={filters.paymentStatus}
                  >
                    <option value="">全部付款状态</option>
                    <option value="UNPAID">未付款</option>
                    <option value="PARTIAL">部分付款</option>
                    <option value="PAID">已付款</option>
                    <option value="REFUNDED">已退款</option>
                  </select>
                </div>

                <div className="field filter-field">
                  <label htmlFor="inspection-customer-filter-link">客户关联</label>
                  <select
                    id="inspection-customer-filter-link"
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        customerLinked: event.target.value,
                      }))
                    }
                    value={filters.customerLinked}
                  >
                    <option value="">全部</option>
                    <option value="false">未关联客户</option>
                    <option value="true">已关联客户</option>
                  </select>
                </div>

                <div className="field filter-field">
                  <label htmlFor="inspection-product-filter-link">产品关联</label>
                  <select
                    id="inspection-product-filter-link"
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        productLinked: event.target.value,
                      }))
                    }
                    value={filters.productLinked}
                  >
                    <option value="">全部</option>
                    <option value="false">未关联产品</option>
                    <option value="true">已关联产品</option>
                  </select>
                </div>

                <div className="field filter-field--wide">
                  <label htmlFor="inspection-customer-filter">指定客户</label>
                  <SearchableSelect
                    emptyText="没有匹配客户"
                    id="inspection-customer-filter"
                    onChange={(value) =>
                      setFilters((current) => ({
                        ...current,
                        customerId: value,
                      }))
                    }
                    options={customerOptions}
                    placeholder="搜索客户"
                    value={filters.customerId}
                  />
                </div>

                <div className="field filter-field--wide">
                  <label htmlFor="inspection-product-filter">指定产品</label>
                  <SearchableSelect
                    emptyText="没有匹配产品"
                    id="inspection-product-filter"
                    onChange={(value) =>
                      setFilters((current) => ({
                        ...current,
                        productId: value,
                      }))
                    }
                    options={productOptions}
                    placeholder="搜索产品"
                    value={filters.productId}
                  />
                </div>

                <div className="field filter-field">
                  <label htmlFor="inspection-lab">送检机构</label>
                  <input
                    id="inspection-lab"
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        labName: event.target.value,
                      }))
                    }
                    placeholder="例如：梅里埃"
                    value={filters.labName}
                  />
                </div>
              </div>
            ) : null}

            {isLinkingQueue && isBatchMode && activeQueueItems.length ? (
              <div className={styles.batchToolbar}>
                <div className={styles.batchToolbarTop}>
                  <div className={styles.batchToolbarCopy}>
                    <span>批量补关联</span>
                    <strong>先圈一批待补记录，再统一补空缺字段。</strong>
                    <p>
                      已选 {selectedBatchItems.length} 张。批量字段只补空缺，不覆盖已有客户或产品；如需特殊处理，仍可在右侧单笔微调。
                    </p>
                  </div>
                  <div className={styles.batchToolbarActions}>
                    <button
                      className={styles.secondaryAction}
                      disabled={isBatchSaving}
                      onClick={() => setSelectedBatchIds(activeQueueItems.map((item) => item.id))}
                      type="button"
                    >
                      全选当前列表
                    </button>
                    <button
                      className={styles.secondaryAction}
                      disabled={isBatchSaving || selectedBatchItems.length === 0}
                      onClick={() => setSelectedBatchIds([])}
                      type="button"
                    >
                      清空已选
                    </button>
                  </div>
                </div>

                <div className={styles.batchToolbarGrid}>
                  <div className="field filter-field--wide">
                    <label htmlFor="inspection-batch-customer">批量补客户</label>
                    <SearchableSelect
                      disabled={isBatchSaving}
                      emptyText="没有匹配客户"
                      id="inspection-batch-customer"
                      onChange={(value) =>
                        setBatchDraft((current) => ({
                          ...current,
                          customerId: value,
                        }))
                      }
                      options={customerOptions}
                      placeholder="只补未关联客户的记录"
                      value={batchDraft.customerId}
                    />
                  </div>

                  <div className="field filter-field--wide">
                    <label htmlFor="inspection-batch-product">批量补产品</label>
                    <SearchableSelect
                      disabled={isBatchSaving}
                      emptyText="没有匹配产品"
                      id="inspection-batch-product"
                      onChange={(value) =>
                        setBatchDraft((current) => ({
                          ...current,
                          productId: value,
                        }))
                      }
                      options={productOptions}
                      placeholder="只补未关联产品的记录"
                      value={batchDraft.productId}
                    />
                  </div>
                </div>

                <div className={styles.batchToolbarActions}>
                  <button
                    className={styles.secondaryAction}
                    disabled={
                      isBatchSaving ||
                      selectedBatchItems.length === 0 ||
                      (!batchDraft.customerId && !batchDraft.productId)
                    }
                    onClick={handleApplyBatchDraft}
                    type="button"
                  >
                    套用到已选
                  </button>
                  <button
                    className={styles.primaryAction}
                    disabled={isBatchSaving || selectedBatchItems.length === 0}
                    onClick={() => void handleBatchSave()}
                    type="button"
                  >
                    {isBatchSaving ? "批量提交中..." : "提交已选"}
                  </button>
                </div>

                {batchSubmitSummary ? (
                  <div className={styles.batchProgress}>
                    <div className={styles.batchProgressMeta}>
                      <span>提交反馈</span>
                      <strong>
                        {batchSubmitSummary.active
                          ? `处理中 ${batchSubmitSummary.completed}/${batchSubmitSummary.total}`
                          : `本次完成 ${batchSubmitSummary.total} 张，成功 ${batchSubmitSummary.successCount} 张，失败 ${batchSubmitSummary.failedItems.length} 张`}
                      </strong>
                    </div>
                    {batchSubmitSummary.failedItems.length ? (
                      <p className={styles.batchProgressText}>
                        失败记录：{batchSubmitSummary.failedItems
                          .map((item) => item.inspectionNo)
                          .join("、")}
                      </p>
                    ) : (
                      <p className={styles.batchProgressText}>
                        {batchSubmitSummary.active
                          ? "系统会沿用现有单笔接口逐条提交，失败项会自动保留在已选列表里。"
                          : "本次没有失败项，列表刷新后会自动移出已补齐的记录。"}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            {items.length === 0 ? (
              <EmptyState
                description="当前筛选条件下还没有检测记录，后续可以从 Excel 导入或新建检测单。"
                title="暂无检测数据"
              />
            ) : activeQueueItems.length ? (
              <div className={styles.listBoard}>
                {activeQueueItems.map((item) => (
                  <div className={styles.recordRowShell} key={item.id}>
                    {isLinkingQueue && isBatchMode ? (
                      <button
                        aria-pressed={selectedBatchIdSet.has(item.id)}
                        className={`${styles.recordSelection} ${
                          selectedBatchIdSet.has(item.id) ? styles.recordSelectionActive : ""
                        }`}
                        disabled={isBatchSaving}
                        onClick={() => toggleBatchSelection(item.id)}
                        type="button"
                      >
                        {selectedBatchIdSet.has(item.id) ? "已选" : "选择"}
                      </button>
                    ) : null}

                    <button
                      className={`${styles.recordRow} ${
                        selectedRecord?.id === item.id ? styles.recordRowActive : ""
                      } ${selectedBatchIdSet.has(item.id) ? styles.recordRowSelected : ""}`}
                      onClick={() => setSelectedInspectionId(item.id)}
                      type="button"
                    >
                      <div className={styles.recordMain}>
                        <div className={styles.recordTitleRow}>
                          <strong>{item.title}</strong>
                          <div className={styles.recordBadges}>
                            <StatusBadge tone={inspectionStatusTone(item.status)}>
                              {inspectionStatusLabel(item.status)}
                            </StatusBadge>
                            <StatusBadge tone={inspectionPaymentStatusTone(item.paymentStatus)}>
                              {inspectionPaymentStatusLabel(item.paymentStatus)}
                            </StatusBadge>
                          </div>
                        </div>
                        <span className={styles.recordEyebrow}>{item.inspectionNo}</span>
                        <div className={styles.recordDetailLine}>
                          <span>检测对象</span>
                          <strong>{item.inspectionTarget}</strong>
                        </div>
                        <div className={styles.recordDetailLine}>
                          <span>客户 / 产品</span>
                          <strong>
                            {item.customer?.name || "未关联客户"} / {item.product?.name || "未关联产品"}
                          </strong>
                        </div>
                        <div className={styles.issueInline}>
                          <span>当前卡点</span>
                          <strong>{buildInspectionIssue(activeQueue, item)}</strong>
                        </div>
                      </div>

                      <div className={styles.recordAside}>
                        <div className={styles.recordMeta}>
                          <div className={styles.recordMetaGroup}>
                            <span>送检机构</span>
                            <strong>{item.labName}</strong>
                          </div>
                          <div className={styles.recordMetaGroup}>
                            <span>报告进度</span>
                            <strong>
                              样本 {item.sampleCount} / 项目 {item.itemCount} / 已出 {item.reportedItemCount}
                            </strong>
                          </div>
                          <div className={styles.recordMetaGroup}>
                            <span>费用</span>
                            <strong>
                              {formatMoney(item.totalFee)} / 已付 {formatMoney(item.totalPaidAmount)}
                            </strong>
                          </div>
                          <div className={styles.recordMetaGroup}>
                            <span>最近更新</span>
                            <strong>{formatDateLabel(item.updatedAt)}</strong>
                          </div>
                        </div>

                        <div className={styles.inlineNote}>
                          <span>下一步</span>
                          <strong>{buildInspectionNextAction(activeQueue, item)}</strong>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                description="当前筛选结果里在这个队列没有重点记录，可以切换队列或调整筛选条件。"
                title="当前队列没有待处理检测单"
              />
            )}
          </section>
        </div>

        <aside className={styles.sideRail}>
          {selectedRecord ? (
            <section className={styles.inspectorPanel}>
              <div className={styles.sectionHeader}>
                <div>
                  <span className={styles.sectionEyebrow}>当前 Inspector</span>
                  <strong>{selectedRecord.title}</strong>
                </div>
                <StatusBadge tone={inspectionStatusTone(selectedRecord.status)}>
                  {inspectionStatusLabel(selectedRecord.status)}
                </StatusBadge>
              </div>

              <p className={styles.inspectorLead}>
                {buildInspectionSummary(activeQueue, selectedRecord)}
              </p>

              {isLinkingQueue && isBatchMode ? (
                <div className={styles.inspectorNotice}>
                  <span>批量模式</span>
                  <strong>
                    已选 {selectedBatchItems.length} 张，当前记录
                    {selectedBatchIdSet.has(selectedRecord.id) ? "已加入本次提交" : "未加入本次提交"}
                  </strong>
                  <p>你可以继续在这里微调当前记录，再回到左侧统一提交。</p>
                  <button
                    className={styles.secondaryAction}
                    disabled={isBatchSaving}
                    onClick={() => toggleBatchSelection(selectedRecord.id)}
                    type="button"
                  >
                    {selectedBatchIdSet.has(selectedRecord.id) ? "移出已选" : "加入已选"}
                  </button>
                </div>
              ) : null}

              <div className={styles.inspectorGrid}>
                <div>
                  <span>检测对象</span>
                  <strong>{selectedRecord.inspectionTarget}</strong>
                </div>
                <div>
                  <span>负责人</span>
                  <strong>{selectedRecord.creator?.displayName || "--"}</strong>
                </div>
                <div>
                  <span>客户</span>
                  <strong>{selectedRecord.customer?.name || "未关联客户"}</strong>
                </div>
                <div>
                  <span>产品</span>
                  <strong>{selectedRecord.product?.name || "未关联产品"}</strong>
                </div>
                <div>
                  <span>样本 / 项目</span>
                  <strong>
                    样本 {selectedRecord.sampleCount} / 项目 {selectedRecord.itemCount}
                  </strong>
                </div>
                <div>
                  <span>送检机构</span>
                  <strong>{selectedRecord.labName}</strong>
                </div>
              </div>

              <div className={styles.inspectorGrid}>
                <div>
                  <span>报告进度</span>
                  <strong>已出 {selectedRecord.reportedItemCount} 项</strong>
                </div>
                <div>
                  <span>付款状态</span>
                  <strong>{inspectionPaymentStatusLabel(selectedRecord.paymentStatus)}</strong>
                </div>
                <div>
                  <span>费用</span>
                  <strong>
                    {formatMoney(selectedRecord.totalFee)} / 已付 {formatMoney(selectedRecord.totalPaidAmount)}
                  </strong>
                </div>
                <div>
                  <span>最近更新</span>
                  <strong>{formatDateLabel(selectedRecord.updatedAt)}</strong>
                </div>
              </div>

              <div className={styles.issueCard}>
                <span>当前卡点</span>
                <strong>{buildInspectionIssue(activeQueue, selectedRecord)}</strong>
                <p>{buildInspectionNextAction(activeQueue, selectedRecord)}</p>
              </div>

              {canMaintain && isInspectionUnlinked(selectedRecord) && selectedDraft ? (
                <div className={styles.formGrid}>
                  <div className="field filter-field--wide">
                    <label htmlFor={`inspection-inspector-customer-${selectedRecord.id}`}>
                      补客户关联
                    </label>
                    <SearchableSelect
                      disabled={savingInspectionId === selectedRecord.id || isBatchSaving}
                      emptyText="没有匹配客户"
                      id={`inspection-inspector-customer-${selectedRecord.id}`}
                      onChange={(value) =>
                        setQuickLinkDrafts((current) => ({
                          ...current,
                          [selectedRecord.id]: {
                            customerId: value,
                            productId:
                              current[selectedRecord.id]?.productId ??
                              selectedRecord.product?.id ??
                              "",
                          },
                        }))
                      }
                      options={customerOptions}
                      placeholder="搜索客户"
                      value={selectedDraft.customerId}
                    />
                  </div>

                  <div className="field filter-field--wide">
                    <label htmlFor={`inspection-inspector-product-${selectedRecord.id}`}>
                      补产品关联
                    </label>
                    <SearchableSelect
                      disabled={savingInspectionId === selectedRecord.id || isBatchSaving}
                      emptyText="没有匹配产品"
                      id={`inspection-inspector-product-${selectedRecord.id}`}
                      onChange={(value) =>
                        setQuickLinkDrafts((current) => ({
                          ...current,
                          [selectedRecord.id]: {
                            customerId:
                              current[selectedRecord.id]?.customerId ??
                              selectedRecord.customer?.id ??
                              "",
                            productId: value,
                          },
                        }))
                      }
                      options={productOptions}
                      placeholder="搜索产品"
                      value={selectedDraft.productId}
                    />
                  </div>
                </div>
              ) : null}

              <div className={styles.timeline}>
                {buildInspectionTimeline(activeQueue, selectedRecord).map((item) => (
                  <div className={styles.timelineRow} key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>

              <div className={styles.commandActions}>
                {canMaintain && isInspectionUnlinked(selectedRecord) && selectedHasPendingChange ? (
                  <button
                    className={styles.primaryAction}
                    disabled={savingInspectionId === selectedRecord.id || isBatchSaving}
                    onClick={() => void handleQuickLinkSave(selectedRecord)}
                    type="button"
                  >
                    {savingInspectionId === selectedRecord.id ? "保存中..." : "保存关联"}
                  </button>
                ) : null}
                <Link className={styles.secondaryAction} href={`/inspections/${selectedRecord.id}`}>
                  查看详情
                </Link>
                {canMaintain ? (
                  <Link className={styles.secondaryAction} href={`/inspections/${selectedRecord.id}/edit`}>
                    完整编辑
                  </Link>
                ) : null}
              </div>
            </section>
          ) : (
            <section className={styles.inspectorPanel}>
              <EmptyState
                description="先从左侧选一个队列中的检测单，右侧就会显示当前卡点和下一步动作。"
                title="当前没有选中的检测单"
              />
            </section>
          )}
        </aside>
      </section>
    </div>
  );
}
