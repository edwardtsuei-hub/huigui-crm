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
  { code: "menu.work_management", name: "工作管理", module: "work_management", category: "MENU", sortOrder: 20 },
  { code: "menu.schedule", name: "日程", module: "schedule", category: "MENU", sortOrder: 30 },
  { code: "menu.customers", name: "客户", module: "customers", category: "MENU", sortOrder: 40 },
  { code: "menu.products", name: "产品", module: "products", category: "MENU", sortOrder: 50 },
  { code: "menu.inspections", name: "检测管理", module: "inspections", category: "MENU", sortOrder: 55 },
  { code: "menu.solutions", name: "方案", module: "solutions", category: "MENU", sortOrder: 60 },
  { code: "menu.quotations", name: "报价", module: "quotations", category: "MENU", sortOrder: 70 },
  { code: "menu.orders", name: "订单", module: "orders", category: "MENU", sortOrder: 75 },
  { code: "menu.finance", name: "财务", module: "finance", category: "MENU", sortOrder: 78 },
  { code: "menu.files", name: "档案", module: "files", category: "MENU", sortOrder: 80 },
  { code: "menu.management", name: "管理中心", module: "management", category: "MENU", sortOrder: 90 },
  { code: "menu.settings", name: "设置", module: "settings", category: "MENU", sortOrder: 100 },

  { code: "page.dashboard.home", name: "首页工作台", module: "dashboard", category: "PAGE", sortOrder: 110 },
  { code: "page.work_management.overview", name: "工作管理总览", module: "work_management", category: "PAGE", sortOrder: 115 },
  { code: "page.work_management.weekly_reports", name: "周报管理", module: "work_management", category: "PAGE", sortOrder: 116 },
  { code: "page.work_management.monthly_goals", name: "月目标管理", module: "work_management", category: "PAGE", sortOrder: 117 },
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
  { code: "page.inspections.list", name: "检测列表", module: "inspections", category: "PAGE", sortOrder: 225 },
  { code: "page.inspections.detail", name: "检测详情", module: "inspections", category: "PAGE", sortOrder: 226 },
  { code: "page.inspections.create", name: "新建检测页", module: "inspections", category: "PAGE", sortOrder: 227 },
  { code: "page.inspections.edit", name: "编辑检测页", module: "inspections", category: "PAGE", sortOrder: 228 },
  { code: "page.solutions.workspace", name: "方案工作台", module: "solutions", category: "PAGE", sortOrder: 230 },
  { code: "page.quotations.list", name: "报价列表", module: "quotations", category: "PAGE", sortOrder: 240 },
  { code: "page.quotations.detail", name: "报价详情", module: "quotations", category: "PAGE", sortOrder: 250 },
  { code: "page.quotations.create", name: "创建报价页", module: "quotations", category: "PAGE", sortOrder: 260 },
  { code: "page.quotations.edit", name: "编辑报价页", module: "quotations", category: "PAGE", sortOrder: 270 },
  { code: "page.quotations.export", name: "导出报价页", module: "quotations", category: "PAGE", sortOrder: 280 },
  { code: "page.orders.list", name: "订单列表", module: "orders", category: "PAGE", sortOrder: 282 },
  { code: "page.orders.detail", name: "订单详情", module: "orders", category: "PAGE", sortOrder: 284 },
  { code: "page.orders.payments", name: "收款记录", module: "orders", category: "PAGE", sortOrder: 286 },
  { code: "page.orders.shipments", name: "发货记录", module: "orders", category: "PAGE", sortOrder: 288 },
  { code: "page.orders.channel_settlements", name: "渠道结算", module: "orders", category: "PAGE", sortOrder: 289 },
  { code: "page.finance.payroll", name: "薪资上传与发送", module: "finance", category: "PAGE", sortOrder: 291 },
  { code: "page.files.center", name: "档案中心", module: "files", category: "PAGE", sortOrder: 290 },
  { code: "page.management.members", name: "成员管理", module: "management", category: "PAGE", sortOrder: 300 },
  { code: "page.management.roles", name: "角色权限", module: "management", category: "PAGE", sortOrder: 310 },
  { code: "page.management.approvals", name: "审批规则", module: "management", category: "PAGE", sortOrder: 320 },
  { code: "page.management.logs", name: "操作日志", module: "management", category: "PAGE", sortOrder: 330 },
  { code: "page.settings.overview", name: "系统设置", module: "settings", category: "PAGE", sortOrder: 340 },
  { code: "page.settings.finance_accounts", name: "财务账户配置", module: "settings", category: "PAGE", sortOrder: 345 },

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
  { code: "action.inspection.create", name: "新建检测", module: "inspections", category: "ACTION", sortOrder: 525 },
  { code: "action.inspection.update", name: "编辑检测", module: "inspections", category: "ACTION", sortOrder: 526 },
  { code: "action.inspection.upload_report", name: "上传检测报告", module: "inspections", category: "ACTION", sortOrder: 527 },
  { code: "action.inspection.record_payment", name: "登记检测付款", module: "inspections", category: "ACTION", sortOrder: 528 },
  { code: "action.inspection.archive", name: "归档检测单", module: "inspections", category: "ACTION", sortOrder: 529 },

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

  { code: "action.order.create", name: "新建订单", module: "orders", category: "ACTION", sortOrder: 661 },
  { code: "action.order.update", name: "编辑订单", module: "orders", category: "ACTION", sortOrder: 662 },
  { code: "action.order.confirm", name: "确认订单", module: "orders", category: "ACTION", sortOrder: 663 },
  { code: "action.order.cancel", name: "取消订单", module: "orders", category: "ACTION", sortOrder: 664 },
  { code: "action.order.record_payment", name: "登记收款", module: "orders", category: "ACTION", sortOrder: 665 },
  { code: "action.order.create_shipment", name: "创建发货", module: "orders", category: "ACTION", sortOrder: 666 },
  { code: "action.order.attach_file", name: "关联订单档案", module: "orders", category: "ACTION", sortOrder: 667 },
  { code: "action.order.settle_channel", name: "处理渠道结算", module: "orders", category: "ACTION", sortOrder: 668 },
  { code: "action.finance_account.update", name: "维护财务账户", module: "settings", category: "ACTION", sortOrder: 669 },
  { code: "action.payroll.publish", name: "发布薪资条", module: "finance", category: "ACTION", sortOrder: 670 },

  { code: "action.work_management.create", name: "新建工作管理内容", module: "work_management", category: "ACTION", sortOrder: 670 },
  { code: "action.work_management.update", name: "编辑工作管理内容", module: "work_management", category: "ACTION", sortOrder: 671 },
  { code: "action.work_management.submit", name: "提交周报与目标", module: "work_management", category: "ACTION", sortOrder: 672 },
  { code: "action.work_management.review", name: "主管审阅周报", module: "work_management", category: "ACTION", sortOrder: 673 },
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
    "menu.work_management",
    "menu.schedule",
    "menu.customers",
    "menu.inspections",
    "menu.solutions",
    "menu.quotations",
    "menu.orders",
    "menu.files",
    "page.dashboard.home",
    "page.work_management.overview",
    "page.work_management.weekly_reports",
    "page.work_management.monthly_goals",
    "page.schedule.center",
    "page.customers.list",
    "page.customers.detail",
    "page.customers.create",
    "page.customers.edit",
    "page.inspections.list",
    "page.inspections.detail",
    "page.inspections.create",
    "page.inspections.edit",
    "page.solutions.workspace",
    "page.quotations.list",
    "page.quotations.detail",
    "page.quotations.create",
    "page.quotations.export",
    "page.orders.list",
    "page.orders.detail",
    "page.orders.payments",
    "page.orders.shipments",
    "page.orders.channel_settlements",
    "page.files.center",
    "action.customer.create",
    "action.customer.update",
    "action.customer.transfer",
    "action.inspection.create",
    "action.inspection.update",
    "action.inspection.upload_report",
    "action.inspection.record_payment",
    "action.inspection.archive",
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
    "action.order.create",
    "action.order.update",
    "action.order.confirm",
    "action.order.cancel",
    "action.order.record_payment",
    "action.order.create_shipment",
    "action.order.attach_file",
    "action.order.settle_channel",
    "action.work_management.create",
    "action.work_management.update",
    "action.work_management.submit",
    "action.work_management.review",
    "action.schedule.create",
    "action.schedule.update",
    "action.schedule.assign",
    "action.schedule.view_team"
  ],
  SALES: [
    "menu.dashboard",
    "menu.work_management",
    "menu.schedule",
    "menu.customers",
    "menu.inspections",
    "menu.solutions",
    "menu.quotations",
    "menu.orders",
    "page.dashboard.home",
    "page.work_management.overview",
    "page.work_management.weekly_reports",
    "page.work_management.monthly_goals",
    "page.schedule.center",
    "page.customers.list",
    "page.customers.detail",
    "page.customers.create",
    "page.customers.edit",
    "page.inspections.list",
    "page.inspections.detail",
    "page.inspections.create",
    "page.inspections.edit",
    "page.solutions.workspace",
    "page.quotations.list",
    "page.quotations.detail",
    "page.quotations.create",
    "page.orders.list",
    "page.orders.detail",
    "page.orders.payments",
    "page.orders.shipments",
    "action.customer.create",
    "action.customer.update",
    "action.inspection.create",
    "action.inspection.update",
    "action.inspection.upload_report",
    "action.solution.create",
    "action.solution.update",
    "action.solution.generate_quotation",
    "action.quotation.create",
    "action.quotation.update",
    "action.quotation.change_discount",
    "action.quotation.submit_approval",
    "action.order.create",
    "action.order.update",
    "action.order.confirm",
    "action.order.attach_file",
    "action.order.create_shipment",
    "action.work_management.create",
    "action.work_management.update",
    "action.work_management.submit",
    "action.schedule.create",
    "action.schedule.update"
  ],
  PRODUCT_SPECIALIST: [
    "menu.dashboard",
    "menu.work_management",
    "menu.products",
    "menu.inspections",
    "menu.solutions",
    "menu.files",
    "page.dashboard.home",
    "page.work_management.overview",
    "page.work_management.weekly_reports",
    "page.work_management.monthly_goals",
    "page.products.list",
    "page.products.detail",
    "page.products.create",
    "page.products.edit",
    "page.products.ai_import",
    "page.inspections.list",
    "page.inspections.detail",
    "page.inspections.create",
    "page.inspections.edit",
    "page.solutions.workspace",
    "page.files.center",
    "action.product.create",
    "action.product.update",
    "action.product.change_price",
    "action.product.change_template",
    "action.product.toggle_status",
    "action.inspection.create",
    "action.inspection.update",
    "action.inspection.upload_report",
    "action.inspection.archive",
    "action.work_management.create",
    "action.work_management.update",
    "action.work_management.submit",
    "action.solution.create",
    "action.quotation.create",
    "action.solution.update",
    "action.solution.copy"
  ],
  FINANCE: [
    "menu.dashboard",
    "menu.work_management",
    "menu.inspections",
    "menu.solutions",
    "menu.quotations",
    "menu.orders",
    "menu.finance",
    "menu.files",
    "page.dashboard.home",
    "page.work_management.overview",
    "page.work_management.weekly_reports",
    "page.work_management.monthly_goals",
    "page.inspections.list",
    "page.inspections.detail",
    "page.solutions.workspace",
    "page.quotations.list",
    "page.quotations.detail",
    "page.quotations.export",
    "page.orders.list",
    "page.orders.detail",
    "page.orders.payments",
    "page.orders.shipments",
    "page.orders.channel_settlements",
    "page.finance.payroll",
    "page.files.center",
    "page.settings.finance_accounts",
    "action.work_management.create",
    "action.work_management.update",
    "action.work_management.submit",
    "action.solution.create",
    "action.quotation.create",
    "action.inspection.record_payment",
    "action.quotation.export_pdf",
    "action.order.record_payment",
    "action.order.settle_channel",
    "action.finance_account.update",
    "action.payroll.publish"
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
      approverRoleCode: "SALES_MANAGER",
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
