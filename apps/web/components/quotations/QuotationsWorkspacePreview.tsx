"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  fetchApi,
  getRecordDataMode,
  getToken,
  readErrorMessage,
} from "../../lib/api";
import { formatDateLabel, formatMoney } from "../../lib/workspace";
import styles from "./QuotationsWorkspacePreview.module.css";

type QuotationType =
  | "AGRICULTURE"
  | "GENERAL"
  | "INDUSTRY"
  | "SERVICE"
  | "BREEDING";

type ApprovalStatus = "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";
type FocusKey = "pending" | "export" | "recent";
type Tone = "neutral" | "success" | "warning" | "danger";

type QuotationRecord = {
  id: string;
  quotationNo: string;
  type: QuotationType;
  subtotal: string;
  totalAmount: string;
  approvalStatus: ApprovalStatus;
  exportApprovalStatus: ApprovalStatus;
  createdAt: string;
  customer: { name: string };
  creator: { displayName: string };
  items: Array<{ id: string }>;
};

const quotationTypeOptions: Array<{
  value: "" | QuotationType;
  label: string;
}> = [
  { value: "", label: "全部类型" },
  { value: "AGRICULTURE", label: "农业方案" },
  { value: "GENERAL", label: "通用报价" },
  { value: "INDUSTRY", label: "行业报价" },
  { value: "SERVICE", label: "服务报价" },
  { value: "BREEDING", label: "养殖报价" },
];

const sampleRecords: QuotationRecord[] = [
  {
    id: "preview-quotation-1",
    quotationNo: "AGR-20260419-018",
    type: "AGRICULTURE",
    subtotal: "182000",
    totalAmount: "198600",
    approvalStatus: "PENDING",
    exportApprovalStatus: "NOT_REQUIRED",
    createdAt: "2026-04-19T09:12:00.000Z",
    customer: { name: "华穗示范农场" },
    creator: { displayName: "陈雅萍" },
    items: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }],
  },
  {
    id: "preview-quotation-2",
    quotationNo: "GEN-20260419-009",
    type: "GENERAL",
    subtotal: "86000",
    totalAmount: "94200",
    approvalStatus: "APPROVED",
    exportApprovalStatus: "PENDING",
    createdAt: "2026-04-19T08:28:00.000Z",
    customer: { name: "锦禾健康" },
    creator: { displayName: "李昊" },
    items: [{ id: "1" }, { id: "2" }],
  },
  {
    id: "preview-quotation-3",
    quotationNo: "SER-20260418-021",
    type: "SERVICE",
    subtotal: "126000",
    totalAmount: "126000",
    approvalStatus: "NOT_REQUIRED",
    exportApprovalStatus: "APPROVED",
    createdAt: "2026-04-18T15:30:00.000Z",
    customer: { name: "诚安医养服务" },
    creator: { displayName: "admin" },
    items: [{ id: "1" }, { id: "2" }, { id: "3" }],
  },
  {
    id: "preview-quotation-4",
    quotationNo: "IND-20260418-006",
    type: "INDUSTRY",
    subtotal: "254000",
    totalAmount: "279400",
    approvalStatus: "REJECTED",
    exportApprovalStatus: "NOT_REQUIRED",
    createdAt: "2026-04-18T11:05:00.000Z",
    customer: { name: "远辰渠道集团" },
    creator: { displayName: "王潇" },
    items: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }],
  },
  {
    id: "preview-quotation-5",
    quotationNo: "BRE-20260417-014",
    type: "BREEDING",
    subtotal: "68000",
    totalAmount: "74120",
    approvalStatus: "PENDING",
    exportApprovalStatus: "PENDING",
    createdAt: "2026-04-17T13:10:00.000Z",
    customer: { name: "蒲公英中学" },
    creator: { displayName: "周晨" },
    items: [{ id: "1" }, { id: "2" }],
  },
  {
    id: "preview-quotation-6",
    quotationNo: "GEN-20260416-032",
    type: "GENERAL",
    subtotal: "310000",
    totalAmount: "339200",
    approvalStatus: "APPROVED",
    exportApprovalStatus: "APPROVED",
    createdAt: "2026-04-16T10:42:00.000Z",
    customer: { name: "微笑草帽乡村发展集团" },
    creator: { displayName: "林静" },
    items: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }],
  },
];

