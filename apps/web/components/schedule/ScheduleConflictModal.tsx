"use client";

import { ManagementDrawer } from "../management/ManagementDrawer";

type ConflictItem = {
  id: string;
  title: string;
  timeRange: string;
};

type ScheduleConflictModalProps = {
  open: boolean;
  conflicts: ConflictItem[];
  onClose: () => void;
  onConfirm: () => void;
};

export function ScheduleConflictModal({
  open,
  conflicts,
  onClose,
  onConfirm,
}: ScheduleConflictModalProps) {
  return (
    <ManagementDrawer
      actions={
        <>
          <button className="button secondary inline" onClick={onClose} type="button">
            返回修改
          </button>
          <button className="button inline" onClick={onConfirm} type="button">
            仍然创建
          </button>
        </>
      }
      eyebrow="时间冲突"
      onClose={onClose}
      open={open}
      size="medium"
      subtitle="该时间段已经存在安排，确认后仍会按当前时间保存。"
      title="发现时间冲突"
    >
      <div className="stack">
        <p className="small muted">
          该时间段已有安排，是否仍然创建？
        </p>
        <div className="schedule-conflict-list">
          {conflicts.map((item) => (
            <article className="schedule-conflict-item" key={item.id}>
              <strong>{item.title}</strong>
              <span>{item.timeRange}</span>
            </article>
          ))}
        </div>
      </div>
    </ManagementDrawer>
  );
}
