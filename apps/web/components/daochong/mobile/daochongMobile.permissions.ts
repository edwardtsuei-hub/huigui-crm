import type {
  DaochongAction,
  DaochongNavItem,
  DaochongPageKey,
  DaochongPermissionKey,
  DaochongRole,
} from "./daochongMobile.types";

export const daochongRoles: DaochongRole[] = [
  {
    key: "teacher",
    label: "老师",
    description: "看本人日程、客户、业绩，提交结算、客户充值和补填纪要。",
    permissions: [
      "viewSchedule",
      "submitSettlement",
      "uploadEvidence",
      "viewEvidence",
      "submitRecharge",
      "viewOwnPerformance",
      "viewCustomers",
      "writeServiceNote",
    ],
  },
  {
    key: "chengcheng",
    label: "程程",
    description: "管理道冲管理员、项目、提点、耗卡审批、充值审批和财务汇总。",
    permissions: [
      "viewSchedule",
      "manageAppointment",
      "submitSettlement",
      "uploadEvidence",
      "viewEvidence",
      "submitRecharge",
      "approveRecharge",
      "approveConsumption",
      "viewFinanceSummary",
      "manageProjects",
      "manageCompensation",
      "manageMembers",
      "viewOwnPerformance",
      "viewCustomers",
      "writeServiceNote",
    ],
  },
  {
    key: "admin",
    label: "管理员",
    description: "按程程授权处理预约、客户、充值提交和耗卡审批。",
    permissions: [
      "viewSchedule",
      "manageAppointment",
      "submitSettlement",
      "uploadEvidence",
      "viewEvidence",
      "submitRecharge",
      "approveConsumption",
      "viewCustomers",
      "writeServiceNote",
    ],
  },
  {
    key: "finance",
    label: "财务/立猛",
    description: "查看已审批耗卡、充值、凭证、报销和工资汇总口径。",
    permissions: ["approveRecharge", "viewEvidence", "viewFinanceSummary", "viewCustomers"],
  },
  {
    key: "frontDesk",
    label: "前台",
    description: "处理预约、到店、改约、客户、充值提交和班表。",
    permissions: ["viewSchedule", "manageAppointment", "uploadEvidence", "viewEvidence", "submitRecharge", "viewCustomers"],
  },
];

export const defaultRoleKey = "teacher" satisfies DaochongRole["key"];

export const roleHomePage: Record<DaochongRole["key"], DaochongPageKey> = {
  teacher: "home",
  chengcheng: "home",
  admin: "home",
  finance: "finance",
  frontDesk: "home",
};

export const roleNavItems: Record<DaochongRole["key"], DaochongNavItem[]> = {
  teacher: [
    { key: "home", label: "首页", note: "预约" },
    { key: "performance", label: "我的业绩", note: "本人" },
    { key: "customers", label: "客户", note: "跟进" },
    { key: "profile", label: "我的", note: "待办" },
  ],
  chengcheng: [
    { key: "home", label: "首页", note: "全店" },
    { key: "performance", label: "我的业绩", note: "总览" },
    { key: "customers", label: "客户", note: "档案" },
    { key: "profile", label: "我的", note: "管理" },
  ],
  admin: [
    { key: "home", label: "首页", note: "预约" },
    { key: "approval", label: "审批", note: "耗卡" },
    { key: "customers", label: "客户", note: "跟进" },
    { key: "profile", label: "我的", note: "权限" },
  ],
  finance: [
    { key: "finance", label: "财务", note: "汇总" },
    { key: "recharge", label: "充值", note: "复核" },
    { key: "customers", label: "客户", note: "只读" },
    { key: "profile", label: "我的", note: "财务" },
  ],
  frontDesk: [
    { key: "home", label: "首页", note: "预约" },
    { key: "appointment", label: "预约", note: "到店" },
    { key: "customers", label: "客户", note: "跟进" },
    { key: "profile", label: "我的", note: "班表" },
  ],
};

export const createActions: DaochongAction[] = [
  { key: "appointment", label: "添加预约", note: "新客、复诊、临时加号", page: "appointment", permission: "manageAppointment" },
  { key: "recharge", label: "客户充值", note: "截图、现金照片、程程审批", page: "recharge", permission: "submitRecharge" },
  { key: "settlement", label: "记录耗卡", note: "服务结束后补业绩凭证", page: "settlement", permission: "submitSettlement" },
  { key: "communication", label: "项目沟通", note: "光的家园和道冲协作", page: "communication", permission: "writeServiceNote" },
  { key: "meetingNote", label: "会议纪要", note: "结论、待办和归档", page: "communication", permission: "writeServiceNote" },
  { key: "expense", label: "报销申请", note: "差旅、物料、活动支出", page: "expense", permission: "viewFinanceSummary" },
  { key: "bonus", label: "团队奖金", note: "程程填写原因和金额", page: "bonus", permission: "manageCompensation" },
  { key: "serviceNote", label: "补填纪要", note: "12 小时提醒入口", page: "serviceNote", permission: "writeServiceNote" },
];

export function hasPermission(role: DaochongRole, permission?: DaochongPermissionKey) {
  if (!permission) return true;
  return role.permissions.includes(permission);
}

export function getVisibleActions(role: DaochongRole) {
  return createActions.filter((action) => hasPermission(role, action.permission));
}

export function canOpenPage(role: DaochongRole, page: DaochongPageKey) {
  if (page === "recharge") {
    return hasPermission(role, "submitRecharge") || hasPermission(role, "approveRecharge");
  }

  if (page === "evidence") {
    return hasPermission(role, "viewEvidence");
  }

  const pagePermission: Partial<Record<DaochongPageKey, DaochongPermissionKey>> = {
    performance: "viewOwnPerformance",
    customers: "viewCustomers",
    customerDetail: "viewCustomers",
    appointment: "manageAppointment",
    settlement: "submitSettlement",
    serviceNote: "writeServiceNote",
    approval: "approveConsumption",
    settings: "manageProjects",
    members: "manageMembers",
    projects: "manageProjects",
    compensation: "manageCompensation",
    finance: "viewFinanceSummary",
    expense: "viewFinanceSummary",
    bonus: "manageCompensation",
    acceptance: "manageProjects",
    apiPlan: "manageProjects",
  };
  return hasPermission(role, pagePermission[page]);
}

export function getFallbackPage(role: DaochongRole) {
  return roleHomePage[role.key];
}
