"use client";

import type { SiteBrandKey } from "./site-brand";

export type WorkspaceIconKey =
  | "home"
  | "work"
  | "calendar"
  | "customers"
  | "orders"
  | "products"
  | "solutions"
  | "quotations"
  | "finance"
  | "files"
  | "management"
  | "settings"
  | "plus"
  | "search"
  | "help"
  | "account";

export type NavigationChild = {
  href: string;
  label: string;
  permissionCode: string;
  matchPrefixes: string[];
};

export type NavigationItem = {
  key: string;
  href: string;
  icon: WorkspaceIconKey;
  label: string;
  caption: string;
  permissionCode: string;
  matchPrefixes: string[];
  children?: NavigationChild[];
};

export type SearchCatalogItem = {
  href: string;
  label: string;
  description: string;
  permissionCode: string;
  matchPrefixes?: string[];
};

export type QuickCreateItem = {
  key: string;
  label: string;
  description: string;
  icon: WorkspaceIconKey;
  permissionCode: string;
  href?: string;
  composeKind?: "reminder" | "schedule" | "todo";
};

export type QuickCreateGroup = {
  key: string;
  label: string;
  items: QuickCreateItem[];
};

export type PageMeta = {
  title: string;
  subtitle: string;
  showPageInfo?: boolean;
  showMobileDataMode?: boolean;
};

export type NavigationSearchModules = {
  customers: boolean;
  quotations: boolean;
  orders: boolean;
  inspections: boolean;
  members: boolean;
};

export type NavigationWorkspaceConfig = {
  items: NavigationItem[];
  searchCatalog: SearchCatalogItem[];
  quickCreateGroups: QuickCreateGroup[];
  searchPlaceholder: string;
  searchEmptyState: string;
  searchDescription: string;
  searchNoResults: string;
  searchFooter: string;
  searchModules: NavigationSearchModules;
};

