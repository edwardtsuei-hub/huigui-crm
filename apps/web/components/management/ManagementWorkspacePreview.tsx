"use client";

import { useMemo, useState } from "react";
import styles from "./ManagementWorkspacePreview.module.css";

type PreviewTabKey = "approvals" | "risks" | "accounts";
type PreviewTone = "neutral" | "success" | "warning" | "danger";

type PreviewQueueItem = {
  id: string;
  tab: PreviewTabKey;
  eyebrow: string;
  title: string;
  summary: string;
  status: string;
  tone: PreviewTone;
  metaLeft: string;
  metaRight: string;
  nextAction: string;
  impact: string;
};

const commandSignals = [
  {
    label: "待批动作",
    value: "05",
    title: "先处理真正会阻塞业务的审批",
    note: "客户归属、导出权限和高金额报价审批，应该一进页就能看到。",
    tone: "warning" as const,
  },
  {
    label: "高风险",
    value: "03",
    title: "风险日志要像告警，不像普通列表",
    note: "删除、停用、权限调整都应该有明确复核顺序和责任人。",
    tone: "danger" as const,
  },
  {
    label: "账号变化",
    value: "07",
    title: "最近账号变化要直接带出影响面",
    note: "成员状态、密码重置和权限变更应该能快速判断是否影响今天业务。",
    tone: "success" as const,
  },
];

const metrics = [
  { label: "启用成员", value: "28", helper: "当前可参与协作的账号数量" },
  { label: "待处理审批", value: "05", helper: "今天建议优先处理的审批事项" },
  { label: "本周高风险", value: "03", helper: "需要管理员复核的高风险动作" },
  { label: "本月权限变化", value: "12", helper: "成员状态与权限配置变更次数" },
];

const tabs = [
  {
    key: "approvals" as const,
    label: "待批队列",
    helper: "先清影响业务节奏的审批",
  },
  {
    key: "risks" as const,
    label: "风险复核",
    helper: "高风险动作应该先被复核",
  },
  {
    key: "accounts" as const,
    label: "账号变化",
    helper: "判断今天哪些账号变更要跟进",
  },
];

const queueItems: PreviewQueueItem[] = [
  {
    id: "approval-1",
    tab: "approvals",
    eyebrow: "客户归属审批 / 销售组",
    title: "华穗示范农场待确认客户归属",
    summary: "如果今天不确认归属，销售和交付的后续跟进会继续卡在同一个客户上。",
    status: "今天先批",
    tone: "warning",
    metaLeft: "提交人 陈雅萍",
    metaRight: "09:12 提交",
    nextAction: "先确认归属，再触发后续跟进",
    impact: "影响客户推进节奏",
  },
  {
    id: "approval-2",
    tab: "approvals",
    eyebrow: "报价审批 / 高金额",
    title: "GEN-20260419-HN12 需要管理层确认",
    summary: "报价已经准备好，但导出和外发都还被卡在审批节点上。",
    status: "待确认",
    tone: "danger",
    metaLeft: "提交人 admin",
    metaRight: "08:46 提交",
    nextAction: "确认导出权限与报价金额区间",
    impact: "影响签约节奏",
  },
  {
    id: "risk-1",
    tab: "risks",
    eyebrow: "导出权限 / 合同资料",
    title: "合同导出阈值昨晚被调整",
    summary: "新规则会直接影响今天两份合同外发，最好先复核配置是否正确。",
    status: "高风险",
    tone: "danger",
    metaLeft: "操作人 admin",
    metaRight: "昨天 21:18",
    nextAction: "确认规则是否按双人审批生效",
    impact: "影响合同外发",
  },
  {
    id: "risk-2",
    tab: "risks",
    eyebrow: "成员状态 / 销售账号",
    title: "销售账户被停用后尚未恢复",
    summary: "如果账号恢复不及时，下午的客户跟进和报价操作会直接受阻。",
    status: "需复核",
    tone: "warning",
    metaLeft: "操作人 陈雅萍",
    metaRight: "今天 08:10",
    nextAction: "确认停用原因并恢复或替换负责人",
    impact: "影响今天业务执行",
  },
  {
    id: "account-1",
    tab: "accounts",
    eyebrow: "密码重置 / 运营组",
    title: "运营账号上午刚完成重置",
    summary: "需要确认是否已重新登录，不然下午排程与通知动作会断掉。",
    status: "待跟进",
    tone: "warning",
    metaLeft: "对象 王潇",
    metaRight: "今天 09:03",
    nextAction: "确认账号恢复正常并完成二次验证",
    impact: "影响排程与通知",
  },
  {
    id: "account-2",
    tab: "accounts",
    eyebrow: "角色调整 / 财务组",
    title: "财务成员新增收款确认权限",
    summary: "这类权限变化是好事，但页面应该直接告诉管理员影响到哪条业务链。",
    status: "已生效",
    tone: "success",
    metaLeft: "对象 林静",
    metaRight: "今天 07:55",
    nextAction: "确认收款工作流是否已正常串起",
    impact: "影响收款流程",
  },
];

