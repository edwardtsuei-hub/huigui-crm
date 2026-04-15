"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch, getCurrentUser } from "../../../lib/api";

type IndustryGroup = {
  id: string;
  name: string;
  subgroups: Array<{ id: string; name: string }>;
};

type UserOption = {
  id: string;
  displayName: string;
  roleName: string;
};

type CustomerListResponse = {
  items: CustomerRecord[];
  total: number;
  page: number;
  pageSize: number;
};

type CustomerRecord = {
  id: string;
  name: string;
  companyName?: string | null;
  contactName?: string | null;
  mobile?: string | null;
  province?: string | null;
  city?: string | null;
  wechat?: string | null;
  status: string;
  estimatedAmount?: string | null;
  successProbability?: number | null;
  owner: { id: string; displayName: string };
  industryGroup?: { id: string; name: string } | null;
  industrySubgroup?: { id: string; name: string } | null;
  _count: { followups: number; quotations: number };
};

const defaultForm = {
  id: "",
  customerName: "",
  companyName: "",
  contactName: "",
  mobile: "",
  wechatId: "",
  province: "",
  city: "",
  district: "",
  industryGroupId: "",
  industrySubgroupId: "",
  status: "UNCONTACTED",
  ownerUserId: "",
  cooperationDirection: "",
  cooperationContent: "",
  estimatedAmount: "",
  dealProbability: "50",
  remark: ""
};

