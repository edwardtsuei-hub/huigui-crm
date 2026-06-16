"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./DashboardPreview.module.css";

type DashboardPreviewTabKey =
  | "quotations"
  | "customers"
  | "files"
  | "operations";
type Tone = "neutral" | "success" | "warning" | "danger";

type DashboardAction = {
  href: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
};

type DashboardActivityItem = {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  metaLeft: string;
  metaRight: string;
  href: string;
  status: string;
  tone: Tone;
};

type DashboardActivitySection = {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  items: DashboardActivityItem[];
};

type DashboardReminderItem = {
  id: string;
  title: string;
  description: string;
  meta: string;
  href: string;
  actionLabel: string;
  tone: Tone;
};

type DashboardQuickLink = {
  label: string;
  note: string;
  href: string;
};

type DashboardFocusTrack = {
  label: string;
  value: string;
  note: string;
  tone: Tone;
};

type DashboardMetricCard = {
  label: string;
  value: string;
  delta: string;
  helper: string;
};

type DashboardPulseRow = {
  label: string;
  value: string;
  width: string;
  note: string;
};

const commandState = {
  title: "今日优先处理",
  description:
    "上午先清掉提醒、审批和检测补关联，再把高概率成交报价推进到下一步。",
  tone: "danger" as const,
  liveLabel: "周日 09:20",
  liveNote: "销售节奏稳定，交付偏满，管理动作需要上午收口。",
  actions: [
    { href: "/notifications", label: "去处理提醒", variant: "primary" as const },
    { href: "/schedule", label: "查看今日日程", variant: "secondary" as const },
    { href: "/customers/new", label: "快速开始", variant: "ghost" as const },
  ],
};

const focusTracks: DashboardFocusTrack[] = [
  {
    label: "今日提醒",
    value: "07",
    note: "其中 2 条已经超过处理时限，适合上午先收口。",
    tone: "warning",
  },
  {
    label: "审批待确认",
    value: "03",
    note: "高金额导出、折扣与转移审批都要在今天完成闭环。",
    tone: "danger",
  },
  {
    label: "检测待补关联",
    value: "10",
    note: "检测记录还缺客户或产品，继续放着会影响后续追踪。",
    tone: "success",
  },
];

const metricCards: DashboardMetricCard[] = [
  {
    label: "活跃客户",
    value: "248",
    delta: "+12",
    helper: "本周持续跟进中的客户池",
  },
  {
    label: "待处理事项",
    value: "14",
    delta: "+3",
    helper: "提醒、审批与业务跟进加总",
  },
  {
    label: "本周新增报价",
    value: "19",
    delta: "+5",
    helper: "比上周同期推进更快",
  },
  {
    label: "待整理档案",
    value: "06",
    delta: "-8",
    helper: "归档纪律正在恢复正常",
  },
];

const pulseRows: DashboardPulseRow[] = [
  {
    label: "活跃客户体量",
    value: "248",
    width: "100%",
    note: "客户池仍然健康，重点是不要让高潜客户沉默太久。",
  },
  {
    label: "本周报价推进",
    value: "19",
    width: "68%",
    note: "报价数量不低，接下来要把高概率成交压到今天的前半天。",
  },
  {
    label: "待处理事项",
    value: "14",
    width: "52%",
    note: "事情不算爆量，但如果上午不收口，下午容易被打散。",
  },
];

const quickLinks: DashboardQuickLink[] = [
  {
    label: "客户池",
    note: "继续推进高潜客户、沉默客户与合作中客户",
    href: "/customers",
  },
  {
    label: "报价档案",
    note: "查看最近报价，继续推动高概率成交",
    href: "/quotations",
  },
  {
    label: "档案中心",
    note: "处理待审核、待归类与废弃模板",
    href: "/files?view=recent",
  },
  {
    label: "管理中心",
    note: "审批、成员与规则调整统一处理",
    href: "/management",
  },
];

const reminders: DashboardReminderItem[] = [
  {
    id: "weekly-report",
    title: "周报已逾期",
    description: "本周周报尚未提交，建议在午前补完回顾和下周计划。",
    meta: "2026/04/14 - 2026/04/20",
    href: "/work-management/weekly-reports",
    actionLabel: "去填写",
    tone: "danger",
  },
  {
    id: "inspection-linking",
    title: "检测待补关联",
    description: "有 10 条检测记录尚未补齐客户或产品，建议安排专人今天清掉。",
    meta: "建议今天完成",
    href: "/inspections?needsLinking=true",
    actionLabel: "去补关联",
    tone: "warning",
  },
  {
    id: "file-cleanup",
    title: "档案待整理",
    description: "仍有 6 份资料没有归类到正式目录，外发前最好先统一。",
    meta: "来自档案中心",
    href: "/files?view=recent",
    actionLabel: "去整理",
    tone: "neutral",
  },
];

