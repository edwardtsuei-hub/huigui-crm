import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { DataScope, RecordDataScope, WeeklyPlanReviewStatus, WeeklyReportStatus } from "@prisma/client";
import { createHash, createHmac } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fetch as undiciFetch, ProxyAgent } from "undici";
import { AuditService } from "../common/services/audit.service";
import { RecordPartitionService } from "../common/services/record-partition.service";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { WecomMessageService } from "../modules/wecom/wecom-message.service";
import { WecomService } from "../modules/wecom/wecom.service";
import { PayrollService } from "../payroll/payroll.service";
import { PrismaService } from "../prisma/prisma.service";

type WorkspaceMeta = {
  source: "api";
  generatedAt: string;
  baseUrl: string;
  requestedBy: string;
};

type WecomFinanceApprovalKind = "reimbursement" | "payment" | "loan";
type WecomFinanceApprovalStatus = "pending" | "approved" | "rejected" | "revoked" | "unknown";

type WecomFinanceApprovalTemplate = {
  kind: WecomFinanceApprovalKind;
  name: string;
  templateId: string;
};

type WecomFinanceApprovalField = {
  id: string;
  control: string;
  title: string;
  valueText: string;
  amount?: number;
  attachmentCount?: number;
};

type WecomFinanceApprovalRecord = {
  kind: WecomFinanceApprovalKind;
  templateId: string;
  templateName: string;
  spNo: string;
  status: WecomFinanceApprovalStatus;
  rawStatus: number | null;
  appliedAt: string;
  applicantUserid: string | null;
  departmentId: string | null;
  title: string;
  category: string;
  amount: number;
  reason: string;
  payee: string;
  attachmentCount: number;
  fields: WecomFinanceApprovalField[];
};

type WecomApprovalListResponse = {
  errcode: number;
  errmsg: string;
  sp_no_list?: string[];
  next_cursor?: number;
};

type WecomApprovalDetailResponse = {
  errcode: number;
  errmsg: string;
  info?: Record<string, unknown>;
};

type WecomFinanceApprovalImportStats = {
  imported: number;
  updated: number;
  skipped: number;
  claimIds: string[];
};

type WeeklyTone = "forest" | "earth" | "neutral";
type WeeklyReportState = "draft" | "submitted";
type WeeklyBatchActionKind = "save_draft" | "approve" | "return";
type TeamWeeklyReportStatus = "待提交" | "已提交" | "有阻塞";
type TeamWeeklyReviewState = "未点评" | "待点评" | "已点评" | "待补充" | "已退回修改";
type WeeklyReminderRunMode = "auto" | "weekly_due" | "daily_missing";
type WeeklyReminderResolvedMode = Exclude<WeeklyReminderRunMode, "auto">;
type WeeklySummaryRunMode = "scheduled" | "catch_up" | "manual";
type WeeklySummaryGroupId = "core" | "light_home" | "all_leaders";
type WeeklySummaryStatus = "stage" | "complete" | "revised";
type WeeklySummaryGenerationMode = "live" | "dry_run" | "fallback";
type WeeklyPersonalSummaryPeriodType = "month" | "quarter" | "year";
type WeeklyPersonalSummaryStatus = "draft" | "ready" | "revised";
type WeeklyPersonalSummarySourceKind = "weekly_report" | "personal_summary";
type WecomIntegrationMode = "live" | "dry_run";

type WecomActionResult = {
  ok: boolean;
  mode: WecomIntegrationMode;
  actionId: string;
  message: string;
  warnings: string[];
  requestPayload?: unknown;
  response?: unknown;
  createdAt: string;
};

type WeeklyReportDraft = {
  carryItems: Array<Record<string, unknown>>;
  focusItems: Array<Record<string, unknown>>;
  blockerItems: Array<Record<string, unknown>>;
  planItems: Array<Record<string, unknown>>;
  supportRequest: Record<string, unknown>;
  [key: string]: unknown;
};

type WeeklyActivityLogEntry = {
  id: string;
  time: string;
  timestamp: number;
  title: string;
  description: string;
  tone?: WeeklyTone;
};

type TeamWeeklyReportRecord = {
  name: string;
  department: string;
  role: string;
  status: TeamWeeklyReportStatus;
  updatedAt: string;
  blocker: string;
  review: TeamWeeklyReviewState;
  summary: string;
  blockerDetail: string;
  nextPlans: string[];
  supportRequest: string;
  highlights: string[];
  managerDraft: string;
  lastComment: string;
  reviewHistory: WeeklyActivityLogEntry[];
  reminderHistory: WeeklyActivityLogEntry[];
};

type WeeklyBatchActionRecord = {
  id: string;
  kind: WeeklyBatchActionKind;
  title: string;
  description: string;
  time: string;
  timestamp: number;
  tone: WeeklyTone;
  memberNames: string[];
  drilldownScopeLabel: string | null;
  drilldownScopeMemberNames: string[];
  previousMembers: TeamWeeklyReportRecord[];
  resultingMembers: TeamWeeklyReportRecord[];
};

type WeeklyWorkspaceRecord = {
  schemaVersion: 1;
  userKey: string;
  reportState: WeeklyReportState;
  lastSavedAt: string;
  draftDirty: boolean;
  reportDraft: WeeklyReportDraft;
  teamReports: TeamWeeklyReportRecord[];
  batchReviewDraft: string;
  batchActionHistory: WeeklyBatchActionRecord[];
  summaryVersions: WeeklySummaryVersion[];
  personalSummaryVersions: WeeklyPersonalSummaryVersion[];
  workspaceNote: string;
  savedAt: string;
  meta: {
    source: "api";
    version: number;
    lastSyncedAt: string;
    syncMode: "workspace";
    baseUrl: string;
    generatedAt: string;
    requestedBy: string;
  };
};

type WeeklyMutationContext = {
  route: string;
  rawUserKey: string | null;
  canonicalUserKey: string;
  storageUserKey: string;
  rawUserKeyHash: string | null;
};

type RosterWeekDbRow = {
  id: string;
  teamKey: string;
  teamLabel: string;
  weekKey: string;
  weekLabel: string | null;
  periodMode: string;
  periodLabel: string | null;
  status: string;
  sourceSha16: string | null;
  sourceUpdatedAt: Date | string | null;
  actorName: string | null;
  publishedAt: Date | string | null;
  version: number;
  rawSnapshot: unknown;
  updatedAt: Date | string;
};

type WeeklyPayloadDbRow = {
  id: string;
  sourceUserKey: string;
  canonicalUserKey: string | null;
  reportState: string | null;
  savedAt: Date | string | null;
  payloadJson: unknown;
  migrationStatus: string;
};

type WeeklyReportPeriod = {
  weekStartDate: Date;
  weekEndDate: Date;
  year: number;
  month: number;
  weekNumber: number;
};

type LegacyWeeklyPersistStatus = "DRAFT" | "SUBMITTED";

type WeeklyReminderMemberResult = {
  name: string;
  department: string;
  status: TeamWeeklyReportStatus;
  review: TeamWeeklyReviewState;
  recipientUserid: string | null;
  recipientSource: string | null;
  skipped: boolean;
  ok: boolean;
  mode: WecomIntegrationMode | "skipped" | "failed";
  message: string;
  warnings: string[];
};

type WeeklySummaryVersion = {
  id: string;
  groupId: WeeklySummaryGroupId;
  groupName: string;
  title: string;
  headline: string;
  periodLabel: string;
  status: WeeklySummaryStatus;
  summary: string;
  keyActions: string[];
  collaborationNeeds: string[];
  riskNotes: string[];
  sourceMemberNames: string[];
  submittedNames: string[];
  missingNames: string[];
  pendingApprovalNames: string[];
  audienceNames: string[];
  model: string;
  generationMode: WeeklySummaryGenerationMode;
  promptVersion: string;
  createdAt: string;
  createdBy: string;
  warnings: string[];
};

type WeeklySummaryGroupInput = {
  groupId: WeeklySummaryGroupId;
  groupName: string;
  memberNames: string[];
  audienceNames: string[];
  members: TeamWeeklyReportRecord[];
  periodLabel: string;
};

type WeeklySummaryModelOutput = {
  headline: string;
  summary: string;
  keyActions: string[];
  collaborationNeeds: string[];
  riskNotes: string[];
};

type WeeklyPersonalSummarySource = {
  id: string;
  kind: WeeklyPersonalSummarySourceKind;
  label: string;
  periodLabel: string;
  memberName: string;
  summary: string;
  highlights: string[];
  nextPlans: string[];
  supportRequest: string;
  blockers: string[];
  metricSummary: string;
  createdAt: string;
};

type WeeklyPersonalSummaryInput = {
  memberName: string;
  periodType: WeeklyPersonalSummaryPeriodType;
  periodId: string;
  periodLabel: string;
  sourceItems: WeeklyPersonalSummarySource[];
};

type WeeklyPersonalSummaryModelOutput = {
  headline: string;
  summary: string;
  keyResults: string[];
  carryForwardItems: string[];
  blockersAndNeeds: string[];
  nextPeriodFocus: string[];
  metricNotes: string[];
};

type WeeklyPersonalSummaryVersion = {
  id: string;
  memberName: string;
  title: string;
  headline: string;
  periodType: WeeklyPersonalSummaryPeriodType;
  periodId: string;
  periodLabel: string;
  status: WeeklyPersonalSummaryStatus;
  summary: string;
  keyResults: string[];
  carryForwardItems: string[];
  blockersAndNeeds: string[];
  nextPeriodFocus: string[];
  metricNotes: string[];
  sourceIds: string[];
  sourceLabels: string[];
  sourceCount: number;
  model: string;
  generationMode: WeeklySummaryGenerationMode;
  promptVersion: string;
  createdAt: string;
  createdBy: string;
  warnings: string[];
  revisionHistory: Array<{
    id: string;
    editedAt: string;
    editedBy: string;
    note: string;
  }>;
};

type WeeklySummaryNotificationResult = {
  groupId: WeeklySummaryGroupId;
  groupName: string;
  audienceNames: string[];
  recipientUserids: string[];
  touser: string | null;
  skipped: boolean;
  ok: boolean;
  mode: WecomIntegrationMode | "skipped" | "failed";
  message: string;
  warnings: string[];
};

@Injectable()
export class EmployeeLaunchService {
  private readonly contractStorageDir = join(
    process.env.LOCAL_UPLOAD_DIR ?? "/app/storage/uploads",
    "employee-launch-contract",
  );

  private readonly weeklyStorageDir = join(
    process.env.LOCAL_UPLOAD_DIR ?? "/app/storage/uploads",
    "employee-launch-weekly",
  );

  constructor(
    private readonly wecomService: WecomService,
    private readonly wecomMessageService: WecomMessageService,
    private readonly payrollService: PayrollService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly recordPartition: RecordPartitionService,
  ) {}

  buildPlatformWorkspace(user: AuthenticatedUser) {
    return this.readContractState("platform", () => this.createPlatformWorkspace(user), user, "/api/platform/workspace");
  }

  buildScheduleWorkspace(user: AuthenticatedUser) {
    return this.readContractState("schedule", () => this.createScheduleWorkspace(user), user, "/api/schedule/workspace");
  }

  async buildRosterWorkspace(user: AuthenticatedUser) {
    const legacyState = this.readContractState("roster", () => this.createRosterWorkspace(user), user, "/api/roster/workspace");
    return this.buildRosterWorkspaceDbFirst(legacyState, user);
  }

  buildFinanceWorkspace(user: AuthenticatedUser) {
    const state = this.readContractState("finance", () => this.createFinanceWorkspace(user), user, "/api/finance/workspace");
    this.ensureFinanceInvoiceFollowUps(state);
    return state;
  }

  buildDaochongWorkspace(user: AuthenticatedUser) {
    return this.readContractState("daochong", () => this.createDaochongWorkspace(user), user, "/api/daochong/workspace");
  }

  async buildDaochongWorkspaceWithPayroll(user: AuthenticatedUser) {
    const state = this.buildDaochongWorkspace(user);
    const payrollState = await this.payrollService.listWorkspacePayrollState(user);
    return {
      ...state,
      salarySlips: this.mergeSalarySlips(state.salarySlips, payrollState.salarySlips),
      salaryNotifyLogs: payrollState.salaryNotifyLogs,
      payrollDraftBatches: payrollState.payrollDraftBatches,
    };
  }

  buildCoursesWorkspace(user: AuthenticatedUser) {
    return this.readContractState("courses", () => this.createCoursesWorkspace(user), user, "/api/courses/workspace");
  }

  resetPlatformWorkspace(user: AuthenticatedUser) {
    return this.commitContractState("platform", this.createPlatformWorkspace(user), user, "/api/platform/workspace");
  }

  updatePlatformWorkspace(body: Record<string, unknown>, user: AuthenticatedUser) {
    const state = {
      ...this.buildPlatformWorkspace(user),
      ...body,
      messages: Array.isArray(body.messages) ? body.messages : this.buildPlatformWorkspace(user).messages,
      attachments: Array.isArray(body.attachments) ? body.attachments : this.buildPlatformWorkspace(user).attachments,
      auditItems: Array.isArray(body.auditItems) ? body.auditItems : this.buildPlatformWorkspace(user).auditItems,
    };
    return this.commitContractState("platform", state, user, "/api/platform/workspace");
  }

  resetScheduleWorkspace(user: AuthenticatedUser) {
    return this.commitContractState("schedule", this.createScheduleWorkspace(user), user, "/api/schedule/workspace");
  }

  resetRosterWorkspace(user: AuthenticatedUser) {
    return this.commitContractState("roster", this.createRosterWorkspace(user), user, "/api/roster/workspace");
  }

  async updateRosterWorkspace(body: Record<string, unknown>, user: AuthenticatedUser) {
    const normalized = this.normalizeRosterWorkspace(body);
    await this.upsertRosterWorkspaceToDb(normalized, user);
    const committed = this.commitContractState("roster", normalized, user, "/api/roster/workspace");
    return this.buildRosterWorkspaceDbFirst(committed, user);
  }

  mutateCurrentLeaveRequest(action: string, user: AuthenticatedUser) {
    const state = this.buildScheduleWorkspace(user);
    if (action === "request-proof") {
      state.snapshot.reviewState = "proof_required";
      state.snapshot.attendanceLocked = false;
      this.prependActivity(state.auditTrail, "办公室退回补件", "要求补充主管说明后再继续审批，当前请假单不会进入最终出勤口径。", user);
      this.upsertById(state.attachments, {
        id: "supporting-proof",
        detail: "缺主管补充说明，当前请假单已退回补件。",
        status: "missing",
        tone: "earth",
      });
      return this.commitContractState("schedule", state, user, "/api/schedule/workspace");
    }

    if (action === "approve") {
      state.snapshot.reviewState = "approved";
      this.prependActivity(state.auditTrail, "办公室通过请假复核", "请假单已通过，等待补卡材料确认后锁定出勤。", user);
      return this.commitContractState("schedule", state, user, "/api/schedule/workspace");
    }

    throw new BadRequestException("未知请假动作。");
  }

  confirmCurrentAttendanceMakeup(user: AuthenticatedUser) {
    const state = this.buildScheduleWorkspace(user);
    state.snapshot.makeupConfirmed = true;
    this.prependActivity(state.auditTrail, "办公室确认补卡材料", "缺卡异常已从补卡队列移出。", user);
    return this.commitContractState("schedule", state, user, "/api/schedule/workspace");
  }

  lockCurrentAttendancePeriod(user: AuthenticatedUser) {
    const state = this.buildScheduleWorkspace(user);
    if (state.snapshot.reviewState !== "approved" || !state.snapshot.makeupConfirmed) {
      throw new BadRequestException("关键异常未清，暂不能锁定出勤。");
    }
    state.snapshot.attendanceLocked = true;
    this.prependActivity(state.auditTrail, "出勤口径已锁定", "4 月出勤结果已进入最终口径，财务可据此导出工资与补贴依据。", user);
    return this.commitContractState("schedule", state, user, "/api/schedule/workspace");
  }

  resetFinanceWorkspace(user: AuthenticatedUser) {
    return this.commitContractState("finance", this.createFinanceWorkspace(user), user, "/api/finance/workspace");
  }

  mutateFinancialImportBatch(id: string, action: string, user: AuthenticatedUser) {
    const state = this.buildFinanceWorkspace(user);
    const item = this.findById(state.imports, id);
    if (!item) throw new BadRequestException("导入批次不存在。");
    if (action === "retry") item.status = "needs_review";
    else if (action === "review") item.status = "ready";
    else throw new BadRequestException("未知导入批次动作。");
    return this.commitContractState("finance", state, user, "/api/finance/workspace");
  }

  createExpenseClaim(body: Record<string, unknown>, user: AuthenticatedUser) {
    const state = this.buildFinanceWorkspace(user);
    const id = this.normalizeOptionalText(body.id) ?? this.createRecordId("expense");
    const claim = {
      id,
      title: this.normalizeOptionalText(body.title) ?? "员工报销单",
      applicant: this.normalizeOptionalText(body.applicant) ?? user.name,
      department: this.normalizeOptionalText(body.department) ?? "综合办公室",
      category: this.normalizeOptionalText(body.category) ?? "项目物料",
      amount: Number(body.amount ?? 0),
      status: "pending_review",
      submittedAt: this.normalizeOptionalText(body.submittedAt) ?? new Date().toISOString(),
      invoiceCount: Number(body.invoiceCount ?? 0),
      attachmentIds: Array.isArray(body.attachmentIds) ? body.attachmentIds : [],
      ocrTaskIds: Array.isArray(body.ocrTaskIds) ? body.ocrTaskIds : [],
      linkedBankTransactionId: null,
      summary: this.normalizeOptionalText(body.summary) ?? "",
      payee: this.normalizeOptionalText(body.payee) ?? user.name,
      accountHint: this.normalizeOptionalText(body.accountHint) ?? "",
    };
    this.upsertById(state.expenseClaims, claim);
    this.ensureFinanceInvoiceFollowUps(state);
    return this.commitContractState("finance", state, user, "/api/finance/workspace");
  }

  linkExpenseClaimAttachment(id: string, body: Record<string, unknown>, user: AuthenticatedUser) {
    const state = this.buildFinanceWorkspace(user);
    const claim = this.findById(state.expenseClaims, id);
    if (!claim) throw new BadRequestException("报销单不存在。");
    const attachmentId = this.normalizeOptionalText(body.attachmentId);
    if (!attachmentId) throw new BadRequestException("缺少附件 ID。");
    claim.attachmentIds = Array.from(new Set([...(claim.attachmentIds ?? []), attachmentId]));
    return this.commitContractState("finance", state, user, "/api/finance/workspace");
  }

  unlinkExpenseClaimAttachment(id: string, attachmentId: string, user: AuthenticatedUser) {
    const state = this.buildFinanceWorkspace(user);
    const claim = this.findById(state.expenseClaims, id);
    if (!claim) throw new BadRequestException("报销单不存在。");
    claim.attachmentIds = (claim.attachmentIds ?? []).filter((item: string) => item !== attachmentId);
    return this.commitContractState("finance", state, user, "/api/finance/workspace");
  }

  mutateExpenseClaim(id: string, action: string, user: AuthenticatedUser) {
    const state = this.buildFinanceWorkspace(user);
    const claim = this.findById(state.expenseClaims, id);
    if (!claim) throw new BadRequestException("报销单不存在。");
    if (action === "approve") claim.status = "approved";
    else if (action === "book") claim.status = "booked";
    else throw new BadRequestException("未知报销动作。");
    return this.commitContractState("finance", state, user, "/api/finance/workspace");
  }

  mutateBankTransaction(id: string, action: string, body: Record<string, unknown>, user: AuthenticatedUser) {
    const state = this.buildFinanceWorkspace(user);
    const transaction = this.findById(state.bankTransactions, id);
    if (!transaction) throw new BadRequestException("银行流水不存在。");
    if (action === "classify") {
      transaction.category = this.normalizeOptionalText(body.category) ?? "未分类";
      transaction.status = "income_tagged";
    } else if (action === "unlink-expense") {
      transaction.linkedExpenseClaimId = null;
      transaction.linkedRecord = "";
      transaction.status = "needs_review";
    } else if (action === "link-expense") {
      transaction.linkedExpenseClaimId = this.normalizeOptionalText(body.claimId);
      transaction.linkedRecord = transaction.linkedExpenseClaimId ?? "";
      transaction.status = "matched_expense";
    } else {
      throw new BadRequestException("未知银行流水动作。");
    }
    return this.commitContractState("finance", state, user, "/api/finance/workspace");
  }

  createSalaryReturnFile(body: Record<string, unknown>, user: AuthenticatedUser) {
    const state = this.buildFinanceWorkspace(user);
    state.attendanceArchive.archived = true;
    state.attendanceArchive.month = this.normalizeOptionalText(body.month) ?? state.attendanceArchive.month;
    state.attendanceArchive.fileName = this.normalizeOptionalText(body.fileName) ?? "salary-return.xlsx";
    return this.commitContractState("finance", state, user, "/api/finance/workspace");
  }

  createInternalReport(body: Record<string, unknown>, user: AuthenticatedUser) {
    const state = this.buildFinanceWorkspace(user);
    const month = this.normalizeOptionalText(body.month) ?? new Date().toISOString().slice(0, 7);
    const department = this.normalizeOptionalText(body.department) ?? "综合办公室";
    const report = {
      id: this.createRecordId("internal-report"),
      month,
      department,
      version: "v1",
      status: "needs_review",
      revenue: Number(body.revenue ?? 0),
      cateringCost: Number(body.cateringCost ?? 0),
      adminExpense: Number(body.adminExpense ?? 0),
      profit: Number(body.revenue ?? 0) - Number(body.cateringCost ?? 0) - Number(body.adminExpense ?? 0),
      salarySource: this.normalizeOptionalText(body.salarySource) ?? "员工正式验收",
      summary: this.normalizeOptionalText(body.summary) ?? "员工正式验收生成的内账草稿。",
      trend: [],
      expenseBuckets: Array.isArray(body.expenseBuckets) ? body.expenseBuckets : [],
      generatedBy: user.name,
      generatedAt: new Date().toISOString(),
    };
    state.internalReports = [report, ...state.internalReports];
    return this.commitContractState("finance", state, user, "/api/finance/workspace");
  }

  mutateInternalReport(id: string, action: string, user: AuthenticatedUser) {
    const state = this.buildFinanceWorkspace(user);
    const report = this.findById(state.internalReports, id);
    if (!report) throw new BadRequestException("内账报表不存在。");
    if (action === "archive") report.status = "archived";
    else if (action === "reopen") report.status = "needs_review";
    else throw new BadRequestException("未知内账动作。");
    return this.commitContractState("finance", state, user, "/api/finance/workspace");
  }

  createStatutoryReportJob(body: Record<string, unknown>, user: AuthenticatedUser) {
    const state = this.buildFinanceWorkspace(user);
    const job = {
      id: this.createRecordId("statutory-job"),
      template: this.normalizeOptionalText(body.template) ?? "利润表",
      month: this.normalizeOptionalText(body.month) ?? new Date().toISOString().slice(0, 7),
      templateCode: "profit_statement",
      version: "v1",
      status: "draft",
      sourceSummary: "根据内账与工资回传生成。",
      reviewNote: "",
      exportedAt: null,
      generatedAt: new Date().toISOString(),
      reviewer: null,
      outputFormats: ["xlsx", "pdf"],
      keyFields: [
        { label: "营业收入", value: "88000", note: "来自内账收入" },
        { label: "净利润", value: "53000", note: "自动计算" },
      ],
    };
    state.statutoryJobs = [job, ...state.statutoryJobs];
    return this.commitContractState("finance", state, user, "/api/finance/workspace");
  }

  updateStatutoryReportJob(id: string, body: Record<string, unknown>, user: AuthenticatedUser) {
    const state = this.buildFinanceWorkspace(user);
    const job = this.findById(state.statutoryJobs, id);
    if (!job) throw new BadRequestException("法定模板任务不存在。");
    job.reviewNote = this.normalizeOptionalText(body.reviewNote) ?? "";
    return this.commitContractState("finance", state, user, "/api/finance/workspace");
  }

  mutateStatutoryReportJob(id: string, action: string, user: AuthenticatedUser) {
    const state = this.buildFinanceWorkspace(user);
    const job = this.findById(state.statutoryJobs, id);
    if (!job) throw new BadRequestException("法定模板任务不存在。");
    if (action === "review") {
      job.status = "reviewed";
      job.reviewer = user.name;
    }
    else if (action === "export") {
      job.status = "exported";
      job.exportedAt = new Date().toISOString();
    } else {
      throw new BadRequestException("未知法定模板动作。");
    }
    return this.commitContractState("finance", state, user, "/api/finance/workspace");
  }

  resetDaochongWorkspace(user: AuthenticatedUser) {
    return this.commitContractState("daochong", this.createDaochongWorkspace(user), user, "/api/daochong/workspace");
  }

  mutateCustomerAppointment(id: string, action: string, user: AuthenticatedUser) {
    const state = this.buildDaochongWorkspace(user);
    const appointment = this.findById(state.appointments, id);
    if (!appointment) throw new BadRequestException("预约不存在。");
    if (action === "arrive") appointment.status = "arrived";
    else if (action === "complete") appointment.status = "completed";
    else throw new BadRequestException("未知预约动作。");
    this.prependActivity(state.activity, "预约状态已更新", `${appointment.customerName ?? id} ${action}`, user);
    return this.commitContractState("daochong", state, user, "/api/daochong/workspace");
  }

