"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type DetailBreadcrumb = {
  label: string;
  href?: string;
};

type DetailMeta = {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning" | "danger";
};

type EntityDetailHeaderProps = {
  eyebrow?: string;
  breadcrumbs: DetailBreadcrumb[];
  title: string;
  subtitle: string;
  badges?: Array<{
    label: string;
    tone?: "neutral" | "success" | "warning" | "danger";
  }>;
  meta: DetailMeta[];
  actions?: ReactNode;
};

export function EntityDetailHeader({
  eyebrow,
  breadcrumbs,
  title,
  subtitle,
  badges,
  meta,
  actions,
}: EntityDetailHeaderProps) {
  return (
    <section className="detail-header">
      <div className="detail-header__main">
        <div className="detail-header__topline">
          {eyebrow ? (
            <div className="page-header__eyebrow">{eyebrow}</div>
          ) : null}
          <nav aria-label="面包屑" className="detail-breadcrumbs">
            {breadcrumbs.map((item, index) =>
              item.href ? (
                <span key={`${item.label}-${index}`}>
                  <Link href={item.href}>{item.label}</Link>
                  {index < breadcrumbs.length - 1 ? <span>/</span> : null}
                </span>
              ) : (
                <span key={`${item.label}-${index}`}>
                  <strong>{item.label}</strong>
                  {index < breadcrumbs.length - 1 ? <span>/</span> : null}
                </span>
              ),
            )}
          </nav>
        </div>

        <div className="detail-header__title-row">
          <div className="detail-header__copy">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

          {actions ? (
            <div className="detail-header__actions">{actions}</div>
          ) : null}
        </div>

        <div className="detail-header__meta">
          {badges?.length
            ? badges.map((badge) => (
                <span
                  className={`status-pill ${badge.tone ?? "neutral"}`}
                  key={`${badge.label}-${badge.tone ?? "neutral"}`}
                >
                  {badge.label}
                </span>
              ))
            : null}

          {meta.map((item) => (
            <div
              className={`detail-meta-pill ${item.tone ?? "neutral"}`}
              key={`${item.label}-${item.value}`}
            >
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
