"use client";

import Link from "next/link";
import { DashboardPreview } from "../../components/dashboard/DashboardPreview";
import { PreviewShell } from "../../components/system/PreviewShell";

export default function DashboardPreviewPage() {
  return (
    <PreviewShell
      actions={
        <>
          <Link className="button ghost inline" href="/login">
            前往登录
          </Link>
          <Link className="button secondary inline" href="/dashboard">
            返回正式工作台
          </Link>
        </>
      }
      description="这版只做 dashboard 设计验证，确认方向后我再同步回正式工作台。"
    >
      <DashboardPreview />
    </PreviewShell>
  );
}
