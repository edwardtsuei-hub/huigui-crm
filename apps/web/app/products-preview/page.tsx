"use client";

import Link from "next/link";
import { ProductsWorkspacePreview } from "../../components/products/ProductsWorkspacePreview";
import { PreviewShell } from "../../components/system/PreviewShell";

export default function ProductsPreviewPage() {
  return (
    <PreviewShell
      actions={
        <>
          <Link className="button ghost inline" href="/login">
            前往登录
          </Link>
          <Link className="button ghost inline" href="/products-ai-import-preview">
            查看解析队列预览
          </Link>
          <Link className="button ghost inline" href="/products-detail-preview">
            查看详情页预览
          </Link>
          <Link className="button secondary inline" href="/products">
            返回正式产品页
          </Link>
        </>
      }
      description="这版只做产品中心设计验证，确认方向后我再同步回正式产品页。"
    >
      <ProductsWorkspacePreview />
    </PreviewShell>
  );
}
