"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

type QuotationRecord = {
  id: string;
  quotationNo: string;
  type: "AGRICULTURE" | "GENERAL";
  subtotal: string;
  totalAmount: string;
  createdAt: string;
  customer: { name: string };
  creator: { displayName: string };
  items: Array<{ id: string }>;
};

export default function QuotationsPage() {
  const [records, setRecords] = useState<QuotationRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<QuotationRecord[]>("/quotations")
      .then(setRecords)
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : "加载报价记录失败")
      );
  }, []);

  return (
    <section className="panel stack">
      <div>
        <h3>报价记录</h3>
        <p className="muted">农业报价与通用报价统一归档，可继续查看详情并导出 PDF。</p>
      </div>

      {error ? <div className="danger-text small">{error}</div> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>报价单号</th>
              <th>类型</th>
              <th>客户</th>
              <th>条目数</th>
              <th>总价</th>
              <th>创建人</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {records.length ? (
              records.map((record) => (
                <tr key={record.id}>
                  <td>{record.quotationNo}</td>
                  <td>{record.type === "AGRICULTURE" ? "农业方案" : "通用报价"}</td>
                  <td>{record.customer.name}</td>
                  <td>{record.items.length}</td>
                  <td>¥{record.totalAmount}</td>
                  <td>{record.creator.displayName}</td>
                  <td>{new Date(record.createdAt).toLocaleString("zh-CN")}</td>
                  <td>
                    <Link className="button inline" href={`/quotations/${record.id}`}>
                      查看详情
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8}>
                  <div className="empty">暂无报价记录，请先从农业方案页或通用报价页创建。</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
