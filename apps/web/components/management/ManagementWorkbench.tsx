"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { auditRiskTone, managementModuleLabel } from "../../lib/management";
import styles from "./ManagementWorkbench.module.css";

type PreviewTabKey = "members" | "risks" | "accounts";
type PreviewTone = "neutral" | "success" | "warning" | "danger";

type AuditItem = {
  id: string;
  createdAt: string;
  action: string;
  module: string;
  targetType?: string | null;
  targetId?: string | null;
  targetName?: string | null;
  content?: string | null;
  result?: string | null;
  source?: string | null;
  riskLevel: "HIGH" | "MEDIUM" | "NORMAL";
  user?: { name: string; roleName?: string | null } | null;
};

type ManagementOverviewResponse = {
  memberTotal: number;
  activeMemberCount: number;
  monthlyNewMembers: number;
  pendingApprovalCount: number;
  permissionChangeCount: number;
  weeklyRiskCount: number;
  monthlyAccountChangeCount: number;
  summary: {
    last24hRiskCount: number;
    last24hDisabledCount: number;
    last24hPermissionChangeCount: number;
  };
  recentRiskLogs: AuditItem[];
  recentExportRecords: AuditItem[];
  recentDisabledAccounts: AuditItem[];
  pendingApprovalItems: Array<{
    id: string;
    targetType: string;
    targetId: string;
    title: string;
    summary?: string | null;
    requiredRoleCode?: string | null;
    requester: { name: string; roleName: string };
    quotation?: { id: string; quotationNo: string; customerName: string } | null;
    createdAt: string;
  }>;
  quickActions: Array<{
    key: string;
    label: string;
    href: string;
    note: string;
  }>;
};

