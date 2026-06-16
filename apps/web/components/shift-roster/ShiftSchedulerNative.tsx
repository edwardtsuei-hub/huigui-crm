"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  EmptyState,
  StatusBadge,
} from "../system/primitives";
import {
  apiFetch,
  getCurrentUser,
  hasPermission,
  type CurrentUser,
} from "../../lib/api";
import {
  BLANK_DAILY_INFO,
  DEPARTMENT_META,
  POSITION_OPTIONS,
  SHIFT_CODES,
  SHIFT_CODE_META,
  SHIFT_DEPARTMENTS,
  addDays,
  buildWeekCopy,
  countDailyInfoLines,
  formatDateKey,
  formatFullDateLabel,
  formatShortDateLabel,
  formatWeekRangeLabel,
  formatWeekdayLabel,
  getDailyInfo,
  getMonday,
  getShiftValue,
  getWeekDates,
  parseDateKey,
  removeStaffMember,
  setDailyInfo,
  setShiftCode,
  setShiftTime,
  sortStaffMembers,
  type ShiftRosterConfig,
  type ShiftRosterDepartmentKey,
  type ShiftRosterResponse,
  type ShiftRosterShiftValue,
  type ShiftRosterStaffMember,
  upsertStaffMember,
} from "../../lib/shift-roster";
import styles from "./ShiftSchedulerNative.module.css";

type SaveState = "loading" | "idle" | "saving" | "saved" | "error";
type WorkspaceView = "roster" | "staff" | "settings";
type NoticeTone = "neutral" | "success" | "warning" | "danger";

type ShiftEditorState = {
  department: ShiftRosterDepartmentKey;
  staffId: string;
  staffName: string;
  dateKey: string;
};

type StaffEditorState = {
  id?: string;
  name: string;
  dept: ShiftRosterDepartmentKey;
  position: string;
  phone: string;
};

