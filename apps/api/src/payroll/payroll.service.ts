import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";

const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const NOTIFY_STATUSES = new Set(["sent", "preview", "skipped", "failed"]);
const PAYROLL_WRITE_PERMISSION = "action.management.member.update";

type JsonRecord = Record<string, unknown>;

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async syncSalarySlips(input: unknown, user: AuthenticatedUser) {
    this.assertCanMaintainPayroll(user);
    const body = this.asRecord(input);
    const month = this.requiredMonth(body.month, "薪资条同步缺少月份。");
    const source = body.source === "wecom" ? "wecom" : "manual_import";
    const syncedBy = this.optionalText(body.syncedBy) ?? user.name ?? "财务";
    const rawItems = Array.isArray(body.items) ? body.items : [];
    const syncedAt = new Date();
    const slipsByTeacherId = new Map<string, Prisma.SalarySlipCreateManyInput>();

    rawItems.forEach((rawItem, index) => {
      const item = this.asRecord(rawItem);
      const teacherName = this.optionalText(item.teacherName) ?? `老师${index + 1}`;
      const teacherId = this.optionalText(item.teacherId) ?? `teacher-${teacherName}`;
      slipsByTeacherId.set(teacherId, {
        id: this.optionalText(item.id) ?? `salary-slip-${month}-${index + 1}`,
        month,
        teacherId,
        teacherName,
        grossAmount: this.decimalAmount(item.grossAmount),
        commissionAmount: this.optionalDecimalAmount(item.commissionAmount),
        profitSharingAmount: this.optionalDecimalAmount(item.profitSharingAmount),
        deductionAmount: this.decimalAmount(item.deductionAmount),
        netAmount: this.decimalAmount(item.netAmount ?? item.grossAmount),
        source,
        sourceLabel: this.optionalText(item.sourceLabel),
        settlementId: this.optionalText(item.settlementId),
        syncedBy,
        syncedAt,
        createdAt: syncedAt,
        updatedAt: syncedAt,
      });
    });

    const slips = Array.from(slipsByTeacherId.values());
    const teacherIds = slips.map((item) => item.teacherId);

    if (slips.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        await tx.salarySlip.deleteMany({
          where: {
            month,
            teacherId: { in: teacherIds },
          },
        });
        await tx.salarySlip.createMany({ data: slips });
      });
    }

    return { ok: true };
  }

  async getMySalarySlips(user: AuthenticatedUser) {
    const candidates = this.getPayrollIdentityCandidates(user);
    if (candidates.size === 0) {
      return { data: [] };
    }

    const slips = await this.prisma.salarySlip.findMany({
      orderBy: [
        { month: "desc" },
        { syncedAt: "desc" },
      ],
    });

    return {
      data: slips
        .filter((slip) => (
          candidates.has(this.normalizeIdentityText(slip.teacherId))
          || candidates.has(this.normalizeIdentityText(slip.teacherName))
        ))
        .map((slip) => this.serializeSalarySlip(slip)),
    };
  }

  async recordSalaryNotifyLog(input: unknown, user: AuthenticatedUser) {
    this.assertCanMaintainPayroll(user);
    const body = this.asRecord(input);
    const month = this.requiredMonth(body.month, "薪资通知记录缺少月份。");
    const actionLabel = this.optionalText(body.actionLabel);
    const message = this.optionalText(body.message);

    if (!actionLabel || !message) {
      throw new BadRequestException("薪资通知记录缺少动作或说明。");
    }

    const id = this.optionalText(body.id) ?? `salary-notify-log-${month}-${Date.now()}`;
    const data = {
      month,
      at: this.optionalDate(body.at) ?? new Date(),
      actionLabel,
      modeLabel: this.optionalText(body.modeLabel) ?? "企业微信预览",
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
    await this.pruneSalaryNotifyLogs();

    return { ok: true };
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
        drafts: this.toInputJsonValue(this.isRecord(body.drafts) ? body.drafts : {}),
        publishedAt: this.optionalDate(body.publishedAt),
        notifyStatus: this.optionalText(body.notifyStatus),
        excelReviewedAt: this.optionalDate(body.excelReviewedAt),
        updatedBy: this.optionalText(body.updatedBy) ?? user.name ?? "财务",
      },
      update: {
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
        take: 60,
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
    if (user.permissions.includes(PAYROLL_WRITE_PERMISSION) || user.permissions.includes("action.payroll.publish")) {
      return true;
    }

    const identityText = [
      user.roleCode,
      user.roleName,
      user.department,
      user.title,
      user.name,
      user.loginAccount,
      user.wecomName,
      user.wecomUserId,
      ...user.permissions,
    ]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" ")
      .toLowerCase();

    return /finance|财务|財務|finance_reviewer|office_admin|office|admin|办公室|辦公室|人事|hr/.test(identityText);
  }

  private getPayrollIdentityCandidates(user: AuthenticatedUser) {
    const candidates = new Set<string>();
    [
      user.id,
      user.name,
      user.loginAccount,
      user.email,
      user.mobile,
      user.wecomUserId,
      user.wecomName,
    ].forEach((value) => {
      this.addIdentityCandidate(candidates, value);
    });

    const mappedIdentity = this.getMappedEmployeeIdentity(user.wecomUserId);
    if (mappedIdentity) {
      [
        "userid",
        "userId",
        "username",
        "name",
        "displayName",
        "employeeName",
        "wecomName",
      ].forEach((key) => {
        this.addIdentityCandidate(candidates, mappedIdentity[key]);
      });
    }

    return candidates;
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
    const normalized = this.normalizeIdentityText(value);
    if (normalized) {
      candidates.add(normalized);
    }
  }

  private normalizeIdentityText(value: unknown) {
    const text = this.optionalText(value);
    if (!text) {
      return "";
    }

    return text
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[·・.．()（）_-]/g, "")
      .replace(/老師|老师|教练|教練/g, "")
      .replace(/吳/g, "吴")
      .replace(/彥/g, "彦")
      .replace(/羅/g, "罗")
      .replace(/凱/g, "凯")
      .replace(/瑤/g, "瑶")
      .replace(/覺/g, "觉")
      .replace(/達/g, "达")
      .replace(/張/g, "张")
      .replace(/曉/g, "晓")
      .replace(/譚/g, "谭");
  }

  private async pruneSalaryNotifyLogs() {
    const stale = await this.prisma.salaryNotifyLog.findMany({
      select: { id: true },
      orderBy: [
        { createdAt: "desc" },
        { at: "desc" },
      ],
      skip: 60,
    });
    if (stale.length > 0) {
      await this.prisma.salaryNotifyLog.deleteMany({
        where: { id: { in: stale.map((item) => item.id) } },
      });
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
    teacherId: string;
    teacherName: string;
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
      teacherId: slip.teacherId,
      teacherName: slip.teacherName,
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