const focusTabs: Array<{ key: FocusKey; label: string; helper: string }> = [
  {
    key: "pending",
    label: "待审批",
    helper: "先清掉直接影响对外推进的报价。",
  },
  {
    key: "export",
    label: "待导出放行",
    helper: "把已经能成交的报价从卡点里拉出来。",
  },
  {
    key: "recent",
    label: "最近新增",
    helper: "快速判断团队今天在推进什么类型的生意。",
  },
];

const quickNotes = [
  {
    label: "今天先批",
    title: "先处理已经接近外发的单",
    note: "高金额折扣审批和外发导出审批，不应该继续藏在明细页里。",
  },
  {
    label: "今天先发",
    title: "导出阻塞应该被单独看见",
    note: "已经通过金额审批但还没放开导出的报价，是最容易延误成交的队列。",
  },
  {
    label: "今天先看",
    title: "按类型判断本周业务重心",
    note: "农业方案、通用报价和服务单，不该只是一列标签，而该形成经营判断。",
  },
];

function quotationTypeLabel(type: QuotationType) {
  return (
    quotationTypeOptions.find((option) => option.value === type)?.label ?? "报价"
  );
}

function approvalTone(status: ApprovalStatus): Tone {
  switch (status) {
    case "APPROVED":
      return "success";
    case "PENDING":
      return "warning";
    case "REJECTED":
      return "danger";
    default:
      return "neutral";
  }
}

function approvalLabel(status: ApprovalStatus, mode: "approval" | "export") {
  if (status === "PENDING") {
    return "待审批";
  }

  if (status === "REJECTED") {
    return "已驳回";
  }

  if (status === "APPROVED") {
    return mode === "export" ? "已解锁" : "已通过";
  }

  return mode === "export" ? "无需解锁" : "免审批";
}

function quotationInsight(record: QuotationRecord) {
  if (record.approvalStatus === "PENDING") {
    return "折扣或金额审批仍在阻塞外发节奏";
  }

  if (record.exportApprovalStatus === "PENDING") {
    return "报价内容已基本就绪，但导出权限尚未释放";
  }

  if (record.approvalStatus === "REJECTED") {
    return "当前版本被驳回，建议先确认条款或折扣策略";
  }

  if (record.exportApprovalStatus === "APPROVED") {
    return "这笔报价已具备正式对外交付条件";
  }

  return "当前报价可以作为稳定推进中的业务管道";
}

