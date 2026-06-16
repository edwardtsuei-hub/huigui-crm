"use client";

import Link from "next/link";
import { InspectionsWorkspacePreview } from "../../components/inspections/InspectionsWorkspacePreview";
import { PreviewShell } from "../../components/system/PreviewShell";

export default function InspectionsPreviewPage() {
  return (
    <PreviewShell
      actions={
        <>
          <Link className="button ghost inline" href="/login">
            前往登录
          </Link>
          <Link className="button secondary inline" href="/inspections">
            返回正式检测页
          </Link>
        </>
      }
      description="这版只做 inspections 列表页的设计验证，确认方向后我再同步回正式检测页。"
    >
      <InspectionsWorkspacePreview />
    </PreviewShell>
  );
}
