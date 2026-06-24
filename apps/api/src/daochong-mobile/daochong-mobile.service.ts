import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { RecordDataScope } from "@prisma/client";
import { AccessControlService } from "../common/services/access-control.service";
import { RecordPartitionService } from "../common/services/record-partition.service";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { WecomMessageService } from "../modules/wecom/wecom-message.service";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateDaochongRechargeDto,
  CreateDaochongServiceNoteDto,
  DaochongCustomerCardBalancesReadonlyQueryDto,
  DaochongCustomerPreferencesReadonlyQueryDto,
  DaochongHighRiskReadonlyQueryDto,
  DaochongServiceNotePreferenceWriteDto,
  DaochongServiceNotesReadonlyQueryDto,
  DaochongWecomReminderDryRunsReadonlyQueryDto,
  ReturnDaochongRechargeByChengchengDto,
  ReturnDaochongRechargeByLimengDto,
  SendDaochongWecomReminderTestDto,
  UpdateDaochongServiceNoteDto,
} from "./dto/daochong-mobile.dto";
import { DaochongPreferenceTypeQuery } from "./dto/daochong-mobile.dto";

type ReadonlyDelegate = {
  findMany(args: Record<string, unknown>): Promise<unknown[]>;
};

type ReadonlySingleDelegate = {
  findFirst(args: Record<string, unknown>): Promise<unknown | null>;
};

type DaochongServiceNoteDelegate = ReadonlyDelegate & ReadonlySingleDelegate & {
  create(args: Record<string, unknown>): Promise<unknown>;
  update(args: Record<string, unknown>): Promise<unknown>;
};

type DaochongCustomerPreferenceDelegate = ReadonlyDelegate & {
  create(args: Record<string, unknown>): Promise<unknown>;
};

type DaochongCustomerRechargeDelegate = ReadonlyDelegate & {
  findFirst(args: Record<string, unknown>): Promise<unknown | null>;
  create(args: Record<string, unknown>): Promise<unknown>;
  update(args: Record<string, unknown>): Promise<unknown>;
};

type DaochongReadonlyPrisma = {
  daochongBonusExpenseItem: ReadonlyDelegate;
  daochongCardConsumptionApproval: ReadonlyDelegate;
  daochongCustomerRecharge: DaochongCustomerRechargeDelegate;
  daochongFinanceEvidenceException: ReadonlyDelegate;
  daochongFinanceSummary: ReadonlyDelegate;
  daochongServiceSettlementDraft: ReadonlyDelegate;
  daochongServiceNote: DaochongServiceNoteDelegate;
  daochongCustomerPreference: DaochongCustomerPreferenceDelegate;
  fileRecord: ReadonlyDelegate;
  meetingMinutesRecord: ReadonlyDelegate;
  customer: ReadonlySingleDelegate;
  task: ReadonlySingleDelegate;
};

type DaochongReadonlyDiagnostic = {
  key: string;
  level: "info" | "warning";
  message: string;
};

type DaochongHighRiskReadonlyResource =
  | "recharges"
  | "evidence_assets"
  | "settlement_drafts"
  | "consumption_approvals"
  | "compensation_rules"
  | "finance_summary"
  | "finance_evidence_exceptions"
  | "bonus_expense_items"
  | "project_communications"
  | "meeting_notes";

type DaochongEvidenceAssetRecord = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string | null;
  fileSizeBytes: number | null;
  category: string | null;
  tagText: string | null;
  note: string | null;
  businessType: string | null;
  businessId: string | null;
  relatedType: string | null;
  relatedId: string | null;
  folderId: string | null;
  status: string;
  isImportant: boolean;
  isArchived: boolean;
  permissionScope: string | null;
  versionGroupId: string | null;
  versionNumber: number;
  versionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  uploader: {
    id: string;
    name: string;
    loginAccount: string | null;
  };
};

