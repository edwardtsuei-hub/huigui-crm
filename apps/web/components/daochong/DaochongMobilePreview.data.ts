export type PageKey =
  | "home"
  | "appointment"
  | "settlement"
  | "serviceNote"
  | "performance"
  | "customers"
  | "customerDetail"
  | "approval"
  | "profile"
  | "settings"
  | "members"
  | "projects"
  | "compensation"
  | "bonus"
  | "finance";

export type HomeView = "today" | "roster" | "events";

export type StatusTone = "green" | "amber" | "rose" | "blue" | "neutral";

export type FlowItem = {
  key: PageKey;
  label: string;
  note: string;
};

export type FlowGroup = {
  title: string;
  items: FlowItem[];
};

export type PageMeta = {
  chip: string;
  title: string;
  subtitle: string;
};

export type StatItem = {
  label: string;
  value: string;
  note: string;
};

export type TimelineItem = [title: string, note: string];

export type MoneyRow = [label: string, note: string, value: string];

export type MenuItem = [label: string, note: string, page: PageKey];

export type FieldItem = {
  label: string;
  value: string;
  large?: boolean;
};

export type HomeAppointment = {
  time: string;
  title: string;
  note: string;
  action: string;
  tone: StatusTone;
  target: PageKey;
};

export type HomeEvent = {
  title: string;
  note: string;
  action?: string;
  target?: PageKey;
};

export type CustomerRow = {
  avatar: string;
  name: string;
  note: string;
  status: string;
  tone: StatusTone;
};

export type ReviewRow = {
  name: string;
  note: string;
  value: string;
};

export type AdminRowItem = {
  name: string;
  note: string;
  status: string;
};

export type ToggleItem = {
  label: string;
  checked: boolean;
};

export type EvidenceItem = {
  title: string;
  note: string;
  status: string;
  tone: StatusTone;
};

export type ChecklistItem = {
  label: string;
  note: string;
  status: string;
  tone: StatusTone;
};

export type RecordSection = {
  title: string;
  items: TimelineItem[];
};

export type PermissionGroup = {
  title: string;
  items: ToggleItem[];
};

export type StateScenario = {
  title: string;
  note: string;
  status: string;
  tone: StatusTone;
};

export type EmptyStateItem = {
  title: string;
  note: string;
  action: string;
};

export const flowGroups: FlowGroup[] = [
  {
    title: "日常工作",
    items: [
      { key: "home", label: "首页", note: "预约、班表、活动" },
      { key: "appointment", label: "预约详情", note: "服务闭环" },
      { key: "settlement", label: "服务结算", note: "截图、优惠、推荐人" },
      { key: "serviceNote", label: "补填纪要", note: "12 小时企微提醒" },
    ],
  },
  {
    title: "客户与业绩",
    items: [
      { key: "customers", label: "客户", note: "到店、跟进、余额" },
      { key: "customerDetail", label: "客户档案", note: "服务记录、偏好" },
      { key: "performance", label: "我的业绩", note: "私密薪资预估" },
    ],
  },
  {
    title: "程程管理",
    items: [
      { key: "approval", label: "耗卡审批", note: "凭证二次检查" },
      { key: "settings", label: "管理设置", note: "配置中心" },
      { key: "members", label: "成员权限", note: "管理员由程程添加" },
      { key: "projects", label: "项目设置", note: "价格、时长、规则" },
      { key: "compensation", label: "提点奖金", note: "底薪、提点、福利" },
      { key: "bonus", label: "团队奖金", note: "加号创建" },
      { key: "finance", label: "财务汇总", note: "汇总给财务" },
    ],
  },
];

export const pageMeta: Record<PageKey, PageMeta> = {
  home: { chip: "今日工作台", title: "首页", subtitle: "预约、周班表、活动和待补纪要" },
  appointment: { chip: "关键详情", title: "预约详情", subtitle: "从到店到结算形成闭环" },
  settlement: { chip: "确认完成", title: "服务结算", subtitle: "无卡客户必须上传截图" },
  serviceNote: { chip: "企业微信提醒", title: "补填服务纪要", subtitle: "12 小时后自动追回" },
  performance: { chip: "仅本人可见", title: "我的业绩", subtitle: "目标、提成和工资预估" },
  customers: { chip: "客户工作台", title: "客户", subtitle: "今日到店、待跟进、余额预警" },
  customerDetail: { chip: "客户个人页", title: "客户档案", subtitle: "基本资料、服务记录和爱好" },
  approval: { chip: "程程/管理员", title: "耗卡审批", subtitle: "所有耗卡进入审批口径" },
  profile: { chip: "个人中心", title: "我的", subtitle: "个人事项和管理入口" },
  settings: { chip: "程程可见", title: "管理设置", subtitle: "统一管理配置入口" },
  members: { chip: "程程管理", title: "成员与权限", subtitle: "道冲管理员由程程添加" },
  projects: { chip: "管理设置", title: "项目设置", subtitle: "服务项目、价格、时间" },
  compensation: { chip: "管理设置", title: "提点奖金", subtitle: "底薪、提点、奖金福利" },
  bonus: { chip: "程程 + 号", title: "添加团队奖金", subtitle: "原因和金额汇总给财务" },
  finance: { chip: "给财务", title: "财务汇总", subtitle: "已审批数据进入工资口径" },
};

