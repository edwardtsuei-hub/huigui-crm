"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WorkspacePageHeader } from "../../../components/dashboard/WorkspacePageHeader";
import { apiFetch } from "../../../lib/api";

type QuotationRecord = {
  id: string;
  quotationNo: string;
  totalAmount: string;
  createdAt: string;
  customer: { name: string };
  approvalRequests?: Array<{ id: string }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export default function FilesPage() {
  const [records, setRecords] = useState<QuotationRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<QuotationRecord[]>("/quotations")
      .then(setRecords)
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : "档案加载失败")
      );
  }, []);

  return (
    <div className="workspace-stack">
      <WorkspacePageHeader
        title="档案中心"
        eyebrow="Files"
        description="先收纳正式报价与导出候选资料，后续再逐步扩展到合同、附件与文件上传记录。"
        actions={
          <>
            <Link className="button secondary inline" href="/quotations">
              查看全部报价
            </Link>
            <Link className="button inline" href="/files">
              刷新档案
            </Link>
          </>
        }
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      <section className="panel stack">
        <div className="section-heading">
          <h3>最近归档报价</h3>
          <p>先把正式报价与待导出记录统一聚合到这里，方便财务与行政追踪。</p>
        </div>

        <div className="table-wrap">
          <table className="dense-table">
            <thead>
              <tr>
                <th>报价编号</th>
                <th>客户</th>
                <th>金额</th>
                <th>待审批</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {records.length ? (
                records.map((record) => (
                  <tr key={record.id}>
                    <td>{record.quotationNo}</td>
                    <td>{record.customer.name}</td>
                    <td>¥{record.totalAmount}</td>
                    <td>
                      <span className={`status-pill ${record.approvalRequests?.length ? "warning" : "success"}`}>
                        {record.approvalRequests?.length ? "待审批" : "已就绪"}
                      </span>
                    </td>
                    <td>{formatDate(record.createdAt)}</td>
                    <td>
                      <Link className="button secondary inline" href={`/quotations/${record.id}`}>
                        打开
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">暂无归档资料，后续报价导出和正式文件会优先沉淀在这里。</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
