"use client";

import type { ReactNode } from "react";

export function PreviewShell({
  label = "公开预览页",
  description,
  actions,
  children,
}: {
  label?: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="screen-center">
      <div className="preview-shell">
        <section className="panel preview-shell__banner">
          <div className="preview-shell__copy">
            <strong className="preview-shell__label">{label}</strong>
            <p>{description}</p>
          </div>
          {actions ? <div className="preview-shell__actions">{actions}</div> : null}
        </section>

        {children}
      </div>
    </main>
  );
}
