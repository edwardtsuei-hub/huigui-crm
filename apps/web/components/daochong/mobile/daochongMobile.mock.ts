import type {
  DaochongAppointment,
  DaochongCustomer,
  DaochongFormField,
  DaochongMoneyRow,
  DaochongPageKey,
  DaochongPageMeta,
  DaochongPermissionGroup,
  DaochongStat,
  DaochongStatusItem,
  DaochongTimelineItem,
} from "./daochongMobile.types";

export const pageMeta: Record<DaochongPageKey, DaochongPageMeta> = {
  home: { chip: "灰度 mock", title: "首页", subtitle: "日程、预约、班表和待办" },
  performance: { chip: "本人视角", title: "我的业绩", subtitle: "本月目标、耗卡和工资预估" },
  customers: { chip: "客户工作台", title: "客户", subtitle: "客户资料、服务记录和偏好" },
  customerDetail: { chip: "客户档案", title: "客户详情", subtitle: "资料、服务记录和个人爱好" },
  profile: { chip: "个人中心", title: "我的", subtitle: "待处理事项和管理入口" },
  appointment: { chip: "预约处理", title: "预约详情", subtitle: "到店、改约、确认完成" },
  settlement: { chip: "提交审批", title: "服务结算", subtitle: "截图、优惠、推荐人和耗卡" },
  recharge: { chip: "资金入口", title: "客户充值", subtitle: "截图、现金照片、程程审批和立猛复核" },
  evidence: { chip: "凭证详情", title: "凭证详情", subtitle: "原图、缩略图、权限和复核记录" },
  serviceNote: { chip: "服务记录", title: "补填纪要", subtitle: "12 小时企业微信提醒" },
  approval: { chip: "程程/管理员", title: "耗卡审批", subtitle: "截图复核、通过或退回" },
  settings: { chip: "管理", title: "管理设置", subtitle: "项目、成员、提点和财务" },
  members: { chip: "程程", title: "成员与权限", subtitle: "添加和管理道冲管理员" },
  projects: { chip: "配置", title: "项目设置", subtitle: "价格、时长和服务规则" },
  compensation: { chip: "薪酬规则", title: "提点奖金", subtitle: "底薪、提点、福利和奖金" },
  finance: { chip: "财务", title: "财务汇总", subtitle: "已审耗卡、奖金、报销和凭证" },
  communication: { chip: "协作", title: "项目沟通", subtitle: "光的家园和道冲共同参与" },
  expense: { chip: "财务", title: "报销申请", subtitle: "附件、金额和原因" },
  bonus: { chip: "程程 + 号", title: "团队奖金", subtitle: "对象、金额、原因和财务汇总" },
  acceptance: { chip: "一期验收", title: "灰度验收", subtitle: "页面、角色、创建入口和只读接口" },
  apiPlan: { chip: "只读接入", title: "接口接入顺序", subtitle: "低风险先接，高风险继续隔离" },
};

export const homeStats: DaochongStat[] = [
  { label: "今日预约", value: "8", note: "3 位待到店" },
  { label: "待审批", value: "7", note: "耗卡队列" },
  { label: "待补纪要", value: "2", note: "12 小时内" },
];

export const homeStatuses: DaochongStatusItem[] = [
  { title: "纪要即将超时", note: "许女士服务结束 10 小时，还剩 2 小时触发提醒", status: "待补", tone: "amber" },
  { title: "无卡客户缺截图", note: "香疗肩颈未上传扣款截图，暂不可确认服务", status: "拦截", tone: "rose" },
  { title: "充值待复核", note: "林女士现金充值 3,000 元，程程审批后给到立猛确认", status: "充值", tone: "blue" },
  { title: "周四下午空档", note: "班表有 2 个可预约时段，可临时加号", status: "可排", tone: "blue" },
];

export const todayRosterStatuses: DaochongStatusItem[] = [
  { title: "慧心", note: "10:00-18:00 · 2 号房，午间已留 30 分钟整理", status: "在岗", tone: "green" },
  { title: "燕子", note: "13:00-21:00 · 晚间活动支持", status: "晚班", tone: "blue" },
  { title: "觉心", note: "请假半天，上午不可预约", status: "半天", tone: "amber" },
];

export const weekRosterStatuses: DaochongStatusItem[] = [
  { title: "周二", note: "头疗体验活动，预留 4 个新客名额", status: "活动", tone: "blue" },
  { title: "周四", note: "下午有 2 个可预约时段", status: "可排", tone: "green" },
  { title: "周六", note: "香疗肩颈加开，需提前确认老师", status: "待排", tone: "amber" },
];

export const activityStatuses: DaochongStatusItem[] = [
  { title: "光的家园联动", note: "项目沟通页同步活动客户和待跟进事项", status: "协作", tone: "blue" },
  { title: "新客体验", note: "本周 6 位新客，3 位待补服务纪要", status: "跟进", tone: "amber" },
  { title: "老客回访", note: "储值卡低于 2 次的客户进入提醒列表", status: "提醒", tone: "green" },
];

export const appointments: DaochongAppointment[] = [
  { time: "10:30", title: "林女士 · 头疗深度调理", note: "慧心 · 2 号房 · 待到店", action: "确认", tone: "green", page: "appointment" },
  { time: "13:00", title: "周先生 · 经络放松", note: "觉心 · 服务中 · 待结算", action: "结算", tone: "green", page: "settlement" },
  { time: "16:20", title: "许女士 · 香疗肩颈", note: "燕子 · 无卡客户 · 需截图", action: "处理", tone: "amber", page: "settlement" },
];

export const appointmentDetailFields: DaochongFormField[] = [
  { label: "预约客户", value: "林女士", helper: "点击客户名可进入客户详情。" },
  { label: "服务项目", value: "头疗深度调理 · 90 分钟", helper: "来自项目设置。" },
  { label: "老师与房间", value: "慧心 · 2 号房", helper: "受当天班表和房间占用约束。" },
  { label: "服务状态", value: "待到店", helper: "完成服务后进入结算和纪要填写。" },
];

export const appointmentDetailStatuses: DaochongStatusItem[] = [
  { title: "确认完成", note: "服务完成后先进入结算，再弹出服务纪要", status: "流程", tone: "green" },
  { title: "改约冲突", note: "改约时检查老师班表、房间和活动占用", status: "检查", tone: "blue" },
];

export const performanceStats: DaochongStat[] = [
  { label: "可计提", value: "39.8k", note: "已复核" },
  { label: "待确认", value: "3.4k", note: "2 笔耗卡" },
  { label: "预计实发", value: "8.6k", note: "非最终工资" },
];

export const performanceRows: DaochongMoneyRow[] = [
  { label: "固定工资", note: "按本月出勤预估", value: "5,000" },
  { label: "服务提成", note: "按已确认耗卡计算", value: "2,180" },
  { label: "团队奖金", note: "程程 + 号添加，财务确认", value: "1,200" },
];

export const customers: DaochongCustomer[] = [
  { avatar: "林", name: "林女士", note: "头疗深度调理 · 剩余 6 次", status: "活跃", tone: "green" },
  { avatar: "周", name: "周先生", note: "经络放松 · 余额 680", status: "预警", tone: "amber" },
  { avatar: "许", name: "许女士", note: "香疗肩颈 · 无卡客户", status: "新客", tone: "blue" },
];

export const customerProfileFields: DaochongFormField[] = [
  { label: "客户姓名", value: "许女士", helper: "客户详情页保留基础资料。" },
  { label: "客户类型", value: "无卡新客", helper: "结算时会触发扣款截图必传规则。" },
  { label: "常用项目", value: "香疗肩颈、头疗深度调理", helper: "用于老师服务前快速判断偏好。" },
  { label: "最近预约", value: "2026-06-22 16:20 · 香疗肩颈", helper: "从预约和服务记录自动同步。" },
];

export const customerServiceHistory: DaochongTimelineItem[] = [
  { title: "现金充值", note: "提交 3,000 元，现金照片已传，等待程程审批", meta: "今天 17:10", tone: "blue" },
  { title: "香疗肩颈", note: "燕子服务，等待扣款截图和服务纪要", meta: "今天 16:20", tone: "amber" },
  { title: "头疗体验", note: "反馈睡眠改善，建议 7 天后复调", meta: "06-15", tone: "green" },
  { title: "首次咨询", note: "偏好安静房间，灯光不要太亮", meta: "06-08", tone: "blue" },
];

export const customerPreferenceRows: DaochongMoneyRow[] = [
  { label: "环境偏好", note: "安静房间，灯光偏暗", value: "已记录" },
  { label: "力度偏好", note: "中等力度，颈侧需提前沟通", value: "服务前看" },
  { label: "香气偏好", note: "接受木质调，不喜欢过甜香气", value: "可用" },
];

export const approvalStatuses: DaochongStatusItem[] = [
  { title: "待审批", note: "慧心提交 · 9 折原因已填 · 有截图", status: "680 元", tone: "amber" },
  { title: "已退回", note: "截图金额不清，老师需补传原图", status: "退回", tone: "rose" },
  { title: "财务复核", note: "已通过的截图进入当月财务汇总附件", status: "可查", tone: "blue" },
];

export const approvalDetailFields: DaochongFormField[] = [
  { label: "审批编号", value: "APP-DC-20260623-026", helper: "所有耗卡审批都有独立编号和留痕。" },
  { label: "关联结算草稿", value: "SET-DRAFT-20260623-012", helper: "审批详情从结算草稿带入客户、项目、凭证和金额。" },
  { label: "客户与项目", value: "许女士 · 香疗肩颈", helper: "审批通过后写入客户服务记录。" },
  { label: "提交老师", value: "燕子 · 今天 17:18", helper: "老师提交后进入程程或授权管理员待办。" },
  { label: "卡项状态", value: "客户无卡 · 走扣款凭证", helper: "有卡客户会显示卡项余额和本次耗卡次数。" },
  { label: "关联凭证", value: "EV-DC-20260623-018 · 扣款截图已关联", helper: "可进入凭证详情二次浏览原图。" },
  { label: "审批状态", value: "待程程审批", helper: "本阶段只展示审批详情，不触发真实审批。" },
];

export const approvalRows: DaochongMoneyRow[] = [
  { label: "项目原价", note: "香疗肩颈标准价", value: "398" },
  { label: "客户实付", note: "扣款截图需一致", value: "358.2" },
  { label: "本次耗卡", note: "无卡客户，不扣减卡项", value: "0" },
  { label: "推荐奖金", note: "林女士推荐，待审批", value: "80" },
];

export const approvalDecisionFields: DaochongFormField[] = [
  { label: "审批动作", value: "通过 / 退回", helper: "正式开发时会做按钮，本页只展示字段和状态。" },
  { label: "退回原因", value: "截图金额不清，需要补传原图", helper: "退回时必填，老师补充后可二次提交。" },
  { label: "补充要求", value: "补扣款原图、核对实付金额、确认优惠原因", helper: "退回卡片会带着这些要求回到服务结算草稿。" },
  { label: "通知对象", value: "提交老师燕子 · 程程可见", helper: "后续企业微信 dry-run 会按这个对象生成提醒。" },
];

