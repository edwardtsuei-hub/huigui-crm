"use client";

export type WorkspaceIconKey =
  | "home"
  | "calendar"
  | "customers"
  | "products"
  | "solutions"
  | "quotations"
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
    key: "schedule",
    href: "/schedule",
    icon: "calendar",
    label: "日程",
    caption: "提醒、计划与执行节奏",
    permissionCode: "menu.schedule",
    matchPrefixes: ["/schedule", "/notifications"],
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
    caption: "产品资产、模板与规则",
    permissionCode: "menu.products",
    matchPrefixes: ["/products"],
  },
  {
    key: "solutions",
    href: "/solutions",
    icon: "solutions",
    label: "方案",
    caption: "农业方案与方案工作台",
    permissionCode: "menu.solutions",
    matchPrefixes: ["/solutions", "/agriculture"],
    children: [
      {
        href: "/solutions",
        label: "方案工作台",
        permissionCode: "menu.solutions",
        matchPrefixes: ["/solutions"],
      },
      {
        href: "/solutions/agriculture/new",
        label: "农业方案",
        permissionCode: "action.solution.create",
        matchPrefixes: ["/agriculture", "/solutions/agriculture"],
      },
    ],
  },
  {
    key: "quotes",
    href: "/quotations",
    icon: "quotations",
    label: "报价",
    caption: "通用报价、报价记录与审批",
    permissionCode: "menu.quotations",
    matchPrefixes: ["/quotations", "/quotes/general"],
    children: [
      {
        href: "/quotes/general",
        label: "通用报价",
        permissionCode: "action.quotation.create",
        matchPrefixes: ["/quotes/general", "/solutions/industry"],
      },
      {
        href: "/quotations",
        label: "报价记录",
        permissionCode: "menu.quotations",
        matchPrefixes: ["/quotations"],
      },
    ],
  },
  {
    key: "files",
    href: "/files",
    icon: "files",
    label: "档案",
    caption: "正式资料与导出归档",
    permissionCode: "menu.files",
    matchPrefixes: ["/files"],
  },
  {
    key: "management",
    href: "/management",
    icon: "management",
    label: "管理中心",
    caption: "成员、权限、审批与审计",
    permissionCode: "menu.management",
    matchPrefixes: ["/management"],
    children: [
      {
        href: "/management/members",
        label: "成员管理",
        permissionCode: "page.management.members",
        matchPrefixes: ["/management/members"],
      },
      {
        href: "/management/roles",
        label: "角色权限",
        permissionCode: "page.management.roles",
        matchPrefixes: ["/management/roles"],
      },
      {
        href: "/management/approvals",
        label: "审批规则",
        permissionCode: "page.management.approvals",
        matchPrefixes: ["/management/approvals"],
      },
      {
        href: "/management/logs",
        label: "操作日志",
        permissionCode: "page.management.logs",
        matchPrefixes: ["/management/logs"],
      },
    ],
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
    href: "/schedule",
    label: "日程管理",
    description: "计划、提醒与协同节奏",
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
    href: "/products/new",
    label: "新增产品",
    description: "录入产品资料与模板信息",
    permissionCode: "action.product.create",
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
    href: "/quotes/general",
    label: "通用报价",
    description: "创建通用报价和明细行",
    permissionCode: "action.quotation.create",
  },
  {
    href: "/quotations",
    label: "报价记录",
    description: "查看审批、导出与历史报价",
    permissionCode: "menu.quotations",
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
        key: "schedule",
        label: "新增日程",
        description: "安排拜访、回访或内部协作时间",
        icon: "calendar",
        composeKind: "schedule",
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

const pageMetaMap: Array<{ prefixes: string[]; meta: PageMeta }> = [
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
      subtitle: "总览成员、审批、审计与系统级风险事项。",
    },
  },
  {
    prefixes: ["/files"],
    meta: {
      title: "档案中心",
      subtitle: "查看正式资料、导出结果与归档状态。",
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
    },
  },
  {
    prefixes: ["/agriculture", "/solutions/agriculture/new"],
    meta: {
      title: "农业方案",
      subtitle: "围绕作物、周期和桶数输出农业方案。",
    },
  },
  {
    prefixes: ["/solutions"],
    meta: {
      title: "方案工作台",
      subtitle: "在农业方案和报价工作区之间快速切换。",
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
    },
  },
  {
    prefixes: ["/notifications"],
    meta: {
      title: "通知中心",
      subtitle: "集中查看提醒、审批与系统消息历史。",
    },
  },
  {
    prefixes: ["/schedule"],
    meta: {
      title: "日程管理",
      subtitle: "安排今天、本周和月历视角下的重点事项。",
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

export function resolvePageMeta(pathname: string): PageMeta {
  return (
    pageMetaMap.find((item) =>
      item.prefixes.some((prefix) => pathname.startsWith(prefix)),
    )?.meta ?? {
      title: "工作台",
      subtitle: "围绕业务判断、推进和协作展开当前页面内容。",
    }
  );
}
