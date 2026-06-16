import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SOLUTION_PERMISSION_CODES = [
  "menu.solutions",
  "page.solutions.workspace",
  "action.solution.create",
  "action.quotation.create",
];

async function main() {
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    }),
    prisma.permission.findMany({
      where: {
        code: {
          in: SOLUTION_PERMISSION_CODES,
        },
      },
      select: {
        id: true,
        code: true,
      },
    }),
  ]);

  const permissionIdByCode = new Map(
    permissions.map((permission) => [permission.code, permission.id]),
  );
  const missingDefinitions = SOLUTION_PERMISSION_CODES.filter(
    (code) => !permissionIdByCode.has(code),
  );

  if (missingDefinitions.length) {
    throw new Error(
      `缺少方案权限定义：${missingDefinitions.join("、")}。请先执行权限初始化或 seed。`,
    );
  }

  const inserts = [];
  const summary = [];

  for (const role of roles) {
    const currentCodes = new Set(
      role.rolePermissions.map((item) => item.permission.code),
    );
    const missingCodes = SOLUTION_PERMISSION_CODES.filter(
      (code) => !currentCodes.has(code),
    );

    for (const code of missingCodes) {
      inserts.push({
        roleId: role.id,
        permissionId: permissionIdByCode.get(code),
      });
    }

    summary.push({
      code: role.code,
      name: role.name,
      memberCount: role._count.users,
      missingCodes,
    });
  }

  if (inserts.length) {
    await prisma.rolePermission.createMany({
      data: inserts,
      skipDuplicates: true,
    });
  }

  const changedRoles = summary.filter((role) => role.missingCodes.length > 0);

  console.log("方案权限同步完成。");
  console.log(
    `角色总数：${summary.length}，本次补齐角色：${changedRoles.length}，新增权限关联：${inserts.length}`,
  );

  if (changedRoles.length) {
    console.log("");
    console.log("本次补齐明细：");
    for (const role of changedRoles) {
      console.log(
        `- ${role.name} (${role.code}) [成员 ${role.memberCount}] -> ${role.missingCodes.join(", ")}`,
      );
    }
    return;
  }

  console.log("");
  console.log("所有角色原本就已经具备方案权限，无需补齐。");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
