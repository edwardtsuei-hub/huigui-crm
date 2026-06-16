"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BusinessFilePanel } from "../../../../components/business-files/BusinessFilePanel";
import { EntityDetailHeader } from "../../../../components/dashboard/EntityDetailHeader";
import {
  SectionCard,
  StatusBadge,
} from "../../../../components/system/primitives";
import {
  type InspectionDetail,
  inspectionAttachmentCategoryLabel,
  inspectionPaymentStatusLabel,
  inspectionPaymentStatusTone,
  inspectionStatusLabel,
  inspectionStatusTone,
} from "../../../../components/inspections/types";
import { apiFetch, getCurrentUser, hasAnyPermission, hasPermission } from "../../../../lib/api";
import { formatDateLabel, formatMoney } from "../../../../lib/workspace";

export default function InspectionDetailPage() {
  const params = useParams<{ id: string }>();
  const currentUser = getCurrentUser();
  const canEdit = hasAnyPermission(currentUser, ["action.inspection.update"]);
  const canUpload = hasAnyPermission(currentUser, [
    "action.inspection.upload_report",
    "action.inspection.update",
  ]);
  const canManageFiles = hasPermission(currentUser, "page.files.center");
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [error, setError] = useState("");

  async function refreshInspection() {
    const response = await apiFetch<InspectionDetail>(`/inspections/${params.id}`);
    setInspection(response);
    setError("");
  }

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const response = await apiFetch<InspectionDetail>(`/inspections/${params.id}`);
        if (!active) {
          return;
        }
        setInspection(response);
        setError("");
      } catch (requestError) {
        if (!active) {
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "加载检测详情失败",
        );
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [params.id]);

  const feeSummary = useMemo(() => {
    if (!inspection) {
      return { totalFee: "¥0", totalPaid: "¥0" };
    }

    return {
      totalFee: formatMoney(inspection.totalFee),
      totalPaid: formatMoney(inspection.totalPaidAmount),
    };
  }, [inspection]);

  if (!inspection) {
    return (
      <section className="panel">{error || "正在加载检测详情..."}</section>
    );
  }

  return (
    <div className="workspace-stack">
      <EntityDetailHeader
        actions={
          <>
            {canEdit ? (
              <Link
                className="button inline"
                href={`/inspections/${inspection.id}/edit`}
              >
                编辑检测
              </Link>
            ) : null}
            {inspection.customer?.id ? (
              <Link
                className="button secondary inline"
                href={`/customers/${inspection.customer.id}`}
              >
                查看客户
              </Link>
            ) : null}
            {inspection.product?.id ? (
              <Link
                className="button secondary inline"
                href={`/products/${inspection.product.id}`}
              >
                查看产品
              </Link>
            ) : null}
            <Link className="button secondary inline" href="/files">
              查看档案
            </Link>
            <Link className="button ghost inline" href="/inspections">
              返回检测列表
            </Link>
          </>
        }
        badges={[
          {
            label: inspectionStatusLabel(inspection.status),
            tone: inspectionStatusTone(inspection.status),
          },
          {
            label: inspectionPaymentStatusLabel(inspection.paymentStatus),
            tone: inspectionPaymentStatusTone(inspection.paymentStatus),
          },
        ]}
        breadcrumbs={[
          { label: "检测管理", href: "/inspections" },
          { label: inspection.title },
        ]}
        eyebrow="检测详情"
        meta={[
          { label: "检测单号", value: inspection.inspectionNo },
          { label: "样本数", value: String(inspection.sampleCount) },
          { label: "检测项目", value: String(inspection.itemCount) },
          { label: "总费用", value: feeSummary.totalFee },
          { label: "已付款", value: feeSummary.totalPaid },
          {
            label: "送检日期",
            value: inspection.submittedAt
              ? formatDateLabel(inspection.submittedAt)
              : "待填写",
          },
        ]}
        subtitle={`${inspection.inspectionTarget} · ${inspection.labName}${inspection.projectType ? ` · ${inspection.projectType}` : ""}`}
        title={inspection.title}
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      <section className="detail-layout">
        <div className="workspace-main">
          <SectionCard
            description="先看这张检测单是谁、送到哪、目前处在什么阶段。"
            title="基础信息"
          >
            {!inspection.customer?.id || !inspection.product?.id ? (
              <div className="summary-card">
                <strong>这张检测单还有关联信息待补齐</strong>
                <p className="muted">
                  {!inspection.customer?.id && !inspection.product?.id
                    ? "当前还没有关联客户和产品。"
                    : !inspection.customer?.id
                      ? "当前还没有关联客户。"
                      : "当前还没有关联产品。"}
                  {canEdit ? " 可以直接进入编辑页补齐，后续检索和汇总会更准确。" : ""}
                </p>
                {canEdit ? (
                  <div className="action-row">
                    <Link
                      className="button inline"
                      href={`/inspections/${inspection.id}/edit`}
                    >
                      去补关联
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="detail-info-grid">
              <article className="detail-info-card">
                <span>检测对象</span>
                <strong>{inspection.inspectionTarget}</strong>
              </article>
              <article className="detail-info-card">
                <span>送检机构</span>
                <strong>{inspection.labName}</strong>
              </article>
              <article className="detail-info-card">
                <span>送检地</span>
                <strong>{inspection.labCity || "未填写"}</strong>
              </article>
              <article className="detail-info-card">
                <span>对接人</span>
                <strong>{inspection.contactName || "未填写"}</strong>
              </article>
              <article className="detail-info-card">
                <span>联系电话</span>
                <strong>{inspection.contactPhone || "未填写"}</strong>
              </article>
              <article className="detail-info-card">
                <span>预计周期</span>
                <strong>{inspection.expectedCycleText || "未填写"}</strong>
              </article>
              <article className="detail-info-card">
                <span>关联客户</span>
                <strong>{inspection.customer?.name || "未关联"}</strong>
              </article>
              <article className="detail-info-card">
                <span>关联产品</span>
                <strong>{inspection.product?.name || "未关联"}</strong>
              </article>
            </div>

            <div className="grid-2">
              <article className="detail-text-card">
                <span>送检地址</span>
                <p>{inspection.labAddress || "尚未填写送检地址。"}</p>
              </article>
              <article className="detail-text-card">
                <span>付款 / 对公信息</span>
                <p>{inspection.bankInfo || "尚未填写付款信息。"}</p>
              </article>
              <article className="detail-text-card">
                <span>摘要</span>
                <p>{inspection.summaryText || "尚未补充本次检测摘要。"}</p>
              </article>
              <article className="detail-text-card">
                <span>备注</span>
                <p>{inspection.remark || "尚未填写内部备注。"}</p>
              </article>
            </div>
          </SectionCard>

          <SectionCard
            description="按样本拆开看检测项目，后续扩展编辑时就沿着这块展开。"
            title="样本与检测项目"
          >
            <div className="focus-list">
              {inspection.samples.length ? (
                inspection.samples.map((sample) => (
                  <article className="list-card" key={sample.id}>
                    <div className="detail-block__header">
                      <div>
                        <strong>{sample.sampleName}</strong>
                        <div className="small muted">
                          {sample.sampleType || "未分类"} ·{" "}
                          {sample.sampleQuantityText || "未填取样量"}
                        </div>
                      </div>
                      <span className="status-pill neutral">
                        {sample.sampledAt
                          ? `取样 ${formatDateLabel(sample.sampledAt)}`
                          : "待取样时间"}
                      </span>
                    </div>
                    <p>
                      {sample.sampleTarget ||
                        sample.plannedTestScope ||
                        "当前还没有补充样本目标或检测范围。"}
                    </p>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>检测项目</th>
                            <th>分类</th>
                            <th>费用</th>
                            <th>状态</th>
                            <th>结果 / 进度</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sample.items.length ? (
                            sample.items.map((item) => (
                              <tr key={item.id}>
                                <td>{item.itemName}</td>
                                <td>{item.itemCategory || "--"}</td>
                                <td>
                                  {item.feeAmount
                                    ? formatMoney(item.feeAmount)
                                    : item.feeText || "--"}
                                </td>
                                <td>
                                  <StatusBadge
                                    tone={
                                      item.status === "REPORTED"
                                        ? "success"
                                        : item.status === "IN_PROGRESS"
                                          ? "warning"
                                          : item.status === "FAILED" ||
                                              item.status === "CANCELED"
                                            ? "danger"
                                            : "neutral"
                                    }
                                  >
                                    {item.status}
                                  </StatusBadge>
                                </td>
                                <td>
                                  {item.resultSummary ||
                                    item.progressNote ||
                                    "暂无结果摘要"}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5}>
                                <div className="empty">
                                  当前样本还没有检测项目。
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty">当前还没有录入样本信息。</div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            description="进度时间线承接催报告、确认收样、补附件等关键动作。"
            title="进度时间线"
          >
            <div className="focus-list">
              {inspection.timelines.length ? (
                inspection.timelines.map((timeline) => (
                  <article className="list-card" key={timeline.id}>
                    <div className="detail-block__header">
                      <strong>{timeline.eventType}</strong>
                      <span className="status-pill neutral">
                        {formatDateLabel(timeline.eventAt || timeline.createdAt)}
                      </span>
                    </div>
                    <p>{timeline.content}</p>
                  </article>
                ))
              ) : (
                <div className="empty">当前还没有进度记录。</div>
              )}
            </div>
          </SectionCard>
        </div>

        <aside className="workspace-side sticky-side">
          <section className="summary-card stack">
            <div className="section-heading">
              <h3>付款情况</h3>
              <p>先确认费用和付款状态，再决定是否要催报销或补回单。</p>
            </div>

            <div className="summary-list">
              <div className="summary-row">
                <span>总费用</span>
                <strong>{feeSummary.totalFee}</strong>
              </div>
              <div className="summary-row">
                <span>已付款</span>
                <strong>{feeSummary.totalPaid}</strong>
              </div>
              <div className="summary-row">
                <span>付款状态</span>
                <strong>
                  {inspectionPaymentStatusLabel(inspection.paymentStatus)}
                </strong>
              </div>
            </div>

            <div className="focus-list">
              {inspection.payments.length ? (
                inspection.payments.map((payment) => (
                  <article className="list-card" key={payment.id}>
                    <div className="detail-block__header">
                      <strong>
                        {payment.amount
                          ? formatMoney(payment.amount)
                          : payment.amountText || "未填金额"}
                      </strong>
                      <span className="status-pill neutral">
                        {payment.paidAt
                          ? formatDateLabel(payment.paidAt)
                          : formatDateLabel(payment.createdAt)}
                      </span>
                    </div>
                    <p>
                      {payment.method || "未填付款方式"}
                      {payment.payerName ? ` · ${payment.payerName}` : ""}
                    </p>
                    {payment.note ? (
                      <div className="small muted">{payment.note}</div>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="empty">当前还没有付款记录。</div>
              )}
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>附件资料</h3>
              <p>报告、付款回单和发票统一挂在这里，上传后会立刻出现在下方列表。</p>
            </div>

            <BusinessFilePanel
              businessId={inspection.id}
              businessType="INSPECTION_ORDER"
              canUpload={canManageFiles && canUpload}
              canView={canManageFiles}
              categoryOptions={[
                { value: "检测报告", label: "检测报告" },
                { value: "付款回单", label: "付款回单" },
                { value: "发票", label: "发票" },
                { value: "样品照片", label: "样品照片" },
                { value: "检测附件", label: "检测附件" },
              ]}
              containerClassName="summary-card stack"
              defaultCategory="检测附件"
              description="检测报告、回单、发票和样品照片都会归到这张检测单下。"
              emptyText="当前检测单还没有从档案中心归集到附件。"
              onUploaded={refreshInspection}
              title="上传 / 归档"
            />

            <div className="focus-list">
              {inspection.attachments.length ? (
                inspection.attachments.map((attachment) => (
                  <article className="list-card" key={attachment.id}>
                    <div className="detail-block__header">
                      <strong>{attachment.fileName}</strong>
                      <span className="status-pill neutral">
                        {formatDateLabel(attachment.createdAt)}
                      </span>
                    </div>
                    <p>
                      {inspectionAttachmentCategoryLabel(
                        attachment.businessType,
                      )}
                    </p>
                    <a
                      className="button secondary inline"
                      href={attachment.fileUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      打开附件
                    </a>
                  </article>
                ))
              ) : (
                <div className="empty">当前还没有上传附件。</div>
              )}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