  createCustomerPayment(body: Record<string, unknown>, user: AuthenticatedUser) {
    const state = this.buildDaochongWorkspace(user);
    const payment = {
      id: this.normalizeOptionalText(body.id) ?? this.createRecordId("payment"),
      customerId: this.normalizeOptionalText(body.customerId),
      appointmentId: this.normalizeOptionalText(body.appointmentId),
      amount: Number(body.amount ?? 0),
      method: this.normalizeOptionalText(body.method) ?? "微信",
      receivedBy: this.normalizeOptionalText(body.receivedBy) ?? user.name,
      recordedBy: this.normalizeOptionalText(body.recordedBy) ?? user.name,
      note: this.normalizeOptionalText(body.note) ?? "",
      status: "pending_review",
      paidAt: new Date().toISOString(),
    };
    this.upsertById(state.payments, payment);
    return this.commitContractState("daochong", state, user, "/api/daochong/workspace");
  }

  mutateCustomerPayment(id: string, action: string, user: AuthenticatedUser) {
    const state = this.buildDaochongWorkspace(user);
    const payment = this.findById(state.payments, id);
    if (!payment) throw new BadRequestException("收款记录不存在。");
    if (action === "return") payment.status = "returned";
    else if (action === "verify") payment.status = "verified";
    else throw new BadRequestException("未知收款动作。");
    return this.commitContractState("daochong", state, user, "/api/daochong/workspace");
  }

  createCustomerRecharge(body: Record<string, unknown>, user: AuthenticatedUser) {
    const state = this.buildDaochongWorkspace(user);
    const recharge = {
      id: this.normalizeOptionalText(body.id) ?? this.createRecordId("recharge"),
      customerId: this.normalizeOptionalText(body.customerId),
      type: this.normalizeOptionalText(body.type) ?? "top_up",
      amount: Number(body.amount ?? 0),
      channel: this.normalizeOptionalText(body.channel) ?? "微信",
      recordedBy: this.normalizeOptionalText(body.recordedBy) ?? user.name,
      note: this.normalizeOptionalText(body.note) ?? "",
      status: "pending_confirm",
      at: new Date().toISOString(),
    };
    this.upsertById(state.rechargeTransactions, recharge);
    return this.commitContractState("daochong", state, user, "/api/daochong/workspace");
  }

  mutateCustomerRecharge(id: string, action: string, user: AuthenticatedUser) {
    const state = this.buildDaochongWorkspace(user);
    const recharge = this.findById(state.rechargeTransactions, id);
    if (!recharge) throw new BadRequestException("储值记录不存在。");
    if (action === "return") recharge.status = "returned";
    else if (action === "confirm") recharge.status = "confirmed";
    else throw new BadRequestException("未知储值动作。");
    return this.commitContractState("daochong", state, user, "/api/daochong/workspace");
  }

  resetCoursesWorkspace(user: AuthenticatedUser) {
    return this.commitContractState("courses", this.createCoursesWorkspace(user), user, "/api/courses/workspace");
  }

  confirmCourseReadiness(user: AuthenticatedUser) {
    const state = this.buildCoursesWorkspace(user);
    if (state.readinessConfirmed) return state;
    state.readinessConfirmed = true;
    const session = this.findById(state.sessions, "course-session-home-0427");
    if (session) session.status = "ready";
    this.prependActivity(state.activity, "主场准备已确认", "讲师、志工、报名名单和现场物料已进入可执行状态。", user);
    return this.commitContractState("courses", state, user, "/api/courses/workspace");
  }

  confirmCourseArchive(user: AuthenticatedUser) {
    const state = this.buildCoursesWorkspace(user);
    if (state.archiveConfirmed) return state;
    state.archiveConfirmed = true;
    this.prependActivity(state.activity, "项目资料已确认归档", "海报、签到名单、主持口播和现场流程单已统一进入可引用版本。", user);
    return this.commitContractState("courses", state, user, "/api/courses/workspace");
  }

  sendCourseNotices(user: AuthenticatedUser) {
    const state = this.buildCoursesWorkspace(user);
    if (state.noticeSent) return state;
    state.noticeSent = true;
    state.noticeReceipts = state.noticeReceipts.map((receipt: Record<string, any>) => (
      receipt.status === "pending"
        ? {
            ...receipt,
            status: "sent",
            sentAt: receipt.sentAt ?? new Date().toISOString(),
            note: "课程主场提醒已发送，等待读取和回执确认。",
          }
        : receipt
    ));
    this.prependActivity(state.activity, "通知已发送并等待回执", "报名人、志工和办公室已收到主场提醒，后续只追未读回执。", user);
    return this.commitContractState("courses", state, user, "/api/courses/workspace");
  }

  mutateCourseEnrollment(id: string, action: string, user: AuthenticatedUser) {
    const state = this.buildCoursesWorkspace(user);
    const enrollment = this.findById(state.enrollments, id);
    if (!enrollment) throw new BadRequestException("报名记录不存在。");
    if (action === "confirm") {
      if (enrollment.registrationStatus === "confirmed") return state;
      enrollment.registrationStatus = "confirmed";
      enrollment.note = "报名已确认，下一步等待通知回执和现场签到。";
      this.prependActivity(state.activity, "报名已确认", `${enrollment.name} 已确认参加 ${this.findById(state.sessions, enrollment.sessionId)?.title ?? "课程"}。`, user);
    } else if (action === "check-in") {
      if (enrollment.checkInStatus === "checked_in") return state;
      enrollment.registrationStatus = "confirmed";
      enrollment.checkInStatus = "checked_in";
      enrollment.note = "已完成现场签到，可进入课程主场执行名单。";
      this.prependActivity(state.activity, "现场签到已完成", `${enrollment.name} 已完成现场签到，签到表和课程主场名单已同步。`, user);
    } else if (action === "absent") {
      if (enrollment.checkInStatus === "absent") return state;
      enrollment.checkInStatus = "absent";
      enrollment.note = "已标记未到场，需要课后回访或确认是否转入下次课程。";
      this.prependActivity(state.activity, "已标记未到场", `${enrollment.name} 未完成现场签到，需进入课后回访名单。`, user);
    } else if (action === "restore-pending") {
      if (enrollment.registrationStatus === "cancelled") throw new BadRequestException("已取消报名不能恢复为待签到。");
      if (enrollment.checkInStatus === "pending" && enrollment.registrationStatus === "confirmed") return state;
      enrollment.registrationStatus = "confirmed";
      enrollment.checkInStatus = "pending";
      enrollment.note = "已恢复为待签到，需要前台重新确认现场到场状态。";
      this.prependActivity(state.activity, "已恢复待签到", `${enrollment.name} 已从签到表修正为待签到，可继续现场签到、批量签到或重新标记缺席。`, user);
    } else throw new BadRequestException("未知报名动作。");
    return this.commitContractState("courses", state, user, "/api/courses/workspace");
  }

  bulkCheckInCourseSession(id: string, user: AuthenticatedUser) {
    const state = this.buildCoursesWorkspace(user);
    const session = this.findById(state.sessions, id);
    if (!session) throw new BadRequestException("课程场次不存在。");
    const targets = state.enrollments.filter((item: Record<string, any>) => (
      item.sessionId === id &&
      item.registrationStatus !== "cancelled" &&
      item.checkInStatus === "pending"
    ));
    if (!targets.length) return state;
    targets.forEach((enrollment: Record<string, any>) => {
      enrollment.registrationStatus = "confirmed";
      enrollment.checkInStatus = "checked_in";
      enrollment.note = "已批量完成现场签到，可进入课程主场执行名单。";
    });
    this.prependActivity(state.activity, "批量签到已完成", `${session.title} 已批量签到 ${targets.length} 人，签到表已同步更新。`, user);
    return this.commitContractState("courses", state, user, "/api/courses/workspace");
  }

  createCourseAttendanceExport(body: Record<string, unknown>, user: AuthenticatedUser) {
    const state = this.buildCoursesWorkspace(user);
    const filename = this.normalizeOptionalText(body.filename) ?? "course-attendance.csv";
    const rowCount = Number(body.rowCount ?? 0);
    const checkedInCount = Number(body.checkedInCount ?? 0);
    const absentCount = Number(body.absentCount ?? 0);
    const pendingCheckInCount = Number(body.pendingCheckInCount ?? 0);
    this.prependActivity(
      state.activity,
      "签到表已导出",
      `${filename} 已导出 ${rowCount} 行，已签到 ${checkedInCount} 人、未到场 ${absentCount} 人、待签到 ${pendingCheckInCount} 人。`,
      user,
    );
    return this.commitContractState("courses", state, user, "/api/courses/workspace");
  }

  confirmCourseNoticeReceipt(id: string, user: AuthenticatedUser) {
    const state = this.buildCoursesWorkspace(user);
    const receipt = this.findById(state.noticeReceipts, id);
    if (!receipt) throw new BadRequestException("通知回执不存在。");
    if (receipt.status === "confirmed") return state;
    const enrollment = this.findById(state.enrollments, receipt.enrollmentId);
    receipt.status = "confirmed";
    receipt.sentAt = receipt.sentAt ?? new Date().toISOString();
    receipt.readAt = receipt.readAt ?? new Date().toISOString();
    receipt.confirmedAt = new Date().toISOString();
    receipt.note = "已确认收到课程提醒，并完成到场回执。";
    this.prependActivity(state.activity, "通知回执已确认", `${enrollment?.name ?? "报名人"} 已确认收到课程主场提醒。`, user);
    return this.commitContractState("courses", state, user, "/api/courses/workspace");
  }

  async createOcrTask(body: Record<string, unknown>, user: AuthenticatedUser) {
    const taskId = this.createRecordId("ocr");
    const fileName = this.normalizeOptionalText(body.fileName) ?? "ocr-contract-invoice.jpg";
    const now = new Date().toISOString();
    const taskInput = {
      fileName,
      mimeType: this.normalizeOptionalText(body.mimeType) ?? "image/jpeg",
      taskType: this.normalizeOptionalText(body.taskType) ?? "invoice",
      sourceModule: this.normalizeOptionalText(body.sourceModule) ?? "报销审批",
      claimId: this.normalizeOptionalText(body.claimId),
      imageUrl: this.normalizeOptionalText(body.imageUrl),
      imageBase64: this.normalizeOptionalText(body.imageBase64),
      imageDataUrl: this.normalizeOptionalText(body.imageDataUrl),
      transcriptionHint: this.normalizeOptionalText(body.transcriptionHint),
    };
    const ocrResult = await this.recognizeExpenseInvoice(taskInput);
    const task = {
      id: taskId,
      attachmentId: this.normalizeOptionalText(body.attachmentId) ?? "attachment-ocr-contract-invoice",
      fileName: taskInput.fileName,
      mimeType: taskInput.mimeType,
      taskType: taskInput.taskType,
      sourceModule: taskInput.sourceModule,
      claimId: taskInput.claimId,
      status: ocrResult.status,
      rawText: ocrResult.rawText,
      fields: ocrResult.fields,
      correctedFields: null,
      warnings: ocrResult.warnings,
      engine: ocrResult.engine,
      createdAt: now,
      updatedAt: now,
      completedAt: now,
      confirmedAt: null,
      confirmedBy: null,
      confirmNote: null,
      requestedBy: user.loginAccount ?? user.name,
    };
    const tasks = this.readOcrTasks();
    tasks[taskId] = task;
    this.writeOcrTasks(tasks);
    return task;
  }

  listOcrTasks(query: Record<string, unknown>, _user: AuthenticatedUser) {
    const claimId = this.normalizeOptionalText(query.claimId);
    const attachmentId = this.normalizeOptionalText(query.attachmentId);
    return Object.values(this.readOcrTasks())
      .filter((task) => !claimId || task.claimId === claimId)
      .filter((task) => !attachmentId || task.attachmentId === attachmentId)
      .sort((left, right) => {
        const leftTime = Date.parse(String(left.createdAt ?? ""));
        const rightTime = Date.parse(String(right.createdAt ?? ""));
        return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
      });
  }

  getOcrTask(id: string, _user: AuthenticatedUser) {
    const task = this.readOcrTasks()[id];
    if (!task) throw new BadRequestException("OCR 任务不存在。");
    return task;
  }

  confirmOcrTask(id: string, body: Record<string, unknown>, _user: AuthenticatedUser) {
    const tasks = this.readOcrTasks();
    const task = tasks[id];
    if (!task) throw new BadRequestException("OCR 任务不存在。");
    task.status = "confirmed";
    task.correctedFields = this.isRecordObject(body.fields) ? body.fields : task.fields;
    task.confirmedBy = this.normalizeOptionalText(body.confirmedBy) ?? "财务管理员";
    task.confirmedAt = new Date().toISOString();
    task.note = this.normalizeOptionalText(body.note) ?? "";
    tasks[id] = task;
    this.writeOcrTasks(tasks);
    return task;
  }

  private async recognizeExpenseInvoice(input: {
    fileName: string;
    mimeType: string;
    taskType: string;
    sourceModule: string;
    claimId?: string | null;
    imageUrl?: string | null;
    imageBase64?: string | null;
    imageDataUrl?: string | null;
    transcriptionHint?: string | null;
  }) {
    const fallbackFields = this.createEmptyOcrFields(input);
    try {
      const liveResult = await this.recognizeTencentGeneralInvoice(input);
      if (liveResult) {
        return {
          status: "succeeded",
          engine: liveResult.engine,
          rawText: liveResult.rawText,
          fields: liveResult.fields,
          warnings: liveResult.warnings,
        };
      }
    } catch (error) {
      return {
        status: "failed",
        engine: "tencent-cloud-ocr:failed",
        rawText: input.transcriptionHint || `票据文件：${input.fileName}`,
        fields: fallbackFields,
        warnings: [`腾讯云 OCR 调用失败：${error instanceof Error ? error.message : String(error)}`],
      };
    }

    return {
      status: "failed",
      engine: "ocr:not-configured",
      rawText: input.transcriptionHint || `票据文件：${input.fileName}`,
      fields: fallbackFields,
      warnings: ["生产 OCR 未配置，已建立失败任务等待人工核对；未使用示例识别字段。"],
    };
  }

  private async recognizeTencentGeneralInvoice(input: {
    fileName: string;
    mimeType: string;
    imageUrl?: string | null;
    imageBase64?: string | null;
    imageDataUrl?: string | null;
  }) {
    const secretId = this.normalizeOptionalText(process.env.TENCENTCLOUD_SECRET_ID) ?? this.normalizeOptionalText(process.env.COS_SECRET_ID);
    const secretKey = this.normalizeOptionalText(process.env.TENCENTCLOUD_SECRET_KEY) ?? this.normalizeOptionalText(process.env.COS_SECRET_KEY);
    if (!secretId || !secretKey) return null;

    const endpoint = this.normalizeOptionalText(process.env.TENCENTCLOUD_OCR_ENDPOINT) ?? "ocr.tencentcloudapi.com";
    const region = this.normalizeOptionalText(process.env.TENCENTCLOUD_OCR_REGION) ?? this.normalizeOptionalText(process.env.COS_REGION) ?? "ap-guangzhou";
    const action = this.normalizeOptionalText(process.env.TENCENTCLOUD_OCR_ACTION) ?? "RecognizeGeneralInvoice";
    const imageUrl = this.normalizeOptionalText(input.imageUrl);
    const imageBase64 = this.normalizeImageBase64(input);
    if (!imageUrl && !imageBase64) return null;

    const payloadRecord: Record<string, unknown> = imageUrl ? { ImageUrl: imageUrl } : { ImageBase64: imageBase64 };
    if (this.isPdfOcrInput(input)) {
      payloadRecord.EnablePdf = true;
      payloadRecord.PdfPageNumber = 1;
    }
    const payload = JSON.stringify(payloadRecord);
    const timestamp = Math.floor(Date.now() / 1000);
    const authorization = this.buildTencentOcrAuthorization({ secretId, secretKey, endpoint, timestamp, payload });
    const response = await undiciFetch(`https://${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json; charset=utf-8",
        Host: endpoint,
        "X-TC-Action": action,
        "X-TC-Version": "2018-11-19",
        "X-TC-Timestamp": String(timestamp),
        "X-TC-Region": region,
      },
      body: payload,
    });
    const parsed = await response.json() as { Response?: Record<string, unknown> };
    const responseBody = this.isRecordObject(parsed.Response) ? parsed.Response : {};
    const error = this.isRecordObject(responseBody.Error) ? responseBody.Error : null;
    if (!response.ok || error) {
      throw new Error(this.normalizeOptionalText(error?.Message) ?? `HTTP ${response.status}`);
    }

    const fields = this.mapTencentOcrInvoiceFields(responseBody);
    return {
      engine: `tencent-cloud-ocr:${action}`,
      rawText: this.buildTencentOcrRawText(responseBody),
      fields,
      warnings: [this.normalizeOptionalText(responseBody.RequestId) ? `腾讯云 RequestId：${this.normalizeOptionalText(responseBody.RequestId)}` : ""].filter(Boolean),
    };
  }

  private createEmptyOcrFields(input: { fileName: string }) {
    return {
      invoiceType: "待人工核对",
      invoiceNo: "待人工核对",
      issuedAt: "",
      merchantName: "待人工核对",
      buyerName: "",
      category: "待人工核对",
      amount: 0,
      taxAmount: 0,
      totalAmount: 0,
      currency: "CNY",
      confidence: 0,
      fileName: input.fileName,
    };
  }

  private normalizeImageBase64(input: { imageBase64?: string | null; imageDataUrl?: string | null }) {
    if (input.imageBase64) return input.imageBase64;
    const imageDataUrl = input.imageDataUrl;
    if (!imageDataUrl) return "";
    return imageDataUrl.match(/^data:[^;]+;base64,(.+)$/)?.[1]?.trim() ?? "";
  }

  private isPdfOcrInput(input: { fileName: string; mimeType: string; imageUrl?: string | null }) {
    const fileName = input.fileName.toLowerCase();
    const mimeType = input.mimeType.toLowerCase();
    const imageUrl = input.imageUrl?.toLowerCase() ?? "";
    return mimeType === "application/pdf" || fileName.endsWith(".pdf") || imageUrl.includes(".pdf");
  }

  private buildTencentOcrAuthorization(input: {
    secretId: string;
    secretKey: string;
    endpoint: string;
    timestamp: number;
    payload: string;
  }) {
    const date = new Date(input.timestamp * 1000).toISOString().slice(0, 10);
    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${input.endpoint}\n`;
    const signedHeaders = "content-type;host";
    const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${this.sha256(input.payload)}`;
    const credentialScope = `${date}/ocr/tc3_request`;
    const stringToSign = `TC3-HMAC-SHA256\n${input.timestamp}\n${credentialScope}\n${this.sha256(canonicalRequest)}`;
    const secretDate = this.hmac(`TC3${input.secretKey}`, date);
    const secretService = this.hmac(secretDate, "ocr");
    const secretSigning = this.hmac(secretService, "tc3_request");
    const signature = this.hmac(secretSigning, stringToSign, "hex");

    return `TC3-HMAC-SHA256 Credential=${input.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  }

  private sha256(value: string) {
    return createHash("sha256").update(value, "utf8").digest("hex");
  }

  private hmac(key: string | Buffer, value: string, encoding?: "hex") {
    return createHmac("sha256", key).update(value, "utf8").digest(encoding as never) as string | Buffer;
  }

  private mapTencentOcrInvoiceFields(responseBody: Record<string, unknown>) {
    const fields = this.collectTencentOcrFields(responseBody);
    const totalAmount = this.firstTencentOcrNumber(fields, ["Total", "TotalAmount", "Amount", "Fare", "Price", "SubTotal", "Money"]);
    const taxAmount = this.firstTencentOcrNumber(fields, ["Tax", "TaxAmount", "TotalTax"]);
    const amount = this.firstTencentOcrNumber(fields, ["PretaxAmount", "AmountWithoutTax"]) || Math.max(totalAmount - taxAmount, 0) || totalAmount;

    return {
      invoiceType: this.firstTencentOcrString(fields, ["TypeDescription", "SubTypeDescription", "InvoiceType", "Title", "Kind"]) || "腾讯云 OCR 票据",
      invoiceNo: this.firstTencentOcrString(fields, ["Number", "InvoiceNo", "InvoiceNum", "Code", "TicketNumber", "SerialNo"]) || "待人工核对",
      issuedAt: this.normalizeOcrDate(this.firstTencentOcrString(fields, ["Date", "IssueDate", "InvoiceDate", "StartDate", "Time"])),
      merchantName: this.firstTencentOcrString(fields, ["Seller", "SellerName", "MerchantName", "Payee", "ShopName", "CompanyName"]) || "待人工核对",
      buyerName: this.firstTencentOcrString(fields, ["Buyer", "BuyerName", "PurchaserName"]) || "",
      category: this.firstTencentOcrString(fields, ["ServiceName", "ItemName", "GoodsName", "Name", "Category", "TypeDescription"]) || "票据费用",
      amount,
      taxAmount,
      totalAmount: totalAmount || amount + taxAmount,
      currency: "CNY",
      confidence: 0.92,
    };
  }

  private collectTencentOcrFields(value: unknown, result: Array<{ key: string; value: unknown }> = []) {
    if (!value || typeof value !== "object") return result;
    if (Array.isArray(value)) {
      value.forEach((item) => this.collectTencentOcrFields(item, result));
      return result;
    }
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      if (item && typeof item === "object") {
        this.collectTencentOcrFields(item, result);
      } else if (typeof item === "string" || typeof item === "number") {
        result.push({ key, value: item });
      }
    });
    return result;
  }

  private firstTencentOcrString(fields: Array<{ key: string; value: unknown }>, keys: string[]) {
    for (const key of keys) {
      const found = fields.find((item) => item.key.toLowerCase() === key.toLowerCase() && this.normalizeOptionalText(item.value));
      if (found) return this.normalizeOptionalText(found.value) ?? "";
    }
    return "";
  }

  private firstTencentOcrNumber(fields: Array<{ key: string; value: unknown }>, keys: string[]) {
    for (const key of keys) {
      const found = fields.find((item) => item.key.toLowerCase() === key.toLowerCase() && this.parseOcrNumber(item.value) !== 0);
      if (found) return this.parseOcrNumber(found.value);
    }
    return 0;
  }

  private parseOcrNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const text = this.normalizeOptionalText(value)?.replace(/,/g, "") ?? "";
    const match = text.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  private normalizeOcrDate(value: string) {
    const numeric = value.match(/(\d{4})[年./-](\d{1,2})[月./-](\d{1,2})/);
    if (numeric) {
      return `${numeric[1]}-${numeric[2].padStart(2, "0")}-${numeric[3].padStart(2, "0")}`;
    }
    const compact = value.match(/(\d{4})(\d{2})(\d{2})/);
    if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
    return value.slice(0, 20);
  }

  private buildTencentOcrRawText(responseBody: Record<string, unknown>) {
    const fields = this.collectTencentOcrFields(responseBody);
    const detections = fields
      .filter((item) => item.key === "DetectedText" || item.key === "ItemString")
      .map((item) => this.normalizeOptionalText(item.value))
      .filter(Boolean);
    if (detections.length) return detections.join("\n");

    return fields
      .slice(0, 80)
      .map((item) => `${item.key}: ${this.normalizeOptionalText(item.value) ?? ""}`)
      .filter((line) => line.length > 2)
      .join("\n");
  }

  createWecomExpenseApproval(body: Record<string, unknown>, user: AuthenticatedUser) {
    const claim = this.isRecordObject(body.claim) ? body.claim : {};
    const ocrTaskIds = this.normalizeStringList(claim.ocrTaskIds);
    const ocrTaskText = ocrTaskIds.join("、");
    const ocrSummary =
      this.normalizeOptionalText(claim.ocrSummary) ??
      (ocrTaskIds.length ? `OCR任务：${ocrTaskText}` : "当前报销单没有 OCR 任务。");
    const createdAt = new Date().toISOString();
    const approvalInstanceId = this.createRecordId("wecom-expense-dryrun");
    const requestPayload = {
      template_id: this.normalizeOptionalText(process.env.WECOM_EXPENSE_TEMPLATE_ID) ?? "employee-launch-expense-dry-run",
      creator_userid: this.normalizeOptionalText(body.creatorUserId) ?? (user.loginAccount ?? user.name),
      approver_userids: this.normalizeStringList(body.approverUserIds),
      cc_userids: this.normalizeStringList(body.ccUserIds),
      attachment_count: Number(body.attachmentCount ?? 0),
      detail_url: this.normalizeOptionalText(body.detailUrl),
      claim_id: this.normalizeOptionalText(claim.id) ?? "expense-claim",
      claim_title: this.normalizeOptionalText(claim.title) ?? "员工报销单",
      claim_amount: Number(claim.amount ?? 0),
      claim_ocr_tasks: ocrTaskText,
      claim_ocr_summary: ocrSummary,
      ocr: {
        task_ids: ocrTaskIds,
        summary: ocrSummary,
      },
      apply_data: {
        contents: [
          { id: "claim_title", value: { text: this.normalizeOptionalText(claim.title) ?? "员工报销单" } },
          { id: "claim_applicant", value: { text: this.normalizeOptionalText(claim.applicant) ?? user.name } },
          { id: "claim_department", value: { text: this.normalizeOptionalText(claim.department) ?? "综合办公室" } },
          { id: "claim_category", value: { text: this.normalizeOptionalText(claim.category) ?? "项目物料" } },
          { id: "claim_amount", value: { new_money: Math.round(Number(claim.amount ?? 0) * 100) } },
          { id: "claim_summary", value: { text: this.normalizeOptionalText(claim.summary) ?? "" } },
          { id: "claim_ocr_tasks", value: { text: ocrTaskText } },
          { id: "claim_ocr_summary", value: { text: ocrSummary } },
        ],
      },
    };

    return {
      ok: true,
      mode: "dry_run",
      actionId: approvalInstanceId,
      message: "企业微信报销审批 dry-run 载荷已生成。",
      warnings: ["当前为员工上线受控验收载荷，真实企微审批 instance 仍需 live integration 证据。"],
      requestPayload,
      response: {
        approvalInstanceId,
        claim_ocr_tasks: ocrTaskIds,
        claim_ocr_summary: ocrSummary,
      },
      createdAt,
    };
  }

