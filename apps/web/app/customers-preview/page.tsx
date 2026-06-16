"use client";

import Link from "next/link";
import { CustomerWorkspacePreview } from "../../components/customers/CustomerWorkspacePreview";
import { PreviewShell } from "../../components/system/PreviewShell";

export default function CustomersPreviewPage() {
  return (
    <PreviewShell
      actions={
        <>
          <Link className="button ghost inline" href="/login">
            前往登录
          </Link>
          <Link className="button secondary inline" href="/customers">
            返回正式客户页
          </Link>
        </>
      }
      description="这版只验证客户页的“治理版工作台”方向：保留表格与右侧处理栏，同时把待补资料、可能重复、待维护归属等治理对象并进主视图。"
    >
      <CustomerWorkspacePreview />
    </PreviewShell>
  );
}
