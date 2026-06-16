"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ManagementPageToolbar } from "../../../../components/management/ManagementPageToolbar";
import { useSiteBrandKey } from "../../../../components/system/SiteBrandContext";
import {
  EmptyState,
  FilterBar,
  SectionCard,
  StatusBadge,
  SummaryCard,
  type Tone,
} from "../../../../components/system/primitives";
import {
  apiFetch,
  getCurrentUser,
  hasPermission,
  type CurrentUser,
} from "../../../../lib/api";
import { useUnsavedChangesGuard } from "../../../../lib/management";

type ApprovalRuleCode =
  | "DISCOUNT"
  | "LOW_PRICE"
  | "EXPORT_QUOTATION"
  | "CUSTOMER_TRANSFER";

type CrmRulesConfig = {
  defaultProtectionMonths: number;
  maxProtectionMonths: number;
  expiredOwnerLabel: string;
  expiredVisibilityScope: "TEAM" | "DEPARTMENT" | "ALL_SALES";
  claimRequiresFreshFollowup: boolean;
  claimFollowupValidDays: number;
  claimRequiresApproval: boolean;
  claimApprovalRoleCode: string;
  transferRequiresApproval: boolean;
  transferResetsProtection: boolean;
  transferReasonRequired: boolean;
  allowProtectionExtension: boolean;
  extensionRequiresApproval: boolean;
  extensionApprovalRoleCode: string;
  superAdminBypassApproval: boolean;
};

type ApprovalRuleRecord = {
  id: string;
  code: ApprovalRuleCode;
  name: string;
  description?: string | null;
  enabled: boolean;
  configJson: Record<string, unknown>;
  updatedAt: string;
  updatedBy?: { name: string; roleName: string } | null;
};

type ApprovalRulesResponse = {
  rules: ApprovalRuleRecord[];
  crmRules: {
    configJson: CrmRulesConfig;
    updatedAt?: string | null;
    updatedBy?: { name: string; roleName: string } | null;
  };
  roleOptions: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  flowPreview: Array<{
    code: string;
    title: string;
    description: string;
  }>;
  crmFlowPreview: Array<{
    code: string;
    title: string;
    description: string;
  }>;
};

type PendingApprovalItem = {
  id: string;
  type: string;
  targetType: string;
  targetId: string;
  status: string;
  title: string;
  summary?: string | null;
  requiredRoleCode?: string | null;
  createdAt: string;
  decidedAt?: string | null;
  decisionRemark?: string | null;
  requester: {
    id: string;
    name: string;
    roleName: string;
  };
  actor?: {
    id: string;
    name: string;
    roleName: string;
  } | null;
  quotation?: {
    id: string;
    quotationNo: string;
    customerName: string;
    approvalStatus?: string | null;
    exportApprovalStatus?: string | null;
  } | null;
  customer?: {
    id: string;
    customerName: string;
    companyName?: string | null;
    ownerName?: string | null;
    ownerProtectedUntil?: string | null;
  } | null;
};

type PendingApprovalsResponse = {
  items: PendingApprovalItem[];
  recentItems: PendingApprovalItem[];
};

type RuleDraft = {
  enabled: boolean;
  configJson: Record<string, unknown>;
};

const pendingTypeOptions = [
  { value: "all", label: "全部审批" },
  { value: "DISCOUNT", label: "折扣审批" },
  { value: "LOW_PRICE", label: "低价保护" },
  { value: "EXPORT_QUOTATION", label: "报价导出" },
  { value: "CUSTOMER_CLAIM", label: "负责客户申请" },
  { value: "CUSTOMER_PROTECTION_EXTENSION", label: "延长保护期" },
  { value: "CUSTOMER_TRANSFER", label: "客户转移" },
] as const;

const expiredVisibilityOptions = [
  { value: "TEAM", label: "仅团队可见" },
  { value: "DEPARTMENT", label: "仅部门可见" },
  { value: "ALL_SALES", label: "全部销售可见" },
] as const;

