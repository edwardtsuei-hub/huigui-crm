"use client";

import { fetchApi, getRecordDataMode, getToken } from "../../../lib/api";
import {
  buildReadonlyDiagnostics,
  type DaochongReadonlyAdapterInput,
  type DaochongReadonlyAppointmentDetailResponse,
  type DaochongReadonlyCompensationRuleResponse,
  type DaochongReadonlyConsumptionApprovalResponse,
  type DaochongReadonlyCustomerCardBalanceResponse,
  type DaochongReadonlyCustomerPreferenceResponse,
  type DaochongReadonlyCustomerDetailRecord,
  type DaochongReadonlyCustomerListResponse,
  type DaochongReadonlyDiagnosticsInput,
  type DaochongReadonlyEvidenceAssetResponse,
  type DaochongReadonlyFinanceEvidenceExceptionResponse,
  type DaochongReadonlyFinanceSummaryResponse,
  type DaochongReadonlyBonusExpenseItemResponse,
  type DaochongReadonlyMeetingNoteResponse,
  type DaochongReadonlyProductRecord,
  type DaochongReadonlyProjectCommunicationResponse,
  type DaochongReadonlyRechargeResponse,
  type DaochongReadonlyResourceDiagnosticInput,
  type DaochongReadonlyServiceNoteResponse,
  type DaochongReadonlySettlementDraftResponse,
  type DaochongReadonlyShiftRosterResponse,
  type DaochongReadonlyTaskListResponse,
  type DaochongReadonlyWecomReminderDryRunResponse,
} from "./daochongMobile.readonly-adapters";
import type { DaochongMobileDataSource } from "./daochongMobile.types";

type ReadonlyFetchResult<T> = {
  data: T | null;
  diagnostic: DaochongReadonlyResourceDiagnosticInput;
};

type DaochongReadonlyFetchClient = (path: string, init?: RequestInit) => Promise<Response>;

export type DaochongReadonlyFetchGate = {
  dataSourceMode: DaochongMobileDataSource["mode"];
  appointmentDetailPath: string;
  appointmentsPath: string;
  bonusExpenseItemsPath: string;
  compensationRulesPath: string;
  consumptionApprovalsPath: string;
  customerCardBalancesPath: string;
  customersPath: string;
  evidenceAssetsPath: string;
  fetchEnv: string | undefined;
  financeEvidenceExceptionsPath: string;
  financeSummaryPath: string;
  meetingNotesPath: string;
  projectCommunicationsPath: string;
  projectsPath: string;
  rechargesPath: string;
  requestEnabled: boolean;
  rosterPath: string;
  settlementDraftsPath: string;
  wecomReminderDryRunsPath: string;
};

const READONLY_CUSTOMERS_PATH = "/customers?pageSize=20";
const READONLY_PROJECTS_PATH = "/products?keyword=道冲";
const READONLY_ROSTER_PATH = "/settings/shift-roster";
const READONLY_RECHARGES_BASE_PATH = "/daochong/mobile/recharges";
const READONLY_CUSTOMER_CARD_BALANCES_BASE_PATH = "/daochong/mobile/customer-card-balances";
const READONLY_COMPENSATION_RULES_BASE_PATH = "/daochong/mobile/compensation-rules";
const READONLY_SETTLEMENT_DRAFTS_BASE_PATH = "/daochong/mobile/settlement-drafts";
const READONLY_CONSUMPTION_APPROVALS_BASE_PATH = "/daochong/mobile/consumption-approvals";
const READONLY_EVIDENCE_ASSETS_BASE_PATH = "/daochong/mobile/evidence-assets";
const READONLY_FINANCE_SUMMARY_BASE_PATH = "/daochong/mobile/finance-summary";
const READONLY_FINANCE_EVIDENCE_EXCEPTIONS_BASE_PATH = "/daochong/mobile/finance-evidence-exceptions";
const READONLY_BONUS_EXPENSE_ITEMS_BASE_PATH = "/daochong/mobile/bonus-expense-items";
const READONLY_MEETING_NOTES_BASE_PATH = "/daochong/mobile/meeting-notes";
const READONLY_PROJECT_COMMUNICATIONS_BASE_PATH = "/daochong/mobile/project-communications";
const READONLY_WECOM_REMINDER_DRY_RUNS_BASE_PATH = "/daochong/mobile/wecom-reminder-dry-runs";