const quickAccess = [
  {
    label: "审批规则",
    title: "今天先处理阻塞动作",
    note: "不要先改配置细节，先看哪些审批正在挡住业务节奏。",
  },
  {
    label: "操作日志",
    title: "高风险记录要能一眼读懂",
    note: "不是只看谁做了什么，而是先判断会不会影响今天的业务。",
  },
  {
    label: "成员管理",
    title: "账号变化要带出业务影响",
    note: "停用、重置和角色调整都应该跟客户、报价、订单链路挂起来。",
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

export function ManagementWorkspacePreview() {
  const [activeTab, setActiveTab] = useState<PreviewTabKey>("approvals");
  const [selectedItemId, setSelectedItemId] = useState("approval-1");

  const visibleItems = useMemo(
    () => queueItems.filter((item) => item.tab === activeTab),
    [activeTab],
  );

  const selectedItem =
    visibleItems.find((item) => item.id === selectedItemId) ??
    visibleItems[0] ??
    null;

  return (
    <div className={styles.previewPage}>
      <section className={styles.commandDeck}>
        <div className={styles.commandCopy}>
          <span className={styles.eyebrow}>Management preview</span>
          <h1>管理中心高級版测试页</h1>
          <p>
            这版把管理页从“配置入口集合”改成“管理指挥台”。第一眼先看待批、风险和账号变化，
            再进入成员、角色、审批或日志页处理。
          </p>
        </div>

        <div className={styles.commandMeta}>
          <div className={styles.liveCard}>
            <span>今天的管理目标</span>
            <strong>先清阻塞，再做配置</strong>
            <small>这张区域应该像运营指挥面，而不是普通后台菜单。</small>
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

      <section className={styles.signalBoard}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionEyebrow}>今日管理逻辑</span>
            <strong>先看会阻塞业务的动作，再决定进哪个配置页。</strong>
          </div>
        </div>

        <div className={styles.signalGrid}>
          {commandSignals.map((signal, index) => (
            <article
              className={cx(
                styles.signalCard,
                styles[`signal${signal.tone[0].toUpperCase()}${signal.tone.slice(1)}`],
              )}
              key={signal.label}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span>{signal.label}</span>
              <strong>{signal.value}</strong>
              <h2>{signal.title}</h2>
              <p>{signal.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.metricRibbon}>
        {metrics.map((metric) => (
          <article className={styles.metricCard} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.helper}</p>
          </article>
        ))}
      </section>

      <section className={styles.workspace}>
        <div className={styles.mainColumn}>
          <section className={styles.queuePanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>当前管理队列</span>
                <strong>先按管理动作切片，而不是按页面切。</strong>
                <p>管理员先决定今天要批什么、复核什么、跟进什么，再进入具体配置模块。</p>
              </div>
            </div>

            <div className={styles.tabRow}>
              {tabs.map((tab) => (
                <button
                  className={cx(styles.tabButton, activeTab === tab.key && styles.tabButtonActive)}
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  type="button"
                >
                  <strong>{tab.label}</strong>
                  <span>{tab.helper}</span>
                </button>
              ))}
            </div>

            <div className={styles.queueList}>
              {visibleItems.map((item, index) => (
                <button
                  className={cx(styles.queueItem, selectedItem?.id === item.id && styles.queueItemActive)}
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  style={{ animationDelay: `${index * 60}ms` }}
                  type="button"
                >
                  <div className={styles.queueItemTop}>
                    <div>
                      <span>{item.eyebrow}</span>
                      <strong>{item.title}</strong>
                    </div>
                    <ToneBadge tone={item.tone}>{item.status}</ToneBadge>
                  </div>
                  <p>{item.summary}</p>
                  <div className={styles.queueMeta}>
                    <div>
                      <span>下一步</span>
                      <strong>{item.nextAction}</strong>
                    </div>
                    <div>
                      <span>影响面</span>
                      <strong>{item.impact}</strong>
                    </div>
                  </div>
                  <div className={styles.queueFoot}>
                    <small>{item.metaLeft}</small>
                    <small>{item.metaRight}</small>
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
                <span className={styles.sectionEyebrow}>当前动作 Inspector</span>
                <strong>右侧固定看这件事为什么今天必须处理。</strong>
              </div>
            </div>

            {selectedItem ? (
              <div className={styles.inspectorBody}>
                <div className={styles.selectedCard}>
                  <span>{selectedItem.eyebrow}</span>
                  <strong>{selectedItem.title}</strong>
                  <p>{selectedItem.summary}</p>
                </div>

                <div className={styles.selectedGrid}>
                  <div>
                    <span>当前状态</span>
                    <strong>{selectedItem.status}</strong>
                  </div>
                  <div>
                    <span>今天动作</span>
                    <strong>{selectedItem.nextAction}</strong>
                  </div>
                  <div>
                    <span>影响面</span>
                    <strong>{selectedItem.impact}</strong>
                  </div>
                  <div>
                    <span>最近变化</span>
                    <strong>{selectedItem.metaRight}</strong>
                  </div>
                </div>

                <div className={styles.inspectorActions}>
                  <button className={styles.primaryAction} type="button">
                    进入对应模块
                  </button>
                  <button className={styles.secondaryAction} type="button">
                    标记为已处理
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className={styles.quickPanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>这页的定位</span>
                <strong>管理页要像中控，不只是导航集合。</strong>
              </div>
            </div>

            <div className={styles.quickList}>
              {quickAccess.map((item) => (
                <article className={styles.quickCard} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.title}</strong>
                  <p>{item.note}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
