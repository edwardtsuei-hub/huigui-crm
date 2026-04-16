"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { WorkspacePageHeader } from "../../../../components/dashboard/WorkspacePageHeader";
import { CustomerFormFields } from "../../../../components/customers/CustomerFormFields";
import {
  createCustomerForm,
  customerStatusLabelMap,
  customerStatusTone,
  formatCustomerMoney,
  toCustomerPayload,
  type IndustryGroupOption,
  type UserOption,
} from "../../../../components/customers/types";
import {
  apiFetch,
  getCurrentUser,
  isExecutionSalesRole,
} from "../../../../lib/api";

export default function CustomerNewPage() {
  const router = useRouter();
  const currentUser = getCurrentUser();
  const [form, setForm] = useState(createCustomerForm());
  const [industries, setIndustries] = useState<IndustryGroupOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        const [industryResponse, userResponse] = await Promise.all([
          apiFetch<IndustryGroupOption[]>("/meta/industries"),
          apiFetch<UserOption[]>("/meta/users"),
        ]);

        if (cancelled) {
          return;
        }

        setIndustries(industryResponse);
        setUsers(userResponse);
        setForm((prev) =>
          prev.ownerUserId
            ? prev
            : createCustomerForm(userResponse[0]?.id ?? currentUser?.id ?? ""),
        );
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "加载客户配置失败",
          );
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  const ownerName = useMemo(
    () =>
      users.find((user) => user.id === form.ownerUserId)?.displayName ??
      "未分配",
    [form.ownerUserId, users],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const created = await apiFetch<{ id: string }>("/customers", {
        method: "POST",
        body: JSON.stringify(toCustomerPayload(form)),
      });
      setMessage("客户档案已创建，正在跳转详情页...");
      router.replace(`/customers/${created.id}?created=1`);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "创建客户失败",
      );
    } finally {
      setLoading(false);
    }
  }

  if (bootstrapping) {
    return <section className="panel">正在加载客户录入配置...</section>;
  }

  return (
    <div className="workspace-stack">
      <WorkspacePageHeader
        actions={
          <Link className="button secondary inline" href="/customers">
            返回客户列表
          </Link>
        }
        description="新增客户独立成页，一次补齐负责人、状态、地区和合作方向。保存后会直接进入客户详情，可继续跳转去创建方案或报价。"
        eyebrow="客户录入"
        meta={[
          { label: "当前负责人", value: ownerName },
          { label: "客户状态", value: customerStatusLabelMap[form.status] },
        ]}
        title="新增客户"
      />

      <section className="editor-shell">
        <div className="editor-main">
          <section className="panel stack">
            <div className="section-heading">
              <h3>新增客户档案</h3>
              <p>
                建议至少补齐客户名称、负责人、客户状态与成交概率，这样录入后就能直接进入后续跟进。
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
                  {loading ? "创建中..." : "创建客户"}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    setForm(
                      createCustomerForm(users[0]?.id ?? currentUser?.id ?? ""),
                    )
                  }
                >
                  重置表单
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="editor-side sticky-side">
          <section className="panel stack">
            <div className="section-heading">
              <h3>录入摘要</h3>
              <p>
                保存后会进入客户详情页，并可直接跳转创建农业方案或通用报价。
              </p>
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
                <h3>后续动作</h3>
                <p>
                  合作方向和合作内容会影响后续方案与报价选择，建议尽量在录入时补齐。
                </p>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
