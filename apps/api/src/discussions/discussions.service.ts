import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  MonthlyGoalStatus,
  Prisma,
  WeeklyReportStatus,
} from "@prisma/client";
import { AccessControlService } from "../common/services/access-control.service";
import { AuditService } from "../common/services/audit.service";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { NotificationService } from "../modules/notifications/notification.service";
import { PrismaService } from "../prisma/prisma.service";

type DiscussionTargetType = "TASK" | "WEEKLY_REPORT" | "MONTHLY_GOAL";

type DiscussionTargetContext = {
  id: string;
  relatedType: DiscussionTargetType;
  ownerUserId: string;
  ownerDisplayName: string;
  targetName: string;
  notificationTitle: string;
  recipientUserIds: string[];
};

const userSelect = {
  id: true,
  name: true,
  wecomName: true,
} satisfies Prisma.UserSelect;

function displayName(user: { name: string; wecomName?: string | null }) {
  return user.wecomName ?? user.name;
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

function monthLabel(targetYear: number, targetMonth: number) {
  return `${targetYear} 年 ${String(targetMonth).padStart(2, "0")} 月`;
}

function trimCommentContent(content: string) {
  const normalized = content.trim();
  if (!normalized) {
    throw new BadRequestException("留言内容不能为空");
  }

  return normalized;
}

function excerpt(content: string, length = 48) {
  return content.length > length ? `${content.slice(0, length)}...` : content;
}

@Injectable()
export class DiscussionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  async listTaskComments(taskId: string, currentUser: AuthenticatedUser) {
    const target = await this.requireTaskTarget(taskId, currentUser);
    return this.listComments(target, currentUser);
  }

  async createTaskComment(
    taskId: string,
    content: string,
    currentUser: AuthenticatedUser,
  ) {
    const target = await this.requireTaskTarget(taskId, currentUser);
    return this.createComment(target, content, currentUser);
  }

  async updateTaskComment(
    taskId: string,
    commentId: string,
    content: string,
    currentUser: AuthenticatedUser,
  ) {
    const target = await this.requireTaskTarget(taskId, currentUser);
    return this.updateComment(target, commentId, content, currentUser);
  }

  async listWeeklyReportComments(
    reportId: string,
    currentUser: AuthenticatedUser,
  ) {
    const target = await this.requireWeeklyReportTarget(reportId, currentUser);
    return this.listComments(target, currentUser);
  }

  async createWeeklyReportComment(
    reportId: string,
    content: string,
    currentUser: AuthenticatedUser,
  ) {
    const target = await this.requireWeeklyReportTarget(reportId, currentUser);
    return this.createComment(target, content, currentUser);
  }

  async updateWeeklyReportComment(
    reportId: string,
    commentId: string,
    content: string,
    currentUser: AuthenticatedUser,
  ) {
    const target = await this.requireWeeklyReportTarget(reportId, currentUser);
    return this.updateComment(target, commentId, content, currentUser);
  }

  async listMonthlyGoalComments(
    goalId: string,
    currentUser: AuthenticatedUser,
  ) {
    const target = await this.requireMonthlyGoalTarget(goalId, currentUser);
    return this.listComments(target, currentUser);
  }

  async createMonthlyGoalComment(
    goalId: string,
    content: string,
    currentUser: AuthenticatedUser,
  ) {
    const target = await this.requireMonthlyGoalTarget(goalId, currentUser);
    return this.createComment(target, content, currentUser);
  }

  async updateMonthlyGoalComment(
    goalId: string,
    commentId: string,
    content: string,
    currentUser: AuthenticatedUser,
  ) {
    const target = await this.requireMonthlyGoalTarget(goalId, currentUser);
    return this.updateComment(target, commentId, content, currentUser);
  }

  private async listComments(
    target: DiscussionTargetContext,
    currentUser: AuthenticatedUser,
  ) {
    const comments = await this.prisma.discussionComment.findMany({
      where: {
        relatedType: target.relatedType,
        relatedId: target.id,
      },
      orderBy: [{ createdAt: "asc" }],
      include: {
        user: {
          select: userSelect,
        },
      },
    });

    return {
      target: {
        id: target.id,
        relatedType: target.relatedType,
        ownerUserId: target.ownerUserId,
        ownerDisplayName: target.ownerDisplayName,
        targetName: target.targetName,
      },
      items: comments.map((comment) => this.serializeComment(comment, currentUser)),
    };
  }

  private async createComment(
    target: DiscussionTargetContext,
    content: string,
    currentUser: AuthenticatedUser,
  ) {
    const normalizedContent = trimCommentContent(content);
    const created = await this.prisma.discussionComment.create({
      data: {
        userId: currentUser.id,
        relatedType: target.relatedType,
        relatedId: target.id,
        content: normalizedContent,
      },
      include: {
        user: {
          select: userSelect,
        },
      },
    });

    await this.notifyParticipants(target, created.id, normalizedContent, currentUser);
    await this.auditService.log({
      userId: currentUser.id,
      action: "COMMENT",
      module: "协作讨论",
      targetType: target.relatedType,
      targetId: target.id,
      targetName: target.targetName,
      content: "新增留言",
      afterSummary: excerpt(normalizedContent, 120),
    });

    return this.serializeComment(created, currentUser);
  }

  private async updateComment(
    target: DiscussionTargetContext,
    commentId: string,
    content: string,
    currentUser: AuthenticatedUser,
  ) {
    const normalizedContent = trimCommentContent(content);
    const existing = await this.prisma.discussionComment.findFirst({
      where: {
        id: commentId,
        relatedType: target.relatedType,
        relatedId: target.id,
      },
      include: {
        user: {
          select: userSelect,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException("留言不存在");
    }

    if (existing.userId !== currentUser.id) {
      throw new ForbiddenException("只能编辑自己的留言");
    }

    const updated = await this.prisma.discussionComment.update({
      where: { id: existing.id },
      data: {
        content: normalizedContent,
      },
      include: {
        user: {
          select: userSelect,
        },
      },
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: "UPDATE",
      module: "协作讨论",
      targetType: target.relatedType,
      targetId: target.id,
      targetName: target.targetName,
      content: "编辑留言",
      beforeSummary: excerpt(existing.content, 120),
      afterSummary: excerpt(normalizedContent, 120),
    });

    return this.serializeComment(updated, currentUser);
  }

  private async notifyParticipants(
    target: DiscussionTargetContext,
    commentId: string,
    content: string,
    currentUser: AuthenticatedUser,
  ) {
    const historicalParticipants = await this.prisma.discussionComment.findMany({
      where: {
        relatedType: target.relatedType,
        relatedId: target.id,
      },
      distinct: ["userId"],
      select: {
        userId: true,
      },
    });

    const recipientUserIds = Array.from(
      new Set([
        ...target.recipientUserIds,
        ...historicalParticipants.map((item) => item.userId),
      ]),
    ).filter((userId) => userId !== currentUser.id);

    if (!recipientUserIds.length) {
      return;
    }

    const actorName = currentUser.wecomName ?? currentUser.name;
    await this.notificationService.deliverManySystemAndWecom(
      recipientUserIds.map((userId) => ({
        userId,
        type: "DISCUSSION_COMMENT",
        title: target.notificationTitle,
        content: `${actorName} 在 ${target.targetName} 留言：${excerpt(content)}`,
        relatedType: target.relatedType,
        relatedId: target.id
      }))
    );

    await this.auditService.log({
      userId: currentUser.id,
      action: "NOTIFY",
      module: "协作讨论",
      targetType: target.relatedType,
      targetId: target.id,
      targetName: target.targetName,
      content: `留言通知 ${recipientUserIds.length} 人`,
      afterSummary: `commentId=${commentId}`,
    });
  }

  private async requireTaskTarget(
    taskId: string,
    currentUser: AuthenticatedUser,
  ): Promise<DiscussionTargetContext> {
    const task = await this.prisma.task.findFirst({
      where: await this.accessControl.buildTaskWhere(currentUser, { id: taskId }),
      include: {
        assignee: {
          select: userSelect,
        },
        creator: {
          select: userSelect,
        },
      },
    });

    if (!task) {
      throw new NotFoundException("日程不存在或无权访问");
    }

    return {
      id: task.id,
      relatedType: "TASK",
      ownerUserId: task.assigneeUserId,
      ownerDisplayName: displayName(task.assignee),
      targetName: task.title,
      notificationTitle: "日程有新留言",
      recipientUserIds: [task.assigneeUserId, task.createdBy],
    };
  }

  private async requireWeeklyReportTarget(
    reportId: string,
    currentUser: AuthenticatedUser,
  ): Promise<DiscussionTargetContext> {
    const visibleStatuses = this.accessControl.hasPermission(
      currentUser,
      "action.work_management.review",
    )
      ? [
          WeeklyReportStatus.SUBMITTED,
          WeeklyReportStatus.RETURNED,
          WeeklyReportStatus.APPROVED,
        ]
      : [WeeklyReportStatus.SUBMITTED, WeeklyReportStatus.APPROVED];

    const report = await this.prisma.weeklyReport.findFirst({
      where: {
        id: reportId,
        OR: [
          { userId: currentUser.id },
          { status: { in: visibleStatuses } },
        ],
      },
      include: {
        user: {
          select: userSelect,
        },
      },
    });

    if (!report) {
      throw new NotFoundException("周报不存在或无权访问");
    }

    return {
      id: report.id,
      relatedType: "WEEKLY_REPORT",
      ownerUserId: report.userId,
      ownerDisplayName: displayName(report.user),
      targetName: `${displayName(report.user)} · 周报 ${weekLabel(report.weekStartDate, report.weekEndDate)}`,
      notificationTitle: "周报有新留言",
      recipientUserIds: [report.userId],
    };
  }

  private async requireMonthlyGoalTarget(
    goalId: string,
    currentUser: AuthenticatedUser,
  ): Promise<DiscussionTargetContext> {
    const goal = await this.prisma.monthlyGoal.findFirst({
      where: {
        id: goalId,
        OR: [
          { userId: currentUser.id },
          { status: MonthlyGoalStatus.SUBMITTED },
        ],
      },
      include: {
        user: {
          select: userSelect,
        },
      },
    });

    if (!goal) {
      throw new NotFoundException("月目标不存在或无权访问");
    }

    return {
      id: goal.id,
      relatedType: "MONTHLY_GOAL",
      ownerUserId: goal.userId,
      ownerDisplayName: displayName(goal.user),
      targetName: `${displayName(goal.user)} · ${monthLabel(goal.targetYear, goal.targetMonth)} 目标`,
      notificationTitle: "月目标有新留言",
      recipientUserIds: [goal.userId],
    };
  }

  private serializeComment(
    comment: {
      id: string;
      userId: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
      user: {
        id: string;
        name: string;
        wecomName: string | null;
      };
    },
    currentUser: Pick<AuthenticatedUser, "id">,
  ) {
    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      isEdited: comment.updatedAt.getTime() > comment.createdAt.getTime(),
      canEdit: comment.userId === currentUser.id,
      user: {
        id: comment.user.id,
        name: comment.user.name,
        displayName: displayName(comment.user),
      },
    };
  }
}