  getWecomStatus(_user: AuthenticatedUser) {
    const corpIdConfigured = Boolean(this.normalizeOptionalText(process.env.WECOM_CORP_ID));
    const agentId = this.normalizeOptionalText(process.env.WECOM_AGENT_ID) ?? this.normalizeOptionalText(process.env.WECOM_MANAGEMENT_AGENT_ID);
    const secretConfigured = Boolean(
      this.normalizeOptionalText(process.env.WECOM_AGENT_SECRET) ??
      this.normalizeOptionalText(process.env.WECOM_SECRET) ??
      this.normalizeOptionalText(process.env.WECOM_MANAGEMENT_SECRET),
    );
    const approvalTemplateConfigured = this.getFinanceApprovalTemplates().length > 0;
    const dryRunForced = this.isWecomDryRunForced();
    const liveReady = corpIdConfigured && Boolean(agentId) && secretConfigured && !dryRunForced;
    const missingConfig = [
      ["WECOM_CORP_ID", corpIdConfigured],
      ["WECOM_AGENT_ID", Boolean(agentId)],
      ["WECOM_AGENT_SECRET", secretConfigured],
      ["WECOM_DRY_RUN=false", !dryRunForced],
      ["WECOM_REIMBURSEMENT_TEMPLATE_ID", approvalTemplateConfigured],
    ]
      .filter(([, configured]) => !configured)
      .map(([name]) => name);
    const mode = liveReady ? "live" : "dry_run";

    return {
      mode,
      agentId,
      corpIdConfigured,
      secretConfigured,
      approvalTemplateConfigured,
      liveReady,
      missingConfig,
      lastCheckedAt: new Date().toISOString(),
      capabilities: [
        {
          id: "message",
          name: "企业微信通知",
          category: "通知",
          status: liveReady ? "ready" : "dry_run",
          description: liveReady ? "可由后端代理调用企业微信消息接口。" : "配置未完整时仅生成联调载荷，不发送真实消息。",
          requirements: ["WECOM_CORP_ID", "WECOM_AGENT_ID", "WECOM_AGENT_SECRET"],
          routes: ["/wecom/messages"],
        },
        {
          id: "reminder",
          name: "企业微信提醒",
          category: "提醒",
          status: liveReady ? "ready" : "dry_run",
          description: liveReady ? "可创建员工提醒消息。" : "配置未完整时保留为联调预览。",
          requirements: ["WECOM_CORP_ID", "WECOM_AGENT_ID", "WECOM_AGENT_SECRET"],
          routes: ["/wecom/reminders"],
        },
        {
          id: "schedule",
          name: "企业微信日程",
          category: "日程",
          status: liveReady ? "ready" : "dry_run",
          description: liveReady ? "可同步课程与排班日程。" : "配置未完整时仅生成日程请求摘要。",
          requirements: ["WECOM_CORP_ID", "WECOM_AGENT_ID", "WECOM_AGENT_SECRET"],
          routes: ["/wecom/schedules"],
        },
        {
          id: "expense_approval",
          name: "企业微信报销审批",
          category: "审批",
          status: liveReady && approvalTemplateConfigured ? "ready" : "dry_run",
          description: liveReady && approvalTemplateConfigured
            ? "可读取企业微信报销、付款、借款审批并回填财务待处理单。"
            : "模板 ID 或审批 API 授权未完整时，只保留本地报销记录。",
          requirements: ["WECOM_CORP_ID", "WECOM_AGENT_ID", "WECOM_AGENT_SECRET", "WECOM_REIMBURSEMENT_TEMPLATE_ID"],
          routes: ["/wecom/finance-approval-sync", "/wecom/expense-approvals"],
        },
      ],
    };
  }

  async sendWecomMessage(
    body: Record<string, unknown>,
    user: AuthenticatedUser,
    origin?: string,
  ): Promise<WecomActionResult> {
    const actionId = "send_message";
    const createdAt = new Date().toISOString();
    const title = this.normalizeOptionalText(body.title) ?? "系统通知";
    const content = this.normalizeOptionalText(body.content);
    const touser = this.normalizeWecomTouser(body.touser);
    const url = this.resolveWecomActionUrl(body.url, origin);
    if (!content) {
      throw new BadRequestException("企业微信通知内容不能为空。");
    }

    const requestPayload = {
      touser,
      title,
      content,
      url,
      requestedBy: user.loginAccount ?? user.name,
      createdAt,
    };
    const dryRun = this.createWecomDryRunResult(
      actionId,
      requestPayload,
      "企业微信正式发送未启用，当前已生成通知预览。",
    );
    if (dryRun) return dryRun;

    try {
      const response = url
        ? await this.wecomMessageService.sendTextCardMessage(touser, {
            title,
            description: this.formatWecomCardDescription(content),
            url,
            buttonText: "前往查看",
          })
        : await this.wecomMessageService.sendTextMessage(
            touser,
            this.formatWecomTextMessage(title, content),
          );

      return {
        ok: true,
        mode: "live",
        actionId,
        message: "企业微信通知已发送。",
        warnings: [],
        requestPayload,
        response,
        createdAt,
      };
    } catch (error) {
      return this.createWecomFailureResult(
        actionId,
        requestPayload,
        error,
        "企业微信通知发送失败，系统已保留失败回执。",
      );
    }
  }

  async sendWecomReminder(
    body: Record<string, unknown>,
    user: AuthenticatedUser,
    origin?: string,
  ): Promise<WecomActionResult> {
    const actionId = "send_reminder";
    const createdAt = new Date().toISOString();
    const title = this.normalizeOptionalText(body.title) ?? "系统提醒";
    const content = this.normalizeOptionalText(body.content);
    const dueAt = this.normalizeOptionalText(body.dueAt) ?? new Date().toISOString();
    const touser = this.normalizeWecomTouser(body.touser);
    const url = this.resolveWecomActionUrl(body.url, origin);
    if (!content) {
      throw new BadRequestException("企业微信提醒内容不能为空。");
    }

    const description = `${content}\n\n截止时间：${dueAt}`;
    const requestPayload = {
      touser,
      title,
      content,
      dueAt,
      url,
      requestedBy: user.loginAccount ?? user.name,
      createdAt,
    };
    const dryRun = this.createWecomDryRunResult(
      actionId,
      requestPayload,
      "企业微信正式发送未启用，当前已生成提醒预览。",
    );
    if (dryRun) return dryRun;

    try {
      const response = url
        ? await this.wecomMessageService.sendTextCardMessage(touser, {
            title,
            description: this.formatWecomCardDescription(description),
            url,
            buttonText: "前往查看",
          })
        : await this.wecomMessageService.sendTextMessage(
            touser,
            this.formatWecomTextMessage(title, description),
          );

      return {
        ok: true,
        mode: "live",
        actionId,
        message: "企业微信提醒已发送。",
        warnings: [],
        requestPayload,
        response,
        createdAt,
      };
    } catch (error) {
      return this.createWecomFailureResult(
        actionId,
        requestPayload,
        error,
        "企业微信提醒发送失败，系统已保留失败回执。",
      );
    }
  }

  async syncWecomFinanceApprovals(body: Record<string, unknown>, user: AuthenticatedUser, origin?: string) {
    const startedAt = new Date().toISOString();
    const kinds = this.normalizeWecomFinanceApprovalKinds(body.kinds);
    const templates = this.getFinanceApprovalTemplates(kinds);
    const configuredKinds = new Set(templates.map((item) => item.kind));
    const warnings = kinds
      .filter((kind) => !configuredKinds.has(kind))
      .map((kind) => `缺少 ${kind} 审批模板 ID。`);
    const { startTime, endTime } = this.resolveWecomApprovalSyncWindow(body);
    const limit = Math.min(100, Math.max(1, Math.round(Number(body.limit ?? 30) || 30)));

    if (!templates.length) {
      return {
        ok: false,
        mode: "dry_run",
        actionId: "sync_wecom_finance_approvals",
        message: "企业微信财务审批同步未执行，报销/付款/借款模板 ID 尚未配置。",
        warnings,
        startedAt,
        finishedAt: new Date().toISOString(),
        templates,
        approvals: [],
        importStats: this.emptyWecomImportStats(0),
      };
    }

    const approvals: WecomFinanceApprovalRecord[] = [];
    const responseSummary: Array<{
      kind: WecomFinanceApprovalKind;
      templateId: string;
      count: number;
      nextCursor?: number;
    }> = [];

    for (const template of templates) {
      if (approvals.length >= limit) break;

      const listResponse = await this.wecomService.post<WecomApprovalListResponse>(
        "/cgi-bin/oa/getapprovalinfo",
        {
          starttime: startTime,
          endtime: endTime,
          cursor: 0,
          size: Math.min(100, Math.max(1, limit - approvals.length)),
          filters: [{ key: "template_id", value: template.templateId }],
        },
        undefined,
        origin,
      );
      const spNoList = (listResponse.sp_no_list ?? [])
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      responseSummary.push({
        kind: template.kind,
        templateId: template.templateId,
        count: spNoList.length,
        nextCursor: listResponse.next_cursor,
      });

      for (const spNo of spNoList) {
        if (approvals.length >= limit) break;

        const detailResponse = await this.wecomService.post<WecomApprovalDetailResponse>(
          "/cgi-bin/oa/getapprovaldetail",
          { sp_no: spNo },
          undefined,
          origin,
        );
        const normalized = this.normalizeWecomApprovalDetail(
          this.isRecordObject(detailResponse.info) ? detailResponse.info : {},
          template,
        );
        if (normalized) approvals.push(normalized);
      }
    }

    const syncResult = {
      ok: true,
      mode: "live",
      actionId: "sync_wecom_finance_approvals",
      message: `已读取 ${approvals.length} 张企业微信财务审批。`,
      warnings,
      startedAt,
      finishedAt: new Date().toISOString(),
      templates,
      approvals,
      response: {
        startTime,
        endTime,
        limit,
        summary: responseSummary,
      },
    };

    if (body.previewOnly === true || approvals.length === 0) {
      return {
        ...syncResult,
        importStats: this.emptyWecomImportStats(approvals.length),
        financeRecord: this.buildFinanceWorkspace(user),
      };
    }

    const state = this.buildFinanceWorkspace(user);
    if (!Array.isArray(state.expenseClaims)) state.expenseClaims = [];
    const importStats = this.upsertWecomFinanceApprovals(state, approvals);
    const financeRecord = this.commitContractState("finance", state, user, "/api/finance/workspace");

    return {
      ...syncResult,
      importStats,
      financeRecord,
    };
  }

  async resetWeeklyWorkspaceDbBridge(userKey: string, user: AuthenticatedUser) {
    const normalizedUserKey = this.normalizeUserKey(userKey);
    const record = this.commitWeeklyRecord(
      normalizedUserKey,
      this.createInitialWeeklyWorkspaceRecord(normalizedUserKey, user),
      user,
    );
    await this.upsertWeeklyPayloadFromRecord(normalizedUserKey, normalizedUserKey, user, record);
    return record;
  }

  getWeeklyWorkspace(userKey: string, user: AuthenticatedUser) {
    const normalizedUserKey = this.normalizeUserKey(userKey);
    return this.normalizeWeeklyWorkspaceRecord(
      this.readWeeklyRecord(normalizedUserKey) ??
        this.createInitialWeeklyWorkspaceRecord(normalizedUserKey, user),
      normalizedUserKey,
      user,
    );
  }

  async getWeeklyWorkspaceDbFirst(userKey: string, user: AuthenticatedUser) {
    const normalizedUserKey = this.normalizeUserKey(userKey);
    if (this.isEmployeeDataDbBridgeDisabled()) {
      return this.getWeeklyWorkspace(normalizedUserKey, user);
    }

    try {
      const payload = await this.readWeeklyPayloadFromDb(normalizedUserKey);
      if (payload) {
        return this.normalizeWeeklyWorkspaceRecord(payload.payloadJson, normalizedUserKey, user);
      }
    } catch {
      return this.getWeeklyWorkspace(normalizedUserKey, user);
    }

    return this.getWeeklyWorkspace(normalizedUserKey, user);
  }

  async updateWeeklyWorkspaceDbBridge(
    userKey: string,
    body: Record<string, unknown>,
    user: AuthenticatedUser,
  ) {
    const normalizedUserKey = this.normalizeUserKey(userKey);
    const record = this.commitWeeklyRecord(
      normalizedUserKey,
      this.normalizeWeeklyWorkspaceRecord(body, normalizedUserKey, user),
      user,
    );
    await this.upsertWeeklyPayloadFromRecord(normalizedUserKey, normalizedUserKey, user, record);
    return record;
  }

  async saveWeeklyDraft(body: Record<string, unknown>, user: AuthenticatedUser) {
    const context = this.buildWeeklyMutationContext(
      "POST /api/work-reports/weekly/current/draft",
      body.userKey,
      user,
    );
    const record = await this.getWeeklyWorkspaceDbFirst(context.storageUserKey, user);
    const draft = this.isRecordObject(body.draft)
      ? (body.draft as WeeklyReportDraft)
      : record.reportDraft;
    const now = new Date();

    const nextRecord = this.commitWeeklyRecord(
      context.storageUserKey,
      {
        ...record,
        reportState: "draft",
        draftDirty: false,
        reportDraft: draft,
        lastSavedAt: this.formatWorkspaceTimestamp(now),
        workspaceNote: "草稿已保存，当前填写内容和计划挂钩关系已保留。",
        savedAt: now.toISOString(),
      },
      user,
    );

    await this.upsertWeeklyPayloadFromRecord(context.storageUserKey, context.canonicalUserKey, user, nextRecord);
    await this.persistWeeklyMutationOrThrow(context, user, nextRecord, WeeklyReportStatus.DRAFT);
    return nextRecord;
  }

  async submitWeeklyReport(body: Record<string, unknown>, user: AuthenticatedUser) {
    const context = this.buildWeeklyMutationContext(
      "POST /api/work-reports/weekly/current/submit",
      body.userKey,
      user,
    );
    const record = await this.getWeeklyWorkspaceDbFirst(context.storageUserKey, user);
    const draft = this.isRecordObject(body.draft)
      ? (body.draft as WeeklyReportDraft)
      : record.reportDraft;
    const now = new Date();

    const nextRecord = this.commitWeeklyRecord(
      context.storageUserKey,
      {
        ...record,
        reportState: "submitted",
        draftDirty: false,
        reportDraft: draft,
        lastSavedAt: this.formatWorkspaceTimestamp(now),
        workspaceNote: "本周周报已提交给主管，团队视角与月目标承接区都会同步刷新。",
        savedAt: now.toISOString(),
      },
      user,
    );

    await this.upsertWeeklyPayloadFromRecord(context.storageUserKey, context.canonicalUserKey, user, nextRecord);
    await this.persistWeeklyMutationOrThrow(context, user, nextRecord, WeeklyReportStatus.SUBMITTED);
    return nextRecord;
  }

  async remindWeeklyMember(body: Record<string, unknown>, user: AuthenticatedUser) {
    const context = this.buildWeeklyMutationContext(
      "POST /api/work-reports/weekly/team/remind",
      body.userKey,
      user,
    );
    const memberName = this.normalizeOptionalText(body.memberName);
    if (!memberName) {
      throw new BadRequestException("周报催办缺少成员姓名。");
    }

    const record = await this.getWeeklyWorkspaceDbFirst(context.storageUserKey, user);
    if (!record.teamReports.some((item) => item.name === memberName)) {
      throw new BadRequestException("找不到要催办的团队成员。");
    }

    const now = new Date();
    const teamReports = record.teamReports.map((item) => {
      if (item.name !== memberName) return item;
      return {
        ...item,
        reminderHistory: [
          this.createWeeklyActivityLogEntry(
            "主管发起催办",
            `已提醒 ${memberName} 优先补齐当前周报缺口，并在截止前回提。`,
            { tone: "earth" },
          ),
          ...item.reminderHistory,
        ],
      };
    });

    const nextRecord = this.commitWeeklyRecord(
      context.storageUserKey,
      {
        ...record,
        teamReports,
        workspaceNote: `已对 ${memberName} 发起催办，当前处理留痕已经同步进团队日志。`,
        savedAt: now.toISOString(),
      },
      user,
    );

    await this.upsertWeeklyPayloadFromRecord(context.storageUserKey, context.canonicalUserKey, user, nextRecord);
    await this.logWeeklyMutationAudit({
      context,
      user,
      reportId: null,
      status: 200,
      action: "REMIND",
      content: `legacy weekly remind: ${memberName}`,
    });
    return nextRecord;
  }

  async batchReviewWeeklyReports(
    body: Record<string, unknown>,
    user: AuthenticatedUser,
  ) {
    const context = this.buildWeeklyMutationContext(
      "POST /api/work-reports/weekly/team/batch-review",
      body.userKey,
      user,
    );
    const kind = this.resolveWeeklyBatchActionKind(body.kind);
    const memberNames = this.normalizeStringList(body.memberNames);
    const note = this.normalizeOptionalText(body.note);

    if (!kind) {
      throw new BadRequestException("未知周报批量动作。");
    }
    if (!memberNames.length) {
      throw new BadRequestException("周报批量动作缺少成员名单。");
    }

    const record = await this.getWeeklyWorkspaceDbFirst(context.storageUserKey, user);
    const actionableNames = memberNames.filter((name) =>
      record.teamReports.some((item) => item.name === name && item.status !== "待提交"),
    );
    const namesToApply = kind === "save_draft" ? memberNames : actionableNames;
    const previousMembers = record.teamReports
      .filter((item) => namesToApply.includes(item.name))
      .map((item) => this.clone(item));
    const actionNote =
      note ||
      (kind === "return"
        ? "主管要求补负责人、时间和下周动作后再回提。"
        : "主管已确认这批周报可继续推进。");
    const now = new Date();

    const teamReports = record.teamReports.map((item) => {
      if (!namesToApply.includes(item.name)) return item;

      const reviewEntryTitle =
        kind === "approve"
          ? "主管批量通过点评"
          : kind === "return"
            ? "主管批量退回修改"
            : "保存批量点评草稿";

      return {
        ...item,
        status: kind === "return" ? "有阻塞" : item.status,
        review:
          kind === "approve"
            ? "已点评"
            : kind === "return"
              ? "已退回修改"
              : item.review,
        blocker: kind === "return" ? "主管批量要求补充" : item.blocker,
        managerDraft: actionNote,
        lastComment: actionNote,
        updatedAt: this.formatWorkspaceTimestamp(now),
        reviewHistory: [
          this.createWeeklyActivityLogEntry(reviewEntryTitle, actionNote, {
            tone: kind === "approve" ? "forest" : kind === "return" ? "earth" : "neutral",
          }),
          ...item.reviewHistory,
        ],
      };
    });
    const resultingMembers = teamReports
      .filter((item) => namesToApply.includes(item.name))
      .map((item) => this.clone(item));
    const action: WeeklyBatchActionRecord = {
      id: this.createRecordId("weekly-batch"),
      kind,
      title:
        kind === "approve"
          ? "主管批量通过点评"
          : kind === "return"
            ? "主管批量退回修改"
            : "保存批量点评草稿",
      description: `已处理 ${namesToApply.join("、") || "0 位成员"}。`,
      time: this.formatWorkspaceTimestamp(now),
      timestamp: now.getTime(),
      tone: kind === "approve" ? "forest" : kind === "return" ? "earth" : "neutral",
      memberNames: namesToApply,
      drilldownScopeLabel: null,
      drilldownScopeMemberNames: [],
      previousMembers,
      resultingMembers,
    };

    const nextRecord = this.commitWeeklyRecord(
      context.storageUserKey,
      {
        ...record,
        teamReports,
        batchReviewDraft: actionNote,
        batchActionHistory: [action, ...record.batchActionHistory].slice(0, 8),
        workspaceNote: action.description,
        savedAt: now.toISOString(),
      },
      user,
    );

    await this.upsertWeeklyPayloadFromRecord(context.storageUserKey, context.canonicalUserKey, user, nextRecord);
    await this.applyLegacyBatchReviewToWeeklyReports(context, user, kind, namesToApply, actionNote);
    return nextRecord;
  }

