"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { buildScheduleCreateHref } from "../../lib/schedule";
import { formatDateLabel } from "../../lib/workspace";
import {
  customerStageFromStatus,
  customerStatusOptions,
  type CustomerPriority,
  type CustomerQuoteStatus,
  type CustomerStage,
} from "./types";
import styles from "./CustomerManagementPage.module.css";

type IndustryGroup = {
  id: string;
  name: string;
};

type UserOption = {
  id: string;
  displayName: string;
  roleName: string;
};

type QuickFilterKey =
  | "todayPriority"
  | "quoteRisk"
  | "missingInfo"
  | "duplicate"
  | "maintenance"
  | "needSchedule";

type SortValue =
  | "priority"
  | "recentFollowup"
  | "successProbability"
  | "quotationTime"
  | "createdAt";

type CustomerListResponse = {
  items: CustomerRecord[];
  total: number;
};

type CustomerRecord = {
  id: string;
  name: string;
  companyName?: string | null;
  contactName?: string | null;
  mobile?: string | null;
  source?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  cooperationDirection?: string | null;
  estimatedAmount?: string | null;
  successProbability?: number | null;
  recentFollowupAt?: string | null;
  recentQuotation?: {
    createdAt: string;
  } | null;
  ownerAssignedAt: string;
  ownerProtectedUntil: string;
  ownerProtectionStatus: "PROTECTED" | "PENDING_MAINTENANCE";
  owner: { id: string; displayName: string };
  industryGroup?: { id: string; name: string } | null;
  industrySubgroup?: { id: string; name: string } | null;
  _count: { followups: number; quotations: number; tasks: number };
};

type GovernanceTone =
  | "neutral"
  | "info"
  | "accent"
  | "success"
  | "warning"
  | "danger";

type GovernanceSignal = {
  label: string;
  tone: GovernanceTone;
  detail: string;
};

type CustomerRecommendation = {
  customer: CustomerRecord;
  stage: CustomerStage;
  score: number;
  priority: CustomerPriority;
  quoteStatus: CustomerQuoteStatus;
  lastInteractionAt: number;
  lastInteractionLabel: string;
  missingFields: string[];
  nextActionLabel: string;
  primaryReason: string;
  recommendationReason: string;
  reasons: string[];
  shouldSchedule: boolean;
  quoteRisk: boolean;
  daysSinceInteraction: number;
  duplicateHint: string | null;
  governanceSignals: GovernanceSignal[];
  suggestedActions: string[];
};

