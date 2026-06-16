"use client";

import { useEffect, useMemo, useState } from "react";
import { useSiteBrandKey } from "../../../../components/system/SiteBrandContext";
import {
  apiFetch,
  getRecordDataMode,
  setRecordDataMode,
  type RecordDataMode,
} from "../../../../lib/api";

type TestBatchItem = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  status: "ACTIVE" | "CLOSED" | "CLEARED";
  startedAt: string;
  closedAt?: string | null;
  clearedAt?: string | null;
  createdAt: string;
  creator?: { id: string; name: string } | null;
  summary: {
    customers: number;
    quotations: number;
    agriculturePlans: number;
    contracts: number;
    salesOrders: number;
    payments: number;
    shipments: number;
    channelPartners: number;
    settlements: number;
    tasks: number;
    weeklyReports: number;
    monthlyGoals: number;
    inspections: number;
    fileFolders: number;
    files: number;
    total: number;
  };
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return "—";
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

function getBatchMetrics(batch: TestBatchItem, isManagementBrand: boolean) {
  if (!isManagementBrand) {
    return [
      { label: "客户", value: batch.summary.customers },
      { label: "报价", value: batch.summary.quotations },
      { label: "订单", value: batch.summary.salesOrders },
      {
        label: "收款/发货",
        value: batch.summary.payments + batch.summary.shipments,
      },
      { label: "任务", value: batch.summary.tasks },
      {
        label: "周报/月目标",
        value: batch.summary.weeklyReports + batch.summary.monthlyGoals,
      },
      { label: "检测", value: batch.summary.inspections },
      { label: "档案", value: batch.summary.fileFolders + batch.summary.files },
    ];
  }

  return [
    { label: "事项 / 日程", value: batch.summary.tasks },
    {
      label: "周报 / 月目标",
      value: batch.summary.weeklyReports + batch.summary.monthlyGoals,
    },
    { label: "协同资料", value: batch.summary.fileFolders + batch.summary.files },
    {
      label: "其他业务记录",
      value:
        batch.summary.customers +
        batch.summary.quotations +
        batch.summary.agriculturePlans +
        batch.summary.contracts +
        batch.summary.salesOrders +
        batch.summary.payments +
        batch.summary.shipments +
        batch.summary.channelPartners +
        batch.summary.settlements +
        batch.summary.inspections,
    },
  ];
}

