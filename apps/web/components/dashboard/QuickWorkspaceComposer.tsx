"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createLocalWorkspaceItem,
  workspaceKindLabel,
  workspacePriorityLabel,
  type LocalWorkspaceItem,
  type WorkspaceItemKind,
  type WorkspacePriority,
} from "../../lib/workspace";
import { RightDrawer } from "../system/primitives";

type QuickWorkspaceComposerProps = {
  assignee?: string;
  initialKind?: WorkspaceItemKind;
  open: boolean;
  onClose: () => void;
  onCreated?: (item: LocalWorkspaceItem) => void;
  relatedHref?: string;
  relatedId?: string;
  relatedLabel: string;
  relatedType: "customer" | "quotation" | "contract" | "solution" | "internal";
};

const kindOptions: WorkspaceItemKind[] = ["reminder", "schedule", "todo"];
const priorityOptions: WorkspacePriority[] = ["high", "medium", "low"];

function buildDefaultTitle(kind: WorkspaceItemKind, relatedLabel: string) {
  switch (kind) {
    case "reminder":
      return `跟进 ${relatedLabel}`;
    case "schedule":
      return `${relatedLabel} 日程安排`;
    case "todo":
      return `${relatedLabel} 待办`;
    default:
      return relatedLabel;
  }
}

export function QuickWorkspaceComposer({
  assignee,
  initialKind = "reminder",
  open,
  onClose,
  onCreated,
  relatedHref,
  relatedId,
  relatedLabel,
  relatedType,
}: QuickWorkspaceComposerProps) {
  const [kind, setKind] = useState<WorkspaceItemKind>(initialKind);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState<WorkspacePriority>("medium");

  const dialogTitle = useMemo(() => `新增${workspaceKindLabel(kind)}`, [kind]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setKind(initialKind);
    setTitle(buildDefaultTitle(initialKind, relatedLabel));
    setSummary("");
    setDueAt("");
    setPriority("medium");
  }, [initialKind, open, relatedLabel]);

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
    <RightDrawer
      className="workspace-composer-drawer"
      description="把当前对象关联进提醒、日程或待办，方便后续在首页和通知里统一处理。"
      eyebrow="协作动作"
      footer={
        <>
          <button
            className="button secondary inline"
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="button inline"
            disabled={!title.trim()}
            onClick={() => {
              const created = createLocalWorkspaceItem({
                assignee,
                dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
                kind,
                priority,
                relatedHref,
                relatedId,
                relatedLabel,
                relatedType,
                summary: summary.trim() || "待补充说明",
                title: title.trim(),
              });
              onCreated?.(created);
              onClose();
            }}
            type="button"
          >
            保存协作事项
          </button>
        </>
      }
      onClose={onClose}
      open={open}
      title={dialogTitle}
      widthClass="detail-drawer"
    >
      <div className="stack">
        <div className="segmented-control">
          {kindOptions.map((option) => (
            <button
              className={`segmented-control__item ${kind === option ? "active" : ""}`}
              key={option}
              onClick={() => setKind(option)}
              type="button"
            >
              {workspaceKindLabel(option)}
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="workspace-title">标题</label>
          <input
            id="workspace-title"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="输入待处理事项标题"
            value={title}
          />
        </div>

        <div className="field">
          <label htmlFor="workspace-summary">说明</label>
          <textarea
            id="workspace-summary"
            onChange={(event) => setSummary(event.target.value)}
            placeholder="补充下一步动作、沟通重点或交付要求"
            rows={5}
            value={summary}
          />
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="workspace-due-at">
              {kind === "schedule" ? "日程时间" : "提醒时间"}
            </label>
            <input
              id="workspace-due-at"
              onChange={(event) => setDueAt(event.target.value)}
              type="datetime-local"
              value={dueAt}
            />
          </div>

          <div className="field">
            <label>优先级</label>
            <div className="segmented-control compact">
              {priorityOptions.map((option) => (
                <button
                  className={`segmented-control__item ${priority === option ? "active" : ""}`}
                  key={option}
                  onClick={() => setPriority(option)}
                  type="button"
                >
                  {workspacePriorityLabel(option)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-list">
            <div className="summary-row">
              <span>关联对象</span>
              <strong>{relatedLabel}</strong>
            </div>
            <div className="summary-row">
              <span>指派给</span>
              <strong>{assignee || "当前负责人"}</strong>
            </div>
            <div className="summary-row">
              <span>动作类型</span>
              <strong>{workspaceKindLabel(kind)}</strong>
            </div>
          </div>
        </div>
      </div>
    </RightDrawer>
  );
}
