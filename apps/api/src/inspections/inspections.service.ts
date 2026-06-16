import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  FileRecordStatus,
  InspectionItemStatus,
  InspectionOrderStatus,
  InspectionPaymentStatus,
  Prisma,
} from "@prisma/client";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { AccessControlService } from "../common/services/access-control.service";
import { AuditService } from "../common/services/audit.service";
import { RecordPartitionService } from "../common/services/record-partition.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateInspectionOrderDto,
  InspectionQueryDto,
  UpdateInspectionOrderDto,
} from "./dto/inspection.dto";

function toDateOrUndefined(value?: string, label = "时间") {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${label}格式不正确`);
  }

  return date;
}

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeNullableText(value?: string | null) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeOptionalId(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeNullableId(value?: string | null) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function sumDecimalValues<T>(
  items: T[],
  pick: (item: T) => Prisma.Decimal | number | null | undefined,
) {
  return items.reduce((total, item) => {
    const value = pick(item);
    if (value === null || value === undefined) {
      return total;
    }

    return total + Number(value);
  }, 0);
}

function serializeAmount(value?: Prisma.Decimal | number | null) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value).toFixed(2);
}

@Injectable()
export class InspectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly auditService: AuditService,
    private readonly recordPartition: RecordPartitionService,
  ) {}

  async list(query: InspectionQueryDto, user: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 50, 100);
    const where = await this.buildListWhere(query, user);

    const [items, total] = await Promise.all([
      this.prisma.inspectionOrder.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: this.listInclude(),
      }),
      this.prisma.inspectionOrder.count({ where }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: items.map((item) => this.serializeInspectionSummary(item)),
    };
  }

  async getById(id: string, user: AuthenticatedUser) {
    const order = await this.ensureInspectionAccess(id, user, true);

    const attachments = await this.prisma.fileRecord.findMany({
      where: {
        partitionKey: order.partitionKey,
        deletedAt: null,
        status: {
          not: FileRecordStatus.OBSOLETE,
        },
        OR: [
          {
            businessId: id,
            businessType: {
              in: [
                "inspection_report",
                "inspection_payment_voucher",
                "inspection_invoice",
                "inspection_sample_photo",
                "inspection_other",
              ],
            },
          },
          {
            relatedType: "INSPECTION_ORDER",
            relatedId: id,
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return this.serializeInspectionDetail(order, attachments);
  }

  async create(dto: CreateInspectionOrderDto, user: AuthenticatedUser) {
    this.accessControl.assertPermission(
      user,
      "action.inspection.create",
      "当前账号无权新建检测单",
    );

    const customerId = dto.customerId
      ? await this.ensureCustomerAccess(dto.customerId, user)
      : undefined;
    const productId = dto.productId
      ? await this.ensureProductExists(dto.productId)
      : undefined;
    const inspectionNo =
      normalizeOptionalText(dto.inspectionNo) ??
      (await this.generateInspectionNo());
    const partition = await this.recordPartition.getWritableCreateData(user);

    const created = await this.prisma.inspectionOrder.create({
      data: {
        inspectionNo,
        title: dto.title.trim(),
        customerId,
        productId,
        projectType: normalizeOptionalText(dto.projectType),
        inspectionTarget: dto.inspectionTarget.trim(),
        labName: dto.labName.trim(),
        labCity: normalizeOptionalText(dto.labCity),
        labAddress: normalizeOptionalText(dto.labAddress),
        contactName: normalizeOptionalText(dto.contactName),
        contactPhone: normalizeOptionalText(dto.contactPhone),
        expectedCycleText: normalizeOptionalText(dto.expectedCycleText),
        bankInfo: normalizeOptionalText(dto.bankInfo),
        summary: normalizeOptionalText(dto.summary),
        remark: normalizeOptionalText(dto.remark),
        submittedAt: toDateOrUndefined(dto.submittedAt, "送检日期"),
        receivedAt: toDateOrUndefined(dto.receivedAt, "收样日期"),
        status: dto.status ?? InspectionOrderStatus.DRAFT,
        paymentStatus: dto.paymentStatus ?? InspectionPaymentStatus.UNPAID,
        createdByUserId: user.id,
        dataScope: partition.dataScope,
        partitionKey: partition.partitionKey,
        testBatchId: partition.testBatchId,
        samples: dto.samples?.length
          ? {
              create: dto.samples.map((sample, sampleIndex) => ({
                sampleName: sample.sampleName.trim(),
                sampleType: normalizeOptionalText(sample.sampleType),
                sampleTarget: normalizeOptionalText(sample.sampleTarget),
                sampleQuantityText: normalizeOptionalText(
                  sample.sampleQuantityText,
                ),
                sampledAt: toDateOrUndefined(sample.sampledAt, "取样日期"),
                submittedAt: toDateOrUndefined(sample.submittedAt, "送检日期"),
                plannedTestScope: normalizeOptionalText(sample.plannedTestScope),
                note: normalizeOptionalText(sample.note),
                sortOrder: sample.sortOrder ?? sampleIndex,
                items: sample.items?.length
                  ? {
                      create: sample.items.map((item, itemIndex) => ({
                        itemName: item.itemName.trim(),
                        itemCategory: normalizeOptionalText(item.itemCategory),
                        feeText: normalizeOptionalText(item.feeText),
                        feeAmount: item.feeAmount,
                        status: item.status ?? InspectionItemStatus.PENDING,
                        resultSummary: normalizeOptionalText(item.resultSummary),
                        progressNote: normalizeOptionalText(item.progressNote),
                        completedAt: toDateOrUndefined(
                          item.completedAt,
                          "完成时间",
                        ),
                        sortOrder: item.sortOrder ?? itemIndex,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
        payments: dto.payments?.length
          ? {
              create: dto.payments.map((payment) => ({
                paidAt: toDateOrUndefined(payment.paidAt, "付款日期"),
                amount: payment.amount,
                amountText: normalizeOptionalText(payment.amountText),
                method: normalizeOptionalText(payment.method),
                payerName: normalizeOptionalText(payment.payerName),
                voucherFileId: normalizeOptionalText(payment.voucherFileId),
                invoiceFileId: normalizeOptionalText(payment.invoiceFileId),
                note: normalizeOptionalText(payment.note),
                createdByUserId: user.id,
              })),
            }
          : undefined,
        timelines: {
          create: [
            {
              eventType: "CREATED",
              eventAt: new Date(),
              content: "已创建检测单",
              createdByUserId: user.id,
            },
            ...(dto.timelines?.map((timeline) => ({
              eventType: timeline.eventType.trim(),
              eventAt: toDateOrUndefined(timeline.eventAt, "进度时间"),
              content: timeline.content.trim(),
              sampleId: normalizeOptionalText(timeline.sampleId),
              itemId: normalizeOptionalText(timeline.itemId),
              createdByUserId: user.id,
            })) ?? []),
          ],
        },
      },
      include: this.detailInclude(),
    });

    await this.auditService.log({
      userId: user.id,
      action: "CREATE",
      module: "检测",
      targetType: "InspectionOrder",
      targetId: created.id,
      targetName: created.title,
      content: "新增检测单",
      afterSummary: `编号: ${created.inspectionNo}；状态: ${created.status}`,
    });

    return this.serializeInspectionDetail(created, []);
  }

  async update(id: string, dto: UpdateInspectionOrderDto, user: AuthenticatedUser) {
    this.accessControl.assertPermission(
      user,
      "action.inspection.update",
      "当前账号无权编辑检测单",
    );

    const existing = await this.ensureInspectionAccess(id, user, false);
    const customerId =
      dto.customerId !== undefined
        ? dto.customerId
          ? await this.ensureCustomerAccess(dto.customerId, user)
          : null
        : undefined;
    const productId =
      dto.productId !== undefined
        ? dto.productId
          ? await this.ensureProductExists(dto.productId)
          : null
        : undefined;

    const timelineCreates: Prisma.InspectionTimelineCreateManyInput[] = [];
    if (dto.status && dto.status !== existing.status) {
      timelineCreates.push({
        orderId: id,
        eventType: "STATUS_CHANGED",
        eventAt: new Date(),
        content: `检测单状态更新为 ${dto.status}`,
        createdByUserId: user.id,
      });
    }
    if (dto.paymentStatus && dto.paymentStatus !== existing.paymentStatus) {
      timelineCreates.push({
        orderId: id,
        eventType: "PAYMENT_STATUS_CHANGED",
        eventAt: new Date(),
        content: `付款状态更新为 ${dto.paymentStatus}`,
        createdByUserId: user.id,
      });
    }
    for (const timeline of dto.timelines ?? []) {
      if (!timeline.eventType?.trim() || !timeline.content?.trim()) {
        continue;
      }

      timelineCreates.push({
        orderId: id,
        sampleId: normalizeOptionalText(timeline.sampleId),
        itemId: normalizeOptionalText(timeline.itemId),
        eventType: timeline.eventType.trim(),
        eventAt: toDateOrUndefined(timeline.eventAt, "进度时间"),
        content: timeline.content.trim(),
        createdByUserId: user.id,
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.inspectionOrder.update({
        where: { id },
        data: {
          title: dto.title?.trim(),
          customerId,
          productId,
          projectType: normalizeNullableText(dto.projectType),
          inspectionTarget: dto.inspectionTarget?.trim(),
          labName: dto.labName?.trim(),
          labCity: normalizeNullableText(dto.labCity),
          labAddress: normalizeNullableText(dto.labAddress),
          contactName: normalizeNullableText(dto.contactName),
          contactPhone: normalizeNullableText(dto.contactPhone),
          expectedCycleText: normalizeNullableText(dto.expectedCycleText),
          bankInfo: normalizeNullableText(dto.bankInfo),
          summary: normalizeNullableText(dto.summary),
          remark: normalizeNullableText(dto.remark),
          submittedAt:
            dto.submittedAt !== undefined
              ? toDateOrUndefined(dto.submittedAt, "送检日期") ?? null
              : undefined,
          receivedAt:
            dto.receivedAt !== undefined
              ? toDateOrUndefined(dto.receivedAt, "收样日期") ?? null
              : undefined,
          status: dto.status,
          paymentStatus: dto.paymentStatus,
        },
      });

      if (dto.samples !== undefined) {
        const existingSamples = await tx.inspectionSample.findMany({
          where: { orderId: id },
          select: { id: true },
        });
        const sampleIds = existingSamples.map((sample) => sample.id);

        if (sampleIds.length) {
          await tx.inspectionSampleItem.deleteMany({
            where: {
              sampleId: {
                in: sampleIds,
              },
            },
          });
          await tx.inspectionSample.deleteMany({
            where: {
              id: {
                in: sampleIds,
              },
            },
          });
        }

        for (const [sampleIndex, sample] of dto.samples.entries()) {
          await tx.inspectionSample.create({
            data: {
              orderId: id,
              sampleName: sample.sampleName.trim(),
              sampleType: normalizeOptionalText(sample.sampleType),
              sampleTarget: normalizeOptionalText(sample.sampleTarget),
              sampleQuantityText: normalizeOptionalText(sample.sampleQuantityText),
              sampledAt: toDateOrUndefined(sample.sampledAt, "取样日期"),
              submittedAt: toDateOrUndefined(sample.submittedAt, "送检日期"),
              plannedTestScope: normalizeOptionalText(sample.plannedTestScope),
              note: normalizeOptionalText(sample.note),
              sortOrder: sample.sortOrder ?? sampleIndex,
              items: sample.items?.length
                ? {
                    create: sample.items.map((item, itemIndex) => ({
                      itemName: item.itemName.trim(),
                      itemCategory: normalizeOptionalText(item.itemCategory),
                      feeText: normalizeOptionalText(item.feeText),
                      feeAmount: item.feeAmount,
                      status: item.status ?? InspectionItemStatus.PENDING,
                      resultSummary: normalizeOptionalText(item.resultSummary),
                      progressNote: normalizeOptionalText(item.progressNote),
                      completedAt: toDateOrUndefined(
                        item.completedAt,
                        "完成时间",
                      ),
                      sortOrder: item.sortOrder ?? itemIndex,
                    })),
                  }
                : undefined,
            },
          });
        }
      }

      if (dto.payments !== undefined) {
        await tx.inspectionPayment.deleteMany({
          where: { orderId: id },
        });

        if (dto.payments.length) {
          await tx.inspectionPayment.createMany({
            data: dto.payments.map((payment) => ({
              orderId: id,
              paidAt: toDateOrUndefined(payment.paidAt, "付款日期"),
              amount: payment.amount,
              amountText: normalizeOptionalText(payment.amountText),
              method: normalizeOptionalText(payment.method),
              payerName: normalizeOptionalText(payment.payerName),
              voucherFileId: normalizeOptionalText(payment.voucherFileId),
              invoiceFileId: normalizeOptionalText(payment.invoiceFileId),
              note: normalizeOptionalText(payment.note),
              createdByUserId: user.id,
            })),
          });
        }
      }

      if (timelineCreates.length) {
        await tx.inspectionTimeline.createMany({
          data: timelineCreates,
        });
      }

      return tx.inspectionOrder.findUniqueOrThrow({
        where: { id },
        include: this.detailInclude(),
      });
    });

    await this.auditService.log({
      userId: user.id,
      action: "UPDATE",
      module: "检测",
      targetType: "InspectionOrder",
      targetId: updated.id,
      targetName: updated.title,
      content: "更新检测单",
      afterSummary: `状态: ${updated.status}；付款状态: ${updated.paymentStatus}`,
    });

    return this.getById(id, user);
  }

  private listInclude(): Prisma.InspectionOrderInclude {
    return {
      customer: {
        select: {
          id: true,
          customerName: true,
        },
      },
      product: {
        select: {
          id: true,
          displayName: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          department: true,
        },
      },
      samples: {
        select: {
          id: true,
          sampleType: true,
          items: {
            select: {
              id: true,
              status: true,
              feeAmount: true,
            },
          },
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
        },
      },
      timelines: {
        take: 1,
        orderBy: [
          { eventAt: "desc" as Prisma.SortOrder },
          { createdAt: "desc" as Prisma.SortOrder },
        ],
        select: {
          eventType: true,
          content: true,
          eventAt: true,
          createdAt: true,
        },
      },
    };
  }

  private detailInclude(): Prisma.InspectionOrderInclude {
    return {
      customer: {
        select: {
          id: true,
          customerName: true,
          companyName: true,
        },
      },
      product: {
        select: {
          id: true,
          displayName: true,
          name: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          department: true,
        },
      },
      samples: {
        orderBy: [
          { sortOrder: "asc" as Prisma.SortOrder },
          { createdAt: "asc" as Prisma.SortOrder },
        ],
        include: {
          items: {
            orderBy: [
              { sortOrder: "asc" as Prisma.SortOrder },
              { createdAt: "asc" as Prisma.SortOrder },
            ],
          },
        },
      },
      payments: {
        orderBy: [
          { paidAt: "desc" as Prisma.SortOrder },
          { createdAt: "desc" as Prisma.SortOrder },
        ],
      },
      timelines: {
        orderBy: [
          { eventAt: "desc" as Prisma.SortOrder },
          { createdAt: "desc" as Prisma.SortOrder },
        ],
      },
    };
  }

  private serializeInspectionSummary(order: any) {
    const itemRows: any[] = order.samples.flatMap(
      (sample: any) => sample.items ?? [],
    );
    const latestTimeline = order.timelines[0] ?? null;
    const totalFee = sumDecimalValues(
      itemRows,
      (item) => item.feeAmount,
    );
    const totalPaidAmount = sumDecimalValues(
      order.payments,
      (payment: any) => payment.amount,
    );

    return {
      id: order.id,
      inspectionNo: order.inspectionNo,
      title: order.title,
      projectType: order.projectType,
      inspectionTarget: order.inspectionTarget,
      labName: order.labName,
      customer: order.customer
        ? {
            id: order.customer.id,
            name: order.customer.customerName,
          }
        : null,
      product: order.product
        ? {
            id: order.product.id,
            name: order.product.displayName,
          }
        : null,
      creator: order.creator
        ? {
            id: order.creator.id,
            displayName: order.creator.name,
            department: order.creator.department,
          }
        : null,
      status: order.status,
      paymentStatus: order.paymentStatus,
      submittedAt: order.submittedAt?.toISOString() ?? null,
      updatedAt: order.updatedAt.toISOString(),
      createdAt: order.createdAt.toISOString(),
      sampleCount: order.samples.length,
      itemCount: itemRows.length,
      reportedItemCount: itemRows.filter(
        (item: any) => item.status === InspectionItemStatus.REPORTED,
      ).length,
      totalFee: totalFee.toFixed(2),
      totalPaidAmount: totalPaidAmount.toFixed(2),
      latestTimeline: latestTimeline
        ? {
            eventType: latestTimeline.eventType,
            content: latestTimeline.content,
            eventAt:
              latestTimeline.eventAt?.toISOString() ??
              latestTimeline.createdAt.toISOString(),
          }
        : null,
    };
  }

  private serializeInspectionDetail(order: any, attachments: any[]) {
    const summary = this.serializeInspectionSummary(order);
    return {
      ...summary,
      labCity: order.labCity,
      labAddress: order.labAddress,
      contactName: order.contactName,
      contactPhone: order.contactPhone,
      expectedCycleText: order.expectedCycleText,
      bankInfo: order.bankInfo,
      summaryText: order.summary,
      remark: order.remark,
      receivedAt: order.receivedAt?.toISOString() ?? null,
      samples: order.samples.map((sample: any) => ({
        id: sample.id,
        sampleName: sample.sampleName,
        sampleType: sample.sampleType,
        sampleTarget: sample.sampleTarget,
        sampleQuantityText: sample.sampleQuantityText,
        sampledAt: sample.sampledAt?.toISOString() ?? null,
        submittedAt: sample.submittedAt?.toISOString() ?? null,
        plannedTestScope: sample.plannedTestScope,
        note: sample.note,
        items: sample.items.map((item: any) => ({
          id: item.id,
          itemName: item.itemName,
          itemCategory: item.itemCategory,
          feeText: item.feeText,
          feeAmount: serializeAmount(item.feeAmount),
          status: item.status,
          resultSummary: item.resultSummary,
          progressNote: item.progressNote,
          completedAt: item.completedAt?.toISOString() ?? null,
        })),
      })),
      payments: order.payments.map((payment: any) => ({
        id: payment.id,
        paidAt: payment.paidAt?.toISOString() ?? null,
        amount: serializeAmount(payment.amount),
        amountText: payment.amountText,
        method: payment.method,
        payerName: payment.payerName,
        voucherFileId: payment.voucherFileId,
        invoiceFileId: payment.invoiceFileId,
        note: payment.note,
        createdAt: payment.createdAt.toISOString(),
      })),
      timelines: order.timelines.map((timeline: any) => ({
        id: timeline.id,
        sampleId: timeline.sampleId,
        itemId: timeline.itemId,
        eventType: timeline.eventType,
        eventAt: timeline.eventAt?.toISOString() ?? null,
        content: timeline.content,
        createdAt: timeline.createdAt.toISOString(),
      })),
      attachments: attachments.map((file) => ({
        id: file.id,
        fileName: file.fileName,
        fileUrl: file.fileUrl,
        businessType: file.businessType,
        createdAt: file.createdAt.toISOString(),
      })),
    };
  }

  private async buildListWhere(
    query: InspectionQueryDto,
    user: AuthenticatedUser,
  ): Promise<Prisma.InspectionOrderWhereInput> {
    const startDate = toDateOrUndefined(query.startDate, "开始日期");
    const endDate = toDateOrUndefined(query.endDate, "结束日期");
    const andWhere: Prisma.InspectionOrderWhereInput[] = [];

    if (query.keyword) {
      andWhere.push({
        OR: [
          { inspectionNo: { contains: query.keyword } },
          { title: { contains: query.keyword } },
          { inspectionTarget: { contains: query.keyword } },
          { labName: { contains: query.keyword } },
          { labAddress: { contains: query.keyword } },
          { customer: { customerName: { contains: query.keyword } } },
          { product: { displayName: { contains: query.keyword } } },
          {
            samples: {
              some: {
                OR: [
                  { sampleName: { contains: query.keyword } },
                  { sampleTarget: { contains: query.keyword } },
                  { plannedTestScope: { contains: query.keyword } },
                  {
                    items: {
                      some: {
                        itemName: { contains: query.keyword },
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      });
    }

    if (query.needsLinking) {
      andWhere.push({
        OR: [{ customerId: null }, { productId: null }],
      });
    }

    const baseWhere: Prisma.InspectionOrderWhereInput = {
      ...(andWhere.length ? { AND: andWhere } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.customerLinked === true ? { customerId: { not: null } } : {}),
      ...(query.customerLinked === false ? { customerId: null } : {}),
      ...(query.productLinked === true ? { productId: { not: null } } : {}),
      ...(query.productLinked === false ? { productId: null } : {}),
      ...(query.labName ? { labName: { contains: query.labName } } : {}),
      ...(query.sampleType
        ? {
            samples: {
              some: {
                sampleType: {
                  contains: query.sampleType,
                },
              },
            },
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(query.includeArchived
        ? {}
        : {
            status: query.status ?? {
              not: InspectionOrderStatus.ARCHIVED,
            },
          }),
      ...(startDate || endDate
        ? {
            submittedAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    };

    return this.accessControl.buildInspectionWhere(user, baseWhere);
  }

  private async ensureInspectionAccess(
    id: string,
    user: AuthenticatedUser,
    includeDetail: boolean,
  ) {
    const inspection = await this.prisma.inspectionOrder.findFirst({
      where: await this.accessControl.buildInspectionWhere(user, { id }),
      include: includeDetail ? this.detailInclude() : this.listInclude(),
    });

    if (!inspection) {
      throw new NotFoundException("检测单不存在或无权访问");
    }

    return inspection;
  }

  private async ensureCustomerAccess(id: string, user: AuthenticatedUser) {
    const customer = await this.prisma.customer.findFirst({
      where: await this.accessControl.buildCustomerWhere(user, { id }),
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException("关联客户不存在或无权访问");
    }

    return customer.id;
  }

  private async ensureProductExists(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException("关联产品不存在");
    }

    return product.id;
  }

  private async generateInspectionNo() {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const prefix = `JC${datePart}`;
    const count = await this.prisma.inspectionOrder.count({
      where: {
        inspectionNo: {
          startsWith: prefix,
        },
      },
    });

    return `${prefix}-${String(count + 1).padStart(3, "0")}`;
  }

}