export const approvalTimeline: DaochongTimelineItem[] = [
  { title: "老师提交", note: "结算草稿校验通过，提交给程程或授权管理员", meta: "提交", tone: "blue" },
  { title: "程程审批", note: "核对金额、优惠原因、推荐奖金和扣款凭证", meta: "审批", tone: "amber" },
  { title: "退回补充", note: "凭证不清、金额不一致或原因缺失时退回老师", meta: "退回", tone: "rose" },
  { title: "通过入账", note: "通过后进入业绩、客户服务记录和财务汇总草稿", meta: "通过", tone: "green" },
];

export const settlementFields: DaochongFormField[] = [
  { label: "客户", value: "许女士", helper: "无卡客户，必须上传扣款截图后才能确认服务。" },
  { label: "服务项目", value: "香疗肩颈 · 398 元", helper: "项目价格来自项目设置。" },
  { label: "扣款方式", value: "无充值客户 · 微信扣款", helper: "有卡客户这里会显示耗卡次数和卡余额。" },
  { label: "扣款截图", value: "待上传原图", helper: "上传后程程和财务可二次浏览检查。" },
  { label: "优惠折扣", value: "9 折", helper: "若有优惠，必须填写折扣和原因。" },
  { label: "优惠原因", value: "活动体验名额", helper: "审批和财务复核都会看到。" },
  { label: "推荐人", value: "林女士", helper: "非必填，可为空。" },
  { label: "推荐奖金金额", value: "80 元", helper: "非必填，最终进入财务汇总。" },
];

export const settlementStatuses: DaochongStatusItem[] = [
  { title: "无卡客户", note: "没有充值或会员卡时，扣款截图是确认服务的前置条件", status: "必传", tone: "rose" },
  { title: "有卡客户", note: "直接耗卡，所有耗卡都进入程程和管理员审批", status: "审批", tone: "amber" },
  { title: "截图复查", note: "已上传原图在程程、管理员、财务视角可二次浏览", status: "可查", tone: "blue" },
  { title: "草稿保存", note: "字段未齐时只能保存草稿，不能提交审批", status: "草稿", tone: "neutral" },
  { title: "提交审批", note: "金额、优惠原因、推荐奖金和凭证校验通过后进入审批", status: "提交", tone: "green" },
];

export const settlementDraftFields: DaochongFormField[] = [
  { label: "草稿编号", value: "SET-DRAFT-20260623-012", helper: "服务完成后自动生成，提交审批前可继续补充。" },
  { label: "关联预约", value: "许女士 · 2026-06-22 16:20 · 香疗肩颈", helper: "预约、客户、老师、项目保持一致。" },
  { label: "客户卡项", value: "无卡客户", helper: "无卡或未充值客户必须上传扣款截图。" },
  { label: "结算方式", value: "微信扣款", helper: "有卡客户可选耗卡，无卡客户必须走扣款凭证。" },
  { label: "扣款凭证", value: "EV-DC-20260623-018 · 已关联", helper: "关联统一凭证详情，程程和财务可二次浏览原图。" },
  { label: "优惠校验", value: "9 折 · 原因已填", helper: "有折扣或优惠金额时，原因必须填写。" },
  { label: "推荐人奖金", value: "林女士 · 80 元", helper: "推荐人非必填；一旦有奖金金额，进入财务汇总和审批链路。" },
  { label: "草稿状态", value: "可提交审批", helper: "当前 mock 显示全部必填项已满足。" },
];

export const settlementDraftRows: DaochongMoneyRow[] = [
  { label: "项目原价", note: "香疗肩颈标准价", value: "398" },
  { label: "优惠金额", note: "9 折活动体验名额", value: "-39.8" },
  { label: "客户实付", note: "需和扣款截图一致", value: "358.2" },
  { label: "推荐奖金", note: "林女士推荐，待程程审批", value: "80" },
];

export const settlementSubmissionTimeline: DaochongTimelineItem[] = [
  { title: "保存草稿", note: "服务结束后先保存草稿，缺截图或缺原因时不能提交", meta: "草稿", tone: "neutral" },
  { title: "提交审批", note: "校验通过后提交给程程或授权管理员", meta: "提交", tone: "blue" },
  { title: "审批通过", note: "通过后写入客户服务记录、老师业绩和财务汇总草稿", meta: "通过", tone: "green" },
  { title: "退回补充", note: "凭证不清、优惠原因缺失或金额不一致时退回", meta: "退回", tone: "rose" },
];

export const rechargeFields: DaochongFormField[] = [
  { label: "客户", value: "林女士", helper: "可从客户档案进入，也可从 + 创建选择客户。" },
  { label: "充值金额", value: "3,000 元", helper: "充值确认后才进入客户卡项余额。" },
  { label: "充值方式", value: "现金", helper: "微信、支付宝、转账、现金都需要上传凭证。" },
  { label: "充值截图", value: "待上传收款截图", helper: "所有充值都必须上传截图，供程程和立猛复核。" },
  { label: "现金照片", value: "待拍摄现金照片", helper: "选择现金时必填，需要拍下现金实物。" },
  { label: "现金数字", value: "3,000", helper: "现金方式必须填写实际收到的现金数字。" },
  { label: "现金保管人", value: "程程", helper: "默认程程，可留痕记录现金交接责任人。" },
  { label: "提交备注", value: "客户现场现金充值，待程程审批后交立猛复核。", helper: "用于退回或财务复核时查看。" },
];

export const rechargeRows: DaochongMoneyRow[] = [
  { label: "林女士现金充值", note: "3,000 元 · 现金照片待程程确认", value: "待审批" },
  { label: "周先生微信充值", note: "1,980 元 · 收款截图已上传", value: "待立猛" },
  { label: "许女士转账充值", note: "5,000 元 · 已入账客户余额", value: "已确认" },
];

export const rechargeStatuses: DaochongStatusItem[] = [
  { title: "凭证必传", note: "任何充值方式都必须上传收款截图或转账截图", status: "必传", tone: "rose" },
  { title: "现金必拍", note: "现金充值还要拍现金实物，填写现金数字和现金保管人", status: "现金", tone: "amber" },
  { title: "程程审批", note: "程程先核对截图、现金照片和金额，退回必须写原因", status: "一审", tone: "blue" },
  { title: "立猛复核", note: "程程通过后给到立猛，立猛确认后才更新客户余额和财务口径", status: "复核", tone: "green" },
];

export const evidenceFields: DaochongFormField[] = [
  { label: "凭证编号", value: "EV-DC-20260623-018", helper: "所有截图、现金照片、报销附件共用同一凭证编号规则。" },
  { label: "关联业务", value: "客户充值 · 林女士现金 3,000 元", helper: "可关联充值、服务结算、耗卡审批或报销。" },
  { label: "凭证类型", value: "现金照片 + 收款截图", helper: "现金充值同时需要现金实物照片和收款截图。" },
  { label: "上传人", value: "燕子 · 今天 17:10", helper: "上传人和上传时间不可手动改。" },
  { label: "可见角色", value: "提交人、程程、授权管理员、财务/立猛", helper: "客户隐私和资金凭证按角色隔离。" },
  { label: "当前状态", value: "程程待审批 · 立猛待复核", helper: "未复核前不进入客户余额和最终财务口径。" },
];

export const evidenceRows: DaochongMoneyRow[] = [
  { label: "充值截图", note: "微信/转账/现金收款截图，所有充值必传", value: "必传" },
  { label: "现金照片", note: "现金充值拍现金实物，关联现金数字和保管人", value: "现金" },
  { label: "扣款截图", note: "无卡客户服务结算时上传，程程和财务可二次浏览", value: "结算" },
  { label: "报销附件", note: "发票、付款截图、活动物料凭证，进入财务汇总", value: "报销" },
];

export const evidenceTimeline: DaochongTimelineItem[] = [
  { title: "提交人上传", note: "上传缩略图和原图，系统记录业务来源和上传时间", meta: "上传", tone: "blue" },
  { title: "程程一审", note: "核对金额、截图、现金照片和现金保管人", meta: "一审", tone: "amber" },
  { title: "立猛/财务复核", note: "确认资金和凭证一致后进入客户余额或财务汇总", meta: "复核", tone: "green" },
  { title: "退回补传", note: "金额不清、现金照片缺失或原图模糊时退回补充", meta: "退回", tone: "rose" },
];

export const evidenceStatuses: DaochongStatusItem[] = [
  { title: "原图浏览", note: "程程、授权管理员、财务/立猛可打开原图二次检查", status: "可查", tone: "green" },
  { title: "权限隔离", note: "老师只看自己提交和相关客户服务凭证，财务看入账口径", status: "分权", tone: "blue" },
  { title: "审批锁定", note: "审批通过后凭证只读，补传需走退回和重提", status: "锁定", tone: "amber" },
  { title: "异常停留", note: "缺原图、金额不清、现金照片缺失时不进入最终确认", status: "异常", tone: "rose" },
];

export const serviceNoteContextFields: DaochongFormField[] = [
  { label: "关联服务", value: "许女士 · 香疗肩颈 · 燕子", helper: "从服务结算草稿带入客户、项目和老师。" },
  { label: "关联草稿", value: "SET-DRAFT-20260623-012", helper: "结算审批和服务纪要保持同一业务链路。" },
  { label: "待补原因", value: "老师选择稍后填写，距离 12 小时提醒还剩 2 小时", helper: "首页和我的待办都会显示。" },
  { label: "客户偏好快照", value: "安静房间、灯光偏暗、中等力度", helper: "老师补填前可快速看到历史偏好。" },
  { label: "补填入口", value: "首页待办 / 我的待办 / 企业微信卡片", helper: "三个入口进入同一补填页面。" },
];

export const serviceNoteFields: DaochongFormField[] = [
  { label: "本次服务纪要", value: "肩颈紧张明显，左侧斜方肌更紧，建议下次加强放松。", helper: "服务确认后弹出填写，可当场完成。" },
  { label: "客户反馈", value: "香气接受度高，力度偏好中等。", helper: "后续老师服务前可快速查看。" },
  { label: "下次建议", value: "建议 7 天后复调，优先预约下午时段。", helper: "可转为回访提醒。" },
  { label: "个人爱好补充", value: "喜欢安静房间，不喜欢太亮灯光。", helper: "同步到客户个人爱好记录。" },
];

export const serviceNotePendingRows: DaochongMoneyRow[] = [
  { label: "许女士香疗肩颈", note: "已结束 10 小时，剩余 2 小时触发 dry-run 提醒", value: "待补" },
  { label: "林女士头疗体验", note: "已结束 3 小时，老师可从首页直接补填", value: "可补" },
  { label: "周先生经络放松", note: "纪要已填，偏好已同步到客户档案", value: "已完成" },
];

export const serviceNoteReminderFields: DaochongFormField[] = [
  { label: "dry-run 编号", value: "WECOM-DRY-20260623-009", helper: "只生成测试记录，不发送真实企业微信。" },
  { label: "提醒对象", value: "燕子", helper: "默认提醒本次服务老师。" },
  { label: "卡片标题", value: "许女士服务纪要待补填", helper: "企业微信卡片预览标题。" },
  { label: "卡片摘要", value: "服务已结束 12 小时，请补充本次服务纪要和客户偏好。", helper: "正式发送前先看 dry-run 文案。" },
  { label: "点击进入", value: "补填纪要 · serviceNote", helper: "点击卡片直接进入同一补填页。" },
  { label: "计划触发", value: "服务结束后 12 小时", helper: "已填写则不生成提醒。" },
  { label: "发送状态", value: "dry-run 未发送", helper: "本阶段不调用真实企业微信发送接口。" },
];

