"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CustomerFormFields } from "../../../../../components/customers/CustomerFormFields";
import {
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

export default function CustomerEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const currentUser = getCurrentUser();
  const [form, setForm] = useState(createCustomerForm());
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
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

  const ownerName = useMemo(
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
      await apiFetch(`/customers/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify(toCustomerPayload(form)),
      });
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

              {message ? <div className="small">{message}</div> : null}
              {error ? <div className="small danger-text">{error}</div> : null}

              <div className="action-row">
                <button type="submit" disabled={loading}>
                  {loading ? "保存中..." : "保存更新"}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setForm(customerToFormValues(customer))}
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
                  <strong>{ownerName}</strong>
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
