"use client";

import Link from "next/link";
import { FilesWorkbenchPreview } from "../../components/files/FilesWorkbenchPreview";

export default function FilesPreviewPage() {
  return (
    <main className="screen-center">
      <div className="workspace-stack" style={{ width: "min(1600px, 100%)" }}>
        <div
          className="panel"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div className="stack" style={{ gap: "4px" }}>
            <strong>公开预览页</strong>
            <p className="muted" style={{ margin: 0 }}>
              这个地址不再依赖 dashboard 登录态，方便你在 IAB 里直接确认设计。
            </p>
          </div>
          <div className="action-row">
            <Link className="button ghost inline" href="/login">
              前往登录
            </Link>
            <Link className="button secondary inline" href="/files">
              返回正式档案中心
            </Link>
          </div>
        </div>
        <FilesWorkbenchPreview />
      </div>
    </main>
  );
}
