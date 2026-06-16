"use client";

import { useMemo, useState } from "react";
import styles from "./OrdersWorkspacePreview.module.css";

type PreviewLaneKey = "payment" | "shipment" | "settlement";
type PreviewTone = "neutral" | "success" | "warning" | "danger";

type PreviewOrder = {
  id: string;
  orderNo: string;
  customer: string;
  owner: string;
  lane: PreviewLaneKey;
  status: string;
  tone: PreviewTone;
  receivable: string;
  warehouse: string;
  partner: string;
  summary: string;
  nextAction: string;
  updatedAt: string;
  blocker: string;
  timeline: Array<{ label: string; value: string }>;
};

const laneOptions: Array<{
  key: PreviewLaneKey;
  label: string;
  helper: string;
  count: string;
}> = [
  {
    key: "payment",
    label: "待收款",
    helper: "优先处理已经接近确认的订单",
    count: "06",
  },
  {
    key: "shipment",
    label: "待发货",
    helper: "今天要先释放仓配和物流动作",
    count: "04",
  },
  {
    key: "settlement",
    label: "待结算",
    helper: "避免渠道利润和回款信息继续堆积",
    count: "03",
  },
];

const fulfillmentTracks = [
  {
    label: "收款节奏",
    value: "06",
    title: "先清今天最接近到账的订单",
    note: "已经确认金额但还没登记入账的单据，不该埋在长表格里。",
    tone: "warning" as const,
  },
  {
    label: "发货安排",
    value: "04",
    title: "先处理仓配信息已齐的单",
    note: "收货信息完整、库存可发的订单，今天应该直接推进到出库。",
    tone: "success" as const,
  },
  {
    label: "渠道结算",
    value: "03",
    title: "卡在结算的单要单独盯",
    note: "合作渠道的利润、现金补差和结算周期，应该成为单独泳道。",
    tone: "danger" as const,
  },
];

const operationalMetrics = [
  { label: "订单总量", value: "128", helper: "本月已进入履约链路的订单" },
  { label: "待收款金额", value: "¥482k", helper: "优先影响现金流的部分" },
  { label: "今日待发货", value: "09", helper: "已具备发货条件的订单" },
  { label: "待结算利润", value: "¥96k", helper: "渠道侧仍未完成核销" },
];

const previewOrders: PreviewOrder[] = [
  {
    id: "o-1",
    orderNo: "SO-20260419-018",
    customer: "华穗示范农场",
    owner: "陈雅萍",
    lane: "payment",
    status: "待收款确认",
    tone: "warning",
    receivable: "¥186,000",
    warehouse: "潍坊仓",
    partner: "直营",
    summary: "客户已确认到款窗口，财务只差一笔银行流水登记。",
    nextAction: "今天 14:00 前登记回款并同步订单状态",
    updatedAt: "今天 09:18",
    blocker: "流水号还没补录",
    timeline: [
      { label: "订单创建", value: "04/17 11:20" },
      { label: "客户确认", value: "04/18 16:10" },
      { label: "待执行", value: "登记收款" },
    ],
  },
  {
    id: "o-2",
    orderNo: "SO-20260418-009",
    customer: "锦禾健康",
    owner: "李昊",
    lane: "payment",
    status: "尾款待跟进",
    tone: "danger",
    receivable: "¥92,400",
    warehouse: "杭州联配仓",
    partner: "直营",
    summary: "首付款已登记，但尾款计划还没被明确写回订单里。",
    nextAction: "今天补一通确认电话，锁定客户内部打款时间",
    updatedAt: "昨天 18:42",
    blocker: "尾款日期缺失",
    timeline: [
      { label: "首付款", value: "已到账 60%" },
      { label: "当前风险", value: "尾款时间未确认" },
      { label: "待执行", value: "补录回款节点" },
    ],
  },
  {
    id: "o-3",
    orderNo: "SO-20260419-004",
    customer: "远辰渠道集团",
    owner: "王潇",
    lane: "shipment",
    status: "待出库",
    tone: "success",
    receivable: "¥138,600",
    warehouse: "济南仓",
    partner: "远辰渠道",
    summary: "库存与收货地址都已齐，当前只差物流方式和出库批次确认。",
    nextAction: "先锁快运，再发起出库单",
    updatedAt: "今天 08:56",
    blocker: "物流公司未定",
    timeline: [
      { label: "收款状态", value: "已满足发货" },
      { label: "仓配信息", value: "地址齐全" },
      { label: "待执行", value: "分配物流" },
    ],
  },
  {
    id: "o-4",
    orderNo: "SO-20260418-013",
    customer: "诚安医养服务",
    owner: "admin",
    lane: "shipment",
    status: "部分待发",
    tone: "warning",
    receivable: "¥53,000",
    warehouse: "青岛仓",
    partner: "直营",
    summary: "第一批已备货，第二批仍在等仓内复核，容易拖慢整个交付节奏。",
    nextAction: "先拆批次发首单，把交付时间表发给客户",
    updatedAt: "今天 10:12",
    blocker: "第二批库存复核中",
    timeline: [
      { label: "出库进度", value: "已备货 1/2" },
      { label: "客户预期", value: "今天需确认时间表" },
      { label: "待执行", value: "拆批发货" },
    ],
  },
  {
    id: "o-5",
    orderNo: "SO-20260417-027",
    customer: "微笑草帽乡村发展集团",
    owner: "陈雅萍",
    lane: "settlement",
    status: "待结算单据",
    tone: "danger",
    receivable: "¥264,000",
    warehouse: "潍坊仓",
    partner: "草帽渠道",
    summary: "供应金额与成本金额都已回填，但现金补差还没确认，利润无法关账。",
    nextAction: "今天补齐渠道现金支付说明并生成结算单",
    updatedAt: "昨天 17:26",
    blocker: "现金补差说明缺失",
    timeline: [
      { label: "供应金额", value: "¥264,000" },
      { label: "当前利润", value: "待核" },
      { label: "待执行", value: "生成结算单" },
    ],
  },
  {
    id: "o-6",
    orderNo: "SO-20260416-021",
    customer: "蒲公英中学",
    owner: "李昊",
    lane: "settlement",
    status: "部分结算",
    tone: "warning",
    receivable: "¥77,800",
    warehouse: "济南仓",
    partner: "教育渠道",
    summary: "订单本身已完成发货，但渠道分润仍卡在周期起止时间不统一。",
    nextAction: "统一账期后补齐本次结算周期",
    updatedAt: "昨天 15:08",
    blocker: "账期边界不一致",
    timeline: [
      { label: "发货状态", value: "已完成" },
      { label: "结算周期", value: "需重新确认" },
      { label: "待执行", value: "统一账期" },
    ],
  },
];