export const navigationTree: NavigationItem[] = [
  {
    key: "dashboard",
    href: "/dashboard",
    icon: "home",
    label: "首页",
    caption: "经营驾驶舱与角色工作台",
    permissionCode: "menu.dashboard",
    matchPrefixes: ["/dashboard"],
  },
  {
    key: "work-management",
    href: "/work-management/home",
    icon: "work",
    label: "工作管理",
    caption: "周报、月目标与计划承接",
    permissionCode: "menu.work_management",
    matchPrefixes: ["/work-management"],
    children: [
      {
        href: "/work-management/weekly-reports",
        label: "周报",
        permissionCode: "page.work_management.weekly_reports",
        matchPrefixes: ["/work-management/weekly-reports"],
      },
      {
        href: "/work-management/monthly-goals",
        label: "本月目标",
        permissionCode: "page.work_management.monthly_goals",
        matchPrefixes: ["/work-management/monthly-goals"],
      },
    ],
  },
  {
    key: "schedule",
    href: "/schedule",
    icon: "calendar",
    label: "日程",
    caption: "提醒、计划与执行节奏",
    permissionCode: "menu.schedule",
    matchPrefixes: ["/schedule", "/notifications"],
    children: [
      {
        href: "/schedule/shifts",
        label: "班表管理",
        permissionCode: "menu.schedule",
        matchPrefixes: ["/schedule/shifts"],
      },
    ],
  },
  {
    key: "customers",
    href: "/customers",
    icon: "customers",
    label: "客户",
    caption: "客户池、跟进与商机推进",
    permissionCode: "menu.customers",
    matchPrefixes: ["/customers"],
  },
  {
    key: "products",
    href: "/products",
    icon: "products",
    label: "产品",
    caption: "产品资产、模板与展示资料",
    permissionCode: "page.products.list",
    matchPrefixes: ["/products"],
    children: [
      {
        href: "/products/ai-import",
        label: "AI 解析队列",
        permissionCode: "page.products.ai_import",
        matchPrefixes: ["/products/ai-import"],
      },
      {
        href: "/products/new",
        label: "新增产品",
        permissionCode: "action.product.create",
        matchPrefixes: ["/products/new"],
      },
    ],
  },
  {
    key: "solutions",
    href: "/solutions",
    icon: "solutions",
    label: "方案",
    caption: "农业方案与其他行业报价",
    permissionCode: "menu.solutions",
    matchPrefixes: ["/solutions", "/agriculture", "/quotes/general"],
    children: [
      {
        href: "/solutions/agriculture/new",
        label: "农业方案",
        permissionCode: "action.solution.create",
        matchPrefixes: ["/solutions/agriculture/new", "/agriculture"],
      },
      {
        href: "/solutions/industry/new",
        label: "其他行业",
        permissionCode: "action.quotation.create",
        matchPrefixes: ["/solutions/industry/new", "/quotes/general"],
      },
    ],
  },
  {
    key: "orders",
    href: "/orders",
    icon: "orders",
    label: "订单",
    caption: "成交、收款、发货与渠道结算",
    permissionCode: "menu.orders",
    matchPrefixes: ["/orders"],
    children: [
      {
        href: "/orders/payments",
        label: "收款记录",
        permissionCode: "page.orders.payments",
        matchPrefixes: ["/orders/payments"],
      },
      {
        href: "/orders/shipments",
        label: "发货记录",
        permissionCode: "page.orders.shipments",
        matchPrefixes: ["/orders/shipments"],
      },
      {
        href: "/orders/channel-settlements",
        label: "渠道结算",
        permissionCode: "page.orders.channel_settlements",
        matchPrefixes: ["/orders/channel-settlements"],
      },
    ],
  },
  {
    key: "finance",
    href: "/finance/payroll",
    icon: "finance",
    label: "财务",
    caption: "薪资上传、核对与发送追溯",
    permissionCode: "menu.finance",
    matchPrefixes: ["/finance"],
    children: [
      {
        href: "/finance/payroll",
        label: "薪资发送",
        permissionCode: "page.finance.payroll",
        matchPrefixes: ["/finance/payroll"],
      },
    ],
  },
  {
    key: "files",
    href: "/files",
    icon: "files",
    label: "档案",
    caption: "企业资料中心与在线预览",
    permissionCode: "menu.files",
    matchPrefixes: ["/files"],
  },
  {
    key: "management",
    href: "/management",
    icon: "management",
    label: "管理中心",
    caption: "成员、角色、审批与审计",
    permissionCode: "menu.management",
    matchPrefixes: ["/management"],
  },
  {
    key: "settings",
    href: "/settings",
    icon: "settings",
    label: "设置",
    caption: "环境、偏好与系统配置",
    permissionCode: "menu.settings",
    matchPrefixes: ["/settings"],
  },
];

