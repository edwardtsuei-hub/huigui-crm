import { ApprovalRuleType, DataScope } from "@prisma/client";

export type PermissionDefinition = {
  code: string;
  name: string;
  module: string;
  category: "MENU" | "PAGE" | "ACTION";
  description?: string;
  sortOrder: number;
};

export type SystemRoleDefinition = {
  code: string;
  name: string;
  description: string;
  defaultDataScope: DataScope;
  sortOrder: number;
  isSystem: boolean;
};

export const SYSTEM_ROLE_DEFINITIONS: SystemRoleDefinition[] = [
  {
    code: "SUPER_ADMIN",
    name: "超级管理员",
    description: "系统最高权限与安全控制",
    defaultDataScope: DataScope.ALL,
    sortOrder: 10,
    isSystem: true
  },
  {
    code: "ADMIN",
    name: "管理员",
    description: "负责成员、审批与业务配置管理",
    defaultDataScope: DataScope.ALL,
    sortOrder: 20,
    isSystem: true
  },
  {
    code: "SALES_MANAGER",
    name: "销售主管",
    description: "查看团队客户、报价与审批事项",
    defaultDataScope: DataScope.TEAM,
    sortOrder: 30,
    isSystem: true
  },
  {
    code: "SALES",
    name: "销售",
    description: "负责本人客户与本人参与报价",
    defaultDataScope: DataScope.OWNED,
    sortOrder: 40,
    isSystem: true
  },
  {
    code: "PRODUCT_SPECIALIST",
    name: "产品 / 方案专员",
    description: "维护产品资料、模板与方案资产",
    defaultDataScope: DataScope.PARTICIPATED,
    sortOrder: 50,
    isSystem: true
  },
  {
    code: "FINANCE",
    name: "财务 / 行政",
    description: "关注报价金额、导出记录与回款信息",
    defaultDataScope: DataScope.DEPARTMENT,
    sortOrder: 60,
    isSystem: true
  }
];

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  { code: "menu.dashboard", name: "首页", module: "dashboard", category: "MENU", sortOrder: 10 },
  { code: "menu.schedule", name: "日程", module: "schedule", category: "MENU", sortOrder: 20 },
  { code: "menu.customers", name: "客户", module: "customers", category: "MENU", sortOrder: 30 },
  { code: "menu.products", name: "产品", module: "products", category: "MENU", sortOrder: 40 },
  { code: "menu.solutions", name: "方案", module: "solutions", category: "MENU", sortOrder: 50 },
  { code: "menu.quotations", name: "报价", module: "quotations", category: "MENU", sortOrder: 60 },
  { code: "menu.files", name: "档案", module: "files", category: "MENU", sortOrder: 70 },
  { code: "menu.management", name: "管理中心", module: "management", category: "MENU", sortOrder: 80 },
  { code: "menu.settings", name: "设置", module: "settings", category: "MENU", sortOrder: 90 },

  { code: "page.dashboard.home", name: "首页工作台", module: "dashboard", category: "PAGE", sortOrder: 110 },
  { code: "page.schedule.center", name: "日程中心", module: "schedule", category: "PAGE", sortOrder: 120 },
  { code: "page.customers.list", name: "客户列表", module: "customers", category: "PAGE", sortOrder: 130 },
  { code: "page.customers.detail", name: "客户详情", module: "customers", category: "PAGE", sortOrder: 140 },
  { code: "page.customers.create", name: "新增客户页", module: "customers", category: "PAGE", sortOrder: 150 },
  { code: "page.customers.edit", name: "编辑客户页", module: "customers", category: "PAGE", sortOrder: 160 },
  { code: "page.customers.export", name: "客户导出页", module: "customers", category: "PAGE", sortOrder: 170 },
  { code: "page.products.list", name: "产品列表", module: "products", category: "PAGE", sortOrder: 180 },
  { code: "page.products.detail", name: "产品详情", module: "products", category: "PAGE", sortOrder: 190 },
  { code: "page.products.create", name: "新增产品页", module: "products", category: "PAGE", sortOrder: 200 },
  { code: "page.products.edit", name: "编辑产品页", module: "products", category: "PAGE", sortOrder: 210 },
  { code: "page.products.ai_import", name: "AI 解析导入", module: "products", category: "PAGE", sortOrder: 220 },
  { code: "page.solutions.workspace", name: "方案工作台", module: "solutions", category: "PAGE", sortOrder: 230 },
  { code: "page.quotations.list", name: "报价列表", module: "quotations", category: "PAGE", sortOrder: 240 },
  { code: "page.quotations.detail", name: "报价详情", module: "quotations", category: "PAGE", sortOrder: 250 },
  { code: "page.quotations.create", name: "创建报价页", module: "quotations", category: "PAGE", sortOrder: 260 },
  { code: "page.quotations.edit", name: "编辑报价页", module: "quotations", category: "PAGE", sortOrder: 270 },
  { code: "page.quotations.export", name: "导出报价页", module: "quotations", category: "PAGE", sortOrder: 280 },
  { code: "page.files.center", name: "档案中心", module: "files", category: "PAGE", sortOrder: 290 },
  { code: "page.management.members", name: "成员管理", module: "management", category: "PAGE", sortOrder: 300 },
  { code: "page.management.roles", name: "角色权限", module: "management", category: "PAGE", sortOrder: 310 },
  { code: "page.management.approvals", name: "审批规则", module: "management", category: "PAGE", sortOrder: 320 },
  { code: "page.management.logs", name: "操作日志", module: "management", category: "PAGE", sortOrder: 330 },
  { code: "page.settings.overview", name: "系统设置", module: "settings", category: "PAGE", sortOrder: 340 },

  { code: "action.customer.create", name: "新增客户", module: "customers", category: "ACTION", sortOrder: 410 },
  { code: "action.customer.update", name: "编辑客户", module: "customers", category: "ACTION", sortOrder: 420 },
  { code: "action.customer.delete", name: "删除客户", module: "customers", category: "ACTION", sortOrder: 430 },
  { code: "action.customer.transfer", name: "转移负责人", module: "customers", category: "ACTION", sortOrder: 440 },
  { code: "action.customer.export", name: "导出客户数据", module: "customers", category: "ACTION", sortOrder: 450 },
  { code: "action.customer.view_all", name: "查看全部客户", module: "customers", category: "ACTION", sortOrder: 460 },

  { code: "action.product.create", name: "新增产品", module: "products", category: "ACTION", sortOrder: 470 },
  { code: "action.product.update", name: "编辑产品", module: "products", category: "ACTION", sortOrder: 480 },
  { code: "action.product.delete", name: "删除产品", module: "products", category: "ACTION", sortOrder: 490 },
  { code: "action.product.change_price", name: "修改建议售价", module: "products", category: "ACTION", sortOrder: 500 },
  { code: "action.product.change_template", name: "修改模板", module: "products", category: "ACTION", sortOrder: 510 },
  { code: "action.product.toggle_status", name: "启用 / 停用产品", module: "products", category: "ACTION", sortOrder: 520 },

  { code: "action.solution.create", name: "新建方案", module: "solutions", category: "ACTION", sortOrder: 530 },
  { code: "action.solution.update", name: "编辑方案", module: "solutions", category: "ACTION", sortOrder: 540 },
  { code: "action.solution.delete", name: "删除方案", module: "solutions", category: "ACTION", sortOrder: 550 },
  { code: "action.solution.copy", name: "复制方案", module: "solutions", category: "ACTION", sortOrder: 560 },
  { code: "action.solution.generate_quotation", name: "生成正式报价", module: "solutions", category: "ACTION", sortOrder: 570 },

  { code: "action.quotation.create", name: "新建报价", module: "quotations", category: "ACTION", sortOrder: 580 },
  { code: "action.quotation.update", name: "编辑报价", module: "quotations", category: "ACTION", sortOrder: 590 },
  { code: "action.quotation.delete", name: "删除报价", module: "quotations", category: "ACTION", sortOrder: 600 },
  { code: "action.quotation.change_discount", name: "修改折扣", module: "quotations", category: "ACTION", sortOrder: 610 },
  { code: "action.quotation.submit_approval", name: "提交审批", module: "quotations", category: "ACTION", sortOrder: 620 },
  { code: "action.quotation.approve", name: "审批通过", module: "quotations", category: "ACTION", sortOrder: 630 },
  { code: "action.quotation.reject", name: "审批驳回", module: "quotations", category: "ACTION", sortOrder: 640 },
  { code: "action.quotation.export_pdf", name: "导出 PDF", module: "quotations", category: "ACTION", sortOrder: 650 },
  { code: "action.quotation.invalidate", name: "作废报价", module: "quotations", category: "ACTION", sortOrder: 660 },

  { code: "action.schedule.create", name: "新增提醒", module: "schedule", category: "ACTION", sortOrder: 670 },
  { code: "action.schedule.update", name: "编辑提醒", module: "schedule", category: "ACTION", sortOrder: 680 },
  { code: "action.schedule.delete", name: "删除提醒", module: "schedule", category: "ACTION", sortOrder: 690 },
  { code: "action.schedule.assign", name: "指派提醒", module: "schedule", category: "ACTION", sortOrder: 700 },
  { code: "action.schedule.view_team", name: "查看团队日程", module: "schedule", category: "ACTION", sortOrder: 710 },

  { code: "action.management.member.create", name: "新增成员", module: "management", category: "ACTION", sortOrder: 720 },
  { code: "action.management.member.update", name: "编辑成员", module: "management", category: "ACTION", sortOrder: 730 },
  { code: "action.management.member.reset_password", name: "重置密码", module: "management", category: "ACTION", sortOrder: 740 },
  { code: "action.management.member.toggle_status", name: "停用账号", module: "management", category: "ACTION", sortOrder: 750 },
  { code: "action.management.role.update", name: "修改角色权限", module: "management", category: "ACTION", sortOrder: 760 },
  { code: "action.management.rule.update", name: "修改审批规则", module: "management", category: "ACTION", sortOrder: 770 },
  { code: "action.management.log.view", name: "查看操作日志", module: "management", category: "ACTION", sortOrder: 780 },
  { code: "action.management.log.export", name: "导出操作日志", module: "management", category: "ACTION", sortOrder: 790 }
];