  async runWeeklyReminderSchedule(
    body: Record<string, unknown>,
    origin?: string,
  ) {
    const systemUser = this.buildWeeklySystemUser();
    const userKey = this.getWeeklyUserKey(body.userKey);
    const now = this.normalizeWeeklyReminderNow(body.now);
    const requestedMode = this.resolveRequestedWeeklyReminderMode(body.mode);
    const mode = this.resolveWeeklyReminderMode(requestedMode, now);
    const dueAt = this.normalizeOptionalText(body.dueAt) || this.buildDefaultWeeklyReminderDueAt(now);
    const url = this.resolveWeeklyReminderUrl(body.url, origin);
    const record = await this.getWeeklyWorkspaceDbFirst(userKey, systemUser);
    const targetCandidates = mode === "weekly_due"
      ? record.teamReports
      : record.teamReports.filter((item) => this.weeklyTeamReportNeedsDailyMissingReminder(item));
    const missingCount = record.teamReports.filter((item) => this.weeklyTeamReportNeedsDailyMissingReminder(item)).length;
    const recipientMap = {
      ...this.normalizeWeeklyRecipientMap(process.env.WEEKLY_REPORT_WECOM_USERID_MAP),
      ...this.normalizeWeeklyRecipientMap(body.recipientMap),
    };
    const scheduledAt = now.toISOString();
    const createdAt = new Date().toISOString();
    const warnings: string[] = [];
    const memberResults: WeeklyReminderMemberResult[] = [];
    const reminderEntriesByName = new Map<string, WeeklyActivityLogEntry>();

    for (const member of targetCandidates) {
      if (this.hasScheduledWeeklyReminderToday(member, mode, now)) {
        memberResults.push({
          name: member.name,
          department: member.department,
          status: member.status,
          review: member.review,
          recipientUserid: null,
          recipientSource: null,
          skipped: true,
          ok: true,
          mode: "skipped",
          message: "今天已发送过同类周报提醒，本次跳过。",
          warnings: [],
        });
        continue;
      }

      const recipient = this.resolveWeeklyReminderRecipient(member, recipientMap);
      const reminderText = this.buildWeeklyReminderText(member, mode);
      if (!recipient) {
        const message = `企微未发送：未找到 ${member.name} 的可用 userid。`;
        memberResults.push({
          name: member.name,
          department: member.department,
          status: member.status,
          review: member.review,
          recipientUserid: null,
          recipientSource: null,
          skipped: false,
          ok: false,
          mode: "failed",
          message,
          warnings: [message],
        });
        reminderEntriesByName.set(member.name, this.createWeeklyActivityLogEntry(
          this.weeklyReminderLogTitle(mode),
          `${reminderText} ${message}`,
          { tone: "earth", timestamp: now.getTime() },
        ));
        continue;
      }

      let actionResult: WecomActionResult | null = null;
      try {
        actionResult = await this.sendWecomReminder(
          {
            touser: recipient.userid,
            title: mode === "weekly_due" ? "本周周报提交提醒" : "本周周报未提交提醒",
            content: this.buildWeeklyReminderContent(member, mode),
            dueAt,
            url,
          },
          systemUser,
          origin,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "企业微信周报提醒发送失败。";
        warnings.push(message);
      }

      const actionMessage = actionResult
        ? `${recipient.source} ${recipient.userid} · ${this.summarizeWecomActionResult(actionResult)}`
        : `企业微信动作未返回：${recipient.source} ${recipient.userid}`;
      const okFlag = Boolean(actionResult && actionResult.ok !== false);
      memberResults.push({
        name: member.name,
        department: member.department,
        status: member.status,
        review: member.review,
        recipientUserid: recipient.userid,
        recipientSource: recipient.source,
        skipped: false,
        ok: okFlag,
        mode: actionResult?.mode ?? "failed",
        message: actionMessage,
        warnings: actionResult?.warnings ?? [],
      });
      reminderEntriesByName.set(member.name, this.createWeeklyActivityLogEntry(
        this.weeklyReminderLogTitle(mode),
        `${reminderText} ${actionMessage}`,
        { tone: this.resolveWecomActionTone(actionResult), timestamp: now.getTime() },
      ));
    }

    const nextRecord = this.commitWeeklyRecord(
      userKey,
      {
        ...record,
        teamReports: record.teamReports.map((member) => {
          const reminderEntry = reminderEntriesByName.get(member.name);
          return reminderEntry
            ? {
                ...member,
                reminderHistory: [reminderEntry, ...this.getWeeklyReminderHistory(member)],
              }
            : member;
        }),
        workspaceNote: mode === "weekly_due"
          ? `周五 10:00 周报提醒已处理 ${targetCandidates.length} 人。`
          : `未提交周报每日提醒已处理 ${targetCandidates.length} 人。`,
      },
      systemUser,
    );
    await this.upsertWeeklyPayloadFromRecord(userKey, userKey, systemUser, nextRecord);

    const sentCount = memberResults.filter((item) => !item.skipped && item.ok).length;
    const dryRunCount = memberResults.filter((item) => item.mode === "dry_run").length;
    const skippedCount = memberResults.filter((item) => item.skipped).length;
    const failedCount = memberResults.filter((item) => !item.skipped && !item.ok).length;
    const cadenceLabel = this.weeklyReminderModeLabel(mode);
    const message = mode === "weekly_due"
      ? `周五 10:00 周报提醒已发送 ${sentCount} 人，跳过 ${skippedCount} 人，失败 ${failedCount} 人。`
      : `未提交周报每日提醒已发送 ${sentCount} 人，跳过 ${skippedCount} 人，失败 ${failedCount} 人。`;
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    return {
      ok: failedCount === 0,
      userKey,
      mode,
      requestedMode,
      cadenceLabel,
      scheduledAt,
      dueAt,
      targetCount: targetCandidates.length,
      sentCount,
      dryRunCount,
      failedCount,
      skippedCount,
      missingCount,
      message,
      memberResults,
      platformMessageId: `platform-message-weekly-reminder-${suffix}`,
      platformAuditId: `platform-audit-weekly-reminder-${suffix}`,
      warnings,
      createdAt,
      savedAt: nextRecord.savedAt,
    };
  }

  async runWeeklySummarySchedule(
    body: Record<string, unknown>,
    origin?: string,
  ) {
    const systemUser = this.buildWeeklySystemUser();
    const userKey = this.getWeeklyUserKey(body.userKey);
    const now = this.normalizeWeeklyReminderNow(body.now);
    const runMode = this.resolveWeeklySummaryRunMode(body.mode);
    const scheduledAt = now.toISOString();
    const createdAt = new Date().toISOString();
    const periodLabel = this.normalizeOptionalText(body.periodLabel) ?? `截至 ${this.buildWeeklySummaryPeriodLabel(now)}`;
    const url = this.resolveWeeklySummaryUrl(body.url, origin);
    const record = await this.getWeeklyWorkspaceDbFirst(userKey, systemUser);
    const groups = this.buildWeeklySummaryGroups(record, this.normalizeWeeklySummaryGroupIds(body.groupIds), periodLabel);
    const notificationDryRun = body.notificationDryRun === true || body.wecomDryRun === true;
    const recipientMap = {
      ...this.normalizeWeeklyRecipientMap(process.env.WEEKLY_REPORT_WECOM_USERID_MAP),
      ...this.normalizeWeeklyRecipientMap(body.recipientMap),
    };
    const warnings: string[] = [];
    const summaryVersions: WeeklySummaryVersion[] = [];

    for (const group of groups) {
      const version = await this.generateWeeklySummaryVersion(group, {
        dryRun: body.openaiDryRun === true || body.dryRun === true,
        strictOpenai: body.strictOpenai === true,
        now,
        createdBy: "weekly-summary-schedule",
      });
      summaryVersions.push(version);
      warnings.push(...version.warnings);
    }

    const notificationResults: WeeklySummaryNotificationResult[] = [];
    for (const version of summaryVersions) {
      const recipientUserids = Array.from(new Set(
        version.audienceNames
          .map((name) => this.resolveWeeklySummaryRecipient(name, recipientMap)?.userid ?? "")
          .filter((userid) => this.isUsableWecomUserid(userid)),
      ));
      const missingRecipientNames = version.audienceNames.filter((name) =>
        !this.resolveWeeklySummaryRecipient(name, recipientMap)
      );

      if (!recipientUserids.length) {
        const message = `企微未发送：${version.groupName} 汇总没有可用接收人 userid。`;
        notificationResults.push({
          groupId: version.groupId,
          groupName: version.groupName,
          audienceNames: version.audienceNames,
          recipientUserids: [],
          touser: null,
          skipped: false,
          ok: false,
          mode: "failed",
          message,
          warnings: [message],
        });
        warnings.push(message);
        continue;
      }

      const touser = recipientUserids.join("|");
      let actionResult: WecomActionResult | null = null;
      if (notificationDryRun) {
        actionResult = {
          ok: true,
          mode: "dry_run",
          actionId: "weekly_summary_notification_dry_run",
          message: "周报汇总通知 dry-run：已解析接收人，未调用企业微信发送。",
          warnings: [],
          requestPayload: {
            touser,
            title: version.title,
            url,
          },
          createdAt: new Date().toISOString(),
        };
      } else {
        try {
          actionResult = await this.sendWecomMessage(
            {
              touser,
              title: version.title,
              content: this.buildWeeklySummaryNoticeContent(version),
              url,
            },
            systemUser,
            origin,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "企业微信周报汇总发送失败。";
          warnings.push(message);
        }
      }

      const missingMessage = missingRecipientNames.length ? ` 未找到 userid：${missingRecipientNames.join("、")}。` : "";
      const okFlag = Boolean(actionResult && actionResult.ok !== false);
      notificationResults.push({
        groupId: version.groupId,
        groupName: version.groupName,
        audienceNames: version.audienceNames,
        recipientUserids,
        touser,
        skipped: false,
        ok: okFlag,
        mode: actionResult?.mode ?? "failed",
        message: actionResult
          ? `${recipientUserids.length} 个接收人 · ${this.summarizeWecomActionResult(actionResult)}${missingMessage}`
          : `企业微信动作未返回：${recipientUserids.length} 个接收人。${missingMessage}`,
        warnings: [...(actionResult?.warnings ?? []), ...missingRecipientNames.map((name) => `未找到 ${name} 的可用 userid。`)],
      });
    }

    const nextRecord = this.commitWeeklyRecord(
      userKey,
      {
        ...record,
        summaryVersions: [...summaryVersions, ...(record.summaryVersions ?? [])].slice(0, 12),
        workspaceNote: `周报汇总已生成 ${summaryVersions.length} 个版本，通知 ${notificationResults.length} 个分组。`,
      },
      systemUser,
    );
    await this.upsertWeeklyPayloadFromRecord(userKey, userKey, systemUser, nextRecord);
    const targetRecipientCount = notificationResults.reduce(
      (sum, item) => sum + (item.recipientUserids.length || item.audienceNames.length),
      0,
    );
    const sentCount = notificationResults.reduce(
      (sum, item) => sum + (!item.skipped && item.ok ? item.recipientUserids.length : 0),
      0,
    );
    const dryRunCount = notificationResults.reduce(
      (sum, item) => sum + (item.mode === "dry_run" ? item.recipientUserids.length : 0),
      0,
    );
    const skippedCount = notificationResults.filter((item) => item.skipped).length;
    const failedCount = notificationResults.reduce(
      (sum, item) => sum + (!item.skipped && !item.ok ? item.recipientUserids.length || item.audienceNames.length : 0),
      0,
    );
    const openAiLiveCount = summaryVersions.filter((item) => item.generationMode === "live").length;
    const fallbackCount = summaryVersions.filter((item) => item.generationMode === "fallback").length;
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const message = `周报汇总已生成 ${summaryVersions.length} 个版本，OpenAI live ${openAiLiveCount} 个，fallback ${fallbackCount} 个，发送 ${sentCount} 人，失败 ${failedCount} 人。`;

    return {
      ok: failedCount === 0 && summaryVersions.length === groups.length,
      userKey,
      runMode,
      scheduledAt,
      periodLabel,
      targetGroupCount: groups.length,
      generatedCount: summaryVersions.length,
      targetRecipientCount,
      sentCount,
      dryRunCount,
      failedCount,
      skippedCount,
      message,
      summaryVersions,
      notificationResults,
      platformMessageId: `platform-message-weekly-summary-${suffix}`,
      platformAuditId: `platform-audit-weekly-summary-${suffix}`,
      warnings,
      createdAt,
      savedAt: nextRecord.savedAt,
    };
  }

  async runWeeklyPersonalSummarySchedule(
    body: Record<string, unknown>,
  ) {
    const systemUser = this.buildWeeklySystemUser();
    const userKey = this.getWeeklyUserKey(body.userKey);
    const now = this.normalizeWeeklyReminderNow(body.now);
    const record = await this.getWeeklyWorkspaceDbFirst(userKey, systemUser);
    const periodType = this.resolveWeeklyPersonalSummaryPeriodType(body.periodType);
    const periodId = this.normalizeWeeklyPersonalSummaryPeriodId(periodType, body.periodId, now);
    const periodLabel = this.normalizeOptionalText(body.periodLabel) ?? this.buildWeeklyPersonalSummaryPeriodLabel(periodType, periodId);
    const memberNames = this.normalizeWeeklyPersonalSummaryMemberNames(body.memberNames ?? body.memberName, record);
    const warnings: string[] = [];
    const personalSummaryVersions: WeeklyPersonalSummaryVersion[] = [];
    const skippedMemberNames: string[] = [];
    const createdAt = new Date().toISOString();

    for (const memberName of memberNames) {
      const input = this.buildWeeklyPersonalSummaryInput(record, memberName, periodType, periodId, periodLabel, now);
      if (!input.sourceItems.length) {
        skippedMemberNames.push(memberName);
        continue;
      }
      const version = await this.generateWeeklyPersonalSummaryVersion(input, {
        dryRun: body.openaiDryRun === true || body.dryRun === true,
        strictOpenai: body.strictOpenai === true,
        now,
        createdBy: "weekly-personal-summary-schedule",
      });
      personalSummaryVersions.push(version);
      warnings.push(...version.warnings);
    }

    const nextRecord = this.commitWeeklyRecord(
      userKey,
      {
        ...record,
        personalSummaryVersions: [
          ...personalSummaryVersions,
          ...(record.personalSummaryVersions ?? []),
        ].slice(0, 80),
        workspaceNote: `个人${periodType === "month" ? "月度" : periodType === "quarter" ? "季度" : "年度"}总结已生成 ${personalSummaryVersions.length} 份。`,
      },
      systemUser,
    );
    await this.upsertWeeklyPayloadFromRecord(userKey, userKey, systemUser, nextRecord);
    const fallbackCount = personalSummaryVersions.filter((item) => item.generationMode === "fallback").length;
    const liveCount = personalSummaryVersions.filter((item) => item.generationMode === "live").length;
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const message = `个人${periodLabel}总结已生成 ${personalSummaryVersions.length} 份，OpenAI live ${liveCount} 份，fallback ${fallbackCount} 份，跳过 ${skippedMemberNames.length} 人。`;

    return {
      ok: personalSummaryVersions.length > 0 && fallbackCount === 0,
      userKey,
      periodType,
      periodId,
      periodLabel,
      targetMemberCount: memberNames.length,
      generatedCount: personalSummaryVersions.length,
      skippedCount: skippedMemberNames.length,
      message,
      personalSummaryVersions,
      skippedMemberNames,
      platformMessageId: `platform-message-weekly-personal-summary-${suffix}`,
      platformAuditId: `platform-audit-weekly-personal-summary-${suffix}`,
      warnings,
      createdAt,
      savedAt: nextRecord.savedAt,
    };
  }

  private resolveWeeklyPersonalSummaryPeriodType(value: unknown): WeeklyPersonalSummaryPeriodType {
    if (value === "quarter" || value === "year") return value;
    return "month";
  }

  private padPeriodMonth(monthIndex: number) {
    return String(monthIndex + 1).padStart(2, "0");
  }

  private buildPreviousMonthPeriodId(now: Date) {
    const month = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${month.getFullYear()}-${this.padPeriodMonth(month.getMonth())}`;
  }

  private buildPreviousQuarterPeriodId(now: Date) {
    const currentQuarterIndex = Math.floor(now.getMonth() / 3);
    const previousQuarterAnchor = new Date(now.getFullYear(), currentQuarterIndex * 3 - 1, 1);
    const quarter = Math.floor(previousQuarterAnchor.getMonth() / 3) + 1;
    return `${previousQuarterAnchor.getFullYear()}-Q${quarter}`;
  }

  private normalizeWeeklyPersonalSummaryPeriodId(
    periodType: WeeklyPersonalSummaryPeriodType,
    value: unknown,
    now: Date,
  ) {
    const text = this.normalizeOptionalText(value);
    if (periodType === "month") {
      if (text && /^\d{4}-\d{2}$/.test(text)) return text;
      return this.buildPreviousMonthPeriodId(now);
    }
    if (periodType === "quarter") {
      if (text && /^\d{4}-Q[1-4]$/.test(text)) return text;
      return this.buildPreviousQuarterPeriodId(now);
    }
    if (text && /^\d{4}$/.test(text)) return text;
    return String(now.getFullYear() - 1);
  }

  private buildWeeklyPersonalSummaryPeriodLabel(
    periodType: WeeklyPersonalSummaryPeriodType,
    periodId: string,
  ) {
    if (periodType === "month") {
      const [year, month] = periodId.split("-");
      return `${year} 年 ${Number(month)} 月`;
    }
    if (periodType === "quarter") {
      const [year, quarter] = periodId.split("-Q");
      return `${year} 年第 ${quarter} 季度`;
    }
    return `${periodId} 年`;
  }

  private normalizeWeeklyPersonalSummaryMemberNames(value: unknown, record: WeeklyWorkspaceRecord) {
    const singleName = this.normalizeOptionalText(value);
    const explicit = Array.isArray(value)
      ? this.normalizeStringList(value)
      : singleName
        ? [singleName]
        : [];
    if (explicit.length) return Array.from(new Set(explicit));

    const submitted = record.teamReports
      .filter((member) => member.status === "已提交")
      .map((member) => member.name);
    const fallback = record.teamReports.map((member) => member.name);
    return Array.from(new Set(submitted.length ? submitted : fallback));
  }

  private normalizeWeeklyPersonalSourceText(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
  }

  private buildWeeklyPersonalSourceFromTeamReport(
    member: TeamWeeklyReportRecord,
    periodLabel: string,
    now: Date,
  ): WeeklyPersonalSummarySource {
    const updatedAt = this.normalizeWeeklyPersonalSourceText(member.updatedAt) || now.toISOString();
    const metricSummary = this.normalizeWeeklyPersonalSourceText((member as { metricSummary?: unknown }).metricSummary);
    return {
      id: `weekly-report-${member.name}-${updatedAt}`.replace(/\s+/g, "-"),
      kind: "weekly_report",
      label: `${periodLabel}周报快照`,
      periodLabel,
      memberName: member.name,
      summary: this.normalizeWeeklyPersonalSourceText(member.summary),
      highlights: Array.isArray(member.highlights) ? member.highlights.filter((item) => typeof item === "string" && item.trim().length > 0) : [],
      nextPlans: Array.isArray(member.nextPlans) ? member.nextPlans.filter((item) => typeof item === "string" && item.trim().length > 0) : [],
      supportRequest: this.normalizeWeeklyPersonalSourceText(member.supportRequest),
      blockers: [member.blockerDetail, member.blocker].map((item) => this.normalizeWeeklyPersonalSourceText(item)).filter((item) => item && item !== "无"),
      metricSummary,
      createdAt: now.toISOString(),
    };
  }

  private buildWeeklyPersonalSourceFromSummary(version: WeeklyPersonalSummaryVersion): WeeklyPersonalSummarySource {
    return {
      id: version.id,
      kind: "personal_summary",
      label: version.title || version.periodLabel,
      periodLabel: version.periodLabel,
      memberName: version.memberName,
      summary: version.summary,
      highlights: version.keyResults,
      nextPlans: [...version.carryForwardItems, ...version.nextPeriodFocus],
      supportRequest: version.blockersAndNeeds.join("\n"),
      blockers: version.blockersAndNeeds,
      metricSummary: version.metricNotes.join("\n"),
      createdAt: version.createdAt,
    };
  }

  private quarterMonthPeriodIds(periodId: string) {
    const match = periodId.match(/^(\d{4})-Q([1-4])$/);
    if (!match) return [];
    const year = Number(match[1]);
    const quarter = Number(match[2]);
    const startMonth = (quarter - 1) * 3;
    return [0, 1, 2].map((offset) => `${year}-${this.padPeriodMonth(startMonth + offset)}`);
  }

  private yearQuarterPeriodIds(periodId: string) {
    return [1, 2, 3, 4].map((quarter) => `${periodId}-Q${quarter}`);
  }

  private buildWeeklyPersonalSummaryInput(
    record: WeeklyWorkspaceRecord,
    memberName: string,
    periodType: WeeklyPersonalSummaryPeriodType,
    periodId: string,
    periodLabel: string,
    now: Date,
  ): WeeklyPersonalSummaryInput {
    const existingSummaries = Array.isArray(record.personalSummaryVersions) ? record.personalSummaryVersions : [];
    let sourceItems: WeeklyPersonalSummarySource[] = [];

    if (periodType === "quarter") {
      const monthIds = new Set(this.quarterMonthPeriodIds(periodId));
      sourceItems = existingSummaries
        .filter((item) => item.memberName === memberName && item.periodType === "month" && monthIds.has(item.periodId))
        .sort((left, right) => left.periodId.localeCompare(right.periodId))
        .map((item) => this.buildWeeklyPersonalSourceFromSummary(item));
    }

    if (periodType === "year") {
      const quarterIds = new Set(this.yearQuarterPeriodIds(periodId));
      sourceItems = existingSummaries
        .filter((item) => item.memberName === memberName && item.periodType === "quarter" && quarterIds.has(item.periodId))
        .sort((left, right) => left.periodId.localeCompare(right.periodId))
        .map((item) => this.buildWeeklyPersonalSourceFromSummary(item));
      if (!sourceItems.length) {
        sourceItems = existingSummaries
          .filter((item) => item.memberName === memberName && item.periodType === "month" && item.periodId.startsWith(`${periodId}-`))
          .sort((left, right) => left.periodId.localeCompare(right.periodId))
          .map((item) => this.buildWeeklyPersonalSourceFromSummary(item));
      }
    }

    if (!sourceItems.length) {
      const weeklyMember = record.teamReports.find((item) => item.name === memberName && item.status === "已提交")
        ?? record.teamReports.find((item) => item.name === memberName);
      if (weeklyMember) {
        sourceItems = [this.buildWeeklyPersonalSourceFromTeamReport(weeklyMember, periodLabel, now)];
      }
    }

    return {
      memberName,
      periodType,
      periodId,
      periodLabel,
      sourceItems,
    };
  }

  private buildWeeklyFallbackPersonalSummary(input: WeeklyPersonalSummaryInput): WeeklyPersonalSummaryModelOutput {
    const sourceItems = input.sourceItems;
    const keyResults = sourceItems.flatMap((source) => [
      source.summary ? `${source.label}：${source.summary}` : "",
      ...source.highlights.map((item) => `${source.label}：${item}`),
    ]);
    const carryForwardItems = sourceItems.flatMap((source) =>
      source.nextPlans.map((item) => `${source.label}：${item}`)
    );
    const blockersAndNeeds = sourceItems.flatMap((source) => [
      ...source.blockers.map((item) => `${source.label}：${item}`),
      source.supportRequest ? `${source.label}：${source.supportRequest}` : "",
    ]);
    const metricNotes = sourceItems
      .map((source) => source.metricSummary ? `${source.label}：${source.metricSummary}` : "")
      .filter(Boolean);

    return {
      headline: `${input.memberName} ${input.periodLabel}个人${input.periodType === "month" ? "月度" : input.periodType === "quarter" ? "季度" : "年度"}总结`,
      summary: sourceItems.length
        ? `${input.periodLabel}共整理 ${sourceItems.length} 条来源记录，重点保留已完成事项、需要延续的动作和协同需求，便于继续整理月度、季度和年度周报。`
        : `${input.periodLabel}暂未找到可用来源记录，先保留为空白草稿，等待个人周报补齐后再生成。`,
      keyResults: this.limitWeeklySummaryList(keyResults, 8, "本周期暂无明确成果，请先补齐个人周报中的本周成果。"),
      carryForwardItems: this.limitWeeklySummaryList(carryForwardItems, 8, "下个周期先补齐未完成事项和负责人。"),
      blockersAndNeeds: this.limitWeeklySummaryList(blockersAndNeeds, 6, "暂无新增阻塞；如有协同需求，请补入个人周报。"),
      nextPeriodFocus: this.limitWeeklySummaryList(carryForwardItems, 6, "围绕本周期未完成动作安排下个周期重点。"),
      metricNotes: this.limitWeeklySummaryList(metricNotes, 6, "暂无可量化指标记录。"),
    };
  }

  private buildOpenAiWeeklyPersonalSummaryPayload(model: string, input: WeeklyPersonalSummaryInput) {
    return {
      model,
      input: [
        {
          role: "system",
          content: [
            "你是公司内部个人周报总结助手。",
            "请把个人周报或上一层总结整理成月度、季度或年度总结，方便本人继续编辑。",
            "只使用输入中的事实，不编造未出现的数字、承诺、客户或结论。",
            "输出要适合直接放回系统草稿：关键成果、延续事项、阻塞协同、下周期重点、指标备注都要清晰。",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "weekly_personal_summary",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: [
              "headline",
              "summary",
              "keyResults",
              "carryForwardItems",
              "blockersAndNeeds",
              "nextPeriodFocus",
              "metricNotes",
            ],
            properties: {
              headline: { type: "string" },
              summary: { type: "string" },
              keyResults: { type: "array", items: { type: "string" } },
              carryForwardItems: { type: "array", items: { type: "string" } },
              blockersAndNeeds: { type: "array", items: { type: "string" } },
              nextPeriodFocus: { type: "array", items: { type: "string" } },
              metricNotes: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
      max_output_tokens: 4000,
    };
  }

  private parseOpenAiWeeklyPersonalSummary(text: string): WeeklyPersonalSummaryModelOutput | null {
    const normalized = text.trim();
    const candidates = [
      normalized,
      normalized.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim(),
    ];
    const firstBrace = normalized.indexOf("{");
    const lastBrace = normalized.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      candidates.push(normalized.slice(firstBrace, lastBrace + 1));
    }

    for (const candidate of Array.from(new Set(candidates)).filter(Boolean)) {
      const parsed = this.parseWeeklyPersonalSummaryJson(candidate);
      if (parsed) return parsed;
    }

    return null;
  }

  private parseWeeklyPersonalSummaryJson(text: string): WeeklyPersonalSummaryModelOutput | null {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const headline = this.normalizeOptionalText(parsed.headline);
      const summary = this.normalizeOptionalText(parsed.summary);
      if (!headline || !summary) return null;
      return {
        headline,
        summary,
        keyResults: this.normalizeStringList(parsed.keyResults),
        carryForwardItems: this.normalizeStringList(parsed.carryForwardItems),
        blockersAndNeeds: this.normalizeStringList(parsed.blockersAndNeeds),
        nextPeriodFocus: this.normalizeStringList(parsed.nextPeriodFocus),
        metricNotes: this.normalizeStringList(parsed.metricNotes),
      };
    } catch {
      return null;
    }
  }

  private buildWeeklyPersonalSummaryVersion(input: {
    personal: WeeklyPersonalSummaryInput;
    output: WeeklyPersonalSummaryModelOutput;
    model: string;
    generationMode: WeeklySummaryGenerationMode;
    warnings: string[];
    now: Date;
    createdBy: string;
  }): WeeklyPersonalSummaryVersion {
    const idSuffix = `${input.now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const nameSeed = input.personal.memberName
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      || "member";
    return {
      id: `weekly-personal-summary-${input.personal.periodType}-${input.personal.periodId}-${nameSeed}-${idSuffix}`,
      memberName: input.personal.memberName,
      title: `${input.personal.memberName} ${input.personal.periodLabel} OpenAI 个人总结`,
      headline: input.output.headline,
      periodType: input.personal.periodType,
      periodId: input.personal.periodId,
      periodLabel: input.personal.periodLabel,
      status: input.personal.sourceItems.length ? "ready" : "draft",
      summary: input.output.summary,
      keyResults: this.limitWeeklySummaryList(input.output.keyResults, 10, "本周期暂无明确成果，请先补齐个人周报中的本周成果。"),
      carryForwardItems: this.limitWeeklySummaryList(input.output.carryForwardItems, 10, "下个周期先补齐未完成事项和负责人。"),
      blockersAndNeeds: this.limitWeeklySummaryList(input.output.blockersAndNeeds, 8, "暂无新增阻塞；如有协同需求，请补入个人周报。"),
      nextPeriodFocus: this.limitWeeklySummaryList(input.output.nextPeriodFocus, 8, "围绕本周期未完成动作安排下个周期重点。"),
      metricNotes: this.limitWeeklySummaryList(input.output.metricNotes, 8, "暂无可量化指标记录。"),
      sourceIds: input.personal.sourceItems.map((item) => item.id),
      sourceLabels: input.personal.sourceItems.map((item) => item.label),
      sourceCount: input.personal.sourceItems.length,
      model: input.model,
      generationMode: input.generationMode,
      promptVersion: "weekly-personal-summary-v1",
      createdAt: input.now.toISOString(),
      createdBy: input.createdBy,
      warnings: input.warnings,
      revisionHistory: [],
    };
  }

  private async generateWeeklyPersonalSummaryVersion(
    personal: WeeklyPersonalSummaryInput,
    options: { dryRun: boolean; strictOpenai: boolean; now: Date; createdBy: string },
  ): Promise<WeeklyPersonalSummaryVersion> {
    const model = this.normalizeOptionalText(process.env.OPENAI_WEEKLY_PERSONAL_SUMMARY_MODEL)
      ?? this.normalizeOptionalText(process.env.OPENAI_WEEKLY_SUMMARY_MODEL)
      ?? "gpt-5-mini";
    const apiKey = this.normalizeOptionalText(process.env.OPENAI_API_KEY);
    const envDryRun = process.env.OPENAI_WEEKLY_PERSONAL_SUMMARY_DRY_RUN === "1"
      || process.env.OPENAI_WEEKLY_PERSONAL_SUMMARY_DRY_RUN === "true"
      || process.env.OPENAI_WEEKLY_SUMMARY_DRY_RUN === "1"
      || process.env.OPENAI_WEEKLY_SUMMARY_DRY_RUN === "true";
    const forceDryRun = options.dryRun || envDryRun;
    if (forceDryRun || !apiKey) {
      if (!apiKey && options.strictOpenai) {
        throw new BadRequestException("OPENAI_API_KEY 未配置，严格模式已停止个人周报长期总结。");
      }
      return this.buildWeeklyPersonalSummaryVersion({
        personal,
        output: this.buildWeeklyFallbackPersonalSummary(personal),
        model,
        generationMode: forceDryRun ? "dry_run" : "fallback",
        warnings: [forceDryRun ? "OpenAI 个人周报长期总结 dry-run：使用确定性摘要预览，未调用 OpenAI。" : "OPENAI_API_KEY 未配置：已使用确定性 fallback 个人总结，未调用 OpenAI。"],
        now: options.now,
        createdBy: options.createdBy,
      });
    }

    try {
      const responsesUrl = this.resolveOpenAiWeeklySummaryResponsesUrl();
      const proxyUrl = this.resolveOpenAiWeeklySummaryProxyUrl(responsesUrl);
      const response = await undiciFetch(responsesUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.buildOpenAiWeeklyPersonalSummaryPayload(model, personal)),
        dispatcher: proxyUrl ? new ProxyAgent(proxyUrl) : undefined,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(`OpenAI 个人周报长期总结失败：HTTP ${response.status} (${responsesUrl})`);
      }
      const output = this.parseOpenAiWeeklyPersonalSummary(this.extractOpenAiOutputText(payload));
      if (!output) {
        throw new Error("OpenAI 个人周报长期总结未返回可解析 JSON。");
      }
      return this.buildWeeklyPersonalSummaryVersion({
        personal,
        output,
        model,
        generationMode: "live",
        warnings: [],
        now: options.now,
        createdBy: options.createdBy,
      });
    } catch (error) {
      if (options.strictOpenai) throw error;
      const message = error instanceof Error ? error.message : "OpenAI 个人周报长期总结调用失败。";
      return this.buildWeeklyPersonalSummaryVersion({
        personal,
        output: this.buildWeeklyFallbackPersonalSummary(personal),
        model,
        generationMode: "fallback",
        warnings: [`${message} 已改用确定性 fallback 个人总结。`],
        now: options.now,
        createdBy: options.createdBy,
      });
    }
  }

  private getFinanceApprovalTemplates(kinds: WecomFinanceApprovalKind[] = ["reimbursement", "payment", "loan"]) {
    const allowedKinds = new Set(kinds);
    const reimbursementTemplateId =
      this.normalizeOptionalText(process.env.WECOM_REIMBURSEMENT_TEMPLATE_ID) ??
      this.normalizeOptionalText(process.env.WECOM_EXPENSE_TEMPLATE_ID) ??
      "";
    const templates: WecomFinanceApprovalTemplate[] = [
      {
        kind: "reimbursement",
        name: "报销",
        templateId: reimbursementTemplateId,
      },
      {
        kind: "payment",
        name: "付款",
        templateId: this.normalizeOptionalText(process.env.WECOM_PAYMENT_TEMPLATE_ID) ?? "",
      },
      {
        kind: "loan",
        name: "借款",
        templateId: this.normalizeOptionalText(process.env.WECOM_LOAN_TEMPLATE_ID) ?? "",
      },
    ];

    return templates.filter((item) => allowedKinds.has(item.kind) && item.templateId.length > 0);
  }

  private normalizeWecomFinanceApprovalKinds(value: unknown): WecomFinanceApprovalKind[] {
    if (!Array.isArray(value)) return ["reimbursement", "payment", "loan"];
    const kinds = value.filter((item): item is WecomFinanceApprovalKind => (
      item === "reimbursement" || item === "payment" || item === "loan"
    ));
    return kinds.length ? Array.from(new Set(kinds)) : ["reimbursement", "payment", "loan"];
  }

  private resolveWecomApprovalSyncWindow(input: Record<string, unknown>) {
    const now = Math.floor(Date.now() / 1000);
    const rawEndAt = this.normalizeOptionalText(input.endAt);
    const rawStartAt = this.normalizeOptionalText(input.startAt);
    const endTime = rawEndAt && Number.isFinite(Date.parse(rawEndAt))
      ? Math.floor(Date.parse(rawEndAt) / 1000)
      : now;
    const days = Math.min(180, Math.max(1, Math.round(Number(input.days ?? 31) || 31)));
    const startTime = rawStartAt && Number.isFinite(Date.parse(rawStartAt))
      ? Math.floor(Date.parse(rawStartAt) / 1000)
      : endTime - days * 24 * 3600;

    return { startTime, endTime };
  }

  private emptyWecomImportStats(skipped: number): WecomFinanceApprovalImportStats {
    return {
      imported: 0,
      updated: 0,
      skipped,
      claimIds: [],
    };
  }

  private upsertWecomFinanceApprovals(
    state: Record<string, any>,
    approvals: WecomFinanceApprovalRecord[],
  ): WecomFinanceApprovalImportStats {
    const syncedAt = new Date().toISOString();
    const stats: WecomFinanceApprovalImportStats = {
      imported: 0,
      updated: 0,
      skipped: 0,
      claimIds: [],
    };
    const expenseClaims = Array.isArray(state.expenseClaims) ? state.expenseClaims as Array<Record<string, any>> : [];
    state.expenseClaims = expenseClaims;

    for (const approval of approvals) {
      if (!approval.spNo) {
        stats.skipped += 1;
        continue;
      }

      const claimId = this.buildWecomImportedClaimId(approval);
      const existing = expenseClaims.find((item) => (
        item.id === claimId ||
        (this.isRecordObject(item.wecomApproval) && item.wecomApproval.approvalInstanceId === approval.spNo)
      ));
      const callbackStatus = this.toWecomApprovalCallbackStatus(approval.status);
      const claimStatus = this.toWecomImportedClaimStatus(approval.status);
      const invoiceCount = Math.max(1, approval.attachmentCount || 1);
      const baseSummary = approval.status === "approved"
        ? `企业微信${approval.templateName}已通过，等待财务确认票据、OCR 和流水后入账。`
        : approval.status === "pending"
          ? `企业微信${approval.templateName}仍在审批中，已先同步到财务待处理。`
          : `企业微信${approval.templateName}状态为${approval.status}，请财务复核是否退回或归档。`;
      const wecomApproval = {
        mode: "live",
        actionId: "sync_wecom_finance_approvals",
        approvalInstanceId: approval.spNo,
        approvalTemplateId: approval.templateId,
        approvalTemplateName: approval.templateName,
        approvalType: approval.kind,
        submittedAt: approval.appliedAt,
        lastSyncedAt: syncedAt,
        callbackReceivedAt: callbackStatus === "pending" ? null : syncedAt,
        callbackStatus,
        message: `${approval.templateName} ${approval.spNo} 已从企业微信审批同步。`,
        warnings: approval.amount > 0 ? [] : ["未能从审批字段自动取得金额，请财务人工确认。"],
      };

      if (existing) {
        existing.title = approval.title || existing.title;
        existing.category = approval.category || existing.category;
        existing.amount = approval.amount || existing.amount;
        existing.submittedAt = approval.appliedAt || existing.submittedAt;
        existing.summary = baseSummary;
        existing.payee = approval.payee || existing.payee;
        existing.invoiceCount = Math.max(Number(existing.invoiceCount ?? 0) || 0, invoiceCount);
        existing.wecomApproval = {
          ...(this.isRecordObject(existing.wecomApproval) ? existing.wecomApproval : wecomApproval),
          ...wecomApproval,
        };
        if (existing.status !== "booked") {
          existing.status = this.isRecordObject(existing.financeReview) && existing.financeReview.status === "confirmed"
            ? "approved"
            : claimStatus;
        }
        stats.updated += 1;
        stats.claimIds.push(String(existing.id ?? claimId));
        continue;
      }

      expenseClaims.unshift({
        id: claimId,
        title: approval.title,
        applicant: approval.applicantUserid || "企业微信员工",
        department: approval.departmentId ? `企微部门 ${approval.departmentId}` : "企业微信",
        category: approval.category,
        amount: approval.amount,
        submittedAt: approval.appliedAt,
        status: claimStatus,
        invoiceCount,
        attachmentIds: [],
        ocrTaskIds: [],
        linkedBankTransactionId: null,
        summary: `${baseSummary} 审批编号：${approval.spNo}。${approval.reason ? `事由：${approval.reason}` : ""}`,
        payee: approval.payee || "待财务确认",
        accountHint: "待财务确认",
        ocrProvider: {
          providerName: "腾讯云 OCR",
          mode: "api",
          taskCount: 0,
          confirmedCount: 0,
          lastCheckedAt: syncedAt,
        },
        wecomApproval,
        financeReview: {
          status: "pending",
          reviewer: "",
          reviewedAt: null,
          note: "来自企业微信审批同步，等待财务确认 OCR、票据、用途和流水。",
        },
      });
      stats.imported += 1;
      stats.claimIds.push(claimId);
    }

    return stats;
  }

  private buildWecomImportedClaimId(approval: WecomFinanceApprovalRecord) {
    return `wecom-${approval.kind}-${approval.spNo}`;
  }

  private toWecomApprovalCallbackStatus(status: WecomFinanceApprovalStatus) {
    if (status === "approved") return "approved";
    if (status === "rejected" || status === "revoked") return "rejected";
    if (status === "unknown") return "unknown";
    return "pending";
  }

  private toWecomImportedClaimStatus(status: WecomFinanceApprovalStatus) {
    return status === "rejected" || status === "revoked" ? "returned" : "pending_review";
  }

  private normalizeWecomApprovalDetail(
    info: Record<string, unknown>,
    template: WecomFinanceApprovalTemplate,
  ): WecomFinanceApprovalRecord | null {
    const spNo = this.normalizeOptionalText(info.sp_no);
    if (!spNo) return null;

    const applyer = this.isRecordObject(info.applyer) ? info.applyer : {};
    const applyData = this.isRecordObject(info.apply_data) ? info.apply_data : {};
    const fields = this.collectWecomApprovalFields(Array.isArray(applyData.contents) ? applyData.contents : []);
    const reason = this.pickWecomApprovalText(fields, ["事由", "reason", "用途", "说明", "备注", "remarks"]);
    const payee = this.pickWecomApprovalText(fields, ["收款人姓名", "payee name", "收款方", "供应商", "supplier"]);
    const category =
      this.pickWecomApprovalText(fields, ["报销类型", "reimbursement type", "类型", "type", "方式", "method"]) ||
      template.name;
    const amount = this.pickWecomApprovalAmount(fields);
    const attachmentCount = fields.reduce((total, field) => total + (field.attachmentCount ?? 0), 0);
    const rawStatus = Number(info.sp_status);

    return {
      kind: template.kind,
      templateId: this.normalizeOptionalText(info.template_id) ?? template.templateId,
      templateName: this.wecomTitleToText(info.sp_name) || template.name,
      spNo,
      status: this.mapWecomApprovalStatus(info.sp_status),
      rawStatus: Number.isFinite(rawStatus) ? rawStatus : null,
      appliedAt: this.toIsoFromUnixSeconds(info.apply_time),
      applicantUserid: this.normalizeOptionalText(applyer.userid),
      departmentId: this.normalizeOptionalText(applyer.partyid),
      title: reason ? `${template.name} · ${reason}` : `${template.name} · ${spNo}`,
      category,
      amount,
      reason: reason || `${template.name} ${spNo}`,
      payee: payee || "待财务确认",
      attachmentCount,
      fields,
    };
  }

  private collectWecomApprovalFields(contents: unknown[]): WecomFinanceApprovalField[] {
    const fields: WecomFinanceApprovalField[] = [];

    for (const item of contents) {
      const controlRecord = this.isRecordObject(item) ? item : null;
      if (!controlRecord) continue;

      const field = this.wecomFieldFromApprovalControl(controlRecord);
      if (field) fields.push(field);

      const value = this.isRecordObject(controlRecord.value) ? controlRecord.value : {};
      const statFields = Array.isArray(value.stat_field) ? value.stat_field : [];
      for (const statField of statFields) {
        const statRecord = this.isRecordObject(statField) ? statField : null;
        if (!statRecord) continue;

        const statAmount = this.parseWecomAmount(statRecord.value);
        fields.push({
          id: this.normalizeOptionalText(statRecord.id) ?? `${this.normalizeOptionalText(controlRecord.id) ?? "field"}-stat`,
          control: this.normalizeOptionalText(statRecord.control) ?? "Stat",
          title: this.wecomTitleToText(statRecord.title) || "汇总字段",
          valueText: this.normalizeOptionalText(statRecord.value) ?? "",
          ...(statAmount !== null ? { amount: statAmount } : {}),
        });
      }

      const children = Array.isArray(value.children) ? value.children : [];
      for (const child of children) {
        const childRecord = this.isRecordObject(child) ? child : {};
        fields.push(...this.collectWecomApprovalFields(Array.isArray(childRecord.list) ? childRecord.list : []));
      }
    }

    return fields;
  }

  private wecomFieldFromApprovalControl(controlRecord: Record<string, unknown>): WecomFinanceApprovalField | null {
    const value = this.isRecordObject(controlRecord.value) ? controlRecord.value : {};
    const control = this.normalizeOptionalText(controlRecord.control) ?? "Unknown";
    const title = this.wecomTitleToText(controlRecord.title) || this.normalizeOptionalText(controlRecord.id) || control;
    const amount = control === "Money" ? this.parseWecomAmount(value.new_money) : null;
    const files = Array.isArray(value.files) ? value.files : [];
    const attachmentCount = files.length || undefined;

    return {
      id: this.normalizeOptionalText(controlRecord.id) ?? `${control}-${title}`,
      control,
      title,
      valueText: this.extractWecomApprovalValueText(control, value),
      ...(amount !== null ? { amount } : {}),
      ...(attachmentCount ? { attachmentCount } : {}),
    };
  }

  private extractWecomApprovalValueText(control: string, value: Record<string, unknown>) {
    const text = this.normalizeOptionalText(value.text);
    if (text) return text;

    const money = this.parseWecomAmount(value.new_money);
    if (money !== null) return String(money);

    const date = this.isRecordObject(value.date) ? value.date : null;
    if (date) {
      const seconds = Number(date.s_timestamp ?? date.timestamp);
      if (Number.isFinite(seconds) && seconds > 0) {
        return new Date(seconds * 1000).toISOString().slice(0, 10);
      }
    }

    const selectorLabels = this.collectWecomSelectorLabels(value);
    if (selectorLabels.length) return selectorLabels.join("、");

    const files = Array.isArray(value.files) ? value.files : [];
    if (files.length) return `${files.length} 个附件`;

    const children = Array.isArray(value.children) ? value.children : [];
    if (children.length && control === "Table") return `${children.length} 行明细`;

    return "";
  }

  private collectWecomSelectorLabels(value: Record<string, unknown>) {
    const selector = this.isRecordObject(value.selector) ? value.selector : {};
    const options = Array.isArray(selector.options) ? selector.options : [];
    return options
      .map((item) => {
        const option = this.isRecordObject(item) ? item : {};
        return (
          this.wecomTitleToText(option.value) ||
          this.wecomTitleToText(option.text) ||
          this.wecomTitleToText(option.title) ||
          this.wecomTitleToText(option.name)
        );
      })
      .filter((item) => item.length > 0);
  }

  private parseWecomAmount(value: unknown) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value !== "string") return null;

    const parsed = Number(value.replace(/[,\s¥￥元]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  private pickWecomApprovalAmount(fields: WecomFinanceApprovalField[]) {
    const moneyFields = fields.filter((field) => typeof field.amount === "number");
    const preferred = moneyFields.find((field) => this.isWecomApprovalTitleMatch(field, ["总费用金额", "total amount", "金额", "amount", "费用"]));
    return preferred?.amount ?? moneyFields[0]?.amount ?? 0;
  }

  private pickWecomApprovalText(fields: WecomFinanceApprovalField[], patterns: string[]) {
    return fields.find((field) => field.valueText && this.isWecomApprovalTitleMatch(field, patterns))?.valueText ?? "";
  }

  private isWecomApprovalTitleMatch(field: WecomFinanceApprovalField, patterns: string[]) {
    const text = `${field.title} ${field.valueText}`.toLowerCase();
    return patterns.some((pattern) => text.includes(pattern.toLowerCase()));
  }

  private mapWecomApprovalStatus(value: unknown): WecomFinanceApprovalStatus {
    const status = Number(value);
    if (status === 1) return "pending";
    if (status === 2) return "approved";
    if (status === 3) return "rejected";
    if (status === 4 || status === 6) return "revoked";
    return "unknown";
  }

  private wecomTitleToText(value: unknown): string {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.wecomTitleToText(item))
        .filter(Boolean)
        .join("/");
    }

    const record = this.isRecordObject(value) ? value : null;
    if (record) {
      return (
        this.normalizeOptionalText(record.text) ??
        this.normalizeOptionalText(record.name) ??
        this.normalizeOptionalText(record.value) ??
        ""
      );
    }

    return this.normalizeOptionalText(value) ?? "";
  }

  private toIsoFromUnixSeconds(value: unknown) {
    const seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds <= 0) return new Date().toISOString();
    return new Date(seconds * 1000).toISOString();
  }

