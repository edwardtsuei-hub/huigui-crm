import {
  CustomerStatus,
  DataScope,
  OrderPaymentStatus,
  OrderShipmentStatus,
  OutputTemplateType,
  PaymentMethod,
  PaymentRecordStatus,
  PrismaClient,
  ProductStatus,
  SalesOrderStatus,
  SettlementStatus,
  SettlementType,
  ShipmentRecordStatus,
  UserStatus
} from "@prisma/client";
import bcrypt from "bcrypt";
import "dotenv/config";
import {
  APPROVAL_RULE_TEMPLATES,
  DEFAULT_ROLE_PERMISSION_CODES,
  PERMISSION_DEFINITIONS,
  SYSTEM_ROLE_DEFINITIONS
} from "../../apps/api/src/management/management.constants";

const prisma = new PrismaClient();

function addMonths(base: Date, months: number) {
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next;
}

function buildOwnerProtectionWindow(base = new Date(), months = 3) {
  const ownerAssignedAt = new Date(base);
  return {
    ownerAssignedAt,
    ownerProtectionMonths: months,
    ownerProtectedUntil: addMonths(ownerAssignedAt, months),
  };
}

async function seedRolesAndPermissions() {
  for (const role of SYSTEM_ROLE_DEFINITIONS) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: role,
      create: role
    });
  }

  for (const permission of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: permission,
      create: permission
    });
  }

  const roleRecords = await prisma.role.findMany();
  const permissionRecords = await prisma.permission.findMany();
  const roleMap = new Map(roleRecords.map((role) => [role.code, role]));
  const permissionMap = new Map(permissionRecords.map((permission) => [permission.code, permission]));

  for (const [roleCode, permissionCodes] of Object.entries(DEFAULT_ROLE_PERMISSION_CODES)) {
    const role = roleMap.get(roleCode);
    if (!role) {
      continue;
    }

    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id }
    });

    for (const permissionCode of permissionCodes) {
      const permission = permissionMap.get(permissionCode);
      if (!permission) {
        continue;
      }

      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id
        }
      });
    }
  }

  const legacyRoleTargets: Record<string, string> = {
    SENIOR_MANAGER: "ADMIN",
    STAFF: "SALES"
  };

  for (const [legacyCode, nextCode] of Object.entries(legacyRoleTargets)) {
    const legacyRole = roleMap.get(legacyCode);
    const nextRole = roleMap.get(nextCode);
    if (!legacyRole || !nextRole) {
      continue;
    }

    await prisma.user.updateMany({
      where: { roleId: legacyRole.id },
      data: { roleId: nextRole.id }
    });
  }
}

async function seedApprovalRules(adminUserId?: string) {
  for (const rule of APPROVAL_RULE_TEMPLATES) {
    await prisma.approvalRule.upsert({
      where: { code: rule.code },
      update: {
        name: rule.name,
        description: rule.description,
        configJson: rule.configJson as any,
        sortOrder: rule.sortOrder,
        updatedByUserId: adminUserId
      },
      create: {
        ...rule,
        enabled: true,
        configJson: rule.configJson as any,
        updatedByUserId: adminUserId
      }
    });
  }
}

async function seedIndustries() {
  const groups = [
    { name: "农业", sortOrder: 1, subgroups: ["蔬菜种植", "果树种植", "粮食作物", "花卉苗木"] },
    { name: "工业", sortOrder: 2, subgroups: ["化工制造", "食品加工", "装备制造"] },
    { name: "服务业", sortOrder: 3, subgroups: ["品牌咨询", "渠道服务", "农业技术服务"] },
    { name: "养殖业", sortOrder: 4, subgroups: ["畜禽养殖", "水产养殖", "饲料配套"] }
  ];

  for (const group of groups) {
    const createdGroup = await prisma.industryGroup.upsert({
      where: { name: group.name },
      update: { sortOrder: group.sortOrder },
      create: { name: group.name, sortOrder: group.sortOrder }
    });

    for (const [index, subgroupName] of group.subgroups.entries()) {
      await prisma.industrySubgroup.upsert({
        where: {
          groupId_name: {
            groupId: createdGroup.id,
            name: subgroupName
          }
        },
        update: { sortOrder: index + 1 },
        create: {
          groupId: createdGroup.id,
          name: subgroupName,
          sortOrder: index + 1
        }
      });
    }
  }
}

