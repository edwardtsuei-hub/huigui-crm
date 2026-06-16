"use client";

import Link from "next/link";
import { OrdersWorkspacePreview } from "../../components/orders/OrdersWorkspacePreview";
import { PreviewShell } from "../../components/system/PreviewShell";

export default function OrdersPreviewPage() {
  return (
    <PreviewShell
      actions={
        <>
          <Link className="button ghost inline" href="/login">
            前往登录
          </Link>
          <Link className="button secondary inline" href="/orders">
            返回正式订单页
          </Link>
        </>
      }
      description="这版只做订单履约工作台设计验证，确认方向后我再同步回正式订单页。"
    >
      <OrdersWorkspacePreview />
    </PreviewShell>
  );
}
