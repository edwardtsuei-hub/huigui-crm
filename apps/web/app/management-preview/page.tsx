"use client";

import Link from "next/link";
import { ManagementWorkspacePreview } from "../../components/management/ManagementWorkspacePreview";
import { PreviewShell } from "../../components/system/PreviewShell";

export default function ManagementPreviewPage() {
  return (
    <PreviewShell
      actions={
        <>
          <Link className="button ghost inline" href="/login">
            前往登录
          </Link>
          <Link className="button secondary inline" href="/management">
            返回正式管理页
          </Link>
        </>
      }
      description="这版只做管理中心设计验证，确认方向后我再同步回正式管理页。"
    >
      <ManagementWorkspacePreview />
    </PreviewShell>
  );
}
