"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./CustomerWorkspacePreview.module.css";

type PreviewSegmentKey =
  | "todayPriority"
  | "quoteRisk"
  | "missingInfo"
  | "duplicate"
  | "maintenance"
  | "needSchedule";

type PreviewTone = "neutral" | "info" | "success" | "warning" | "danger";
type SortKey = "priority" | "recent" | "updated";

type GovernanceSignal = {
  label: string;
  tone: PreviewTone;
  detail: string;
};

type PreviewCustomer = {
  id: string;
  name: string;
  company: string;
  contact: string;
  owner: string;
  phone: string;
  region: string;
  stage: string;
  stageTone: PreviewTone;
  lastTouch: string;
  lastTouchRank: number;
  nextAction: string;
  amount: string;
  probability: number;
  priorityScore: number;
  quoteLabel: string;
  quoteTone: PreviewTone;
  scheduleLabel: string;
  scheduleTone: PreviewTone;
  updatedAt: string;
  updatedRank: number;
  filters: PreviewSegmentKey[];
  governanceSignals: GovernanceSignal[];
  missingFields: string[];
  duplicateHint?: string;
  maintenanceLabel: string;
  maintenanceTone: PreviewTone;
  reasonTitle: string;
  reasonDetail: string;
  summary: string;
  note: string;
  recommendedActions: string[];
};

type OwnerInsight = {
  owner: string;
  total: number;
  todayPriority: number;
  quoteRisk: number;
  missingInfo: number;
  duplicate: number;
  maintenance: number;
  score: number;
};

const segments: Array<{
  key: PreviewSegmentKey;
  label: string;
  helper: string;
}> = [
  { key: "todayPriority", label: "今日待推进", helper: "先处理今天最值得动的客户" },
  { key: "quoteRisk", label: "报价未回", helper: "优先拉回已经失温的报价" },
  { key: "missingInfo", label: "待补资料", helper: "先补齐会卡住推进的缺口" },
  { key: "duplicate", label: "可能重复", helper: "先发现再决定是否进入合并流" },
  { key: "maintenance", label: "待维护归属", helper: "负责人保护期问题要提前露出" },
  { key: "needSchedule", label: "需排日程", helper: "机会存在，但动作还没落到日历" },
];

const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: "priority", label: "治理优先级" },
  { value: "recent", label: "最近互动" },
  { value: "updated", label: "最近更新" },
];