export const searchCatalog: SearchCatalogItem[] = [
  {
    href: "/dashboard",
    label: "首页",
    description: "经营驾驶舱与角色工作台",
    permissionCode: "menu.dashboard",
  },
  {
    href: "/work-management/home",
    label: "协同首页",
    description: "先进入协同首页，再分流到周报、月目标和团队入口",
    permissionCode: "menu.work_management",
  },
  {
    href: "/work-management/weekly-reports",
    label: "周报",
    description: "回顾上周完成事项并规划下周计划",
    permissionCode: "page.work_management.weekly_reports",
  },
  {
    href: "/work-management/monthly-goals",
    label: "本月目标",
    description: "按月份维护目标、交付物与时间安排",
    permissionCode: "page.work_management.monthly_goals",
  },
  {
    href: "/schedule",
    label: "日程管理",
    description: "计划、提醒与协同节奏",
    permissionCode: "menu.schedule",
  },
  {
    href: "/schedule/shifts",
    label: "班表管理",
    description: "维护部门班表、当天备注预约并导出班表图片",
    permissionCode: "menu.schedule",
  },
  {
    href: "/notifications",
    label: "通知中心",
    description: "筛选历史提醒和未读消息",
    permissionCode: "menu.schedule",
  },
  {
    href: "/customers",
    label: "客户管理",
    description: "客户池、状态与负责人筛选",
    permissionCode: "page.customers.list",
  },
  {
    href: "/customers/new",
    label: "新增客户",
    description: "创建客户档案并录入商机信息",
    permissionCode: "action.customer.create",
  },
  {
    href: "/products",
    label: "产品管理",
    description: "产品资产、模板和规则中心",
    permissionCode: "page.products.list",
  },
  {
    href: "/products/ai-import",
    label: "AI 解析队列",
    description: "集中处理待确认的产品解析结果",
    permissionCode: "page.products.ai_import",
  },
  {
    href: "/products/new",
    label: "新增产品",
    description: "录入产品资料与模板信息",
    permissionCode: "action.product.create",
  },
  {
    href: "/inspections",
    label: "检测管理",
    description: "统一查看送检批次、样本、报告进度与付款状态",
    permissionCode: "page.inspections.list",
  },
  {
    href: "/inspections/new",
    label: "新建检测",
    description: "录入送检批次、样本、项目和付款信息",
    permissionCode: "action.inspection.create",
  },
  {
    href: "/solutions",
    label: "方案工作台",
    description: "农业方案与报价工作入口",
    permissionCode: "menu.solutions",
  },
  {
    href: "/solutions/agriculture/new",
    label: "农业方案",
    description: "创建农业方案与配方配置",
    permissionCode: "action.solution.create",
  },
  {
    href: "/solutions/industry/new",
    label: "其他行业",
    description: "进入其他行业通用报价与明细配置",
    permissionCode: "action.quotation.create",
  },
  {
    href: "/quotations",
    label: "报价记录",
    description: "查看审批、导出与历史报价",
    permissionCode: "menu.quotations",
  },
  {
    href: "/orders",
    label: "订单管理",
    description: "统一查看订单、收款、发货和渠道结算状态",
    permissionCode: "page.orders.list",
  },
  {
    href: "/orders/payments",
    label: "收款记录",
    description: "查看回款进度、收款流水与未收款订单",
    permissionCode: "page.orders.payments",
  },
  {
    href: "/orders/shipments",
    label: "发货记录",
    description: "按仓库、快递和物流状态查看履约进度",
    permissionCode: "page.orders.shipments",
  },
  {
    href: "/orders/channel-settlements",
    label: "渠道结算",
    description: "核对商家供货、成本、利润和结算状态",
    permissionCode: "page.orders.channel_settlements",
  },
  {
    href: "/finance/payroll",
    label: "薪资上传与发送",
    description: "上传薪资表、核对发布批次并查看通知追溯",
    permissionCode: "page.finance.payroll",
  },
  {
    href: "/files",
    label: "档案中心",
    description: "正式资料与归档记录",
    permissionCode: "page.files.center",
  },
  {
    href: "/management",
    label: "管理中心",
    description: "成员、角色、审批与审计",
    permissionCode: "menu.management",
  },
  {
    href: "/management/members",
    label: "成员管理",
    description: "账号、数据范围和状态管理",
    permissionCode: "page.management.members",
  },
  {
    href: "/management/roles",
    label: "角色权限",
    description: "菜单、页面与动作权限配置",
    permissionCode: "page.management.roles",
  },
  {
    href: "/management/approvals",
    label: "审批规则",
    description: "折扣、导出与转移审批规则",
    permissionCode: "page.management.approvals",
  },
  {
    href: "/management/logs",
    label: "操作日志",
    description: "审计记录与风险操作追踪",
    permissionCode: "page.management.logs",
  },
  {
    href: "/settings",
    label: "系统设置",
    description: "环境、配置与系统状态",
    permissionCode: "menu.settings",
  },
  {
    href: "/settings/finance-accounts",
    label: "财务账户配置",
    description: "维护主体公司、收款账户和适用场景",
    permissionCode: "page.settings.finance_accounts",
  },
];