async function seedAdminUser() {
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { code: "SUPER_ADMIN" }
  });

  const adminName = process.env.DEFAULT_ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!adminPassword && process.env.NODE_ENV === "production") {
    throw new Error("DEFAULT_ADMIN_PASSWORD must be configured when seeding production");
  }

  if (adminPassword && (!/[A-Za-z]/.test(adminPassword) || !/\d/.test(adminPassword) || adminPassword.length < 8)) {
    throw new Error("DEFAULT_ADMIN_PASSWORD must be at least 8 characters and contain both letters and numbers");
  }

  const seededAdminPassword = adminPassword ?? "HuiguiDev123";
  const passwordHash = await bcrypt.hash(seededAdminPassword, 10);

  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [{ email: "admin@huigui.local" }, { name: adminName }, { loginAccount: adminName }]
    }
  });

  if (existingAdmin) {
    return prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        name: adminName,
        loginAccount: adminName,
        email: existingAdmin.email ?? "admin@huigui.local",
        passwordHash,
        roleId: adminRole.id,
        dataScope: DataScope.ALL,
        department: existingAdmin.department ?? "管理中心",
        title: existingAdmin.title ?? "系统管理员",
        status: UserStatus.ACTIVE
      }
    });
  }

  return prisma.user.create({
    data: {
      name: adminName,
      loginAccount: adminName,
      email: "admin@huigui.local",
      passwordHash,
      roleId: adminRole.id,
      dataScope: DataScope.ALL,
      department: "管理中心",
      title: "系统管理员",
      status: UserStatus.ACTIVE
    }
  });
}

async function seedProducts() {
  const agricultureGroup = await prisma.industryGroup.findUnique({ where: { name: "农业" } });
  const agricultureSubgroup = agricultureGroup
    ? await prisma.industrySubgroup.findFirst({ where: { groupId: agricultureGroup.id } })
    : null;

  if (!agricultureGroup || !agricultureSubgroup) {
    return;
  }

  await prisma.product.upsert({
    where: { id: "seed-agriculture-ga" },
    update: {},
    create: {
      id: "seed-agriculture-ga",
      name: "GA 原液",
      displayName: "GA 土壤激活剂",
      industryGroupId: agricultureGroup.id,
      industrySubgroupId: agricultureSubgroup.id,
      sku: "GA-001",
      spec: "10kg/桶",
      unit: "桶",
      salePrice: 2100,
      outputTemplateType: OutputTemplateType.AGRICULTURE_PLAN,
      quoteEnabled: true,
      employeeVisible: true,
      customerVisible: true,
      status: ProductStatus.ENABLED
    }
  });

  await prisma.product.upsert({
    where: { id: "seed-agriculture-gb" },
    update: {},
    create: {
      id: "seed-agriculture-gb",
      name: "GB 原液",
      displayName: "GB 叶面营养剂",
      industryGroupId: agricultureGroup.id,
      industrySubgroupId: agricultureSubgroup.id,
      sku: "GB-001",
      spec: "10kg/桶",
      unit: "桶",
      salePrice: 2100,
      outputTemplateType: OutputTemplateType.AGRICULTURE_PLAN,
      quoteEnabled: true,
      employeeVisible: true,
      customerVisible: true,
      status: ProductStatus.ENABLED
    }
  });
}

