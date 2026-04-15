"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_BASE_URL, apiFetch, getToken } from "../../../../lib/api";

type QuotationDetail = {
  id: string;
  quotationNo: string;
  type: "AGRICULTURE" | "GENERAL";
  subtotal: string;
  discountAmount: string;
  totalAmount: string;
  discountReason?: string | null;
  remark?: string | null;
  createdAt: string;
  customer: { name: string };
  creator: { displayName: string; role: { name: string } };
  items: Array<{
    id: string;
    displayName: string;
    specification?: string | null;
    unit?: string | null;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
    note?: string | null;
  }>;
  agriculturePlan?: {
    planName: string;
    plantingMode: string;
    cropSummary?: string | null;
    useGc: boolean;
    gcWaterAmount?: string | null;
  } | null;
};

export default function QuotationDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<QuotationDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<QuotationDetail>(`/quotations/${params.id}`)
      .then(setDetail)
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : "加载报价详情失败")
      );
  }, [params.id]);

  if (!detail) {
    return <section className="panel">{error || "正在加载报价详情..."}</section>;
  }

  const pdfUrl = `${API_BASE_URL}/quotations/${detail.id}/pdf?token=${getToken() ?? ""}`;

  return (
    <div className="stack">
      <section className="panel">
        <div className="toolbar">
          <div>
            <h3>{detail.quotationNo}</h3>
            <div className="muted">
              {detail.customer.name} · {detail.type === "AGRICULTURE" ? "农业方案" : "通用报价"} ·
              创建人 {detail.creator.displayName}
            </div>
          </div>
          <div className="toolbar">
            <Link className="button secondary inline" href="/quotations">
              返回报价记录
            </Link>
            <a className="button inline" href={pdfUrl} target="_blank" rel="noreferrer">
              导出 PDF
            </a>
          </div>
        </div>
      </section>

      <section className="layout-grid">
        <div className="panel stack">
          <h3>报价明细</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>项目</th>
                  <th>规格</th>
                  <th>数量</th>
                  <th>单价</th>
                  <th>小计</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.displayName}
                      {item.note ? <div className="small muted">{item.note}</div> : null}
                    </td>
                    <td>{item.specification || "--"}</td>
                    <td>
                      {item.quantity} {item.unit || ""}
                    </td>
                    <td>¥{item.unitPrice}</td>
                    <td>¥{item.lineTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <h3>金额信息</h3>
            <div className="quote-card">
              <div>小计：¥{detail.subtotal}</div>
              <div>优惠：¥{detail.discountAmount}</div>
              <div>总价：¥{detail.totalAmount}</div>
              {detail.discountReason ? <div>优惠原因：{detail.discountReason}</div> : null}
              {detail.remark ? <div>备注：{detail.remark}</div> : null}
            </div>
          </div>

          {detail.agriculturePlan ? (
            <div className="panel">
              <h3>农业方案信息</h3>
              <div className="quote-card">
                <div>方案名称：{detail.agriculturePlan.planName}</div>
                <div>种植模式：{detail.agriculturePlan.plantingMode === "organic" ? "有机" : "常规"}</div>
                <div>作物汇总：{detail.agriculturePlan.cropSummary || "--"}</div>
                <div>GC 使用：{detail.agriculturePlan.useGc ? "是" : "否"}</div>
                {detail.agriculturePlan.gcWaterAmount ? (
                  <div>GC 水量：{detail.agriculturePlan.gcWaterAmount}</div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