export const quickCreateGroups: QuickCreateGroup[] = [
  {
    key: "business",
    label: "业务核心",
    items: [
      {
        key: "customer",
        label: "新增客户",
        description: "录入客户资料并开始后续跟进或报价",
        icon: "customers",
        href: "/customers/new",
        permissionCode: "action.customer.create",
      },
      {
        key: "agriculture",
        label: "新建农业方案",
        description: "进入农业方案配置与预览流程",
        icon: "solutions",
        href: "/solutions/agriculture/new",
        permissionCode: "action.solution.create",
      },
      {
        key: "quotation",
        label: "新建通用报价",
        description: "快速生成可审批、可导出的报价单",
        icon: "quotations",
        href: "/quotes/general",
        permissionCode: "action.quotation.create",
      },
      {
        key: "product",
        label: "新增产品",
        description: "录入产品资产、模板和展示资料",
        icon: "products",
        href: "/products/new",
        permissionCode: "action.product.create",
      },
    ],
  },
  {
    key: "collaboration",
    label: "协作事项",
    items: [
      {
        key: "reminder",
        label: "新增提醒",
        description: "添加与工作台相关的轻量提醒事项",
        icon: "calendar",
        composeKind: "reminder",
        permissionCode: "action.schedule.create",
      },
      {
        key: "todo",
        label: "新建待办",
        description: "创建需要推进的个人或团队动作",
        icon: "plus",
        composeKind: "todo",
        permissionCode: "action.schedule.create",
      },
    ],
  },
  {
    key: "management",
    label: "管理类",
    items: [
      {
        key: "member",
        label: "新增成员",
        description: "创建账号并设置角色与数据范围",
        icon: "management",
        href: "/management/members?create=1",
        permissionCode: "action.management.member.create",
      },
      {
        key: "role",
        label: "新增角色",
        description: "配置角色菜单、页面与动作权限",
        icon: "management",
        href: "/management/roles?create=1",
        permissionCode: "action.management.role.update",
      },
      {
        key: "approval-rule",
        label: "新增审批规则",
        description: "进入审批规则页面继续配置",
        icon: "management",
        href: "/management/approvals",
        permissionCode: "page.management.approvals",
      },
    ],
  },
];

const MANAGEMENT_NAVIGATION_KEYS = new Set([
  "dashboard",
  "work-management",
  "schedule",
  "finance",
  "management",
  "settings",
]);

const MANAGEMENT_HIDDEN_SEARCH_PREFIXES = [
  "/customers",
  "/products",
  "/inspections",
  "/solutions",
  "/agriculture",
  "/quotes/general",
  "/quotations",
  "/orders",
  "/files",
  "/management/approvals",
];

const PUBLIC_NAVIGATION_SEARCH_MODULES: NavigationSearchModules = {
  customers: true,
  quotations: true,
  orders: true,
  inspections: true,
  members: true,
};

const MANAGEMENT_NAVIGATION_SEARCH_MODULES: NavigationSearchModules = {
  customers: false,
  quotations: false,
  orders: false,
  inspections: false,
  members: true,
};

function mapManagementNavigationItem(item: NavigationItem): NavigationItem {
  if (item.key === "schedule") {
    return {
      ...item,
      href: "/schedule",
      label: "协同日程",
      caption: "周报、月目标、提醒与内部协作时间轴",
      children: item.children ? [...item.children] : [],
    };
  }

  if (item.key === "dashboard") {
    return {
      ...item,
      caption: "今日重点、协作入口与待处理提醒",
    };
  }

  if (item.key === "work-management") {
    return {
      ...item,
      caption: "周报提交、主管审阅与部门汇总",
    };
  }

  if (item.key === "management") {
    return {
      ...item,
      caption: "成员、角色、通知与系统状态",
      children: item.children ? [...item.children] : [],
    };
  }

  return {
    ...item,
    children: item.children ? [...item.children] : [],
  };
}

function isManagementSearchItem(item: SearchCatalogItem) {
  return !MANAGEMENT_HIDDEN_SEARCH_PREFIXES.some((prefix) =>
    item.href.startsWith(prefix),
  );
}

