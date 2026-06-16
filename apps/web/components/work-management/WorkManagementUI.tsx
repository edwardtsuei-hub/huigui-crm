"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type DragEventHandler, type ReactNode } from "react";
import { getCurrentUser, hasPermission } from "../../lib/api";
import {
  type GoalProgress,
  type GoalRiskLevel,
  type MonthlyGoalSummary,
  type WeeklyPlanEditorItem,
  type MonthlyGoalEditorItem,
  type WeeklyReportReviewItem,
  type WeeklyReportSummary,
  decodeAbandonedReason,
  formatWorkDate,
  formatWorkDay,
  isAbandonedReason,
  labelForGoalProgress,
  labelForMonthlyGoalStatus,
  labelForPlanType,
  labelForPriority,
  labelForRiskLevel,
  labelForWeeklyReportStatus,
  labelForWorkItemStatus,
  statusTone,
} from "../../lib/work-management";
import { EmptyState, PageHeader, SectionCard, StatusBadge } from "../system/primitives";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type WorkManagementView = "mine" | "team";
type WorkManagementTab = "overview" | "weekly-reports" | "monthly-goals";

const workManagementTabs: Array<{ key: WorkManagementTab; label: string }> = [
  { key: "overview", label: "总览" },
  { key: "weekly-reports", label: "周报" },
  { key: "monthly-goals", label: "本月目标" },
];

function resolveActiveTab(pathname: string): WorkManagementTab {
  if (pathname.includes("/monthly-goals")) {
    return "monthly-goals";
  }

  if (pathname.includes("/weekly-reports")) {
    return "weekly-reports";
  }

  return "overview";
}

function resolveTabHref(tab: WorkManagementTab, view: WorkManagementView) {
  const basePath = view === "team" ? "/work-management/team" : "/work-management";
  if (tab === "overview") {
    return view === "team" ? `${basePath}/overview` : `${basePath}/home`;
  }

  return `${basePath}/${tab}`;
}

function resolveViewHref(pathname: string, targetView: WorkManagementView) {
  const activeTab = resolveActiveTab(pathname);
  return resolveTabHref(activeTab, targetView);
}