type QueueItem = {
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
  href: string;
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function actionLabel(action: string) {
  switch (action.toUpperCase()) {
    case "DELETE":
      return "删除";
    case "DISABLE":
    case "STATUS":
      return "停用 / 启用";
    case "RESET_PASSWORD":
      return "重置密码";
    case "EXPORT":
      return "导出";
    case "TRANSFER":
      return "转移";
    case "REJECT":
      return "驳回";
    case "UPDATE":
      return "更新";
    default:
      return action;
  }
}

function toneFromAudit(item: AuditItem): PreviewTone {
  const tone = auditRiskTone(item);
  if (tone === "danger" || tone === "warning") {
    return tone;
  }

  return "neutral";
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

export function ManagementWorkbench() {
  const [data, setData] = useState<ManagementOverviewResponse | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<PreviewTabKey>("members");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<ManagementOverviewResponse>("/management/overview")
      .then(setData)
      .catch((requestError) =>
        setError(
          requestError instanceof Error ? requestError.message : "管理总览加载失败",
        ),
      );
  }, []);

  const memberTotal = data?.memberTotal ?? 0;
  const activeMemberCount = data?.activeMemberCount ?? 0;
  const monthlyNewMembers = data?.monthlyNewMembers ?? 0;
  const permissionChangeCount = data?.permissionChangeCount ?? 0;
  const weeklyRiskCount = data?.weeklyRiskCount ?? 0;
  const monthlyAccountChangeCount = data?.monthlyAccountChangeCount ?? 0;
  const last24hRiskCount = data?.summary.last24hRiskCount ?? 0;
  const last24hDisabledCount = data?.summary.last24hDisabledCount ?? 0;
  const last24hPermissionChangeCount =
    data?.summary.last24hPermissionChangeCount ?? 0;
  const inactiveMemberCount = Math.max(0, memberTotal - activeMemberCount);

  const accountChanges = useMemo(() => {
    const events = [
      ...(data?.recentDisabledAccounts ?? []).map((item) => ({
        ...item,
        typeLabel: "账号变更",
      })),
      ...(data?.recentExportRecords ?? []).map((item) => ({
        ...item,
        typeLabel: "导出记录",
      })),
    ];

    return events
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      )
      .slice(0, 6);
  }, [data?.recentDisabledAccounts, data?.recentExportRecords]);

  const queueItems = useMemo<QueueItem[]>(() => {
    const memberItems: QueueItem[] = [
      {
        id: "member-status",
        tab: "members",
        eyebrow: "成员状态",
        title:
          inactiveMemberCount > 0
            ? `有 ${inactiveMemberCount} 位成员当前未启用`
            : "当前成员状态稳定",
        summary:
          inactiveMemberCount > 0
            ? `目前共有 ${activeMemberCount}/${memberTotal} 位成员可参与协作，建议先确认停用成员是否已完成交接。`
            : `当前共有 ${activeMemberCount} 位启用成员可参与协作，今天可以把重点放在角色、提醒和节奏复核。`,
        status: inactiveMemberCount > 0 ? "需确认" : "稳定",
        tone: inactiveMemberCount > 0 ? "warning" : "success",
        metaLeft: `启用成员 ${activeMemberCount} / ${memberTotal}`,
        metaRight: `本月新增 ${monthlyNewMembers} 人`,
        nextAction: "进入成员管理检查状态与交接",
        impact: "影响今天谁能进入协同平台",
        href: "/management/members",
      },
      {
        id: "member-roles",
        tab: "members",
        eyebrow: "角色边界",
        title:
          permissionChangeCount > 0
            ? `本月已发生 ${permissionChangeCount} 次权限调整`
            : "当前角色边界暂无新增调整",
        summary:
          permissionChangeCount > 0
            ? "角色权限有变动时，最好先确认是否影响周报、班表、通知与管理入口。"
            : "当前角色边界较稳定，如需扩充能力，可以直接进入角色权限配置。 ",
        status: permissionChangeCount > 0 ? "需复核" : "稳定",
        tone: permissionChangeCount > 0 ? "warning" : "neutral",
        metaLeft: `本月权限变化 ${permissionChangeCount} 次`,
        metaRight: `24 小时内 ${last24hPermissionChangeCount} 次`,
        nextAction: "进入角色权限确认菜单与动作边界",
        impact: "影响协同入口与管理能力范围",
        href: "/management/roles",
      },
      {
        id: "member-notifications",
        tab: "members",
        eyebrow: "通知协同",
        title: "查看提醒、留言与系统消息",
        summary:
          "管理中心不只管配置，也要确认提醒和留言有没有把团队节奏真正串起来。",
        status: "协同入口",
        tone: "neutral",
        metaLeft: `未启用成员 ${inactiveMemberCount} 人`,
        metaRight: "通知中心",
        nextAction: "进入通知中心检查提醒与留言闭环",
        impact: "影响协作提醒是否被看到并承接",
        href: "/notifications",
      },
    ];

    const risks =
      data?.recentRiskLogs.slice(0, 6).map((item) => ({
        id: item.id,
        tab: "risks" as const,
        eyebrow: `${managementModuleLabel(item.module)} / ${actionLabel(item.action)}`,
        title: item.targetName || item.content || "最近有新的高风险操作",
        summary: "这条记录需要管理员快速复核，避免影响今天的协同节奏。",
        status: item.riskLevel === "HIGH" ? "高风险" : "待复核",
        tone: toneFromAudit(item),
        metaLeft: `操作人 ${item.user?.name || "--"}`,
        metaRight: formatDate(item.createdAt),
        nextAction: "进入日志确认影响面与处理结果",
        impact:
          item.module === "management"
            ? "影响账号与权限"
            : `影响${managementModuleLabel(item.module)}模块`,
        href: "/management/logs",
      })) ?? [];

    const accounts = accountChanges.map((item) => ({
      id: `${item.typeLabel}-${item.id}`,
      tab: "accounts" as const,
      eyebrow: item.typeLabel,
      title: item.targetName || item.content || "最近有新的账号或导出变化",
      summary: "账号状态、权限变化和导出行为应该先判断是否会影响今天协作。",
      status: actionLabel(item.action),
      tone:
        item.typeLabel === "账号变更"
          ? ("warning" as const)
          : ("neutral" as const),
      metaLeft: `操作人 ${item.user?.name || "--"}`,
      metaRight: formatDate(item.createdAt),
      nextAction:
        item.typeLabel === "账号变更"
          ? "确认账号或权限变化是否已被团队承接"
          : "复核导出行为是否符合当前内部规则",
      impact:
        item.typeLabel === "账号变更"
          ? "影响今天的成员协作可用性"
          : "影响资料安全与外发节奏",
      href: "/management/logs",
    }));

    return [...memberItems, ...risks, ...accounts];
  }, [
    accountChanges,
    activeMemberCount,
    data?.recentRiskLogs,
    inactiveMemberCount,
    last24hPermissionChangeCount,
    memberTotal,
    monthlyNewMembers,
    permissionChangeCount,
  ]);

  const counts = useMemo(
    () => ({
      members: queueItems.filter((item) => item.tab === "members").length,
      risks: queueItems.filter((item) => item.tab === "risks").length,
      accounts: queueItems.filter((item) => item.tab === "accounts").length,
    }),
    [queueItems],
  );

  useEffect(() => {
    if (!queueItems.length) {
      setSelectedItemId(null);
      return;
    }

    const currentTabItems = queueItems.filter((item) => item.tab === activeTab);
    const fallbackTab =
      (["members", "risks", "accounts"] as PreviewTabKey[]).find((tab) =>
        queueItems.some((item) => item.tab === tab),
      ) ?? "members";

    if (!currentTabItems.length && fallbackTab !== activeTab) {
      setActiveTab(fallbackTab);
      return;
    }

    const hasSelected = currentTabItems.some(
      (item) => item.id === selectedItemId,
    );
    if (!selectedItemId || !hasSelected) {
      setSelectedItemId(currentTabItems[0]?.id ?? null);
    }
  }, [activeTab, queueItems, selectedItemId]);

  const visibleItems = useMemo(
    () => queueItems.filter((item) => item.tab === activeTab),
    [activeTab, queueItems],
  );

  const selectedItem =
    visibleItems.find((item) => item.id === selectedItemId) ??
    visibleItems[0] ??
    null;

  const commandSignals = useMemo(
    () => [
      {
        label: "启用成员",
        value: String(activeMemberCount),
        title: "先确认今天谁真的能参与协作",
        note:
          inactiveMemberCount > 0
            ? `当前共有 ${inactiveMemberCount} 位成员未启用，建议先确认是否已完成交接。`
            : "当前成员状态稳定，可以把注意力放到角色边界和提醒节奏。",
        tone: (inactiveMemberCount > 0 ? "warning" : "success") as PreviewTone,
      },
      {
        label: "高风险",
        value: String(last24hRiskCount),
        title: "风险日志要像告警，不像普通列表",
        note:
          last24hRiskCount > 0
            ? `最近 24 小时有 ${last24hRiskCount} 条高风险操作待复核。`
            : "最近没有新增高风险动作，当前节奏相对稳定。",
        tone: (last24hRiskCount > 0 ? "danger" : "success") as PreviewTone,
      },
      {
        label: "账号变化",
        value: String(last24hDisabledCount + last24hPermissionChangeCount),
        title: "账号和权限变化要直接带出影响面",
        note: `24 小时内有 ${last24hDisabledCount} 次账号停用、${last24hPermissionChangeCount} 次权限变化。`,
        tone: ((last24hDisabledCount > 0 || last24hPermissionChangeCount > 0)
          ? "warning"
          : "neutral") as PreviewTone,
      },
    ],
    [
      activeMemberCount,
      inactiveMemberCount,
      last24hDisabledCount,
      last24hPermissionChangeCount,
      last24hRiskCount,
    ],
  );

  const quickCards = useMemo(
    () => [
      {
        key: "members",
        href: "/management/members",
        label: "成员管理",
        note: "查看账号、状态与协作可见范围",
      },
      {
        key: "roles",
        href: "/management/roles",
        label: "角色权限",
        note: "确认菜单、页面与动作边界",
      },
      {
        key: "notifications",
        href: "/notifications",
        label: "通知中心",
        note: "查看提醒、留言与系统消息",
      },
      {
        key: "logs",
        href: "/management/logs",
        label: "操作日志",
        note: "复核高风险动作与最近变化",
      },
    ],
    [],
  );

  const inspectorSecondaryAction =
    activeTab === "members"
      ? { href: "/notifications", label: "查看通知中心" }
      : { href: "/management/logs", label: "查看日志上下文" };

  return (
    <div className={cx("workspace-stack", styles.workbench)}>
      <section className={styles.commandDeck}>
        <div className={styles.commandCopy}>
          <span className={styles.eyebrow}>内部管理中控</span>
          <h1>管理中心工作台</h1>
          <p>
            先确认成员状态、角色边界、通知节奏和高风险日志，再决定进入成员、角色、通知或日志页。
            这里应该先回答“今天内部协作哪里需要收口”，而不是先把人带去审批配置。
          </p>
        </div>

        <div className={styles.commandMeta}>
          <div className={styles.liveCard}>
            <span>当前管理节奏</span>
            <strong>
              启用成员 {activeMemberCount} 人 · 本周高风险 {weeklyRiskCount} 条
            </strong>
            <small>
              本月新增成员 {monthlyNewMembers} 人，本月账号 / 权限变化{" "}
              {monthlyAccountChangeCount} 次。
            </small>
          </div>
          <div className={styles.commandActions}>
            <Link className={styles.primaryAction} href="/management/members">
              查看成员
            </Link>
            <Link className={styles.secondaryAction} href="/notifications">
              查看通知
            </Link>
            <Link className={styles.secondaryAction} href="/management/roles">
              配置角色
            </Link>
            <Link className={styles.secondaryAction} href="/management/logs">
              查看日志
            </Link>
          </div>
        </div>
      </section>

      {error ? <div className="danger-text small">{error}</div> : null}

      <section className={styles.signalBoard}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionEyebrow}>今日管理逻辑</span>
            <strong>先看成员、权限和协作节奏，再决定进哪个配置页。</strong>
            <p>把成员状态、风险复核与账号变化抬到第一层，管理员才能更快判断今天的动作顺序。</p>
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
        <article className={styles.metricCard}>
          <span>启用成员</span>
          <strong>{activeMemberCount}</strong>
          <p>当前可参与协作的账号数量。</p>
        </article>
        <article className={styles.metricCard}>
          <span>本月新增成员</span>
          <strong>{monthlyNewMembers}</strong>
          <p>本月新增进入平台的成员数量。</p>
        </article>
        <article className={styles.metricCard}>
          <span>本周高风险</span>
          <strong>{weeklyRiskCount}</strong>
          <p>需要管理员复核的高风险动作。</p>
        </article>
        <article className={styles.metricCard}>
          <span>本月权限变化</span>
          <strong>{permissionChangeCount}</strong>
          <p>成员状态与权限配置变更次数。</p>
        </article>
      </section>

      <section className={styles.workspace}>
        <div className={styles.mainColumn}>
          <section className={styles.queuePanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>当前管理队列</span>
                <strong>先按管理动作切片，而不是按旧 CRM 页面切。</strong>
                <p>管理员先决定今天要看谁、复核什么、补哪条提醒，再进入具体模块。</p>
              </div>
            </div>

            <div className={styles.tabRow}>
              <button
                className={cx(
                  styles.tabButton,
                  activeTab === "members" && styles.tabButtonActive,
                )}
                onClick={() => setActiveTab("members")}
                type="button"
              >
                <strong>成员协同</strong>
                <span>先看状态、权限与提醒 · {counts.members}</span>
              </button>
              <button
                className={cx(
                  styles.tabButton,
                  activeTab === "risks" && styles.tabButtonActive,
                )}
                onClick={() => setActiveTab("risks")}
                type="button"
              >
                <strong>风险复核</strong>
                <span>高风险动作应该先被复核 · {counts.risks}</span>
              </button>
              <button
                className={cx(
                  styles.tabButton,
                  activeTab === "accounts" && styles.tabButtonActive,
                )}
                onClick={() => setActiveTab("accounts")}
                type="button"
              >
                <strong>账号变化</strong>
                <span>判断今天哪些变化要跟进 · {counts.accounts}</span>
              </button>
            </div>

            <div className={styles.queueList}>
              {visibleItems.length ? (
                visibleItems.map((item, index) => (
                  <Link
                    className={cx(
                      styles.queueItem,
                      selectedItem?.id === item.id && styles.queueItemActive,
                    )}
                    href={item.href}
                    key={item.id}
                    onMouseEnter={() => setSelectedItemId(item.id)}
                    style={{ animationDelay: `${index * 60}ms` }}
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
                  </Link>
                ))
              ) : (
                <div className="empty-state">
                  <strong>当前队列没有待处理动作</strong>
                  <p>可以直接进入成员、角色、通知与日志页继续处理。</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.inspectorPanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>当前动作 Inspector</span>
                <strong>右侧固定看这件事为什么今天值得先处理。</strong>
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
                  <Link className={styles.primaryAction} href={selectedItem.href}>
                    进入对应模块
                  </Link>
                  <Link
                    className={styles.secondaryAction}
                    href={inspectorSecondaryAction.href}
                  >
                    {inspectorSecondaryAction.label}
                  </Link>
                </div>
              </div>
            ) : null}
          </section>

          <section className={styles.quickPanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>管理快捷入口</span>
                <strong>管理页应该像中控，不只是旧模块导航集合。</strong>
              </div>
            </div>

            <div className={styles.quickList}>
              {quickCards.map((action) => (
                <Link className={styles.quickCard} href={action.href} key={action.key}>
                  <span>{action.label}</span>
                  <strong>{action.note}</strong>
                  <p>直接进入对应内部管理路径，减少在多个页面之间来回切换。</p>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
