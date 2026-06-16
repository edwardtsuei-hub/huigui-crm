"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { WorkspacePageHeader } from "../../../components/dashboard/WorkspacePageHeader";
import {
  EmptyState,
  FilterBar,
  SectionCard,
  StatusBadge,
  SummaryCard,
  type Tone,
} from "../../../components/system/primitives";
import styles from "../../../components/products/ProductsWorkspacePreview.module.css";
import {
  formatProductMoney,
  outputTemplateLabelMap,
  type IndustryGroupOption,
  type ProductRecord,
} from "../../../components/products/types";
import {
  apiFetch,
  getCurrentUser,
  hasAnyPermission,
} from "../../../lib/api";
import { formatDateLabel } from "../../../lib/workspace";

type ProductFocus =
  | "all"
  | "pending"
  | "customer-visible"
  | "quote-ready"
  | "disabled";

const productFocusLabels: Record<ProductFocus, string> = {
  all: "全部资产",
  pending: "待完善",
  "customer-visible": "客户可见",
  "quote-ready": "可直接报价",
  disabled: "停用归档",
};

function productStatusTone(product: ProductRecord): Tone {
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

function templateLabel(value?: string | null) {
  if (!value) {
    return "未设置模板";
  }

  return outputTemplateLabelMap[value] ?? value;
}

function visibilityLabel(product: ProductRecord) {
  if (product.customerVisible) {
    return "客户可见";
  }

  if (product.employeeVisible === false) {
    return "已隐藏";
  }

  return "仅内部";
}

function rowSummary(product: ProductRecord) {
  return (
    product.summary ||
    product.scenarios ||
    product.remark ||
    "统一维护产品资料，避免模板、行业和售价信息散落在不同入口。"
  );
}

function matchesProductFocus(product: ProductRecord, focus: ProductFocus) {
  switch (focus) {
    case "pending":
      return product.status === "PENDING";
    case "customer-visible":
      return Boolean(product.customerVisible);
    case "quote-ready":
      return product.enabled && product.quoteEnabled !== false;
    case "disabled":
      return !product.enabled;
    default:
      return true;
  }
}

function quoteAccessLabel(product: ProductRecord) {
  return product.quoteEnabled === false ? "报价已关闭" : "允许报价";
}

function standardNumberLabel(product: ProductRecord) {
  return product.standardNumber ? `标准号 ${product.standardNumber}` : "待补标准号";
}

function updatedAtLabel(product: ProductRecord) {
  return product.updatedAt ? `更新 ${formatDateLabel(product.updatedAt)}` : "待补更新时间";
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
    focus: "all" as ProductFocus,
  });
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("正在载入正式产品资产数据");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setError("");
        setStatusText("正在载入正式产品资产数据");

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
        setStatusText("已接入正式产品资产数据");
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "加载产品失败",
          );
          setStatusText("产品数据加载失败，当前未拿到正式列表");
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [filters.enabled, filters.industryGroupId, filters.search]);

  const filteredProducts = useMemo(
    () => products.filter((product) => matchesProductFocus(product, filters.focus)),
    [filters.focus, products],
  );

  const selectedIndustryLabel = useMemo(
    () =>
      industries.find((industry) => industry.id === filters.industryGroupId)?.name ??
      "全部行业",
    [filters.industryGroupId, industries],
  );

  const scopedCounts = useMemo(
    () => ({
      pending: products.filter((product) => product.status === "PENDING").length,
      disabled: products.filter((product) => !product.enabled).length,
      customerVisible: products.filter((product) => product.customerVisible).length,
      quoteReady: products.filter(
        (product) => product.enabled && product.quoteEnabled !== false,
      ).length,
      quoteClosed: products.filter((product) => product.quoteEnabled === false).length,
      missingStandard: products.filter((product) => !product.standardNumber).length,
    }),
    [products],
  );

  const visibleCounts = useMemo(
    () => ({
      enabled: filteredProducts.filter((product) => product.enabled).length,
      pending: filteredProducts.filter((product) => product.status === "PENDING").length,
    }),
    [filteredProducts],
  );

  const templateSummary = useMemo(() => {
    const counts = filteredProducts.reduce<Record<string, number>>(
      (result, product) => {
        const key = product.outputTemplateType || "UNSET";
        result[key] = (result[key] ?? 0) + 1;
        return result;
      },
      {},
    );

    return Object.entries(counts)
      .map(([key, value]) => ({
        key,
        label: templateLabel(key === "UNSET" ? "" : key),
        value,
      }))
      .sort((left, right) => right.value - left.value);
  }, [filteredProducts]);

  const headerMeta = useMemo<
    Array<{ label: string; value: string; tone?: Tone }>
  >(
    () => [
      { label: "当前结果", value: String(filteredProducts.length) },
      {
        label: "启用中",
        value: String(visibleCounts.enabled),
        tone: "success",
      },
      {
        label: "待完善",
        value: String(visibleCounts.pending),
        tone: visibleCounts.pending ? "warning" : "neutral",
      },
      { label: "模板类型", value: String(templateSummary.length) },
    ],
    [
      filteredProducts.length,
      templateSummary.length,
      visibleCounts.enabled,
      visibleCounts.pending,
    ],
  );

  return (
    <div className={`workspace-stack ${styles.previewPage}`}>
      <WorkspacePageHeader
        actions={
          <>
            <Link
              className="button ghost inline"
              href="/products/ai-import"
            >
              待确认解析
            </Link>
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
        meta={headerMeta}
        title="产品管理"
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      <section className="split-workspace">
        <div className="workspace-main">
          <SectionCard
            actions={
              <div className={styles.sectionBadges}>
                <StatusBadge
                  tone={filteredProducts.length ? "success" : "neutral"}
                  variant="badge"
                >
                  当前结果 {filteredProducts.length}
                </StatusBadge>
                <StatusBadge tone="success" variant="badge">
                  正式数据
                </StatusBadge>
              </div>
            }
            className={styles.mainCard}
            description="统一维护产品名称、分类、适用行业、建议售价、模板类型与启用状态。"
            title="产品管理"
          >
            <div className={styles.dataNote}>
              <span className={styles.dataNoteDot} />
              <span>{statusText}</span>
            </div>

            <FilterBar
              actions={
                <button
                  className="button ghost inline"
                  onClick={() =>
                    setFilters({
                      search: "",
                      industryGroupId: "",
                      enabled: "",
                      focus: "all",
                    })
                  }
                  type="button"
                >
                  清空筛选
                </button>
              }
              className={styles.filterBar}
            >
              <div className={`${styles.field} ${styles.fieldWide}`}>
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

              <div className={styles.field}>
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

              <div className={styles.field}>
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

            <div className={styles.filterExtras}>
              <div className={styles.filterQuickRow}>
                {([
                  {
                    value: "all",
                    label: productFocusLabels.all,
                    count: products.length,
                  },
                  {
                    value: "pending",
                    label: productFocusLabels.pending,
                    count: scopedCounts.pending,
                  },
                  {
                    value: "customer-visible",
                    label: productFocusLabels["customer-visible"],
                    count: scopedCounts.customerVisible,
                  },
                  {
                    value: "quote-ready",
                    label: productFocusLabels["quote-ready"],
                    count: scopedCounts.quoteReady,
                  },
                  {
                    value: "disabled",
                    label: productFocusLabels.disabled,
                    count: scopedCounts.disabled,
                  },
                ] as Array<{ value: ProductFocus; label: string; count: number }>).map(
                  (option) => (
                    <button
                      key={option.value}
                      className={[
                        styles.filterQuickButton,
                        filters.focus === option.value
                          ? styles.filterQuickButtonActive
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, focus: option.value }))
                      }
                      type="button"
                    >
                      {option.label} {option.count}
                    </button>
                  ),
                )}
              </div>

              <div className={styles.filterSummaryRow}>
                <span className={styles.filterSummaryChip}>
                  当前视图 {filteredProducts.length} 条
                </span>
                {filters.focus !== "all" ? (
                  <span className={styles.filterSummaryChip}>
                    焦点 {productFocusLabels[filters.focus]}
                  </span>
                ) : null}
                {filters.industryGroupId ? (
                  <span className={styles.filterSummaryChip}>
                    行业 {selectedIndustryLabel}
                  </span>
                ) : null}
                {filters.enabled ? (
                  <span className={styles.filterSummaryChip}>
                    状态 {filters.enabled === "ENABLED" ? "启用" : "停用"}
                  </span>
                ) : null}
                {filters.search.trim() ? (
                  <span className={styles.filterSummaryChip}>
                    关键词 {filters.search.trim()}
                  </span>
                ) : null}
                <span className={styles.filterSummaryChip}>
                  客户可见 {scopedCounts.customerVisible}
                </span>
                <span className={styles.filterSummaryChip}>
                  允许报价 {scopedCounts.quoteReady}
                </span>
              </div>
            </div>

            {filteredProducts.length ? (
              <>
                <div className={styles.listHeader}>
                  <span className={styles.listHeaderPrimary}>产品名称</span>
                  <span>分类 / 行业</span>
                  <span>规格 / 可见</span>
                  <span>建议售价</span>
                  <span>模板类型</span>
                  <span className={styles.listHeaderActions}>操作</span>
                </div>

                <div className={styles.productList}>
                  {filteredProducts.map((product) => (
                    <article className={styles.productRow} key={product.id}>
                      <div className={styles.primaryCell}>
                        <div className={styles.primaryTop}>
                          <div className={styles.productTitleGroup}>
                            <strong>{product.displayName || product.name}</strong>
                            <div className={styles.inlineMeta}>
                              <span>{product.name}</span>
                              {product.labelText ? (
                                <span>{product.labelText}</span>
                              ) : null}
                            </div>
                          </div>
                          <StatusBadge tone={productStatusTone(product)}>
                            {productStatusLabel(product)}
                          </StatusBadge>
                        </div>
                        <p>{rowSummary(product)}</p>
                        <div className={styles.primaryFoot}>
                          <span>{standardNumberLabel(product)}</span>
                          <span>{quoteAccessLabel(product)}</span>
                          <span>{updatedAtLabel(product)}</span>
                        </div>
                      </div>

                      <div className={styles.infoCell}>
                        <span>分类 / 行业</span>
                        <strong>{product.industryGroup?.name || "未设置行业"}</strong>
                        <small>
                          {product.industrySubgroup?.name || product.scenarios || "默认分类"}
                        </small>
                      </div>

                      <div className={styles.infoCell}>
                        <span>规格 / 可见</span>
                        <strong>
                          {product.specification || "--"} / {product.unit || "--"}
                        </strong>
                        <small>
                          {visibilityLabel(product)} · {quoteAccessLabel(product)}
                        </small>
                      </div>

                      <div className={styles.infoCell}>
                        <span>建议售价</span>
                        <strong>{formatProductMoney(product.suggestedPrice)}</strong>
                        <small>
                          {product.costPrice
                            ? `成本 ${formatProductMoney(product.costPrice)}`
                            : "未设置成本价"}
                        </small>
                      </div>

                      <div className={styles.infoCell}>
                        <span>模板类型</span>
                        <strong>{templateLabel(product.outputTemplateType)}</strong>
                        <small>
                          {product.remark || "模板结构已并入产品资料维护视角。"}
                        </small>
                      </div>

                      <div className={styles.actionCell}>
                        <Link
                          className="button secondary inline"
                          href={`/products/${product.id}`}
                        >
                          查看详情
                        </Link>
                        {canEdit ? (
                          <Link
                            className="button ghost inline"
                            href={`/products/${product.id}/edit`}
                          >
                            编辑资料
                          </Link>
                        ) : null}
                        {product.quoteEnabled !== false ? (
                          <Link
                            className="button ghost inline"
                            href={`/quotes/general?productId=${product.id}`}
                          >
                            新建报价
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                action={
                  canEdit ? (
                    <Link className="button inline" href="/products/new">
                      新增产品
                    </Link>
                  ) : (
                    <button
                      className="button ghost inline"
                      onClick={() =>
                        setFilters({
                          search: "",
                          industryGroupId: "",
                          enabled: "",
                          focus: "all",
                        })
                      }
                      type="button"
                    >
                      重置筛选
                    </button>
                  )
                }
                description="当前筛选条件下没有产品，建议重置筛选或新增产品。"
                title="暂无匹配产品"
              />
            )}
          </SectionCard>
        </div>

        <aside className="workspace-side sticky-side">
          <SummaryCard
            className={styles.sideCard}
            description="按模板类型快速判断当前资产更偏农业方案、产品报价还是方案报价。"
            title="模板结构"
          >
            {templateSummary.length ? (
              <div className={styles.summaryList}>
                {templateSummary.map((item) => {
                  const percent = Math.round(
                    (item.value / Math.max(filteredProducts.length, 1)) * 100,
                  );

                  return (
                    <article className={styles.summaryItem} key={item.key}>
                      <div className={styles.summaryItemTop}>
                        <div className={styles.summaryLabel}>
                          <strong>{item.label}</strong>
                          <span>{item.value} 条产品</span>
                        </div>
                        <StatusBadge tone="neutral" variant="badge">
                          {percent}%
                        </StatusBadge>
                      </div>
                      <div className={styles.summaryBarTrack}>
                        <div
                          className={styles.summaryBarFill}
                          style={{ width: `${Math.max(14, percent)}%` }}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                description="新增产品后，系统会按模板类型在这里自动汇总。"
                title="暂无模板汇总"
              />
            )}
          </SummaryCard>

          <SummaryCard
            className={styles.sideCard}
            description="AI 解析继续保留，但从主首屏退到辅助入口，避免稀释产品库管理效率。"
            title="辅助入口"
          >
            <div className={styles.assistCard}>
              <div className={styles.assistTop}>
                <div className={styles.assistCopy}>
                  <strong>打开 AI 解析辅助</strong>
                  <p>
                    在新增产品页吸收标签截图或文本解析结果，再带入正式产品表单。
                  </p>
                </div>
                <StatusBadge tone="neutral">辅助</StatusBadge>
              </div>
              <div className="action-row">
                <Link
                  className="button secondary inline"
                  href="/products/new#smart-parser"
                >
                  前往辅助入口
                </Link>
                <Link
                  className="button ghost inline"
                  href="/products/ai-import"
                >
                  查看待确认队列
                </Link>
              </div>
            </div>

            <div className={styles.assistStats}>
              <article>
                <span>待完善</span>
                <strong>{scopedCounts.pending}</strong>
                <small>模板、标签或行业信息还需补齐</small>
              </article>
              <article>
                <span>停用中</span>
                <strong>{scopedCounts.disabled}</strong>
                <small>历史产品应与现役产品清楚区分</small>
              </article>
              <article>
                <span>客户可见</span>
                <strong>{scopedCounts.customerVisible}</strong>
                <small>已进入对外展示或客户沟通范围</small>
              </article>
            </div>

            <div className={styles.attentionList}>
              <article className={styles.attentionItem}>
                <strong>未开放报价 {scopedCounts.quoteClosed} 条</strong>
                <p>这些产品不会直接进入正式报价，适合先回详情页确认状态、模板和适用范围。</p>
              </article>
              <article className={styles.attentionItem}>
                <strong>待补标准号 {scopedCounts.missingStandard} 条</strong>
                <p>标准号和标签标识还没完全补齐，外发前建议先统一，避免资料口径继续分叉。</p>
              </article>
            </div>

            <div className={styles.sideNote}>
              <StatusBadge tone="success" variant="badge">
                正式模式
              </StatusBadge>
              <p>{statusText}</p>
            </div>
          </SummaryCard>
        </aside>
      </section>
    </div>
  );
}
