"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ProductFormFields } from "../../../../../components/products/ProductFormFields";
import { ProductSmartParser } from "../../../../../components/products/ProductSmartParser";
import {
  defaultProductForm,
  formatProductMoney,
  outputTemplateLabelMap,
  productToFormValues,
  toProductPayload,
  type IndustryGroupOption,
  type ProductFormValues,
  type ProductRecord,
} from "../../../../../components/products/types";
import {
  apiFetch,
  getCurrentUser,
  hasAnyPermission,
} from "../../../../../lib/api";

export default function ProductEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const currentUser = getCurrentUser();
  const canEdit = hasAnyPermission(currentUser, [
    "action.product.create",
    "action.product.update",
  ]);
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [form, setForm] = useState<ProductFormValues>(defaultProductForm);
  const [industries, setIndustries] = useState<IndustryGroupOption[]>([]);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [detailResponse, industryResponse] = await Promise.all([
          apiFetch<ProductRecord>(`/products/${params.id}`),
          apiFetch<IndustryGroupOption[]>("/meta/industries"),
        ]);

        if (cancelled) {
          return;
        }

        setProduct(detailResponse);
        setIndustries(industryResponse);
        setForm(productToFormValues(detailResponse));
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "加载产品详情失败",
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

  const selectedIndustryName = useMemo(
    () =>
      industries.find((industry) => industry.id === form.industryGroupId)
        ?.name ??
      product?.industryGroup?.name ??
      "未设置",
    [form.industryGroupId, industries, product?.industryGroup?.name],
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
      await apiFetch(`/products/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify(toProductPayload(form)),
      });
      setMessage("产品已更新，正在返回详情页...");
      router.replace(`/products/${params.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "更新产品失败",
      );
    } finally {
      setLoading(false);
    }
  }

  if (bootstrapping) {
    return <section className="panel">正在加载产品详情...</section>;
  }

  if (!product) {
    return <section className="panel">{error || "未找到产品信息"}</section>;
  }

  if (!canEdit) {
    return (
      <section className="panel stack">
        <h3>当前角色不可编辑产品</h3>
        <p className="muted">
          员工角色可以查看产品详情，但编辑需要高级经理或超级管理员权限。
        </p>
        <div className="action-row">
          <Link
            className="button secondary inline"
            href={`/products/${product.id}`}
          >
            返回产品详情
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="workspace-stack">
      <section className="hero-surface">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="hero-kicker">Product Maintenance</div>
            <h3 className="hero-title">{product.displayName}</h3>
            <div className="hero-description">
              编辑页重点是修正价格、模板类型和产品说明，让后续报价与对外展示保持一致，不会出现产品资料和报价口径脱节。
            </div>
          </div>
          <div className="hero-actions">
            <Link
              className="button secondary inline"
              href={`/products/${product.id}`}
            >
              返回产品详情
            </Link>
            <Link className="button ghost inline" href="/products">
              返回产品列表
            </Link>
          </div>
        </div>
      </section>

      <section className="editor-shell">
        <div className="editor-main">
          <ProductSmartParser
            form={form}
            industries={industries}
            onApplyParsedData={(patch) =>
              setForm((prev) => ({ ...prev, ...patch }))
            }
          />

          <section className="panel stack">
            <div className="section-heading">
              <h3>编辑产品</h3>
              <p>
                如要更新标签文字或图片，可先在上方解析区比对，再决定是否覆盖当前内容。
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
                  {loading ? "保存中..." : "保存更新"}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setForm(productToFormValues(product))}
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
              <p>正式保存前，建议再确认一遍价格、行业和模板类型。</p>
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
          </section>
        </aside>
      </section>
    </div>
  );
}