  private createPlatformWorkspace(user: AuthenticatedUser): Record<string, any> {
    return this.touchContractState({
      messages: [
        {
          id: "message-employee-launch-baseline",
          category: "系统",
          title: "员工正式验收基准消息",
          description: "用于确认消息中心、附件和操作留痕在正式 API 中可读写。",
          from: "员工验收台",
          module: "消息中心",
          receivedAt: new Date().toISOString(),
          status: "unread",
          pinned: true,
          priority: "中",
          to: "/messages",
        },
      ],
      attachments: [
        {
          id: "attachment-employee-launch-baseline",
          name: "employee-launch-baseline.txt",
          category: "验收附件",
          module: "附件中心",
          owner: user.name,
          uploadedAt: new Date().toISOString(),
          status: "approved",
          visibility: "内部",
          sizeLabel: "1 KB",
          detail: "正式 API 验收用基准附件。",
          source: "server_contract",
          fileExtension: "txt",
          mimeType: "text/plain",
          preview: {
            kind: "document",
            title: "员工验收基准附件",
            caption: "确认附件预览结构可被前端读取。",
            lines: ["模块 消息中心", "用途 正式 API 验收"],
            tone: "neutral",
          },
          receipt: {
            channel: "server-contract-baseline",
            storageKey: "employee-launch/baseline.txt",
            checksumLabel: "CK-BASELINE",
            retentionLabel: "验收后可清理",
            uploadedBy: user.name,
          },
        },
      ],
      auditItems: [
        {
          id: "audit-employee-launch-baseline",
          title: "平台 workspace 已初始化",
          description: "正式 API 已写入员工验收基准数据。",
          actor: user.name,
          module: "操作日志",
          source: "employee-launch",
          at: new Date().toISOString(),
          tone: "forest",
          to: "/audit",
        },
      ],
    }, user, "/api/platform/workspace", false);
  }

  private createScheduleWorkspace(user: AuthenticatedUser): Record<string, any> {
    return this.touchContractState({
      snapshot: {
        date: new Date().toISOString().slice(0, 10),
        status: "empty",
        reviewState: "office_review",
        makeupConfirmed: false,
        attendanceLocked: false,
        totalOpenItems: 0,
      },
      attachments: [],
      auditTrail: [],
    }, user, "/api/schedule/workspace", false);
  }

  private createRosterWorkspace(user: AuthenticatedUser): Record<string, any> {
    return this.touchContractState({
      version: 2,
      updatedAt: new Date().toISOString(),
      drafts: {},
      published: {},
      draftsByWeek: {},
      publishedByWeek: {},
    }, user, "/api/roster/workspace", false);
  }

  private async buildRosterWorkspaceDbFirst(
    legacyState: Record<string, any>,
    user: AuthenticatedUser,
  ): Promise<Record<string, any>> {
    if (this.isEmployeeDataDbBridgeDisabled()) return legacyState;

    try {
      const rows = await this.prisma.$queryRawUnsafe<RosterWeekDbRow[]>(
        "SELECT id, teamKey, teamLabel, weekKey, weekLabel, periodMode, periodLabel, status, sourceSha16, sourceUpdatedAt, actorName, publishedAt, version, rawSnapshot, updatedAt FROM RosterWeek WHERE partitionKey = ? ORDER BY teamKey ASC, weekKey ASC, status ASC, updatedAt ASC",
        "REAL",
      );
      if (!rows.length) return legacyState;
      return this.mergeRosterDbRowsIntoWorkspace(legacyState, rows, user);
    } catch {
      return legacyState;
    }
  }

  private mergeRosterDbRowsIntoWorkspace(
    legacyState: Record<string, any>,
    rows: RosterWeekDbRow[],
    user: AuthenticatedUser,
  ): Record<string, any> {
    const state = this.normalizeRosterWorkspace(legacyState);
    const draftsByWeek: Record<string, unknown> = this.isRecordObject(state.draftsByWeek) ? { ...state.draftsByWeek } : {};
    const publishedByWeek: Record<string, unknown> = this.isRecordObject(state.publishedByWeek) ? { ...state.publishedByWeek } : {};
    const drafts: Record<string, unknown> = this.isRecordObject(state.drafts) ? { ...state.drafts } : {};
    const published: Record<string, unknown> = this.isRecordObject(state.published) ? { ...state.published } : {};

    const latestDraft = new Map<string, { snapshot: Record<string, any>; updatedAt: number }>();
    const latestPublished = new Map<string, { snapshot: Record<string, any>; updatedAt: number }>();

    for (const row of rows) {
      const snapshot = this.normalizeRosterDbSnapshot(row);
      if (!snapshot) continue;
      const teamKey = row.teamKey || this.normalizeOptionalText(snapshot.teamId) || "unknown";
      const weekKey = row.weekKey || this.normalizeOptionalText(snapshot.weekKey) || "current";
      const updatedAt = this.dateTimeScore(row.sourceUpdatedAt ?? row.updatedAt);
      const status = row.status === "DRAFT" ? "draft" : "published";

      if (status === "draft") {
        const teamWeeks = this.isRecordObject(draftsByWeek[teamKey]) ? { ...draftsByWeek[teamKey] } : {};
        teamWeeks[weekKey] = snapshot;
        draftsByWeek[teamKey] = teamWeeks;
        const previous = latestDraft.get(teamKey);
        if (!previous || updatedAt >= previous.updatedAt) latestDraft.set(teamKey, { snapshot, updatedAt });
      } else {
        const teamWeeks = this.isRecordObject(publishedByWeek[teamKey]) ? { ...publishedByWeek[teamKey] } : {};
        teamWeeks[weekKey] = snapshot;
        publishedByWeek[teamKey] = teamWeeks;
        const previous = latestPublished.get(teamKey);
        if (!previous || updatedAt >= previous.updatedAt) latestPublished.set(teamKey, { snapshot, updatedAt });
      }
    }

    for (const [teamKey, item] of latestDraft.entries()) drafts[teamKey] = item.snapshot;
    for (const [teamKey, item] of latestPublished.entries()) published[teamKey] = item.snapshot;

    return this.touchContractState({
      ...state,
      updatedAt: new Date().toISOString(),
      drafts,
      published,
      draftsByWeek,
      publishedByWeek,
      meta: {
        ...(this.isRecordObject(state.meta) ? state.meta : {}),
        persistence: "db-first",
        fallback: "employee-launch-contract/roster.json",
        rosterWeekCount: rows.length,
      },
    }, user, "/api/roster/workspace", false);
  }

  private normalizeRosterDbSnapshot(row: RosterWeekDbRow): Record<string, any> | null {
    const parsed = this.parseJsonValue(row.rawSnapshot);
    if (!this.isRecordObject(parsed)) return null;

    return {
      ...parsed,
      teamId: this.normalizeOptionalText(parsed.teamId) ?? row.teamKey,
      teamLabel: this.normalizeOptionalText(parsed.teamLabel) ?? row.teamLabel,
      weekKey: this.normalizeOptionalText(parsed.weekKey) ?? row.weekKey,
      weekLabel: this.normalizeOptionalText(parsed.weekLabel) ?? row.weekLabel ?? row.weekKey,
      periodMode: this.normalizeOptionalText(parsed.periodMode) ?? row.periodMode.toLowerCase(),
      periodLabel: this.normalizeOptionalText(parsed.periodLabel) ?? row.periodLabel ?? row.weekLabel ?? row.weekKey,
      status: row.status === "DRAFT" ? "draft" : "published",
      actorName: this.normalizeOptionalText(parsed.actorName) ?? row.actorName ?? "系统",
      publishedAt: this.normalizeOptionalText(parsed.publishedAt) ?? this.dateTimeToIso(row.publishedAt),
      updatedAt: this.normalizeOptionalText(parsed.updatedAt) ?? this.dateTimeToIso(row.sourceUpdatedAt ?? row.updatedAt),
    };
  }

  private normalizeRosterWorkspace(body: Record<string, unknown>): Record<string, any> {
    const objectBody = this.isRecordObject(body) ? body : {};
    return {
      version: typeof objectBody.version === "number" ? objectBody.version : 2,
      updatedAt: typeof objectBody.updatedAt === "string" && objectBody.updatedAt.trim() ? objectBody.updatedAt : new Date().toISOString(),
      drafts: this.isRecordObject(objectBody.drafts) ? objectBody.drafts : {},
      published: this.isRecordObject(objectBody.published) ? objectBody.published : {},
      draftsByWeek: this.isRecordObject(objectBody.draftsByWeek) ? objectBody.draftsByWeek : {},
      publishedByWeek: this.isRecordObject(objectBody.publishedByWeek) ? objectBody.publishedByWeek : {},
    };
  }