async function seedOrdersDemo(adminUserId: string) {
  const [productA, productB] = await Promise.all([
    prisma.product.findUnique({ where: { id: "seed-agriculture-ga" } }),
    prisma.product.findUnique({ where: { id: "seed-agriculture-gb" } }),
  ]);

  if (!productA || !productB) {
    return;
  }

  const financeAccountMain = await prisma.financeAccount.upsert({
    where: { id: "seed-finance-account-main" },
    update: {
      companyName: "山东洄归生态科技有限公司",
      accountName: "对公主账户",
      accountNo: "6222000018886666",
      bankName: "中国农业银行潍坊分行",
      accountType: "BANK",
      usageScene: "客户货款",
      isDefault: true,
      enabled: true,
      remark: "优先用于农业工业订单收款",
    },
    create: {
      id: "seed-finance-account-main",
      companyName: "山东洄归生态科技有限公司",
      accountName: "对公主账户",
      accountNo: "6222000018886666",
      bankName: "中国农业银行潍坊分行",
      accountType: "BANK",
      usageScene: "客户货款",
      isDefault: true,
      enabled: true,
      remark: "优先用于农业工业订单收款",
    },
  });

  await prisma.financeAccount.upsert({
    where: { id: "seed-finance-account-channel" },
    update: {
      companyName: "山东洄归生态科技有限公司",
      accountName: "渠道结算账户",
      accountNo: "6222000019997777",
      bankName: "中国建设银行潍坊分行",
      accountType: "BANK",
      usageScene: "渠道结算",
      isDefault: false,
      enabled: true,
      remark: "用于商家现结与分销结算",
    },
    create: {
      id: "seed-finance-account-channel",
      companyName: "山东洄归生态科技有限公司",
      accountName: "渠道结算账户",
      accountNo: "6222000019997777",
      bankName: "中国建设银行潍坊分行",
      accountType: "BANK",
      usageScene: "渠道结算",
      isDefault: false,
      enabled: true,
      remark: "用于商家现结与分销结算",
    },
  });

  const channelPartner = await prisma.channelPartner.upsert({
    where: { id: "seed-channel-partner-001" },
    update: {
      partnerName: "海能量潍坊示范商家",
      contactName: "王海",
      mobile: "13800001001",
      city: "潍坊",
      settlementType: SettlementType.CHANNEL_RESALE,
      settlementRuleText: "供货价结算，每月对账一次",
      ownerUserId: adminUserId,
    },
    create: {
      id: "seed-channel-partner-001",
      partnerName: "海能量潍坊示范商家",
      contactName: "王海",
      mobile: "13800001001",
      province: "山东省",
      city: "潍坊",
      district: "寿光市",
      address: "寿光示范点服务站",
      settlementType: SettlementType.CHANNEL_RESALE,
      settlementRuleText: "供货价结算，每月对账一次",
      ownerUserId: adminUserId,
      remark: "用于示范点订单与渠道结算演示",
    },
  });

  const customerA = await prisma.customer.upsert({
    where: { id: "seed-order-customer-001" },
    update: {
      customerName: "赵千谊",
      companyName: "寿光示范点",
      contactName: "赵千谊",
      mobile: "13800000001",
      city: "潍坊",
      status: CustomerStatus.COOPERATING,
      ownerUserId: adminUserId,
      ...buildOwnerProtectionWindow(new Date("2026-04-01T08:00:00.000Z")),
    },
    create: {
      id: "seed-order-customer-001",
      customerName: "赵千谊",
      companyName: "寿光示范点",
      contactName: "赵千谊",
      mobile: "13800000001",
      province: "山东省",
      city: "潍坊",
      district: "寿光市",
      address: "寿光市示范基地",
      source: "示范点导入",
      status: CustomerStatus.COOPERATING,
      ownerUserId: adminUserId,
      cooperationDirection: "农业试验示范点合作",
      cooperationContent: "海能量农业元素试验和补货",
      estimatedAmount: 2600,
      dealProbability: 80,
      remark: "用于订单履约链路演示",
      ...buildOwnerProtectionWindow(new Date("2026-04-01T08:00:00.000Z")),
    },
  });

  const customerB = await prisma.customer.upsert({
    where: { id: "seed-order-customer-002" },
    update: {
      customerName: "张小兰",
      companyName: "家庭种植试用客户",
      contactName: "张小兰",
      mobile: "13800000002",
      city: "青岛",
      status: CustomerStatus.CONTACTED,
      ownerUserId: adminUserId,
      ...buildOwnerProtectionWindow(new Date("2026-04-08T08:00:00.000Z")),
    },
    create: {
      id: "seed-order-customer-002",
      customerName: "张小兰",
      companyName: "家庭种植试用客户",
      contactName: "张小兰",
      mobile: "13800000002",
      province: "山东省",
      city: "青岛",
      district: "黄岛区",
      address: "黄岛区家庭种植点",
      source: "购买客户明细导入",
      status: CustomerStatus.CONTACTED,
      ownerUserId: adminUserId,
      cooperationDirection: "家庭种植试用",
      cooperationContent: "试用装购买与后续复购跟进",
      estimatedAmount: 600,
      dealProbability: 55,
      remark: "用于订单履约链路演示",
      ...buildOwnerProtectionWindow(new Date("2026-04-08T08:00:00.000Z")),
    },
  });

  await prisma.salesOrder.upsert({
    where: { id: "seed-order-001" },
    update: {
      orderNo: "SO-20260412-001",
      customerId: customerA.id,
      channelPartnerId: channelPartner.id,
      orderDate: new Date("2026-04-12T10:00:00.000Z"),
      recipientName: "赵千谊",
      recipientPhone: "13800000001",
      recipientProvince: "山东省",
      recipientCity: "潍坊",
      recipientDistrict: "寿光市",
      recipientAddress: "山东省潍坊市寿光市示范基地",
      usagePurpose: "西红柿试验与示范点补货",
      warehouseName: "潍坊仓",
      totalProductAmount: 2680,
      discountAmount: 80,
      shippingFee: 0,
      receivableAmount: 2600,
      receivedAmount: 1600,
      paymentStatus: OrderPaymentStatus.PARTIAL,
      shipmentStatus: OrderShipmentStatus.PARTIAL,
      settlementStatus: SettlementStatus.PENDING,
      status: SalesOrderStatus.IN_FULFILLMENT,
      remark: "示范点首轮补货",
      ownerUserId: adminUserId,
      creatorUserId: adminUserId,
    },
    create: {
      id: "seed-order-001",
      orderNo: "SO-20260412-001",
      customerId: customerA.id,
      channelPartnerId: channelPartner.id,
      orderDate: new Date("2026-04-12T10:00:00.000Z"),
      recipientName: "赵千谊",
      recipientPhone: "13800000001",
      recipientProvince: "山东省",
      recipientCity: "潍坊",
      recipientDistrict: "寿光市",
      recipientAddress: "山东省潍坊市寿光市示范基地",
      usagePurpose: "西红柿试验与示范点补货",
      warehouseName: "潍坊仓",
      totalProductAmount: 2680,
      discountAmount: 80,
      shippingFee: 0,
      receivableAmount: 2600,
      receivedAmount: 1600,
      paymentStatus: OrderPaymentStatus.PARTIAL,
      shipmentStatus: OrderShipmentStatus.PARTIAL,
      settlementStatus: SettlementStatus.PENDING,
      status: SalesOrderStatus.IN_FULFILLMENT,
      remark: "示范点首轮补货",
      ownerUserId: adminUserId,
      creatorUserId: adminUserId,
    },
  });

  await prisma.salesOrder.upsert({
    where: { id: "seed-order-002" },
    update: {
      orderNo: "SO-20260415-001",
      customerId: customerB.id,
      orderDate: new Date("2026-04-15T08:00:00.000Z"),
      recipientName: "张小兰",
      recipientPhone: "13800000002",
      recipientProvince: "山东省",
      recipientCity: "青岛",
      recipientDistrict: "黄岛区",
      recipientAddress: "山东省青岛市黄岛区家庭种植点",
      usagePurpose: "家庭种植试用",
      warehouseName: "青岛仓",
      totalProductAmount: 580,
      discountAmount: 0,
      shippingFee: 20,
      receivableAmount: 600,
      receivedAmount: 600,
      paymentStatus: OrderPaymentStatus.PAID,
      shipmentStatus: OrderShipmentStatus.PENDING,
      settlementStatus: SettlementStatus.NOT_REQUIRED,
      status: SalesOrderStatus.CONFIRMED,
      remark: "试用装首单",
      ownerUserId: adminUserId,
      creatorUserId: adminUserId,
    },
    create: {
      id: "seed-order-002",
      orderNo: "SO-20260415-001",
      customerId: customerB.id,
      orderDate: new Date("2026-04-15T08:00:00.000Z"),
      recipientName: "张小兰",
      recipientPhone: "13800000002",
      recipientProvince: "山东省",
      recipientCity: "青岛",
      recipientDistrict: "黄岛区",
      recipientAddress: "山东省青岛市黄岛区家庭种植点",
      usagePurpose: "家庭种植试用",
      warehouseName: "青岛仓",
      totalProductAmount: 580,
      discountAmount: 0,
      shippingFee: 20,
      receivableAmount: 600,
      receivedAmount: 600,
      paymentStatus: OrderPaymentStatus.PAID,
      shipmentStatus: OrderShipmentStatus.PENDING,
      settlementStatus: SettlementStatus.NOT_REQUIRED,
      status: SalesOrderStatus.CONFIRMED,
      remark: "试用装首单",
      ownerUserId: adminUserId,
      creatorUserId: adminUserId,
    },
  });

  await prisma.salesOrderItem.upsert({
    where: { id: "seed-order-item-001" },
    update: {
      orderId: "seed-order-001",
      productId: productA.id,
      lineNo: 1,
      itemName: "海能量农业元素 A 组",
      spec: "20L",
      unit: "桶",
      quantity: 2,
      unitPrice: 980,
      lineAmount: 1960,
      usagePurpose: "试验首轮喷洒",
    },
    create: {
      id: "seed-order-item-001",
      orderId: "seed-order-001",
      productId: productA.id,
      lineNo: 1,
      itemName: "海能量农业元素 A 组",
      spec: "20L",
      unit: "桶",
      quantity: 2,
      unitPrice: 980,
      lineAmount: 1960,
      usagePurpose: "试验首轮喷洒",
    },
  });

  await prisma.salesOrderItem.upsert({
    where: { id: "seed-order-item-002" },
    update: {
      orderId: "seed-order-001",
      productId: productB.id,
      lineNo: 2,
      itemName: "海能量农业元素 B 组",
      spec: "20L",
      unit: "桶",
      quantity: 1,
      unitPrice: 720,
      lineAmount: 720,
      usagePurpose: "补充用料",
    },
    create: {
      id: "seed-order-item-002",
      orderId: "seed-order-001",
      productId: productB.id,
      lineNo: 2,
      itemName: "海能量农业元素 B 组",
      spec: "20L",
      unit: "桶",
      quantity: 1,
      unitPrice: 720,
      lineAmount: 720,
      usagePurpose: "补充用料",
    },
  });

  await prisma.salesOrderItem.upsert({
    where: { id: "seed-order-item-003" },
    update: {
      orderId: "seed-order-002",
      productId: productA.id,
      lineNo: 1,
      itemName: "海能量家庭试用装",
      spec: "5L",
      unit: "桶",
      quantity: 1,
      unitPrice: 580,
      lineAmount: 580,
      usagePurpose: "家庭种植试用",
    },
    create: {
      id: "seed-order-item-003",
      orderId: "seed-order-002",
      productId: productA.id,
      lineNo: 1,
      itemName: "海能量家庭试用装",
      spec: "5L",
      unit: "桶",
      quantity: 1,
      unitPrice: 580,
      lineAmount: 580,
      usagePurpose: "家庭种植试用",
    },
  });

  await prisma.paymentRecord.upsert({
    where: { id: "seed-payment-001" },
    update: {
      paymentNo: "PM-20260412-001",
      orderId: "seed-order-001",
      financeAccountId: financeAccountMain.id,
      payerName: "赵千谊",
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      amount: 1600,
      paidAt: new Date("2026-04-12T11:30:00.000Z"),
      status: PaymentRecordStatus.CONFIRMED,
      referenceNo: "BANK-20260412-01",
      creatorUserId: adminUserId,
    },
    create: {
      id: "seed-payment-001",
      paymentNo: "PM-20260412-001",
      orderId: "seed-order-001",
      financeAccountId: financeAccountMain.id,
      payerName: "赵千谊",
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      amount: 1600,
      paidAt: new Date("2026-04-12T11:30:00.000Z"),
      status: PaymentRecordStatus.CONFIRMED,
      referenceNo: "BANK-20260412-01",
      creatorUserId: adminUserId,
    },
  });

  await prisma.paymentRecord.upsert({
    where: { id: "seed-payment-002" },
    update: {
      paymentNo: "PM-20260415-001",
      orderId: "seed-order-002",
      financeAccountId: financeAccountMain.id,
      payerName: "张小兰",
      paymentMethod: PaymentMethod.WECHAT,
      amount: 600,
      paidAt: new Date("2026-04-15T08:30:00.000Z"),
      status: PaymentRecordStatus.CONFIRMED,
      referenceNo: "WX-20260415-01",
      creatorUserId: adminUserId,
    },
    create: {
      id: "seed-payment-002",
      paymentNo: "PM-20260415-001",
      orderId: "seed-order-002",
      financeAccountId: financeAccountMain.id,
      payerName: "张小兰",
      paymentMethod: PaymentMethod.WECHAT,
      amount: 600,
      paidAt: new Date("2026-04-15T08:30:00.000Z"),
      status: PaymentRecordStatus.CONFIRMED,
      referenceNo: "WX-20260415-01",
      creatorUserId: adminUserId,
    },
  });

  await prisma.shipmentRecord.upsert({
    where: { id: "seed-shipment-001" },
    update: {
      shipmentNo: "SH-20260413-001",
      orderId: "seed-order-001",
      warehouseName: "潍坊仓",
      courierCompany: "顺丰",
      trackingNo: "SF1234567890",
      shippedAt: new Date("2026-04-13T09:00:00.000Z"),
      status: ShipmentRecordStatus.SHIPPED,
      recipientName: "赵千谊",
      recipientPhone: "13800000001",
      recipientAddress: "山东省潍坊市寿光市示范基地",
      operatorUserId: adminUserId,
    },
    create: {
      id: "seed-shipment-001",
      shipmentNo: "SH-20260413-001",
      orderId: "seed-order-001",
      warehouseName: "潍坊仓",
      courierCompany: "顺丰",
      trackingNo: "SF1234567890",
      shippedAt: new Date("2026-04-13T09:00:00.000Z"),
      status: ShipmentRecordStatus.SHIPPED,
      recipientName: "赵千谊",
      recipientPhone: "13800000001",
      recipientAddress: "山东省潍坊市寿光市示范基地",
      operatorUserId: adminUserId,
    },
  });

  await prisma.shipmentItem.upsert({
    where: { id: "seed-shipment-item-001" },
    update: {
      shipmentId: "seed-shipment-001",
      orderItemId: "seed-order-item-001",
      productId: productA.id,
      itemName: "海能量农业元素 A 组",
      quantity: 2,
    },
    create: {
      id: "seed-shipment-item-001",
      shipmentId: "seed-shipment-001",
      orderItemId: "seed-order-item-001",
      productId: productA.id,
      itemName: "海能量农业元素 A 组",
      quantity: 2,
    },
  });

  await prisma.channelSettlement.upsert({
    where: { id: "seed-channel-settlement-001" },
    update: {
      settlementNo: "CS-202604-001",
      channelPartnerId: channelPartner.id,
      periodStart: new Date("2026-04-01T00:00:00.000Z"),
      periodEnd: new Date("2026-04-30T23:59:59.000Z"),
      totalSupplyAmount: 1720,
      totalCostAmount: 1280,
      totalProfitAmount: 440,
      totalPaidAmount: 1000,
      status: SettlementStatus.PENDING,
      creatorUserId: adminUserId,
      remark: "示范商家 4 月对账单",
    },
    create: {
      id: "seed-channel-settlement-001",
      settlementNo: "CS-202604-001",
      channelPartnerId: channelPartner.id,
      periodStart: new Date("2026-04-01T00:00:00.000Z"),
      periodEnd: new Date("2026-04-30T23:59:59.000Z"),
      totalSupplyAmount: 1720,
      totalCostAmount: 1280,
      totalProfitAmount: 440,
      totalPaidAmount: 1000,
      status: SettlementStatus.PENDING,
      creatorUserId: adminUserId,
      remark: "示范商家 4 月对账单",
    },
  });

  await prisma.channelSettlementItem.upsert({
    where: { id: "seed-channel-settlement-item-001" },
    update: {
      settlementId: "seed-channel-settlement-001",
      orderId: "seed-order-001",
      orderItemId: "seed-order-item-001",
      productId: productA.id,
      orderDate: new Date("2026-04-12T10:00:00.000Z"),
      itemName: "海能量农业元素 A 组",
      quantity: 2,
      supplyUnitPrice: 860,
      supplyAmount: 1720,
      cashPaymentAmount: 1000,
      paymentNote: "部分现结",
      costUnitPrice: 640,
      costAmount: 1280,
      profitAmount: 440,
      remark: "示范商家首单折扣",
    },
    create: {
      id: "seed-channel-settlement-item-001",
      settlementId: "seed-channel-settlement-001",
      orderId: "seed-order-001",
      orderItemId: "seed-order-item-001",
      productId: productA.id,
      orderDate: new Date("2026-04-12T10:00:00.000Z"),
      itemName: "海能量农业元素 A 组",
      quantity: 2,
      supplyUnitPrice: 860,
      supplyAmount: 1720,
      cashPaymentAmount: 1000,
      paymentNote: "部分现结",
      costUnitPrice: 640,
      costAmount: 1280,
      profitAmount: 440,
      remark: "示范商家首单折扣",
    },
  });
}

async function main() {
  await seedRolesAndPermissions();
  await seedIndustries();
  const admin = await seedAdminUser();
  await seedApprovalRules(admin.id);
  await seedProducts();
  await seedOrdersDemo(admin.id);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
