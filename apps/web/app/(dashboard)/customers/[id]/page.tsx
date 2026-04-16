"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { DetailTabs } from "../../../../components/dashboard/DetailTabs";
import { EntityDetailHeader } from "../../../../components/dashboard/EntityDetailHeader";
import { QuickWorkspaceComposer } from "../../../../components/dashboard/QuickWorkspaceComposer";
import { StepStrip } from "../../../../components/dashboard/StepStrip";
import { apiFetch } from "../../../../lib/api";
import {
  WORKSPACE_ITEMS_CHANGED_EVENT,
  bucketDueLabel,
  filterVisibleWorkspaceItems,
  formatDateLabel,
  listLocalWorkspaceItems,
  workspaceKindLabel,
  type WorkspacePriority,
  workspacePriorityLabel,
  workspacePriorityTone,
  type LocalWorkspaceItem,
  type WorkspaceItemKind,
} from "../../../../lib/workspace";
import {
  customerStatusLabelMap,
  customerStatusTone,
  formatCustomerMoney,
} from "../../../../components/customers/types";

type CustomerDetail = {
  id: string;
  name: string;
  companyName?: string | null;
  contactName?: string | null;
  mobile?: string | null;
  wechat?: string | null;
  email?: string | null;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  source?: string | null;
  status: string;
  cooperationDirection?: string | null;
  cooperationContent?: string | null;
  estimatedAmount?: string | null;
  successProbability?: number | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; displayName: string; role: { name: string } };
  industryGroup?: { id: string; name: string } | null;
  industrySubgroup?: { id: string; name: string } | null;
  followups: Array<{
    id: string;
    content: string;
    createdAt: string;
    followupDate?: string;
    followupType?: string;
    keyPoints?: string | null;
    nextAction?: string | null;
    nextFollowupAt?: string | null;
    creator: { displayName?: string; name?: string };
  }>;
  quotations: Array<{
    id: string;
    quotationNo: string;
    type: "AGRICULTURE" | "GENERAL" | "INDUSTRY" | "SERVICE" | "BREEDING";
    totalAmount: string;
    createdAt: string;
    updatedAt?: string;
    status?: string;
    approvalStatus?: string;
    exportApprovalStatus?: string;
  }>;
  agriculturePlans?: Array<{
    id: string;
    createdAt: string;
    updatedAt: string;
    quotation?: {
      id: string;
      quotationNo: string;
      type: string;
      totalAmount: string;
      status?: string;
      createdAt: string;
    } | null;
  }>;
  contracts?: Array<{
    id: string;
    contractName: string;
    contractNo?: string | null;
    amount?: string | null;
    status: string;
    expiredAt?: string | null;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    startAt: string;
    endAt?: string | null;
    reminderAt?: string | null;
    content?: string | null;
    assignee?: { name?: string; displayName?: string } | null;
  }>;
};

type TimelineEntry = {
  id: string;
  time: string;
  title: string;
  description: string;
  tone?: "neutral" | "success" | "warning" | "danger";
};

type ReminderRow = {
  id: string;
  title: string;
  dueAt: string;
  label: string;
  detail: string;
  priority?: WorkspacePriority;
};

const customerSteps = [
  "初次接触",
  "需求确认",
  "方案中",
  "报价中",
  "跟进中",
  "成交",
  "暂停",
];

function followupTypeLabel(value?: string) {
  switch (value) {
    case "WECHAT":
      return "微信";
    case "PHONE":
      return "电话";
    case "MEETING":
      return "面谈";
    case "VISIT":
      return "拜访";
    default:
      return "跟进记录";
  }
}

function quotationTypeLabel(type: string) {
  switch (type) {
    case "AGRICULTURE":
      return "农业方案";
    case "GENERAL":
      return "通用报价";
    case "INDUSTRY":
      return "行业报价";
    case "SERVICE":
      return "服务报价";
    case "BREEDING":
      return "养殖报价";
    default:
      return "报价";
  }
}

function quotationStatusLabel(status?: string) {
  switch (status) {
    case "GENERATED":
      return "已生成";
    case "SENT":
      return "已发送";
    case "WON":
      return "已成交";
    case "LOST":
      return "已失效";
    default:
      return "草稿";
  }
}

function contractStatusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "生效中";
    case "EXPIRED":
      return "已到期";
    case "TERMINATED":
      return "已终止";
    default:
      return "草稿";
  }
}