export const serviceNoteStatuses: DaochongStatusItem[] = [
  { title: "服务后弹出", note: "老师点确认服务后，立即弹出纪要填写页", status: "当场", tone: "green" },
  { title: "允许补填", note: "老师当下没时间可稍后从首页或企业微信卡片进入", status: "补填", tone: "blue" },
  { title: "12 小时提醒", note: "超过 12 小时未填，企业微信通知并直达补填页", status: "提醒", tone: "amber" },
];

export const serviceNoteReminderTimeline: DaochongTimelineItem[] = [
  { title: "确认服务完成", note: "结算草稿生成后立即弹出服务纪要填写页", meta: "完成", tone: "green" },
  { title: "选择稍后补填", note: "老师可暂存离开，首页和我的待办保留入口", meta: "补填", tone: "blue" },
  { title: "12 小时检查", note: "系统检查纪要状态，未填写时生成企业微信 dry-run 卡片", meta: "检查", tone: "amber" },
  { title: "点击卡片进入", note: "卡片跳回补填纪要页，提交后同步客户服务记录和偏好", meta: "回填", tone: "green" },
];

export const serviceNoteDryRunStatuses: DaochongStatusItem[] = [
  { title: "只生成预览", note: "展示接收人、卡片标题、摘要、跳转页面和计划触发时间", status: "dry-run", tone: "blue" },
  { title: "不真实发送", note: "本阶段不调用企业微信发送接口，也不写入真实通知状态", status: "未发送", tone: "neutral" },
  { title: "已填即停止", note: "老师在 12 小时内补填后，不再生成提醒卡片", status: "停止", tone: "green" },
];

export const financeRows: DaochongMoneyRow[] = [
  { label: "已确认充值", note: "立猛复核后进入客户余额和财务口径", value: "36.8k" },
  { label: "已审耗卡", note: "42 笔，全部经审批", value: "58.6k" },
  { label: "提点奖金", note: "待财务入账", value: "7.8k" },
  { label: "报销福利", note: "3 单，有附件", value: "2.1k" },
];

export const financeDraftFields: DaochongFormField[] = [
  { label: "汇总月份", value: "2026-06", helper: "按月生成财务汇总草稿。" },
  { label: "草稿编号", value: "FIN-DRAFT-202606-001", helper: "本阶段只展示草稿，不生成最终工资。" },
  { label: "数据截止", value: "2026-06-23 18:00", helper: "正式开发时由财务选择或系统生成。" },
  { label: "进入口径", value: "已审批耗卡、已复核充值、已确认奖金、已收齐报销附件", helper: "未审批或缺凭证的记录留在异常区。" },
  { label: "确认状态", value: "待财务确认", helper: "确认前不进入最终工资。" },
];

export const financeExceptionRows: DaochongMoneyRow[] = [
  { label: "扣款截图金额不清", note: "许女士香疗肩颈 · 需老师补传原图", value: "退回" },
  { label: "现金照片缺失", note: "林女士现金充值 3,000 元 · 待提交人补拍", value: "异常" },
  { label: "报销附件缺发票", note: "活动物料 680 元 · 财务不能确认", value: "待补" },
];

export const financeBonusExpenseRows: DaochongMoneyRow[] = [
  { label: "团队奖金", note: "程程添加 2 笔，原因和金额已填", value: "1,200" },
  { label: "推荐奖金", note: "结算审批带入 4 笔，待财务确认", value: "320" },
  { label: "报销申请", note: "3 单已收附件，1 单凭证异常", value: "2,100" },
  { label: "福利补贴", note: "节日福利待财务确认", value: "600" },
];

export const financeStatuses: DaochongStatusItem[] = [
  { title: "充值入账", note: "客户充值需程程审批，再由立猛复核后进入余额", status: "双审", tone: "blue" },
  { title: "凭证异常", note: "缺截图、缺发票或原图不清的记录停在异常列表", status: "异常", tone: "rose" },
  { title: "草稿汇总", note: "已审批耗卡、奖金和报销先进入月度草稿", status: "草稿", tone: "amber" },
  { title: "最终确认", note: "财务确认后才形成工资口径，本阶段不执行", status: "未执行", tone: "neutral" },
];

export const financeTimeline: DaochongTimelineItem[] = [
  { title: "业务通过", note: "耗卡、充值、奖金和报销分别完成审批或复核", meta: "来源", tone: "blue" },
  { title: "草稿归集", note: "按月份汇总到财务草稿，异常凭证先排除", meta: "草稿", tone: "amber" },
  { title: "异常补齐", note: "退回提交人补截图、补发票或补原因", meta: "补齐", tone: "rose" },
  { title: "财务确认", note: "确认后进入工资口径和归档，本阶段只展示边界", meta: "确认", tone: "green" },
];

export const expenseFields: DaochongFormField[] = [
  { label: "报销事项", value: "活动物料采购", helper: "从 + 创建进入，选择报销类型。" },
  { label: "报销金额", value: "680 元", helper: "金额进入财务汇总草稿前需财务确认。" },
  { label: "报销原因", value: "周二新客体验活动物料", helper: "报销必须写清楚原因。" },
  { label: "报销附件", value: "付款截图已传 · 发票待补", helper: "缺附件会停在财务异常队列。" },
  { label: "提交人", value: "燕子", helper: "提交人可看到退回补充要求。" },
];

export const expenseRows: DaochongMoneyRow[] = [
  { label: "活动物料", note: "付款截图已传，发票待补", value: "680" },
  { label: "课程茶歇", note: "截图和发票齐全，待财务确认", value: "420" },
  { label: "外出交通", note: "缺行程说明，退回补充", value: "96" },
];

export const expenseStatuses: DaochongStatusItem[] = [
  { title: "附件必传", note: "报销申请必须上传付款凭证或发票", status: "必传", tone: "rose" },
  { title: "原因必填", note: "报销原因会进入财务月度草稿", status: "必填", tone: "amber" },
  { title: "财务确认", note: "附件齐全后才进入最终工资口径", status: "确认", tone: "green" },
];

export const teamBonusFields: DaochongFormField[] = [
  { label: "奖金对象", value: "燕子", helper: "可选个人或团队，本阶段展示个人奖金。" },
  { label: "奖金月份", value: "2026-06", helper: "按月份进入财务汇总草稿。" },
  { label: "奖金金额", value: "600 元", helper: "金额必须由程程填写。" },
  { label: "奖金原因", value: "新客体验活动协助和客户跟进完成度高", helper: "团队奖金必须写明原因。" },
  { label: "财务状态", value: "待财务确认", helper: "确认后才进入最终工资口径。" },
];

export const teamBonusRows: DaochongMoneyRow[] = [
  { label: "燕子活动奖金", note: "新客体验活动协助，程程已添加", value: "600" },
  { label: "慧心带教奖金", note: "新老师带教支持，待财务确认", value: "600" },
  { label: "团队共同奖金", note: "六月活动达成，分配方案待补", value: "待补" },
];

export const teamBonusStatuses: DaochongStatusItem[] = [
  { title: "程程添加", note: "团队奖金由程程从 + 号创建", status: "程程", tone: "green" },
  { title: "原因必填", note: "没有原因不能进入财务汇总", status: "必填", tone: "amber" },
  { title: "财务归集", note: "奖金最终进入月度财务草稿", status: "归集", tone: "blue" },
];

export const communicationFields: DaochongFormField[] = [
  { label: "沟通主题", value: "头疗体验活动复盘和后续客户跟进", helper: "从 + 创建进入，可关联活动或客户。" },
  { label: "参与项目", value: "光的家园、道冲元气", helper: "支持两个项目共同参与。" },
  { label: "参与人", value: "程程、慧心、燕子、光的家园小组", helper: "正式开发时按权限选择成员。" },
  { label: "关联客户", value: "林女士、许女士（对外协作脱敏）", helper: "客户资料按角色权限脱敏展示。" },
  { label: "当前状态", value: "纪要待确认", helper: "纪要确认后进入归档和待办分发。" },
];

export const communicationRows: DaochongMoneyRow[] = [
  { label: "新客体验活动", note: "光的家园提供活动客户，道冲负责服务跟进", value: "协作中" },
  { label: "老客复调计划", note: "道冲老师补服务纪要后，光的家园同步回访", value: "待纪要" },
  { label: "六月活动复盘", note: "会议纪要已生成，待程程确认归档", value: "待确认" },
];

export const communicationStatuses: DaochongStatusItem[] = [
  { title: "跨项目参与", note: "光的家园和道冲元气都可以加入同一沟通", status: "协作", tone: "blue" },
  { title: "客户脱敏", note: "非授权成员只看客户标签和跟进事项，不看完整资料", status: "脱敏", tone: "amber" },
  { title: "纪要归档", note: "确认后的会议纪要进入客户档案和项目沟通记录", status: "归档", tone: "green" },
];

export const communicationTimeline: DaochongTimelineItem[] = [
  { title: "发起沟通", note: "从 + 创建选择项目沟通，设置参与项目和参与人", meta: "发起", tone: "blue" },
  { title: "记录讨论", note: "补充讨论内容、关联客户和附件", meta: "记录", tone: "amber" },
  { title: "生成纪要", note: "整理结论、待办、负责人和完成时间", meta: "纪要", tone: "green" },
  { title: "归档同步", note: "归档到项目沟通、客户档案和我的待办", meta: "归档", tone: "green" },
];

export const meetingNoteFields: DaochongFormField[] = [
  { label: "会议纪要标题", value: "六月新客体验活动复盘", helper: "可由项目沟通转成会议纪要。" },
  { label: "会议时间", value: "2026-06-23 19:30", helper: "正式开发时可选择日期和时间。" },
  { label: "讨论结论", value: "头疗体验转化较好，后续由燕子补服务纪要，光的家园跟进回访。", helper: "结论会同步到项目沟通记录。" },
  { label: "关联客户", value: "林女士、许女士、周先生", helper: "客户信息按权限脱敏。" },
  { label: "附件", value: "活动照片、客户反馈表、费用凭证", helper: "附件进入统一凭证或沟通附件。" },
];

export const meetingTodoRows: DaochongMoneyRow[] = [
  { label: "燕子补服务纪要", note: "许女士香疗肩颈，12 小时内补填", value: "今天" },
  { label: "光的家园回访", note: "林女士体验后 3 天内电话回访", value: "周五" },
  { label: "程程确认活动复盘", note: "确认奖金、报销和客户跟进归档", value: "待确认" },
];

export const meetingNoteStatuses: DaochongStatusItem[] = [
  { title: "待办分发", note: "纪要里的负责人和时间进入首页或我的待办", status: "待办", tone: "blue" },
  { title: "客户同步", note: "关联客户的服务建议同步到客户档案", status: "同步", tone: "green" },
  { title: "只读归档", note: "归档后纪要只读，修改需重新补充记录", status: "只读", tone: "neutral" },
];

