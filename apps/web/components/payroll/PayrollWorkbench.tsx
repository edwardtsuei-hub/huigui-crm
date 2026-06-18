"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DataTable,
  EmptyState,
  SectionCard,
  StatCard,
  StatusBadge,
} from "../system/primitives";
import {
  canMaintainPayroll,
  getCurrentUser,
  type CurrentUser,
} from "../../lib/api";
import {
  currentMonth,
  draftFromBatch,
  draftIsReady,
  formatAmount,
  listNotifyLogs,
  listSalarySlips,
  loadDraftBatch,
  netAmountTotal,
  notifyLists,
  parseSalaryFile,
  recordNotifyLog,
  saveDraftBatch,
  statusLabel,
  syncSalarySlips,
  type PayrollDraft,
  type SalaryNotifyLog,
  type SalarySlip,
} from "../../lib/payroll";
import styles from "./PayrollWorkbench.module.css";

type WorkbenchMode = "batch" | "import";

type Toast = {
  tone: "success" | "warning" | "danger" | "info";
  message: string;
};

function userDisplayName(user: CurrentUser | null) {
  return user?.displayName ?? user?.name ?? user?.username ?? "未登录";
}

function statusTone(status: PayrollDraft["validation"]["status"]) {
  return status === "ready" ? "success" : "warning";
}

