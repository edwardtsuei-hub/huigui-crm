"use client";

import Link from "next/link";
import { QuotationsWorkspacePreview } from "../../components/quotations/QuotationsWorkspacePreview";
import { PreviewShell } from "../../components/system/PreviewShell";

export default function QuotationsPreviewPage() {
  return (
    <PreviewShell
      actions={
        <>
          <Link className="button ghost inline" href="/login">
            前往登录
          </Link>
          <Link className="button secondary inline" href="/quotations">
            返回正式报价页
          </Link>
        </>
      }
      description="这版只做报价中心设计验证，确认方向后我再同步回正式报价页。"
    >
      <QuotationsWorkspacePreview />
    </PreviewShell>
  );
}
