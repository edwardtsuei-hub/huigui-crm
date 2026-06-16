"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { WorkspacePageHeader } from "../../../../components/dashboard/WorkspacePageHeader";
import { ProductParseQueueWorkspace } from "../../../../components/products/ProductParseQueueWorkspace";
import {
  type ProductParseQueueItem,
  type ProductParseReviewStatus,
} from "../../../../components/products/types";
import {
  apiFetch,
  getCurrentUser,
  hasPermission,
} from "../../../../lib/api";

export default function ProductAiImportPage() {
  const currentUser = getCurrentUser();
  const canView = hasPermission(currentUser, "page.products.ai_import");
  const canReview = hasPermission(currentUser, "action.product.update");
  const [items, setItems] = useState<ProductParseQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("正在加载待确认解析队列");
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadQueue() {
      try {
        setError("");
        setStatusText("正在加载待确认解析队列");
        const response = await apiFetch<ProductParseQueueItem[]>("/products/parse-queue");

        if (cancelled) {
          return;
        }

        setItems(response);
        setStatusText("已接入正式解析日志队列");
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "加载解析队列失败",
          );
          setStatusText("解析队列加载失败");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadQueue();

    return () => {
      cancelled = true;
    };
  }, [canView]);

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

  async function handleReview(id: string, reviewStatus: ProductParseReviewStatus) {
    if (!canReview) {
      setError("当前角色不可处理解析队列，请联系管理员开通产品编辑权限。");
      return;
    }

    setReviewingId(id);
    setError("");

    try {
      const updated = await apiFetch<ProductParseQueueItem>(
        `/products/parse-queue/${id}/review`,
        {
          method: "PATCH",
          body: JSON.stringify({ reviewStatus }),
        },
      );

      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setStatusText(
        reviewStatus === "CONFIRMED"
          ? "已将解析记录标记为已确认"
          : "已将解析记录标记为已忽略",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "处理解析记录失败",
      );
    } finally {
      setReviewingId(null);
    }
  }

  if (!canView) {
    return (
      <section className="panel stack">
        <h3>当前角色不可查看 AI 解析队列</h3>
        <p className="muted">
          这个页面用于集中处理产品解析记录，需要开通产品 AI 导入页权限。
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
            <Link className="button secondary inline" href="/products/new#smart-parser">
              去新增产品
            </Link>
            <Link className="button ghost inline" href="/products-ai-import-preview">
              公开预览
            </Link>
            <Link className="button ghost inline" href="/products">
              返回产品列表
            </Link>
          </>
        }
        description="把产品解析结果先集中进待确认队列，再由人工确认哪些要进入正式产品库、哪些只保留为参考。"
        eyebrow="产品 AI 解析"
        meta={meta}
        title="AI 解析待确认队列"
      />

      <ProductParseQueueWorkspace
        canReview={canReview}
        error={error}
        items={items}
        links={{
          newProductHref: "/products/new#smart-parser",
          parserPreviewHref: "/products-parser-preview",
          productListHref: "/products",
        }}
        loading={loading}
        onReview={handleReview}
        reviewingId={reviewingId}
        statusText={statusText}
      />
    </div>
  );
}