export const acceptanceFields: DaochongFormField[] = [
  { label: "当前入口", value: "/daochong-mobile", helper: "真实骨架灰度路由，当前仍不切正式入口。" },
  { label: "预览范围", value: "DCM-00 到 DCM-50", helper: "覆盖四个底部主入口、中间创建面板、关键详情页、管理设置和接口接入顺序。" },
  { label: "数据状态", value: "mock 优先，可切只读接口", helper: "只读接口开关关闭时不请求真实数据；开启后也不写数据。" },
  { label: "高风险动作", value: "审批、扣卡、财务确认、企业微信发送均不执行", helper: "本页只用于验收字段、权限和页面走向。" },
  { label: "下一步", value: "确认第一批只读接口接入", helper: "建议先接项目设置、成员权限、首页班表和客户只读数据。" },
];

export const acceptancePageRows: DaochongMoneyRow[] = [
  { label: "四个底部主入口", note: "首页、我的业绩、客户、我的", value: "已覆盖" },
  { label: "关键详情页", note: "预约、结算、充值、凭证、耗卡审批、客户详情、补填纪要", value: "已覆盖" },
  { label: "管理设置页", note: "成员权限、项目设置、提点奖金、财务汇总", value: "已覆盖" },
  { label: "跨项目协作", note: "项目沟通和会议纪要支持光的家园与道冲共同参与", value: "已覆盖" },
];

export const acceptanceRoleRows: DaochongMoneyRow[] = [
  { label: "老师", note: "日程、客户、本人业绩、充值提交、结算和服务纪要", value: "分权" },
  { label: "程程", note: "管理员、项目、薪酬、耗卡审批、充值审批和财务总览", value: "主控" },
  { label: "管理员", note: "按程程授权处理预约、客户、耗卡审批和凭证复核", value: "授权" },
  { label: "财务/立猛", note: "查看凭证、充值复核、财务汇总和异常队列", value: "复核" },
  { label: "前台", note: "预约、到店、改约、客户、充值提交和班表", value: "高频" },
];

export const acceptanceCreateRows: DaochongMoneyRow[] = [
  { label: "预约和充值", note: "添加预约、客户充值，充值必须上传截图，现金还要拍现金", value: "+ 号" },
  { label: "服务后闭环", note: "记录耗卡、服务结算、补填纪要、12 小时提醒入口", value: "+ 号" },
  { label: "协作记录", note: "项目沟通、会议纪要、待办归档和客户同步", value: "+ 号" },
  { label: "财务事项", note: "报销申请、团队奖金、原因和金额，最后汇总给财务", value: "+ 号" },
];

export const acceptanceReadonlyRows: DaochongMoneyRow[] = [
  { label: "首页和配置", note: "snapshot、appointments、roster、projects、compensation", value: "先接" },
  { label: "客户和服务", note: "customers、customerDetail、settlementDrafts、consumptionApprovals", value: "主链路" },
  { label: "资金和凭证", note: "recharges、evidenceAssets、financeSummary、financeEvidenceExceptions", value: "高风险" },
  { label: "纪要和协作", note: "serviceNotes、wecomReminderDryRuns、projectCommunications、meetingNotes", value: "dry-run" },
  { label: "奖金报销", note: "bonusExpenseItems 汇入财务草稿，不生成最终工资", value: "草稿" },
];

export const acceptanceStatuses: DaochongStatusItem[] = [
  { title: "入口保护", note: "灰度页独立打开，正式入口不切换", status: "通过", tone: "green" },
  { title: "角色分流", note: "老师、程程、管理员、财务和前台看到不同入口", status: "通过", tone: "green" },
  { title: "视觉统一", note: "冷白、雾绿、墨绿和灰，不使用粉色阴影", status: "通过", tone: "green" },
  { title: "真实动作", note: "审批、扣卡、财务确认和企业微信发送仍需单独确认", status: "未执行", tone: "neutral" },
];

export const acceptanceTimeline: DaochongTimelineItem[] = [
  { title: "页面范围确认", note: "先确认手机端全部页面、入口和详情页是否完整", meta: "DCM-45", tone: "blue" },
  { title: "字段接口对照", note: "把 mock 字段对齐只读接口规格，保留缺口清单", meta: "DCM-46", tone: "amber" },
  { title: "灰度验收清单", note: "完成入口、角色、视觉、高风险动作和文档验收", meta: "DCM-47", tone: "green" },
  { title: "只读接口排期", note: "按低风险到高风险顺序接入，写动作保持关闭", meta: "DCM-50", tone: "blue" },
];

export const apiPlanFields: DaochongFormField[] = [
  { label: "接入原则", value: "先只读、后写入、先低风险、后高风险", helper: "任何写动作都需要你单独确认后才能打开。" },
  { label: "默认开关", value: "NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH=false", helper: "不开关时只显示 mock，不请求真实接口。" },
  { label: "第一批建议", value: "projects、roster、appointments 候选、customers", helper: "这些接口只影响展示和筛选，风险较低。" },
  { label: "高风险隔离", value: "recharges、settlementDrafts、consumptionApprovals、financeSummary", helper: "资金、审批和财务数据先做只读影子验收。" },
  { label: "当前进展", value: "项目、班表、预约候选、客户列表、客户详情、纪要候选已有只读适配，薪酬需新口径", helper: "预约和纪要仍是候选，不是完整服务闭环。" },
  { label: "正式纪要预检", value: "未发现 ServiceNote / CustomerPreference 模型", helper: "DCM-66 到 DCM-68 已记录缺口，不把 followups 冒充正式服务记录。" },
  { label: "正式模型方案", value: "ServiceNote / CustomerPreference 字段方案已定", helper: "DCM-69 到 DCM-72 只设计模型和 API 边界，未建表、未开放写入。" },
  { label: "建表前评审", value: "命名、枚举、索引、权限、回滚和影子表已评审", helper: "DCM-73 到 DCM-76 仍不创建 migration，等待你确认建表。" },
  { label: "迁移接口草案", value: "Prisma 模型草案和只读 controller 草案已整理", helper: "DCM-77 到 DCM-80 仍只做文档和灰度说明，不改 schema、不建 controller。" },
  { label: "本地草案文件", value: "schema、SQL、只读 controller、只读 service、Go/No-Go 已成包", helper: "DCM-81 到 DCM-84 草案在 docs 下，不进入真实迁移或正式后端源码。" },
  { label: "正式只读源码", value: "schema、migration 文件、只读 controller/service 已进入本地源码", helper: "DCM-85 到 DCM-88 仍不运行迁移、不写库、不开放写动作。" },
  { label: "前端只读接入", value: "客户详情已并行读取 service-notes 和 customer-preferences", helper: "DCM-89 到 DCM-92 正式接口有数据时优先展示，失败时回退 mock/followups。" },
  { label: "dry-run readiness", value: "本地影子只读前置检查已准备", helper: "DCM-93 到 DCM-96 只读检查 schema、migration、GET 接口、前端回退和数据库目标。" },
  { label: "dry-run 计划", value: "本地迁移 dry-run 计划已生成", helper: "DCM-97 到 DCM-100 只输出步骤、范围、停止条件和确认项，不执行数据库动作。" },
  { label: "高风险只读入口", value: "资金、凭证、审批、财务和协作 GET 已占位", helper: "DCM-101 到 DCM-104 默认关闭，只返回空状态和诊断，不读写真实业务。" },
  { label: "高风险来源映射", value: "现有模型复用和缺口已梳理", helper: "DCM-105 到 DCM-108 只读扫描 schema 和 API 文件，不连接数据库、不接写动作。" },
  { label: "凭证会议只读", value: "FileRecord 和 MeetingMinutesRecord 映射已接", helper: "DCM-109 到 DCM-112 只读映射凭证和会议纪要，不上传、不复核、不归档。" },
  { label: "财务模型草案", value: "FinanceSummary / EvidenceException / BonusExpenseItem 字段草案已成包", helper: "DCM-125 到 DCM-128 只放 docs 草案，不确认财务、不生成工资、不接写动作。" },
  { label: "财务审阅前置", value: "确认矩阵、只读契约、页面验收和 Go/No-Go 已成包", helper: "DCM-129 到 DCM-132 仍只做 docs 审阅材料，不进入真实源码。" },
  { label: "财务只读源码计划", value: "目标文件、验证计划和只读计划器已准备", helper: "DCM-133 到 DCM-136 只输出未来计划，不改真实源码、不写库。" },
  { label: "财务只读源码层", value: "FinanceSummary / EvidenceException / BonusExpenseItem 已进入本地只读源码", helper: "DCM-137 到 DCM-140 只接 schema、migration 文件、GET 查询和前端回退，不运行迁移、不确认财务。" },
  { label: "资金只读源码层", value: "Recharge / SettlementDraft / ConsumptionApproval 已进入本地只读源码", helper: "DCM-141 到 DCM-144 只接 schema、migration 文件、GET 查询和前端回退，不运行迁移、不审批扣卡入账。" },
  { label: "只读验收收口", value: "验收器、灰页标识、文档和测试已对齐", helper: "DCM-145 到 DCM-148 只读检查源码和可选灰页 GET，不运行迁移、不写库、不切正式入口。" },
  { label: "剩余缺口契约", value: "预约详情、卡项余额、薪酬配置、企业微信 dry-run 已成契约包", helper: "DCM-149 到 DCM-152 只做 review-only 契约和计划器，不冒充真实业务闭环。" },
];

