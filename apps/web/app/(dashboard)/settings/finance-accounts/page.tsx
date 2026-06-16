"use client";

import { FormEvent, useEffect, useState } from "react";
import { OrdersScaffold } from "../../../../components/orders/OrdersScaffold";
import { SectionCard } from "../../../../components/system/primitives";
import {
  createFinanceAccount,
  fetchFinanceAccounts,
  updateFinanceAccount,
  type FinanceAccountRecord,
  type FinanceAccountsListResponse,
} from "../../../../lib/orders";

export default function FinanceAccountsPage() {
  const [data, setData] = useState<FinanceAccountsListResponse | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [form, setForm] = useState({
    companyName: "山东洄归生态科技有限公司",
    accountName: "",
    accountNo: "",
    bankName: "",
    accountType: "BANK",
    usageScene: "",
    remark: "",
    isDefault: true,
  });

  async function loadAccounts() {
    const response = await fetchFinanceAccounts();
    setData(response);
  }

  useEffect(() => {
    loadAccounts().catch((requestError) =>
      setError(
        requestError instanceof Error ? requestError.message : "加载财务账户失败",
      ),
    );
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await createFinanceAccount({
        companyName: form.companyName,
        accountName: form.accountName || undefined,
        accountNo: form.accountNo,
        bankName: form.bankName || undefined,
        accountType: form.accountType || undefined,
        usageScene: form.usageScene || undefined,
        remark: form.remark || undefined,
        isDefault: form.isDefault,
        enabled: true,
      });

      setMessage(response.message);
      setForm((current) => ({
        ...current,
        accountName: "",
        accountNo: "",
        bankName: "",
        usageScene: "",
        remark: "",
        isDefault: false,
      }));
      await loadAccounts();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "创建财务账户失败",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(
    account: FinanceAccountRecord,
    payload: { enabled?: boolean; isDefault?: boolean },
  ) {
    setUpdatingId(account.id);
    setError("");
    setMessage("");

    try {
      const response = await updateFinanceAccount(account.id, payload);
      setMessage(response.message);
      await loadAccounts();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "更新财务账户失败",
      );
    } finally {
      setUpdatingId("");
    }
  }

  const summary = data?.summary;

  return (
    <OrdersScaffold
      actions={[
        { href: "/settings", label: "返回系统设置", tone: "secondary" },
        { href: "/orders/payments", label: "查看收款记录", tone: "secondary" },
      ]}
      aside={[
        {
          title: "当前状态",
          description: error
            ? `接口加载失败：${error}`
            : data?.source === "database"
              ? "财务账户配置已经读取真实接口。"
              : "财务账户配置当前先用 fallback 数据承接配置结构。",
          items: [
            "这里维护的是账户配置，不是具体业务流水",
            "现在已经支持新增账户、启停账户和切换默认账户",
          ],
        },
        {
          title: "当前配置字段",
          items: [
            "主体公司、开户行、收款账号、账户名称",
            "适用场景、默认账户和启用状态",
          ],
        },
      ]}
      description="财务账户配置页专门维护收款账户和主体公司，不把这些配置型数据混进订单或客户记录里。"
      eyebrow="财务配置"
      meta={[
        { label: "账户数", value: summary ? String(summary.totalAccounts) : "..." },
        { label: "启用中", value: summary ? String(summary.enabledAccounts) : "..." },
        { label: "默认账户", value: summary ? String(summary.defaultAccounts) : "..." },
      ]}
      sections={[
        {
          title: "当前账户配置",
          description: "收款登记和后续导入都会直接引用这里的账户列表。",
          items:
            data?.items.length
              ? data.items.slice(0, 6).map(
                  (item) =>
                    `${item.companyName} · ${item.accountName ?? "未命名账户"} · ${item.accountNo} · ${item.enabled ? "启用中" : "已停用"}`,
                )
              : ["当前还没有财务账户配置。"],
        },
      ]}
      title="财务账户配置"
    >
      <SectionCard
        description="先开放一条轻量配置入口，方便订单收款直接引用真实账户。"
        title="新增财务账户"
      >
        <form className="stack" onSubmit={handleCreate}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="finance-company-name">主体公司</label>
              <input
                id="finance-company-name"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    companyName: event.target.value,
                  }))
                }
                value={form.companyName}
              />
            </div>
            <div className="field">
              <label htmlFor="finance-account-name">账户名称</label>
              <input
                id="finance-account-name"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    accountName: event.target.value,
                  }))
                }
                placeholder="例如：对公主账户"
                value={form.accountName}
              />
            </div>
            <div className="field">
              <label htmlFor="finance-account-no">收款账号</label>
              <input
                id="finance-account-no"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    accountNo: event.target.value,
                  }))
                }
                placeholder="例如：6222 0000 1888 6666"
                value={form.accountNo}
              />
            </div>
            <div className="field">
              <label htmlFor="finance-bank-name">开户行</label>
              <input
                id="finance-bank-name"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    bankName: event.target.value,
                  }))
                }
                placeholder="例如：中国农业银行潍坊分行"
                value={form.bankName}
              />
            </div>
            <div className="field">
              <label htmlFor="finance-account-type">账户类型</label>
              <select
                id="finance-account-type"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    accountType: event.target.value,
                  }))
                }
                value={form.accountType}
              >
                <option value="BANK">银行账户</option>
                <option value="WECHAT">微信</option>
                <option value="ALIPAY">支付宝</option>
                <option value="OTHER">其他</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="finance-usage-scene">适用场景</label>
              <input
                id="finance-usage-scene"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    usageScene: event.target.value,
                  }))
                }
                placeholder="例如：客户货款 / 渠道结算"
                value={form.usageScene}
              />
            </div>
            <div className="field full">
              <label htmlFor="finance-remark">备注</label>
              <textarea
                id="finance-remark"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    remark: event.target.value,
                  }))
                }
                placeholder="补充账户适用说明或结算备注"
                value={form.remark}
              />
            </div>
          </div>

          <label className="checkbox-row finance-default-toggle">
            <input
              checked={form.isDefault}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isDefault: event.target.checked,
                }))
              }
              type="checkbox"
            />
            设为当前主体默认收款账户
          </label>

          <div className="action-row">
            <button disabled={loading} type="submit">
              {loading ? "保存中..." : "新增账户"}
            </button>
            {message ? <div className="success-text small">{message}</div> : null}
          </div>
        </form>
      </SectionCard>

      <SectionCard
        description="先把高频编辑动作做成轻操作，不额外打开复杂后台表单。"
        title="快速维护"
      >
        <div className="stack">
          {data?.items.length ? (
            data.items.map((item) => (
              <div
                className={`summary-card finance-account-card ${item.isDefault ? "is-default" : ""} ${item.enabled ? "" : "is-disabled"}`}
                key={item.id}
              >
                <div className="stack compact-gap">
                  <strong>
                    {item.companyName} · {item.accountName ?? item.accountNo}
                  </strong>
                  <div className="small muted">
                    {item.bankName ?? "未填写开户行"} · {item.usageScene ?? "未填写场景"}
                  </div>
                  <div className="action-row">
                    <button
                      className="button secondary inline"
                      disabled={updatingId === item.id || item.isDefault}
                      onClick={() => handleToggle(item, { isDefault: true, enabled: true })}
                      type="button"
                    >
                      {item.isDefault ? "当前默认" : "设为默认"}
                    </button>
                    <button
                      className="button secondary inline"
                      disabled={updatingId === item.id}
                      onClick={() => handleToggle(item, { enabled: !item.enabled })}
                      type="button"
                    >
                      {item.enabled ? "停用账户" : "重新启用"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="small muted">当前还没有财务账户配置。</div>
          )}
        </div>
      </SectionCard>
    </OrdersScaffold>
  );
}