export const homeStats: StatItem[] = [
  { label: "今日预约", value: "8", note: "3 位待到店" },
  { label: "待耗卡", value: "7", note: "需审批" },
  { label: "待补纪要", value: "2", note: "12 小时内" },
];

export const homeAppointments: HomeAppointment[] = [
  { time: "10:30", title: "林女士 · 头疗深度调理", note: "慧心 · 2 号房 · 待到店", action: "确认", tone: "green", target: "appointment" },
  { time: "13:00", title: "周先生 · 经络放松", note: "觉心 · 服务中 · 待结算", action: "结算", tone: "green", target: "settlement" },
  { time: "16:20", title: "许女士 · 香疗肩颈", note: "燕子 · 无卡客户 · 需截图", action: "处理", tone: "amber", target: "appointment" },
];

export const homeRosterItems = [
  "周一 慧心早班",
  "周二 觉心晚班",
  "周三 程程在店",
  "周四 燕子晚班",
  "周五 子青早班",
  "周六 活动加班",
];

export const homeEvents: HomeEvent[] = [
  { title: "周六五感体验课", note: "已预约 36/120，需确认物料和老师排班。", action: "查看待办", target: "serviceNote" },
  { title: "光的家园白皮书协作", note: "道冲需补 2 条客户案例和服务说明。" },
];

export const homeStateScenarios: StateScenario[] = [
  { title: "纪要即将超时", note: "许女士服务结束 10 小时，还剩 2 小时触发企业微信提醒", status: "待补", tone: "amber" },
  { title: "无卡客户缺截图", note: "16:20 香疗肩颈未上传扣款截图，暂不可确认服务", status: "拦截", tone: "rose" },
  { title: "周四下午空档", note: "班表有 2 个可预约时段，可用于临时加号或回访", status: "可排", tone: "blue" },
];

export const appointmentTimeline: TimelineItem[] = [
  ["已确认到店", "前台 12:54 确认，客户已进入 1 号房。"],
  ["服务中", "预计 14:20 结束，结束后补服务纪要。"],
  ["待结算", "无卡客户需上传扣款截图后确认。"],
];

export const appointmentStateScenarios: StateScenario[] = [
  { title: "服务完成", note: "点击确认完成后进入服务结算，并弹出纪要填写入口", status: "下一步", tone: "green" },
  { title: "客户改约", note: "保留原预约记录，重新选择老师、房间和服务时间", status: "可改", tone: "blue" },
  { title: "客户未到", note: "标记未到后不计入老师业绩，保留回访提醒", status: "异常", tone: "amber" },
];

export const settlementFields: FieldItem[] = [
  { label: "服务项目", value: "头疗深度调理 · 90 分钟 · 680 元" },
  { label: "结算方式", value: "有卡直接耗卡；无卡上传收款截图" },
  { label: "优惠折扣与原因", value: "9 折 · 老客复购活动" },
  { label: "推荐人和奖金（非必填）", value: "王女士 · 推荐奖金 50" },
];

export const settlementChecklist: ChecklistItem[] = [
  { label: "客户卡项", note: "系统识别可耗卡，余额大于本次服务金额", status: "可耗卡", tone: "green" },
  { label: "无充值截图", note: "若切换为无卡客户，此项会变为必填", status: "已提示", tone: "amber" },
  { label: "优惠原因", note: "折扣、原因和推荐人奖金已进入审批口径", status: "完整", tone: "green" },
];

export const settlementEvidence: EvidenceItem[] = [
  { title: "微信扣款截图", note: "06/22 13:42 上传，程程和财务可打开原图", status: "已上传", tone: "green" },
  { title: "卡项耗卡记录", note: "本次消耗 680，审批通过后扣减余额", status: "待审批", tone: "amber" },
];

