"use client";

import { useEffect, useMemo, useState } from "react";
import { WorkspacePageHeader } from "../../../../components/dashboard/WorkspacePageHeader";
import { apiFetch } from "../../../../lib/api";

type ApprovalRulesResponse = {
  rules: Array<{
    id: string;
    code: "DISCOUNT" | "LOW_PRICE" | "EXPORT_QUOTATION" | "CUSTOMER_TRANSFER";
    name: string;
    description?: string | null;
    enabled: boolean;
    configJson: Record<string, unknown>;
    updatedAt: string;
    updatedBy?: { name: string; roleName: string } | null;
  }>;
  flowPreview: Array<{
    code: string;
    title: string;
    description: string;
  }>;
};

export default function ManagementApprovalsPage() {
  const [data, setData] = useState<ApprovalRulesResponse | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { enabled: boolean; configJson: Record<string, unknown> }>>({});
  const [error, setError] = useState("");

  async function loadRules() {
    try {
      const response = await apiFetch<ApprovalRulesResponse>("/management/approval-rules");
      setData(response);
      setDrafts(
        Object.fromEntries(
          response.rules.map((rule) => [
            rule.id,
            {
              enabled: rule.enabled,
              configJson: rule.configJson
            }
          ])
        )
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "审批规则加载失败");
    }
  }

  useEffect(() => {
    void loadRules();
  }, []);

  const discountRule = useMemo(
    () => data?.rules.find((rule) => rule.code === "DISCOUNT"),
    [data]
  );
  const lowPriceRule = useMemo(
    () => data?.rules.find((rule) => rule.code === "LOW_PRICE"),
    [data]
  );
  const exportRule = useMemo(
    () => data?.rules.find((rule) => rule.code === "EXPORT_QUOTATION"),
    [data]
  );
  const transferRule = useMemo(
    () => data?.rules.find((rule) => rule.code === "CUSTOMER_TRANSFER"),
    [data]
  );

  async function saveRule(ruleId: string) {
    try {
      await apiFetch(`/management/approval-rules/${ruleId}`, {
        method: "PATCH",
        body: JSON.stringify(drafts[ruleId])
      });
      await loadRules();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "审批规则保存失败");
    }
  }

  function setRuleValue(ruleId: string, key: string, value: unknown) {
    setDrafts((current) => ({
      ...current,
      [ruleId]: {
        ...current[ruleId],
        configJson: {
          ...current[ruleId]?.configJson,
          [key]: value
        }
      }
    }));
  }

  function setRuleEnabled(ruleId: string, value: boolean) {
    setDrafts((current) => ({
      ...current,
      [ruleId]: {
        ...current[ruleId],
        enabled: value
      }
    }));
  }

  return (
    <div className="workspace-stack">
      <WorkspacePageHeader
        title="审批规则"
        eyebrow="Approval Rules"
        description="控制折扣、低价、正式报价导出和客户转移的审批门槛，让系统从录入工具升级成正式业务系统。"
        actions={
          <>
            <button className="button secondary inline" onClick={() => void loadRules()} type="button">
              恢复默认视图
            </button>
            <button className="button inline" onClick={() => {
              if (discountRule) {
                void saveRule(discountRule.id);
              }
            }} type="button">
              保存规则
            </button>
          </>
        }
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      <section className="approval-card-grid">
        {discountRule ? (
          <article className="panel stack">
            <div className="summary-row">
              <div className="stack compact-gap">
                <h3>折扣审批</h3>
                <div className="small muted">{discountRule.description}</div>
              </div>
              <label className="toggle-row">
                <span>启用</span>
                <input
                  checked={drafts[discountRule.id]?.enabled ?? discountRule.enabled}
                  onChange={(event) => setRuleEnabled(discountRule.id, event.target.checked)}
                  type="checkbox"
                />
              </label>
            </div>

            <div className="approval-steps">
              <div className="approval-step">
                <strong>自动通过区间</strong>
                <input
                  onChange={(event) => setRuleValue(discountRule.id, "autoApproveMax", Number(event.target.value))}
                  type="number"
                  value={String(drafts[discountRule.id]?.configJson.autoApproveMax ?? 5)}
                />
                <span>%</span>
              </div>
              <div className="approval-step">
                <strong>一级审批上限</strong>
                <input
                  onChange={(event) => setRuleValue(discountRule.id, "managerApproveMax", Number(event.target.value))}
                  type="number"
                  value={String(drafts[discountRule.id]?.configJson.managerApproveMax ?? 15)}
                />
                <span>%</span>
              </div>
              <div className="approval-step accent">
                <strong>默认路径</strong>
                <span>0-5% 自动通过 · 5-15% 主管审批 · 15% 以上管理员审批</span>
              </div>
            </div>

            <button className="button inline" onClick={() => void saveRule(discountRule.id)} type="button">
              保存折扣规则
            </button>
          </article>
        ) : null}

        {lowPriceRule ? (
          <article className="panel stack">
            <div className="summary-row">
              <div className="stack compact-gap">
                <h3>低价保护</h3>
                <div className="small muted">{lowPriceRule.description}</div>
              </div>
              <label className="toggle-row">
                <span>启用</span>
                <input
                  checked={drafts[lowPriceRule.id]?.enabled ?? lowPriceRule.enabled}
                  onChange={(event) => setRuleEnabled(lowPriceRule.id, event.target.checked)}
                  type="checkbox"
                />
              </label>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="low-price-mode">判断方式</label>
                <input
                  id="low-price-mode"
                  onChange={(event) => setRuleValue(lowPriceRule.id, "mode", event.target.value)}
                  value={String(drafts[lowPriceRule.id]?.configJson.mode ?? "below_suggested_price_ratio")}
                />
              </div>
              <div className="field">
                <label htmlFor="low-price-ratio">低于建议售价比例</label>
                <input
                  id="low-price-ratio"
                  onChange={(event) => setRuleValue(lowPriceRule.id, "belowSuggestedPriceRatio", Number(event.target.value))}
                  type="number"
                  value={String(drafts[lowPriceRule.id]?.configJson.belowSuggestedPriceRatio ?? 10)}
                />
              </div>
            </div>

            <button className="button inline" onClick={() => void saveRule(lowPriceRule.id)} type="button">
              保存低价规则
            </button>
          </article>
        ) : null}

        {exportRule ? (
          <article className="panel stack">
            <div className="summary-row">
              <div className="stack compact-gap">
                <h3>正式报价导出审批</h3>
                <div className="small muted">{exportRule.description}</div>
              </div>
              <label className="toggle-row">
                <span>启用</span>
                <input
                  checked={drafts[exportRule.id]?.enabled ?? exportRule.enabled}
                  onChange={(event) => setRuleEnabled(exportRule.id, event.target.checked)}
                  type="checkbox"
                />
              </label>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="export-scope">适用范围</label>
                <input
                  id="export-scope"
                  onChange={(event) => setRuleValue(exportRule.id, "scope", event.target.value)}
                  value={String(drafts[exportRule.id]?.configJson.scope ?? "discount_sensitive_only")}
                />
              </div>
              <div className="field">
                <label htmlFor="export-role">审批角色</label>
                <input
                  id="export-role"
                  onChange={(event) => setRuleValue(exportRule.id, "approverRoleCode", event.target.value)}
                  value={String(drafts[exportRule.id]?.configJson.approverRoleCode ?? "SALES_MANAGER")}
                />
              </div>
            </div>

            <button className="button inline" onClick={() => void saveRule(exportRule.id)} type="button">
              保存导出规则
            </button>
          </article>
        ) : null}

        {transferRule ? (
          <article className="panel stack">
            <div className="summary-row">
              <div className="stack compact-gap">
                <h3>客户转移审批</h3>
                <div className="small muted">{transferRule.description}</div>
              </div>
              <label className="toggle-row">
                <span>启用</span>
                <input
                  checked={drafts[transferRule.id]?.enabled ?? transferRule.enabled}
                  onChange={(event) => setRuleEnabled(transferRule.id, event.target.checked)}
                  type="checkbox"
                />
              </label>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="transfer-manager">需要主管确认</label>
                <select
                  id="transfer-manager"
                  onChange={(event) => setRuleValue(transferRule.id, "requiresManagerApproval", event.target.value === "true")}
                  value={String(drafts[transferRule.id]?.configJson.requiresManagerApproval ?? true)}
                >
                  <option value="true">是</option>
                  <option value="false">否</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="transfer-notify">转移后发送通知</label>
                <select
                  id="transfer-notify"
                  onChange={(event) => setRuleValue(transferRule.id, "notifyAfterTransfer", event.target.value === "true")}
                  value={String(drafts[transferRule.id]?.configJson.notifyAfterTransfer ?? true)}
                >
                  <option value="true">是</option>
                  <option value="false">否</option>
                </select>
              </div>
            </div>

            <button className="button inline" onClick={() => void saveRule(transferRule.id)} type="button">
              保存转移规则
            </button>
          </article>
        ) : null}
      </section>

      <section className="panel stack">
        <div className="section-heading">
          <h3>审批流预览</h3>
          <p>用流程化语言把规则解释清楚，让销售、主管和管理员都能一眼看懂审批路径。</p>
        </div>

        <div className="flow-preview">
          <div className="flow-preview__node">销售提交报价</div>
          <div className="flow-preview__arrow">→</div>
          <div className="flow-preview__node">系统判断折扣与导出条件</div>
          <div className="flow-preview__arrow">→</div>
          <div className="flow-preview__node">主管 / 管理员审批</div>
          <div className="flow-preview__arrow">→</div>
          <div className="flow-preview__node">审批通过后允许导出</div>
        </div>
      </section>
    </div>
  );
}