export const apiPlanPhaseRows: DaochongMoneyRow[] = [
  { label: "第一批基础只读", note: "项目设置、薪酬规则、班表、客户列表", value: "先接" },
  { label: "第二批预约客户", note: "预约、客户详情、服务记录、个人偏好", value: "候选已接" },
  { label: "第二批来源预检", note: "正式服务记录、客户偏好、12 小时提醒来源已核对", value: "缺模型" },
  { label: "第二批模型方案", note: "DaochongServiceNote、DaochongCustomerPreference、只读 API 和写入边界已设计", value: "方案" },
  { label: "第二批建表评审", note: "字段命名、枚举、索引、权限、回滚和只读影子表方案已收口", value: "评审" },
  { label: "第二批草案评审", note: "Prisma 模型草案、只读 controller 草案、灰度回退和 Go/No-Go 清单已整理", value: "草案" },
  { label: "第二批草案文件", note: "schema 片段、SQL、只读 controller、只读 service 和 Go/No-Go 文件已放入 docs 草案目录", value: "待审" },
  { label: "第二批只读源码", note: "正式 schema、migration 文件和只读 GET 接口源码已建立，等待迁移执行确认", value: "源码" },
  { label: "第二批前端只读", note: "客户详情、补填纪要和个人爱好已接正式只读 GET，并保留 mock/followups 回退", value: "已接" },
  { label: "第二批 readiness", note: "新增本地影子只读 readiness 检查，确认 dry-run 前置条件但不执行迁移", value: "已备" },
  { label: "第二批 dry-run 计划", note: "新增本地迁移 dry-run 计划器，列出命令、范围、停止条件和确认项但不执行", value: "计划" },
  { label: "第三批资金凭证", note: "客户充值、凭证详情、结算草稿、耗卡审批已建立 GET-only 影子入口", value: "占位" },
  { label: "第四批财务协作", note: "财务汇总、异常队列、奖金报销已占位；项目沟通和会议纪要已接只读映射", value: "推进" },
  { label: "高风险来源映射", note: "凭证、项目沟通和会议纪要可优先只读映射；充值、结算、审批和财务仍需专用模型或映射确认", value: "缺口" },
  { label: "凭证会议只读映射", note: "evidence-assets 从 FileRecord 映射；meeting-notes 从 MeetingMinutesRecord 映射", value: "已接" },
  { label: "项目沟通只读映射", note: "project-communications 从 MeetingMinutesRecord 映射项目范围、参与人、客户关联和摘要", value: "已接" },
  { label: "资金三件套草案", note: "充值、结算草稿、耗卡审批的专用模型草案已放入 docs，等待审阅", value: "草案" },
  { label: "财务三件套草案", note: "财务汇总、凭证异常、奖金报销的专用模型草案已放入 docs，等待审阅", value: "草案" },
  { label: "财务审阅前置", note: "财务确认矩阵、只读契约、页面验收和 Go/No-Go 已放入 docs，等待审阅", value: "待审" },
  { label: "财务只读源码计划", note: "未来目标文件、验证计划、停止条件和只读计划器已放入 docs/scripts，等待审阅", value: "计划" },
  { label: "第四批财务只读源码", note: "DaochongFinanceSummary、DaochongFinanceEvidenceException、DaochongBonusExpenseItem 已接 GET-only 源码层", value: "已接" },
  { label: "第三批资金只读源码", note: "DaochongCustomerRecharge、DaochongServiceSettlementDraft、DaochongCardConsumptionApproval 已接 GET-only 源码层", value: "已接" },
  { label: "只读验收收口", note: "新增 Daochong 手机端只读验收器，覆盖源码、文档、写动作扫描和灰页 GET 证据", value: "已接" },
  { label: "剩余缺口契约", note: "预约详情、客户卡项余额、薪酬配置、12 小时企业微信 dry-run 契约已生成 review-only 草案", value: "契约" },
  { label: "预约详情只读源码", note: "GET /daochong/mobile/appointments/:appointmentId 已接 Task 详情、服务纪要和结算草稿只读回退", value: "已接" },
  { label: "卡项余额只读预览", note: "customer-card-balances 用已入账充值减已通过耗卡形成只读预览，仍非最终卡台账", value: "预览" },
  { label: "薪酬配置只读来源", note: "compensation-rules 已成 GET-only 入口；当前明确不从 SalarySlip 反推底薪和提点", value: "待源" },
  { label: "企微提醒 dry-run 源码", note: "wecom-reminder-dry-runs 从 DaochongServiceNote 只读生成 12 小时提醒预览", value: "已接" },
  { label: "暂不打开写入", note: "新增、审批、扣卡、入账、企业微信发送全部保持关闭", value: "保护" },
];

export const apiPlanEndpointRows: DaochongMoneyRow[] = [
  { label: "projects / compensation", note: "项目价格、时长、耗卡规则、底薪和提点规则", value: "低风险" },
  { label: "roster / appointments", note: "首页班表、/tasks 预约候选、预约详情和到店状态展示", value: "中风险" },
  { label: "customers / customerDetail / serviceNotes", note: "客户列表、客户档案、纪要候选和个人爱好", value: "中风险" },
  { label: "serviceNotes / customerPreferences", note: "正式服务纪要、客户偏好、个人禁忌和来源纪要", value: "方案" },
  { label: "migration guard", note: "建议先建影子表、只读接口和灰度开关，再确认写入链路", value: "评审" },
  { label: "readonly controller draft", note: "只设计 GET service-notes 和 GET customer-preferences；不开放 POST/PATCH/DELETE", value: "草案" },
  { label: "draft files package", note: "草案文件位于 docs/daochong-mobile-drafts/dcm81-dcm84，不在可执行源码路径", value: "待审" },
  { label: "service-notes readonly GET", note: "后端源码已注册 GET /daochong/mobile/service-notes，默认影子只读开关关闭", value: "只读" },
  { label: "customer-preferences readonly GET", note: "后端源码已注册 GET /daochong/mobile/customer-preferences，默认不返回私密偏好给财务", value: "只读" },
  { label: "customer detail readonly fetch", note: "前端客户详情并行请求 /customers/:id、service-notes 和 customer-preferences", value: "已接" },
  { label: "shadow readiness check", note: "scripts/local/daochong-shadow-readonly-readiness.mjs 只读检查 dry-run 前置条件", value: "已备" },
  { label: "shadow dry-run plan", note: "scripts/local/daochong-shadow-migration-dryrun-plan.mjs 只生成本地 dry-run 步骤，不执行命令", value: "计划" },
  { label: "recharges / evidenceAssets", note: "recharges 已接 DaochongCustomerRecharge GET-only；evidence-assets 已可从 FileRecord 做高风险只读映射", value: "已接" },
  { label: "settlementDrafts / consumptionApprovals", note: "DaochongServiceSettlementDraft 和 DaochongCardConsumptionApproval 已接 GET-only 源码层，不触发审批、扣卡或退回", value: "已接" },
  { label: "financeSummary / bonusExpenseItems", note: "GET-only 影子入口已建，只显示草稿/异常口径，不生成最终工资", value: "只读" },
  { label: "projectCommunications / meetingNotes", note: "project-communications 和 meeting-notes 均已可从 MeetingMinutesRecord 只读映射", value: "已接" },
  { label: "high-risk source map", note: "scripts/local/daochong-high-risk-source-map.mjs 输出现有模型、缺字段和下一步", value: "已扫" },
  { label: "evidence / meeting frontend fetch", note: "前端灰度页已能读取 evidence-assets 和 meeting-notes，失败或空数据继续回退 mock", value: "已接" },
  { label: "money model draft files", note: "docs/daochong-mobile-drafts/dcm121-dcm124 已整理充值、结算草稿和耗卡审批模型草案", value: "待审" },
  { label: "finance model draft files", note: "docs/daochong-mobile-drafts/dcm125-dcm128 已整理财务汇总、异常队列和奖金报销模型草案", value: "待审" },
  { label: "finance review package", note: "docs/daochong-mobile-drafts/dcm129-dcm132 已整理确认矩阵、只读契约、页面验收和 Go/No-Go", value: "待审" },
  { label: "finance source plan", note: "scripts/local/daochong-finance-readonly-source-plan.mjs 只读输出未来源码层目标和停止条件", value: "计划" },
  { label: "finance readonly GET source", note: "finance-summary、finance-evidence-exceptions、bonus-expense-items 已接本地 schema、migration 文件、service findMany 和前端回退", value: "已接" },
  { label: "money readonly GET source", note: "recharges、settlement-drafts、consumption-approvals 已接本地 schema、migration 文件、service findMany 和前端回退", value: "已接" },
  { label: "readonly acceptance verifier", note: "verify:daochong-mobile-readonly 只读核对 DCM-145 到 DCM-148，不运行迁移、不连接数据库写入", value: "已接" },
  { label: "remaining gap contract plan", note: "plan:daochong-gap-contract 只读核对预约详情、卡项余额、薪酬配置和企业微信 dry-run 契约", value: "契约" },
  { label: "appointment detail readonly GET", note: "GET /daochong/mobile/appointments/:appointmentId 从 Task 映射预约详情，前端点击预约卡后按需读取", value: "已接" },
  { label: "customer card balance readonly preview", note: "GET /daochong/mobile/customer-card-balances 只读汇总 confirmed recharge 与 approved consumption", value: "预览" },
  { label: "compensation rules readonly GET", note: "GET /daochong/mobile/compensation-rules 只返回配置来源状态，不从工资结果反推规则", value: "待源" },
  { label: "wecom reminder dry-run readonly GET", note: "GET /daochong/mobile/wecom-reminder-dry-runs 只读生成 12 小时提醒预览，不创建通知", value: "已接" },
];

export const apiPlanRiskRows: DaochongMoneyRow[] = [
  { label: "字段缺失", note: "真实接口字段少于 mock 时，页面必须能显示空状态和缺口提示", value: "回退" },
  { label: "权限不一致", note: "接口返回成功但角色不可见时，前端仍按权限隐藏入口", value: "拦截" },
  { label: "数据异常", note: "金额、凭证、审批状态不完整时只进入异常或待补，不进入最终口径", value: "隔离" },
  { label: "建表回滚", note: "建表前必须确认只新增表和索引，不改老表；未写入前可整表回退", value: "预案" },
  { label: "影子表开关", note: "先以只读影子表和灰度开关验收，不接正式写入链路", value: "建议" },
  { label: "草案误执行", note: "DCM-77 到 DCM-80 只允许文档、灰度说明和测试断言，不改 schema、不新增 controller", value: "拦截" },
  { label: "草案路径隔离", note: "DCM-81 到 DCM-84 草案只放 docs，不进入 prisma/migrations 或 apps/api/src", value: "拦截" },
  { label: "源码写入护栏", note: "DCM-85 到 DCM-88 只允许 schema、migration 文件和 GET 只读接口，不运行迁移、不写库", value: "拦截" },
  { label: "前端回退护栏", note: "DCM-89 到 DCM-92 正式接口失败或空数据时继续回退 mock/followups，不提交写动作", value: "回退" },
  { label: "dry-run 目标护栏", note: "DCM-93 到 DCM-96 只解析 DATABASE_URL 主机，生产样式目标直接阻断，不连接数据库", value: "拦截" },
  { label: "dry-run 计划护栏", note: "DCM-97 到 DCM-100 只列计划和确认项，真正本地写库前仍需单独授权", value: "拦截" },
  { label: "高风险只读护栏", note: "DCM-101 到 DCM-104 只开放 GET 空状态和诊断，不查资金表、不审批、不扣卡、不入账", value: "拦截" },
  { label: "来源映射护栏", note: "DCM-105 到 DCM-108 只读扫描 schema 和 API 文件，不把通用模型冒充道冲专用业务闭环", value: "拦截" },
  { label: "凭证会议映射护栏", note: "DCM-109 到 DCM-112 只读映射 FileRecord 和 MeetingMinutesRecord，不上传、不复核、不编辑、不归档", value: "拦截" },
  { label: "高风险前端回退", note: "DCM-113 到 DCM-116 前端只消费 GET 返回；空、错、无权限都保留 mock 凭证和会议纪要", value: "回退" },
  { label: "项目沟通映射护栏", note: "DCM-117 到 DCM-120 只读映射 MeetingMinutesRecord，不新增沟通、不归档、不生成待办", value: "拦截" },
  { label: "资金草案路径隔离", note: "DCM-121 到 DCM-124 只允许 docs 草案和测试断言，不改 schema、不生成 migration、不接写动作", value: "拦截" },
  { label: "财务草案路径隔离", note: "DCM-125 到 DCM-128 只允许 docs 草案和测试断言，不改 schema、不生成 migration、不确认财务或工资", value: "拦截" },
  { label: "财务审阅路径隔离", note: "DCM-129 到 DCM-132 只允许 docs 审阅包和测试断言，不进入 prisma 或 apps/api", value: "拦截" },
  { label: "财务源码计划护栏", note: "DCM-133 到 DCM-136 只读取草案并输出计划，不修改 schema、不写 migration、不注册 controller", value: "拦截" },
  { label: "财务源码只读护栏", note: "DCM-137 到 DCM-140 只允许 schema/migration 文件、GET findMany、前端只读回退和测试；不运行迁移、不写财务确认", value: "拦截" },
  { label: "资金源码只读护栏", note: "DCM-141 到 DCM-144 只允许 schema/migration 文件、GET findMany、前端只读回退和测试；不运行迁移、不审批、不扣卡、不入账", value: "拦截" },
  { label: "只读验收护栏", note: "DCM-145 到 DCM-148 只允许读源码、运行测试/lint/GET 灰页和写动作扫描；不写库、不部署、不切正式入口", value: "拦截" },
  { label: "剩余缺口契约护栏", note: "DCM-149 到 DCM-152 只允许 docs 契约、只读计划器和测试；不新增源码层、不写 schema、不发送企业微信", value: "拦截" },
  { label: "预约详情只读护栏", note: "DCM-153 到 DCM-156 只允许 GET 详情、前端回退、文档和测试；不改约、不签到、不确认完成、不发送企业微信", value: "拦截" },
  { label: "卡项余额预览护栏", note: "DCM-157 到 DCM-160 只允许余额只读预览；不开户、不调余额、不扣卡、不退款、不写流水", value: "拦截" },
  { label: "薪酬配置只读护栏", note: "DCM-161 到 DCM-164 只允许 GET 空状态和来源诊断；不从薪资单反推、不确认工资、不生成薪资条", value: "拦截" },
  { label: "企微提醒 dry-run 护栏", note: "DCM-165 到 DCM-168 只允许 GET 预览；不创建通知、不标记已发送、不调用企业微信", value: "拦截" },
  { label: "写动作误开", note: "没有单独确认时不允许新增、审批、扣卡、财务确认或发送企业微信", value: "关闭" },
];

