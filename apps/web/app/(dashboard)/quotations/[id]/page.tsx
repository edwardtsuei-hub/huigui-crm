"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BusinessFilePanel } from "../../../../components/business-files/BusinessFilePanel";
import { DetailTabs } from "../../../../components/dashboard/DetailTabs";
import { EntityDetailHeader } from "../../../../components/dashboard/EntityDetailHeader";
import { QuickWorkspaceComposer } from "../../../../components/dashboard/QuickWorkspaceComposer";
import { ManagementDrawer } from "../../../../components/management/ManagementDrawer";
import {
  apiFetch,
  apiFetchBlob,
  getCurrentUser,
  hasPermission,
} from "../../../../lib/api";
import { buildScheduleCreateHref } from "../../../../lib/schedule";
import { createOrder, fetchOrders } from "../../../../lib/orders";
import {
  WORKSPACE_ITEMS_CHANGED_EVENT,
  bucketDueLabel,
  filterVisibleWorkspaceItems,
  formatDateLabel,
  formatMoney,
  listLocalWorkspaceItems,
  workspaceKindLabel,
  workspacePriorityLabel,
  workspacePriorityTone,
  type LocalWorkspaceItem,
  type WorkspaceItemKind,
} from "../../../../lib/workspace";
import type { ProductRecord } from "../../../../components/products/types";

type QuotationDetail = {
  id: string;
  quotationNo: string;
  type: "AGRICULTURE" | "GENERAL" | "INDUSTRY" | "SERVICE" | "BREEDING";
  subtotal: string;
  discountAmount: string;
  totalAmount: string;
  discountRate?: string;
  discountReason?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
  exportedAt?: string | null;
  status?: string;
  approvalStatus?: string;
  exportApprovalStatus?: string;
  customer: { id: string; name: string };
  creator: { displayName: string; role: { name: string } };
  approvalRequests?: Array<{
    id: string;
    type: string;
    status: string;
    title: string;
    summary?: string | null;
    requiredRoleCode?: string | null;
    createdAt: string;
  }>;
  items: Array<{
    id: string;
    productId?: string | null;
    displayName: string;
    specification?: string | null;
    unit?: string | null;
    quantity: string;
    unitPrice: string;
    originalAmount?: string;
    discountedAmount?: string;
    lineTotal: string;
    note?: string | null;
  }>;
  agriculturePlan?: {
    id: string;
    planName: string;
    plantingMode: string;
    cropSummary?: string | null;
    useGc: boolean;
    gcWaterAmount?: string | null;
  } | null;
};