function Notice({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? styles.noticeSuccess
      : tone === "warning"
        ? styles.noticeWarning
        : styles.noticeDanger;

  return <div className={`${styles.notice} ${toneClass}`}>{children}</div>;
}

function ValidationSummary({ draft }: { draft: PayrollDraft }) {
  const validation = draft.validation;
  const issues = [
    ...validation.missingRequiredHeaders.map((item) => `缺少表头：${item}`),
    ...validation.invalidAmountRows.map(
      (row) => `第 ${row.rowNumber} 行 ${row.teacherName} 金额异常：${row.amountErrors.join("、")}`,
    ),
    ...validation.missingIdentityRows.map(
      (row) => `第 ${row.rowNumber} 行 ${row.teacherName} 缺少员工身份`,
    ),
    ...validation.unresolvedRows.map(
      (row) => `第 ${row.rowNumber} 行 ${row.teacherName} 差异未处理`,
    ),
  ];

  return (
    <div className="stack">
      {validation.warnings.map((warning) => (
        <Notice key={warning} tone="warning">
          {warning}
        </Notice>
      ))}
      {issues.length === 0 ? (
        <Notice tone="success">预览已通过发布门禁。</Notice>
      ) : (
        issues.map((issue) => (
          <Notice key={issue} tone="danger">
            {issue}
          </Notice>
        ))
      )}
    </div>
  );
}

function PayrollRowsTable({ rows }: { rows: PayrollDraft["rows"] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <SectionCard
      description="按明确身份字段发布，姓名不作为授权依据。"
      title="薪资明细"
    >
      <DataTable>
        <thead>
          <tr>
            <th>姓名</th>
            <th>身份</th>
            <th>部门</th>
            <th>应发</th>
            <th>提成</th>
            <th>分润</th>
            <th>扣款</th>
            <th>实发</th>
            <th>差异</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.rowNumber}-${row.teacherId}`}>
              <td>{row.teacherName}</td>
              <td>{row.teacherId}</td>
              <td>{row.department}</td>
              <td>¥{formatAmount(row.grossAmount)}</td>
              <td>¥{formatAmount(row.commissionAmount)}</td>
              <td>¥{formatAmount(row.profitSharingAmount)}</td>
              <td>¥{formatAmount(row.deductionAmount)}</td>
              <td className={styles.amountStrong}>¥{formatAmount(row.netAmount)}</td>
              <td>{row.differenceStatus === "resolved" ? "已处理" : "未处理"}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </SectionCard>
  );
}

function NotifyPanel({
  delivered,
  skipped,
}: {
  delivered: ReturnType<typeof notifyLists>["delivered"];
  skipped: ReturnType<typeof notifyLists>["skipped"];
}) {
  return (
    <SectionCard title="通知名单">
      <div className={styles.twoColumn}>
        <div className="stack">
          <div className="section-heading">
            <h3>可企微通知</h3>
            <p>有明确企业微信账号且不属于合作老师。</p>
          </div>
          <ul className={styles.personList}>
            {delivered.map((person) => (
              <li key={person.id}>
                <span>{person.name}</span>
                <strong>{person.userid}</strong>
              </li>
            ))}
            {delivered.length === 0 ? (
              <li className={styles.mutedRow}>暂无可通知人员</li>
            ) : null}
          </ul>
        </div>
        <div className="stack">
          <div className="section-heading">
            <h3>跳过通知</h3>
            <p>仍会发布薪资条，但不发送企业微信通知。</p>
          </div>
          <ul className={styles.personList}>
            {skipped.map((person) => (
              <li key={person.id}>
                <span>{person.name}</span>
                <strong>{person.reason}</strong>
              </li>
            ))}
            {skipped.length === 0 ? (
              <li className={styles.mutedRow}>没有跳过人员</li>
            ) : null}
          </ul>
        </div>
      </div>
    </SectionCard>
  );
}

function HistoryPanel({
  logs,
  salarySlips,
}: {
  logs: SalaryNotifyLog[];
  salarySlips: SalarySlip[];
}) {
  return (
    <SectionCard
      description="按月份和发布批次读取正式薪资条与通知记录。"
      title="发布追溯"
    >
      <div className={styles.historyGrid}>
        <div>
          <strong>正式薪资条</strong>
          <span>{salarySlips.length} 条</span>
        </div>
        <div>
          <strong>通知记录</strong>
          <span>{logs.length} 条</span>
        </div>
      </div>
    </SectionCard>
  );
}

function PayrollBatchView({
  draft,
  error,
  loading,
  month,
  notifyLogs,
  onRefresh,
  onSwitchMode,
  salarySlips,
  setToast,
  user,
}: {
  draft: PayrollDraft | null;
  error: string;
  loading: boolean;
  month: string;
  notifyLogs: SalaryNotifyLog[];
  onRefresh: () => Promise<void>;
  onSwitchMode: (mode: WorkbenchMode, month?: string) => void;
  salarySlips: SalarySlip[];
  setToast: (toast: Toast) => void;
  user: CurrentUser | null;
}) {
  const [reviewedOriginal, setReviewedOriginal] = useState(false);
  const [confirmedRecipients, setConfirmedRecipients] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const lists = useMemo(() => notifyLists(draft?.rows ?? []), [draft]);
  const ready = draftIsReady(draft);
  const canPublish = Boolean(ready && reviewedOriginal && confirmedRecipients && !publishing);

  async function publish() {
    if (!draft || !canPublish) {
      return;
    }

    setPublishing(true);
    try {
      const syncResponse = await syncSalarySlips(draft, user);
      await recordNotifyLog(draft, user);
      await saveDraftBatch(draft, {
        publishedAt: new Date().toISOString(),
        notifyStatus: "preview",
        excelReviewedAt: new Date().toISOString(),
        updatedBy: userDisplayName(user),
      });
      setToast({
        tone: "success",
        message: `已发布 ${syncResponse.createdCount + syncResponse.updatedCount} 条薪资条，发布批次 ${syncResponse.publishBatchId}`,
      });
      await onRefresh();
    } catch (caught) {
      setToast({
        tone: "danger",
        message: caught instanceof Error ? caught.message : "发布失败",
      });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {loading ? <SectionCard>正在读取薪资批次...</SectionCard> : null}

      {!loading && draft ? (
        <>
          <div className={styles.stats}>
            <StatCard label="明细行数" value={`${draft.rows.length}`} />
            <StatCard label="实发合计" value={`¥${formatAmount(netAmountTotal(draft.rows))}`} />
            <StatCard label="可企微通知" value={`${lists.delivered.length} 人`} />
            <StatCard label="跳过通知" value={`${lists.skipped.length} 人`} />
          </div>

          <SectionCard
            actions={
              <StatusBadge tone={statusTone(draft.validation.status)}>
                {statusLabel(draft.validation.status)}
              </StatusBadge>
            }
            description={`发布批次：${draft.publishBatchId}`}
            title={draft.fileName}
          >
            <ValidationSummary draft={draft} />
            <div className={styles.reviewRow}>
              <label className={styles.checkboxLine}>
                <input
                  checked={reviewedOriginal}
                  onChange={(event) => setReviewedOriginal(event.target.checked)}
                  type="checkbox"
                />
                我已核对原始薪资表
              </label>
              <label className={styles.checkboxLine}>
                <input
                  checked={confirmedRecipients}
                  onChange={(event) => setConfirmedRecipients(event.target.checked)}
                  type="checkbox"
                />
                我已确认通知名单
              </label>
              <button
                className="button"
                disabled={!canPublish}
                onClick={() => void publish()}
                type="button"
              >
                {publishing ? "发布中..." : "发布并记录通知"}
              </button>
            </div>
          </SectionCard>

          <PayrollRowsTable rows={draft.rows} />
          <NotifyPanel delivered={lists.delivered} skipped={lists.skipped} />
        </>
      ) : null}

      {!loading && !draft ? (
        <SectionCard>
          <EmptyState
            action={
              <button
                className="button"
                onClick={() => onSwitchMode("import", month)}
                type="button"
              >
                上传薪资表
              </button>
            }
            description="上传后会自动留在同一个财务薪资工作台内完成核对、发布和通知记录。"
            title="当前月份还没有薪资导入草稿"
          />
        </SectionCard>
      ) : null}

      <HistoryPanel logs={notifyLogs} salarySlips={salarySlips} />
    </>
  );
}

function PayrollImportView({
  month,
  onImportSaved,
  setToast,
  user,
}: {
  month: string;
  onImportSaved: (draft: PayrollDraft) => Promise<void>;
  setToast: (toast: Toast) => void;
  user: CurrentUser | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<PayrollDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(nextFile: File | null) {
    setFile(nextFile);
    setDraft(null);
    setError("");

    if (!nextFile) {
      return;
    }

    setLoading(true);
    try {
      const parsed = await parseSalaryFile(nextFile, month);
      setDraft(parsed.draft);
      await saveDraftBatch(parsed.draft, { updatedBy: userDisplayName(user) });
      setToast({
        tone: parsed.supportedPreview ? "success" : "warning",
        message: parsed.supportedPreview
          ? "已保存薪资表草稿，可返回核对。"
          : "已记录文件信息，请转换为 XLSX 或 CSV 后发布。",
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "读取薪资表失败";
      setError(message);
      setToast({ tone: "danger", message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SectionCard
        description="支持 CSV、XLSX；旧版 XLS 会提示转换后再预览发布。"
        title="上传薪资表"
      >
        <label className={styles.uploadZone}>
          <strong>{file ? file.name : "选择薪资表文件"}</strong>
          <span>.csv / .xlsx / .xls</span>
          <input
            accept=".csv,.xlsx,.xls"
            onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
            type="file"
          />
        </label>
        {loading ? <div className="small muted">正在解析并保存草稿...</div> : null}
        {error ? <Notice tone="danger">{error}</Notice> : null}
      </SectionCard>

      {draft ? (
        <>
          <SectionCard
            actions={
              <StatusBadge tone={statusTone(draft.validation.status)}>
                {statusLabel(draft.validation.status)}
              </StatusBadge>
            }
            description={`发布批次：${draft.publishBatchId}`}
            title="上传预览"
          >
            <ValidationSummary draft={draft} />
            <div className={styles.reviewRow}>
              <button
                className="button"
                onClick={() => void onImportSaved(draft)}
                type="button"
              >
                回到薪资核对
              </button>
            </div>
          </SectionCard>
          <PayrollRowsTable rows={draft.rows} />
        </>
      ) : null}
    </>
  );
}

export function PayrollWorkbench() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [draft, setDraft] = useState<PayrollDraft | null>(null);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  const [notifyLogs, setNotifyLogs] = useState<SalaryNotifyLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  const month = searchParams.get("month") || currentMonth();
  const mode: WorkbenchMode = searchParams.get("view") === "import" ? "import" : "batch";

  const setRoute = useCallback(
    (nextMode: WorkbenchMode, nextMonth = month) => {
      const params = new URLSearchParams({
        month: nextMonth,
      });
      if (nextMode === "import") {
        params.set("view", "import");
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [month, pathname, router],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const batch = await loadDraftBatch(month);
      const nextDraft = draftFromBatch(batch);
      setDraft(nextDraft);
      const publishBatchId = nextDraft?.publishBatchId ?? batch?.publishBatchId;
      const [slips, logs] = await Promise.all([
        listSalarySlips(month, publishBatchId),
        listNotifyLogs(month, publishBatchId),
      ]);
      setSalarySlips(slips.data);
      setNotifyLogs(logs.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "读取薪资数据失败");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    setUser(getCurrentUser());
    setAuthReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!authReady) {
    return (
      <div className={styles.workspace}>
        <SectionCard>正在读取权限信息...</SectionCard>
      </div>
    );
  }

  if (!canMaintainPayroll(user)) {
    return (
      <div className={styles.workspace}>
        <SectionCard>
          <EmptyState
            description={`${userDisplayName(user)} 需要 FINANCE 角色或 action.payroll.publish 权限后才能上传、发布和记录通知。`}
            title="当前账号没有薪资维护权限"
          />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      {toast ? (
        <Notice tone={toast.tone === "danger" ? "danger" : toast.tone === "warning" ? "warning" : "success"}>
          {toast.message}
        </Notice>
      ) : null}

      <div className={styles.toolbar}>
        <div className={styles.tabs} role="tablist" aria-label="薪资工作台视图">
          <button
            className={`${styles.tab} ${mode === "batch" ? styles.tabActive : ""}`}
            onClick={() => setRoute("batch")}
            type="button"
          >
            核对发布
          </button>
          <button
            className={`${styles.tab} ${mode === "import" ? styles.tabActive : ""}`}
            onClick={() => setRoute("import")}
            type="button"
          >
            上传导入
          </button>
        </div>

        <div className={styles.reviewRow}>
          <label className={styles.monthField}>
            <span>月份</span>
            <input
              onChange={(event) => setRoute(mode, event.target.value)}
              type="month"
              value={month}
            />
          </label>
          <button className="button secondary" onClick={() => void refresh()} type="button">
            刷新
          </button>
          <button
            className="button"
            onClick={() => setRoute(mode === "import" ? "batch" : "import")}
            type="button"
          >
            {mode === "import" ? "回到核对" : "上传薪资表"}
          </button>
        </div>
      </div>

      {mode === "import" ? (
        <PayrollImportView
          month={month}
          onImportSaved={async () => {
            await refresh();
            setRoute("batch");
          }}
          setToast={setToast}
          user={user}
        />
      ) : (
        <PayrollBatchView
          draft={draft}
          error={error}
          loading={loading}
          month={month}
          notifyLogs={notifyLogs}
          onRefresh={refresh}
          onSwitchMode={setRoute}
          salarySlips={salarySlips}
          setToast={setToast}
          user={user}
        />
      )}
    </div>
  );
}