function mapManagementSearchItem(item: SearchCatalogItem): SearchCatalogItem {
  if (item.href === "/schedule") {
    return {
      ...item,
      label: "协同日程",
      description: "查看周报、月目标、提醒与内部协作时间轴",
    };
  }

  if (item.href === "/schedule/shifts") {
    return {
      ...item,
      label: "班表管理",
      description: "维护部门班表、备注预约并导出班表图片",
    };
  }

  if (item.href === "/management") {
    return {
      ...item,
      description: "成员、角色、通知与系统状态总览",
    };
  }

  if (item.href === "/notifications") {
    return {
      ...item,
      description: "查看协作提醒、留言与系统消息历史",
    };
  }

  return { ...item };
}

function getManagementQuickCreateGroups(): QuickCreateGroup[] {
  return quickCreateGroups
    .filter((group) => group.key === "management")
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => item.key !== "approval-rule")
        .map((item) => ({ ...item })),
    }));
}

export function getNavigationWorkspaceConfig(
  brandKey: SiteBrandKey,
): NavigationWorkspaceConfig {
  if (brandKey === "management") {
    return {
      items: navigationTree
        .filter((item) => MANAGEMENT_NAVIGATION_KEYS.has(item.key))
        .map(mapManagementNavigationItem),
      searchCatalog: searchCatalog
        .filter(isManagementSearchItem)
        .map(mapManagementSearchItem),
      quickCreateGroups: getManagementQuickCreateGroups(),
      searchPlaceholder: "搜索周报、日程、班表、成员或管理入口",
      searchEmptyState:
        "输入周报、协同日程、班表、成员姓名，或直接搜索管理平台入口。",
      searchDescription:
        "优先展示协同、班表、管理平台入口与成员结果，避免把 CRM 业务对象混进来。",
      searchNoResults:
        "没有找到匹配的协同入口、成员或管理入口，可以换成员姓名、页面名称再试一次。",
      searchFooter:
        "Enter 打开首结果 · Esc 关闭搜索层 · 当前优先：协同入口、成员、入口",
      searchModules: MANAGEMENT_NAVIGATION_SEARCH_MODULES,
    };
  }

  return {
    items: navigationTree.map((item) => ({
      ...item,
      children: item.children ? [...item.children] : [],
    })),
    searchCatalog: searchCatalog.map((item) => ({ ...item })),
    quickCreateGroups: quickCreateGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => ({ ...item })),
    })),
    searchPlaceholder: "搜索客户、报价、订单、检测、成员或入口",
    searchEmptyState:
      "输入客户名称、报价单号、订单号、检测单号、成员姓名，或直接搜索工作台入口。",
    searchDescription:
      "业务对象优先，结果进入独立搜索层，正文会自然后移，不再直接被压住。",
    searchNoResults:
      "没有找到匹配的业务对象或入口，可以换客户名、单号、成员账号再试一次。",
    searchFooter:
      "Enter 打开首结果 · Esc 关闭搜索层 · 第一版优先顺序：客户、报价、订单、检测、成员、入口",
    searchModules: PUBLIC_NAVIGATION_SEARCH_MODULES,
  };
}