  private async upsertRosterWorkspaceToDb(
    workspace: Record<string, any>,
    user: AuthenticatedUser,
  ) {
    if (this.isEmployeeDataDbBridgeDisabled()) return;

    const snapshots = this.extractRosterSnapshotsForDb(workspace);
    for (const item of snapshots) {
      await this.upsertRosterSnapshotToDb(item.snapshot, item.status, user);
    }
  }

  private extractRosterSnapshotsForDb(workspace: Record<string, any>) {
    const result: Array<{ status: "DRAFT" | "PUBLISHED"; snapshot: Record<string, any> }> = [];
    const seen = new Set<string>();
    const collect = (status: "DRAFT" | "PUBLISHED", value: unknown) => {
      if (!this.isRecordObject(value)) return;
      for (const teamValue of Object.values(value)) {
        if (!this.isRecordObject(teamValue)) continue;
        if (this.normalizeOptionalText(teamValue.teamId) && this.normalizeOptionalText(teamValue.weekKey)) {
          const key = `${status}:${teamValue.teamId}:${teamValue.weekKey}`;
          if (!seen.has(key)) {
            seen.add(key);
            result.push({ status, snapshot: teamValue });
          }
          continue;
        }
        for (const weekValue of Object.values(teamValue)) {
          if (!this.isRecordObject(weekValue)) continue;
          const key = `${status}:${weekValue.teamId}:${weekValue.weekKey}`;
          if (!this.normalizeOptionalText(weekValue.teamId) || !this.normalizeOptionalText(weekValue.weekKey) || seen.has(key)) continue;
          seen.add(key);
          result.push({ status, snapshot: weekValue });
        }
      }
    };

    collect("DRAFT", workspace.draftsByWeek);
    collect("PUBLISHED", workspace.publishedByWeek);
    collect("DRAFT", workspace.drafts);
    collect("PUBLISHED", workspace.published);
    return result;
  }

  private async upsertRosterSnapshotToDb(
    snapshot: Record<string, any>,
    status: "DRAFT" | "PUBLISHED",
    user: AuthenticatedUser,
  ) {
    const teamKey = this.normalizeOptionalText(snapshot.teamId) ?? "unknown";
    const teamLabel = this.normalizeOptionalText(snapshot.teamLabel) ?? teamKey;
    const weekKey = this.normalizeOptionalText(snapshot.weekKey) ?? "current";
    const weekLabel = this.normalizeOptionalText(snapshot.weekLabel) ?? weekKey;
    const periodMode = this.normalizeOptionalText(snapshot.periodMode)?.toLowerCase() === "month" ? "MONTH" : "WEEK";
    const periodLabel = this.normalizeOptionalText(snapshot.periodLabel) ?? weekLabel;
    const sourceJson = JSON.stringify(snapshot);
    const sourceSha16 = this.sha16(sourceJson);
    const rosterWeekId = this.stableRecordId("rwk", teamKey, weekKey, status, "REAL");
    const sourceUpdatedAt = this.dateFromUnknown(snapshot.updatedAt);
    const publishedAt = this.dateFromUnknown(snapshot.publishedAt);
    const actorName = this.normalizeOptionalText(snapshot.actorName) ?? user.name;

    await this.prisma.$executeRawUnsafe(
      "INSERT INTO RosterWeek (id, teamKey, teamLabel, weekKey, weekLabel, periodMode, periodLabel, status, source, sourceSha16, sourceUpdatedAt, actorName, actorUserId, publishedAt, version, rawSnapshot, dataScope, partitionKey, testBatchId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE teamLabel = VALUES(teamLabel), weekLabel = VALUES(weekLabel), periodMode = VALUES(periodMode), periodLabel = VALUES(periodLabel), sourceSha16 = VALUES(sourceSha16), sourceUpdatedAt = VALUES(sourceUpdatedAt), actorName = VALUES(actorName), actorUserId = VALUES(actorUserId), publishedAt = VALUES(publishedAt), version = version + 1, rawSnapshot = VALUES(rawSnapshot), updatedAt = CURRENT_TIMESTAMP(3)",
      rosterWeekId,
      teamKey,
      teamLabel,
      weekKey,
      weekLabel,
      periodMode,
      periodLabel,
      status,
      "api_db_first_bridge",
      sourceSha16,
      sourceUpdatedAt,
      actorName,
      user.id,
      publishedAt,
      typeof snapshot.version === "number" ? snapshot.version : 1,
      sourceJson,
      "REAL",
      "REAL",
    );

    await this.upsertRosterSnapshotShiftsToDb(rosterWeekId, snapshot, teamKey);
  }

  private async upsertRosterSnapshotShiftsToDb(
    rosterWeekId: string,
    snapshot: Record<string, any>,
    teamKey: string,
  ) {
    const entries = Array.isArray(snapshot.entries) ? snapshot.entries : [];
    for (let index = 0; index < entries.length; index += 1) {
      const entry = this.isRecordObject(entries[index]) ? entries[index] : null;
      if (!entry) continue;
      const personExternalId = this.normalizeOptionalText(entry.personId) ?? this.normalizeOptionalText(entry.personName) ?? `person-${index}`;
      const dayName = this.normalizeOptionalText(entry.day) ?? `day-${index}`;
      const times = this.parseRosterShiftTime(this.normalizeOptionalText(entry.time));
      const notes = Array.isArray(entry.notes) ? entry.notes : null;

      await this.prisma.$executeRawUnsafe(
        "INSERT INTO RosterShift (id, rosterWeekId, personExternalId, personUserId, personName, role, department, teamKey, dayName, dateLabel, shiftLabel, startTime, endTime, isRest, notesJson, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE personName = VALUES(personName), role = VALUES(role), department = VALUES(department), teamKey = VALUES(teamKey), dateLabel = VALUES(dateLabel), shiftLabel = VALUES(shiftLabel), startTime = VALUES(startTime), endTime = VALUES(endTime), isRest = VALUES(isRest), notesJson = VALUES(notesJson), sortOrder = VALUES(sortOrder), updatedAt = CURRENT_TIMESTAMP(3)",
        this.stableRecordId("rsh", rosterWeekId, personExternalId, dayName),
        rosterWeekId,
        personExternalId,
        this.normalizeOptionalText(entry.personName) ?? personExternalId,
        this.normalizeOptionalText(entry.role),
        this.normalizeOptionalText(entry.department),
        this.normalizeOptionalText(entry.teamId) ?? teamKey,
        dayName,
        this.normalizeOptionalText(entry.dateLabel) ?? "",
        this.normalizeOptionalText(entry.shift) ?? this.normalizeOptionalText(entry.title) ?? "",
        times.startTime,
        times.endTime,
        entry.isRest === true || this.normalizeOptionalText(entry.shift) === "休",
        JSON.stringify(notes ?? []),
        index,
      );
    }
  }

  private createFinanceWorkspace(user: AuthenticatedUser): Record<string, any> {
    const now = new Date().toISOString();
    return this.touchContractState({
      attendanceArchive: {
        archived: false,
        month: new Date().toISOString().slice(0, 7),
        fileName: null,
        archivedAt: null,
        operator: null,
        note: "尚未上传财务回传文件。",
      },
      imports: [],
      monthlyReports: [],
      monthlyAdjustments: [],
      courseSettlement: {
        teachers: [],
        courses: [],
        rules: [],
        adjustments: [],
        profitLines: [],
        reviewEvents: [],
        updatedAt: now,
        updatedBy: "系统默认",
      },
      expenseClaims: [],
      reviewRequests: [],
      invoiceFollowUps: [],
      expenseApprovalPolicy: {
        thresholdAmount: 1000,
        notifyOnEachStage: true,
        financeApprovers: [{ userid: "finance_reviewer", name: "周立猛", role: "财务", department: "财务组" }],
        superAdminApprovers: [
          { userid: "edwardtsuei", name: "edwardtsuei", role: "超级管理员", department: "管理层" },
          { userid: "hanyu", name: "hanyu", role: "超级管理员", department: "管理层" },
        ],
        departmentRules: [
          { department: "熊抱大地", approvers: [{ userid: "bearhug_manager", name: "熊抱大地负责人", role: "部门负责人", department: "熊抱大地" }] },
          { department: "道冲元气", approvers: [{ userid: "daochong_manager", name: "道冲负责人", role: "部门负责人", department: "道冲元气" }] },
          { department: "光的家园", approvers: [{ userid: "course_coordinator", name: "课程负责人", role: "部门负责人", department: "光的家园" }] },
          { department: "综合办公室", approvers: [{ userid: "office_admin", name: "办公室管理员", role: "部门负责人", department: "综合办公室" }] },
        ],
        updatedAt: now,
        updatedBy: "系统默认",
      },
      bankTransactions: [],
      internalReports: [],
      statutoryJobs: [],
    }, user, "/api/finance/workspace", false);
  }

  private createDaochongWorkspace(user: AuthenticatedUser): Record<string, any> {
    return this.touchContractState({
      customers: [
        {
          id: "customer-chen-03",
          name: "陈女士",
          mobile: "139****6720",
          wechatId: "wx_chen_6720",
          tags: ["活跃", "微信支付", "体验转正"],
          sourceId: "source-friend",
          source: "朋友同行",
          preference: "喜欢上午档，服务后当天做简短回访。",
          lastVisitAt: "2026-04-24T10:30:00+08:00",
          status: "active",
          riskNote: "正常跟进。",
          balance: 0,
          totalSpent: 1160,
          owner: "慧心",
          ownerId: "huixin",
          note: "朋友同行转化，服务后需要及时维护。",
          createdBy: "慧心",
          createdAt: "2026-04-24T10:30:00+08:00",
          updatedBy: "慧心",
          updatedAt: "2026-04-24T11:40:00+08:00",
        },
        {
          id: "customer-wang-01",
          name: "王女士",
          mobile: "138****2491",
          wechatId: "wx_wang_2491",
          tags: ["储值", "肩颈调理", "复购"],
          sourceId: "source-referral",
          source: "朋友转介绍",
          preference: "预约前一天微信确认。",
          lastVisitAt: "2026-04-21T15:30:00+08:00",
          status: "review",
          riskNote: "退款和充值调整待确认。",
          balance: 2400,
          totalSpent: 4280,
          owner: "lisa",
          ownerId: "lisali",
          note: "旧客资料已补录，储值余额需和历史台账继续核对。",
          createdBy: "lisa",
          createdAt: "2026-04-01T10:12:00+08:00",
          updatedBy: "lisa",
          updatedAt: "2026-04-21T16:30:00+08:00",
        },
      ],
      appointments: [
        {
          id: "appointment-chen-0424",
          customerId: "customer-chen-03",
          customerName: "陈女士",
          teacher: "慧心",
          service: "肩颈调理",
          startAt: "2026-04-24T10:30:00+08:00",
          endAt: "2026-04-24T11:30:00+08:00",
          status: "scheduled",
          amount: 280,
          paymentStatus: "unpaid",
          note: "体验转正客户，服务后当天回访。",
        },
      ],
      payments: [
        {
          id: "payment-chen-0424",
          customerId: "customer-chen-03",
          appointmentId: "appointment-chen-0424",
          amount: 280,
          method: "微信",
          status: "verified",
          paidAt: "2026-04-24T11:36:00+08:00",
          receivedBy: "慧心",
          recordedBy: user.name,
          note: "验收基准收款。",
        },
      ],
      rechargeTransactions: [
        {
          id: "recharge-baseline-01",
          customerId: "customer-wang-01",
          type: "top_up",
          amount: 500,
          status: "confirmed",
          channel: "微信",
          recordedBy: user.name,
          at: "2026-04-20T15:30:00+08:00",
          note: "验收基准储值。",
        },
      ],
      activity: [
        {
          id: "employee-launch-daochong-activity-1",
          title: "道冲 workspace 已初始化",
          description: "预约、收款与储值 smoke 基线已建立。",
          actor: user.name,
          at: new Date().toISOString(),
          tone: "forest",
        },
      ],
    }, user, "/api/daochong/workspace", false);
  }

  private createCoursesWorkspace(user: AuthenticatedUser): Record<string, any> {
    return this.touchContractState({
      readinessConfirmed: false,
      archiveConfirmed: false,
      noticeSent: false,
      sessions: [
        {
          id: "course-session-home-0427",
          title: "光的家园主场课程",
          startAt: "2026-04-27T09:30:00+08:00",
          endAt: "2026-04-27T11:30:00+08:00",
          location: "大爱归心主场",
          lead: "雅南",
          capacity: 24,
          status: "preparing",
          note: "课程 smoke 基准场次。",
        },
      ],
      enrollments: [
        {
          id: "course-enroll-liu-01",
          sessionId: "course-session-home-0427",
          name: "刘同学",
          mobile: "13900000001",
          role: "student",
          registrationStatus: "registered",
          checkInStatus: "pending",
          owner: "雅南",
          note: "待确认报名。",
        },
        {
          id: "course-enroll-zhao-02",
          sessionId: "course-session-home-0427",
          name: "赵同学",
          mobile: "13900000002",
          role: "student",
          registrationStatus: "confirmed",
          checkInStatus: "pending",
          owner: "雅南",
          note: "已确认报名。",
        },
      ],
      noticeReceipts: [
        {
          id: "course-receipt-liu-01",
          enrollmentId: "course-enroll-liu-01",
          channel: "微信",
          status: "pending",
          sentAt: null,
          readAt: null,
          confirmedAt: null,
          note: "待发送通知。",
        },
        {
          id: "course-receipt-zhao-02",
          enrollmentId: "course-enroll-zhao-02",
          channel: "微信",
          status: "sent",
          sentAt: "2026-04-25T10:00:00+08:00",
          readAt: null,
          confirmedAt: null,
          note: "已发送待确认。",
        },
      ],
      activity: [
        {
          id: "employee-launch-course-activity-1",
          title: "课程 workspace 已初始化",
          description: "课程准备、报名、签到与回执 smoke 基线已建立。",
          actor: user.name,
          at: new Date().toISOString(),
          tone: "forest",
        },
      ],
    }, user, "/api/courses/workspace", false);
  }

  private readContractState(
    key: string,
    factory: () => Record<string, any>,
    user: AuthenticatedUser,
    baseUrl: string,
  ): Record<string, any> {
    const pathname = this.contractStoragePath(key);
    if (existsSync(pathname)) {
      try {
        return this.touchContractState(
          JSON.parse(readFileSync(pathname, "utf8")) as Record<string, any>,
          user,
          baseUrl,
          false,
        );
      } catch {
        return factory();
      }
    }
    return factory();
  }