export const settlementStateScenarios: StateScenario[] = [
  { title: "有卡客户", note: "可先提交耗卡审批，审批通过后自动扣减卡项余额", status: "待审批", tone: "amber" },
  { title: "无充值客户", note: "必须上传扣款截图，否则确认按钮保持不可提交状态", status: "缺截图", tone: "rose" },
  { title: "审批通过", note: "服务记录、老师业绩、财务汇总同步更新", status: "已完成", tone: "green" },
  { title: "退回补充", note: "老师收到退回原因，补传截图或补写优惠原因后再提交", status: "可重提", tone: "blue" },
];

export const serviceNoteFields: FieldItem[] = [
  { label: "本次服务感受", value: "客户肩颈紧张明显缓解，头部放松后反馈睡眠会更容易。", large: true },
  { label: "下次建议", value: "建议 7 天内复诊一次，继续观察睡眠和肩颈状态。", large: true },
  { label: "爱好/偏好补充", value: "喜欢安静房间，香味不要太浓" },
];

export const serviceNoteStates: ChecklistItem[] = [
  { label: "服务完成后弹窗", note: "老师确认服务完成后，立即出现本次纪要入口", status: "已触发", tone: "green" },
  { label: "稍后补填", note: "老师忙碌时可跳过，首页会保留待补事项", status: "可补填", tone: "amber" },
  { label: "12 小时提醒", note: "超时后企业微信发送卡片，点击直达本页", status: "未超时", tone: "neutral" },
];

export const serviceNoteStateScenarios: StateScenario[] = [
  { title: "当下填写", note: "纪要直接进入客户档案，个人爱好同步为客户偏好记录", status: "已保存", tone: "green" },
  { title: "稍后补填", note: "首页和我的待处理同时出现待补纪要，老师可随时进入", status: "待补", tone: "amber" },
  { title: "12 小时超时", note: "企业微信推送卡片，点击后打开同一个补填页面", status: "提醒", tone: "rose" },
];

export const customersStats: StatItem[] = [
  { label: "今日到店", value: "8", note: "含 2 新客" },
  { label: "待回访", value: "13", note: "近 7 天" },
  { label: "待续卡", value: "5", note: "余额预警" },
];

export const customerRows: CustomerRow[] = [
  { avatar: "林", name: "林女士", note: "头疗深度调理 · 剩余 6 次", status: "活跃", tone: "green" },
  { avatar: "周", name: "周先生", note: "经络放松 · 余额 680", status: "预警", tone: "amber" },
  { avatar: "许", name: "许女士", note: "香疗肩颈 · 无卡客户", status: "新客", tone: "green" },
];

export const customerSummaryStats = [
  ["剩余次数", "6 次"],
  ["卡项余额", "¥4,200"],
  ["最近耗卡", "¥680"],
  ["下次预约", "06/27"],
] as const;

export const customerTimeline: TimelineItem[] = [
  ["06/21 头疗深度调理", "纪要已填：睡眠改善，肩颈放松。"],
  ["06/14 香疗肩颈", "已完成回访，客户喜欢上午档。"],
  ["个人爱好记录", "安静房间；香味接受度低；力度中等。"],
];

export const customerRecordSections: RecordSection[] = [
  {
    title: "服务记录",
    items: [
      ["06/21 头疗深度调理", "慧心填写：睡眠改善，肩颈放松，下次建议 7 天内复诊。"],
      ["06/14 香疗肩颈", "燕子填写：喜欢上午时段，力度中等偏轻。"],
    ],
  },
  {
    title: "个人爱好",
    items: [
      ["房间偏好", "安静房间；香味接受度低；背景音乐音量偏小。"],
      ["沟通偏好", "希望服务结束后给一条简短居家建议。"],
    ],
  },
  {
    title: "卡项与回访",
    items: [
      ["卡项余额", "剩余 6 次，余额 ¥4,200，下次预约 06/27。"],
      ["回访计划", "06/24 企微回访睡眠情况，06/27 到店前提醒。"],
    ],
  },
];

export const customerEmptyState: EmptyStateItem = {
  title: "筛选后没有客户",
  note: "真实页面会保留筛选条件，并提供添加客户或清空筛选入口。",
  action: "清空筛选",
};

export const performanceStats: StatItem[] = [
  { label: "可计提", value: "39.8k", note: "已复核" },
  { label: "待确认", value: "3.4k", note: "2 笔耗卡" },
  { label: "预计实发", value: "8.6k", note: "非最终工资" },
];

