"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  type ProductParseQueueDetail,
} from "../../../../components/products/types";
import {
  apiFetch,
  getCurrentUser,
  hasAnyPermission,
} from "../../../../lib/api";

export default function ProductNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parseLogId = searchParams.get("parseLogId")?.trim() || "";
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
  const [importedQueueItem, setImportedQueueItem] =
    useState<ProductParseQueueDetail | null>(null);

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
          <>
            <Link className="button ghost inline" href="/products/ai-import">
              待确认队列
            </Link>
            <Link className="button secondary inline" href="#smart-parser">
              定位解析辅助
            </Link>
            <Link className="button ghost inline" href="/products-new-preview">
              公开预览
            </Link>
            <Link className="button ghost inline" href="/products">
              返回产品列表
            </Link>
          </>
        }
        description="新建页保留完整产品表单和 AI 解析辅助入口，适合先吸收标签与文案，再把规格、售价和模板信息一次沉淀进产品库。"
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
              importedQueueItem={importedQueueItem}
              industries={industries}
              onApplyParsedData={(patch) =>
                setForm((prev) => ({ ...prev, ...patch }))
              }
            />
          </div>

          <section className="panel stack">
            <div className="section-heading">
              <h3>正式产品表单</h3>
              <p>
                这一版把录入表单改成了分区式卡片，先沉淀基础识别、再确定报价模板，最后补齐文案和展示资料。
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
                <Link className="button ghost inline" href="#smart-parser">
                  回到解析辅助
                </Link>
              </div>
            </form>
          </section>
        </div>

        <aside className="editor-side sticky-side">
          <section className="panel stack">
            <div className="section-heading">
              <h3>录入摘要</h3>
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
                <h3>解析辅助提醒</h3>
                <p>
                  解析器只负责先提建议值，正式写入前仍建议你检查标签语气、规格单位和模板类型。
                </p>
              </div>
              <div className="summary-list">
                <div className="summary-row">
                  <span>混合输入</span>
                  <strong>文字 + 图片</strong>
                </div>
                <div className="summary-row">
                  <span>冲突处理</span>
                  <strong>先选候选值再写入</strong>
                </div>
                <div className="summary-row">
                  <span>覆盖策略</span>
                  <strong>已有值默认保留</strong>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