function nextAction(record: QuotationRecord) {
  if (record.approvalStatus === "PENDING") {
    return "优先完成金额审批，避免继续卡在内部确认。";
  }

  if (record.exportApprovalStatus === "PENDING") {
    return "确认导出权限后直接外发客户版本。";
  }

  if (record.approvalStatus === "REJECTED") {
    return "回看被驳回原因，修正版本后重新提交。";
  }

  return "保持跟进节奏，把客户确认节点写回系统。";
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function ToneBadge({
  children,
  tone,
}: {
  children: string;
  tone: Tone;
}) {
  return (
    <span
      className={cx(
        styles.badge,
        styles[`badge${tone[0].toUpperCase()}${tone.slice(1)}`],
      )}
    >
      {children}
    </span>
  );
}

export function QuotationsWorkspacePreview() {
  const [records, setRecords] = useState<QuotationRecord[]>(sampleRecords);
  const [activeTab, setActiveTab] = useState<FocusKey>("pending");
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState<"" | QuotationType>("");
  const [selectedId, setSelectedId] = useState(sampleRecords[0]?.id ?? "");
  const [usingFallback, setUsingFallback] = useState(true);
  const [statusText, setStatusText] = useState("正在载入实时报价数据");

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      try {
        const token = getToken();
        const dataMode = getRecordDataMode();

        if (!token) {
          if (!cancelled) {
            setRecords(sampleRecords);
            setUsingFallback(true);
            setSelectedId(sampleRecords[0]?.id ?? "");
            setStatusText("当前展示设计样例数据：未检测到登录态");
          }
          return;
        }

        const response = await fetchApi("/quotations", {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "x-huigui-record-scope": dataMode.scope,
            ...(dataMode.scope === "TEST" && dataMode.testBatchId
              ? { "x-huigui-test-batch-id": dataMode.testBatchId }
              : {}),
          },
        });

        if (!response.ok) {
          throw new Error(await readErrorMessage(response));
        }

        const payload = (await response.json()) as QuotationRecord[];
        if (cancelled || !Array.isArray(payload) || payload.length === 0) {
          return;
        }

        setRecords(payload);
        setUsingFallback(false);
        setSelectedId(payload[0]?.id ?? "");
        setStatusText("已接入实时报价数据");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setRecords(sampleRecords);
        setUsingFallback(true);
        setSelectedId(sampleRecords[0]?.id ?? "");
        setStatusText(
          error instanceof Error
            ? `当前展示设计样例数据：${error.message}`
            : "当前展示设计样例数据",
        );
      }
    }

    void loadRecords();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRecords = useMemo(() => {
    return records
      .filter((record) => {
        const haystack =
          `${record.quotationNo} ${record.customer.name} ${record.creator.displayName}`.toLowerCase();
        const matchesKeyword =
          !keyword.trim() || haystack.includes(keyword.trim().toLowerCase());
        const matchesType = !type || record.type === type;
        return matchesKeyword && matchesType;
      })
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      );
  }, [keyword, records, type]);

  const totalAmount = useMemo(
    () =>
      filteredRecords.reduce(
        (sum, record) => sum + Number(record.totalAmount || 0),
        0,
      ),
    [filteredRecords],
  );

  const pendingApprovalCount = useMemo(
    () =>
      filteredRecords.filter((record) => record.approvalStatus === "PENDING")
        .length,
    [filteredRecords],
  );

  const pendingExportCount = useMemo(
    () =>
      filteredRecords.filter(
        (record) => record.exportApprovalStatus === "PENDING",
      ).length,
    [filteredRecords],
  );

  const recentCount = useMemo(
    () =>
      filteredRecords.filter((record) => {
        const createdAt = new Date(record.createdAt).getTime();
        return Date.now() - createdAt <= 7 * 24 * 60 * 60 * 1000;
      }).length,
    [filteredRecords],
  );

  const focusRecords = useMemo(() => {
    switch (activeTab) {
      case "pending":
        return filteredRecords.filter(
          (record) =>
            record.approvalStatus === "PENDING" ||
            record.approvalStatus === "REJECTED",
        );
      case "export":
        return filteredRecords.filter(
          (record) => record.exportApprovalStatus === "PENDING",
        );
      default:
        return filteredRecords.slice(0, 6);
    }
  }, [activeTab, filteredRecords]);

  const selectedRecord =
    focusRecords.find((record) => record.id === selectedId) ??
    focusRecords[0] ??
    filteredRecords[0] ??
    null;

  const typeMix = useMemo(() => {
    const map = filteredRecords.reduce<Record<QuotationType, number>>(
      (result, record) => {
        result[record.type] = (result[record.type] ?? 0) + 1;
        return result;
      },
      {
        AGRICULTURE: 0,
        GENERAL: 0,
        INDUSTRY: 0,
        SERVICE: 0,
        BREEDING: 0,
      },
    );

    return Object.entries(map)
      .map(([key, value]) => ({
        key: key as QuotationType,
        label: quotationTypeLabel(key as QuotationType),
        value,
      }))
      .filter((item) => item.value > 0)
      .sort((left, right) => right.value - left.value);
  }, [filteredRecords]);

  const topCustomers = useMemo(() => {
    const map = filteredRecords.reduce<Record<string, number>>((result, record) => {
      result[record.customer.name] =
        (result[record.customer.name] ?? 0) + Number(record.totalAmount || 0);
      return result;
    }, {});

    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 3);
  }, [filteredRecords]);

  return (
    <div className={styles.previewPage}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Quotation preview</span>
          <h1>报价中心高級版测试页</h1>
          <p>
            这版不再把报价页做成单纯表格，而是改成「经营中的报价工作台」。
            第一眼先看待审批、待导出和最近新增，再进入具体报价处理。
          </p>

          <div className={styles.heroSignals}>
            <span>把成交临界点直接抬到首页</span>
            <span>把导出阻塞从细节动作升级成主任务</span>
            <span>让类型结构能读出经营重心</span>
          </div>
        </div>

        <div className={styles.heroAside}>
          <div className={styles.livePanel}>
            <span>当前状态</span>
            <strong>{usingFallback ? "设计样例模式" : "实时数据模式"}</strong>
            <p>{statusText}</p>
          </div>

          <div className={styles.heroActions}>
            <Link className={styles.primaryAction} href="/quotes/general">
              新建通用报价
            </Link>
            <Link className={styles.secondaryAction} href="/quotations">
              返回正式报价页
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.signalGrid}>
        <article className={cx(styles.signalCard, styles.signalWarning)}>
          <span>待金额审批</span>
          <strong>{String(pendingApprovalCount).padStart(2, "0")}</strong>
          <h2>先清最影响对外节奏的报价</h2>
          <p>这类报价已经接近外发或成交，应该优先获得管理确认。</p>
        </article>

        <article className={cx(styles.signalCard, styles.signalDanger)}>
          <span>待导出放行</span>
          <strong>{String(pendingExportCount).padStart(2, "0")}</strong>
          <h2>导出阻塞应该成为单独战情</h2>
          <p>金额过了但导出还没放开的单，是最容易拖慢客户确认的点。</p>
        </article>

        <article className={cx(styles.signalCard, styles.signalSuccess)}>
          <span>近 7 天新增</span>
          <strong>{String(recentCount).padStart(2, "0")}</strong>
          <h2>这周的业务方向需要被看见</h2>
          <p>最近新增的类型结构，可以直接读出团队现在在卖什么。</p>
        </article>
      </section>

      <section className={styles.metricRibbon}>
        <article className={styles.metricCard}>
          <span>筛选后总额</span>
          <strong>{formatMoney(totalAmount)}</strong>
          <small>当前视角下的报价资金盘</small>
        </article>
        <article className={styles.metricCard}>
          <span>报价数量</span>
          <strong>{filteredRecords.length}</strong>
          <small>当前关键词与类型的结果数</small>
        </article>
        <article className={styles.metricCard}>
          <span>最高单笔</span>
          <strong>
            {formatMoney(
              Math.max(
                0,
                ...filteredRecords.map((record) => Number(record.totalAmount || 0)),
              ),
            )}
          </strong>
          <small>适合优先关注的大额机会</small>
        </article>
        <article className={styles.metricCard}>
          <span>均单金额</span>
          <strong>
            {formatMoney(
              filteredRecords.length ? totalAmount / filteredRecords.length : 0,
            )}
          </strong>
          <small>帮助判断报价结构是否偏大单</small>
        </article>
      </section>

      <section className={styles.workspace}>
        <div className={styles.mainColumn}>
          <section className={styles.queuePanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>报价推进队列</span>
                <h2>先处理会改变经营节奏的报价，而不是先翻全表。</h2>
              </div>
            </div>

            <div className={styles.filterRow}>
              <label className={styles.field}>
                <span>搜索</span>
                <input
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="报价单号 / 客户 / 创建人"
                  value={keyword}
                />
              </label>

              <label className={styles.field}>
                <span>报价类型</span>
                <select
                  onChange={(event) =>
                    setType(event.target.value as "" | QuotationType)
                  }
                  value={type}
                >
                  {quotationTypeOptions.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className={styles.filterReset}
                onClick={() => {
                  setKeyword("");
                  setType("");
                }}
                type="button"
              >
                清空筛选
              </button>
            </div>

            <div className={styles.tabRow}>
              {focusTabs.map((tab) => {
                const count =
                  tab.key === "pending"
                    ? filteredRecords.filter(
                        (record) =>
                          record.approvalStatus === "PENDING" ||
                          record.approvalStatus === "REJECTED",
                      ).length
                    : tab.key === "export"
                      ? filteredRecords.filter(
                          (record) => record.exportApprovalStatus === "PENDING",
                        ).length
                      : Math.min(filteredRecords.length, 6);

                return (
                  <button
                    className={cx(
                      styles.tabButton,
                      activeTab === tab.key && styles.tabButtonActive,
                    )}
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    type="button"
                  >
                    <strong>{tab.label}</strong>
                    <span>{tab.helper}</span>
                    <em>{String(count).padStart(2, "0")}</em>
                  </button>
                );
              })}
            </div>

            <div className={styles.queueList}>
              {focusRecords.length ? (
                focusRecords.map((record) => (
                  <button
                    className={cx(
                      styles.queueItem,
                      selectedRecord?.id === record.id && styles.queueItemActive,
                    )}
                    key={record.id}
                    onClick={() => setSelectedId(record.id)}
                    type="button"
                  >
                    <div className={styles.queueTop}>
                      <div>
                        <span className={styles.queueEyebrow}>
                          {quotationTypeLabel(record.type)}
                        </span>
                        <h3>{record.quotationNo}</h3>
                      </div>
                      <ToneBadge tone={approvalTone(record.approvalStatus)}>
                        {approvalLabel(record.approvalStatus, "approval")}
                      </ToneBadge>
                    </div>

                    <p>{quotationInsight(record)}</p>

                    <div className={styles.queueMeta}>
                      <span>{record.customer.name}</span>
                      <span>{record.creator.displayName}</span>
                      <span>{formatDateLabel(record.createdAt)}</span>
                    </div>

                    <div className={styles.queueFoot}>
                      <strong>{formatMoney(record.totalAmount)}</strong>
                      <ToneBadge tone={approvalTone(record.exportApprovalStatus)}>
                        {approvalLabel(record.exportApprovalStatus, "export")}
                      </ToneBadge>
                    </div>
                  </button>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <strong>当前筛选下没有匹配报价</strong>
                  <p>可以切换队列、调整关键词，或直接清空筛选重新看整盘报价。</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.inspectorPanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>右侧检视面</span>
                <h2>选中一笔报价时，右侧应该给出足够判断依据。</h2>
              </div>
            </div>

            {selectedRecord ? (
              <div className={styles.inspectorBody}>
                <div className={styles.selectedHeadline}>
                  <div>
                    <span>{selectedRecord.customer.name}</span>
                    <h3>{selectedRecord.quotationNo}</h3>
                  </div>
                  <strong>{formatMoney(selectedRecord.totalAmount)}</strong>
                </div>

                <div className={styles.badgeRow}>
                  <ToneBadge tone={approvalTone(selectedRecord.approvalStatus)}>
                    {approvalLabel(selectedRecord.approvalStatus, "approval")}
                  </ToneBadge>
                  <ToneBadge
                    tone={approvalTone(selectedRecord.exportApprovalStatus)}
                  >
                    {approvalLabel(selectedRecord.exportApprovalStatus, "export")}
                  </ToneBadge>
                  <ToneBadge tone={selectedRecord.type === "AGRICULTURE" ? "success" : "neutral"}>
                    {quotationTypeLabel(selectedRecord.type)}
                  </ToneBadge>
                </div>

                <p className={styles.selectedSummary}>
                  {quotationInsight(selectedRecord)}
                </p>

                <div className={styles.selectedGrid}>
                  <article>
                    <span>创建人</span>
                    <strong>{selectedRecord.creator.displayName}</strong>
                  </article>
                  <article>
                    <span>条目数</span>
                    <strong>{selectedRecord.items.length}</strong>
                  </article>
                  <article>
                    <span>小计</span>
                    <strong>{formatMoney(selectedRecord.subtotal)}</strong>
                  </article>
                  <article>
                    <span>创建时间</span>
                    <strong>{formatDateLabel(selectedRecord.createdAt)}</strong>
                  </article>
                </div>

                <div className={styles.nextAction}>
                  <span>建议下一步</span>
                  <strong>{nextAction(selectedRecord)}</strong>
                </div>

                <div className={styles.linkRow}>
                  <Link className={styles.primaryAction} href="/quotations">
                    进入正式报价列表
                  </Link>
                  <Link className={styles.secondaryAction} href="/quotes/general">
                    新建报价
                  </Link>
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <strong>还没有可检视的报价</strong>
                <p>调整筛选条件后，这里会展示被选中的报价详情与处理建议。</p>
              </div>
            )}
          </section>

          <section className={styles.sidePanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>经营结构</span>
                <h2>报价类型不只是分类，更是本周业务重心。</h2>
              </div>
            </div>

            <div className={styles.mixList}>
              {typeMix.map((item) => (
                <article className={styles.mixCard} key={item.key}>
                  <div>
                    <span>{item.label}</span>
                    <strong>{String(item.value).padStart(2, "0")}</strong>
                  </div>
                  <div
                    className={styles.mixBar}
                    style={{
                      width: `${Math.max(
                        24,
                        (item.value / Math.max(1, filteredRecords.length)) * 100,
                      )}%`,
                    }}
                  />
                </article>
              ))}
            </div>
          </section>

          <section className={styles.sidePanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>重点客户金额</span>
                <h2>右侧应该顺手告诉你，现在最大的盘子在哪。</h2>
              </div>
            </div>

            <div className={styles.customerList}>
              {topCustomers.map((customer) => (
                <article className={styles.customerCard} key={customer.name}>
                  <span>{customer.name}</span>
                  <strong>{formatMoney(customer.amount)}</strong>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className={styles.quickBoard}>
        {quickNotes.map((item) => (
          <article className={styles.quickCard} key={item.label}>
            <span>{item.label}</span>
            <h3>{item.title}</h3>
            <p>{item.note}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
