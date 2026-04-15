import { PrismaClient, UserStatus, PermissionLevel, ProductStatus, OutputTemplateType } from "@prisma/client";
import bcrypt from "bcrypt";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const roles = [
    { code: "SUPER_ADMIN", name: "总管理", description: "系统最高权限" },
    { code: "SENIOR_MANAGER", name: "高级管理", description: "可查看经营数据与完整报价" },
    { code: "STAFF", name: "员工", description: "默认销售角色" }
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: role,
      create: role
    });
  }

  const permissions = [
    { code: "customer.read", name: "查看客户", module: "customers" },
    { code: "customer.write", name: "编辑客户", module: "customers" },
    { code: "product.read", name: "查看产品", module: "products" },
    { code: "product.write", name: "编辑产品", module: "products" },
    { code: "quotation.read", name: "查看报价", module: "quotations" },
    { code: "quotation.write", name: "创建报价", module: "quotations" }
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: permission,
      create: permission
    });
  }

  const roleRecords = await prisma.role.findMany();
  const permissionRecords = await prisma.permission.findMany();
  const superAdmin = roleRecords.find((role) => role.code === "SUPER_ADMIN");

  if (superAdmin) {
    for (const permission of permissionRecords) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdmin.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: superAdmin.id,
          permissionId: permission.id
        }
      });
    }
  }

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

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { code: "SUPER_ADMIN" }
  });

  const adminName = process.env.DEFAULT_ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? "Huigui@123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [{ email: "admin@huigui.local" }, { name: adminName }]
    }
  });

  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        name: adminName,
        email: existingAdmin.email ?? "admin@huigui.local",
        passwordHash,
        roleId: adminRole.id,
        status: UserStatus.ACTIVE
      }
    });
  } else {
    await prisma.user.create({
      data: {
        name: adminName,
        email: "admin@huigui.local",
        passwordHash,
        roleId: adminRole.id,
        status: UserStatus.ACTIVE
      }
    });
  }

  const agricultureGroup = await prisma.industryGroup.findUnique({ where: { name: "农业" } });
  const agricultureSubgroup = agricultureGroup
    ? await prisma.industrySubgroup.findFirst({ where: { groupId: agricultureGroup.id } })
    : null;

  if (agricultureGroup && agricultureSubgroup) {
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
