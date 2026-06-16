"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { StatusBadge, SummaryCard } from "./primitives";

type GuideAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
};

type GuideStep = {
  label: string;
  description: string;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function actionClass(variant: GuideAction["variant"] = "primary") {
  if (variant === "secondary") {
    return "button secondary inline";
  }

  if (variant === "ghost") {
    return "button ghost inline";
  }

  return "button inline";
}

function GuideActionButton({
  action,
}: {
  action: GuideAction;
}) {
  if (action.href) {
    return (
      <Link className={actionClass(action.variant)} href={action.href}>
        {action.label}
      </Link>
    );
  }

  return (
    <button
      className={actionClass(action.variant)}
      disabled={action.disabled}
      onClick={action.onClick}
      type="button"
    >
      {action.label}
    </button>
  );
}

export function FirstRunGuide({
  actions,
  className,
  description,
  guideKey,
  launcherLabel = "查看新手引导",
  steps,
  title,
}: {
  actions?: GuideAction[];
  className?: string;
  description: string;
  guideKey: string;
  launcherLabel?: string;
  steps: GuideStep[];
  title: string;
}) {
  const storageKey = useMemo(
    () => `huigui:first-run-guide:${guideKey}`,
    [guideKey],
  );
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setDismissed(window.localStorage.getItem(storageKey) === "dismissed");
    setReady(true);
  }, [storageKey]);

  function handleDismiss() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, "dismissed");
    }
    setDismissed(true);
  }

  function handleReopen() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
    setDismissed(false);
  }

  if (!ready) {
    return null;
  }

  if (dismissed) {
    return (
      <div className="first-run-guide__launcher">
        <button
          className="button ghost inline first-run-guide__launcher-button"
          onClick={handleReopen}
          type="button"
        >
          {launcherLabel}
        </button>
      </div>
    );
  }

  return (
    <SummaryCard
      actions={<StatusBadge variant="badge">首次使用</StatusBadge>}
      className={cn("first-run-guide", className)}
      description={description}
      title={title}
    >
      <div className="first-run-guide__steps">
        {steps.map((step, index) => (
          <article className="first-run-guide__step" key={`${step.label}-${index + 1}`}>
            <span className="first-run-guide__step-index">{index + 1}</span>
            <strong>{step.label}</strong>
            <p>{step.description}</p>
          </article>
        ))}
      </div>

      <div className="first-run-guide__footer">
        <div className="first-run-guide__actions">
          {actions?.map((action) => (
            <GuideActionButton action={action} key={`${action.label}-${action.href ?? "action"}`} />
          ))}
        </div>
        <div className="first-run-guide__dismiss-row">
          <span className="small muted">这张提示只会主动出现一次。</span>
          <button className="button ghost inline" onClick={handleDismiss} type="button">
            我知道了
          </button>
        </div>
      </div>
    </SummaryCard>
  );
}
