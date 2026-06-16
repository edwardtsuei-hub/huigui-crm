"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CustomerFormFields } from "../../../../../components/customers/CustomerFormFields";
import {
  customerOwnerProtectionLabel,
  customerOwnerProtectionTone,
  createCustomerForm,
  customerStatusLabelMap,
  customerStatusTone,
  customerToFormValues,
  formatCustomerMoney,
  toCustomerPayload,
  type CustomerDetail,
  type IndustryGroupOption,
  type UserOption,
} from "../../../../../components/customers/types";
import {
  apiFetch,
  getCurrentUser,
  isExecutionSalesRole,
} from "../../../../../lib/api";

type CustomerUpdateResult = {
  customer: CustomerDetail;
  transferResult?: {
    mode: "completed" | "approval_submitted";
    message: string;
    requiredRoleCode?: string | null;
  } | null;
};

export default function CustomerEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const currentUser = getCurrentUser();
  const [form, setForm] = useState(createCustomerForm());
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [transferReason, setTransferReason] = useState("");
  const [industries, setIndustries] = useState<IndustryGroupOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [detailResponse, industryResponse, userResponse] =
          await Promise.all([
            apiFetch<CustomerDetail>(`/customers/${params.id}`),
            apiFetch<IndustryGroupOption[]>("/meta/industries"),
            apiFetch<UserOption[]>("/meta/users"),
          ]);

        if (cancelled) {
          return;
        }

        setCustomer(detailResponse);
        setIndustries(industryResponse);
        setUsers(userResponse);
        setForm(customerToFormValues(detailResponse));
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "加载客户详情失败",
          );
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const ownerChanged = Boolean(customer && form.ownerUserId !== customer.owner.id);

  useEffect(() => {
    if (!ownerChanged) {
      setTransferReason("");
    }
  }, [ownerChanged]);

  const nextOwnerName = useMemo(
    () =>
      users.find((user) => user.id === form.ownerUserId)?.displayName ??
      customer?.owner.displayName ??
      "未分配",
    [customer?.owner.displayName, form.ownerUserId, users],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const result = await apiFetch<CustomerUpdateResult>(`/customers/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...toCustomerPayload(form),
          transferReason: transferReason.trim() || undefined,
        }),
      });

      if (result.transferResult?.mode === "approval_submitted") {
        setCustomer(result.customer);
        setForm(customerToFormValues(result.customer));
        setTransferReason("");
        setMessage(
          `${result.transferResult.message} 当前负责人仍保持原值，审批通过后才会真正完成转移。`,
        );
        return;
      }

      setCustomer(result.customer);
      setMessage("客户档案已更新，正在返回详情页...");
      router.replace(`/customers/${params.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "更新客户失败",
      );
    } finally {
      setLoading(false);
    }
  }

  if (bootstrapping) {
    return <section className="panel">正在加载客户详情...</section>;
  }

  if (!customer) {
    return <section className="panel">{error || "未找到客户信息"}</section>;
  }

  return (
    <div className="workspace-stack">
      <section className="hero-surface">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="hero-kicker">Customer Maintenance</div>
            <h3 className="hero-title">{customer.name}</h3>
            <div className="hero-description">
              这里补齐联系人、行业、区域和合作内容，能让客户详情页、报价页和后续跟进记录保持同一份业务上下文。
            </div>
          </div>
          <div className="hero-actions">
            <Link
              className="button secondary inline"
              href={`/customers/${customer.id}`}
            >
              返回客户详情
            </Link>
            <Link className="button ghost inline" href="/customers">
              返回客户列表
            </Link>
          </div>
        </div>
      </section>

      <section className="editor-shell">
        <div className="editor-main">
          <section className="panel stack">
            <div className="section-heading">
              <h3>编辑客户档案</h3>
              <p>
                这次编辑会覆盖当前客户资料，建议优先检查负责人、状态、合作方向和商业金额。
              </p>
            </div>

            <form className="stack" onSubmit={handleSubmit}>
              <CustomerFormFields
                form={form}
                industries={industries}
                users={users}
                disableOwnerSelection={isExecutionSalesRole(currentUser)}
                onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
              />

              {ownerChanged ? (
                <div className="summary-card">
                  <div className="section-heading">
                    <h3>负责人转移说明</h3>
                    <p>
                      当前会把负责人从 {customer.owner.displayName} 调整为{" "}
                      {nextOwnerName}。如果系统启用了转移审批，这段说明会一并带入审批单。
                    </p>
                  </div>
                  <div className="field">
                    <label htmlFor="transfer-reason">转移原因</label>
                    <textarea
                      id="transfer-reason"
                      onChange={(event) => setTransferReason(event.target.value)}
                      placeholder="例如：客户已转入其他区域、由新的销售继续跟进、原负责人岗位调整等"
                      rows={4}
                      value={transferReason}
                    />
                    <div className="small muted">
                      若后台启用了“转移原因必填”，这里留空会被系统拦下。
                    </div>
                  </div>
                </div>
              ) : null}

              {message ? <div className="small">{message}</div> : null}
              {error ? <div className="small danger-text">{error}</div> : null}

              <div className="action-row">
                <button type="submit" disabled={loading}>
                  {loading ? "保存中..." : "保存更新"}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setForm(customerToFormValues(customer));
                    setTransferReason("");
                  }}
                >
                  恢复原值
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="editor-side sticky-side">
          <section className="panel stack">
            <div className="section-heading">
              <h3>当前快照</h3>
              <p>编辑前先确认客户当前状态与负责人，避免修改后推进节奏偏离。</p>
            </div>

            <div className="summary-card">
              <div className="summary-list">
                <div className="summary-row">
                  <span>当前负责人</span>
                  <strong>{customer.owner.displayName}</strong>
                </div>
                <div className="summary-row">
                  <span>负责人状态</span>
                  <span
                    className={`status-pill ${customerOwnerProtectionTone(customer.ownerProtectionStatus)}`}
                  >
                    {customerOwnerProtectionLabel(
                      customer.ownerProtectionStatus,
                    )}
                  </span>
                </div>
                {ownerChanged ? (
                  <div className="summary-row">
                    <span>提交后负责人</span>
                    <strong>{nextOwnerName}</strong>
                  </div>
                ) : null}
                <div className="summary-row">
                  <span>保护截止</span>
                  <strong>
                    {new Date(customer.ownerProtectedUntil).toLocaleDateString(
                      "zh-CN",
                    )}
                  </strong>
                </div>
                <div className="summary-row">
                  <span>客户状态</span>
                  <span
                    className={`status-pill ${customerStatusTone(form.status)}`}
                  >
                    {customerStatusLabelMap[form.status]}
                  </span>
                </div>
                <div className="summary-row">
                  <span>预估金额</span>
                  <strong>{formatCustomerMoney(form.estimatedAmount)}</strong>
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="section-heading">
                <h3>编辑提醒</h3>
                <p>
                  若已经有报价在跟进，建议先同步更新合作方向与备注，确保报价记录和客户档案一致。
                </p>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
