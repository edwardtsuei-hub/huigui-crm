import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  MonthlyGoalStatus,
  NotificationChannel,
  NotificationSendStatus,
  Prisma,
  RecordDataScope,
  TaskStatus,
  TaskType,
  UserStatus,
  WeeklyPlanReviewStatus,
  WeeklyReportStatus,
} from "@prisma/client";
import { AccessControlService } from "../common/services/access-control.service";
import { AuditService } from "../common/services/audit.service";
import { NotificationService } from "../modules/notifications/notification.service";
import { WecomMessageService } from "../modules/wecom/wecom-message.service";
import {
  REAL_PARTITION_KEY,
  RecordPartitionService,
} from "../common/services/record-partition.service";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateMonthlyGoalDraftDto,
  CreateWeeklyReportDraftDto,
  DeriveWeeklyReportTasksDto,
  GenerateMonthlyGoalAiSummaryDto,
  RemindWeeklyReportsDto,
  ReviewWeeklyReportDto,
  UpdateWeeklyPublicDigestDto,
  UpdateMonthlyGoalDto,
  UpdateWeeklyReportDto,
  WeeklyReportArchiveQueryDto,
  WeeklyReportTeamClosureQueryDto,
} from "./dto/work-management.dto";

const workManagementUserSelect = {
  id: true,
  name: true,
  wecomName: true,
  department: true,
} satisfies Prisma.UserSelect;

function userDisplayName(user: { name: string; wecomName?: string | null }) {
  return user.wecomName ?? user.name;
}

function isFormalReminderUser(user: {
  name: string;
  wecomName?: string | null;
  loginAccount?: string | null;
}) {
  const fingerprint = [user.name, user.wecomName ?? "", user.loginAccount ?? ""]
    .join(" ")
    .toLowerCase();
  return !fingerprint.includes("测试") && !fingerprint.includes("test");
}