const pageMetaMap: Array<{ prefixes: string[]; meta: PageMeta }> = [
  {
    prefixes: ["/work-management/team/weekly-reports"],
    meta: {
      title: "团队周报",
      subtitle: "横向查看成员周报提交情况、承接项数量和最近动作。",
    },
  },
  {
    prefixes: ["/work-management/team/monthly-goals"],
    meta: {
      title: "团队月目标",
      subtitle: "按成员和月份对比团队目标结构、状态和目标数。",
    },
  },
  {
    prefixes: ["/work-management/team/overview"],
    meta: {
      title: "团队协同概览",
      subtitle: "从团队视角查看周报、月目标、提醒与最近动态。",
    },
  },
  {
    prefixes: ["/work-management/weekly-reports"],
    meta: {
      title: "周报",
      subtitle: "承接上周计划、整理本周重点，并把预计时间直接放进日程。",
    },
  },
  {
    prefixes: ["/work-management/monthly-goals"],
    meta: {
      title: "本月目标",
      subtitle: "按月维护目标、交付结果和截止安排，月底前完成下一月规划。",
    },
  },
  {
    prefixes: ["/work-management/home"],
    meta: {
      title: "协同首页",
      subtitle: "周报、目标、班表与协同入口。",
      showPageInfo: false,
      showMobileDataMode: false,
    },
  },
  {
    prefixes: [
      "/work-management/overview",
      "/work-management/team/overview",
      "/work-management",
    ],
    meta: {
      title: "协同总览",
      subtitle: "周报、目标、提醒与团队动态总览。",
    },
  },
  {
    prefixes: ["/finance/payroll"],
    meta: {
      title: "薪资上传与发送",
      subtitle: "在主后台内完成薪资表上传、核对发布和通知追溯。",
    },
  },
  {
    prefixes: ["/orders/channel-settlements"],
    meta: {
      title: "渠道结算",
      subtitle: "围绕商家供货、成本、利润和结算进度统一核对。",
    },
  },
  {
    prefixes: ["/orders/shipments"],
    meta: {
      title: "发货记录",
      subtitle: "统一查看仓库、快递和物流进度，承接订单履约。",
    },
  },
  {
    prefixes: ["/orders/payments"],
    meta: {
      title: "收款记录",
      subtitle: "按订单、客户和时间追踪回款状态与财务口径。",
    },
  },
  {
    prefixes: ["/orders/"],
    meta: {
      title: "订单详情",
      subtitle: "核对订单明细、收款、发货、渠道结算和关联档案。",
    },
  },
  {
    prefixes: ["/orders"],
    meta: {
      title: "订单管理",
      subtitle: "把成交、收款、发货和渠道结算放进同一条履约主链。",
    },
  },
  {
    prefixes: ["/management/logs"],
    meta: {
      title: "操作日志",
      subtitle: "统一查看关键操作、审计记录与风险行为。",
    },
  },
  {
    prefixes: ["/management/approvals"],
    meta: {
      title: "审批规则",
      subtitle: "配置折扣、导出和业务转移的审批流程。",
    },
  },
  {
    prefixes: ["/management/roles"],
    meta: {
      title: "角色权限",
      subtitle: "管理角色菜单、页面权限与数据范围。",
    },
  },
  {
    prefixes: ["/management/members"],
    meta: {
      title: "成员管理",
      subtitle: "维护账号状态、角色和组织权限边界。",
    },
  },
  {
    prefixes: ["/management"],
    meta: {
      title: "管理中心",
      subtitle: "总览成员、角色、通知与系统级风险事项。",
    },
  },
  {
    prefixes: ["/files"],
    meta: {
      title: "档案中心",
      subtitle: "查看正式资料、导出结果与归档状态。",
      showPageInfo: false,
    },
  },
  {
    prefixes: ["/quotations/"],
    meta: {
      title: "报价详情",
      subtitle: "核对金额、审批、导出与后续跟进风险。",
    },
  },
  {
    prefixes: ["/quotations"],
    meta: {
      title: "报价记录",
      subtitle: "统一筛选报价状态、审批结果与导出进度。",
    },
  },
  {
    prefixes: ["/quotes/general", "/solutions/industry/new"],
    meta: {
      title: "通用报价",
      subtitle: "按客户、品项和折扣生成正式报价。",
      showPageInfo: false,
    },
  },
  {
    prefixes: ["/agriculture", "/solutions/agriculture/new"],
    meta: {
      title: "农业方案",
      subtitle: "围绕作物、周期和桶数输出农业方案。",
      showPageInfo: false,
    },
  },
  {
    prefixes: ["/solutions"],
    meta: {
      title: "方案工作台",
      subtitle: "在农业方案和报价工作区之间快速切换。",
      showPageInfo: false,
    },
  },
  {
    prefixes: ["/products/new"],
    meta: {
      title: "新增产品",
      subtitle: "分组填写产品资产、模板和展示信息。",
    },
  },
  {
    prefixes: ["/products/"],
    meta: {
      title: "产品详情",
      subtitle: "查看资产说明、报价规则和最近引用情况。",
    },
  },
  {
    prefixes: ["/products"],
    meta: {
      title: "产品管理",
      subtitle: "用统一筛选和表格维护产品资产库。",
    },
  },
  {
    prefixes: ["/inspections/new"],
    meta: {
      title: "新建检测单",
      subtitle: "按检测单、样本、项目和付款结构录入检测业务。",
    },
  },
  {
    prefixes: ["/inspections/"],
    meta: {
      title: "检测详情",
      subtitle: "查看样本、检测项目、进度时间线、付款和附件。",
    },
  },
  {
    prefixes: ["/inspections"],
    meta: {
      title: "检测管理",
      subtitle: "把送检、报告、付款和归档统一放进一张业务台账。",
    },
  },
  {
    prefixes: ["/customers/new"],
    meta: {
      title: "新增客户",
      subtitle: "创建客户档案并沉淀联系人与商机信息。",
    },
  },
  {
    prefixes: ["/customers/"],
    meta: {
      title: "客户详情",
      subtitle: "围绕跟进、方案、报价和提醒推进客户决策。",
    },
  },
  {
    prefixes: ["/customers"],
    meta: {
      title: "客户管理",
      subtitle: "统一筛选客户状态、行业、负责人和推进动作。",
      showPageInfo: false,
    },
  },
  {
    prefixes: ["/notifications"],
    meta: {
      title: "通知中心",
      subtitle: "集中查看提醒、留言与系统消息历史。",
    },
  },
  {
    prefixes: ["/schedule/shifts"],
    meta: {
      title: "班表管理",
      subtitle: "维护部门班表、活动备注和预约信息，并导出 JPG 班表图。",
      showPageInfo: false,
    },
  },
  {
    prefixes: ["/schedule"],
    meta: {
      title: "日程管理",
      subtitle: "安排今天、本周和月历视角下的重点事项。",
      showPageInfo: false,
    },
  },
  {
    prefixes: ["/settings/finance-accounts"],
    meta: {
      title: "财务账户配置",
      subtitle: "维护主体公司、收款账户、开户行和适用场景。",
    },
  },
  {
    prefixes: ["/settings"],
    meta: {
      title: "系统设置",
      subtitle: "管理环境信息、偏好和系统配置状态。",
    },
  },
  {
    prefixes: ["/dashboard"],
    meta: {
      title: "首页",
      subtitle: "今天做什么、跟谁做、先做什么，一屏看清。",
    },
  },
];

