import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  FileSpreadsheet,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import {
  canMaintainPayroll,
  clearAuth,
  getCurrentUser,
  login,
  setAuth,
  type CurrentUser,
} from "./lib/api";
import {
  buildUploadUrl,
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
  saveDraftBatch,
  sendSalaryWecomNotifications,
  statusLabel,
  syncSalarySlips,
  type PayrollDraft,
  type SalaryNotifyLog,
  type SalarySlip,
} from "./lib/payroll";

type RouteState = {
  path: string;
  params: URLSearchParams;
};

type Toast = {
  tone: "success" | "warning" | "danger" | "info";
  message: string;
};

function readRoute(): RouteState {
  return {
    path: window.location.pathname,
    params: new URLSearchParams(window.location.search),
  };
}

function navigate(to: string) {
  window.history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function userDisplayName(user: CurrentUser | null) {
  return user?.displayName ?? user?.name ?? user?.username ?? "未登录";
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" | "danger" }) {
  return (
    <div className={`stat ${tone ?? ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusPill({ status }: { status: PayrollDraft["validation"]["status"] }) {
  return (
    <span className={`status-pill ${status === "ready" ? "ready" : "blocked"}`}>
      {status === "ready" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
      {statusLabel(status)}
    </span>
  );
}

function AppShell({
  children,
  route,
  user,
  onLogout,
}: {
  children: React.ReactNode;
  route: RouteState;
  user: CurrentUser | null;
  onLogout: () => void;
}) {
  const month = route.params.get("month") || currentMonth();
  const tabs = [
    { label: "薪资批量", href: `/payroll/batch?month=${month}`, icon: CircleDollarSign },
    { label: "导入中心", href: buildUploadUrl(month), icon: UploadCloud },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark">大</span>
          <div>
            <strong>大愛歸心员工端</strong>
            <span>薪资上传与发送</span>
          </div>
        </div>
        <nav className="nav-list">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = route.path === tab.href.split("?")[0];
            return (
              <button
                className={`nav-item ${active ? "active" : ""}`}
                key={tab.href}
                onClick={() => navigate(tab.href)}
                type="button"
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <span>{userDisplayName(user)}</span>
          <button className="icon-text-button" onClick={onLogout} type="button" title="退出登录">
            <LogOut size={16} />
            退出
          </button>
        </div>
      </aside>
      <main className="main-area">{children}</main>
    </div>
  );
}

function LoginPage({ onLogin }: { onLogin: (user: CurrentUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = await login(username, password);
      setAuth(payload);
      onLogin(payload.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-panel" onSubmit={submit}>
        <span className="panel-kicker">Payroll Access</span>
        <h1>进入员工端</h1>
        <label>
          <span>账号</span>
          <input autoComplete="username" onChange={(event) => setUsername(event.target.value)} value={username} />
        </label>
        <label>
          <span>密码</span>
          <input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" disabled={loading || !username || !password} type="submit">
          {loading ? <Loader2 className="spin" size={18} /> : <LogIn size={18} />}
          登录
        </button>
      </form>
    </div>
  );
}

function NoPermission({ user }: { user: CurrentUser | null }) {
  return (
    <section className="empty-state">
      <ShieldCheck size={32} />
      <h2>当前账号没有薪资维护权限</h2>
      <p>{userDisplayName(user)} 需要 FINANCE 角色或 action.payroll.publish 权限后才能上传、发布和记录通知。</p>
    </section>
  );
}

function PayrollBatchPage({ route, user, setToast }: { route: RouteState; user: CurrentUser | null; setToast: (toast: Toast) => void }) {
  const [month, setMonth] = useState(route.params.get("month") || currentMonth());
  const [draft, setDraft] = useState<PayrollDraft | null>(null);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  const [notifyLogs, setNotifyLogs] = useState<SalaryNotifyLog[]>([]);
  const [reviewedOriginal, setReviewedOriginal] = useState(false);
  const [confirmedRecipients, setConfirmedRecipients] = useState(false);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  const lists = useMemo(() => notifyLists(draft?.rows ?? []), [draft]);
  const ready = draftIsReady(draft);
  const canPublish = ready && reviewedOriginal && confirmedRecipients && !publishing;

  useEffect(() => {
    const routeMonth = route.params.get("month") || currentMonth();
    if (routeMonth !== month) {
      setMonth(routeMonth);
    }
  }, [route.params, month]);

  async function refresh(nextMonth = month) {
    setLoading(true);
    setError("");
    try {
      const batch = await loadDraftBatch(nextMonth);
      const nextDraft = draftFromBatch(batch);
      setDraft(nextDraft);
      const publishBatchId = nextDraft?.publishBatchId ?? batch?.publishBatchId;
      const [slips, logs] = await Promise.all([
        listSalarySlips(nextMonth, publishBatchId),
        listNotifyLogs(nextMonth, publishBatchId),
      ]);
      setSalarySlips(slips.data);
      setNotifyLogs(logs.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "读取薪资数据失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh(month);
  }, [month]);

  async function publish() {
    if (!draft || !canPublish) {
      return;
    }
    setPublishing(true);
    setError("");
    try {
      const syncResponse = await syncSalarySlips(draft, user);
      const sendResponse = await sendSalaryWecomNotifications(draft, user);
      await saveDraftBatch(draft, {
        publishedAt: new Date().toISOString(),
        notifyStatus: sendResponse.status,
        excelReviewedAt: new Date().toISOString(),
        updatedBy: userDisplayName(user),
      });
      setToast({
        tone: sendResponse.ok ? "success" : "warning",
        message: `已发布 ${syncResponse.createdCount + syncResponse.updatedCount} 条薪资条；${sendResponse.message}`,
      });
      await refresh(month);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "发布失败");
    } finally {
      setPublishing(false);
    }
  }

  function changeMonth(value: string) {
    setMonth(value);
    navigate(`/payroll/batch?month=${value}`);
  }

  return (
    <section className="work-surface">
      <div className="page-header">
        <div>
          <span className="panel-kicker">Payroll Batch</span>
          <h1>薪资批量发送</h1>
        </div>
        <div className="header-actions">
          <label className="month-field">
            <span>月份</span>
            <input onChange={(event) => changeMonth(event.target.value)} type="month" value={month} />
          </label>
          <button className="secondary-button" onClick={() => void refresh(month)} type="button">
            <RefreshCw size={16} />
            刷新
          </button>
          <button className="primary-button" onClick={() => navigate(buildUploadUrl(month))} type="button">
            <UploadCloud size={18} />
            上传薪资表
          </button>
        </div>
      </div>

      {error ? <div className="alert danger"><AlertTriangle size={18} />{error}</div> : null}

      {loading ? (
        <div className="loading-row"><Loader2 className="spin" size={20} />正在读取薪资批次...</div>
      ) : draft ? (
        <>
          <div className="summary-grid">
            <Stat label="明细行数" value={`${draft.rows.length}`} />
            <Stat label="实发合计" value={`¥${formatAmount(netAmountTotal(draft.rows))}`} />
            <Stat label="可企微通知" value={`${lists.delivered.length} 人`} tone="good" />
            <Stat label="跳过通知" value={`${lists.skipped.length} 人`} tone={lists.skipped.length ? "warn" : undefined} />
          </div>

          <section className="panel">
            <div className="panel-title-row">
              <div>
                <h2>{draft.fileName}</h2>
                <p>发布批次：{draft.publishBatchId}</p>
              </div>
              <StatusPill status={draft.validation.status} />
            </div>
            <ValidationSummary draft={draft} />
            <div className="review-row">
              <label className="checkbox-line">
                <input checked={reviewedOriginal} onChange={(event) => setReviewedOriginal(event.target.checked)} type="checkbox" />
                我已核对原始薪资表
              </label>
              <label className="checkbox-line">
                <input checked={confirmedRecipients} onChange={(event) => setConfirmedRecipients(event.target.checked)} type="checkbox" />
                我已确认通知名单
              </label>
              <button className="primary-button" disabled={!canPublish} onClick={() => void publish()} type="button">
                {publishing ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
                发布并发送企微
              </button>
            </div>
          </section>

          <PayrollRowsTable rows={draft.rows} />
          <NotifyPanel delivered={lists.delivered} skipped={lists.skipped} />
        </>
      ) : (
        <section className="empty-state">
          <FileSpreadsheet size={36} />
          <h2>当前月份还没有薪资导入草稿</h2>
          <p>从导入中心上传薪资表后，会自动回到这里完成核对、发布和通知记录。</p>
          <button className="primary-button" onClick={() => navigate(buildUploadUrl(month))} type="button">
            <UploadCloud size={18} />
            上传薪资表
          </button>
        </section>
      )}

      <HistoryPanel logs={notifyLogs} salarySlips={salarySlips} />
    </section>
  );
}

function FinanceImportsPage({ route, user, setToast }: { route: RouteState; user: CurrentUser | null; setToast: (toast: Toast) => void }) {
  const [month, setMonth] = useState(route.params.get("month") || currentMonth());
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<PayrollDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const returnTo = route.params.get("returnTo") || "/payroll/batch";
  const importType = route.params.get("type") || "salary_slip";

  useEffect(() => {
    const routeMonth = route.params.get("month") || currentMonth();
    if (routeMonth !== month) {
      setMonth(routeMonth);
    }
  }, [route.params, month]);

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
        message: parsed.supportedPreview ? "已保存薪资表草稿，可返回核对。" : "已记录文件信息，请转换为 XLSX 或 CSV 后发布。",
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "读取薪资表失败");
    } finally {
      setLoading(false);
    }
  }

  function backToPayroll() {
    const separator = returnTo.includes("?") ? "&" : "?";
    navigate(`${returnTo}${separator}month=${month}`);
  }

  return (
    <section className="work-surface">
      <div className="page-header">
        <div>
          <span className="panel-kicker">Finance Imports</span>
          <h1>导入中心</h1>
        </div>
        <div className="header-actions">
          <label className="month-field">
            <span>月份</span>
            <input onChange={(event) => setMonth(event.target.value)} type="month" value={month} />
          </label>
          <button className="secondary-button" onClick={backToPayroll} type="button">
            <ArrowRight size={16} />
            返回核对
          </button>
        </div>
      </div>

      <section className="panel import-panel">
        <div className="panel-title-row">
          <div>
            <h2>{importType === "salary_slip" ? "上传薪资表" : "上传文件"}</h2>
            <p>支持 CSV、XLSX；旧版 XLS 会提示转换后再预览发布。</p>
          </div>
          <span className="type-chip">薪资表</span>
        </div>
        <label className="upload-zone">
          <UploadCloud size={34} />
          <strong>{file ? file.name : "选择薪资表文件"}</strong>
          <span>.csv / .xlsx / .xls</span>
          <input
            accept=".csv,.xlsx,.xls"
            onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
            type="file"
          />
        </label>
        {loading ? <div className="loading-row"><Loader2 className="spin" size={18} />正在解析并保存草稿...</div> : null}
        {error ? <div className="alert danger"><AlertTriangle size={18} />{error}</div> : null}
      </section>

      {draft ? (
        <>
          <section className="panel">
            <div className="panel-title-row">
              <div>
                <h2>上传预览</h2>
                <p>发布批次：{draft.publishBatchId}</p>
              </div>
              <StatusPill status={draft.validation.status} />
            </div>
            <ValidationSummary draft={draft} />
            <div className="review-row">
              <button className="primary-button" onClick={backToPayroll} type="button">
                <ArrowRight size={18} />
                回到薪资核对页
              </button>
            </div>
          </section>
          <PayrollRowsTable rows={draft.rows} />
        </>
      ) : null}
    </section>
  );
}

function ValidationSummary({ draft }: { draft: PayrollDraft }) {
  const validation = draft.validation;
  const issues = [
    ...validation.missingRequiredHeaders.map((item) => `缺少表头：${item}`),
    ...validation.invalidAmountRows.map((row) => `第 ${row.rowNumber} 行 ${row.teacherName} 金额异常：${row.amountErrors.join("、")}`),
    ...validation.missingIdentityRows.map((row) => `第 ${row.rowNumber} 行 ${row.teacherName} 缺少员工身份`),
    ...validation.unresolvedRows.map((row) => `第 ${row.rowNumber} 行 ${row.teacherName} 差异未处理`),
  ];

  return (
    <div className="validation-list">
      {validation.warnings.map((warning) => (
        <div className="alert warning" key={warning}><AlertTriangle size={16} />{warning}</div>
      ))}
      {issues.length === 0 ? (
        <div className="alert success"><CheckCircle2 size={16} />预览已通过发布门禁。</div>
      ) : issues.map((issue) => (
        <div className="alert danger" key={issue}><AlertTriangle size={16} />{issue}</div>
      ))}
    </div>
  );
}

function PayrollRowsTable({ rows }: { rows: PayrollDraft["rows"] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="panel">
      <div className="panel-title-row">
        <div>
          <h2>薪资明细</h2>
          <p>按明确身份字段发布，姓名不作为授权依据。</p>
        </div>
      </div>
      <div className="table-scroll">
        <table>
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
                <td className="amount-strong">¥{formatAmount(row.netAmount)}</td>
                <td>{row.differenceStatus === "resolved" ? "已处理" : "未处理"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NotifyPanel({ delivered, skipped }: { delivered: ReturnType<typeof notifyLists>["delivered"]; skipped: ReturnType<typeof notifyLists>["skipped"] }) {
  return (
    <section className="panel two-column-panel">
      <div>
        <h2>通知名单</h2>
        <ul className="person-list">
          {delivered.map((person) => (
            <li key={person.id}>
              <CheckCircle2 size={16} />
              <span>{person.name}</span>
              <strong>{person.userid}</strong>
            </li>
          ))}
          {delivered.length === 0 ? <li className="muted-row">暂无可通知人员</li> : null}
        </ul>
      </div>
      <div>
        <h2>跳过名单</h2>
        <ul className="person-list">
          {skipped.map((person) => (
            <li key={person.id}>
              <AlertTriangle size={16} />
              <span>{person.name}</span>
              <strong>{person.reason}</strong>
            </li>
          ))}
          {skipped.length === 0 ? <li className="muted-row">没有跳过人员</li> : null}
        </ul>
      </div>
    </section>
  );
}

function HistoryPanel({ salarySlips, logs }: { salarySlips: SalarySlip[]; logs: SalaryNotifyLog[] }) {
  return (
    <section className="panel history-panel">
      <div className="panel-title-row">
        <div>
          <h2>发布追溯</h2>
          <p>按月份和发布批次读取正式薪资条与通知记录。</p>
        </div>
        <Search size={18} />
      </div>
      <div className="history-grid">
        <div>
          <strong>正式薪资条</strong>
          <span>{salarySlips.length} 条</span>
        </div>
        <div>
          <strong>通知记录</strong>
          <span>{logs.length} 条</span>
        </div>
      </div>
    </section>
  );
}

export function App() {
  const [route, setRoute] = useState(readRoute);
  const [user, setUser] = useState<CurrentUser | null>(() => getCurrentUser());
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const listener = () => setRoute(readRoute());
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function logout() {
    clearAuth();
    setUser(null);
    navigate("/login");
  }

  if (!user) {
    return <LoginPage onLogin={(nextUser) => {
      setUser(nextUser);
      navigate(route.path === "/login" ? "/payroll/batch" : `${route.path}${window.location.search}`);
    }} />;
  }

  if (!canMaintainPayroll(user)) {
    return (
      <AppShell onLogout={logout} route={route} user={user}>
        <NoPermission user={user} />
      </AppShell>
    );
  }

  const page = route.path === "/finance/imports"
    ? <FinanceImportsPage route={route} setToast={setToast} user={user} />
    : <PayrollBatchPage route={route} setToast={setToast} user={user} />;

  return (
    <AppShell onLogout={logout} route={route} user={user}>
      {toast ? <div className={`toast ${toast.tone}`}>{toast.message}</div> : null}
      {page}
    </AppShell>
  );
}
