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
};

export function ManagementDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  actions
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
        className={`detail-drawer ${open ? "open" : ""}`}
      >
        <div className="detail-drawer__header">
          <div className="stack compact-gap">
            <div className="page-header__eyebrow">Management</div>
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