export const apiPlanPrecheckRows: DaochongMoneyRow[] = [
  { label: "项目设置 projects", note: "已有 /products GET，可按 displayName、salePrice、spec、unit、status 映射", value: "可接" },
  { label: "首页班表 roster", note: "已有 /settings/shift-roster GET，可读 staff.daochong、dailyInfo 和 weekly", value: "可接" },
  { label: "预约候选 appointments", note: "已有 /tasks GET，可按 startAt、customer、assignee、status 映射首页预约候选", value: "候选" },
  { label: "客户列表 customers", note: "已有 /customers GET，已支持分页 items 结构和 mock 回退", value: "已适配" },
  { label: "客户详情 customerDetail", note: "已有 /customers/:id GET，已映射基础资料、CRM 跟进、报价和任务", value: "基础" },
  { label: "纪要候选 serviceNotes", note: "未发现独立 serviceNotes；先用客户详情 followups 映射补填纪要候选", value: "候选" },
  { label: "正式服务记录 serviceNotes", note: "拟建 DaochongServiceNote：关联 appointment、settlementDraft、customer、teacher、project 和 dueAt", value: "方案" },
  { label: "客户偏好 customerPreferences", note: "拟建 DaochongCustomerPreference：记录房间、灯光、力度、禁忌、爱好和来源纪要", value: "方案" },
  { label: "命名和枚举", note: "建议枚举 noteStatus、sourceType、preferenceSyncStatus、preferenceType、visibility", value: "评审" },
  { label: "索引和权限", note: "建议按 customerId、teacherId、dueAt、noteStatus、sourceServiceNoteId 建索引；写权限继续关闭", value: "评审" },
  { label: "Prisma 草案", note: "模型字段、枚举和索引只写入文档草案，不修改 schema.prisma", value: "草案" },
  { label: "只读 controller 草案", note: "只设计 GET 列表和权限守卫，不生成 controller 文件，不开放写动作", value: "草案" },
  { label: "本地草案文件", note: "schema-extension、migration、readonly controller/service 和 Go/No-Go 文件已生成在 docs 草案目录", value: "待审" },
  { label: "正式源码只读", note: "schema、migration 文件、只读 controller/service 已进入本地源码；服务端开关默认关闭", value: "源码" },
  { label: "前端正式只读", note: "客户详情页已读取 service-notes 和 customer-preferences；正式数据优先，候选数据回退", value: "已接" },
  { label: "dry-run readiness", note: "已新增本地 readiness 检查，覆盖 schema、migration、GET-only、前端回退和数据库目标", value: "已备" },
  { label: "dry-run plan", note: "已新增本地迁移 dry-run 计划器，输出命令数组、表范围、停止条件和确认项", value: "计划" },
  { label: "高风险 GET-only", note: "recharges、evidence-assets、settlement-drafts、consumption-approvals、finance-summary、bonus-expense-items、project-communications、meeting-notes 已有默认关闭入口", value: "占位" },
  { label: "高风险 source map", note: "FileRecord 和 MeetingMinutesRecord 可优先只读映射；多数资金审批口径仍需 Daochong 专用模型", value: "缺口" },
  { label: "凭证只读映射", note: "evidence-assets 已从 FileRecord 映射 fileUrl、businessType、businessId、permissionScope、status 和 uploader", value: "已接" },
  { label: "会议纪要只读映射", note: "meeting-notes 已从 MeetingMinutesRecord 映射 title、meetingAt、recordJson、folderId 和 createdBy", value: "已接" },
  { label: "凭证会议前端只读", note: "evidence 页面和 communication 页面已接只读 fetch/adapters，仍不写凭证、不生成待办", value: "已接" },
  { label: "项目沟通只读映射", note: "project-communications 已从 MeetingMinutesRecord 映射 topic、projectScopes、participants、relatedCustomerIds 和 status", value: "已接" },
  { label: "资金三件套模型草案", note: "DaochongCustomerRecharge、DaochongServiceSettlementDraft、DaochongCardConsumptionApproval 草案已生成在 docs", value: "草案" },
  { label: "财务三件套模型草案", note: "DaochongFinanceSummary、DaochongFinanceEvidenceException、DaochongBonusExpenseItem 草案已生成在 docs", value: "草案" },
  { label: "财务审阅确认矩阵", note: "summaryMonth、sourceCutoffAt、异常归属、奖金报销、工资边界、权限和回滚仍需审阅确认", value: "待审" },
  { label: "财务只读源码计划器", note: "脚本只读取 DCM-125 到 DCM-132 草案包，输出未来目标文件、验证门槛和停止条件", value: "计划" },
  { label: "财务只读源码层", note: "schema、migration 文件、后端 findMany 映射和前端 finance-summary/异常/奖金报销读取已接入", value: "已接" },
  { label: "资金只读源码层", note: "schema、migration 文件、后端 findMany 映射和前端 recharges/settlement-drafts/consumption-approvals 读取已接入", value: "已接" },
  { label: "只读验收器", note: "scripts/local/daochong-mobile-readonly-acceptance.mjs 只读检查源码、文档、测试、根命令和可选灰页 URL", value: "已接" },
  { label: "剩余缺口契约包", note: "docs/daochong-mobile-drafts/dcm149-dcm152 固定四个缺口的目标路径、字段、禁用动作和 Go/No-Go", value: "契约" },
  { label: "预约详情源码层", note: "单个预约详情优先复用 Task，只读补服务纪要和结算草稿关联；空、错、无权限继续回退 mock", value: "已接" },
  { label: "卡项余额预览", note: "已确认且已入账充值减已通过耗卡审批；只作灰页预览，不作为最终余额", value: "预览" },
  { label: "薪酬配置源码层", note: "compensation-rules 已接 GET-only 空状态；正式配置模型仍需后续 schema 或来源确认", value: "待源" },
  { label: "12 小时提醒 wecomReminderDryRuns", note: "wecom-reminder-dry-runs 已接 DaochongServiceNote 到期纪要只读预览，正式发送仍关闭", value: "已接" },
  { label: "薪酬规则 compensation", note: "现有工资单接口不是道冲底薪和提点设置口径，不能直接复用", value: "待设计" },
];

export const apiPlanSourceRows: DaochongMoneyRow[] = [
  { label: "产品来源", note: "ProductsController.list，权限 page.products.list，当前已有产品只读 adapter", value: "现成" },
  { label: "班表来源", note: "SettingsController.getShiftRoster，权限 page.schedule.center，当前已有班表只读 adapter", value: "现成" },
  { label: "预约候选来源", note: "TasksController.list，权限 page.schedule.center，当前已有预约候选只读 adapter", value: "候选" },
  { label: "客户来源", note: "CustomersController.list/getById，权限 page.customers.list/detail，列表和详情基础已适配", value: "可用" },
  { label: "纪要候选来源", note: "CustomersController.getById 返回 followups，可映射补填纪要候选", value: "候选" },
  { label: "正式服务记录模型方案", note: "ServiceNote 以服务完成事件为入口，保留候选来源、补填原因、纪要状态和提醒时间", value: "方案" },
  { label: "个人爱好模型方案", note: "CustomerPreference 由服务纪要同步，保留偏好类型、偏好值、禁忌、来源纪要和更新人", value: "方案" },
  { label: "建表前评审方案", note: "字段命名、枚举、索引、权限和回滚已评审；建议先只读影子表", value: "评审" },
  { label: "只读接口草案", note: "GET service-notes 和 GET customer-preferences 草案已整理，仍不创建后端文件", value: "草案" },
  { label: "草案文件包", note: "schema、SQL、controller、service、Go/No-Go 已生成在 docs 目录，等待审阅后再转源码", value: "待审" },
  { label: "正式只读源码", note: "DaochongMobileReadonlyController/Service 已加入本地源码，只保留 GET 和空状态回退", value: "源码" },
  { label: "前端只读接入", note: "fetch 现在并行读取客户详情、正式服务纪要和客户偏好，任一路失败都保留回退", value: "已接" },
  { label: "readiness 来源", note: "本地脚本读取 schema、migration、API、前端和测试文件，不连接数据库", value: "已备" },
  { label: "dry-run 计划来源", note: "本地计划器读取 migration 摘要、只读开关、前端路径和本地目标，不连接数据库", value: "计划" },
  { label: "高风险影子来源", note: "后端已建高风险 GET-only 入口，但真实来源仍待字段映射和权限确认", value: "待映射" },
  { label: "凭证来源", note: "FileRecord 已接入 evidence-assets 只读映射，原图读取仍按 fileUrl 展示，不做上传或复核", value: "已接" },
  { label: "项目沟通来源", note: "MeetingMinutesRecord 已接入 project-communications 只读映射，recordJson 仅解析沟通展示字段", value: "已接" },
  { label: "会议来源", note: "MeetingMinutesRecord 已接入 meeting-notes 只读映射，recordJson 仅解析展示字段", value: "已接" },
  { label: "前端凭证会议来源", note: "灰度页读取 /daochong/mobile/evidence-assets 与 /daochong/mobile/meeting-notes，只替换展示数据", value: "已接" },
  { label: "资金审批来源", note: "DaochongCustomerRecharge、DaochongServiceSettlementDraft、DaochongCardConsumptionApproval 已进入本地 GET-only 源码层", value: "已接" },
  { label: "资金模型草案包", note: "docs 草案包已给出充值、结算草稿和耗卡审批的字段、索引、只读 GET 和 Go/No-Go", value: "待审" },
  { label: "财务模型草案包", note: "docs 草案包已给出财务月度汇总、财务凭证异常和奖金报销的字段、索引、只读 GET 和 Go/No-Go", value: "待审" },
  { label: "财务审阅包", note: "docs 审阅包已给出确认矩阵、只读返回契约、页面验收和 Go/No-Go", value: "待审" },
  { label: "财务只读源码计划", note: "本地只读计划器已能检查草案完整性，并列出未来源码目标和停止条件", value: "计划" },
  { label: "财务只读源码", note: "DaochongFinanceSummary、DaochongFinanceEvidenceException、DaochongBonusExpenseItem 已可被高风险 GET-only 服务只读读取", value: "已接" },
  { label: "资金只读源码", note: "DaochongCustomerRecharge、DaochongServiceSettlementDraft、DaochongCardConsumptionApproval 已可被高风险 GET-only 服务只读读取", value: "已接" },
  { label: "验收器来源", note: "只读读取 schema、migration、controller/service、frontend、docs、tests 和 package script，不连接数据库", value: "已接" },
  { label: "剩余缺口契约来源", note: "只读计划器读取契约 JSON、缺口矩阵、Go/No-Go、schema、API specs、灰页计划和测试", value: "契约" },
  { label: "预约详情真实来源", note: "后端通过 accessControl.buildTaskWhere 只读读取 Task，并在开关允许时补 DaochongServiceNote/SettlementDraft 关联", value: "已接" },
  { label: "卡项余额预览来源", note: "后端通过 customer 权限过滤读取 DaochongCustomerRecharge 与 DaochongCardConsumptionApproval，只做差额预览", value: "预览" },
  { label: "薪酬配置来源", note: "SalarySlip 是结果口径，compensation-rules 只返回来源待建诊断，不冒充底薪提点配置", value: "待建" },
  { label: "提醒发送来源", note: "wecom-reminder-dry-runs 已从 DaochongServiceNote dueAt/reminderScheduledAt 只读生成 12 小时预览", value: "已接" },
  { label: "薪酬来源", note: "SalarySlips 是最终工资数据，不适合当作底薪提点配置源", value: "缺口" },
];