const previewCustomers: PreviewCustomer[] = [
  {
    id: "c-1",
    name: "一心回乡",
    company: "回乡甄品渠道部",
    contact: "林安安",
    owner: "admin",
    phone: "138 0024 1188",
    region: "北京 / 朝阳",
    stage: "合作推进",
    stageTone: "success",
    lastTouch: "今天 09:20",
    lastTouchRank: 8,
    nextAction: "确认合作范围，并锁本周复盘会时间",
    amount: "¥186,000",
    probability: 82,
    priorityScore: 94,
    quoteLabel: "已报价",
    quoteTone: "success",
    scheduleLabel: "待排日程",
    scheduleTone: "warning",
    updatedAt: "今天 11:10",
    updatedRank: 8,
    filters: ["todayPriority", "needSchedule"],
    governanceSignals: [
      { label: "需排日程", tone: "warning", detail: "已有下一步动作，但还没锁下次会议" },
      { label: "今日优先", tone: "success", detail: "高意向且临近收口，适合今天推进" },
    ],
    missingFields: [],
    maintenanceLabel: "保护中",
    maintenanceTone: "success",
    reasonTitle: "高意向客户已经热起来了，但动作还没真正落地。",
    reasonDetail:
      "这类客户不是资料问题，而是推进动作还停留在口头确认。测试页把它明确放进“需排日程”队列，避免高意向机会被拖冷。",
    summary: "客户已认可方案方向，现在卡在合作边界和首批排期确认。",
    note: "这类客户要先补日程，不要急着再堆更多说明。",
    recommendedActions: [
      "今天锁定复盘会时间，并写进日程。",
      "补一条会议纪要，避免口头确认失真。",
      "如果范围确认，直接进入报价收口。",
    ],
  },
  {
    id: "c-2",
    name: "远辰渠道集团",
    company: "远辰健康渠道",
    contact: "刘思远",
    owner: "李昊",
    phone: "139 8801 6609",
    region: "杭州 / 余杭",
    stage: "报价后等待",
    stageTone: "warning",
    lastTouch: "04/17 11:10",
    lastTouchRank: 3,
    nextAction: "今天补电话，确认内部推进负责人",
    amount: "¥92,400",
    probability: 74,
    priorityScore: 96,
    quoteLabel: "报价未回",
    quoteTone: "danger",
    scheduleLabel: "已排跟进",
    scheduleTone: "success",
    updatedAt: "04/18 09:45",
    updatedRank: 3,
    filters: ["todayPriority", "quoteRisk", "duplicate"],
    governanceSignals: [
      { label: "报价未回", tone: "danger", detail: "报价已发出 6 天，当前最怕继续失温" },
      { label: "疑似重复", tone: "warning", detail: "手机号与另一条客户记录重复" },
    ],
    missingFields: [],
    duplicateHint: "与“远辰健康渠道（上海）”手机号相同，需人工确认是否同一客户池。",
    maintenanceLabel: "保护中",
    maintenanceTone: "success",
    reasonTitle: "这是典型的业务风险客户，不只要跟，还要先排除重复建档。",
    reasonDetail:
      "如果它和另一条上海记录属于同一客户，继续分头跟会让报价和后续归属都变得混乱。治理版会把这个风险直接露出来。",
    summary: "报价发出后已 6 天未收到实质反馈，竞争对手切入风险在升高。",
    note: "这类客户不能只看成交机会，也要同步看记录结构是否干净。",
    recommendedActions: [
      "先核对是否与上海记录属于同一客户主体。",
      "确认归属无误后，再补电话拉回报价反馈。",
      "如果客户已有推进人，更新下一步责任人。",
    ],
  },
  {
    id: "c-3",
    name: "远辰健康渠道（上海）",
    company: "远辰健康渠道上海办",
    contact: "联系人待补",
    owner: "王潇",
    phone: "139 8801 6609",
    region: "上海 / 徐汇",
    stage: "资料待补",
    stageTone: "neutral",
    lastTouch: "04/19 15:30",
    lastTouchRank: 4,
    nextAction: "先确认主体，再决定是否沿用现有报价脉络",
    amount: "¥68,000",
    probability: 51,
    priorityScore: 79,
    quoteLabel: "未报价",
    quoteTone: "neutral",
    scheduleLabel: "未排日程",
    scheduleTone: "neutral",
    updatedAt: "04/19 15:48",
    updatedRank: 4,
    filters: ["missingInfo", "duplicate"],
    governanceSignals: [
      { label: "待补资料", tone: "warning", detail: "联系人缺失，后续推进容易断链" },
      { label: "疑似重复", tone: "warning", detail: "与杭州记录手机号完全一致" },
    ],
    missingFields: ["联系人"],
    duplicateHint: "大概率属于同一条渠道客户，需要先确认主记录。",
    maintenanceLabel: "保护中",
    maintenanceTone: "success",
    reasonTitle: "这条记录的重点不是立刻推进，而是先清理结构。",
    reasonDetail:
      "如果不先确认主记录和联系人，这条客户即使继续推进，也会把后面的报价、任务和归属越做越散。",
    summary: "客户线索还在，但当前最大的缺口是主体和联系人信息不够稳定。",
    note: "治理版要让这类记录先被看见，再决定推进还是并回主记录。",
    recommendedActions: [
      "先补联系人，再确认是否与杭州记录重复。",
      "若重复，标记待合并，不在这条记录单独起报价。",
      "若不重复，再重新安排跟进节奏。",
    ],
  },
  {
    id: "c-4",
    name: "诚安医养服务",
    company: "诚安医养",
    contact: "赵青",
    owner: "王潇",
    phone: "136 6602 7711",
    region: "苏州 / 园区",
    stage: "资料待补",
    stageTone: "neutral",
    lastTouch: "昨天 10:25",
    lastTouchRank: 6,
    nextAction: "补录互动纪要，并明确下一步责任动作",
    amount: "¥53,000",
    probability: 41,
    priorityScore: 83,
    quoteLabel: "未报价",
    quoteTone: "neutral",
    scheduleLabel: "未排日程",
    scheduleTone: "neutral",
    updatedAt: "昨天 11:30",
    updatedRank: 6,
    filters: ["todayPriority", "missingInfo"],
    governanceSignals: [
      { label: "待补资料", tone: "warning", detail: "下一步动作未明确，推进容易中断" },
      { label: "今日优先", tone: "info", detail: "业务并没停，但系统里缺关键落点" },
    ],
    missingFields: ["下一步动作", "合作方向"],
    maintenanceLabel: "保护中",
    maintenanceTone: "success",
    reasonTitle: "这条客户不一定差，只是系统还没把推进动作接住。",
    reasonDetail:
      "治理版会把“待补资料”直接并入主工作台，让业务补资料和推进客户发生在同一个界面，而不是来回跳。",
    summary: "业务有推进意愿，但当前系统里缺少下一步动作和合作方向。",
    note: "这类客户需要先把资料补齐，再进入正常节奏，而不是继续裸推进。",
    recommendedActions: [
      "补一条完整互动纪要。",
      "明确下一步动作与合作方向。",
      "确认后再决定是否排入本周报价。",
    ],
  },
  {
    id: "c-5",
    name: "北川合作社",
    company: "北川农服",
    contact: "陈良",
    owner: "周宁",
    phone: "150 3211 0027",
    region: "绵阳 / 北川",
    stage: "报价后等待",
    stageTone: "warning",
    lastTouch: "04/14 15:32",
    lastTouchRank: 1,
    nextAction: "确认采购窗口，避免竞争对手先锁单",
    amount: "¥118,600",
    probability: 67,
    priorityScore: 92,
    quoteLabel: "报价未回",
    quoteTone: "danger",
    scheduleLabel: "待排复盘",
    scheduleTone: "warning",
    updatedAt: "04/15 10:15",
    updatedRank: 1,
    filters: ["quoteRisk", "maintenance", "needSchedule"],
    governanceSignals: [
      { label: "报价未回", tone: "danger", detail: "已超过 7 天未互动，温度明显下降" },
      { label: "待维护", tone: "warning", detail: "负责人保护期进入待维护状态" },
    ],
    missingFields: [],
    maintenanceLabel: "待维护",
    maintenanceTone: "warning",
    reasonTitle: "这是风险叠加客户，报价风险和归属维护问题叠在一起。",
    reasonDetail:
      "如果继续只把它当成普通报价未回来看，会忽略负责人保护期即将失效的问题。治理版把这两件事放在一起判断。",
    summary: "客户仍在采购窗口内，但如果这一周不主动拉回，机会会继续冷却。",
    note: "这类客户必须同时看业务风险和负责人归属风险。",
    recommendedActions: [
      "今天先补联系，确认采购窗口是否还在。",
      "同步补一条维护动作，避免负责人状态继续下滑。",
      "若客户仍有机会，立即排入复盘日程。",
    ],
  },
  {
    id: "c-6",
    name: "锦禾健康",
    company: "锦禾生物",
    contact: "顾予安",
    owner: "admin",
    phone: "188 1120 6128",
    region: "深圳 / 南山",
    stage: "高意向",
    stageTone: "success",
    lastTouch: "昨天 18:08",
    lastTouchRank: 5,
    nextAction: "补齐决策链，并锁下周一商务对接",
    amount: "¥264,000",
    probability: 91,
    priorityScore: 88,
    quoteLabel: "已报价",
    quoteTone: "success",
    scheduleLabel: "已排商务会",
    scheduleTone: "success",
    updatedAt: "昨天 18:36",
    updatedRank: 5,
    filters: ["maintenance"],
    governanceSignals: [
      { label: "待维护", tone: "warning", detail: "负责人保护期已进入维护窗口" },
      { label: "高意向", tone: "success", detail: "客户机会高，但别让归属状态掉链子" },
    ],
    missingFields: [],
    maintenanceLabel: "待维护",
    maintenanceTone: "warning",
    reasonTitle: "这条客户说明一个问题：高意向不代表治理上就安全。",
    reasonDetail:
      "即使业务推进得不错，如果负责人保护期没有得到维护，后面仍会对客户归属和团队协作造成影响。",
    summary: "客户预算已释放，当前更像组织协调问题，而不是需求教育。",
    note: "治理版要让“业务很好但归属有风险”的客户也能被快速扫出来。",
    recommendedActions: [
      "补一条最新推进记录，刷新维护状态。",
      "确认商务会责任人是否一致。",
      "高意向客户尽量避免在归属问题上反复。",
    ],
  },
  {
    id: "c-7",
    name: "华穗示范农场",
    company: "华穗农业科技",
    contact: "邵雨荷",
    owner: "admin",
    phone: "135 1008 2331",
    region: "成都 / 双流",
    stage: "合作推进",
    stageTone: "success",
    lastTouch: "今天 10:15",
    lastTouchRank: 9,
    nextAction: "发简版排期，并锁下周线下面谈",
    amount: "¥186,000",
    probability: 88,
    priorityScore: 91,
    quoteLabel: "二次报价",
    quoteTone: "success",
    scheduleLabel: "已排面谈",
    scheduleTone: "success",
    updatedAt: "今天 10:50",
    updatedRank: 9,
    filters: ["todayPriority"],
    governanceSignals: [
      { label: "今日优先", tone: "success", detail: "接近成交，今天推进最有价值" },
    ],
    missingFields: [],
    maintenanceLabel: "保护中",
    maintenanceTone: "success",
    reasonTitle: "这是标准的推进型客户，用来对比治理型客户最合适。",
    reasonDetail:
      "治理版不是把所有客户都做成问题列表，而是让推进型和治理型客户在同一张表里被看清楚，避免工作台失衡。",
    summary: "客户采购窗口已经明确，只差把交付时间讲得更短更清楚。",
    note: "这类客户应该保留推进效率，不要被治理噪音打断。",
    recommendedActions: [
      "继续推进二次报价后的收口节奏。",
      "确认线下面谈议程。",
      "若面谈确认无误，准备转报价详情页收单。",
    ],
  },
  {
    id: "c-8",
    name: "沈灵钰",
    company: "智农生活方式店",
    contact: "沈灵钰",
    owner: "陈雅萍",
    phone: "137 2290 6600",
    region: "上海 / 普陀",
    stage: "已联系",
    stageTone: "info",
    lastTouch: "04/18 16:40",
    lastTouchRank: 2,
    nextAction: "补齐需求纪要，再决定是否进入报价",
    amount: "¥53,000",
    probability: 35,
    priorityScore: 74,
    quoteLabel: "未报价",
    quoteTone: "neutral",
    scheduleLabel: "待排需求访谈",
    scheduleTone: "warning",
    updatedAt: "04/18 17:05",
    updatedRank: 2,
    filters: ["needSchedule", "missingInfo"],
    governanceSignals: [
      { label: "待补资料", tone: "warning", detail: "需求纪要不完整，难以进入报价" },
      { label: "需排日程", tone: "info", detail: "下次需求访谈还没真正排进日历" },
    ],
    missingFields: ["需求纪要"],
    maintenanceLabel: "保护中",
    maintenanceTone: "success",
    reasonTitle: "这类客户常常不是没机会，而是因为信息和动作都不够完整。",
    reasonDetail:
      "治理版会把“待补资料”和“需排日程”同时露出来，让业务知道先补内容，还是先锁时间，而不是只看阶段。",
    summary: "客户仍在观察期，真正的问题是需求信息和下一次动作都还不完整。",
    note: "这类客户如果不在表格里被清楚标记，很容易长期悬空。",
    recommendedActions: [
      "补齐需求纪要里的关键问题。",
      "锁下一次需求访谈时间。",
      "完成后再判断是否进入报价。",
    ],
  },
];

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function ToneBadge({
  tone,
  children,
}: {
  tone: PreviewTone;
  children: string;
}) {
  return (
    <span
      className={cx(
        styles.badge,
        styles[`badge${tone[0].toUpperCase()}${tone.slice(1)}`],
      )}
    >
      {children}
    </span>
  );
}

