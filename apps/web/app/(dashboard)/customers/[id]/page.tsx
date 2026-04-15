"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "../../../../lib/api";

type CustomerDetail = {
  id: string;
  name: string;
  companyName?: string | null;
  contactName?: string | null;
  mobile?: string | null;
  wechat?: string | null;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  status: string;
  cooperationDirection?: string | null;
  cooperationContent?: string | null;
  remark?: string | null;
  owner: { displayName: string; role: { name: string } };
  industryGroup?: { name: string } | null;
  industrySubgroup?: { name: string } | null;
  followups: Array<{
    id: string;
    content: string;
    createdAt: string;
    nextFollowupAt?: string | null;
    creator: { displayName: string };
  }>;
  quotations: Array<{
    id: string;
    quotationNo: string;
    type: "AGRICULTURE" | "GENERAL";
    totalAmount: string;
    createdAt: string;
  }>;
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [content, setContent] = useState("");
  const [nextFollowupAt, setNextFollowupAt] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadDetail() {
    const response = await apiFetch<CustomerDetail>(`/customers/${params.id}`);
    setCustomer(response);
  }

  useEffect(() => {
    loadDetail().catch((requestError) =>
      setError(requestError instanceof Error ? requestError.message : "加载客户详情失败")
    );
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
          content,
          nextContactAt: nextFollowupAt || undefined
        })
      });
      setContent("");
      setNextFollowupAt("");
      setMessage("跟进记录已新增");
      await loadDetail();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "新增跟进失败");
    }
  }

  if (!customer) {
    return <section className="panel">{error || "正在加载客户详情..."}</section>;
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="toolbar">
          <div>
            <h3>{customer.name}</h3>
            <div className="muted">
              {customer.companyName || "未填企业名称"} · {customer.industryGroup?.name || "未设置行业"} /{" "}
              {customer.industrySubgroup?.name || "未设置细分"}
            </div>
          </div>
          <div className="toolbar">
            <Link className="button secondary inline" href="/customers">
              返回列表
            </Link>
            <Link className="button inline" href={`/quotes/general?customerId=${customer.id}`}>
              发起通用报价
            </Link>
          </div>
        </div>
      </section>

      <section className="layout-grid">
        <div className="stack">
          <div className="panel">
            <h3>客户信息</h3>
            <div className="grid-2">
              <div className="quote-card">
                <strong>联系人</strong>
                <div className="muted small">{customer.contactName || "--"}</div>
              </div>
              <div className="quote-card">
                <strong>手机 / 微信</strong>
                <div className="muted small">
                  {customer.mobile || "--"} / {customer.wechat || "--"}
                </div>
              </div>
              <div className="quote-card">
                <strong>地区</strong>
                <div className="muted small">
                  {[customer.province, customer.city, customer.district].filter(Boolean).join(" / ") || "--"}
                </div>
              </div>
              <div className="quote-card">
                <strong>负责人</strong>
                <div className="muted small">
                  {customer.owner.displayName} · {customer.owner.role.name}
                </div>
              </div>
            </div>
            <div className="quote-card" style={{ marginTop: 16 }}>
              <strong>合作方向 / 合作内容</strong>
              <div className="small muted">{customer.cooperationDirection || "未填写方向"}</div>
              <div style={{ marginTop: 8 }}>{customer.cooperationContent || "未填写合作内容"}</div>
            </div>
            {customer.remark ? (
              <div className="quote-card" style={{ marginTop: 16 }}>
                <strong>备注</strong>
                <div style={{ marginTop: 8 }}>{customer.remark}</div>
              </div>
            ) : null}
          </div>

          <div className="panel">
            <h3>关联报价记录</h3>
            <div className="stack">
              {customer.quotations.length ? (
                customer.quotations.map((quotation) => (
                  <Link className="quote-card" href={`/quotations/${quotation.id}`} key={quotation.id}>
                    <strong>{quotation.quotationNo}</strong>
                    <div className="small muted">
                      {quotation.type === "AGRICULTURE" ? "农业方案" : "通用报价"} · ¥{quotation.totalAmount}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="empty">该客户还没有关联报价，适合从农业方案页或通用报价页发起。</div>
              )}
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <h3>新增跟进记录</h3>
            <form className="stack" onSubmit={addFollowup}>
              <div className="field">
                <label>跟进内容</label>
                <textarea value={content} onChange={(event) => setContent(event.target.value)} required />
              </div>
              <div className="field">
                <label>下次联系时间</label>
                <input
                  type="datetime-local"
                  value={nextFollowupAt}
                  onChange={(event) => setNextFollowupAt(event.target.value)}
                />
              </div>
              {message ? <div className="small">{message}</div> : null}
              {error ? <div className="small danger-text">{error}</div> : null}
              <button type="submit">保存跟进</button>
            </form>
          </div>

          <div className="panel">
            <h3>历史沟通记录</h3>
            <div className="stack">
              {customer.followups.length ? (
                customer.followups.map((followup) => (
                  <div className="followup-card" key={followup.id}>
                    <div className="small muted">
                      {followup.creator.displayName} · {new Date(followup.createdAt).toLocaleString("zh-CN")}
                    </div>
                    <div style={{ marginTop: 8 }}>{followup.content}</div>
                    {followup.nextFollowupAt ? (
                      <div className="small muted" style={{ marginTop: 8 }}>
                        下次联系：{new Date(followup.nextFollowupAt).toLocaleString("zh-CN")}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="empty">暂时还没有跟进记录。</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