type OwnerInsight = {
  ownerId: string;
  displayName: string;
  total: number;
  todayPriority: number;
  quoteRisk: number;
  missingInfo: number;
  duplicate: number;
  maintenance: number;
  score: number;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const sortOptions = [
  { value: "priority", label: "治理优先级" },
  { value: "recentFollowup", label: "最近互动" },
  { value: "successProbability", label: "意向评分" },
  { value: "quotationTime", label: "报价时间" },
  { value: "createdAt", label: "创建时间" },
] as const;

function getTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getCustomerLastInteractionAt(customer: CustomerRecord) {
  return getTimestamp(customer.recentFollowupAt ?? customer.updatedAt);
}

function getCustomerLastQuotationAt(customer: CustomerRecord) {
  return getTimestamp(customer.recentQuotation?.createdAt);
}

function getDaysSince(timestamp: number) {
  if (!timestamp) {
    return 0;
  }

  return Math.floor((Date.now() - timestamp) / DAY_IN_MS);
}

function normalizeText(value?: string | null) {
  return value?.trim().replace(/\s+/g, "").toLowerCase() || "";
}

function normalizePhone(value?: string | null) {
  return value?.replace(/\D/g, "") || "";
}

function buildMissingFields(customer: CustomerRecord) {
  const fields: string[] = [];

  if (!customer.companyName?.trim()) {
    fields.push("企业名称");
  }
  if (!customer.contactName?.trim()) {
    fields.push("联系人");
  }
  if (!customer.cooperationDirection?.trim()) {
    fields.push("下一步动作");
  }

  return fields;
}

function buildDuplicateInsightMap(customers: CustomerRecord[]) {
  const reasonMap = new Map<string, string[]>();

  function addReason(customerId: string, reason: string) {
    const reasons = reasonMap.get(customerId) ?? [];
    reasons.push(reason);
    reasonMap.set(customerId, reasons);
  }

  function registerGroup(
    group: CustomerRecord[],
    buildReason: (current: CustomerRecord, peers: CustomerRecord[]) => string,
  ) {
    if (group.length < 2) {
      return;
    }

    for (const customer of group) {
      const peers = group.filter((candidate) => candidate.id !== customer.id);
      if (!peers.length) {
        continue;
      }
      addReason(customer.id, buildReason(customer, peers));
    }
  }

  const phoneGroups = new Map<string, CustomerRecord[]>();
  const companyContactGroups = new Map<string, CustomerRecord[]>();

  for (const customer of customers) {
    const phoneKey = normalizePhone(customer.mobile);
    if (phoneKey.length >= 6) {
      const current = phoneGroups.get(phoneKey) ?? [];
      current.push(customer);
      phoneGroups.set(phoneKey, current);
    }

    const companyKey = normalizeText(customer.companyName);
    const contactKey = normalizeText(customer.contactName);
    if (companyKey && contactKey) {
      const groupKey = `${companyKey}::${contactKey}`;
      const current = companyContactGroups.get(groupKey) ?? [];
      current.push(customer);
      companyContactGroups.set(groupKey, current);
    }
  }

  for (const group of phoneGroups.values()) {
    registerGroup(group, (_, peers) => {
      const peerLabels = peers
        .map((peer) => peer.name || peer.companyName || "其他客户")
        .slice(0, 2)
        .join("、");
      return `手机号与 ${peerLabels} 重复`;
    });
  }

  for (const group of companyContactGroups.values()) {
    registerGroup(group, (_, peers) => {
      const peerLabels = peers
        .map((peer) => peer.name || peer.companyName || "其他客户")
        .slice(0, 2)
        .join("、");
      return `企业名称和联系人组合与 ${peerLabels} 高度相似`;
    });
  }

  return new Map(
    Array.from(reasonMap.entries()).map(([customerId, reasons]) => [
      customerId,
      Array.from(new Set(reasons)).slice(0, 2).join("；"),
    ]),
  );
}

function buildSuggestedActions(options: {
  customer: CustomerRecord;
  missingFields: string[];
  duplicateHint: string | null;
  quoteRisk: boolean;
  shouldSchedule: boolean;
}) {
  const { customer, missingFields, duplicateHint, quoteRisk, shouldSchedule } = options;
  const actions: string[] = [];

  if (duplicateHint) {
    actions.push("先确认是否与现有客户记录重复，再决定是否继续沿用当前客户。");
  }

  if (missingFields.length) {
    actions.push(`补齐${missingFields.join("、")}，避免推进继续悬空。`);
  }

  if (customer.ownerProtectionStatus === "PENDING_MAINTENANCE") {
    actions.push("补一条最新进展或维护动作，避免负责人归属继续下滑。");
  }

  if (quoteRisk) {
    actions.push("今天回访已发报价，确认客户真实反馈和内部推进负责人。");
  }

  if (shouldSchedule) {
    actions.push("把下一步动作排进日程，别停在口头约定。");
  }

  if (!customer._count.quotations && (customer.successProbability ?? 0) >= 70) {
    actions.push("如果需求已经确认，直接发起正式报价。");
  }

  if (!actions.length) {
    actions.push("打开客户详情补更多背景，再决定下一步动作。");
  }

  return Array.from(new Set(actions)).slice(0, 3);
}

function buildRecommendation(
  customer: CustomerRecord,
  duplicateHint: string | null,
): CustomerRecommendation {
  const probability = customer.successProbability ?? 0;
  const lastInteractionAt = getCustomerLastInteractionAt(customer);
  const daysSinceInteraction = getDaysSince(lastInteractionAt);
  const hasNextAction = Boolean(customer.cooperationDirection?.trim());
  const shouldSchedule = hasNextAction && customer._count.tasks === 0;
  const quoteRisk = customer._count.quotations > 0 && daysSinceInteraction >= 3;
  const missingFields = buildMissingFields(customer);

  const reasons: string[] = [];
  let score = 0;

  if (daysSinceInteraction >= 7) {
    reasons.push("已停滞超过 7 天，今天建议优先推进");
    score += 4;
  } else if (daysSinceInteraction >= 3) {
    reasons.push(`${daysSinceInteraction} 天未跟进，建议今天续上推进节奏`);
    score += 3;
  } else if (!customer.recentFollowupAt) {
    reasons.push("近期还没有正式互动记录，适合尽快补第一条跟进");
    score += 2;
  }

  if (quoteRisk) {
    reasons.push("已有报价，但尚未回访");
    score += 4;
  }

  if (shouldSchedule) {
    reasons.push("已有下一步动作，但尚未安排日程");
    score += 3;
  }

  if (!hasNextAction) {
    reasons.push("下一步动作未设置，容易中断推进");
    score += 2;
  }

  if (probability >= 80) {
    reasons.push("意向评分较高，适合继续推进");
    score += 3;
  } else if (probability >= 60) {
    reasons.push("意向评分进入重点线，可继续加速");
    score += 2;
  }

  if (customer.ownerProtectionStatus === "PENDING_MAINTENANCE") {
    reasons.push("客户已到期待维护，建议尽快补最新进展");
    score += 2;
  }

  if (missingFields.length) {
    reasons.push(`资料待补：${missingFields.join("、")}`);
    score += 1;
  }

  if (duplicateHint) {
    reasons.push("存在疑似重复记录，建议先确认主客户");
    score += 2;
  }

  const uniqueReasons = Array.from(new Set(reasons));
  const priority: CustomerPriority =
    quoteRisk || daysSinceInteraction >= 7
      ? "urgent"
      : score >= 4 || probability >= 70
        ? "high"
        : "normal";
  const quoteStatus: CustomerQuoteStatus = quoteRisk
    ? "waiting_reply"
    : customer._count.quotations > 0
      ? "linked"
      : "none";

  const governanceSignals: GovernanceSignal[] = [];

  if (score >= 4) {
    governanceSignals.push({
      label: "今日优先",
      tone: priority === "urgent" ? "danger" : "success",
      detail: uniqueReasons[0] || "今天值得优先推进，避免客户继续停在当前阶段。",
    });
  }

  if (quoteRisk) {
    governanceSignals.push({
      label: "报价未回",
      tone: "danger",
      detail: "已有报价但尚未回访，是当前最容易失温的一类机会。",
    });
  }

  if (missingFields.length) {
    governanceSignals.push({
      label: "待补资料",
      tone: "warning",
      detail: `当前缺少 ${missingFields.join("、")}，会直接影响后续推进。`,
    });
  }

  if (duplicateHint) {
    governanceSignals.push({
      label: "可能重复",
      tone: "warning",
      detail: duplicateHint,
    });
  }

  if (customer.ownerProtectionStatus === "PENDING_MAINTENANCE") {
    governanceSignals.push({
      label: "待维护",
      tone: "warning",
      detail: "负责人保护期已进入维护窗口，建议补一条最新进展。",
    });
  }

  if (shouldSchedule) {
    governanceSignals.push({
      label: "需排日程",
      tone: "info",
      detail: "下一步动作已经明确，但还没有真正落进日程。",
    });
  }

  return {
    customer,
    stage: customerStageFromStatus(customer.status, customer._count.quotations > 0),
    score,
    priority,
    quoteStatus,
    lastInteractionAt,
    lastInteractionLabel: formatDateLabel(customer.recentFollowupAt ?? customer.updatedAt),
    missingFields,
    nextActionLabel: customer.cooperationDirection?.trim() || "待补充下一步动作",
    primaryReason:
      uniqueReasons[0] || "今天适合继续推进，避免客户长时间停在当前阶段。",
    recommendationReason:
      uniqueReasons.slice(0, 2).join("；") ||
      "今天适合继续推进，避免客户长时间停在当前阶段。",
    reasons: uniqueReasons,
    shouldSchedule,
    quoteRisk,
    daysSinceInteraction,
    duplicateHint,
    governanceSignals,
    suggestedActions: buildSuggestedActions({
      customer,
      missingFields,
      duplicateHint,
      quoteRisk,
      shouldSchedule,
    }),
  };
}

function matchesQuickFilter(
  recommendation: CustomerRecommendation,
  quickFilter: QuickFilterKey | null,
) {
  if (!quickFilter) {
    return true;
  }

  switch (quickFilter) {
    case "todayPriority":
      return recommendation.score >= 4;
    case "quoteRisk":
      return recommendation.quoteRisk;
    case "missingInfo":
      return recommendation.missingFields.length > 0;
    case "duplicate":
      return Boolean(recommendation.duplicateHint);
    case "maintenance":
      return recommendation.customer.ownerProtectionStatus === "PENDING_MAINTENANCE";
    case "needSchedule":
      return recommendation.shouldSchedule;
    default:
      return true;
  }
}

function stageLabel(stage: CustomerStage) {
  switch (stage) {
    case "new":
      return "新客户";
    case "contacted":
      return "已联系";
    case "following":
      return "跟进中";
    case "quoted":
      return "报价中";
    case "cooperating":
      return "合作中";
    case "paused":
      return "已停滞";
    default:
      return "待跟进";
  }
}

function stageTone(stage: CustomerStage): GovernanceTone {
  switch (stage) {
    case "cooperating":
      return "success";
    case "following":
      return "warning";
    case "quoted":
      return "accent";
    case "paused":
      return "danger";
    case "contacted":
      return "info";
    case "new":
    default:
      return "neutral";
  }
}

function priorityLabel(priority: CustomerPriority) {
  switch (priority) {
    case "urgent":
      return "紧急";
    case "high":
      return "高优先";
    default:
      return "常规";
  }
}

function quoteStatusLabel(status: CustomerQuoteStatus) {
  switch (status) {
    case "linked":
      return "已报价";
    case "waiting_reply":
      return "报价未回";
    case "none":
    default:
      return "未报价";
  }
}

function quoteStatusTone(status: CustomerQuoteStatus): GovernanceTone {
  switch (status) {
    case "linked":
      return "success";
    case "waiting_reply":
      return "danger";
    case "none":
    default:
      return "neutral";
  }
}

function scheduleStatusLabel(recommendation: CustomerRecommendation) {
  if (recommendation.shouldSchedule) {
    return "待排日程";
  }
  if (recommendation.customer._count.tasks > 0) {
    return "已排日程";
  }
  if (!recommendation.customer.cooperationDirection?.trim()) {
    return "待补动作";
  }
  return "暂未排程";
}

function scheduleStatusTone(recommendation: CustomerRecommendation): GovernanceTone {
  if (recommendation.shouldSchedule) {
    return "warning";
  }
  if (recommendation.customer._count.tasks > 0) {
    return "success";
  }
  if (!recommendation.customer.cooperationDirection?.trim()) {
    return "neutral";
  }
  return "info";
}

function ownerProtectionLabel(status: CustomerRecord["ownerProtectionStatus"]) {
  return status === "PENDING_MAINTENANCE" ? "待维护" : "保护中";
}

function ownerProtectionTone(status: CustomerRecord["ownerProtectionStatus"]): GovernanceTone {
  return status === "PENDING_MAINTENANCE" ? "warning" : "success";
}

function formatAmount(value?: string | null) {
  return value?.trim() || "--";
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function ToneBadge({
  tone,
  children,
}: {
  tone: GovernanceTone;
  children: string;
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

export function CustomerManagementPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [industries, setIndustries] = useState<IndustryGroup[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey | null>("todayPriority");
  const [sortBy, setSortBy] = useState<SortValue>("priority");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMeta() {
      try {
        const [industryResponse, userResponse] = await Promise.all([
          apiFetch<IndustryGroup[]>("/meta/industries"),
          apiFetch<UserOption[]>("/meta/users"),
        ]);

        if (cancelled) {
          return;
        }

        setIndustries(industryResponse);
        setUsers(userResponse);
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error ? requestError.message : "加载客户元数据失败",
          );
        }
      }
    }

    void loadMeta();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      setLoading(true);

      try {
        const searchParams = new URLSearchParams({
          page: "1",
          pageSize: "200",
        });

        if (searchKeyword) {
          searchParams.set("keyword", searchKeyword);
        }
        if (statusFilter) {
          searchParams.set("status", statusFilter);
        }
        if (industryFilter) {
          searchParams.set("industryGroupId", industryFilter);
        }
        if (ownerFilter) {
          searchParams.set("ownerUserId", ownerFilter);
        }

        const customerResponse = await apiFetch<CustomerListResponse>(
          `/customers?${searchParams.toString()}`,
        );

        if (cancelled) {
          return;
        }

        setCustomers(customerResponse.items);
        setCustomerTotal(customerResponse.total);
        setError("");
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "加载客户失败");
          setCustomers([]);
          setCustomerTotal(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [industryFilter, ownerFilter, searchKeyword, statusFilter]);

  const duplicateInsightMap = useMemo(() => buildDuplicateInsightMap(customers), [customers]);

  const baseRecommendations = useMemo(
    () =>
      customers.map((customer) =>
        buildRecommendation(customer, duplicateInsightMap.get(customer.id) ?? null),
      ),
    [customers, duplicateInsightMap],
  );

  const sortedRecommendations = useMemo(() => {
    const items = [...baseRecommendations];

    items.sort((left, right) => {
      switch (sortBy) {
        case "recentFollowup":
          return right.lastInteractionAt - left.lastInteractionAt || right.score - left.score;
        case "successProbability":
          return (
            (right.customer.successProbability ?? 0) -
              (left.customer.successProbability ?? 0) ||
            right.score - left.score
          );
        case "quotationTime":
          return (
            getCustomerLastQuotationAt(right.customer) -
              getCustomerLastQuotationAt(left.customer) ||
            right.score - left.score
          );
        case "createdAt":
          return (
            getTimestamp(right.customer.createdAt) -
              getTimestamp(left.customer.createdAt) ||
            right.score - left.score
          );
        case "priority":
        default:
          return (
            right.score - left.score ||
            left.lastInteractionAt - right.lastInteractionAt ||
            (right.customer.successProbability ?? 0) -
              (left.customer.successProbability ?? 0)
          );
      }
    });

    return items;
  }, [baseRecommendations, sortBy]);

  const displayedRecommendations = useMemo(
    () =>
      sortedRecommendations.filter((recommendation) =>
        matchesQuickFilter(recommendation, quickFilter),
      ),
    [quickFilter, sortedRecommendations],
  );

  useEffect(() => {
    if (!displayedRecommendations.length) {
      setSelectedCustomerId(null);
      return;
    }

    const hasSelected = displayedRecommendations.some(
      (recommendation) => recommendation.customer.id === selectedCustomerId,
    );

    if (!selectedCustomerId || !hasSelected) {
      setSelectedCustomerId(displayedRecommendations[0].customer.id);
    }
  }, [displayedRecommendations, selectedCustomerId]);

  const selectedRecommendation =
    displayedRecommendations.find(
      (recommendation) => recommendation.customer.id === selectedCustomerId,
    ) ??
    displayedRecommendations[0] ??
    null;

  const priorityCount = useMemo(
    () => baseRecommendations.filter((recommendation) => recommendation.score >= 4).length,
    [baseRecommendations],
  );

  const pendingActionCount = useMemo(
    () => baseRecommendations.filter((recommendation) => recommendation.shouldSchedule).length,
    [baseRecommendations],
  );

  const riskQuoteCount = useMemo(
    () => baseRecommendations.filter((recommendation) => recommendation.quoteRisk).length,
    [baseRecommendations],
  );

  const missingInfoCount = useMemo(
    () =>
      baseRecommendations.filter((recommendation) => recommendation.missingFields.length > 0)
        .length,
    [baseRecommendations],
  );

  const duplicateCount = useMemo(
    () => baseRecommendations.filter((recommendation) => Boolean(recommendation.duplicateHint)).length,
    [baseRecommendations],
  );

  const maintenanceCount = useMemo(
    () =>
      baseRecommendations.filter(
        (recommendation) =>
          recommendation.customer.ownerProtectionStatus === "PENDING_MAINTENANCE",
      ).length,
    [baseRecommendations],
  );

  const ownerInsights = useMemo(() => {
    const insightMap = new Map<string, OwnerInsight>();

    for (const recommendation of baseRecommendations) {
      const ownerId = recommendation.customer.owner.id;
      const current = insightMap.get(ownerId) ?? {
        ownerId,
        displayName: recommendation.customer.owner.displayName,
        total: 0,
        todayPriority: 0,
        quoteRisk: 0,
        missingInfo: 0,
        duplicate: 0,
        maintenance: 0,
        score: 0,
      };

      current.total += 1;
      current.todayPriority += Number(recommendation.score >= 4);
      current.quoteRisk += Number(recommendation.quoteRisk);
      current.missingInfo += Number(recommendation.missingFields.length > 0);
      current.duplicate += Number(Boolean(recommendation.duplicateHint));
      current.maintenance += Number(
        recommendation.customer.ownerProtectionStatus === "PENDING_MAINTENANCE",
      );
      current.score =
        current.todayPriority * 3 +
        current.quoteRisk * 3 +
        current.missingInfo * 2 +
        current.duplicate * 2 +
        current.maintenance * 2;

      insightMap.set(ownerId, current);
    }

    return Array.from(insightMap.values()).sort(
      (left, right) =>
        right.score - left.score ||
        right.total - left.total ||
        left.displayName.localeCompare(right.displayName),
    );
  }, [baseRecommendations]);

  const ownerInsightMap = useMemo(
    () => new Map(ownerInsights.map((item) => [item.ownerId, item])),
    [ownerInsights],
  );

  const quickFilterOptions = useMemo(
    () => [
      {
        value: "todayPriority" as const,
        label: "今日待推进",
        count: priorityCount,
        helper: "先处理今天最值得动的客户",
      },
      {
        value: "quoteRisk" as const,
        label: "报价未回",
        count: riskQuoteCount,
        helper: "优先拉回已经失温的报价",
      },
      {
        value: "missingInfo" as const,
        label: "待补资料",
        count: missingInfoCount,
        helper: "先补齐会卡住推进的缺口",
      },
      {
        value: "duplicate" as const,
        label: "可能重复",
        count: duplicateCount,
        helper: "先发现主记录，再决定是否合并",
      },
      {
        value: "maintenance" as const,
        label: "待维护归属",
        count: maintenanceCount,
        helper: "负责人保护期问题提前露出",
      },
      {
        value: "needSchedule" as const,
        label: "需排日程",
        count: pendingActionCount,
        helper: "机会存在，但动作还没落进日历",
      },
    ],
    [
      duplicateCount,
      maintenanceCount,
      missingInfoCount,
      pendingActionCount,
      priorityCount,
      riskQuoteCount,
    ],
  );

  const activeQuickFilter =
    quickFilterOptions.find((option) => option.value === quickFilter) ?? null;

  const industryOptions = useMemo(
    () => industries.map((industry) => ({ value: industry.id, label: industry.name })),
    [industries],
  );

  const ownerOptions = useMemo(
    () => users.map((user) => ({ value: user.id, label: user.displayName })),
    [users],
  );

  const selectedOwnerInsight = selectedRecommendation
    ? ownerInsightMap.get(selectedRecommendation.customer.owner.id)
    : null;

  function openCustomerDetail(customerId: string) {
    router.push(`/customers/${customerId}`);
  }

  function editCustomer(customerId: string) {
    router.push(`/customers/${customerId}/edit`);
  }

  function logCustomerInteraction(customerId: string) {
    router.push(`/customers/${customerId}#followup-content`);
  }

  function addCustomerToSchedule(customerId: string) {
    const recommendation = displayedRecommendations.find(
      (current) => current.customer.id === customerId,
    );
    if (!recommendation) {
      return;
    }

    router.push(
      buildScheduleCreateHref({
        customerId,
        sourceModule: "客户跟进",
        title: `跟进 ${recommendation.customer.name}`,
        nextAction: recommendation.customer.cooperationDirection?.trim() || undefined,
      }),
    );
  }

  function createCustomerQuote(customerId: string) {
    router.push(`/quotes/general?customerId=${customerId}`);
  }

  function resetFilters() {
    setSearchKeyword("");
    setStatusFilter("");
    setIndustryFilter("");
    setOwnerFilter("");
    setQuickFilter("todayPriority");
    setSortBy("priority");
  }

  return (
    <div className={cx("workspace-stack", styles.page)}>
      <section className={styles.headerPanel}>
        <div className={styles.headerCopy}>
          <span className={styles.eyebrow}>Customers</span>
          <h1>客户管理</h1>
          <p>
            继续保留高密度工作台骨架，把业务推进、资料治理、重复风险和负责人维护放进同一张表里判断。
          </p>
        </div>

        <div className={styles.headerAside}>
          <div className={styles.headerStatus}>
            <span>当前客户池</span>
            <strong>{priorityCount} 位客户需要今天处理</strong>
            <small>
              客户总数 {customerTotal} 位 · 待补资料 {missingInfoCount} 条 · 可能重复{" "}
              {duplicateCount} 条 · 待维护 {maintenanceCount} 条
            </small>
          </div>

          <div className={styles.headerActions}>
            <button
              className="button inline"
              onClick={() => router.push("/customers/new")}
              type="button"
            >
              新增客户
            </button>
            <button
              className="button secondary inline"
              onClick={() => router.push("/schedule")}
              type="button"
            >
              打开日程
            </button>
          </div>
        </div>
      </section>

      {error ? <div className="danger-text small">{error}</div> : null}

      <section className={styles.metricsStrip}>
        <article className={styles.metricCard}>
          <span>今日先推进</span>
          <strong>{priorityCount}</strong>
          <p>把今天最值得处理的客户先捞出来</p>
        </article>
        <article className={styles.metricCard}>
          <span>待补资料</span>
          <strong>{missingInfoCount}</strong>
          <p>推进前会卡住的资料缺口</p>
        </article>
        <article className={styles.metricCard}>
          <span>可能重复</span>
          <strong>{duplicateCount}</strong>
          <p>先确认主记录，再决定是否合并</p>
        </article>
        <article className={styles.metricCard}>
          <span>待维护归属</span>
          <strong>{maintenanceCount}</strong>
          <p>负责人保护期问题提前露出</p>
        </article>
      </section>

      <section className={styles.loadPanel}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionEyebrow}>负责人负载观察</span>
            <strong>先做轻量盘点，不先做复杂分配</strong>
            <p>让管理者先看谁手里压着最多待推进、待维护或结构待清理的客户。</p>
          </div>
        </div>

        <div className={styles.loadCards}>
          {ownerInsights.slice(0, 3).map((item) => (
            <article className={styles.loadCard} key={item.ownerId}>
              <div className={styles.loadCardHeader}>
                <strong>{item.displayName}</strong>
                <span>{item.total} 位客户</span>
              </div>
              <div className={styles.loadMeta}>
                <span>今日待推进 {item.todayPriority}</span>
                <span>报价风险 {item.quoteRisk}</span>
                <span>待补资料 {item.missingInfo}</span>
                <span>待维护 {item.maintenance}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.workspace}>
        <div className={styles.mainColumn}>
          <section className={styles.segmentPanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>治理队列</span>
                <strong>{activeQuickFilter?.label ?? "全部客户"}</strong>
                <p>
                  {activeQuickFilter?.helper ??
                    "先按治理对象切队列，再进入字段筛选。"}
                </p>
              </div>
            </div>

            <div className={styles.segmentTabs}>
              {quickFilterOptions.map((option) => (
                <button
                  className={cx(
                    styles.segmentTab,
                    quickFilter === option.value && styles.segmentTabActive,
                  )}
                  key={option.value}
                  onClick={() => setQuickFilter(option.value)}
                  type="button"
                >
                  <span>{option.label}</span>
                  <strong>{option.count}</strong>
                  <small>{option.helper}</small>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.tablePanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>主列表</span>
                <strong>先搜，再扫，再选中右侧处理</strong>
                <p>业务机会和治理对象放在同一条横向扫描线上，不再只看阶段和报价。</p>
              </div>
              <div className={styles.resultMeta}>
                <strong>{displayedRecommendations.length}</strong>
                <span>当前匹配客户</span>
              </div>
            </div>

            <div className={styles.filterBar}>
              <label className={styles.field}>
                <span>搜索</span>
                <input
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="搜索客户名 / 公司 / 联系人 / 手机 / 下一步动作"
                  value={searchKeyword}
                />
              </label>

              <label className={styles.field}>
                <span>客户状态</span>
                <select
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  <option value="">全部状态</option>
                  {customerStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>行业</span>
                <select
                  onChange={(event) => setIndustryFilter(event.target.value)}
                  value={industryFilter}
                >
                  <option value="">全部行业</option>
                  {industryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>负责人</span>
                <select
                  onChange={(event) => setOwnerFilter(event.target.value)}
                  value={ownerFilter}
                >
                  <option value="">全部负责人</option>
                  {ownerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.sortBar}>
                <span>排序</span>
                <div className={styles.sortButtons}>
                  {sortOptions.map((option) => (
                    <button
                      className={cx(
                        styles.sortButton,
                        sortBy === option.value && styles.sortButtonActive,
                      )}
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className={styles.resetButton}
                onClick={resetFilters}
                type="button"
              >
                清空筛选
              </button>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>客户 / 公司</th>
                    <th>阶段</th>
                    <th>治理信号</th>
                    <th>负责人</th>
                    <th>最近互动</th>
                    <th>下一步</th>
                    <th>报价 / 日程</th>
                    <th>更新时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRecommendations.length ? (
                    displayedRecommendations.map((recommendation) => {
                      const { customer } = recommendation;
                      const ownerInsight = ownerInsightMap.get(customer.owner.id);
                      const hiddenSignals = Math.max(
                        recommendation.governanceSignals.length - 2,
                        0,
                      );

                      return (
                        <tr
                          className={cx(
                            styles.tableRow,
                            selectedRecommendation?.customer.id === customer.id &&
                              styles.tableRowActive,
                          )}
                          key={customer.id}
                          onClick={() => setSelectedCustomerId(customer.id)}
                        >
                          <td>
                            <div className={styles.identityCell}>
                              <strong>{customer.name}</strong>
                              <span>
                                {customer.companyName?.trim() || "未填写企业名称"}
                              </span>
                              <small>
                                {(customer.contactName?.trim() || "联系人待补充")}
                                {" · "}
                                {(customer.mobile?.trim() || "手机待补充")}
                              </small>
                            </div>
                          </td>
                          <td>
                            <div className={styles.badgeGroup}>
                              <ToneBadge tone={stageTone(recommendation.stage)}>
                                {stageLabel(recommendation.stage)}
                              </ToneBadge>
                              {recommendation.priority !== "normal" ? (
                                <ToneBadge
                                  tone={
                                    recommendation.priority === "urgent"
                                      ? "danger"
                                      : "warning"
                                  }
                                >
                                  {priorityLabel(recommendation.priority)}
                                </ToneBadge>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <div className={styles.signalStack}>
                              <div className={styles.badgeGroup}>
                                {recommendation.governanceSignals
                                  .slice(0, 2)
                                  .map((signal) => (
                                    <ToneBadge key={signal.label} tone={signal.tone}>
                                      {signal.label}
                                    </ToneBadge>
                                  ))}
                                {hiddenSignals ? (
                                  <span className={styles.moreSignal}>
                                    +{hiddenSignals} 项
                                  </span>
                                ) : null}
                              </div>
                              <small className={styles.signalText}>
                                {recommendation.governanceSignals[0]?.detail ||
                                  recommendation.primaryReason}
                              </small>
                            </div>
                          </td>
                          <td>
                            <div className={styles.ownerCell}>
                              <strong>{customer.owner.displayName}</strong>
                              <span>
                                待推进 {ownerInsight?.todayPriority ?? 0} · 待维护{" "}
                                {ownerInsight?.maintenance ?? 0}
                              </span>
                            </div>
                          </td>
                          <td>{recommendation.lastInteractionLabel}</td>
                          <td className={styles.nextActionCell}>
                            {recommendation.nextActionLabel}
                          </td>
                          <td>
                            <div className={styles.stateStack}>
                              <ToneBadge tone={quoteStatusTone(recommendation.quoteStatus)}>
                                {quoteStatusLabel(recommendation.quoteStatus)}
                              </ToneBadge>
                              <ToneBadge tone={scheduleStatusTone(recommendation)}>
                                {scheduleStatusLabel(recommendation)}
                              </ToneBadge>
                            </div>
                          </td>
                          <td>{formatDateLabel(customer.updatedAt)}</td>
                          <td>
                            <div
                              className={styles.tableActions}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                className={styles.inlineAction}
                                onClick={() => openCustomerDetail(customer.id)}
                                type="button"
                              >
                                详情
                              </button>
                              <button
                                className={styles.inlineActionGhost}
                                onClick={() => logCustomerInteraction(customer.id)}
                                type="button"
                              >
                                记互动
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className={styles.emptyState} colSpan={9}>
                        {loading
                          ? "正在加载客户数据..."
                          : "当前筛选条件下没有匹配客户，建议切换治理队列或清空字段后重新搜索。"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className={styles.sideRail}>
          <section className={styles.inspectorPanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>当前处置面板</span>
                <strong>{selectedRecommendation?.customer.name ?? "请选择客户"}</strong>
                <p>右侧不再讲长篇故事，只回答这条客户现在该怎么处理。</p>
              </div>
            </div>

            {selectedRecommendation ? (
              <div className={styles.inspectorBody}>
                <div className={styles.inspectorSummary}>
                  <div className={styles.badgeGroup}>
                    <ToneBadge tone={stageTone(selectedRecommendation.stage)}>
                      {stageLabel(selectedRecommendation.stage)}
                    </ToneBadge>
                    <ToneBadge tone={quoteStatusTone(selectedRecommendation.quoteStatus)}>
                      {quoteStatusLabel(selectedRecommendation.quoteStatus)}
                    </ToneBadge>
                    <ToneBadge
                      tone={ownerProtectionTone(
                        selectedRecommendation.customer.ownerProtectionStatus,
                      )}
                    >
                      {ownerProtectionLabel(
                        selectedRecommendation.customer.ownerProtectionStatus,
                      )}
                    </ToneBadge>
                  </div>
                  <strong className={styles.summaryTitle}>
                    {selectedRecommendation.primaryReason}
                  </strong>
                  <p>{selectedRecommendation.recommendationReason}</p>
                </div>

                <div className={styles.detailGrid}>
                  <article>
                    <span>公司</span>
                    <strong>
                      {selectedRecommendation.customer.companyName?.trim() ||
                        "未填写企业名称"}
                    </strong>
                  </article>
                  <article>
                    <span>联系人</span>
                    <strong>
                      {selectedRecommendation.customer.contactName?.trim() ||
                        "联系人待补充"}
                      {" · "}
                      {selectedRecommendation.customer.mobile?.trim() || "手机待补充"}
                    </strong>
                  </article>
                  <article>
                    <span>负责人负载</span>
                    <strong>
                      {selectedRecommendation.customer.owner.displayName} · 待推进{" "}
                      {selectedOwnerInsight?.todayPriority ?? 0} 条
                    </strong>
                  </article>
                  <article>
                    <span>最近互动</span>
                    <strong>{selectedRecommendation.lastInteractionLabel}</strong>
                  </article>
                  <article>
                    <span>下一步</span>
                    <strong>{selectedRecommendation.nextActionLabel}</strong>
                  </article>
                  <article>
                    <span>预估金额</span>
                    <strong>
                      {formatAmount(selectedRecommendation.customer.estimatedAmount)}
                    </strong>
                  </article>
                </div>

                <div className={styles.governancePanel}>
                  <div className={styles.panelTitleRow}>
                    <span className={styles.sectionEyebrow}>当前治理项</span>
                  </div>

                  <div className={styles.governanceList}>
                    <article className={styles.issueItem}>
                      <ToneBadge
                        tone={
                          selectedRecommendation.missingFields.length
                            ? "warning"
                            : "success"
                        }
                      >
                        {selectedRecommendation.missingFields.length
                          ? "待补资料"
                          : "资料完整"}
                      </ToneBadge>
                      <div className={styles.issueCopy}>
                        <strong>
                          {selectedRecommendation.missingFields.length
                            ? selectedRecommendation.missingFields.join("、")
                            : "当前资料结构完整"}
                        </strong>
                        <span>先看资料是否足够支撑后续推进。</span>
                      </div>
                    </article>

                    <article className={styles.issueItem}>
                      <ToneBadge
                        tone={
                          selectedRecommendation.duplicateHint ? "warning" : "success"
                        }
                      >
                        {selectedRecommendation.duplicateHint
                          ? "可能重复"
                          : "无重复提醒"}
                      </ToneBadge>
                      <div className={styles.issueCopy}>
                        <strong>
                          {selectedRecommendation.duplicateHint ||
                            "当前没有明显的重复建档风险。"}
                        </strong>
                        <span>第一版只做提醒，不在这里直接执行合并。</span>
                      </div>
                    </article>

                    <article className={styles.issueItem}>
                      <ToneBadge
                        tone={ownerProtectionTone(
                          selectedRecommendation.customer.ownerProtectionStatus,
                        )}
                      >
                        {ownerProtectionLabel(
                          selectedRecommendation.customer.ownerProtectionStatus,
                        )}
                      </ToneBadge>
                      <div className={styles.issueCopy}>
                        <strong>
                          {selectedRecommendation.customer.ownerProtectionStatus ===
                          "PENDING_MAINTENANCE"
                            ? "负责人保护期已经进入维护窗口"
                            : "当前负责人归属稳定"}
                        </strong>
                        <span>把归属风险和业务推进风险放在一起判断。</span>
                      </div>
                    </article>

                    <article className={styles.issueItem}>
                      <ToneBadge tone={scheduleStatusTone(selectedRecommendation)}>
                        {scheduleStatusLabel(selectedRecommendation)}
                      </ToneBadge>
                      <div className={styles.issueCopy}>
                        <strong>{selectedRecommendation.primaryReason}</strong>
                        <span>
                          报价 {selectedRecommendation.customer._count.quotations} 次 · 跟进{" "}
                          {selectedRecommendation.customer._count.followups} 次 · 日程{" "}
                          {selectedRecommendation.customer._count.tasks} 条
                        </span>
                      </div>
                    </article>
                  </div>
                </div>

                <div className={styles.actionSequence}>
                  <div className={styles.panelTitleRow}>
                    <span className={styles.sectionEyebrow}>建议动作顺序</span>
                  </div>
                  <ol className={styles.actionList}>
                    {selectedRecommendation.suggestedActions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ol>
                </div>

                <div className={styles.inspectorActions}>
                  <button
                    className="button inline"
                    onClick={() => editCustomer(selectedRecommendation.customer.id)}
                    type="button"
                  >
                    编辑资料
                  </button>
                  <button
                    className="button secondary inline"
                    onClick={() =>
                      logCustomerInteraction(selectedRecommendation.customer.id)
                    }
                    type="button"
                  >
                    记录互动
                  </button>
                  <button
                    className="button ghost inline"
                    onClick={() =>
                      addCustomerToSchedule(selectedRecommendation.customer.id)
                    }
                    type="button"
                  >
                    加入日程
                  </button>
                  <button
                    className="button ghost inline"
                    onClick={() =>
                      createCustomerQuote(selectedRecommendation.customer.id)
                    }
                    type="button"
                  >
                    发起报价
                  </button>
                  <button
                    className="button ghost inline"
                    onClick={() => openCustomerDetail(selectedRecommendation.customer.id)}
                    type="button"
                  >
                    打开详情
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.emptyInspector}>先在左侧表格里选择一位客户。</div>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}
