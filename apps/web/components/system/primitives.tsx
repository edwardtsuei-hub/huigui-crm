"use client";

import Link from "next/link";
import type { ReactNode } from "react";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export type Tone = "neutral" | "success" | "warning" | "danger";

export function StatusBadge({
  children,
  className,
  tone = "neutral",
  variant = "pill",
}: {
  children: ReactNode;
  className?: string;
  tone?: Tone;
  variant?: "pill" | "badge";
}) {
  return (
    <span
      className={cn(
        variant === "badge" ? "status-badge" : "status-pill",
        tone,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  meta?: Array<{ label: string; value: string; tone?: Tone }>;
}) {
  return (
    <section className="page-header">
      <div className="page-header__content">
        {eyebrow ? <div className="page-header__eyebrow">{eyebrow}</div> : null}
        <div className="page-header__copy">
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {meta?.length ? (
          <div className="page-header__meta">
            {meta.map((item) => (
              <div
                className={cn("data-chip", item.tone ?? "neutral")}
                key={`${item.label}-${item.value}`}
              >
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </section>
  );
}

export function SectionCard({
  actions,
  children,
  className,
  description,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
  title?: string;
}) {
  return (
    <section className={cn("panel stack section-card", className)}>
      {title || description || actions ? (
        <div className="panel-header">
          <div className="section-heading">
            {title ? <h3>{title}</h3> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="action-row">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function SummaryCard({
  actions,
  children,
  className,
  description,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
  title?: string;
}) {
  return (
    <section className={cn("summary-card stack summary-card--shell", className)}>
      {title || description || actions ? (
        <div className="panel-header">
          <div className="section-heading">
            {title ? <h3>{title}</h3> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="action-row">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  note,
  value,
}: {
  label: string;
  note?: string;
  value: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {note ? <div className="insight-note">{note}</div> : null}
    </article>
  );
}

export function FilterBar({
  actions,
  children,
  className,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("filter-row filter-bar", className)}>
      {children}
      {actions ? <div className="action-row filter-bar__actions">{actions}</div> : null}
    </div>
  );
}

export function DataTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("table-wrap data-table", className)}>
      <table>{children}</table>
    </div>
  );
}

export function EmptyState({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
      {action ? <div className="action-row">{action}</div> : null}
    </div>
  );
}

type ActionMenuItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  tone?: "default" | "danger";
};

export function ActionMenu({
  items,
  label = "更多",
}: {
  items: ActionMenuItem[];
  label?: string;
}) {
  return (
    <details className="menu-popover">
      <summary className="button ghost inline">{label}</summary>
      <div className="menu-popover__panel">
        {items.map((item) =>
          item.href ? (
            <Link
              className={cn(
                "menu-popover__item",
                item.tone === "danger" && "danger-text",
              )}
              href={item.href}
              key={`${item.label}-${item.href}`}
            >
              {item.label}
            </Link>
          ) : (
            <button
              className={cn(
                "menu-popover__item",
                item.tone === "danger" && "danger-text",
              )}
              key={item.label}
              onClick={item.onClick}
              type="button"
            >
              {item.label}
            </button>
          ),
        )}
      </div>
    </details>
  );
}

export function TimelineBlock({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    description: string;
    meta: string;
    tone?: Tone;
  }>;
}) {
  return (
    <div className="timeline-block">
      {items.map((item) => (
        <article className="timeline-block__item" key={item.id}>
          <div className="timeline-block__dot" />
          <div className="timeline-block__body">
            <div className="detail-block__header">
              <strong>{item.title}</strong>
              <StatusBadge tone={item.tone ?? "neutral"}>{item.meta}</StatusBadge>
            </div>
            <p>{item.description}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function RightDrawer({
  children,
  className,
  description,
  eyebrow,
  footer,
  onClose,
  open,
  title,
  widthClass,
}: {
  children: ReactNode;
  className?: string;
  description?: string;
  eyebrow?: string;
  footer?: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
  widthClass?: string;
}) {
  return (
    <>
      <button
        aria-hidden={!open}
        className={`drawer-backdrop ${open ? "open" : ""}`}
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        type="button"
      />

      <aside
        aria-hidden={!open}
        className={cn("notification-drawer", open && "open", widthClass, className)}
      >
        <div className="notification-drawer__header">
          <div className="stack compact-gap">
            {eyebrow ? <div className="page-header__eyebrow">{eyebrow}</div> : null}
            <h3>{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            关闭
          </button>
        </div>

        <div className="notification-drawer__body">{children}</div>
        {footer ? <div className="notification-drawer__footer">{footer}</div> : null}
      </aside>
    </>
  );
}

export function ConfirmDialog({
  confirmLabel = "确认",
  description,
  onClose,
  onConfirm,
  open,
  title,
}: {
  confirmLabel?: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <>
      <button className="drawer-backdrop open" onClick={onClose} type="button" />
      <div className="confirm-dialog">
        <div className="panel stack">
          <div className="section-heading">
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
          <div className="action-row">
            <button className="button secondary inline" onClick={onClose} type="button">
              取消
            </button>
            <button className="button danger inline" onClick={onConfirm} type="button">
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
