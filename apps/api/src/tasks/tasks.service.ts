import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, RecordDataScope, TaskStatus } from "@prisma/client";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { AccessControlService } from "../common/services/access-control.service";
import { AuditService } from "../common/services/audit.service";
import {
  REAL_PARTITION_KEY,
  RecordPartitionService,
} from "../common/services/record-partition.service";
import { NotificationService } from "../modules/notifications/notification.service";
import { WecomCalendarService } from "../modules/wecom/wecom-calendar.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTaskDto, QueryTasksDto, UpdateTaskDto } from "./dto/task.dto";

type TaskQuickAction =
  | "TASK_DONE"
  | "TASK_DOING"
  | "TASK_TODO"
  | "TASK_DELAY_1D"
  | "TASK_DELAY_3D"
  | "TASK_DELAY_7D";

function toDateOrUndefined(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException("时间格式不正确");
  }

  return date;
}

function normalizeOptionalId(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly auditService: AuditService,
    private readonly recordPartition: RecordPartitionService,
    private readonly notificationService: NotificationService,
    private readonly wecomCalendarService: WecomCalendarService,
  ) {}

  async list(query: QueryTasksDto, currentUser: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 50, 100);
    const where = await this.buildListWhere(query, currentUser);

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy: [{ startAt: "asc" }, { createdAt: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: this.taskInclude(),
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: items.map((item) => this.serializeTask(item)),
    };
  }

  async getById(id: string, currentUser: AuthenticatedUser) {
    return this.serializeTask(await this.ensureTaskAccess(id, currentUser));
  }

  async quickAction(
    id: string,
    action: TaskQuickAction,
    currentUser: AuthenticatedUser,
  ) {
    const existing = await this.ensureTaskAccess(id, currentUser);
    const delayDays =
      action === "TASK_DELAY_1D"
        ? 1
        : action === "TASK_DELAY_3D"
          ? 3
          : action === "TASK_DELAY_7D"
            ? 7
            : 0;
    const status =
      action === "TASK_DONE"
        ? TaskStatus.DONE
        : action === "TASK_DOING"
          ? TaskStatus.DOING
          : action === "TASK_TODO" || delayDays
            ? TaskStatus.TODO
            : existing.status;
    const delayedDates = delayDays
      ? this.delayTaskDates(existing, delayDays)
      : {};

    const updated = await this.prisma.task.update({
      where: { id: existing.id },
      data: {
        status,
        ...delayedDates,
      },
      include: this.taskInclude(),
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: delayDays ? "UPDATE" : "STATUS",
      module: "日程",
      targetType: "Task",
      targetId: updated.id,
      targetName: updated.title,
      content: delayDays ? `快速延后日程 ${delayDays} 天` : "快速更新日程状态",
      beforeSummary: this.auditService.summarizeChanges(
        this.auditSnapshot(existing),
        null,
        [],
      ),
      afterSummary: this.auditService.summarizeChanges(
        this.auditSnapshot(existing),
        this.auditSnapshot(updated),
        ["status", "startAt", "endAt", "reminderAt"],
      ),
    });

    await this.syncTaskCalendar(updated);

    return this.serializeTask(updated);
  }

  async create(dto: CreateTaskDto, currentUser: AuthenticatedUser) {
    await this.ensureAssigneeAllowed(dto.assigneeUserId, currentUser);
    const normalizedCustomerId = normalizeOptionalId(dto.customerId);
    const customerId = normalizedCustomerId
      ? await this.ensureCustomerAccess(normalizedCustomerId, currentUser)
      : undefined;
    const normalizedQuotationId = normalizeOptionalId(dto.quotationId);
    const quotation = normalizedQuotationId
      ? await this.ensureQuotationAccess(normalizedQuotationId, currentUser)
      : null;
    const normalizedAgriculturePlanId = normalizeOptionalId(
      dto.agriculturePlanId,
    );
    const agriculturePlan = normalizedAgriculturePlanId
      ? await this.ensureAgriculturePlanAccess(
          normalizedAgriculturePlanId,
          currentUser,
        )
      : null;
    const resolvedQuotationId = quotation?.id ?? agriculturePlan?.quotationId;
    const resolvedCustomerId =
      customerId ?? quotation?.customerId ?? agriculturePlan?.customerId;

    if (
      customerId &&
      quotation?.customerId &&
      quotation.customerId !== customerId
    ) {
      throw new BadRequestException("报价与客户关系不一致");
    }

    if (
      customerId &&
      agriculturePlan?.customerId &&
      agriculturePlan.customerId !== customerId
    ) {
      throw new BadRequestException("方案与客户关系不一致");
    }

    if (
      quotation &&
      agriculturePlan?.quotationId &&
      agriculturePlan.quotationId !== quotation.id
    ) {
      throw new BadRequestException("方案与报价关系不一致");
    }

    const startAt = toDateOrUndefined(dto.startAt);
    if (!startAt) {
      throw new BadRequestException("开始时间不能为空");
    }

    const endAt = toDateOrUndefined(dto.endAt);
    if (endAt && endAt.getTime() < startAt.getTime()) {
      throw new BadRequestException("结束时间不能早于开始时间");
    }

    const reminderAt = toDateOrUndefined(dto.reminderAt);
    const partition = await this.recordPartition.getWritableCreateData(currentUser);
    const task = await this.prisma.task.create({
      data: {
        title: dto.title.trim(),
        type: dto.type,
        customerId: resolvedCustomerId,
        quotationId: resolvedQuotationId,
        agriculturePlanId: agriculturePlan?.id,
        assigneeUserId: dto.assigneeUserId,
        startAt,
        endAt,
        reminderAt,
        content: dto.content?.trim() || null,
        createdBy: currentUser.id,
        dataScope: partition.dataScope,
        partitionKey: partition.partitionKey,
        testBatchId: partition.testBatchId,
      },
      include: this.taskInclude(),
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: "CREATE",
      module: "日程",
      targetType: "Task",
      targetId: task.id,
      targetName: task.title,
      content: "新增日程",
      afterSummary: `负责人: ${task.assignee.name}；开始时间: ${task.startAt.toISOString()}`,
    });

    await this.notifyTaskAssignee(task, currentUser, "create");
    await this.syncTaskCalendar(task);

    return this.serializeTask(task);
  }

  async update(id: string, dto: UpdateTaskDto, currentUser: AuthenticatedUser) {
    const existing = await this.ensureTaskAccess(id, currentUser);

    if (dto.assigneeUserId && dto.assigneeUserId !== existing.assigneeUserId) {
      await this.ensureAssigneeAllowed(dto.assigneeUserId, currentUser);
    }

    const requestedCustomerId =
      dto.customerId !== undefined
        ? normalizeOptionalId(dto.customerId)
        : (existing.customerId ?? undefined);
    const customerId = requestedCustomerId
      ? await this.ensureCustomerAccess(requestedCustomerId, currentUser)
      : null;
    const requestedQuotationId =
      dto.quotationId !== undefined
        ? normalizeOptionalId(dto.quotationId)
        : (existing.quotationId ?? undefined);
    const quotation = requestedQuotationId
      ? await this.ensureQuotationAccess(requestedQuotationId, currentUser)
      : null;
    const requestedAgriculturePlanId =
      dto.agriculturePlanId !== undefined
        ? normalizeOptionalId(dto.agriculturePlanId)
        : (existing.agriculturePlanId ?? undefined);
    const agriculturePlan = requestedAgriculturePlanId
      ? await this.ensureAgriculturePlanAccess(
          requestedAgriculturePlanId,
          currentUser,
        )
      : null;
    const resolvedQuotationId =
      quotation?.id ?? agriculturePlan?.quotationId ?? null;
    const resolvedCustomerId =
      customerId ??
      quotation?.customerId ??
      agriculturePlan?.customerId ??
      null;

    if (
      customerId &&
      quotation?.customerId &&
      quotation.customerId !== customerId
    ) {
      throw new BadRequestException("报价与客户关系不一致");
    }

    if (
      customerId &&
      agriculturePlan?.customerId &&
      agriculturePlan.customerId !== customerId
    ) {
      throw new BadRequestException("方案与客户关系不一致");
    }

    if (
      quotation &&
      agriculturePlan?.quotationId &&
      agriculturePlan.quotationId !== quotation.id
    ) {
      throw new BadRequestException("方案与报价关系不一致");
    }

    const startAt =
      dto.startAt !== undefined
        ? toDateOrUndefined(dto.startAt)
        : existing.startAt;
    const endAt =
      dto.endAt !== undefined ? toDateOrUndefined(dto.endAt) : existing.endAt;

    if (startAt && endAt && endAt.getTime() < startAt.getTime()) {
      throw new BadRequestException("结束时间不能早于开始时间");
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        customerId: resolvedCustomerId,
        quotationId: resolvedQuotationId,
        agriculturePlanId: agriculturePlan?.id ?? null,
        assigneeUserId: dto.assigneeUserId,
        startAt,
        endAt,
        reminderAt:
          dto.reminderAt !== undefined
            ? toDateOrUndefined(dto.reminderAt)
            : undefined,
        content:
          dto.content !== undefined ? dto.content.trim() || null : undefined,
        status: dto.status,
      },
      include: this.taskInclude(),
    });

    await this.auditService.log({
      userId: currentUser.id,
      action:
        dto.status && dto.status !== existing.status ? "STATUS" : "UPDATE",
      module: "日程",
      targetType: "Task",
      targetId: updated.id,
      targetName: updated.title,
      content: "更新日程",
      beforeSummary: this.auditService.summarizeChanges(
        this.auditSnapshot(existing),
        null,
        [],
      ),
      afterSummary: this.auditService.summarizeChanges(
        this.auditSnapshot(existing),
        this.auditSnapshot(updated),
        [
          "title",
          "customerId",
          "quotationId",
          "agriculturePlanId",
          "assigneeUserId",
          "status",
          "startAt",
          "endAt",
          "reminderAt",
        ],
      ),
    });

    if (updated.assigneeUserId !== existing.assigneeUserId) {
      await this.notifyTaskAssignee(updated, currentUser, "reassign");
    }

    await this.syncTaskCalendar(updated);

    return this.serializeTask(updated);
  }

  async remove(id: string, currentUser: AuthenticatedUser) {
    const existing = await this.ensureTaskAccess(id, currentUser);
    if (this.isRealTask(existing)) {
      await this.wecomCalendarService.deleteTaskSchedule(existing.id);
    }
    await this.prisma.task.delete({ where: { id } });

    await this.auditService.log({
      userId: currentUser.id,
      action: "DELETE",
      module: "日程",
      targetType: "Task",
      targetId: existing.id,
      targetName: existing.title,
      content: "删除日程",
      beforeSummary: `负责人: ${existing.assignee.name}；状态: ${existing.status}`,
    });

    return { success: true };
  }

  private async buildListWhere(
    query: QueryTasksDto,
    currentUser: AuthenticatedUser,
  ) {
    const canViewTeam = this.accessControl.hasPermission(
      currentUser,
      "action.schedule.view_team",
    );
    const directWhere: Prisma.TaskWhereInput = {
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.quotationId ? { quotationId: query.quotationId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status
        ? { status: query.status }
        : query.includeArchived
          ? {}
          : {
              status: {
                in: [TaskStatus.TODO, TaskStatus.DOING],
              },
            }),
    };
    const conditions: Prisma.TaskWhereInput[] = [];

    if (query.assigneeUserId) {
      if (!canViewTeam && query.assigneeUserId !== currentUser.id) {
        throw new ForbiddenException("当前账号仅可查看自己的日程");
      }

      directWhere.assigneeUserId = query.assigneeUserId;
    } else if (!canViewTeam) {
      directWhere.assigneeUserId = currentUser.id;
    }

    const keyword = query.keyword?.trim();
    if (keyword) {
      conditions.push({
        OR: [
          { title: { contains: keyword } },
          { content: { contains: keyword } },
          { customer: { customerName: { contains: keyword } } },
          { quotation: { quotationNo: { contains: keyword } } },
        ],
      });
    }

    const startDate = toDateOrUndefined(query.startDate);
    const endDate = toDateOrUndefined(query.endDate);
    if (startDate || endDate) {
      const rangeStart =
        startDate ??
        new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const rangeEnd = endDate
        ? new Date(
            endDate.getFullYear(),
            endDate.getMonth(),
            endDate.getDate(),
            23,
            59,
            59,
            999,
          )
        : new Date(
            rangeStart.getFullYear(),
            rangeStart.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          );

      conditions.push({
        OR: [
          {
            startAt: {
              gte: rangeStart,
              lte: rangeEnd,
            },
          },
          {
            endAt: {
              not: null,
              gte: rangeStart,
              lte: rangeEnd,
            },
          },
          {
            AND: [
              { startAt: { lte: rangeEnd } },
              { endAt: { not: null, gte: rangeStart } },
            ],
          },
        ],
      });
    }

    const scopedWhere = await this.accessControl.buildTaskWhere(
      currentUser,
      directWhere,
    );
    if (!conditions.length) {
      return scopedWhere;
    }

    return {
      AND: [scopedWhere, ...conditions],
    } satisfies Prisma.TaskWhereInput;
  }

  private async ensureTaskAccess(id: string, currentUser: AuthenticatedUser) {
    const task = await this.prisma.task.findFirst({
      where: await this.accessControl.buildTaskWhere(currentUser, { id }),
      include: this.taskInclude(),
    });

    if (!task) {
      throw new NotFoundException("日程不存在或无权访问");
    }

    return task;
  }

  private async ensureAssigneeAllowed(
    assigneeUserId: string,
    currentUser: AuthenticatedUser,
  ) {
    if (
      assigneeUserId !== currentUser.id &&
      !this.accessControl.hasPermission(currentUser, "action.schedule.assign")
    ) {
      throw new ForbiddenException("当前账号无权指派给其他成员");
    }

    const users = await this.accessControl.getAssignableUsers(currentUser);
    const assignee = users.find((item) => item.id === assigneeUserId);
    if (!assignee) {
      throw new NotFoundException("指派成员不存在或超出可见范围");
    }
  }

  private async ensureCustomerAccess(
    id: string,
    currentUser: AuthenticatedUser,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: await this.accessControl.buildCustomerWhere(currentUser, { id }),
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException("客户不存在或无权访问");
    }

    return customer.id;
  }

  private async ensureQuotationAccess(
    id: string,
    currentUser: AuthenticatedUser,
  ) {
    const quotation = await this.prisma.quotation.findFirst({
      where: await this.accessControl.buildQuotationWhere(currentUser, { id }),
      select: { id: true, customerId: true },
    });

    if (!quotation) {
      throw new NotFoundException("报价不存在或无权访问");
    }

    return quotation;
  }

  private async ensureAgriculturePlanAccess(
    id: string,
    currentUser: AuthenticatedUser,
  ) {
    const agriculturePlan = await this.prisma.agriculturePlan.findFirst({
      where: {
        id,
        quotation: await this.accessControl.buildQuotationWhere(currentUser),
      },
      select: {
        id: true,
        customerId: true,
        quotationId: true,
      },
    });

    if (!agriculturePlan) {
      throw new NotFoundException("方案不存在或无权访问");
    }

    return agriculturePlan;
  }

  private taskInclude() {
    return {
      customer: {
        select: {
          id: true,
          customerName: true,
        },
      },
      quotation: {
        select: {
          id: true,
          quotationNo: true,
          customer: {
            select: {
              id: true,
              customerName: true,
            },
          },
        },
      },
      agriculturePlan: {
        select: {
          id: true,
          quotationId: true,
          detailJson: true,
          customer: {
            select: {
              id: true,
              customerName: true,
            },
          },
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          wecomUserId: true,
          wecomName: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          wecomName: true,
        },
      },
      wecomCalendarSync: true,
    } satisfies Prisma.TaskInclude;
  }

  private serializeTask(
    task: Awaited<ReturnType<TasksService["ensureTaskAccess"]>>,
  ) {
    return {
      ...task,
      customer: task.customer
        ? {
            id: task.customer.id,
            name: task.customer.customerName,
          }
        : null,
      quotation: task.quotation
        ? {
            id: task.quotation.id,
            quotationNo: task.quotation.quotationNo,
            customer: task.quotation.customer
              ? {
                  id: task.quotation.customer.id,
                  name: task.quotation.customer.customerName,
                }
              : null,
          }
        : null,
      agriculturePlan: task.agriculturePlan
        ? {
            id: task.agriculturePlan.id,
            quotationId: task.agriculturePlan.quotationId,
            planName:
              (
                task.agriculturePlan.detailJson as Record<
                  string,
                  unknown
                > | null
              )?.planName ?? "农业生态种植方案",
            customer: task.agriculturePlan.customer
              ? {
                  id: task.agriculturePlan.customer.id,
                  name: task.agriculturePlan.customer.customerName,
                }
              : null,
          }
        : null,
      assignee: task.assignee
        ? {
            id: task.assignee.id,
            name: task.assignee.name,
            displayName: task.assignee.wecomName ?? task.assignee.name,
          }
        : null,
      creator: task.creator
        ? {
            id: task.creator.id,
            name: task.creator.name,
            displayName: task.creator.wecomName ?? task.creator.name,
          }
        : null,
    };
  }

  private async notifyTaskAssignee(
    task: Awaited<ReturnType<TasksService["ensureTaskAccess"]>>,
    actor: AuthenticatedUser,
    mode: "create" | "reassign",
  ) {
    if (task.assigneeUserId === actor.id || !this.isRealTask(task)) {
      return;
    }

    const actorName = actor.wecomName ?? actor.name;
    const relatedName =
      task.customer?.customerName ??
      task.quotation?.customer?.customerName ??
      task.agriculturePlan?.customer?.customerName ??
      null;

    await this.notificationService.deliverEventSystemAndWecom({
      userId: task.assigneeUserId,
      type: mode === "create" ? "TASK_ASSIGNED" : "TASK_REASSIGNED",
      title: mode === "create" ? "新的工作计划" : "工作计划改派",
      content: [
        `${actorName} ${mode === "create" ? "指派了一个工作计划" : "将工作计划改派给你"}：${task.title}`,
        relatedName ? `关联客户：${relatedName}` : null,
        `开始时间：${this.formatDateTime(task.startAt)}`,
        task.reminderAt ? `提醒时间：${this.formatDateTime(task.reminderAt)}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      relatedType: "TASK",
      relatedId: task.id,
    });
  }

  private async syncTaskCalendar(
    task: Awaited<ReturnType<TasksService["ensureTaskAccess"]>>,
  ) {
    if (!this.isRealTask(task)) {
      return;
    }

    await this.wecomCalendarService.syncTask(task);
  }

  private delayTaskDates(
    task: Awaited<ReturnType<TasksService["ensureTaskAccess"]>>,
    days: number,
  ) {
    const offsetMs = days * 24 * 60 * 60 * 1000;

    return {
      startAt: new Date(task.startAt.getTime() + offsetMs),
      endAt: task.endAt ? new Date(task.endAt.getTime() + offsetMs) : null,
      reminderAt: task.reminderAt
        ? new Date(task.reminderAt.getTime() + offsetMs)
        : null,
    };
  }

  private isRealTask(task: {
    dataScope: RecordDataScope;
    partitionKey: string;
    testBatchId: string | null;
  }) {
    return (
      task.dataScope === RecordDataScope.REAL &&
      task.partitionKey === REAL_PARTITION_KEY &&
      task.testBatchId === null
    );
  }

  private formatDateTime(value: Date) {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(value)
      .replace(/\//g, "-");
  }

  private auditSnapshot(
    task: Awaited<ReturnType<TasksService["ensureTaskAccess"]>>,
  ): Record<string, unknown> {
    return {
      title: task.title,
      customerId: task.customerId ?? null,
      quotationId: task.quotationId ?? null,
      agriculturePlanId: task.agriculturePlanId ?? null,
      assigneeUserId: task.assigneeUserId,
      status: task.status,
      startAt: task.startAt.toISOString(),
      endAt: task.endAt?.toISOString() ?? null,
      reminderAt: task.reminderAt?.toISOString() ?? null,
    };
  }
}
