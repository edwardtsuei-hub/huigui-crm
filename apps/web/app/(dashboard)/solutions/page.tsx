"use client";

import Link from "next/link";
import { WorkspacePageHeader } from "../../../components/dashboard/WorkspacePageHeader";

const entries = [
  {
    href: "/solutions/agriculture/new",
    title: "农业方案",
    note: "适合生态农业、种植方案、配方与桶数计算场景。"
  },
  {
    href: "/solutions/industry/new",
    title: "通用报价",
    note: "适合工业、服务业、养殖业等标准报价场景。"
  },
  {
    href: "/quotations",
    title: "查看报价档案",
    note: "回看审批状态、正式报价导出与归档记录。"
  }
];

export default function SolutionsPage() {
  return (
    <div className="workspace-stack">
      <WorkspacePageHeader
        title="方案工作台"
        eyebrow="Solutions"
        description="把农业方案和行业报价入口先收束到同一页，避免侧栏一级导航继续膨胀。"
        actions={
          <>
            <Link className="button secondary inline" href="/quotations">
              查看报价记录
            </Link>
            <Link className="button inline" href="/solutions/agriculture/new">
              新建农业方案
            </Link>
          </>
        }
      />

      <section className="focus-grid">
        {entries.map((item) => (
          <Link className="panel stack" href={item.href} key={item.href}>
            <div className="summary-row">
              <strong>{item.title}</strong>
              <span className="status-pill neutral">进入</span>
            </div>
            <div className="small muted">{item.note}</div>
          </Link>
        ))}
      </section>
    </div>
  );
}