export const apiPlanBlockerRows: DaochongMoneyRow[] = [
  { label: "客户卡项余额", note: "已接只读预览；仍缺独立客户卡台账、次数卡规则和调账审计", value: "部分" },
  { label: "正式服务记录", note: "schema、migration 文件和只读 GET 已在本地，但真实建表仍需单独确认", value: "待建表" },
  { label: "个人爱好和禁忌", note: "schema、migration 文件和只读 GET 已在本地，但不会从 followups 自动写入", value: "待建表" },
  { label: "服务完成事件", note: "触发口径建议为预约完成、结算草稿生成或服务确认；写链路仍未打开", value: "待确认" },
  { label: "枚举和索引确认", note: "建表前需要你确认枚举值和索引清单，避免上线后再迁移业务字段", value: "待确认" },
  { label: "回滚条件", note: "建议未写入前允许 drop 影子表；一旦写入真实纪要，回滚只能关开关和保留数据", value: "待确认" },
  { label: "迁移执行确认", note: "需要你确认迁移窗口、备份、负责人和 Go/No-Go 后，才能生成或运行真实 migration", value: "待确认" },
  { label: "只读接口确认", note: "需要你确认后才新增 controller/service；本轮只保留草案和测试保护", value: "待确认" },
  { label: "草案审阅确认", note: "需要你审阅 docs 草案包后，才可把文件转入 prisma/schema 或 apps/api/src", value: "待确认" },
  { label: "迁移运行确认", note: "schema 和 migration 文件已在本地，但必须另行确认后才允许运行数据库迁移", value: "待确认" },
  { label: "真实数据验收", note: "前端已接只读 GET，但新表未迁移前只能走空状态和回退；真实数据需后续 dry-run", value: "待确认" },
  { label: "dry-run 执行确认", note: "readiness 只证明前置条件；真正运行本地迁移 dry-run 仍需你再次确认", value: "待确认" },
  { label: "本地 dry-run 写库许可", note: "计划器已列出本地 shadow DB 步骤；没有你的明确许可前不运行会写库的命令", value: "待确认" },
  { label: "高风险真实来源映射", note: "充值、凭证、结算、审批、财务和协作入口已占位，真实表映射仍需逐项确认", value: "待确认" },
  { label: "资金迁移运行确认", note: "资金 schema 和 migration 文件已在本地，但必须另行确认后才允许运行数据库迁移", value: "待确认" },
  { label: "资金真实数据验收", note: "资金 GET-only 源码已接，真实充值、结算和审批数据质量仍需后续灰度验收", value: "待确认" },
  { label: "资金草案审阅确认", note: "资金三件套已从 docs 草案推进到本地只读源码；迁移、写入和真实验收仍需你确认", value: "待确认" },
  { label: "灰页实机复核", note: "验收器支持可选 --url GET 灰页检查；正式入口切换和真实 API 开关仍需单独确认", value: "待确认" },
  { label: "剩余缺口源码确认", note: "预约详情、卡项余额、薪酬配置和企业微信 dry-run 均已进入 GET-only 只读或预览层", value: "只读已接" },
  { label: "财务草案审阅确认", note: "财务三件套已形成 docs 草案；进入 schema、migration 或只读源码前仍需你确认", value: "待确认" },
  { label: "财务审阅包确认", note: "月份截止、异常归属、只读契约、页面验收和工资边界仍需你确认", value: "待确认" },
  { label: "财务只读源码计划确认", note: "未来目标文件、验证计划、停止条件和只读计划器结果仍需你确认", value: "待确认" },
  { label: "财务迁移运行确认", note: "财务 schema 和 migration 文件已在本地，但必须另行确认后才允许运行数据库迁移", value: "待确认" },
  { label: "财务真实数据验收", note: "财务 GET-only 源码已接，真实数据质量、权限和月份口径仍需后续灰度验收", value: "待确认" },
  { label: "凭证会议剩余缺口", note: "凭证仍缺 reviewStatus/lockedAt/returnReason 专用字段；会议仍缺 communicationId/todoItems/attachmentIds 专用结构", value: "缺口" },
  { label: "凭证会议真实验收", note: "前端已能消费只读返回，但真实数据质量、权限范围和原图访问仍需灰度确认", value: "待确认" },
  { label: "项目沟通真实验收", note: "项目沟通已能消费只读返回，但项目范围、参与人、客户脱敏和归档状态仍需灰度确认", value: "待确认" },
  { label: "老师底薪和提点", note: "compensation-rules 已接 GET-only 诊断，但正式配置模型和历史版本仍待建源", value: "待建源" },
  { label: "完整预约字段", note: "预约详情已从 Task 只读接入；房间、完整项目口径、到店状态和真实改约审计仍需后续预约专用模型", value: "部分" },
  { label: "真实读取开关", note: "当前保持关闭，下一步只建议开启项目、班表、预约候选和客户来源", value: "关闭" },
];

export const apiPlanStatuses: DaochongStatusItem[] = [
  { title: "mock 回退", note: "只读请求失败、空数据或无权限时，页面保留 mock 和提示", status: "必须", tone: "green" },
  { title: "权限前置", note: "老师、程程、管理员、财务、前台继续按角色分流", status: "必须", tone: "green" },
  { title: "第一批进展", note: "项目、班表、预约候选、客户列表、客户详情、纪要候选已具备只读适配；薪酬仍需新口径", status: "推进", tone: "blue" },
  { title: "正式纪要模型", note: "DaochongServiceNote 字段方案已定，仍未建表或开放写入", status: "方案", tone: "blue" },
  { title: "客户偏好模型", note: "DaochongCustomerPreference 字段方案已定，仍未建表或同步个人爱好", status: "方案", tone: "blue" },
  { title: "建表前评审", note: "命名、枚举、索引、权限和回滚预案已整理，建议先只读影子表", status: "评审", tone: "blue" },
  { title: "迁移接口草案", note: "Prisma 模型草案、只读 controller 草案和 Go/No-Go 清单已整理", status: "草案", tone: "blue" },
  { title: "草案文件待审", note: "schema、SQL、controller、service 和 Go/No-Go 已生成在 docs 草案目录", status: "待审", tone: "blue" },
  { title: "正式只读源码", note: "schema、migration 文件和只读 GET 接口源码已建立，迁移和写动作仍关闭", status: "源码", tone: "blue" },
  { title: "前端只读接入", note: "客户详情、补填纪要和个人爱好已接正式只读 GET，保留回退", status: "已接", tone: "blue" },
  { title: "dry-run readiness", note: "本地影子只读检查已准备，可验证 dry-run 前置条件", status: "已备", tone: "blue" },
  { title: "dry-run 计划", note: "本地迁移计划器已准备，只输出步骤和确认项，不执行数据库动作", status: "计划", tone: "blue" },
  { title: "高风险 GET-only", note: "充值、凭证、结算、审批、财务和协作已建默认关闭的只读入口", status: "占位", tone: "blue" },
  { title: "来源映射", note: "凭证和会议纪要可先只读映射；资金审批财务仍需专用模型", status: "缺口", tone: "amber" },
  { title: "凭证会议只读", note: "FileRecord 与 MeetingMinutesRecord 已进入高风险只读映射，前端灰度页可消费展示", status: "已接", tone: "blue" },
  { title: "沟通会议前端", note: "communication 页面已接项目沟通和会议纪要只读 fetch，空数据、报错和无权限继续回退", status: "已接", tone: "blue" },
  { title: "资金模型草案", note: "充值、结算草稿和耗卡审批 docs 草案包已准备，等待审阅后再进入源码", status: "草案", tone: "blue" },
  { title: "资金隔离", note: "真实来源映射、审批、扣卡、入账和财务确认仍保持关闭", status: "保护", tone: "amber" },
  { title: "财务模型草案", note: "财务汇总、凭证异常和奖金报销 docs 草案包已准备，等待审阅后再进入源码", status: "草案", tone: "blue" },
  { title: "财务隔离", note: "真实财务确认、工资生成、入账和企业微信发送仍保持关闭", status: "保护", tone: "amber" },
  { title: "财务审阅前置", note: "确认矩阵、只读契约、页面验收和 Go/No-Go 已准备，仍等待确认", status: "待审", tone: "blue" },
  { title: "财务只读源码计划", note: "目标文件、验证计划和只读计划器已准备，仍不进入真实源码", status: "计划", tone: "blue" },
  { title: "财务只读源码", note: "财务汇总、凭证异常和奖金报销已接本地 GET-only 源码层，迁移和写动作仍关闭", status: "已接", tone: "blue" },
  { title: "资金只读源码", note: "充值、结算草稿和耗卡审批已接本地 GET-only 源码层，迁移、审批、扣卡和入账仍关闭", status: "已接", tone: "blue" },
  { title: "只读验收收口", note: "源码、文档、测试、写动作扫描和灰页 GET 已纳入可重复验收器", status: "已接", tone: "blue" },
  { title: "剩余缺口契约", note: "预约详情、卡项余额、薪酬配置和企业微信 dry-run 已形成 review-only 契约，等待确认进入源码层", status: "契约", tone: "blue" },
  { title: "预约详情只读源码", note: "预约卡点击后可读取 Task 详情，并把服务纪要/结算草稿关联作为只读补充", status: "已接", tone: "blue" },
  { title: "卡项余额只读预览", note: "客户详情可读取已入账充值和已通过耗卡形成的余额预览，仍不写最终卡台账", status: "预览", tone: "blue" },
  { title: "薪酬配置只读来源", note: "薪酬页可接收 compensation-rules 只读返回；当前明确来源待建，不反推工资单", status: "待源", tone: "blue" },
  { title: "企微提醒 dry-run", note: "服务纪要页可读取 wecom-reminder-dry-runs 预览，仍不创建通知、不真实发送", status: "已接", tone: "blue" },
  { title: "正式切换", note: "切正式入口和写接口需要单独确认，不跟只读接入混在一起", status: "未切", tone: "neutral" },
];

