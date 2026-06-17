import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";

const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const NOTIFY_STATUSES = new Set(["sent", "preview", "skipped", "failed"]);

type JsonRecord = Record<string, unknown>;
type PayrollIdentityCandidates = {
  teacherIds: string[];
  userIds: string[];
  wecomUserIds: string[];
  loginAccounts: string[];
  nameHints: string[];
};

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async syncSalarySlips(input: unknown, user: AuthenticatedUser) {
    this.assertCanMaintainPayroll(user);
    const body = this.asRecord(input);
    const month = this.requiredMonth(body.month, "薪资条同步缺少月份。");
    const source = body.source === "wecom" ? "wecom" : "manual_import";
    const syncedBy = this.optionalText(body.syncedBy) ?? user.name ?? "财务";
    const publishBatchId = this.optionalText(body.publishBatchId)
      ?? `salary-publish-${month}-${Date.now()}`;
    const rawItems = Array.isArray(body.items) ? body.items : [];
    const syncedAt = new Date();
    const slipsByTeacherId = new Map<string, Prisma.SalarySlipCreateManyInput>();
    const missingIdentityRows: string[] = [];
    const warnings: string[] = [];

    if (rawItems.length === 0) {
      throw new BadRequestException("薪资条同步至少需要一条明细。");
    }

    rawItems.forEach((rawItem, index) => {
      const item = this.asRecord(rawItem);
      const teacherName = this.optionalText(item.teacherName) ?? `老师${index + 1}`;
      const userId = this.firstText(item, ["userId", "employeeUserId", "systemUserId"]);
      const wecomUserId = this.firstText(item, ["wecomUserId", "wecomUserid", "userid", "wecom_userid"]);
      const loginAccount = this.firstText(item, ["loginAccount", "login", "account", "username"]);
      const rawTeacherId = this.firstText(item, ["teacherId", "employeeId", "staffId"]);
      const hasExplicitIdentity = Boolean(rawTeacherId || userId || wecomUserId || loginAccount);
      const teacherId = rawTeacherId ?? wecomUserId ?? loginAccount ?? userId ?? `teacher-${teacherName}`;
      if (slipsByTeacherId.has(teacherId)) {
        warnings.push(`重复薪资条已按最后一条覆盖：${teacherName} / ${teacherId}`);
      }
      if (!hasExplicitIdentity) {
        missingIdentityRows.push(`第 ${index + 1} 行 ${teacherName}`);
      }
      const grossAmount = this.payrollAmount(item.grossAmount, 0, "应发", teacherName);
      const commissionAmount = this.optionalPayrollAmount(item.commissionAmount, "提成", teacherName);
      const profitSharingAmount = this.optionalPayrollAmount(item.profitSharingAmount, "分润", teacherName);
      const deductionAmount = this.payrollAmount(item.deductionAmount, 0, "扣款", teacherName);
      const netAmount = this.payrollAmount(item.netAmount, grossAmount, "实发", teacherName);
      this.appendAmountWarnings(warnings, {
        teacherName,
        grossAmount,
        commissionAmount,
        profitSharingAmount,
        deductionAmount,
        netAmount,
      });
      slipsByTeacherId.set(teacherId, {
        id: this.optionalText(item.id) ?? this.defaultSalarySlipId(month, publishBatchId, teacherId),
        month,
        publishBatchId,
        teacherId,
        teacherName,
        userId,
        wecomUserId,
        loginAccount,
        grossAmount,
        commissionAmount,
        profitSharingAmount,
        deductionAmount,
        netAmount,
        source,
        sourceLabel: this.optionalText(item.sourceLabel),
        settlementId: this.optionalText(item.settlementId),
        syncedBy,
        syncedAt,
        createdAt: syncedAt,
        updatedAt: syncedAt,
      });
    });

    if (missingIdentityRows.length > 0) {
      throw new BadRequestException(
        `薪资条同步存在缺少明确员工身份的明细：${missingIdentityRows.join("、")}。请提供 teacherId、userId、wecomUserId 或 loginAccount。`,
      );
    }

    const slips = Array.from(slipsByTeacherId.values());
    const teacherIds = slips.map((item) => item.teacherId);
    let deletedCount = 0;
    let insertedCount = 0;

    if (slips.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        const deleted = await tx.salarySlip.deleteMany({
          where: {
            month,
            publishBatchId,
            teacherId: { in: teacherIds },
          },
        });
        const inserted = await tx.salarySlip.createMany({ data: slips });
        deletedCount = deleted.count;
        insertedCount = inserted.count;
      });
    }

    return {
      ok: true,
      createdCount: Math.max(insertedCount - deletedCount, 0),
      updatedCount: deletedCount,
      skippedCount: Math.max(rawItems.length - slips.length, 0),
      teacherIds,
      publishBatchId,
      warnings,
    };
  }

  async getMySalarySlips(user: AuthenticatedUser) {
    const candidates = this.getPayrollIdentityCandidates(user);
    const identityWhere = this.buildMySalarySlipWhere(candidates);
    if (!identityWhere) {
      return {
        data: [],
        warnings: candidates.nameHints.length > 0
          ? ["当前账号缺少明确身份字段，薪资条不会按姓名授权查询，请联系财务补充员工映射。"]
          : [],
      };
    }

    const slips = await this.prisma.salarySlip.findMany({
      where: identityWhere,
      orderBy: [
        { month: "desc" },
        { syncedAt: "desc" },
      ],
    });

    return {
      data: slips.map((slip) => this.serializeSalarySlip(slip)),
    };
  }

  async listSalarySlips(input: unknown, user: AuthenticatedUser) {
    this.assertCanMaintainPayroll(user);
    const body = this.asRecord(input);
    const month = this.optionalText(body.month);
    const publishBatchId = this.optionalText(body.publishBatchId);
    const teacherId = this.optionalText(body.teacherId);
    const userId = this.optionalText(body.userId);
    const wecomUserId = this.optionalText(body.wecomUserId);
    const loginAccount = this.optionalText(body.loginAccount);
    const limit = this.optionalPositiveInteger(body.limit, 500, 2000);
    const where: Prisma.SalarySlipWhereInput = {};

    if (month) {
      where.month = this.requiredMonth(month, "薪资条月份必须为 YYYY-MM。");
    }
    if (publishBatchId) {
      where.publishBatchId = publishBatchId;
    }
    if (teacherId) {
      where.teacherId = teacherId;
    }
    if (userId) {
      where.userId = userId;
    }
    if (wecomUserId) {
      where.wecomUserId = wecomUserId;
    }
    if (loginAccount) {
      where.loginAccount = loginAccount;
    }
    if (Object.keys(where).length === 0) {
      throw new BadRequestException("查询薪资条至少需要月份、发布批次或明确员工身份条件。");
    }

    const slips = await this.prisma.salarySlip.findMany({
      where,
      orderBy: [
        { month: "desc" },
        { syncedAt: "desc" },
        { teacherName: "asc" },
      ],
      take: limit,
    });

    return {
      data: slips.map((slip) => this.serializeSalarySlip(slip)),
      filters: {
        month: month ?? undefined,
        publishBatchId: publishBatchId ?? undefined,
        teacherId: teacherId ?? undefined,
        userId: userId ?? undefined,
        wecomUserId: wecomUserId ?? undefined,
        loginAccount: loginAccount ?? undefined,
        limit,
      },
    };
  }

  async recordSalaryNotifyLog(input: unknown, user: AuthenticatedUser) {
    this.assertCanMaintainPayroll(user);
    const body = this.asRecord(input);
    const month = this.requiredMonth(body.month, "薪资通知记录缺少月份。");
    const actionLabel = this.optionalText(body.actionLabel);
    const message = this.optionalText(body.message);
    const publishBatchId = this.optionalText(body.publishBatchId)
      ?? await this.inferSinglePublishBatchId(month);

    if (!actionLabel || !message) {
      throw new BadRequestException("薪资通知记录缺少动作或说明。");
    }
    if (!publishBatchId) {
      throw new BadRequestException("薪资通知记录缺少发布批次号。");
    }

    const id = this.optionalText(body.id) ?? this.defaultSalaryNotifyLogId(month, publishBatchId);
    const data = {
      month,
      at: this.optionalDate(body.at) ?? new Date(),
      actionLabel,
      modeLabel: this.optionalText(body.modeLabel) ?? "企业微信预览",
      publishBatchId,
      status: this.normalizeNotifyStatus(body.status),
      tone: this.optionalText(body.tone),
      message,
      delivered: this.normalizeNotifyPeople(body.delivered),
      skipped: this.normalizeNotifyPeople(body.skipped),
      failed: this.normalizeNotifyPeople(body.failed),
      notifyUrl: this.optionalText(body.notifyUrl),
      createdBy: this.optionalText(body.createdBy) ?? user.name ?? "财务",
    };

    await this.prisma.salaryNotifyLog.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });

    return { ok: true, publishBatchId: data.publishBatchId };
  }

  async listSalaryNotifyLogs(input: unknown, user: AuthenticatedUser) {
    this.assertCanMaintainPayroll(user);
    const body = this.asRecord(input);
    const month = this.optionalText(body.month);
    const publishBatchId = this.optionalText(body.publishBatchId);
    const limit = this.optionalPositiveInteger(body.limit, 240, 1000);
    const where: Prisma.SalaryNotifyLogWhereInput = {};

    if (month) {
      where.month = this.requiredMonth(month, "薪资通知记录月份必须为 YYYY-MM。");
    }
    if (publishBatchId) {
      where.publishBatchId = publishBatchId;
    }
    if (Object.keys(where).length === 0) {
      throw new BadRequestException("查询薪资通知记录至少需要月份或发布批次条件。");
    }

    const logs = await this.prisma.salaryNotifyLog.findMany({
      where,
      orderBy: [
        { createdAt: "desc" },
        { at: "desc" },
      ],
      take: limit,
    });

    return {
      data: logs.map((log) => this.serializeSalaryNotifyLog(log)),
      filters: {
        month: month ?? undefined,
        publishBatchId: publishBatchId ?? undefined,
        limit,
      },
    };
  }

  async getPayrollDraftBatch(monthInput: string, user: AuthenticatedUser) {
    this.assertCanMaintainPayroll(user);
    const month = this.requiredMonth(monthInput, "薪资草稿月份必须为 YYYY-MM。");
    const batch = await this.prisma.payrollDraftBatch.findUnique({
      where: { month },
    });

    return batch ? this.serializePayrollDraftBatch(batch) : null;
  }

  async savePayrollDraftBatch(monthInput: string, input: unknown, user: AuthenticatedUser) {
    this.assertCanMaintainPayroll(user);
    const month = this.requiredMonth(monthInput, "薪资草稿月份必须为 YYYY-MM。");
    const body = this.asRecord(input);
    const saved = await this.prisma.payrollDraftBatch.upsert({
      where: { month },
      create: {
        month,
        publishBatchId: this.optionalText(body.publishBatchId),
        drafts: this.toInputJsonValue(this.isRecord(body.drafts) ? body.drafts : {}),
        publishedAt: this.optionalDate(body.publishedAt),
        notifyStatus: this.optionalText(body.notifyStatus),
        excelReviewedAt: this.optionalDate(body.excelReviewedAt),
        updatedBy: this.optionalText(body.updatedBy) ?? user.name ?? "财务",
      },
      update: {
        publishBatchId: this.optionalText(body.publishBatchId),
        drafts: this.toInputJsonValue(this.isRecord(body.drafts) ? body.drafts : {}),
        publishedAt: this.optionalDate(body.publishedAt),
        notifyStatus: this.optionalText(body.notifyStatus),
        excelReviewedAt: this.optionalDate(body.excelReviewedAt),
        updatedBy: this.optionalText(body.updatedBy) ?? user.name ?? "财务",
      },
    });
    await this.prunePayrollDraftBatches();

    return this.serializePayrollDraftBatch(saved);
  }

  async listWorkspacePayrollState(user: AuthenticatedUser) {
    if (!this.canMaintainPayroll(user)) {
      return {
        salarySlips: [],
        salaryNotifyLogs: [],
        payrollDraftBatches: [],
      };
    }

    const [salarySlips, notifyLogs, draftBatches] = await Promise.all([
      this.prisma.salarySlip.findMany({
        orderBy: [
          { month: "desc" },
          { syncedAt: "desc" },
        ],
        take: 500,
      }),
      this.prisma.salaryNotifyLog.findMany({
        orderBy: [
          { createdAt: "desc" },
          { at: "desc" },
        ],
        take: 240,
      }),
      this.prisma.payrollDraftBatch.findMany({
        orderBy: [
          { month: "desc" },
          { updatedAt: "desc" },
        ],
        take: 36,
      }),
    ]);

    return {
      salarySlips: salarySlips.map((slip) => this.serializeSalarySlip(slip)),
      salaryNotifyLogs: notifyLogs.map((log) => this.serializeSalaryNotifyLog(log)),
      payrollDraftBatches: draftBatches.map((batch) => this.serializePayrollDraftBatch(batch)),
    };
  }

  private assertCanMaintainPayroll(user: AuthenticatedUser) {
    if (!this.canMaintainPayroll(user)) {
      throw new ForbiddenException("当前账号无权维护薪资条。");
    }
  }

  private canMaintainPayroll(user: AuthenticatedUser) {
    const roleCode = user.roleCode?.toUpperCase();
    if (roleCode === "SUPER_ADMIN" || roleCode === "ADMIN" || roleCode === "FINANCE") {
      return true;
    }
    if (user.permissions.includes("action.payroll.publish")) {
      return true;
    }
    return false;
  }

  private getPayrollIdentityCandidates(user: AuthenticatedUser): PayrollIdentityCandidates {
    const teacherIds = new Set<string>();
    const userIds = new Set<string>();
    const wecomUserIds = new Set<string>();
    const loginAccounts = new Set<string>();
    const nameHints = new Set<string>();

    this.addIdentityCandidate(userIds, user.id);
    this.addIdentityCandidate(teacherIds, user.id);

    this.addIdentityCandidate(loginAccounts, user.loginAccount);
    this.addIdentityCandidate(teacherIds, user.loginAccount);

    this.addIdentityCandidate(wecomUserIds, user.wecomUserId);
    this.addIdentityCandidate(teacherIds, user.wecomUserId);

    this.addIdentityCandidate(nameHints, user.name);
    this.addIdentityCandidate(nameHints, user.wecomName);

    const mappedIdentity = this.getMappedEmployeeIdentity(user.wecomUserId);
    if (mappedIdentity) {
      [
        "userid",
        "userId",
        "username",
        "identityId",
        "employeeId",
      ].forEach((key) => {
        this.addIdentityCandidate(teacherIds, mappedIdentity[key]);
      });
      this.addIdentityCandidate(userIds, mappedIdentity.userId);
      this.addIdentityCandidate(userIds, mappedIdentity.identityId);
      this.addIdentityCandidate(userIds, mappedIdentity.employeeUserId);
      this.addIdentityCandidate(userIds, mappedIdentity.systemUserId);
      this.addIdentityCandidate(userIds, mappedIdentity.userid);
      this.addIdentityCandidate(wecomUserIds, mappedIdentity.wecomUserId);
      this.addIdentityCandidate(wecomUserIds, mappedIdentity.userid);
      this.addIdentityCandidate(loginAccounts, mappedIdentity.loginAccount);
      this.addIdentityCandidate(loginAccounts, mappedIdentity.username);

      [
        "name",
        "displayName",
        "employeeName",
        "wecomName",
      ].forEach((key) => {
        this.addIdentityCandidate(nameHints, mappedIdentity[key]);
      });
    }

    return {
      teacherIds: Array.from(teacherIds),
      userIds: Array.from(userIds),
      wecomUserIds: Array.from(wecomUserIds),
      loginAccounts: Array.from(loginAccounts),
      nameHints: Array.from(nameHints),
    };
  }

  private buildMySalarySlipWhere(candidates: PayrollIdentityCandidates): Prisma.SalarySlipWhereInput | null {
    const or: Prisma.SalarySlipWhereInput[] = [];
    if (candidates.teacherIds.length > 0) {
      or.push({ teacherId: { in: candidates.teacherIds } });
    }
    if (candidates.userIds.length > 0) {
      or.push({ userId: { in: candidates.userIds } });
    }
    if (candidates.wecomUserIds.length > 0) {
      or.push({ wecomUserId: { in: candidates.wecomUserIds } });
    }
    if (candidates.loginAccounts.length > 0) {
      or.push({ loginAccount: { in: candidates.loginAccounts } });
    }

    return or.length > 0 ? { OR: or } : null;
  }

  private getMappedEmployeeIdentity(wecomUserId?: string | null) {
    const trimmedUserId = this.optionalText(wecomUserId);
    const raw = process.env.WECOM_EMPLOYEE_IDENTITY_MAP?.trim();
    if (!trimmedUserId || !raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!this.isRecord(parsed)) {
        return null;
      }
      const entry = parsed[trimmedUserId];
      return this.isRecord(entry) ? entry : null;
    } catch {
      return null;
    }
  }

  private addIdentityCandidate(candidates: Set<string>, value: unknown) {
    const text = this.optionalText(value);
    if (text) {
      candidates.add(text);
    }
  }

  private async prunePayrollDraftBatches() {
    const stale = await this.prisma.payrollDraftBatch.findMany({
      select: { month: true },
      orderBy: [
        { month: "desc" },
        { updatedAt: "desc" },
      ],
      skip: 36,
    });
    if (stale.length > 0) {
      await this.prisma.payrollDraftBatch.deleteMany({
        where: { month: { in: stale.map((item) => item.month) } },
      });
    }
  }

  private async inferSinglePublishBatchId(month: string) {
    const slips = await this.prisma.salarySlip.findMany({
      where: {
        month,
        publishBatchId: { not: null },
      },
      select: { publishBatchId: true },
      orderBy: [{ syncedAt: "desc" }],
      take: 200,
    });
    const publishBatchIds = Array.from(new Set(slips
      .map((slip) => this.optionalText(slip.publishBatchId))
      .filter((item): item is string => Boolean(item))));
    if (publishBatchIds.length === 1) {
      return publishBatchIds[0];
    }
    if (publishBatchIds.length > 1) {
      throw new BadRequestException("薪资通知记录缺少发布批次号，且当月存在多个发布批次。");
    }
    return undefined;
  }

  private requiredMonth(value: unknown, message: string) {
    const month = this.optionalText(value);
    if (!month || !MONTH_PATTERN.test(month)) {
      throw new BadRequestException(message);
    }
    return month;
  }

  private optionalText(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private firstText(record: JsonRecord, keys: string[]) {
    for (const key of keys) {
      const text = this.optionalText(record[key]);
      if (text) {
        return text;
      }
    }
    return undefined;
  }

  private decimalAmount(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private optionalDecimalAmount(value: unknown) {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    return this.decimalAmount(value);
  }

  private payrollAmount(value: unknown, fallback: number, fieldLabel: string, teacherName: string) {
    if (value === undefined || value === null || value === "") {
      return fallback;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(`薪资条金额不是有效数字：${teacherName} / ${fieldLabel}。`);
    }
    return parsed;
  }

  private optionalPayrollAmount(value: unknown, fieldLabel: string, teacherName: string) {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    return this.payrollAmount(value, 0, fieldLabel, teacherName);
  }

  private appendAmountWarnings(warnings: string[], input: {
    teacherName: string;
    grossAmount: number;
    commissionAmount?: number;
    profitSharingAmount?: number;
    deductionAmount: number;
    netAmount: number;
  }) {
    const amountEntries = [
      ["应发", input.grossAmount],
      ["提成", input.commissionAmount],
      ["分润", input.profitSharingAmount],
      ["扣款", input.deductionAmount],
      ["实发", input.netAmount],
    ] as const;
    amountEntries.forEach(([label, amount]) => {
      if (amount !== undefined && amount < 0) {
        warnings.push(`金额异常需复核：${input.teacherName} / ${label} 为负数。`);
      }
    });

    const expectedNet = input.grossAmount
      + (input.commissionAmount ?? 0)
      + (input.profitSharingAmount ?? 0)
      - input.deductionAmount;
    if (Math.abs(input.netAmount - expectedNet) > 0.01) {
      warnings.push(`金额异常需复核：${input.teacherName} / 实发与应发、提成、分润、扣款合计不一致。`);
    }
  }

  private optionalDate(value: unknown) {
    const text = this.optionalText(value);
    if (!text) {
      return undefined;
    }

    const withTimezone = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(text)
      ? `${text.replace(" ", "T")}+08:00`
      : text;
    const date = new Date(withTimezone);

    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private optionalPositiveInteger(value: unknown, fallback: number, max: number) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }
    return Math.min(parsed, max);
  }

  private defaultSalarySlipId(month: string, publishBatchId: string, teacherId: string) {
    const safeTeacherId = teacherId
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "teacher";
    const digest = createHash("sha1").update(`${month}:${publishBatchId}:${teacherId}`).digest("hex").slice(0, 16);
    return `salary-slip-${month}-${safeTeacherId}-${digest}`;
  }

  private defaultSalaryNotifyLogId(month: string, publishBatchId: string) {
    const safePublishBatchId = publishBatchId
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "publish-batch";
    return `salary-notify-log-${month}-${safePublishBatchId}-${randomUUID().slice(0, 8)}`;
  }

  private normalizeNotifyStatus(value: unknown) {
    const status = this.optionalText(value);
    return status && NOTIFY_STATUSES.has(status) ? status : "preview";
  }

  private normalizeNotifyPeople(value: unknown) {
    const people = Array.isArray(value)
      ? value.map((item, index) => {
          const person = this.asRecord(item);
          return {
            id: this.optionalText(person.id) ?? `notify-person-${index + 1}`,
            name: this.optionalText(person.name) ?? "未命名",
            department: this.optionalText(person.department) ?? "未分组",
            role: this.optionalText(person.role) ?? "成员",
            userid: this.optionalText(person.userid),
            netAmount: this.decimalAmount(person.netAmount),
            reason: this.optionalText(person.reason),
          };
        })
      : [];

    return this.toInputJsonValue(people);
  }

  private serializeSalarySlip(slip: {
    id: string;
    month: string;
    publishBatchId: string | null;
    teacherId: string;
    teacherName: string;
    userId: string | null;
    wecomUserId: string | null;
    loginAccount: string | null;
    grossAmount: Prisma.Decimal;
    commissionAmount: Prisma.Decimal | null;
    profitSharingAmount: Prisma.Decimal | null;
    deductionAmount: Prisma.Decimal;
    netAmount: Prisma.Decimal;
    source: string;
    sourceLabel: string | null;
    settlementId: string | null;
    syncedBy: string;
    syncedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: slip.id,
      month: slip.month,
      publishBatchId: slip.publishBatchId ?? undefined,
      teacherId: slip.teacherId,
      teacherName: slip.teacherName,
      userId: slip.userId ?? undefined,
      wecomUserId: slip.wecomUserId ?? undefined,
      loginAccount: slip.loginAccount ?? undefined,
      grossAmount: Number(slip.grossAmount),
      commissionAmount: slip.commissionAmount === null ? undefined : Number(slip.commissionAmount),
      profitSharingAmount: slip.profitSharingAmount === null ? undefined : Number(slip.profitSharingAmount),
      deductionAmount: Number(slip.deductionAmount),
      netAmount: Number(slip.netAmount),
      source: slip.source,
      sourceLabel: slip.sourceLabel ?? undefined,
      settlementId: slip.settlementId ?? undefined,
      syncedBy: slip.syncedBy,
      syncedAt: slip.syncedAt.toISOString(),
      createdAt: slip.createdAt.toISOString(),
      updatedAt: slip.updatedAt.toISOString(),
    };
  }

  private serializeSalaryNotifyLog(log: {
    id: string;
    month: string;
    publishBatchId: string | null;
    at: Date;
    actionLabel: string;
    modeLabel: string;
    status: string;
    tone: string | null;
    message: string;
    delivered: Prisma.JsonValue;
    skipped: Prisma.JsonValue;
    failed: Prisma.JsonValue;
    notifyUrl: string | null;
    createdBy: string;
    createdAt: Date;
  }) {
    return {
      id: log.id,
      month: log.month,
      publishBatchId: log.publishBatchId ?? undefined,
      at: log.at.toISOString(),
      actionLabel: log.actionLabel,
      modeLabel: log.modeLabel,
      status: log.status,
      tone: log.tone ?? undefined,
      message: log.message,
      delivered: Array.isArray(log.delivered) ? log.delivered : [],
      skipped: Array.isArray(log.skipped) ? log.skipped : [],
      failed: Array.isArray(log.failed) ? log.failed : [],
      notifyUrl: log.notifyUrl ?? undefined,
      createdBy: log.createdBy,
      createdAt: log.createdAt.toISOString(),
    };
  }

  private serializePayrollDraftBatch(batch: {
    month: string;
    publishBatchId: string | null;
    drafts: Prisma.JsonValue;
    publishedAt: Date | null;
    notifyStatus: string | null;
    excelReviewedAt: Date | null;
    updatedBy: string;
    updatedAt: Date;
    createdAt: Date;
  }) {
    return {
      month: batch.month,
      publishBatchId: batch.publishBatchId ?? null,
      drafts: this.isRecord(batch.drafts) ? batch.drafts : {},
      publishedAt: batch.publishedAt?.toISOString() ?? null,
      notifyStatus: batch.notifyStatus,
      excelReviewedAt: batch.excelReviewedAt?.toISOString() ?? null,
      updatedBy: batch.updatedBy,
      updatedAt: batch.updatedAt.toISOString(),
      createdAt: batch.createdAt.toISOString(),
    };
  }

  private asRecord(value: unknown): JsonRecord {
    return this.isRecord(value) ? value : {};
  }

  private isRecord(value: unknown): value is JsonRecord {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  private toInputJsonValue(value: unknown) {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }
}