type ExportPreviewState = {
  url: string;
  fileName: string;
  title: string;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "尚未同步";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatPreviewText(value: string, emptyText: string) {
  const normalized = value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (!normalized.length) {
    return emptyText;
  }

  return normalized.join("\n");
}

function buildExportFileName(
  department: ShiftRosterDepartmentKey,
  weekDates: Date[],
) {
  const startKey = formatDateKey(weekDates[0]);
  const endKey = formatDateKey(weekDates[weekDates.length - 1]);
  return `${DEPARTMENT_META[department].exportTitle}_${startKey}_to_${endKey}.jpg`;
}

function groupedStaff(staff: ShiftRosterStaffMember[]) {
  const groups = new Map<string, ShiftRosterStaffMember[]>();

  staff.forEach((member) => {
    const groupKey = member.position || "未设置职位";
    const current = groups.get(groupKey) ?? [];
    current.push(member);
    groups.set(groupKey, current);
  });

  return Array.from(groups.entries());
}

export function ShiftSchedulerNative() {
  const exportRef = useRef<HTMLDivElement | null>(null);
  const configRef = useRef<ShiftRosterConfig | null>(null);
  const lastSavedSnapshotRef = useRef("");
  const hydratedRef = useRef(false);
  const saveRequestIdRef = useRef(0);
  const [loadVersion, setLoadVersion] = useState(0);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [config, setConfig] = useState<ShiftRosterConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
    null,
  );
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedByName, setUpdatedByName] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<WorkspaceView>("roster");
  const [activeDept, setActiveDept] =
    useState<ShiftRosterDepartmentKey>("frontHouse");
  const [mobileLayout, setMobileLayout] = useState(false);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    formatDateKey(new Date()),
  );
  const [shiftEditor, setShiftEditor] = useState<ShiftEditorState | null>(null);
  const [shiftDraftValue, setShiftDraftValue] =
    useState<ShiftRosterShiftValue>("");
  const [staffEditor, setStaffEditor] = useState<StaffEditorState | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportPreview, setExportPreview] = useState<ExportPreviewState | null>(
    null,
  );

  const canEdit = hasPermission(currentUser, "action.schedule.update");
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const weekRangeLabel = useMemo(
    () => formatWeekRangeLabel(weekDates),
    [weekDates],
  );
  const todayKey = formatDateKey(new Date());
  const activeStaff = useMemo(() => {
    if (!config) {
      return [];
    }

    return [...config.staff[activeDept]].sort(sortStaffMembers);
  }, [activeDept, config]);
  const staffByPosition = useMemo(
    () => groupedStaff(activeStaff),
    [activeStaff],
  );
  const selectedInfo = useMemo(() => {
    if (!config) {
      return BLANK_DAILY_INFO;
    }

    return getDailyInfo(config, activeDept, selectedDateKey);
  }, [activeDept, config, selectedDateKey]);
  const selectedDate = useMemo(
    () => parseDateKey(selectedDateKey),
    [selectedDateKey],
  );
  const dailyCards = useMemo(() => {
    if (!config) {
      return [];
    }

    return weekDates.map((date) => {
      const dateKey = formatDateKey(date);
      const info = getDailyInfo(config, activeDept, dateKey);
      return {
        date,
        dateKey,
        info,
        activityCount: countDailyInfoLines(info.activity),
        noteCount: countDailyInfoLines(info.note),
        reservationCount: countDailyInfoLines(info.reservation),
      };
    });
  }, [activeDept, config, weekDates]);
  const stats = useMemo(() => {
    if (!config) {
      return {
        staffCount: 0,
        assignedShiftCount: 0,
        infoLineCount: 0,
      };
    }

    const assignedShiftCount = activeStaff.reduce((total, member) => {
      return (
        total +
        weekDates.filter((date) =>
          Boolean(getShiftValue(config, activeDept, member.id, formatDateKey(date))),
        ).length
      );
    }, 0);

    const infoLineCount = dailyCards.reduce((total, item) => {
      return total + item.activityCount + item.noteCount + item.reservationCount;
    }, 0);

    return {
      staffCount: activeStaff.length,
      assignedShiftCount,
      infoLineCount,
    };
  }, [activeDept, activeStaff, config, dailyCards, weekDates]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notice]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => {
      setMobileLayout(mediaQuery.matches);
    };

    syncViewport();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewport);
      return () => {
        mediaQuery.removeEventListener("change", syncViewport);
      };
    }

    mediaQuery.addListener(syncViewport);
    return () => {
      mediaQuery.removeListener(syncViewport);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setSaveState("loading");
      setError("");

      const user = getCurrentUser();
      if (!cancelled) {
        setCurrentUser(user);
      }

      try {
        const response = await apiFetch<ShiftRosterResponse>("/settings/shift-roster");
        if (cancelled) {
          return;
        }

        hydratedRef.current = true;
        lastSavedSnapshotRef.current = JSON.stringify(response.config);
        configRef.current = response.config;
        setConfig(response.config);
        setUpdatedAt(response.updatedAt);
        setUpdatedByName(response.updatedBy?.name ?? null);
        setSaveState(response.updatedAt ? "saved" : "idle");
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "班表页面加载失败",
          );
          setSaveState("error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [loadVersion]);

  useEffect(() => {
    if (!canEdit && activeView !== "roster") {
      setActiveView("roster");
    }
  }, [activeView, canEdit]);

  useEffect(() => {
    const weekKeys = weekDates.map((date) => formatDateKey(date));
    if (weekKeys.includes(selectedDateKey)) {
      return;
    }

    const nextSelected =
      weekKeys.find((dateKey) => dateKey === todayKey) ?? weekKeys[0] ?? todayKey;
    setSelectedDateKey(nextSelected);
  }, [selectedDateKey, todayKey, weekDates]);

  useEffect(() => {
    if (!config || !canEdit || !hydratedRef.current) {
      return;
    }

    const snapshot = JSON.stringify(config);
    if (snapshot === lastSavedSnapshotRef.current) {
      return;
    }

    setSaveState("idle");

    const timer = window.setTimeout(() => {
      void persistConfig(config, true);
    }, 1400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [canEdit, config]);

  function patchConfig(updater: (current: ShiftRosterConfig) => ShiftRosterConfig) {
    setError("");
    setConfig((current) => {
      if (!current) {
        return current;
      }

      const next = updater(current);
      configRef.current = next;
      return next;
    });
  }

  async function persistConfig(
    targetConfig?: ShiftRosterConfig,
    silent = false,
  ) {
    if (!canEdit) {
      return;
    }

    const configToSave = targetConfig ?? configRef.current;
    if (!configToSave) {
      return;
    }

    const requestId = ++saveRequestIdRef.current;
    setSaving(true);
    setSaveState("saving");
    if (!silent) {
      setError("");
    }

    try {
      const response = await apiFetch<ShiftRosterResponse>("/settings/shift-roster", {
        method: "PATCH",
        body: JSON.stringify({ config: configToSave }),
      });

      if (requestId !== saveRequestIdRef.current) {
        return;
      }

      const responseSnapshot = JSON.stringify(response.config);
      const currentSnapshot = JSON.stringify(configRef.current);

      lastSavedSnapshotRef.current = responseSnapshot;
      setUpdatedAt(response.updatedAt);
      setUpdatedByName(response.updatedBy?.name ?? null);
      setSaveState("saved");

      if (currentSnapshot === JSON.stringify(configToSave)) {
        configRef.current = response.config;
        setConfig(response.config);
      }
    } catch (requestError) {
      if (requestId !== saveRequestIdRef.current) {
        return;
      }

      setSaveState("error");
      setError(
        requestError instanceof Error ? requestError.message : "班表云端保存失败",
      );
    } finally {
      if (requestId === saveRequestIdRef.current) {
        setSaving(false);
      }
    }
  }

  function shiftWeek(days: number) {
    setWeekStart((current) => addDays(current, days));
    setSelectedDateKey((current) => formatDateKey(addDays(parseDateKey(current), days)));
  }

  function openShiftEditor(
    department: ShiftRosterDepartmentKey,
    member: ShiftRosterStaffMember,
    dateKey: string,
  ) {
    if (!config || !canEdit) {
      return;
    }

    setSelectedDateKey(dateKey);
    setShiftEditor({
      department,
      staffId: member.id,
      staffName: member.name,
      dateKey,
    });
    setShiftDraftValue(getShiftValue(config, department, member.id, dateKey));
  }

  function saveShiftEditor() {
    if (!shiftEditor) {
      return;
    }

    patchConfig((current) =>
      setShiftCode(
        current,
        shiftEditor.department,
        shiftEditor.staffId,
        shiftEditor.dateKey,
        shiftDraftValue,
      ),
    );
    setShiftEditor(null);
    setNotice({ tone: "success", text: "班次已更新" });
  }

  function assignShiftDirect(
    member: ShiftRosterStaffMember,
    shiftCode: ShiftRosterShiftValue,
  ) {
    patchConfig((current) =>
      setShiftCode(current, activeDept, member.id, selectedDateKey, shiftCode),
    );
  }

  function openStaffEditor(member?: ShiftRosterStaffMember) {
    if (!canEdit) {
      return;
    }

    if (member) {
      setStaffEditor({
        id: member.id,
        name: member.name,
        dept: member.dept,
        position: member.position,
        phone: member.phone,
      });
      return;
    }

    setStaffEditor({
      name: "",
      dept: activeDept,
      position: POSITION_OPTIONS[activeDept][0] ?? "",
      phone: "",
    });
  }

  function saveStaffEditor() {
    if (!staffEditor) {
      return;
    }

    const name = staffEditor.name.trim();
    const position = staffEditor.position.trim();
    const phone = staffEditor.phone.trim();

    if (!name || !position) {
      setError("请先填写姓名和职位。");
      return;
    }

    patchConfig((current) =>
      upsertStaffMember(current, {
        id: staffEditor.id,
        name,
        dept: staffEditor.dept,
        position,
        phone,
      }),
    );

    setActiveDept(staffEditor.dept);
    setStaffEditor(null);
    setNotice({
      tone: "success",
      text: staffEditor.id ? "人员资料已更新" : "人员已加入班表",
    });
  }

  function deleteStaff(member: ShiftRosterStaffMember) {
    if (!canEdit || !config) {
      return;
    }

    if (!window.confirm(`确认删除 ${member.name} 吗？`)) {
      return;
    }

    patchConfig((current) => removeStaffMember(current, member.dept, member.id));
    setNotice({ tone: "warning", text: `${member.name} 已从班表移除` });
  }

  function updateSelectedInfo(
    field: keyof typeof BLANK_DAILY_INFO,
    value: string,
  ) {
    patchConfig((current) =>
      setDailyInfo(current, activeDept, selectedDateKey, {
        ...getDailyInfo(current, activeDept, selectedDateKey),
        [field]: value,
      }),
    );
  }

  function clearSelectedDayInfo() {
    if (!canEdit) {
      return;
    }

    if (!window.confirm("确认清空这一天的活动、备注和预约信息吗？")) {
      return;
    }

    patchConfig((current) =>
      setDailyInfo(current, activeDept, selectedDateKey, BLANK_DAILY_INFO),
    );
    setNotice({ tone: "warning", text: "当天信息已清空" });
  }

  function copyThisWeekToNext() {
    patchConfig((current) => buildWeekCopy(current, activeDept, weekStart));
    setWeekStart((current) => addDays(current, 7));
    setSelectedDateKey((current) => formatDateKey(addDays(parseDateKey(current), 7)));
    setNotice({ tone: "success", text: "本周班表和当天信息已复制到下周" });
  }

  async function generateImage() {
    if (!config || !exportRef.current) {
      return;
    }

    if (!activeStaff.length) {
      setNotice({ tone: "warning", text: "当前部门还没有人员，暂时不能导出图片。" });
      return;
    }

    setExporting(true);
    setError("");

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
      });
      const url = canvas.toDataURL("image/jpeg", 0.95);
      setExportPreview({
        url,
        fileName: buildExportFileName(activeDept, weekDates),
        title: DEPARTMENT_META[activeDept].exportTitle,
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "班表图片生成失败",
      );
    } finally {
      setExporting(false);
    }
  }

  const syncLabel =
    saveState === "saving"
      ? "保存中"
      : saveState === "saved"
        ? "已同步"
        : saveState === "error"
          ? "同步失败"
          : saveState === "loading"
            ? "加载中"
            : "待同步";

  const syncTone =
    saveState === "saved"
      ? "success"
      : saveState === "saving"
        ? "warning"
      : saveState === "error"
        ? "danger"
        : "neutral";

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.heroCopy}>
            <span className={styles.heroEyebrow}>班表协同</span>
            <h1>班表管理</h1>
            <p>
              直接在大爱归心管理平台里维护班表、活动、备注和预约，不再嵌入旧网页。
            </p>
          </div>
          <div className={styles.heroActions}>
            {canEdit ? (
              <button
                className="button secondary inline"
                disabled={!config || saving}
                onClick={() => void persistConfig()}
                type="button"
              >
                立即保存
              </button>
            ) : null}
            <button
              className="button inline"
              disabled={loading || exporting || !config}
              onClick={() => void generateImage()}
              type="button"
            >
              {exporting ? "生成中..." : "生成 JPG"}
            </button>
            <button
              className="button secondary inline"
              disabled={loading}
              onClick={() => setLoadVersion((current) => current + 1)}
              type="button"
            >
              重新载入
            </button>
          </div>
        </div>

        <div className={styles.heroMeta}>
          <div className={styles.summaryBadges}>
            <StatusBadge tone="success">系统统一登录</StatusBadge>
            <StatusBadge tone="success">云端共享保存</StatusBadge>
            <StatusBadge tone="neutral">支持活动 / 备注 / 预约</StatusBadge>
            <StatusBadge tone={canEdit ? "success" : "neutral"}>
              {canEdit ? "当前可编辑" : "当前只读"}
            </StatusBadge>
            <StatusBadge tone={syncTone}>状态：{syncLabel}</StatusBadge>
          </div>
          <div
            className={`wm-autosave ${saveState === "saving" ? "saving" : saveState === "saved" ? "saved" : saveState === "error" ? "error" : ""}`}
          >
            <span>云端：{syncLabel}</span>
            <time>{formatDateTime(updatedAt)}</time>
          </div>
        </div>

        <div className={styles.heroFoot}>
          最近一次云端更新：{formatDateTime(updatedAt)}
          {updatedByName ? ` · ${updatedByName}` : ""}
          {notice ? ` · ${notice.text}` : ""}
        </div>
      </section>

      {error ? <div className="danger-text small">{error}</div> : null}

      {!config && loading ? (
        <section className={styles.emptyShell}>
          <div className="empty-state-card">
            <strong>正在装载班表工作台</strong>
            <span>系统会直接读取云端共享班表数据。</span>
          </div>
        </section>
      ) : null}

      {!config && !loading ? (
        <section className={styles.emptyShell}>
          <EmptyState
            action={
              <button
                className="button secondary inline"
                onClick={() => setLoadVersion((current) => current + 1)}
                type="button"
              >
                重试加载
              </button>
            }
            description="班表数据暂时没有加载出来，可以重新试一次。"
            title="班表工作台还没打开"
          />
        </section>
      ) : null}

      {config ? (
        <>
          <section className={styles.commandRail}>
            <div className={styles.workspaceTabs}>
              <button
                className={`segmented-control__item ${activeView === "roster" ? "active" : ""}`}
                onClick={() => setActiveView("roster")}
                type="button"
              >
                本周班表
              </button>
              {canEdit ? (
                <button
                  className={`segmented-control__item ${activeView === "staff" ? "active" : ""}`}
                  onClick={() => setActiveView("staff")}
                  type="button"
                >
                  人员管理
                </button>
              ) : null}
              {canEdit ? (
                <button
                  className={`segmented-control__item ${activeView === "settings" ? "active" : ""}`}
                  onClick={() => setActiveView("settings")}
                  type="button"
                >
                  班次设置
                </button>
              ) : null}
            </div>

            <div className={styles.departmentRail}>
              {SHIFT_DEPARTMENTS.map((department) => (
                <button
                  className={`${styles.departmentChip} ${activeDept === department ? styles.departmentChipActive : ""}`}
                  key={department}
                  onClick={() => setActiveDept(department)}
                  type="button"
                >
                  <span>{DEPARTMENT_META[department].icon}</span>
                  <strong>{DEPARTMENT_META[department].name}</strong>
                </button>
              ))}
            </div>
          </section>

          {activeView === "roster" ? (
            <>
              <section className={styles.rosterIntro}>
                <div className={styles.weekToolbar}>
                  <div className={styles.weekNav}>
                    <button
                      className={`button secondary inline ${styles.weekNavButton}`}
                      onClick={() => shiftWeek(-7)}
                      type="button"
                    >
                      ‹
                    </button>
                    <button
                      className={`button secondary inline ${styles.weekNavButton}`}
                      onClick={() => shiftWeek(7)}
                      type="button"
                    >
                      ›
                    </button>
                  </div>

                  <div className={styles.weekRange}>
                    <strong>{weekRangeLabel}</strong>
                    <span>
                      {DEPARTMENT_META[activeDept].icon} {DEPARTMENT_META[activeDept].name}
                      {mobileLayout
                        ? " · 手机端切换到当天卡片排班"
                        : canEdit
                          ? " · 支持直接点击班次修改"
                          : " · 当前为查看模式"}
                    </span>
                  </div>

                  <div className={styles.headerActions}>
                    {canEdit ? (
                      <button
                        className="button secondary inline"
                        onClick={copyThisWeekToNext}
                        type="button"
                      >
                        复制到下周
                      </button>
                    ) : null}
                    <button
                      className="button ghost inline"
                      onClick={() => {
                        setWeekStart(getMonday(new Date()));
                        setSelectedDateKey(todayKey);
                      }}
                      type="button"
                    >
                      回到本周
                    </button>
                  </div>
                </div>

                <div className={styles.metrics}>
                  <article className={styles.metricCard}>
                    <span>当前人员</span>
                    <strong>{stats.staffCount}</strong>
                    <p>已纳入 {DEPARTMENT_META[activeDept].name} 本周排班的成员数。</p>
                  </article>
                  <article className={styles.metricCard}>
                    <span>已排班格数</span>
                    <strong>{stats.assignedShiftCount}</strong>
                    <p>包含早班、晚班、全天、休息和请假。</p>
                  </article>
                  <article className={styles.metricCard}>
                    <span>当天信息条数</span>
                    <strong>{stats.infoLineCount}</strong>
                    <p>活动、备注、预约都会跟着周班表一起保存。</p>
                  </article>
                </div>
              </section>

              <section className={styles.rosterSurface}>
                <div className={styles.surfaceHeader}>
                  <div>
                    <strong>本周排班</strong>
                    <span>
                      {mobileLayout
                        ? "手机端直接以当天人员卡片排班，不再塞进宽表格。"
                        : "桌面端保留周矩阵，一眼看完整周班次。"}
                    </span>
                  </div>
                  {canEdit && !activeStaff.length ? (
                    <button
                      className="button inline"
                      onClick={() => openStaffEditor()}
                      type="button"
                    >
                      新增人员
                    </button>
                  ) : null}
                </div>

                <div className={styles.dayStrip}>
                  {dailyCards.map((item) => (
                    <button
                      className={`${styles.dayButton} ${selectedDateKey === item.dateKey ? styles.dayButtonActive : ""} ${item.dateKey === todayKey ? styles.dayButtonToday : ""}`}
                      key={item.dateKey}
                      onClick={() => setSelectedDateKey(item.dateKey)}
                      type="button"
                    >
                      <span>周{formatWeekdayLabel(item.date)}</span>
                      <strong>{formatShortDateLabel(item.date)}</strong>
                      <div className={styles.dayCounts}>
                        {item.activityCount ? (
                          <span className={styles.countBadge} data-tone="activity">
                            活 {item.activityCount}
                          </span>
                        ) : null}
                        {item.noteCount ? (
                          <span className={styles.countBadge} data-tone="note">
                            备 {item.noteCount}
                          </span>
                        ) : null}
                        {item.reservationCount ? (
                          <span className={styles.countBadge} data-tone="reservation">
                            约 {item.reservationCount}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>

                {activeStaff.length ? (
                  mobileLayout ? (
                    <MobileRosterList
                      activeDept={activeDept}
                      canEdit={canEdit}
                      config={config}
                      members={activeStaff}
                      onAssignShift={assignShiftDirect}
                      onOpenModal={openShiftEditor}
                      selectedDate={selectedDate}
                      selectedDateKey={selectedDateKey}
                    />
                  ) : (
                    <>
                      <div className={styles.tableWrap}>
                        <table className={styles.rosterTable}>
                          <thead>
                            <tr>
                              <th className={styles.nameHeader}>职位 + 姓名</th>
                              {weekDates.map((date) => {
                                const dateKey = formatDateKey(date);
                                const card = dailyCards.find((item) => item.dateKey === dateKey);
                                return (
                                  <th className={styles.dayHeader} key={dateKey}>
                                    <strong>{formatShortDateLabel(date)}</strong>
                                    <span>周{formatWeekdayLabel(date)}</span>
                                    <div className={styles.dayCounts}>
                                      {card?.activityCount ? (
                                        <span
                                          className={styles.countBadge}
                                          data-tone="activity"
                                        >
                                          A {card.activityCount}
                                        </span>
                                      ) : null}
                                      {card?.noteCount ? (
                                        <span className={styles.countBadge} data-tone="note">
                                          N {card.noteCount}
                                        </span>
                                      ) : null}
                                      {card?.reservationCount ? (
                                        <span
                                          className={styles.countBadge}
                                          data-tone="reservation"
                                        >
                                          R {card.reservationCount}
                                        </span>
                                      ) : null}
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {staffByPosition.map(([position, members]) => (
                              <FragmentRows
                                activeDept={activeDept}
                                canEdit={canEdit}
                                key={position}
                                members={members}
                                onSelectShift={openShiftEditor}
                                position={position}
                                weekDates={weekDates}
                                config={config}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className={styles.legend}>
                        <div className={styles.legendItem}>
                          <span className={styles.legendDot} data-shift="early" />
                          早班
                        </div>
                        <div className={styles.legendItem}>
                          <span className={styles.legendDot} data-shift="late" />
                          晚班
                        </div>
                        <div className={styles.legendItem}>
                          <span className={styles.legendDot} data-shift="full" />
                          全天
                        </div>
                        <div className={styles.legendItem}>
                          <span className={styles.legendDot} data-shift="off" />
                          休息 / 请假
                        </div>
                      </div>
                    </>
                  )
                ) : (
                  <EmptyState
                    action={
                      canEdit ? (
                        <button
                          className="button inline"
                          onClick={() => openStaffEditor()}
                          type="button"
                        >
                          新增人员
                        </button>
                      ) : undefined
                    }
                    description={`当前还没有 ${DEPARTMENT_META[activeDept].name} 人员，先把成员加进来就能开始排班。`}
                    title={`暂无 ${DEPARTMENT_META[activeDept].name} 人员`}
                  />
                )}
              </section>

              <section className={styles.infoSurface}>
                <div className={styles.surfaceHeader}>
                  <div>
                    <strong>{formatFullDateLabel(selectedDate)} · 当天信息</strong>
                    <span>活动、备注、预约会跟着本周班表一起共享给团队。</span>
                  </div>
                  {canEdit ? (
                    <div className={styles.inlineActions}>
                      <button
                        className="button secondary inline"
                        onClick={clearSelectedDayInfo}
                        type="button"
                      >
                        清空当天信息
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className={styles.infoLayout}>
                  <div className={styles.editorCard}>
                    <div className={styles.editorTop}>
                      <div>
                        <strong>{DEPARTMENT_META[activeDept].name} 当天说明</strong>
                        <span>提交到云端后，团队会看到同一份内容。</span>
                      </div>
                      <div className={styles.dayCounts}>
                        {countDailyInfoLines(selectedInfo.activity) ? (
                          <span className={styles.countBadge} data-tone="activity">
                            活 {countDailyInfoLines(selectedInfo.activity)}
                          </span>
                        ) : null}
                        {countDailyInfoLines(selectedInfo.note) ? (
                          <span className={styles.countBadge} data-tone="note">
                            备 {countDailyInfoLines(selectedInfo.note)}
                          </span>
                        ) : null}
                        {countDailyInfoLines(selectedInfo.reservation) ? (
                          <span className={styles.countBadge} data-tone="reservation">
                            约 {countDailyInfoLines(selectedInfo.reservation)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className={styles.editorFields}>
                      <label className="field">
                        <span className="field__label">活动日历</span>
                        <textarea
                          onChange={(event) =>
                            updateSelectedInfo("activity", event.target.value)
                          }
                          placeholder="例如：会员日、直播日、新品试吃、培训活动"
                          readOnly={!canEdit}
                          value={selectedInfo.activity}
                        />
                      </label>

                      <label className="field">
                        <span className="field__label">备注信息</span>
                        <textarea
                          onChange={(event) =>
                            updateSelectedInfo("note", event.target.value)
                          }
                          placeholder="例如：前厅提前 30 分钟到岗，后厨增加备货"
                          readOnly={!canEdit}
                          value={selectedInfo.note}
                        />
                      </label>

                      <label className="field">
                        <span className="field__label">
                          {activeDept === "daochong" ? "预约信息" : "预约 / 预定位"}
                        </span>
                        <textarea
                          onChange={(event) =>
                            updateSelectedInfo("reservation", event.target.value)
                          }
                          placeholder="例如：前厅 19:00 六位预定位；道冲 15:00 头疗预约"
                          readOnly={!canEdit}
                          value={selectedInfo.reservation}
                        />
                      </label>
                    </div>
                  </div>

                  <div className={styles.weeklyInfoGrid}>
                    {dailyCards.map((item) => (
                      <button
                        className={`${styles.weeklyInfoCard} ${selectedDateKey === item.dateKey ? styles.weeklyInfoCardActive : ""}`}
                        key={item.dateKey}
                        onClick={() => setSelectedDateKey(item.dateKey)}
                        type="button"
                      >
                        <div className={styles.cardHead}>
                          <div>
                            <strong>{formatFullDateLabel(item.date)}</strong>
                            <span>{item.dateKey}</span>
                          </div>
                          <div className={styles.dayCounts}>
                            {item.activityCount ? (
                              <span className={styles.countBadge} data-tone="activity">
                                活 {item.activityCount}
                              </span>
                            ) : null}
                            {item.noteCount ? (
                              <span className={styles.countBadge} data-tone="note">
                                备 {item.noteCount}
                              </span>
                            ) : null}
                            {item.reservationCount ? (
                              <span className={styles.countBadge} data-tone="reservation">
                                约 {item.reservationCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className={styles.previewText}>
                          {formatPreviewText(item.info.activity, "暂无活动")}
                        </div>
                        <div
                          className={`${styles.previewText} ${!item.info.note.trim() ? styles.previewTextMuted : ""}`}
                        >
                          {formatPreviewText(item.info.note, "暂无备注")}
                        </div>
                        <div
                          className={`${styles.previewText} ${!item.info.reservation.trim() ? styles.previewTextMuted : ""}`}
                        >
                          {formatPreviewText(
                            item.info.reservation,
                            activeDept === "daochong" ? "暂无预约" : "暂无预定位",
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </>
          ) : null}

          {activeView === "staff" && canEdit ? (
            <section className={styles.managerSurface}>
              <div className={styles.surfaceHeader}>
                <div>
                  <strong>人员管理</strong>
                  <span>新增、编辑成员后，班表会立即显示对应姓名和职位。</span>
                </div>
                <button
                  className="button inline"
                  onClick={() => openStaffEditor()}
                  type="button"
                >
                  新增 {DEPARTMENT_META[activeDept].name} 成员
                </button>
              </div>

              <div className={styles.staffGrid}>
                {activeStaff.length ? (
                  activeStaff.map((member) => (
                    <article className={styles.staffCard} key={member.id}>
                      <div className={styles.staffCardHead}>
                        <div>
                          <strong>{member.name}</strong>
                          <span>
                            {DEPARTMENT_META[member.dept].icon} {DEPARTMENT_META[member.dept].name}
                          </span>
                        </div>
                        <div className={styles.staffActions}>
                          <button
                            className="button secondary inline"
                            onClick={() => openStaffEditor(member)}
                            type="button"
                          >
                            编辑
                          </button>
                          <button
                            className="button danger inline"
                            onClick={() => deleteStaff(member)}
                            type="button"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                      <div className={styles.staffMeta}>
                        <div>职位：{member.position}</div>
                        <div>电话：{member.phone || "未填写"}</div>
                        <div>班表权限：跟随当前登录角色统一控制</div>
                      </div>
                    </article>
                  ))
                ) : (
                  <EmptyState
                    action={
                      <button
                        className="button inline"
                        onClick={() => openStaffEditor()}
                        type="button"
                      >
                        新增人员
                      </button>
                    }
                    description="先把人员加入当前部门，排班表就会自动带出姓名。"
                    title="这个部门还没有成员"
                  />
                )}
              </div>
            </section>
          ) : null}

          {activeView === "settings" && canEdit ? (
            <section className={styles.managerSurface}>
              <div className={styles.surfaceHeader}>
                <div>
                  <strong>班次设置</strong>
                  <span>班次时间会跟着云端共享数据一起保存。</span>
                </div>
              </div>

              <div className={styles.timesGrid}>
                {SHIFT_DEPARTMENTS.map((department) => (
                  <article className={styles.timeCard} key={department}>
                    <div className={styles.timeCardHead}>
                      <div>
                        <strong>
                          {DEPARTMENT_META[department].icon} {DEPARTMENT_META[department].name}
                        </strong>
                        <span>班次时间仅影响团队查看和导图说明。</span>
                      </div>
                    </div>
                    <div className={styles.timeRows}>
                      {(["early", "late", "full"] as const).map((shiftType) => (
                        <div className={styles.timeRow} key={shiftType}>
                          <label>{SHIFT_CODE_META[shiftType].label}</label>
                          <div className={styles.timeInputs}>
                            <input
                              onChange={(event) =>
                                patchConfig((current) =>
                                  setShiftTime(
                                    current,
                                    department,
                                    shiftType,
                                    "s",
                                    event.target.value,
                                  ),
                                )
                              }
                              type="time"
                              value={config.shiftTimes[department][shiftType].s}
                            />
                            <span>至</span>
                            <input
                              onChange={(event) =>
                                patchConfig((current) =>
                                  setShiftTime(
                                    current,
                                    department,
                                    shiftType,
                                    "e",
                                    event.target.value,
                                  ),
                                )
                              }
                              type="time"
                              value={config.shiftTimes[department][shiftType].e}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <div className={styles.exportStage} aria-hidden="true">
            <div className={styles.exportCanvas} ref={exportRef}>
              <div className={styles.exportHeader}>
                <div>
                  <small>WEEKLY SCHEDULE</small>
                  <h2>{DEPARTMENT_META[activeDept].exportTitle}</h2>
                  <p>{weekRangeLabel}</p>
                </div>
                <div className={styles.exportBadge}>
                  {DEPARTMENT_META[activeDept].icon} {DEPARTMENT_META[activeDept].name}
                </div>
              </div>

              <div className={styles.exportTableWrap}>
                <table className={styles.exportTable}>
                  <thead>
                    <tr>
                      <th>职位 + 姓名</th>
                      {weekDates.map((date) => {
                        const dateKey = formatDateKey(date);
                        const card = dailyCards.find((item) => item.dateKey === dateKey);
                        return (
                          <th key={dateKey}>
                            <div>{formatShortDateLabel(date)}</div>
                            <div>周{formatWeekdayLabel(date)}</div>
                            <div className={styles.dayCounts}>
                              {card?.activityCount ? (
                                <span className={styles.countBadge} data-tone="activity">
                                  活 {card.activityCount}
                                </span>
                              ) : null}
                              {card?.noteCount ? (
                                <span className={styles.countBadge} data-tone="note">
                                  备 {card.noteCount}
                                </span>
                              ) : null}
                              {card?.reservationCount ? (
                                <span className={styles.countBadge} data-tone="reservation">
                                  约 {card.reservationCount}
                                </span>
                              ) : null}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {staffByPosition.map(([position, members]) => (
                      <ExportRows
                        activeDept={activeDept}
                        config={config}
                        key={position}
                        members={members}
                        position={position}
                        weekDates={weekDates}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.exportInfoWrap}>
                <h3>活动日历 + 备注 + 预约信息</h3>
                <div className={styles.exportInfoGrid}>
                  {dailyCards.map((item) => (
                    <div className={styles.exportInfoCard} key={item.dateKey}>
                      <div>
                        <strong>{formatFullDateLabel(item.date)}</strong>
                        <small>{item.dateKey}</small>
                      </div>
                      <div className={styles.exportBlock}>
                        <span>活动日历</span>
                        {renderExportLines(item.info.activity, "activity")}
                      </div>
                      <div className={styles.exportBlock}>
                        <span>备注信息</span>
                        {renderExportLines(item.info.note, "note")}
                      </div>
                      <div className={styles.exportBlock}>
                        <span>{activeDept === "daochong" ? "预约信息" : "预约 / 预定位"}</span>
                        {renderExportLines(item.info.reservation, "reservation")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.exportFooter}>
                <div>生成时间：{new Date().toLocaleString("zh-CN")}</div>
                <div>大爱归心管理平台内部使用</div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {shiftEditor ? (
        <div className={styles.overlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <strong>选择班次</strong>
                <span>
                  {shiftEditor.staffName} · {shiftEditor.dateKey}
                </span>
              </div>
              <button
                className="button ghost inline"
                onClick={() => setShiftEditor(null)}
                type="button"
              >
                关闭
              </button>
            </div>

            <div className={styles.shiftChoiceGrid}>
              <button
                className={`${styles.shiftChoice} ${shiftDraftValue === "" ? styles.shiftChoiceActive : ""}`}
                onClick={() => setShiftDraftValue("")}
                type="button"
              >
                未排班
              </button>
              {SHIFT_CODES.map((code) => (
                <button
                  className={`${styles.shiftChoice} ${shiftDraftValue === code ? styles.shiftChoiceActive : ""}`}
                  key={code}
                  onClick={() => setShiftDraftValue(code)}
                  type="button"
                >
                  {SHIFT_CODE_META[code].label}
                </button>
              ))}
            </div>

            <div className={styles.modalActions}>
              <button
                className="button secondary inline"
                onClick={() => setShiftEditor(null)}
                type="button"
              >
                取消
              </button>
              <button className="button inline" onClick={saveShiftEditor} type="button">
                保存班次
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {staffEditor ? (
        <div className={styles.overlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <strong>{staffEditor.id ? "编辑人员" : "新增人员"}</strong>
                <span>保存后会直接进入当前云端班表。</span>
              </div>
              <button
                className="button ghost inline"
                onClick={() => setStaffEditor(null)}
                type="button"
              >
                关闭
              </button>
            </div>

            <div className="form-grid">
              <label className="field">
                <span className="field__label">姓名</span>
                <input
                  onChange={(event) =>
                    setStaffEditor((current) =>
                      current ? { ...current, name: event.target.value } : current,
                    )
                  }
                  placeholder="请输入姓名"
                  value={staffEditor.name}
                />
              </label>

              <label className="field">
                <span className="field__label">部门</span>
                <select
                  onChange={(event) => {
                    const department = event.target.value as ShiftRosterDepartmentKey;
                    const nextPosition =
                      POSITION_OPTIONS[department].includes(staffEditor.position)
                        ? staffEditor.position
                        : POSITION_OPTIONS[department][0] ?? "";
                    setStaffEditor((current) =>
                      current
                        ? {
                            ...current,
                            dept: department,
                            position: nextPosition,
                          }
                        : current,
                    );
                  }}
                  value={staffEditor.dept}
                >
                  {SHIFT_DEPARTMENTS.map((department) => (
                    <option key={department} value={department}>
                      {DEPARTMENT_META[department].icon} {DEPARTMENT_META[department].name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field__label">职位</span>
                <select
                  onChange={(event) =>
                    setStaffEditor((current) =>
                      current
                        ? { ...current, position: event.target.value }
                        : current,
                    )
                  }
                  value={staffEditor.position}
                >
                  {POSITION_OPTIONS[staffEditor.dept].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field__label">电话</span>
                <input
                  onChange={(event) =>
                    setStaffEditor((current) =>
                      current ? { ...current, phone: event.target.value } : current,
                    )
                  }
                  placeholder="可选"
                  value={staffEditor.phone}
                />
              </label>
            </div>

            <div className={styles.modalActions}>
              <button
                className="button secondary inline"
                onClick={() => setStaffEditor(null)}
                type="button"
              >
                取消
              </button>
              <button className="button inline" onClick={saveStaffEditor} type="button">
                保存人员
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {exportPreview ? (
        <div className={styles.overlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <strong>{exportPreview.title}</strong>
                <span>手机端可以长按图片保存，也可以直接点下载按钮。</span>
              </div>
              <button
                className="button ghost inline"
                onClick={() => setExportPreview(null)}
                type="button"
              >
                关闭
              </button>
            </div>

            <img
              alt={exportPreview.title}
              className={styles.previewImage}
              src={exportPreview.url}
            />

            <div className={styles.modalActions}>
              <a
                className="button inline"
                download={exportPreview.fileName}
                href={exportPreview.url}
              >
                保存 JPG 图片
              </a>
              <button
                className="button secondary inline"
                onClick={() => setExportPreview(null)}
                type="button"
              >
                关闭预览
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FragmentRows({
  activeDept,
  canEdit,
  config,
  members,
  onSelectShift,
  position,
  weekDates,
}: {
  activeDept: ShiftRosterDepartmentKey;
  canEdit: boolean;
  config: ShiftRosterConfig;
  members: ShiftRosterStaffMember[];
  onSelectShift: (
    department: ShiftRosterDepartmentKey,
    member: ShiftRosterStaffMember,
    dateKey: string,
  ) => void;
  position: string;
  weekDates: Date[];
}) {
  return (
    <>
      <tr className={styles.groupRow}>
        <td colSpan={8}>{position}</td>
      </tr>
      {members.map((member) => (
        <tr key={member.id}>
          <td className={styles.nameCell}>
            <strong>{member.name}</strong>
            <span>{member.position}</span>
          </td>
          {weekDates.map((date) => {
            const dateKey = formatDateKey(date);
            const shiftValue = getShiftValue(config, activeDept, member.id, dateKey);
            const displayLabel = shiftValue
              ? SHIFT_CODE_META[shiftValue].label
              : "未排班";
            return (
              <td className={styles.shiftCell} key={dateKey}>
                <button
                  className={`${styles.shiftButton} ${canEdit ? styles.editableCell : ""}`}
                  data-shift={shiftValue || "empty"}
                  disabled={!canEdit}
                  onClick={() => onSelectShift(activeDept, member, dateKey)}
                  title={`${member.name} · ${dateKey}`}
                  type="button"
                >
                  {displayLabel}
                </button>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

function MobileRosterList({
  activeDept,
  canEdit,
  config,
  members,
  onAssignShift,
  onOpenModal,
  selectedDate,
  selectedDateKey,
}: {
  activeDept: ShiftRosterDepartmentKey;
  canEdit: boolean;
  config: ShiftRosterConfig;
  members: ShiftRosterStaffMember[];
  onAssignShift: (
    member: ShiftRosterStaffMember,
    shiftCode: ShiftRosterShiftValue,
  ) => void;
  onOpenModal: (
    department: ShiftRosterDepartmentKey,
    member: ShiftRosterStaffMember,
    dateKey: string,
  ) => void;
  selectedDate: Date;
  selectedDateKey: string;
}) {
  return (
    <div className={styles.mobileRosterList}>
      <div className={styles.mobileRosterLead}>
        <strong>{formatFullDateLabel(selectedDate)}</strong>
        <span>
          {canEdit
            ? "直接点成员下方班次即可保存，长按需求较多时也可以进入完整选择。"
            : "当前仅查看这一天每位成员的班次。"}
        </span>
      </div>

      {members.map((member) => {
        const shiftValue = getShiftValue(
          config,
          activeDept,
          member.id,
          selectedDateKey,
        );

        return (
          <article className={styles.mobileStaffCard} key={member.id}>
            <div className={styles.mobileStaffHead}>
              <div>
                <strong>{member.name}</strong>
                <span>{member.position}</span>
              </div>
              <button
                className={styles.mobileShiftBadge}
                data-shift={shiftValue || "empty"}
                onClick={() => onOpenModal(activeDept, member, selectedDateKey)}
                type="button"
              >
                {shiftValue ? SHIFT_CODE_META[shiftValue].label : "未排班"}
              </button>
            </div>

            {canEdit ? (
              <div className={styles.mobileShiftGrid}>
                <button
                  className={`${styles.mobileShiftChip} ${!shiftValue ? styles.mobileShiftChipActive : ""}`}
                  onClick={() => onAssignShift(member, "")}
                  type="button"
                >
                  未排班
                </button>
                {SHIFT_CODES.map((code) => (
                  <button
                    className={`${styles.mobileShiftChip} ${shiftValue === code ? styles.mobileShiftChipActive : ""}`}
                    key={code}
                    onClick={() => onAssignShift(member, code)}
                    type="button"
                  >
                    {SHIFT_CODE_META[code].label}
                  </button>
                ))}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function ExportRows({
  activeDept,
  config,
  members,
  position,
  weekDates,
}: {
  activeDept: ShiftRosterDepartmentKey;
  config: ShiftRosterConfig;
  members: ShiftRosterStaffMember[];
  position: string;
  weekDates: Date[];
}) {
  return (
    <>
      <tr className={styles.exportGroup}>
        <td colSpan={8}>{position}</td>
      </tr>
      {members.map((member) => (
        <tr key={member.id}>
          <td className={styles.exportNameCell}>
            <strong>{member.name}</strong>
            <span>{member.position}</span>
          </td>
          {weekDates.map((date) => {
            const dateKey = formatDateKey(date);
            const shiftValue = getShiftValue(config, activeDept, member.id, dateKey);
            return (
              <td key={dateKey}>
                <span className={styles.exportShift} data-shift={shiftValue || "empty"}>
                  {shiftValue ? SHIFT_CODE_META[shiftValue].label : "—"}
                </span>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

function renderExportLines(
  value: string,
  tone: "activity" | "note" | "reservation",
) {
  const lines = value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!lines.length) {
    return <div className={styles.exportEmpty}>暂无内容</div>;
  }

  return lines.map((line) => (
    <div className={styles.exportListItem} data-tone={tone} key={`${tone}-${line}`}>
      {line}
    </div>
  ));
}
