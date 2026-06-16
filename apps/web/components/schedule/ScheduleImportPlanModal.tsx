"use client";

import { ManagementDrawer } from "../management/ManagementDrawer";
import { EmptyState, StatusBadge } from "../system/primitives";
import type { ScheduleImportCandidate } from "./types";

type ScheduleImportPlanModalProps = {
  open: boolean;
  loading: boolean;
  saving: boolean;
  error?: string;
  items: ScheduleImportCandidate[];
  selectedIds: string[];
  date: string;
  time: string;
  allDay: boolean;
  onClose: () => void;
  onToggle: (id: string) => void;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onAllDayChange: (value: boolean) => void;
  onConfirm: () => void;
};

export function ScheduleImportPlanModal({
  open,
  loading,
  saving,
  error,
  items,
  selectedIds,
  date,
  time,
  allDay,
  onClose,
  onToggle,
  onDateChange,
  onTimeChange,
  onAllDayChange,
  onConfirm,
}: ScheduleImportPlanModalProps) {
  return (
    <ManagementDrawer
      actions={
        <>
          <button className="button secondary inline" onClick={onClose} type="button">
            取消
          </button>
          <button
            className="button inline"
            disabled={saving || selectedIds.length === 0}
            onClick={onConfirm}
            type="button"
          >
            {saving ? "导入中..." : `导入 ${selectedIds.length} 项`}
          </button>
        </>
      }
      eyebrow="计划导入"
      onClose={onClose}
      open={open}
      size="large"
      subtitle="把周报计划或月目标节点直接排进日程，并同步清掉待安排状态。"
      title="从计划导入到日程"
    >
      <div className="stack">
        <section className="drawer-section">
          <h4>导入时间</h4>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="schedule-import-date">默认日期</label>
              <input
                id="schedule-import-date"
                onChange={(event) => onDateChange(event.target.value)}
                type="date"
                value={date}
              />
            </div>
            <div className="field">
              <label htmlFor="schedule-import-time">默认时间</label>
              <input
                disabled={allDay}
                id="schedule-import-time"
                onChange={(event) => onTimeChange(event.target.value)}
                type="time"
                value={time}
              />
            </div>
          </div>
          <label className="checkbox-row drawer-checkbox">
            <input
              checked={allDay}
              onChange={(event) => onAllDayChange(event.target.checked)}
              type="checkbox"
            />
            <span>导入为全天事项</span>
          </label>
        </section>

        <section className="drawer-section">
          <h4>可导入事项</h4>
          {error ? <div className="danger-text small">{error}</div> : null}

          {loading ? (
            <div className="small muted">正在加载待安排事项...</div>
          ) : items.length ? (
            <div className="schedule-import-list">
              {items.map((item) => (
                <label className="schedule-import-item" key={item.id}>
                  <input
                    checked={selectedIds.includes(item.id)}
                    onChange={() => onToggle(item.id)}
                    type="checkbox"
                  />
                  <div className="schedule-import-item__body">
                    <div className="schedule-import-item__top">
                      <strong>{item.title}</strong>
                      <div className="action-row">
                        <StatusBadge tone="neutral">{item.sourceLabel}</StatusBadge>
                        <StatusBadge tone="neutral">{item.ownerLabel}</StatusBadge>
                      </div>
                    </div>
                    <p>{item.description || "尚未补充详细说明。"}</p>
                    <div className="small muted">{item.periodLabel}</div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <EmptyState
              description="当前没有可以导入到日程的周报计划或月目标节点。"
              title="暂无待安排事项"
            />
          )}
        </section>
      </div>
    </ManagementDrawer>
  );
}
