import assert from "node:assert/strict";
import {
  getQuickCreateGroupsForUser,
  type QuickCreateGroup,
  type QuickCreateIdentity,
} from "../apps/web/lib/navigation";

type TestCase = {
  name: string;
  run: () => void;
};

const tests: TestCase[] = [];

function test(name: string, run: TestCase["run"]) {
  tests.push({ name, run });
}

function visibleLabels(groups: QuickCreateGroup[], permissions: string[]) {
  return groups.flatMap((group) =>
    group.items
      .filter((item) => permissions.includes(item.permissionCode))
      .map((item) => item.label),
  );
}

function groupsFor(user: QuickCreateIdentity, pathname = "/work-management/home") {
  return getQuickCreateGroupsForUser("management", user, pathname);
}

test("Daochong quick create exposes field and reimbursement actions", () => {
  const permissions = ["action.work_management.create", "action.schedule.create"];
  const labels = visibleLabels(
    groupsFor({
      username: "huixin",
      displayName: "慧心",
      department: "道冲元气",
      roleCode: "DAOCHONG_TEACHER",
      roleName: "道冲老师",
      permissions,
    }),
    permissions,
  );

  assert.ok(labels.includes("创建周报"));
  assert.ok(labels.includes("添加预约"));
  assert.ok(labels.includes("申请报销"));
  assert.ok(labels.includes("客户充值"));
  assert.ok(labels.length > 1);
});

test("Finance quick create exposes review work instead of only weekly report", () => {
  const permissions = [
    "menu.finance",
    "page.finance.payroll",
    "page.settings.finance_accounts",
    "action.work_management.create",
  ];
  const labels = visibleLabels(
    groupsFor({
      username: "limeng",
      displayName: "周立猛",
      department: "财务人事",
      roleCode: "FINANCE",
      roleName: "财务 / 行政",
      permissions,
    }),
    permissions,
  );

  assert.ok(labels.includes("报销审核"));
  assert.ok(labels.includes("薪资处理"));
  assert.ok(labels.includes("财务账户"));
  assert.ok(labels.includes("创建周报"));
  assert.ok(labels.length > 1);
});

test("Ecommerce quick create uses ecommerce-specific weekly entry", () => {
  const permissions = ["action.work_management.create", "action.schedule.create"];
  const labels = visibleLabels(
    groupsFor({
      username: "yinxiaojuan",
      displayName: "尹筱娟",
      department: "电商部",
      roleCode: "ECOMMERCE_MANAGER",
      roleName: "电商负责人",
      permissions,
    }),
    permissions,
  );

  assert.ok(labels.includes("电商周报"));
  assert.ok(labels.includes("创建活动"));
  assert.ok(labels.includes("申请报销"));
  assert.equal(labels.includes("报销审核"), false);
});

test("Ecotech quick create keeps CRM business action separate", () => {
  const permissions = [
    "action.customer.create",
    "action.work_management.create",
    "action.schedule.create",
  ];
  const labels = visibleLabels(
    groupsFor({
      username: "tanxi",
      displayName: "譚喜",
      department: "洄歸生態科技",
      roleCode: "ECOTECH_MANAGER",
      roleName: "洄归生态科技",
      permissions,
    }),
    permissions,
  );

  assert.ok(labels.includes("新增客户"));
  assert.ok(labels.includes("创建周报"));
  assert.ok(labels.includes("创建活动"));
  assert.ok(labels.includes("申请报销"));
});

test("Daochong page path uses Daochong actions even for admin preview", () => {
  const permissions = ["action.work_management.create", "action.schedule.create"];
  const labels = visibleLabels(
    groupsFor(
      {
        username: "manager",
        displayName: "主管",
        roleCode: "ADMIN",
        roleName: "行政",
        permissions,
      },
      "/work-management/daochong",
    ),
    permissions,
  );

  assert.ok(labels.includes("添加预约"));
  assert.ok(labels.includes("客户充值"));
});

test("Management founder quick create includes minutes and payment expense", () => {
  const permissions = [
    "action.work_management.create",
    "action.schedule.create",
    "action.management.member.create",
    "action.management.role.update",
  ];
  const labels = visibleLabels(
    groupsFor({
      username: "admin",
      displayName: "创始人",
      department: "管理中心",
      title: "创始人",
      roleCode: "SUPER_ADMIN",
      roleName: "超级管理员",
      permissions,
    }),
    permissions,
  );

  assert.deepEqual(labels.slice(0, 2), ["会议纪要", "申请付款/报销"]);
  assert.ok(labels.includes("创建周报"));
  assert.ok(labels.includes("新增成员"));
  assert.ok(labels.length > 2);
});

async function main() {
  for (const item of tests) {
    await item.run();
    console.log(`ok - ${item.name}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