export function getDaochongReadonlyAppointmentDetailPath(appointmentId: string) {
  return `/daochong/mobile/appointments/${encodeURIComponent(appointmentId)}`;
}

export function getDaochongReadonlyCustomerDetailPath(customerId: string) {
  return `/customers/${encodeURIComponent(customerId)}`;
}

export function getDaochongReadonlyServiceNotesPath(customerId: string) {
  return `/daochong/mobile/service-notes?customerId=${encodeURIComponent(customerId)}&limit=20`;
}

export function getDaochongReadonlyWecomReminderDryRunsPath(customerId: string, date = new Date()) {
  const params = new URLSearchParams({
    customerId,
    dueBefore: date.toISOString(),
    limit: "20",
  });
  return `${READONLY_WECOM_REMINDER_DRY_RUNS_BASE_PATH}?${params.toString()}`;
}

export function getDaochongReadonlyCustomerPreferencesPath(customerId: string) {
  return `/daochong/mobile/customer-preferences?customerId=${encodeURIComponent(customerId)}`;
}

export function getDaochongReadonlyCustomerCardBalancesPath(customerId: string) {
  return `${READONLY_CUSTOMER_CARD_BALANCES_BASE_PATH}?customerId=${encodeURIComponent(customerId)}`;
}

export function getDaochongReadonlyCompensationRulesPath(date = new Date()) {
  const params = new URLSearchParams({
    effectiveMonth: formatSummaryMonth(date),
    limit: "20",
  });
  return `${READONLY_COMPENSATION_RULES_BASE_PATH}?${params.toString()}`;
}

export function getDaochongReadonlyEvidenceAssetsPath() {
  const params = new URLSearchParams({
    businessType: "daochong",
    limit: "20",
  });
  return `${READONLY_EVIDENCE_ASSETS_BASE_PATH}?${params.toString()}`;
}

export function getDaochongReadonlyRechargesPath() {
  const params = new URLSearchParams({
    limit: "20",
  });
  return `${READONLY_RECHARGES_BASE_PATH}?${params.toString()}`;
}

export function getDaochongReadonlySettlementDraftsPath() {
  const params = new URLSearchParams({
    limit: "20",
  });
  return `${READONLY_SETTLEMENT_DRAFTS_BASE_PATH}?${params.toString()}`;
}

export function getDaochongReadonlyConsumptionApprovalsPath(date = new Date()) {
  const params = new URLSearchParams({
    limit: "20",
    summaryMonth: formatSummaryMonth(date),
  });
  return `${READONLY_CONSUMPTION_APPROVALS_BASE_PATH}?${params.toString()}`;
}