const activityByTab: Record<DashboardPreviewTabKey, DashboardActivitySection> = {
  quotations: {
    title: "最近报价",
    description: "先看最值得推进的报价，不把首页做成漂亮但无动作的汇总页。",
    actionLabel: "查看全部报价",
    actionHref: "/quotations",
    items: [
      {
        id: "quotation-1",
        eyebrow: "GENERAL · 华南渠道",
        title: "GEN-20260419-HN12 进入最终确认",
        summary: "客户已确认版本 7，当前只差财务回款条款再核对一次。",
        metaLeft: "更新时间 09:12",
        metaRight: "客户 华穗示范农场",
        href: "/quotations-preview",
        status: "高概率成交",
        tone: "success",
      },
      {
        id: "quotation-2",
        eyebrow: "AGRICULTURE · 示范农场",
        title: "AGR-20260418-NY07 等待补充合同附件",
        summary: "技术方案已通过，缺一份附件就能继续走签约流程。",
        metaLeft: "更新时间 08:45",
        metaRight: "负责人 李昊",
        href: "/quotations-preview",
        status: "待补附件",
        tone: "warning",
      },
      {
        id: "quotation-3",
        eyebrow: "SERVICE · 售后续费",
        title: "SER-20260417-SH03 今天必须回访",
        summary: "如果今天不确认续费窗口，下周会错过客户内部采购节奏。",
        metaLeft: "更新时间 昨天 18:20",
        metaRight: "负责人 周晨",
        href: "/quotations-preview",
        status: "需今天回访",
        tone: "danger",
      },
    ],
  },
  customers: {
    title: "最近客户",
    description: "把关键客户动态压到第一层，不再让销售状态藏在次级列表里。",
    actionLabel: "进入客户页",
    actionHref: "/customers",
    items: [
      {
        id: "customer-1",
        eyebrow: "核心客户 · 上海",
        title: "华穗示范农场已进入合作谈判",
        summary: "本轮需求已稳定，建议今天同步法务与交付时间表。",
        metaLeft: "最近联系 09:05",
        metaRight: "负责人 admin",
        href: "/customers-preview",
        status: "合作中",
        tone: "success",
      },
      {
        id: "customer-2",
        eyebrow: "沉默客户 · 深圳",
        title: "远辰渠道上次跟进已超过 9 天",
        summary: "如果继续延后，本周可能无法推进报价确认。",
        metaLeft: "最近联系 04/10",
        metaRight: "负责人 王潇",
        href: "/customers-preview",
        status: "需恢复触达",
        tone: "warning",
      },
      {
        id: "customer-3",
        eyebrow: "高潜客户 · 杭州",
        title: "锦禾健康需要补齐决策链信息",
        summary: "联系人已明确，但最终签批人与采购节奏还没补完。",
        metaLeft: "最近联系 昨天 16:30",
        metaRight: "负责人 李昊",
        href: "/customers-preview",
        status: "信息待补齐",
        tone: "neutral",
      },
    ],
  },
  files: {
    title: "最近档案",
    description: "把交付与归档放回首页，让资料整理不再是隐藏工作。",
    actionLabel: "进入档案中心",
    actionHref: "/files?view=recent",
    items: [
      {
        id: "file-1",
        eyebrow: "客户交付 · 培训资料",
        title: "客户培训交付包 04-19 刚进入待审核",
        summary: "文件内容已齐，但目录还没补到客户交付中心。",
        metaLeft: "更新时间 10:08",
        metaRight: "上传人 李昊",
        href: "/files-preview",
        status: "待审核",
        tone: "warning",
      },
      {
        id: "file-2",
        eyebrow: "合同文件 · 法务",
        title: "华东区域经销合作协议已完成签章归档",
        summary: "这一份已能作为正式版本给销售与财务共同引用。",
        metaLeft: "更新时间 09:34",
        metaRight: "上传人 陈雅萍",
        href: "/files-preview",
        status: "已生效",
        tone: "success",
      },
      {
        id: "file-3",
        eyebrow: "历史模板 · 报价附件",
        title: "2025 Q4 旧版报价模板仍在被误用",
        summary: "建议今天直接归档并标记为废弃，避免继续外发。",
        metaLeft: "更新时间 昨天 17:18",
        metaRight: "上传人 周晨",
        href: "/files-preview",
        status: "建议下线",
        tone: "danger",
      },
    ],
  },
  operations: {
    title: "最近操作",
    description: "管理员真正要盯的变化，不应该只是一串冷冰冰的日志。",
    actionLabel: "查看管理日志",
    actionHref: "/management/logs",
    items: [
      {
        id: "ops-1",
        eyebrow: "审批规则 · 导出权限",
        title: "导出权限阈值已调整为双人确认",
        summary: "新规则会直接影响高金额报价与合同导出流程。",
        metaLeft: "时间 08:56",
        metaRight: "操作人 admin",
        href: "/management",
        status: "已生效",
        tone: "success",
      },
      {
        id: "ops-2",
        eyebrow: "成员状态 · 销售组",
        title: "销售账户 reset 后仍未重新登录",
        summary: "建议午前确认账号是否恢复正常，避免下午跟进受阻。",
        metaLeft: "时间 08:10",
        metaRight: "操作人 陈雅萍",
        href: "/management",
        status: "待确认",
        tone: "warning",
      },
      {
        id: "ops-3",
        eyebrow: "档案管理 · 回收区",
        title: "有 12 份文件将在 7 天内自动清理",
        summary: "如果有误删风险，今天要优先从回收区完成复核。",
        metaLeft: "时间 昨天 19:24",
        metaRight: "系统提醒",
        href: "/management",
        status: "高风险",
        tone: "danger",
      },
    ],
  },
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function actionClassName(variant?: DashboardAction["variant"]) {
  if (variant === "secondary") {
    return styles.secondaryAction;
  }

  if (variant === "ghost") {
    return styles.tertiaryAction;
  }

  return styles.primaryAction;
}

export function DashboardPreview() {
  const [activeTab, setActiveTab] =
    useState<DashboardPreviewTabKey>("quotations");

  const activeSection = useMemo(() => activityByTab[activeTab], [activeTab]);

  return (
    <div className={styles.previewPage}>
      <section className={styles.commandDeck}>
        <div className={styles.commandCopy}>
          <span className={styles.eyebrow}>Dashboard preview</span>
          <h1>管理驾驶舱</h1>
          <p>
            这版测试页把正式首页收敛成「先看今天最重要的事，再看经营脉搏，最后进入模块」。
            目标不是更花，而是让管理员在第一屏就知道该先处理什么。
          </p>
          <div className={styles.sideActions}>
            {commandState.actions.map((action) => (
              <Link
                className={actionClassName(action.variant)}
                href={action.href}
                key={action.href}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>

        <div className={styles.commandMeta}>
          <div className={styles.liveCard}>
            <span>当前判断</span>
            <strong>{commandState.title}</strong>
            <small>{commandState.description}</small>
            <b className={cx(styles.statusBadge, styles.statusBadgeDanger)}>
              {commandState.liveLabel}
            </b>
            <small>{commandState.liveNote}</small>
          </div>
          <div className={styles.actionRow}>
            <Link className={styles.primaryAction} href="/notifications">
              去处理提醒
            </Link>
            <Link className={styles.secondaryAction} href="/schedule">
              查看今日日程
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.focusBoard}>
        <div className={styles.focusHeader}>
          <div>
            <span className={styles.sectionEyebrow}>第一屏优先区</span>
            <strong>把真正需要上午收口的事情，直接压在首页最上面。</strong>
          </div>
          <Link className={styles.tertiaryAction} href="/dashboard">
            对照正式首页
          </Link>
        </div>

        <div className={styles.focusGrid}>
          {focusTracks.map((track) => (
            <article
              className={cx(
                styles.focusLane,
                styles[`focusLane${track.tone[0].toUpperCase()}${track.tone.slice(1)}`],
              )}
              key={track.label}
            >
              <div className={styles.focusLaneHeader}>
                <span>{track.label}</span>
                <strong>{track.value}</strong>
              </div>
              <p>{track.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.metricRibbon}>
        {metricCards.map((metric) => (
          <article className={styles.metricCard} key={metric.label}>
            <div className={styles.metricHeading}>
              <span>{metric.label}</span>
              <small>{metric.delta}</small>
            </div>
            <strong>{metric.value}</strong>
            <p>{metric.helper}</p>
          </article>
        ))}
      </section>

      <section className={styles.workspace}>
        <div className={styles.mainColumn}>
          <section className={styles.pulsePanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>经营脉搏</span>
                <strong>先看经营面，再决定今天各模块的处理顺序。</strong>
              </div>
              <span className={styles.headerNote}>全部数据为 preview 示例</span>
            </div>

            <div className={styles.pulseGrid}>
              {pulseRows.map((row, index) => (
                <div
                  className={styles.pulseRow}
                  key={row.label}
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <div className={styles.pulseRowHeader}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                  <div className={styles.pulseBar}>
                    <span
                      className={styles.pulseBarFill}
                      style={{ width: row.width }}
                    />
                  </div>
                  <p>{row.note}</p>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.activityPanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>动态主区</span>
                <strong>{activeSection.title}</strong>
                <p>{activeSection.description}</p>
              </div>
              <Link className={styles.secondaryAction} href={activeSection.actionHref}>
                {activeSection.actionLabel}
              </Link>
            </div>

            <div
              className={styles.activityTabs}
              aria-label="dashboard preview tabs"
            >
              {(Object.keys(activityByTab) as DashboardPreviewTabKey[]).map(
                (tabKey) => (
                  <button
                    className={cx(
                      styles.activityTab,
                      activeTab === tabKey && styles.activityTabActive,
                    )}
                    key={tabKey}
                    onClick={() => setActiveTab(tabKey)}
                    type="button"
                  >
                    {activityByTab[tabKey].title}
                  </button>
                ),
              )}
            </div>

            <div className={styles.activityList} key={activeTab}>
              {activeSection.items.map((item, index) => (
                <Link
                  className={styles.activityItem}
                  href={item.href}
                  key={item.id}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className={styles.activityMain}>
                    <span className={styles.activityEyebrow}>{item.eyebrow}</span>
                    <strong>{item.title}</strong>
                    <p>{item.summary}</p>
                  </div>

                  <div className={styles.activityMeta}>
                    <div>
                      <span>{item.metaLeft}</span>
                      <span>{item.metaRight}</span>
                    </div>
                    <b
                      className={cx(
                        styles.statusBadge,
                        styles[`statusBadge${item.tone[0].toUpperCase()}${item.tone.slice(1)}`],
                      )}
                    >
                      {item.status}
                    </b>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className={styles.quickPanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>高频入口</span>
                <strong>首页要能直接切进动作，而不是只看数字。</strong>
              </div>
            </div>

            <div className={styles.quickGrid}>
              {quickLinks.map((item) => (
                <Link className={styles.quickLink} href={item.href} key={item.label}>
                  <div className={styles.quickLinkTop}>
                    <strong>{item.label}</strong>
                    <span>进入</span>
                  </div>
                  <p>{item.note}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className={styles.sideRail}>
          <section className={styles.weeklyPanel}>
            <div className={styles.sideHeader}>
              <span className={styles.sectionEyebrow}>本周周报</span>
              <strong>周报已逾期</strong>
            </div>

            <div className={styles.weeklyStatus}>
              <b className={cx(styles.statusBadge, styles.statusBadgeDanger)}>
                已逾期
              </b>
              <div className={styles.weeklyStats}>
                <span>待回顾 0</span>
                <span>本周计划 6</span>
              </div>
            </div>

            <p>如果今天不补完，本周的复盘和下周节奏都会一起往后推。</p>

            <div className={styles.sideActions}>
              <Link className={styles.primaryAction} href="/work-management/weekly-reports">
                去提交周报
              </Link>
              <Link className={styles.secondaryAction} href="/work-management/overview">
                查看工作管理
              </Link>
            </div>
          </section>

          <section className={styles.reminderPanel}>
            <div className={styles.sideHeader}>
              <span className={styles.sectionEyebrow}>近期提醒</span>
              <strong>右侧只保留真正应该被处理的提醒。</strong>
            </div>

            <div className={styles.reminderList}>
              {reminders.map((item, index) => (
                <article
                  className={styles.reminderItem}
                  key={item.id}
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <div className={styles.reminderItemHeader}>
                    <strong>{item.title}</strong>
                    <b
                      className={cx(
                        styles.statusBadge,
                        styles[`statusBadge${item.tone[0].toUpperCase()}${item.tone.slice(1)}`],
                      )}
                    >
                      {item.meta}
                    </b>
                  </div>
                  <p>{item.description}</p>
                  <div className={styles.sideActions}>
                    <Link className={styles.secondaryAction} href={item.href}>
                      {item.actionLabel}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.notePanel}>
            <div className={styles.sideHeader}>
              <span className={styles.sectionEyebrow}>本版意图</span>
              <strong>这版首页强调“调度”而不是“展示”。</strong>
            </div>
            <p>
              如果你认可这个方向，下一步就把正式 dashboard
              的第一屏优先区、动态主区和右侧提醒按这套语言同步进去，并接上真实接口数据。
            </p>
            <div className={styles.sideActions}>
              <Link className={styles.secondaryAction} href="/dashboard">
                对照正式首页
              </Link>
              <Link className={styles.tertiaryAction} href="/customers">
                查看客户页
              </Link>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
