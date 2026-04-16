import {
  DataScope,
  OutputTemplateType,
  PrismaClient,
  ProductStatus,
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
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? "Huigui@123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

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

async function main() {
  await seedRolesAndPermissions();
  await seedIndustries();
  const admin = await seedAdminUser();
  await seedApprovalRules(admin.id);
  await seedProducts();
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
