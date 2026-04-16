"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { DetailTabs } from "../../../../components/dashboard/DetailTabs";
import { EntityDetailHeader } from "../../../../components/dashboard/EntityDetailHeader";
import { QuickWorkspaceComposer } from "../../../../components/dashboard/QuickWorkspaceComposer";
import {
  formatProductMoney,
  outputTemplateLabelMap,
  type ProductRecord,
} from "../../../../components/products/types";
import {
  getCurrentUser,
  hasAnyPermission,
  type CurrentUser,
  apiFetch,
} from "../../../../lib/api";
import {
  WORKSPACE_ITEMS_CHANGED_EVENT,
  bucketDueLabel,
  filterVisibleWorkspaceItems,
  formatDateLabel,
  listLocalWorkspaceItems,
  workspacePriorityLabel,
  workspacePriorityTone,
  type LocalWorkspaceItem,
  type WorkspaceItemKind,
} from "../../../../lib/workspace";

type ProductDetail = ProductRecord & {
  createdAt: string;
  updatedAt: string;
  recentQuotationItems?: Array<{
    id: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
    quotation?: {
      id: string;
      quotationNo: string;
      type: string;
      totalAmount: string;
      createdAt: string;
      customer?: { id?: string; name: string } | null;
    } | null;
  }>;
  referenceCount?: number;
};

function productStatusLabel(enabled?: boolean) {
  return enabled ? "启用" : "停用";
}

function productStatusTone(enabled?: boolean) {
  return enabled ? "success" : "neutral";
}

