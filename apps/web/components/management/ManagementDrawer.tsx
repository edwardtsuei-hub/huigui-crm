"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

type ManagementDrawerProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
  size?: "medium" | "large";
};

export function ManagementDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  actions,
  eyebrow = "Management",
  size = "medium",
}: ManagementDrawerProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <>
      <button
        className="drawer-backdrop open"
        onClick={onClose}
        type="button"
      />
      <aside
        className={`detail-drawer open ${size}`}
      >
        <div className="detail-drawer__header">
          <div className="stack compact-gap">
            <div className="page-header__eyebrow">{eyebrow}</div>
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            关闭
          </button>
        </div>

        <div className="detail-drawer__body">{children}</div>

        {actions ? <div className="detail-drawer__footer">{actions}</div> : null}
      </aside>
    </>
  );
}