const ALL_PERMISSION_CODES = PERMISSION_DEFINITIONS.map((item) => item.code);

export const DEFAULT_ROLE_PERMISSION_CODES: Record<string, string[]> = {
  SUPER_ADMIN: ALL_PERMISSION_CODES,
  ADMIN: ALL_PERMISSION_CODES.filter((code) => code !== "action.management.log.export"),
  SALES_MANAGER: [
    "menu.dashboard",
    "menu.schedule",
    "menu.customers",
    "menu.solutions",
    "menu.quotations",
    "menu.files",
    "page.dashboard.home",
    "page.schedule.center",
    "page.customers.list",
    "page.customers.detail",
    "page.customers.create",
    "page.customers.edit",
    "page.quotations.list",
    "page.quotations.detail",
    "page.quotations.create",
    "page.quotations.export",
    "page.files.center",
    "action.customer.create",
    "action.customer.update",
    "action.customer.transfer",
    "action.solution.create",
    "action.solution.update",
    "action.solution.generate_quotation",
    "action.quotation.create",
    "action.quotation.update",
    "action.quotation.change_discount",
    "action.quotation.submit_approval",
    "action.quotation.approve",
    "action.quotation.reject",
    "action.quotation.export_pdf",
    "action.schedule.create",
    "action.schedule.update",
    "action.schedule.assign",
    "action.schedule.view_team"
  ],
  SALES: [
    "menu.dashboard",
    "menu.schedule",
    "menu.customers",
    "menu.solutions",
    "menu.quotations",
    "page.dashboard.home",
    "page.schedule.center",
    "page.customers.list",
    "page.customers.detail",
    "page.customers.create",
    "page.customers.edit",
    "page.quotations.list",
    "page.quotations.detail",
    "page.quotations.create",
    "action.customer.create",
    "action.customer.update",
    "action.solution.create",
    "action.solution.update",
    "action.solution.generate_quotation",
    "action.quotation.create",
    "action.quotation.update",
    "action.quotation.change_discount",
    "action.quotation.submit_approval",
    "action.schedule.create",
    "action.schedule.update"
  ],
  PRODUCT_SPECIALIST: [
    "menu.dashboard",
    "menu.products",
    "menu.solutions",
    "menu.files",
    "page.dashboard.home",
    "page.products.list",
    "page.products.detail",
    "page.products.create",
    "page.products.edit",
    "page.products.ai_import",
    "page.solutions.workspace",
    "page.files.center",
    "action.product.create",
    "action.product.update",
    "action.product.change_price",
    "action.product.change_template",
    "action.product.toggle_status",
    "action.solution.create",
    "action.solution.update",
    "action.solution.copy"
  ],
  FINANCE: [
    "menu.dashboard",
    "menu.quotations",
    "menu.files",
    "page.dashboard.home",
    "page.quotations.list",
    "page.quotations.detail",
    "page.quotations.export",
    "page.files.center",
    "action.quotation.export_pdf"
  ]
};

