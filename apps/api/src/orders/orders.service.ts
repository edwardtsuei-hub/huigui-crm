import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  ApprovalStatus,
  OrderPaymentStatus,
  OrderShipmentStatus,
  PaymentMethod,
  PaymentRecordStatus,
  Prisma,
  QuotationStatus,
  SalesOrderStatus,
  SettlementStatus,
  ShipmentRecordStatus,
} from "@prisma/client";
import {
  SYSTEM_RECORD_CUSTOMER_SOURCES,
  SYSTEM_RECORD_TEXT_MARKERS,
} from "../common/constants/system-records";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { AccessControlService } from "../common/services/access-control.service";
import { RecordPartitionService } from "../common/services/record-partition.service";
import { NotificationService } from "../modules/notifications/notification.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  ChannelSettlementsQueryDto,
  ChannelPartnersQueryDto,
  CreateChannelSettlementDto,
  CreateChannelPartnerDto,
  CreateFinanceAccountDto,
  CreatePaymentRecordDto,
  CreateSalesOrderDto,
  CreateShipmentRecordDto,
  FinanceAccountsQueryDto,
  OrderPaymentsQueryDto,
  OrdersQueryDto,
  OrderShipmentsQueryDto,
  UpdateSalesOrderDto,
  UpdateFinanceAccountDto,
} from "./dto/order.dto";

function formatMoney(
  value: Prisma.Decimal | number | string | null | undefined,
) {
  if (value === null || value === undefined || value === "") {
    return "0.00";
  }

  const amount =
    typeof value === "string"
      ? Number(value)
      : typeof value === "number"
        ? value
        : Number(value.toString());

  if (Number.isNaN(amount)) {
    return "0.00";
  }

  return amount.toFixed(2);
}

function sumAmounts(
  values: Array<Prisma.Decimal | number | string | null | undefined>,
) {
  let sum = 0;

  for (const value of values) {
    sum += Number(formatMoney(value));
  }

  return sum;
}

function normalizeKeyword(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function isMissingTableError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ["P2021", "P2022"].includes(error.code)
  );
}

function shouldUseMockFallback(error: unknown) {
  return (
    isMissingTableError(error) &&
    process.env.NODE_ENV !== "production" &&
    process.env.ORDER_MOCK_FALLBACK === "true"
  );
}

function throwOrderSchemaUnavailable(error: unknown): never {
  if (isMissingTableError(error)) {
    throw new ServiceUnavailableException(
      "订单数据表尚未完成部署，请先执行数据库迁移",
    );
  }

  throw error;
}

function parseBooleanFilter(value?: string) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function normalizeOptionalText(value?: string | null) {
  if (value === undefined) {
    return undefined;
  }

  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

function parseDateInput(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toDecimal(value?: number | string | Prisma.Decimal | null) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return new Prisma.Decimal(value);
}

function decimalToNumber(value?: Prisma.Decimal | number | string | null) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  return Number(value.toString());
}

function buildDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}${month}${day}`;
}

type OrdersDbClient = Prisma.TransactionClient | PrismaService;

const MOCK_FINANCE_ACCOUNTS = [
  {
    id: "demo-finance-account-001",
    companyName: "山东洄归生态科技有限公司",
    accountName: "对公主账户",
    accountNo: "6222 0000 1888 6666",
    bankName: "中国农业银行潍坊分行",
    accountType: "BANK",
    usageScene: "客户货款",
    isDefault: true,
    enabled: true,
    remark: "优先用于农业工业订单收款",
  },
  {
    id: "demo-finance-account-002",
    companyName: "山东洄归生态科技有限公司",
    accountName: "渠道结算账户",
    accountNo: "6222 0000 1999 7777",
    bankName: "中国建设银行潍坊分行",
    accountType: "BANK",
    usageScene: "渠道结算",
    isDefault: false,
    enabled: true,
    remark: "用于商家现结与分销结算",
  },
];

const MOCK_CHANNEL_PARTNERS = [
  {
    id: "demo-channel-partner-001",
    partnerName: "海能量潍坊示范商家",
    city: "潍坊",
  },
];

const MOCK_ORDERS = [
  {
    id: "demo-order-001",
    orderNo: "SO-2026-001",
    customerId: "demo-customer-001",
    customerName: "赵千谊",
    quotationId: null,
    contractId: null,
    channelPartnerId: "demo-channel-partner-001",
    channelPartnerName: "海能量潍坊示范商家",
    orderDate: "2026-04-12T10:00:00.000Z",
    recipientName: "赵千谊",
    recipientPhone: "13800000001",
    recipientAddress: "山东省潍坊市寿光市示范基地",
    usagePurpose: "西红柿试验与示范点补货",
    warehouseName: "潍坊仓",
    totalProductAmount: "2680.00",
    discountAmount: "80.00",
    shippingFee: "0.00",
    receivableAmount: "2600.00",
    receivedAmount: "1600.00",
    paymentStatus: "PARTIAL",
    shipmentStatus: "PARTIAL",
    settlementStatus: "PENDING",
    status: "IN_FULFILLMENT",
    ownerUserId: "demo-owner-001",
    sourceLabel: "手工录入",
    items: [
      {
        id: "demo-order-item-001",
        lineNo: 1,
        itemName: "海能量农业元素 A 组",
        productId: null,
        sku: null,
        spec: "20L",
        unit: "桶",
        quantity: "2.00",
        unitPrice: "980.00",
        lineAmount: "1960.00",
        usagePurpose: "试验首轮喷洒",
      },
      {
        id: "demo-order-item-002",
        lineNo: 2,
        itemName: "海能量农业元素 B 组",
        productId: null,
        sku: null,
        spec: "20L",
        unit: "桶",
        quantity: "1.00",
        unitPrice: "720.00",
        lineAmount: "720.00",
        usagePurpose: "补充用料",
      },
    ],
    payments: [
      {
        id: "demo-payment-001",
        paymentNo: "PM-2026-001",
        payerName: "赵千谊",
        paymentMethod: "BANK_TRANSFER",
        amount: "1600.00",
        paidAt: "2026-04-12T11:30:00.000Z",
        status: "CONFIRMED",
        referenceNo: "BANK-20260412-01",
        financeAccountId: "demo-finance-account-001",
      },
    ],
    shipments: [
      {
        id: "demo-shipment-001",
        shipmentNo: "SH-2026-001",
        warehouseName: "潍坊仓",
        courierCompany: "顺丰",
        trackingNo: "SF1234567890",
        shippedAt: "2026-04-13T09:00:00.000Z",
        deliveredAt: null,
        status: "SHIPPED",
        recipientName: "赵千谊",
        recipientPhone: "13800000001",
        recipientAddress: "山东省潍坊市寿光市示范基地",
        items: [
          {
            id: "demo-shipment-item-001",
            orderItemId: "demo-order-item-001",
            itemName: "海能量农业元素 A 组",
            quantity: "2.00",
          },
        ],
      },
    ],
    settlementItems: [
      {
        id: "demo-settlement-item-001",
        settlementId: "demo-settlement-001",
        orderDate: "2026-04-12T10:00:00.000Z",
        itemName: "海能量农业元素 A 组",
        quantity: "2.00",
        supplyUnitPrice: "860.00",
        supplyAmount: "1720.00",
        cashPaymentAmount: "1000.00",
        paymentNote: "部分现结",
        costUnitPrice: "640.00",
        costAmount: "1280.00",
        profitAmount: "440.00",
        remark: "示范商家首单折扣",
      },
    ],
  },
  {
    id: "demo-order-002",
    orderNo: "SO-2026-002",
    customerId: "demo-customer-002",
    customerName: "张小兰",
    quotationId: null,
    contractId: null,
    channelPartnerId: null,
    channelPartnerName: null,
    orderDate: "2026-04-15T08:00:00.000Z",
    recipientName: "张小兰",
    recipientPhone: "13800000002",
    recipientAddress: "山东省青岛市黄岛区家庭种植点",
    usagePurpose: "家庭种植试用",
    warehouseName: "青岛仓",
    totalProductAmount: "580.00",
    discountAmount: "0.00",
    shippingFee: "20.00",
    receivableAmount: "600.00",
    receivedAmount: "600.00",
    paymentStatus: "PAID",
    shipmentStatus: "PENDING",
    settlementStatus: "NOT_REQUIRED",
    status: "CONFIRMED",
    ownerUserId: "demo-owner-002",
    sourceLabel: "购买客户明细导入",
    items: [
      {
        id: "demo-order-item-003",
        lineNo: 1,
        itemName: "海能量家庭试用装",
        productId: null,
        sku: null,
        spec: "5L",
        unit: "桶",
        quantity: "1.00",
        unitPrice: "580.00",
        lineAmount: "580.00",
        usagePurpose: "家庭种植试用",
      },
    ],
    payments: [
      {
        id: "demo-payment-002",
        paymentNo: "PM-2026-002",
        payerName: "张小兰",
        paymentMethod: "WECHAT",
        amount: "600.00",
        paidAt: "2026-04-15T08:30:00.000Z",
        status: "CONFIRMED",
        referenceNo: "WX-20260415-01",
        financeAccountId: "demo-finance-account-001",
      },
    ],
    shipments: [],
    settlementItems: [],
  },
];

const MOCK_SETTLEMENTS = [
  {
    id: "demo-settlement-001",
    settlementNo: "CS-2026-001",
    channelPartnerId: "demo-channel-partner-001",
    channelPartnerName: "海能量潍坊示范商家",
    periodStart: "2026-04-01T00:00:00.000Z",
    periodEnd: "2026-04-30T23:59:59.000Z",
    totalSupplyAmount: "1720.00",
    totalCostAmount: "1280.00",
    totalProfitAmount: "440.00",
    totalPaidAmount: "1000.00",
    status: "PENDING",
    items: 1,
  },
];

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly recordPartition: RecordPartitionService,
    private readonly notificationService: NotificationService,
  ) {}

  private buildPartitionWhere<
    T extends
      | Prisma.SalesOrderWhereInput
      | Prisma.ChannelPartnerWhereInput
      | Prisma.PaymentRecordWhereInput
      | Prisma.ShipmentRecordWhereInput
      | Prisma.ChannelSettlementWhereInput,
  >(user: AuthenticatedUser, baseWhere: T) {
    return this.recordPartition.mergeWhere(
      baseWhere,
      this.recordPartition.buildWhere(user) as T,
    );
  }

  private isAllOrdersVisible(user: AuthenticatedUser) {
    return ["SUPER_ADMIN", "ADMIN", "FINANCE"].includes(user.roleCode);
  }

  private async getVisibleOwnerIds(user: AuthenticatedUser) {
    if (this.isAllOrdersVisible(user)) {
      return undefined;
    }

    const users = await this.accessControl.getAssignableUsers(user);
    const ids = users.map((item) => item.id).filter(Boolean);
    return ids.length ? ids : [user.id];
  }

  private async buildOrderWhere(
    user: AuthenticatedUser,
    query: OrdersQueryDto,
  ): Promise<Prisma.SalesOrderWhereInput> {
    const visibleOwnerIds = await this.getVisibleOwnerIds(user);
    const keyword = normalizeKeyword(query.keyword);
    const includeSystemRecords = parseBooleanFilter(query.includeSystemRecords);
    const andFilters: Prisma.SalesOrderWhereInput[] = [];

    if (visibleOwnerIds?.length) {
      andFilters.push({
        ownerUserId: { in: visibleOwnerIds },
      });
    }

    if (keyword) {
      andFilters.push({
        OR: [
          { orderNo: { contains: keyword } },
          { recipientName: { contains: keyword } },
          { recipientPhone: { contains: keyword } },
          { customer: { customerName: { contains: keyword } } },
          { channelPartner: { partnerName: { contains: keyword } } },
        ],
      });
    }

    if (query.status) {
      andFilters.push({ status: query.status as any });
    }

    if (query.paymentStatus) {
      andFilters.push({ paymentStatus: query.paymentStatus as any });
    }

    if (query.shipmentStatus) {
      andFilters.push({ shipmentStatus: query.shipmentStatus as any });
    }

    if (query.customerId) {
      andFilters.push({ customerId: query.customerId });
    }

    if (query.quotationId) {
      andFilters.push({ quotationId: query.quotationId });
    }

    if (!includeSystemRecords) {
      andFilters.push({
        NOT: [
          { customer: { source: { in: [...SYSTEM_RECORD_CUSTOMER_SOURCES] } } },
          ...SYSTEM_RECORD_TEXT_MARKERS.map((marker) => ({
            remark: { contains: marker },
          })),
          ...SYSTEM_RECORD_TEXT_MARKERS.map((marker) => ({
            channelPartner: { remark: { contains: marker } },
          })),
        ],
      });
    }

    andFilters.push(this.recordPartition.buildWhere(user) as Prisma.SalesOrderWhereInput);

    return andFilters.length ? { AND: andFilters } : {};
  }

  private serializeOrderListItem(order: any) {
    const totalProductAmount = formatMoney(order.totalProductAmount);
    const receivableAmount = formatMoney(order.receivableAmount);
    const receivedAmount = formatMoney(order.receivedAmount);

    return {
      id: order.id,
      orderNo: order.orderNo,
      orderDate: order.orderDate,
      customer: {
        id: order.customerId ?? order.customer?.id ?? "",
        name:
          order.customerName ?? order.customer?.customerName ?? "未匹配客户",
      },
      channelPartnerId:
        order.channelPartnerId ?? order.channelPartner?.id ?? null,
      channelPartnerName:
        order.channelPartnerName ?? order.channelPartner?.partnerName ?? null,
      recipientName: order.recipientName ?? null,
      warehouseName: order.warehouseName ?? null,
      totalProductAmount,
      receivableAmount,
      receivedAmount,
      itemCount: Array.isArray(order.items) ? order.items.length : 0,
      paymentStatus: order.paymentStatus,
      shipmentStatus: order.shipmentStatus,
      settlementStatus: order.settlementStatus,
      status: order.status,
      sourceLabel:
        order.sourceLabel ?? (order.quotationId ? "报价转订单" : "订单录入"),
    };
  }

  private isRealBusinessRecord(record: {
    dataScope?: string | null;
    partitionKey?: string | null;
    testBatchId?: string | null;
  }) {
    return (
      record.dataScope === "REAL" &&
      record.partitionKey === "REAL" &&
      !record.testBatchId
    );
  }

  private buildOrderSummary(items: any[]) {
    return {
      totalOrders: items.length,
      unpaidOrders: items.filter((item) => item.paymentStatus !== "PAID")
        .length,
      pendingShipments: items.filter(
        (item) =>
          !["DELIVERED", "SHIPPED"].includes(item.shipmentStatus) &&
          item.shipmentStatus !== "NOT_REQUIRED",
      ).length,
      pendingSettlements: items.filter(
        (item) => !["SETTLED", "NOT_REQUIRED"].includes(item.settlementStatus),
      ).length,
      totalReceivable: formatMoney(
        sumAmounts(items.map((item) => item.receivableAmount)),
      ),
      totalReceived: formatMoney(
        sumAmounts(items.map((item) => item.receivedAmount)),
      ),
    };
  }

  private buildPaymentsSummary(items: any[]) {
    return {
      totalRecords: items.length,
      confirmedCount: items.filter((item) => item.status === "CONFIRMED")
        .length,
      pendingCount: items.filter((item) => item.status === "PENDING").length,
      totalAmount: formatMoney(sumAmounts(items.map((item) => item.amount))),
    };
  }

  private buildShipmentsSummary(items: any[]) {
    return {
      totalRecords: items.length,
      pendingCount: items.filter((item) => item.status === "PENDING").length,
      deliveredCount: items.filter((item) => item.status === "DELIVERED")
        .length,
      activeCourierCount: new Set(
        items.map((item) => item.courierCompany).filter(Boolean),
      ).size,
    };
  }

  private buildSettlementsSummary(items: any[]) {
    return {
      totalRecords: items.length,
      pendingCount: items.filter((item) => item.status === "PENDING").length,
      settledCount: items.filter((item) => item.status === "SETTLED").length,
      totalProfitAmount: formatMoney(
        sumAmounts(items.map((item) => item.totalProfitAmount)),
      ),
    };
  }

  private buildFinanceAccountsSummary(items: any[]) {
    return {
      totalAccounts: items.length,
      enabledAccounts: items.filter((item) => item.enabled).length,
      defaultAccounts: items.filter((item) => item.isDefault).length,
    };
  }

  private async ensureCustomerVisible(
    customerId: string,
    user: AuthenticatedUser,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: await this.accessControl.buildCustomerWhere(user, {
        id: customerId,
      }),
    });

    if (!customer) {
      throw new BadRequestException("客户不存在或当前账号无权引用");
    }

    return customer;
  }

  private async ensureChannelPartnerVisible(
    channelPartnerId: string,
    user: AuthenticatedUser,
  ) {
    const visibleOwnerIds = await this.getVisibleOwnerIds(user);
    const partner = await this.prisma.channelPartner.findFirst({
      where: this.buildPartitionWhere(
        user,
        (visibleOwnerIds?.length
          ? {
              id: channelPartnerId,
              ownerUserId: { in: visibleOwnerIds },
            }
          : { id: channelPartnerId }) as Prisma.ChannelPartnerWhereInput,
      ),
    });

    if (!partner) {
      throw new BadRequestException("渠道商家不存在或当前账号无权引用");
    }

    return partner;
  }

  private async findAccessibleOrder(
    id: string,
    user: AuthenticatedUser,
    include?: Prisma.SalesOrderInclude,
  ) {
    const where = await this.buildOrderWhere(user, {});
    const order = await this.prisma.salesOrder.findFirst({
      where: {
        AND: [where, { id }],
      },
      include,
    });

    if (!order) {
      throw new NotFoundException("订单不存在或无权访问");
    }

    return order;
  }

  private async ensureQuotationTransferable(
    quotationId: string,
    customerId: string,
    user: AuthenticatedUser,
  ) {
    const quotation = await this.prisma.quotation.findFirst({
      where: await this.accessControl.buildQuotationWhere(user, {
        id: quotationId,
      }),
      include: {
        items: {
          select: { id: true },
        },
      },
    });

    if (!quotation) {
      throw new BadRequestException("报价不存在或当前账号无权转入订单");
    }

    this.recordPartition.assertSamePartition(user, quotation, "报价");

    if (quotation.customerId !== customerId) {
      throw new BadRequestException("订单客户必须与来源报价客户一致");
    }

    if (!quotation.items.length) {
      throw new BadRequestException("当前报价没有可转入订单的品项明细");
    }

    if (quotation.status === QuotationStatus.LOST) {
      throw new BadRequestException("已失效报价不能转入订单");
    }

    if (quotation.approvalStatus === ApprovalStatus.PENDING) {
      throw new BadRequestException("折扣审批尚未完成，当前不能转入订单");
    }

    if (quotation.approvalStatus === ApprovalStatus.REJECTED) {
      throw new BadRequestException("报价审批未通过，不能转入订单");
    }

    const existingOrder = await this.prisma.salesOrder.findFirst({
      where: {
        quotationId: quotation.id,
        dataScope: quotation.dataScope,
        partitionKey: quotation.partitionKey,
        testBatchId: quotation.testBatchId ?? null,
      },
      select: {
        id: true,
        orderNo: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingOrder) {
      throw new BadRequestException(
        `这张报价已经转入订单 ${existingOrder.orderNo}，不能重复转单`,
      );
    }

    return quotation;
  }

  private async notifyOrderOwner(
    orderId: string,
    actor: AuthenticatedUser,
    event: "created" | "payment" | "shipment",
    details?: {
      amount?: string;
      paymentStatus?: OrderPaymentStatus;
      shipmentNo?: string | null;
      shipmentStatus?: OrderShipmentStatus;
    },
  ) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
      },
    });

    if (!order || !this.isRealBusinessRecord(order)) {
      return;
    }

    if (order.ownerUserId === actor.id) {
      return;
    }

    const actorName = actor.wecomName ?? actor.name;
    const customerName = order.customer?.customerName ?? "未匹配客户";
    const baseLines = [
      `订单：${order.orderNo}`,
      `客户：${customerName}`,
      `应收金额：${formatMoney(order.receivableAmount)}`,
    ];

    const eventConfig =
      event === "created"
        ? {
            type: "ORDER_CREATED",
            title: "新的订单已创建",
            content: [
              `${actorName} 创建了订单 ${order.orderNo}`,
              ...baseLines.slice(1),
              order.quotationId ? "来源：报价转订单" : "来源：订单录入",
            ],
          }
        : event === "payment"
          ? {
              type: "ORDER_PAYMENT_RECORDED",
              title: "订单收款已登记",
              content: [
                `${actorName} 为订单 ${order.orderNo} 登记了收款`,
                ...baseLines.slice(1),
                details?.amount ? `本次收款：${details.amount}` : null,
                details?.paymentStatus
                  ? `当前收款状态：${details.paymentStatus}`
                  : null,
              ],
            }
          : {
              type: "ORDER_SHIPMENT_CREATED",
              title: "订单发货已创建",
              content: [
                `${actorName} 为订单 ${order.orderNo} 创建了发货`,
                ...baseLines.slice(1),
                details?.shipmentNo ? `发货单：${details.shipmentNo}` : null,
                details?.shipmentStatus
                  ? `当前发货状态：${details.shipmentStatus}`
                  : null,
              ],
            };

    try {
      await this.notificationService.deliverEventSystemAndWecom({
        userId: order.ownerUserId,
        type: eventConfig.type,
        title: eventConfig.title,
        content: eventConfig.content.filter(Boolean).join("\n"),
        relatedType: "ORDER",
        relatedId: order.id,
      });
    } catch (error) {
      this.logger.warn(
        `订单事件通知失败 orderId=${order.id} event=${event}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async generateOrderNo(db: OrdersDbClient) {
    const dateKey = buildDateKey();
    const prefix = `SO-${dateKey}-`;
    const count = await db.salesOrder.count({
      where: {
        orderNo: {
          startsWith: prefix,
        },
      },
    });

    return `${prefix}${String(count + 1).padStart(3, "0")}`;
  }

  private async generatePaymentNo(db: OrdersDbClient) {
    const dateKey = buildDateKey();
    const prefix = `PM-${dateKey}-`;
    const count = await db.paymentRecord.count({
      where: {
        paymentNo: {
          startsWith: prefix,
        },
      },
    });

    return `${prefix}${String(count + 1).padStart(3, "0")}`;
  }

  private async generateShipmentNo(db: OrdersDbClient) {
    const dateKey = buildDateKey();
    const prefix = `SH-${dateKey}-`;
    const count = await db.shipmentRecord.count({
      where: {
        shipmentNo: {
          startsWith: prefix,
        },
      },
    });

    return `${prefix}${String(count + 1).padStart(3, "0")}`;
  }

  private async generateSettlementNo(db: OrdersDbClient) {
    const dateKey = buildDateKey();
    const prefix = `CS-${dateKey}-`;
    const count = await db.channelSettlement.count({
      where: {
        settlementNo: {
          startsWith: prefix,
        },
      },
    });

    return `${prefix}${String(count + 1).padStart(3, "0")}`;
  }

  private resolveOverallOrderStatus(input: {
    currentStatus: SalesOrderStatus;
    paymentStatus: OrderPaymentStatus;
    shipmentStatus: OrderShipmentStatus;
  }) {
    const idleShipmentStatuses: OrderShipmentStatus[] = [
      OrderShipmentStatus.PENDING,
      OrderShipmentStatus.CANCELED,
    ];

    if (input.currentStatus === SalesOrderStatus.CANCELED) {
      return SalesOrderStatus.CANCELED;
    }

    if (
      input.currentStatus === SalesOrderStatus.DRAFT &&
      input.paymentStatus === OrderPaymentStatus.UNPAID &&
      input.shipmentStatus === OrderShipmentStatus.PENDING
    ) {
      return SalesOrderStatus.DRAFT;
    }

    if (
      input.paymentStatus === OrderPaymentStatus.PAID &&
      input.shipmentStatus === OrderShipmentStatus.DELIVERED
    ) {
      return SalesOrderStatus.COMPLETED;
    }

    if (
      input.paymentStatus !== OrderPaymentStatus.UNPAID ||
      !idleShipmentStatuses.includes(input.shipmentStatus)
    ) {
      return SalesOrderStatus.IN_FULFILLMENT;
    }

    return SalesOrderStatus.CONFIRMED;
  }

  private async refreshOrderPaymentState(orderId: string, db: OrdersDbClient) {
    const order = await db.salesOrder.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException("订单不存在");
    }

    const confirmedPayments = order.payments.filter(
      (item) => item.status === PaymentRecordStatus.CONFIRMED,
    );
    const receivedAmount = confirmedPayments.reduce(
      (sum, item) => sum + decimalToNumber(item.amount),
      0,
    );
    const receivableAmount = decimalToNumber(order.receivableAmount);

    let paymentStatus: OrderPaymentStatus = OrderPaymentStatus.UNPAID;
    if (receivedAmount > 0 && receivedAmount < receivableAmount) {
      paymentStatus = OrderPaymentStatus.PARTIAL;
    } else if (receivedAmount >= receivableAmount && receivableAmount > 0) {
      paymentStatus = OrderPaymentStatus.PAID;
    }

    return db.salesOrder.update({
      where: { id: orderId },
      data: {
        receivedAmount: toDecimal(receivedAmount),
        paymentStatus,
        status: this.resolveOverallOrderStatus({
          currentStatus: order.status,
          paymentStatus,
          shipmentStatus: order.shipmentStatus,
        }),
      },
    });
  }

  private async refreshOrderShipmentState(orderId: string, db: OrdersDbClient) {
    const order = await db.salesOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        shipments: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException("订单不存在");
    }

    const totalOrderedQuantity = order.items.reduce(
      (sum, item) => sum + decimalToNumber(item.quantity),
      0,
    );
    const activeShipments = order.shipments.filter(
      (item) => item.status !== ShipmentRecordStatus.CANCELED,
    );
    const totalShippedQuantity = activeShipments.reduce(
      (sum, shipment) =>
        sum +
        shipment.items.reduce(
          (shipmentSum, item) => shipmentSum + decimalToNumber(item.quantity),
          0,
        ),
      0,
    );

    let shipmentStatus: OrderShipmentStatus = OrderShipmentStatus.PENDING;
    if (
      totalShippedQuantity > 0 &&
      totalShippedQuantity < totalOrderedQuantity
    ) {
      shipmentStatus = OrderShipmentStatus.PARTIAL;
    } else if (
      totalOrderedQuantity > 0 &&
      totalShippedQuantity >= totalOrderedQuantity
    ) {
      shipmentStatus = activeShipments.every(
        (item) => item.status === ShipmentRecordStatus.DELIVERED,
      )
        ? OrderShipmentStatus.DELIVERED
        : OrderShipmentStatus.SHIPPED;
    }

    return db.salesOrder.update({
      where: { id: orderId },
      data: {
        shipmentStatus,
        status: this.resolveOverallOrderStatus({
          currentStatus: order.status,
          paymentStatus: order.paymentStatus,
          shipmentStatus,
        }),
      },
    });
  }

  private async refreshOrderSettlementState(
    orderId: string,
    db: OrdersDbClient,
  ) {
    const order = await db.salesOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        settlementItems: {
          include: {
            settlement: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException("订单不存在");
    }

    if (!order.channelPartnerId) {
      return db.salesOrder.update({
        where: { id: orderId },
        data: {
          settlementStatus: SettlementStatus.NOT_REQUIRED,
        },
      });
    }

    const activeItems = order.settlementItems.filter(
      (item) => item.settlement?.status !== SettlementStatus.VOIDED,
    );

    let settlementStatus: SettlementStatus = SettlementStatus.PENDING;

    if (activeItems.length) {
      const totalOrderedQuantity = order.items.reduce(
        (sum, item) => sum + decimalToNumber(item.quantity),
        0,
      );
      const totalSettledQuantity = activeItems.reduce(
        (sum, item) => sum + decimalToNumber(item.quantity),
        0,
      );
      const touchedSettlements = activeItems
        .map((item) => item.settlement)
        .filter(Boolean);
      const allSettled =
        touchedSettlements.length > 0 &&
        touchedSettlements.every(
          (item) => item?.status === SettlementStatus.SETTLED,
        );

      if (
        totalOrderedQuantity > 0 &&
        totalSettledQuantity >= totalOrderedQuantity &&
        allSettled
      ) {
        settlementStatus = SettlementStatus.SETTLED;
      } else if (totalSettledQuantity > 0) {
        settlementStatus = SettlementStatus.PARTIAL;
      }
    }

    return db.salesOrder.update({
      where: { id: orderId },
      data: {
        settlementStatus,
      },
    });
  }

  private serializeChannelPartner(item: any) {
    return {
      id: item.id,
      partnerName: item.partnerName,
      contactName: item.contactName,
      mobile: item.mobile,
      city: item.city,
      settlementType: item.settlementType,
      settlementRuleText: item.settlementRuleText,
      remark: item.remark,
      createdAt: item.createdAt,
      owner: item.owner
        ? {
            id: item.owner.id,
            displayName: item.owner.name,
          }
        : null,
    };
  }

  private getMockOrders(query: OrdersQueryDto, _user: AuthenticatedUser) {
    const keyword = normalizeKeyword(query.keyword);

    const filtered = MOCK_ORDERS.filter((item) => {
      if (query.status && item.status !== query.status) {
        return false;
      }

      if (query.paymentStatus && item.paymentStatus !== query.paymentStatus) {
        return false;
      }

      if (
        query.shipmentStatus &&
        item.shipmentStatus !== query.shipmentStatus
      ) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [
        item.orderNo,
        item.customerName,
        item.recipientName,
        item.recipientPhone,
        item.channelPartnerName ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    }).map((item) => this.serializeOrderListItem(item));

    return {
      source: "mock" as const,
      summary: this.buildOrderSummary(filtered),
      items: filtered,
    };
  }

  async create(dto: CreateSalesOrderDto, user: AuthenticatedUser) {
    const customer = await this.ensureCustomerVisible(dto.customerId, user);
    const quotationId = normalizeOptionalText(dto.quotationId);
    const transferQuotation = quotationId
      ? await this.ensureQuotationTransferable(quotationId, customer.id, user)
      : null;

    if (dto.channelPartnerId) {
      await this.ensureChannelPartnerVisible(dto.channelPartnerId, user);
    }

    const productIds = dto.items
      .map((item) => normalizeOptionalText(item.productId))
      .filter(Boolean) as string[];
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: {
            id: { in: productIds },
          },
        })
      : [];
    const productMap = new Map(products.map((item) => [item.id, item]));

    const normalizedItems = dto.items.map((item, index) => {
      const productId = normalizeOptionalText(item.productId);
      const product = productId ? productMap.get(productId) : null;
      const itemName =
        normalizeOptionalText(item.itemName) ??
        product?.displayName ??
        product?.name ??
        null;

      if (!itemName) {
        throw new BadRequestException(`第 ${index + 1} 行商品缺少名称`);
      }

      if (item.quantity <= 0) {
        throw new BadRequestException(`第 ${index + 1} 行商品数量必须大于 0`);
      }

      const unitPrice = item.unitPrice ?? decimalToNumber(product?.salePrice);
      const lineAmount = item.quantity * unitPrice;

      return {
        productId,
        lineNo: index + 1,
        itemName,
        sku: normalizeOptionalText(item.sku) ?? product?.sku ?? null,
        spec: normalizeOptionalText(item.spec) ?? product?.spec ?? null,
        unit: normalizeOptionalText(item.unit) ?? product?.unit ?? null,
        quantity: new Prisma.Decimal(item.quantity),
        unitPrice: new Prisma.Decimal(unitPrice),
        lineAmount: new Prisma.Decimal(lineAmount),
        usagePurpose: normalizeOptionalText(item.usagePurpose),
        remark: normalizeOptionalText(item.remark),
      };
    });

    const totalProductAmount = normalizedItems.reduce(
      (sum, item) => sum + decimalToNumber(item.lineAmount),
      0,
    );
    const discountAmount = dto.discountAmount ?? 0;
    const shippingFee = dto.shippingFee ?? 0;
    const receivableAmount = totalProductAmount - discountAmount + shippingFee;

    const created = await this.prisma.$transaction(async (transaction) => {
      const orderNo = await this.generateOrderNo(transaction);

      if (transferQuotation) {
        await transaction.$queryRaw<{ id: string }[]>`
          SELECT id FROM Quotation WHERE id = ${transferQuotation.id} FOR UPDATE
        `;

        const existingOrder = await transaction.salesOrder.findFirst({
          where: {
            quotationId: transferQuotation.id,
            dataScope: transferQuotation.dataScope,
            partitionKey: transferQuotation.partitionKey,
            testBatchId: transferQuotation.testBatchId ?? null,
          },
          select: {
            id: true,
            orderNo: true,
          },
          orderBy: { createdAt: "desc" },
        });

        if (existingOrder) {
          throw new BadRequestException(
            `这张报价已经转入订单 ${existingOrder.orderNo}，不能重复转单`,
          );
        }
      }

      const order = await transaction.salesOrder.create({
        data: {
          orderNo,
          customerId: dto.customerId,
          quotationId,
          contractId: normalizeOptionalText(dto.contractId),
          channelPartnerId: normalizeOptionalText(dto.channelPartnerId),
          orderDate: parseDateInput(dto.orderDate) ?? new Date(),
          orderType: normalizeOptionalText(dto.orderType),
          recipientName: normalizeOptionalText(dto.recipientName),
          recipientPhone: normalizeOptionalText(dto.recipientPhone),
          recipientProvince: normalizeOptionalText(dto.recipientProvince),
          recipientCity: normalizeOptionalText(dto.recipientCity),
          recipientDistrict: normalizeOptionalText(dto.recipientDistrict),
          recipientAddress: normalizeOptionalText(dto.recipientAddress),
          usagePurpose: normalizeOptionalText(dto.usagePurpose),
          warehouseName: normalizeOptionalText(dto.warehouseName),
          totalProductAmount: toDecimal(totalProductAmount),
          discountAmount: toDecimal(discountAmount),
          shippingFee: toDecimal(shippingFee),
          receivableAmount: toDecimal(receivableAmount),
          receivedAmount: toDecimal(0),
          paymentStatus: OrderPaymentStatus.UNPAID,
          shipmentStatus: OrderShipmentStatus.PENDING,
          settlementStatus: dto.channelPartnerId
            ? SettlementStatus.PENDING
            : SettlementStatus.NOT_REQUIRED,
          status: dto.status ?? SalesOrderStatus.CONFIRMED,
          remark: normalizeOptionalText(dto.remark),
          ownerUserId: user.id,
          creatorUserId: user.id,
          dataScope: customer.dataScope,
          partitionKey: customer.partitionKey,
          testBatchId: customer.testBatchId,
          items: {
            create: normalizedItems,
          },
        },
        include: {
          customer: true,
          channelPartner: true,
          items: true,
        },
      });

      if (transferQuotation) {
        await transaction.quotation.update({
          where: { id: transferQuotation.id },
          data: { status: QuotationStatus.WON },
        });
      }

      return order;
    });

    await this.notifyOrderOwner(created.id, user, "created");

    return {
      message: "订单已创建",
      order: this.serializeOrderListItem(created),
    };
  }

  async update(id: string, dto: UpdateSalesOrderDto, user: AuthenticatedUser) {
    await this.findAccessibleOrder(id, user);

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: {
        orderDate: parseDateInput(dto.orderDate),
        orderType: normalizeOptionalText(dto.orderType),
        recipientName: normalizeOptionalText(dto.recipientName),
        recipientPhone: normalizeOptionalText(dto.recipientPhone),
        recipientProvince: normalizeOptionalText(dto.recipientProvince),
        recipientCity: normalizeOptionalText(dto.recipientCity),
        recipientDistrict: normalizeOptionalText(dto.recipientDistrict),
        recipientAddress: normalizeOptionalText(dto.recipientAddress),
        usagePurpose: normalizeOptionalText(dto.usagePurpose),
        warehouseName: normalizeOptionalText(dto.warehouseName),
        remark: normalizeOptionalText(dto.remark),
      },
      include: {
        customer: true,
        channelPartner: true,
        items: true,
      },
    });

    return {
      message: "订单信息已更新",
      order: this.serializeOrderListItem(updated),
    };
  }

  async confirm(id: string, user: AuthenticatedUser) {
    const order = await this.findAccessibleOrder(id, user);

    if (order.status === SalesOrderStatus.CANCELED) {
      throw new BadRequestException("已取消订单不能再次确认");
    }

    const nextStatus = this.resolveOverallOrderStatus({
      currentStatus: SalesOrderStatus.CONFIRMED,
      paymentStatus: order.paymentStatus,
      shipmentStatus: order.shipmentStatus,
    });

    const updated = await this.prisma.salesOrder.update({
      where: { id: order.id },
      data: {
        status:
          nextStatus === SalesOrderStatus.DRAFT
            ? SalesOrderStatus.CONFIRMED
            : nextStatus,
      },
      include: {
        customer: true,
        channelPartner: true,
        items: true,
      },
    });

    return {
      message: "订单已确认",
      order: this.serializeOrderListItem(updated),
    };
  }

  async cancel(id: string, user: AuthenticatedUser) {
    const order = await this.findAccessibleOrder(id, user);

    if (order.status === SalesOrderStatus.COMPLETED) {
      throw new BadRequestException("已完成订单不能取消");
    }

    if (order.paymentStatus !== OrderPaymentStatus.UNPAID) {
      throw new BadRequestException("已有收款记录的订单不能直接取消");
    }

    const cancelableShipmentStatuses: OrderShipmentStatus[] = [
      OrderShipmentStatus.PENDING,
      OrderShipmentStatus.CANCELED,
    ];

    if (!cancelableShipmentStatuses.includes(order.shipmentStatus)) {
      throw new BadRequestException("已有发货动作的订单不能直接取消");
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id: order.id },
      data: {
        status: SalesOrderStatus.CANCELED,
      },
      include: {
        customer: true,
        channelPartner: true,
        items: true,
      },
    });

    return {
      message: "订单已取消",
      order: this.serializeOrderListItem(updated),
    };
  }

  async createChannelSettlement(
    dto: CreateChannelSettlementDto,
    user: AuthenticatedUser,
  ) {
    const channelPartner = await this.ensureChannelPartnerVisible(
      dto.channelPartnerId,
      user,
    );

    const visibleOwnerIds = await this.getVisibleOwnerIds(user);
    const orderItemIds = Array.from(
      new Set(dto.items.map((item) => item.orderItemId.trim()).filter(Boolean)),
    );

    const orderItems = await this.prisma.salesOrderItem.findMany({
      where: {
        id: { in: orderItemIds },
        order: visibleOwnerIds?.length
          ? {
              ownerUserId: { in: visibleOwnerIds },
              channelPartnerId: dto.channelPartnerId,
              partitionKey: channelPartner.partitionKey,
            }
          : {
              channelPartnerId: dto.channelPartnerId,
              partitionKey: channelPartner.partitionKey,
            },
      },
      include: {
        order: true,
        settlementItems: {
          include: {
            settlement: true,
          },
        },
      },
    });

    if (orderItems.length !== orderItemIds.length) {
      throw new BadRequestException("结算明细中包含无效的订单商品");
    }

    const orderItemMap = new Map(orderItems.map((item) => [item.id, item]));
    const pendingQuantityMap = new Map<string, number>();

    const normalizedItems = dto.items.map((item, index) => {
      const orderItem = orderItemMap.get(item.orderItemId);
      if (!orderItem) {
        throw new BadRequestException(
          `第 ${index + 1} 行结算明细引用了不存在的订单商品`,
        );
      }

      if (orderItem.order.status === SalesOrderStatus.CANCELED) {
        throw new BadRequestException(
          `${orderItem.itemName} 所属订单已取消，不能继续创建结算`,
        );
      }

      const settledQuantity = orderItem.settlementItems
        .filter(
          (settlementItem) =>
            settlementItem.settlement.status !== SettlementStatus.VOIDED,
        )
        .reduce(
          (sum, settlementItem) =>
            sum + decimalToNumber(settlementItem.quantity),
          0,
        );
      const pendingQuantity = pendingQuantityMap.get(orderItem.id) ?? 0;
      const maxQuantity =
        decimalToNumber(orderItem.quantity) - settledQuantity - pendingQuantity;
      const quantity = item.quantity ?? maxQuantity;

      if (quantity <= 0) {
        throw new BadRequestException(`第 ${index + 1} 行结算数量必须大于 0`);
      }

      if (quantity > maxQuantity) {
        throw new BadRequestException(
          `${orderItem.itemName} 剩余可结数量不足，当前最多可结 ${formatMoney(maxQuantity)}`,
        );
      }

      pendingQuantityMap.set(orderItem.id, pendingQuantity + quantity);

      const supplyUnitPrice =
        item.supplyUnitPrice ?? decimalToNumber(orderItem.unitPrice);
      const costUnitPrice = item.costUnitPrice ?? 0;
      const supplyAmount = quantity * supplyUnitPrice;
      const costAmount = quantity * costUnitPrice;
      const cashPaymentAmount = item.cashPaymentAmount ?? 0;

      return {
        orderId: orderItem.orderId,
        orderItemId: orderItem.id,
        productId: orderItem.productId,
        orderDate: orderItem.order.orderDate,
        itemName: orderItem.itemName,
        quantity,
        supplyUnitPrice,
        supplyAmount,
        cashPaymentAmount,
        paymentNote: normalizeOptionalText(item.paymentNote),
        costUnitPrice,
        costAmount,
        profitAmount: supplyAmount - costAmount,
        remark: normalizeOptionalText(item.remark),
      };
    });

    const totalSupplyAmount = normalizedItems.reduce(
      (sum, item) => sum + item.supplyAmount,
      0,
    );
    const totalCostAmount = normalizedItems.reduce(
      (sum, item) => sum + item.costAmount,
      0,
    );
    const totalProfitAmount = normalizedItems.reduce(
      (sum, item) => sum + item.profitAmount,
      0,
    );
    const totalPaidAmount =
      dto.totalPaidAmount ??
      normalizedItems.reduce((sum, item) => sum + item.cashPaymentAmount, 0);
    const derivedStatus =
      totalSupplyAmount > 0 && totalPaidAmount >= totalSupplyAmount
        ? SettlementStatus.SETTLED
        : totalPaidAmount > 0
          ? SettlementStatus.PARTIAL
          : SettlementStatus.PENDING;

    const uniqueOrderIds = Array.from(
      new Set(normalizedItems.map((item) => item.orderId)),
    );

    const result = await this.prisma.$transaction(async (transaction) => {
      const settlementNo = await this.generateSettlementNo(transaction);
      const settlement = await transaction.channelSettlement.create({
        data: {
          settlementNo,
          channelPartnerId: dto.channelPartnerId,
          periodStart: parseDateInput(dto.periodStart),
          periodEnd: parseDateInput(dto.periodEnd),
          totalSupplyAmount: toDecimal(totalSupplyAmount),
          totalCostAmount: toDecimal(totalCostAmount),
          totalProfitAmount: toDecimal(totalProfitAmount),
          totalPaidAmount: toDecimal(totalPaidAmount),
          status: dto.status ?? derivedStatus,
          remark: normalizeOptionalText(dto.remark),
          creatorUserId: user.id,
          dataScope: channelPartner.dataScope,
          partitionKey: channelPartner.partitionKey,
          testBatchId: channelPartner.testBatchId,
          items: {
            create: normalizedItems.map((item) => ({
              orderId: item.orderId,
              orderItemId: item.orderItemId,
              productId: item.productId,
              orderDate: item.orderDate,
              itemName: item.itemName,
              quantity: toDecimal(item.quantity),
              supplyUnitPrice: toDecimal(item.supplyUnitPrice),
              supplyAmount: toDecimal(item.supplyAmount),
              cashPaymentAmount: toDecimal(item.cashPaymentAmount),
              paymentNote: item.paymentNote,
              costUnitPrice: toDecimal(item.costUnitPrice),
              costAmount: toDecimal(item.costAmount),
              profitAmount: toDecimal(item.profitAmount),
              remark: item.remark,
            })),
          },
        },
        include: {
          channelPartner: true,
          items: true,
        },
      });

      const affectedOrders = [];
      for (const orderId of uniqueOrderIds) {
        const nextOrder = await this.refreshOrderSettlementState(
          orderId,
          transaction,
        );
        affectedOrders.push({
          id: nextOrder.id,
          settlementStatus: nextOrder.settlementStatus,
        });
      }

      return { settlement, affectedOrders };
    });

    return {
      message: "渠道结算单已创建",
      settlement: {
        id: result.settlement.id,
        settlementNo: result.settlement.settlementNo,
        channelPartnerName: result.settlement.channelPartner.partnerName,
        periodStart: result.settlement.periodStart,
        periodEnd: result.settlement.periodEnd,
        totalSupplyAmount: formatMoney(result.settlement.totalSupplyAmount),
        totalCostAmount: formatMoney(result.settlement.totalCostAmount),
        totalProfitAmount: formatMoney(result.settlement.totalProfitAmount),
        totalPaidAmount: formatMoney(result.settlement.totalPaidAmount),
        status: result.settlement.status,
        items: result.settlement.items.length,
      },
      affectedOrders: result.affectedOrders,
    };
  }

  async createPayment(
    orderId: string,
    dto: CreatePaymentRecordDto,
    user: AuthenticatedUser,
  ) {
    const order = await this.findAccessibleOrder(orderId, user);
    const nextPaymentStatus = dto.status ?? PaymentRecordStatus.CONFIRMED;
    const normalizedReferenceNo = normalizeOptionalText(dto.referenceNo);

    if (dto.amount <= 0) {
      throw new BadRequestException("收款金额必须大于 0");
    }

    if (order.status === SalesOrderStatus.CANCELED) {
      throw new BadRequestException("已取消订单不能登记收款");
    }

    if (order.status === SalesOrderStatus.COMPLETED) {
      throw new BadRequestException("已完成订单不能继续登记收款");
    }

    if (order.paymentStatus === OrderPaymentStatus.PAID) {
      throw new BadRequestException("订单已收齐，不能继续登记收款");
    }

    if (dto.financeAccountId) {
      const account = await this.prisma.financeAccount.findUnique({
        where: { id: dto.financeAccountId },
      });
      if (!account) {
        throw new BadRequestException("收款账户不存在");
      }
    }

    const result = await this.prisma.$transaction(async (transaction) => {
      const lockedRows = await transaction.$queryRaw<{ id: string }[]>`
        SELECT id FROM SalesOrder WHERE id = ${order.id} FOR UPDATE
      `;

      if (!lockedRows.length) {
        throw new NotFoundException("订单不存在");
      }

      const lockedOrder = await transaction.salesOrder.findUnique({
        where: { id: order.id },
        include: {
          payments: true,
        },
      });

      if (!lockedOrder) {
        throw new NotFoundException("订单不存在");
      }

      if (lockedOrder.status === SalesOrderStatus.CANCELED) {
        throw new BadRequestException("已取消订单不能登记收款");
      }

      if (lockedOrder.status === SalesOrderStatus.COMPLETED) {
        throw new BadRequestException("已完成订单不能继续登记收款");
      }

      const receivableAmount = decimalToNumber(lockedOrder.receivableAmount);
      const confirmedAmount = lockedOrder.payments
        .filter((item) => item.status === PaymentRecordStatus.CONFIRMED)
        .reduce((sum, item) => sum + decimalToNumber(item.amount), 0);
      const remainingAmount = Math.max(receivableAmount - confirmedAmount, 0);

      if (
        nextPaymentStatus === PaymentRecordStatus.CONFIRMED &&
        dto.amount > remainingAmount
      ) {
        throw new BadRequestException(
          `本次收款不能超过剩余应收 ${formatMoney(remainingAmount)}`,
        );
      }

      if (normalizedReferenceNo) {
        const duplicatePayment = await transaction.paymentRecord.findFirst({
          where: {
            orderId: order.id,
            referenceNo: normalizedReferenceNo,
            status: {
              not: PaymentRecordStatus.VOIDED,
            },
          },
          select: {
            paymentNo: true,
          },
        });

        if (duplicatePayment) {
          throw new BadRequestException(
            `该流水号已登记过收款 ${duplicatePayment.paymentNo ?? ""}`.trim(),
          );
        }
      }

      const paymentNo = await this.generatePaymentNo(transaction);
      const payment = await transaction.paymentRecord.create({
        data: {
          paymentNo,
          orderId: order.id,
          financeAccountId: normalizeOptionalText(dto.financeAccountId),
          payerName: normalizeOptionalText(dto.payerName),
          paymentMethod: dto.paymentMethod ?? PaymentMethod.BANK_TRANSFER,
          amount: new Prisma.Decimal(dto.amount),
          paidAt: parseDateInput(dto.paidAt) ?? new Date(),
          status: nextPaymentStatus,
          referenceNo: normalizedReferenceNo,
          remark: normalizeOptionalText(dto.remark),
          creatorUserId: user.id,
          dataScope: order.dataScope,
          partitionKey: order.partitionKey,
          testBatchId: order.testBatchId,
        },
      });

      const nextOrder = await this.refreshOrderPaymentState(
        order.id,
        transaction,
      );
      return { paymentId: payment.id, nextOrder };
    });

    const payment = await this.prisma.paymentRecord.findUnique({
      where: { id: result.paymentId },
      include: {
        financeAccount: true,
      },
    });

    if (!payment) {
      throw new NotFoundException("收款记录创建后未能读取");
    }

    await this.notifyOrderOwner(order.id, user, "payment", {
      amount: formatMoney(payment.amount),
      paymentStatus: result.nextOrder.paymentStatus,
    });

    return {
      message: "收款记录已登记",
      payment: {
        id: payment.id,
        paymentNo: payment.paymentNo,
        payerName: payment.payerName,
        paymentMethod: payment.paymentMethod,
        amount: formatMoney(payment.amount),
        paidAt: payment.paidAt,
        status: payment.status,
        referenceNo: payment.referenceNo,
        financeAccount: payment.financeAccount
          ? {
              id: payment.financeAccount.id,
              companyName: payment.financeAccount.companyName,
              accountNo: payment.financeAccount.accountNo,
            }
          : null,
      },
      order: {
        id: result.nextOrder.id,
        paymentStatus: result.nextOrder.paymentStatus,
        receivedAmount: formatMoney(result.nextOrder.receivedAmount),
        status: result.nextOrder.status,
      },
    };
  }

  async createShipment(
    orderId: string,
    dto: CreateShipmentRecordDto,
    user: AuthenticatedUser,
  ) {
    const order = (await this.findAccessibleOrder(orderId, user, {
      items: true,
      shipments: {
        include: {
          items: true,
        },
      },
    })) as any;

    const orderItemMap = new Map<string, any>(
      order.items.map((item: any) => [item.id, item]),
    );
    const shippedQuantityMap = new Map<string, number>();

    for (const shipment of order.shipments) {
      if (shipment.status === ShipmentRecordStatus.CANCELED) {
        continue;
      }
      for (const shipmentItem of shipment.items) {
        shippedQuantityMap.set(
          shipmentItem.orderItemId,
          (shippedQuantityMap.get(shipmentItem.orderItemId) ?? 0) +
            decimalToNumber(shipmentItem.quantity),
        );
      }
    }

    const normalizedItems = dto.items.map((item, index) => {
      const orderItem = orderItemMap.get(item.orderItemId);
      if (!orderItem) {
        throw new BadRequestException(
          `第 ${index + 1} 行发货明细引用了不存在的订单商品`,
        );
      }

      if (item.quantity <= 0) {
        throw new BadRequestException(`第 ${index + 1} 行发货数量必须大于 0`);
      }

      const usedQuantity = shippedQuantityMap.get(item.orderItemId) ?? 0;
      const allowedQuantity =
        decimalToNumber(orderItem.quantity) - usedQuantity;
      if (item.quantity > allowedQuantity) {
        throw new BadRequestException(
          `${orderItem.itemName} 剩余可发数量不足，当前最多可发 ${formatMoney(allowedQuantity)}`,
        );
      }

      return {
        orderItemId: orderItem.id,
        productId: orderItem.productId,
        itemName: orderItem.itemName,
        quantity: new Prisma.Decimal(item.quantity),
      };
    });

    const result = await this.prisma.$transaction(async (transaction) => {
      const shipmentNo = await this.generateShipmentNo(transaction);
      const shipment = await transaction.shipmentRecord.create({
        data: {
          shipmentNo,
          orderId: order.id,
          warehouseName:
            normalizeOptionalText(dto.warehouseName) ??
            normalizeOptionalText(order.warehouseName),
          courierCompany: normalizeOptionalText(dto.courierCompany),
          trackingNo: normalizeOptionalText(dto.trackingNo),
          shippedAt: parseDateInput(dto.shippedAt) ?? new Date(),
          deliveredAt: parseDateInput(dto.deliveredAt),
          status:
            dto.status ??
            (dto.deliveredAt
              ? ShipmentRecordStatus.DELIVERED
              : ShipmentRecordStatus.SHIPPED),
          recipientName:
            normalizeOptionalText(dto.recipientName) ??
            normalizeOptionalText(order.recipientName),
          recipientPhone:
            normalizeOptionalText(dto.recipientPhone) ??
            normalizeOptionalText(order.recipientPhone),
          recipientAddress:
            normalizeOptionalText(dto.recipientAddress) ??
            normalizeOptionalText(order.recipientAddress),
          remark: normalizeOptionalText(dto.remark),
          operatorUserId: user.id,
          dataScope: order.dataScope,
          partitionKey: order.partitionKey,
          testBatchId: order.testBatchId,
          items: {
            create: normalizedItems,
          },
        },
      });

      const nextOrder = await this.refreshOrderShipmentState(
        order.id,
        transaction,
      );
      return { shipmentId: shipment.id, nextOrder };
    });

    const shipment = await this.prisma.shipmentRecord.findUnique({
      where: { id: result.shipmentId },
      include: {
        items: true,
      },
    });

    if (!shipment) {
      throw new NotFoundException("发货记录创建后未能读取");
    }

    await this.notifyOrderOwner(order.id, user, "shipment", {
      shipmentNo: shipment.shipmentNo,
      shipmentStatus: result.nextOrder.shipmentStatus,
    });

    return {
      message: "发货记录已创建",
      shipment: {
        id: shipment.id,
        shipmentNo: shipment.shipmentNo,
        warehouseName: shipment.warehouseName,
        courierCompany: shipment.courierCompany,
        trackingNo: shipment.trackingNo,
        shippedAt: shipment.shippedAt,
        deliveredAt: shipment.deliveredAt,
        status: shipment.status,
        itemCount: shipment.items.length,
      },
      order: {
        id: result.nextOrder.id,
        shipmentStatus: result.nextOrder.shipmentStatus,
        status: result.nextOrder.status,
      },
    };
  }

  async listChannelPartners(
    query: ChannelPartnersQueryDto,
    user: AuthenticatedUser,
  ) {
    const visibleOwnerIds = await this.getVisibleOwnerIds(user);
    const keyword = normalizeKeyword(query.keyword);
    const includeSystemRecords = parseBooleanFilter(query.includeSystemRecords);
    const where: Prisma.ChannelPartnerWhereInput = {};

    if (visibleOwnerIds?.length) {
      where.ownerUserId = { in: visibleOwnerIds };
    }

    if (keyword) {
      where.OR = [
        { partnerName: { contains: keyword } },
        { contactName: { contains: keyword } },
        { mobile: { contains: keyword } },
        { city: { contains: keyword } },
      ];
    }

    if (!includeSystemRecords) {
      where.NOT = SYSTEM_RECORD_TEXT_MARKERS.map((marker) => ({
        remark: { contains: marker },
      }));
    }

    const scopedWhere = this.buildPartitionWhere(user, where);

    const items = await this.prisma.channelPartner.findMany({
      where: scopedWhere,
      orderBy: { createdAt: "desc" },
      include: {
        owner: true,
      },
    });

    return {
      items: items.map((item) => this.serializeChannelPartner(item)),
    };
  }

  async createChannelPartner(
    dto: CreateChannelPartnerDto,
    user: AuthenticatedUser,
  ) {
    const partition = await this.recordPartition.getWritableCreateData(user);
    const partner = await this.prisma.channelPartner.create({
      data: {
        partnerName: dto.partnerName.trim(),
        contactName: normalizeOptionalText(dto.contactName),
        mobile: normalizeOptionalText(dto.mobile),
        wechatId: normalizeOptionalText(dto.wechatId),
        province: normalizeOptionalText(dto.province),
        city: normalizeOptionalText(dto.city),
        district: normalizeOptionalText(dto.district),
        address: normalizeOptionalText(dto.address),
        settlementRuleText: normalizeOptionalText(dto.settlementRuleText),
        remark: normalizeOptionalText(dto.remark),
        ownerUserId: user.id,
        dataScope: partition.dataScope,
        partitionKey: partition.partitionKey,
        testBatchId: partition.testBatchId,
      },
      include: {
        owner: true,
      },
    });

    return {
      message: "渠道商家已创建",
      item: this.serializeChannelPartner(partner),
    };
  }

  async createFinanceAccount(dto: CreateFinanceAccountDto) {
    const account = await this.prisma.$transaction(async (transaction) => {
      if (dto.isDefault) {
        await transaction.financeAccount.updateMany({
          where: {
            companyName: dto.companyName.trim(),
          },
          data: {
            isDefault: false,
          },
        });
      }

      return transaction.financeAccount.create({
        data: {
          companyName: dto.companyName.trim(),
          accountName: normalizeOptionalText(dto.accountName),
          accountNo: dto.accountNo.trim(),
          bankName: normalizeOptionalText(dto.bankName),
          accountType: normalizeOptionalText(dto.accountType),
          usageScene: normalizeOptionalText(dto.usageScene),
          isDefault: dto.isDefault ?? false,
          enabled: dto.enabled ?? true,
          remark: normalizeOptionalText(dto.remark),
        },
      });
    });

    return {
      message: "财务账户已创建",
      item: account,
    };
  }

  async updateFinanceAccount(id: string, dto: UpdateFinanceAccountDto) {
    const current = await this.prisma.financeAccount.findUnique({
      where: { id },
    });

    if (!current) {
      throw new NotFoundException("财务账户不存在");
    }

    const companyName = dto.companyName?.trim() || current.companyName;

    const account = await this.prisma.$transaction(async (transaction) => {
      if (dto.isDefault) {
        await transaction.financeAccount.updateMany({
          where: {
            companyName,
            id: {
              not: id,
            },
          },
          data: {
            isDefault: false,
          },
        });
      }

      return transaction.financeAccount.update({
        where: { id },
        data: {
          companyName: dto.companyName?.trim(),
          accountName: normalizeOptionalText(dto.accountName),
          accountNo: dto.accountNo?.trim(),
          bankName: normalizeOptionalText(dto.bankName),
          accountType: normalizeOptionalText(dto.accountType),
          usageScene: normalizeOptionalText(dto.usageScene),
          isDefault: dto.isDefault,
          enabled: dto.enabled,
          remark: normalizeOptionalText(dto.remark),
        },
      });
    });

    return {
      message: "财务账户已更新",
      item: account,
    };
  }

  async list(query: OrdersQueryDto, user: AuthenticatedUser) {
    try {
      const page = Math.max(query.page ?? 1, 1);
      const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 200);
      const where = await this.buildOrderWhere(user, query);
      const items = await this.prisma.salesOrder.findMany({
        where,
        orderBy: { orderDate: "desc" },
        include: {
          customer: true,
          channelPartner: true,
          items: true,
          payments: true,
          shipments: true,
          settlementItems: true,
        },
        take: pageSize,
        skip: (page - 1) * pageSize,
      });

      const serialized = items.map((item) => this.serializeOrderListItem(item));
      return {
        source: "database" as const,
        summary: this.buildOrderSummary(serialized),
        items: serialized,
      };
    } catch (error) {
      if (shouldUseMockFallback(error)) {
        return this.getMockOrders(query, user);
      }

      throwOrderSchemaUnavailable(error);
    }
  }

  async getById(id: string, user: AuthenticatedUser) {
    try {
      const where = await this.buildOrderWhere(user, {});
      const order = await this.prisma.salesOrder.findFirst({
        where: {
          AND: [where, { id }],
        },
        include: {
          customer: true,
          channelPartner: true,
          items: {
            include: {
              product: true,
              shipmentItems: true,
              settlementItems: true,
            },
            orderBy: { lineNo: "asc" },
          },
          payments: {
            include: { financeAccount: true },
            orderBy: { paidAt: "desc" },
          },
          shipments: {
            include: {
              items: {
                include: { product: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          settlementItems: {
            include: {
              settlement: {
                include: { channelPartner: true },
              },
              product: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!order) {
        throw new NotFoundException("订单不存在或无权访问");
      }

      return {
        source: "database" as const,
        order: this.serializeOrderListItem(order),
        items: order.items.map((item) => ({
          id: item.id,
          lineNo: item.lineNo,
          itemName: item.itemName,
          spec: item.spec,
          unit: item.unit,
          quantity: formatMoney(item.quantity),
          unitPrice: formatMoney(item.unitPrice),
          lineAmount: formatMoney(item.lineAmount),
          usagePurpose: item.usagePurpose,
        })),
        payments: order.payments.map((item) => ({
          id: item.id,
          paymentNo: item.paymentNo,
          payerName: item.payerName,
          paymentMethod: item.paymentMethod,
          amount: formatMoney(item.amount),
          paidAt: item.paidAt,
          status: item.status,
          referenceNo: item.referenceNo,
          financeAccount: item.financeAccount
            ? {
                id: item.financeAccount.id,
                companyName: item.financeAccount.companyName,
                accountNo: item.financeAccount.accountNo,
              }
            : null,
        })),
        shipments: order.shipments.map((item) => ({
          id: item.id,
          shipmentNo: item.shipmentNo,
          warehouseName: item.warehouseName,
          courierCompany: item.courierCompany,
          trackingNo: item.trackingNo,
          shippedAt: item.shippedAt,
          deliveredAt: item.deliveredAt,
          status: item.status,
          items: item.items.map((shipmentItem) => ({
            id: shipmentItem.id,
            itemName: shipmentItem.itemName,
            quantity: formatMoney(shipmentItem.quantity),
          })),
        })),
        settlements: order.settlementItems.map((item) => ({
          id: item.id,
          settlementNo: item.settlement?.settlementNo ?? null,
          channelPartnerName:
            item.settlement?.channelPartner?.partnerName ?? null,
          itemName: item.itemName,
          quantity: formatMoney(item.quantity),
          supplyAmount: formatMoney(item.supplyAmount),
          cashPaymentAmount: formatMoney(item.cashPaymentAmount),
          costAmount: formatMoney(item.costAmount),
          profitAmount: formatMoney(item.profitAmount),
          paymentNote: item.paymentNote,
          remark: item.remark,
        })),
      };
    } catch (error) {
      if (shouldUseMockFallback(error)) {
        const order = MOCK_ORDERS.find((item) => item.id === id);
        if (!order) {
          throw new NotFoundException("订单不存在或无权访问");
        }

        return {
          source: "mock" as const,
          order: this.serializeOrderListItem(order),
          items: order.items.map((item) => ({
            id: item.id,
            lineNo: item.lineNo,
            itemName: item.itemName,
            spec: item.spec,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineAmount: item.lineAmount,
            usagePurpose: item.usagePurpose,
          })),
          payments: order.payments.map((item) => ({
            id: item.id,
            paymentNo: item.paymentNo,
            payerName: item.payerName,
            paymentMethod: item.paymentMethod,
            amount: item.amount,
            paidAt: item.paidAt,
            status: item.status,
            referenceNo: item.referenceNo,
            financeAccount: MOCK_FINANCE_ACCOUNTS.find(
              (account) => account.id === item.financeAccountId,
            )
              ? {
                  id: item.financeAccountId,
                  companyName:
                    MOCK_FINANCE_ACCOUNTS.find(
                      (account) => account.id === item.financeAccountId,
                    )?.companyName ?? "",
                  accountNo:
                    MOCK_FINANCE_ACCOUNTS.find(
                      (account) => account.id === item.financeAccountId,
                    )?.accountNo ?? "",
                }
              : null,
          })),
          shipments: order.shipments.map((item) => ({
            id: item.id,
            shipmentNo: item.shipmentNo,
            warehouseName: item.warehouseName,
            courierCompany: item.courierCompany,
            trackingNo: item.trackingNo,
            shippedAt: item.shippedAt,
            deliveredAt: item.deliveredAt,
            status: item.status,
            items: item.items.map((shipmentItem) => ({
              id: shipmentItem.id,
              itemName: shipmentItem.itemName,
              quantity: shipmentItem.quantity,
            })),
          })),
          settlements: order.settlementItems.map((item) => ({
            id: item.id,
            settlementNo:
              item.settlementId === "demo-settlement-001"
                ? "CS-2026-001"
                : null,
            channelPartnerName: "海能量潍坊示范商家",
            itemName: item.itemName,
            quantity: item.quantity,
            supplyAmount: item.supplyAmount,
            cashPaymentAmount: item.cashPaymentAmount,
            costAmount: item.costAmount,
            profitAmount: item.profitAmount,
            paymentNote: item.paymentNote,
            remark: item.remark,
          })),
        };
      }

      throwOrderSchemaUnavailable(error);
    }
  }

  async listPayments(query: OrderPaymentsQueryDto, user: AuthenticatedUser) {
    try {
      const visibleOwnerIds = await this.getVisibleOwnerIds(user);
      const keyword = normalizeKeyword(query.keyword);
      const includeSystemRecords = parseBooleanFilter(query.includeSystemRecords);
      const where: Prisma.PaymentRecordWhereInput = {
        order: visibleOwnerIds?.length
          ? { ownerUserId: { in: visibleOwnerIds } }
          : undefined,
      };

      if (query.status) {
        where.status = query.status as any;
      }

      if (query.paymentMethod) {
        where.paymentMethod = query.paymentMethod as any;
      }

      if (keyword) {
        where.OR = [
          { paymentNo: { contains: keyword } },
          { payerName: { contains: keyword } },
          { referenceNo: { contains: keyword } },
          { order: { orderNo: { contains: keyword } } },
          { order: { customer: { customerName: { contains: keyword } } } },
        ];
      }

      if (!includeSystemRecords) {
        where.NOT = [
          { order: { customer: { source: { in: [...SYSTEM_RECORD_CUSTOMER_SOURCES] } } } },
          ...SYSTEM_RECORD_TEXT_MARKERS.map((marker) => ({
            order: { remark: { contains: marker } },
          })),
          ...SYSTEM_RECORD_TEXT_MARKERS.map((marker) => ({
            order: { channelPartner: { remark: { contains: marker } } },
          })),
        ];
      }

      const scopedWhere = this.buildPartitionWhere(user, where);

      const items = await this.prisma.paymentRecord.findMany({
        where: scopedWhere,
        orderBy: { paidAt: "desc" },
        include: {
          order: {
            include: { customer: true },
          },
          financeAccount: true,
        },
      });

      const serialized = items.map((item) => ({
        id: item.id,
        paymentNo: item.paymentNo,
        payerName: item.payerName,
        paymentMethod: item.paymentMethod,
        amount: formatMoney(item.amount),
        paidAt: item.paidAt,
        status: item.status,
        referenceNo: item.referenceNo,
        order: {
          id: item.order.id,
          orderNo: item.order.orderNo,
          customerName: item.order.customer.customerName,
        },
        financeAccount: item.financeAccount
          ? {
              id: item.financeAccount.id,
              companyName: item.financeAccount.companyName,
              accountNo: item.financeAccount.accountNo,
            }
          : null,
      }));

      return {
        source: "database" as const,
        summary: this.buildPaymentsSummary(serialized),
        items: serialized,
      };
    } catch (error) {
      if (shouldUseMockFallback(error)) {
        const serialized = MOCK_ORDERS.flatMap((order) =>
          order.payments.map((payment) => ({
            id: payment.id,
            paymentNo: payment.paymentNo,
            payerName: payment.payerName,
            paymentMethod: payment.paymentMethod,
            amount: payment.amount,
            paidAt: payment.paidAt,
            status: payment.status,
            referenceNo: payment.referenceNo,
            order: {
              id: order.id,
              orderNo: order.orderNo,
              customerName: order.customerName,
            },
            financeAccount: MOCK_FINANCE_ACCOUNTS.find(
              (account) => account.id === payment.financeAccountId,
            )
              ? {
                  id: payment.financeAccountId,
                  companyName:
                    MOCK_FINANCE_ACCOUNTS.find(
                      (account) => account.id === payment.financeAccountId,
                    )?.companyName ?? "",
                  accountNo:
                    MOCK_FINANCE_ACCOUNTS.find(
                      (account) => account.id === payment.financeAccountId,
                    )?.accountNo ?? "",
                }
              : null,
          })),
        ).filter((item) => {
          if (query.status && item.status !== query.status) {
            return false;
          }
          if (
            query.paymentMethod &&
            item.paymentMethod !== query.paymentMethod
          ) {
            return false;
          }
          const keyword = normalizeKeyword(query.keyword);
          if (!keyword) return true;
          return [
            item.paymentNo,
            item.payerName,
            item.order.orderNo,
            item.order.customerName,
          ]
            .join(" ")
            .toLowerCase()
            .includes(keyword);
        });

        return {
          source: "mock" as const,
          summary: this.buildPaymentsSummary(serialized),
          items: serialized,
        };
      }

      throwOrderSchemaUnavailable(error);
    }
  }

  async listShipments(query: OrderShipmentsQueryDto, user: AuthenticatedUser) {
    try {
      const visibleOwnerIds = await this.getVisibleOwnerIds(user);
      const keyword = normalizeKeyword(query.keyword);
      const includeSystemRecords = parseBooleanFilter(query.includeSystemRecords);
      const where: Prisma.ShipmentRecordWhereInput = {
        order: visibleOwnerIds?.length
          ? { ownerUserId: { in: visibleOwnerIds } }
          : undefined,
      };

      if (query.status) {
        where.status = query.status as any;
      }

      if (query.courierCompany) {
        where.courierCompany = query.courierCompany;
      }

      if (keyword) {
        where.OR = [
          { shipmentNo: { contains: keyword } },
          { trackingNo: { contains: keyword } },
          { courierCompany: { contains: keyword } },
          { order: { orderNo: { contains: keyword } } },
          { order: { customer: { customerName: { contains: keyword } } } },
        ];
      }

      if (!includeSystemRecords) {
        where.NOT = [
          { order: { customer: { source: { in: [...SYSTEM_RECORD_CUSTOMER_SOURCES] } } } },
          ...SYSTEM_RECORD_TEXT_MARKERS.map((marker) => ({
            order: { remark: { contains: marker } },
          })),
          ...SYSTEM_RECORD_TEXT_MARKERS.map((marker) => ({
            order: { channelPartner: { remark: { contains: marker } } },
          })),
        ];
      }

      const scopedWhere = this.buildPartitionWhere(user, where);

      const items = await this.prisma.shipmentRecord.findMany({
        where: scopedWhere,
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            include: { customer: true },
          },
          items: true,
        },
      });

      const serialized = items.map((item) => ({
        id: item.id,
        shipmentNo: item.shipmentNo,
        warehouseName: item.warehouseName,
        courierCompany: item.courierCompany,
        trackingNo: item.trackingNo,
        shippedAt: item.shippedAt,
        deliveredAt: item.deliveredAt,
        status: item.status,
        itemCount: item.items.length,
        order: {
          id: item.order.id,
          orderNo: item.order.orderNo,
          customerName: item.order.customer.customerName,
        },
      }));

      return {
        source: "database" as const,
        summary: this.buildShipmentsSummary(serialized),
        items: serialized,
      };
    } catch (error) {
      if (shouldUseMockFallback(error)) {
        const serialized = MOCK_ORDERS.flatMap((order) =>
          order.shipments.map((shipment) => ({
            id: shipment.id,
            shipmentNo: shipment.shipmentNo,
            warehouseName: shipment.warehouseName,
            courierCompany: shipment.courierCompany,
            trackingNo: shipment.trackingNo,
            shippedAt: shipment.shippedAt,
            deliveredAt: shipment.deliveredAt,
            status: shipment.status,
            itemCount: shipment.items.length,
            order: {
              id: order.id,
              orderNo: order.orderNo,
              customerName: order.customerName,
            },
          })),
        ).filter((item) => {
          if (query.status && item.status !== query.status) {
            return false;
          }
          if (
            query.courierCompany &&
            item.courierCompany !== query.courierCompany
          ) {
            return false;
          }
          const keyword = normalizeKeyword(query.keyword);
          if (!keyword) return true;
          return [
            item.shipmentNo,
            item.trackingNo,
            item.order.orderNo,
            item.order.customerName,
          ]
            .join(" ")
            .toLowerCase()
            .includes(keyword);
        });

        return {
          source: "mock" as const,
          summary: this.buildShipmentsSummary(serialized),
          items: serialized,
        };
      }

      throwOrderSchemaUnavailable(error);
    }
  }

  async listChannelSettlements(
    query: ChannelSettlementsQueryDto,
    user: AuthenticatedUser,
  ) {
    try {
      const visibleOwnerIds = await this.getVisibleOwnerIds(user);
      const keyword = normalizeKeyword(query.keyword);
      const includeSystemRecords = parseBooleanFilter(query.includeSystemRecords);
      const where: Prisma.ChannelSettlementWhereInput = visibleOwnerIds?.length
        ? {
            channelPartner: {
              ownerUserId: { in: visibleOwnerIds },
            },
          }
        : {};

      if (query.status) {
        where.status = query.status as any;
      }

      if (query.channelPartnerId) {
        where.channelPartnerId = query.channelPartnerId;
      }

      if (keyword) {
        where.OR = [
          { settlementNo: { contains: keyword } },
          { channelPartner: { partnerName: { contains: keyword } } },
        ];
      }

      if (!includeSystemRecords) {
        where.NOT = [
          ...SYSTEM_RECORD_TEXT_MARKERS.map((marker) => ({
            remark: { contains: marker },
          })),
          ...SYSTEM_RECORD_TEXT_MARKERS.map((marker) => ({
            channelPartner: { remark: { contains: marker } },
          })),
        ];
      }

      const scopedWhere = this.buildPartitionWhere(user, where);

      const items = await this.prisma.channelSettlement.findMany({
        where: scopedWhere,
        orderBy: { createdAt: "desc" },
        include: {
          channelPartner: true,
          items: true,
        },
      });

      const serialized = items.map((item) => ({
        id: item.id,
        settlementNo: item.settlementNo,
        channelPartnerName: item.channelPartner.partnerName,
        periodStart: item.periodStart,
        periodEnd: item.periodEnd,
        totalSupplyAmount: formatMoney(item.totalSupplyAmount),
        totalCostAmount: formatMoney(item.totalCostAmount),
        totalProfitAmount: formatMoney(item.totalProfitAmount),
        totalPaidAmount: formatMoney(item.totalPaidAmount),
        status: item.status,
        items: item.items.length,
      }));

      return {
        source: "database" as const,
        summary: this.buildSettlementsSummary(serialized),
        items: serialized,
      };
    } catch (error) {
      if (shouldUseMockFallback(error)) {
        const keyword = normalizeKeyword(query.keyword);
        const serialized = MOCK_SETTLEMENTS.filter((item) => {
          if (query.status && item.status !== query.status) {
            return false;
          }
          if (
            query.channelPartnerId &&
            item.channelPartnerId !== query.channelPartnerId
          ) {
            return false;
          }
          if (!keyword) {
            return true;
          }
          return [item.settlementNo, item.channelPartnerName]
            .join(" ")
            .toLowerCase()
            .includes(keyword);
        });

        return {
          source: "mock" as const,
          summary: this.buildSettlementsSummary(serialized),
          items: serialized,
        };
      }

      throwOrderSchemaUnavailable(error);
    }
  }

  async listFinanceAccounts(query: FinanceAccountsQueryDto) {
    try {
      const keyword = normalizeKeyword(query.keyword);
      const enabled = parseBooleanFilter(query.enabled);
      const where: Prisma.FinanceAccountWhereInput = {};

      if (enabled !== undefined) {
        where.enabled = enabled;
      }

      if (keyword) {
        where.OR = [
          { companyName: { contains: keyword } },
          { accountName: { contains: keyword } },
          { accountNo: { contains: keyword } },
          { usageScene: { contains: keyword } },
        ];
      }

      const items = await this.prisma.financeAccount.findMany({
        where,
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      });

      return {
        source: "database" as const,
        summary: this.buildFinanceAccountsSummary(items),
        items,
      };
    } catch (error) {
      if (shouldUseMockFallback(error)) {
        const keyword = normalizeKeyword(query.keyword);
        const enabled = parseBooleanFilter(query.enabled);
        const items = MOCK_FINANCE_ACCOUNTS.filter((item) => {
          if (enabled !== undefined && item.enabled !== enabled) {
            return false;
          }

          if (!keyword) {
            return true;
          }

          return [
            item.companyName,
            item.accountName ?? "",
            item.accountNo,
            item.usageScene ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(keyword);
        });

        return {
          source: "mock" as const,
          summary: this.buildFinanceAccountsSummary(items),
          items,
        };
      }

      throwOrderSchemaUnavailable(error);
    }
  }
}
