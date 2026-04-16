"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { WorkspacePageHeader } from "../../../../components/dashboard/WorkspacePageHeader";
import { ProductFormFields } from "../../../../components/products/ProductFormFields";
import { ProductSmartParser } from "../../../../components/products/ProductSmartParser";
import {
  defaultProductForm,
  formatProductMoney,
  outputTemplateLabelMap,
  toProductPayload,
  type IndustryGroupOption,
  type ProductFormValues,
} from "../../../../components/products/types";
import {
  apiFetch,
  getCurrentUser,
  hasAnyPermission,
} from "../../../../lib/api";

export default function ProductNewPage() {
  const router = useRouter();
  const currentUser = getCurrentUser();
  const canEdit = hasAnyPermission(currentUser, [
    "action.product.create",
    "action.product.update",
  ]);
  const [form, setForm] = useState<ProductFormValues>(defaultProductForm);
  const [industries, setIndustries] = useState<IndustryGroupOption[]>([]);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        const response =
          await apiFetch<IndustryGroupOption[]>("/meta/industries");
        if (!cancelled) {
          setIndustries(response);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "加载行业配置失败",
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
  }, []);

  const selectedIndustryName = useMemo(
    () =>
      industries.find((industry) => industry.id === form.industryGroupId)
        ?.name ?? "未设置",
    [form.industryGroupId, industries],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canEdit) {
      setError("员工角色当前仅可查看产品，管理角色可维护产品库。");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const created = await apiFetch<{ id: string }>("/products", {
        method: "POST",
        body: JSON.stringify(toProductPayload(form)),
      });
      setMessage("产品已创建，正在跳转详情页...");
      router.replace(`/products/${created.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "创建产品失败",
      );
    } finally {
      setLoading(false);
    }
  }

  if (bootstrapping) {
    return <section className="panel">正在加载产品配置...</section>;
  }

  if (!canEdit) {
    return (
      <section className="panel stack">
        <h3>当前角色不可新增产品</h3>
        <p className="muted">
          员工角色可以浏览产品库，但新增和修改需要高级经理或超级管理员权限。
        </p>
        <div className="action-row">
          <Link className="button secondary inline" href="/products">
            返回产品列表
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="workspace-stack">
      <WorkspacePageHeader
        actions={
          <Link className="button secondary inline" href="/products">
            返回产品列表
          </Link>
        }
        description="新建页保留完整产品表单和 AI 解析辅助入口，适合把标签、卖点、规格和模板信息一次沉淀进产品库。"
        eyebrow="产品录入"
        meta={[
          { label: "所属行业", value: selectedIndustryName },
          {
            label: "输出模板",
            value:
              outputTemplateLabelMap[form.outputTemplateType] ??
              form.outputTemplateType,
          },
        ]}
        title="新增产品"
      />

      <section className="editor-shell">
        <div className="editor-main">
          <div id="smart-parser">
            <ProductSmartParser
              form={form}
              industries={industries}
              onApplyParsedData={(patch) =>
                setForm((prev) => ({ ...prev, ...patch }))
              }
            />
          </div>

          <section className="panel stack">
            <div className="section-heading">
              <h3>新增产品</h3>
              <p>
                先用解析器吸收标签和文案，再补成本、售价与输出模板，后续报价页就能直接复用。
              </p>
            </div>

            <form className="stack" onSubmit={handleSubmit}>
              <ProductFormFields
                form={form}
                industries={industries}
                onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
              />

              {message ? <div className="small">{message}</div> : null}
              {error ? <div className="small danger-text">{error}</div> : null}

              <div className="action-row">
                <button type="submit" disabled={loading}>
                  {loading ? "创建中..." : "创建产品"}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setForm(defaultProductForm)}
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
              <h3>产品摘要</h3>
              <p>行业、售价与模板类型决定了这个产品在后续报价中的呈现方式。</p>
            </div>

            <div className="summary-card">
              <div className="summary-list">
                <div className="summary-row">
                  <span>所属行业</span>
                  <strong>{selectedIndustryName}</strong>
                </div>
                <div className="summary-row">
                  <span>建议售价</span>
                  <strong>{formatProductMoney(form.salePrice)}</strong>
                </div>
                <div className="summary-row">
                  <span>输出模板</span>
                  <strong>
                    {outputTemplateLabelMap[form.outputTemplateType] ??
                      form.outputTemplateType}
                  </strong>
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="section-heading">
                <h3>录入提醒</h3>
                <p>
                  标签文字会被用于后续生成标签说明，建议在正式入库前再确认一次对外展示语气。
                </p>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
