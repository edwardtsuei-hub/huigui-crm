"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { WorkspacePageHeader } from "../../../../../components/dashboard/WorkspacePageHeader";
import { ProductFormFields } from "../../../../../components/products/ProductFormFields";
import { ProductSmartParser } from "../../../../../components/products/ProductSmartParser";
import {
  defaultProductForm,
  formatProductMoney,
  outputTemplateLabelMap,
  productStatusOptions,
  productToFormValues,
  toProductPayload,
  type IndustryGroupOption,
  type ProductFormValues,
  type ProductParseQueueDetail,
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
  const searchParams = useSearchParams();
  const parseLogId = searchParams.get("parseLogId")?.trim() || "";
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
  const [importedQueueItem, setImportedQueueItem] =
    useState<ProductParseQueueDetail | null>(null);

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

  useEffect(() => {
    if (!parseLogId || !canEdit) {
      setImportedQueueItem(null);
      return;
    }

    let cancelled = false;

    async function loadQueueItem() {
      try {
        const response = await apiFetch<ProductParseQueueDetail>(
          `/products/parse-queue/${parseLogId}`,
        );

        if (!cancelled) {
          setImportedQueueItem(response);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "加载解析记录失败",
          );
        }
      }
    }

    void loadQueueItem();

    return () => {
      cancelled = true;
    };
  }, [canEdit, parseLogId]);

  const selectedIndustryName = useMemo(
    () =>
      industries.find((industry) => industry.id === form.industryGroupId)
        ?.name ??
      product?.industryGroup?.name ??
      "未设置",
    [form.industryGroupId, industries, product?.industryGroup?.name],
  );
  const statusLabel = useMemo(
    () => productStatusOptions.find((option) => option.value === form.status)?.label ?? "未设置",
    [form.status],
  );
  const filledCount = useMemo(
    () => Object.values(form).filter((value) => String(value ?? "").trim()).length,
    [form],
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
      <WorkspacePageHeader
        actions={
          <>
            <Link className="button ghost inline" href="/products/ai-import">
              待确认队列
            </Link>
            <Link className="button secondary inline" href="#smart-parser">
              定位解析辅助
            </Link>
            <Link className="button ghost inline" href="/products-edit-preview">
              公开预览
            </Link>
            <Link
              className="button ghost inline"
              href={`/products/${product.id}`}
            >
              返回产品详情
            </Link>
            <Link className="button ghost inline" href="/products">
              返回产品列表
            </Link>
          </>
        }
        description="编辑页重点是修正价格、模板类型、文案与图片资料，让历史产品也能回到统一的报价口径和展示标准。"
        eyebrow="产品维护"
        meta={[
          { label: "所属行业", value: selectedIndustryName },
          { label: "建议售价", value: formatProductMoney(form.salePrice) },
          {
            label: "输出模板",
            value:
              outputTemplateLabelMap[form.outputTemplateType] ??
              form.outputTemplateType,
          },
          { label: "当前状态", value: statusLabel },
          { label: "已填字段", value: `${filledCount}/17` },
        ]}
        title={`编辑 ${product.displayName}`}
      />

      <section className="editor-shell">
        <div className="editor-main">
          <div id="smart-parser">
            <ProductSmartParser
              form={form}
              importedQueueItem={importedQueueItem}
              industries={industries}
              onApplyParsedData={(patch) =>
                setForm((prev) => ({ ...prev, ...patch }))
              }
            />
          </div>

          <section className="panel stack">
            <div className="section-heading">
              <h3>正式编辑表单</h3>
              <p>
                先用上方解析区吸收新标签或新图片，再在这里确认价格、模板和最终展示文案。
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
                <Link className="button ghost inline" href="#smart-parser">
                  回到解析辅助
                </Link>
              </div>
            </form>
          </section>
        </div>

        <aside className="editor-side sticky-side">
          <section className="summary-card stack summary-card--shell">
            <div className="section-heading">
              <h3>当前快照</h3>
              <p>正式保存前，先确认这次改动有没有把行业、售价和模板带偏。</p>
            </div>

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
              <div className="summary-row">
                <span>当前状态</span>
                <strong>{statusLabel}</strong>
              </div>
              <div className="summary-row">
                <span>已填字段</span>
                <strong>{filledCount}/17</strong>
              </div>
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>编辑提醒</h3>
              <p>这页适合修正老产品信息，不建议一次性大改所有字段。</p>
            </div>

            <div className="summary-list">
              <div className="summary-row">
                <span>推荐顺序</span>
                <strong>先解析，再确认，再保存</strong>
              </div>
              <div className="summary-row">
                <span>高风险字段</span>
                <strong>售价 / 模板 / 标签文案</strong>
              </div>
              <div className="summary-row">
                <span>恢复方式</span>
                <strong>可随时恢复原值</strong>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