export function resolvePageMeta(
  pathname: string,
  brandKey: SiteBrandKey = "public",
): PageMeta {
  if (/^\/inspections\/[^/]+\/edit$/.test(pathname)) {
    return {
      title: "编辑检测单",
      subtitle: "维护检测头信息、样本项目、付款和补充进度说明。",
    };
  }

  if (brandKey === "management" && pathname.startsWith("/management/approvals")) {
    return {
      title: "未启用模块",
      subtitle: "大爱归心站点当前不使用客户、报价审批规则。",
      showPageInfo: false,
    };
  }

  if (brandKey === "management" && pathname.startsWith("/schedule")) {
    if (pathname.startsWith("/schedule/shifts")) {
      return {
        title: "班表管理",
        subtitle: "维护部门班表、活动备注和预约信息，并导出 JPG 班表图。",
        showPageInfo: false,
      };
    }

    return {
      title: "协同日程",
      subtitle: "查看周报、月目标、提醒与内部协作时间轴。",
      showPageInfo: false,
    };
  }

  return (
    pageMetaMap.find((item) =>
      item.prefixes.some((prefix) => pathname.startsWith(prefix)),
    )?.meta ?? {
      title: "工作台",
      subtitle: "围绕业务判断、推进和协作展开当前页面内容。",
    }
  );
}
