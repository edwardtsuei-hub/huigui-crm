"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { WorkspacePageHeader } from "../../components/dashboard/WorkspacePageHeader";
import { ProductParseQueueWorkspace } from "../../components/products/ProductParseQueueWorkspace";
import {
  type ProductParseQueueItem,
  type ProductParseReviewStatus,
} from "../../components/products/types";
import { PreviewShell } from "../../components/system/PreviewShell";

const previewItems: ProductParseQueueItem[] = [
  {
    id: "parse-preview-1",
    sourceType: "MIXED",
    reviewStatus: "PENDING",
    createdAt: "2026-04-22T09:18:00.000Z",
    rawText:
      "富硒营养液，适用于农业种植场景，建议搭配标准交付方案。标签上强调营养升级和示范农场试点。",
    parsed: {
      name: "富硒营养液",
      displayName: "富硒营养液标准包",
      scenarios: "农业种植、示范农场、区域交付",
      industryGroupSuggestion: "农业",
      industrySubgroupSuggestion: "示范农场",
      outputTemplateTypeSuggestion: "SOLUTION_QUOTE",
      labelText: "营养升级",
    },
    confidence: {
      name: "high",
      displayName: "medium",
      scenarios: "medium",
      labelText: "medium",
      outputTemplateTypeSuggestion: "medium",
    },
    conflicts: [
      {
        field: "labelText",
        preferredValue: "营养升级",
        candidates: [
          {
            value: "营养升级",
            confidence: "medium",
            source: "image",
            reason: "标签主视觉突出这个卖点词。",
          },
          {
            value: "富硒补充",
            confidence: "medium",
            source: "text",
            reason: "原文里重复出现补充相关表达。",
          },
        ],
      },
    ],
    parsedFieldCount: 6,
    lowConfidenceCount: 0,
    mediumConfidenceCount: 4,
    conflictCount: 1,
    title: "富硒营养液标准包",
    summary: "农业 / 示范农场 / SOLUTION_QUOTE",
    operator: {
      id: "user-preview-1",
      name: "陈雅萍",
      loginAccount: "chenyp",
    },
  },
  {
    id: "parse-preview-2",
    sourceType: "IMAGE",
    reviewStatus: "PENDING",
    createdAt: "2026-04-22T08:42:00.000Z",
    rawText:
      "标签识别文本：菌剂组合包，适用于土壤改良，规格 12 组 / 套，企业标准号显示不清。",
    parsed: {
      name: "菌剂组合包",
      displayName: "土壤改良菌剂方案包",
      spec: "12 组 / 套",
      unit: "套",
      enterpriseStandardNo: "Q/HY 003-2025",
      industryGroupSuggestion: "农业",
      outputTemplateTypeSuggestion: "AGRICULTURE_PLAN",
    },
    confidence: {
      name: "medium",
      displayName: "medium",
      spec: "high",
      unit: "high",
      enterpriseStandardNo: "low",
      outputTemplateTypeSuggestion: "medium",
    },
    conflicts: [],
    parsedFieldCount: 6,
    lowConfidenceCount: 1,
    mediumConfidenceCount: 3,
    conflictCount: 0,
    title: "土壤改良菌剂方案包",
    summary: "农业 / AGRICULTURE_PLAN",
    operator: {
      id: "user-preview-2",
      name: "王潇",
      loginAccount: "wangxiao",
    },
  },
  {
    id: "parse-preview-3",
    sourceType: "TEXT",
    reviewStatus: "CONFIRMED",
    reviewNote: "已转到新增产品页继续补图片和售价。",
    createdAt: "2026-04-21T15:06:00.000Z",
    reviewedAt: "2026-04-21T15:28:00.000Z",
    rawText:
      "叶面营养剂，主要用于果树膨果期和示范农场标准管理，建议用标准方案模版输出。",
    parsed: {
      name: "叶面营养剂",
      displayName: "叶面营养剂标准方案",
      scenarios: "果树膨果期、示范农场标准管理",
      industryGroupSuggestion: "农业",
      outputTemplateTypeSuggestion: "AGRICULTURE_PLAN",
    },
    confidence: {
      name: "high",
      displayName: "high",
      scenarios: "medium",
      outputTemplateTypeSuggestion: "high",
    },
    conflicts: [],
    parsedFieldCount: 4,
    lowConfidenceCount: 0,
    mediumConfidenceCount: 1,
    conflictCount: 0,
    title: "叶面营养剂标准方案",
    summary: "农业 / AGRICULTURE_PLAN",
    operator: {
      id: "user-preview-3",
      name: "admin",
      loginAccount: "admin",
    },
    reviewer: {
      id: "user-preview-3",
      name: "admin",
      loginAccount: "admin",
    },
  },
  {
    id: "parse-preview-4",
    sourceType: "TEXT",
    reviewStatus: "IGNORED",
    reviewNote: "原文过短，先不进入正式产品录入。",
    createdAt: "2026-04-21T11:32:00.000Z",
    reviewedAt: "2026-04-21T11:40:00.000Z",
    rawText: "清洁剂，生态圈舍使用。",
    parsed: {
      name: "清洁剂",
      displayName: "生态圈舍清洁剂",
    },
    confidence: {
      name: "medium",
      displayName: "low",
    },
    conflicts: [],
    parsedFieldCount: 2,
    lowConfidenceCount: 1,
    mediumConfidenceCount: 1,
    conflictCount: 0,
    title: "生态圈舍清洁剂",
    summary: "原始信息过短，需要补更多文本后再解析。",
    operator: {
      id: "user-preview-4",
      name: "周晨",
      loginAccount: "zhouchen",
    },
    reviewer: {
      id: "user-preview-2",
      name: "王潇",
      loginAccount: "wangxiao",
    },
  },
];