export default function CustomersPage() {
  const currentUser = getCurrentUser();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [industries, setIndustries] = useState<IndustryGroup[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [filters, setFilters] = useState({ search: "", status: "", industryGroupId: "" });
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedIndustry = useMemo(
    () => industries.find((item) => item.id === form.industryGroupId),
    [industries, form.industryGroupId]
  );

  async function loadData() {
    const searchParams = new URLSearchParams();
    if (filters.search) searchParams.set("keyword", filters.search);
    if (filters.status) searchParams.set("status", filters.status);
    if (filters.industryGroupId) searchParams.set("industryGroupId", filters.industryGroupId);

    const [customerResponse, industryResponse, userResponse] = await Promise.all([
      apiFetch<CustomerListResponse>(`/customers?${searchParams.toString()}`),
      apiFetch<IndustryGroup[]>("/meta/industries"),
      apiFetch<UserOption[]>("/meta/users")
    ]);

    setCustomers(customerResponse.items);
    setIndustries(industryResponse);
    setUsers(userResponse);

    if (!form.ownerUserId && userResponse[0]) {
      setForm((prev) => ({ ...prev, ownerUserId: userResponse[0].id }));
    }
  }

  useEffect(() => {
    loadData().catch((requestError) =>
      setError(requestError instanceof Error ? requestError.message : "加载客户失败")
    );
  }, [filters.search, filters.status, filters.industryGroupId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        ...form,
        estimatedAmount: form.estimatedAmount ? Number(form.estimatedAmount) : undefined,
        dealProbability: form.dealProbability ? Number(form.dealProbability) : undefined
      };

      if (form.id) {
        await apiFetch(`/customers/${form.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        setMessage("客户已更新");
      } else {
        await apiFetch("/customers", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setMessage("客户已创建");
      }

      setForm({
        ...defaultForm,
        ownerUserId: users[0]?.id ?? ""
      });
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="layout-grid">
      <section className="panel stack">
        <div className="toolbar">
          <input
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            placeholder="搜索客户名称 / 联系人 / 手机"
          />
          <select
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
          >
            <option value="">全部状态</option>
            <option value="UNCONTACTED">未联系</option>
            <option value="CONTACTED">已联系</option>
            <option value="MET">已拜访</option>
            <option value="COOPERATING">合作中</option>
            <option value="PAUSED">暂停跟进</option>
          </select>
          <select
            value={filters.industryGroupId}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, industryGroupId: event.target.value }))
            }
          >
            <option value="">全部行业</option>
            {industries.map((industry) => (
              <option key={industry.id} value={industry.id}>
                {industry.name}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>客户名称</th>
                <th>联系人</th>
                <th>行业</th>
                <th>状态</th>
                <th>负责人</th>
                <th>跟进 / 报价</th>
                <th>预估金额</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {customers.length ? (
                customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <strong>{customer.name}</strong>
                      <div className="small muted">{customer.companyName || "未填企业名称"}</div>
                    </td>
                    <td>
                      {customer.contactName || "--"}
                      <div className="small muted">{customer.mobile || "未填手机号"}</div>
                    </td>
                    <td>{customer.industryGroup?.name || "--"}</td>
                    <td>{customer.status}</td>
                    <td>{customer.owner.displayName}</td>
                    <td>
                      {customer._count.followups} / {customer._count.quotations}
                    </td>
                    <td>{customer.estimatedAmount ? `¥${customer.estimatedAmount}` : "--"}</td>
                    <td>
                      <div className="toolbar">
                        <button
                          className="button secondary inline"
                          onClick={() =>
                            setForm({
                              id: customer.id,
                              customerName: customer.name,
                              companyName: customer.companyName ?? "",
                              contactName: customer.contactName ?? "",
                              mobile: customer.mobile ?? "",
                              wechatId: customer.wechat ?? "",
                              province: customer.province ?? "",
                              city: customer.city ?? "",
                              district: "",
                              industryGroupId: customer.industryGroup?.id ?? "",
                              industrySubgroupId: customer.industrySubgroup?.id ?? "",
                              status: customer.status,
                              ownerUserId: customer.owner.id,
                              cooperationDirection: "",
                              cooperationContent: "",
                              estimatedAmount: customer.estimatedAmount ?? "",
                              dealProbability: customer.successProbability
                                ? String(customer.successProbability)
                                : "",
                              remark: ""
                            })
                          }
                        >
                          编辑
                        </button>
                        <Link className="button inline" href={`/customers/${customer.id}`}>
                          详情
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <div className="empty">暂无客户数据，先在右侧创建第一位客户。</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3>{form.id ? "编辑客户" : "新增客户"}</h3>
        <p className="muted">所有报价都会回溯到客户，因此客户信息尽量在首次录入时补齐。</p>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field">
            <label>客户名称</label>
            <input
              value={form.customerName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, customerName: event.target.value }))
              }
              required
            />
          </div>
          <div className="field">
            <label>企业名称</label>
            <input
              value={form.companyName}
              onChange={(event) => setForm((prev) => ({ ...prev, companyName: event.target.value }))}
            />
          </div>
          <div className="field">
            <label>联系人</label>
            <input
              value={form.contactName}
              onChange={(event) => setForm((prev) => ({ ...prev, contactName: event.target.value }))}
            />
          </div>
          <div className="field">
            <label>手机</label>
            <input value={form.mobile} onChange={(event) => setForm((prev) => ({ ...prev, mobile: event.target.value }))} />
          </div>
          <div className="field">
            <label>微信号</label>
            <input
              value={form.wechatId}
              onChange={(event) => setForm((prev) => ({ ...prev, wechatId: event.target.value }))}
            />
          </div>
          <div className="field">
            <label>客户状态</label>
            <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
              <option value="UNCONTACTED">未联系</option>
              <option value="CONTACTED">已联系</option>
              <option value="MET">已拜访</option>
              <option value="COOPERATING">合作中</option>
              <option value="PAUSED">暂停跟进</option>
            </select>
          </div>
          <div className="field">
            <label>省份</label>
            <input value={form.province} onChange={(event) => setForm((prev) => ({ ...prev, province: event.target.value }))} />
          </div>
          <div className="field">
            <label>城市</label>
            <input value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} />
          </div>
          <div className="field">
            <label>区域</label>
            <input value={form.district} onChange={(event) => setForm((prev) => ({ ...prev, district: event.target.value }))} />
          </div>
          <div className="field">
            <label>负责人</label>
            <select
              value={form.ownerUserId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, ownerUserId: event.target.value }))
              }
              disabled={currentUser?.roleCode === "STAFF"}
            >
              <option value="">请选择负责人</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName} · {user.roleName}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>行业大类</label>
            <select
              value={form.industryGroupId}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  industryGroupId: event.target.value,
                  industrySubgroupId: ""
                }))
              }
            >
              <option value="">请选择行业</option>
              {industries.map((industry) => (
                <option key={industry.id} value={industry.id}>
                  {industry.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>细分行业</label>
            <select
              value={form.industrySubgroupId}
              onChange={(event) => setForm((prev) => ({ ...prev, industrySubgroupId: event.target.value }))}
            >
              <option value="">请选择细分行业</option>
              {selectedIndustry?.subgroups.map((subgroup) => (
                <option key={subgroup.id} value={subgroup.id}>
                  {subgroup.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>合作方向</label>
            <input
              value={form.cooperationDirection}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, cooperationDirection: event.target.value }))
              }
            />
          </div>
          <div className="field">
            <label>预估金额</label>
            <input
              type="number"
              value={form.estimatedAmount}
              onChange={(event) => setForm((prev) => ({ ...prev, estimatedAmount: event.target.value }))}
            />
          </div>
          <div className="field">
            <label>成交概率（%）</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.dealProbability}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, dealProbability: event.target.value }))
              }
            />
          </div>
          <div className="field full">
            <label>合作内容</label>
            <textarea
              value={form.cooperationContent}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, cooperationContent: event.target.value }))
              }
            />
          </div>
          <div className="field full">
            <label>备注</label>
            <textarea value={form.remark} onChange={(event) => setForm((prev) => ({ ...prev, remark: event.target.value }))} />
          </div>
          {message ? <div className="small">{message}</div> : null}
          {error ? <div className="small danger-text">{error}</div> : null}
          <div className="toolbar">
            <button type="submit" disabled={loading}>
              {loading ? "保存中..." : form.id ? "更新客户" : "创建客户"}
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => setForm({ ...defaultForm, ownerUserId: users[0]?.id ?? "" })}
            >
              清空表单
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
