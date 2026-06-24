"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch, getCurrentUser } from "../../../lib/api";
import { getDaochongMobileDataSource } from "./daochongMobile.data";
import {
  adaptReadonlyAppointmentDetailToFields,
  adaptReadonlyAppointmentDetailToStatuses,
  adaptReadonlyCustomerCardBalancesToRows,
  adaptReadonlyCustomerDetailToPreferenceRows,
  adaptReadonlyCustomerDetailToProfileFields,
  adaptReadonlyCustomerDetailToServiceNoteContextFields,
  adaptReadonlyCustomerDetailToServiceNotePendingRows,
  adaptReadonlyCustomerDetailToServiceNoteReminderFields,
  adaptReadonlyCustomerDetailToServiceNoteReminderTimeline,
  adaptReadonlyCustomerDetailToServiceNoteStatuses,
  adaptReadonlyCustomerDetailToServiceHistory,
  adaptReadonlyRechargesToApprovalActionItems,
  buildReadonlyApiSnapshot,
  type DaochongRechargeApprovalActionItem,
  type DaochongReadonlyRechargeResponse,
  type DaochongReadonlyServiceNoteRecord,
  type DaochongReadonlyServiceNoteResponse,
  type DaochongReadonlyResourceDiagnosticInput,
} from "./daochongMobile.readonly-adapters";
import {
  fetchDaochongReadonlyAppointmentDetail,
  fetchDaochongReadonlyAdapterInput,
  fetchDaochongReadonlyCustomerDetail,
  fetchDaochongReadonlyHighRisk,
  getDaochongReadonlyFetchGate,
  getReadonlyFetchLoadingDiagnostics,
  isDaochongReadonlyFetchEnabled,
} from "./daochongMobile.readonly-fetch";
import {
  canOpenPage,
  daochongRoles,
  defaultRoleKey,
  getFallbackPage,
  getVisibleActions,
  hasPermission,
  roleNavItems,
} from "./daochongMobile.permissions";
import type {
  DaochongAppointment,
  DaochongFormField,
  DaochongCustomer,
  DaochongMobileSnapshot,
  DaochongMoneyRow,
  DaochongPageKey,
  DaochongPermissionGroup,
  DaochongRole,
  DaochongRoleKey,
  DaochongStat,
  DaochongStatusItem,
  DaochongTimelineItem,
  DaochongTone,
} from "./daochongMobile.types";
import styles from "./DaochongMobileApp.module.css";

const daochongDataSource = getDaochongMobileDataSource();
const initialSnapshot = daochongDataSource.getSnapshot();
const readonlyFetchGate = getDaochongReadonlyFetchGate(daochongDataSource);
const {
  activityStatuses,
  appointments,
  appointmentDetailFields,
  appointmentDetailStatuses,
  acceptanceCreateRows,
  acceptanceFields,
  acceptancePageRows,
  acceptanceReadonlyRows,
  acceptanceRoleRows,
  acceptanceStatuses,
  acceptanceTimeline,
  apiPlanBlockerRows,
  apiPlanEndpointRows,
  apiPlanFields,
  apiPlanPhaseRows,
  apiPlanPrecheckRows,
  apiPlanRiskRows,
  apiPlanSourceRows,
  apiPlanStatuses,
  apiPlanTimeline,
  approvalDecisionFields,
  approvalDetailFields,
  approvalRows,
  approvalStatuses,
  approvalTimeline,
  compensationFormFields,
  compensationRows,
  compensationStatuses,
  communicationFields,
  communicationRows,
  communicationStatuses,
  communicationTimeline,
  customerPreferenceRows,
  customerProfileFields,
  customerServiceHistory,
  customers,
  dataSourceDiagnostics,
  evidenceFields,
  evidenceRows,
  evidenceStatuses,
  evidenceTimeline,
  expenseFields,
  expenseRows,
  expenseStatuses,
  financeBonusExpenseRows,
  financeDraftFields,
  financeExceptionRows,
  financeRows,
  financeStatuses,
  financeTimeline,
  homeStats,
  homeStatuses,
  managementStatuses,
  meetingNoteFields,
  meetingNoteStatuses,
  meetingTodoRows,
  memberPermissionStatuses,
  memberRows,
  pageMeta,
  performanceRows,
  performanceStats,
  permissionGroups,
  projectFormFields,
  projectRows,
  projectStatuses,
  rechargeFields,
  rechargeRows,
  rechargeStatuses,
  serviceNoteContextFields,
  serviceNoteDryRunStatuses,
  serviceNoteFields,
  serviceNotePendingRows,
  serviceNoteReminderFields,
  serviceNoteReminderTimeline,
  serviceNoteStatuses,
  settlementDraftFields,
  settlementDraftRows,
  settlementSubmissionTimeline,
  settlementFields,
  settlementStatuses,
  teamBonusFields,
  teamBonusRows,
  teamBonusStatuses,
  todayRosterStatuses,
  weekRosterStatuses,
} = initialSnapshot;

type DaochongRuntimeData = Pick<
  DaochongMobileSnapshot,
  | "approvalDetailFields"
  | "approvalRows"
  | "approvalStatuses"
  | "approvalTimeline"
  | "customerPreferenceRows"
  | "customerProfileFields"
  | "customerServiceHistory"
  | "appointments"
  | "appointmentDetailFields"
  | "appointmentDetailStatuses"
  | "communicationFields"
  | "communicationRows"
  | "communicationStatuses"
  | "communicationTimeline"
  | "compensationFormFields"
  | "compensationRows"
  | "compensationStatuses"
  | "customers"
  | "dataSourceDiagnostics"
  | "evidenceFields"
  | "evidenceRows"
  | "evidenceStatuses"
  | "evidenceTimeline"
  | "financeBonusExpenseRows"
  | "financeDraftFields"
  | "financeExceptionRows"
  | "financeRows"
  | "financeStatuses"
  | "financeTimeline"
  | "meetingNoteFields"
  | "meetingNoteStatuses"
  | "meetingTodoRows"
  | "projectRows"
  | "rechargeFields"
  | "rechargeRows"
  | "rechargeStatuses"
  | "serviceNoteContextFields"
  | "serviceNotePendingRows"
  | "serviceNoteReminderFields"
  | "serviceNoteReminderTimeline"
  | "serviceNoteStatuses"
  | "settlementDraftFields"
  | "settlementDraftRows"
  | "settlementStatuses"
  | "todayRosterStatuses"
> & {
  customerDetailStatuses: DaochongStatusItem[];
};

const initialCustomerDetailStatuses: DaochongStatusItem[] = [
  {
    title: "客户详情只读",
    note: "尚未选择真实客户，当前显示 mock 客户档案",
    status: "回退",
    tone: "amber",
  },
];

const initialRuntimeData: DaochongRuntimeData = {
  appointments,
  appointmentDetailFields,
  appointmentDetailStatuses,
  approvalDetailFields,
  approvalRows,
  approvalStatuses,
  approvalTimeline,
  communicationFields,
  communicationRows,
  communicationStatuses,
  communicationTimeline,
  compensationFormFields,
  compensationRows,
  compensationStatuses,
  customerPreferenceRows,
  customerProfileFields,
  customerServiceHistory,
  customerDetailStatuses: initialCustomerDetailStatuses,
  customers,
  dataSourceDiagnostics,
  evidenceFields,
  evidenceRows,
  evidenceStatuses,
  evidenceTimeline,
  financeBonusExpenseRows,
  financeDraftFields,
  financeExceptionRows,
  financeRows,
  financeStatuses,
  financeTimeline,
  meetingNoteFields,
  meetingNoteStatuses,
  meetingTodoRows,
  projectRows,
  rechargeFields,
  rechargeRows,
  rechargeStatuses,
  serviceNoteContextFields,
  serviceNotePendingRows,
  serviceNoteReminderFields,
  serviceNoteReminderTimeline,
  serviceNoteStatuses,
  settlementDraftFields,
  settlementDraftRows,
  settlementStatuses,
  todayRosterStatuses,
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type DaochongServiceNoteStatus = "PENDING" | "COMPLETED";
type DaochongRechargePaymentMethod = "WECHAT" | "ALIPAY" | "BANK_TRANSFER" | "CASH" | "OTHER";

type DaochongServiceNoteFormState = {
  customerFeedback: string;
  nextSuggestion: string;
  noteStatus: DaochongServiceNoteStatus;
  preferenceLabel: string;
  preferenceNote: string;
  preferenceValue: string;
  serviceSummary: string;
};

type DaochongServiceNoteWriteContext = {
  customerId?: string;
  serviceNoteId?: string | null;
  serviceNoteStatus?: string | null;
};

type DaochongServiceNoteWriteState = {
  message: string;
  serviceNoteId?: string;
  status: "idle" | "saving" | "success" | "error";
};

type DaochongServiceNoteWriteResponse = {
  action?: "created" | "updated";
  item?: {
    id?: string;
    noteStatus?: string | null;
  };
  ok?: boolean;
  preferenceWrites?: number;
};

type DaochongRechargeFormState = {
  amount: string;
  cashAmount: string;
  cashCustodianUserId: string;
  cashPhotoAssetIds: string;
  evidenceAssetIds: string;
  paymentMethod: DaochongRechargePaymentMethod;
};

type DaochongRechargeWriteState = {
  message: string;
  rechargeId?: string;
  status: "idle" | "saving" | "success" | "error";
};

type DaochongRechargeWriteResponse = {
  action?:
    | "chengcheng_approved_pending_limeng_review"
    | "chengcheng_returned"
    | "created_pending_chengcheng_approval"
    | "limeng_returned"
    | "limeng_reviewed_confirmed";
  item?: {
    id?: string;
    rechargeStatus?: string | null;
  };
  ok?: boolean;
  safety?: {
    balanceApplied?: boolean;
    financeConfirmed?: boolean;
    wecomSent?: boolean;
  };
};

type DaochongRechargeApprovalState = {
  action?: "approve" | "return";
  message: string;
  rechargeId?: string;
  status: "idle" | "saving" | "success" | "error";
};

const initialServiceNoteFormState: DaochongServiceNoteFormState = {
  customerFeedback: "",
  nextSuggestion: "",
  noteStatus: "PENDING",
  preferenceLabel: "",
  preferenceNote: "",
  preferenceValue: "",
  serviceSummary: "",
};

const initialServiceNoteWriteState: DaochongServiceNoteWriteState = {
  message: "",
  status: "idle",
};

const initialRechargeFormState: DaochongRechargeFormState = {
  amount: "",
  cashAmount: "",
  cashCustodianUserId: "",
  cashPhotoAssetIds: "",
  evidenceAssetIds: "",
  paymentMethod: "WECHAT",
};

const initialRechargeWriteState: DaochongRechargeWriteState = {
  message: "",
  status: "idle",
};

const initialRechargeApprovalState: DaochongRechargeApprovalState = {
  message: "",
  status: "idle",
};

function isPreferredRechargeApprovalItem(item: DaochongRechargeApprovalActionItem, roleKey: DaochongRoleKey) {
  if (roleKey === "finance") return item.canLimengReview;
  if (roleKey === "chengcheng") return item.canChengchengApprove;
  return true;
}

function getPreferredRechargeApprovalId(
  items: DaochongRechargeApprovalActionItem[],
  roleKey: DaochongRoleKey,
  currentId: string | null,
) {
  const current = items.find((item) => item.id === currentId);
  if (current && isPreferredRechargeApprovalItem(current, roleKey)) {
    return current.id;
  }
  return items.find((item) => isPreferredRechargeApprovalItem(item, roleKey))?.id ?? items[0]?.id ?? null;
}

function trimOptionalText(value: string) {
  const normalized = value.trim();
  return normalized || undefined;
}

function splitRechargeIdList(value: string) {
  return Array.from(new Set(value
    .split(/[\s,，;；、]+/)
    .map((item) => item.trim())
    .filter(Boolean)));
}

function validateRechargeForm(form: DaochongRechargeFormState) {
  const amount = form.amount.trim().replace(/,/g, "");
  if (!amount) {
    return "请填写充值金额。";
  }
  if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
    return "充值金额必须大于 0，且最多两位小数。";
  }
  if (splitRechargeIdList(form.evidenceAssetIds).length === 0) {
    return "请填写至少一个收款凭证 ID。";
  }
  if (form.paymentMethod === "CASH") {
    const cashAmount = form.cashAmount.trim().replace(/,/g, "");
    if (!cashAmount) {
      return "现金充值必须填写现金金额。";
    }
    if (!/^\d+(\.\d{1,2})?$/.test(cashAmount) || Number(cashAmount) <= 0) {
      return "现金金额必须大于 0，且最多两位小数。";
    }
    if (splitRechargeIdList(form.cashPhotoAssetIds).length === 0) {
      return "现金充值必须填写现金照片 ID。";
    }
  }
  return null;
}

