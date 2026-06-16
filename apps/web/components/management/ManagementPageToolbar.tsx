"use client";

import type { ReactNode } from "react";
import type { Tone } from "../system/primitives";

type ManagementPageToolbarProps = {
  note?: string;
  actions?: ReactNode;
  meta?: Array<{ label: string; value: string; tone?: Tone }>;
};

export function ManagementPageToolbar({
  note,
  actions,
  meta,
}: ManagementPageToolbarProps) {
  return (
    <section className="management-page-toolbar">
      <div className="management-page-toolbar__content">
        {note ? <p>{note}</p> : null}
        {meta?.length ? (
          <div className="management-page-toolbar__meta">
            {meta.map((item) => (
              <div className={`data-chip ${item.tone ?? "neutral"}`} key={`${item.label}-${item.value}`}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {actions ? <div className="management-page-toolbar__actions">{actions}</div> : null}
    </section>
  );
}
