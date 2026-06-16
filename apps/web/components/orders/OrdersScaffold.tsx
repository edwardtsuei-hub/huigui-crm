"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { WorkspacePageHeader } from "../dashboard/WorkspacePageHeader";
import { SectionCard, StatCard, SummaryCard } from "../system/primitives";

type HeaderAction = {
  href: string;
  label: string;
  tone?: "primary" | "secondary";
};

type DetailSection = {
  title: string;
  description: string;
  items: string[];
};

type AsideSection = {
  title: string;
  description?: string;
  items: string[];
};

export function OrdersScaffold({
  eyebrow,
  title,
  description,
  meta,
  actions,
  sections,
  aside,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  meta: Array<{ label: string; value: string }>;
  actions?: HeaderAction[];
  sections: DetailSection[];
  aside: AsideSection[];
  children?: ReactNode;
}) {
  return (
    <div className="workspace-stack">
      <WorkspacePageHeader
        actions={
          actions?.length ? (
            <>
              {actions.map((action) => (
                <Link
                  className={`button ${action.tone === "secondary" ? "secondary" : ""} inline`}
                  href={action.href}
                  key={action.href}
                >
                  {action.label}
                </Link>
              ))}
            </>
          ) : undefined
        }
        description={description}
        eyebrow={eyebrow}
        meta={meta}
        title={title}
      />

      <section className="split-workspace">
        <div className="workspace-main">
          <section className="grid-3">
            {meta.map((item) => (
              <StatCard key={`${item.label}-${item.value}`} label={item.label} value={item.value} />
            ))}
          </section>

          {children}

          {sections.map((section) => (
            <SectionCard
              description={section.description}
              key={section.title}
              title={section.title}
            >
              <div className="stack">
                {section.items.map((item) => (
                  <div className="summary-card" key={item}>
                    <div className="small">{item}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          ))}
        </div>

        <aside className="workspace-side sticky-side">
          <section className="panel stack">
            {aside.map((section) => (
              <SummaryCard
                description={section.description}
                key={section.title}
                title={section.title}
              >
                <div className="stack">
                  {section.items.map((item) => (
                    <div className="small muted" key={item}>
                      {item}
                    </div>
                  ))}
                </div>
              </SummaryCard>
            ))}
          </section>
        </aside>
      </section>
    </div>
  );
}