function getServiceNoteRecordsForWrite(response: DaochongReadonlyServiceNoteResponse | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.items ?? [];
}

function sortDateValue(value: string | null | undefined) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getLatestServiceNoteForWrite(response: DaochongReadonlyServiceNoteResponse | null | undefined) {
  return getServiceNoteRecordsForWrite(response)
    .slice()
    .sort((a, b) => sortDateValue(b.completedAt ?? b.updatedAt ?? b.createdAt ?? b.dueAt) - sortDateValue(a.completedAt ?? a.updatedAt ?? a.createdAt ?? a.dueAt))[0];
}

function buildServiceNoteFormFromRecord(record: DaochongReadonlyServiceNoteRecord | null | undefined): DaochongServiceNoteFormState {
  if (!record) return initialServiceNoteFormState;
  return {
    customerFeedback: record.customerFeedback ?? "",
    nextSuggestion: record.nextSuggestion ?? "",
    noteStatus: record.noteStatus === "COMPLETED" ? "COMPLETED" : "PENDING",
    preferenceLabel: "",
    preferenceNote: record.preferenceNote ?? "",
    preferenceValue: "",
    serviceSummary: record.serviceSummary ?? record.pendingReason ?? "",
  };
}

function buildServiceNotePreferences(form: DaochongServiceNoteFormState) {
  const preferenceLabel = form.preferenceLabel.trim();
  const preferenceValue = form.preferenceValue.trim();
  const preferenceNote = form.preferenceNote.trim();
  if (preferenceLabel && preferenceValue) {
    return [
      {
        preferenceType: "OTHER",
        preferenceLabel,
        preferenceValue,
        visibility: "SERVICE_TEAM",
      },
    ];
  }

  if (preferenceNote) {
    return [
      {
        preferenceType: "OTHER",
        preferenceLabel: "服务偏好备注",
        preferenceValue: preferenceNote,
        visibility: "SERVICE_TEAM",
      },
    ];
  }

  return undefined;
}

function validateServiceNoteForm(form: DaochongServiceNoteFormState) {
  const hasMainContent = Boolean(
    form.serviceSummary.trim()
      || form.customerFeedback.trim()
      || form.nextSuggestion.trim()
      || form.preferenceNote.trim()
      || form.preferenceValue.trim(),
  );
  if (!hasMainContent) {
    return "请至少填写本次摘要、客户反馈、下一步建议或偏好备注。";
  }

  const hasPartialPreference = Boolean(form.preferenceLabel.trim() || form.preferenceValue.trim());
  const hasCompletePreference = Boolean(form.preferenceLabel.trim() && form.preferenceValue.trim());
  if (hasPartialPreference && !hasCompletePreference && !form.preferenceNote.trim()) {
    return "偏好标签和偏好内容需要同时填写。";
  }

  return null;
}

function StatusBadge({ children, tone = "green" }: { children: string; tone?: DaochongTone }) {
  return <span className={cx(styles.status, styles[tone])}>{children}</span>;
}

function readonlyDiagnosticToStatusItem(
  title: string,
  diagnostic: DaochongReadonlyResourceDiagnosticInput,
): DaochongStatusItem {
  const labels: Record<DaochongReadonlyResourceDiagnosticInput["status"], string> = {
    disabled: "关闭",
    empty: "空数据",
    error: "失败",
    fallback: "回退",
    forbidden: "无权限",
    loading: "加载",
    success: "已读取",
  };
  const tones: Record<DaochongReadonlyResourceDiagnosticInput["status"], DaochongTone> = {
    disabled: "amber",
    empty: "amber",
    error: "rose",
    fallback: "amber",
    forbidden: "rose",
    loading: "blue",
    success: "green",
  };

  return {
    title,
    note: diagnostic.note ?? "只读详情状态",
    status: labels[diagnostic.status],
    tone: tones[diagnostic.status],
  };
}

function StatCard({ stat }: { stat: DaochongStat }) {
  return (
    <div className={styles.statCard}>
      <span>{stat.label}</span>
      <strong>{stat.value}</strong>
      <small>{stat.note}</small>
    </div>
  );
}

function StateBoard({ caption = "mock 状态", items, title }: { caption?: string; items: DaochongStatusItem[]; title: string }) {
  return (
    <section className={styles.stateBoard}>
      <div className={styles.sectionTitle}>
        <strong>{title}</strong>
        <small>{caption}</small>
      </div>
      {items.map((item) => (
        <div className={styles.stateRow} key={item.title}>
          <span>
            <strong>{item.title}</strong>
            <small>{item.note}</small>
          </span>
          <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
        </div>
      ))}
    </section>
  );
}

function MoneyList({ rows }: { rows: DaochongMoneyRow[] }) {
  return (
    <div className={styles.moneyList}>
      {rows.map((row) => (
        <div key={row.label}>
          <span>
            <strong>{row.label}</strong>
            <small>{row.note}</small>
          </span>
          <strong>{row.value}</strong>
        </div>
      ))}
    </div>
  );
}