  private mergeSalarySlips(existing: unknown, payrollSlips: Array<Record<string, unknown>>) {
    const merged = new Map<string, Record<string, unknown>>();
    (Array.isArray(existing) ? existing : []).forEach((item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const record = item as Record<string, unknown>;
        const id = typeof record.id === "string" && record.id.trim()
          ? record.id
          : JSON.stringify([record.month, record.teacherId, record.teacherName]);
        merged.set(id, record);
      }
    });
    payrollSlips.forEach((item) => {
      const key = typeof item.id === "string" && item.id.trim()
        ? item.id
        : JSON.stringify([item.month, item.teacherId, item.teacherName]);
      merged.set(key, item);
    });
    return Array.from(merged.values());
  }

  private commitContractState(
    key: string,
    state: Record<string, any>,
    user: AuthenticatedUser,
    baseUrl: string,
  ): Record<string, any> {
    const normalized = this.touchContractState(state, user, baseUrl, true);
    mkdirSync(this.contractStorageDir, { recursive: true });
    const pathname = this.contractStoragePath(key);
    const tempPathname = `${pathname}.${process.pid}.tmp`;
    writeFileSync(tempPathname, JSON.stringify(normalized, null, 2));
    renameSync(tempPathname, pathname);
    return normalized;
  }

  private touchContractState(
    state: Record<string, any>,
    user: AuthenticatedUser,
    baseUrl: string,
    incrementVersion: boolean,
  ): Record<string, any> {
    const now = new Date().toISOString();
    const meta = this.isRecordObject(state.meta) ? state.meta : {};
    const version = typeof meta.version === "number" ? meta.version : 1;
    return {
      ...state,
      meta: {
        ...meta,
        source: "api",
        version: incrementVersion ? version + 1 : version,
        lastSyncedAt: now,
        generatedAt: now,
        baseUrl,
        requestedBy: user.loginAccount ?? user.name,
      },
    };
  }

  private normalizeFinanceDateLabel(value?: string | null) {
    const parsed = value ? new Date(value) : new Date();
    if (!Number.isFinite(parsed.getTime())) return new Date().toISOString().slice(0, 10);
    return parsed.toISOString().slice(0, 10);
  }

  private addFinanceDateDays(dateLabel: string, days: number) {
    const [year, month, day] = dateLabel.split("-").map((item) => Number(item));
    if (!year || !month || !day) return this.normalizeFinanceDateLabel();
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
  }

  private buildExpenseInvoiceFollowUp(claim: Record<string, any>) {
    const invoiceCount = Math.max(1, Math.round(Number(claim.invoiceCount ?? 1) || 1));
    const attachmentIds = Array.isArray(claim.attachmentIds) ? claim.attachmentIds : [];
    const shortfall = Math.max(0, invoiceCount - attachmentIds.length);
    const summary = this.normalizeOptionalText(claim.summary) ?? "";
    const needsFollowUp =
      shortfall > 0 ||
      /后补票|後補票|待补发票|待補發票|缺发票|缺發票|缺票|未开发票|未開發票|非标准票据|非標準票據/.test(summary);
    if (!needsFollowUp) return null;

    const paymentDate = this.normalizeFinanceDateLabel(this.normalizeOptionalText(claim.submittedAt));
    const expectedInvoiceDate = this.addFinanceDateDays(paymentDate, 5);
    const department = this.normalizeOptionalText(claim.department) ?? "综合办公室";
    const companyEntity = department === "熊抱大地" ? "熊抱大地蔬食馆" : department === "综合办公室" ? "大爱归心" : department;
    const applicant = this.normalizeOptionalText(claim.applicant) ?? "申请人";
    const payee = this.normalizeOptionalText(claim.payee) ?? applicant;

    return {
      id: `invoice-followup-${claim.id}`,
      sourceType: "reimbursement",
      sourceId: claim.id,
      sourceTitle: this.normalizeOptionalText(claim.title) ?? "员工报销单",
      applicant,
      applicantUserid: applicant,
      department,
      companyEntity,
      counterparty: payee,
      amount: Number(claim.amount ?? 0),
      paymentDate,
      expectedInvoiceDate,
      status: expectedInvoiceDate < this.normalizeFinanceDateLabel() ? "overdue" : "pending",
      invoiceStatus: "待补发票",
      responsiblePerson: applicant,
      responsibleUserid: applicant,
      reason: summary || `报销票据仍缺 ${shortfall || 1} 份，需补上传发票、说明或替代凭证。`,
      lastReminderAt: null,
      nextReminderAt: `${expectedInvoiceDate}T09:00:00+08:00`,
      reminderCount: 0,
      riskFlags: [
        shortfall > 0 ? `缺 ${shortfall} 份发票` : "待核发票",
        claim.linkedBankTransactionId ? "" : "待关联流水",
      ].filter(Boolean),
      linkedExpenseClaimId: claim.id,
      linkedReviewRequestId: null,
      attachmentIds,
      reminderLog: [],
    };
  }

  private ensureFinanceInvoiceFollowUps(state: Record<string, any>) {
    const expenseClaims = Array.isArray(state.expenseClaims) ? state.expenseClaims : [];
    const invoiceFollowUps = Array.isArray(state.invoiceFollowUps) ? state.invoiceFollowUps : [];
    const existingClaimIds = new Set(
      invoiceFollowUps
        .filter((item: Record<string, any>) => item.sourceType === "reimbursement")
        .map((item: Record<string, any>) => item.linkedExpenseClaimId ?? item.sourceId)
        .filter(Boolean),
    );
    const missing = expenseClaims
      .map((claim: Record<string, any>) => this.buildExpenseInvoiceFollowUp(claim))
      .filter((item: Record<string, any> | null): item is Record<string, any> => {
        if (!item) return false;
        return !existingClaimIds.has(item.sourceId);
      });

    state.invoiceFollowUps = missing.length ? [...missing, ...invoiceFollowUps] : invoiceFollowUps;
  }

  private contractStoragePath(key: string) {
    return join(this.contractStorageDir, `${key}.json`);
  }

  private findById(items: Array<Record<string, any>>, id: string) {
    return items.find((item) => item.id === id);
  }

  private upsertById(items: Array<Record<string, any>>, record: Record<string, any>) {
    const index = items.findIndex((item) => item.id === record.id);
    if (index >= 0) {
      items[index] = { ...items[index], ...record };
      return;
    }
    items.unshift(record);
  }

  private prependActivity(
    items: Array<Record<string, any>>,
    title: string,
    description: string,
    user: AuthenticatedUser,
  ) {
    items.unshift({
      id: this.createRecordId("activity"),
      title,
      description,
      actor: user.name,
      at: new Date().toISOString(),
      tone: "forest",
    });
  }

  private readOcrTasks(): Record<string, Record<string, any>> {
    const pathname = this.contractStoragePath("ocr-tasks");
    if (!existsSync(pathname)) return {};
    try {
      return JSON.parse(readFileSync(pathname, "utf8")) as Record<string, Record<string, any>>;
    } catch {
      return {};
    }
  }

  private writeOcrTasks(tasks: Record<string, Record<string, any>>) {
    mkdirSync(this.contractStorageDir, { recursive: true });
    const pathname = this.contractStoragePath("ocr-tasks");
    const tempPathname = `${pathname}.${process.pid}.tmp`;
    writeFileSync(tempPathname, JSON.stringify(tasks, null, 2));
    renameSync(tempPathname, pathname);
  }

  private buildMeta(user: AuthenticatedUser, baseUrl: string): WorkspaceMeta {
    return {
      source: "api",
      generatedAt: new Date().toISOString(),
      baseUrl,
      requestedBy: user.loginAccount ?? user.name
    };
  }

  private createInitialWeeklyWorkspaceRecord(
    userKey: string,
    user: AuthenticatedUser,
  ): WeeklyWorkspaceRecord {
    const now = new Date();
    return {
      schemaVersion: 1,
      userKey,
      reportState: "draft",
      lastSavedAt: this.formatWorkspaceTimestamp(now),
      draftDirty: false,
      reportDraft: this.createWeeklyReportDraft(),
      teamReports: this.createTeamWeeklyReportRecords(),
      batchReviewDraft: "",
      batchActionHistory: [],
      summaryVersions: [],
      personalSummaryVersions: [],
      workspaceNote: "暂无周报记录。",
      savedAt: now.toISOString(),
      meta: this.buildWeeklyMeta(userKey, user, 1, now),
    };
  }

  private createWeeklyReportDraft(): WeeklyReportDraft {
    return {
      carryItems: [
        {
          id: "weekly-carry-launch-1",
          title: "员工正式验收问题回收",
          owner: "崔以达",
          status: "跟进中",
          decision: "继续跟进",
        },
      ],
      focusItems: [
        {
          id: "weekly-focus-launch-1",
          title: "完成财务报销与薪资条试用闭环",
          result: "已进入受控员工验收。",
          evidence: "正式站 API 与前端记录。",
        },
      ],
      blockerItems: [
        {
          id: "weekly-blocker-launch-1",
          title: "等待真实员工试用签收",
          owner: "财务",
          nextAction: "收集 5-10 位试用反馈。",
        },
      ],
      planItems: [
        {
          id: "weekly-plan-launch-1",
          title: "补齐员工试用签收记录",
          owner: "财务",
          due: "下周五前",
          priority: "高",
          sync: "同步到员工上线验收清单",
        },
      ],
      supportRequest: {
        title: "协助收集试用反馈",
        description: "请财务和部门负责人补齐真实员工试用记录。",
      },
    };
  }

  private createTeamWeeklyReportRecords(): TeamWeeklyReportRecord[] {
    return [
      this.createTeamReport({
        name: "lisa",
        department: "熊抱大地",
        role: "餐饮运营",
        status: "待提交",
        review: "待点评",
        blocker: "无",
        summary: "本周重点是备用金和采购申请流程试用。",
      }),
      this.createTeamReport({
        name: "程程",
        department: "道冲元气",
        role: "部门负责人",
        status: "已提交",
        review: "待点评",
        blocker: "无",
        summary: "已提交道冲客户、收款与分润规则试用反馈。",
      }),
      this.createTeamReport({
        name: "雅南",
        department: "光的家园",
        role: "课程协调",
        status: "有阻塞",
        review: "待点评",
        blocker: "等待课程收入导入样本复核。",
        summary: "课程分润与学员退款例外正在整理。",
      }),
    ];
  }

  private createTeamReport(input: {
    name: string;
    department: string;
    role: string;
    status: TeamWeeklyReportStatus;
    review: TeamWeeklyReviewState;
    blocker: string;
    summary: string;
  }): TeamWeeklyReportRecord {
    return {
      ...input,
      updatedAt: this.formatWorkspaceTimestamp(new Date("2026-05-20T10:00:00+08:00")),
      blockerDetail:
        input.blocker === "无"
          ? "当前没有明显阻塞，建议补一条下周重点动作。"
          : input.blocker,
      nextPlans: ["补齐本周结果", "确认下周动作", "同步到月目标承接"],
      supportRequest: "需要主管确认本周动作是否可纳入月底汇总。",
      highlights: ["已有周报基础", "可进入团队视角", "待主管继续确认"],
      managerDraft:
        input.review === "已点评"
          ? "主管已确认当前周报可纳入汇总。"
          : "建议补足结果、阻塞和下周动作后再确认。",
      lastComment:
        input.review === "已点评"
          ? "上次点评：结构清楚，可以归档。"
          : "上次点评：待补充更多执行细节。",
      reviewHistory: [
        this.createWeeklyActivityLogEntry(
          input.review === "已点评" ? "主管已通过点评" : "等待主管继续确认",
          "当前周报已进入团队工作台留痕。",
          {
            tone: input.review === "已点评" ? "forest" : "neutral",
            timestamp: new Date("2026-05-20T10:00:00+08:00").getTime(),
          },
        ),
      ],
      reminderHistory: [],
    };
  }

  private normalizeWeeklyWorkspaceRecord(
    value: unknown,
    userKey: string,
    user: AuthenticatedUser,
  ): WeeklyWorkspaceRecord {
    const fallback = this.createInitialWeeklyWorkspaceRecord(userKey, user);
    if (!this.isRecordObject(value)) {
      return fallback;
    }

    const record = value as Partial<WeeklyWorkspaceRecord>;
    const meta: Record<string, unknown> = this.isRecordObject(record.meta)
      ? record.meta
      : {};
    const now = new Date();

    return {
      ...fallback,
      ...record,
      schemaVersion: 1,
      userKey,
      reportState: record.reportState === "submitted" ? "submitted" : "draft",
      lastSavedAt:
        typeof record.lastSavedAt === "string"
          ? record.lastSavedAt
          : fallback.lastSavedAt,
      draftDirty:
        typeof record.draftDirty === "boolean"
          ? record.draftDirty
          : fallback.draftDirty,
      reportDraft: this.isRecordObject(record.reportDraft)
        ? (record.reportDraft as WeeklyReportDraft)
        : fallback.reportDraft,
      teamReports: Array.isArray(record.teamReports)
        ? (record.teamReports as TeamWeeklyReportRecord[])
        : fallback.teamReports,
      batchReviewDraft:
        typeof record.batchReviewDraft === "string"
          ? record.batchReviewDraft
          : fallback.batchReviewDraft,
      batchActionHistory: Array.isArray(record.batchActionHistory)
        ? (record.batchActionHistory as WeeklyBatchActionRecord[])
        : fallback.batchActionHistory,
      summaryVersions: Array.isArray(record.summaryVersions)
        ? (record.summaryVersions as WeeklySummaryVersion[])
        : fallback.summaryVersions,
      personalSummaryVersions: Array.isArray(record.personalSummaryVersions)
        ? (record.personalSummaryVersions as WeeklyPersonalSummaryVersion[])
        : fallback.personalSummaryVersions,
      workspaceNote:
        typeof record.workspaceNote === "string"
          ? record.workspaceNote
          : fallback.workspaceNote,
      savedAt: typeof record.savedAt === "string" ? record.savedAt : fallback.savedAt,
      meta: {
        source: "api",
        version: typeof meta.version === "number" ? meta.version : fallback.meta.version,
        lastSyncedAt:
          typeof meta.lastSyncedAt === "string"
            ? meta.lastSyncedAt
            : now.toISOString(),
        syncMode: "workspace",
        baseUrl: this.weeklyBaseUrl(userKey),
        generatedAt: now.toISOString(),
        requestedBy: user.loginAccount ?? user.name,
      },
    };
  }

  private commitWeeklyRecord(
    userKey: string,
    record: WeeklyWorkspaceRecord,
    user: AuthenticatedUser,
  ) {
    const now = new Date();
    const normalized = this.normalizeWeeklyWorkspaceRecord(
      {
        ...record,
        savedAt: now.toISOString(),
        meta: {
          ...record.meta,
          version: (record.meta?.version ?? 0) + 1,
          lastSyncedAt: now.toISOString(),
        },
      },
      userKey,
      user,
    );
    mkdirSync(this.weeklyStorageDir, { recursive: true });
    const pathname = this.weeklyStoragePath(userKey);
    const tempPathname = `${pathname}.${process.pid}.tmp`;
    writeFileSync(tempPathname, JSON.stringify(normalized, null, 2));
    renameSync(tempPathname, pathname);
    return normalized;
  }

  private readWeeklyRecord(userKey: string): WeeklyWorkspaceRecord | null {
    const pathname = this.weeklyStoragePath(userKey);
    if (!existsSync(pathname)) return null;

    try {
      return JSON.parse(readFileSync(pathname, "utf8")) as WeeklyWorkspaceRecord;
    } catch {
      return null;
    }
  }

  private async readWeeklyPayloadFromDb(userKey: string): Promise<WeeklyPayloadDbRow | null> {
    const prefixedUserKey = this.prefixedWeeklyUserKey(userKey);
    const rows = await this.prisma.$queryRawUnsafe<WeeklyPayloadDbRow[]>(
      "SELECT id, sourceUserKey, canonicalUserKey, reportState, savedAt, payloadJson, migrationStatus FROM WeeklyReportPayload WHERE sourceUserKey IN (?, ?) OR canonicalUserKey = ? ORDER BY CASE WHEN sourceUserKey = ? THEN 0 WHEN canonicalUserKey = ? THEN 1 ELSE 2 END ASC, COALESCE(savedAt, updatedAt) DESC, updatedAt DESC LIMIT 1",
      userKey,
      prefixedUserKey,
      userKey,
      userKey,
      userKey,
    );
    const row = rows[0];
    if (!row) return null;
    return {
      ...row,
      payloadJson: this.parseJsonValue(row.payloadJson),
    };
  }

  private async upsertWeeklyPayloadFromRecord(
    sourceUserKey: string,
    canonicalUserKey: string,
    user: AuthenticatedUser,
    record: WeeklyWorkspaceRecord,
  ) {
    if (this.isEmployeeDataDbBridgeDisabled()) return;

    try {
      const payloadJson = JSON.stringify(record);
      const sourceSha16 = this.sha16(payloadJson);
      const sourceFileName = this.weeklyStorageFileName(sourceUserKey);
      await this.prisma.$executeRawUnsafe(
        "INSERT INTO WeeklyReportPayload (id, weeklyReportId, userId, source, sourceUserKey, canonicalUserKey, sourceFileName, sourceSha16, reportState, savedAt, payloadJson, migrationStatus, migrationNote, createdAt, updatedAt) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE userId = VALUES(userId), canonicalUserKey = VALUES(canonicalUserKey), reportState = VALUES(reportState), savedAt = VALUES(savedAt), payloadJson = VALUES(payloadJson), migrationStatus = VALUES(migrationStatus), migrationNote = VALUES(migrationNote), updatedAt = CURRENT_TIMESTAMP(3)",
        this.stableRecordId("wrp", sourceFileName, sourceSha16),
        user.id,
        "api_db_first_bridge",
        sourceUserKey,
        canonicalUserKey,
        sourceFileName,
        sourceSha16,
        record.reportState,
        this.dateFromUnknown(record.savedAt),
        payloadJson,
        "IMPORTED",
        "Written by API DB-first bridge; legacy JSON kept as fallback.",
      );
    } catch {
      return;
    }
  }

  private weeklyStoragePath(userKey: string) {
    return join(this.weeklyStorageDir, this.weeklyStorageFileName(userKey));
  }

  private weeklyStorageFileName(userKey: string) {
    const digest = createHash("sha256").update(userKey).digest("hex").slice(0, 32);
    return `${digest}.json`;
  }

  private prefixedWeeklyUserKey(userKey: string) {
    const prefix = "da-ai-gui-xin.weekly-workspace.v1.";
    return userKey.startsWith(prefix) ? userKey : `${prefix}${userKey}`;
  }

  private buildWeeklyMeta(
    userKey: string,
    user: AuthenticatedUser,
    version: number,
    now: Date,
  ): WeeklyWorkspaceRecord["meta"] {
    return {
      source: "api",
      version,
      lastSyncedAt: now.toISOString(),
      syncMode: "workspace",
      baseUrl: this.weeklyBaseUrl(userKey),
      generatedAt: now.toISOString(),
      requestedBy: user.loginAccount ?? user.name,
    };
  }

  private weeklyBaseUrl(userKey: string) {
    return `/api/weekly/workspace/${encodeURIComponent(userKey)}`;
  }

  private buildWeeklyMutationContext(
    route: string,
    rawUserKeyValue: unknown,
    user: AuthenticatedUser,
  ): WeeklyMutationContext {
    const rawUserKey = this.normalizeOptionalText(rawUserKeyValue);
    const canonicalUserKey = this.normalizeCanonicalWeeklyUserKey(rawUserKey, user);

    return {
      route,
      rawUserKey,
      canonicalUserKey,
      storageUserKey: canonicalUserKey,
      rawUserKeyHash: rawUserKey ? `sha256:${this.sha256(rawUserKey).slice(0, 8)}` : null,
    };
  }

  private normalizeCanonicalWeeklyUserKey(rawUserKey: string | null, user: AuthenticatedUser) {
    const fallback = this.normalizeOptionalText(user.loginAccount) ?? user.wecomUserId ?? user.id;
    if (!rawUserKey) return fallback;

    const legacyMatch = rawUserKey.match(/^da-ai-gui-xin\.weekly-workspace\.v\d+\.(.+)$/i);
    const normalized = legacyMatch?.[1]?.trim() || rawUserKey.trim();
    if (!normalized || normalized === "shared") return fallback;
    if (normalized.length > 160) {
      throw new BadRequestException("周报 workspace userKey 过长。");
    }

    return normalized;
  }

  private resolveWeeklyReportPeriod(referenceDate = new Date()): WeeklyReportPeriod {
    const weekStartDate = this.startOfWeekDate(referenceDate);
    const weekEndDate = this.addDateDays(weekStartDate, 6);
    return {
      weekStartDate,
      weekEndDate,
      year: weekStartDate.getFullYear(),
      month: weekStartDate.getMonth() + 1,
      weekNumber: this.monthWeekNumber(weekStartDate),
    };
  }

  private startOfWeekDate(value: Date) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    return date;
  }

  private addDateDays(value: Date, days: number) {
    const date = new Date(value);
    date.setDate(date.getDate() + days);
    return date;
  }

  private monthWeekNumber(weekStartDate: Date) {
    const firstDay = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), 1);
    const firstWeekStart = this.startOfWeekDate(firstDay);
    return Math.floor((weekStartDate.getTime() - firstWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  }

  private async persistWeeklyMutationOrThrow(
    context: WeeklyMutationContext,
    user: AuthenticatedUser,
    record: WeeklyWorkspaceRecord,
    status: LegacyWeeklyPersistStatus,
  ) {
    try {
      const report = await this.upsertWeeklyReportFromLegacyRecord(user, record, status);
      await this.logWeeklyMutationAudit({
        context,
        user,
        reportId: report.id,
        status: 200,
        action: status === WeeklyReportStatus.SUBMITTED ? "SUBMIT" : "DRAFT",
        content: status === WeeklyReportStatus.SUBMITTED ? "legacy weekly submit persisted" : "legacy weekly draft persisted",
      });
      return report;
    } catch (error) {
      await this.logWeeklyMutationAudit({
        context,
        user,
        reportId: null,
        status: 500,
        action: status === WeeklyReportStatus.SUBMITTED ? "SUBMIT" : "DRAFT",
        result: "FAILED",
        errorCode: "DB_WRITE_FAILED",
        content: error instanceof Error ? error.message.slice(0, 180) : "unknown db write failure",
      });
      throw new InternalServerErrorException("周报正式数据库写入失败，请稍后重试。");
    }
  }

  private async upsertWeeklyReportFromLegacyRecord(
    user: AuthenticatedUser,
    record: WeeklyWorkspaceRecord,
    status: LegacyWeeklyPersistStatus,
  ) {
    const period = this.resolveWeeklyReportPeriod(new Date(record.savedAt || Date.now()));
    const partition = this.recordPartition.resolveContext(user);
    const completedSummary = this.buildWeeklyCompletedSummary(record.reportDraft);
    const focusSummary = this.buildWeeklyFocusSummary(record.reportDraft);

    return this.prisma.weeklyReport.upsert({
      where: {
        userId_weekStartDate_partitionKey: {
          userId: user.id,
          weekStartDate: period.weekStartDate,
          partitionKey: partition.partitionKey,
        },
      },
      create: {
        userId: user.id,
        weekStartDate: period.weekStartDate,
        weekEndDate: period.weekEndDate,
        year: period.year,
        month: period.month,
        weekNumber: period.weekNumber,
        status,
        completedSummary,
        focusSummary,
        submittedAt: status === WeeklyReportStatus.SUBMITTED ? new Date() : null,
        dataScope: partition.dataScope,
        partitionKey: partition.partitionKey,
        testBatchId: partition.testBatchId,
        reviewItems: {
          create: this.buildWeeklyReviewItems(record.reportDraft),
        },
        planItems: {
          create: this.buildWeeklyPlanItems(record.reportDraft),
        },
      },
      update: {
        weekEndDate: period.weekEndDate,
        year: period.year,
        month: period.month,
        weekNumber: period.weekNumber,
        status,
        completedSummary,
        focusSummary,
        submittedAt: status === WeeklyReportStatus.SUBMITTED ? new Date() : undefined,
        reviewItems: {
          deleteMany: {},
          create: this.buildWeeklyReviewItems(record.reportDraft),
        },
        planItems: {
          deleteMany: {},
          create: this.buildWeeklyPlanItems(record.reportDraft),
        },
      },
      select: { id: true },
    });
  }

  private buildWeeklyCompletedSummary(draft: WeeklyReportDraft) {
    return this.compactWeeklyLines([
      this.normalizeOptionalText(draft.completed),
      this.normalizeOptionalText(draft.completedSummary),
      this.stringifyWeeklyCollection(draft.focusItems),
      this.stringifyWeeklyCollection(draft.carryItems),
      this.normalizeOptionalText(draft.learning) ? `学习复盘：${this.normalizeOptionalText(draft.learning)}` : "",
    ], "本周完成内容已保存。");
  }

  private buildWeeklyFocusSummary(draft: WeeklyReportDraft) {
    return this.compactWeeklyLines([
      this.normalizeOptionalText(draft.nextPlan),
      this.normalizeOptionalText(draft.nextPlans),
      this.normalizeOptionalText(draft.focusSummary),
      this.stringifyWeeklyCollection(draft.planItems),
      this.stringifyWeeklyCollection(draft.blockerItems),
      this.stringifyWeeklyValue(draft.supportRequest),
    ], "下周计划与协同请求已保存。");
  }

  private buildWeeklyReviewItems(draft: WeeklyReportDraft) {
    const blockerItems = Array.isArray(draft.blockerItems) ? draft.blockerItems : [];
    const items = blockerItems
      .map((item, index) => ({
        title: this.extractWeeklyItemTitle(item, `本周复盘 ${index + 1}`),
        description: this.stringifyWeeklyValue(item),
        status: WeeklyPlanReviewStatus.PENDING,
        sortOrder: index,
      }))
      .slice(0, 20);
    return items.length
      ? items
      : [{ title: "本周复盘", description: this.buildWeeklyCompletedSummary(draft), status: WeeklyPlanReviewStatus.PENDING, sortOrder: 0 }];
  }

  private buildWeeklyPlanItems(draft: WeeklyReportDraft) {
    const planItems = Array.isArray(draft.planItems) ? draft.planItems : [];
    const items = planItems
      .map((item, index) => ({
        title: this.extractWeeklyItemTitle(item, `下周计划 ${index + 1}`),
        description: this.stringifyWeeklyValue(item),
        plannedAt: null,
        sortOrder: index,
      }))
      .slice(0, 20);
    const nextPlan = this.normalizeOptionalText(draft.nextPlan) ?? this.normalizeOptionalText(draft.nextPlans);
    return items.length
      ? items
      : [{ title: "下周计划", description: nextPlan ?? this.buildWeeklyFocusSummary(draft), plannedAt: null, sortOrder: 0 }];
  }

  private extractWeeklyItemTitle(value: unknown, fallback: string) {
    if (this.isRecordObject(value)) {
      return this.normalizeOptionalText(value.title)
        ?? this.normalizeOptionalText(value.name)
        ?? this.normalizeOptionalText(value.summary)
        ?? fallback;
    }
    return this.normalizeOptionalText(value) ?? fallback;
  }

  private stringifyWeeklyCollection(value: unknown) {
    if (!Array.isArray(value)) return "";
    return value.map((item) => this.stringifyWeeklyValue(item)).filter(Boolean).join("\n");
  }

  private stringifyWeeklyValue(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return value.map((item) => this.stringifyWeeklyValue(item)).filter(Boolean).join("；");
    if (this.isRecordObject(value)) {
      return Object.entries(value)
        .filter(([key]) => !["id", "createdAt", "updatedAt"].includes(key))
        .map(([key, item]) => `${key}: ${this.stringifyWeeklyValue(item)}`)
        .filter((line) => !line.endsWith(": "))
        .join("；");
    }
    return "";
  }

  private compactWeeklyLines(lines: Array<string | null | undefined>, fallback: string) {
    const compacted = lines
      .map((line) => line?.trim() ?? "")
      .filter(Boolean)
      .slice(0, 12)
      .join("\n");
    return compacted || fallback;
  }

  private async applyLegacyBatchReviewToWeeklyReports(
    context: WeeklyMutationContext,
    user: AuthenticatedUser,
    kind: WeeklyBatchActionKind,
    memberNames: string[],
    note: string,
  ) {
    try {
      const period = this.resolveWeeklyReportPeriod();
      const partition = this.recordPartition.resolveContext(user);
      const nextStatus =
        kind === "approve"
          ? WeeklyReportStatus.APPROVED
          : kind === "return"
            ? WeeklyReportStatus.RETURNED
            : null;
      const targetUsers = nextStatus && memberNames.length
        ? await this.prisma.user.findMany({
            where: {
              OR: memberNames.flatMap((name) => ([
                { name: { contains: name } },
                { wecomName: { contains: name } },
                { loginAccount: { contains: name } },
              ])),
            },
            select: { id: true },
          })
        : [];
      const targetUserIds = targetUsers.map((item) => item.id);
      const result = nextStatus
        ? await this.prisma.weeklyReport.updateMany({
            where: {
              userId: { in: targetUserIds },
              weekStartDate: period.weekStartDate,
              partitionKey: partition.partitionKey,
              status: { in: [WeeklyReportStatus.SUBMITTED, WeeklyReportStatus.RETURNED, WeeklyReportStatus.APPROVED] },
            },
            data: {
              status: nextStatus,
              managerReviewedAt: new Date(),
              managerReviewedById: user.id,
              managerReviewComment: note,
            },
          })
        : { count: 0 };
      await this.logWeeklyMutationAudit({
        context,
        user,
        reportId: null,
        status: 200,
        action: kind === "approve" ? "APPROVE" : kind === "return" ? "RETURN" : "DRAFT",
        content: `legacy weekly batch-review updated=${result.count}`,
      });
    } catch (error) {
      await this.logWeeklyMutationAudit({
        context,
        user,
        reportId: null,
        status: 500,
        action: "REVIEW",
        result: "FAILED",
        errorCode: "DB_WRITE_FAILED",
        content: error instanceof Error ? error.message.slice(0, 180) : "unknown db write failure",
      });
      throw new InternalServerErrorException("周报批量审阅正式数据库写入失败，请稍后重试。");
    }
  }

  private async logWeeklyMutationAudit(input: {
    context: WeeklyMutationContext;
    user: AuthenticatedUser;
    reportId: string | null;
    status: number;
    action: string;
    result?: "SUCCESS" | "FAILED";
    errorCode?: string;
    content?: string;
  }) {
    const payload = {
      route: input.context.route,
      actorUserId: input.user.loginAccount ?? input.user.wecomUserId ?? input.user.id,
      canonicalUserKey: input.context.canonicalUserKey,
      rawUserKeyHash: input.context.rawUserKeyHash,
      reportId: input.reportId,
      status: input.status,
      errorCode: input.errorCode ?? null,
      ts: new Date().toISOString(),
    };

    await this.auditService.log({
      userId: input.user.id,
      action: input.action,
      module: "工作管理",
      targetType: "WeeklyReport",
      targetId: input.reportId ?? undefined,
      result: input.result ?? "SUCCESS",
      content: input.content,
      afterSummary: JSON.stringify(payload),
      source: "API",
    });
  }

  private buildWeeklySystemUser(): AuthenticatedUser {
    return {
      id: "weekly-reminder-system",
      name: "周报排程",
      loginAccount: "weekly-reminder",
      mobile: null,
      email: null,
      department: "系统",
      title: "周报排程",
      managerUserId: null,
      dataScope: DataScope.ALL,
      recordDataScope: RecordDataScope.REAL,
      testBatchId: null,
      roleCode: "SYSTEM",
      roleName: "系统",
      permissions: [],
      wecomUserId: null,
      wecomName: null,
      wecomAvatar: null,
    };
  }

  private normalizeWeeklyReminderNow(value: unknown) {
    if (typeof value !== "string" || !value.trim()) return new Date();
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : new Date();
  }

  private resolveRequestedWeeklyReminderMode(value: unknown): WeeklyReminderRunMode {
    if (value === "weekly_due" || value === "daily_missing") return value;
    if (!value || value === "auto") return "auto";
    throw new BadRequestException("未知周报提醒模式，请使用 auto、weekly_due 或 daily_missing。");
  }

  private resolveWeeklyReminderMode(mode: WeeklyReminderRunMode, now: Date): WeeklyReminderResolvedMode {
    if (mode === "weekly_due" || mode === "daily_missing") return mode;
    return now.getDay() === 5 ? "weekly_due" : "daily_missing";
  }

  private weeklyReminderModeLabel(mode: WeeklyReminderResolvedMode) {
    return mode === "weekly_due" ? "周五 10:00 提交提醒" : "未提交每日提醒";
  }

  private weeklyReminderLogTitle(mode: WeeklyReminderResolvedMode) {
    return mode === "weekly_due" ? "周报提交截止提醒" : "周报未提交每日提醒";
  }

  private buildDefaultWeeklyReminderDueAt(now: Date) {
    const dueAt = new Date(now);
    dueAt.setHours(18, 0, 0, 0);
    return dueAt.toISOString();
  }

  private weeklyTeamReportNeedsDailyMissingReminder(item: TeamWeeklyReportRecord) {
    return item.status !== "已提交";
  }

  private hasScheduledWeeklyReminderToday(
    item: TeamWeeklyReportRecord,
    mode: WeeklyReminderResolvedMode,
    now: Date,
  ) {
    const title = this.weeklyReminderLogTitle(mode);
    return this.getWeeklyReminderHistory(item).some((entry) => (
      entry.title === title && this.isSameCalendarDay(entry.timestamp, now)
    ));
  }

  private getWeeklyReminderHistory(item: TeamWeeklyReportRecord) {
    return Array.isArray(item.reminderHistory) ? item.reminderHistory : [];
  }

  private isSameCalendarDay(timestamp: number, anchor: Date) {
    const current = new Date(timestamp);
    return current.getFullYear() === anchor.getFullYear()
      && current.getMonth() === anchor.getMonth()
      && current.getDate() === anchor.getDate();
  }

  private normalizeWeeklyRecipientMap(value: unknown): Record<string, string> {
    if (!value) return {};

    let parsed: unknown = value;
    if (typeof value === "string") {
      const text = value.trim();
      if (!text) return {};

      try {
        parsed = JSON.parse(text);
      } catch {
        return Object.fromEntries(
          text
            .split(/[,\n]/)
            .map((item) => item.split("="))
            .map(([name, userid]) => [name?.trim(), userid?.trim()])
            .filter((item): item is [string, string] => Boolean(item[0] && item[1])),
        );
      }
    }

    if (!this.isRecordObject(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([name, userid]) => [name.trim(), typeof userid === "string" ? userid.trim() : ""])
        .filter((item): item is [string, string] => Boolean(item[0] && item[1])),
    );
  }

  private resolveWeeklyReminderRecipient(
    member: TeamWeeklyReportRecord,
    recipientMap: Record<string, string>,
  ) {
    const candidates = [
      member.name,
      member.name.toLowerCase(),
      member.name.toUpperCase(),
    ];
    for (const name of candidates) {
      const mappedUserid = recipientMap[name]?.trim() ?? "";
      if (this.isUsableWecomUserid(mappedUserid)) {
        return {
          userid: mappedUserid,
          source: "周报提醒映射",
        };
      }
    }

    return null;
  }

  private resolveWeeklySummaryRunMode(value: unknown): WeeklySummaryRunMode {
    if (value === "catch_up" || value === "manual") return value;
    return "scheduled";
  }

  private buildWeeklySummaryPeriodLabel(now: Date) {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  }

  private normalizeWeeklySummaryGroupIds(value: unknown): WeeklySummaryGroupId[] {
    const defaultIds: WeeklySummaryGroupId[] = ["core", "light_home", "all_leaders"];
    if (!Array.isArray(value)) return defaultIds;
    const ids = value.filter((item): item is WeeklySummaryGroupId => item === "core" || item === "light_home" || item === "all_leaders");
    return ids.length ? Array.from(new Set(ids)) : defaultIds;
  }

  private buildWeeklySummaryGroups(
    record: WeeklyWorkspaceRecord,
    groupIds: WeeklySummaryGroupId[],
    periodLabel: string,
  ): WeeklySummaryGroupInput[] {
    const coreMemberNames = ["lisa", "申琦", "阿蕊", "程程", "李瑶瑶"];
    const lightHomeMemberNames = ["雅南", "嘉敏", "许研", "了了", "杨慧敏"];
    const definitions: WeeklySummaryGroupInput[] = [
      {
        groupId: "core",
        groupName: "熊抱大地 / 道冲",
        memberNames: coreMemberNames,
        audienceNames: coreMemberNames,
        members: [],
        periodLabel,
      },
      {
        groupId: "light_home",
        groupName: "光的家园",
        memberNames: lightHomeMemberNames,
        audienceNames: ["雅南", "ZhenYaNan", "嘉敏", "许研", "了了", "杨慧敏"],
        members: [],
        periodLabel,
      },
      {
        groupId: "all_leaders",
        groupName: "全员周报总览",
        memberNames: [...coreMemberNames, ...lightHomeMemberNames],
        audienceNames: ["崔以达", "张涵予"],
        members: [],
        periodLabel,
      },
    ];
    const memberMap = new Map(record.teamReports.map((member) => [member.name, member]));
    return definitions
      .filter((definition) => groupIds.includes(definition.groupId))
      .map((definition) => ({
        ...definition,
        audienceNames: Array.from(new Set(definition.audienceNames)),
        members: definition.groupId === "all_leaders"
          ? record.teamReports
          : definition.memberNames
            .map((name) => memberMap.get(name))
            .filter((member): member is TeamWeeklyReportRecord => Boolean(member)),
      }))
      .filter((group) => group.members.length > 0);
  }

  private resolveWeeklySummaryRecipient(
    name: string,
    recipientMap: Record<string, string>,
  ) {
    const candidates = [name, name.toLowerCase(), name.toUpperCase()];
    for (const candidate of candidates) {
      const mappedUserid = recipientMap[candidate]?.trim() ?? "";
      if (this.isUsableWecomUserid(mappedUserid)) {
        return {
          userid: mappedUserid,
          source: "周报通知映射",
        };
      }
    }
    return null;
  }

  private weeklySubmittedMembers(group: WeeklySummaryGroupInput) {
    return group.members.filter((member) => member.status === "已提交");
  }

  private weeklyMissingMembers(group: WeeklySummaryGroupInput) {
    return group.members.filter((member) => member.status !== "已提交");
  }

  private weeklyPendingApprovalMembers(group: WeeklySummaryGroupInput) {
    const supervisorNames = new Set(["lisa", "程程", "雅南", "ZhenYaNan"]);
    return group.members.filter((member) =>
      member.status === "已提交" && supervisorNames.has(member.name) && member.review !== "已点评"
    );
  }

  private limitWeeklySummaryList(values: string[], limit: number, fallback: string) {
    const next = Array.from(new Set(values.map((item) => item.trim()).filter(Boolean))).slice(0, limit);
    return next.length ? next : [fallback];
  }

  private buildWeeklyFallbackSummary(group: WeeklySummaryGroupInput): WeeklySummaryModelOutput {
    const submitted = this.weeklySubmittedMembers(group);
    const missing = this.weeklyMissingMembers(group);
    const pendingApproval = this.weeklyPendingApprovalMembers(group);
    const usableMembers = submitted.length ? submitted : group.members;
    const keyActions = usableMembers.flatMap((member) =>
      member.nextPlans.map((plan) => `${member.name}：${plan}`)
    );
    const collaborationNeeds = usableMembers.flatMap((member) => [
      member.supportRequest ? `${member.name}：${member.supportRequest}` : "",
      member.blocker && member.blocker !== "无" ? `${member.name}：${member.blockerDetail || member.blocker}` : "",
    ]);
    const riskNotes = [
      missing.length ? `未提交：${missing.map((member) => member.name).join("、")}` : "",
      pendingApproval.length ? `待崔以达 / 张涵予确认后并入：${pendingApproval.map((member) => member.name).join("、")}` : "",
      ...group.members
        .filter((member) => member.review === "待补充" || member.review === "已退回修改")
        .map((member) => `${member.name}：${member.review}，${member.blocker || "需补充细节"}`),
    ];

    return {
      headline: `${group.groupName}${missing.length || pendingApproval.length ? "阶段性" : "完整"}周报汇总`,
      summary: `${group.periodLabel} ${group.groupName} 共 ${group.members.length} 人纳入汇总，已提交 ${submitted.length} 人，未提交 ${missing.length} 人。${pendingApproval.length ? `${pendingApproval.map((member) => member.name).join("、")} 的主管型内容仍需崔以达 / 张涵予确认后再作为正式汇总口径。` : "主管确认口径已满足当前汇总要求。"}下周重点围绕已提交周报中的负责人动作、协同请求和阻塞清理推进。`,
      keyActions: this.limitWeeklySummaryList(keyActions, 8, "补齐本周结果、确认下周动作，并同步到月目标跟进。"),
      collaborationNeeds: this.limitWeeklySummaryList(collaborationNeeds, 6, "请主管确认本周动作是否可纳入汇总，并补齐需要协作的问题。"),
      riskNotes: this.limitWeeklySummaryList(riskNotes, 6, "暂无新增风险，继续按下周计划推进。"),
    };
  }

  private buildOpenAiWeeklySummaryPayload(model: string, group: WeeklySummaryGroupInput) {
    return {
      model,
      input: [
        {
          role: "system",
          content: [
            "你是公司内部周报整理助手。",
            "请用简洁中文整理团队周报，突出下周行动、负责人、协同需求和风险。",
            "必须明确标注未提交成员，以及主管型内容里仍待崔以达 / 张涵予确认的成员。",
            "不要编造未出现在输入里的事实、数字或承诺。",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            periodLabel: group.periodLabel,
            groupName: group.groupName,
            members: group.members.map((member) => ({
              name: member.name,
              department: member.department,
              role: member.role,
              reportScope: this.normalizeOptionalText((member as { reportScope?: unknown }).reportScope) ?? member.department,
              status: member.status,
              review: member.review,
              summary: member.summary,
              highlights: member.highlights,
              blocker: member.blocker,
              blockerDetail: member.blockerDetail,
              nextPlans: member.nextPlans,
              supportRequest: member.supportRequest,
              managerDraft: member.managerDraft,
              lastComment: member.lastComment,
            })),
            missingNames: this.weeklyMissingMembers(group).map((member) => member.name),
            pendingApprovalNames: this.weeklyPendingApprovalMembers(group).map((member) => member.name),
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "weekly_summary",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["headline", "summary", "keyActions", "collaborationNeeds", "riskNotes"],
            properties: {
              headline: { type: "string" },
              summary: { type: "string" },
              keyActions: { type: "array", items: { type: "string" } },
              collaborationNeeds: { type: "array", items: { type: "string" } },
              riskNotes: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
      max_output_tokens: 4000,
    };
  }

  private collectOpenAiOutputText(value: unknown, results: string[] = []) {
    if (!value || typeof value !== "object") return results;
    if (Array.isArray(value)) {
      value.forEach((item) => this.collectOpenAiOutputText(item, results));
      return results;
    }
    const record = value as Record<string, unknown>;
    const text = this.normalizeOptionalText(record.text);
    if (text && (record.type === "output_text" || record.type === "text")) {
      results.push(text);
    }
    Object.values(record).forEach((item) => this.collectOpenAiOutputText(item, results));
    return results;
  }

  private extractOpenAiOutputText(payload: unknown) {
    if (this.isRecordObject(payload)) {
      const outputText = this.normalizeOptionalText(payload.output_text);
      if (outputText) return outputText;
    }
    return this.collectOpenAiOutputText(payload)[0] ?? "";
  }

  private parseOpenAiWeeklySummary(text: string): WeeklySummaryModelOutput | null {
    const normalized = text.trim();
    const candidates = [
      normalized,
      normalized.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim(),
    ];
    const firstBrace = normalized.indexOf("{");
    const lastBrace = normalized.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      candidates.push(normalized.slice(firstBrace, lastBrace + 1));
    }

    for (const candidate of Array.from(new Set(candidates)).filter(Boolean)) {
      const parsed = this.parseWeeklySummaryJson(candidate);
      if (parsed) return parsed;
    }

    return null;
  }

  private parseWeeklySummaryJson(text: string): WeeklySummaryModelOutput | null {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const headline = this.normalizeOptionalText(parsed.headline);
      const summary = this.normalizeOptionalText(parsed.summary);
      if (!headline || !summary) return null;
      return {
        headline,
        summary,
        keyActions: this.normalizeStringList(parsed.keyActions),
        collaborationNeeds: this.normalizeStringList(parsed.collaborationNeeds),
        riskNotes: this.normalizeStringList(parsed.riskNotes),
      };
    } catch {
      return null;
    }
  }

  private buildWeeklySummaryVersion(input: {
    group: WeeklySummaryGroupInput;
    output: WeeklySummaryModelOutput;
    model: string;
    generationMode: WeeklySummaryGenerationMode;
    warnings: string[];
    now: Date;
    createdBy: string;
  }): WeeklySummaryVersion {
    const missing = this.weeklyMissingMembers(input.group);
    const submitted = this.weeklySubmittedMembers(input.group);
    const pendingApproval = this.weeklyPendingApprovalMembers(input.group);
    const idSuffix = `${input.now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      id: `weekly-summary-${input.group.groupId}-${idSuffix}`,
      groupId: input.group.groupId,
      groupName: input.group.groupName,
      title: `${input.group.groupName} OpenAI 周报汇总`,
      headline: input.output.headline,
      periodLabel: input.group.periodLabel,
      status: missing.length || pendingApproval.length ? "stage" : "complete",
      summary: input.output.summary,
      keyActions: this.limitWeeklySummaryList(input.output.keyActions, 10, "补齐本周结果、确认下周动作，并同步到月目标跟进。"),
      collaborationNeeds: this.limitWeeklySummaryList(input.output.collaborationNeeds, 8, "请主管确认本周动作是否可纳入汇总，并补齐需要协作的问题。"),
      riskNotes: this.limitWeeklySummaryList(input.output.riskNotes, 8, "暂无新增风险，继续按下周计划推进。"),
      sourceMemberNames: input.group.members.map((member) => member.name),
      submittedNames: submitted.map((member) => member.name),
      missingNames: missing.map((member) => member.name),
      pendingApprovalNames: pendingApproval.map((member) => member.name),
      audienceNames: [...input.group.audienceNames],
      model: input.model,
      generationMode: input.generationMode,
      promptVersion: "weekly-summary-v1",
      createdAt: input.now.toISOString(),
      createdBy: input.createdBy,
      warnings: input.warnings,
    };
  }

  private resolveOpenAiWeeklySummaryBaseUrl() {
    return (
      this.normalizeOptionalText(process.env.OPENAI_WEEKLY_SUMMARY_BASE_URL) ??
      this.normalizeOptionalText(process.env.OPENAI_BASE_URL) ??
      this.normalizeOptionalText(process.env.OPENAI_API_BASE) ??
      this.normalizeOptionalText(process.env.OPENAI_API_BASE_URL) ??
      "https://api.openai.com/v1"
    ).replace(/\/+$/, "");
  }

  private resolveOpenAiWeeklySummaryResponsesUrl() {
    const baseUrl = this.resolveOpenAiWeeklySummaryBaseUrl();
    return baseUrl.endsWith("/responses") ? baseUrl : `${baseUrl}/responses`;
  }

  private resolveOpenAiWeeklySummaryProxyUrl(targetUrl: string) {
    const target = new URL(targetUrl);
    const noProxy = (process.env.NO_PROXY ?? process.env.no_proxy ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (noProxy.some((item) => (
      item === "*" ||
      item === target.hostname ||
      (item.startsWith(".") && target.hostname.endsWith(item)) ||
      target.hostname.endsWith(`.${item}`)
    ))) {
      return null;
    }
    const proxy = target.protocol === "https:"
      ? process.env.HTTPS_PROXY ?? process.env.https_proxy ?? process.env.HTTP_PROXY ?? process.env.http_proxy ?? process.env.ALL_PROXY ?? process.env.all_proxy
      : process.env.HTTP_PROXY ?? process.env.http_proxy ?? process.env.ALL_PROXY ?? process.env.all_proxy;
    return this.normalizeOptionalText(proxy);
  }

  private async generateWeeklySummaryVersion(
    group: WeeklySummaryGroupInput,
    options: { dryRun: boolean; strictOpenai: boolean; now: Date; createdBy: string },
  ): Promise<WeeklySummaryVersion> {
    const model = this.normalizeOptionalText(process.env.OPENAI_WEEKLY_SUMMARY_MODEL) ?? "gpt-5-mini";
    const apiKey = this.normalizeOptionalText(process.env.OPENAI_API_KEY);
    const envDryRun = process.env.OPENAI_WEEKLY_SUMMARY_DRY_RUN === "1" || process.env.OPENAI_WEEKLY_SUMMARY_DRY_RUN === "true";
    const forceDryRun = options.dryRun || envDryRun;
    if (forceDryRun || !apiKey) {
      if (!apiKey && options.strictOpenai) {
        throw new BadRequestException("OPENAI_API_KEY 未配置，严格模式已停止周报汇总。");
      }
      return this.buildWeeklySummaryVersion({
        group,
        output: this.buildWeeklyFallbackSummary(group),
        model,
        generationMode: forceDryRun ? "dry_run" : "fallback",
        warnings: [forceDryRun ? "OpenAI 周报汇总 dry-run：使用确定性摘要预览，未调用 OpenAI。" : "OPENAI_API_KEY 未配置：已使用确定性 fallback 摘要，未调用 OpenAI。"],
        now: options.now,
        createdBy: options.createdBy,
      });
    }

    try {
      const responsesUrl = this.resolveOpenAiWeeklySummaryResponsesUrl();
      const proxyUrl = this.resolveOpenAiWeeklySummaryProxyUrl(responsesUrl);
      const response = await undiciFetch(responsesUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.buildOpenAiWeeklySummaryPayload(model, group)),
        dispatcher: proxyUrl ? new ProxyAgent(proxyUrl) : undefined,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(`OpenAI 周报汇总失败：HTTP ${response.status} (${responsesUrl})`);
      }
      const output = this.parseOpenAiWeeklySummary(this.extractOpenAiOutputText(payload));
      if (!output) {
        throw new Error("OpenAI 周报汇总未返回可解析 JSON。");
      }
      return this.buildWeeklySummaryVersion({
        group,
        output,
        model,
        generationMode: "live",
        warnings: [],
        now: options.now,
        createdBy: options.createdBy,
      });
    } catch (error) {
      if (options.strictOpenai) throw error;
      const message = error instanceof Error ? error.message : "OpenAI 周报汇总调用失败。";
      return this.buildWeeklySummaryVersion({
        group,
        output: this.buildWeeklyFallbackSummary(group),
        model,
        generationMode: "fallback",
        warnings: [`${message} 已改用确定性 fallback 摘要。`],
        now: options.now,
        createdBy: options.createdBy,
      });
    }
  }

  private buildWeeklySummaryNoticeContent(version: WeeklySummaryVersion) {
    return [
      version.headline,
      "",
      version.summary,
      "",
      `未提交：${version.missingNames.length ? version.missingNames.join("、") : "无"}`,
      `待主管确认：${version.pendingApprovalNames.length ? version.pendingApprovalNames.join("、") : "无"}`,
      "",
      "下周重点：",
      ...version.keyActions.slice(0, 6).map((item) => `- ${item}`),
      "",
      "需要协同：",
      ...version.collaborationNeeds.slice(0, 4).map((item) => `- ${item}`),
      "",
      "风险提示：",
      ...version.riskNotes.slice(0, 4).map((item) => `- ${item}`),
    ].join("\n");
  }

  private buildWeeklyReminderText(member: TeamWeeklyReportRecord, mode: WeeklyReminderResolvedMode) {
    if (mode === "weekly_due") {
      return "请在今天下班前提交本周周报。";
    }

    if (member.status === "待提交") {
      return "你当前尚未提交本周周报，请今天补齐并提交。";
    }

    return "你当前还未完成本周周报提交，请今天处理并提交。";
  }

  private buildWeeklyReminderContent(member: TeamWeeklyReportRecord, mode: WeeklyReminderResolvedMode) {
    const scope = this.normalizeOptionalText((member as { reportScope?: unknown }).reportScope) ?? member.department;
    return [
      `${member.name}，${this.buildWeeklyReminderText(member, mode)}`,
      `周报范围：${scope}`,
      `当前状态：${member.status} · ${member.review}`,
      `当前阻塞：${member.blocker || "无"}`,
    ].join("\n");
  }

  private summarizeWecomActionResult(
    result: WecomActionResult | null | undefined,
    fallback = "企业微信动作未返回状态。",
  ) {
    if (!result) return fallback;
    const warning = result.warnings.find((item) => item.trim().length > 0);
    return result.ok === false && warning ? `${result.message} ${warning}` : result.message;
  }

  private resolveWecomActionTone(result: WecomActionResult | null | undefined): WeeklyTone {
    if (!result || result.ok === false) return "earth";
    return result.mode === "live" ? "forest" : "neutral";
  }

  private normalizeWecomTouser(value: unknown) {
    const touser = this.normalizeOptionalText(value);
    if (!touser) {
      throw new BadRequestException("企业微信接收人不能为空。");
    }
    if (touser === "@all") {
      throw new BadRequestException("当前生产通知不允许使用 @all。");
    }
    if (touser.length > 1024) {
      throw new BadRequestException("企业微信接收人过长。");
    }
    return touser;
  }

  private resolveWeeklyReminderUrl(value: unknown, origin?: string) {
    return this.resolveWecomActionUrl(
      this.normalizeOptionalText(value) ??
        this.normalizeOptionalText(process.env.WEEKLY_REPORT_URL) ??
        "/work-management/weekly-reports",
      origin,
    ) ?? "https://management.hui-health.com/work-management/weekly-reports";
  }

  private resolveWeeklySummaryUrl(value: unknown, origin?: string) {
    return this.resolveWecomActionUrl(
      this.normalizeOptionalText(value) ??
        this.normalizeOptionalText(process.env.WEEKLY_SUMMARY_URL) ??
        this.normalizeOptionalText(process.env.WEEKLY_REPORT_URL) ??
        "/work-management/weekly-reports?view=team&workspace=shared&summary=core&from=wecom-summary",
      origin,
    ) ?? "https://management.hui-health.com/work-management/weekly-reports?view=team&workspace=shared&summary=core&from=wecom-summary";
  }

  private resolveWecomActionUrl(value: unknown, origin?: string) {
    const rawUrl = this.normalizeOptionalText(value);
    if (!rawUrl) return undefined;

    const baseOrigin =
      this.normalizeOptionalText(origin) ??
      this.normalizeOptionalText(process.env.WECOM_PUBLIC_ORIGIN) ??
      "https://management.hui-health.com";
    const candidate = /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : `${baseOrigin.replace(/\/$/, "")}/${rawUrl.replace(/^\//, "")}`;

    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      throw new BadRequestException("企业微信通知链接不是有效 URL。");
    }

    const allowedHosts = new Set([
      "management.hui-health.com",
      "crm.hui-health.com",
      "work.weixin.qq.com",
    ]);
    if (!allowedHosts.has(parsed.hostname)) {
      throw new BadRequestException("企业微信通知链接域名不在允许范围内。");
    }

    return parsed.toString();
  }

  private formatWecomTextMessage(title: string, content: string) {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle) return trimmedContent;
    return trimmedContent.startsWith(`【${trimmedTitle}】`)
      ? trimmedContent
      : `【${trimmedTitle}】\n${trimmedContent}`;
  }

  private formatWecomCardDescription(content: string) {
    return content
      .trim()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
  }

  private createWecomDryRunResult(
    actionId: string,
    requestPayload: unknown,
    message: string,
  ): WecomActionResult | null {
    if (this.isWecomLiveReady()) return null;

    return {
      ok: true,
      mode: "dry_run",
      actionId,
      message,
      warnings: this.getWecomRuntimeWarnings(),
      requestPayload,
      createdAt: new Date().toISOString(),
    };
  }

  private createWecomFailureResult(
    actionId: string,
    requestPayload: unknown,
    error: unknown,
    message: string,
  ): WecomActionResult {
    return {
      ok: false,
      mode: "live",
      actionId,
      message,
      warnings: [
        error instanceof Error ? error.message : "未知错误",
        "请检查企业微信应用 Secret、可信 IP、应用可见范围、AgentId 与接收人 userid。",
      ],
      requestPayload,
      createdAt: new Date().toISOString(),
    };
  }

  private getWecomRuntimeWarnings() {
    const warnings: string[] = [];
    if (!this.normalizeOptionalText(process.env.WECOM_CORP_ID)) warnings.push("缺少 WECOM_CORP_ID。");
    if (!this.normalizeOptionalText(process.env.WECOM_AGENT_ID) && !this.normalizeOptionalText(process.env.WECOM_MANAGEMENT_AGENT_ID)) {
      warnings.push("缺少 WECOM_AGENT_ID。");
    }
    if (!this.normalizeOptionalText(process.env.WECOM_AGENT_SECRET) && !this.normalizeOptionalText(process.env.WECOM_SECRET) && !this.normalizeOptionalText(process.env.WECOM_MANAGEMENT_SECRET)) {
      warnings.push("缺少 WECOM_AGENT_SECRET。");
    }
    if (this.isWecomDryRunForced()) warnings.push("WECOM_DRY_RUN 已开启。");
    return warnings;
  }

  private isWecomLiveReady() {
    return Boolean(
      this.normalizeOptionalText(process.env.WECOM_CORP_ID) &&
      (this.normalizeOptionalText(process.env.WECOM_AGENT_ID) || this.normalizeOptionalText(process.env.WECOM_MANAGEMENT_AGENT_ID)) &&
      (this.normalizeOptionalText(process.env.WECOM_AGENT_SECRET) || this.normalizeOptionalText(process.env.WECOM_SECRET) || this.normalizeOptionalText(process.env.WECOM_MANAGEMENT_SECRET)) &&
      !this.isWecomDryRunForced(),
    );
  }

  private isWecomDryRunForced() {
    const value = this.normalizeOptionalText(process.env.WECOM_DRY_RUN)?.toLowerCase();
    return value === "1" || value === "true" || value === "yes";
  }

  private isUsableWecomUserid(userid?: string | null) {
    const text = userid?.trim();
    if (!text) return false;
    const normalized = text.toLowerCase();
    if (["office_admin", "finance_reviewer", "daochong_manager", "course_coordinator", "bearhug_manager", "admin", "test"].includes(normalized)) {
      return false;
    }
    return !/^(pilot-|example-|test-)/i.test(text);
  }

  private normalizeUserKey(value: unknown) {
    const userKey = this.normalizeOptionalText(value) ?? "shared";
    if (userKey.length > 160) {
      throw new BadRequestException("周报 workspace userKey 过长。");
    }
    return userKey;
  }

  private getWeeklyUserKey(value: unknown) {
    return this.normalizeUserKey(value);
  }

  private normalizeOptionalText(value: unknown) {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private isEmployeeDataDbBridgeDisabled() {
    const mode = this.normalizeOptionalText(process.env.EMPLOYEE_DATA_DB_BRIDGE_MODE)?.toLowerCase();
    return mode === "json-only" || mode === "disabled" || process.env.EMPLOYEE_DATA_DB_BRIDGE_DISABLED === "1";
  }

  private parseJsonValue(value: unknown): unknown {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private sha16(value: string) {
    return createHash("sha256").update(value).digest("hex").slice(0, 16);
  }

  private stableRecordId(prefix: string, ...parts: Array<string | null | undefined>) {
    return `${prefix}_${createHash("sha256").update(parts.filter(Boolean).join("|")).digest("hex").slice(0, 24)}`;
  }

  private dateFromUnknown(value: unknown): Date | null {
    if (value instanceof Date && Number.isFinite(value.getTime())) return value;
    const text = this.normalizeOptionalText(value);
    if (!text) return null;
    const parsed = new Date(text);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }

  private dateTimeToIso(value: Date | string | null | undefined) {
    const date = this.dateFromUnknown(value);
    return date ? date.toISOString() : null;
  }

  private dateTimeScore(value: Date | string | null | undefined) {
    const date = this.dateFromUnknown(value);
    return date ? date.getTime() : 0;
  }

  private parseRosterShiftTime(value: string | null) {
    if (!value || value === "休息") return { startTime: null, endTime: null };
    const match = value.match(/^(\d{1,2}:\d{2})\s*[-~—]\s*(\d{1,2}:\d{2})$/);
    if (!match) return { startTime: null, endTime: null };
    return { startTime: match[1], endTime: match[2] };
  }

  private normalizeStringList(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => this.normalizeOptionalText(item))
      .filter((item): item is string => Boolean(item));
  }

  private resolveWeeklyBatchActionKind(value: unknown): WeeklyBatchActionKind | null {
    return value === "save_draft" || value === "approve" || value === "return"
      ? value
      : null;
  }

  private isRecordObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  private createWeeklyActivityLogEntry(
    title: string,
    description: string,
    options: { tone?: WeeklyTone; timestamp?: number } = {},
  ): WeeklyActivityLogEntry {
    const timestamp = options.timestamp ?? Date.now();
    return {
      id: this.createRecordId("weekly-log"),
      time: this.formatWorkspaceTimestamp(new Date(timestamp)),
      timestamp,
      title,
      description,
      tone: options.tone,
    };
  }

  private createRecordId(prefix: string) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private formatWorkspaceTimestamp(date: Date) {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Shanghai",
    }).format(date);
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
