"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BusinessFilePanel } from "../business-files/BusinessFilePanel";
import { DetailTabs } from "../dashboard/DetailTabs";
import { EntityDetailHeader } from "../dashboard/EntityDetailHeader";
import { QuickWorkspaceComposer } from "../dashboard/QuickWorkspaceComposer";
import {
  ActionMenu,
  DataTable,
  EmptyState,
  SectionCard,
  StatCard,
  SummaryCard,
} from "../system/primitives";
import {
  type InspectionListItem,
  inspectionPaymentStatusLabel,
  inspectionStatusLabel,
} from "../inspections/types";
import {
  formatProductMoney,
  outputTemplateLabelMap,
  type ProductRecord,
} from "./types";
import {
  bucketDueLabel,
  formatDateLabel,
  workspacePriorityLabel,
  workspacePriorityTone,
  type LocalWorkspaceItem,
  type WorkspaceItemKind,
} from "../../lib/workspace";

export type ProductDetailWorkspaceProduct = ProductRecord & {
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

type ProductDetailWorkspaceProps = {
  product: ProductDetailWorkspaceProduct;
  canEdit: boolean;
  inspectionItems: InspectionListItem[];
  inspectionError?: string;
  workspaceItems: LocalWorkspaceItem[];
  currentUserDisplayName?: string;
  canManageFiles?: boolean;
  inspectionDetailHrefBuilder?: (id: string) => string;
  links: {
    detailHref: string;
    listHref: string;
    editHref?: string;
    previewHref?: string;
    newInspectionHref?: string;
    inspectionsHref?: string;
    newQuoteHref?: string;
  };
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

export function ProductDetailWorkspace({
  product,
  canEdit,
  inspectionItems,
  inspectionError,
  workspaceItems,
  currentUserDisplayName,
  canManageFiles = false,
  inspectionDetailHrefBuilder,
  links,
}: ProductDetailWorkspaceProps) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerKind, setComposerKind] =
    useState<WorkspaceItemKind>("reminder");

  const recentReferences = useMemo(
    () => product.recentQuotationItems ?? [],
    [product.recentQuotationItems],
  );

  const industryLabel = useMemo(() => {
    if (product.industryGroup?.name && product.industrySubgroup?.name) {
      return `${product.industryGroup.name} / ${product.industrySubgroup.name}`;
    }

    return product.industryGroup?.name || "未设置";
  }, [product.industryGroup?.name, product.industrySubgroup?.name]);

  const visibilityLabel = useMemo(
    () =>
      `员工 ${product.employeeVisible ? "可见" : "隐藏"} / 客户 ${
        product.customerVisible ? "可见" : "隐藏"
      }`,
    [product.customerVisible, product.employeeVisible],
  );

  const riskItems = useMemo(() => {
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
  }, [
    product.enabled,
    product.outputTemplateType,
    product.quoteEnabled,
    product.referenceCount,
    product.updatedAt,
  ]);

  const lastReference = recentReferences[0];
  const canCompose = Boolean(currentUserDisplayName);
  const recentReferenceAmount = useMemo(
    () =>
      recentReferences.reduce((sum, item) => {
        const amount = Number(item.lineTotal ?? 0);
        return Number.isNaN(amount) ? sum : sum + amount;
      }, 0),
    [recentReferences],
  );
  const recentReferenceCustomerCount = useMemo(
    () =>
      new Set(
        recentReferences
          .map((item) => item.quotation?.customer?.name)
          .filter((value): value is string => Boolean(value)),
      ).size,
    [recentReferences],
  );
  const highPriorityWorkspaceCount = useMemo(
    () => workspaceItems.filter((item) => item.priority === "high").length,
    [workspaceItems],
  );
  const pendingWorkspaceCount = useMemo(
    () => workspaceItems.filter((item) => item.status === "pending").length,
    [workspaceItems],
  );
  const assetCards = useMemo(
    () => [
      {
        title: "产品图片",
        value: product.imageUrl ? "已配置" : "待补充",
        note: product.imageUrl
          ? "可用于产品卡片和详情展示。"
          : "建议补一张稳定可复用的标准展示图。",
      },
      {
        title: "标签截图",
        value: product.tagScreenshotUrl ? "已配置" : "待补充",
        note: product.tagScreenshotUrl
          ? "可用于辅助核对标签文案和卖点。"
          : "建议补一张标签截图，便于解析器和人工复核。",
      },
      {
        title: "企业标准号",
        value: product.standardNumber || "待补充",
        note: product.standardNumber
          ? "当前主档已记录标准号，可继续对齐标签与资料。"
          : "如涉及备案或标准说明，建议补齐标准号。",
      },
      {
        title: "检测资料",
        value: inspectionItems.length ? `${inspectionItems.length} 份关联记录` : "暂无关联",
        note: inspectionItems.length
          ? "已有检测记录可回溯，可继续补充报告与付款资料。"
          : "当前还没有检测资料，后续送检后可在这里归档。",
      },
    ],
    [
      inspectionItems.length,
      product.imageUrl,
      product.standardNumber,
      product.tagScreenshotUrl,
    ],
  );
  const changeEvents = useMemo(
    () => [
      {
        title: "产品创建",
        badge: "主档建立",
        description: `创建于 ${formatDateLabel(product.createdAt)}`,
        detail: "该产品已进入产品资产池，可继续扩展模板、附件和区域化报价规则。",
        tone: "neutral",
      },
      {
        title: "最近更新",
        badge: "最新版本",
        description: `更新于 ${formatDateLabel(product.updatedAt)}`,
        detail: "最近一次修改会影响价格、模板、说明文案或可见范围，报价前建议复核。",
        tone: "warning",
      },
      {
        title: "启停状态",
        badge: productStatusLabel(product.enabled),
        description: product.enabled ? "当前产品可继续参与产品库与报价流程。" : "当前产品已停用，需确认是否仍允许业务继续引用。",
        detail: "产品状态会同步影响产品中心、详情摘要和引用时的可见性判断。",
        tone: productStatusTone(product.enabled),
      },
      {
        title: "报价权限",
        badge: product.quoteEnabled ? "允许报价" : "禁止报价",
        description: product.quoteEnabled ? "当前产品可直接进入正式报价。" : "当前产品不会出现在正式报价使用范围中。",
        detail: `当前可见范围：${visibilityLabel}`,
        tone: product.quoteEnabled ? "success" : "warning",
      },
    ],
    [
      product.createdAt,
      product.enabled,
      product.quoteEnabled,
      product.updatedAt,
      visibilityLabel,
    ],
  );

  return (
    <div className="workspace-stack">
      <EntityDetailHeader
        actions={
          <>
            {canEdit && links.editHref ? (
              <Link className="button secondary inline" href={links.editHref}>
                编辑产品
              </Link>
            ) : null}
            {canCompose ? (
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
            ) : null}
            <Link className="button secondary inline" href="#references">
              查看引用记录
            </Link>
            {links.newInspectionHref ? (
              <Link className="button secondary inline" href={links.newInspectionHref}>
                新建检测
              </Link>
            ) : null}
            {links.previewHref ? (
              <Link className="button ghost inline" href={links.previewHref}>
                公开预览
              </Link>
            ) : null}
            <ActionMenu
              items={[
                ...(links.inspectionsHref
                  ? [{ href: links.inspectionsHref, label: "查看检测" }]
                  : []),
                ...(canEdit && links.editHref
                  ? [{ href: links.editHref, label: "调整价格 / 启停状态" }]
                  : []),
                ...(canCompose
                  ? [
                      {
                        label: "新建待办",
                        onClick: () => {
                          setComposerKind("todo");
                          setComposerOpen(true);
                        },
                      },
                    ]
                  : []),
                { href: links.listHref, label: "返回产品管理" },
              ]}
            />
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
          { label: "产品", href: links.listHref },
          { label: product.displayName },
        ]}
        eyebrow="产品详情"
        meta={[
          { label: "所属行业", value: industryLabel },
          { label: "建议售价", value: formatProductMoney(product.suggestedPrice) },
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

      <div className="metrics">
        <StatCard
          label="建议售价"
          note="正式报价默认使用的标准单价。"
          value={formatProductMoney(product.suggestedPrice)}
        />
        <StatCard
          label="引用次数"
          note="当前产品进入正式报价链路的累计次数。"
          value={String(product.referenceCount ?? 0)}
        />
        <StatCard
          label="关联网检测"
          note="直接从产品主档查看最新检测进度。"
          value={String(inspectionItems.length)}
        />
        <StatCard
          label="最近更新"
          note="最近一次影响价格、模板或文案的修改时间。"
          value={formatDateLabel(product.updatedAt, {
            hour: "2-digit",
            minute: "2-digit",
            month: "2-digit",
            day: "2-digit",
          })}
        />
      </div>

      <section className="detail-layout">
        <div className="workspace-main">
          <SectionCard
            description="先确认这条资产是什么、归属哪个行业，以及在正式报价中应该按什么结构被调用。"
            title="资产档案"
          >
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
                <span>行业归属</span>
                <strong>{industryLabel}</strong>
              </article>
              <article className="detail-info-card">
                <span>规格 / 单位</span>
                <strong>
                  {product.specification || "未填写"} / {product.unit || "未填写"}
                </strong>
              </article>
              <article className="detail-info-card">
                <span>企业标准号</span>
                <strong>{product.standardNumber || "未填写"}</strong>
              </article>
              <article className="detail-info-card">
                <span>当前状态</span>
                <strong>{productStatusLabel(product.enabled)}</strong>
              </article>
            </div>
          </SectionCard>

          <SectionCard
            description="把客户会看到的介绍、适用场景和标签卖点沉淀在同一处，避免报价文案前后不一致。"
            title="文案与展示资料"
          >
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
                <span>内部备注</span>
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
          </SectionCard>

          <SectionCard
            description="这组设置决定产品是否能被前台调用，以及方案和报价单会按什么模板输出。"
            title="报价规则与可见范围"
          >
            <div className="detail-info-grid">
              <article className="detail-info-card">
                <span>默认单价</span>
                <strong>{formatProductMoney(product.suggestedPrice)}</strong>
              </article>
              <article className="detail-info-card">
                <span>默认模板</span>
                <strong>
                  {outputTemplateLabelMap[product.outputTemplateType] ??
                    product.outputTemplateType}
                </strong>
              </article>
              <article className="detail-info-card">
                <span>可适用行业</span>
                <strong>{product.industryGroup?.name || "待补行业规则"}</strong>
              </article>
              <article className="detail-info-card">
                <span>允许参与报价</span>
                <strong>{product.quoteEnabled ? "允许" : "关闭"}</strong>
              </article>
              <article className="detail-info-card">
                <span>可见范围</span>
                <strong>{visibilityLabel}</strong>
              </article>
              <article className="detail-info-card">
                <span>最低保护价</span>
                <strong>未设置</strong>
              </article>
            </div>
          </SectionCard>

          <div id="references">
            <SectionCard
              description="直接看到这个产品最近被哪些报价调用，判断它是否已经进入稳定复用状态。"
              title="最近引用记录"
            >
              {recentReferences.length ? (
                <DataTable>
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
                    {recentReferences.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.quotation?.quotationNo || "未关联报价"}</strong>
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
                    ))}
                  </tbody>
                </DataTable>
              ) : (
                <EmptyState
                  description="当前这条产品还没有正式落到报价里，建议先检查命名、模板和场景说明是否足够清楚。"
                  title="暂无引用记录"
                />
              )}
            </SectionCard>
          </div>

          <SectionCard
            description="先把最近一次修改和基础维护状态暴露出来，后续可以继续接审计日志和附件历史。"
            title="版本与维护"
          >
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
          </SectionCard>
        </div>

        <aside className="workspace-side sticky-side">
          <SummaryCard
            description="保存前先看清这条产品当前是否可用、走哪套模板，以及对谁可见。"
            title="当前摘要"
          >
            <div className="summary-list">
              <div className="summary-row">
                <span>所属行业</span>
                <strong>{industryLabel}</strong>
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
          </SummaryCard>

          <SummaryCard
            description="直接确认使用频率、最近一次落单情况，以及这条产品当前的可复用程度。"
            title="使用情况"
          >
            <div className="summary-list">
              <div className="summary-row">
                <span>引用次数</span>
                <strong>{product.referenceCount ?? 0}</strong>
              </div>
              <div className="summary-row">
                <span>最近报价时间</span>
                <strong>
                  {lastReference?.quotation?.createdAt
                    ? formatDateLabel(lastReference.quotation.createdAt)
                    : "暂无"}
                </strong>
              </div>
              <div className="summary-row">
                <span>最近报价客户</span>
                <strong>{lastReference?.quotation?.customer?.name || "暂无"}</strong>
              </div>
              <div className="summary-row">
                <span>当前可见</span>
                <strong>{visibilityLabel}</strong>
              </div>
            </div>
          </SummaryCard>

          <section className="panel stack">
            <div className="section-heading">
              <h3>风险提醒</h3>
              <p>优先关注停用、缺模板、低复用和最近变更这些直接影响报价链路的问题。</p>
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
              <h3>关联检测</h3>
              <p>从产品主档直接看到最近检测、进度和付款状态，避免信息分散。</p>
            </div>

            {inspectionError ? <div className="danger-text small">{inspectionError}</div> : null}

            <div className="focus-list">
              {inspectionItems.length ? (
                inspectionItems.map((item) => (
                  <article className="list-card" key={item.id}>
                    <div className="detail-block__header">
                      <div>
                        <strong>{item.title}</strong>
                        <div className="small muted">{item.inspectionNo}</div>
                      </div>
                      <span className="status-pill neutral">
                        {item.submittedAt
                          ? formatDateLabel(item.submittedAt)
                          : formatDateLabel(item.updatedAt)}
                      </span>
                    </div>
                    <p>{item.latestTimeline?.content || item.inspectionTarget}</p>
                    <div className="small muted">
                      {inspectionStatusLabel(item.status)} ·{" "}
                      {inspectionPaymentStatusLabel(item.paymentStatus)}
                    </div>
                    {inspectionDetailHrefBuilder ? (
                      <Link
                        className="button secondary inline"
                        href={inspectionDetailHrefBuilder(item.id)}
                      >
                        查看详情
                      </Link>
                    ) : null}
                  </article>
                ))
              ) : (
                <EmptyState
                  description="当前还没有和这条产品绑定的检测记录，后续送检和报告可以继续从这里进入。"
                  title="暂无关联检测"
                />
              )}
            </div>

            {links.newInspectionHref || links.inspectionsHref ? (
              <div className="action-row">
                {links.newInspectionHref ? (
                  <Link className="button inline" href={links.newInspectionHref}>
                    新建检测
                  </Link>
                ) : null}
                {links.inspectionsHref ? (
                  <Link className="button secondary inline" href={links.inspectionsHref}>
                    查看全部检测
                  </Link>
                ) : null}
              </div>
            ) : null}
          </section>

          <BusinessFilePanel
            businessId={product.id}
            businessType="PRODUCT"
            canUpload={canManageFiles}
            canView={canManageFiles}
            categoryOptions={[
              { value: "产品资料", label: "产品资料" },
              { value: "检测附件", label: "检测附件" },
              { value: "客户交付", label: "客户交付" },
              { value: "内部资料", label: "内部资料" },
            ]}
            defaultCategory="产品资料"
            description="标签图、检测资料、说明书和客户交付版本统一归在产品主档下。"
            emptyText="当前产品还没有关联档案附件。"
            title="产品档案"
          />

          <section className="panel stack">
            <div className="section-heading">
              <h3>快捷操作</h3>
              <p>把编辑、协作和跳转动作收在一起，避免在多个页面间来回找入口。</p>
            </div>

            <div className="focus-list">
              {canEdit && links.editHref ? (
                <Link className="button secondary inline" href={links.editHref}>
                  编辑产品
                </Link>
              ) : null}
              {canCompose ? (
                <button
                  className="button secondary"
                  onClick={() => {
                    setComposerKind("reminder");
                    setComposerOpen(true);
                  }}
                  type="button"
                >
                  新增提醒
                </button>
              ) : null}
              <Link className="button secondary inline" href="#references">
                查看引用报价
              </Link>
              {links.newQuoteHref ? (
                <Link className="button inline" href={links.newQuoteHref}>
                  新建相关报价
                </Link>
              ) : null}
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
              <>
                <div className="metrics">
                  <StatCard
                    label="最近引用数"
                    note="当前 tab 展示的最近引用条目数量。"
                    value={String(recentReferences.length)}
                  />
                  <StatCard
                    label="最近引用金额"
                    note="按当前展示记录的行金额汇总。"
                    value={formatProductMoney(recentReferenceAmount)}
                  />
                  <StatCard
                    label="覆盖客户"
                    note="最近引用涉及到的客户数量。"
                    value={String(recentReferenceCustomerCount)}
                  />
                </div>

                <div className="focus-list">
                  {recentReferences.length ? (
                    recentReferences.map((item) => (
                      <article className="list-card" key={item.id}>
                        <div className="detail-block__header">
                          <div>
                            <strong>{item.quotation?.quotationNo || "未关联报价"}</strong>
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
                          {formatProductMoney(item.lineTotal)}，单价{" "}
                          {formatProductMoney(item.unitPrice)}。
                        </p>
                      </article>
                    ))
                  ) : (
                    <div className="empty">当前没有可展示的引用记录。</div>
                  )}
                </div>
              </>
            ),
          },
          {
            key: "changes",
            label: "变更日志",
            content: (
              <div className="focus-list">
                {changeEvents.map((event) => (
                  <article className="list-card" key={event.title}>
                    <div className="detail-block__header">
                      <div>
                        <strong>{event.title}</strong>
                        <div className="small muted">{event.description}</div>
                      </div>
                      <span className={`status-pill ${event.tone}`}>{event.badge}</span>
                    </div>
                    <p>{event.detail}</p>
                  </article>
                ))}
              </div>
            ),
          },
          {
            key: "attachments",
            label: "附件",
            content: (
              <>
                <div className="detail-info-grid">
                  {assetCards.map((item) => (
                    <article className="detail-info-card" key={item.title}>
                      <span>{item.title}</span>
                      <strong>{item.value}</strong>
                      <div className="small muted">{item.note}</div>
                    </article>
                  ))}
                </div>

                {product.imageUrl || product.tagScreenshotUrl ? (
                  <div className="detail-media-grid">
                    {product.imageUrl ? (
                      <article className="detail-media-card">
                        <span>产品图片预览</span>
                        <img alt={product.displayName} src={product.imageUrl} />
                      </article>
                    ) : null}
                    {product.tagScreenshotUrl ? (
                      <article className="detail-media-card">
                        <span>标签截图预览</span>
                        <img
                          alt={`${product.displayName} 标签截图`}
                          src={product.tagScreenshotUrl}
                        />
                      </article>
                    ) : null}
                  </div>
                ) : (
                  <div className="empty">当前还没有可预览的图片资料。</div>
                )}
              </>
            ),
          },
          {
            key: "logs",
            label: "操作日志",
            content: (
              <>
                <div className="metrics">
                  <StatCard
                    label="协作动作"
                    note="当前关联到这条产品的本地工作台事项总数。"
                    value={String(workspaceItems.length)}
                  />
                  <StatCard
                    label="待处理"
                    note="仍处于待跟进状态的事项数量。"
                    value={String(pendingWorkspaceCount)}
                  />
                  <StatCard
                    label="高优先级"
                    note="需要优先处理的协作事项数量。"
                    value={String(highPriorityWorkspaceCount)}
                  />
                </div>

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
              </>
            ),
          },
        ]}
      />

      {canCompose ? (
        <QuickWorkspaceComposer
          assignee={currentUserDisplayName}
          initialKind={composerKind}
          onClose={() => setComposerOpen(false)}
          open={composerOpen}
          relatedHref={links.detailHref}
          relatedId={product.id}
          relatedLabel={product.displayName}
          relatedType="internal"
        />
      ) : null}
    </div>
  );
}