function TimelineList({ caption = "服务记录", items, title }: { caption?: string; items: DaochongTimelineItem[]; title: string }) {
  return (
    <section className={styles.timelineBoard}>
      <div className={styles.sectionTitle}>
        <strong>{title}</strong>
        <small>{caption}</small>
      </div>
      <div className={styles.timelineList}>
        {items.map((item) => (
          <article key={`${item.meta}-${item.title}`}>
            <StatusBadge tone={item.tone}>{item.meta}</StatusBadge>
            <span>
              <strong>{item.title}</strong>
              <small>{item.note}</small>
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

function AuditList({ caption, rows, title }: { caption: string; rows: DaochongMoneyRow[]; title: string }) {
  return (
    <section className={styles.auditBoard}>
      <div className={styles.sectionTitle}>
        <strong>{title}</strong>
        <small>{caption}</small>
      </div>
      <div className={styles.auditRows}>
        {rows.map((row) => (
          <div key={row.label}>
            <span>
              <strong>{row.label}</strong>
              <small>{row.note}</small>
            </span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function FieldPreview({ fields, note, title }: { fields: DaochongFormField[]; note: string; title: string }) {
  return (
    <section className={styles.formPreview}>
      <div className={styles.sectionTitle}>
        <strong>{title}</strong>
        <small>{note}</small>
      </div>
      {fields.map((field) => (
        <label key={field.label}>
          <span>{field.label}</span>
          <input readOnly value={field.value} />
          {field.helper ? <small className={styles.fieldHint}>{field.helper}</small> : null}
        </label>
      ))}
    </section>
  );
}

function PermissionGroups({ groups }: { groups: DaochongPermissionGroup[] }) {
  return (
    <section className={styles.permissionBoard}>
      <div className={styles.sectionTitle}>
        <strong>权限包</strong>
        <small>mock 分组</small>
      </div>
      <div className={styles.permissionGrid}>
        {groups.map((group) => (
          <article key={group.title}>
            <strong>{group.title}</strong>
            <small>{group.note}</small>
            <div>
              {group.items.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AccessCard({ role }: { role: DaochongRole }) {
  return (
    <section className={styles.accessCard}>
      <span className={styles.accessMark}>灰</span>
      <strong>{role.label}视角</strong>
      <p>{role.description}</p>
      <small>当前仅为灰度 mock 权限，不代表真实登录授权。</small>
    </section>
  );
}

function NoAccess({ role, page }: { role: DaochongRole; page: DaochongPageKey }) {
  return (
    <section className={styles.emptyState}>
      <span>限</span>
      <strong>{role.label}暂不可查看「{pageMeta[page].title}」</strong>
      <p>真实开发时会由后端权限和前端入口共同控制，此处用于验证角色视角。</p>
    </section>
  );
}

function PlaceholderPage({ page, role }: { page: DaochongPageKey; role: DaochongRole }) {
  return (
    <>
      <AccessCard role={role} />
      <section className={styles.formPreview}>
        <div className={styles.sectionTitle}>
          <strong>{pageMeta[page].title}</strong>
          <small>一期骨架</small>
        </div>
        <label>
          <span>当前状态</span>
          <input readOnly value={`${pageMeta[page].subtitle} · mock 占位`} />
        </label>
        <label>
          <span>后续任务</span>
          <textarea readOnly value="下一阶段会按任务拆分接入真实字段、接口和权限校验。" />
        </label>
      </section>
    </>
  );
}

function ServiceNoteWritePanel({
  context,
  customerName,
  form,
  onChange,
  onSubmit,
  userName,
  writeState,
}: {
  context: DaochongServiceNoteWriteContext;
  customerName?: string;
  form: DaochongServiceNoteFormState;
  onChange: (patch: Partial<DaochongServiceNoteFormState>) => void;
  onSubmit: () => void;
  userName?: string;
  writeState: DaochongServiceNoteWriteState;
}) {
  const disabled = writeState.status === "saving" || !context.customerId || !userName;
  const title = context.serviceNoteId ? "更新服务纪要" : "新建服务纪要";
  const statusTone =
    writeState.status === "error"
      ? styles.writeStatusError
      : writeState.status === "success"
        ? styles.writeStatusSuccess
        : "";

  return (
    <section className={cx(styles.formPreview, styles.writePanel)} data-testid="daochong-service-note-write-panel">
      <div className={styles.sectionTitle}>
        <strong>{title}</strong>
        <small>{customerName ? `${customerName} · ${userName ?? "未登录"}` : "未选择客户"}</small>
      </div>
      <label>
        <span>本次摘要</span>
        <textarea
          data-testid="daochong-service-note-summary"
          onChange={(event) => onChange({ serviceSummary: event.target.value })}
          value={form.serviceSummary}
        />
      </label>
      <label>
        <span>客户反馈</span>
        <textarea
          onChange={(event) => onChange({ customerFeedback: event.target.value })}
          value={form.customerFeedback}
        />
      </label>
      <label>
        <span>下一步建议</span>
        <textarea
          onChange={(event) => onChange({ nextSuggestion: event.target.value })}
          value={form.nextSuggestion}
        />
      </label>
      <label>
        <span>偏好备注</span>
        <textarea
          onChange={(event) => onChange({ preferenceNote: event.target.value })}
          value={form.preferenceNote}
        />
      </label>
      <div className={styles.writeGrid}>
        <label>
          <span>偏好标签</span>
          <input
            onChange={(event) => onChange({ preferenceLabel: event.target.value })}
            value={form.preferenceLabel}
          />
        </label>
        <label>
          <span>偏好内容</span>
          <input
            onChange={(event) => onChange({ preferenceValue: event.target.value })}
            value={form.preferenceValue}
          />
        </label>
      </div>
      <label>
        <span>纪要状态</span>
        <select
          onChange={(event) => onChange({ noteStatus: event.target.value as DaochongServiceNoteStatus })}
          value={form.noteStatus}
        >
          <option value="PENDING">待补填</option>
          <option value="COMPLETED">已完成</option>
        </select>
      </label>
      <div className={styles.writeActions}>
        <button
          className={styles.primaryButton}
          data-testid="daochong-service-note-submit"
          disabled={disabled}
          onClick={onSubmit}
          type="button"
        >
          {writeState.status === "saving" ? "提交中" : title}
        </button>
        {writeState.message ? (
          <span className={cx(styles.writeStatus, statusTone)} data-testid="daochong-service-note-write-status">
            {writeState.message}
          </span>
        ) : null}
      </div>
    </section>
  );
}

function RechargeWritePanel({
  customerName,
  form,
  onChange,
  onSubmit,
  userName,
  writeState,
}: {
  customerName?: string;
  form: DaochongRechargeFormState;
  onChange: (patch: Partial<DaochongRechargeFormState>) => void;
  onSubmit: () => void;
  userName?: string;
  writeState: DaochongRechargeWriteState;
}) {
  const disabled = writeState.status === "saving" || !customerName || !userName;
  const statusTone =
    writeState.status === "error"
      ? styles.writeStatusError
      : writeState.status === "success"
        ? styles.writeStatusSuccess
        : "";

  return (
    <section className={cx(styles.formPreview, styles.writePanel)} data-testid="daochong-recharge-write-panel">
      <div className={styles.sectionTitle}>
        <strong>提交充值</strong>
        <small>{customerName ? `${customerName} · ${userName ?? "未登录"}` : "未选择客户"}</small>
      </div>
      <div className={styles.writeGrid}>
        <label>
          <span>充值金额</span>
          <input
            data-testid="daochong-recharge-amount"
            inputMode="decimal"
            onChange={(event) => onChange({ amount: event.target.value })}
            placeholder="例如 688.00"
            value={form.amount}
          />
        </label>
        <label>
          <span>付款方式</span>
          <select
            onChange={(event) => onChange({ paymentMethod: event.target.value as DaochongRechargePaymentMethod })}
            value={form.paymentMethod}
          >
            <option value="WECHAT">微信</option>
            <option value="ALIPAY">支付宝</option>
            <option value="BANK_TRANSFER">银行转账</option>
            <option value="CASH">现金</option>
            <option value="OTHER">其他</option>
          </select>
        </label>
      </div>
      <label>
        <span>收款凭证 ID</span>
        <textarea
          data-testid="daochong-recharge-evidence"
          onChange={(event) => onChange({ evidenceAssetIds: event.target.value })}
          placeholder="多个 ID 可用逗号、空格或换行分隔"
          value={form.evidenceAssetIds}
        />
        <small className={styles.fieldHint}>凭证原图仍由文件中心负责，这里只关联已有凭证。</small>
      </label>
      {form.paymentMethod === "CASH" ? (
        <>
          <div className={styles.writeGrid}>
            <label>
              <span>现金金额</span>
              <input
                inputMode="decimal"
                onChange={(event) => onChange({ cashAmount: event.target.value })}
                placeholder="例如 300.00"
                value={form.cashAmount}
              />
            </label>
            <label>
              <span>现金托管人 ID</span>
              <input
                onChange={(event) => onChange({ cashCustodianUserId: event.target.value })}
                placeholder="可选"
                value={form.cashCustodianUserId}
              />
            </label>
          </div>
          <label>
            <span>现金照片 ID</span>
            <textarea
              onChange={(event) => onChange({ cashPhotoAssetIds: event.target.value })}
              placeholder="多个现金照片 ID 可用逗号、空格或换行分隔"
              value={form.cashPhotoAssetIds}
            />
          </label>
        </>
      ) : null}
      <div className={styles.writeActions}>
        <button
          className={styles.primaryButton}
          data-testid="daochong-recharge-submit"
          disabled={disabled}
          onClick={onSubmit}
          type="button"
        >
          {writeState.status === "saving" ? "提交中" : "提交待审批充值"}
        </button>
        {writeState.message ? (
          <span className={cx(styles.writeStatus, statusTone)} data-testid="daochong-recharge-write-status">
            {writeState.message}
          </span>
        ) : null}
      </div>
    </section>
  );
}

function RechargeApprovalPanel({
  items,
  onApprove,
  onReturn,
  onReturnReasonChange,
  onSelect,
  returnReason,
  role,
  selectedId,
  writeState,
}: {
  items: DaochongRechargeApprovalActionItem[];
  onApprove: () => void;
  onReturn: () => void;
  onReturnReasonChange: (value: string) => void;
  onSelect: (id: string) => void;
  returnReason: string;
  role: DaochongRole;
  selectedId: string | null;
  writeState: DaochongRechargeApprovalState;
}) {
  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  const isChengcheng = role.key === "chengcheng";
  const isLimeng = role.key === "finance";
  const isAllowedRole = isChengcheng || isLimeng;
  const isSaving = writeState.status === "saving";
  const canApprove = Boolean(
    !isSaving &&
      ((isChengcheng && selected?.canChengchengApprove) || (isLimeng && selected?.canLimengReview)),
  );
  const canReturn = canApprove && Boolean(returnReason.trim());
  const panelTestId = isLimeng ? "daochong-recharge-limeng-panel" : "daochong-recharge-chengcheng-panel";
  const reasonTestId = isLimeng ? "daochong-recharge-limeng-return-reason" : "daochong-recharge-return-reason";
  const approveTestId = isLimeng ? "daochong-recharge-limeng-review" : "daochong-recharge-chengcheng-approve";
  const returnTestId = isLimeng ? "daochong-recharge-limeng-return" : "daochong-recharge-chengcheng-return";
  const title = isLimeng ? "立猛复核" : "程程审批";
  const hint = isLimeng
    ? "待复核充值"
    : isChengcheng
      ? "待审充值"
      : "切换程程或财务/立猛角色后操作";
  const approveLabel = isLimeng ? "复核通过" : "通过";
  const savingApproveLabel = isLimeng ? "复核中" : "通过中";
  const statusTone =
    writeState.status === "error"
      ? styles.writeStatusError
      : writeState.status === "success"
        ? styles.writeStatusSuccess
        : "";

  return (
    <section className={cx(styles.formPreview, styles.writePanel)} data-testid={panelTestId}>
      <div className={styles.sectionTitle}>
        <strong>{title}</strong>
        <small>{hint}</small>
      </div>
      <div className={styles.approvalList}>
        {items.length ? items.map((item) => (
          <button
            className={cx(styles.approvalItem, selected?.id === item.id && styles.approvalItemActive)}
            data-testid="daochong-recharge-approval-item"
            key={item.id}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            <span>
              <strong>{item.label}</strong>
              <small>{item.note}</small>
            </span>
            <span className={styles.approvalMeta}>
              <strong>{item.amount}</strong>
              <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
            </span>
          </button>
        )) : (
          <div className={styles.approvalEmpty}>暂无充值审批候选</div>
        )}
      </div>
      <label>
        <span>退回原因</span>
        <textarea
          data-testid={reasonTestId}
          disabled={!isAllowedRole || isSaving}
          onChange={(event) => onReturnReasonChange(event.target.value)}
          placeholder="退回时填写"
          value={returnReason}
        />
      </label>
      <div className={styles.approvalActions}>
        <button
          className={styles.primaryButton}
          data-testid={approveTestId}
          disabled={!canApprove}
          onClick={onApprove}
          type="button"
        >
          {isSaving && writeState.action === "approve" ? savingApproveLabel : approveLabel}
        </button>
        <button
          className={styles.returnButton}
          data-testid={returnTestId}
          disabled={!canReturn}
          onClick={onReturn}
          type="button"
        >
          {isSaving && writeState.action === "return" ? "退回中" : "退回"}
        </button>
      </div>
      {writeState.message ? (
        <span className={cx(styles.writeStatus, statusTone)} data-testid="daochong-recharge-approval-status">
          {writeState.message}
        </span>
      ) : null}
    </section>
  );
}

function renderPage(
  page: DaochongPageKey,
  role: DaochongRole,
  openPage: (page: DaochongPageKey) => void,
  openAppointment: (appointment: DaochongAppointment) => void,
  openCustomerDetail: (customer: DaochongCustomer) => void,
  rechargeApprovalPanel: ReactNode,
  rechargeWritePanel: ReactNode,
  runtimeData: DaochongRuntimeData,
  serviceNoteWritePanel: ReactNode,
) {
  if (!canOpenPage(role, page)) {
    return <NoAccess role={role} page={page} />;
  }

  if (page === "home") {
    return (
      <>
        <AccessCard role={role} />
        <div className={styles.statsGrid}>
          {homeStats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>
        {runtimeData.dataSourceDiagnostics.length > 0 ? (
          <StateBoard caption="灰度只读" items={runtimeData.dataSourceDiagnostics} title="只读接口状态" />
        ) : null}
        <StateBoard items={homeStatuses} title="今日状态提醒" />
        <StateBoard items={runtimeData.todayRosterStatuses} title="当天班表" />
        <StateBoard items={weekRosterStatuses} title="本周班表" />
        <StateBoard items={activityStatuses} title="活动视角" />
        <div className={styles.list}>
          {runtimeData.appointments.map((item) => (
            <button className={styles.appointmentCard} key={item.id ?? item.time} onClick={() => openAppointment(item)} type="button">
              <span className={styles.timePill}>{item.time}</span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.note}</small>
              </span>
              <StatusBadge tone={item.tone}>{item.action}</StatusBadge>
            </button>
          ))}
        </div>
      </>
    );
  }

  if (page === "performance") {
    return (
      <>
        <AccessCard role={role} />
        <div className={styles.statsGrid}>
          {performanceStats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>
        <MoneyList rows={performanceRows} />
        <p className={styles.disclaimer}>这里只是老师本人预估，财务最终口径以后由财务汇总确认。</p>
      </>
    );
  }

  if (page === "customers") {
    return (
      <>
        <div className={styles.searchBox}>搜索客户、手机号、项目</div>
        <div className={styles.list}>
          {runtimeData.customers.map((customer) => (
            <button
              className={styles.customerRow}
              data-testid={`daochong-customer-${customer.avatar}`}
              key={customer.id ?? customer.name}
              onClick={() => openCustomerDetail(customer)}
              type="button"
            >
              <span className={styles.avatar}>{customer.avatar}</span>
              <span>
                <strong>{customer.name}</strong>
                <small>{customer.note}</small>
              </span>
              <StatusBadge tone={customer.tone}>{customer.status}</StatusBadge>
            </button>
          ))}
        </div>
        <section className={styles.emptyState}>
          <span>空</span>
          <strong>筛选后没有客户</strong>
          <p>真实页面会保留筛选条件，并提供添加客户或清空筛选入口。</p>
        </section>
      </>
    );
  }

  if (page === "customerDetail") {
    return (
      <>
        <StateBoard caption="只读客户" items={runtimeData.customerDetailStatuses} title="客户详情只读状态" />
        <FieldPreview fields={runtimeData.customerProfileFields} note="基础资料" title="客户资料" />
        <div className={styles.settingsGrid}>
          <button data-testid="daochong-customer-recharge-button" onClick={() => openPage("recharge")} type="button">
            <strong>添加充值</strong>
            <small>截图、现金、审批</small>
          </button>
          <button onClick={() => openPage("settlement")} type="button">
            <strong>服务结算</strong>
            <small>耗卡或扣款</small>
          </button>
          <button onClick={() => openPage("evidence")} type="button">
            <strong>充值凭证</strong>
            <small>原图和复核</small>
          </button>
          <button onClick={() => openPage("serviceNote")} type="button">
            <strong>补填纪要</strong>
            <small>候选记录和偏好</small>
          </button>
        </div>
        <TimelineList caption="CRM 跟进、报价、任务" items={runtimeData.customerServiceHistory} title="客户记录" />
        <MoneyList rows={runtimeData.customerPreferenceRows} />
        <StateBoard
          items={[
            { title: "服务前提醒", note: "老师进入预约详情时优先展示个人爱好和禁忌", status: "展示", tone: "green" },
            { title: "纪要同步", note: "每次服务纪要完成后自动沉淀到客户档案", status: "同步", tone: "blue" },
          ]}
          title="客户档案规则"
        />
      </>
    );
  }

  if (page === "approval") {
    return (
      <>
        <AccessCard role={role} />
        <StateBoard items={runtimeData.approvalStatuses} title="耗卡审批状态" />
        <FieldPreview fields={runtimeData.approvalDetailFields} note="审批详情" title="耗卡审批详情" />
        <MoneyList rows={runtimeData.approvalRows} />
        <FieldPreview fields={approvalDecisionFields} note="退回补充" title="审批操作字段" />
        <TimelineList items={runtimeData.approvalTimeline} title="审批流转记录" />
        <div className={styles.menuGrid}>
          <button onClick={() => openPage("settlement")} type="button">
            <strong>查看结算草稿</strong>
            <small>金额、优惠和推荐奖金</small>
          </button>
          <button onClick={() => openPage("evidence")} type="button">
            <strong>查看凭证</strong>
            <small>扣款截图和原图复核</small>
          </button>
        </div>
      </>
    );
  }

  if (page === "settlement") {
    return (
      <>
        <AccessCard role={role} />
        <FieldPreview fields={settlementFields} note="提交前校验" title="服务结算表单" />
        <FieldPreview fields={runtimeData.settlementDraftFields} note="草稿预览" title="结算草稿字段" />
        <MoneyList rows={runtimeData.settlementDraftRows} />
        <StateBoard items={runtimeData.settlementStatuses} title="结算规则" />
        <TimelineList items={settlementSubmissionTimeline} title="结算提交链路" />
        <div className={styles.menuGrid}>
          <button onClick={() => openPage("evidence")} type="button">
            <strong>查看扣款凭证</strong>
            <small>原图、权限和退回记录</small>
          </button>
        </div>
        <section className={styles.emptyState}>
          <span>图</span>
          <strong>扣款截图预览区</strong>
          <p>真实页面会在这里显示上传原图、放大查看和二次复核入口。</p>
        </section>
      </>
    );
  }

  if (page === "recharge") {
    return (
      <>
        <AccessCard role={role} />
        {rechargeWritePanel}
        {rechargeApprovalPanel}
        <FieldPreview fields={runtimeData.rechargeFields} note="添加充值" title="客户充值表单" />
        <MoneyList rows={runtimeData.rechargeRows} />
        <StateBoard items={runtimeData.rechargeStatuses} title="充值审批规则" />
        <div className={styles.menuGrid}>
          <button onClick={() => openPage("evidence")} type="button">
            <strong>查看充值凭证</strong>
            <small>收款截图、现金照片、复核链路</small>
          </button>
        </div>
        <section className={styles.emptyState}>
          <span>现</span>
          <strong>现金照片和收款截图预览区</strong>
          <p>真实页面会在这里显示现金实物照片、收款截图和程程到立猛的复核记录。</p>
        </section>
      </>
    );
  }

  if (page === "evidence") {
    return (
      <>
        <AccessCard role={role} />
        <FieldPreview fields={runtimeData.evidenceFields} note="统一凭证模型" title="凭证详情" />
        <MoneyList rows={runtimeData.evidenceRows} />
        <TimelineList items={runtimeData.evidenceTimeline} title="凭证流转记录" />
        <StateBoard items={runtimeData.evidenceStatuses} title="凭证权限和复核" />
        <section className={styles.emptyState}>
          <span>原</span>
          <strong>原图查看区</strong>
          <p>真实页面会展示缩略图、原图预览、下载权限和每次审批复核记录。</p>
        </section>
      </>
    );
  }

  if (page === "serviceNote") {
    return (
      <>
        <AccessCard role={role} />
        <FieldPreview fields={runtimeData.serviceNoteContextFields} note="关联服务" title="补填上下文" />
        {serviceNoteWritePanel}
        <FieldPreview fields={serviceNoteFields} note="可补填" title="服务纪要" />
        <MoneyList rows={runtimeData.serviceNotePendingRows} />
        <FieldPreview fields={runtimeData.serviceNoteReminderFields} note="企业微信 dry-run" title="12 小时提醒卡片" />
        <StateBoard items={runtimeData.serviceNoteStatuses} title="纪要提醒规则" />
        <TimelineList items={runtimeData.serviceNoteReminderTimeline} title="补填和提醒链路" />
        <StateBoard items={serviceNoteDryRunStatuses} title="dry-run 边界" />
      </>
    );
  }

  if (page === "appointment") {
    return (
      <>
        <AccessCard role={role} />
        <FieldPreview
          fields={runtimeData.appointmentDetailFields}
          note="预约详情"
          title="预约信息"
        />
        <StateBoard items={runtimeData.appointmentDetailStatuses} title="预约规则" />
      </>
    );
  }

  if (page === "finance") {
    return (
      <>
        <AccessCard role={role} />
        <MoneyList rows={runtimeData.financeRows} />
        <FieldPreview fields={runtimeData.financeDraftFields} note="月度草稿" title="财务汇总草稿" />
        <MoneyList rows={runtimeData.financeBonusExpenseRows} />
        <MoneyList rows={runtimeData.financeExceptionRows} />
        <div className={styles.menuGrid}>
          <button onClick={() => openPage("evidence")} type="button">
            <strong>凭证详情</strong>
            <small>充值、耗卡、报销统一查看</small>
          </button>
          <button onClick={() => openPage("expense")} type="button">
            <strong>报销申请</strong>
            <small>附件、金额和异常</small>
          </button>
          <button onClick={() => openPage("bonus")} type="button">
            <strong>团队奖金</strong>
            <small>原因、金额和归集</small>
          </button>
        </div>
        <StateBoard items={runtimeData.financeStatuses} title="财务汇总状态" />
        <TimelineList items={runtimeData.financeTimeline} title="财务归集链路" />
      </>
    );
  }

  if (page === "expense") {
    return (
      <>
        <AccessCard role={role} />
        <FieldPreview fields={expenseFields} note="报销申请" title="报销字段" />
        <MoneyList rows={expenseRows} />
        <StateBoard items={expenseStatuses} title="报销规则" />
        <div className={styles.menuGrid}>
          <button onClick={() => openPage("finance")} type="button">
            <strong>返回财务汇总</strong>
            <small>查看月度草稿</small>
          </button>
          <button onClick={() => openPage("evidence")} type="button">
            <strong>查看附件凭证</strong>
            <small>原图和退回记录</small>
          </button>
        </div>
      </>
    );
  }

  if (page === "bonus") {
    return (
      <>
        <AccessCard role={role} />
        <FieldPreview fields={teamBonusFields} note="程程添加" title="团队奖金字段" />
        <MoneyList rows={teamBonusRows} />
        <StateBoard items={teamBonusStatuses} title="团队奖金规则" />
        <div className={styles.menuGrid}>
          <button onClick={() => openPage("finance")} type="button">
            <strong>进入财务汇总</strong>
            <small>确认归集状态</small>
          </button>
        </div>
      </>
    );
  }

  if (page === "communication") {
    return (
      <>
        <AccessCard role={role} />
        <FieldPreview fields={runtimeData.communicationFields} note="跨项目协作" title="项目沟通字段" />
        <MoneyList rows={runtimeData.communicationRows} />
        <StateBoard items={runtimeData.communicationStatuses} title="项目沟通规则" />
        <FieldPreview fields={runtimeData.meetingNoteFields} note="会议纪要" title="会议纪要字段" />
        <MoneyList rows={runtimeData.meetingTodoRows} />
        <StateBoard items={runtimeData.meetingNoteStatuses} title="会议纪要规则" />
        <TimelineList items={runtimeData.communicationTimeline} title="沟通归档链路" />
        <div className={styles.menuGrid}>
          <button onClick={() => openPage("customers")} type="button">
            <strong>查看关联客户</strong>
            <small>资料、服务记录和偏好</small>
          </button>
          <button onClick={() => openPage("serviceNote")} type="button">
            <strong>补服务纪要</strong>
            <small>同步客户档案</small>
          </button>
        </div>
      </>
    );
  }

  if (page === "acceptance") {
    return (
      <>
        <AccessCard role={role} />
        <FieldPreview fields={acceptanceFields} note="一期验收口径" title="灰度验收信息" />
        <AuditList caption="页面范围" rows={acceptancePageRows} title="全部页面清单" />
        <AuditList caption="角色入口" rows={acceptanceRoleRows} title="权限视角清单" />
        <AuditList caption="+ 创建" rows={acceptanceCreateRows} title="创建面板清单" />
        <AuditList caption="只读优先" rows={acceptanceReadonlyRows} title="接口对照清单" />
        <StateBoard caption="上线前检查" items={acceptanceStatuses} title="一期验收状态" />
        <TimelineList caption="验收链路" items={acceptanceTimeline} title="灰度到真实接入" />
        <div className={styles.menuGrid}>
          <button onClick={() => openPage("settings")} type="button">
            <strong>返回管理设置</strong>
            <small>项目、成员和提点</small>
          </button>
          <button onClick={() => openPage("finance")} type="button">
            <strong>查看财务口径</strong>
            <small>草稿、凭证和异常</small>
          </button>
          <button onClick={() => openPage("communication")} type="button">
            <strong>查看项目沟通</strong>
            <small>光的家园协作</small>
          </button>
          <button onClick={() => openPage("projects")} type="button">
            <strong>查看项目设置</strong>
            <small>价格、时长和耗卡</small>
          </button>
          <button onClick={() => openPage("apiPlan")} type="button">
            <strong>接口接入顺序</strong>
            <small>只读批次和风险</small>
          </button>
        </div>
      </>
    );
  }

  if (page === "apiPlan") {
    return (
      <>
        <AccessCard role={role} />
        <FieldPreview fields={apiPlanFields} note="只读优先" title="接口接入原则" />
        <AuditList caption="批次顺序" rows={apiPlanPhaseRows} title="接入批次" />
        <AuditList caption="代码预检" rows={apiPlanPrecheckRows} title="第一批预检" />
        <AuditList caption="现有来源" rows={apiPlanSourceRows} title="可用接口来源" />
        <AuditList caption="接口分组" rows={apiPlanEndpointRows} title="只读端点计划" />
        <AuditList caption="暂不接入" rows={apiPlanBlockerRows} title="缺口和阻断" />
        <AuditList caption="风险控制" rows={apiPlanRiskRows} title="验收门槛" />
        <StateBoard caption="接入状态" items={apiPlanStatuses} title="接口保护状态" />
        <TimelineList caption="接入链路" items={apiPlanTimeline} title="只读到真实开发" />
        <div className={styles.menuGrid}>
          <button onClick={() => openPage("acceptance")} type="button">
            <strong>返回灰度验收</strong>
            <small>页面、角色和入口</small>
          </button>
          <button onClick={() => openPage("projects")} type="button">
            <strong>第一批项目</strong>
            <small>项目设置只读</small>
          </button>
          <button onClick={() => openPage("customers")} type="button">
            <strong>客户只读</strong>
            <small>档案和服务记录</small>
          </button>
          <button onClick={() => openPage("finance")} type="button">
            <strong>财务后置</strong>
            <small>草稿和异常</small>
          </button>
        </div>
      </>
    );
  }

  if (page === "settings") {
    const settingItems = [
      { page: "members" as const, label: "成员权限", note: "程程添加管理员", permission: "manageMembers" as const },
      { page: "projects" as const, label: "项目设置", note: "价格、时长、耗卡", permission: "manageProjects" as const },
      { page: "compensation" as const, label: "提点奖金", note: "底薪、提点、福利", permission: "manageCompensation" as const },
      { page: "finance" as const, label: "财务汇总", note: "已审凭证和工资", permission: "viewFinanceSummary" as const },
      { page: "acceptance" as const, label: "灰度验收", note: "页面、角色、接口", permission: "manageProjects" as const },
      { page: "apiPlan" as const, label: "接口顺序", note: "只读批次、风险", permission: "manageProjects" as const },
    ].filter((item) => hasPermission(role, item.permission));

    return (
      <>
        <AccessCard role={role} />
        <StateBoard items={managementStatuses} title="管理设置入口" />
        <div className={styles.settingsGrid}>
          {settingItems.map((item) => (
            <button data-testid={`daochong-menu-${item.page}`} key={item.page} onClick={() => openPage(item.page)} type="button">
              <strong>{item.label}</strong>
              <small>{item.note}</small>
            </button>
          ))}
        </div>
      </>
    );
  }

  if (page === "members") {
    return (
      <>
        <AccessCard role={role} />
        <MoneyList rows={memberRows} />
        <PermissionGroups groups={permissionGroups} />
        <StateBoard items={memberPermissionStatuses} title="成员管理规则" />
      </>
    );
  }

  if (page === "projects") {
    return (
      <>
        <AccessCard role={role} />
        <MoneyList rows={runtimeData.projectRows} />
        <FieldPreview fields={projectFormFields} note="编辑样式" title="项目配置字段" />
        <StateBoard items={projectStatuses} title="项目规则" />
      </>
    );
  }

  if (page === "compensation") {
    return (
      <>
        <AccessCard role={role} />
        <MoneyList rows={runtimeData.compensationRows} />
        <FieldPreview fields={runtimeData.compensationFormFields} note="工资口径" title="薪酬配置字段" />
        <StateBoard items={runtimeData.compensationStatuses} title="薪酬规则" />
      </>
    );
  }

  if (page === "profile") {
    const managementItems = [
      { page: "recharge" as const, label: "充值复核", permission: "approveRecharge" as const },
      { page: "evidence" as const, label: "凭证详情", permission: "viewEvidence" as const },
      { page: "approval" as const, label: "耗卡审批", permission: "approveConsumption" as const },
      { page: "settings" as const, label: "管理设置", permission: "manageProjects" as const },
      { page: "finance" as const, label: "财务汇总", permission: "viewFinanceSummary" as const },
      { page: "members" as const, label: "成员权限", permission: "manageMembers" as const },
      { page: "acceptance" as const, label: "灰度验收", permission: "manageProjects" as const },
      { page: "apiPlan" as const, label: "接口顺序", permission: "manageProjects" as const },
    ].filter((item) => hasPermission(role, item.permission));

    return (
      <>
        <AccessCard role={role} />
        <StateBoard items={managementStatuses} title="下一阶段管理入口" />
        <div className={styles.menuGrid}>
          {managementItems.length > 0 ? (
            managementItems.map((item) => (
              <button data-testid={`daochong-menu-${item.page}`} key={item.page} onClick={() => openPage(item.page)} type="button">
                {item.label}
              </button>
            ))
          ) : (
            <span>当前角色暂无管理入口</span>
          )}
        </div>
      </>
    );
  }

  return <PlaceholderPage page={page} role={role} />;
}

export function DaochongMobileApp({ grayEnabled }: { grayEnabled: boolean }) {
  const [activeRoleKey, setActiveRoleKey] = useState<DaochongRoleKey>(defaultRoleKey);
  const [runtimeData, setRuntimeData] = useState<DaochongRuntimeData>(initialRuntimeData);
  const activeRole = useMemo(
    () => daochongRoles.find((role) => role.key === activeRoleKey) ?? daochongRoles[0],
    [activeRoleKey],
  );
  const [activePage, setActivePage] = useState<DaochongPageKey>(getFallbackPage(activeRole));
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<DaochongAppointment | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id?: string; name: string } | null>(null);
  const [serviceNoteForm, setServiceNoteForm] = useState<DaochongServiceNoteFormState>(initialServiceNoteFormState);
  const [serviceNoteWriteContext, setServiceNoteWriteContext] = useState<DaochongServiceNoteWriteContext>({});
  const [serviceNoteWriteState, setServiceNoteWriteState] = useState<DaochongServiceNoteWriteState>(initialServiceNoteWriteState);
  const [rechargeForm, setRechargeForm] = useState<DaochongRechargeFormState>(initialRechargeFormState);
  const [rechargeWriteState, setRechargeWriteState] = useState<DaochongRechargeWriteState>(initialRechargeWriteState);
  const [rechargeApprovalItems, setRechargeApprovalItems] = useState<DaochongRechargeApprovalActionItem[]>([]);
  const [selectedRechargeApprovalId, setSelectedRechargeApprovalId] = useState<string | null>(null);
  const [rechargeReturnReason, setRechargeReturnReason] = useState("");
  const [rechargeApprovalState, setRechargeApprovalState] = useState<DaochongRechargeApprovalState>(initialRechargeApprovalState);
  const currentUser = getCurrentUser();

  function applyRechargeApprovalCandidates(response: DaochongReadonlyRechargeResponse | null | undefined) {
    const items = adaptReadonlyRechargesToApprovalActionItems(response);
    setRechargeApprovalItems(items);
    setSelectedRechargeApprovalId((current) => {
      return getPreferredRechargeApprovalId(items, activeRole.key, current);
    });
  }

  function applyCustomerDetailResult(
    customer: { id?: string; name: string },
    result: Awaited<ReturnType<typeof fetchDaochongReadonlyCustomerDetail>>,
  ) {
    const {
      data,
      diagnostic,
      customerCardBalances,
      customerCardBalancesDiagnostic,
      customerPreferences,
      customerPreferencesDiagnostic,
      serviceNotes,
      serviceNotesDiagnostic,
      wecomReminderDryRuns,
      wecomReminderDryRunsDiagnostic,
    } = result;
    const detailRows = adaptReadonlyCustomerDetailToPreferenceRows(data, customerPreferenceRows, customerPreferences);
    const latestServiceNote = getLatestServiceNoteForWrite(serviceNotes);
    setServiceNoteWriteContext({
      customerId: customer.id,
      serviceNoteId: latestServiceNote?.id ?? null,
      serviceNoteStatus: latestServiceNote?.noteStatus ?? null,
    });
    setServiceNoteForm(buildServiceNoteFormFromRecord(latestServiceNote));
    setRuntimeData((current) => ({
      ...current,
      customerPreferenceRows: adaptReadonlyCustomerCardBalancesToRows(customerCardBalances, detailRows),
      customerProfileFields: adaptReadonlyCustomerDetailToProfileFields(data, customerProfileFields),
      customerServiceHistory: adaptReadonlyCustomerDetailToServiceHistory(data, customerServiceHistory),
      serviceNoteContextFields: adaptReadonlyCustomerDetailToServiceNoteContextFields(data, serviceNoteContextFields, serviceNotes),
      serviceNotePendingRows: adaptReadonlyCustomerDetailToServiceNotePendingRows(data, serviceNotePendingRows, serviceNotes),
      serviceNoteReminderFields: adaptReadonlyCustomerDetailToServiceNoteReminderFields(
        data,
        serviceNoteReminderFields,
        serviceNotes,
        wecomReminderDryRuns,
      ),
      serviceNoteReminderTimeline: adaptReadonlyCustomerDetailToServiceNoteReminderTimeline(
        data,
        serviceNoteReminderTimeline,
        serviceNotes,
        wecomReminderDryRuns,
      ),
      serviceNoteStatuses: adaptReadonlyCustomerDetailToServiceNoteStatuses(
        data,
        serviceNoteStatuses,
        serviceNotes,
        customerPreferences,
        wecomReminderDryRuns,
      ),
      customerDetailStatuses: [
        readonlyDiagnosticToStatusItem(`${customer.name}客户详情`, diagnostic),
        readonlyDiagnosticToStatusItem("服务纪要只读", serviceNotesDiagnostic),
        readonlyDiagnosticToStatusItem("企微 dry-run 只读", wecomReminderDryRunsDiagnostic),
        readonlyDiagnosticToStatusItem("客户偏好只读", customerPreferencesDiagnostic),
        readonlyDiagnosticToStatusItem("卡项余额只读", customerCardBalancesDiagnostic),
      ],
    }));
  }

  function applyHighRiskResult(result: Awaited<ReturnType<typeof fetchDaochongReadonlyHighRisk>>) {
    const nextSnapshot = buildReadonlyApiSnapshot(
      initialSnapshot,
      {
        bonusExpenseItemResponse: result.bonusExpenseItems,
        compensationRuleResponse: result.compensationRules,
        consumptionApprovalResponse: result.consumptionApprovals,
        evidenceAssetResponse: result.evidenceAssets,
        financeEvidenceExceptionResponse: result.financeEvidenceExceptions,
        financeSummaryResponse: result.financeSummary,
        meetingNoteResponse: result.meetingNotes,
        projectCommunicationResponse: result.projectCommunications,
        rechargeResponse: result.recharges,
        settlementDraftResponse: result.settlementDrafts,
      },
      result.diagnostics,
    );
    applyRechargeApprovalCandidates(result.recharges);
    setRuntimeData((current) => ({
      ...current,
      approvalDetailFields: nextSnapshot.approvalDetailFields,
      approvalRows: nextSnapshot.approvalRows,
      approvalStatuses: nextSnapshot.approvalStatuses,
      approvalTimeline: nextSnapshot.approvalTimeline,
      communicationFields: nextSnapshot.communicationFields,
      communicationRows: nextSnapshot.communicationRows,
      communicationStatuses: nextSnapshot.communicationStatuses,
      communicationTimeline: nextSnapshot.communicationTimeline,
      compensationFormFields: nextSnapshot.compensationFormFields,
      compensationRows: nextSnapshot.compensationRows,
      compensationStatuses: nextSnapshot.compensationStatuses,
      dataSourceDiagnostics: nextSnapshot.dataSourceDiagnostics,
      evidenceFields: nextSnapshot.evidenceFields,
      evidenceRows: nextSnapshot.evidenceRows,
      evidenceStatuses: nextSnapshot.evidenceStatuses,
      evidenceTimeline: nextSnapshot.evidenceTimeline,
      financeBonusExpenseRows: nextSnapshot.financeBonusExpenseRows,
      financeDraftFields: nextSnapshot.financeDraftFields,
      financeExceptionRows: nextSnapshot.financeExceptionRows,
      financeRows: nextSnapshot.financeRows,
      financeStatuses: nextSnapshot.financeStatuses,
      financeTimeline: nextSnapshot.financeTimeline,
      meetingNoteFields: nextSnapshot.meetingNoteFields,
      meetingNoteStatuses: nextSnapshot.meetingNoteStatuses,
      meetingTodoRows: nextSnapshot.meetingTodoRows,
      projectRows: nextSnapshot.projectRows,
      rechargeFields: nextSnapshot.rechargeFields,
      rechargeRows: nextSnapshot.rechargeRows,
      rechargeStatuses: nextSnapshot.rechargeStatuses,
      settlementDraftFields: nextSnapshot.settlementDraftFields,
      settlementDraftRows: nextSnapshot.settlementDraftRows,
      settlementStatuses: nextSnapshot.settlementStatuses,
    }));
  }

  useEffect(() => {
    if (!canOpenPage(activeRole, activePage)) {
      setActivePage(getFallbackPage(activeRole));
      setCreateOpen(false);
    }
  }, [activePage, activeRole]);

  useEffect(() => {
    setSelectedRechargeApprovalId((current) => (
      getPreferredRechargeApprovalId(rechargeApprovalItems, activeRole.key, current)
    ));
  }, [activeRole.key, rechargeApprovalItems]);

  useEffect(() => {
    if (!isDaochongReadonlyFetchEnabled(daochongDataSource)) {
      return;
    }

    let alive = true;
    setRuntimeData((current) => ({
      ...current,
      dataSourceDiagnostics: getReadonlyFetchLoadingDiagnostics(),
    }));

    Promise.all([fetchDaochongReadonlyAdapterInput(), fetchDaochongReadonlyHighRisk()])
      .then(([readonlyInput, highRiskInput]) => {
        if (!alive) return;
        const nextSnapshot = buildReadonlyApiSnapshot(
          initialSnapshot,
          {
            ...readonlyInput.input,
            bonusExpenseItemResponse: highRiskInput.bonusExpenseItems,
            compensationRuleResponse: highRiskInput.compensationRules,
            consumptionApprovalResponse: highRiskInput.consumptionApprovals,
            evidenceAssetResponse: highRiskInput.evidenceAssets,
            financeEvidenceExceptionResponse: highRiskInput.financeEvidenceExceptions,
            financeSummaryResponse: highRiskInput.financeSummary,
            meetingNoteResponse: highRiskInput.meetingNotes,
            projectCommunicationResponse: highRiskInput.projectCommunications,
            rechargeResponse: highRiskInput.recharges,
            settlementDraftResponse: highRiskInput.settlementDrafts,
          },
          {
            ...readonlyInput.diagnostics,
            ...highRiskInput.diagnostics,
          },
        );
        applyRechargeApprovalCandidates(highRiskInput.recharges);
        setRuntimeData((current) => ({
          ...current,
          appointments: nextSnapshot.appointments,
          approvalDetailFields: nextSnapshot.approvalDetailFields,
          approvalRows: nextSnapshot.approvalRows,
          approvalStatuses: nextSnapshot.approvalStatuses,
          approvalTimeline: nextSnapshot.approvalTimeline,
          communicationFields: nextSnapshot.communicationFields,
          communicationRows: nextSnapshot.communicationRows,
          communicationStatuses: nextSnapshot.communicationStatuses,
          communicationTimeline: nextSnapshot.communicationTimeline,
          compensationFormFields: nextSnapshot.compensationFormFields,
          compensationRows: nextSnapshot.compensationRows,
          compensationStatuses: nextSnapshot.compensationStatuses,
          customers: nextSnapshot.customers,
          dataSourceDiagnostics: nextSnapshot.dataSourceDiagnostics,
          evidenceFields: nextSnapshot.evidenceFields,
          evidenceRows: nextSnapshot.evidenceRows,
          evidenceStatuses: nextSnapshot.evidenceStatuses,
          evidenceTimeline: nextSnapshot.evidenceTimeline,
          financeBonusExpenseRows: nextSnapshot.financeBonusExpenseRows,
          financeDraftFields: nextSnapshot.financeDraftFields,
          financeExceptionRows: nextSnapshot.financeExceptionRows,
          financeRows: nextSnapshot.financeRows,
          financeStatuses: nextSnapshot.financeStatuses,
          financeTimeline: nextSnapshot.financeTimeline,
          meetingNoteFields: nextSnapshot.meetingNoteFields,
          meetingNoteStatuses: nextSnapshot.meetingNoteStatuses,
          meetingTodoRows: nextSnapshot.meetingTodoRows,
          projectRows: nextSnapshot.projectRows,
          rechargeFields: nextSnapshot.rechargeFields,
          rechargeRows: nextSnapshot.rechargeRows,
          rechargeStatuses: nextSnapshot.rechargeStatuses,
          settlementDraftFields: nextSnapshot.settlementDraftFields,
          settlementDraftRows: nextSnapshot.settlementDraftRows,
          settlementStatuses: nextSnapshot.settlementStatuses,
          todayRosterStatuses: nextSnapshot.todayRosterStatuses,
        }));
      })
      .catch((error: unknown) => {
        if (!alive) return;
        const message = error instanceof Error ? error.message : "只读接口读取失败，当前保留 mock 回退";
        const nextSnapshot = buildReadonlyApiSnapshot(
          initialSnapshot,
          {},
          {
            appointments: { status: "error", note: message },
            bonusExpenseItems: { status: "error", note: message },
            compensationRules: { status: "error", note: message },
            consumptionApprovals: { status: "error", note: message },
            customers: { status: "error", note: message },
            evidenceAssets: { status: "error", note: message },
            financeEvidenceExceptions: { status: "error", note: message },
            financeSummary: { status: "error", note: message },
            meetingNotes: { status: "error", note: message },
            projectCommunications: { status: "error", note: message },
            projects: { status: "error", note: message },
            recharges: { status: "error", note: message },
            roster: { status: "error", note: message },
            settlementDrafts: { status: "error", note: message },
          },
        );
        applyRechargeApprovalCandidates(null);
        setRuntimeData((current) => ({
          ...current,
          appointments: nextSnapshot.appointments,
          approvalDetailFields: nextSnapshot.approvalDetailFields,
          approvalRows: nextSnapshot.approvalRows,
          approvalStatuses: nextSnapshot.approvalStatuses,
          approvalTimeline: nextSnapshot.approvalTimeline,
          communicationFields: nextSnapshot.communicationFields,
          communicationRows: nextSnapshot.communicationRows,
          communicationStatuses: nextSnapshot.communicationStatuses,
          communicationTimeline: nextSnapshot.communicationTimeline,
          compensationFormFields: nextSnapshot.compensationFormFields,
          compensationRows: nextSnapshot.compensationRows,
          compensationStatuses: nextSnapshot.compensationStatuses,
          customers: nextSnapshot.customers,
          dataSourceDiagnostics: nextSnapshot.dataSourceDiagnostics,
          evidenceFields: nextSnapshot.evidenceFields,
          evidenceRows: nextSnapshot.evidenceRows,
          evidenceStatuses: nextSnapshot.evidenceStatuses,
          evidenceTimeline: nextSnapshot.evidenceTimeline,
          financeBonusExpenseRows: nextSnapshot.financeBonusExpenseRows,
          financeDraftFields: nextSnapshot.financeDraftFields,
          financeExceptionRows: nextSnapshot.financeExceptionRows,
          financeRows: nextSnapshot.financeRows,
          financeStatuses: nextSnapshot.financeStatuses,
          financeTimeline: nextSnapshot.financeTimeline,
          meetingNoteFields: nextSnapshot.meetingNoteFields,
          meetingNoteStatuses: nextSnapshot.meetingNoteStatuses,
          meetingTodoRows: nextSnapshot.meetingTodoRows,
          projectRows: nextSnapshot.projectRows,
          rechargeFields: nextSnapshot.rechargeFields,
          rechargeRows: nextSnapshot.rechargeRows,
          rechargeStatuses: nextSnapshot.rechargeStatuses,
          settlementDraftFields: nextSnapshot.settlementDraftFields,
          settlementDraftRows: nextSnapshot.settlementDraftRows,
          settlementStatuses: nextSnapshot.settlementStatuses,
          todayRosterStatuses: nextSnapshot.todayRosterStatuses,
        }));
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (activePage !== "appointment") {
      return;
    }

    if (!selectedAppointment?.id) {
      setRuntimeData((current) => ({
        ...current,
        appointmentDetailFields,
        appointmentDetailStatuses: [
          readonlyDiagnosticToStatusItem(selectedAppointment?.title ?? "预约详情只读", {
            status: selectedAppointment?.title ? "fallback" : "disabled",
            note: selectedAppointment?.title
              ? "当前预约来自 mock 或缺少真实 id，详情保留 mock 回退"
              : "尚未从真实预约列表选择预约，当前显示 mock 预约详情",
          }),
          ...appointmentDetailStatuses,
        ],
      }));
      return;
    }

    if (!isDaochongReadonlyFetchEnabled(daochongDataSource)) {
      setRuntimeData((current) => ({
        ...current,
        appointmentDetailFields,
        appointmentDetailStatuses: [
          readonlyDiagnosticToStatusItem(selectedAppointment.title, {
            status: "disabled",
            note: "预约详情只读请求开关关闭，当前显示 mock 预约详情",
          }),
          ...appointmentDetailStatuses,
        ],
      }));
      return;
    }

    let alive = true;
    setRuntimeData((current) => ({
      ...current,
      appointmentDetailFields,
      appointmentDetailStatuses: [
        readonlyDiagnosticToStatusItem(selectedAppointment.title, {
          status: "loading",
          note: `正在读取 /daochong/mobile/appointments/${selectedAppointment.id}，只读模式不会改约、签到或确认完成`,
        }),
      ],
    }));

    fetchDaochongReadonlyAppointmentDetail(selectedAppointment.id)
      .then(({ data, diagnostic }) => {
        if (!alive) return;
        setRuntimeData((current) => ({
          ...current,
          appointmentDetailFields: adaptReadonlyAppointmentDetailToFields(data, appointmentDetailFields),
          appointmentDetailStatuses: [
            readonlyDiagnosticToStatusItem(selectedAppointment.title, diagnostic),
            ...adaptReadonlyAppointmentDetailToStatuses(data, appointmentDetailStatuses),
          ],
        }));
      })
      .catch((error: unknown) => {
        if (!alive) return;
        const message = error instanceof Error ? error.message : "预约详情读取失败，当前保留 mock 预约详情";
        setRuntimeData((current) => ({
          ...current,
          appointmentDetailFields,
          appointmentDetailStatuses: [
            readonlyDiagnosticToStatusItem(selectedAppointment.title, {
              status: "error",
              note: message,
            }),
            ...appointmentDetailStatuses,
          ],
        }));
      });

    return () => {
      alive = false;
    };
  }, [activePage, selectedAppointment?.id, selectedAppointment?.title]);

  useEffect(() => {
    if (activePage !== "customerDetail" && activePage !== "serviceNote") {
      return;
    }

    if (!selectedCustomer?.id) {
      setServiceNoteWriteContext({});
      setServiceNoteForm(initialServiceNoteFormState);
      setRuntimeData((current) => ({
        ...current,
        customerPreferenceRows,
        customerProfileFields,
        customerServiceHistory,
        serviceNoteContextFields,
        serviceNotePendingRows,
        serviceNoteReminderFields,
        serviceNoteReminderTimeline,
        serviceNoteStatuses,
        customerDetailStatuses: [
          {
            title: selectedCustomer?.name ? `${selectedCustomer.name}客户详情` : "客户详情只读",
            note: selectedCustomer?.name
              ? "当前客户来自 mock 或缺少真实 id，详情保留 mock 回退"
              : "尚未从客户列表选择真实客户，当前显示 mock 客户档案",
            status: "回退",
            tone: "amber",
          },
        ],
      }));
      return;
    }

    if (!isDaochongReadonlyFetchEnabled(daochongDataSource)) {
      setServiceNoteWriteContext({
        customerId: selectedCustomer.id,
        serviceNoteId: null,
        serviceNoteStatus: null,
      });
      setServiceNoteForm(initialServiceNoteFormState);
      setRuntimeData((current) => ({
        ...current,
        customerPreferenceRows,
        customerProfileFields,
        customerServiceHistory,
        serviceNoteContextFields,
        serviceNotePendingRows,
        serviceNoteReminderFields,
        serviceNoteReminderTimeline,
        serviceNoteStatuses,
        customerDetailStatuses: [
          readonlyDiagnosticToStatusItem(`${selectedCustomer.name}客户详情`, {
            status: "disabled",
            note: "客户详情只读请求开关关闭，当前显示 mock 客户档案",
          }),
          readonlyDiagnosticToStatusItem("服务纪要只读", {
            status: "disabled",
            note: "正式 service-notes 只读请求开关关闭，当前显示候选纪要",
          }),
          readonlyDiagnosticToStatusItem("企微 dry-run 只读", {
            status: "disabled",
            note: "正式 wecom-reminder-dry-runs 只读请求开关关闭，当前显示 mock 提醒预览",
          }),
          readonlyDiagnosticToStatusItem("客户偏好只读", {
            status: "disabled",
            note: "正式 customer-preferences 只读请求开关关闭，当前显示候选偏好",
          }),
          readonlyDiagnosticToStatusItem("卡项余额只读", {
            status: "disabled",
            note: "正式 customer-card-balances 只读请求开关关闭，当前显示卡项缺口",
          }),
        ],
      }));
      return;
    }

    let alive = true;
    setRuntimeData((current) => ({
      ...current,
      serviceNoteContextFields,
      serviceNotePendingRows,
      serviceNoteReminderFields,
      serviceNoteReminderTimeline,
      serviceNoteStatuses,
      customerDetailStatuses: [
        readonlyDiagnosticToStatusItem(`${selectedCustomer.name}客户详情`, {
          status: "loading",
          note: `正在读取 /customers/${selectedCustomer.id}，只读模式不会提交或修改数据`,
        }),
        readonlyDiagnosticToStatusItem("服务纪要只读", {
          status: "loading",
          note: "正在读取 /daochong/mobile/service-notes，只读模式不会提交或修改数据",
        }),
        readonlyDiagnosticToStatusItem("企微 dry-run 只读", {
          status: "loading",
          note: "正在读取 /daochong/mobile/wecom-reminder-dry-runs，只读模式不会创建通知、标记已发送或调用企业微信",
        }),
        readonlyDiagnosticToStatusItem("客户偏好只读", {
          status: "loading",
          note: "正在读取 /daochong/mobile/customer-preferences，只读模式不会提交或修改数据",
        }),
        readonlyDiagnosticToStatusItem("卡项余额只读", {
          status: "loading",
          note: "正在读取 /daochong/mobile/customer-card-balances，只读模式不会开户、调余额、扣卡或写流水",
        }),
      ],
    }));

    fetchDaochongReadonlyCustomerDetail(selectedCustomer.id)
      .then((result) => {
        if (!alive) return;
        applyCustomerDetailResult(selectedCustomer, result);
      })
      .catch((error: unknown) => {
        if (!alive) return;
        const message = error instanceof Error ? error.message : "客户详情读取失败，当前保留 mock 客户档案";
        setRuntimeData((current) => ({
          ...current,
          customerPreferenceRows,
          customerProfileFields,
          customerServiceHistory,
          serviceNoteContextFields,
          serviceNotePendingRows,
          serviceNoteReminderFields,
          serviceNoteReminderTimeline,
          serviceNoteStatuses,
          customerDetailStatuses: [
            readonlyDiagnosticToStatusItem(`${selectedCustomer.name}客户详情`, {
              status: "error",
              note: message,
            }),
          ],
        }));
      });

    return () => {
      alive = false;
    };
  }, [activePage, selectedCustomer?.id, selectedCustomer?.name]);

  function updateServiceNoteForm(patch: Partial<DaochongServiceNoteFormState>) {
    setServiceNoteForm((current) => ({
      ...current,
      ...patch,
    }));
    setServiceNoteWriteState((current) => (
      current.status === "error" ? initialServiceNoteWriteState : current
    ));
  }

  async function submitServiceNote() {
    const validationMessage = validateServiceNoteForm(serviceNoteForm);
    if (validationMessage) {
      setServiceNoteWriteState({
        message: validationMessage,
        status: "error",
      });
      return;
    }

    if (!selectedCustomer?.id) {
      setServiceNoteWriteState({
        message: "请先从客户列表选择客户。",
        status: "error",
      });
      return;
    }

    if (!currentUser?.id) {
      setServiceNoteWriteState({
        message: "请先登录后提交服务纪要。",
        status: "error",
      });
      return;
    }

    const preferences = buildServiceNotePreferences(serviceNoteForm);
    const basePayload = {
      customerFeedback: trimOptionalText(serviceNoteForm.customerFeedback),
      nextSuggestion: trimOptionalText(serviceNoteForm.nextSuggestion),
      noteStatus: serviceNoteForm.noteStatus,
      preferenceNote: trimOptionalText(serviceNoteForm.preferenceNote),
      preferences,
      serviceSummary: trimOptionalText(serviceNoteForm.serviceSummary),
    };
    const isUpdate = Boolean(serviceNoteWriteContext.serviceNoteId);
    const payload = isUpdate
      ? {
          ...basePayload,
          syncPreferences: Boolean(preferences?.length || serviceNoteForm.preferenceNote.trim()),
        }
      : {
          ...basePayload,
          customerId: selectedCustomer.id,
          sourceType: "MANUAL_BACKFILL",
          teacherId: currentUser.id,
        };

    setServiceNoteWriteState({
      message: "正在提交服务纪要...",
      status: "saving",
    });

    try {
      const response = await apiFetch<DaochongServiceNoteWriteResponse>(
        isUpdate
          ? `/daochong/mobile/service-notes/${encodeURIComponent(serviceNoteWriteContext.serviceNoteId ?? "")}`
          : "/daochong/mobile/service-notes",
        {
          body: JSON.stringify(payload),
          method: isUpdate ? "PATCH" : "POST",
        },
      );
      const serviceNoteId = response.item?.id ?? serviceNoteWriteContext.serviceNoteId ?? undefined;
      const actionText = response.action === "updated" ? "已更新" : "已新建";
      const preferenceText = response.preferenceWrites ? `，同步偏好 ${response.preferenceWrites} 条` : "";
      setServiceNoteWriteContext({
        customerId: selectedCustomer.id,
        serviceNoteId,
        serviceNoteStatus: response.item?.noteStatus ?? serviceNoteForm.noteStatus,
      });
      setServiceNoteWriteState({
        message: `服务纪要${actionText}${preferenceText}`,
        serviceNoteId,
        status: "success",
      });

      if (isDaochongReadonlyFetchEnabled(daochongDataSource)) {
        try {
          const refreshed = await fetchDaochongReadonlyCustomerDetail(selectedCustomer.id);
          applyCustomerDetailResult(selectedCustomer, refreshed);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "刷新只读详情失败";
          setServiceNoteWriteState({
            message: `服务纪要${actionText}，但刷新失败：${message}`,
            serviceNoteId,
            status: "success",
          });
        }
      }
    } catch (error: unknown) {
      setServiceNoteWriteState({
        message: error instanceof Error ? error.message : "服务纪要提交失败。",
        status: "error",
      });
    }
  }

  function updateRechargeForm(patch: Partial<DaochongRechargeFormState>) {
    setRechargeForm((current) => ({
      ...current,
      ...patch,
    }));
    setRechargeWriteState((current) => (
      current.status === "error" ? initialRechargeWriteState : current
    ));
  }

  function selectRechargeApprovalItem(id: string) {
    setSelectedRechargeApprovalId(id);
    setRechargeApprovalState((current) => (
      current.status === "error" ? initialRechargeApprovalState : current
    ));
  }

  function updateRechargeReturnReason(value: string) {
    setRechargeReturnReason(value);
    setRechargeApprovalState((current) => (
      current.status === "error" ? initialRechargeApprovalState : current
    ));
  }

  async function submitRechargeChengchengDecision(action: "approve" | "return") {
    const selected = rechargeApprovalItems.find((item) => item.id === selectedRechargeApprovalId) ?? rechargeApprovalItems[0] ?? null;
    if (!selected) {
      setRechargeApprovalState({
        action,
        message: "暂无可处理的充值记录。",
        status: "error",
      });
      return;
    }

    const isChengchengDecision = activeRole.key === "chengcheng";
    const isLimengDecision = activeRole.key === "finance";
    if (!isChengchengDecision && !isLimengDecision) {
      setRechargeApprovalState({
        action,
        message: "请切换程程或财务/立猛角色后操作。",
        rechargeId: selected.id,
        status: "error",
      });
      return;
    }

    if (isChengchengDecision && !selected.canChengchengApprove) {
      setRechargeApprovalState({
        action,
        message: "当前充值不在程程待审状态。",
        rechargeId: selected.id,
        status: "error",
      });
      return;
    }

    if (isLimengDecision && !selected.canLimengReview) {
      setRechargeApprovalState({
        action,
        message: "当前充值不在立猛待复核状态。",
        rechargeId: selected.id,
        status: "error",
      });
      return;
    }

    if (!currentUser?.id) {
      setRechargeApprovalState({
        action,
        message: "请先登录后处理审批。",
        rechargeId: selected.id,
        status: "error",
      });
      return;
    }

    const reason = rechargeReturnReason.trim();
    if (action === "return" && !reason) {
      setRechargeApprovalState({
        action,
        message: "请填写退回原因。",
        rechargeId: selected.id,
        status: "error",
      });
      return;
    }

    setRechargeApprovalState({
      action,
      message: action === "approve"
        ? (isLimengDecision ? "正在提交立猛复核..." : "正在提交程程通过...")
        : (isLimengDecision ? "正在提交立猛退回..." : "正在提交程程退回..."),
      rechargeId: selected.id,
      status: "saving",
    });

    try {
      const endpointAction = isLimengDecision
        ? (action === "approve" ? "limeng-review" : "limeng-return")
        : (action === "approve" ? "chengcheng-approval" : "chengcheng-return");
      const response = await apiFetch<DaochongRechargeWriteResponse>(
        `/daochong/mobile/recharges/${encodeURIComponent(selected.id)}/${endpointAction}`,
        {
          body: action === "return" ? JSON.stringify({ returnReason: reason }) : undefined,
          method: "PATCH",
        },
      );
      const rechargeId = response.item?.id ?? selected.id;
      setRechargeReturnReason("");
      setRechargeApprovalState({
        action,
        message: action === "approve"
          ? (isLimengDecision ? `已复核确认，已入账：${rechargeId}` : `已通过，待立猛复核：${rechargeId}`)
          : (isLimengDecision ? `立猛已退回：${rechargeId}` : `已退回：${rechargeId}`),
        rechargeId,
        status: "success",
      });

      if (isDaochongReadonlyFetchEnabled(daochongDataSource)) {
        try {
          applyHighRiskResult(await fetchDaochongReadonlyHighRisk());
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "充值只读数据刷新失败";
            setRechargeApprovalState({
              action,
              message: `${action === "approve" ? (isLimengDecision ? "已复核确认" : "已通过") : "已退回"}，但刷新失败：${message}`,
              rechargeId,
              status: "success",
            });
        }
      }
    } catch (error: unknown) {
      setRechargeApprovalState({
        action,
        message: error instanceof Error ? error.message : "充值审批提交失败。",
        rechargeId: selected.id,
        status: "error",
      });
    }
  }

  async function submitRecharge() {
    const validationMessage = validateRechargeForm(rechargeForm);
    if (validationMessage) {
      setRechargeWriteState({
        message: validationMessage,
        status: "error",
      });
      return;
    }

    if (!selectedCustomer?.id) {
      setRechargeWriteState({
        message: "请先从客户列表选择客户。",
        status: "error",
      });
      return;
    }

    if (!currentUser?.id) {
      setRechargeWriteState({
        message: "请先登录后提交充值。",
        status: "error",
      });
      return;
    }

    const cashPhotoAssetIds = splitRechargeIdList(rechargeForm.cashPhotoAssetIds);
    const evidenceAssetIds = splitRechargeIdList(rechargeForm.evidenceAssetIds);
    const normalizedCashAmount = rechargeForm.cashAmount.trim().replace(/,/g, "");
    const payload = {
      amount: rechargeForm.amount.trim().replace(/,/g, ""),
      cashAmount:
        rechargeForm.paymentMethod === "CASH" || normalizedCashAmount
          ? trimOptionalText(normalizedCashAmount)
          : undefined,
      cashCustodianUserId: trimOptionalText(rechargeForm.cashCustodianUserId),
      cashPhotoAssetIds: cashPhotoAssetIds.length ? cashPhotoAssetIds : undefined,
      customerId: selectedCustomer.id,
      evidenceAssetIds,
      paymentMethod: rechargeForm.paymentMethod,
    };

    setRechargeWriteState({
      message: "正在提交充值...",
      status: "saving",
    });

    try {
      const response = await apiFetch<DaochongRechargeWriteResponse>("/daochong/mobile/recharges", {
        body: JSON.stringify(payload),
        method: "POST",
      });
      const rechargeId = response.item?.id;
      setRechargeForm(initialRechargeFormState);
      setRechargeWriteState({
        message: `充值已提交待程程审批${rechargeId ? `：${rechargeId}` : ""}`,
        rechargeId,
        status: "success",
      });

      if (isDaochongReadonlyFetchEnabled(daochongDataSource)) {
        try {
          applyHighRiskResult(await fetchDaochongReadonlyHighRisk());
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "充值只读数据刷新失败";
          setRechargeWriteState({
            message: `充值已提交待程程审批，但刷新失败：${message}`,
            rechargeId,
            status: "success",
          });
        }
      }
    } catch (error: unknown) {
      setRechargeWriteState({
        message: error instanceof Error ? error.message : "充值提交失败。",
        status: "error",
      });
    }
  }

  function openPage(page: DaochongPageKey) {
    setActivePage(canOpenPage(activeRole, page) ? page : getFallbackPage(activeRole));
    setCreateOpen(false);
  }

  function openAppointment(appointment: DaochongAppointment) {
    setSelectedAppointment(appointment);
    openPage(appointment.page);
  }

  function openCustomerDetail(customer: DaochongCustomer) {
    setSelectedCustomer({ id: customer.id, name: customer.name });
    setServiceNoteForm(initialServiceNoteFormState);
    setServiceNoteWriteContext({
      customerId: customer.id,
      serviceNoteId: null,
      serviceNoteStatus: null,
    });
    setServiceNoteWriteState(initialServiceNoteWriteState);
    setRechargeForm(initialRechargeFormState);
    setRechargeWriteState(initialRechargeWriteState);
    setRechargeReturnReason("");
    setRechargeApprovalState(initialRechargeApprovalState);
    openPage("customerDetail");
  }

  function changeRole(roleKey: DaochongRoleKey) {
    const nextRole = daochongRoles.find((role) => role.key === roleKey) ?? daochongRoles[0];
    setActiveRoleKey(nextRole.key);
    setActivePage(getFallbackPage(nextRole));
    setSelectedAppointment(null);
    setSelectedCustomer(null);
    setServiceNoteForm(initialServiceNoteFormState);
    setServiceNoteWriteContext({});
    setServiceNoteWriteState(initialServiceNoteWriteState);
    setRechargeForm(initialRechargeFormState);
    setRechargeWriteState(initialRechargeWriteState);
    setRechargeReturnReason("");
    setRechargeApprovalState(initialRechargeApprovalState);
    setCreateOpen(false);
  }

  const meta = pageMeta[activePage];
  const navItems = roleNavItems[activeRole.key];
  const visibleActions = getVisibleActions(activeRole);
  const serviceNoteWritePanel = (
    <ServiceNoteWritePanel
      context={serviceNoteWriteContext}
      customerName={selectedCustomer?.name}
      form={serviceNoteForm}
      onChange={updateServiceNoteForm}
      onSubmit={submitServiceNote}
      userName={currentUser?.displayName ?? currentUser?.name ?? currentUser?.username}
      writeState={serviceNoteWriteState}
    />
  );
  const rechargeWritePanel = (
    <RechargeWritePanel
      customerName={selectedCustomer?.name}
      form={rechargeForm}
      onChange={updateRechargeForm}
      onSubmit={submitRecharge}
      userName={currentUser?.displayName ?? currentUser?.name ?? currentUser?.username}
      writeState={rechargeWriteState}
    />
  );
  const rechargeApprovalPanel = (
    <RechargeApprovalPanel
      items={rechargeApprovalItems}
      onApprove={() => submitRechargeChengchengDecision("approve")}
      onReturn={() => submitRechargeChengchengDecision("return")}
      onReturnReasonChange={updateRechargeReturnReason}
      onSelect={selectRechargeApprovalItem}
      returnReason={rechargeReturnReason}
      role={activeRole}
      selectedId={selectedRechargeApprovalId}
      writeState={rechargeApprovalState}
    />
  );

  if (!grayEnabled) {
    return (
      <main className={styles.pageRoot}>
        <section className={styles.lockedPanel}>
          <span>道</span>
          <h1>道冲元气手机端灰度入口未开放</h1>
          <p>当前环境未开启灰度开关。正式入口不会受影响。</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.pageRoot}>
      <section className={styles.shell}>
        <aside className={styles.rolePanel}>
          <span className={styles.eyebrow}>DCM-00 到 DCM-176</span>
          <h1>道冲元气手机端灰度真实骨架</h1>
          <p>服务纪要和充值提交已开放真实写入；审批、入账、财务和企业微信正式发送仍按灰度边界控制。</p>
          <p className={styles.sourceNote} data-testid="daochong-readonly-fetch-gate">
            数据源 {readonlyFetchGate.dataSourceMode} · 只读请求 {readonlyFetchGate.requestEnabled ? "已开启" : "未开启"}
          </p>
          <div className={styles.roleGrid}>
            {daochongRoles.map((role) => (
              <button
                className={activeRole.key === role.key ? styles.activeRole : undefined}
                data-testid={`daochong-role-${role.key}`}
                key={role.key}
                onClick={() => changeRole(role.key)}
                type="button"
              >
                <strong>{role.label}</strong>
                <small>{role.description}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.phone}>
          <div className={styles.statusBar}>
            <span>9:41</span>
            <span>mock</span>
          </div>
          <header className={styles.appHeader}>
            <div>
              <span className={styles.chip}>{meta.chip}</span>
              <h2>{meta.title}</h2>
              <p>{meta.subtitle}</p>
            </div>
            {canOpenPage(activeRole, "settings") ? (
              <button data-testid="daochong-settings-button" onClick={() => openPage("settings")} type="button">
                设置
              </button>
            ) : null}
          </header>
          <div className={styles.phoneBody} data-testid={`daochong-page-${activePage}`}>
            {renderPage(
              activePage,
              activeRole,
              openPage,
              openAppointment,
              openCustomerDetail,
              rechargeApprovalPanel,
              rechargeWritePanel,
              runtimeData,
              serviceNoteWritePanel,
            )}
          </div>
          {createOpen ? (
            <div className={styles.sheet}>
              <button aria-label="关闭创建面板" className={styles.sheetBackdrop} onClick={() => setCreateOpen(false)} type="button" />
              <div className={styles.sheetPanel}>
                <span className={styles.handle} />
                <div className={styles.sectionTitle}>
                  <strong>新建</strong>
                  <small>{activeRole.label}可见</small>
                </div>
                <div className={styles.sheetGrid}>
                  {visibleActions.map((action) => (
                    <button data-testid={`daochong-create-${action.key}`} key={action.key} onClick={() => openPage(action.page)} type="button">
                      <strong>{action.label}</strong>
                      <small>{action.note}</small>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          <nav className={styles.bottomNav}>
            {navItems.slice(0, 2).map((item) => (
              <button className={activePage === item.key ? styles.activeNav : undefined} data-testid={`daochong-nav-${item.key}`} key={item.key} onClick={() => openPage(item.key)} type="button">
                <strong>{item.label}</strong>
                <small>{item.note}</small>
              </button>
            ))}
            <button className={styles.createButton} data-testid="daochong-create-button" onClick={() => setCreateOpen((value) => !value)} type="button">
              +
            </button>
            {navItems.slice(2).map((item) => (
              <button className={activePage === item.key ? styles.activeNav : undefined} data-testid={`daochong-nav-${item.key}`} key={item.key} onClick={() => openPage(item.key)} type="button">
                <strong>{item.label}</strong>
                <small>{item.note}</small>
              </button>
            ))}
          </nav>
        </section>
      </section>
    </main>
  );
}