function quotationTypeLabel(type?: string) {
  switch (type) {
    case "AGRICULTURE":
      return "农业方案";
    case "GENERAL":
      return "通用报价";
    case "INDUSTRY":
      return "行业报价";
    case "SERVICE":
      return "服务报价";
    case "BREEDING":
      return "养殖报价";
    default:
      return "报价";
  }
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [workspaceItems, setWorkspaceItems] = useState<LocalWorkspaceItem[]>(
    [],
  );
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerKind, setComposerKind] =
    useState<WorkspaceItemKind>("reminder");
  const [error, setError] = useState("");

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  useEffect(() => {
    apiFetch<ProductDetail>(`/products/${params.id}`)
      .then(setProduct)
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : "加载产品详情失败",
        ),
      );
  }, [params.id]);

  useEffect(() => {
    function syncWorkspaceItems() {
      setWorkspaceItems(
        filterVisibleWorkspaceItems(listLocalWorkspaceItems()).filter(
          (item) => item.relatedId === params.id,
        ),
      );
    }

    syncWorkspaceItems();
    window.addEventListener(WORKSPACE_ITEMS_CHANGED_EVENT, syncWorkspaceItems);
    return () => {
      window.removeEventListener(
        WORKSPACE_ITEMS_CHANGED_EVENT,
        syncWorkspaceItems,
      );
    };
  }, [params.id]);

  const canEdit = hasAnyPermission(currentUser, [
    "action.product.update",
    "action.product.create",
  ]);

  const recentReferences = useMemo(
    () => product?.recentQuotationItems ?? [],
    [product?.recentQuotationItems],
  );

  const riskItems = useMemo(() => {
    if (!product) {
      return [];
    }

    const nextRisks: string[] = [];
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(product.updatedAt).getTime()) / 86400000,
    );

    if (!product.enabled) {
      nextRisks.push("当前产品已停用，报价前需确认是否仍允许继续引用。");
    }

    if (!product.outputTemplateType) {
      nextRisks.push(
        "当前产品未设置输出模板，后续生成方案或报价时会缺少模板上下文。",
      );
    }

    if (!product.quoteEnabled) {
      nextRisks.push(
        "当前产品未开放报价使用，业务同事无法在正式报价中直接引用。",
      );
    }

    if (!product.referenceCount) {
      nextRisks.push(
        "当前产品还没有被正式报价引用，建议确认命名、说明和模板是否足够清晰。",
      );
    }

    if (daysSinceUpdate <= 7) {
      nextRisks.push(
        "最近 7 天内该产品有更新，建议在报价前复核价格与说明文案。",
      );
    }

    if (!nextRisks.length) {
      nextRisks.push("当前产品信息完整，可继续作为标准资产供方案与报价复用。");
    }

    return nextRisks;
  }, [product]);

  if (!product) {
    return (
      <section className="panel">{error || "正在加载产品详情..."}</section>
    );
  }

  return (
    <div className="workspace-stack">
      <EntityDetailHeader
        actions={
          <>
            {canEdit ? (
              <Link
                className="button secondary inline"
                href={`/products/${product.id}/edit`}
              >
                编辑产品
              </Link>
            ) : null}
            <button
              className="button secondary inline"
              onClick={() => {
                setComposerKind("reminder");
                setComposerOpen(true);
              }}
              type="button"
            >
              新增提醒
            </button>
            <Link className="button secondary inline" href="#references">
              查看引用记录
            </Link>
            <details className="menu-popover">
              <summary className="button ghost inline">更多操作</summary>
              <div className="menu-popover__panel">
                {canEdit ? (
                  <Link
                    className="menu-popover__item"
                    href={`/products/${product.id}/edit`}
                  >
                    调整价格 / 启停状态
                  </Link>
                ) : null}
                <button
                  className="menu-popover__item"
                  onClick={() => {
                    setComposerKind("todo");
                    setComposerOpen(true);
                  }}
                  type="button"
                >
                  新建待办
                </button>
                <Link className="menu-popover__item" href="/products">
                  返回产品管理
                </Link>
              </div>
            </details>
          </>
        }
        badges={[
          {
            label: productStatusLabel(product.enabled),
            tone: productStatusTone(product.enabled) as
              | "neutral"
              | "success"
              | "warning"
              | "danger",
          },
        ]}
        breadcrumbs={[
          { label: "产品", href: "/products" },
          { label: product.displayName },
        ]}
        eyebrow="产品详情"
        meta={[
          {
            label: "所属行业",
            value:
              product.industryGroup?.name && product.industrySubgroup?.name
                ? `${product.industryGroup.name} / ${product.industrySubgroup.name}`
                : product.industryGroup?.name || "未设置",
          },
          {
            label: "建议售价",
            value: formatProductMoney(product.suggestedPrice),
          },
          {
            label: "模板类型",
            value:
              outputTemplateLabelMap[product.outputTemplateType] ??
              product.outputTemplateType,
          },
          { label: "最近更新", value: formatDateLabel(product.updatedAt) },
        ]}
        subtitle={`${product.specification || "未填规格"} / ${product.unit || "未填单位"} · ${product.name}${product.standardNumber ? ` · ${product.standardNumber}` : ""}`}
        title={product.displayName}
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      <section className="detail-layout">
        <div className="workspace-main">
          <section className="panel stack">
            <div className="section-heading">
              <h3>基础信息</h3>
              <p>
                确认产品是什么、面向哪个行业，以及它在报价里应该如何被调用。
              </p>
            </div>

            <div className="detail-info-grid">
              <article className="detail-info-card">
                <span>产品名称</span>
                <strong>{product.name}</strong>
              </article>
              <article className="detail-info-card">
                <span>对外名称</span>
                <strong>{product.displayName}</strong>
              </article>
              <article className="detail-info-card">
                <span>分类</span>
                <strong>
                  {product.industryGroup?.name || "未设置"}
                  {product.industrySubgroup?.name
                    ? ` / ${product.industrySubgroup.name}`
                    : ""}
                </strong>
              </article>
              <article className="detail-info-card">
                <span>规格 / 单位</span>
                <strong>
                  {product.specification || "未填写"} /{" "}
                  {product.unit || "未填写"}
                </strong>
              </article>
              <article className="detail-info-card">
                <span>建议售价</span>
                <strong>{formatProductMoney(product.suggestedPrice)}</strong>
              </article>
              <article className="detail-info-card">
                <span>模板类型</span>
                <strong>
                  {outputTemplateLabelMap[product.outputTemplateType] ??
                    product.outputTemplateType}
                </strong>
              </article>
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>产品说明</h3>
              <p>宣传文案、成分说明、适用场景和 AI 解析摘要统一沉淀到这里。</p>
            </div>

            <div className="grid-2">
              <article className="detail-text-card">
                <span>产品介绍</span>
                <p>{product.summary || "当前还没有补充产品介绍。"}</p>
              </article>
              <article className="detail-text-card">
                <span>适用场景</span>
                <p>{product.scenarios || "当前还没有补充适用场景。"}</p>
              </article>
              <article className="detail-text-card">
                <span>标签文字</span>
                <p>{product.labelText || "当前还没有配置标签文字。"}</p>
              </article>
              <article className="detail-text-card">
                <span>备注</span>
                <p>{product.remark || "当前还没有内部备注。"}</p>
              </article>
            </div>

            {product.imageUrl || product.tagScreenshotUrl ? (
              <div className="detail-media-grid">
                {product.imageUrl ? (
                  <article className="detail-media-card">
                    <span>产品图片</span>
                    <img alt={product.displayName} src={product.imageUrl} />
                  </article>
                ) : null}
                {product.tagScreenshotUrl ? (
                  <article className="detail-media-card">
                    <span>标签截图</span>
                    <img
                      alt={`${product.displayName} 标签截图`}
                      src={product.tagScreenshotUrl}
                    />
                  </article>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>报价规则</h3>
              <p>这里决定产品在方案和正式报价里的默认价格、模板与可见范围。</p>
            </div>

            <div className="detail-info-grid">
              <article className="detail-info-card">
                <span>默认单价</span>
                <strong>{formatProductMoney(product.suggestedPrice)}</strong>
              </article>
              <article className="detail-info-card">
                <span>最低保护价</span>
                <strong>未设置</strong>
              </article>
              <article className="detail-info-card">
                <span>可适用行业</span>
                <strong>{product.industryGroup?.name || "待补行业规则"}</strong>
              </article>
              <article className="detail-info-card">
                <span>默认模板</span>
                <strong>
                  {outputTemplateLabelMap[product.outputTemplateType] ??
                    product.outputTemplateType}
                </strong>
              </article>
              <article className="detail-info-card">
                <span>允许参与报价</span>
                <strong>{product.quoteEnabled ? "允许" : "关闭"}</strong>
              </article>
              <article className="detail-info-card">
                <span>可见范围</span>
                <strong>
                  员工 {product.employeeVisible ? "可见" : "隐藏"} / 客户{" "}
                  {product.customerVisible ? "可见" : "隐藏"}
                </strong>
              </article>
            </div>
          </section>

          <section className="panel stack" id="references">
            <div className="section-heading">
              <h3>最近引用记录</h3>
              <p>直接看到这个产品最近被哪些报价调用，有没有形成业务闭环。</p>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>报价编号</th>
                    <th>客户</th>
                    <th>数量</th>
                    <th>成交金额</th>
                    <th>时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReferences.length ? (
                    recentReferences.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>
                            {item.quotation?.quotationNo || "未关联报价"}
                          </strong>
                          <div className="small muted">
                            {quotationTypeLabel(item.quotation?.type)}
                          </div>
                        </td>
                        <td>{item.quotation?.customer?.name || "--"}</td>
                        <td>{item.quantity}</td>
                        <td>{formatProductMoney(item.lineTotal)}</td>
                        <td>
                          {item.quotation?.createdAt
                            ? formatDateLabel(item.quotation.createdAt)
                            : "--"}
                        </td>
                        <td>
                          {item.quotation?.id ? (
                            <Link
                              className="button secondary inline"
                              href={`/quotations/${item.quotation.id}`}
                            >
                              查看报价
                            </Link>
                          ) : (
                            <span className="small muted">--</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty">当前还没有引用记录。</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>版本与修改记录</h3>
              <p>
                先把最近一次修改和资产状态暴露出来，后续可以继续接审计日志。
              </p>
            </div>

            <div className="focus-list">
              <article className="list-card">
                <div className="detail-block__header">
                  <strong>最近更新时间</strong>
                  <span className="status-pill neutral">
                    {formatDateLabel(product.updatedAt)}
                  </span>
                </div>
                <p>最近一次修改已同步到报价规则、说明文案和右侧摘要区。</p>
              </article>
              <article className="list-card">
                <div className="detail-block__header">
                  <strong>创建时间</strong>
                  <span className="status-pill neutral">
                    {formatDateLabel(product.createdAt)}
                  </span>
                </div>
                <p>该产品已进入产品资产池，可继续扩展为模板或标准资料。</p>
              </article>
            </div>
          </section>
        </div>

        <aside className="workspace-side sticky-side">
          <section className="summary-card stack">
            <div className="section-heading">
              <h3>产品摘要卡</h3>
              <p>固定确认这个产品当前属于什么状态，能否继续被报价使用。</p>
            </div>

            <div className="summary-list">
              <div className="summary-row">
                <span>所属行业</span>
                <strong>{product.industryGroup?.name || "未设置"}</strong>
              </div>
              <div className="summary-row">
                <span>建议售价</span>
                <strong>{formatProductMoney(product.suggestedPrice)}</strong>
              </div>
              <div className="summary-row">
                <span>模板类型</span>
                <strong>
                  {outputTemplateLabelMap[product.outputTemplateType] ??
                    product.outputTemplateType}
                </strong>
              </div>
              <div className="summary-row">
                <span>状态</span>
                <strong>{productStatusLabel(product.enabled)}</strong>
              </div>
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>引用情况卡</h3>
              <p>看清本月被调用频率和最近一次落入报价的情况。</p>
            </div>

            <div className="summary-list">
              <div className="summary-row">
                <span>引用次数</span>
                <strong>{product.referenceCount ?? 0}</strong>
              </div>
              <div className="summary-row">
                <span>最近报价时间</span>
                <strong>
                  {recentReferences[0]?.quotation?.createdAt
                    ? formatDateLabel(recentReferences[0].quotation.createdAt)
                    : "暂无"}
                </strong>
              </div>
              <div className="summary-row">
                <span>最近报价客户</span>
                <strong>
                  {recentReferences[0]?.quotation?.customer?.name || "暂无"}
                </strong>
              </div>
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>风险提示卡</h3>
              <p>重点关注停用、缺模板、低复用和近期变更等风险。</p>
            </div>

            <div className="focus-list">
              {riskItems.map((item) => (
                <article className="list-card" key={item}>
                  <div className="status-pill warning">风险提示</div>
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>快捷操作卡</h3>
              <p>编辑、查看引用和新增协作事项都统一放在右侧。</p>
            </div>

            <div className="focus-list">
              {canEdit ? (
                <Link
                  className="button secondary inline"
                  href={`/products/${product.id}/edit`}
                >
                  编辑产品
                </Link>
              ) : null}
              <button
                className="button secondary"
                onClick={() => {
                  setComposerKind("schedule");
                  setComposerOpen(true);
                }}
                type="button"
              >
                新增日程
              </button>
              <Link className="button secondary inline" href="#references">
                查看引用报价
              </Link>
              <Link className="button inline" href="/solutions/industry/new">
                新建相关报价
              </Link>
            </div>
          </section>
        </aside>
      </section>

      <DetailTabs
        initialKey="references"
        tabs={[
          {
            key: "references",
            label: "引用记录",
            content: (
              <div className="focus-list">
                {recentReferences.length ? (
                  recentReferences.map((item) => (
                    <article className="list-card" key={item.id}>
                      <div className="detail-block__header">
                        <div>
                          <strong>
                            {item.quotation?.quotationNo || "未关联报价"}
                          </strong>
                          <div className="small muted">
                            {item.quotation?.customer?.name || "未知客户"} ·{" "}
                            {quotationTypeLabel(item.quotation?.type)}
                          </div>
                        </div>
                        <span className="status-pill neutral">
                          {item.quotation?.createdAt
                            ? formatDateLabel(item.quotation.createdAt)
                            : "暂无时间"}
                        </span>
                      </div>
                      <p>
                        数量 {item.quantity}，当前行金额{" "}
                        {formatProductMoney(item.lineTotal)}。
                      </p>
                    </article>
                  ))
                ) : (
                  <div className="empty">当前没有可展示的引用记录。</div>
                )}
              </div>
            ),
          },
          {
            key: "changes",
            label: "变更日志",
            content: (
              <div className="focus-list">
                <article className="list-card">
                  <div className="detail-block__header">
                    <strong>最近更新</strong>
                    <span className="status-pill neutral">
                      {formatDateLabel(product.updatedAt)}
                    </span>
                  </div>
                  <p>
                    价格、模板、说明文案或可见性发生变化时，这里会成为统一查看入口。
                  </p>
                </article>
                <article className="list-card">
                  <div className="detail-block__header">
                    <strong>启停状态</strong>
                    <span
                      className={`status-pill ${productStatusTone(product.enabled)}`}
                    >
                      {productStatusLabel(product.enabled)}
                    </span>
                  </div>
                  <p>当前产品状态已同步到产品管理页与详情摘要区。</p>
                </article>
              </div>
            ),
          },
          {
            key: "attachments",
            label: "附件",
            content: (
              <div className="detail-info-grid">
                {["标签图", "产品图", "标准说明文件", "检测资料"].map(
                  (item) => (
                    <article className="detail-text-card" key={item}>
                      <span>{item}</span>
                      <p>当前还没有上传 {item}，后续附件能力可直接接到这里。</p>
                    </article>
                  ),
                )}
              </div>
            ),
          },
          {
            key: "logs",
            label: "操作日志",
            content: (
              <div className="focus-list">
                {workspaceItems.length ? (
                  workspaceItems.map((item) => (
                    <article className="list-card" key={item.id}>
                      <div className="detail-block__header">
                        <strong>{item.title}</strong>
                        <span
                          className={`status-pill ${workspacePriorityTone(item.priority)}`}
                        >
                          {bucketDueLabel(item.dueAt || item.createdAt)}
                        </span>
                      </div>
                      <p>{item.summary}</p>
                      <div className="small muted">
                        {item.dueAt
                          ? formatDateLabel(item.dueAt)
                          : formatDateLabel(item.createdAt)}{" "}
                        · {workspacePriorityLabel(item.priority)}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty">当前还没有关联的协作动作记录。</div>
                )}
              </div>
            ),
          },
        ]}
      />

      <QuickWorkspaceComposer
        assignee={currentUser?.displayName}
        initialKind={composerKind}
        onClose={() => setComposerOpen(false)}
        open={composerOpen}
        relatedHref={`/products/${product.id}`}
        relatedId={product.id}
        relatedLabel={product.displayName}
        relatedType="internal"
      />
    </div>
  );
}