function taskStatusLabel(status: string) {
  switch (status) {
    case "DONE":
      return "已完成";
    case "DOING":
      return "进行中";
    case "CANCELED":
      return "已取消";
    default:
      return "待处理";
  }
}

function daysSince(value?: string | null) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
}

function resolveCustomerStep(customer: CustomerDetail) {
  if (customer.status === "PAUSED") {
    return customerSteps.length - 1;
  }

  if ((customer.quotations?.length ?? 0) > 0) {
    return 3;
  }

  if ((customer.agriculturePlans?.length ?? 0) > 0) {
    return 2;
  }

  if (customer.status === "COOPERATING") {
    return 4;
  }

  if (customer.status === "MET" || customer.status === "CONTACTED") {
    return 1;
  }

  return 0;
}

function buildCustomerAdvice(customer: CustomerDetail) {
  const advice: string[] = [];
  const lastFollowupAt =
    customer.followups[0]?.followupDate ??
    customer.followups[0]?.createdAt ??
    null;
  const lastFollowupDays = daysSince(lastFollowupAt);

  if (lastFollowupDays >= 7 && Number.isFinite(lastFollowupDays)) {
    advice.push(
      `该客户已 ${lastFollowupDays} 天未跟进，建议优先安排今天联系。`,
    );
  }

  if ((customer.successProbability ?? 0) >= 70 && !customer.quotations.length) {
    advice.push("意向评分较高，但还没有正式报价，建议尽快生成报价单。");
  }

  if (
    (customer.agriculturePlans?.length ?? 0) > 0 &&
    !customer.quotations.length
  ) {
    advice.push("已有方案记录，但尚未沉淀到正式报价，适合今天收口价格版本。");
  }

  if (
    customer.quotations.some((quotation) => quotation.status === "GENERATED")
  ) {
    advice.push("已有报价进入已生成阶段，建议同步确认客户反馈与审批状态。");
  }

  if (customer.status === "PAUSED") {
    advice.push(
      "当前客户处于暂停状态，推进前先确认负责人和优先级是否需要恢复。",
    );
  }

  if (!advice.length) {
    advice.push("客户推进节奏正常，可以围绕下一次跟进时间继续保持更新。");
  }

  return advice.slice(0, 3);
}

function buildCustomerTimeline(customer: CustomerDetail): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    {
      id: `created-${customer.id}`,
      time: customer.createdAt,
      title: "创建客户档案",
      description: `${customer.owner.displayName} 建立客户档案并纳入 CRM 管理。`,
      tone: "neutral",
    },
    ...customer.followups.map((followup) => ({
      id: `followup-${followup.id}`,
      time: followup.followupDate ?? followup.createdAt,
      title: `${followupTypeLabel(followup.followupType)}跟进`,
      description:
        followup.nextAction ||
        followup.keyPoints ||
        followup.content ||
        "补充了新的沟通记录。",
      tone: "success" as const,
    })),
    ...customer.quotations.map((quotation) => ({
      id: `quotation-${quotation.id}`,
      time: quotation.createdAt,
      title: `创建${quotationTypeLabel(quotation.type)}`,
      description: `${quotation.quotationNo} · ${quotationStatusLabel(quotation.status)} · ${formatCustomerMoney(quotation.totalAmount)}`,
      tone:
        quotation.status === "LOST"
          ? ("danger" as const)
          : ("warning" as const),
    })),
    ...(customer.agriculturePlans ?? []).map((plan) => ({
      id: `plan-${plan.id}`,
      time: plan.createdAt,
      title: "沉淀农业方案",
      description: plan.quotation
        ? `${plan.quotation.quotationNo} 已关联方案记录，适合继续推进正式报价。`
        : "农业方案已生成，等待补齐正式报价或客户确认。",
      tone: "neutral" as const,
    })),
    ...(customer.tasks ?? []).map((task) => ({
      id: `task-${task.id}`,
      time: task.reminderAt ?? task.startAt,
      title: `待办：${task.title}`,
      description: `${taskStatusLabel(task.status)} · ${task.content || "已安排协作任务。"}`,
      tone:
        task.status === "DONE" ? ("success" as const) : ("warning" as const),
    })),
    ...(customer.contracts ?? []).map((contract) => ({
      id: `contract-${contract.id}`,
      time: contract.expiredAt ?? customer.updatedAt,
      title: `合同：${contract.contractName}`,
      description: `${contractStatusLabel(contract.status)}${contract.contractNo ? ` · ${contract.contractNo}` : ""}`,
      tone:
        contract.status === "EXPIRED"
          ? ("danger" as const)
          : ("neutral" as const),
    })),
  ];

  return entries.sort(
    (left, right) =>
      new Date(right.time).getTime() - new Date(left.time).getTime(),
  );
}

