"use client";

import Link from "next/link";
import {
  ProductDetailWorkspace,
  type ProductDetailWorkspaceProduct,
} from "../../components/products/ProductDetailWorkspace";
import { type InspectionListItem } from "../../components/inspections/types";
import { PreviewShell } from "../../components/system/PreviewShell";
import { type LocalWorkspaceItem } from "../../lib/workspace";

const previewProduct: ProductDetailWorkspaceProduct = {
  id: "product-preview-1",
  name: "GB 叶面营养剂",
  displayName: "GB 叶面营养剂标准方案",
  industryGroupId: "i-1",
  industrySubgroupId: "i-1-2",
  specification: "500ml / 瓶",
  unit: "瓶",
  costPrice: "1280",
  suggestedPrice: "2100",
  outputTemplateType: "AGRICULTURE_PLAN",
  status: "ENABLED",
  enabled: true,
  standardNumber: "Q/HH 2026-01",
  summary:
    "用于农业种植场景的标准营养补充产品，适合在重点阶段做吸收效率优化，并且便于区域交付统一执行。",
  scenarios: "果树膨果期、示范农场标准管理、区域交付试点。",
  remark: "演示数据：这类成熟产品适合重点优化模板、标签文案和展示资料。",
  labelText: "高吸收 / 快补养 / 标准交付",
  industryGroup: { id: "i-1", name: "农业" },
  industrySubgroup: { id: "i-1-2", name: "示范农场" },
  imageUrl:
    "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80",
  tagScreenshotUrl:
    "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80",
  quoteEnabled: true,
  employeeVisible: true,
  customerVisible: false,
  createdAt: "2026-03-08T10:00:00.000Z",
  updatedAt: "2026-04-18T09:20:00.000Z",
  referenceCount: 12,
  recentQuotationItems: [
    {
      id: "ref-1",
      quantity: "20",
      unitPrice: "2100",
      lineTotal: "42000",
      quotation: {
        id: "quotation-preview-1",
        quotationNo: "QT-2026-0418-008",
        type: "AGRICULTURE",
        totalAmount: "86000",
        createdAt: "2026-04-18T08:30:00.000Z",
        customer: { id: "customer-1", name: "华东示范农场" },
      },
    },
    {
      id: "ref-2",
      quantity: "8",
      unitPrice: "2100",
      lineTotal: "16800",
      quotation: {
        id: "quotation-preview-2",
        quotationNo: "QT-2026-0412-021",
        type: "INDUSTRY",
        totalAmount: "31600",
        createdAt: "2026-04-12T14:15:00.000Z",
        customer: { id: "customer-2", name: "江南农业服务中心" },
      },
    },
  ],
};

const previewInspectionItems: InspectionListItem[] = [
  {
    id: "inspection-preview-1",
    inspectionNo: "JC-2026-0415-001",
    title: "叶面营养剂常规送检",
    projectType: "产品检测",
    inspectionTarget: "营养元素与合规性复核",
    labName: "上海农业检测中心",
    customer: { id: "customer-1", name: "华东示范农场" },
    product: { id: "product-preview-1", name: "GB 叶面营养剂" },
    creator: { id: "user-1", displayName: "admin", department: "运营" },
    status: "IN_PROGRESS",
    paymentStatus: "PARTIAL",
    submittedAt: "2026-04-15T09:00:00.000Z",
    updatedAt: "2026-04-18T16:00:00.000Z",
    createdAt: "2026-04-15T08:20:00.000Z",
    sampleCount: 2,
    itemCount: 6,
    reportedItemCount: 3,
    totalFee: "6200",
    totalPaidAmount: "3000",
    latestTimeline: {
      eventType: "IN_PROGRESS",
      content: "已完成样品接收与部分项目检测，等待余下结果汇总。",
      eventAt: "2026-04-18T16:00:00.000Z",
    },
  },
];

const previewWorkspaceItems: LocalWorkspaceItem[] = [
  {
    id: "workspace-preview-1",
    title: "复核产品标签文案",
    kind: "reminder",
    summary: "结合最新检测反馈，确认标签表述是否需要同步调整。",
    dueAt: "2026-04-20T09:30:00.000Z",
    relatedId: "product-preview-1",
    relatedLabel: "GB 叶面营养剂标准方案",
    relatedHref: "/products-detail-preview",
    relatedType: "internal",
    assignee: "admin",
    priority: "high",
    status: "pending",
    createdAt: "2026-04-18T15:40:00.000Z",
  },
  {
    id: "workspace-preview-2",
    title: "确认区域报价模板",
    kind: "todo",
    summary: "检查农业方案模板中的默认场景文案是否与当前产品一致。",
    dueAt: "2026-04-21T11:00:00.000Z",
    relatedId: "product-preview-1",
    relatedLabel: "GB 叶面营养剂标准方案",
    relatedHref: "/products-detail-preview",
    relatedType: "internal",
    assignee: "admin",
    priority: "medium",
    status: "pending",
    createdAt: "2026-04-18T15:55:00.000Z",
  },
];

export default function ProductsDetailPreviewPage() {
  return (
    <PreviewShell
      actions={
        <>
          <Link className="button ghost inline" href="/login">
            前往登录
          </Link>
          <Link className="button ghost inline" href="/products-edit-preview">
            查看编辑页预览
          </Link>
          <Link className="button ghost inline" href="/products-new-preview">
            查看新建页预览
          </Link>
          <Link className="button secondary inline" href="/products-preview">
            查看产品中心预览
          </Link>
        </>
      }
      description="这个地址不依赖 dashboard 登录态，方便你直接确认新版产品详情页的结构、摘要和右侧协作区。"
    >
      <ProductDetailWorkspace
        canEdit
        inspectionItems={previewInspectionItems}
        inspectionDetailHrefBuilder={() => "/products-detail-preview"}
        links={{
          detailHref: "/products-detail-preview",
          editHref: "/products-edit-preview",
          listHref: "/products-preview",
          newQuoteHref: "/products-new-preview",
        }}
        product={previewProduct}
        workspaceItems={previewWorkspaceItems}
      />
    </PreviewShell>
  );
}