export const apiPlanTimeline: DaochongTimelineItem[] = [
  { title: "确定接入顺序", note: "先固定低风险只读接口，再排资金和审批相关接口", meta: "DCM-48", tone: "blue" },
  { title: "补齐验收门槛", note: "每批接口都检查字段、权限、空状态、错误回退和视觉稳定", meta: "DCM-49", tone: "amber" },
  { title: "锁定高风险边界", note: "资金、审批、财务和企业微信继续只读或 dry-run", meta: "DCM-50", tone: "green" },
  { title: "客户列表适配", note: "分页客户列表已进入只读 adapter，客户详情和薪酬继续保留缺口", meta: "DCM-56", tone: "blue" },
  { title: "预约候选适配", note: "/tasks 已能映射首页预约候选，但还不是完整预约闭环", meta: "DCM-62", tone: "blue" },
  { title: "纪要候选适配", note: "客户 followups 已能作为补填候选，不写正式服务纪要", meta: "DCM-65", tone: "green" },
  { title: "正式来源预检", note: "ServiceNote、CustomerPreference 和 12 小时提醒发送链路仍未发现正式来源", meta: "DCM-68", tone: "amber" },
  { title: "正式模型方案", note: "ServiceNote、CustomerPreference、只读 API 和写入边界已设计，等待建表确认", meta: "DCM-72", tone: "blue" },
  { title: "建表前评审", note: "字段命名、枚举、索引、权限、回滚和影子表决策已整理", meta: "DCM-76", tone: "blue" },
  { title: "迁移接口草案", note: "Prisma 模型草案、只读 controller 草案、灰度回退和执行前清单已整理", meta: "DCM-80", tone: "blue" },
  { title: "本地草案文件", note: "schema、SQL、只读接口草案和 Go/No-Go 清单已成包，等待审阅", meta: "DCM-84", tone: "blue" },
  { title: "正式只读源码", note: "本地 schema、migration 文件和只读 GET 接口源码已生成，等待迁移确认", meta: "DCM-88", tone: "blue" },
  { title: "前端只读接入", note: "客户详情页已并行读取正式服务纪要和客户偏好，失败时继续回退", meta: "DCM-92", tone: "blue" },
  { title: "dry-run readiness", note: "本地影子只读 readiness 脚本已建立，先验条件不执行迁移", meta: "DCM-96", tone: "blue" },
  { title: "dry-run 计划", note: "本地迁移 dry-run 计划器已建立，列出步骤、停止条件和确认项", meta: "DCM-100", tone: "blue" },
  { title: "高风险只读入口", note: "资金凭证、结算审批、财务协作和会议纪要 GET-only 占位已建立", meta: "DCM-104", tone: "blue" },
  { title: "高风险来源映射", note: "只读扫描现有模型和接口，确认可映射来源与专用模型缺口", meta: "DCM-108", tone: "amber" },
  { title: "凭证会议只读", note: "evidence-assets 和 meeting-notes 已接入现有模型只读映射", meta: "DCM-112", tone: "blue" },
  { title: "凭证会议前端", note: "evidence 和 communication 页面已接只读 fetch/adapters，保持 mock 回退和写动作关闭", meta: "DCM-116", tone: "blue" },
  { title: "项目沟通只读", note: "project-communications 已接入 MeetingMinutesRecord 映射，communication 页面可消费展示", meta: "DCM-120", tone: "blue" },
  { title: "资金模型草案", note: "充值、结算草稿和耗卡审批 review-only 草案已成包，不进入 schema 或 migration", meta: "DCM-124", tone: "blue" },
  { title: "财务模型草案", note: "财务汇总、凭证异常和奖金报销 review-only 草案已成包，不进入 schema 或 migration", meta: "DCM-128", tone: "blue" },
  { title: "财务审阅前置", note: "确认矩阵、只读契约、页面验收和 Go/No-Go review-only 审阅包已成包", meta: "DCM-132", tone: "blue" },
  { title: "财务只读源码计划", note: "目标文件、验证计划和只读计划器已成包，不修改真实源码或数据库", meta: "DCM-136", tone: "blue" },
  { title: "财务只读源码", note: "财务三件套 schema、migration 文件、后端 findMany 映射和前端只读回退已接入，仍不运行迁移", meta: "DCM-140", tone: "blue" },
  { title: "资金只读源码", note: "资金三件套 schema、migration 文件、后端 findMany 映射和前端只读回退已接入，仍不运行迁移", meta: "DCM-144", tone: "blue" },
  { title: "只读验收收口", note: "新增验收器和结果文档，灰页标识推进到 DCM-148，仍不运行迁移、不写库、不切正式入口", meta: "DCM-148", tone: "blue" },
  { title: "剩余缺口契约", note: "预约详情、客户卡项余额、薪酬配置和 12 小时企业微信 dry-run 契约已成包，仍不进入真实写链路", meta: "DCM-152", tone: "blue" },
  { title: "预约详情只读源码", note: "GET-only 预约详情和前端按需读取已接入；改约、到店确认、结算提交和企业微信仍关闭", meta: "DCM-156", tone: "blue" },
  { title: "卡项余额只读预览", note: "客户卡项余额已接 GET-only 预览；开户、调账、扣卡、退款和流水写入仍关闭", meta: "DCM-160", tone: "blue" },
  { title: "薪酬配置只读来源", note: "compensation-rules 已接 GET-only 来源诊断；底薪、提点和福利配置仍不从薪资单反推", meta: "DCM-164", tone: "blue" },
  { title: "企微提醒 dry-run 源码", note: "wecom-reminder-dry-runs 已接 GET-only 12 小时提醒预览；通知创建、已发送标记和真实发送仍关闭", meta: "DCM-168", tone: "blue" },
];

export const managementStatuses: DaochongStatusItem[] = [
  { title: "项目设置", note: "服务项目、价格、时长和是否计提", status: "DCM-04", tone: "green" },
  { title: "成员权限", note: "道冲管理员由程程添加和管理", status: "DCM-03", tone: "blue" },
  { title: "提点奖金", note: "老师底薪、手工提点、推荐奖金和福利", status: "DCM-05", tone: "amber" },
  { title: "一期验收", note: "页面、角色、+ 创建入口和只读接口统一收口", status: "DCM-47", tone: "neutral" },
  { title: "接口接入", note: "低风险只读先接，高风险写动作继续关闭", status: "DCM-50", tone: "blue" },
];

export const memberRows: DaochongMoneyRow[] = [
  { label: "程程", note: "主理人，全权限管理道冲元气", value: "主理人" },
  { label: "慧心", note: "管理员，预约、客户、耗卡审批", value: "管理员" },
  { label: "燕子", note: "老师，本人日程、服务结算、纪要", value: "老师" },
];

export const memberPermissionStatuses: DaochongStatusItem[] = [
  { title: "新增管理员", note: "只有程程可添加道冲管理员，并指定可见入口", status: "程程", tone: "green" },
  { title: "权限变更", note: "预约、审批、客户、财务入口分开授权并留痕", status: "留痕", tone: "blue" },
  { title: "停用成员", note: "停用后保留历史服务、审批和工资记录", status: "保留", tone: "amber" },
];

export const permissionGroups: DaochongPermissionGroup[] = [
  {
    title: "预约与客户",
    note: "适合前台和管理员",
    items: ["查看班表", "添加预约", "客户档案"],
  },
  {
    title: "服务与审批",
    note: "适合老师和管理员",
    items: ["提交结算", "上传截图", "耗卡审批"],
  },
  {
    title: "财务与设置",
    note: "仅程程和财务",
    items: ["项目设置", "薪酬规则", "财务汇总"],
  },
];

export const projectRows: DaochongMoneyRow[] = [
  { label: "头疗深度调理", note: "90 分钟，可耗卡，手工提点 8%", value: "980" },
  { label: "经络放松", note: "60 分钟，可耗卡，手工提点 6%", value: "680" },
  { label: "香疗肩颈", note: "45 分钟，无卡客户需上传扣款截图", value: "398" },
];

export const projectStatuses: DaochongStatusItem[] = [
  { title: "价格生效", note: "调价需记录生效日期，旧预约保留原价", status: "可追溯", tone: "blue" },
  { title: "服务时长", note: "用于首页班表和预约冲突判断", status: "必填", tone: "green" },
  { title: "截图规则", note: "无充值客户必须上传扣款截图后才能确认服务", status: "强制", tone: "amber" },
];

export const projectFormFields: DaochongFormField[] = [
  { label: "服务项目名称", value: "头疗深度调理", helper: "展示在预约、结算和客户记录中。" },
  { label: "标准价格", value: "980 元", helper: "后续可支持活动价和手动折扣原因。" },
  { label: "服务时长", value: "90 分钟", helper: "用于班表占用和预约间隔。" },
  { label: "耗卡规则", value: "可耗卡，需程程或管理员审批", helper: "有卡客户走耗卡，无卡客户走截图。" },
];

export const compensationRows: DaochongMoneyRow[] = [
  { label: "慧心底薪", note: "每位老师独立填写，可按月调整", value: "5,000" },
  { label: "手工提点", note: "头疗 8%，经络 6%，香疗 5%", value: "规则" },
  { label: "推荐奖金", note: "结算时填写推荐人和奖金金额", value: "可选" },
  { label: "团队奖金", note: "程程从 + 号添加，写明原因和金额", value: "汇总" },
];

export const compensationStatuses: DaochongStatusItem[] = [
  { title: "底薪字段", note: "每个老师都需要一个可填写底薪的空格", status: "必填", tone: "green" },
  { title: "奖金福利", note: "团队奖金、福利和报销最后汇总给财务", status: "汇总", tone: "blue" },
  { title: "规则生效", note: "提点调整保留历史版本，避免影响已确认服务", status: "版本", tone: "amber" },
];

export const compensationFormFields: DaochongFormField[] = [
  { label: "老师", value: "慧心", helper: "选择老师后显示个人底薪和提点规则。" },
  { label: "本月底薪", value: "5,000 元", helper: "财务汇总工资时读取这个字段。" },
  { label: "手工提点", value: "头疗 8%，经络 6%，香疗 5%", helper: "按项目可单独覆盖。" },
  { label: "其他奖金福利", value: "团队奖金、推荐奖金、节日福利", helper: "由程程添加或财务复核。" },
];