export const performanceRows: MoneyRow[] = [
  ["固定工资", "按本月出勤预估", "5,000"],
  ["服务提成", "按已确认耗卡计算", "2,180"],
  ["项目分润", "活动、课程或专项合作", "1,600"],
  ["个人扣款", "迟到、请假或其他扣项", "-180"],
];

export const approvalStats: StatItem[] = [
  { label: "待审批", value: "7", note: "今日新增 3" },
  { label: "待退回", value: "2", note: "缺截图" },
  { label: "已通过", value: "31", note: "本月" },
];

export const approvalRows: ReviewRow[] = [
  { name: "林女士 · 头疗深度调理", note: "慧心提交 · 有截图 · 9 折原因已填", value: "680" },
  { name: "周先生 · 经络放松", note: "觉心提交 · 推荐奖金 50", value: "520" },
];

export const approvalEvidence: EvidenceItem[] = [
  { title: "原图浏览", note: "点开可二次检查微信、收款码和金额", status: "可查看", tone: "green" },
  { title: "异常截图", note: "金额不清、时间不符或缺客户备注时退回", status: "需复核", tone: "amber" },
  { title: "财务归档", note: "审批通过后进入当月财务汇总附件", status: "待入账", tone: "neutral" },
];

export const approvalReturnReasons: ChecklistItem[] = [
  { label: "截图金额不清", note: "请老师重新上传原图，财务可保留旧图作为历史", status: "常用", tone: "amber" },
  { label: "优惠原因缺失", note: "退回后必须补折扣和原因，再提交审批", status: "必填", tone: "rose" },
  { label: "推荐奖金待确认", note: "有推荐人但金额未写清时，由程程确认后通过", status: "待核", tone: "neutral" },
];

export const approvalStateScenarios: StateScenario[] = [
  { title: "待审批", note: "老师提交后，程程和授权管理员可看到原图和结算字段", status: "队列中", tone: "amber" },
  { title: "已通过", note: "进入客户服务记录、老师业绩、财务汇总和卡项扣减", status: "入账", tone: "green" },
  { title: "已退回", note: "保留退回原因和旧截图，老师补充后形成第二次提交记录", status: "退回", tone: "rose" },
  { title: "财务复核", note: "财务可按月份二次浏览所有截图和审批链路", status: "可查", tone: "blue" },
];

export const profileStats: StatItem[] = [
  { label: "待处理", value: "6", note: "含 2 报销" },
  { label: "沟通", value: "4", note: "待我回应" },
  { label: "通知", value: "9", note: "本周" },
];

export const profileMenuItems: MenuItem[] = [
  ["项目沟通", "光的家园、道冲元气共同参与的协作记录", "serviceNote"],
  ["耗卡审批", "程程和管理员确认每一笔耗卡", "approval"],
  ["管理设置", "成员、项目、提点奖金、财务汇总", "settings"],
  ["工资条归档", "历史工资条与复核记录", "performance"],
];

export const settingsMenuItems: MenuItem[] = [
  ["成员与权限", "程程添加管理员，设置审批和财务可见范围", "members"],
  ["项目设置", "服务项目、价格、时间、是否计提", "projects"],
  ["提点奖金", "老师底薪、手工提点、推荐奖金", "compensation"],
  ["财务汇总", "汇总耗卡、提点、奖金和报销给财务", "finance"],
];

export const adminRows: AdminRowItem[] = [
  { name: "慧心", note: "可审批耗卡 · 可看项目设置 · 不看财务汇总", status: "启用" },
  { name: "燕子", note: "可处理预约 · 可退回结算 · 不可改提点", status: "受限" },
];

export const memberPermissionToggles: ToggleItem[] = [
  { label: "耗卡审批", checked: true },
  { label: "项目价格管理", checked: true },
  { label: "提点奖金设置", checked: false },
  { label: "财务汇总查看", checked: false },
];

export const memberPermissionGroups: PermissionGroup[] = [
  {
    title: "审批权限",
    items: [
      { label: "查看扣款截图", checked: true },
      { label: "通过耗卡审批", checked: true },
      { label: "退回补充资料", checked: true },
    ],
  },
  {
    title: "配置权限",
    items: [
      { label: "编辑服务项目", checked: true },
      { label: "编辑老师底薪", checked: false },
      { label: "编辑奖金规则", checked: false },
    ],
  },
  {
    title: "财务权限",
    items: [
      { label: "查看财务汇总", checked: false },
      { label: "导出工资口径", checked: false },
      { label: "查看报销附件", checked: true },
    ],
  },
];