type DaochongMeetingNoteRecord = {
  id: string;
  folderId: string;
  title: string;
  meetingAt: Date;
  sourceType: string;
  recordJson: unknown;
  createdBy: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type DaochongReadonlyUserRecord = {
  id: string;
  name: string;
  loginAccount: string | null;
};

type DaochongFinanceSummaryRecord = {
  id: string;
  summaryMonth: string;
  confirmedRechargeAmount: unknown;
  pendingCashCustodyAmount: unknown;
  approvedConsumeAmount: unknown;
  commissionAmount: unknown;
  referralBonusAmount: unknown;
  teamBonusAmount: unknown;
  expenseAmount: unknown;
  evidenceAssetIds: unknown;
  sourceCutoffAt: Date;
  exceptionCount: number;
  payrollPreviewStatus: string;
  canConfirmFinance: boolean;
  financeStatus: string;
  confirmedByUserId: string | null;
  confirmedAt: Date | null;
  lockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  confirmedBy: DaochongReadonlyUserRecord | null;
};

type DaochongFinanceEvidenceExceptionRecord = {
  id: string;
  summaryId: string | null;
  businessType: string;
  businessId: string;
  exceptionReason: string;
  currentOwnerUserId: string | null;
  returnTargetUserId: string | null;
  exceptionStatus: string;
  evidenceAssetIds: unknown;
  supplementRequirements: string | null;
  resolvedByUserId: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  summary: { id: string; summaryMonth: string } | null;
  currentOwner: DaochongReadonlyUserRecord | null;
  returnTarget: DaochongReadonlyUserRecord | null;
  resolvedBy: DaochongReadonlyUserRecord | null;
};

type DaochongBonusExpenseItemRecord = {
  id: string;
  itemType: string;
  targetUserId: string | null;
  customerId: string | null;
  submittedByUserId: string;
  amount: unknown;
  reason: string;
  evidenceAssetIds: unknown;
  financeStatus: string;
  summaryMonth: string | null;
  summaryId: string | null;
  returnReason: string | null;
  financeReviewedByUserId: string | null;
  financeReviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  targetUser: DaochongReadonlyUserRecord | null;
  customer: {
    id: string;
    customerName: string;
    contactName: string | null;
    companyName: string | null;
  } | null;
  submittedBy: DaochongReadonlyUserRecord;
  financeReviewedBy: DaochongReadonlyUserRecord | null;
  summary: { id: string; summaryMonth: string } | null;
};

type DaochongReadonlyCustomerMiniRecord = {
  id: string;
  customerName: string;
  contactName: string | null;
  companyName: string | null;
};

type DaochongReadonlyProductMiniRecord = {
  id: string;
  displayName: string;
  name: string;
};

type DaochongAppointmentDetailTaskRecord = {
  id: string;
  title: string;
  type: string;
  status: string;
  startAt: Date;
  endAt: Date | null;
  reminderAt: Date | null;
  content: string | null;
  customerId: string | null;
  quotationId: string | null;
  agriculturePlanId: string | null;
  assigneeUserId: string;
  createdBy: string;
  dataScope: string;
  partitionKey: string;
  testBatchId: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: (DaochongReadonlyCustomerMiniRecord & {
    mobile: string | null;
    status: string;
  }) | null;
  quotation: {
    id: string;
    quotationNo: string;
    status: string;
    totalDiscountedAmount: unknown;
    customer: DaochongReadonlyCustomerMiniRecord | null;
    items: Array<{
      itemName: string;
      product: DaochongReadonlyProductMiniRecord | null;
    }>;
  } | null;
  agriculturePlan: {
    id: string;
    quotationId: string;
    detailJson: unknown;
    customer: DaochongReadonlyCustomerMiniRecord | null;
  } | null;
  assignee: DaochongReadonlyUserRecord;
  creator: DaochongReadonlyUserRecord;
};

type DaochongAppointmentServiceNoteRecord = {
  id: string;
  appointmentId: string | null;
  settlementDraftId: string | null;
  customerId: string;
  teacherId: string;
  projectId: string | null;
  roomId: string | null;
  noteStatus: string;
  dueAt: Date | null;
  reminderScheduledAt: Date | null;
  remindedAt: Date | null;
  completedAt: Date | null;
  project: DaochongReadonlyProductMiniRecord | null;
};

type DaochongWecomReminderUserRecord = DaochongReadonlyUserRecord & {
  wecomName: string | null;
  wecomUserId: string | null;
};

type DaochongWecomReminderDryRunServiceNoteRecord = {
  id: string;
  appointmentId: string | null;
  settlementDraftId: string | null;
  customerId: string;
  teacherId: string;
  projectId: string | null;
  roomId: string | null;
  sourceType: string;
  pendingReason: string | null;
  serviceSummary: string | null;
  customerFeedback: string | null;
  nextSuggestion: string | null;
  preferenceSyncStatus: string;
  noteStatus: string;
  dueAt: Date | null;
  reminderScheduledAt: Date | null;
  remindedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customer: DaochongReadonlyCustomerMiniRecord;
  teacher: DaochongWecomReminderUserRecord;
  project: DaochongReadonlyProductMiniRecord | null;
};

type DaochongServiceNoteWriteRecord = DaochongWecomReminderDryRunServiceNoteRecord & {
  preferenceNote: string | null;
  createdByUserId: string | null;
  dataScope: RecordDataScope;
  partitionKey: string;
  testBatchId: string | null;
  createdBy: DaochongReadonlyUserRecord | null;
};

type DaochongCustomerWriteContextRecord = DaochongReadonlyCustomerMiniRecord & {
  dataScope: RecordDataScope;
  partitionKey: string;
  testBatchId: string | null;
};

type DaochongTaskWriteContextRecord = {
  id: string;
  customerId: string | null;
  assigneeUserId: string;
  dataScope: RecordDataScope;
  partitionKey: string;
  testBatchId: string | null;
};

type DaochongServiceNotePreferenceWriteInput = {
  preferenceType: string;
  preferenceLabel: string;
  preferenceValue: string;
  roomPreference: string | null;
  lightPreference: string | null;
  pressurePreference: string | null;
  tabooNotes: string | null;
  hobbyNotes: string | null;
  visibility: string;
};

type DaochongCustomerRechargeRecord = {
  id: string;
  customerId: string;
  submittedByUserId: string;
  amount: unknown;
  paymentMethod: string;
  evidenceAssetIds: unknown;
  cashPhotoAssetIds: unknown;
  cashAmount: unknown;
  cashCustodianUserId: string | null;
  rechargeStatus: string;
  chengchengApprovedByUserId: string | null;
  chengchengApprovedAt: Date | null;
  limengReviewedByUserId: string | null;
  limengReviewedAt: Date | null;
  returnReason: string | null;
  balanceAppliedAt: Date | null;
  financeSummaryMonth: string | null;
  dataScope: RecordDataScope;
  partitionKey: string;
  testBatchId: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: DaochongReadonlyCustomerMiniRecord;
  submittedBy: DaochongReadonlyUserRecord;
  cashCustodian: DaochongReadonlyUserRecord | null;
  chengchengApprover: DaochongReadonlyUserRecord | null;
  limengReviewer: DaochongReadonlyUserRecord | null;
};

type DaochongServiceSettlementDraftRecord = {
  id: string;
  appointmentId: string | null;
  customerId: string;
  teacherId: string;
  projectId: string | null;
  cardMode: string;
  cardId: string | null;
  originalAmount: unknown;
  discountAmount: unknown;
  discountReason: string | null;
  finalAmount: unknown;
  consumeAmount: unknown;
  evidenceAssetIds: unknown;
  referrerName: string | null;
  referralBonusAmount: unknown;
  validationStatus: string;
  canSubmitApproval: boolean;
  draftStatus: string;
  submittedByUserId: string | null;
  submittedAt: Date | null;
  returnedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: DaochongReadonlyCustomerMiniRecord;
  teacher: DaochongReadonlyUserRecord;
  project: DaochongReadonlyProductMiniRecord | null;
  submittedBy: DaochongReadonlyUserRecord | null;
};

type DaochongCardConsumptionApprovalRecord = {
  id: string;
  settlementDraftId: string;
  customerId: string;
  teacherId: string;
  cardId: string | null;
  consumeAmount: unknown;
  evidenceAssetIds: unknown;
  discountReason: string | null;
  referrerName: string | null;
  referralBonusAmount: unknown;
  approvalStatus: string;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  returnedByUserId: string | null;
  returnedAt: Date | null;
  returnReason: string | null;
  supplementRequirements: string | null;
  financeSummaryMonth: string | null;
  createdAt: Date;
  updatedAt: Date;
  settlementDraft: { id: string; appointmentId: string | null; draftStatus: string } | null;
  customer: DaochongReadonlyCustomerMiniRecord;
  teacher: DaochongReadonlyUserRecord;
  approvedBy: DaochongReadonlyUserRecord | null;
  returnedBy: DaochongReadonlyUserRecord | null;
};

type DaochongCustomerCardBalanceCustomerRecord = DaochongReadonlyCustomerMiniRecord & {
  mobile: string | null;
};

type DaochongCustomerCardBalanceRechargeRecord = {
  id: string;
  amount: unknown;
  paymentMethod: string;
  rechargeStatus: string;
  balanceAppliedAt: Date | null;
  financeSummaryMonth: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type DaochongCustomerCardBalanceConsumptionRecord = {
  id: string;
  cardId: string | null;
  consumeAmount: unknown;
  approvalStatus: string;
  approvedAt: Date | null;
  financeSummaryMonth: string | null;
  settlementDraft: { id: string; appointmentId: string | null; draftStatus: string } | null;
  createdAt: Date;
  updatedAt: Date;
};

const FILE_RECORD_STATUSES = new Set(["DRAFT", "PENDING_REVIEW", "ACTIVE", "ARCHIVED", "OBSOLETE"]);
const DAOCHONG_PAYMENT_METHODS = new Set(["WECHAT", "ALIPAY", "BANK_TRANSFER", "CASH", "CARD_CONSUME", "OTHER"]);
const DAOCHONG_RECHARGE_STATUSES = new Set([
  "PENDING_CHENGCHENG_APPROVAL",
  "RETURNED_BY_CHENGCHENG",
  "PENDING_LIMENG_REVIEW",
  "RETURNED_BY_LIMENG",
  "CONFIRMED",
  "CANCELLED",
]);
const DAOCHONG_SETTLEMENT_DRAFT_STATUSES = new Set([
  "DRAFT",
  "BLOCKED_EVIDENCE",
  "READY_FOR_APPROVAL",
  "SUBMITTED_FOR_APPROVAL",
  "RETURNED",
  "CANCELLED",
]);
const DAOCHONG_CARD_MODES = new Set(["NO_CARD", "PREPAID_CARD", "PACKAGE_CARD"]);
const DAOCHONG_CONSUMPTION_APPROVAL_STATUSES = new Set(["PENDING", "APPROVED", "RETURNED", "CANCELLED"]);
const DAOCHONG_FINANCE_STATUSES = new Set(["DRAFT", "EVIDENCE_EXCEPTION", "READY_FOR_REVIEW", "CONFIRMED", "CANCELLED"]);
const DAOCHONG_FINANCE_EXCEPTION_STATUSES = new Set(["PENDING_SUPPLEMENT", "SUPPLEMENTED", "CONFIRMED", "CLOSED", "CANCELLED"]);
const DAOCHONG_FINANCE_BUSINESS_TYPES = new Set(["RECHARGE", "SETTLEMENT", "CONSUMPTION_APPROVAL", "BONUS", "EXPENSE", "WELFARE"]);
const DAOCHONG_BONUS_EXPENSE_TYPES = new Set(["TEAM_BONUS", "REFERRAL_BONUS", "WELFARE_ALLOWANCE", "EXPENSE_REIMBURSEMENT", "DEDUCTION"]);
const DAOCHONG_BONUS_EXPENSE_STATUSES = new Set(["DRAFT", "PENDING_EVIDENCE", "PENDING_FINANCE_REVIEW", "RETURNED", "INCLUDED_IN_SUMMARY", "CANCELLED"]);
const DAOCHONG_SERVICE_NOTE_STATUSES = new Set(["PENDING", "COMPLETED", "OVERDUE", "RETURNED", "CANCELLED"]);
const MAX_DAOCHONG_SERVICE_NOTE_PREFERENCES = 20;
const DAOCHONG_USER_SELECT = {
  id: true,
  loginAccount: true,
  name: true,
};
const DAOCHONG_USER_WECOM_SELECT = {
  ...DAOCHONG_USER_SELECT,
  wecomName: true,
  wecomUserId: true,
};
const DAOCHONG_CUSTOMER_SELECT = {
  companyName: true,
  contactName: true,
  customerName: true,
  id: true,
};
const DAOCHONG_PRODUCT_SELECT = {
  displayName: true,
  id: true,
  name: true,
};

@Injectable()
export class DaochongMobileReadonlyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly configService: ConfigService,
    private readonly recordPartition: RecordPartitionService,
    private readonly wecomMessageService: WecomMessageService,
  ) {}

  private get daochongPrisma() {
    return this.prisma as unknown as DaochongReadonlyPrisma;
  }

  private isShadowReadonlyEnabled() {
    return this.configService.get<string>("DAOCHONG_MOBILE_SHADOW_READONLY") === "true";
  }

  private isHighRiskReadonlyEnabled() {
    return this.configService.get<string>("DAOCHONG_MOBILE_HIGH_RISK_READONLY") === "true";
  }

  private disabledResponse(key: string) {
    return {
      items: [],
      diagnostics: [
        {
          key,
          level: "info",
          message: "道冲手机端影子只读接口未开启，灰度页继续使用 mock 或空状态。",
        } satisfies DaochongReadonlyDiagnostic,
      ],
    };
  }

  private highRiskDisabledResponse(key: DaochongHighRiskReadonlyResource) {
    return {
      items: [],
      diagnostics: [
        {
          key: `${key}_high_risk_readonly_disabled`,
          level: "info",
          message: "道冲资金、凭证、审批和财务影子只读接口未开启，灰度页继续使用 mock 或空状态。",
        } satisfies DaochongReadonlyDiagnostic,
      ],
    };
  }

  private highRiskSourcePendingResponse(
    key: DaochongHighRiskReadonlyResource,
    query: DaochongHighRiskReadonlyQueryDto,
    user: AuthenticatedUser,
  ) {
    const scopeText = [
      query.customerId ? `customerId=${query.customerId}` : undefined,
      query.businessId ? `businessId=${query.businessId}` : undefined,
      query.businessType ? `businessType=${query.businessType}` : undefined,
      query.relatedType ? `relatedType=${query.relatedType}` : undefined,
      query.folderId ? `folderId=${query.folderId}` : undefined,
      query.keyword ? `keyword=${query.keyword}` : undefined,
      query.summaryMonth ? `summaryMonth=${query.summaryMonth}` : undefined,
      query.effectiveMonth ? `effectiveMonth=${query.effectiveMonth}` : undefined,
      query.status ? `status=${query.status}` : undefined,
      `limit=${query.limit ?? 50}`,
      `role=${user.roleCode}`,
    ]
      .filter(Boolean)
      .join("; ");

    return {
      items: [],
      diagnostics: [
        {
          key: `${key}_source_mapping_pending`,
          level: "warning",
          message: `道冲 ${key} 仍未绑定真实影子来源，本次只返回空状态；${scopeText}`,
        } satisfies DaochongReadonlyDiagnostic,
      ],
    };
  }

  private buildDueBeforeFilter(value?: string) {
    if (!value) {
      return undefined;
    }

    const dueBefore = new Date(value);
    return Number.isNaN(dueBefore.getTime()) ? undefined : { lte: dueBefore };
  }

  private normalizeLimit(value?: number) {
    return Math.min(Math.max(value ?? 50, 1), 100);
  }

  private normalizeText(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
  }

  private optionalText(value: unknown) {
    const text = this.normalizeText(value);
    return text || undefined;
  }

  private nullableText(value: unknown) {
    const text = this.normalizeText(value);
    return text || null;
  }

  private requireText(value: unknown, message: string) {
    const text = this.optionalText(value);
    if (!text) {
      throw new BadRequestException(message);
    }
    return text;
  }

  private normalizeTextList(value: unknown, label: string, maxItems = 20) {
    if (!Array.isArray(value)) {
      return [];
    }

    const items = Array.from(new Set(value
      .map((item) => this.normalizeText(item))
      .filter(Boolean)));

    if (items.length > maxItems) {
      throw new BadRequestException(`${label}最多 ${maxItems} 条。`);
    }

    return items;
  }

  private requireTextList(value: unknown, label: string, maxItems = 20) {
    const items = this.normalizeTextList(value, label, maxItems);
    if (items.length === 0) {
      throw new BadRequestException(`${label}不能为空。`);
    }
    return items;
  }

  private parsePositiveMoney(value: unknown, label: string) {
    const text = this.requireText(value, `${label}不能为空。`).replace(/,/g, "");
    if (!/^\d+(\.\d{1,2})?$/.test(text)) {
      throw new BadRequestException(`${label}必须是最多两位小数的金额。`);
    }

    const amount = Number(text);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(`${label}必须大于 0。`);
    }
    if (amount > 9_999_999) {
      throw new BadRequestException(`${label}不能超过 9999999。`);
    }

    return amount.toFixed(2);
  }

  private financeSummaryMonthFor(date: Date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      month: "2-digit",
      timeZone: "Asia/Shanghai",
      year: "numeric",
    }).formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    if (!year || !month) {
      return date.toISOString().slice(0, 7);
    }
    return `${year}-${month}`;
  }

  private hasOwn(value: object, key: string) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  private parseNullableDate(value: unknown, label: string) {
    const text = this.optionalText(value);
    if (!text) {
      return null;
    }

    const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(text)
      ? `${text.replace(" ", "T")}+08:00`
      : text;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${label}不是有效时间`);
    }
    return date;
  }

  private splitConfigList(value: unknown) {
    if (typeof value !== "string") {
      return [];
    }

    return Array.from(new Set(value
      .split(/[\s,，|;；、]+/)
      .map((item) => item.trim())
      .filter(Boolean)));
  }

  private isWriteEnabled() {
    return this.configService.get<string>("DAOCHONG_MOBILE_WRITE_ENABLED") === "true";
  }

  private assertWriteEnabled() {
    if (!this.isWriteEnabled()) {
      throw new ForbiddenException("道冲手机端真实写入未开启。");
    }
  }

  private isWecomTestSendEnabled() {
    return this.configService.get<string>("DAOCHONG_WECOM_TEST_SEND_ENABLED") === "true";
  }

  private getWecomTestAllowlist() {
    return this.splitConfigList(
      this.configService.get<string>("DAOCHONG_WECOM_TEST_ALLOWLIST")
        ?? this.configService.get<string>("DAOCHONG_WECOM_TEST_USER_IDS"),
    );
  }

  private assertWecomTestTargetAllowed(toUser: string) {
    if (!this.isWecomTestSendEnabled()) {
      throw new ForbiddenException("道冲企业微信测试发送未开启。");
    }

    const targets = this.splitConfigList(toUser);
    if (targets.length !== 1) {
      throw new BadRequestException("道冲企业微信测试发送一次只能指定 1 个接收账号。");
    }

    const allowlist = this.getWecomTestAllowlist();
    if (allowlist.length === 0 || allowlist.includes("*")) {
      throw new ServiceUnavailableException("道冲企业微信测试发送白名单未配置或配置不安全。");
    }

    if (!allowlist.includes(targets[0])) {
      throw new ForbiddenException("接收账号不在道冲企业微信测试发送白名单内。");
    }

    return {
      target: targets[0],
      allowlistSize: allowlist.length,
    };
  }

  private normalizeBaseUrl(value: string) {
    const trimmed = value.trim().replace(/\/$/, "");
    return trimmed.includes("://") ? trimmed : `https://${trimmed}`;
  }

  private resolveDaochongMobileBaseUrl() {
    const directKeys = [
      "DAOCHONG_MOBILE_NOTIFY_BASE_URL",
      "PAYROLL_EMPLOYEE_BASE_URL",
      "EMPLOYEE_FRONTEND_BASE_URL",
      "EMPLOYEE_APP_BASE_URL",
    ];
    for (const key of directKeys) {
      const value = this.optionalText(this.configService.get<string>(key));
      if (value) {
        return this.normalizeBaseUrl(value);
      }
    }

    const domainKeys = [
      "WECOM_EMPLOYEE_DOMAIN",
      "WECOM_DAAI_DOMAIN",
      "WECOM_MANAGEMENT_DOMAIN",
    ];
    for (const key of domainKeys) {
      const value = this.optionalText(this.configService.get<string>(key));
      if (value) {
        return this.normalizeBaseUrl(value);
      }
    }

    return "https://management.hui-health.com";
  }

  private resolveDaochongNotifyUrl(value: unknown, serviceNoteId: string) {
    const baseUrl = this.resolveDaochongMobileBaseUrl();
    const target = this.optionalText(value)
      ?? `/daochong-mobile?serviceNoteId=${encodeURIComponent(serviceNoteId)}&page=serviceNote`;

    try {
      const url = new URL(target, baseUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("invalid protocol");
      }
      return url.toString();
    } catch {
      throw new BadRequestException("道冲企微通知链接不是有效 URL。");
    }
  }

  private toIsoDate(value: unknown) {
    return value instanceof Date ? value.toISOString() : value;
  }

  private toDecimalText(value: unknown) {
    if (value === null || value === undefined) {
      return "0";
    }
    if (typeof value === "number" || typeof value === "string") {
      return String(value);
    }
    if (typeof value === "object" && "toString" in value && typeof value.toString === "function") {
      return value.toString();
    }
    return "0";
  }

  private toDecimalNumber(value: unknown) {
    const numeric = Number(this.toDecimalText(value));
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private toMoneyText(value: number) {
    return value.toFixed(2);
  }

  private scopedWhere(user: AuthenticatedUser) {
    return {
      dataScope: user.recordDataScope,
    };
  }

  private buildRechargeWhere(query: DaochongHighRiskReadonlyQueryDto, user: AuthenticatedUser) {
    const where: Record<string, unknown> = this.scopedWhere(user);
    const status = this.normalizeText(query.status).toUpperCase();
    const paymentMethod = this.normalizeText(query.businessType).toUpperCase();

    if (DAOCHONG_RECHARGE_STATUSES.has(status)) {
      where.rechargeStatus = status;
    }
    if (DAOCHONG_PAYMENT_METHODS.has(paymentMethod)) {
      where.paymentMethod = paymentMethod;
    }
    if (query.customerId) {
      where.customerId = query.customerId;
    }
    if (query.businessId) {
      where.id = query.businessId;
    }
    if (query.summaryMonth) {
      where.financeSummaryMonth = query.summaryMonth;
    }
    if (query.keyword) {
      where.OR = [
        { id: { contains: query.keyword } },
        { returnReason: { contains: query.keyword } },
      ];
    }

    return where;
  }

  private buildSettlementDraftWhere(query: DaochongHighRiskReadonlyQueryDto, user: AuthenticatedUser) {
    const where: Record<string, unknown> = this.scopedWhere(user);
    const status = this.normalizeText(query.status).toUpperCase();
    const cardMode = this.normalizeText(query.businessType).toUpperCase();

    if (DAOCHONG_SETTLEMENT_DRAFT_STATUSES.has(status)) {
      where.draftStatus = status;
    }
    if (DAOCHONG_CARD_MODES.has(cardMode)) {
      where.cardMode = cardMode;
    }
    if (query.customerId) {
      where.customerId = query.customerId;
    }
    if (query.businessId) {
      where.OR = [
        { id: query.businessId },
        { appointmentId: query.businessId },
      ];
    }
    if (query.keyword) {
      const keywordOr = [
        { discountReason: { contains: query.keyword } },
        { referrerName: { contains: query.keyword } },
        { returnedReason: { contains: query.keyword } },
        { validationStatus: { contains: query.keyword } },
      ];
      where.OR = Array.isArray(where.OR) ? [...where.OR as Record<string, unknown>[], ...keywordOr] : keywordOr;
    }

    return where;
  }

  private buildConsumptionApprovalWhere(query: DaochongHighRiskReadonlyQueryDto, user: AuthenticatedUser) {
    const where: Record<string, unknown> = this.scopedWhere(user);
    const status = this.normalizeText(query.status).toUpperCase();

    if (DAOCHONG_CONSUMPTION_APPROVAL_STATUSES.has(status)) {
      where.approvalStatus = status;
    }
    if (query.customerId) {
      where.customerId = query.customerId;
    }
    if (query.businessId) {
      where.OR = [
        { id: query.businessId },
        { settlementDraftId: query.businessId },
      ];
    }
    if (query.summaryMonth) {
      where.financeSummaryMonth = query.summaryMonth;
    }
    if (query.keyword) {
      const keywordOr = [
        { discountReason: { contains: query.keyword } },
        { referrerName: { contains: query.keyword } },
        { returnReason: { contains: query.keyword } },
        { supplementRequirements: { contains: query.keyword } },
      ];
      where.OR = Array.isArray(where.OR) ? [...where.OR as Record<string, unknown>[], ...keywordOr] : keywordOr;
    }

    return where;
  }

  private buildFinanceSummaryWhere(query: DaochongHighRiskReadonlyQueryDto, user: AuthenticatedUser) {
    const where: Record<string, unknown> = this.scopedWhere(user);
    if (query.summaryMonth) {
      where.summaryMonth = query.summaryMonth;
    }

    const status = this.normalizeText(query.status).toUpperCase();
    if (DAOCHONG_FINANCE_STATUSES.has(status)) {
      where.financeStatus = status;
    }

    return where;
  }

  private buildFinanceEvidenceExceptionWhere(query: DaochongHighRiskReadonlyQueryDto, user: AuthenticatedUser) {
    const where: Record<string, unknown> = this.scopedWhere(user);
    const status = this.normalizeText(query.status).toUpperCase();
    const businessType = this.normalizeText(query.businessType).toUpperCase();

    if (DAOCHONG_FINANCE_EXCEPTION_STATUSES.has(status)) {
      where.exceptionStatus = status;
    }
    if (DAOCHONG_FINANCE_BUSINESS_TYPES.has(businessType)) {
      where.businessType = businessType;
    }
    if (query.businessId) {
      where.businessId = query.businessId;
    }
    if (query.summaryMonth) {
      where.summary = { summaryMonth: query.summaryMonth };
    }
    if (query.keyword) {
      where.OR = [
        { exceptionReason: { contains: query.keyword } },
        { supplementRequirements: { contains: query.keyword } },
        { businessId: { contains: query.keyword } },
      ];
    }

    return where;
  }

  private buildBonusExpenseWhere(query: DaochongHighRiskReadonlyQueryDto, user: AuthenticatedUser) {
    const where: Record<string, unknown> = this.scopedWhere(user);
    const status = this.normalizeText(query.status).toUpperCase();
    const itemType = this.normalizeText(query.businessType).toUpperCase();

    if (DAOCHONG_BONUS_EXPENSE_STATUSES.has(status)) {
      where.financeStatus = status;
    }
    if (DAOCHONG_BONUS_EXPENSE_TYPES.has(itemType)) {
      where.itemType = itemType;
    }
    if (query.summaryMonth) {
      where.summaryMonth = query.summaryMonth;
    }
    if (query.customerId) {
      where.customerId = query.customerId;
    }
    if (query.businessId) {
      where.id = query.businessId;
    }
    if (query.keyword) {
      where.OR = [
        { reason: { contains: query.keyword } },
        { returnReason: { contains: query.keyword } },
      ];
    }

    return where;
  }

  private buildEvidenceWhere(query: DaochongHighRiskReadonlyQueryDto, user: AuthenticatedUser) {
    const where: Record<string, unknown> = {
      dataScope: user.recordDataScope,
      deletedAt: null,
    };
    const status = this.normalizeText(query.status).toUpperCase();
    if (FILE_RECORD_STATUSES.has(status)) {
      where.status = status;
    }
    if (query.folderId) {
      where.folderId = query.folderId;
    }

    const or: Record<string, unknown>[] = [];
    if (query.businessId) {
      or.push({ businessId: query.businessId }, { relatedId: query.businessId });
    }
    if (query.customerId) {
      or.push(
        { businessId: query.customerId },
        { relatedId: query.customerId },
        { tagText: { contains: query.customerId } },
        { note: { contains: query.customerId } },
      );
    }
    if (query.businessType) {
      or.push({ businessType: query.businessType });
    }
    if (query.relatedType) {
      or.push({ relatedType: query.relatedType });
    }
    if (query.keyword) {
      or.push(
        { fileName: { contains: query.keyword } },
        { category: { contains: query.keyword } },
        { tagText: { contains: query.keyword } },
        { note: { contains: query.keyword } },
      );
    }
    if (!or.length) {
      or.push(
        { businessType: { contains: "daochong" } },
        { relatedType: { contains: "daochong" } },
        { category: { contains: "道冲" } },
        { tagText: { contains: "道冲" } },
      );
    }
    where.OR = or;

    return where;
  }

  private buildMeetingWhere(query: DaochongHighRiskReadonlyQueryDto, user: AuthenticatedUser) {
    const folderId = query.folderId || "daochong-weekly";
    const or: Record<string, unknown>[] = [{ folderId }, { createdByUserId: user.id }];
    if (query.businessId) {
      or.unshift({ id: query.businessId });
    }
    if (query.keyword) {
      or.push({ title: { contains: query.keyword } });
    }
    if (query.customerId) {
      or.push({ title: { contains: query.customerId } });
    }

    return { OR: or };
  }

  private mapEvidenceAsset(record: DaochongEvidenceAssetRecord) {
    const permissionScope = this.normalizeText(record.permissionScope);
    const visibleRoles = permissionScope
      ? permissionScope.split(/[,\s/|，、]+/).map((item) => item.trim()).filter(Boolean)
      : [];

    return {
      id: record.id,
      businessType: record.businessType,
      businessId: record.businessId,
      assetType: record.category ?? record.fileType ?? "evidence",
      thumbnailUrl: record.fileUrl,
      originalUrl: record.fileUrl,
      fileName: record.fileName,
      fileType: record.fileType,
      fileSizeBytes: record.fileSizeBytes,
      uploadedBy: record.uploader,
      uploadedAt: this.toIsoDate(record.createdAt),
      visibleRoles,
      reviewStatus: record.status,
      lockedAt: record.isArchived ? this.toIsoDate(record.updatedAt) : null,
      returnReason: record.versionNote ?? record.note,
      relatedType: record.relatedType,
      relatedId: record.relatedId,
      folderId: record.folderId,
      isImportant: record.isImportant,
      permissionScope: record.permissionScope,
      updatedAt: this.toIsoDate(record.updatedAt),
    };
  }

  private normalizeMeetingRecordJson(recordJson: unknown) {
    return recordJson && typeof recordJson === "object" && !Array.isArray(recordJson)
      ? recordJson as Record<string, unknown>
      : {};
  }

  private asTextList(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          return this.normalizeText(record.text ?? record.title ?? record.name ?? record.owner ?? record.body);
        }
        return "";
      })
      .filter(Boolean);
  }

  private mapMeetingNote(record: DaochongMeetingNoteRecord) {
    const payload = this.normalizeMeetingRecordJson(record.recordJson);

    return {
      id: record.id,
      communicationId: this.normalizeText(payload.communicationId) || null,
      title: record.title,
      meetingAt: this.toIsoDate(record.meetingAt),
      conclusion: this.normalizeText(payload.conclusion ?? payload.summary ?? payload.meetingSummary),
      todoItems: this.asTextList(payload.todoItems ?? payload.actionItems),
      ownerUserIds: this.asTextList(payload.ownerUserIds ?? payload.owners),
      relatedCustomerIds: this.asTextList(payload.relatedCustomerIds ?? payload.customerIds),
      attachmentIds: this.asTextList(payload.attachmentIds ?? payload.fileIds),
      archiveStatus: this.normalizeText(payload.archiveStatus) || "readonly",
      folderId: record.folderId,
      sourceType: record.sourceType,
      createdBy: record.createdBy,
      createdByUserId: record.createdByUserId,
      createdAt: this.toIsoDate(record.createdAt),
      updatedAt: this.toIsoDate(record.updatedAt),
    };
  }

  private mapProjectCommunication(record: DaochongMeetingNoteRecord) {
    const payload = this.normalizeMeetingRecordJson(record.recordJson);

    return {
      id: this.normalizeText(payload.communicationId) || record.id,
      topic: this.normalizeText(payload.topic ?? payload.communicationTopic) || record.title,
      projectScopes: this.asTextList(payload.projectScopes ?? payload.projects) || [],
      participants: this.asTextList(payload.participants ?? payload.owners),
      relatedCustomerIds: this.asTextList(payload.relatedCustomerIds ?? payload.customerIds),
      privacyLevel: this.normalizeText(payload.privacyLevel) || "internal_readonly",
      discussionSummary: this.normalizeText(payload.discussionSummary ?? payload.conclusion ?? payload.summary ?? payload.meetingSummary),
      status: this.normalizeText(payload.communicationStatus ?? payload.archiveStatus) || "readonly",
      meetingNoteId: record.id,
      folderId: record.folderId,
      sourceType: record.sourceType,
      attachmentIds: this.asTextList(payload.attachmentIds ?? payload.fileIds),
      createdBy: record.createdBy,
      createdByUserId: record.createdByUserId,
      createdAt: this.toIsoDate(record.createdAt),
      updatedAt: this.toIsoDate(record.updatedAt),
    };
  }

  private mapFinanceSummary(record: DaochongFinanceSummaryRecord) {
    return {
      id: record.id,
      summaryMonth: record.summaryMonth,
      confirmedRechargeAmount: this.toDecimalText(record.confirmedRechargeAmount),
      pendingCashCustodyAmount: this.toDecimalText(record.pendingCashCustodyAmount),
      approvedConsumeAmount: this.toDecimalText(record.approvedConsumeAmount),
      commissionAmount: this.toDecimalText(record.commissionAmount),
      referralBonusAmount: this.toDecimalText(record.referralBonusAmount),
      teamBonusAmount: this.toDecimalText(record.teamBonusAmount),
      expenseAmount: this.toDecimalText(record.expenseAmount),
      evidenceAssetIds: this.asTextList(record.evidenceAssetIds),
      sourceCutoffAt: this.toIsoDate(record.sourceCutoffAt),
      exceptionCount: record.exceptionCount,
      payrollPreviewStatus: record.payrollPreviewStatus,
      canConfirmFinance: record.canConfirmFinance,
      financeStatus: record.financeStatus,
      confirmedBy: record.confirmedBy,
      confirmedAt: this.toIsoDate(record.confirmedAt),
      lockedAt: this.toIsoDate(record.lockedAt),
      createdAt: this.toIsoDate(record.createdAt),
      updatedAt: this.toIsoDate(record.updatedAt),
    };
  }

  private mapFinanceEvidenceException(record: DaochongFinanceEvidenceExceptionRecord) {
    return {
      id: record.id,
      summaryId: record.summaryId,
      summaryMonth: record.summary?.summaryMonth ?? null,
      businessType: record.businessType,
      businessId: record.businessId,
      exceptionReason: record.exceptionReason,
      currentOwner: record.currentOwner,
      returnTarget: record.returnTarget,
      exceptionStatus: record.exceptionStatus,
      evidenceAssetIds: this.asTextList(record.evidenceAssetIds),
      supplementRequirements: record.supplementRequirements,
      resolvedBy: record.resolvedBy,
      resolvedAt: this.toIsoDate(record.resolvedAt),
      createdAt: this.toIsoDate(record.createdAt),
      updatedAt: this.toIsoDate(record.updatedAt),
    };
  }

  private mapBonusExpenseItem(record: DaochongBonusExpenseItemRecord) {
    return {
      id: record.id,
      itemType: record.itemType,
      targetUser: record.targetUser,
      customer: record.customer
        ? {
            id: record.customer.id,
            name: record.customer.customerName || record.customer.contactName || record.customer.companyName,
          }
        : null,
      submittedBy: record.submittedBy,
      amount: this.toDecimalText(record.amount),
      reason: record.reason,
      evidenceAssetIds: this.asTextList(record.evidenceAssetIds),
      financeStatus: record.financeStatus,
      summaryMonth: record.summaryMonth ?? record.summary?.summaryMonth ?? null,
      summaryId: record.summaryId,
      returnReason: record.returnReason,
      financeReviewedBy: record.financeReviewedBy,
      financeReviewedAt: this.toIsoDate(record.financeReviewedAt),
      createdAt: this.toIsoDate(record.createdAt),
      updatedAt: this.toIsoDate(record.updatedAt),
    };
  }

  private mapCustomerMini(record: DaochongReadonlyCustomerMiniRecord | null) {
    return record
      ? {
          id: record.id,
          name: record.customerName || record.contactName || record.companyName,
        }
      : null;
  }

  private mapCustomerCardBalancePreview(
    customer: DaochongCustomerCardBalanceCustomerRecord,
    recharges: DaochongCustomerCardBalanceRechargeRecord[],
    approvals: DaochongCustomerCardBalanceConsumptionRecord[],
  ) {
    const confirmedRechargeAmount = recharges.reduce((sum, row) => sum + this.toDecimalNumber(row.amount), 0);
    const approvedConsumeAmount = approvals.reduce((sum, row) => sum + this.toDecimalNumber(row.consumeAmount), 0);
    const remainingAmount = confirmedRechargeAmount - approvedConsumeAmount;
    const latestRecharge = recharges[0] ?? null;
    const latestApproval = approvals[0] ?? null;
    const cardId = latestApproval?.cardId ?? "stored-value-balance";
    const status =
      recharges.length === 0 && approvals.length === 0
        ? "source_empty"
        : remainingAmount < 0
          ? "derived_negative_needs_review"
          : "derived_readonly_preview";

    return {
      items: [
        {
          customerId: customer.id,
          customerName: customer.customerName || customer.contactName || customer.companyName,
          cardId,
          cardName: latestApproval?.cardId ? `卡项 ${latestApproval.cardId}` : "客户储值余额预览",
          remainingAmount: this.toMoneyText(remainingAmount),
          remainingTimes: null,
          lastRechargeId: latestRecharge?.id ?? null,
          lastConsumptionApprovalId: latestApproval?.id ?? null,
          balanceStatus: status,
          computedAt: new Date().toISOString(),
          readonlyWarnings: [
            "余额来自已确认且已入账充值减已通过耗卡审批的只读预览，不是最终卡台账。",
            "当前接口不开户、不调余额、不扣卡、不退款、不写流水。",
            latestRecharge ? null : "未找到已确认且已入账充值记录。",
            latestApproval ? null : "未找到已通过耗卡审批记录。",
          ].filter(Boolean),
          summary: {
            confirmedRechargeAmount: this.toMoneyText(confirmedRechargeAmount),
            approvedConsumeAmount: this.toMoneyText(approvedConsumeAmount),
            rechargeCount: recharges.length,
            consumptionApprovalCount: approvals.length,
          },
        },
      ],
      diagnostics: [
        {
          key: recharges.length || approvals.length ? "customer_card_balance_readonly_preview" : "customer_card_balance_source_empty",
          level: recharges.length || approvals.length ? "info" : "warning",
          message: recharges.length || approvals.length
            ? "已只读汇总客户充值和耗卡审批形成余额预览；仍不更新余额、不扣卡、不写流水。"
            : "未找到可用于余额预览的已确认充值或已通过耗卡审批，灰度页继续显示回退提示。",
        } satisfies DaochongReadonlyDiagnostic,
      ],
    };
  }

  private normalizeJsonRecord(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private resolveAppointmentProject(
    task: DaochongAppointmentDetailTaskRecord,
    serviceNote: DaochongAppointmentServiceNoteRecord | null,
    settlementDraft: DaochongServiceSettlementDraftRecord | null,
  ) {
    if (settlementDraft?.project) {
      return {
        id: settlementDraft.project.id,
        name: settlementDraft.project.displayName || settlementDraft.project.name,
      };
    }

    if (serviceNote?.project) {
      return {
        id: serviceNote.project.id,
        name: serviceNote.project.displayName || serviceNote.project.name,
      };
    }

    const quotationItem = task.quotation?.items?.[0];
    if (quotationItem?.product) {
      return {
        id: quotationItem.product.id,
        name: quotationItem.product.displayName || quotationItem.product.name,
      };
    }

    if (quotationItem?.itemName) {
      return {
        id: null,
        name: quotationItem.itemName,
      };
    }

    const plan = this.normalizeJsonRecord(task.agriculturePlan?.detailJson);
    const planName = this.normalizeText(plan.planName);
    return planName
      ? {
          id: task.agriculturePlan?.id ?? null,
          name: planName,
        }
      : null;
  }

  private mapAppointmentDetail(
    task: DaochongAppointmentDetailTaskRecord,
    serviceNotes: DaochongAppointmentServiceNoteRecord[],
    settlementDrafts: DaochongServiceSettlementDraftRecord[],
  ) {
    const serviceNote = serviceNotes[0] ?? null;
    const settlementDraft = settlementDrafts[0] ?? null;
    const customer = this.mapCustomerMini(task.customer ?? task.quotation?.customer ?? task.agriculturePlan?.customer ?? null);
    const project = this.resolveAppointmentProject(task, serviceNote, settlementDraft);
    const evidenceAssetIds = [
      ...this.asTextList(settlementDraft?.evidenceAssetIds),
    ];

    return {
      id: task.id,
      taskId: task.id,
      sourceType: "Task",
      customerId: customer?.id ?? task.customerId,
      customerName: customer?.name ?? null,
      customerMobile: task.customer?.mobile ?? null,
      projectId: project?.id ?? serviceNote?.projectId ?? settlementDraft?.projectId ?? null,
      projectName: project?.name ?? null,
      teacherId: task.assignee.id,
      teacherName: task.assignee.name,
      roomId: serviceNote?.roomId ?? null,
      startsAt: this.toIsoDate(task.startAt),
      endsAt: this.toIsoDate(task.endAt),
      reminderAt: this.toIsoDate(task.reminderAt),
      arrivalStatus: task.status,
      serviceStatus: serviceNote?.noteStatus ?? settlementDraft?.draftStatus ?? task.status,
      taskType: task.type,
      taskTitle: task.title,
      taskContent: task.content,
      quotationId: task.quotationId,
      quotationNo: task.quotation?.quotationNo ?? null,
      quotationStatus: task.quotation?.status ?? null,
      settlementDraftId: settlementDraft?.id ?? serviceNote?.settlementDraftId ?? null,
      settlementDraftStatus: settlementDraft?.draftStatus ?? null,
      serviceNoteId: serviceNote?.id ?? null,
      serviceNoteStatus: serviceNote?.noteStatus ?? null,
      serviceNoteDueAt: this.toIsoDate(serviceNote?.dueAt),
      reminderScheduledAt: this.toIsoDate(serviceNote?.reminderScheduledAt),
      remindedAt: this.toIsoDate(serviceNote?.remindedAt),
      completedAt: this.toIsoDate(serviceNote?.completedAt),
      evidenceAssetIds,
      readonlyWarnings: [
        "来源仍是 Task 候选，不代表已开放完整道冲预约写流程。",
        "当前接口只读展示；不改约、不签到、不确认服务、不提交结算、不发送企业微信。",
        serviceNote ? null : "未匹配 DaochongServiceNote，服务纪要继续显示待接或 mock 回退。",
        settlementDraft ? null : "未匹配 DaochongServiceSettlementDraft，结算草稿继续显示待接或 mock 回退。",
      ].filter(Boolean),
      createdAt: this.toIsoDate(task.createdAt),
      updatedAt: this.toIsoDate(task.updatedAt),
      diagnostics: [
        {
          key: "appointment_detail_task_readonly_mapped",
          level: "info",
          message: "已从 Task 只读映射预约详情；仍不执行改约、到店确认、服务完成、结算或企业微信发送。",
        } satisfies DaochongReadonlyDiagnostic,
      ],
    };
  }

  private mapWecomReminderDryRun(
    record: DaochongWecomReminderDryRunServiceNoteRecord,
    now = new Date(),
  ) {
    const customer = this.mapCustomerMini(record.customer);
    const projectName = record.project?.displayName || record.project?.name || "道冲服务";
    const scheduledAt = record.reminderScheduledAt ?? record.dueAt;
    const isDue = scheduledAt ? scheduledAt.getTime() <= now.getTime() : false;
    const title = `${customer?.name ?? "客户"}服务纪要待补填`;
    const summary = this.normalizeText(record.serviceSummary)
      || this.normalizeText(record.pendingReason)
      || `服务完成后 12 小时仍需补充${projectName}纪要和客户偏好。`;

    return {
      id: `dry-run-${record.id}`,
      serviceNoteId: record.id,
      appointmentId: record.appointmentId,
      settlementDraftId: record.settlementDraftId,
      customerId: record.customerId,
      customer,
      teacherId: record.teacherId,
      teacher: {
        id: record.teacher.id,
        loginAccount: record.teacher.loginAccount,
        name: record.teacher.wecomName || record.teacher.name,
        wecomName: record.teacher.wecomName,
        wecomUserId: record.teacher.wecomUserId,
      },
      project: record.project
        ? {
            id: record.project.id,
            name: record.project.displayName || record.project.name,
          }
        : null,
      noteStatus: record.noteStatus,
      dryRunStatus: record.remindedAt ? "already_recorded" : isDue ? "ready_to_preview" : "scheduled_preview",
      cardTitle: title,
      cardSummary: summary,
      jumpPage: `/daochong-mobile?serviceNoteId=${encodeURIComponent(record.id)}&page=serviceNote`,
      scheduledAt: this.toIsoDate(scheduledAt),
      dueAt: this.toIsoDate(record.dueAt),
      reminderScheduledAt: this.toIsoDate(record.reminderScheduledAt),
      sentAt: this.toIsoDate(record.remindedAt),
      cancelledReason: record.completedAt ? "service_note_completed" : null,
      dryRunPayload: {
        businessType: "daochong-service-note",
        businessId: record.id,
        targetUserId: record.teacher.wecomUserId ?? record.teacher.id,
        targetUserName: record.teacher.wecomName || record.teacher.name,
        title,
        description: summary,
        jumpPage: `/daochong-mobile?serviceNoteId=${encodeURIComponent(record.id)}&page=serviceNote`,
        scheduledAt: this.toIsoDate(scheduledAt),
        dryRun: true,
        deliveryStatus: "preview_only",
      },
      readonlyWarnings: [
        "本接口只生成企业微信提醒预览，不创建通知记录。",
        "本接口不标记已发送、不调用企业微信发送能力。",
        "老师 12 小时内已补填或纪要完成时，正式发送仍需重新评估取消条件。",
      ],
      createdAt: this.toIsoDate(record.createdAt),
      updatedAt: this.toIsoDate(record.updatedAt),
    };
  }

  private serviceNoteWriteSelect() {
    return {
      id: true,
      appointmentId: true,
      settlementDraftId: true,
      customerId: true,
      teacherId: true,
      projectId: true,
      roomId: true,
      sourceType: true,
      pendingReason: true,
      serviceSummary: true,
      customerFeedback: true,
      nextSuggestion: true,
      preferenceNote: true,
      preferenceSyncStatus: true,
      noteStatus: true,
      dueAt: true,
      reminderScheduledAt: true,
      remindedAt: true,
      completedAt: true,
      createdByUserId: true,
      dataScope: true,
      partitionKey: true,
      testBatchId: true,
      createdAt: true,
      updatedAt: true,
      customer: { select: DAOCHONG_CUSTOMER_SELECT },
      teacher: { select: DAOCHONG_USER_WECOM_SELECT },
      project: { select: DAOCHONG_PRODUCT_SELECT },
      createdBy: { select: DAOCHONG_USER_SELECT },
    };
  }

  private mapServiceNoteWrite(record: DaochongServiceNoteWriteRecord) {
    return {
      id: record.id,
      appointmentId: record.appointmentId,
      settlementDraftId: record.settlementDraftId,
      customerId: record.customerId,
      customer: this.mapCustomerMini(record.customer),
      teacherId: record.teacherId,
      teacher: {
        id: record.teacher.id,
        loginAccount: record.teacher.loginAccount,
        name: record.teacher.wecomName || record.teacher.name,
        wecomName: record.teacher.wecomName,
        wecomUserId: record.teacher.wecomUserId,
      },
      projectId: record.projectId,
      project: record.project
        ? {
            id: record.project.id,
            name: record.project.displayName || record.project.name,
          }
        : null,
      roomId: record.roomId,
      sourceType: record.sourceType,
      pendingReason: record.pendingReason,
      serviceSummary: record.serviceSummary,
      customerFeedback: record.customerFeedback,
      nextSuggestion: record.nextSuggestion,
      preferenceNote: record.preferenceNote,
      preferenceSyncStatus: record.preferenceSyncStatus,
      noteStatus: record.noteStatus,
      dueAt: this.toIsoDate(record.dueAt),
      reminderScheduledAt: this.toIsoDate(record.reminderScheduledAt),
      remindedAt: this.toIsoDate(record.remindedAt),
      completedAt: this.toIsoDate(record.completedAt),
      createdBy: record.createdBy,
      dataScope: record.dataScope,
      partitionKey: record.partitionKey,
      testBatchId: record.testBatchId,
      createdAt: this.toIsoDate(record.createdAt),
      updatedAt: this.toIsoDate(record.updatedAt),
    };
  }

  private normalizePreferenceWriteInputs(
    preferences?: DaochongServiceNotePreferenceWriteDto[],
    fallbackPreferenceNote?: unknown,
  ): DaochongServiceNotePreferenceWriteInput[] {
    const rows = Array.isArray(preferences) ? preferences : [];
    if (rows.length > MAX_DAOCHONG_SERVICE_NOTE_PREFERENCES) {
      throw new BadRequestException(`一次最多同步 ${MAX_DAOCHONG_SERVICE_NOTE_PREFERENCES} 条客户偏好。`);
    }

    const normalized = rows.map((row, index) => {
      const preferenceLabel = this.requireText(row.preferenceLabel, `第 ${index + 1} 条偏好缺少标签。`);
      const preferenceValue = this.requireText(row.preferenceValue, `第 ${index + 1} 条偏好缺少内容。`);
      return {
        preferenceType: row.preferenceType,
        preferenceLabel,
        preferenceValue,
        roomPreference: this.nullableText(row.roomPreference),
        lightPreference: this.nullableText(row.lightPreference),
        pressurePreference: this.nullableText(row.pressurePreference),
        tabooNotes: this.nullableText(row.tabooNotes),
        hobbyNotes: this.nullableText(row.hobbyNotes),
        visibility: row.visibility ?? "SERVICE_TEAM",
      };
    });

    const fallbackNote = this.optionalText(fallbackPreferenceNote);
    if (normalized.length === 0 && fallbackNote) {
      normalized.push({
        preferenceType: DaochongPreferenceTypeQuery.OTHER,
        preferenceLabel: "服务偏好备注",
        preferenceValue: fallbackNote,
        roomPreference: null,
        lightPreference: null,
        pressurePreference: null,
        tabooNotes: null,
        hobbyNotes: null,
        visibility: "SERVICE_TEAM",
      });
    }

    return normalized;
  }

  private async createPreferenceRows(
    tx: unknown,
    preferences: DaochongServiceNotePreferenceWriteInput[],
    serviceNote: DaochongServiceNoteWriteRecord,
    user: AuthenticatedUser,
  ) {
    if (preferences.length === 0) {
      return 0;
    }

    const daochongTx = tx as DaochongReadonlyPrisma;
    const observedAt = serviceNote.completedAt ?? new Date();
    for (const preference of preferences) {
      await daochongTx.daochongCustomerPreference.create({
        data: {
          ...preference,
          customerId: serviceNote.customerId,
          sourceServiceNoteId: serviceNote.id,
          lastObservedAt: observedAt,
          updatedByUserId: user.id,
          dataScope: serviceNote.dataScope,
          partitionKey: serviceNote.partitionKey,
          testBatchId: serviceNote.testBatchId,
        },
      });
    }

    return preferences.length;
  }

  private mapRecharge(record: DaochongCustomerRechargeRecord) {
    return {
      id: record.id,
      customer: this.mapCustomerMini(record.customer),
      submittedBy: record.submittedBy,
      amount: this.toDecimalText(record.amount),
      paymentMethod: record.paymentMethod,
      evidenceAssetIds: this.asTextList(record.evidenceAssetIds),
      cashPhotoAssetIds: this.asTextList(record.cashPhotoAssetIds),
      cashAmount: this.toDecimalText(record.cashAmount),
      cashCustodian: record.cashCustodian,
      rechargeStatus: record.rechargeStatus,
      chengchengApprover: record.chengchengApprover,
      chengchengApprovedAt: this.toIsoDate(record.chengchengApprovedAt),
      limengReviewer: record.limengReviewer,
      limengReviewedAt: this.toIsoDate(record.limengReviewedAt),
      returnReason: record.returnReason,
      balanceAppliedAt: this.toIsoDate(record.balanceAppliedAt),
      financeSummaryMonth: record.financeSummaryMonth,
      createdAt: this.toIsoDate(record.createdAt),
      updatedAt: this.toIsoDate(record.updatedAt),
    };
  }

  private rechargeWriteSelect() {
    return {
      id: true,
      customerId: true,
      submittedByUserId: true,
      amount: true,
      paymentMethod: true,
      evidenceAssetIds: true,
      cashPhotoAssetIds: true,
      cashAmount: true,
      cashCustodianUserId: true,
      rechargeStatus: true,
      chengchengApprovedByUserId: true,
      chengchengApprovedAt: true,
      limengReviewedByUserId: true,
      limengReviewedAt: true,
      returnReason: true,
      balanceAppliedAt: true,
      financeSummaryMonth: true,
      dataScope: true,
      partitionKey: true,
      testBatchId: true,
      createdAt: true,
      updatedAt: true,
      customer: { select: DAOCHONG_CUSTOMER_SELECT },
      submittedBy: { select: DAOCHONG_USER_SELECT },
      cashCustodian: { select: DAOCHONG_USER_SELECT },
      chengchengApprover: { select: DAOCHONG_USER_SELECT },
      limengReviewer: { select: DAOCHONG_USER_SELECT },
    };
  }

  private mapSettlementDraft(record: DaochongServiceSettlementDraftRecord) {
    return {
      id: record.id,
      appointmentId: record.appointmentId,
      customer: this.mapCustomerMini(record.customer),
      teacher: record.teacher,
      project: record.project
        ? {
            id: record.project.id,
            name: record.project.displayName || record.project.name,
          }
        : null,
      cardMode: record.cardMode,
      cardId: record.cardId,
      originalAmount: this.toDecimalText(record.originalAmount),
      discountAmount: this.toDecimalText(record.discountAmount),
      discountReason: record.discountReason,
      finalAmount: this.toDecimalText(record.finalAmount),
      consumeAmount: this.toDecimalText(record.consumeAmount),
      evidenceAssetIds: this.asTextList(record.evidenceAssetIds),
      referrerName: record.referrerName,
      referralBonusAmount: this.toDecimalText(record.referralBonusAmount),
      validationStatus: record.validationStatus,
      canSubmitApproval: record.canSubmitApproval,
      draftStatus: record.draftStatus,
      submittedBy: record.submittedBy,
      submittedAt: this.toIsoDate(record.submittedAt),
      returnedReason: record.returnedReason,
      createdAt: this.toIsoDate(record.createdAt),
      updatedAt: this.toIsoDate(record.updatedAt),
    };
  }

  private mapConsumptionApproval(record: DaochongCardConsumptionApprovalRecord) {
    return {
      id: record.id,
      settlementDraftId: record.settlementDraftId,
      settlementDraft: record.settlementDraft,
      customer: this.mapCustomerMini(record.customer),
      teacher: record.teacher,
      cardId: record.cardId,
      consumeAmount: this.toDecimalText(record.consumeAmount),
      evidenceAssetIds: this.asTextList(record.evidenceAssetIds),
      discountReason: record.discountReason,
      referrerName: record.referrerName,
      referralBonusAmount: this.toDecimalText(record.referralBonusAmount),
      approvalStatus: record.approvalStatus,
      approvedBy: record.approvedBy,
      approvedAt: this.toIsoDate(record.approvedAt),
      returnedBy: record.returnedBy,
      returnedAt: this.toIsoDate(record.returnedAt),
      returnReason: record.returnReason,
      supplementRequirements: record.supplementRequirements,
      financeSummaryMonth: record.financeSummaryMonth,
      createdAt: this.toIsoDate(record.createdAt),
      updatedAt: this.toIsoDate(record.updatedAt),
    };
  }

  private async listRecharges(
    query: DaochongHighRiskReadonlyQueryDto,
    user: AuthenticatedUser,
  ) {
    const rows = await this.daochongPrisma.daochongCustomerRecharge.findMany({
      where: this.buildRechargeWhere(query, user),
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: this.normalizeLimit(query.limit),
      select: {
        id: true,
        customerId: true,
        submittedByUserId: true,
        amount: true,
        paymentMethod: true,
        evidenceAssetIds: true,
        cashPhotoAssetIds: true,
        cashAmount: true,
        cashCustodianUserId: true,
        rechargeStatus: true,
        chengchengApprovedByUserId: true,
        chengchengApprovedAt: true,
        limengReviewedByUserId: true,
        limengReviewedAt: true,
        returnReason: true,
        balanceAppliedAt: true,
        financeSummaryMonth: true,
        createdAt: true,
        updatedAt: true,
        customer: { select: DAOCHONG_CUSTOMER_SELECT },
        submittedBy: { select: DAOCHONG_USER_SELECT },
        cashCustodian: { select: DAOCHONG_USER_SELECT },
        chengchengApprover: { select: DAOCHONG_USER_SELECT },
        limengReviewer: { select: DAOCHONG_USER_SELECT },
      },
    }) as DaochongCustomerRechargeRecord[];

    return {
      items: rows.map((row) => this.mapRecharge(row)),
      diagnostics: [
        {
          key: rows.length ? "recharges_readonly_mapped" : "recharges_empty",
          level: rows.length ? "info" : "warning",
          message: rows.length
            ? `已从 DaochongCustomerRecharge 只读映射 ${rows.length} 条充值记录；仍不审批、不复核、不入账、不更新余额。`
            : "DaochongCustomerRecharge 暂无匹配记录，灰度页继续使用 mock 或空状态。",
        } satisfies DaochongReadonlyDiagnostic,
      ],
    };
  }

  private async listSettlementDrafts(
    query: DaochongHighRiskReadonlyQueryDto,
    user: AuthenticatedUser,
  ) {
    const rows = await this.daochongPrisma.daochongServiceSettlementDraft.findMany({
      where: this.buildSettlementDraftWhere(query, user),
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: this.normalizeLimit(query.limit),
      select: {
        id: true,
        appointmentId: true,
        customerId: true,
        teacherId: true,
        projectId: true,
        cardMode: true,
        cardId: true,
        originalAmount: true,
        discountAmount: true,
        discountReason: true,
        finalAmount: true,
        consumeAmount: true,
        evidenceAssetIds: true,
        referrerName: true,
        referralBonusAmount: true,
        validationStatus: true,
        canSubmitApproval: true,
        draftStatus: true,
        submittedByUserId: true,
        submittedAt: true,
        returnedReason: true,
        createdAt: true,
        updatedAt: true,
        customer: { select: DAOCHONG_CUSTOMER_SELECT },
        teacher: { select: DAOCHONG_USER_SELECT },
        project: { select: DAOCHONG_PRODUCT_SELECT },
        submittedBy: { select: DAOCHONG_USER_SELECT },
      },
    }) as DaochongServiceSettlementDraftRecord[];

    return {
      items: rows.map((row) => this.mapSettlementDraft(row)),
      diagnostics: [
        {
          key: rows.length ? "settlement_drafts_readonly_mapped" : "settlement_drafts_empty",
          level: rows.length ? "info" : "warning",
          message: rows.length
            ? `已从 DaochongServiceSettlementDraft 只读映射 ${rows.length} 条结算草稿；仍不保存草稿、不提交审批、不扣卡。`
            : "DaochongServiceSettlementDraft 暂无匹配记录，灰度页继续使用 mock 或空状态。",
        } satisfies DaochongReadonlyDiagnostic,
      ],
    };
  }

  private async listConsumptionApprovals(
    query: DaochongHighRiskReadonlyQueryDto,
    user: AuthenticatedUser,
  ) {
    const rows = await this.daochongPrisma.daochongCardConsumptionApproval.findMany({
      where: this.buildConsumptionApprovalWhere(query, user),
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: this.normalizeLimit(query.limit),
      select: {
        id: true,
        settlementDraftId: true,
        customerId: true,
        teacherId: true,
        cardId: true,
        consumeAmount: true,
        evidenceAssetIds: true,
        discountReason: true,
        referrerName: true,
        referralBonusAmount: true,
        approvalStatus: true,
        approvedByUserId: true,
        approvedAt: true,
        returnedByUserId: true,
        returnedAt: true,
        returnReason: true,
        supplementRequirements: true,
        financeSummaryMonth: true,
        createdAt: true,
        updatedAt: true,
        settlementDraft: { select: { id: true, appointmentId: true, draftStatus: true } },
        customer: { select: DAOCHONG_CUSTOMER_SELECT },
        teacher: { select: DAOCHONG_USER_SELECT },
        approvedBy: { select: DAOCHONG_USER_SELECT },
        returnedBy: { select: DAOCHONG_USER_SELECT },
      },
    }) as DaochongCardConsumptionApprovalRecord[];

    return {
      items: rows.map((row) => this.mapConsumptionApproval(row)),
      diagnostics: [
        {
          key: rows.length ? "consumption_approvals_readonly_mapped" : "consumption_approvals_empty",
          level: rows.length ? "info" : "warning",
          message: rows.length
            ? `已从 DaochongCardConsumptionApproval 只读映射 ${rows.length} 条耗卡审批；仍不通过、不退回、不扣减卡项。`
            : "DaochongCardConsumptionApproval 暂无匹配记录，灰度页继续使用 mock 或空状态。",
        } satisfies DaochongReadonlyDiagnostic,
      ],
    };
  }

  private async listFinanceSummaries(
    query: DaochongHighRiskReadonlyQueryDto,
    user: AuthenticatedUser,
  ) {
    const rows = await this.daochongPrisma.daochongFinanceSummary.findMany({
      where: this.buildFinanceSummaryWhere(query, user),
      orderBy: [{ summaryMonth: "desc" }, { updatedAt: "desc" }],
      take: this.normalizeLimit(query.limit),
      select: {
        id: true,
        summaryMonth: true,
        confirmedRechargeAmount: true,
        pendingCashCustodyAmount: true,
        approvedConsumeAmount: true,
        commissionAmount: true,
        referralBonusAmount: true,
        teamBonusAmount: true,
        expenseAmount: true,
        evidenceAssetIds: true,
        sourceCutoffAt: true,
        exceptionCount: true,
        payrollPreviewStatus: true,
        canConfirmFinance: true,
        financeStatus: true,
        confirmedByUserId: true,
        confirmedAt: true,
        lockedAt: true,
        createdAt: true,
        updatedAt: true,
        confirmedBy: { select: DAOCHONG_USER_SELECT },
      },
    }) as DaochongFinanceSummaryRecord[];

    return {
      items: rows.map((row) => this.mapFinanceSummary(row)),
      diagnostics: [
        {
          key: rows.length ? "finance_summary_readonly_mapped" : "finance_summary_empty",
          level: rows.length ? "info" : "warning",
          message: rows.length
            ? `已从 DaochongFinanceSummary 只读映射 ${rows.length} 条财务汇总；仍不执行财务确认、工资生成或入账。`
            : "DaochongFinanceSummary 暂无匹配记录，灰度页继续使用 mock 或空状态。",
        } satisfies DaochongReadonlyDiagnostic,
      ],
    };
  }

  private async listFinanceEvidenceExceptions(
    query: DaochongHighRiskReadonlyQueryDto,
    user: AuthenticatedUser,
  ) {
    const rows = await this.daochongPrisma.daochongFinanceEvidenceException.findMany({
      where: this.buildFinanceEvidenceExceptionWhere(query, user),
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: this.normalizeLimit(query.limit),
      select: {
        id: true,
        summaryId: true,
        businessType: true,
        businessId: true,
        exceptionReason: true,
        currentOwnerUserId: true,
        returnTargetUserId: true,
        exceptionStatus: true,
        evidenceAssetIds: true,
        supplementRequirements: true,
        resolvedByUserId: true,
        resolvedAt: true,
        createdAt: true,
        updatedAt: true,
        summary: { select: { id: true, summaryMonth: true } },
        currentOwner: { select: DAOCHONG_USER_SELECT },
        returnTarget: { select: DAOCHONG_USER_SELECT },
        resolvedBy: { select: DAOCHONG_USER_SELECT },
      },
    }) as DaochongFinanceEvidenceExceptionRecord[];

    return {
      items: rows.map((row) => this.mapFinanceEvidenceException(row)),
      diagnostics: [
        {
          key: rows.length ? "finance_evidence_exceptions_readonly_mapped" : "finance_evidence_exceptions_empty",
          level: rows.length ? "info" : "warning",
          message: rows.length
            ? `已从 DaochongFinanceEvidenceException 只读映射 ${rows.length} 条凭证异常；仍不退回、不补传、不确认。`
            : "DaochongFinanceEvidenceException 暂无匹配记录，灰度页继续使用 mock 或空状态。",
        } satisfies DaochongReadonlyDiagnostic,
      ],
    };
  }

  private async listBonusExpenseItems(
    query: DaochongHighRiskReadonlyQueryDto,
    user: AuthenticatedUser,
  ) {
    const rows = await this.daochongPrisma.daochongBonusExpenseItem.findMany({
      where: this.buildBonusExpenseWhere(query, user),
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: this.normalizeLimit(query.limit),
      select: {
        id: true,
        itemType: true,
        targetUserId: true,
        customerId: true,
        submittedByUserId: true,
        amount: true,
        reason: true,
        evidenceAssetIds: true,
        financeStatus: true,
        summaryMonth: true,
        summaryId: true,
        returnReason: true,
        financeReviewedByUserId: true,
        financeReviewedAt: true,
        createdAt: true,
        updatedAt: true,
        targetUser: { select: DAOCHONG_USER_SELECT },
        customer: {
          select: {
            id: true,
            customerName: true,
            contactName: true,
            companyName: true,
          },
        },
        submittedBy: { select: DAOCHONG_USER_SELECT },
        financeReviewedBy: { select: DAOCHONG_USER_SELECT },
        summary: { select: { id: true, summaryMonth: true } },
      },
    }) as DaochongBonusExpenseItemRecord[];

    return {
      items: rows.map((row) => this.mapBonusExpenseItem(row)),
      diagnostics: [
        {
          key: rows.length ? "bonus_expense_items_readonly_mapped" : "bonus_expense_items_empty",
          level: rows.length ? "info" : "warning",
          message: rows.length
            ? `已从 DaochongBonusExpenseItem 只读映射 ${rows.length} 条奖金报销；仍不创建、不退回、不纳入最终工资。`
            : "DaochongBonusExpenseItem 暂无匹配记录，灰度页继续使用 mock 或空状态。",
        } satisfies DaochongReadonlyDiagnostic,
      ],
    };
  }

  private async listEvidenceAssets(
    query: DaochongHighRiskReadonlyQueryDto,
    user: AuthenticatedUser,
  ) {
    const rows = await this.daochongPrisma.fileRecord.findMany({
      where: this.buildEvidenceWhere(query, user),
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: this.normalizeLimit(query.limit),
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileType: true,
        fileSizeBytes: true,
        category: true,
        tagText: true,
        note: true,
        businessType: true,
        businessId: true,
        relatedType: true,
        relatedId: true,
        folderId: true,
        status: true,
        isImportant: true,
        isArchived: true,
        permissionScope: true,
        versionGroupId: true,
        versionNumber: true,
        versionNote: true,
        createdAt: true,
        updatedAt: true,
        uploader: {
          select: {
            id: true,
            name: true,
            loginAccount: true,
          },
        },
      },
    }) as DaochongEvidenceAssetRecord[];

    return {
      items: rows.map((row) => this.mapEvidenceAsset(row)),
      diagnostics: [
        {
          key: rows.length ? "evidence_assets_filerecord_readonly_mapped" : "evidence_assets_filerecord_empty",
          level: rows.length ? "info" : "warning",
          message: rows.length
            ? `已从 FileRecord 只读映射 ${rows.length} 条凭证记录；仍不执行上传、复核、退回或锁定。`
            : "FileRecord 暂无匹配的道冲凭证记录，灰度页继续使用 mock 或空状态。",
        } satisfies DaochongReadonlyDiagnostic,
      ],
    };
  }

  private async listMeetingNotes(
    query: DaochongHighRiskReadonlyQueryDto,
    user: AuthenticatedUser,
  ) {
    const rows = await this.daochongPrisma.meetingMinutesRecord.findMany({
      where: this.buildMeetingWhere(query, user),
      orderBy: [{ meetingAt: "desc" }, { updatedAt: "desc" }],
      take: this.normalizeLimit(query.limit),
      select: {
        id: true,
        folderId: true,
        title: true,
        meetingAt: true,
        sourceType: true,
        recordJson: true,
        createdBy: true,
        createdByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as DaochongMeetingNoteRecord[];

    return {
      items: rows.map((row) => this.mapMeetingNote(row)),
      diagnostics: [
        {
          key: rows.length ? "meeting_notes_record_readonly_mapped" : "meeting_notes_record_empty",
          level: rows.length ? "info" : "warning",
          message: rows.length
            ? `已从 MeetingMinutesRecord 只读映射 ${rows.length} 条会议纪要；仍不执行归档、编辑、生成待办或发送通知。`
            : "MeetingMinutesRecord 暂无匹配的道冲会议纪要，灰度页继续使用 mock 或空状态。",
        } satisfies DaochongReadonlyDiagnostic,
      ],
    };
  }

  private async listProjectCommunications(
    query: DaochongHighRiskReadonlyQueryDto,
    user: AuthenticatedUser,
  ) {
    const rows = await this.daochongPrisma.meetingMinutesRecord.findMany({
      where: this.buildMeetingWhere(query, user),
      orderBy: [{ updatedAt: "desc" }, { meetingAt: "desc" }],
      take: this.normalizeLimit(query.limit),
      select: {
        id: true,
        folderId: true,
        title: true,
        meetingAt: true,
        sourceType: true,
        recordJson: true,
        createdBy: true,
        createdByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as DaochongMeetingNoteRecord[];

    return {
      items: rows.map((row) => this.mapProjectCommunication(row)),
      diagnostics: [
        {
          key: rows.length ? "project_communications_meeting_record_readonly_mapped" : "project_communications_meeting_record_empty",
          level: rows.length ? "info" : "warning",
          message: rows.length
            ? `已从 MeetingMinutesRecord 只读映射 ${rows.length} 条项目沟通；仍不编辑、不归档、不生成待办或同步客户档案。`
            : "MeetingMinutesRecord 暂无匹配的道冲项目沟通记录，灰度页继续使用 mock 或空状态。",
        } satisfies DaochongReadonlyDiagnostic,
      ],
    };
  }

  private buildPreferenceVisibilityFilter(
    visibility: DaochongCustomerPreferencesReadonlyQueryDto["visibility"],
    user: AuthenticatedUser,
  ) {
    if (user.roleCode === "FINANCE") {
      return visibility === "PRIVATE_NOTE" ? "__BLOCKED_PRIVATE_NOTE__" : { not: "PRIVATE_NOTE" };
    }

    return visibility;
  }

  private async ensureCustomerWriteAccess(customerId: string, user: AuthenticatedUser) {
    const customerWhere = await this.accessControl.buildCustomerWhere(user, { id: customerId });
    const customer = await this.daochongPrisma.customer.findFirst({
      where: customerWhere,
      select: {
        ...DAOCHONG_CUSTOMER_SELECT,
        dataScope: true,
        partitionKey: true,
        testBatchId: true,
      },
    }) as DaochongCustomerWriteContextRecord | null;

    if (!customer) {
      throw new NotFoundException("客户不存在或无权写入道冲服务纪要");
    }

    this.recordPartition.assertSamePartition(user, customer, "客户");
    return customer;
  }

  private async ensureTeacherExists(teacherId: string) {
    const teacher = await this.prisma.user.findFirst({
      where: { id: teacherId },
      select: DAOCHONG_USER_WECOM_SELECT,
    }) as DaochongWecomReminderUserRecord | null;

    if (!teacher) {
      throw new NotFoundException("服务老师不存在");
    }

    return teacher;
  }

  private async ensureUserExists(userId: string, label: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: DAOCHONG_USER_SELECT,
    }) as DaochongReadonlyUserRecord | null;

    if (!user) {
      throw new NotFoundException(`${label}不存在`);
    }

    return user;
  }

  private async ensureProjectExists(projectId?: string) {
    if (!projectId) {
      return null;
    }

    const project = await this.prisma.product.findFirst({
      where: { id: projectId },
      select: DAOCHONG_PRODUCT_SELECT,
    });
    if (!project) {
      throw new NotFoundException("道冲项目不存在");
    }

    return project;
  }

  private async ensureAppointmentAccess(
    appointmentId: string | undefined,
    customerId: string,
    teacherId: string,
    user: AuthenticatedUser,
  ) {
    if (!appointmentId) {
      return null;
    }

    const task = await this.daochongPrisma.task.findFirst({
      where: await this.accessControl.buildTaskWhere(user, { id: appointmentId }),
      select: {
        id: true,
        customerId: true,
        assigneeUserId: true,
        dataScope: true,
        partitionKey: true,
        testBatchId: true,
      },
    }) as DaochongTaskWriteContextRecord | null;

    if (!task) {
      throw new NotFoundException("关联预约不存在或无权访问");
    }

    this.recordPartition.assertSamePartition(user, task, "关联预约");
    if (task.customerId && task.customerId !== customerId) {
      throw new BadRequestException("关联预约与服务客户不一致");
    }
    if (task.assigneeUserId !== teacherId) {
      throw new BadRequestException("关联预约负责人和服务老师不一致");
    }

    return task;
  }

  private async ensureServiceNoteWriteAccess(serviceNoteId: string, user: AuthenticatedUser) {
    const partition = this.recordPartition.resolveContext(user);
    const customerWhere = await this.accessControl.buildCustomerWhere(user);
    const serviceNote = await this.daochongPrisma.daochongServiceNote.findFirst({
      where: {
        id: serviceNoteId,
        dataScope: partition.dataScope,
        partitionKey: partition.partitionKey,
        testBatchId: partition.testBatchId,
        customer: customerWhere,
      },
      select: this.serviceNoteWriteSelect(),
    }) as DaochongServiceNoteWriteRecord | null;

    if (!serviceNote) {
      throw new NotFoundException("服务纪要不存在或无权操作");
    }

    return serviceNote;
  }

  private async ensureRechargeWriteAccess(
    rechargeId: string,
    user: AuthenticatedUser,
    options: { enforceCustomerScope?: boolean } = {},
  ) {
    const partition = this.recordPartition.resolveContext(user);
    const where: Record<string, unknown> = {
      id: rechargeId,
      dataScope: partition.dataScope,
      partitionKey: partition.partitionKey,
      testBatchId: partition.testBatchId,
    };

    if (options.enforceCustomerScope !== false) {
      where.customer = await this.accessControl.buildCustomerWhere(user);
    }

    const recharge = await this.daochongPrisma.daochongCustomerRecharge.findFirst({
      where,
      select: this.rechargeWriteSelect(),
    }) as DaochongCustomerRechargeRecord | null;

    if (!recharge) {
      throw new NotFoundException("充值记录不存在或无权操作");
    }

    return recharge;
  }

  async getAppointmentDetail(appointmentId: string, user: AuthenticatedUser) {
    if (!this.isShadowReadonlyEnabled()) {
      return this.disabledResponse("appointment_detail_shadow_readonly_disabled");
    }

    const task = await this.daochongPrisma.task.findFirst({
      where: await this.accessControl.buildTaskWhere(user, { id: appointmentId }),
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        startAt: true,
        endAt: true,
        reminderAt: true,
        content: true,
        customerId: true,
        quotationId: true,
        agriculturePlanId: true,
        assigneeUserId: true,
        createdBy: true,
        dataScope: true,
        partitionKey: true,
        testBatchId: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            ...DAOCHONG_CUSTOMER_SELECT,
            mobile: true,
            status: true,
          },
        },
        quotation: {
          select: {
            id: true,
            quotationNo: true,
            status: true,
            totalDiscountedAmount: true,
            customer: { select: DAOCHONG_CUSTOMER_SELECT },
            items: {
              select: {
                itemName: true,
                product: { select: DAOCHONG_PRODUCT_SELECT },
              },
              take: 3,
            },
          },
        },
        agriculturePlan: {
          select: {
            id: true,
            quotationId: true,
            detailJson: true,
            customer: { select: DAOCHONG_CUSTOMER_SELECT },
          },
        },
        assignee: { select: DAOCHONG_USER_SELECT },
        creator: { select: DAOCHONG_USER_SELECT },
      },
    }) as DaochongAppointmentDetailTaskRecord | null;

    if (!task) {
      throw new NotFoundException("预约详情不存在或无权访问");
    }

    const sourceScope = {
      dataScope: task.dataScope,
      partitionKey: task.partitionKey,
      testBatchId: task.testBatchId,
    };
    const customerScope = task.customerId
      ? {
          customer: await this.accessControl.buildCustomerWhere(user, { id: task.customerId }),
        }
      : {};

    const [serviceNotes, settlementDrafts] = await Promise.all([
      this.daochongPrisma.daochongServiceNote.findMany({
        where: {
          appointmentId,
          ...sourceScope,
          ...customerScope,
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: 3,
        select: {
          id: true,
          appointmentId: true,
          settlementDraftId: true,
          customerId: true,
          teacherId: true,
          projectId: true,
          roomId: true,
          noteStatus: true,
          dueAt: true,
          reminderScheduledAt: true,
          remindedAt: true,
          completedAt: true,
          project: { select: DAOCHONG_PRODUCT_SELECT },
        },
      }) as Promise<DaochongAppointmentServiceNoteRecord[]>,
      this.isHighRiskReadonlyEnabled()
        ? this.daochongPrisma.daochongServiceSettlementDraft.findMany({
            where: {
              appointmentId,
              ...sourceScope,
              ...customerScope,
            },
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
            take: 3,
            select: {
              id: true,
              appointmentId: true,
              customerId: true,
              teacherId: true,
              projectId: true,
              cardMode: true,
              cardId: true,
              originalAmount: true,
              discountAmount: true,
              discountReason: true,
              finalAmount: true,
              consumeAmount: true,
              evidenceAssetIds: true,
              referrerName: true,
              referralBonusAmount: true,
              validationStatus: true,
              canSubmitApproval: true,
              draftStatus: true,
              submittedByUserId: true,
              submittedAt: true,
              returnedReason: true,
              createdAt: true,
              updatedAt: true,
              customer: { select: DAOCHONG_CUSTOMER_SELECT },
              teacher: { select: DAOCHONG_USER_SELECT },
              project: { select: DAOCHONG_PRODUCT_SELECT },
              submittedBy: { select: DAOCHONG_USER_SELECT },
            },
          }) as Promise<DaochongServiceSettlementDraftRecord[]>
        : Promise.resolve([] as DaochongServiceSettlementDraftRecord[]),
    ]);

    return this.mapAppointmentDetail(task, serviceNotes, settlementDrafts);
  }

  async listCustomerCardBalances(
    query: DaochongCustomerCardBalancesReadonlyQueryDto,
    user: AuthenticatedUser,
  ) {
    if (!this.isHighRiskReadonlyEnabled()) {
      return {
        items: [],
        diagnostics: [
          {
            key: "customer_card_balances_high_risk_readonly_disabled",
            level: "info",
            message: "道冲客户卡项余额只读预览未开启，灰度页继续使用 mock 或缺口提示。",
          } satisfies DaochongReadonlyDiagnostic,
        ],
      };
    }

    const customerWhere = await this.accessControl.buildCustomerWhere(user, {
      id: query.customerId,
    });
    const customer = await this.daochongPrisma.customer.findFirst({
      where: customerWhere,
      select: {
        id: true,
        customerName: true,
        contactName: true,
        companyName: true,
        mobile: true,
      },
    }) as DaochongCustomerCardBalanceCustomerRecord | null;

    if (!customer) {
      throw new NotFoundException("客户不存在或无权访问卡项余额");
    }

    const [recharges, approvals] = await Promise.all([
      this.daochongPrisma.daochongCustomerRecharge.findMany({
        where: {
          customer: customerWhere,
          rechargeStatus: "CONFIRMED",
          balanceAppliedAt: { not: null },
        },
        orderBy: [{ balanceAppliedAt: "desc" }, { updatedAt: "desc" }],
        take: 100,
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          rechargeStatus: true,
          balanceAppliedAt: true,
          financeSummaryMonth: true,
          createdAt: true,
          updatedAt: true,
        },
      }) as Promise<DaochongCustomerCardBalanceRechargeRecord[]>,
      this.daochongPrisma.daochongCardConsumptionApproval.findMany({
        where: {
          customer: customerWhere,
          approvalStatus: "APPROVED",
        },
        orderBy: [{ approvedAt: "desc" }, { updatedAt: "desc" }],
        take: 100,
        select: {
          id: true,
          cardId: true,
          consumeAmount: true,
          approvalStatus: true,
          approvedAt: true,
          financeSummaryMonth: true,
          createdAt: true,
          updatedAt: true,
          settlementDraft: {
            select: {
              id: true,
              appointmentId: true,
              draftStatus: true,
            },
          },
        },
      }) as Promise<DaochongCustomerCardBalanceConsumptionRecord[]>,
    ]);

    return this.mapCustomerCardBalancePreview(customer, recharges, approvals);
  }

  async createRecharge(
    body: CreateDaochongRechargeDto,
    user: AuthenticatedUser,
  ) {
    this.assertWriteEnabled();
    const partition = await this.recordPartition.getWritableCreateData(user);
    const customerId = this.requireText(body.customerId, "充值缺少客户。");
    const paymentMethod = this.requireText(body.paymentMethod, "充值缺少付款方式。").toUpperCase();
    if (!DAOCHONG_PAYMENT_METHODS.has(paymentMethod)) {
      throw new BadRequestException("充值付款方式无效。");
    }

    await this.ensureCustomerWriteAccess(customerId, user);
    const amount = this.parsePositiveMoney(body.amount, "充值金额");
    const evidenceAssetIds = this.requireTextList(body.evidenceAssetIds, "充值凭证", 20);
    const cashPhotoAssetIds = this.normalizeTextList(body.cashPhotoAssetIds, "现金照片", 20);
    const cashAmountInput = this.optionalText(body.cashAmount);
    const cashAmount = cashAmountInput ? this.parsePositiveMoney(cashAmountInput, "现金金额") : null;
    const cashCustodianUserId = this.optionalText(body.cashCustodianUserId);

    if (paymentMethod === "CASH") {
      if (!cashAmount) {
        throw new BadRequestException("现金充值必须填写现金金额。");
      }
      if (cashPhotoAssetIds.length === 0) {
        throw new BadRequestException("现金充值必须关联现金照片。");
      }
    }
    if (cashCustodianUserId) {
      await this.ensureUserExists(cashCustodianUserId, "现金托管人");
    }

    const created = await this.daochongPrisma.daochongCustomerRecharge.create({
      data: {
        customerId,
        submittedByUserId: user.id,
        amount,
        paymentMethod,
        evidenceAssetIds,
        cashPhotoAssetIds: cashPhotoAssetIds.length ? cashPhotoAssetIds : null,
        cashAmount,
        cashCustodianUserId: cashCustodianUserId ?? null,
        rechargeStatus: "PENDING_CHENGCHENG_APPROVAL",
        balanceAppliedAt: null,
        financeSummaryMonth: null,
        dataScope: partition.dataScope,
        partitionKey: partition.partitionKey,
        testBatchId: partition.testBatchId,
      },
      select: this.rechargeWriteSelect(),
    }) as DaochongCustomerRechargeRecord;

    return {
      ok: true,
      action: "created_pending_chengcheng_approval",
      item: this.mapRecharge(created),
      safety: {
        balanceApplied: false,
        financeConfirmed: false,
        wecomSent: false,
      },
    };
  }

  async approveRechargeByChengcheng(
    rechargeId: string,
    user: AuthenticatedUser,
  ) {
    this.assertWriteEnabled();
    await this.recordPartition.getWritableCreateData(user);
    const existing = await this.ensureRechargeWriteAccess(rechargeId, user);
    if (existing.rechargeStatus !== "PENDING_CHENGCHENG_APPROVAL") {
      throw new BadRequestException("只有待程程审批的充值可通过程程审批。");
    }

    const updated = await this.daochongPrisma.daochongCustomerRecharge.update({
      where: { id: existing.id },
      data: {
        rechargeStatus: "PENDING_LIMENG_REVIEW",
        chengchengApprovedByUserId: user.id,
        chengchengApprovedAt: new Date(),
        limengReviewedByUserId: null,
        limengReviewedAt: null,
        returnReason: null,
        balanceAppliedAt: null,
        financeSummaryMonth: null,
      },
      select: this.rechargeWriteSelect(),
    }) as DaochongCustomerRechargeRecord;

    return {
      ok: true,
      action: "chengcheng_approved_pending_limeng_review",
      item: this.mapRecharge(updated),
      safety: {
        balanceApplied: false,
        financeConfirmed: false,
        wecomSent: false,
      },
    };
  }

  async returnRechargeByChengcheng(
    rechargeId: string,
    body: ReturnDaochongRechargeByChengchengDto,
    user: AuthenticatedUser,
  ) {
    this.assertWriteEnabled();
    await this.recordPartition.getWritableCreateData(user);
    const existing = await this.ensureRechargeWriteAccess(rechargeId, user);
    if (existing.rechargeStatus !== "PENDING_CHENGCHENG_APPROVAL") {
      throw new BadRequestException("只有待程程审批的充值可由程程退回。");
    }

    const returnReason = this.requireText(body.returnReason, "程程退回必须填写原因。");
    const updated = await this.daochongPrisma.daochongCustomerRecharge.update({
      where: { id: existing.id },
      data: {
        rechargeStatus: "RETURNED_BY_CHENGCHENG",
        chengchengApprovedByUserId: null,
        chengchengApprovedAt: null,
        limengReviewedByUserId: null,
        limengReviewedAt: null,
        returnReason,
        balanceAppliedAt: null,
        financeSummaryMonth: null,
      },
      select: this.rechargeWriteSelect(),
    }) as DaochongCustomerRechargeRecord;

    return {
      ok: true,
      action: "chengcheng_returned",
      item: this.mapRecharge(updated),
      safety: {
        balanceApplied: false,
        financeConfirmed: false,
        wecomSent: false,
      },
    };
  }

  async reviewRechargeByLimeng(
    rechargeId: string,
    user: AuthenticatedUser,
  ) {
    this.assertWriteEnabled();
    await this.recordPartition.getWritableCreateData(user);
    const existing = await this.ensureRechargeWriteAccess(rechargeId, user, {
      enforceCustomerScope: false,
    });
    if (existing.rechargeStatus !== "PENDING_LIMENG_REVIEW") {
      throw new BadRequestException("只有待立猛复核的充值可通过立猛复核。");
    }

    const reviewedAt = new Date();
    const updated = await this.daochongPrisma.daochongCustomerRecharge.update({
      where: { id: existing.id },
      data: {
        rechargeStatus: "CONFIRMED",
        limengReviewedByUserId: user.id,
        limengReviewedAt: reviewedAt,
        returnReason: null,
        balanceAppliedAt: reviewedAt,
        financeSummaryMonth: this.financeSummaryMonthFor(reviewedAt),
      },
      select: this.rechargeWriteSelect(),
    }) as DaochongCustomerRechargeRecord;

    return {
      ok: true,
      action: "limeng_reviewed_confirmed",
      item: this.mapRecharge(updated),
      safety: {
        balanceApplied: true,
        financeConfirmed: false,
        wecomSent: false,
      },
    };
  }

  async returnRechargeByLimeng(
    rechargeId: string,
    body: ReturnDaochongRechargeByLimengDto,
    user: AuthenticatedUser,
  ) {
    this.assertWriteEnabled();
    await this.recordPartition.getWritableCreateData(user);
    const existing = await this.ensureRechargeWriteAccess(rechargeId, user, {
      enforceCustomerScope: false,
    });
    if (existing.rechargeStatus !== "PENDING_LIMENG_REVIEW") {
      throw new BadRequestException("只有待立猛复核的充值可由立猛退回。");
    }

    const returnReason = this.requireText(body.returnReason, "立猛退回必须填写原因。");
    const updated = await this.daochongPrisma.daochongCustomerRecharge.update({
      where: { id: existing.id },
      data: {
        rechargeStatus: "RETURNED_BY_LIMENG",
        limengReviewedByUserId: null,
        limengReviewedAt: null,
        returnReason,
        balanceAppliedAt: null,
        financeSummaryMonth: null,
      },
      select: this.rechargeWriteSelect(),
    }) as DaochongCustomerRechargeRecord;

    return {
      ok: true,
      action: "limeng_returned",
      item: this.mapRecharge(updated),
      safety: {
        balanceApplied: false,
        financeConfirmed: false,
        wecomSent: false,
      },
    };
  }

  async createServiceNote(
    body: CreateDaochongServiceNoteDto,
    user: AuthenticatedUser,
  ) {
    this.assertWriteEnabled();
    const partition = await this.recordPartition.getWritableCreateData(user);
    const customerId = this.requireText(body.customerId, "服务纪要缺少客户。");
    const teacherId = this.requireText(body.teacherId, "服务纪要缺少老师。");
    const projectId = this.optionalText(body.projectId);
    const noteStatus = body.noteStatus ?? "PENDING";
    if (!DAOCHONG_SERVICE_NOTE_STATUSES.has(noteStatus)) {
      throw new BadRequestException("服务纪要状态无效。");
    }

    await this.ensureCustomerWriteAccess(customerId, user);
    await this.ensureTeacherExists(teacherId);
    await this.ensureProjectExists(projectId);
    await this.ensureAppointmentAccess(this.optionalText(body.appointmentId), customerId, teacherId, user);

    const preferences = this.normalizePreferenceWriteInputs(body.preferences);
    const created = await this.prisma.$transaction(async (tx) => {
      const daochongTx = tx as unknown as DaochongReadonlyPrisma;
      const serviceNote = await daochongTx.daochongServiceNote.create({
        data: {
          appointmentId: this.nullableText(body.appointmentId),
          settlementDraftId: this.nullableText(body.settlementDraftId),
          customerId,
          teacherId,
          projectId: projectId ?? null,
          roomId: this.nullableText(body.roomId),
          sourceType: body.sourceType ?? "MANUAL_BACKFILL",
          pendingReason: this.nullableText(body.pendingReason),
          serviceSummary: this.nullableText(body.serviceSummary),
          customerFeedback: this.nullableText(body.customerFeedback),
          nextSuggestion: this.nullableText(body.nextSuggestion),
          preferenceNote: this.nullableText(body.preferenceNote),
          preferenceSyncStatus: preferences.length > 0 ? "SYNCED" : "NOT_SYNCED",
          noteStatus,
          dueAt: this.parseNullableDate(body.dueAt, "服务纪要截止时间"),
          reminderScheduledAt: this.parseNullableDate(body.reminderScheduledAt, "企业微信计划提醒时间"),
          completedAt: noteStatus === "COMPLETED" ? new Date() : null,
          createdByUserId: user.id,
          dataScope: partition.dataScope,
          partitionKey: partition.partitionKey,
          testBatchId: partition.testBatchId,
        },
        select: this.serviceNoteWriteSelect(),
      }) as DaochongServiceNoteWriteRecord;

      const preferenceWrites = await this.createPreferenceRows(tx, preferences, serviceNote, user);
      return { serviceNote, preferenceWrites };
    });

    return {
      ok: true,
      action: "created",
      preferenceWrites: created.preferenceWrites,
      item: this.mapServiceNoteWrite(created.serviceNote),
    };
  }

  async updateServiceNote(
    serviceNoteId: string,
    body: UpdateDaochongServiceNoteDto,
    user: AuthenticatedUser,
  ) {
    this.assertWriteEnabled();
    await this.recordPartition.getWritableCreateData(user);
    const existing = await this.ensureServiceNoteWriteAccess(serviceNoteId, user);
    const data: Record<string, unknown> = {};

    if (this.hasOwn(body, "settlementDraftId")) {
      data.settlementDraftId = this.nullableText(body.settlementDraftId);
    }
    if (this.hasOwn(body, "projectId")) {
      const projectId = this.optionalText(body.projectId);
      await this.ensureProjectExists(projectId);
      data.projectId = projectId ?? null;
    }
    if (this.hasOwn(body, "roomId")) {
      data.roomId = this.nullableText(body.roomId);
    }
    if (this.hasOwn(body, "pendingReason")) {
      data.pendingReason = this.nullableText(body.pendingReason);
    }
    if (this.hasOwn(body, "serviceSummary")) {
      data.serviceSummary = this.nullableText(body.serviceSummary);
    }
    if (this.hasOwn(body, "customerFeedback")) {
      data.customerFeedback = this.nullableText(body.customerFeedback);
    }
    if (this.hasOwn(body, "nextSuggestion")) {
      data.nextSuggestion = this.nullableText(body.nextSuggestion);
    }
    if (this.hasOwn(body, "preferenceNote")) {
      data.preferenceNote = this.nullableText(body.preferenceNote);
    }
    if (this.hasOwn(body, "noteStatus") && body.noteStatus) {
      if (!DAOCHONG_SERVICE_NOTE_STATUSES.has(body.noteStatus)) {
        throw new BadRequestException("服务纪要状态无效。");
      }
      data.noteStatus = body.noteStatus;
      if (body.noteStatus === "COMPLETED" && !this.hasOwn(body, "completedAt")) {
        data.completedAt = new Date();
      }
    }
    if (this.hasOwn(body, "dueAt")) {
      data.dueAt = this.parseNullableDate(body.dueAt, "服务纪要截止时间");
    }
    if (this.hasOwn(body, "reminderScheduledAt")) {
      data.reminderScheduledAt = this.parseNullableDate(body.reminderScheduledAt, "企业微信计划提醒时间");
    }
    if (this.hasOwn(body, "completedAt")) {
      data.completedAt = this.parseNullableDate(body.completedAt, "服务纪要完成时间");
    }

    const syncPreferences = body.syncPreferences === true || Boolean(body.preferences?.length);
    const fallbackPreferenceNote = syncPreferences && !body.preferences?.length
      ? this.hasOwn(body, "preferenceNote") ? data.preferenceNote : existing.preferenceNote
      : undefined;
    const preferences = syncPreferences
      ? this.normalizePreferenceWriteInputs(body.preferences, fallbackPreferenceNote)
      : [];
    if (syncPreferences) {
      data.preferenceSyncStatus = preferences.length > 0 ? "SYNCED" : "SKIPPED";
    }

    if (Object.keys(data).length === 0 && !syncPreferences) {
      throw new BadRequestException("没有可更新的服务纪要内容。");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const daochongTx = tx as unknown as DaochongReadonlyPrisma;
      const serviceNote = await daochongTx.daochongServiceNote.update({
        where: { id: existing.id },
        data,
        select: this.serviceNoteWriteSelect(),
      }) as DaochongServiceNoteWriteRecord;

      const preferenceWrites = await this.createPreferenceRows(tx, preferences, serviceNote, user);
      return { serviceNote, preferenceWrites };
    });

    return {
      ok: true,
      action: "updated",
      preferenceWrites: updated.preferenceWrites,
      item: this.mapServiceNoteWrite(updated.serviceNote),
    };
  }

  async sendWecomReminderTest(
    body: SendDaochongWecomReminderTestDto,
    user: AuthenticatedUser,
  ) {
    this.assertWriteEnabled();
    await this.recordPartition.getWritableCreateData(user);
    const serviceNote = await this.ensureServiceNoteWriteAccess(body.serviceNoteId, user);
    if (["COMPLETED", "CANCELLED"].includes(serviceNote.noteStatus)) {
      throw new BadRequestException("服务纪要已完成或已取消，不发送测试提醒。");
    }

    const { target, allowlistSize } = this.assertWecomTestTargetAllowed(body.toUser);
    const now = new Date();
    const customer = this.mapCustomerMini(serviceNote.customer);
    const projectName = serviceNote.project?.displayName || serviceNote.project?.name || "道冲服务";
    const title = this.optionalText(body.title) ?? `${customer?.name ?? "客户"}服务纪要待补填`;
    const description = this.optionalText(body.description)
      ?? this.optionalText(serviceNote.serviceSummary)
      ?? `${projectName}服务完成后需要补充服务纪要、客户反馈和下一步建议。`;
    const notifyUrl = this.resolveDaochongNotifyUrl(body.notifyUrl, serviceNote.id);

    await this.wecomMessageService.sendTextCardMessage(target, {
      title,
      description,
      url: notifyUrl,
      buttonText: "补填纪要",
    });

    const shouldMarkReminded = body.markReminded !== false && target === serviceNote.teacher.wecomUserId;
    const updatedServiceNote = shouldMarkReminded
      ? await this.daochongPrisma.daochongServiceNote.update({
          where: { id: serviceNote.id },
          data: { remindedAt: now },
          select: this.serviceNoteWriteSelect(),
        }) as DaochongServiceNoteWriteRecord
      : serviceNote;

    return {
      ok: true,
      mode: "live_test",
      serviceNoteId: serviceNote.id,
      targetUserId: target,
      allowlistSize,
      sentAt: now.toISOString(),
      notifyUrl,
      markedReminded: shouldMarkReminded,
      markSkippedReason: shouldMarkReminded
        ? undefined
        : body.markReminded === false ? "mark_reminded_disabled" : "target_is_not_note_teacher",
      item: this.mapServiceNoteWrite(updatedServiceNote),
    };
  }

  async listServiceNotes(
    query: DaochongServiceNotesReadonlyQueryDto,
    user: AuthenticatedUser,
  ) {
    if (!this.isShadowReadonlyEnabled()) {
      return this.disabledResponse("service_notes_shadow_readonly_disabled");
    }

    const customerWhere = query.customerId
      ? await this.accessControl.buildCustomerWhere(user, { id: query.customerId })
      : await this.accessControl.buildCustomerWhere(user);

    const items = await this.daochongPrisma.daochongServiceNote.findMany({
      where: {
        customer: customerWhere,
        teacherId: query.teacherId,
        noteStatus: query.noteStatus,
        dueAt: this.buildDueBeforeFilter(query.dueBefore),
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: query.limit ?? 50,
      select: {
        id: true,
        appointmentId: true,
        settlementDraftId: true,
        customerId: true,
        teacherId: true,
        projectId: true,
        roomId: true,
        sourceType: true,
        pendingReason: true,
        serviceSummary: true,
        customerFeedback: true,
        nextSuggestion: true,
        preferenceNote: true,
        preferenceSyncStatus: true,
        noteStatus: true,
        dueAt: true,
        reminderScheduledAt: true,
        remindedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      items,
      diagnostics: [] as DaochongReadonlyDiagnostic[],
    };
  }

  async listWecomReminderDryRuns(
    query: DaochongWecomReminderDryRunsReadonlyQueryDto,
    user: AuthenticatedUser,
  ) {
    if (!this.isShadowReadonlyEnabled()) {
      return this.disabledResponse("wecom_reminder_dry_runs_shadow_readonly_disabled");
    }

    const customerWhere = query.customerId
      ? await this.accessControl.buildCustomerWhere(user, { id: query.customerId })
      : await this.accessControl.buildCustomerWhere(user);
    const dueAtFilter = this.buildDueBeforeFilter(query.dueBefore);
    const where: Record<string, unknown> = {
      customer: customerWhere,
      teacherId: query.teacherId,
      noteStatus: { in: ["PENDING", "OVERDUE", "RETURNED"] },
      remindedAt: null,
    };
    where.dueAt = dueAtFilter ?? { not: null };

    const rows = await this.daochongPrisma.daochongServiceNote.findMany({
      where,
      orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
      take: this.normalizeLimit(query.limit),
      select: {
        id: true,
        appointmentId: true,
        settlementDraftId: true,
        customerId: true,
        teacherId: true,
        projectId: true,
        roomId: true,
        sourceType: true,
        pendingReason: true,
        serviceSummary: true,
        customerFeedback: true,
        nextSuggestion: true,
        preferenceSyncStatus: true,
        noteStatus: true,
        dueAt: true,
        reminderScheduledAt: true,
        remindedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        customer: { select: DAOCHONG_CUSTOMER_SELECT },
        teacher: { select: DAOCHONG_USER_WECOM_SELECT },
        project: { select: DAOCHONG_PRODUCT_SELECT },
      },
    }) as DaochongWecomReminderDryRunServiceNoteRecord[];

    return {
      items: rows.map((row) => this.mapWecomReminderDryRun(row)),
      diagnostics: [
        {
          key: rows.length ? "wecom_reminder_dry_runs_readonly_preview_mapped" : "wecom_reminder_dry_runs_empty",
          level: rows.length ? "info" : "warning",
          message: rows.length
            ? `已从 DaochongServiceNote 只读生成 ${rows.length} 条 12 小时提醒 dry-run 预览；仍不创建通知、不标记已发送、不调用企业微信。`
            : "DaochongServiceNote 暂无到期且未提醒的服务纪要，灰度页继续使用 mock 或空状态。",
        } satisfies DaochongReadonlyDiagnostic,
      ],
    };
  }

  async listCustomerPreferences(
    query: DaochongCustomerPreferencesReadonlyQueryDto,
    user: AuthenticatedUser,
  ) {
    if (!this.isShadowReadonlyEnabled()) {
      return this.disabledResponse("customer_preferences_shadow_readonly_disabled");
    }

    const customerWhere = await this.accessControl.buildCustomerWhere(user, {
      id: query.customerId,
    });

    const visibility = this.buildPreferenceVisibilityFilter(query.visibility, user);
    const items = await this.daochongPrisma.daochongCustomerPreference.findMany({
      where: {
        customer: customerWhere,
        preferenceType: query.preferenceType,
        visibility,
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 100,
      select: {
        id: true,
        customerId: true,
        sourceServiceNoteId: true,
        preferenceType: true,
        preferenceLabel: true,
        preferenceValue: true,
        roomPreference: true,
        lightPreference: true,
        pressurePreference: true,
        tabooNotes: true,
        hobbyNotes: true,
        visibility: true,
        lastObservedAt: true,
        updatedByUserId: true,
        updatedAt: true,
      },
    });

    return {
      items,
      diagnostics: [] as DaochongReadonlyDiagnostic[],
    };
  }

  async listHighRiskReadonlyResource(
    key: DaochongHighRiskReadonlyResource,
    query: DaochongHighRiskReadonlyQueryDto,
    user: AuthenticatedUser,
  ) {
    if (!this.isHighRiskReadonlyEnabled()) {
      return this.highRiskDisabledResponse(key);
    }

    if (key === "evidence_assets") {
      return this.listEvidenceAssets(query, user);
    }

    if (key === "meeting_notes") {
      return this.listMeetingNotes(query, user);
    }

    if (key === "project_communications") {
      return this.listProjectCommunications(query, user);
    }

    if (key === "recharges") {
      return this.listRecharges(query, user);
    }

    if (key === "settlement_drafts") {
      return this.listSettlementDrafts(query, user);
    }

    if (key === "consumption_approvals") {
      return this.listConsumptionApprovals(query, user);
    }

    if (key === "finance_summary") {
      return this.listFinanceSummaries(query, user);
    }

    if (key === "finance_evidence_exceptions") {
      return this.listFinanceEvidenceExceptions(query, user);
    }

    if (key === "bonus_expense_items") {
      return this.listBonusExpenseItems(query, user);
    }

    return this.highRiskSourcePendingResponse(key, query, user);
  }
}