export default function ProductsAiImportPreviewPage() {
  const [items, setItems] = useState<ProductParseQueueItem[]>(previewItems);

  const meta = useMemo(() => {
    const pendingCount = items.filter((item) => item.reviewStatus === "PENDING").length;
    const conflictCount = items.filter(
      (item) => item.reviewStatus === "PENDING" && item.conflictCount > 0,
    ).length;
    const reviewedCount = items.filter((item) => item.reviewStatus !== "PENDING").length;

    return [
      { label: "待确认", value: String(pendingCount), tone: "warning" as const },
      { label: "有冲突", value: String(conflictCount) },
      { label: "最近已处理", value: String(reviewedCount), tone: "success" as const },
    ];
  }, [items]);

  function handleReview(id: string, reviewStatus: ProductParseReviewStatus) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              reviewStatus,
              reviewedAt: new Date().toISOString(),
              reviewer: {
                id: "preview-reviewer",
                name: "演示用户",
                loginAccount: "preview",
              },
            }
          : item,
      ),
    );
  }

  return (
    <PreviewShell
      actions={
        <>
          <Link className="button ghost inline" href="/login">
            前往登录
          </Link>
          <Link className="button ghost inline" href="/products-preview">
            查看产品中心预览
          </Link>
          <Link className="button secondary inline" href="/products/ai-import">
            返回正式队列
          </Link>
        </>
      }
      description="这个地址不依赖 dashboard 登录态，方便你直接确认 AI 解析待确认队列的结构、焦点切片和处置动作。"
    >
      <div className="workspace-stack">
        <WorkspacePageHeader
          actions={
            <>
              <Link className="button ghost inline" href="/products-parser-preview">
                查看解析器预览
              </Link>
              <Link className="button ghost inline" href="/products-new-preview">
                查看新增页预览
              </Link>
              <Link className="button ghost inline" href="/products-edit-preview">
                查看编辑页预览
              </Link>
              <Link className="button ghost inline" href="/products">
                正式产品页
              </Link>
            </>
          }
          description="这版专门用来确认待确认解析队列应该怎么收口，不让 AI 解析结果直接散落在单个录入页里。"
          eyebrow="产品录入预览"
          meta={meta}
          title="AI 解析待确认队列预览"
        />

        <ProductParseQueueWorkspace
          canReview
          items={items}
          links={{
            parserPreviewHref: "/products-parser-preview",
            productListHref: "/products-preview",
          }}
          onReview={handleReview}
          previewMode
          statusText="预览模式使用静态样例，可直接切换确认和忽略状态来检查队列反馈。"
        />
      </div>
    </PreviewShell>
  );
}