export const memberStateScenarios: StateScenario[] = [
  { title: "新增管理员", note: "只有程程可添加道冲管理员，并设置审批、配置、财务权限", status: "程程", tone: "green" },
  { title: "停用成员", note: "停用后不可审批新单，但历史审批记录仍保留姓名和时间", status: "保留", tone: "amber" },
  { title: "权限变更", note: "权限变更会记录操作者、时间和变更前后内容", status: "留痕", tone: "blue" },
];

export const projectRows: MoneyRow[] = [
  ["头疗深度调理", "90 分钟 · 可耗卡 · 计入提成", "680"],
  ["经络放松", "60 分钟 · 可优惠 · 需截图", "520"],
  ["五感疗愈", "120 分钟 · 高客单 · 程程复核", "980"],
];

export const projectFields: FieldItem[] = [
  { label: "项目名称", value: "头疗深度调理" },
  { label: "价格 / 时长", value: "680 元 · 90 分钟" },
  { label: "规则", value: "可耗卡 · 可优惠 · 计入老师提点" },
];

export const projectStateScenarios: StateScenario[] = [
  { title: "启用中", note: "可被预约、结算、耗卡和计入老师业绩", status: "启用", tone: "green" },
  { title: "改价待生效", note: "新价格从指定日期开始，历史服务按原价格保留", status: "待生效", tone: "amber" },
  { title: "暂停预约", note: "前台不可新增预约，但历史客户档案仍可查看", status: "暂停", tone: "neutral" },
];

export const compensationRows: MoneyRow[] = [
  ["慧心", "底薪 5,000 · 手工提点 8%", "编辑"],
  ["觉心", "底薪 4,800 · 手工提点 7%", "编辑"],
  ["燕子", "底薪待填 · 固定提点 40/单", "待补"],
];

export const compensationFields: FieldItem[] = [
  { label: "老师底薪", value: "5,000" },
  { label: "手工提点", value: "8% · 适用全部常规项目" },
];

export const compensationToggles: ToggleItem[] = [
  { label: "推荐奖金可录入", checked: true },
  { label: "团队奖金计入工资", checked: true },
  { label: "福利补贴需财务复核", checked: true },
];

export const compensationStateScenarios: StateScenario[] = [
  { title: "底薪待填", note: "老师底薪为空时，工资预估显示待补，不影响服务提成记录", status: "待补", tone: "amber" },
  { title: "规则已保存", note: "提点、推荐奖金和福利规则保存后进入下次工资计算", status: "已保存", tone: "green" },
  { title: "财务复核", note: "涉及福利补贴和团队奖金时，财务确认后才进入最终实发", status: "复核", tone: "blue" },
];

export const bonusFields: FieldItem[] = [
  { label: "奖金对象", value: "道冲元气全体老师" },
  { label: "奖金月份", value: "2026-06" },
  { label: "奖金金额", value: "1,200" },
  { label: "原因", value: "白皮书资料补充和客户案例整理，团队在截止时间前完成。", large: true },
];

export const financeStats: StatItem[] = [
  { label: "已审耗卡", value: "58.6k", note: "42 笔" },
  { label: "提点奖金", value: "7.8k", note: "待财务入账" },
  { label: "报销福利", value: "2.1k", note: "3 单" },
];

export const financeRows: MoneyRow[] = [
  ["服务耗卡", "全部通过程程/管理员审批", "58,600"],
  ["老师手工提点", "按提点奖金规则计算", "6,420"],
  ["推荐奖金", "来自服务结算的推荐人字段", "1,350"],
  ["团队奖金", "程程 + 号添加，含原因", "1,200"],
];

export const financeStateScenarios: StateScenario[] = [
  { title: "待汇总", note: "审批已通过但尚未进入财务月结表", status: "待汇总", tone: "amber" },
  { title: "已汇总", note: "本月耗卡、奖金、报销和福利已形成工资口径", status: "已汇总", tone: "green" },
  { title: "凭证缺失", note: "缺截图或附件的记录会停在异常列表，不进入最终确认", status: "异常", tone: "rose" },
];

export const createActions: Array<[label: string, note: string, page: PageKey]> = [
  ["添加预约", "新客、复诊、临时加号", "appointment"],
  ["记录耗卡", "服务结束后补业绩凭证", "settlement"],
  ["发起项目沟通", "光的家园和道冲一起协作", "serviceNote"],
  ["报销申请", "差旅、物料、活动支出", "finance"],
  ["添加团队奖金", "程程填写原因、金额", "bonus"],
  ["客户跟进", "回访、提醒、下次预约", "customerDetail"],
];