function formatDate(value?: string | null) {
  if (!value) {
    return "未保存";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "未记录";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatDay(value?: string | null) {
  if (!value) {
    return "未记录";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function isSameCalendarDay(value: string, reference = new Date()) {
  const target = new Date(value);

  return (
    target.getFullYear() === reference.getFullYear() &&
    target.getMonth() === reference.getMonth() &&
    target.getDate() === reference.getDate()
  );
}

function boolString(value: boolean) {
  return String(value);
}

function sameConfig(left: Record<string, unknown>, right: Record<string, unknown>) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function latestUpdatedAt(values: Array<string | null | undefined>) {
  return values
    .filter(Boolean)
    .map((item) => new Date(item as string).getTime())
    .reduce((latest, current) => Math.max(latest, current), 0);
}

function approvalTypeLabel(type: string) {
  switch (type) {
    case "DISCOUNT":
      return "折扣审批";
    case "LOW_PRICE":
      return "低价保护";
    case "EXPORT_QUOTATION":
      return "报价导出";
    case "CUSTOMER_CLAIM":
      return "负责客户申请";
    case "CUSTOMER_PROTECTION_EXTENSION":
      return "延长保护期";
    case "CUSTOMER_TRANSFER":
      return "客户转移";
    default:
      return type;
  }
}

function approvalTypeTone(type: string): Tone {
  switch (type) {
    case "EXPORT_QUOTATION":
      return "danger";
    case "LOW_PRICE":
    case "CUSTOMER_TRANSFER":
      return "warning";
    case "DISCOUNT":
    case "CUSTOMER_CLAIM":
    case "CUSTOMER_PROTECTION_EXTENSION":
      return "success";
    default:
      return "neutral";
  }
}

function approvalStatusLabel(status?: string) {
  switch (status) {
    case "APPROVED":
      return "已通过";
    case "REJECTED":
      return "已驳回";
    case "NOT_REQUIRED":
      return "免审批";
    default:
      return "待审批";
  }
}

function approvalStatusTone(status?: string): Tone {
  switch (status) {
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "danger";
    case "NOT_REQUIRED":
      return "neutral";
    default:
      return "warning";
  }
}

function approvalTargetLabel(item: PendingApprovalItem) {
  if (item.quotation) {
    return `${item.quotation.quotationNo} · ${item.quotation.customerName}`;
  }

  if (item.customer?.customerName) {
    return item.customer.customerName;
  }

  return item.targetId;
}

function approvalTargetMeta(item: PendingApprovalItem) {
  if (item.targetType === "Quotation") {
    const statusParts = [item.quotation?.approvalStatus, item.quotation?.exportApprovalStatus].filter(
      Boolean,
    );

    return (
      item.summary ||
      (statusParts.length ? `当前状态：${statusParts.join(" / ")}` : "进入报价详情继续处理审批。")
    );
  }

  return (
    [
      item.customer?.companyName || null,
      item.customer?.ownerName ? `当前负责人：${item.customer.ownerName}` : null,
      item.customer?.ownerProtectedUntil
        ? `保护至 ${formatDay(item.customer.ownerProtectedUntil)}`
        : null,
      item.summary || null,
    ].filter(Boolean).join(" · ") || "进入客户详情继续处理审批。"
  );
}

function approvalTargetHref(item: PendingApprovalItem) {
  if (item.targetType === "Quotation") {
    return `/quotations/${item.quotation?.id ?? item.targetId}`;
  }

  if (item.targetType === "Customer") {
    return `/customers/${item.customer?.id ?? item.targetId}`;
  }

  return null;
}

function approvalSearchText(item: PendingApprovalItem) {
  return [
    approvalTypeLabel(item.type),
    item.title,
    item.summary,
    item.requiredRoleCode,
    item.requester.name,
    item.requester.roleName,
    item.quotation?.quotationNo,
    item.quotation?.customerName,
    item.customer?.customerName,
    item.customer?.companyName,
    item.customer?.ownerName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function canReviewPendingApproval(item: PendingApprovalItem, user: CurrentUser | null) {
  if (!user) {
    return false;
  }

  if (user.roleCode === "SUPER_ADMIN") {
    return true;
  }

  if (!item.requiredRoleCode) {
    return true;
  }

  return item.requiredRoleCode === user.roleCode;
}

function buildPendingApprovalReviewRequest(
  item: PendingApprovalItem,
  decision: "approve" | "reject",
  remark?: string,
) {
  if (item.targetType === "Quotation") {
    return {
      path: `/quotations/${item.quotation?.id ?? item.targetId}/review-approval`,
      body: {
        type: item.type === "EXPORT_QUOTATION" ? "export" : "discount",
        decision,
        ...(remark ? { remark } : {}),
      },
    };
  }

  if (item.targetType === "Customer") {
    const customerApprovalType =
      item.type === "CUSTOMER_PROTECTION_EXTENSION"
        ? "extension"
        : item.type === "CUSTOMER_TRANSFER"
          ? "transfer"
          : "claim";

    return {
      path: `/customers/${item.customer?.id ?? item.targetId}/review-approval`,
      body: {
        type: customerApprovalType,
        decision,
        ...(remark ? { remark } : {}),
      },
    };
  }

  return null;
}

function quoteRuleSummary(rule: ApprovalRuleRecord, draft?: RuleDraft) {
  const current = draft ?? { enabled: rule.enabled, configJson: rule.configJson };

  switch (rule.code) {
    case "DISCOUNT": {
      const autoApproveMax = Number(current.configJson.autoApproveMax ?? 5);
      const managerApproveMax = Number(current.configJson.managerApproveMax ?? 15);
      return `${autoApproveMax}% 内自动通过，${autoApproveMax}% - ${managerApproveMax}% 走主管审批，更高折扣交管理员处理。`;
    }
    case "LOW_PRICE": {
      const ratio = Number(current.configJson.belowSuggestedPriceRatio ?? 10);
      return `低于建议售价 ${ratio}% 时触发低价保护，管理员可继续校验价格风险。`;
    }
    case "EXPORT_QUOTATION": {
      const scope = String(current.configJson.scope ?? "discount_sensitive_only");
      const approverRoleCode = String(current.configJson.approverRoleCode ?? "SALES_MANAGER");
      return `${scope} 范围内的正式报价需由 ${approverRoleCode} 审批后才允许导出。`;
    }
    case "CUSTOMER_TRANSFER": {
      const requiresManagerApproval = Boolean(
        current.configJson.requiresManagerApproval ?? true,
      );
      const approverRoleCode = String(current.configJson.approverRoleCode ?? "SALES_MANAGER");
      const notifyAfterTransfer = Boolean(current.configJson.notifyAfterTransfer ?? true);
      return requiresManagerApproval
        ? `负责人转移默认进入 ${approverRoleCode} 审批，${notifyAfterTransfer ? "转移后自动通知相关成员。" : "转移后不自动发送通知。"}`
        : `负责人转移可直接生效，${notifyAfterTransfer ? "系统仍会同步发送通知。" : "系统不会自动通知成员。"} `;
    }
    default:
      return rule.description || "当前规则已启用。";
  }
}

function crmProtectionSummary(config: CrmRulesConfig) {
  const visibility =
    expiredVisibilityOptions.find((item) => item.value === config.expiredVisibilityScope)?.label ??
    config.expiredVisibilityScope;
  return `默认保护期 ${config.defaultProtectionMonths} 个月，最高可延长到 ${config.maxProtectionMonths} 个月，到期后由 ${visibility} 查看待维护客户。`;
}

function crmClaimSummary(config: CrmRulesConfig) {
  const followupText = config.claimRequiresFreshFollowup
    ? `需补 ${config.claimFollowupValidDays} 天内跟进`
    : "不强制补近期待跟进";
  const approvalText = config.claimRequiresApproval
    ? `进入 ${config.claimApprovalRoleCode} 审批`
    : "申请后可直接生效";
  return `${followupText}，负责客户申请 ${approvalText}。`;
}

function crmTransferSummary(
  config: CrmRulesConfig,
  transferRuleEnabled: boolean,
  transferRequiresManagerApproval: boolean,
) {
  const extensionText = config.allowProtectionExtension
    ? config.extensionRequiresApproval
      ? `延长保护期需由 ${config.extensionApprovalRoleCode} 审批`
      : "延长保护期可直接生效"
    : "当前不允许延长保护期";
  const transferApprovalText =
    config.transferRequiresApproval && transferRuleEnabled && transferRequiresManagerApproval
      ? "负责人转移会进入审批"
      : "负责人转移可按当前配置直接完成";
  const resetText = config.transferResetsProtection ? "转移后重置保护期" : "转移后沿用原保护期";
  const reasonText = config.transferReasonRequired ? "必须填写转移原因。" : "转移原因可选填写。";
  return `${extensionText}，${transferApprovalText}，${resetText}，${reasonText}`;
}

function ManagementBrandApprovalsUnavailable() {
  return (
    <div className="workspace-stack management-approvals-page">
      <ManagementPageToolbar
        note="大爱归心站点当前不启用客户、报价审批规则，这个入口保留为兼容提示页。"
        actions={
          <>
            <Link className="button secondary inline" href="/management/members">
              查看成员
            </Link>
            <Link className="button inline" href="/notifications">
              查看通知
            </Link>
          </>
        }
        meta={[
          { label: "当前站点", value: "大爱归心协同" },
          { label: "模块状态", value: "未启用", tone: "neutral" satisfies Tone },
          { label: "建议动作", value: "成员 / 通知 / 日志" },
        ]}
      />

      <SummaryCard
        title="当前站点不使用审批规则"
        description="大爱归心管理平台目前聚焦周报、本月目标、班表、成员、通知与系统日志，不承接客户、报价和审批流程。"
        actions={<StatusBadge tone="neutral">兼容入口</StatusBadge>}
      >
        <div className="management-summary-banner__stats">
          <div className="management-summary-banner__stat">
            <span>当前能力</span>
            <strong>内部协同</strong>
          </div>
          <div className="management-summary-banner__stat">
            <span>建议去向</span>
            <strong>成员与通知</strong>
          </div>
          <div className="management-summary-banner__stat">
            <span>日志复核</span>
            <strong>仍可继续</strong>
          </div>
        </div>
      </SummaryCard>

      <SectionCard
        title="建议前往"
        description="如果你原本是从旧链接进入这里，可以继续从下面这些大爱归心站点内的管理入口处理内部协同工作。"
      >
        <div className="stack compact-gap">
          <Link className="button inline" href="/management/members">
            进入成员管理
          </Link>
          <Link className="button secondary inline" href="/management/roles">
            进入角色权限
          </Link>
          <Link className="button secondary inline" href="/notifications">
            打开通知中心
          </Link>
          <Link className="button secondary inline" href="/management/logs">
            查看操作日志
          </Link>
        </div>
      </SectionCard>

      <EmptyState
        title="这个站点没有审批队列"
        description="如果后续大爱归心真的需要内部审批，会另外定义专属流程，而不是沿用客户、报价审批规则。"
      />
    </div>
  );
}

export default function ManagementApprovalsPage() {
  const brandKey = useSiteBrandKey();

  if (brandKey === "management") {
    return <ManagementBrandApprovalsUnavailable />;
  }

  return <ManagementApprovalsPageInner />;
}

function ManagementApprovalsPageInner() {
  const [data, setData] = useState<ApprovalRulesResponse | null>(null);
  const [pendingData, setPendingData] = useState<PendingApprovalsResponse | null>(null);
  const [drafts, setDrafts] = useState<Record<string, RuleDraft>>({});
  const [crmDraft, setCrmDraft] = useState<CrmRulesConfig | null>(null);
  const [pendingType, setPendingType] = useState("all");
  const [pendingKeyword, setPendingKeyword] = useState("");
  const [recentType, setRecentType] = useState("all");
  const [recentKeyword, setRecentKeyword] = useState("");
  const [recentStatus, setRecentStatus] = useState("all");
  const [recentOnlyMine, setRecentOnlyMine] = useState(false);
  const [recentOnlyToday, setRecentOnlyToday] = useState(false);
  const [error, setError] = useState("");
  const [pendingError, setPendingError] = useState("");
  const [message, setMessage] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const [pendingLoading, setPendingLoading] = useState(true);
  const [reviewingKey, setReviewingKey] = useState("");
  const deferredPendingKeyword = useDeferredValue(pendingKeyword.trim().toLowerCase());
  const deferredRecentKeyword = useDeferredValue(recentKeyword.trim().toLowerCase());
  const currentUser = useMemo(() => getCurrentUser(), []);
  const canApprove = hasPermission(currentUser, "action.quotation.approve");
  const canReject = hasPermission(currentUser, "action.quotation.reject");

  async function loadPendingApprovals() {
    try {
      setPendingLoading(true);
      const response = await apiFetch<PendingApprovalsResponse>("/management/pending-approvals");
      setPendingData(response);
      setPendingError("");
    } catch (requestError) {
      setPendingError(
        requestError instanceof Error ? requestError.message : "待审批队列加载失败",
      );
    } finally {
      setPendingLoading(false);
    }
  }

  async function loadRules() {
    try {
      const response = await apiFetch<ApprovalRulesResponse>("/management/approval-rules");
      setData(response);
      setDrafts(
        Object.fromEntries(
          response.rules.map((rule) => [
            rule.id,
            {
              enabled: rule.enabled,
              configJson: rule.configJson,
            },
          ]),
        ),
      );
      setCrmDraft(response.crmRules.configJson);
      setError("");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "审批规则加载失败",
      );
    }
  }

  useEffect(() => {
    void loadRules();
    void loadPendingApprovals();
  }, []);

  const pendingItems = pendingData?.items ?? [];
  const recentReviewedItems = pendingData?.recentItems ?? [];
  const quoteRules = data?.rules ?? [];
  const discountRule = quoteRules.find((rule) => rule.code === "DISCOUNT");
  const lowPriceRule = quoteRules.find((rule) => rule.code === "LOW_PRICE");
  const exportRule = quoteRules.find((rule) => rule.code === "EXPORT_QUOTATION");
  const transferRule = quoteRules.find((rule) => rule.code === "CUSTOMER_TRANSFER");
  const transferRuleDraft = transferRule ? drafts[transferRule.id] : null;

  const transferRuleEnabled = transferRuleDraft?.enabled ?? transferRule?.enabled ?? true;
  const transferRequiresManagerApproval =
    typeof transferRuleDraft?.configJson.requiresManagerApproval === "boolean"
      ? Boolean(transferRuleDraft.configJson.requiresManagerApproval)
      : typeof transferRule?.configJson.requiresManagerApproval === "boolean"
        ? Boolean(transferRule.configJson.requiresManagerApproval)
        : true;

  const customerOwnershipFlowNeedsApproval = Boolean(
    crmDraft &&
      (crmDraft.claimRequiresApproval ||
        crmDraft.extensionRequiresApproval ||
        (crmDraft.transferRequiresApproval &&
          transferRuleEnabled &&
          transferRequiresManagerApproval)),
  );

  const quoteDirty = useMemo(
    () =>
      quoteRules.some((rule) => {
        const draft = drafts[rule.id];
        if (!draft) {
          return false;
        }

        return draft.enabled !== rule.enabled || !sameConfig(draft.configJson, rule.configJson);
      }),
    [drafts, quoteRules],
  );

  const crmDirty = useMemo(() => {
    if (!data || !crmDraft) {
      return false;
    }

    return JSON.stringify(crmDraft) !== JSON.stringify(data.crmRules.configJson);
  }, [crmDraft, data]);

  const dirty = quoteDirty || crmDirty;

  useUnsavedChangesGuard(dirty);

  const quoteEnabledCount = useMemo(
    () =>
      quoteRules.filter((rule) => {
        const draft = drafts[rule.id];
        return draft ? draft.enabled : rule.enabled;
      }).length,
    [drafts, quoteRules],
  );

  const crmApprovalCount = crmDraft
    ? Number(crmDraft.claimRequiresApproval) +
      Number(crmDraft.allowProtectionExtension && crmDraft.extensionRequiresApproval) +
      Number(crmDraft.transferRequiresApproval && transferRuleEnabled && transferRequiresManagerApproval)
    : 0;

  const pendingQuoteCount = useMemo(
    () => pendingItems.filter((item) => item.targetType === "Quotation").length,
    [pendingItems],
  );

  const pendingCustomerCount = useMemo(
    () => pendingItems.filter((item) => item.targetType === "Customer").length,
    [pendingItems],
  );

  const filteredPendingItems = useMemo(
    () =>
      pendingItems.filter((item) => {
        if (pendingType !== "all" && item.type !== pendingType) {
          return false;
        }

        if (deferredPendingKeyword && !approvalSearchText(item).includes(deferredPendingKeyword)) {
          return false;
        }

        return true;
      }),
    [deferredPendingKeyword, pendingItems, pendingType],
  );

  const filteredRecentReviewedItems = useMemo(
    () =>
      recentReviewedItems.filter((item) => {
        if (recentType !== "all" && item.type !== recentType) {
          return false;
        }

        if (recentStatus !== "all" && item.status !== recentStatus) {
          return false;
        }

        if (deferredRecentKeyword && !approvalSearchText(item).includes(deferredRecentKeyword)) {
          return false;
        }

        if (recentOnlyMine && item.actor?.id !== currentUser?.id) {
          return false;
        }

        if (recentOnlyToday && (!item.decidedAt || !isSameCalendarDay(item.decidedAt))) {
          return false;
        }

        return true;
      }),
    [
      currentUser?.id,
      deferredRecentKeyword,
      recentOnlyMine,
      recentOnlyToday,
      recentReviewedItems,
      recentStatus,
      recentType,
    ],
  );

  const recentApprovedCount = useMemo(
    () => recentReviewedItems.filter((item) => item.status === "APPROVED").length,
    [recentReviewedItems],
  );

  const recentRejectedCount = useMemo(
    () => recentReviewedItems.filter((item) => item.status === "REJECTED").length,
    [recentReviewedItems],
  );

  const recentMineCount = useMemo(
    () =>
      currentUser
        ? recentReviewedItems.filter((item) => item.actor?.id === currentUser.id).length
        : 0,
    [currentUser, recentReviewedItems],
  );

  const recentTodayCount = useMemo(
    () =>
      recentReviewedItems.filter((item) => item.decidedAt && isSameCalendarDay(item.decidedAt))
        .length,
    [recentReviewedItems],
  );

  const pendingSummary = useMemo(() => {
    if (pendingLoading && !pendingData) {
      return "正在整理待审批队列，准备把报价与客户归属审批集中到这里处理。";
    }

    if (pendingError && !pendingItems.length) {
      return "待审批队列暂时加载失败，下方规则配置仍可继续调整。";
    }

    if (!pendingItems.length) {
      return "当前没有待审批事项，可以先整理下方报价审批和 CRM 归属规则。";
    }

    return `当前共有 ${pendingItems.length} 条待审批，其中报价相关 ${pendingQuoteCount} 条、客户归属 ${pendingCustomerCount} 条。先从队列进入具体客户或报价处理，再回来微调规则。`;
  }, [
    pendingCustomerCount,
    pendingData,
    pendingError,
    pendingItems,
    pendingLoading,
    pendingQuoteCount,
  ]);

  const pendingSummaryClassName =
    pendingError && !pendingItems.length
      ? "management-summary-banner management-summary-banner--danger"
      : pendingItems.length
        ? "management-summary-banner management-summary-banner--warning"
        : "management-summary-banner management-summary-banner--success";

  const currentRuleSummary = useMemo(() => {
    if (!data || !crmDraft) {
      return "正在整理当前报价审批与客户归属规则。";
    }

    if (dirty) {
      return `当前有 ${quoteDirty ? "报价审批" : ""}${quoteDirty && crmDirty ? "和" : ""}${crmDirty ? " CRM 归属" : ""} 配置尚未保存，请先确认再提交。`;
    }

    const latest = latestUpdatedAt([
      ...data.rules.map((rule) => rule.updatedAt),
      data.crmRules.updatedAt,
    ]);

    return `当前已启用 ${quoteEnabledCount} 条报价审批规则、3 条客户归属规则，最近一次修改时间为 ${latest ? formatDate(new Date(latest).toISOString()) : "未记录"}。`;
  }, [crmDirty, crmDraft, data, dirty, quoteDirty, quoteEnabledCount]);

  async function saveRule(ruleId: string, successMessage: string) {
    try {
      setSavingKey(ruleId);
      setMessage("");
      await apiFetch(`/management/approval-rules/${ruleId}`, {
        method: "PATCH",
        body: JSON.stringify(drafts[ruleId]),
      });
      await loadRules();
      setMessage(successMessage);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "审批规则保存失败",
      );
    } finally {
      setSavingKey("");
    }
  }

  async function saveAllQuoteRules() {
    if (!quoteRules.length) {
      return;
    }

    try {
      setSavingKey("QUOTE_ALL");
      setMessage("");
      await Promise.all(
        quoteRules.map((rule) =>
          apiFetch(`/management/approval-rules/${rule.id}`, {
            method: "PATCH",
            body: JSON.stringify(drafts[rule.id]),
          }),
        ),
      );
      await loadRules();
      setMessage("报价审批规则已保存");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "报价审批规则保存失败",
      );
    } finally {
      setSavingKey("");
    }
  }

  async function saveCrmRules() {
    if (!crmDraft) {
      return;
    }

    try {
      setSavingKey("CRM");
      setMessage("");
      await apiFetch("/management/crm-rules", {
        method: "PATCH",
        body: JSON.stringify({ configJson: crmDraft }),
      });
      await loadRules();
      setMessage("CRM 归属规则已保存");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "CRM 规则保存失败",
      );
    } finally {
      setSavingKey("");
    }
  }

  function handleRestoreView() {
    if (dirty && !window.confirm("当前页面有未保存修改，恢复默认视图会放弃这些更改，确定继续吗？")) {
      return;
    }

    setMessage("");
    void loadRules();
  }

  function setRuleValue(ruleId: string, key: string, value: unknown) {
    setDrafts((current) => ({
      ...current,
      [ruleId]: {
        ...current[ruleId],
        configJson: {
          ...current[ruleId]?.configJson,
          [key]: value,
        },
      },
    }));
  }

  function setRuleEnabled(ruleId: string, value: boolean) {
    setDrafts((current) => ({
      ...current,
      [ruleId]: {
        ...current[ruleId],
        enabled: value,
      },
    }));
  }

  function setCrmRuleValue<Key extends keyof CrmRulesConfig>(
    key: Key,
    value: CrmRulesConfig[Key],
  ) {
    setCrmDraft((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  }

  async function handleQueueReview(
    item: PendingApprovalItem,
    decision: "approve" | "reject",
  ) {
    if (!currentUser) {
      setPendingError("登录状态已失效，请重新登录后再处理审批。");
      return;
    }

    if (!canReviewPendingApproval(item, currentUser)) {
      setPendingError("当前角色无法直接处理这条审批。");
      return;
    }

    const actionLabel = decision === "approve" ? "通过" : "驳回";
    const title = item.title || approvalTypeLabel(item.type);
    let remark: string | undefined;

    if (decision === "reject") {
      const input = window.prompt(`请输入“${title}”的驳回备注（可留空）`, "");
      if (input === null) {
        return;
      }

      remark = input.trim() || undefined;
    }

    if (!window.confirm(`确认${actionLabel}「${title}」吗？`)) {
      return;
    }

    const request = buildPendingApprovalReviewRequest(item, decision, remark);
    if (!request) {
      setPendingError("当前事项暂不支持直接处理，请进入详情页完成审批。");
      return;
    }

    try {
      setReviewingKey(`${item.id}-${decision}`);
      setMessage("");
      setPendingError("");
      await apiFetch(request.path, {
        method: "POST",
        body: JSON.stringify(request.body),
      });
      await loadPendingApprovals();
      setMessage(decision === "approve" ? "审批已通过" : "审批已驳回");
    } catch (requestError) {
      setPendingError(
        requestError instanceof Error ? requestError.message : "审批处理失败",
      );
    } finally {
      setReviewingKey("");
    }
  }

  return (
    <div className="workspace-stack management-approvals-page">
      <ManagementPageToolbar
        note="先处理待审批队列，再确认当前生效规则并保存报价审批和 CRM 归属配置。"
        actions={
          <>
            <button
              className="button secondary inline"
              onClick={handleRestoreView}
              type="button"
            >
              恢复默认视图
            </button>
            <button
              className="button inline"
              disabled={!crmDirty || savingKey === "CRM"}
              onClick={() => void saveCrmRules()}
              type="button"
            >
              保存 CRM 规则
            </button>
          </>
        }
        meta={[
          {
            label: "待审批",
            value: `${pendingItems.length} 条待处理`,
            tone: pendingItems.length ? "warning" : "success",
          },
          { label: "报价审批", value: `${quoteEnabledCount} 条启用` },
          { label: "归属规则", value: "3 条生效" },
          {
            label: "修改状态",
            value: dirty ? "有未保存修改" : "已同步",
            tone: dirty ? "warning" : "success",
          },
        ]}
      />

      {error ? <div className="danger-text small">{error}</div> : null}
      {pendingError ? <div className="danger-text small">{pendingError}</div> : null}
      {message ? <div className="success-text small">{message}</div> : null}

      <SummaryCard
        className={pendingSummaryClassName}
        title="待审批摘要"
        description={pendingSummary}
        actions={
          pendingItems.length ? (
            <StatusBadge tone="warning">待处理 {pendingItems.length} 条</StatusBadge>
          ) : (
            <StatusBadge tone="success">当前已清空</StatusBadge>
          )
        }
      >
        <div className="management-summary-banner__stats">
          <div className="management-summary-banner__stat">
            <span>全部待处理</span>
            <strong>{pendingItems.length}</strong>
          </div>
          <div className="management-summary-banner__stat">
            <span>报价相关</span>
            <strong>{pendingQuoteCount}</strong>
          </div>
          <div className="management-summary-banner__stat">
            <span>客户归属</span>
            <strong>{pendingCustomerCount}</strong>
          </div>
          <div className="management-summary-banner__stat">
            <span>当前筛选</span>
            <strong>{filteredPendingItems.length}</strong>
          </div>
        </div>
      </SummaryCard>

      <SectionCard
        title="待审批执行台"
        description="这里先看所有待处理审批，再按事项进入客户或报价详情完成通过 / 驳回。下面的规则区继续负责审批路径配置。"
      >
        <FilterBar
          actions={
            <button
              className="button ghost inline"
              onClick={() => {
                setPendingType("all");
                setPendingKeyword("");
              }}
              type="button"
            >
              清空筛选
            </button>
          }
        >
          <div className="field filter-field">
            <label htmlFor="pending-approval-type">审批类型</label>
            <select
              id="pending-approval-type"
              onChange={(event) => setPendingType(event.target.value)}
              value={pendingType}
            >
              {pendingTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field filter-field--wide">
            <label htmlFor="pending-approval-keyword">关键词</label>
            <input
              id="pending-approval-keyword"
              onChange={(event) => setPendingKeyword(event.target.value)}
              placeholder="标题 / 客户 / 报价单号 / 申请人"
              value={pendingKeyword}
            />
          </div>
        </FilterBar>

        {pendingLoading && !pendingData ? (
          <EmptyState
            title="正在加载待审批事项"
            description="审批队列正在同步，请稍候。"
          />
        ) : filteredPendingItems.length ? (
          <div className="table-wrap management-table-wrap">
            <table className="dense-table management-table">
              <thead>
                <tr>
                  <th>审批事项</th>
                  <th>业务对象</th>
                  <th>申请人</th>
                  <th>审批角色</th>
                  <th>提交时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredPendingItems.map((item) => {
                  const href = approvalTargetHref(item);
                  const canReviewItem = canReviewPendingApproval(item, currentUser);

                  return (
                    <tr className="management-table__row" key={item.id}>
                      <td>
                        <div className="stack compact-gap">
                          <div className="table-actions">
                            <strong>{item.title || approvalTypeLabel(item.type)}</strong>
                            <StatusBadge tone={approvalTypeTone(item.type)}>
                              {approvalTypeLabel(item.type)}
                            </StatusBadge>
                          </div>
                          <div className="small muted">
                            {item.summary || "进入详情页后继续完成审批处理。"}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="stack compact-gap">
                          <strong>{approvalTargetLabel(item)}</strong>
                          <div className="small muted">{approvalTargetMeta(item)}</div>
                        </div>
                      </td>
                      <td>
                        <div className="stack compact-gap">
                          <strong>{item.requester.name}</strong>
                          <div className="small muted">{item.requester.roleName}</div>
                        </div>
                      </td>
                      <td>
                        <StatusBadge tone={item.requiredRoleCode ? "warning" : "neutral"}>
                          {item.requiredRoleCode || "未指定角色"}
                        </StatusBadge>
                      </td>
                      <td>{formatDateTime(item.createdAt)}</td>
                      <td>
                        <div className="table-actions">
                          {href ? (
                            <Link className="button secondary inline" href={href}>
                              {item.targetType === "Quotation" ? "进入报价处理" : "进入客户处理"}
                            </Link>
                          ) : null}
                          {canApprove && canReviewItem ? (
                            <button
                              className="button inline"
                              disabled={reviewingKey === `${item.id}-approve`}
                              onClick={() => void handleQueueReview(item, "approve")}
                              type="button"
                            >
                              {reviewingKey === `${item.id}-approve` ? "处理中..." : "审批通过"}
                            </button>
                          ) : null}
                          {canReject && canReviewItem ? (
                            <button
                              className="button ghost inline"
                              disabled={reviewingKey === `${item.id}-reject`}
                              onClick={() => void handleQueueReview(item, "reject")}
                              type="button"
                            >
                              {reviewingKey === `${item.id}-reject` ? "处理中..." : "驳回申请"}
                            </button>
                          ) : null}
                          {!href && !canReviewItem ? (
                            <span className="small muted">暂无处理入口</span>
                          ) : null}
                        </div>
                        {!canReviewItem && item.requiredRoleCode ? (
                          <div className="small muted">需 {item.requiredRoleCode} 角色处理</div>
                        ) : !canApprove && !canReject ? (
                          <div className="small muted">当前账号只有查看权限</div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={pendingItems.length ? "当前筛选下没有待审批事项" : "当前没有待审批事项"}
            description={
              pendingItems.length
                ? "换一个审批类型或关键词试试看，或者清空筛选后查看全部队列。"
                : "当报价审批或客户归属申请进入待处理状态后，这里会自动汇总。"
            }
            action={
              pendingItems.length ? (
                <button
                  className="button inline"
                  onClick={() => {
                    setPendingType("all");
                    setPendingKeyword("");
                  }}
                  type="button"
                >
                  查看全部待审批
                </button>
              ) : null
            }
          />
        )}
      </SectionCard>

      <SectionCard
        title="最近处理记录"
        description="审批刚处理完不会立刻失联，这里会保留最近通过或驳回的事项、处理人和备注，方便管理层回看。"
      >
        {recentReviewedItems.length ? (
          <div className="stack">
            <FilterBar
              actions={
                <button
                  className="button ghost inline"
                  onClick={() => {
                    setRecentType("all");
                    setRecentKeyword("");
                    setRecentStatus("all");
                    setRecentOnlyMine(false);
                    setRecentOnlyToday(false);
                  }}
                  type="button"
                >
                  清空筛选
                </button>
              }
            >
              <div className="field filter-field">
                <label htmlFor="recent-approval-type">审批类型</label>
                <select
                  id="recent-approval-type"
                  onChange={(event) => setRecentType(event.target.value)}
                  value={recentType}
                >
                  {pendingTypeOptions.map((option) => (
                    <option key={`recent-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field filter-field">
                <label htmlFor="recent-approval-status">处理结果</label>
                <select
                  id="recent-approval-status"
                  onChange={(event) => setRecentStatus(event.target.value)}
                  value={recentStatus}
                >
                  <option value="all">全部结果</option>
                  <option value="APPROVED">只看已通过</option>
                  <option value="REJECTED">只看已驳回</option>
                </select>
              </div>
              <div className="field filter-field--wide">
                <label htmlFor="recent-approval-keyword">关键词</label>
                <input
                  id="recent-approval-keyword"
                  onChange={(event) => setRecentKeyword(event.target.value)}
                  placeholder="标题 / 客户 / 报价单号 / 处理人 / 提交人"
                  value={recentKeyword}
                />
              </div>
              <label className="toggle-row management-filter-toggle">
                <input
                  checked={recentOnlyMine}
                  onChange={(event) => setRecentOnlyMine(event.target.checked)}
                  type="checkbox"
                />
                <span>只看我处理的</span>
              </label>
              <label className="toggle-row management-filter-toggle">
                <input
                  checked={recentOnlyToday}
                  onChange={(event) => setRecentOnlyToday(event.target.checked)}
                  type="checkbox"
                />
                <span>只看今天处理</span>
              </label>
            </FilterBar>

            <div className="management-summary-banner__stats">
              <div className="management-summary-banner__stat">
                <span>最近记录</span>
                <strong>{recentReviewedItems.length}</strong>
              </div>
              <div className="management-summary-banner__stat">
                <span>已通过</span>
                <strong>{recentApprovedCount}</strong>
              </div>
              <div className="management-summary-banner__stat">
                <span>已驳回</span>
                <strong>{recentRejectedCount}</strong>
              </div>
              <div className="management-summary-banner__stat">
                <span>我处理的</span>
                <strong>{recentMineCount}</strong>
              </div>
              <div className="management-summary-banner__stat">
                <span>今天处理</span>
                <strong>{recentTodayCount}</strong>
              </div>
              <div className="management-summary-banner__stat">
                <span>当前筛选</span>
                <strong>{filteredRecentReviewedItems.length}</strong>
              </div>
            </div>

            {filteredRecentReviewedItems.length ? filteredRecentReviewedItems.map((item) => {
              const href = approvalTargetHref(item);
              const actorLabel =
                item.actor?.id === currentUser?.id
                  ? "我"
                  : item.actor?.name || "系统";

              return (
                <article className="list-card management-list-card" key={`recent-${item.id}`}>
                  <div className="summary-row">
                    <div className="stack compact-gap">
                      <div className="table-actions">
                        <strong>{item.title || approvalTypeLabel(item.type)}</strong>
                        <StatusBadge tone={approvalTypeTone(item.type)}>
                          {approvalTypeLabel(item.type)}
                        </StatusBadge>
                        <StatusBadge tone={approvalStatusTone(item.status)}>
                          {approvalStatusLabel(item.status)}
                        </StatusBadge>
                      </div>
                      <div className="small muted">
                        {approvalTargetLabel(item)} · {item.requester.name} 提交 · {formatDateTime(item.createdAt)}
                      </div>
                    </div>
                    {href ? (
                      <Link className="button ghost inline" href={href}>
                        查看对象
                      </Link>
                    ) : null}
                  </div>

                  <div className="small muted">
                    {actorLabel} 于 {formatDateTime(item.decidedAt)} 处理
                    {item.actor?.roleName ? ` · ${item.actor.roleName}` : ""}
                  </div>
                  <div className="small muted">
                    审批角色：{item.requiredRoleCode || "未指定"}
                  </div>
                  <div>
                    {item.decisionRemark ? (
                      <span className="small">备注：{item.decisionRemark}</span>
                    ) : (
                      <span className="small muted">本次未填写审批备注</span>
                    )}
                  </div>
                </article>
              );
            }) : (
              <EmptyState
                title="当前筛选下没有处理记录"
                description="可以切换审批类型、关键词、结果，或取消“只看我处理的 / 只看今天处理”，回到完整历史列表。"
              />
            )}
          </div>
        ) : (
          <EmptyState
            title="还没有最近处理记录"
            description="当待审批事项被通过或驳回后，这里会自动保留最近处理结果。"
          />
        )}
      </SectionCard>

      <SummaryCard
        className="management-summary-banner"
        title="规则配置摘要"
        description={currentRuleSummary}
        actions={
          dirty ? (
            <StatusBadge tone="warning">有未保存修改</StatusBadge>
          ) : (
            <StatusBadge tone="success">规则已同步</StatusBadge>
          )
        }
      >
        <div className="management-summary-banner__stats">
          <div className="management-summary-banner__stat">
            <span>报价审批启用</span>
            <strong>{quoteEnabledCount}</strong>
          </div>
          <div className="management-summary-banner__stat">
            <span>需审批客户动作</span>
            <strong>{crmApprovalCount}</strong>
          </div>
          <div className="management-summary-banner__stat">
            <span>最近修改</span>
            <strong>
              {formatDate(
                latestUpdatedAt([
                  ...quoteRules.map((rule) => rule.updatedAt),
                  data?.crmRules.updatedAt,
                ])
                  ? new Date(
                      latestUpdatedAt([
                        ...quoteRules.map((rule) => rule.updatedAt),
                        data?.crmRules.updatedAt,
                      ]),
                    ).toISOString()
                  : undefined,
              )}
            </strong>
          </div>
        </div>
      </SummaryCard>

      {dirty ? (
        <div className="management-dirty-banner">
          <strong>有未保存修改</strong>
          <span>审批路径与 CRM 归属配置已经变更，离开页面前请先保存或恢复默认视图。</span>
        </div>
      ) : null}

      <section className="split-workspace management-page-grid approval-workspace">
        <div className="workspace-main">
          <SectionCard
            title="报价相关规则"
            description="折扣、低价、导出和客户转移这类高风险动作统一放在这里配置，先明确当前生效规则，再按需调整。"
            actions={
              <button
                className="button ghost inline"
                disabled={!quoteDirty || savingKey === "QUOTE_ALL"}
                onClick={() => void saveAllQuoteRules()}
                type="button"
              >
                保存报价规则
              </button>
            }
          >
            <div className="approval-card-grid">
              {discountRule ? (
                <article className="management-rule-card">
                  <div className="management-rule-card__header">
                    <div className="stack compact-gap">
                      <div className="summary-row">
                        <strong>折扣审批</strong>
                        <StatusBadge
                          tone={(drafts[discountRule.id]?.enabled ?? discountRule.enabled) ? "success" : "neutral"}
                        >
                          {(drafts[discountRule.id]?.enabled ?? discountRule.enabled) ? "已启用" : "未启用"}
                        </StatusBadge>
                      </div>
                      <p className="small muted">
                        {quoteRuleSummary(discountRule, drafts[discountRule.id])}
                      </p>
                    </div>
                    <label className="toggle-row">
                      <span>启用</span>
                      <input
                        checked={drafts[discountRule.id]?.enabled ?? discountRule.enabled}
                        onChange={(event) =>
                          setRuleEnabled(discountRule.id, event.target.checked)
                        }
                        type="checkbox"
                      />
                    </label>
                  </div>

                  <div className="approval-steps">
                    <div className="approval-step">
                      <strong>自动通过区间</strong>
                      <input
                        onChange={(event) =>
                          setRuleValue(
                            discountRule.id,
                            "autoApproveMax",
                            Number(event.target.value),
                          )
                        }
                        type="number"
                        value={String(
                          Number(drafts[discountRule.id]?.configJson.autoApproveMax ?? 5),
                        )}
                      />
                      <span>%</span>
                    </div>
                    <div className="approval-step">
                      <strong>一级审批上限</strong>
                      <input
                        onChange={(event) =>
                          setRuleValue(
                            discountRule.id,
                            "managerApproveMax",
                            Number(event.target.value),
                          )
                        }
                        type="number"
                        value={String(
                          Number(drafts[discountRule.id]?.configJson.managerApproveMax ?? 15),
                        )}
                      />
                      <span>%</span>
                    </div>
                    <div className="approval-step accent">
                      <strong>当前路径</strong>
                      <span>{quoteRuleSummary(discountRule, drafts[discountRule.id])}</span>
                    </div>
                  </div>

                  <div className="management-rule-card__footer">
                    <span className="small muted">
                      最近修改：{formatDate(discountRule.updatedAt)} · {discountRule.updatedBy?.name || "系统默认"}
                    </span>
                    <button
                      className="button inline"
                      disabled={savingKey === discountRule.id}
                      onClick={() => void saveRule(discountRule.id, "折扣审批规则已保存")}
                      type="button"
                    >
                      保存折扣规则
                    </button>
                  </div>
                </article>
              ) : null}

              {lowPriceRule ? (
                <article className="management-rule-card">
                  <div className="management-rule-card__header">
                    <div className="stack compact-gap">
                      <div className="summary-row">
                        <strong>低价保护</strong>
                        <StatusBadge
                          tone={(drafts[lowPriceRule.id]?.enabled ?? lowPriceRule.enabled) ? "warning" : "neutral"}
                        >
                          {(drafts[lowPriceRule.id]?.enabled ?? lowPriceRule.enabled) ? "已启用" : "未启用"}
                        </StatusBadge>
                      </div>
                      <p className="small muted">
                        {quoteRuleSummary(lowPriceRule, drafts[lowPriceRule.id])}
                      </p>
                    </div>
                    <label className="toggle-row">
                      <span>启用</span>
                      <input
                        checked={drafts[lowPriceRule.id]?.enabled ?? lowPriceRule.enabled}
                        onChange={(event) =>
                          setRuleEnabled(lowPriceRule.id, event.target.checked)
                        }
                        type="checkbox"
                      />
                    </label>
                  </div>

                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="low-price-mode">判断方式</label>
                      <input
                        id="low-price-mode"
                        onChange={(event) =>
                          setRuleValue(lowPriceRule.id, "mode", event.target.value)
                        }
                        value={String(
                          drafts[lowPriceRule.id]?.configJson.mode ??
                            "below_suggested_price_ratio",
                        )}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="low-price-ratio">低于建议售价比例</label>
                      <input
                        id="low-price-ratio"
                        onChange={(event) =>
                          setRuleValue(
                            lowPriceRule.id,
                            "belowSuggestedPriceRatio",
                            Number(event.target.value),
                          )
                        }
                        type="number"
                        value={String(
                          Number(
                            drafts[lowPriceRule.id]?.configJson.belowSuggestedPriceRatio ?? 10,
                          ),
                        )}
                      />
                    </div>
                  </div>

                  <div className="management-rule-card__footer">
                    <span className="small muted">
                      最近修改：{formatDate(lowPriceRule.updatedAt)} · {lowPriceRule.updatedBy?.name || "系统默认"}
                    </span>
                    <button
                      className="button inline"
                      disabled={savingKey === lowPriceRule.id}
                      onClick={() => void saveRule(lowPriceRule.id, "低价保护规则已保存")}
                      type="button"
                    >
                      保存低价规则
                    </button>
                  </div>
                </article>
              ) : null}

              {exportRule ? (
                <article className="management-rule-card">
                  <div className="management-rule-card__header">
                    <div className="stack compact-gap">
                      <div className="summary-row">
                        <strong>正式报价导出审批</strong>
                        <StatusBadge
                          tone={(drafts[exportRule.id]?.enabled ?? exportRule.enabled) ? "danger" : "neutral"}
                        >
                          {(drafts[exportRule.id]?.enabled ?? exportRule.enabled) ? "已启用" : "未启用"}
                        </StatusBadge>
                      </div>
                      <p className="small muted">
                        {quoteRuleSummary(exportRule, drafts[exportRule.id])}
                      </p>
                    </div>
                    <label className="toggle-row">
                      <span>启用</span>
                      <input
                        checked={drafts[exportRule.id]?.enabled ?? exportRule.enabled}
                        onChange={(event) =>
                          setRuleEnabled(exportRule.id, event.target.checked)
                        }
                        type="checkbox"
                      />
                    </label>
                  </div>

                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="export-scope">适用范围</label>
                      <input
                        id="export-scope"
                        onChange={(event) =>
                          setRuleValue(exportRule.id, "scope", event.target.value)
                        }
                        value={String(
                          drafts[exportRule.id]?.configJson.scope ??
                            "discount_sensitive_only",
                        )}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="export-role">审批角色</label>
                      <select
                        id="export-role"
                        onChange={(event) =>
                          setRuleValue(
                            exportRule.id,
                            "approverRoleCode",
                            event.target.value,
                          )
                        }
                        value={String(
                          drafts[exportRule.id]?.configJson.approverRoleCode ??
                            "SALES_MANAGER",
                        )}
                      >
                        {data?.roleOptions.map((role) => (
                          <option key={role.id} value={role.code}>
                            {role.name} · {role.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="management-rule-card__footer">
                    <span className="small muted">
                      最近修改：{formatDate(exportRule.updatedAt)} · {exportRule.updatedBy?.name || "系统默认"}
                    </span>
                    <button
                      className="button inline"
                      disabled={savingKey === exportRule.id}
                      onClick={() => void saveRule(exportRule.id, "报价导出规则已保存")}
                      type="button"
                    >
                      保存导出规则
                    </button>
                  </div>
                </article>
              ) : null}

              {transferRule ? (
                <article className="management-rule-card">
                  <div className="management-rule-card__header">
                    <div className="stack compact-gap">
                      <div className="summary-row">
                        <strong>客户转移审批</strong>
                        <StatusBadge
                          tone={(drafts[transferRule.id]?.enabled ?? transferRule.enabled) ? "warning" : "neutral"}
                        >
                          {(drafts[transferRule.id]?.enabled ?? transferRule.enabled) ? "已启用" : "未启用"}
                        </StatusBadge>
                      </div>
                      <p className="small muted">
                        {quoteRuleSummary(transferRule, drafts[transferRule.id])}
                      </p>
                    </div>
                    <label className="toggle-row">
                      <span>启用</span>
                      <input
                        checked={drafts[transferRule.id]?.enabled ?? transferRule.enabled}
                        onChange={(event) =>
                          setRuleEnabled(transferRule.id, event.target.checked)
                        }
                        type="checkbox"
                      />
                    </label>
                  </div>

                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="transfer-manager">需要主管确认</label>
                      <select
                        id="transfer-manager"
                        onChange={(event) =>
                          setRuleValue(
                            transferRule.id,
                            "requiresManagerApproval",
                            event.target.value === "true",
                          )
                        }
                        value={String(
                          drafts[transferRule.id]?.configJson.requiresManagerApproval ?? true,
                        )}
                      >
                        <option value="true">是</option>
                        <option value="false">否</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="transfer-role">审批角色</label>
                      <select
                        id="transfer-role"
                        onChange={(event) =>
                          setRuleValue(
                            transferRule.id,
                            "approverRoleCode",
                            event.target.value,
                          )
                        }
                        value={String(
                          drafts[transferRule.id]?.configJson.approverRoleCode ??
                            transferRule.configJson.approverRoleCode ??
                            "SALES_MANAGER",
                        )}
                      >
                        {data?.roleOptions.map((role) => (
                          <option key={role.id} value={role.code}>
                            {role.name} · {role.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="transfer-notify">转移后发送通知</label>
                      <select
                        id="transfer-notify"
                        onChange={(event) =>
                          setRuleValue(
                            transferRule.id,
                            "notifyAfterTransfer",
                            event.target.value === "true",
                          )
                        }
                        value={String(
                          drafts[transferRule.id]?.configJson.notifyAfterTransfer ?? true,
                        )}
                      >
                        <option value="true">是</option>
                        <option value="false">否</option>
                      </select>
                    </div>
                  </div>

                  <div className="management-rule-card__footer">
                    <span className="small muted">
                      最近修改：{formatDate(transferRule.updatedAt)} · {transferRule.updatedBy?.name || "系统默认"}
                    </span>
                    <button
                      className="button inline"
                      disabled={savingKey === transferRule.id}
                      onClick={() => void saveRule(transferRule.id, "客户转移规则已保存")}
                      type="button"
                    >
                      保存转移规则
                    </button>
                  </div>
                </article>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title="报价审批流"
            description="先用流程化语言看系统怎么判断，再决定是否需要调整阈值和审批角色。"
          >
            <div className="flow-preview">
              <div className="flow-preview__node">销售提交报价</div>
              <div className="flow-preview__arrow">→</div>
              <div className="flow-preview__node">系统判断折扣 / 低价 / 导出条件</div>
              <div className="flow-preview__arrow">→</div>
              <div className="flow-preview__node">主管或管理员审批</div>
              <div className="flow-preview__arrow">→</div>
              <div className="flow-preview__node">审批通过后允许继续流转</div>
            </div>
            <div className="stack">
              {data?.flowPreview.map((item) => (
                <div className="list-card management-list-card" key={item.code}>
                  <strong>{item.title}</strong>
                  <div className="small muted">{item.description}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="workspace-side">
          <SectionCard
            title="CRM 客户归属规则"
            description="保护期、负责客户申请和负责人转移统一放在右侧，管理员可以直接判断当前口径是否稳定。"
            actions={
              <button
                className="button ghost inline"
                disabled={!crmDirty || savingKey === "CRM"}
                onClick={() => void saveCrmRules()}
                type="button"
              >
                保存 CRM 规则
              </button>
            }
          >
            {crmDraft ? (
              <div className="stack">
                <article className="management-rule-card">
                  <div className="management-rule-card__header">
                    <div className="stack compact-gap">
                      <div className="summary-row">
                        <strong>客户保护期基础规则</strong>
                        <StatusBadge tone="success">当前生效</StatusBadge>
                      </div>
                      <p className="small muted">{crmProtectionSummary(crmDraft)}</p>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="crm-default-months">默认保护期（月）</label>
                      <input
                        id="crm-default-months"
                        min={1}
                        onChange={(event) =>
                          setCrmRuleValue(
                            "defaultProtectionMonths",
                            Number(event.target.value),
                          )
                        }
                        type="number"
                        value={String(crmDraft.defaultProtectionMonths)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="crm-max-months">保护期上限（月）</label>
                      <input
                        id="crm-max-months"
                        min={1}
                        onChange={(event) =>
                          setCrmRuleValue(
                            "maxProtectionMonths",
                            Number(event.target.value),
                          )
                        }
                        type="number"
                        value={String(crmDraft.maxProtectionMonths)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="crm-expired-label">到期标签</label>
                      <input
                        id="crm-expired-label"
                        onChange={(event) =>
                          setCrmRuleValue("expiredOwnerLabel", event.target.value)
                        }
                        value={crmDraft.expiredOwnerLabel}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="crm-expired-scope">到期可见范围</label>
                      <select
                        id="crm-expired-scope"
                        onChange={(event) =>
                          setCrmRuleValue(
                            "expiredVisibilityScope",
                            event.target.value as CrmRulesConfig["expiredVisibilityScope"],
                          )
                        }
                        value={crmDraft.expiredVisibilityScope}
                      >
                        {expiredVisibilityOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="management-rule-card__footer">
                    <span className="small muted">
                      最近修改：{formatDate(data?.crmRules.updatedAt)} · {data?.crmRules.updatedBy?.name || "系统默认"}
                    </span>
                  </div>
                </article>

                <article className="management-rule-card">
                  <div className="management-rule-card__header">
                    <div className="stack compact-gap">
                      <div className="summary-row">
                        <strong>负责客户申请</strong>
                        <StatusBadge tone={crmDraft.claimRequiresApproval ? "warning" : "neutral"}>
                          {crmDraft.claimRequiresApproval ? "需审批" : "直接生效"}
                        </StatusBadge>
                      </div>
                      <p className="small muted">{crmClaimSummary(crmDraft)}</p>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="crm-claim-followup-required">必须有新跟进</label>
                      <select
                        id="crm-claim-followup-required"
                        onChange={(event) =>
                          setCrmRuleValue(
                            "claimRequiresFreshFollowup",
                            event.target.value === "true",
                          )
                        }
                        value={boolString(crmDraft.claimRequiresFreshFollowup)}
                      >
                        <option value="true">是</option>
                        <option value="false">否</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="crm-claim-valid-days">跟进有效期（天）</label>
                      <input
                        id="crm-claim-valid-days"
                        min={1}
                        onChange={(event) =>
                          setCrmRuleValue(
                            "claimFollowupValidDays",
                            Number(event.target.value),
                          )
                        }
                        type="number"
                        value={String(crmDraft.claimFollowupValidDays)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="crm-claim-requires-approval">需要审批</label>
                      <select
                        id="crm-claim-requires-approval"
                        onChange={(event) =>
                          setCrmRuleValue(
                            "claimRequiresApproval",
                            event.target.value === "true",
                          )
                        }
                        value={boolString(crmDraft.claimRequiresApproval)}
                      >
                        <option value="true">是</option>
                        <option value="false">否</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="crm-claim-role">审批角色</label>
                      <select
                        disabled={!crmDraft.claimRequiresApproval}
                        id="crm-claim-role"
                        onChange={(event) =>
                          setCrmRuleValue("claimApprovalRoleCode", event.target.value)
                        }
                        value={crmDraft.claimApprovalRoleCode}
                      >
                        {data?.roleOptions.map((role) => (
                          <option key={role.id} value={role.code}>
                            {role.name} · {role.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </article>

                <article className="management-rule-card">
                  <div className="management-rule-card__header">
                    <div className="stack compact-gap">
                      <div className="summary-row">
                        <strong>延长保护期与转移</strong>
                        <StatusBadge tone={customerOwnershipFlowNeedsApproval ? "warning" : "neutral"}>
                          {customerOwnershipFlowNeedsApproval ? "包含审批动作" : "当前以自动生效为主"}
                        </StatusBadge>
                      </div>
                      <p className="small muted">
                        {crmTransferSummary(
                          crmDraft,
                          transferRuleEnabled,
                          transferRequiresManagerApproval,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="crm-extension-allowed">允许延长保护期</label>
                      <select
                        id="crm-extension-allowed"
                        onChange={(event) =>
                          setCrmRuleValue(
                            "allowProtectionExtension",
                            event.target.value === "true",
                          )
                        }
                        value={boolString(crmDraft.allowProtectionExtension)}
                      >
                        <option value="true">是</option>
                        <option value="false">否</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="crm-extension-approval">延长需审批</label>
                      <select
                        id="crm-extension-approval"
                        onChange={(event) =>
                          setCrmRuleValue(
                            "extensionRequiresApproval",
                            event.target.value === "true",
                          )
                        }
                        value={boolString(crmDraft.extensionRequiresApproval)}
                      >
                        <option value="true">是</option>
                        <option value="false">否</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="crm-extension-role">延长审批角色</label>
                      <select
                        disabled={
                          !crmDraft.allowProtectionExtension ||
                          !crmDraft.extensionRequiresApproval
                        }
                        id="crm-extension-role"
                        onChange={(event) =>
                          setCrmRuleValue(
                            "extensionApprovalRoleCode",
                            event.target.value,
                          )
                        }
                        value={crmDraft.extensionApprovalRoleCode}
                      >
                        {data?.roleOptions.map((role) => (
                          <option key={role.id} value={role.code}>
                            {role.name} · {role.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="crm-super-bypass">超级管理员免审批</label>
                      <select
                        id="crm-super-bypass"
                        onChange={(event) =>
                          setCrmRuleValue(
                            "superAdminBypassApproval",
                            event.target.value === "true",
                          )
                        }
                        value={boolString(crmDraft.superAdminBypassApproval)}
                      >
                        <option value="true">是</option>
                        <option value="false">否</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="crm-transfer-approval">负责人转移需审批</label>
                      <select
                        id="crm-transfer-approval"
                        onChange={(event) =>
                          setCrmRuleValue(
                            "transferRequiresApproval",
                            event.target.value === "true",
                          )
                        }
                        value={boolString(crmDraft.transferRequiresApproval)}
                      >
                        <option value="true">是</option>
                        <option value="false">否</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="crm-transfer-reset">转移后重置保护期</label>
                      <select
                        id="crm-transfer-reset"
                        onChange={(event) =>
                          setCrmRuleValue(
                            "transferResetsProtection",
                            event.target.value === "true",
                          )
                        }
                        value={boolString(crmDraft.transferResetsProtection)}
                      >
                        <option value="true">是</option>
                        <option value="false">否</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="crm-transfer-reason">转移必须填写原因</label>
                      <select
                        id="crm-transfer-reason"
                        onChange={(event) =>
                          setCrmRuleValue(
                            "transferReasonRequired",
                            event.target.value === "true",
                          )
                        }
                        value={boolString(crmDraft.transferReasonRequired)}
                      >
                        <option value="true">是</option>
                        <option value="false">否</option>
                      </select>
                    </div>
                  </div>
                </article>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            title="客户归属流程预览"
            description="负责人申请、保护期延长与负责人转移会按右侧规则自动切换流程。"
          >
            <div className="flow-preview">
              <div className="flow-preview__node">客户到期待维护</div>
              <div className="flow-preview__arrow">→</div>
              <div className="flow-preview__node">提交负责客户申请 / 延长 / 转移</div>
              <div className="flow-preview__arrow">→</div>
              <div className="flow-preview__node">
                {customerOwnershipFlowNeedsApproval ? "进入指定审批角色" : "系统直接生效"}
              </div>
              <div className="flow-preview__arrow">→</div>
              <div className="flow-preview__node">更新负责人或保护期</div>
            </div>
            <div className="stack">
              {data?.crmFlowPreview.map((item) => (
                <div className="list-card management-list-card" key={item.code}>
                  <strong>{item.title}</strong>
                  <div className="small muted">{item.description}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </section>
    </div>
  );
}
