"use client";

import type {
  ScheduleMemberOption,
  ScheduleMemberView,
  ScheduleSourceFilter,
  ScheduleStatusFilter,
  ScheduleViewMode,
} from "./types";
import type { Tone } from "../system/primitives";

type ScheduleToolbarProps = {
  title: string;
  description: string;
  currentLabel: string;
  viewMode: ScheduleViewMode;
  memberView: ScheduleMemberView;
  sourceFilter: ScheduleSourceFilter;
  statusFilter: ScheduleStatusFilter;
  keyword: string;
  assigneeId: string;
  assigneeOptions: ScheduleMemberOption[];
  sourceOptions: Array<{ value: string; label: string }>;
  statusOptions: Array<{ value: string; label: string }>;
  meta?: Array<{ label: string; value: string; tone?: Tone }>;
  canViewTeam: boolean;
  onCreate: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewModeChange: (value: ScheduleViewMode) => void;
  onMemberViewChange: (value: ScheduleMemberView) => void;
  onAssigneeChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onSourceFilterChange: (value: ScheduleSourceFilter) => void;
  onStatusFilterChange: (value: ScheduleStatusFilter) => void;
  onResetFilters: () => void;
  onRefresh?: () => void;
  onOpenImport?: () => void;
};

const viewOptions: Array<{ value: ScheduleViewMode; label: string }> = [
  { value: "day", label: "日" },
  { value: "week", label: "周" },
  { value: "month", label: "月" },
  { value: "list", label: "列表" },
];

export function ScheduleToolbar({
  title,
  description,
  currentLabel,
  viewMode,
  memberView,
  sourceFilter,
  statusFilter,
  keyword,
  assigneeId,
  assigneeOptions,
  sourceOptions,
  statusOptions,
  meta,
  canViewTeam,
  onCreate,
  onPrev,
  onNext,
  onToday,
  onViewModeChange,
  onMemberViewChange,
  onAssigneeChange,
  onKeywordChange,
  onSourceFilterChange,
  onStatusFilterChange,
  onResetFilters,
  onRefresh,
  onOpenImport,
}: ScheduleToolbarProps) {
  return (
    <section className="schedule-workbench-toolbar">
      <div className="schedule-workbench-toolbar__primary">
        <div className="schedule-workbench-toolbar__identity">
          <span className="schedule-workbench-toolbar__eyebrow">日程管理</span>
          <div className="schedule-workbench-toolbar__copy">
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </div>

        {meta?.length ? (
          <div className="schedule-workbench-toolbar__meta">
            {meta.map((item) => (
              <div
                className={`data-chip ${item.tone ?? "neutral"}`}
                key={`${item.label}-${item.value}`}
              >
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        ) : null}

        <div className="schedule-workbench-toolbar__actions">
          {onOpenImport ? (
            <button
              className="button secondary inline"
              onClick={onOpenImport}
              type="button"
            >
              从计划导入
            </button>
          ) : null}
          <button
            className="button inline schedule-toolbar-create"
            onClick={onCreate}
            type="button"
          >
            新增日程
          </button>
        </div>
      </div>

      <div className="schedule-workbench-toolbar__secondary">
        <div className="schedule-date-navigator" aria-label="日历日期导航">
          <button
            className="schedule-icon-button"
            onClick={onPrev}
            type="button"
            aria-label="上一段"
          >
            ‹
          </button>
          <button
            className="schedule-date-navigator__today"
            onClick={onToday}
            type="button"
          >
            今天
          </button>
          <button
            className="schedule-icon-button"
            onClick={onNext}
            type="button"
            aria-label="下一段"
          >
            ›
          </button>
          <strong>{currentLabel}</strong>
        </div>

        <div className="schedule-view-switch" aria-label="日程视图切换">
          <div className="segmented-control compact">
            {viewOptions.map((option) => (
              <button
                className={`segmented-control__item ${viewMode === option.value ? "active" : ""}`}
                key={option.value}
                onClick={() => onViewModeChange(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <label className="schedule-search-field" htmlFor="schedule-search">
          <span>搜索</span>
          <input
            id="schedule-search"
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder="搜索日程、客户、负责人"
            value={keyword}
          />
        </label>

        <div className="schedule-toolbar-filter-row">
          <div className="segmented-control compact schedule-scope-switch">
            <button
              className={`segmented-control__item ${memberView === "me" ? "active" : ""}`}
              onClick={() => onMemberViewChange("me")}
              type="button"
            >
              我的
            </button>
            <button
              className={`segmented-control__item ${memberView === "team" ? "active" : ""}`}
              disabled={!canViewTeam}
              onClick={() => onMemberViewChange("team")}
              type="button"
            >
              团队
            </button>
          </div>

          {memberView === "team" && canViewTeam ? (
            <label className="field field--inline schedule-toolbar-select">
              <span>成员</span>
              <select
                onChange={(event) => onAssigneeChange(event.target.value)}
                value={assigneeId}
              >
                {assigneeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="field field--inline schedule-toolbar-select">
            <span>来源</span>
            <select
              onChange={(event) =>
                onSourceFilterChange(event.target.value as ScheduleSourceFilter)
              }
              value={sourceFilter}
            >
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field field--inline schedule-toolbar-select">
            <span>状态</span>
            <select
              onChange={(event) =>
                onStatusFilterChange(event.target.value as ScheduleStatusFilter)
              }
              value={statusFilter}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            className="button ghost inline"
            onClick={onResetFilters}
            type="button"
          >
            重置
          </button>
          {onRefresh ? (
            <button className="button ghost inline" onClick={onRefresh} type="button">
              刷新
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