function buildReminderRows(
  customer: CustomerDetail,
  workspaceItems: LocalWorkspaceItem[],
): ReminderRow[] {
  return [
    ...customer.followups
      .filter((followup) => followup.nextFollowupAt)
      .map((followup) => ({
        id: `next-followup-${followup.id}`,
        title: `下次跟进 ${customer.name}`,
        dueAt: followup.nextFollowupAt!,
        label: "客户跟进",
        detail: followup.nextAction || followup.content,
      })),
    ...(customer.contracts ?? [])
      .filter((contract) => contract.expiredAt)
      .map((contract) => ({
        id: `contract-expiry-${contract.id}`,
        title: contract.contractName,
        dueAt: contract.expiredAt!,
        label: "合同到期",
        detail: contract.contractNo || "关注合同续签与合作阶段",
      })),
    ...(customer.tasks ?? []).map((task) => ({
      id: `task-reminder-${task.id}`,
      title: task.title,
      dueAt: task.reminderAt ?? task.startAt,
      label: "协作事项",
      detail: task.content || taskStatusLabel(task.status),
    })),
    ...workspaceItems.map((item) => ({
      id: `local-${item.id}`,
      title: item.title,
      dueAt: item.dueAt || item.createdAt,
      label: workspaceKindLabel(item.kind),
      detail: item.summary,
      priority: item.priority,
    })),
  ].sort(
    (left, right) =>
      new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime(),
  );
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [followupForm, setFollowupForm] = useState({
    content: "",
    keyPoints: "",
    nextAction: "",
    nextFollowupAt: "",
  });
  const [workspaceItems, setWorkspaceItems] = useState<LocalWorkspaceItem[]>(
    [],
  );
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerKind, setComposerKind] =
    useState<WorkspaceItemKind>("reminder");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadDetail() {
    const response = await apiFetch<CustomerDetail>(`/customers/${params.id}`);
    setCustomer(response);
  }

  useEffect(() => {
    loadDetail().catch((requestError) =>
      setError(
        requestError instanceof Error
          ? requestError.message
          : "加载客户详情失败",
      ),
    );
  }, [params.id]);

  useEffect(() => {
    function syncWorkspaceItems() {
      setWorkspaceItems(
        filterVisibleWorkspaceItems(listLocalWorkspaceItems()).filter(
          (item) => item.relatedId === params.id,
        ),
      );
    }

    syncWorkspaceItems();
    window.addEventListener(WORKSPACE_ITEMS_CHANGED_EVENT, syncWorkspaceItems);
    return () => {
      window.removeEventListener(
        WORKSPACE_ITEMS_CHANGED_EVENT,
        syncWorkspaceItems,
      );
    };
  }, [params.id]);

  async function addFollowup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      await apiFetch(`/customers/${params.id}/followups`, {
        method: "POST",
        body: JSON.stringify({
          followupDate: new Date().toISOString(),
          followupType: "MANUAL_NOTE",
          content: followupForm.content,
          keyPoints: followupForm.keyPoints || undefined,
          nextAction: followupForm.nextAction || undefined,
          nextContactAt: followupForm.nextFollowupAt || undefined,
          needReminder: Boolean(followupForm.nextFollowupAt),
        }),
      });

      setFollowupForm({
        content: "",
        keyPoints: "",
        nextAction: "",
        nextFollowupAt: "",
      });
      setMessage("跟进记录已新增");
      await loadDetail();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "新增跟进失败",
      );
    }
  }

  const currentStep = useMemo(
    () => (customer ? resolveCustomerStep(customer) : 0),
    [customer],
  );

  const nextFollowupAt = customer?.followups.find(
    (item) => item.nextFollowupAt,
  )?.nextFollowupAt;
  const lastFollowupAt =
    customer?.followups[0]?.followupDate ??
    customer?.followups[0]?.createdAt ??
    null;
  const adviceItems = useMemo(
    () => (customer ? buildCustomerAdvice(customer) : []),
    [customer],
  );
  const timelineItems = useMemo(
    () => (customer ? buildCustomerTimeline(customer) : []),
    [customer],
  );
  const reminderRows = useMemo(
    () => (customer ? buildReminderRows(customer, workspaceItems) : []),
    [customer, workspaceItems],
  );
  const solutionRows = useMemo(
    () =>
      (customer?.agriculturePlans ?? []).map((plan) => ({
        id: plan.id,
        title: plan.quotation?.quotationNo || "农业方案记录",
        type: "农业方案",
        target: plan.quotation?.id ? `/quotations/${plan.quotation.id}` : "#",
        amount: plan.quotation?.totalAmount || "",
        status: plan.quotation?.status || "DRAFT",
        createdAt: plan.createdAt,
      })),
    [customer?.agriculturePlans],
  );

  if (!customer) {
    return (
      <section className="panel">{error || "正在加载客户详情..."}</section>
    );
  }

  return (
    <div className="workspace-stack">
      <EntityDetailHeader
        actions={
          <>
            <Link
              className="button secondary inline"
              href={`/customers/${customer.id}/edit`}
            >
              编辑客户
            </Link>
            <button
              className="button secondary inline"
              onClick={() => {
                setComposerKind("reminder");
                setComposerOpen(true);
              }}
              type="button"
            >
              新增提醒
            </button>
            <Link
              className="button secondary inline"
              href={`/quotes/general?customerId=${customer.id}`}
            >
              新建报价
            </Link>
            <Link
              className="button inline"
              href={`/solutions/agriculture/new?customerId=${customer.id}`}
            >
              新建方案
            </Link>
            <details className="menu-popover">
              <summary className="button ghost inline">更多操作</summary>
              <div className="menu-popover__panel">
                <Link
                  className="menu-popover__item"
                  href={`/customers/${customer.id}/edit`}
                >
                  转移负责人 / 调整状态
                </Link>
                <button
                  className="menu-popover__item"
                  onClick={() => {
                    setComposerKind("todo");
                    setComposerOpen(true);
                  }}
                  type="button"
                >
                  新建待办
                </button>
                <Link className="menu-popover__item" href="/customers">
                  返回客户列表
                </Link>
              </div>
            </details>
          </>
        }
        badges={[
          {
            label: customerStatusLabelMap[customer.status] ?? customer.status,
            tone: customerStatusTone(customer.status) as
              | "neutral"
              | "success"
              | "warning"
              | "danger",
          },
        ]}
        breadcrumbs={[
          { label: "客户", href: "/customers" },
          { label: customer.name },
        ]}
        eyebrow="客户详情"
        meta={[
          { label: "意向评分", value: `${customer.successProbability ?? 0}` },
          { label: "负责人", value: customer.owner.displayName },
          {
            label: "最近跟进",
            value: lastFollowupAt
              ? formatDateLabel(lastFollowupAt)
              : "暂无记录",
          },
          {
            label: "下次跟进",
            value: nextFollowupAt ? formatDateLabel(nextFollowupAt) : "待安排",
            tone: nextFollowupAt ? "warning" : "neutral",
          },
          {
            label: "预计金额",
            value: formatCustomerMoney(customer.estimatedAmount),
          },
        ]}
        subtitle={`${customer.companyName || "未填写公司名称"} · ${[customer.province, customer.city, customer.district].filter(Boolean).join(" / ") || "未填写地区"} · ${customer.industryGroup?.name || "未设置行业"}${customer.industrySubgroup?.name ? ` / ${customer.industrySubgroup.name}` : ""}`}
        title={customer.name}
      />

      {error ? <div className="danger-text small">{error}</div> : null}
      {message ? <div className="small success-text">{message}</div> : null}

      <section className="detail-layout">
        <div className="workspace-main">
          <section className="panel stack">
            <div className="section-heading">
              <h3>客户概览</h3>
              <p>
                先看成交判断所需的关键资料，再决定今天是推进方案、报价还是继续跟进。
              </p>
            </div>

            <div className="detail-info-grid">
              <article className="detail-info-card">
                <span>客户名称</span>
                <strong>{customer.name}</strong>
              </article>
              <article className="detail-info-card">
                <span>联系人</span>
                <strong>{customer.contactName || "未填写"}</strong>
              </article>
              <article className="detail-info-card">
                <span>手机</span>
                <strong>{customer.mobile || "未填写"}</strong>
              </article>
              <article className="detail-info-card">
                <span>微信号</span>
                <strong>{customer.wechat || "未填写"}</strong>
              </article>
              <article className="detail-info-card">
                <span>所属行业</span>
                <strong>
                  {customer.industryGroup?.name || "未设置"}
                  {customer.industrySubgroup?.name
                    ? ` / ${customer.industrySubgroup.name}`
                    : ""}
                </strong>
              </article>
              <article className="detail-info-card">
                <span>来源渠道</span>
                <strong>{customer.source || "未填写"}</strong>
              </article>
              <article className="detail-info-card">
                <span>所在地区</span>
                <strong>
                  {[customer.province, customer.city, customer.district]
                    .filter(Boolean)
                    .join(" / ") || "未填写"}
                </strong>
              </article>
              <article className="detail-info-card">
                <span>合作方向</span>
                <strong>{customer.cooperationDirection || "待补充"}</strong>
              </article>
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>跟进进度</h3>
              <p>
                用阶段视图快速判断客户当前卡在哪一步，再决定是补方案还是推进报价。
              </p>
            </div>

            <StepStrip currentStep={currentStep} steps={customerSteps} />
          </section>

          <section className="panel stack">
            <div className="panel-header">
              <div className="section-heading">
                <h3>最近跟进记录</h3>
                <p>
                  把沟通摘要、关键点和下一步动作放在首屏，避免回到表单页重新翻找。
                </p>
              </div>
            </div>

            <form className="detail-inline-form" onSubmit={addFollowup}>
              <div className="field">
                <label htmlFor="followup-content">沟通摘要</label>
                <textarea
                  id="followup-content"
                  onChange={(event) =>
                    setFollowupForm((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  required
                  rows={4}
                  value={followupForm.content}
                />
              </div>

              <div className="grid-2">
                <div className="field">
                  <label htmlFor="followup-key-points">关键点</label>
                  <textarea
                    id="followup-key-points"
                    onChange={(event) =>
                      setFollowupForm((current) => ({
                        ...current,
                        keyPoints: event.target.value,
                      }))
                    }
                    rows={3}
                    value={followupForm.keyPoints}
                  />
                </div>
                <div className="field">
                  <label htmlFor="followup-next-action">下一步动作</label>
                  <textarea
                    id="followup-next-action"
                    onChange={(event) =>
                      setFollowupForm((current) => ({
                        ...current,
                        nextAction: event.target.value,
                      }))
                    }
                    rows={3}
                    value={followupForm.nextAction}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="field">
                  <label htmlFor="followup-next-date">下次跟进时间</label>
                  <input
                    id="followup-next-date"
                    onChange={(event) =>
                      setFollowupForm((current) => ({
                        ...current,
                        nextFollowupAt: event.target.value,
                      }))
                    }
                    type="datetime-local"
                    value={followupForm.nextFollowupAt}
                  />
                </div>

                <div className="detail-inline-form__actions">
                  <button className="button inline" type="submit">
                    保存跟进
                  </button>
                  <button
                    className="button secondary inline"
                    onClick={() => {
                      setComposerKind("schedule");
                      setComposerOpen(true);
                    }}
                    type="button"
                  >
                    新增关联日程
                  </button>
                </div>
              </div>
            </form>

            <div className="focus-list">
              {customer.followups.length ? (
                customer.followups.slice(0, 5).map((followup) => (
                  <article className="list-card" key={followup.id}>
                    <div className="detail-block__header">
                      <div>
                        <strong>
                          {followupTypeLabel(followup.followupType)}
                        </strong>
                        <div className="small muted">
                          {(followup.creator.displayName ||
                            followup.creator.name ||
                            "系统") +
                            " · " +
                            formatDateLabel(
                              followup.followupDate ?? followup.createdAt,
                            )}
                        </div>
                      </div>
                      <span className="status-pill neutral">
                        {followup.nextFollowupAt
                          ? "已设下次跟进"
                          : "待补下一步"}
                      </span>
                    </div>
                    <p>{followup.content}</p>
                    {followup.keyPoints ? (
                      <div className="small muted">
                        关键点：{followup.keyPoints}
                      </div>
                    ) : null}
                    {followup.nextAction ? (
                      <div className="small muted">
                        下一步：{followup.nextAction}
                      </div>
                    ) : null}
                    {followup.nextFollowupAt ? (
                      <div className="small muted">
                        下次跟进：{formatDateLabel(followup.nextFollowupAt)}
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="empty">
                  还没有跟进记录，建议先补最近一次沟通摘要与下一步动作。
                </div>
              )}
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>关联报价</h3>
              <p>直接查看与当前客户相关的所有报价，不需要再回档案中心检索。</p>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>报价编号</th>
                    <th>类型</th>
                    <th>金额</th>
                    <th>状态</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.quotations.length ? (
                    customer.quotations.map((quotation) => (
                      <tr key={quotation.id}>
                        <td>
                          <strong>{quotation.quotationNo}</strong>
                        </td>
                        <td>{quotationTypeLabel(quotation.type)}</td>
                        <td>{formatCustomerMoney(quotation.totalAmount)}</td>
                        <td>
                          <span className="status-pill neutral">
                            {quotationStatusLabel(quotation.status)}
                          </span>
                        </td>
                        <td>{formatDateLabel(quotation.createdAt)}</td>
                        <td>
                          <div className="action-row">
                            <Link
                              className="button secondary inline"
                              href={`/quotations/${quotation.id}`}
                            >
                              查看详情
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty">
                          当前客户还没有关联报价，适合直接发起第一张正式报价。
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>关联方案</h3>
              <p>
                农业方案和方案转报价的衔接记录放在一起，便于确认是否需要继续收口。
              </p>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>方案名称</th>
                    <th>类型</th>
                    <th>状态</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {solutionRows.length ? (
                    solutionRows.map((plan) => (
                      <tr key={plan.id}>
                        <td>
                          <strong>{plan.title}</strong>
                          {plan.amount ? (
                            <div className="small muted">
                              金额 {formatCustomerMoney(plan.amount)}
                            </div>
                          ) : null}
                        </td>
                        <td>{plan.type}</td>
                        <td>
                          <span className="status-pill neutral">
                            {quotationStatusLabel(plan.status)}
                          </span>
                        </td>
                        <td>{formatDateLabel(plan.createdAt)}</td>
                        <td>
                          {plan.target !== "#" ? (
                            <Link
                              className="button secondary inline"
                              href={plan.target}
                            >
                              查看详情
                            </Link>
                          ) : (
                            <span className="small muted">待补关联报价</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty">
                          当前还没有沉淀到方案层的记录，可从右侧快捷操作直接新建。
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>合作内容与备注</h3>
              <p>较长的合作方向、特殊需求与内部判断放在这里，避免占满首屏。</p>
            </div>

            <div className="grid-2">
              <article className="detail-text-card">
                <span>合作内容</span>
                <p>{customer.cooperationContent || "尚未填写合作内容。"}</p>
              </article>
              <article className="detail-text-card">
                <span>内部备注</span>
                <p>{customer.remark || "尚未填写内部备注。"}</p>
              </article>
            </div>
          </section>
        </div>

        <aside className="workspace-side sticky-side">
          <section className="summary-card stack">
            <div className="section-heading">
              <h3>客户状态卡</h3>
              <p>固定帮助你判断这位客户现在是否值得优先推进。</p>
            </div>

            <div className="summary-list">
              <div className="summary-row">
                <span>当前状态</span>
                <strong>
                  {customerStatusLabelMap[customer.status] ?? customer.status}
                </strong>
              </div>
              <div className="summary-row">
                <span>意向评分</span>
                <strong>{customer.successProbability ?? 0}</strong>
              </div>
              <div className="summary-row">
                <span>预计金额</span>
                <strong>{formatCustomerMoney(customer.estimatedAmount)}</strong>
              </div>
              <div className="summary-row">
                <span>最近互动</span>
                <strong>
                  {lastFollowupAt ? formatDateLabel(lastFollowupAt) : "暂无"}
                </strong>
              </div>
              <div className="summary-row">
                <span>下次跟进</span>
                <strong>
                  {nextFollowupAt ? formatDateLabel(nextFollowupAt) : "待安排"}
                </strong>
              </div>
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>推进建议</h3>
              <p>根据跟进频率、方案与报价状态，给出今天最值得处理的动作。</p>
            </div>

            <div className="focus-list">
              {adviceItems.map((item) => (
                <article className="list-card" key={item}>
                  <div className="status-pill warning">建议动作</div>
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>快捷操作</h3>
              <p>在右侧直接发起跟进、提醒和后续业务动作，不用离开详情页。</p>
            </div>

            <div className="focus-list">
              <button
                className="button secondary"
                onClick={() => {
                  setComposerKind("schedule");
                  setComposerOpen(true);
                }}
                type="button"
              >
                新增日程
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  setComposerKind("todo");
                  setComposerOpen(true);
                }}
                type="button"
              >
                新建待办
              </button>
              <Link
                className="button secondary inline"
                href={`/quotes/general?customerId=${customer.id}`}
              >
                新建报价
              </Link>
              <Link
                className="button inline"
                href={`/solutions/agriculture/new?customerId=${customer.id}`}
              >
                新建方案
              </Link>
            </div>
          </section>
        </aside>
      </section>

      <DetailTabs
        initialKey="timeline"
        tabs={[
          {
            key: "timeline",
            label: "跟进时间线",
            content: (
              <div className="focus-list">
                {timelineItems.map((item) => (
                  <article className="list-card" key={item.id}>
                    <div className="detail-block__header">
                      <strong>{item.title}</strong>
                      <span className={`status-pill ${item.tone ?? "neutral"}`}>
                        {formatDateLabel(item.time)}
                      </span>
                    </div>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            ),
          },
          {
            key: "reminders",
            label: "提醒 / 日程",
            content: (
              <div className="focus-list">
                {reminderRows.length ? (
                  reminderRows.map((item) => (
                    <article className="list-card" key={item.id}>
                      <div className="detail-block__header">
                        <div>
                          <strong>{item.title}</strong>
                          <div className="small muted">{item.detail}</div>
                        </div>
                        <span
                          className={`status-pill ${"priority" in item && item.priority ? workspacePriorityTone(item.priority) : "warning"}`}
                        >
                          {bucketDueLabel(item.dueAt)}
                        </span>
                      </div>
                      <div className="small muted">
                        {item.label} · {formatDateLabel(item.dueAt)}
                        {"priority" in item && item.priority
                          ? ` · ${workspacePriorityLabel(item.priority)}`
                          : ""}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty">当前客户还没有关联提醒或日程。</div>
                )}
              </div>
            ),
          },
          {
            key: "attachments",
            label: "附件",
            content: (
              <div className="detail-info-grid">
                {["合同文件", "客户资料", "现场照片", "需求文档"].map(
                  (item) => (
                    <article className="detail-text-card" key={item}>
                      <span>{item}</span>
                      <p>
                        当前还没有上传 {item}，这里已为后续附件能力预留位置。
                      </p>
                    </article>
                  ),
                )}
              </div>
            ),
          },
          {
            key: "logs",
            label: "操作日志",
            content: (
              <div className="focus-list">
                <article className="list-card">
                  <div className="detail-block__header">
                    <strong>客户档案创建</strong>
                    <span className="status-pill neutral">
                      {formatDateLabel(customer.createdAt)}
                    </span>
                  </div>
                  <p>{customer.owner.displayName} 建立了该客户档案。</p>
                </article>
                <article className="list-card">
                  <div className="detail-block__header">
                    <strong>最近更新时间</strong>
                    <span className="status-pill neutral">
                      {formatDateLabel(customer.updatedAt)}
                    </span>
                  </div>
                  <p>最近一次资料变化已同步到客户概览与右侧摘要区。</p>
                </article>
                <article className="list-card">
                  <div className="detail-block__header">
                    <strong>关联业务记录</strong>
                    <span className="status-pill neutral">
                      报价 {customer.quotations.length} · 任务{" "}
                      {(customer.tasks ?? []).length}
                    </span>
                  </div>
                  <p>后续可继续接入更细粒度的审计日志与权限留痕。</p>
                </article>
              </div>
            ),
          },
        ]}
      />

      <QuickWorkspaceComposer
        assignee={customer.owner.displayName}
        initialKind={composerKind}
        onClose={() => setComposerOpen(false)}
        open={composerOpen}
        relatedHref={`/customers/${customer.id}`}
        relatedId={customer.id}
        relatedLabel={customer.name}
        relatedType="customer"
      />
    </div>
  );
}