const quickBlocks = [
  {
    label: "今天先收",
    title: "先把确认过的回款写进系统",
    note: "这版会把待收款放到第一层，不再让财务动作埋在详情页里。",
  },
  {
    label: "今天先发",
    title: "物流和仓配动作独立成节奏板",
    note: "订单页应该直接暴露哪笔可发、卡在哪、下一步谁来推。",
  },
  {
    label: "今天先清",
    title: "渠道结算要从附属页抬到主工作台",
    note: "只要还影响利润结算，就应该在首页被看见。",
  },
];

const railLinks = [
  { label: "收款记录", note: "把到账确认和账户登记放进一条链路" },
  { label: "发货记录", note: "从出库到签收都应该看得见" },
  { label: "渠道结算", note: "利润、补差和账期统一处理" },
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

export function OrdersWorkspacePreview() {
  const [activeLane, setActiveLane] = useState<PreviewLaneKey>("payment");
  const [selectedOrderId, setSelectedOrderId] = useState("o-1");

  const visibleOrders = useMemo(
    () => previewOrders.filter((order) => order.lane === activeLane),
    [activeLane],
  );

  const selectedOrder =
    visibleOrders.find((order) => order.id === selectedOrderId) ??
    visibleOrders[0] ??
    null;

  return (
    <div className={styles.previewPage}>
      <section className={styles.commandDeck}>
        <div className={styles.commandCopy}>
          <span className={styles.eyebrow}>Orders preview</span>
          <h1>订单履约工作台测试页</h1>
          <p>
            先决定今天先收哪笔、先发哪笔、哪笔卡在渠道结算，再进入具体订单处理。
            订单页的第一眼应该是履约节奏，而不是一张长表单。
          </p>
        </div>

        <div className={styles.commandMeta}>
          <div className={styles.liveCard}>
            <span>当前工作目标</span>
            <strong>今天要推进 13 笔履约动作</strong>
            <small>6 笔待收款、4 笔待发货、3 笔待结算，先处理最接近完成的单。</small>
          </div>
          <div className={styles.commandActions}>
            <button className={styles.primaryAction} type="button">
              作为正式页候选
            </button>
            <button className={styles.secondaryAction} type="button">
              继续打磨
            </button>
          </div>
        </div>
      </section>

      <section className={styles.focusBoard}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionEyebrow}>履约优先级</span>
            <strong>订单页先给处理顺序，再给字段和表单。</strong>
            <p>先把现金流、出库和渠道利润的阻塞点放到第一层，团队才知道今天该做什么。</p>
          </div>
        </div>

        <div className={styles.trackGrid}>
          {fulfillmentTracks.map((track, index) => (
            <article
              className={cx(styles.trackCard, styles[`track${track.tone[0].toUpperCase()}${track.tone.slice(1)}`])}
              key={track.label}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span>{track.label}</span>
              <strong>{track.value}</strong>
              <h2>{track.title}</h2>
              <p>{track.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.metricRibbon}>
        {operationalMetrics.map((metric) => (
          <article className={styles.metricCard} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.helper}</p>
          </article>
        ))}
      </section>

      <section className={styles.workspace}>
        <div className={styles.mainColumn}>
          <section className={styles.lanePanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>今日履约泳道</span>
                <strong>先按动作类型分泳道，再看具体订单。</strong>
                <p>收款、发货、结算各自成队列，避免所有动作都混在一页里。</p>
              </div>
            </div>

            <div className={styles.laneTabs}>
              {laneOptions.map((lane) => (
                <button
                  className={cx(
                    styles.laneTab,
                    activeLane === lane.key && styles.laneTabActive,
                  )}
                  key={lane.key}
                  onClick={() => setActiveLane(lane.key)}
                  type="button"
                >
                  <div>
                    <strong>{lane.label}</strong>
                    <span>{lane.helper}</span>
                  </div>
                  <b>{lane.count}</b>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.queuePanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>当前订单队列</span>
                <strong>
                  {
                    laneOptions.find((lane) => lane.key === activeLane)?.label
                  }
                </strong>
                <p>卡片只保留会影响履约判断的信息，不再让操作人先读一长串字段。</p>
              </div>
              <button className={styles.secondaryAction} type="button">
                快速新建订单
              </button>
            </div>

            <div className={styles.orderList}>
              {visibleOrders.map((order, index) => (
                <button
                  className={cx(
                    styles.orderCard,
                    selectedOrder?.id === order.id && styles.orderCardActive,
                  )}
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  style={{ animationDelay: `${index * 60}ms` }}
                  type="button"
                >
                  <div className={styles.orderCardTop}>
                    <div>
                      <span>{order.orderNo}</span>
                      <strong>{order.customer}</strong>
                    </div>
                    <ToneBadge tone={order.tone}>{order.status}</ToneBadge>
                  </div>

                  <p>{order.summary}</p>

                  <div className={styles.orderMetaGrid}>
                    <div>
                      <span>应收 / 负责人</span>
                      <strong>
                        {order.receivable} · {order.owner}
                      </strong>
                    </div>
                    <div>
                      <span>仓配 / 渠道</span>
                      <strong>
                        {order.warehouse} · {order.partner}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.orderFooter}>
                    <div>
                      <span>下一步</span>
                      <strong>{order.nextAction}</strong>
                    </div>
                    <small>最近更新 {order.updatedAt}</small>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.inspectorPanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>订单 Inspector</span>
                <strong>右侧固定看当前单最该处理什么。</strong>
              </div>
            </div>

            {selectedOrder ? (
              <div className={styles.inspectorBody}>
                <div className={styles.selectedOrder}>
                  <span>{selectedOrder.orderNo}</span>
                  <strong>{selectedOrder.customer}</strong>
                  <p>{selectedOrder.summary}</p>
                </div>

                <div className={styles.selectedGrid}>
                  <div>
                    <span>当前阻塞</span>
                    <strong>{selectedOrder.blocker}</strong>
                  </div>
                  <div>
                    <span>下一步动作</span>
                    <strong>{selectedOrder.nextAction}</strong>
                  </div>
                  <div>
                    <span>负责人</span>
                    <strong>{selectedOrder.owner}</strong>
                  </div>
                  <div>
                    <span>应收金额</span>
                    <strong>{selectedOrder.receivable}</strong>
                  </div>
                </div>

                <div className={styles.timelinePanel}>
                  <span>当前订单时间线</span>
                  <div className={styles.timelineList}>
                    {selectedOrder.timeline.map((item) => (
                      <div className={styles.timelineItem} key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.inspectorActions}>
                  <button className={styles.primaryAction} type="button">
                    进入订单详情
                  </button>
                  <button className={styles.secondaryAction} type="button">
                    触发下一步
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className={styles.quickPanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>今天的頁面思路</span>
                <strong>把履约阻塞点抬到主工作台上。</strong>
              </div>
            </div>

            <div className={styles.quickBlocks}>
              {quickBlocks.map((block) => (
                <article className={styles.quickBlock} key={block.label}>
                  <span>{block.label}</span>
                  <strong>{block.title}</strong>
                  <p>{block.note}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.linkPanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>相关入口</span>
                <strong>正式页后续应形成一条完整链路。</strong>
              </div>
            </div>

            <div className={styles.linkList}>
              {railLinks.map((link) => (
                <article className={styles.linkCard} key={link.label}>
                  <strong>{link.label}</strong>
                  <p>{link.note}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
