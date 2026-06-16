"use client";

import Link from "next/link";
import { FilesWorkbenchPreview } from "../../components/files/FilesWorkbenchPreview";
import { PreviewShell } from "../../components/system/PreviewShell";

export default function FilesPreviewPage() {
  return (
    <PreviewShell
      actions={
        <>
          <Link className="button ghost inline" href="/login">
            前往登录
          </Link>
          <Link className="button secondary inline" href="/files">
            返回正式档案中心
          </Link>
        </>
      }
      description="这个地址不再依赖 dashboard 登录态，方便你在 IAB 里直接确认设计。"
    >
      <FilesWorkbenchPreview />
    </PreviewShell>
  );
}