export default function TestDataManagementPage() {
  const brandKey = useSiteBrandKey();
  const isManagementBrand = brandKey === "management";
  const [items, setItems] = useState<TestBatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currentMode, setCurrentMode] = useState<RecordDataMode>({
    scope: "REAL",
    testBatchId: null,
    testBatchName: null,
  });

  async function loadBatches() {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch<{ items: TestBatchItem[] }>("/test-batches");
      setItems(response.items);
      setCurrentMode(getRecordDataMode());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "测试批次加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBatches();
  }, []);

  const activeBatch = useMemo(
    () => items.find((item) => item.id === currentMode.testBatchId) ?? null,
    [currentMode.testBatchId, items],
  );

  async function handleCreate() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("请先填写测试批次名称");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await apiFetch("/test-batches", {
        method: "POST",
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || undefined,
        }),
      });
      setName("");
      setDescription("");
      await loadBatches();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "创建测试批次失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose(batch: TestBatchItem) {
    setSubmitting(true);
    setError("");
    try {
      await apiFetch(`/test-batches/${batch.id}/close`, {
        method: "POST",
      });
      await loadBatches();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "关闭测试批次失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClear(batch: TestBatchItem) {
    const confirmed = window.confirm(
      isManagementBrand
        ? `确认清空测试批次「${batch.name}」吗？这会删除该批次下所有测试协同记录、业务记录和资料数据。`
        : `确认清空测试批次「${batch.name}」吗？这会删除该批次下所有测试客户、报价、订单、任务、周报、月目标和档案数据。`,
    );
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await apiFetch(`/test-batches/${batch.id}/clear`, {
        method: "POST",
      });

      if (currentMode.scope === "TEST" && currentMode.testBatchId === batch.id) {
        setRecordDataMode({ scope: "REAL" });
      }

      await loadBatches();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "清空测试批次失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="workspace-stack">
      <section className="panel stack">
        <div className="section-heading">
          <h3>测试数据管理</h3>
          <p>
            正式数据默认保持可见；只有切换到某个测试批次时，页面才会显示该批次下的新功能测试数据。
          </p>
        </div>

        <div className="test-data-toolbar">
          <div className={`status-pill ${currentMode.scope === "TEST" ? "warning" : "success"}`}>
            {currentMode.scope === "TEST"
              ? `当前正在查看测试批次：${activeBatch?.name ?? currentMode.testBatchName ?? "未命名批次"}`
              : "当前正在查看正式数据"}
          </div>
          {currentMode.scope === "TEST" ? (
            <button
              className="button secondary"
              onClick={() => {
                setRecordDataMode({ scope: "REAL" });
                setCurrentMode(getRecordDataMode());
              }}
              type="button"
            >
              切回正式数据
            </button>
          ) : null}
        </div>

        <div className="grid-2">
          <div className="summary-card">
            <div className="section-heading">
              <h3>新建测试批次</h3>
              <p>
                {isManagementBrand
                  ? "每一轮协同功能测试建议单独建一个批次，后面可以整批清空。"
                  : "每一轮新功能测试建议单独建一个批次，后面可以整批清空。"}
              </p>
            </div>
            <div className="stack">
              <label className="field">
                <span className="field__label">批次名称</span>
                <input
                  className="input"
                  onChange={(event) => setName(event.target.value)}
                  placeholder={
                    isManagementBrand
                      ? "例如：协同日程联调 / 通知中心回归 / 工作管理首轮测试"
                      : "例如：订单链路联调 / 档案中心回归 / 工作管理首轮测试"
                  }
                  value={name}
                />
              </label>
              <label className="field">
                <span className="field__label">说明</span>
                <textarea
                  className="textarea"
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="补充本轮测试范围、参与人或上线前要清空的原因"
                  rows={4}
                  value={description}
                />
              </label>
              <div className="inline-actions">
                <button className="button" disabled={submitting} onClick={handleCreate} type="button">
                  创建测试批次
                </button>
              </div>
            </div>
          </div>

          <div className="summary-card">
            <div className="section-heading">
              <h3>使用规则</h3>
              <p>
                {isManagementBrand
                  ? "让协同测试和正式数据一直分开，避免影响员工正式使用。"
                  : "让测试和正式数据一直分开，避免影响员工正式使用。"}
              </p>
            </div>
            <div className="summary-list">
              <div className="small muted">1. 平时页面默认查看正式数据。</div>
              <div className="small muted">
                {isManagementBrand
                  ? "2. 进入测试前先选定一个测试批次，再去创建本轮要验证的协同记录、提醒与资料。"
                  : "2. 进入测试前先选定一个测试批次，再去创建客户、报价、订单、任务和档案。"}
              </div>
              <div className="small muted">3. 一轮测试结束后先关闭批次，确认无误再统一清空。</div>
            </div>
          </div>
        </div>

        {error ? <div className="danger-text small">{error}</div> : null}
      </section>

      <section className="panel stack">
        <div className="section-heading">
          <h3>测试批次列表</h3>
          <p>
            {isManagementBrand
              ? "这里会显示每个批次当前沉淀的协同测试数据量，并提供切换、关闭和清空入口。"
              : "这里会显示每个批次当前沉淀的数据量，并提供切换、关闭和清空入口。"}
          </p>
        </div>

        {loading ? <div className="small muted">正在加载测试批次...</div> : null}

        {!loading && items.length === 0 ? (
          <div className="empty-state-card">
            <strong>还没有测试批次</strong>
            <span>先创建一个批次，再进入相关页面开始录入测试数据。</span>
          </div>
        ) : null}

        <div className="stack">
          {items.map((batch) => {
            const isActiveMode =
              currentMode.scope === "TEST" && currentMode.testBatchId === batch.id;

            return (
              <article
                className={`summary-card test-data-batch-card ${isActiveMode ? "active" : ""}`}
                key={batch.id}
              >
                <div className="summary-list">
                  <div className="summary-row">
                    <div>
                      <strong>{batch.name}</strong>
                      <div className="small muted mt-6">
                        {batch.code} · 创建人 {batch.creator?.name ?? "未知"} · {formatDateTime(batch.createdAt)}
                      </div>
                    </div>
                    <StatusTag status={batch.status} />
                  </div>

                  {batch.description ? (
                    <div className="small muted">{batch.description}</div>
                  ) : null}

                  <div className="test-data-summary-grid">
                    {getBatchMetrics(batch, isManagementBrand).map((metric) => (
                      <Metric key={metric.label} label={metric.label} value={metric.value} />
                    ))}
                  </div>

                  <div className="small muted">
                    批次总量 {batch.summary.total} 项 · 开始于 {formatDateTime(batch.startedAt)} · 关闭时间 {formatDateTime(batch.closedAt)}
                  </div>

                  <div className="inline-actions">
                    <button
                      className={`button ${isActiveMode ? "secondary" : ""}`}
                      disabled={submitting || batch.status === "CLEARED"}
                      onClick={() => {
                        setRecordDataMode({
                          scope: "TEST",
                          testBatchId: batch.id,
                          testBatchName: batch.name,
                        });
                        setCurrentMode(getRecordDataMode());
                      }}
                      type="button"
                    >
                      {isActiveMode ? "当前测试批次" : "切换到此批次"}
                    </button>
                    {batch.status === "ACTIVE" ? (
                      <button
                        className="button secondary"
                        disabled={submitting}
                        onClick={() => void handleClose(batch)}
                        type="button"
                      >
                        关闭批次
                      </button>
                    ) : null}
                    {batch.status !== "CLEARED" ? (
                      <button
                        className="button danger"
                        disabled={submitting}
                        onClick={() => void handleClear(batch)}
                        type="button"
                      >
                        清空本批次
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="summary-card test-data-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusTag({ status }: { status: TestBatchItem["status"] }) {
  const className =
    status === "ACTIVE"
      ? "warning"
      : status === "CLEARED"
        ? "neutral"
        : "success";

  const label =
    status === "ACTIVE" ? "进行中" : status === "CLOSED" ? "已关闭" : "已清空";

  return <div className={`status-pill ${className}`}>{label}</div>;
}
