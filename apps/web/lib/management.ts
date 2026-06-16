"use client";

import { useEffect } from "react";
import type { Tone } from "../components/system/primitives";

const MANAGEMENT_MODULE_LABELS: Record<string, string> = {
  dashboard: "首页",
  work_management: "工作管理",
  schedule: "日程",
  customers: "客户",
  products: "产品",
  solutions: "方案",
  quotations: "报价",
  files: "档案",
  management: "管理中心",
  settings: "设置",
};

export function managementModuleLabel(module: string) {
  return MANAGEMENT_MODULE_LABELS[module] ?? module;
}

export function isHighRiskAction(input: {
  action: string;
  module: string;
  content?: string | null;
}) {
  const action = input.action.toUpperCase();
  const content = (input.content ?? "").toUpperCase();

  if (
    ["DELETE", "RESET_PASSWORD", "EXPORT", "DISABLE", "REJECT", "TRANSFER"].includes(action)
  ) {
    return true;
  }

  if (action === "STATUS" && input.module === "成员") {
    return true;
  }

  if (input.module === "权限") {
    return true;
  }

  if (content.includes("停用") || content.includes("权限") || content.includes("导出")) {
    return true;
  }

  return false;
}

export function auditRiskTone(input: {
  action: string;
  module: string;
  content?: string | null;
}): Tone {
  if (isHighRiskAction(input)) {
    return "danger";
  }

  const action = input.action.toUpperCase();
  if (["UPDATE", "APPROVE", "CREATE", "SUBMIT"].includes(action)) {
    return "warning";
  }

  return "neutral";
}

export function auditRiskLabel(input: {
  action: string;
  module: string;
  content?: string | null;
}) {
  return isHighRiskAction(input) ? "高风险" : "常规";
}

export function useUnsavedChangesGuard(
  enabled: boolean,
  message = "当前页面有未保存修改，确定要离开吗？",
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const link = target?.closest("a[href]") as HTMLAnchorElement | null;

      if (!link || link.target === "_blank") {
        return;
      }

      const nextUrl = new URL(link.href, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (nextUrl.origin !== currentUrl.origin) {
        return;
      }

      if (
        nextUrl.pathname === currentUrl.pathname &&
        nextUrl.search === currentUrl.search &&
        nextUrl.hash === currentUrl.hash
      ) {
        return;
      }

      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [enabled, message]);
}