function quotationTypeLabel(type: string) {
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

function quotationStatusLabel(status?: string) {
  switch (status) {
    case "GENERATED":
      return "已生成";
    case "SENT":
      return "已发送";
    case "WON":
      return "已成交";
    case "LOST":
      return "已失效";
    default:
      return "草稿";
  }
}

function approvalStatusLabel(status?: string) {
  switch (status) {
    case "PENDING":
      return "待审批";
    case "APPROVED":
      return "已通过";
    case "REJECTED":
      return "已驳回";
    default:
      return "无需审批";
  }
}

function approvalStatusTone(status?: string) {
  switch (status) {
    case "APPROVED":
      return "success";
    case "PENDING":
      return "warning";
    case "REJECTED":
      return "danger";
    default:
      return "neutral";
  }
}

function approvalRuleLabel(type: string) {
  switch (type) {
    case "DISCOUNT":
      return "折扣审批";
    case "LOW_PRICE":
      return "低价审批";
    case "EXPORT_QUOTATION":
      return "导出审批";
    default:
      return "审批流程";
  }
}

type OrderTransferFormState = {
  orderDate: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  warehouseName: string;
  remark: string;
};

function nowDateTimeValue() {
  return new Date().toISOString().slice(0, 16);
}

function buildTransferRemark(quotationNo: string) {
  return `由报价 ${quotationNo} 转入`;
}

function createOrderTransferDefaults(detail: QuotationDetail): OrderTransferFormState {
  return {
    orderDate: nowDateTimeValue(),
    recipientName: detail.customer.name,
    recipientPhone: "",
    recipientAddress: "",
    warehouseName: "",
    remark: buildTransferRemark(detail.quotationNo),
  };
}

export default function QuotationDetailPage() {
  const currentUser = getCurrentUser();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<QuotationDetail | null>(null);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [linkedOrder, setLinkedOrder] = useState<{
    id: string;
    orderNo: string;
  } | null>(null);
  const [workspaceItems, setWorkspaceItems] = useState<LocalWorkspaceItem[]>(
    [],
  );
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerKind, setComposerKind] =
    useState<WorkspaceItemKind>("reminder");
  const [reviewLoading, setReviewLoading] = useState<string | null>(null);
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);
  const [orderDrawerError, setOrderDrawerError] = useState("");
  const [orderForm, setOrderForm] = useState<OrderTransferFormState>({
    orderDate: nowDateTimeValue(),
    recipientName: "",
    recipientPhone: "",
    recipientAddress: "",
    warehouseName: "",
    remark: "",
  });
  const [orderActionLoading, setOrderActionLoading] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [quotationResponse, productResponse, orderResponse] =
          await Promise.all([
          apiFetch<QuotationDetail>(`/quotations/${params.id}`),
          apiFetch<ProductRecord[]>("/products"),
          fetchOrders(
            new URLSearchParams({
              quotationId: params.id,
              pageSize: "1",
              includeSystemRecords: "true",
            }),
          ),
        ]);

        if (cancelled) {
          return;
        }

        setDetail(quotationResponse);
        setProducts(productResponse);
        setLinkedOrder(
          orderResponse.items[0]
            ? {
                id: orderResponse.items[0].id,
                orderNo: orderResponse.items[0].orderNo,
              }
            : null,
        );
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "加载报价详情失败",
          );
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
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

  const canExportPdf = hasPermission(
    currentUser,
    "action.quotation.export_pdf",
  );
  const canManageFiles = hasPermission(currentUser, "page.files.center");
  const canApprove = hasPermission(currentUser, "action.quotation.approve");
  const canReject = hasPermission(currentUser, "action.quotation.reject");
  const scheduleCreateHref = useMemo(
    () =>
      detail
        ? buildScheduleCreateHref({
            customerId: detail.customer.id,
            quotationId: detail.id,
            agriculturePlanId: detail.agriculturePlan?.id,
            solutionLabel: detail.agriculturePlan?.planName,
            sourceModule: detail.agriculturePlan ? "方案协同" : "报价推进",
            title: detail.agriculturePlan
              ? `推进 ${detail.agriculturePlan.planName}`
              : `推进 ${detail.quotationNo}`,
          })
        : "/schedule",
    [detail],
  );

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const lowPriceItems = useMemo(
    () =>
      (detail?.items ?? []).filter((item) => {
        const product = item.productId ? productMap.get(item.productId) : null;
        return product?.suggestedPrice
          ? Number(item.unitPrice) < Number(product.suggestedPrice)
          : false;
      }),
    [detail?.items, productMap],
  );

  const riskItems = useMemo(() => {
    if (!detail) {
      return [];
    }

    const nextRisks: string[] = [];
    const ageInDays = Math.floor(
      (Date.now() - new Date(detail.createdAt).getTime()) / 86400000,
    );

    if (
      detail.approvalStatus === "PENDING" ||
      detail.exportApprovalStatus === "PENDING"
    ) {
      nextRisks.push("当前报价存在待审批流程，导出或对外发送前需先完成审批。");
    }

    if (detail.approvalStatus === "REJECTED") {
      nextRisks.push("审批曾被驳回，建议先确认折扣与价格口径再继续推进。");
    }

    if (lowPriceItems.length) {
      nextRisks.push(
        `有 ${lowPriceItems.length} 个品项低于建议售价，需确认是否触发低价审批。`,
      );
    }

    if (ageInDays >= 7 && detail.status !== "WON") {
      nextRisks.push(
        `报价已创建 ${ageInDays} 天，建议尽快确认有效性与客户反馈。`,
      );
    }

    if (detail.exportedAt && !workspaceItems.length) {
      nextRisks.push(
        "报价已导出，但还没有关联提醒或待办，建议补一条跟进事项。",
      );
    }

    if (!nextRisks.length) {
      nextRisks.push("当前报价结构完整，可继续执行审批、导出或客户沟通。");
    }

    return nextRisks;
  }, [detail, lowPriceItems.length, workspaceItems.length]);

  const reminderRows = useMemo(
    () =>
      workspaceItems
        .map((item) => ({
          ...item,
          sortAt: item.dueAt || item.createdAt,
        }))
        .sort(
          (left, right) =>
            new Date(left.sortAt).getTime() - new Date(right.sortAt).getTime(),
        ),
    [workspaceItems],
  );

  useEffect(() => {
    if (!detail) {
      return;
    }

    setOrderForm(createOrderTransferDefaults(detail));
    setOrderDrawerError("");
  }, [detail]);

  const orderTransferBlockers = useMemo(() => {
    if (!detail) {
      return [];
    }

    const blockers: string[] = [];

    if (linkedOrder) {
      blockers.push(`这张报价已经关联订单 ${linkedOrder.orderNo}，请直接查看订单。`);
    }

    if (detail.approvalStatus === "PENDING") {
      blockers.push("折扣审批尚未完成，当前不能直接转订单。");
    }

    if (detail.approvalStatus === "REJECTED") {
      blockers.push("这张报价已被驳回，请先调整价格或折扣后再转单。");
    }

    if (!detail.items.length) {
      blockers.push("当前报价没有可转入订单的品项明细。");
    }

    return blockers;
  }, [detail, linkedOrder]);

  const orderTransferWarnings = useMemo(() => {
    if (!detail) {
      return [];
    }

    const warnings: string[] = [];

    if (detail.exportApprovalStatus === "PENDING") {
      warnings.push("导出审批仍在处理中，但这不会阻止内部先创建订单。");
    }

    if (lowPriceItems.length) {
      warnings.push(
        `当前有 ${lowPriceItems.length} 个品项低于建议价，建议转单前再确认价格口径。`,
      );
    }

    return warnings;
  }, [detail, lowPriceItems.length]);

  const timelineRows = useMemo(() => {
    if (!detail) {
      return [];
    }

    return [
      {
        id: `created-${detail.id}`,
        time: detail.createdAt,
        title: "创建报价",
        description: `${detail.creator.displayName} 创建了这张${quotationTypeLabel(detail.type)}。`,
      },
      ...(detail.approvalRequests ?? []).map((request) => ({
        id: request.id,
        time: request.createdAt,
        title: approvalRuleLabel(request.type),
        description: `${approvalStatusLabel(request.status)} · ${request.summary || request.title}`,
      })),
      ...(detail.exportedAt
        ? [
            {
              id: `exported-${detail.id}`,
              time: detail.exportedAt,
              title: "导出 PDF",
              description: "正式报价已经导出，可用于对外发送或归档。",
            },
          ]
        : []),
      ...workspaceItems.map((item) => ({
        id: `local-${item.id}`,
        time: item.dueAt || item.createdAt,
        title: `新增${workspaceKindLabel(item.kind)}`,
        description: item.summary,
      })),
    ].sort(
      (left, right) =>
        new Date(right.time).getTime() - new Date(left.time).getTime(),
    );
  }, [detail, workspaceItems]);

  if (!detail) {
    return (
      <section className="panel">{error || "正在加载报价详情..."}</section>
    );
  }

  async function handleReviewApproval(
    type: "discount" | "export",
    decision: "approve" | "reject",
  ) {
    if (!detail) {
      return;
    }

    const quotationId = detail.id;
    setReviewLoading(`${type}-${decision}`);

    try {
      const nextDetail = await apiFetch<QuotationDetail>(
        `/quotations/${quotationId}/review-approval`,
        {
          method: "POST",
          body: JSON.stringify({ type, decision }),
        },
      ).then(() => apiFetch<QuotationDetail>(`/quotations/${quotationId}`));

      setDetail(nextDetail);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "审批处理失败",
      );
    } finally {
      setReviewLoading(null);
    }
  }

  async function handleOrderAction() {
    if (!detail) {
      return;
    }

    if (linkedOrder) {
      router.push(`/orders/${linkedOrder.id}`);
      return;
    }

    setOrderDrawerError("");
    setOrderDrawerOpen(true);
  }

  async function handleExportPdf() {
    if (!detail || pdfExporting) {
      return;
    }

    setPdfExporting(true);

    const previewWindow = window.open("", "_blank", "noopener,noreferrer");

    try {
      const pdfBlob = await apiFetchBlob(`/quotations/${detail.id}/pdf`);
      const objectUrl = window.URL.createObjectURL(pdfBlob);

      if (previewWindow) {
        previewWindow.location.href = objectUrl;
      } else {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
      }

      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 60_000);
    } catch (requestError) {
      previewWindow?.close();
      setError(
        requestError instanceof Error ? requestError.message : "导出 PDF 失败",
      );
    } finally {
      setPdfExporting(false);
    }
  }

  async function handleConfirmOrderTransfer() {
    if (!detail || orderTransferBlockers.length) {
      return;
    }

    setOrderActionLoading(true);
    setOrderDrawerError("");

    try {
      const response = await createOrder({
        customerId: detail.customer.id,
        quotationId: detail.id,
        orderDate: orderForm.orderDate || nowDateTimeValue(),
        recipientName: orderForm.recipientName || detail.customer.name,
        recipientPhone: orderForm.recipientPhone || undefined,
        recipientAddress: orderForm.recipientAddress || undefined,
        warehouseName: orderForm.warehouseName || undefined,
        remark:
          orderForm.remark || buildTransferRemark(detail.quotationNo),
        items: detail.items.map((item) => ({
          productId: item.productId ?? undefined,
          itemName: item.displayName,
          spec: item.specification ?? undefined,
          unit: item.unit ?? undefined,
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
          remark: item.note ?? undefined,
        })),
      });

      setLinkedOrder({
        id: response.order.id,
        orderNo: response.order.orderNo,
      });
      setOrderDrawerOpen(false);
      router.push(`/orders/${response.order.id}`);
    } catch (requestError) {
      setOrderDrawerError(
        requestError instanceof Error ? requestError.message : "转订单失败",
      );
    } finally {
      setOrderActionLoading(false);
    }
  }

  return (
    <div className="workspace-stack">
      <EntityDetailHeader
        actions={
          <>
            <button
              className={linkedOrder ? "button secondary inline" : "button inline"}
              onClick={handleOrderAction}
              type="button"
            >
              {orderActionLoading
                ? linkedOrder
                  ? "正在打开订单..."
                  : "正在创建订单..."
                : linkedOrder
                  ? "查看订单"
                  : "转单确认"}
            </button>
            {canExportPdf ? (
              <button
                className="button inline"
                disabled={pdfExporting}
                onClick={() => void handleExportPdf()}
                type="button"
              >
                {pdfExporting ? "正在导出..." : "导出 PDF"}
              </button>
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
            <Link className="button secondary inline" href={scheduleCreateHref}>
              新增日程
            </Link>
            <Link
              className="button secondary inline"
              href={`/customers/${detail.customer.id}`}
            >
              查看客户
            </Link>
            <details className="menu-popover">
              <summary className="button ghost inline">更多操作</summary>
              <div className="menu-popover__panel">
                <button
                  className="menu-popover__item"
                  onClick={handleOrderAction}
                  type="button"
                >
                  {linkedOrder ? "查看订单" : "转单确认"}
                </button>
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
                <Link className="menu-popover__item" href={scheduleCreateHref}>
                  新增日程
                </Link>
                <Link className="menu-popover__item" href="/quotations">
                  返回报价档案
                </Link>
              </div>
            </details>
          </>
        }
        badges={[
          {
            label: quotationStatusLabel(detail.status),
            tone: detail.status === "LOST" ? "danger" : "neutral",
          },
          {
            label: approvalStatusLabel(detail.approvalStatus),
            tone: approvalStatusTone(detail.approvalStatus) as
              | "neutral"
              | "success"
              | "warning"
              | "danger",
          },
        ]}
        breadcrumbs={[
          { label: "报价记录", href: "/quotations" },
          { label: detail.quotationNo },
        ]}
        eyebrow="报价详情"
        meta={[
          { label: "客户", value: detail.customer.name },
          { label: "类型", value: quotationTypeLabel(detail.type) },
          { label: "负责人", value: detail.creator.displayName },
          {
            label: "总金额",
            value: formatMoney(detail.totalAmount),
            tone: "success",
          },
          {
            label: "更新时间",
            value: formatDateLabel(detail.updatedAt),
          },
        ]}
        subtitle={`${detail.customer.name} · ${detail.creator.displayName} / ${detail.creator.role.name} · 创建于 ${formatDateLabel(detail.createdAt)}`}
        title={detail.quotationNo}
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      <section className="detail-layout">
        <div className="workspace-main">
          <section className="panel stack">
            <div className="section-heading">
              <h3>报价明细</h3>
              <p>
                先核对品项、数量、单价和折扣，再决定是否需要审批或重新生成。
              </p>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>产品 / 项目名称</th>
                    <th>规格</th>
                    <th>数量</th>
                    <th>单价</th>
                    <th>折扣后小计</th>
                    <th>风险提示</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((item) => {
                    const product = item.productId
                      ? productMap.get(item.productId)
                      : null;
                    const isLowPrice = product?.suggestedPrice
                      ? Number(item.unitPrice) < Number(product.suggestedPrice)
                      : false;

                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.displayName}</strong>
                          {item.note ? (
                            <div className="small muted">{item.note}</div>
                          ) : null}
                          {item.productId ? (
                            <div className="mt-8">
                              <Link
                                className="status-pill neutral"
                                href={`/products/${item.productId}`}
                              >
                                查看产品详情
                              </Link>
                            </div>
                          ) : null}
                        </td>
                        <td>{item.specification || "--"}</td>
                        <td>
                          {item.quantity} {item.unit || ""}
                        </td>
                        <td>{formatMoney(item.unitPrice)}</td>
                        <td>{formatMoney(item.lineTotal)}</td>
                        <td>
                          {isLowPrice ? (
                            <span className="status-pill danger">
                              低于建议价 {formatMoney(product?.suggestedPrice)}
                            </span>
                          ) : (
                            <span className="status-pill neutral">正常</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>金额汇总</h3>
              <p>把小计、优惠、总金额和折扣比例拆开，避免只看最终总价。</p>
            </div>

            <div className="detail-info-grid">
              <article className="detail-info-card">
                <span>小计</span>
                <strong>{formatMoney(detail.subtotal)}</strong>
              </article>
              <article className="detail-info-card">
                <span>优惠金额</span>
                <strong>{formatMoney(detail.discountAmount)}</strong>
              </article>
              <article className="detail-info-card">
                <span>总金额</span>
                <strong>{formatMoney(detail.totalAmount)}</strong>
              </article>
              <article className="detail-info-card">
                <span>折扣比例</span>
                <strong>
                  {detail.discountRate ? `${detail.discountRate}%` : "0%"}
                </strong>
              </article>
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>报价说明</h3>
              <p>正式对外说明与内部备注统一在这里，不和金额摘要混在一起。</p>
            </div>

            <div className="grid-2">
              <article className="detail-text-card">
                <span>优惠原因</span>
                <p>{detail.discountReason || "当前未填写优惠原因。"}</p>
              </article>
              <article className="detail-text-card">
                <span>备注说明</span>
                <p>{detail.remark || "当前未填写备注说明。"}</p>
              </article>
            </div>

            {detail.agriculturePlan ? (
              <article className="detail-text-card">
                <span>农业方案补充</span>
                <p>
                  方案名称：{detail.agriculturePlan.planName}
                  <br />
                  种植模式：
                  {detail.agriculturePlan.plantingMode === "organic"
                    ? "有机"
                    : "常规"}
                  <br />
                  作物汇总：{detail.agriculturePlan.cropSummary || "--"}
                  <br />
                  GC 使用：{detail.agriculturePlan.useGc ? "是" : "否"}
                  {detail.agriculturePlan.gcWaterAmount
                    ? ` · 水量 ${detail.agriculturePlan.gcWaterAmount}`
                    : ""}
                </p>
              </article>
            ) : null}
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>审批信息</h3>
              <p>如果折扣或导出走了审批，这里直接展示当前节点和状态。</p>
            </div>

            <div className="focus-list">
              {detail.approvalRequests?.length ? (
                detail.approvalRequests.map((request) => (
                  <article className="list-card" key={request.id}>
                    <div className="detail-block__header">
                      <div>
                        <strong>{request.title}</strong>
                        <div className="small muted">
                          {approvalRuleLabel(request.type)} ·{" "}
                          {formatDateLabel(request.createdAt)}
                        </div>
                      </div>
                      <span
                        className={`status-pill ${approvalStatusTone(request.status)}`}
                      >
                        {approvalStatusLabel(request.status)}
                      </span>
                    </div>
                    <p>{request.summary || "当前审批未补充更多说明。"}</p>
                    {request.requiredRoleCode ? (
                      <div className="small muted">
                        审批角色：{request.requiredRoleCode}
                      </div>
                    ) : null}
                    {request.status === "PENDING" &&
                    (canApprove || canReject) ? (
                      <div className="action-row">
                        {canApprove ? (
                          <button
                            className="button inline"
                            disabled={
                              reviewLoading ===
                              `${request.type === "EXPORT_QUOTATION" ? "export" : "discount"}-approve`
                            }
                            onClick={() =>
                              void handleReviewApproval(
                                request.type === "EXPORT_QUOTATION"
                                  ? "export"
                                  : "discount",
                                "approve",
                              )
                            }
                            type="button"
                          >
                            审批通过
                          </button>
                        ) : null}
                        {canReject ? (
                          <button
                            className="button ghost inline"
                            disabled={
                              reviewLoading ===
                              `${request.type === "EXPORT_QUOTATION" ? "export" : "discount"}-reject`
                            }
                            onClick={() =>
                              void handleReviewApproval(
                                request.type === "EXPORT_QUOTATION"
                                  ? "export"
                                  : "discount",
                                "reject",
                              )
                            }
                            type="button"
                          >
                            驳回
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="empty">当前报价没有挂起中的审批流程。</div>
              )}
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>导出与发送记录</h3>
              <p>保留 PDF 导出痕迹，便于判断是否已经进入对外流转环节。</p>
            </div>

            <div className="detail-info-grid">
              <article className="detail-info-card">
                <span>PDF 导出状态</span>
                <strong>{detail.exportedAt ? "已导出" : "未导出"}</strong>
              </article>
              <article className="detail-info-card">
                <span>最近导出时间</span>
                <strong>
                  {detail.exportedAt
                    ? formatDateLabel(detail.exportedAt)
                    : "暂无"}
                </strong>
              </article>
              <article className="detail-info-card">
                <span>导出审批</span>
                <strong>
                  {approvalStatusLabel(detail.exportApprovalStatus)}
                </strong>
              </article>
              <article className="detail-info-card">
                <span>发送状态</span>
                <strong>后续可接入</strong>
              </article>
            </div>
          </section>
        </div>

        <aside className="workspace-side sticky-side">
          <section className="summary-card stack">
            <div className="section-heading">
              <h3>报价状态卡</h3>
              <p>固定确认这张报价当前能不能发、能不能导。</p>
            </div>

            <div className="summary-list">
              <div className="summary-row">
                <span>当前状态</span>
                <strong>{quotationStatusLabel(detail.status)}</strong>
              </div>
              <div className="summary-row">
                <span>审批状态</span>
                <strong>{approvalStatusLabel(detail.approvalStatus)}</strong>
              </div>
              <div className="summary-row">
                <span>导出审批</span>
                <strong>
                  {approvalStatusLabel(detail.exportApprovalStatus)}
                </strong>
              </div>
              <div className="summary-row">
                <span>有效判断</span>
                <strong>
                  {detail.exportedAt ? "已进入对外流转" : "仍在内部校验"}
                </strong>
              </div>
              <div className="summary-row">
                <span>关联订单</span>
                <strong>{linkedOrder ? linkedOrder.orderNo : "未转订单"}</strong>
              </div>
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>金额摘要卡</h3>
              <p>导出前在右侧也能快速校验金额结构。</p>
            </div>

            <div className="summary-list">
              <div className="summary-row">
                <span>小计</span>
                <strong>{formatMoney(detail.subtotal)}</strong>
              </div>
              <div className="summary-row">
                <span>优惠金额</span>
                <strong>{formatMoney(detail.discountAmount)}</strong>
              </div>
              <div className="summary-row">
                <span>总金额</span>
                <strong>{formatMoney(detail.totalAmount)}</strong>
              </div>
              <div className="summary-row">
                <span>折扣比例</span>
                <strong>
                  {detail.discountRate ? `${detail.discountRate}%` : "0%"}
                </strong>
              </div>
              <div className="summary-row">
                <span>低价项</span>
                <strong>{lowPriceItems.length} 个</strong>
              </div>
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>风险提示卡</h3>
              <p>快速指出今天需要先处理哪类风险，再决定是否继续推进。</p>
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
              <p>高频动作直接放在右侧，不让用户在正文区来回跳转。</p>
            </div>

            <div className="focus-list">
              <button
                className={linkedOrder ? "button secondary" : "button inline"}
                onClick={handleOrderAction}
                type="button"
              >
                {linkedOrder ? `查看订单 ${linkedOrder.orderNo}` : "转单确认"}
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  setComposerKind("todo");
                  setComposerOpen(true);
                }}
                type="button"
              >
                发起待办
              </button>
              <Link
                className="button secondary inline"
                href={scheduleCreateHref}
              >
                新增日程
              </Link>
              {canExportPdf ? (
                <button
                  className="button secondary inline"
                  disabled={pdfExporting}
                  onClick={() => void handleExportPdf()}
                  type="button"
                >
                  {pdfExporting ? "正在导出..." : "导出 PDF"}
                </button>
              ) : null}
              <Link
                className="button inline"
                href={`/customers/${detail.customer.id}`}
              >
                跳转客户详情
              </Link>
            </div>
          </section>

          <BusinessFilePanel
            businessId={detail.id}
            businessType="QUOTATION"
            canUpload={canManageFiles}
            canView={canManageFiles}
            categoryOptions={[
              { value: "报价附件", label: "报价附件" },
              { value: "客户交付", label: "客户交付" },
              { value: "合同文件", label: "合同文件" },
              { value: "内部资料", label: "内部资料" },
            ]}
            defaultCategory="报价附件"
            description="报价 PDF、客户确认资料和内部核价附件都归在这里。"
            emptyText="当前报价还没有关联附件。"
            title="报价附件"
          />
        </aside>
      </section>

      <DetailTabs
        initialKey="timeline"
        tabs={[
          {
            key: "timeline",
            label: "审批时间线",
            content: (
              <div className="focus-list">
                {timelineRows.map((row) => (
                  <article className="list-card" key={row.id}>
                    <div className="detail-block__header">
                      <strong>{row.title}</strong>
                      <span className="status-pill neutral">
                        {formatDateLabel(row.time)}
                      </span>
                    </div>
                    <p>{row.description}</p>
                  </article>
                ))}
              </div>
            ),
          },
          {
            key: "reminders",
            label: "本地事项",
            content: (
              <div className="focus-list">
                {reminderRows.length ? (
                  reminderRows.map((item) => (
                    <article className="list-card" key={item.id}>
                      <div className="detail-block__header">
                        <div>
                          <strong>{item.title}</strong>
                          <div className="small muted">{item.summary}</div>
                        </div>
                        <span
                          className={`status-pill ${workspacePriorityTone(item.priority)}`}
                        >
                          {bucketDueLabel(item.dueAt || item.createdAt)}
                        </span>
                      </div>
                      <div className="small muted">
                        {item.dueAt
                          ? formatDateLabel(item.dueAt)
                          : formatDateLabel(item.createdAt)}{" "}
                        · {workspacePriorityLabel(item.priority)}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty">当前报价还没有关联本地提醒或待办。</div>
                )}
              </div>
            ),
          },
          {
            key: "exports",
            label: "导出记录",
            content: detail.exportedAt ? (
              <div className="focus-list">
                <article className="list-card">
                  <div className="detail-block__header">
                    <strong>{detail.quotationNo}.pdf</strong>
                    <span className="status-pill success">已导出</span>
                  </div>
                  <p>导出时间：{formatDateLabel(detail.exportedAt)}</p>
                </article>
              </div>
            ) : (
              <div className="empty">当前还没有导出记录。</div>
            ),
          },
          {
            key: "logs",
            label: "操作日志",
            content: (
              <div className="focus-list">
                <article className="list-card">
                  <div className="detail-block__header">
                    <strong>金额与折扣摘要</strong>
                    <span className="status-pill neutral">
                      {formatDateLabel(detail.updatedAt)}
                    </span>
                  </div>
                  <p>
                    小计 {formatMoney(detail.subtotal)}，优惠{" "}
                    {formatMoney(detail.discountAmount)}， 总价{" "}
                    {formatMoney(detail.totalAmount)}。
                  </p>
                </article>
                <article className="list-card">
                  <div className="detail-block__header">
                    <strong>低价检查</strong>
                    <span
                      className={`status-pill ${lowPriceItems.length ? "danger" : "success"}`}
                    >
                      {lowPriceItems.length ? "需复核" : "正常"}
                    </span>
                  </div>
                  <p>
                    {lowPriceItems.length
                      ? `${lowPriceItems.map((item) => item.displayName).join("、")} 低于建议价。`
                      : "当前报价品项未发现低于建议价的情况。"}
                  </p>
                </article>
              </div>
            ),
          },
        ]}
      />

      <ManagementDrawer
        actions={
          <>
            <button
              className="button secondary inline"
              onClick={() => {
                setOrderDrawerOpen(false);
                setOrderDrawerError("");
              }}
              type="button"
            >
              取消
            </button>
            <button
              className="button inline"
              disabled={orderActionLoading || orderTransferBlockers.length > 0}
              onClick={() => void handleConfirmOrderTransfer()}
              type="button"
            >
              {orderActionLoading ? "正在创建订单..." : "确认创建订单"}
            </button>
          </>
        }
        eyebrow="转单确认"
        onClose={() => {
          setOrderDrawerOpen(false);
          setOrderDrawerError("");
        }}
        open={orderDrawerOpen}
        size="medium"
        subtitle="先确认这张报价是否适合转入订单，再补齐最必要的履约信息。"
        title={detail ? `由 ${detail.quotationNo} 转入订单` : "转单确认"}
      >
        {orderDrawerError ? <div className="danger-text small">{orderDrawerError}</div> : null}

        <section className="drawer-section">
          <div className="summary-card stack">
            <div className="section-heading">
              <h3>转单摘要</h3>
              <p>先确认这次转单的业务对象、金额规模和是否已有拦截项。</p>
            </div>

            <div className="summary-list">
              <div className="summary-row">
                <span>报价单号</span>
                <strong>{detail.quotationNo}</strong>
              </div>
              <div className="summary-row">
                <span>客户</span>
                <strong>{detail.customer.name}</strong>
              </div>
              <div className="summary-row">
                <span>总金额</span>
                <strong>{formatMoney(detail.totalAmount)}</strong>
              </div>
              <div className="summary-row">
                <span>品项数</span>
                <strong>{detail.items.length} 项</strong>
              </div>
              <div className="summary-row">
                <span>折扣审批</span>
                <strong>{approvalStatusLabel(detail.approvalStatus)}</strong>
              </div>
              <div className="summary-row">
                <span>导出审批</span>
                <strong>{approvalStatusLabel(detail.exportApprovalStatus)}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="drawer-section">
          <h4>转单判断</h4>
          <div className="focus-list">
            {orderTransferBlockers.length ? (
              orderTransferBlockers.map((item) => (
                <article className="list-card" key={item}>
                  <div className="detail-block__header">
                    <strong>当前不能直接转单</strong>
                    <span className="status-pill danger">拦截</span>
                  </div>
                  <p>{item}</p>
                </article>
              ))
            ) : (
              <article className="list-card">
                <div className="detail-block__header">
                  <strong>这张报价可以进入转单</strong>
                  <span className="status-pill success">可创建</span>
                </div>
                <p>折扣审批、品项明细和已关联订单检查已通过，可以继续补齐履约信息。</p>
              </article>
            )}

            {orderTransferWarnings.map((item) => (
              <article className="list-card" key={item}>
                <div className="detail-block__header">
                  <strong>提醒</strong>
                  <span className="status-pill warning">提醒</span>
                </div>
                <p>{item}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="drawer-section">
          <h4>转单补充信息</h4>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="quotation-order-date">下单时间</label>
              <input
                id="quotation-order-date"
                onChange={(event) =>
                  setOrderForm((current) => ({
                    ...current,
                    orderDate: event.target.value,
                  }))
                }
                type="datetime-local"
                value={orderForm.orderDate}
              />
            </div>

            <div className="field">
              <label htmlFor="quotation-order-recipient">收货人</label>
              <input
                id="quotation-order-recipient"
                onChange={(event) =>
                  setOrderForm((current) => ({
                    ...current,
                    recipientName: event.target.value,
                  }))
                }
                placeholder="默认沿用客户名称，可按实际收货人修改"
                value={orderForm.recipientName}
              />
            </div>

            <div className="field">
              <label htmlFor="quotation-order-phone">联系电话</label>
              <input
                id="quotation-order-phone"
                onChange={(event) =>
                  setOrderForm((current) => ({
                    ...current,
                    recipientPhone: event.target.value,
                  }))
                }
                placeholder="例如：13800000000"
                value={orderForm.recipientPhone}
              />
            </div>

            <div className="field">
              <label htmlFor="quotation-order-warehouse">仓库</label>
              <input
                id="quotation-order-warehouse"
                onChange={(event) =>
                  setOrderForm((current) => ({
                    ...current,
                    warehouseName: event.target.value,
                  }))
                }
                placeholder="例如：青岛一号仓"
                value={orderForm.warehouseName}
              />
            </div>

            <div className="field full">
              <label htmlFor="quotation-order-address">收货地址</label>
              <textarea
                id="quotation-order-address"
                onChange={(event) =>
                  setOrderForm((current) => ({
                    ...current,
                    recipientAddress: event.target.value,
                  }))
                }
                placeholder="补充收货地址，方便后续发货直接承接"
                rows={3}
                value={orderForm.recipientAddress}
              />
            </div>

            <div className="field full">
              <label htmlFor="quotation-order-remark">备注</label>
              <textarea
                id="quotation-order-remark"
                onChange={(event) =>
                  setOrderForm((current) => ({
                    ...current,
                    remark: event.target.value,
                  }))
                }
                rows={3}
                value={orderForm.remark}
              />
            </div>
          </div>
        </section>
      </ManagementDrawer>

      <QuickWorkspaceComposer
        assignee={detail.creator.displayName}
        initialKind={composerKind}
        onClose={() => setComposerOpen(false)}
        open={composerOpen}
        relatedHref={`/quotations/${detail.id}`}
        relatedId={detail.id}
        relatedLabel={detail.quotationNo}
        relatedType="quotation"
      />
    </div>
  );
}
