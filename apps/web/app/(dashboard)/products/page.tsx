"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ActionMenu,
  DataTable,
  EmptyState,
  FilterBar,
  SectionCard,
  StatusBadge,
  SummaryCard,
} from "../../../components/system/primitives";
import { WorkspacePageHeader } from "../../../components/dashboard/WorkspacePageHeader";
import {
  formatProductMoney,
  outputTemplateLabelMap,
  type IndustryGroupOption,
  type ProductRecord,
} from "../../../components/products/types";
import { apiFetch, getCurrentUser, hasAnyPermission } from "../../../lib/api";

function productStatusTone(product: ProductRecord) {
  if (product.status === "PENDING") {
    return "warning";
  }

  return product.enabled ? "success" : "neutral";
}

function productStatusLabel(product: ProductRecord) {
  if (product.status === "PENDING") {
    return "待完善";
  }

  return product.enabled ? "启用" : "停用";
}

export default function ProductsPage() {
  const currentUser = getCurrentUser();
  const canEdit = hasAnyPermission(currentUser, [
    "action.product.create",
    "action.product.update",
  ]);
  const [industries, setIndustries] = useState<IndustryGroupOption[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    industryGroupId: "",
    enabled: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const searchParams = new URLSearchParams();
        if (filters.search) searchParams.set("keyword", filters.search);
        if (filters.industryGroupId) {
          searchParams.set("industryGroupId", filters.industryGroupId);
        }
        if (filters.enabled) searchParams.set("status", filters.enabled);

        const [productResponse, industryResponse] = await Promise.all([
          apiFetch<ProductRecord[]>(`/products?${searchParams.toString()}`),
          apiFetch<IndustryGroupOption[]>("/meta/industries"),
        ]);

        if (cancelled) {
          return;
        }

        setProducts(productResponse);
        setIndustries(industryResponse);
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "加载产品失败",
          );
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [filters.enabled, filters.industryGroupId, filters.search]);

  const stats = useMemo(
    () => [
      { label: "产品总量", value: String(products.length) },
      {
        label: "启用中",
        value: String(products.filter((product) => product.enabled).length),
      },
      {
        label: "农业模板",
        value: String(
          products.filter(
            (product) => product.outputTemplateType === "AGRICULTURE_PLAN",
          ).length,
        ),
      },
      {
        label: "报价模板",
        value: String(
          products.filter(
            (product) => product.outputTemplateType !== "AGRICULTURE_PLAN",
          ).length,
        ),
      },
    ],
    [products],
  );

  const templateSummary = useMemo(
    () =>
      Object.entries(
        products.reduce<Record<string, number>>((result, product) => {
          result[product.outputTemplateType] =
            (result[product.outputTemplateType] ?? 0) + 1;
          return result;
        }, {}),
      ),
    [products],
  );

  return (
    <div className="workspace-stack">
      <WorkspacePageHeader
        actions={
          <>
            {canEdit ? (
              <Link
                className="button secondary inline"
                href="/products/new#smart-parser"
              >
                AI 解析辅助
              </Link>
            ) : null}
            {canEdit ? (
              <Link className="button inline" href="/products/new">
                新增产品
              </Link>
            ) : null}
          </>
        }
        description="产品页回到资产管理视角，优先用表格和筛选维护产品资产，AI 解析仅保留为辅助入口。"
        eyebrow="产品资产"
        meta={stats}
        title="产品管理"
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      <section className="split-workspace">
        <div className="workspace-main">
          <SectionCard
            actions={
              <StatusBadge
                tone={products.length ? "success" : "neutral"}
                variant="badge"
              >
                当前结果 {products.length}
              </StatusBadge>
            }
            description="统一维护产品名称、分类、适用行业、建议售价、模板类型与启用状态。"
            title="产品管理"
          >
            <FilterBar
              actions={
                <button
                  className="button ghost inline"
                  onClick={() =>
                    setFilters({ search: "", industryGroupId: "", enabled: "" })
                  }
                  type="button"
                >
                  清空筛选
                </button>
              }
            >
              <div className="field filter-field--wide">
                <label htmlFor="product-search">搜索</label>
                <input
                  id="product-search"
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      search: event.target.value,
                    }))
                  }
                  placeholder="搜索产品名称 / 对外显示名称"
                  value={filters.search}
                />
              </div>

              <div className="field filter-field">
                <label htmlFor="product-industry">适用行业</label>
                <select
                  id="product-industry"
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      industryGroupId: event.target.value,
                    }))
                  }
                  value={filters.industryGroupId}
                >
                  <option value="">全部行业</option>
                  {industries.map((industry) => (
                    <option key={industry.id} value={industry.id}>
                      {industry.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field filter-field">
                <label htmlFor="product-status">启用状态</label>
                <select
                  id="product-status"
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      enabled: event.target.value,
                    }))
                  }
                  value={filters.enabled}
                >
                  <option value="">全部状态</option>
                  <option value="ENABLED">启用</option>
                  <option value="DISABLED">停用</option>
                </select>
              </div>
            </FilterBar>

            {products.length ? (
              <DataTable>
                <thead>
                  <tr>
                    <th>产品名称</th>
                    <th>分类 / 行业</th>
                    <th>规格</th>
                    <th>建议售价</th>
                    <th>模板类型</th>
                    <th>启用状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.displayName}</strong>
                        <div className="small muted">{product.name}</div>
                      </td>
                      <td>
                        <strong>
                          {product.industryGroup?.name || "未设置行业"}
                        </strong>
                        <div className="small muted">
                          {product.industrySubgroup?.name || "默认分类"}
                        </div>
                      </td>
                      <td>
                        {product.specification || "--"} / {product.unit || "--"}
                      </td>
                      <td>{formatProductMoney(product.suggestedPrice)}</td>
                      <td>
                        {outputTemplateLabelMap[product.outputTemplateType] ??
                          product.outputTemplateType}
                      </td>
                      <td>
                        <StatusBadge tone={productStatusTone(product)}>
                          {productStatusLabel(product)}
                        </StatusBadge>
                      </td>
                      <td>
                        <div className="table-actions">
                          <Link
                            className="button secondary inline"
                            href={`/products/${product.id}`}
                          >
                            详情
                          </Link>
                          {canEdit ? (
                            <Link
                              className="button secondary inline"
                              href={`/products/${product.id}/edit`}
                            >
                              编辑
                            </Link>
                          ) : null}
                          <ActionMenu
                            items={[
                              {
                                href: `/quotes/general?productId=${product.id}`,
                                label: "新建相关报价",
                              },
                              ...(canEdit
                                ? [
                                    {
                                      href: `/products/${product.id}/edit`,
                                      label: "编辑产品",
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            ) : (
              <EmptyState
                action={
                  canEdit ? (
                    <Link className="button inline" href="/products/new">
                      新增产品
                    </Link>
                  ) : undefined
                }
                description="当前筛选条件下没有产品，建议新增产品或调整筛选条件。"
                title="暂无匹配产品"
              />
            )}
          </SectionCard>
        </div>

        <aside className="workspace-side sticky-side">
          <SummaryCard
            description="按模板类型快速判断当前资产更偏农业方案、产品报价还是方案报价。"
            title="模板结构"
          >
            <div className="focus-list">
              {templateSummary.length ? (
                templateSummary.map(([template, count]) => (
                  <article className="summary-card" key={template}>
                    <div className="summary-list">
                      <div className="summary-row">
                        <span>
                          {outputTemplateLabelMap[template] ?? template}
                        </span>
                        <strong>{count}</strong>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState
                  description="新增产品后，系统会按模板类型在这里自动汇总。"
                  title="暂无模板汇总"
                />
              )}
            </div>
          </SummaryCard>

          <SummaryCard
            description="AI 解析继续保留，但从主首屏退到辅助入口，避免稀释产品库管理效率。"
            title="辅助入口"
          >
            <div className="focus-list">
              <Link className="list-card" href="/products/new#smart-parser">
                <div className="focus-card__top">
                  <strong>打开 AI 解析辅助</strong>
                  <StatusBadge tone="neutral">辅助</StatusBadge>
                </div>
                <div className="small muted">
                  在新增产品页吸收标签截图或文本解析结果，再带入正式产品表单。
                </div>
              </Link>
            </div>
          </SummaryCard>
        </aside>
      </section>
    </div>
  );
}