function canSeeTeamView() {
  const user = getCurrentUser();

  if (!user) {
    return false;
  }

  if (["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(user.roleCode)) {
    return true;
  }

  return hasPermission(user, "page.management.members");
}

export function WorkManagementPageHeader({
  actions,
  description,
  meta,
  title,
  view = "mine",
}: {
  actions?: ReactNode;
  description: string;
  meta?: Array<{
    label: string;
    value: string;
    tone?: "neutral" | "warning" | "success" | "danger";
  }>;
  title: string;
  view?: WorkManagementView;
}) {
  const pathname = usePathname();
  const showTeamView = useMemo(() => canSeeTeamView(), []);

  return (
    <section className="wm-page-header">
      <PageHeader
        description={description}
        meta={meta}
        title={title}
        actions={actions}
      />

      <div className="wm-header-strip">
        <nav className="wm-tabs" aria-label="协同模块">
          {workManagementTabs.map((tab) => {
            const href = resolveTabHref(tab.key, view);
            const active =
              tab.key === "overview"
                ? view === "team"
                  ? pathname.startsWith("/work-management/team/overview")
                  : pathname === "/work-management" ||
                    pathname.startsWith("/work-management/home") ||
                    pathname.startsWith("/work-management/overview")
                : pathname.startsWith(href);

            return (
              <Link className={cn("wm-tabs__item", active && "active")} href={href} key={tab.key}>
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {showTeamView ? (
          <div className="wm-view-switch">
            <Link
              className={cn("wm-view-switch__item", view === "mine" && "active")}
              href={resolveViewHref(pathname, "mine")}
            >
              我的视角
            </Link>
            <Link
              className={cn("wm-view-switch__item", view === "team" && "active")}
              href={resolveViewHref(pathname, "team")}
            >
              团队视角
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function AutoSaveStatus({
  status,
  updatedAt,
}: {
  status: "idle" | "saving" | "saved" | "error";
  updatedAt?: string | null;
}) {
  const text =
    status === "saving"
      ? "正在保存..."
      : status === "saved"
        ? "已保存"
        : status === "error"
          ? "保存失败，请重试"
          : "等待保存";

  return (
    <div className={cn("wm-autosave", status)}>
      <span>{text}</span>
      {updatedAt ? <time>{formatWorkDate(updatedAt)}</time> : null}
    </div>
  );
}

export function PrimaryTaskCard({
  description,
  title,
  periodLabel,
  status,
  deadlineText,
  pendingCount,
  metaItems,
  primaryAction,
  secondaryAction,
}: {
  description?: string;
  title: string;
  periodLabel: string;
  status: { label: string; tone: "neutral" | "warning" | "success" | "danger" };
  deadlineText: string;
  pendingCount: number;
  metaItems?: Array<{ label: string; value: string }>;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
}) {
  const resolvedMetaItems =
    metaItems?.length
      ? metaItems
      : [
          { label: "截止时间", value: deadlineText },
          { label: "未完成项", value: `${pendingCount} 项` },
        ];

  return (
    <article className="wm-primary-task-card">
      <div className="wm-primary-task-card__top">
        <div className="stack compact-gap">
          <span className="wm-card-kicker">{periodLabel}</span>
          <h3>{title}</h3>
        </div>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </div>

      {description ? <p className="wm-primary-task-card__description">{description}</p> : null}

      <div className="wm-primary-task-card__meta">
        {resolvedMetaItems.map((item) => (
          <div key={`${item.label}-${item.value}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="action-row">
        {primaryAction}
        {secondaryAction}
      </div>
    </article>
  );
}

export function InsightStatCard({
  description,
  icon,
  status,
  title,
  value,
}: {
  description: string;
  icon?: ReactNode;
  status?: { label: string; tone: "neutral" | "warning" | "success" | "danger" };
  title: string;
  value: string | number;
}) {
  return (
    <article className="wm-stat-card">
      <div className="wm-stat-card__top">
        <div className="wm-stat-card__title">
          {icon}
          <span>{title}</span>
        </div>
        {status ? <StatusBadge tone={status.tone}>{status.label}</StatusBadge> : null}
      </div>
      <div className="wm-stat-card__value">{value}</div>
      <p>{description}</p>
    </article>
  );
}

export function HistoryListCard<T extends { id: string; title: string; meta: string; statusLabel: string; statusTone: "neutral" | "warning" | "success" | "danger"; href?: string }>({
  description,
  emptyDescription,
  emptyTitle,
  items,
  onSelect,
  selectedId,
  title,
}: {
  description: string;
  emptyDescription: string;
  emptyTitle: string;
  items: T[];
  onSelect: (id: string) => void;
  selectedId?: string;
  title: string;
}) {
  return (
    <SectionCard title={title} description={description}>
      <div className="stack">
        {items.length ? (
          items.map((item) =>
            item.href ? (
              <Link
                className={cn("list-card", "stack", selectedId === item.id && "is-selected")}
                href={item.href}
                key={item.id}
              >
                <div className="summary-row">
                  <strong>{item.title}</strong>
                  <StatusBadge tone={item.statusTone}>{item.statusLabel}</StatusBadge>
                </div>
                <div className="small muted">{item.meta}</div>
              </Link>
            ) : (
              <button
                className={cn("list-card", "list-card--button", "stack", selectedId === item.id && "is-selected")}
                key={item.id}
                onClick={() => onSelect(item.id)}
                type="button"
              >
                <div className="summary-row">
                  <strong>{item.title}</strong>
                  <StatusBadge tone={item.statusTone}>{item.statusLabel}</StatusBadge>
                </div>
                <div className="small muted">{item.meta}</div>
              </button>
            ),
          )
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )}
      </div>
    </SectionCard>
  );
}

export function ReminderListCard({
  description,
  emptyDescription,
  emptyTitle,
  items,
  title,
}: {
  description?: string;
  emptyDescription?: string;
  emptyTitle?: string;
  items: Array<{
    id: string;
    title: string;
    meta: string;
    tone?: "neutral" | "warning" | "success" | "danger";
    actionLabel?: string;
    href?: string;
    onClick?: () => void;
    disabled?: boolean;
  }>;
  title: string;
}) {
  return (
    <SectionCard title={title} description={description}>
      <div className="stack">
        {items.length ? (
          items.map((item) => (
            <div className="wm-reminder-item" key={item.id}>
              <div className="wm-reminder-item__main">
                <div className="wm-reminder-item__dot" data-tone={item.tone ?? "neutral"} />
                <div className="stack compact-gap">
                  <strong>{item.title}</strong>
                  <span className="small muted">{item.meta}</span>
                </div>
              </div>

              {item.actionLabel ? (
                item.href ? (
                  <Link className="button secondary inline wm-reminder-item__action" href={item.href}>
                    {item.actionLabel}
                  </Link>
                ) : (
                  <button
                    className="button secondary inline wm-reminder-item__action"
                    disabled={item.disabled}
                    onClick={item.onClick}
                    type="button"
                  >
                    {item.actionLabel}
                  </button>
                )
              ) : null}
            </div>
          ))
        ) : (
          <EmptyState
            title={emptyTitle ?? "当前没有待处理提醒"}
            description={
              emptyDescription ?? "新的待提交、待承接和到期提醒会显示在这里。"
            }
          />
        )}
      </div>
    </SectionCard>
  );
}

export function ShortcutActionsCard({
  description,
  items,
  title = "快捷入口",
}: {
  description?: string;
  items: Array<{
    key?: string;
    href?: string;
    onClick?: () => void;
    label: string;
    description: string;
    disabled?: boolean;
  }>;
  title?: string;
}) {
  return (
    <SectionCard title={title} description={description ?? "把最常用的工作动作集中放在这里。"}>
      <div className="wm-shortcuts">
        {items.map((item) => (
          item.href ? (
            <Link className="wm-shortcut-card" href={item.href} key={item.key ?? item.href}>
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </Link>
          ) : (
            <button
              className="wm-shortcut-card"
              disabled={item.disabled}
              key={item.key ?? item.label}
              onClick={item.onClick}
              type="button"
            >
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </button>
          )
        ))}
      </div>
    </SectionCard>
  );
}

export function TeamActivityFeed({
  items,
}: {
  items: Array<{ id: string; title: string; meta: string; tone?: "neutral" | "warning" | "success" | "danger"; href?: string }>;
}) {
  return (
    <SectionCard title="团队动态" description="最近提交、协作和风险动作会优先显示在这里。">
      <div className="stack">
        {items.length ? (
          items.map((item) =>
            item.href ? (
              <Link className="wm-activity-item" href={item.href} key={item.id}>
                <div className="summary-row">
                  <strong>{item.title}</strong>
                  {item.tone ? <StatusBadge tone={item.tone}>动态</StatusBadge> : null}
                </div>
                <div className="small muted">{item.meta}</div>
              </Link>
            ) : (
              <div className="wm-activity-item" key={item.id}>
                <div className="summary-row">
                  <strong>{item.title}</strong>
                  {item.tone ? <StatusBadge tone={item.tone}>动态</StatusBadge> : null}
                </div>
                <div className="small muted">{item.meta}</div>
              </div>
            ),
          )
        ) : (
          <EmptyState
            title="团队动态还很安静"
            description="有成员提交周报、月目标或触发提醒后，这里会自动刷新。"
          />
        )}
      </div>
    </SectionCard>
  );
}

export function CarryoverItemRow({
  canEdit,
  isCarriedForward,
  item,
  onAbandon,
  onCarryForward,
  onComplete,
}: {
  canEdit: boolean;
  isCarriedForward: boolean;
  item: WeeklyReportReviewItem;
  onAbandon: () => void;
  onCarryForward: () => void;
  onComplete: () => void;
}) {
  const status =
    item.status === "COMPLETED"
      ? { label: "已完成", tone: "success" as const }
      : isAbandonedReason(item.incompleteReason)
        ? { label: "已放弃", tone: "danger" as const }
        : isCarriedForward
          ? { label: "已承接到本周", tone: "warning" as const }
          : item.status === "INCOMPLETE"
            ? { label: "待处理", tone: "warning" as const }
            : { label: "待确认", tone: "neutral" as const };

  return (
    <article className="wm-carryover-row">
      <div className="wm-carryover-row__main">
        <div className="summary-row">
          <strong>{item.title}</strong>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </div>
        <div className="small muted">
          原计划时间：{item.plannedAt ? formatWorkDate(item.plannedAt) : "未安排"}
        </div>
        {item.description ? <p>{item.description}</p> : null}
        {item.incompleteReason ? (
          <div className="wm-inline-note">
            {isAbandonedReason(item.incompleteReason)
              ? `放弃原因：${decodeAbandonedReason(item.incompleteReason)}`
              : `未完成原因：${item.incompleteReason}`}
          </div>
        ) : null}
      </div>

      {canEdit ? (
        <div className="wm-carryover-row__actions">
          <button className="button secondary inline" onClick={onComplete} type="button">
            标记完成
          </button>
          <button className="button inline" onClick={onCarryForward} type="button">
            承接到本周
          </button>
          <button className="button ghost inline" onClick={onAbandon} type="button">
            放弃
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function PlanItemCard({
  canEdit,
  item,
  onCopy,
  onDelete,
  onDragOver,
  onDragStart,
  onDrop,
  onEdit,
}: {
  canEdit: boolean;
  item: WeeklyPlanEditorItem;
  onCopy?: () => void;
  onDelete?: () => void;
  onDragOver?: DragEventHandler<HTMLElement>;
  onDragStart?: DragEventHandler<HTMLElement>;
  onDrop?: DragEventHandler<HTMLElement>;
  onEdit?: () => void;
}) {
  return (
    <article
      className="wm-item-card"
      draggable={canEdit}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={onDrop}
    >
      <div className="summary-row">
        <div className="stack compact-gap">
          <strong>{item.title || "未命名计划项"}</strong>
          <div className="wm-chip-row">
            <StatusBadge tone="neutral">{labelForPlanType(item.planType)}</StatusBadge>
            <StatusBadge tone={item.priority === "HIGH" ? "danger" : item.priority === "MEDIUM" ? "warning" : "neutral"}>
              {labelForPriority(item.priority)}
            </StatusBadge>
            <StatusBadge tone={item.itemStatus === "COMPLETED" ? "success" : item.itemStatus === "AT_RISK" || item.itemStatus === "DELAYED" ? "danger" : "neutral"}>
              {labelForWorkItemStatus(item.itemStatus)}
            </StatusBadge>
            {item.sourceReviewItemId ? <StatusBadge tone="warning">承接上周</StatusBadge> : null}
          </div>
        </div>

        {canEdit ? (
          <div className="action-row">
            <button className="button ghost inline" onClick={onEdit} type="button">
              编辑
            </button>
            <button className="button ghost inline" onClick={onCopy} type="button">
              复制
            </button>
            {!item.sourceReviewItemId ? (
              <button className="button ghost inline" onClick={onDelete} type="button">
                删除
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="wm-card-meta-grid">
        <div>
          <span>截止时间</span>
          <strong>{item.plannedAt ? formatWorkDate(item.plannedAt) : "未安排"}</strong>
        </div>
        <div>
          <span>关联对象</span>
          <strong>{item.relatedEntity || "未关联"}</strong>
        </div>
        <div>
          <span>日程联动</span>
          <strong>{item.syncToCalendar && item.plannedAt ? "已同步" : "未同步"}</strong>
        </div>
      </div>

      {item.detail ? <p>{item.detail}</p> : <p className="muted">还没有补充说明。</p>}
    </article>
  );
}

export function GoalItemCard({
  canEdit,
  item,
  onCopy,
  onDelete,
  onDragOver,
  onDragStart,
  onDrop,
  onEdit,
}: {
  canEdit: boolean;
  item: MonthlyGoalEditorItem;
  onCopy?: () => void;
  onDelete?: () => void;
  onDragOver?: DragEventHandler<HTMLElement>;
  onDragStart?: DragEventHandler<HTMLElement>;
  onDrop?: DragEventHandler<HTMLElement>;
  onEdit?: () => void;
}) {
  return (
    <article
      className="wm-item-card"
      draggable={canEdit}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={onDrop}
    >
      <div className="summary-row">
        <div className="stack compact-gap">
          <strong>{item.title || "未命名目标项"}</strong>
          <div className="wm-chip-row">
            <StatusBadge tone={item.itemStatus === "COMPLETED" ? "success" : item.itemStatus === "AT_RISK" || item.itemStatus === "DELAYED" ? "danger" : "neutral"}>
              {labelForWorkItemStatus(item.itemStatus)}
            </StatusBadge>
            <StatusBadge tone={item.riskLevel === "HIGH" ? "danger" : item.riskLevel === "MEDIUM" ? "warning" : "neutral"}>
              {labelForRiskLevel(item.riskLevel)}
            </StatusBadge>
            <StatusBadge tone="neutral">{labelForGoalProgress(item.progress)}</StatusBadge>
          </div>
        </div>

        {canEdit ? (
          <div className="action-row">
            <button className="button ghost inline" onClick={onEdit} type="button">
              编辑
            </button>
            <button className="button ghost inline" onClick={onCopy} type="button">
              复制
            </button>
            <button className="button ghost inline" onClick={onDelete} type="button">
              删除
            </button>
          </div>
        ) : null}
      </div>

      <div className="wm-card-meta-grid">
        <div>
          <span>截止时间</span>
          <strong>{item.dueAt ? formatWorkDate(item.dueAt) : "未安排"}</strong>
        </div>
        <div>
          <span>责任人</span>
          <strong>{item.ownerName || "本人"}</strong>
        </div>
        <div>
          <span>所需协助</span>
          <strong>{item.supportNeeded || "暂无"}</strong>
        </div>
      </div>

      <div className="wm-goal-detail-grid">
        <div>
          <span>交付结果</span>
          <p>{item.deliverable || "未填写"}</p>
        </div>
        <div>
          <span>量化指标</span>
          <p>{item.metricValue || "未填写"}</p>
        </div>
        <div>
          <span>进展说明</span>
          <p>{item.progressDescription || "未填写"}</p>
        </div>
        <div>
          <span>风险说明</span>
          <p>{item.riskDescription || "未填写"}</p>
        </div>
      </div>
    </article>
  );
}

export function TeamSubmissionCard({
  description,
  emptyDescription,
  emptyTitle,
  items,
  title,
}: {
  description: string;
  emptyDescription: string;
  emptyTitle: string;
  items: Array<
    | (WeeklyReportSummary & { href?: string })
    | (MonthlyGoalSummary & { href?: string })
  >;
  title: string;
}) {
  return (
    <SectionCard title={title} description={description}>
      <div className="stack">
        {items.length ? (
          items.map((item) => {
            const statusLabel =
              "weekStartDate" in item
                ? labelForWeeklyReportStatus(item.status)
                : labelForMonthlyGoalStatus(item.status);
            const meta =
              "weekStartDate" in item
                ? `${item.label} · ${item.submittedAt ? formatWorkDay(item.submittedAt) : "未提交"}`
                : `${item.label} · ${item.submittedAt ? formatWorkDay(item.submittedAt) : "未提交"}`;

            return item.href ? (
              <Link className="list-card stack" href={item.href} key={item.id}>
                <div className="summary-row">
                  <strong>{item.owner.displayName}</strong>
                  <StatusBadge tone={statusTone(item.status)}>{statusLabel}</StatusBadge>
                </div>
                <div className="small muted">{meta}</div>
              </Link>
            ) : (
              <div className="list-card stack" key={item.id}>
                <div className="summary-row">
                  <strong>{item.owner.displayName}</strong>
                  <StatusBadge tone={statusTone(item.status)}>{statusLabel}</StatusBadge>
                </div>
                <div className="small muted">{meta}</div>
              </div>
            );
          })
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )}
      </div>
    </SectionCard>
  );
}

export function GoalProgressPill({
  progress,
  riskLevel,
}: {
  progress: GoalProgress;
  riskLevel: GoalRiskLevel;
}) {
  return (
    <div className="wm-chip-row">
      <StatusBadge tone="neutral">{labelForGoalProgress(progress)}</StatusBadge>
      <StatusBadge tone={riskLevel === "HIGH" ? "danger" : riskLevel === "MEDIUM" ? "warning" : "neutral"}>
        {labelForRiskLevel(riskLevel)}
      </StatusBadge>
    </div>
  );
}