function formatSummaryMonth(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getDaochongReadonlyFinanceSummaryPath(date = new Date()) {
  const params = new URLSearchParams({
    limit: "6",
    summaryMonth: formatSummaryMonth(date),
  });
  return `${READONLY_FINANCE_SUMMARY_BASE_PATH}?${params.toString()}`;
}

export function getDaochongReadonlyFinanceEvidenceExceptionsPath(date = new Date()) {
  const params = new URLSearchParams({
    limit: "20",
    summaryMonth: formatSummaryMonth(date),
  });
  return `${READONLY_FINANCE_EVIDENCE_EXCEPTIONS_BASE_PATH}?${params.toString()}`;
}

export function getDaochongReadonlyBonusExpenseItemsPath(date = new Date()) {
  const params = new URLSearchParams({
    limit: "20",
    summaryMonth: formatSummaryMonth(date),
  });
  return `${READONLY_BONUS_EXPENSE_ITEMS_BASE_PATH}?${params.toString()}`;
}

export function getDaochongReadonlyMeetingNotesPath() {
  const params = new URLSearchParams({
    folderId: "daochong-weekly",
    limit: "20",
  });
  return `${READONLY_MEETING_NOTES_BASE_PATH}?${params.toString()}`;
}

export function getDaochongReadonlyProjectCommunicationsPath() {
  const params = new URLSearchParams({
    folderId: "daochong-weekly",
    limit: "20",
  });
  return `${READONLY_PROJECT_COMMUNICATIONS_BASE_PATH}?${params.toString()}`;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDaochongReadonlyAppointmentsPath(date = new Date()) {
  const dateText = formatLocalDate(date);
  return `/tasks?pageSize=20&includeArchived=true&startDate=${dateText}&endDate=${dateText}`;
}

export function isDaochongReadonlyFetchEnabled(dataSource: DaochongMobileDataSource) {
  return (
    dataSource.mode === "api-readonly" &&
    process.env.NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH === "true"
  );
}

export function getDaochongReadonlyFetchGate(dataSource: DaochongMobileDataSource): DaochongReadonlyFetchGate {
  return {
    appointmentsPath: getDaochongReadonlyAppointmentsPath(),
    appointmentDetailPath: "/daochong/mobile/appointments/:appointmentId",
    bonusExpenseItemsPath: getDaochongReadonlyBonusExpenseItemsPath(),
    compensationRulesPath: getDaochongReadonlyCompensationRulesPath(),
    consumptionApprovalsPath: getDaochongReadonlyConsumptionApprovalsPath(),
    customerCardBalancesPath: "/daochong/mobile/customer-card-balances?customerId=:customerId",
    customersPath: READONLY_CUSTOMERS_PATH,
    dataSourceMode: dataSource.mode,
    evidenceAssetsPath: getDaochongReadonlyEvidenceAssetsPath(),
    fetchEnv: process.env.NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH,
    financeEvidenceExceptionsPath: getDaochongReadonlyFinanceEvidenceExceptionsPath(),
    financeSummaryPath: getDaochongReadonlyFinanceSummaryPath(),
    meetingNotesPath: getDaochongReadonlyMeetingNotesPath(),
    projectCommunicationsPath: getDaochongReadonlyProjectCommunicationsPath(),
    projectsPath: READONLY_PROJECTS_PATH,
    rechargesPath: getDaochongReadonlyRechargesPath(),
    requestEnabled: isDaochongReadonlyFetchEnabled(dataSource),
    rosterPath: READONLY_ROSTER_PATH,
    settlementDraftsPath: getDaochongReadonlySettlementDraftsPath(),
    wecomReminderDryRunsPath: "/daochong/mobile/wecom-reminder-dry-runs?customerId=:customerId&dueBefore=:now&limit=20",
  };
}

export function getReadonlyFetchDisabledDiagnostics() {
  return buildReadonlyDiagnostics({
    appointments: {
      status: "disabled",
      note: "真实预约候选只读请求开关关闭，当前显示 mock 预约",
    },
    appointmentDetail: {
      status: "disabled",
      note: "真实预约详情只读请求开关关闭，当前显示 mock 预约详情",
    },
    projects: {
      status: "disabled",
      note: "真实项目只读请求开关关闭，当前显示 mock 项目",
    },
    roster: {
      status: "disabled",
      note: "真实班表只读请求开关关闭，当前显示 mock 班表",
    },
    customers: {
      status: "disabled",
      note: "真实客户只读请求开关关闭，当前显示 mock 客户",
    },
    customerCardBalances: {
      status: "disabled",
      note: "客户卡项余额只读请求开关关闭，当前显示卡项缺口",
    },
    wecomReminderDryRuns: {
      status: "disabled",
      note: "正式 wecom-reminder-dry-runs 只读请求开关关闭，当前显示 mock 提醒预览",
    },
    evidenceAssets: {
      status: "disabled",
      note: "正式 evidence-assets 只读请求开关关闭，当前显示 mock 凭证",
    },
    recharges: {
      status: "disabled",
      note: "正式 recharges 只读请求开关关闭，当前显示 mock 充值",
    },
    settlementDrafts: {
      status: "disabled",
      note: "正式 settlement-drafts 只读请求开关关闭，当前显示 mock 草稿",
    },
    consumptionApprovals: {
      status: "disabled",
      note: "正式 consumption-approvals 只读请求开关关闭，当前显示 mock 审批",
    },
    financeSummary: {
      status: "disabled",
      note: "正式 finance-summary 只读请求开关关闭，当前显示 mock 财务",
    },
    financeEvidenceExceptions: {
      status: "disabled",
      note: "正式 finance-evidence-exceptions 只读请求开关关闭，当前显示 mock 异常",
    },
    bonusExpenseItems: {
      status: "disabled",
      note: "正式 bonus-expense-items 只读请求开关关闭，当前显示 mock 奖金报销",
    },
    compensationRules: {
      status: "disabled",
      note: "正式 compensation-rules 只读请求开关关闭，当前显示 mock 薪酬配置",
    },
    projectCommunications: {
      status: "disabled",
      note: "正式 project-communications 只读请求开关关闭，当前显示 mock 沟通",
    },
    meetingNotes: {
      status: "disabled",
      note: "正式 meeting-notes 只读请求开关关闭，当前显示 mock 会议",
    },
  });
}

export function getReadonlyFetchLoadingDiagnostics() {
  return buildReadonlyDiagnostics({
    appointments: {
      status: "loading",
      note: "正在读取 /tasks 今日预约候选，只读模式不会提交或修改数据",
    },
    appointmentDetail: {
      status: "loading",
      note: "正在读取 /daochong/mobile/appointments/:appointmentId，只读模式不会改约、签到或确认完成",
    },
    projects: {
      status: "loading",
      note: "正在读取 /products，只读模式不会提交或修改数据",
    },
    roster: {
      status: "loading",
      note: "正在读取 /settings/shift-roster，只读模式不会提交或修改数据",
    },
    customers: {
      status: "loading",
      note: "正在读取 /customers，只读模式不会提交或修改数据",
    },
    customerCardBalances: {
      status: "loading",
      note: "正在读取 /daochong/mobile/customer-card-balances，只读模式不会开户、调余额、扣卡或写流水",
    },
    wecomReminderDryRuns: {
      status: "loading",
      note: "正在读取 /daochong/mobile/wecom-reminder-dry-runs，只读模式不会创建通知、标记已发送或调用企业微信",
    },
    evidenceAssets: {
      status: "loading",
      note: "正在读取 /daochong/mobile/evidence-assets，只读模式不会上传、复核或归档",
    },
    recharges: {
      status: "loading",
      note: "正在读取 /daochong/mobile/recharges，只读模式不会审批、复核、入账或更新余额",
    },
    settlementDrafts: {
      status: "loading",
      note: "正在读取 /daochong/mobile/settlement-drafts，只读模式不会保存草稿或提交审批",
    },
    consumptionApprovals: {
      status: "loading",
      note: "正在读取 /daochong/mobile/consumption-approvals，只读模式不会通过、退回或扣卡",
    },
    financeSummary: {
      status: "loading",
      note: "正在读取 /daochong/mobile/finance-summary，只读模式不会确认财务或生成工资",
    },
    financeEvidenceExceptions: {
      status: "loading",
      note: "正在读取 /daochong/mobile/finance-evidence-exceptions，只读模式不会退回、补传或确认",
    },
    bonusExpenseItems: {
      status: "loading",
      note: "正在读取 /daochong/mobile/bonus-expense-items，只读模式不会创建、退回或纳入工资",
    },
    compensationRules: {
      status: "loading",
      note: "正在读取 /daochong/mobile/compensation-rules，只读模式不会保存规则、确认工资或生成薪资条",
    },
    projectCommunications: {
      status: "loading",
      note: "正在读取 /daochong/mobile/project-communications，只读模式不会编辑、归档或生成待办",
    },
    meetingNotes: {
      status: "loading",
      note: "正在读取 /daochong/mobile/meeting-notes，只读模式不会编辑、归档或生成待办",
    },
  });
}

async function readJson<T>(
  client: DaochongReadonlyFetchClient,
  path: string,
  emptyMessage: string,
): Promise<ReadonlyFetchResult<T>> {
  try {
    const token = getToken();
    const dataMode = getRecordDataMode();
    const headers = new Headers({
      Accept: "application/json",
    });

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    headers.set("x-huigui-record-scope", dataMode.scope);
    if (dataMode.scope === "TEST" && dataMode.testBatchId) {
      headers.set("x-huigui-test-batch-id", dataMode.testBatchId);
    }

    const response = await client(path, {
      headers,
      method: "GET",
    });

    if (response.status === 401 || response.status === 403) {
      return {
        data: null,
        diagnostic: {
          status: "forbidden",
          note: `无权读取 ${path}，当前保留 mock 回退`,
        },
      };
    }

    if (!response.ok) {
      return {
        data: null,
        diagnostic: {
          status: "error",
          note: `${path} 返回 ${response.status}，当前保留 mock 回退`,
        },
      };
    }

    const data = (await response.json()) as T;
    if (Array.isArray(data) && data.length === 0) {
      return {
        data,
        diagnostic: {
          status: "empty",
          note: emptyMessage,
        },
      };
    }

    return {
      data,
      diagnostic: {
        status: "success",
        note: `已只读读取 ${path}`,
      },
    };
  } catch (error) {
    return {
      data: null,
      diagnostic: {
        status: "error",
        note: error instanceof Error ? error.message : `${path} 读取失败，当前保留 mock 回退`,
      },
    };
  }
}

function normalizeReadonlyEnvelopeDiagnostic<T>(
  data: T | null,
  diagnostic: DaochongReadonlyResourceDiagnosticInput,
  emptyMessage: string,
): DaochongReadonlyResourceDiagnosticInput {
  if (!data || Array.isArray(data) || typeof data !== "object") {
    return diagnostic;
  }

  const envelope = data as {
    diagnostics?: Array<{ key?: unknown; message?: unknown }> | null;
    items?: unknown[] | null;
  };
  const backendDiagnostic = envelope.diagnostics?.find((item) => typeof item.key === "string");
  const backendKey = typeof backendDiagnostic?.key === "string" ? backendDiagnostic.key : "";
  const backendMessage = typeof backendDiagnostic?.message === "string" ? backendDiagnostic.message : undefined;

  if (backendKey.includes("disabled")) {
    return {
      status: "disabled",
      note: backendMessage ?? diagnostic.note,
    };
  }

  if (Array.isArray(envelope.items) && envelope.items.length === 0 && diagnostic.status === "success") {
    return {
      status: "empty",
      note: backendMessage ?? emptyMessage,
    };
  }

  return diagnostic;
}

export async function fetchDaochongReadonlyAdapterInputWithClient(
  client: DaochongReadonlyFetchClient,
): Promise<{
  diagnostics: DaochongReadonlyDiagnosticsInput;
  input: DaochongReadonlyAdapterInput;
}> {
  const appointmentsPath = getDaochongReadonlyAppointmentsPath();
  const [appointments, projects, roster, customers] = await Promise.all([
    readJson<DaochongReadonlyTaskListResponse>(client, appointmentsPath, "日程接口返回空数据，当前保留 mock 预约"),
    readJson<DaochongReadonlyProductRecord[]>(client, READONLY_PROJECTS_PATH, "项目接口返回空数据，当前保留 mock 项目"),
    readJson<DaochongReadonlyShiftRosterResponse>(client, READONLY_ROSTER_PATH, "班表接口返回空数据，当前保留 mock 班表"),
    readJson<DaochongReadonlyCustomerListResponse>(client, READONLY_CUSTOMERS_PATH, "客户接口返回空数据，当前保留 mock 客户"),
  ]);

  return {
    diagnostics: {
      appointments: appointments.diagnostic,
      customers: customers.diagnostic,
      projects: projects.diagnostic,
      roster: roster.diagnostic,
    },
    input: {
      appointmentTaskResponse: appointments.data,
      customerListResponse: customers.data,
      projectRecords: projects.data,
      rosterResponse: roster.data,
    },
  };
}

export function fetchDaochongReadonlyAdapterInput() {
  return fetchDaochongReadonlyAdapterInputWithClient(fetchApi);
}

export async function fetchDaochongReadonlyHighRiskWithClient(
  client: DaochongReadonlyFetchClient,
): Promise<{
  diagnostics: DaochongReadonlyDiagnosticsInput;
  bonusExpenseItems: DaochongReadonlyBonusExpenseItemResponse | null;
  bonusExpenseItemsDiagnostic: DaochongReadonlyResourceDiagnosticInput;
  compensationRules: DaochongReadonlyCompensationRuleResponse | null;
  compensationRulesDiagnostic: DaochongReadonlyResourceDiagnosticInput;
  consumptionApprovals: DaochongReadonlyConsumptionApprovalResponse | null;
  consumptionApprovalsDiagnostic: DaochongReadonlyResourceDiagnosticInput;
  evidenceAssets: DaochongReadonlyEvidenceAssetResponse | null;
  evidenceAssetsDiagnostic: DaochongReadonlyResourceDiagnosticInput;
  financeEvidenceExceptions: DaochongReadonlyFinanceEvidenceExceptionResponse | null;
  financeEvidenceExceptionsDiagnostic: DaochongReadonlyResourceDiagnosticInput;
  financeSummary: DaochongReadonlyFinanceSummaryResponse | null;
  financeSummaryDiagnostic: DaochongReadonlyResourceDiagnosticInput;
  meetingNotes: DaochongReadonlyMeetingNoteResponse | null;
  meetingNotesDiagnostic: DaochongReadonlyResourceDiagnosticInput;
  projectCommunications: DaochongReadonlyProjectCommunicationResponse | null;
  projectCommunicationsDiagnostic: DaochongReadonlyResourceDiagnosticInput;
  recharges: DaochongReadonlyRechargeResponse | null;
  rechargesDiagnostic: DaochongReadonlyResourceDiagnosticInput;
  settlementDrafts: DaochongReadonlySettlementDraftResponse | null;
  settlementDraftsDiagnostic: DaochongReadonlyResourceDiagnosticInput;
}> {
  const evidenceAssetsPath = getDaochongReadonlyEvidenceAssetsPath();
  const rechargesPath = getDaochongReadonlyRechargesPath();
  const settlementDraftsPath = getDaochongReadonlySettlementDraftsPath();
  const consumptionApprovalsPath = getDaochongReadonlyConsumptionApprovalsPath();
  const financeSummaryPath = getDaochongReadonlyFinanceSummaryPath();
  const financeEvidenceExceptionsPath = getDaochongReadonlyFinanceEvidenceExceptionsPath();
  const bonusExpenseItemsPath = getDaochongReadonlyBonusExpenseItemsPath();
  const compensationRulesPath = getDaochongReadonlyCompensationRulesPath();
  const meetingNotesPath = getDaochongReadonlyMeetingNotesPath();
  const projectCommunicationsPath = getDaochongReadonlyProjectCommunicationsPath();
  const [
    evidenceAssets,
    recharges,
    settlementDrafts,
    consumptionApprovals,
    financeSummary,
    financeEvidenceExceptions,
    bonusExpenseItems,
    compensationRules,
    projectCommunications,
    meetingNotes,
  ] = await Promise.all([
    readJson<DaochongReadonlyEvidenceAssetResponse>(
      client,
      evidenceAssetsPath,
      "凭证附件接口返回空数据，当前保留 mock 凭证",
    ),
    readJson<DaochongReadonlyRechargeResponse>(
      client,
      rechargesPath,
      "充值接口返回空数据，当前保留 mock 充值",
    ),
    readJson<DaochongReadonlySettlementDraftResponse>(
      client,
      settlementDraftsPath,
      "结算草稿接口返回空数据，当前保留 mock 草稿",
    ),
    readJson<DaochongReadonlyConsumptionApprovalResponse>(
      client,
      consumptionApprovalsPath,
      "耗卡审批接口返回空数据，当前保留 mock 审批",
    ),
    readJson<DaochongReadonlyFinanceSummaryResponse>(
      client,
      financeSummaryPath,
      "财务汇总接口返回空数据，当前保留 mock 财务",
    ),
    readJson<DaochongReadonlyFinanceEvidenceExceptionResponse>(
      client,
      financeEvidenceExceptionsPath,
      "财务异常接口返回空数据，当前保留 mock 异常",
    ),
    readJson<DaochongReadonlyBonusExpenseItemResponse>(
      client,
      bonusExpenseItemsPath,
      "奖金报销接口返回空数据，当前保留 mock 奖金报销",
    ),
    readJson<DaochongReadonlyCompensationRuleResponse>(
      client,
      compensationRulesPath,
      "薪酬配置接口返回空数据，当前保留 mock 薪酬配置",
    ),
    readJson<DaochongReadonlyProjectCommunicationResponse>(
      client,
      projectCommunicationsPath,
      "项目沟通接口返回空数据，当前保留 mock 沟通",
    ),
    readJson<DaochongReadonlyMeetingNoteResponse>(
      client,
      meetingNotesPath,
      "会议纪要接口返回空数据，当前保留 mock 会议",
    ),
  ]);
  const evidenceAssetsDiagnostic = normalizeReadonlyEnvelopeDiagnostic(
    evidenceAssets.data,
    evidenceAssets.diagnostic,
    "凭证附件接口返回空数据，当前保留 mock 凭证",
  );
  const rechargesDiagnostic = normalizeReadonlyEnvelopeDiagnostic(
    recharges.data,
    recharges.diagnostic,
    "充值接口返回空数据，当前保留 mock 充值",
  );
  const settlementDraftsDiagnostic = normalizeReadonlyEnvelopeDiagnostic(
    settlementDrafts.data,
    settlementDrafts.diagnostic,
    "结算草稿接口返回空数据，当前保留 mock 草稿",
  );
  const consumptionApprovalsDiagnostic = normalizeReadonlyEnvelopeDiagnostic(
    consumptionApprovals.data,
    consumptionApprovals.diagnostic,
    "耗卡审批接口返回空数据，当前保留 mock 审批",
  );
  const financeSummaryDiagnostic = normalizeReadonlyEnvelopeDiagnostic(
    financeSummary.data,
    financeSummary.diagnostic,
    "财务汇总接口返回空数据，当前保留 mock 财务",
  );
  const financeEvidenceExceptionsDiagnostic = normalizeReadonlyEnvelopeDiagnostic(
    financeEvidenceExceptions.data,
    financeEvidenceExceptions.diagnostic,
    "财务异常接口返回空数据，当前保留 mock 异常",
  );
  const bonusExpenseItemsDiagnostic = normalizeReadonlyEnvelopeDiagnostic(
    bonusExpenseItems.data,
    bonusExpenseItems.diagnostic,
    "奖金报销接口返回空数据，当前保留 mock 奖金报销",
  );
  const compensationRulesDiagnostic = normalizeReadonlyEnvelopeDiagnostic(
    compensationRules.data,
    compensationRules.diagnostic,
    "薪酬配置接口返回空数据，当前保留 mock 薪酬配置",
  );
  const projectCommunicationsDiagnostic = normalizeReadonlyEnvelopeDiagnostic(
    projectCommunications.data,
    projectCommunications.diagnostic,
    "项目沟通接口返回空数据，当前保留 mock 沟通",
  );
  const meetingNotesDiagnostic = normalizeReadonlyEnvelopeDiagnostic(
    meetingNotes.data,
    meetingNotes.diagnostic,
    "会议纪要接口返回空数据，当前保留 mock 会议",
  );

  return {
    diagnostics: {
      bonusExpenseItems: bonusExpenseItemsDiagnostic,
      compensationRules: compensationRulesDiagnostic,
      consumptionApprovals: consumptionApprovalsDiagnostic,
      evidenceAssets: evidenceAssetsDiagnostic,
      financeEvidenceExceptions: financeEvidenceExceptionsDiagnostic,
      financeSummary: financeSummaryDiagnostic,
      meetingNotes: meetingNotesDiagnostic,
      projectCommunications: projectCommunicationsDiagnostic,
      recharges: rechargesDiagnostic,
      settlementDrafts: settlementDraftsDiagnostic,
    },
    bonusExpenseItems: bonusExpenseItems.data,
    bonusExpenseItemsDiagnostic,
    compensationRules: compensationRules.data,
    compensationRulesDiagnostic,
    consumptionApprovals: consumptionApprovals.data,
    consumptionApprovalsDiagnostic,
    evidenceAssets: evidenceAssets.data,
    evidenceAssetsDiagnostic,
    financeEvidenceExceptions: financeEvidenceExceptions.data,
    financeEvidenceExceptionsDiagnostic,
    financeSummary: financeSummary.data,
    financeSummaryDiagnostic,
    meetingNotes: meetingNotes.data,
    meetingNotesDiagnostic,
    projectCommunications: projectCommunications.data,
    projectCommunicationsDiagnostic,
    recharges: recharges.data,
    rechargesDiagnostic,
    settlementDrafts: settlementDrafts.data,
    settlementDraftsDiagnostic,
  };
}

export function fetchDaochongReadonlyHighRisk() {
  return fetchDaochongReadonlyHighRiskWithClient(fetchApi);
}

export function fetchDaochongReadonlyCustomerDetailWithClient(
  client: DaochongReadonlyFetchClient,
  customerId: string,
) {
  const path = getDaochongReadonlyCustomerDetailPath(customerId);
  const serviceNotesPath = getDaochongReadonlyServiceNotesPath(customerId);
  const wecomReminderDryRunsPath = getDaochongReadonlyWecomReminderDryRunsPath(customerId);
  const customerPreferencesPath = getDaochongReadonlyCustomerPreferencesPath(customerId);
  const customerCardBalancesPath = getDaochongReadonlyCustomerCardBalancesPath(customerId);

  return Promise.all([
    readJson<DaochongReadonlyCustomerDetailRecord>(client, path, "客户详情接口返回空数据，当前保留 mock 客户档案"),
    readJson<DaochongReadonlyServiceNoteResponse>(client, serviceNotesPath, "服务纪要接口返回空数据，当前保留候选纪要"),
    readJson<DaochongReadonlyWecomReminderDryRunResponse>(
      client,
      wecomReminderDryRunsPath,
      "企微提醒 dry-run 接口返回空数据，当前保留 mock 提醒预览",
    ),
    readJson<DaochongReadonlyCustomerPreferenceResponse>(
      client,
      customerPreferencesPath,
      "客户偏好接口返回空数据，当前保留候选偏好",
    ),
    readJson<DaochongReadonlyCustomerCardBalanceResponse>(
      client,
      customerCardBalancesPath,
      "客户卡项余额接口返回空数据，当前保留卡项缺口",
    ),
  ]).then(([detail, serviceNotes, wecomReminderDryRuns, customerPreferences, customerCardBalances]) => ({
    data: detail.data,
    diagnostic: detail.diagnostic,
    customerCardBalances: customerCardBalances.data,
    customerCardBalancesDiagnostic: normalizeReadonlyEnvelopeDiagnostic(
      customerCardBalances.data,
      customerCardBalances.diagnostic,
      "客户卡项余额接口返回空数据，当前保留卡项缺口",
    ),
    customerPreferences: customerPreferences.data,
    customerPreferencesDiagnostic: customerPreferences.diagnostic,
    serviceNotes: serviceNotes.data,
    serviceNotesDiagnostic: serviceNotes.diagnostic,
    wecomReminderDryRuns: wecomReminderDryRuns.data,
    wecomReminderDryRunsDiagnostic: normalizeReadonlyEnvelopeDiagnostic(
      wecomReminderDryRuns.data,
      wecomReminderDryRuns.diagnostic,
      "企微提醒 dry-run 接口返回空数据，当前保留 mock 提醒预览",
    ),
  }));
}

export function fetchDaochongReadonlyCustomerDetail(customerId: string) {
  return fetchDaochongReadonlyCustomerDetailWithClient(fetchApi, customerId);
}

export function fetchDaochongReadonlyAppointmentDetailWithClient(
  client: DaochongReadonlyFetchClient,
  appointmentId: string,
) {
  const path = getDaochongReadonlyAppointmentDetailPath(appointmentId);

  return readJson<DaochongReadonlyAppointmentDetailResponse>(
    client,
    path,
    "预约详情接口返回空数据，当前保留 mock 预约详情",
  ).then(({ data, diagnostic }) => ({
    data,
    diagnostic: normalizeReadonlyEnvelopeDiagnostic(
      data,
      diagnostic,
      "预约详情接口返回空数据，当前保留 mock 预约详情",
    ),
  }));
}

export function fetchDaochongReadonlyAppointmentDetail(appointmentId: string) {
  return fetchDaochongReadonlyAppointmentDetailWithClient(fetchApi, appointmentId);
}