export const APPROVAL_RULE_TEMPLATES: Array<{
  code: ApprovalRuleType;
  name: string;
  description: string;
  sortOrder: number;
  configJson: Record<string, unknown>;
}> = [
  {
    code: ApprovalRuleType.DISCOUNT,
    name: "折扣审批",
    description: "控制超额优惠的审批层级",
    sortOrder: 10,
    configJson: {
      autoApproveMax: 5,
      managerApproveMax: 15,
      autoPassLabel: "0% - 5%",
      firstStepLabel: "5% - 15%",
      secondStepLabel: "15% 以上",
      firstApproverRoleCode: "SALES_MANAGER",
      secondApproverRoleCode: "ADMIN",
      passAction: "审批通过后允许继续生成正式报价"
    }
  },
  {
    code: ApprovalRuleType.LOW_PRICE,
    name: "低价保护",
    description: "控制低于建议售价或保护价的异常价格",
    sortOrder: 20,
    configJson: {
      mode: "below_suggested_price_ratio",
      belowSuggestedPriceRatio: 10,
      belowProtectionPrice: false,
      approverRoleCode: "ADMIN",
      allowOverride: false,
      note: "低于建议售价 10% 以上时需管理员审批"
    }
  },
  {
    code: ApprovalRuleType.EXPORT_QUOTATION,
    name: "正式报价导出审批",
    description: "控制正式报价导出 PDF 的审批门槛",
    sortOrder: 30,
    configJson: {
      enabledBeforeExport: true,
      scope: "discount_sensitive_only",
      approverRoleCode: "SALES_MANAGER",
      autoUnlockExport: true
    }
  },
  {
    code: ApprovalRuleType.CUSTOMER_TRANSFER,
    name: "客户转移审批",
    description: "控制客户负责人调整与归属追踪",
    sortOrder: 40,
    configJson: {
      enabled: true,
      requiresManagerApproval: true,
      notifyAfterTransfer: true,
      keepOwnershipHistory: true
    }
  }
];

export const DATA_SCOPE_LABELS: Record<DataScope, string> = {
  ALL: "全部数据",
  DEPARTMENT: "本部门数据",
  TEAM: "本团队数据",
  OWNED: "我负责的数据",
  PARTICIPATED: "我参与的数据"
};

export const MANAGEMENT_PAGE_PERMISSION_CODES = {
  members: "page.management.members",
  roles: "page.management.roles",
  approvals: "page.management.approvals",
  logs: "page.management.logs"
} as const;