const weeklyReportInclude = {
  user: {
    select: workManagementUserSelect,
  },
  managerReviewer: {
    select: workManagementUserSelect,
  },
  reviewItems: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
  planItems: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.WeeklyReportInclude;

const monthlyGoalInclude = {
  user: {
    select: workManagementUserSelect,
  },
  items: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
  aiSummaries: {
    orderBy: [{ updatedAt: "desc" }],
  },
} satisfies Prisma.MonthlyGoalInclude;

const weeklyPublicDigestInclude = {
  publishedBy: {
    select: workManagementUserSelect,
  },
} satisfies Prisma.WeeklyPublicDigestInclude;

type WeeklyReportWithItems = Prisma.WeeklyReportGetPayload<{
  include: typeof weeklyReportInclude;
}>;

type WeeklyReportClosureStatus = WeeklyReportStatus | "MISSING";
type WeeklyReminderRunMode = "auto" | "weekly_due" | "daily_missing";
type WeeklyReminderResolvedMode = "weekly_due" | "daily_missing";
type WeeklyReminderTarget = {
  userId: string;
  displayName: string;
  department: string | null;
  status: WeeklyReportClosureStatus;
  reportId: string | null;
  label: string;
  href: string;
};

type WeeklyPublicDigestRecord = Prisma.WeeklyPublicDigestGetPayload<{
  include: typeof weeklyPublicDigestInclude;
}>;

type MonthlyGoalWithItems = Prisma.MonthlyGoalGetPayload<{
  include: typeof monthlyGoalInclude;
}>;

type MonthlyGoalAiSummarySnapshotRecord =
  Prisma.MonthlyGoalAiSummarySnapshotGetPayload<{}>;

type NormalizedWeeklyReview = {
  id: string;
  title: string;
  description: string | null;
  plannedAt: Date | null;
  status: WeeklyPlanReviewStatus;
  incompleteReason: string | null;
  sortOrder: number;
};

type NormalizedWeeklyPlan = {
  sourceReviewItemId: string | null;
  title: string;
  description: string | null;
  plannedAt: Date | null;
  sortOrder: number;
};

type NormalizedMonthlyGoalItem = {
  title: string;
  metric: string | null;
  dueAt: Date | null;
  progressNote: string | null;
  riskNote: string | null;
  sortOrder: number;
};

type MonthlyGoalAiSummarySections = {
  highlights: string;
  patterns: string;
  risks: string;
  carryovers: string;
  nextMonthSuggestions: string;
};

type MonthlyGoalAiSummaryWeeklyReport = {
  id: string;
  label: string;
  status: WeeklyReportStatus;
  submittedAt: string | null;
  href: string;
};

type MonthlyGoalAiSummaryPayload = {
  goalId: string;
  provider: string;
  generatedAt: Date;
  sourcePeriod: {
    year: number;
    month: number;
    label: string;
  };
  source: {
    weeklyReportCount: number;
    submittedWeeklyReportCount: number;
    goalItemCount: number;
  };
  weeklyReports: MonthlyGoalAiSummaryWeeklyReport[];
  sections: MonthlyGoalAiSummarySections;
};

type WeeklyPublicDigestSourceReport = {
  id: string;
  label: string;
  status: WeeklyReportStatus;
  submittedAt: string | null;
  href: string;
  owner: {
    id: string;
    name: string;
    displayName: string;
  };
};

type WeeklyPublicDigestPayload = {
  department: {
    key: string;
    label: string;
  };
  provider: string;
  generatedAt: Date;
  generatedSummary: string;
  source: {
    totalReportCount: number;
    includedReportCount: number;
    approvedReportCount: number;
  };
  sourceReports: WeeklyPublicDigestSourceReport[];
};

function cloneDate(value: Date) {
  return new Date(value.getTime());
}

function startOfDay(value: Date) {
  const date = cloneDate(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfWeek(value: Date) {
  const date = startOfDay(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function addDays(value: Date, days: number) {
  const date = cloneDate(value);
  date.setDate(date.getDate() + days);
  return date;
}

function endOfWeek(value: Date) {
  return addDays(startOfWeek(value), 6);
}

function getWeeklyDraftTargetStart(referenceDate: Date) {
  const currentWeekStart = startOfWeek(referenceDate);
  const day = referenceDate.getDay();
  return day === 5 || day === 6 || day === 0
    ? addDays(currentWeekStart, 7)
    : currentWeekStart;
}

function getDefaultMonthlyTarget(referenceDate: Date) {
  const year = referenceDate.getFullYear();
  const monthIndex = referenceDate.getMonth();

  if (referenceDate.getDate() >= 28) {
    const next = new Date(year, monthIndex + 1, 1);
    return {
      year: next.getFullYear(),
      month: next.getMonth() + 1,
    };
  }

  return {
    year,
    month: monthIndex + 1,
  };
}

function getPreviousMonthRange(referenceDate: Date) {
  const currentMonthStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );
  const previousMonthStart = new Date(
    currentMonthStart.getFullYear(),
    currentMonthStart.getMonth() - 1,
    1,
    0,
    0,
    0,
    0,
  );
  const previousMonthEnd = new Date(
    currentMonthStart.getTime() - 1,
  );

  return {
    previousMonthStart,
    previousMonthEnd,
  };
}

function getMonthRange(targetYear: number, targetMonth: number) {
  const monthStart = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
  const monthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
  return {
    monthStart,
    monthEnd,
  };
}

function getPreviousMonthTarget(targetYear: number, targetMonth: number) {
  const currentMonthStart = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
  const previousMonth = new Date(
    currentMonthStart.getFullYear(),
    currentMonthStart.getMonth() - 1,
    1,
    0,
    0,
    0,
    0,
  );

  return {
    year: previousMonth.getFullYear(),
    month: previousMonth.getMonth() + 1,
  };
}

function monthLabel(targetYear: number, targetMonth: number) {
  return `${targetYear} 年 ${String(targetMonth).padStart(2, "0")} 月`;
}

function formatDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function weekLabel(weekStartDate: Date, weekEndDate: Date) {
  return `${formatDateKey(weekStartDate)} ~ ${formatDateKey(weekEndDate)}`;
}

function normalizeDepartmentKey(value?: string | null) {
  return value?.trim() ?? "";
}

function departmentLabel(value?: string | null) {
  const normalized = normalizeDepartmentKey(value);
  return normalized || "未分配部门";
}

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function parseOptionalDate(value: string | null | undefined, fieldName: string) {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${fieldName}格式不正确`);
  }

  return date;
}

function parseLabeledText(
  rawValue: string | null | undefined,
  acceptedLabels: string[],
) {
  const result: Record<string, string> = {};
  const fallback: string[] = [];
  const lines = rawValue?.replace(/\r\n/g, "\n").trim().split("\n") ?? [];
  const accepted = new Set(acceptedLabels);
  let activeLabel: string | null = null;
  let buffer: string[] = [];

  function flushActive() {
    if (!activeLabel) {
      return;
    }

    result[activeLabel] = buffer.join("\n").trim();
    activeLabel = null;
    buffer = [];
  }

  for (const line of lines) {
    const match = line.match(/^\[(.+?)\]\s*(.*)$/);
    if (match && accepted.has(match[1])) {
      flushActive();
      activeLabel = match[1];
      buffer = match[2] ? [match[2]] : [];
      continue;
    }

    if (activeLabel) {
      buffer.push(line);
    } else if (line.trim()) {
      fallback.push(line.trim());
    }
  }

  flushActive();

  return {
    sections: result,
    fallback: fallback.join("\n").trim(),
  };
}

function extractTextCandidates(rawValue?: string | null) {
  if (!rawValue?.trim()) {
    return [];
  }

  return rawValue
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .flatMap((line) =>
      line
        .split(/[；;。]/)
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .filter((line) => line.length >= 2);
}

function dedupeLines(lines: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const normalized = line?.trim();
    if (!normalized) {
      continue;
    }

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function formatBulletList(lines: string[], emptyText: string, limit = 5) {
  const picked = dedupeLines(lines).slice(0, limit);
  if (!picked.length) {
    return emptyText;
  }

  return picked.map((line) => `- ${line}`).join("\n");
}

@Injectable()
export class WorkManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly recordPartition: RecordPartitionService,
    private readonly accessControl: AccessControlService,
    private readonly notificationService: NotificationService,
    private readonly wecomMessageService: WecomMessageService,
  ) {}

  private canReviewWeeklyReport(
    currentUser: Pick<AuthenticatedUser, "roleCode" | "permissions">,
  ) {
    return this.accessControl.hasPermission(
      currentUser,
      "action.work_management.review",
    );
  }

  private getVisibleTeamWeeklyStatuses(
    currentUser: Pick<AuthenticatedUser, "roleCode" | "permissions">,
  ) {
    return this.canReviewWeeklyReport(currentUser)
      ? [
          WeeklyReportStatus.SUBMITTED,
          WeeklyReportStatus.RETURNED,
          WeeklyReportStatus.APPROVED,
        ]
      : [WeeklyReportStatus.SUBMITTED, WeeklyReportStatus.APPROVED];
  }

  private getMonthlySummarySourceStatuses() {
    return [WeeklyReportStatus.SUBMITTED, WeeklyReportStatus.APPROVED];
  }

  async getOverview(currentUser: AuthenticatedUser) {
    const [
      pendingWeeklyReport,
      pendingMonthlyGoal,
      weeklyReports,
      monthlyGoals,
      lastMonthCarryOvers,
    ] = await Promise.all([
      this.getPendingWeeklyReportSummary(currentUser),
      this.getPendingMonthlyGoalSummary(currentUser),
      this.prisma.weeklyReport.findMany({
        where: this.buildWeeklyReportWhere(currentUser, {
          userId: currentUser.id,
        }),
        orderBy: { weekStartDate: "desc" },
        take: 6,
        include: weeklyReportInclude,
      }),
      this.prisma.monthlyGoal.findMany({
        where: this.buildMonthlyGoalWhere(currentUser, {
          userId: currentUser.id,
        }),
        orderBy: [{ targetYear: "desc" }, { targetMonth: "desc" }],
        take: 6,
        include: monthlyGoalInclude,
      }),
      this.listLastMonthCarryOvers(currentUser),
    ]);

    const [draftWeeklyReportCount, draftMonthlyGoalCount] = await Promise.all([
      this.prisma.weeklyReport.count({
        where: this.buildWeeklyReportWhere(currentUser, {
          userId: currentUser.id,
          status: { in: [WeeklyReportStatus.DRAFT, WeeklyReportStatus.RETURNED] },
        }),
      }),
      this.prisma.monthlyGoal.count({
        where: this.buildMonthlyGoalWhere(currentUser, {
          userId: currentUser.id,
          status: MonthlyGoalStatus.DRAFT,
        }),
      }),
    ]);

    return {
      stats: {
        draftWeeklyReportCount,
        draftMonthlyGoalCount,
        carryOverCount:
          pendingWeeklyReport?.openReviewCount ??
          weeklyReports[0]?.reviewItems.filter(
            (item) => item.status !== WeeklyPlanReviewStatus.COMPLETED,
          ).length ??
          0,
        lastMonthCarryOverCount: lastMonthCarryOvers.length,
        nextMonthGoalItemCount: pendingMonthlyGoal?.itemCount ?? 0,
      },
      pendingWeeklyReport,
      pendingMonthlyGoal,
      lastMonthCarryOvers,
      recentWeeklyReports: weeklyReports.map((item) =>
        this.serializeWeeklyReportSummary(item),
      ),
      recentMonthlyGoals: monthlyGoals.map((item) =>
        this.serializeMonthlyGoalSummary(item),
      ),
    };
  }

  async listWeeklyReports(currentUser: AuthenticatedUser) {
    const teamStatuses = this.getVisibleTeamWeeklyStatuses(currentUser);
    const visibleTeamUserIds = await this.getVisibleTeamUserIds(currentUser);

    const [items, teamItems] = await Promise.all([
      this.prisma.weeklyReport.findMany({
        where: this.buildWeeklyReportWhere(currentUser, {
          userId: currentUser.id,
        }),
        orderBy: { weekStartDate: "desc" },
        take: 16,
        include: weeklyReportInclude,
      }),
      this.prisma.weeklyReport.findMany({
        where: this.buildWeeklyReportWhere(currentUser, {
          status: { in: teamStatuses },
          userId: { in: visibleTeamUserIds },
        }),
        orderBy: [{ updatedAt: "desc" }, { weekStartDate: "desc" }],
        take: 12,
        include: weeklyReportInclude,
      }),
    ]);

    return {
      pendingWeeklyReport: await this.getPendingWeeklyReportSummary(currentUser),
      items: items.map((item) => this.serializeWeeklyReportSummary(item)),
      teamItems: teamItems.map((item) => this.serializeWeeklyReportSummary(item)),
    };
  }

  async listWeeklyReportArchive(
    query: WeeklyReportArchiveQueryDto,
    currentUser: AuthenticatedUser,
  ) {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 12, 1), 48);
    const view = query.view ?? "mine";
    const where = await this.buildWeeklyReportArchiveWhere(query, currentUser, view);
    const monthScopeWhere = await this.buildWeeklyReportArchiveWhere(
      { status: query.status, view: query.view, year: undefined, month: undefined },
      currentUser,
      view,
    );

    const [items, total, availableMonths] = await Promise.all([
      this.prisma.weeklyReport.findMany({
        where,
        orderBy: [{ weekStartDate: "desc" }, { updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: weeklyReportInclude,
      }),
      this.prisma.weeklyReport.count({ where }),
      this.prisma.weeklyReport.findMany({
        where: monthScopeWhere,
        select: {
          weekStartDate: true,
        },
        orderBy: [{ weekStartDate: "desc" }],
        take: 120,
      }),
    ]);

    const monthMap = new Map<string, { year: number; month: number; count: number }>();
    availableMonths.forEach((item) => {
      const year = item.weekStartDate.getFullYear();
      const month = item.weekStartDate.getMonth() + 1;
      const key = `${year}-${month}`;
      const current = monthMap.get(key);
      if (current) {
        current.count += 1;
      } else {
        monthMap.set(key, { year, month, count: 1 });
      }
    });

    return {
      filters: {
        year: query.year ?? null,
        month: query.month ?? null,
        status: query.status ?? null,
        view,
      },
      page,
      pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
      availableMonths: [...monthMap.values()].sort(
        (left, right) =>
          right.year - left.year || right.month - left.month,
      ),
      items: items.map((item) => this.serializeWeeklyReportSummary(item)),
    };
  }

  async getWeeklyReportTeamClosure(
    query: WeeklyReportTeamClosureQueryDto,
    currentUser: AuthenticatedUser,
  ) {
    const parsedWeekStartDate = query.weekStartDate
      ? parseOptionalDate(query.weekStartDate, "周报起始日期")
      : null;
    const weekStartDate = parsedWeekStartDate
      ? startOfWeek(parsedWeekStartDate)
      : getWeeklyDraftTargetStart(new Date());
    const weekEndDate = endOfWeek(weekStartDate);
    const members = await this.accessControl.getAssignableUsers(currentUser);
    const memberIds = members.map((item) => item.id);

    const reports = memberIds.length
      ? await this.prisma.weeklyReport.findMany({
          where: this.buildWeeklyReportWhere(currentUser, {
            userId: { in: memberIds },
            weekStartDate,
          }),
          include: weeklyReportInclude,
        })
      : [];
    const reportMap = new Map(reports.map((item) => [item.userId, item]));
    const rows = members.map((member) => {
      const report = reportMap.get(member.id) ?? null;
      const status: WeeklyReportClosureStatus = report?.status ?? "MISSING";
      const needsReminder =
        !report ||
        report.status === WeeklyReportStatus.DRAFT ||
        report.status === WeeklyReportStatus.RETURNED;

      return {
        userId: member.id,
        displayName: userDisplayName(member),
        department: member.department ?? null,
        status,
        reportId: report?.id ?? null,
        label: report
          ? weekLabel(report.weekStartDate, report.weekEndDate)
          : weekLabel(weekStartDate, weekEndDate),
        href: report
          ? `/work-management/weekly-reports?reportId=${report.id}`
          : "/work-management/weekly-reports",
        submittedAt: report?.submittedAt ?? null,
        updatedAt: report?.updatedAt ?? null,
        openReviewCount:
          report?.reviewItems.filter((item) => item.status !== WeeklyPlanReviewStatus.COMPLETED).length ?? 0,
        planItemCount: report?.planItems.length ?? 0,
        needsReminder,
      };
    });
    const missingCount = rows.filter((item) => item.status === "MISSING").length;
    const draftCount = rows.filter((item) => item.status === WeeklyReportStatus.DRAFT).length;
    const returnedCount = rows.filter((item) => item.status === WeeklyReportStatus.RETURNED).length;
    const submittedCount = rows.filter((item) => item.status === WeeklyReportStatus.SUBMITTED).length;
    const approvedCount = rows.filter((item) => item.status === WeeklyReportStatus.APPROVED).length;

    return {
      weekStartDate,
      weekEndDate,
      label: weekLabel(weekStartDate, weekEndDate),
      summary: {
        totalMembers: rows.length,
        missingCount,
        draftCount,
        returnedCount,
        submittedCount,
        approvedCount,
        needsReminderCount: rows.filter((item) => item.needsReminder).length,
      },
      rows,
    };
  }

  async remindWeeklyReports(
    dto: RemindWeeklyReportsDto,
    currentUser: AuthenticatedUser,
  ) {
    this.accessControl.assertPermission(
      currentUser,
      "action.work_management.review",
      "当前账号无权催交团队周报",
    );

    const closure = await this.getWeeklyReportTeamClosure(
      { weekStartDate: dto.weekStartDate },
      currentUser,
    );
    const requestedUserIds = new Set(
      (dto.userIds ?? []).map((item) => item.trim()).filter(Boolean),
    );
    const targets = closure.rows.filter(
      (item) =>
        item.needsReminder &&
        (!requestedUserIds.size || requestedUserIds.has(item.userId)),
    );

    await this.notificationService.deliverManyEventsSystemAndWecom(
      targets.map((target) => ({
        userId: target.userId,
        type: "WEEKLY_REPORT_MANUAL_REMINDER",
        title: "周报待提交",
        content: [
          `${userDisplayName(currentUser)} 提醒你补齐周报：${closure.label}`,
          target.status === "MISSING"
            ? "当前还未创建周报。"
            : `当前状态：${target.status}`,
        ].join("\n"),
        relatedType: "WEEKLY_REPORT",
        relatedId: target.reportId ?? undefined,
      })),
    );

    await this.auditService.log({
      userId: currentUser.id,
      action: "REMIND",
      module: "工作管理",
      targetType: "WeeklyReport",
      targetName: `团队周报 ${closure.label}`,
      content: `一键催交周报 ${targets.length} 人`,
      afterSummary: targets.map((item) => item.displayName).join("、") || "无待催交成员",
    });

    return {
      success: true,
      remindedCount: targets.length,
      targets,
    };
  }

  async createOrGetWeeklyReportDraft(
    dto: CreateWeeklyReportDraftDto,
    currentUser: AuthenticatedUser,
  ) {
    const parsedWeekStartDate = dto.weekStartDate
      ? parseOptionalDate(dto.weekStartDate, "周报起始日期")
      : null;
    const weekStartDate = parsedWeekStartDate
      ? startOfWeek(parsedWeekStartDate)
      : getWeeklyDraftTargetStart(new Date());
    const weekEndDate = endOfWeek(weekStartDate);

    const existing = await this.prisma.weeklyReport.findUnique({
      where: {
        userId_weekStartDate_partitionKey: {
          userId: currentUser.id,
          weekStartDate,
          partitionKey: this.getPartitionKey(currentUser),
        },
      },
      include: weeklyReportInclude,
    });

    if (existing) {
      return this.serializeWeeklyReportDetail(existing, currentUser);
    }

    const previousReport = await this.prisma.weeklyReport.findFirst({
      where: this.buildWeeklyReportWhere(currentUser, {
        userId: currentUser.id,
        weekStartDate: {
          lt: weekStartDate,
        },
      }),
      orderBy: { weekStartDate: "desc" },
      include: {
        planItems: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    const created = await this.prisma.weeklyReport.create({
      data: {
        userId: currentUser.id,
        weekStartDate,
        weekEndDate,
        ...(await this.recordPartition.getWritableCreateData(currentUser)),
        reviewItems: previousReport?.planItems.length
          ? {
              create: previousReport.planItems.map((item, index) => ({
                sourcePlanItemId: item.id,
                title: item.title,
                description: item.description,
                plannedAt: item.plannedAt,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: weeklyReportInclude,
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: "CREATE",
      module: "工作管理",
      targetType: "WeeklyReport",
      targetId: created.id,
      targetName: `周报 ${weekLabel(created.weekStartDate, created.weekEndDate)}`,
      content: "创建周报草稿",
    });

    return this.serializeWeeklyReportDetail(created, currentUser);
  }

  async getWeeklyReport(id: string, currentUser: AuthenticatedUser) {
    return this.serializeWeeklyReportDetail(
      await this.requireWeeklyReportAccessible(id, currentUser),
      currentUser,
    );
  }

  async updateWeeklyReport(
    id: string,
    dto: UpdateWeeklyReportDto,
    currentUser: AuthenticatedUser,
  ) {
    return this.saveWeeklyReport(id, dto, currentUser, false);
  }

  async submitWeeklyReport(
    id: string,
    dto: UpdateWeeklyReportDto,
    currentUser: AuthenticatedUser,
  ) {
    return this.saveWeeklyReport(id, dto, currentUser, true);
  }

  async reviewWeeklyReport(
    id: string,
    dto: ReviewWeeklyReportDto,
    currentUser: AuthenticatedUser,
  ) {
    this.accessControl.assertPermission(
      currentUser,
      "action.work_management.review",
      "当前账号无权审阅周报",
    );

    const existing = await this.requireWeeklyReportAccessible(id, currentUser);
    if (existing.userId === currentUser.id) {
      throw new BadRequestException("不能审阅自己提交的周报");
    }

    if (existing.status !== WeeklyReportStatus.SUBMITTED) {
      throw new BadRequestException("当前周报不是待审阅状态");
    }

    const comment = normalizeOptionalText(dto.comment);
    if (dto.decision === "return" && !comment) {
      throw new BadRequestException("退回修改时请填写说明");
    }

    const nextStatus =
      dto.decision === "approve"
        ? WeeklyReportStatus.APPROVED
        : WeeklyReportStatus.RETURNED;

    const updated = await this.prisma.weeklyReport.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        managerReviewedAt: new Date(),
        managerReviewedById: currentUser.id,
        managerReviewComment: comment,
      },
      include: weeklyReportInclude,
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: dto.decision === "approve" ? "APPROVE" : "RETURN",
      module: "工作管理",
      targetType: "WeeklyReport",
      targetId: updated.id,
      targetName: `周报 ${weekLabel(updated.weekStartDate, updated.weekEndDate)}`,
      content: dto.decision === "approve" ? "主管审阅通过周报" : "主管退回周报",
      afterSummary: comment ?? undefined,
    });

    await this.notifyWeeklyReportDecision(updated, currentUser);

    return this.serializeWeeklyReportDetail(updated, currentUser);
  }

  async getWeeklyPublicDigest(id: string, currentUser: AuthenticatedUser) {
    const report = await this.requireWeeklyReportAccessible(id, currentUser);
    const { digest, payload } = await this.refreshWeeklyPublicDigest(
      report,
      currentUser,
    );

    return this.serializeWeeklyPublicDigest(digest, payload, currentUser);
  }

  async regenerateWeeklyPublicDigest(
    id: string,
    currentUser: AuthenticatedUser,
  ) {
    this.accessControl.assertPermission(
      currentUser,
      "action.work_management.review",
      "当前账号无权维护公开周报汇整",
    );

    const report = await this.requireWeeklyReportAccessible(id, currentUser);
    const { digest, payload } = await this.refreshWeeklyPublicDigest(
      report,
      currentUser,
      true,
    );

    await this.auditService.log({
      userId: currentUser.id,
      action: "GENERATE",
      module: "工作管理",
      targetType: "WeeklyPublicDigest",
      targetId: digest.id,
      targetName: `${departmentLabel(report.user.department)}公开周报汇整 ${weekLabel(report.weekStartDate, report.weekEndDate)}`,
      content: "重新生成公开周报汇整自动稿",
    });

    return this.serializeWeeklyPublicDigest(digest, payload, currentUser);
  }

  async updateWeeklyPublicDigest(
    id: string,
    dto: UpdateWeeklyPublicDigestDto,
    currentUser: AuthenticatedUser,
  ) {
    this.accessControl.assertPermission(
      currentUser,
      "action.work_management.review",
      "当前账号无权维护公开周报汇整",
    );

    const report = await this.requireWeeklyReportAccessible(id, currentUser);
    const { digest, payload } = await this.refreshWeeklyPublicDigest(
      report,
      currentUser,
    );
    const publishedSummary = normalizeOptionalText(dto.summary);

    const updated = await this.prisma.weeklyPublicDigest.update({
      where: { id: digest.id },
      data: {
        publishedSummary,
        publishedAt: publishedSummary ? new Date() : null,
        publishedById: publishedSummary ? currentUser.id : null,
      },
      include: weeklyPublicDigestInclude,
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: "UPDATE",
      module: "工作管理",
      targetType: "WeeklyPublicDigest",
      targetId: updated.id,
      targetName: `${departmentLabel(report.user.department)}公开周报汇整 ${weekLabel(report.weekStartDate, report.weekEndDate)}`,
      content: publishedSummary ? "更新公开周报汇整" : "清空公开周报汇整，恢复自动稿",
      afterSummary: publishedSummary ?? undefined,
    });

    return this.serializeWeeklyPublicDigest(updated, payload, currentUser);
  }

  async deriveWeeklyReportTasks(
    id: string,
    dto: DeriveWeeklyReportTasksDto,
    currentUser: AuthenticatedUser,
  ) {
    this.accessControl.assertPermission(
      currentUser,
      "action.work_management.review",
      "当前账号无权派生团队待办",
    );

    const report = await this.requireWeeklyReportAccessible(id, currentUser);
    if (report.userId === currentUser.id) {
      throw new BadRequestException("不能从自己的周报派生团队待办");
    }

    const requestedPlanItemIds = new Set(
      (dto.planItemIds ?? []).map((item) => item.trim()).filter(Boolean),
    );
    const candidates = report.planItems.filter(
      (item) =>
        !item.taskId &&
        item.plannedAt &&
        (!requestedPlanItemIds.size || requestedPlanItemIds.has(item.id)),
    );

    if (!candidates.length) {
      return {
        success: true,
        createdCount: 0,
        tasks: [],
      };
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const tasks: Array<{
        id: string;
        title: string;
        planItemId: string;
        startAt: Date;
      }> = [];

      for (const item of candidates) {
        const task = await tx.task.create({
          data: {
            title: `周报计划 · ${item.title}`,
            type: TaskType.PLAN,
            assigneeUserId: report.userId,
            startAt: item.plannedAt!,
            reminderAt: item.plannedAt,
            content: [
              "来源：工作管理 / 主管派生待办",
              `周次：${weekLabel(report.weekStartDate, report.weekEndDate)}`,
              item.description ? `说明：${item.description}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
            createdBy: currentUser.id,
            status: TaskStatus.TODO,
            dataScope: report.dataScope,
            partitionKey: report.partitionKey,
            testBatchId: report.testBatchId,
          },
        });

        await tx.weeklyReportPlanItem.update({
          where: { id: item.id },
          data: { taskId: task.id },
        });

        tasks.push({
          id: task.id,
          title: task.title,
          planItemId: item.id,
          startAt: task.startAt,
        });
      }

      return tasks;
    });

    if (this.isRealRecord(report)) {
      await this.notificationService.deliverEventSystemAndWecom({
        userId: report.userId,
        type: "WEEKLY_REPORT_TASK_DERIVED",
        title: "周报计划已生成待办",
        content: [
          `${userDisplayName(currentUser)} 已从你的周报派生 ${created.length} 个待办。`,
          `周次：${weekLabel(report.weekStartDate, report.weekEndDate)}`,
        ].join("\n"),
        relatedType: "WEEKLY_REPORT",
        relatedId: report.id,
      });
    }

    await this.auditService.log({
      userId: currentUser.id,
      action: "CREATE",
      module: "工作管理",
      targetType: "Task",
      targetName: `周报派生待办 ${weekLabel(report.weekStartDate, report.weekEndDate)}`,
      content: `从周报派生 ${created.length} 个待办`,
      afterSummary: created.map((item) => item.title).join("、"),
    });

    const updatedReport = await this.requireWeeklyReportAccessible(id, currentUser);
    return {
      success: true,
      createdCount: created.length,
      tasks: created,
      report: this.serializeWeeklyReportDetail(updatedReport, currentUser),
    };
  }

  async listMonthlyGoals(currentUser: AuthenticatedUser) {
    const [items, teamItems] = await Promise.all([
      this.prisma.monthlyGoal.findMany({
        where: this.buildMonthlyGoalWhere(currentUser, {
          userId: currentUser.id,
        }),
        orderBy: [{ targetYear: "desc" }, { targetMonth: "desc" }],
        take: 16,
        include: monthlyGoalInclude,
      }),
      this.prisma.monthlyGoal.findMany({
        where: this.buildMonthlyGoalWhere(currentUser, {
          status: MonthlyGoalStatus.SUBMITTED,
          userId: { not: currentUser.id },
        }),
        orderBy: [{ submittedAt: "desc" }, { targetYear: "desc" }, { targetMonth: "desc" }],
        take: 12,
        include: monthlyGoalInclude,
      }),
    ]);

    return {
      pendingMonthlyGoal: await this.getPendingMonthlyGoalSummary(currentUser),
      items: items.map((item) => this.serializeMonthlyGoalSummary(item)),
      teamItems: teamItems.map((item) => this.serializeMonthlyGoalSummary(item)),
    };
  }

  async createOrGetMonthlyGoalDraft(
    dto: CreateMonthlyGoalDraftDto,
    currentUser: AuthenticatedUser,
  ) {
    const defaultTarget = getDefaultMonthlyTarget(new Date());
    const targetYear = dto.targetYear ?? defaultTarget.year;
    const targetMonth = dto.targetMonth ?? defaultTarget.month;

    const existing = await this.prisma.monthlyGoal.findUnique({
      where: {
        userId_targetYear_targetMonth_partitionKey: {
          userId: currentUser.id,
          targetYear,
          targetMonth,
          partitionKey: this.getPartitionKey(currentUser),
        },
      },
      include: monthlyGoalInclude,
    });

    if (existing) {
      return this.serializeMonthlyGoalDetail(existing, currentUser);
    }

    const created = await this.prisma.monthlyGoal.create({
      data: {
        userId: currentUser.id,
        targetYear,
        targetMonth,
        ...(await this.recordPartition.getWritableCreateData(currentUser)),
      },
      include: monthlyGoalInclude,
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: "CREATE",
      module: "工作管理",
      targetType: "MonthlyGoal",
      targetId: created.id,
      targetName: `${monthLabel(created.targetYear, created.targetMonth)}目标`,
      content: "创建月目标草稿",
    });

    return this.serializeMonthlyGoalDetail(created, currentUser);
  }

  async getMonthlyGoal(id: string, currentUser: AuthenticatedUser) {
    return this.serializeMonthlyGoalDetail(
      await this.requireMonthlyGoalAccessible(id, currentUser),
      currentUser,
    );
  }

  async generateMonthlyGoalAiSummary(
    id: string,
    dto: GenerateMonthlyGoalAiSummaryDto,
    currentUser: AuthenticatedUser,
  ) {
    const goal = await this.requireMonthlyGoalAccessible(id, currentUser);
    const requestedSource =
      dto.sourceYear && dto.sourceMonth
        ? { year: dto.sourceYear, month: dto.sourceMonth }
        : null;
    const preferredSource = requestedSource ?? {
      year: goal.targetYear,
      month: goal.targetMonth,
    };

    let sourceTarget = preferredSource;
    let submittedReports = await this.findMonthlySubmittedWeeklyReports(
      goal.userId,
      preferredSource.year,
      preferredSource.month,
      currentUser,
    );

    if (!submittedReports.length && !requestedSource) {
      const fallbackTarget = getPreviousMonthTarget(
        goal.targetYear,
        goal.targetMonth,
      );
      submittedReports = await this.findMonthlySubmittedWeeklyReports(
        goal.userId,
        fallbackTarget.year,
        fallbackTarget.month,
        currentUser,
      );

      if (submittedReports.length) {
        sourceTarget = fallbackTarget;
      }
    }

    const totalWeeklyReports = await this.countMonthlyWeeklyReports(
      goal.userId,
      sourceTarget.year,
      sourceTarget.month,
      currentUser,
    );

    const summary = this.buildMonthlyGoalAiSummaryPayload(
      goal,
      sourceTarget,
      totalWeeklyReports,
      submittedReports,
    );

    const snapshot = await this.prisma.monthlyGoalAiSummarySnapshot.upsert({
      where: {
        monthlyGoalId_sourceYear_sourceMonth: {
          monthlyGoalId: goal.id,
          sourceYear: summary.sourcePeriod.year,
          sourceMonth: summary.sourcePeriod.month,
        },
      },
      create: {
        monthlyGoalId: goal.id,
        sourceYear: summary.sourcePeriod.year,
        sourceMonth: summary.sourcePeriod.month,
        provider: summary.provider,
        generatedAt: summary.generatedAt,
        weeklyReportCount: summary.source.weeklyReportCount,
        submittedWeeklyReportCount: summary.source.submittedWeeklyReportCount,
        goalItemCount: summary.source.goalItemCount,
        sectionsJson: summary.sections as Prisma.InputJsonValue,
        weeklyReportsJson: summary.weeklyReports as Prisma.InputJsonValue,
      },
      update: {
        provider: summary.provider,
        generatedAt: summary.generatedAt,
        weeklyReportCount: summary.source.weeklyReportCount,
        submittedWeeklyReportCount: summary.source.submittedWeeklyReportCount,
        goalItemCount: summary.source.goalItemCount,
        sectionsJson: summary.sections as Prisma.InputJsonValue,
        weeklyReportsJson: summary.weeklyReports as Prisma.InputJsonValue,
      },
    });

    return this.serializeMonthlyGoalAiSummarySnapshot(snapshot);
  }

  async updateMonthlyGoal(
    id: string,
    dto: UpdateMonthlyGoalDto,
    currentUser: AuthenticatedUser,
  ) {
    return this.saveMonthlyGoal(id, dto, currentUser, false);
  }

  async submitMonthlyGoal(
    id: string,
    dto: UpdateMonthlyGoalDto,
    currentUser: AuthenticatedUser,
  ) {
    return this.saveMonthlyGoal(id, dto, currentUser, true);
  }

  async getPendingWeeklyReportSummary(
    currentUser: Pick<
      AuthenticatedUser,
      "id" | "recordDataScope" | "testBatchId"
    >,
    referenceDate = new Date(),
  ) {
    const weekStartDate = getWeeklyDraftTargetStart(referenceDate);
    const weekEndDate = endOfWeek(weekStartDate);
    const [report, previousReport] = await Promise.all([
      this.prisma.weeklyReport.findUnique({
        where: {
          userId_weekStartDate_partitionKey: {
            userId: currentUser.id,
            weekStartDate,
            partitionKey: this.getPartitionKey(currentUser),
          },
        },
        include: weeklyReportInclude,
      }),
      this.prisma.weeklyReport.findFirst({
        where: this.buildWeeklyReportWhere(currentUser, {
          userId: currentUser.id,
          weekStartDate: {
            lt: weekStartDate,
          },
        }),
        orderBy: { weekStartDate: "desc" },
        include: {
          planItems: true,
        },
      }),
    ]);

    return {
      needsAttention:
        !report ||
        report.status === WeeklyReportStatus.DRAFT ||
        report.status === WeeklyReportStatus.RETURNED,
      status: report?.status ?? "MISSING",
      weekStartDate,
      weekEndDate,
      label: weekLabel(weekStartDate, weekEndDate),
      href: "/work-management/weekly-reports",
      openReviewCount: report
        ? report.reviewItems.filter(
            (item) => item.status !== WeeklyPlanReviewStatus.COMPLETED,
          ).length
        : previousReport?.planItems.length ?? 0,
      planItemCount: report?.planItems.length ?? 0,
      reportId: report?.id ?? null,
    };
  }

  async getPendingMonthlyGoalSummary(
    currentUser: Pick<
      AuthenticatedUser,
      "id" | "recordDataScope" | "testBatchId"
    >,
    referenceDate = new Date(),
  ) {
    const target = getDefaultMonthlyTarget(referenceDate);
    const goal = await this.prisma.monthlyGoal.findUnique({
      where: {
        userId_targetYear_targetMonth_partitionKey: {
          userId: currentUser.id,
          targetYear: target.year,
          targetMonth: target.month,
          partitionKey: this.getPartitionKey(currentUser),
        },
      },
      include: monthlyGoalInclude,
    });

    return {
      needsAttention: !goal || goal.status !== MonthlyGoalStatus.SUBMITTED,
      status: goal?.status ?? "MISSING",
      targetYear: target.year,
      targetMonth: target.month,
      label: monthLabel(target.year, target.month),
      href: "/work-management/monthly-goals",
      itemCount: goal?.items.length ?? 0,
      goalId: goal?.id ?? null,
    };
  }

  async listWeeklyReportReminderTargets(referenceDate = new Date()) {
    const day = referenceDate.getDay();
    if (day !== 5) {
      return [];
    }

    const threshold = startOfDay(referenceDate);
    threshold.setHours(9, 0, 0, 0);
    if (referenceDate.getTime() < threshold.getTime()) {
      return [];
    }

    const weekStartDate = addDays(startOfWeek(referenceDate), 7);
    const weekEndDate = endOfWeek(weekStartDate);
    const users = await this.prisma.user.findMany({
      where: { status: UserStatus.ACTIVE },
      select: { id: true, name: true, wecomName: true, loginAccount: true },
    });

    const existingReports = await this.prisma.weeklyReport.findMany({
      where: this.buildRealWeeklyReportWhere({
        userId: { in: users.map((item) => item.id) },
        weekStartDate,
        status: { in: this.getMonthlySummarySourceStatuses() },
      }),
      select: {
        userId: true,
      },
    });
    const submittedUserIds = new Set(existingReports.map((item) => item.userId));

    return users
      .filter((item) => !submittedUserIds.has(item.id) && isFormalReminderUser(item))
      .map((item) => ({
        userId: item.id,
        displayName: item.wecomName ?? item.name,
        weekStartDate,
        weekEndDate,
      }));
  }

  async runWeeklyReminderJob(
    body: Record<string, unknown>,
    origin?: string,
  ) {
    const now = this.parseWeeklyReminderNow(body.now);
    const requestedMode = this.parseWeeklyReminderRequestedMode(body.mode);
    const mode = this.resolveWeeklyReminderMode(requestedMode, now);
    const dueAt =
      this.getOptionalText(body.dueAt) ?? this.buildWeeklyReminderDueAt(now);
    const url = this.resolveWeeklyReminderUrl(body.url, origin);
    const recipientMap = this.parseWeeklyReminderRecipientMap(body.recipientMap);
    const targetRows =
      mode === "weekly_due"
        ? await this.buildWeeklyDueReminderTargets(now)
        : await this.buildDailyWeeklyReminderTargets(now);
    const scheduledAt = now.toISOString();
    const startOfToday = startOfDay(now);
    const notificationType =
      mode === "weekly_due"
        ? "WEEKLY_REPORT_WEEKLY_DUE_REMINDER"
        : "WEEKLY_REPORT_DAILY_MISSING_REMINDER";
    const title =
      mode === "weekly_due" ? "本周周报提交提醒" : "本周周报未提交提醒";
    const cadenceLabel =
      mode === "weekly_due" ? "周五提交提醒" : "未提交每日提醒";
    const warnings: string[] = [];
    const memberResults: Array<{
      name: string;
      department: string | null;
      status: WeeklyReportClosureStatus;
      review: null;
      recipientUserid: string | null;
      recipientSource: "user_binding" | "recipient_map" | null;
      skipped: boolean;
      ok: boolean;
      mode: "sent" | "failed" | "skipped";
      message: string;
      warnings: string[];
    }> = [];

    for (const target of targetRows) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: target.userId,
          type: notificationType,
          relatedType: "WEEKLY_REPORT",
          relatedId: target.reportId ?? null,
          sendChannel: NotificationChannel.WECOM,
          createdAt: { gte: startOfToday },
          sendStatus: NotificationSendStatus.SENT,
        },
        orderBy: [{ createdAt: "desc" }],
      });
      if (existing) {
        memberResults.push({
          name: target.displayName,
          department: target.department,
          status: target.status,
          review: null,
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

      const content = this.buildWeeklyReminderMessage(mode, target, dueAt);
      const systemNotification =
        await this.notificationService.createNotification({
          userId: target.userId,
          type: notificationType,
          title,
          content,
          relatedType: "WEEKLY_REPORT",
          relatedId: target.reportId ?? undefined,
          sendChannel: NotificationChannel.SYSTEM,
          sendStatus: NotificationSendStatus.SENT,
          sentAt: now,
        });
      const wecomNotification =
        await this.notificationService.createNotification({
          userId: target.userId,
          type: notificationType,
          title,
          content,
          relatedType: "WEEKLY_REPORT",
          relatedId: target.reportId ?? undefined,
          sendChannel: NotificationChannel.WECOM,
          sendStatus: NotificationSendStatus.PENDING,
          sentAt: null,
        });

      const fallbackRecipient =
        recipientMap.get(target.displayName) ??
        recipientMap.get(target.displayName.replace(/\s+/g, ""));
      try {
        if (fallbackRecipient) {
          await this.wecomMessageService.sendTextCardMessage(fallbackRecipient, {
            title,
            description: content,
            url,
            buttonText: "前往查看",
          });
        } else {
          await this.wecomMessageService.sendReminderMessage(
            target.userId,
            title,
            content,
            { url, buttonText: "前往查看" },
          );
        }

        await this.prisma.notification.update({
          where: { id: wecomNotification.id },
          data: {
            sendStatus: NotificationSendStatus.SENT,
            sentAt: new Date(),
          },
        });
        memberResults.push({
          name: target.displayName,
          department: target.department,
          status: target.status,
          review: null,
          recipientUserid: fallbackRecipient ?? null,
          recipientSource: fallbackRecipient ? "recipient_map" : "user_binding",
          skipped: false,
          ok: true,
          mode: "sent",
          message: fallbackRecipient
            ? `企微已发送：recipient_map ${fallbackRecipient}`
            : "企微已发送：user_binding",
          warnings: [],
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "企业微信周报提醒发送失败。";
        warnings.push(message);
        await this.prisma.notification.update({
          where: { id: wecomNotification.id },
          data: {
            sendStatus: NotificationSendStatus.FAILED,
          },
        });
        memberResults.push({
          name: target.displayName,
          department: target.department,
          status: target.status,
          review: null,
          recipientUserid: fallbackRecipient ?? null,
          recipientSource: fallbackRecipient ? "recipient_map" : "user_binding",
          skipped: false,
          ok: false,
          mode: "failed",
          message,
          warnings: [message],
        });
      }

      void systemNotification;
    }

    const missingCount = targetRows.filter((item) => item.status === "MISSING").length;
    const sentCount = memberResults.filter((item) => item.mode === "sent").length;
    const failedCount = memberResults.filter((item) => item.mode === "failed").length;
    const skippedCount = memberResults.filter((item) => item.mode === "skipped").length;

    const auditActor = await this.prisma.user.findFirst({
      where: { status: UserStatus.ACTIVE, role: { code: "SUPER_ADMIN" } },
      select: { id: true },
    });
    if (auditActor) {
      await this.auditService.log({
        userId: auditActor.id,
        action: "REMIND",
        module: "工作管理",
        targetType: "WeeklyReport",
        targetName: `${cadenceLabel} ${targetRows[0]?.label ?? weekLabel(getWeeklyDraftTargetStart(now), endOfWeek(getWeeklyDraftTargetStart(now)))}`,
        content: `${cadenceLabel}自动提醒 ${sentCount} 人`,
        afterSummary:
          memberResults
            .filter((item) => item.mode === "sent")
            .map((item) => item.name)
            .join("、") || "无命中成员",
        source: "SYSTEM",
      });
    }

    return {
      ok: failedCount === 0,
      mode,
      requestedMode,
      cadenceLabel,
      scheduledAt,
      dueAt,
      targetCount: targetRows.length,
      sentCount,
      dryRunCount: 0,
      failedCount,
      skippedCount,
      missingCount,
      message:
        mode === "weekly_due"
          ? `周五周报提醒已发送 ${sentCount} 人，跳过 ${skippedCount} 人，失败 ${failedCount} 人。`
          : `未提交周报每日提醒已发送 ${sentCount} 人，跳过 ${skippedCount} 人，失败 ${failedCount} 人。`,
      memberResults,
      warnings: Array.from(new Set(warnings)),
      createdAt: scheduledAt,
      savedAt: scheduledAt,
    };
  }

  async listMonthlyGoalReminderTargets(referenceDate = new Date()) {
    if (referenceDate.getDate() !== 28) {
      return [];
    }

    const threshold = startOfDay(referenceDate);
    threshold.setHours(9, 0, 0, 0);
    if (referenceDate.getTime() < threshold.getTime()) {
      return [];
    }

    const target = getDefaultMonthlyTarget(referenceDate);
    const users = await this.prisma.user.findMany({
      where: { status: UserStatus.ACTIVE },
      select: { id: true, name: true, wecomName: true },
    });

    const existingGoals = await this.prisma.monthlyGoal.findMany({
      where: this.buildRealMonthlyGoalWhere({
        userId: { in: users.map((item) => item.id) },
        targetYear: target.year,
        targetMonth: target.month,
        status: MonthlyGoalStatus.SUBMITTED,
      }),
      select: {
        userId: true,
      },
    });
    const submittedUserIds = new Set(existingGoals.map((item) => item.userId));

    return users
      .filter((item) => !submittedUserIds.has(item.id))
      .map((item) => ({
        userId: item.id,
        displayName: item.wecomName ?? item.name,
        targetYear: target.year,
        targetMonth: target.month,
      }));
  }

  async listLastMonthCarryOvers(
    currentUser: Pick<
      AuthenticatedUser,
      "id" | "recordDataScope" | "testBatchId"
    >,
    referenceDate = new Date(),
  ) {
    const { previousMonthStart, previousMonthEnd } =
      getPreviousMonthRange(referenceDate);
    const items = await this.prisma.weeklyReportReviewItem.findMany({
      where: {
        status: WeeklyPlanReviewStatus.INCOMPLETE,
        report: {
          userId: currentUser.id,
          partitionKey: this.getPartitionKey(currentUser),
          weekStartDate: {
            gte: previousMonthStart,
            lte: previousMonthEnd,
          },
        },
      },
      include: {
        report: {
          include: {
            user: {
              select: workManagementUserSelect,
            },
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 8,
    });

    return items
      .sort(
        (left, right) =>
          right.report.weekStartDate.getTime() - left.report.weekStartDate.getTime(),
      )
      .map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        incompleteReason: item.incompleteReason,
        plannedAt: item.plannedAt,
        periodLabel: weekLabel(item.report.weekStartDate, item.report.weekEndDate),
        owner: {
          id: item.report.user.id,
          name: item.report.user.name,
          displayName: userDisplayName(item.report.user),
        },
        href: `/work-management/weekly-reports?reportId=${item.report.id}`,
      }));
  }

  private async buildWeeklyDueReminderTargets(referenceDate: Date): Promise<WeeklyReminderTarget[]> {
    const items = await this.listWeeklyReportReminderTargets(referenceDate);
    return items.map((item) => ({
      userId: item.userId,
      displayName: item.displayName,
      department: null,
      status: "MISSING",
      reportId: null,
      label: weekLabel(item.weekStartDate, item.weekEndDate),
      href: "/work-management/weekly-reports",
    }));
  }

  private async buildDailyWeeklyReminderTargets(referenceDate: Date): Promise<WeeklyReminderTarget[]> {
    const weekStartDate = getWeeklyDraftTargetStart(referenceDate);
    const weekEndDate = endOfWeek(weekStartDate);
    const users = await this.prisma.user.findMany({
      where: { status: UserStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        wecomName: true,
        department: true,
        loginAccount: true,
      },
      orderBy: [{ department: "asc" }, { name: "asc" }],
    });
    const reports = await this.prisma.weeklyReport.findMany({
      where: this.buildRealWeeklyReportWhere({
        userId: { in: users.map((item) => item.id) },
        weekStartDate,
      }),
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });
    const reportMap = new Map(reports.map((item) => [item.userId, item]));

    return users
      .filter((user) => isFormalReminderUser(user))
      .map((user) => {
        const report = reportMap.get(user.id) ?? null;
        const status = report?.status ?? "MISSING";
        if (
          report &&
          report.status !== WeeklyReportStatus.DRAFT &&
          report.status !== WeeklyReportStatus.RETURNED
        ) {
          return null;
        }

        return {
          userId: user.id,
          displayName: userDisplayName(user),
          department: user.department ?? null,
          status,
          reportId: report?.id ?? null,
          label: weekLabel(weekStartDate, weekEndDate),
          href: report
            ? `/work-management/weekly-reports?reportId=${encodeURIComponent(report.id)}`
            : "/work-management/weekly-reports",
        } satisfies WeeklyReminderTarget;
      })
      .filter((item): item is WeeklyReminderTarget => Boolean(item));
  }

  private parseWeeklyReminderNow(value: unknown) {
    if (typeof value !== "string" || !value.trim()) {
      return new Date();
    }
    return parseOptionalDate(value, "周报提醒时间") ?? new Date();
  }

  private parseWeeklyReminderRequestedMode(value: unknown): WeeklyReminderRunMode {
    return value === "weekly_due" || value === "daily_missing" || value === "auto"
      ? value
      : "auto";
  }

  private resolveWeeklyReminderMode(
    mode: WeeklyReminderRunMode,
    referenceDate: Date,
  ): WeeklyReminderResolvedMode {
    if (mode === "weekly_due" || mode === "daily_missing") {
      return mode;
    }
    return referenceDate.getDay() === 5 ? "weekly_due" : "daily_missing";
  }

  private buildWeeklyReminderDueAt(referenceDate: Date) {
    const target = new Date(referenceDate.getTime());
    target.setHours(18, 0, 0, 0);
    return target.toISOString();
  }

  private resolveWeeklyReminderUrl(value: unknown, origin?: string) {
    const explicit = this.getOptionalText(value);
    if (explicit?.startsWith("http://") || explicit?.startsWith("https://")) {
      return explicit;
    }
    if (explicit && origin) {
      return `${origin.replace(/\/$/, "")}${explicit.startsWith("/") ? explicit : `/${explicit}`}`;
    }
    if (process.env.APP_BASE_URL?.trim()) {
      const base = process.env.APP_BASE_URL.trim().replace(/\/$/, "");
      const path = explicit ?? "/work-management/weekly-reports";
      return `${base}${path.startsWith("/") ? path : `/${path}`}`;
    }
    return explicit ?? "/work-management/weekly-reports";
  }

  private parseWeeklyReminderRecipientMap(value: unknown): Map<string, string> {
    const result = new Map<string, string>();
    if (!value) {
      return result;
    }
    if (typeof value === "string") {
      try {
        return this.parseWeeklyReminderRecipientMap(JSON.parse(value));
      } catch {
        for (const pair of value.split(/[,\n]/)) {
          const [rawName, rawUserId] = pair.split("=");
          const name = rawName?.trim();
          const userId = rawUserId?.trim();
          if (name && userId) {
            result.set(name, userId);
          }
        }
        return result;
      }
    }
    if (typeof value === "object" && !Array.isArray(value)) {
      for (const [rawName, rawUserId] of Object.entries(value)) {
        const name = rawName.trim();
        const userId =
          typeof rawUserId === "string" ? rawUserId.trim() : String(rawUserId ?? "").trim();
        if (name && userId) {
          result.set(name, userId);
        }
      }
    }
    return result;
  }

  private buildWeeklyReminderMessage(
    mode: WeeklyReminderResolvedMode,
    target: WeeklyReminderTarget,
    dueAt: string,
  ) {
    const dueLabel = dueAt ? `请在 ${dueAt} 前处理。` : "请尽快处理。";
    const statusLine =
      target.status === "MISSING"
        ? "当前还未创建周报。"
        : target.status === WeeklyReportStatus.DRAFT
          ? "当前周报仍是草稿，尚未提交。"
          : "当前周报已被退回，仍需补充后再提交。";
    return [
      `${mode === "weekly_due" ? "周报提交提醒" : "周报未提交每日提醒"}：${target.label}`,
      statusLine,
      dueLabel,
    ].join("\n");
  }

  private getOptionalText(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  private async saveWeeklyReport(
    id: string,
    dto: UpdateWeeklyReportDto,
    currentUser: AuthenticatedUser,
    submit: boolean,
  ) {
    const existing = await this.requireWeeklyReport(id, currentUser);
    const normalizedReviews = this.normalizeWeeklyReviewInputs(
      existing.reviewItems,
      dto,
    );
    const normalizedPlanItems = this.normalizeWeeklyPlanInputs(
      normalizedReviews,
      dto,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        normalizedReviews.map((item) =>
          tx.weeklyReportReviewItem.update({
            where: { id: item.id },
            data: {
              status: item.status,
              incompleteReason: item.incompleteReason,
            },
          }),
        ),
      );

      const existingPlanItems = await tx.weeklyReportPlanItem.findMany({
        where: { reportId: existing.id },
        select: { taskId: true },
      });

      await Promise.all(
        existingPlanItems
          .map((item) => item.taskId)
          .filter((item): item is string => Boolean(item))
          .map((taskId) =>
            tx.task.deleteMany({
              where: { id: taskId },
            }),
          ),
      );

      await tx.weeklyReportPlanItem.deleteMany({
        where: { reportId: existing.id },
      });

      for (const item of normalizedPlanItems) {
        let taskId: string | null = null;
        if (item.plannedAt) {
          const task = await tx.task.create({
            data: {
              title: `周报计划 · ${item.title}`,
              type: TaskType.PLAN,
              assigneeUserId: existing.userId,
              startAt: item.plannedAt,
              reminderAt: item.plannedAt,
              content: [
                "来源：工作管理 / 周报计划",
                `周次：${weekLabel(existing.weekStartDate, existing.weekEndDate)}`,
                item.description ? `说明：${item.description}` : null,
              ]
                .filter(Boolean)
                .join("\n"),
              createdBy: currentUser.id,
              status: TaskStatus.TODO,
              dataScope: existing.dataScope,
              partitionKey: existing.partitionKey,
              testBatchId: existing.testBatchId,
            },
          });
          taskId = task.id;
        }

        await tx.weeklyReportPlanItem.create({
          data: {
            reportId: existing.id,
            sourceReviewItemId: item.sourceReviewItemId,
            title: item.title,
            description: item.description,
            plannedAt: item.plannedAt,
            sortOrder: item.sortOrder,
            taskId,
          },
        });
      }

      await tx.weeklyReport.update({
        where: { id: existing.id },
        data: {
          completedSummary: normalizeOptionalText(dto.completedSummary),
          focusSummary: normalizeOptionalText(dto.focusSummary),
          status: submit ? WeeklyReportStatus.SUBMITTED : WeeklyReportStatus.DRAFT,
          submittedAt: submit ? new Date() : null,
          managerReviewedAt: null,
          managerReviewedById: null,
          managerReviewComment: null,
        },
      });

      return tx.weeklyReport.findUniqueOrThrow({
        where: { id: existing.id },
        include: weeklyReportInclude,
      });
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: submit ? "SUBMIT" : "UPDATE",
      module: "工作管理",
      targetType: "WeeklyReport",
      targetId: updated.id,
      targetName: `周报 ${weekLabel(updated.weekStartDate, updated.weekEndDate)}`,
      content: submit ? "提交周报" : "更新周报",
      afterSummary: `计划项 ${updated.planItems.length} 条，回顾项 ${updated.reviewItems.length} 条`,
    });

    if (submit) {
      await this.notifyWorkManagementReviewers({
        type: "WEEKLY_REPORT_SUBMITTED",
        title: "周报待审阅",
        content: `${userDisplayName(updated.user)} 提交了周报：${weekLabel(updated.weekStartDate, updated.weekEndDate)}`,
        relatedType: "WEEKLY_REPORT",
        relatedId: updated.id,
        submitterUserId: updated.userId,
      });
    }

    return this.serializeWeeklyReportDetail(updated, currentUser);
  }

  private async saveMonthlyGoal(
    id: string,
    dto: UpdateMonthlyGoalDto,
    currentUser: AuthenticatedUser,
    submit: boolean,
  ) {
    const existing = await this.requireMonthlyGoal(id, currentUser);
    const normalizedItems = this.normalizeMonthlyGoalItems(dto);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.monthlyGoalItem.deleteMany({
        where: { monthlyGoalId: existing.id },
      });

      if (normalizedItems.length) {
        await tx.monthlyGoalItem.createMany({
          data: normalizedItems.map((item) => ({
            monthlyGoalId: existing.id,
            title: item.title,
            metric: item.metric,
            dueAt: item.dueAt,
            progressNote: item.progressNote,
            riskNote: item.riskNote,
            sortOrder: item.sortOrder,
          })),
        });
      }

      await tx.monthlyGoal.update({
        where: { id: existing.id },
        data: {
          summary: normalizeOptionalText(dto.summary),
          status: submit ? MonthlyGoalStatus.SUBMITTED : MonthlyGoalStatus.DRAFT,
          submittedAt: submit ? new Date() : null,
        },
      });

      return tx.monthlyGoal.findUniqueOrThrow({
        where: { id: existing.id },
        include: monthlyGoalInclude,
      });
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: submit ? "SUBMIT" : "UPDATE",
      module: "工作管理",
      targetType: "MonthlyGoal",
      targetId: updated.id,
      targetName: `${monthLabel(updated.targetYear, updated.targetMonth)}目标`,
      content: submit ? "提交月目标" : "更新月目标",
      afterSummary: `目标项 ${updated.items.length} 条`,
    });

    if (submit) {
      await this.notifyWorkManagementReviewers({
        type: "MONTHLY_GOAL_SUBMITTED",
        title: "月目标已提交",
        content: `${userDisplayName(updated.user)} 提交了 ${monthLabel(updated.targetYear, updated.targetMonth)}目标。`,
        relatedType: "MONTHLY_GOAL",
        relatedId: updated.id,
        submitterUserId: updated.userId,
      });
    }

    return this.serializeMonthlyGoalDetail(updated, currentUser);
  }

  private async notifyWorkManagementReviewers(input: {
    type: string;
    title: string;
    content: string;
    relatedType: "WEEKLY_REPORT" | "MONTHLY_GOAL";
    relatedId: string;
    submitterUserId: string;
  }) {
    if (input.relatedType === "WEEKLY_REPORT") {
      const report = await this.prisma.weeklyReport.findUnique({
        where: { id: input.relatedId },
        select: {
          dataScope: true,
          partitionKey: true,
          testBatchId: true,
        },
      });
      if (!report || !this.isRealRecord(report)) {
        return;
      }
    }

    if (input.relatedType === "MONTHLY_GOAL") {
      const goal = await this.prisma.monthlyGoal.findUnique({
        where: { id: input.relatedId },
        select: {
          dataScope: true,
          partitionKey: true,
          testBatchId: true,
        },
      });
      if (!goal || !this.isRealRecord(goal)) {
        return;
      }
    }

    const reviewers = await this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        id: { not: input.submitterUserId },
        OR: [
          {
            role: {
              is: {
                code: {
                  in: ["SUPER_ADMIN", "ADMIN"],
                },
              },
            },
          },
          {
            role: {
              is: {
                rolePermissions: {
                  some: {
                    permission: {
                      is: {
                        code: "action.work_management.review",
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (!reviewers.length) {
      return;
    }

    await this.notificationService.deliverManyEventsSystemAndWecom(
      reviewers.map((reviewer) => ({
        userId: reviewer.id,
        type: input.type,
        title: input.title,
        content: input.content,
        relatedType: input.relatedType,
        relatedId: input.relatedId,
      })),
    );
  }

  private async notifyWeeklyReportDecision(
    report: WeeklyReportWithItems,
    reviewer: AuthenticatedUser,
  ) {
    if (!this.isRealRecord(report)) {
      return;
    }

    const approved = report.status === WeeklyReportStatus.APPROVED;

    await this.notificationService.deliverEventSystemAndWecom({
      userId: report.userId,
      type: "WEEKLY_REPORT_REVIEWED",
      title: approved ? "周报已通过" : "周报已退回",
      content: [
        `${reviewer.wecomName ?? reviewer.name} ${approved ? "通过了" : "退回了"}你的周报：${weekLabel(report.weekStartDate, report.weekEndDate)}`,
        report.managerReviewComment ? `说明：${report.managerReviewComment}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      relatedType: "WEEKLY_REPORT",
      relatedId: report.id,
    });
  }

  private isRealRecord(record: {
    dataScope: RecordDataScope;
    partitionKey: string;
    testBatchId: string | null;
  }) {
    return (
      record.dataScope === RecordDataScope.REAL &&
      record.partitionKey === REAL_PARTITION_KEY &&
      record.testBatchId === null
    );
  }

  private normalizeWeeklyReviewInputs(
    reviewItems: WeeklyReportWithItems["reviewItems"],
    dto: UpdateWeeklyReportDto,
  ) {
    const inputMap = new Map(dto.reviewItems.map((item) => [item.id, item]));

    return reviewItems.map<NormalizedWeeklyReview>((item) => {
      const input = inputMap.get(item.id);
      const status = input?.status ?? item.status;
      const incompleteReason =
        status === WeeklyPlanReviewStatus.INCOMPLETE
          ? normalizeOptionalText(input?.incompleteReason)
          : null;

      if (
        status === WeeklyPlanReviewStatus.INCOMPLETE &&
        !incompleteReason
      ) {
        throw new BadRequestException("标记未完成时必须填写未完成原因");
      }

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        plannedAt: item.plannedAt,
        status,
        incompleteReason,
        sortOrder: item.sortOrder,
      };
    });
  }

  private normalizeWeeklyPlanInputs(
    reviewItems: NormalizedWeeklyReview[],
    dto: UpdateWeeklyReportDto,
  ) {
    const reviewMap = new Map(reviewItems.map((item) => [item.id, item]));
    const planItems: NormalizedWeeklyPlan[] = [];
    const seenReviewIds = new Set<string>();

    dto.planItems.forEach((item, index) => {
      const sourceReview = item.sourceReviewItemId
        ? reviewMap.get(item.sourceReviewItemId)
        : null;

      if (item.sourceReviewItemId && !sourceReview) {
        return;
      }

      if (
        sourceReview &&
        sourceReview.status !== WeeklyPlanReviewStatus.INCOMPLETE
      ) {
        return;
      }

      const title = normalizeOptionalText(item.title) ?? sourceReview?.title;
      if (!title) {
        return;
      }

      planItems.push({
        sourceReviewItemId: sourceReview?.id ?? null,
        title,
        description:
          normalizeOptionalText(item.description) ??
          sourceReview?.description ??
          null,
        plannedAt:
          parseOptionalDate(item.plannedAt, "计划完成时间") ??
          sourceReview?.plannedAt ??
          null,
        sortOrder: item.sortOrder ?? index,
      });

      if (sourceReview) {
        seenReviewIds.add(sourceReview.id);
      }
    });

    reviewItems
      .filter(
        (item) =>
          item.status === WeeklyPlanReviewStatus.INCOMPLETE &&
          !seenReviewIds.has(item.id),
      )
      .forEach((item, index) => {
        planItems.push({
          sourceReviewItemId: item.id,
          title: item.title,
          description: item.description,
          plannedAt: item.plannedAt,
          sortOrder: planItems.length + index,
        });
      });

    return planItems
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((item, index) => ({
        ...item,
        sortOrder: index,
      }));
  }

  private normalizeMonthlyGoalItems(dto: UpdateMonthlyGoalDto) {
    return dto.items
      .map<NormalizedMonthlyGoalItem | null>((item, index) => {
        const title = normalizeOptionalText(item.title);
        if (!title) {
          return null;
        }

        return {
          title,
          metric: normalizeOptionalText(item.metric),
          dueAt: parseOptionalDate(item.dueAt, "目标截止时间"),
          progressNote: normalizeOptionalText(item.progressNote),
          riskNote: normalizeOptionalText(item.riskNote),
          sortOrder: item.sortOrder ?? index,
        };
      })
      .filter((item): item is NormalizedMonthlyGoalItem => Boolean(item))
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((item, index) => ({
        ...item,
        sortOrder: index,
      }));
  }

  private async buildWeeklyReportArchiveWhere(
    query: Pick<
      WeeklyReportArchiveQueryDto,
      "month" | "status" | "view" | "year"
    >,
    currentUser: AuthenticatedUser,
    view: "mine" | "team",
  ) {
    const visibleTeamUserIds =
      view === "team" ? await this.getVisibleTeamUserIds(currentUser) : [];
    const baseWhere: Prisma.WeeklyReportWhereInput = {
      ...(view === "mine"
        ? { userId: currentUser.id }
        : {
            userId: { in: visibleTeamUserIds },
            status: { in: this.getVisibleTeamWeeklyStatuses(currentUser) },
          }),
    };

    if (query.status && view === "mine") {
      baseWhere.status = query.status;
    }

    if (query.year && query.month) {
      const { monthStart, monthEnd } = getMonthRange(query.year, query.month);
      baseWhere.weekStartDate = {
        gte: monthStart,
        lte: monthEnd,
      };
    }

    return this.buildWeeklyReportWhere(currentUser, baseWhere);
  }

  private async findMonthlySubmittedWeeklyReports(
    userId: string,
    year: number,
    month: number,
    currentUser: AuthenticatedUser,
  ) {
    const { monthStart, monthEnd } = getMonthRange(year, month);

    return this.prisma.weeklyReport.findMany({
      where: this.buildWeeklyReportWhere(currentUser, {
        userId,
        status: { in: this.getMonthlySummarySourceStatuses() },
        weekStartDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      }),
      orderBy: [{ weekStartDate: "asc" }],
      include: weeklyReportInclude,
    });
  }

  private async countMonthlyWeeklyReports(
    userId: string,
    year: number,
    month: number,
    currentUser: AuthenticatedUser,
  ) {
    const { monthStart, monthEnd } = getMonthRange(year, month);

    return this.prisma.weeklyReport.count({
      where: this.buildWeeklyReportWhere(currentUser, {
        userId,
        weekStartDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      }),
    });
  }

  private async findWeeklyPublicDigestSourceReports(
    weekStartDate: Date,
    departmentKey: string,
    currentUser: AuthenticatedUser,
  ) {
    return this.prisma.weeklyReport.findMany({
      where: this.buildWeeklyReportWhere(currentUser, {
        weekStartDate,
        status: { in: this.getMonthlySummarySourceStatuses() },
        ...(departmentKey
          ? {
              user: {
                is: {
                  department: departmentKey,
                },
              },
            }
          : {
              OR: [
                {
                  user: {
                    is: {
                      department: null,
                    },
                  },
                },
                {
                  user: {
                    is: {
                      department: "",
                    },
                  },
                },
              ],
            }),
      }),
      orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
      include: weeklyReportInclude,
    });
  }

  private async countWeeklyReportsForWeek(
    weekStartDate: Date,
    departmentKey: string,
    currentUser: AuthenticatedUser,
  ) {
    return this.prisma.weeklyReport.count({
      where: this.buildWeeklyReportWhere(currentUser, {
        weekStartDate,
        ...(departmentKey
          ? {
              user: {
                is: {
                  department: departmentKey,
                },
              },
            }
          : {
              OR: [
                {
                  user: {
                    is: {
                      department: null,
                    },
                  },
                },
                {
                  user: {
                    is: {
                      department: "",
                    },
                  },
                },
              ],
            }),
      }),
    });
  }

  private buildWeeklyPublicDigestPayload(
    weekStartDate: Date,
    weekEndDate: Date,
    departmentKey: string,
    totalReportCount: number,
    sourceReports: WeeklyReportWithItems[],
  ): WeeklyPublicDigestPayload {
    const digestDepartmentLabel = departmentLabel(departmentKey);
    const approvedCount = sourceReports.filter(
      (item) => item.status === WeeklyReportStatus.APPROVED,
    ).length;
    const sourceReportSummaries = sourceReports.map((item) => ({
      id: item.id,
      label: weekLabel(item.weekStartDate, item.weekEndDate),
      status: item.status,
      submittedAt: item.submittedAt?.toISOString() ?? null,
      href: `/work-management/weekly-reports?reportId=${item.id}`,
      owner: {
        id: item.user.id,
        name: item.user.name,
        displayName: userDisplayName(item.user),
      },
    }));

    if (!sourceReports.length) {
      return {
        department: {
          key: departmentKey,
          label: digestDepartmentLabel,
        },
        provider: "heuristic",
        generatedAt: new Date(),
        generatedSummary: [
          `${digestDepartmentLabel} · 团队公开周报 · ${weekLabel(weekStartDate, weekEndDate)}`,
          "",
          `本周暂未汇集到可公开的周报内容。当前周期共有 ${totalReportCount} 份周报记录，待团队提交并完成汇整后，这里会自动生成对外版本。`,
        ].join("\n"),
        source: {
          totalReportCount,
          includedReportCount: 0,
          approvedReportCount: 0,
        },
        sourceReports: sourceReportSummaries,
      };
    }

    const achievementLines: string[] = [];
    const progressLines: string[] = [];
    const riskLines: string[] = [];
    const assistanceLines: string[] = [];
    const nextWeekLines: string[] = [];

    sourceReports.forEach((report) => {
      const ownerName = userDisplayName(report.user);
      const focusSections = parseLabeledText(report.focusSummary, [
        "本周推进说明",
        "本周问题 / 风险",
        "需要协助事项",
      ]);

      achievementLines.push(
        ...extractTextCandidates(report.completedSummary).map(
          (line) => `${ownerName}：${line}`,
        ),
      );
      progressLines.push(
        ...extractTextCandidates(
          focusSections.sections["本周推进说明"] || focusSections.fallback,
        ).map((line) => `${ownerName}：${line}`),
      );
      riskLines.push(
        ...extractTextCandidates(
          focusSections.sections["本周问题 / 风险"],
        ).map((line) => `${ownerName}：${line}`),
      );
      assistanceLines.push(
        ...extractTextCandidates(
          focusSections.sections["需要协助事项"],
        ).map((line) => `${ownerName}：${line}`),
      );
      nextWeekLines.push(
        ...report.planItems.map((item) => `${ownerName}：${item.title}`),
      );
    });

    return {
      department: {
        key: departmentKey,
        label: digestDepartmentLabel,
      },
      provider: "heuristic",
      generatedAt: new Date(),
      generatedSummary: [
        `${digestDepartmentLabel} · 团队公开周报 · ${weekLabel(weekStartDate, weekEndDate)}`,
        "",
        `${digestDepartmentLabel} 本次共纳入 ${sourceReports.length} 份已提交周报，周期内共有 ${totalReportCount} 份周报记录，其中 ${approvedCount} 份已通过主管审阅。`,
        "",
        "【本周亮点】",
        formatBulletList(
          achievementLines,
          "本周暂未提炼出适合公开同步的亮点内容。",
          8,
        ),
        "",
        "【持续推进】",
        formatBulletList(
          progressLines,
          "本周暂未整理出明确的持续推进事项。",
          8,
        ),
        "",
        "【风险与协作】",
        formatBulletList(
          [...riskLines, ...assistanceLines],
          "本周暂无需要集中公开同步的风险与协作事项。",
          8,
        ),
        "",
        "【下周重点】",
        formatBulletList(
          nextWeekLines,
          "下周重点仍在补充中，建议待团队计划确认后再对外发布。",
          8,
        ),
      ].join("\n"),
      source: {
        totalReportCount,
        includedReportCount: sourceReports.length,
        approvedReportCount: approvedCount,
      },
      sourceReports: sourceReportSummaries,
    };
  }

  private async refreshWeeklyPublicDigest(
    report: WeeklyReportWithItems,
    currentUser: AuthenticatedUser,
    force = false,
  ) {
    const departmentKey = normalizeDepartmentKey(report.user.department);
    const partitionKey = this.getPartitionKey(currentUser);
    const [sourceReports, totalReportCount, existing] = await Promise.all([
      this.findWeeklyPublicDigestSourceReports(
        report.weekStartDate,
        departmentKey,
        currentUser,
      ),
      this.countWeeklyReportsForWeek(
        report.weekStartDate,
        departmentKey,
        currentUser,
      ),
      this.prisma.weeklyPublicDigest.findUnique({
        where: {
          weekStartDate_department_partitionKey: {
            weekStartDate: report.weekStartDate,
            department: departmentKey,
            partitionKey,
          },
        },
        include: weeklyPublicDigestInclude,
      }),
    ]);

    const payload = this.buildWeeklyPublicDigestPayload(
      report.weekStartDate,
      report.weekEndDate,
      departmentKey,
      totalReportCount,
      sourceReports,
    );

    if (!existing) {
      const created = await this.prisma.weeklyPublicDigest.create({
        data: {
          weekStartDate: report.weekStartDate,
          weekEndDate: report.weekEndDate,
          department: payload.department.key,
          provider: payload.provider,
          generatedSummary: payload.generatedSummary,
          generatedAt: payload.generatedAt,
          sourceTotalReportCount: payload.source.totalReportCount,
          sourceIncludedReportCount: payload.source.includedReportCount,
          sourceApprovedReportCount: payload.source.approvedReportCount,
          ...(await this.recordPartition.getWritableCreateData(currentUser)),
        },
        include: weeklyPublicDigestInclude,
      });

      return {
        digest: created,
        payload,
      };
    }

    const shouldUpdateGeneratedDraft =
      force ||
      existing.weekEndDate.getTime() !== report.weekEndDate.getTime() ||
      existing.provider !== payload.provider ||
      existing.generatedSummary !== payload.generatedSummary ||
      existing.sourceTotalReportCount !== payload.source.totalReportCount ||
      existing.sourceIncludedReportCount !== payload.source.includedReportCount ||
      existing.sourceApprovedReportCount !== payload.source.approvedReportCount;

    if (!shouldUpdateGeneratedDraft) {
      return {
        digest: existing,
        payload,
      };
    }

    const updated = await this.prisma.weeklyPublicDigest.update({
      where: { id: existing.id },
      data: {
        weekEndDate: report.weekEndDate,
        department: payload.department.key,
        provider: payload.provider,
        generatedSummary: payload.generatedSummary,
        generatedAt: payload.generatedAt,
        sourceTotalReportCount: payload.source.totalReportCount,
        sourceIncludedReportCount: payload.source.includedReportCount,
        sourceApprovedReportCount: payload.source.approvedReportCount,
      },
      include: weeklyPublicDigestInclude,
    });

    return {
      digest: updated,
      payload,
    };
  }

  private buildMonthlyGoalAiSummaryPayload(
    goal: MonthlyGoalWithItems,
    sourceTarget: { year: number; month: number },
    totalWeeklyReports: number,
    submittedReports: WeeklyReportWithItems[],
  ): MonthlyGoalAiSummaryPayload {
    const achievementLines: string[] = [];
    const progressLines: string[] = [];
    const riskLines: string[] = [];
    const assistanceLines: string[] = [];
    const carryoverLines: string[] = [];
    const planTitleLines: string[] = [];

    submittedReports.forEach((report) => {
      const focusSections = parseLabeledText(report.focusSummary, [
        "本周推进说明",
        "本周问题 / 风险",
        "需要协助事项",
      ]);

      achievementLines.push(...extractTextCandidates(report.completedSummary));
      progressLines.push(
        ...extractTextCandidates(
          focusSections.sections["本周推进说明"] || focusSections.fallback,
        ),
      );
      riskLines.push(
        ...extractTextCandidates(focusSections.sections["本周问题 / 风险"]),
      );
      assistanceLines.push(
        ...extractTextCandidates(focusSections.sections["需要协助事项"]),
      );
      planTitleLines.push(...report.planItems.map((item) => item.title));
      carryoverLines.push(
        ...report.reviewItems
          .filter((item) => item.status === WeeklyPlanReviewStatus.INCOMPLETE)
          .map((item) =>
            item.incompleteReason
              ? `${item.title}：${item.incompleteReason}`
              : item.title,
          ),
      );
    });

    const goalTitleLines = goal.items.map((item) => item.title);
    const goalRiskLines = goal.items
      .map((item) => item.riskNote)
      .flatMap((item) => extractTextCandidates(item));
    const goalProgressLines = goal.items
      .map((item) => item.progressNote)
      .flatMap((item) => extractTextCandidates(item));

    const highlights = formatBulletList(
      [...achievementLines, ...progressLines],
      "本月暂未形成足够的周报成果文本，建议先补齐已提交周报后再生成。",
    );
    const patterns = [
      `- 来源周期：${monthLabel(sourceTarget.year, sourceTarget.month)}`,
      `- 已纳入 ${submittedReports.length} 份已提交周报，周期内共存在 ${totalWeeklyReports} 份周报记录。`,
      `- 当前月目标包含 ${goal.items.length} 条目标项。`,
      ...dedupeLines([...planTitleLines, ...goalTitleLines])
        .slice(0, 5)
        .map((line) => `- 高频推进主题：${line}`),
    ].join("\n");
    const risks = formatBulletList(
      [...riskLines, ...assistanceLines, ...goalRiskLines],
      "本周期未提炼出明显的高频风险，可继续通过周报补充风险说明与协助事项。",
    );
    const carryovers = formatBulletList(
      carryoverLines,
      "本周期暂未识别出明确的未完成承接事项。",
    );
    const nextMonthSuggestions = formatBulletList(
      [
        ...carryoverLines.map((line) => `优先收口：${line}`),
        ...goalProgressLines.map((line) => `推进中事项：${line}`),
        ...dedupeLines([...planTitleLines, ...goalTitleLines]).map(
          (line) => `可转成下月重点：${line}`,
        ),
      ],
      "建议基于本月周报补充更多成果与风险后，再生成更具体的下月重点建议。",
    );

    return {
      goalId: goal.id,
      provider: "heuristic",
      generatedAt: new Date(),
      sourcePeriod: {
        year: sourceTarget.year,
        month: sourceTarget.month,
        label: monthLabel(sourceTarget.year, sourceTarget.month),
      },
      source: {
        weeklyReportCount: totalWeeklyReports,
        submittedWeeklyReportCount: submittedReports.length,
        goalItemCount: goal.items.length,
      },
      weeklyReports: submittedReports.map((item) => ({
        id: item.id,
        label: weekLabel(item.weekStartDate, item.weekEndDate),
        status: item.status,
        submittedAt: item.submittedAt?.toISOString() ?? null,
        href: `/work-management/weekly-reports?reportId=${item.id}`,
      })),
      sections: {
        highlights,
        patterns,
        risks,
        carryovers,
        nextMonthSuggestions,
      },
    };
  }

  private async requireWeeklyReport(id: string, currentUser: AuthenticatedUser) {
    const report = await this.prisma.weeklyReport.findFirst({
      where: this.buildWeeklyReportWhere(currentUser, {
        id,
        userId: currentUser.id,
      }),
      include: weeklyReportInclude,
    });

    if (!report) {
      throw new NotFoundException("周报不存在");
    }

    return report;
  }

  private async requireWeeklyReportAccessible(
    id: string,
    currentUser: AuthenticatedUser,
  ) {
    const visibleTeamUserIds = await this.getVisibleTeamUserIds(currentUser);
    const visibleStatuses = this.canReviewWeeklyReport(currentUser)
      ? [
          WeeklyReportStatus.SUBMITTED,
          WeeklyReportStatus.RETURNED,
          WeeklyReportStatus.APPROVED,
        ]
      : [WeeklyReportStatus.SUBMITTED, WeeklyReportStatus.APPROVED];

    const report = await this.prisma.weeklyReport.findFirst({
      where: this.buildWeeklyReportWhere(currentUser, {
        id,
        OR: [
          { userId: currentUser.id },
          {
            status: { in: visibleStatuses },
            userId: { in: visibleTeamUserIds },
          },
        ],
      }),
      include: weeklyReportInclude,
    });

    if (!report) {
      throw new NotFoundException("周报不存在");
    }

    return report;
  }

  private async getVisibleTeamUserIds(currentUser: AuthenticatedUser) {
    return (await this.accessControl.getAssignableUsers(currentUser))
      .map((member) => member.id)
      .filter((id) => id !== currentUser.id);
  }

  private async requireMonthlyGoal(id: string, currentUser: AuthenticatedUser) {
    const goal = await this.prisma.monthlyGoal.findFirst({
      where: this.buildMonthlyGoalWhere(currentUser, {
        id,
        userId: currentUser.id,
      }),
      include: monthlyGoalInclude,
    });

    if (!goal) {
      throw new NotFoundException("月目标不存在");
    }

    return goal;
  }

  private async requireMonthlyGoalAccessible(
    id: string,
    currentUser: AuthenticatedUser,
  ) {
    const goal = await this.prisma.monthlyGoal.findFirst({
      where: this.buildMonthlyGoalWhere(currentUser, {
        id,
        OR: [
          { userId: currentUser.id },
          { status: MonthlyGoalStatus.SUBMITTED },
        ],
      }),
      include: monthlyGoalInclude,
    });

    if (!goal) {
      throw new NotFoundException("月目标不存在");
    }

    return goal;
  }

  private getPartitionKey(
    currentUser: Pick<AuthenticatedUser, "recordDataScope" | "testBatchId">,
  ) {
    return this.recordPartition.resolveContext(currentUser).partitionKey;
  }

  private buildWeeklyReportWhere(
    currentUser: Pick<AuthenticatedUser, "recordDataScope" | "testBatchId">,
    baseWhere: Prisma.WeeklyReportWhereInput = {},
  ) {
    return this.recordPartition.mergeWhere(
      baseWhere,
      this.recordPartition.buildWhere(currentUser) as Prisma.WeeklyReportWhereInput,
    );
  }

  private buildMonthlyGoalWhere(
    currentUser: Pick<AuthenticatedUser, "recordDataScope" | "testBatchId">,
    baseWhere: Prisma.MonthlyGoalWhereInput = {},
  ) {
    return this.recordPartition.mergeWhere(
      baseWhere,
      this.recordPartition.buildWhere(currentUser) as Prisma.MonthlyGoalWhereInput,
    );
  }

  private buildRealWeeklyReportWhere(
    baseWhere: Prisma.WeeklyReportWhereInput = {},
  ) {
    return this.recordPartition.mergeWhere(baseWhere, {
      dataScope: RecordDataScope.REAL,
      partitionKey: REAL_PARTITION_KEY,
      testBatchId: null,
    } as Prisma.WeeklyReportWhereInput);
  }

  private buildRealMonthlyGoalWhere(
    baseWhere: Prisma.MonthlyGoalWhereInput = {},
  ) {
    return this.recordPartition.mergeWhere(baseWhere, {
      dataScope: RecordDataScope.REAL,
      partitionKey: REAL_PARTITION_KEY,
      testBatchId: null,
    } as Prisma.MonthlyGoalWhereInput);
  }

  private serializeWeeklyReportSummary(report: WeeklyReportWithItems) {
    return {
      id: report.id,
      weekStartDate: report.weekStartDate,
      weekEndDate: report.weekEndDate,
      label: weekLabel(report.weekStartDate, report.weekEndDate),
      status: report.status,
      owner: {
        id: report.user.id,
        name: report.user.name,
        displayName: userDisplayName(report.user),
      },
      updatedAt: report.updatedAt,
      submittedAt: report.submittedAt,
      reviewedAt: report.managerReviewedAt,
      reviewComment: report.managerReviewComment,
      reviewer: report.managerReviewer
        ? {
            id: report.managerReviewer.id,
            name: report.managerReviewer.name,
            displayName: userDisplayName(report.managerReviewer),
          }
        : null,
      completedSummary: report.completedSummary,
      focusSummary: report.focusSummary,
      reviewItemCount: report.reviewItems.length,
      openReviewCount: report.reviewItems.filter(
        (item) => item.status !== WeeklyPlanReviewStatus.COMPLETED,
      ).length,
      incompleteCarryOverCount: report.reviewItems.filter(
        (item) => item.status === WeeklyPlanReviewStatus.INCOMPLETE,
      ).length,
      planItemCount: report.planItems.length,
      scheduledPlanCount: report.planItems.filter((item) => item.plannedAt).length,
    };
  }

  private serializeWeeklyReportDetail(
    report: WeeklyReportWithItems,
    currentUser: Pick<AuthenticatedUser, "id" | "roleCode" | "permissions">,
  ) {
    return {
      ...this.serializeWeeklyReportSummary(report),
      canEdit: report.userId === currentUser.id,
      canReview:
        report.userId !== currentUser.id &&
        this.canReviewWeeklyReport(currentUser),
      reviewItems: report.reviewItems.map((item) => ({
        id: item.id,
        sourcePlanItemId: item.sourcePlanItemId,
        title: item.title,
        description: item.description,
        plannedAt: item.plannedAt,
        status: item.status,
        incompleteReason: item.incompleteReason,
        sortOrder: item.sortOrder,
      })),
      planItems: report.planItems.map((item) => ({
        id: item.id,
        sourceReviewItemId: item.sourceReviewItemId,
        taskId: item.taskId,
        title: item.title,
        description: item.description,
        plannedAt: item.plannedAt,
        sortOrder: item.sortOrder,
      })),
    };
  }

  private serializeWeeklyPublicDigest(
    digest: WeeklyPublicDigestRecord,
    payload: WeeklyPublicDigestPayload,
    currentUser: Pick<AuthenticatedUser, "roleCode" | "permissions">,
  ) {
    return {
      id: digest.id,
      label: weekLabel(digest.weekStartDate, digest.weekEndDate),
      weekStartDate: digest.weekStartDate,
      weekEndDate: digest.weekEndDate,
      department: payload.department,
      provider: digest.provider,
      generatedAt: digest.generatedAt,
      publishedAt: digest.publishedAt,
      updatedAt: digest.updatedAt,
      generatedSummary: digest.generatedSummary,
      publishedSummary: digest.publishedSummary,
      finalSummary: digest.publishedSummary?.trim() || digest.generatedSummary || "",
      canEdit: this.canReviewWeeklyReport(currentUser),
      publisher: digest.publishedBy
        ? {
            id: digest.publishedBy.id,
            name: digest.publishedBy.name,
            displayName: userDisplayName(digest.publishedBy),
          }
        : null,
      source: payload.source,
      sourceReports: payload.sourceReports,
    };
  }

  private serializeMonthlyGoalSummary(goal: MonthlyGoalWithItems) {
    return {
      id: goal.id,
      targetYear: goal.targetYear,
      targetMonth: goal.targetMonth,
      label: monthLabel(goal.targetYear, goal.targetMonth),
      status: goal.status,
      owner: {
        id: goal.user.id,
        name: goal.user.name,
        displayName: userDisplayName(goal.user),
      },
      updatedAt: goal.updatedAt,
      submittedAt: goal.submittedAt,
      summary: goal.summary,
      itemCount: goal.items.length,
      scheduledItemCount: goal.items.filter((item) => item.dueAt).length,
    };
  }

  private serializeMonthlyGoalDetail(
    goal: MonthlyGoalWithItems,
    currentUser: Pick<AuthenticatedUser, "id">,
  ) {
    return {
      ...this.serializeMonthlyGoalSummary(goal),
      canEdit: goal.userId === currentUser.id,
      items: goal.items.map((item) => ({
        id: item.id,
        title: item.title,
        metric: item.metric,
        dueAt: item.dueAt,
        progressNote: item.progressNote,
        riskNote: item.riskNote,
        sortOrder: item.sortOrder,
      })),
      aiSummaries: goal.aiSummaries.map((item) =>
        this.serializeMonthlyGoalAiSummarySnapshot(item),
      ),
    };
  }

  private serializeMonthlyGoalAiSummarySnapshot(
    snapshot: MonthlyGoalAiSummarySnapshotRecord,
  ) {
    const sections = snapshot.sectionsJson as unknown as Partial<MonthlyGoalAiSummarySections>;
    const weeklyReports =
      snapshot.weeklyReportsJson as unknown as MonthlyGoalAiSummaryWeeklyReport[];

    return {
      snapshotId: snapshot.id,
      goalId: snapshot.monthlyGoalId,
      provider: snapshot.provider,
      generatedAt: snapshot.generatedAt,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
      sourcePeriod: {
        year: snapshot.sourceYear,
        month: snapshot.sourceMonth,
        label: monthLabel(snapshot.sourceYear, snapshot.sourceMonth),
      },
      source: {
        weeklyReportCount: snapshot.weeklyReportCount,
        submittedWeeklyReportCount: snapshot.submittedWeeklyReportCount,
        goalItemCount: snapshot.goalItemCount,
      },
      weeklyReports: Array.isArray(weeklyReports) ? weeklyReports : [],
      sections: {
        highlights: sections.highlights ?? "",
        patterns: sections.patterns ?? "",
        risks: sections.risks ?? "",
        carryovers: sections.carryovers ?? "",
        nextMonthSuggestions: sections.nextMonthSuggestions ?? "",
      },
    };
  }
}