export function CustomerWorkspacePreview() {
  const [activeSegment, setActiveSegment] =
    useState<PreviewSegmentKey>("todayPriority");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    previewCustomers[0]?.id ?? null,
  );
  const [searchKeyword, setSearchKeyword] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("priority");

  const ownerOptions = useMemo(
    () => Array.from(new Set(previewCustomers.map((customer) => customer.owner))),
    [],
  );
  const stageOptions = useMemo(
    () => Array.from(new Set(previewCustomers.map((customer) => customer.stage))),
    [],
  );

  const segmentCounts = useMemo(
    () =>
      Object.fromEntries(
        segments.map((segment) => [
          segment.key,
          previewCustomers.filter((customer) =>
            customer.filters.includes(segment.key),
          ).length,
        ]),
      ) as Record<PreviewSegmentKey, number>,
    [],
  );

  const topMetrics = useMemo(
    () => ({
      todayPriority: previewCustomers.filter((customer) =>
        customer.filters.includes("todayPriority"),
      ).length,
      missingInfo: previewCustomers.filter((customer) =>
        customer.filters.includes("missingInfo"),
      ).length,
      duplicate: previewCustomers.filter((customer) =>
        customer.filters.includes("duplicate"),
      ).length,
      maintenance: previewCustomers.filter((customer) =>
        customer.filters.includes("maintenance"),
      ).length,
    }),
    [],
  );

  const ownerInsights = useMemo(() => {
    const insights = new Map<string, OwnerInsight>();

    for (const customer of previewCustomers) {
      const current = insights.get(customer.owner) ?? {
        owner: customer.owner,
        total: 0,
        todayPriority: 0,
        quoteRisk: 0,
        missingInfo: 0,
        duplicate: 0,
        maintenance: 0,
        score: 0,
      };

      current.total += 1;
      current.todayPriority += Number(customer.filters.includes("todayPriority"));
      current.quoteRisk += Number(customer.filters.includes("quoteRisk"));
      current.missingInfo += Number(customer.filters.includes("missingInfo"));
      current.duplicate += Number(customer.filters.includes("duplicate"));
      current.maintenance += Number(customer.filters.includes("maintenance"));
      current.score =
        current.todayPriority * 3 +
        current.quoteRisk * 3 +
        current.missingInfo * 2 +
        current.duplicate * 2 +
        current.maintenance * 2;

      insights.set(customer.owner, current);
    }

    return Array.from(insights.values()).sort(
      (left, right) =>
        right.score - left.score || right.total - left.total || left.owner.localeCompare(right.owner),
    );
  }, []);

  const ownerInsightMap = useMemo(
    () => new Map(ownerInsights.map((item) => [item.owner, item])),
    [ownerInsights],
  );

  const visibleCustomers = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return [...previewCustomers]
      .filter((customer) => customer.filters.includes(activeSegment))
      .filter((customer) =>
        keyword
          ? [
              customer.name,
              customer.company,
              customer.contact,
              customer.owner,
              customer.phone,
              customer.nextAction,
              customer.governanceSignals.map((signal) => signal.label).join(" "),
              customer.governanceSignals.map((signal) => signal.detail).join(" "),
            ]
              .join(" ")
              .toLowerCase()
              .includes(keyword)
          : true,
      )
      .filter((customer) => (ownerFilter ? customer.owner === ownerFilter : true))
      .filter((customer) => (stageFilter ? customer.stage === stageFilter : true))
      .sort((left, right) => {
        switch (sortBy) {
          case "recent":
            return (
              right.lastTouchRank - left.lastTouchRank ||
              right.priorityScore - left.priorityScore
            );
          case "updated":
            return (
              right.updatedRank - left.updatedRank ||
              right.priorityScore - left.priorityScore
            );
          case "priority":
          default:
            return (
              right.priorityScore - left.priorityScore ||
              right.lastTouchRank - left.lastTouchRank
            );
        }
      });
  }, [activeSegment, ownerFilter, searchKeyword, sortBy, stageFilter]);

  useEffect(() => {
    if (!visibleCustomers.length) {
      setSelectedCustomerId(null);
      return;
    }

    const hasSelected = visibleCustomers.some(
      (customer) => customer.id === selectedCustomerId,
    );
    if (!hasSelected) {
      setSelectedCustomerId(visibleCustomers[0].id);
    }
  }, [selectedCustomerId, visibleCustomers]);

  const selectedCustomer =
    visibleCustomers.find((customer) => customer.id === selectedCustomerId) ??
    visibleCustomers[0] ??
    null;

  const selectedSegment =
    segments.find((segment) => segment.key === activeSegment) ?? null;

  const selectedOwnerInsight = selectedCustomer
    ? ownerInsightMap.get(selectedCustomer.owner)
    : null;

  return (
    <div className={styles.previewPage}>
      <section className={styles.commandDeck}>
        <div className={styles.commandCopy}>
          <span className={styles.eyebrow}>Customers governance preview</span>
          <h1>客户池治理测试页</h1>
          <p>
            这版不推翻正式页骨架，只把客户页从“能找客户”升级成“能治理客户池”。
            重点验证的是：业务机会、资料缺口、重复风险、负责人维护，能不能在同一张表里被快速看清楚。
          </p>
        </div>

        <div className={styles.commandMeta}>
          <div className={styles.metaList}>
            <div>
              <span>这版主目标</span>
              <strong>把推进客户和治理客户放进同一工作台</strong>
            </div>
            <div>
              <span>重点保留</span>
              <strong>表格主列表 + 右侧固定处置栏</strong>
            </div>
            <div>
              <span>这版不做</span>
              <strong>正式客户合并流，先只做提醒与治理入口</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.metricStrip}>
        <article className={styles.metricItem}>
          <span>今日先推进</span>
          <strong>{topMetrics.todayPriority}</strong>
          <p>把今天最值得处理的客户先捞出来</p>
        </article>
        <article className={styles.metricItem}>
          <span>待补资料</span>
          <strong>{topMetrics.missingInfo}</strong>
          <p>推进前会卡住的资料缺口</p>
        </article>
        <article className={styles.metricItem}>
          <span>可能重复</span>
          <strong>{topMetrics.duplicate}</strong>
          <p>先发现主记录，再决定是否合并</p>
        </article>
        <article className={styles.metricItem}>
          <span>待维护归属</span>
          <strong>{topMetrics.maintenance}</strong>
          <p>负责人保护期问题提前露出</p>
        </article>
      </section>

      <section className={styles.loadPanel}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionEyebrow}>负责人负载观察</span>
            <strong>先做轻量盘点，不先做复杂分配</strong>
            <p>让管理者先看谁手里压着最多待推进、待维护或结构待清理的客户。</p>
          </div>
        </div>

        <div className={styles.loadCards}>
          {ownerInsights.slice(0, 3).map((item) => (
            <article className={styles.loadCard} key={item.owner}>
              <div className={styles.loadCardHeader}>
                <strong>{item.owner}</strong>
                <span>{item.total} 位客户</span>
              </div>
              <div className={styles.loadMeta}>
                <span>今日待推进 {item.todayPriority}</span>
                <span>报价风险 {item.quoteRisk}</span>
                <span>待补资料 {item.missingInfo}</span>
                <span>待维护 {item.maintenance}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.workspace}>
        <div className={styles.mainColumn}>
          <section className={styles.segmentPanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>治理队列</span>
                <strong>{selectedSegment?.label ?? "客户池治理"}</strong>
                <p>
                  {selectedSegment?.helper ??
                    "先切治理队列，再用搜索与筛选缩窄结果。"}
                </p>
              </div>
            </div>

            <div className={styles.segmentTabs}>
              {segments.map((segment) => (
                <button
                  className={cx(
                    styles.segmentTab,
                    activeSegment === segment.key && styles.segmentTabActive,
                  )}
                  key={segment.key}
                  onClick={() => setActiveSegment(segment.key)}
                  type="button"
                >
                  <span>{segment.label}</span>
                  <strong>{String(segmentCounts[segment.key])}</strong>
                  <small>{segment.helper}</small>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.tablePanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>主表格</span>
                <strong>先扫表，再选中，最后在右侧处置</strong>
                <p>客户页继续保持高密度，但每一行都能直接露出治理信号，不再只看业务阶段。</p>
              </div>
              <div className={styles.resultMeta}>
                <strong>{visibleCustomers.length}</strong>
                <span>当前匹配客户</span>
              </div>
            </div>

            <div className={styles.filterBar}>
              <label className={styles.field}>
                <span>搜索</span>
                <input
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="搜索客户名 / 公司 / 联系人 / 电话 / 治理信号"
                  value={searchKeyword}
                />
              </label>

              <label className={styles.field}>
                <span>负责人</span>
                <select
                  onChange={(event) => setOwnerFilter(event.target.value)}
                  value={ownerFilter}
                >
                  <option value="">全部负责人</option>
                  {ownerOptions.map((owner) => (
                    <option key={owner} value={owner}>
                      {owner}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>阶段</span>
                <select
                  onChange={(event) => setStageFilter(event.target.value)}
                  value={stageFilter}
                >
                  <option value="">全部阶段</option>
                  {stageOptions.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.sortBar}>
                <span>排序</span>
                <div className={styles.sortButtons}>
                  {sortOptions.map((option) => (
                    <button
                      className={cx(
                        styles.sortButton,
                        sortBy === option.value && styles.sortButtonActive,
                      )}
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.customerTable}>
                <thead>
                  <tr>
                    <th>客户 / 公司</th>
                    <th>阶段</th>
                    <th>治理信号</th>
                    <th>负责人</th>
                    <th>最近互动</th>
                    <th>下一步</th>
                    <th>报价 / 日程</th>
                    <th>更新时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCustomers.length ? (
                    visibleCustomers.map((customer) => {
                      const ownerInsight = ownerInsightMap.get(customer.owner);
                      const hiddenSignals = Math.max(
                        customer.governanceSignals.length - 2,
                        0,
                      );

                      return (
                        <tr
                          className={cx(
                            styles.tableRow,
                            selectedCustomer?.id === customer.id &&
                              styles.tableRowActive,
                          )}
                          key={customer.id}
                          onClick={() => setSelectedCustomerId(customer.id)}
                        >
                          <td>
                            <div className={styles.customerCell}>
                              <strong>{customer.name}</strong>
                              <span>{customer.company}</span>
                              <small>
                                {customer.contact} · {customer.phone} · {customer.region}
                              </small>
                            </div>
                          </td>
                          <td>
                            <ToneBadge tone={customer.stageTone}>
                              {customer.stage}
                            </ToneBadge>
                          </td>
                          <td>
                            <div className={styles.signalStack}>
                              <div className={styles.badgeGroup}>
                                {customer.governanceSignals
                                  .slice(0, 2)
                                  .map((signal) => (
                                    <ToneBadge key={signal.label} tone={signal.tone}>
                                      {signal.label}
                                    </ToneBadge>
                                  ))}
                                {hiddenSignals ? (
                                  <span className={styles.moreSignal}>
                                    +{hiddenSignals} 项
                                  </span>
                                ) : null}
                              </div>
                              <small className={styles.signalText}>
                                {customer.governanceSignals[0]?.detail}
                              </small>
                            </div>
                          </td>
                          <td>
                            <div className={styles.ownerCell}>
                              <strong>{customer.owner}</strong>
                              <span>
                                待推进 {ownerInsight?.todayPriority ?? 0} · 待维护{" "}
                                {ownerInsight?.maintenance ?? 0}
                              </span>
                            </div>
                          </td>
                          <td>{customer.lastTouch}</td>
                          <td className={styles.nextActionCell}>
                            {customer.nextAction}
                          </td>
                          <td>
                            <div className={styles.stateStack}>
                              <ToneBadge tone={customer.quoteTone}>
                                {customer.quoteLabel}
                              </ToneBadge>
                              <ToneBadge tone={customer.scheduleTone}>
                                {customer.scheduleLabel}
                              </ToneBadge>
                            </div>
                          </td>
                          <td>{customer.updatedAt}</td>
                          <td>
                            <div
                              className={styles.tableActions}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button className={styles.inlineAction} type="button">
                                处置
                              </button>
                              <button className={styles.inlineActionGhost} type="button">
                                详情
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className={styles.emptyState} colSpan={9}>
                        当前筛选条件下没有匹配客户，建议切换治理队列或清空搜索后再看。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className={styles.sideRail}>
          <section className={styles.inspectorPanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>当前处置面板</span>
                <strong>{selectedCustomer?.name ?? "请选择客户"}</strong>
                <p>右侧不讲长篇故事，只回答这条客户现在该怎么处理。</p>
              </div>
            </div>

            {selectedCustomer ? (
              <div className={styles.inspectorBody}>
                <div className={styles.inspectorSummary}>
                  <div className={styles.badgeGroup}>
                    <ToneBadge tone={selectedCustomer.stageTone}>
                      {selectedCustomer.stage}
                    </ToneBadge>
                    <ToneBadge tone={selectedCustomer.quoteTone}>
                      {selectedCustomer.quoteLabel}
                    </ToneBadge>
                    <ToneBadge tone={selectedCustomer.maintenanceTone}>
                      {selectedCustomer.maintenanceLabel}
                    </ToneBadge>
                  </div>
                  <strong className={styles.summaryTitle}>
                    {selectedCustomer.reasonTitle}
                  </strong>
                  <p>{selectedCustomer.reasonDetail}</p>
                </div>

                <div className={styles.detailGrid}>
                  <article>
                    <span>公司</span>
                    <strong>{selectedCustomer.company}</strong>
                  </article>
                  <article>
                    <span>联系人</span>
                    <strong>
                      {selectedCustomer.contact} · {selectedCustomer.phone}
                    </strong>
                  </article>
                  <article>
                    <span>负责人负载</span>
                    <strong>
                      {selectedCustomer.owner} · 待推进{" "}
                      {selectedOwnerInsight?.todayPriority ?? 0} 条
                    </strong>
                  </article>
                  <article>
                    <span>最近互动</span>
                    <strong>{selectedCustomer.lastTouch}</strong>
                  </article>
                  <article>
                    <span>下一步</span>
                    <strong>{selectedCustomer.nextAction}</strong>
                  </article>
                  <article>
                    <span>预估金额</span>
                    <strong>{selectedCustomer.amount}</strong>
                  </article>
                </div>

                <div className={styles.governancePanel}>
                  <div className={styles.panelTitleRow}>
                    <span className={styles.sectionEyebrow}>当前治理项</span>
                  </div>

                  <div className={styles.governanceList}>
                    <article className={styles.issueItem}>
                      <ToneBadge
                        tone={
                          selectedCustomer.missingFields.length
                            ? "warning"
                            : "success"
                        }
                      >
                        {selectedCustomer.missingFields.length
                          ? "待补资料"
                          : "资料完整"}
                      </ToneBadge>
                      <div className={styles.issueCopy}>
                        <strong>
                          {selectedCustomer.missingFields.length
                            ? selectedCustomer.missingFields.join("、")
                            : "当前资料结构完整"}
                        </strong>
                        <span>先看资料是否足够支撑后续推进。</span>
                      </div>
                    </article>

                    <article className={styles.issueItem}>
                      <ToneBadge
                        tone={selectedCustomer.duplicateHint ? "warning" : "success"}
                      >
                        {selectedCustomer.duplicateHint ? "可能重复" : "无重复提醒"}
                      </ToneBadge>
                      <div className={styles.issueCopy}>
                        <strong>
                          {selectedCustomer.duplicateHint ??
                            "当前没有明显的重复建档风险。"}
                        </strong>
                        <span>第一版只做提醒，不在这里直接执行合并。</span>
                      </div>
                    </article>

                    <article className={styles.issueItem}>
                      <ToneBadge tone={selectedCustomer.maintenanceTone}>
                        {selectedCustomer.maintenanceLabel}
                      </ToneBadge>
                      <div className={styles.issueCopy}>
                        <strong>
                          {selectedCustomer.maintenanceLabel === "待维护"
                            ? "负责人保护期已经进入维护窗口"
                            : "当前负责人归属稳定"}
                        </strong>
                        <span>把归属风险和业务推进风险放在一起判断。</span>
                      </div>
                    </article>

                    <article className={styles.issueItem}>
                      <ToneBadge tone={selectedCustomer.scheduleTone}>
                        {selectedCustomer.scheduleLabel}
                      </ToneBadge>
                      <div className={styles.issueCopy}>
                        <strong>{selectedCustomer.summary}</strong>
                        <span>{selectedCustomer.note}</span>
                      </div>
                    </article>
                  </div>
                </div>

                <div className={styles.actionSequence}>
                  <div className={styles.panelTitleRow}>
                    <span className={styles.sectionEyebrow}>建议动作顺序</span>
                  </div>
                  <ol className={styles.actionList}>
                    {selectedCustomer.recommendedActions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ol>
                </div>

                <div className={styles.inspectorActions}>
                  <button className="button inline" type="button">
                    补资料
                  </button>
                  <button className="button secondary inline" type="button">
                    记录互动
                  </button>
                  <button className="button ghost inline" type="button">
                    加入日程
                  </button>
                  <button className="button ghost inline" type="button">
                    发起报价
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>先在左侧治理表格里选择一位客户。</div>
            )}
          </section>

          <section className={styles.notePanel}>
            <div className={styles.panelTitleRow}>
              <span className={styles.sectionEyebrow}>这版确认点</span>
            </div>
            <ul className={styles.noteList}>
              <li>正式页骨架不推翻，仍然是表格主列表加右侧处置栏。</li>
              <li>新增的不是花哨卡片，而是治理信号和治理队列。</li>
              <li>客户合并继续放到 V2，这版只先把风险露出来。</li>
            </ul>
          </section>
        </aside>
      </section>
    </div>
  );
}
