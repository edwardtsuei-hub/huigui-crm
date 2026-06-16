"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { WorkspacePageHeader } from "../../components/dashboard/WorkspacePageHeader";
import { ProductFormFields } from "../../components/products/ProductFormFields";
import { ProductSmartParser } from "../../components/products/ProductSmartParser";
import { PreviewShell } from "../../components/system/PreviewShell";
import {
  defaultProductForm,
  formatProductMoney,
  outputTemplateLabelMap,
  type IndustryGroupOption,
  type ProductFormValues,
} from "../../components/products/types";
import { SummaryCard } from "../../components/system/primitives";

const sampleIndustries: IndustryGroupOption[] = [
  {
    id: "i-1",
    name: "农业",
    subgroups: [
      { id: "i-1-1", name: "种植" },
      { id: "i-1-2", name: "示范农场" },
    ],
  },
  {
    id: "i-2",
    name: "医疗康养",
    subgroups: [
      { id: "i-2-1", name: "医养机构" },
      { id: "i-2-2", name: "健康服务" },
    ],
  },
];

function countFilledFields(form: ProductFormValues) {
  return Object.values(form).filter((value) => String(value ?? "").trim()).length;
}

export default function ProductsNewPreviewPage() {
  const [form, setForm] = useState<ProductFormValues>(defaultProductForm);

  const selectedIndustryName = useMemo(
    () =>
      sampleIndustries.find((industry) => industry.id === form.industryGroupId)
        ?.name ?? "未设置",
    [form.industryGroupId],
  );

  return (
    <PreviewShell
      actions={
        <>
          <Link className="button ghost inline" href="/login">
            前往登录
          </Link>
          <Link className="button secondary inline" href="/products/new#smart-parser">
            返回正式入口
          </Link>
        </>
      }
      description="这个地址不依赖 dashboard 登录态，方便你直接确认新增产品页里解析器和正式表单的整体设计。"
    >
      <div className="workspace-stack">
        <WorkspacePageHeader
          actions={
            <>
              <Link className="button ghost inline" href="/products-parser-preview">
                仅看解析器预览
              </Link>
              <Link className="button ghost inline" href="/products-edit-preview">
                查看编辑页预览
              </Link>
              <Link className="button ghost inline" href="/products-detail-preview">
                查看详情页预览
              </Link>
              <Link className="button ghost inline" href="/products">
                正式产品页
              </Link>
            </>
          }
          description="这版用于确认新增产品页的完整录入体验。未登录时解析区会使用演示结果，正式表单则可直接查看新的分区结构与信息层级。"
          eyebrow="产品录入预览"
          meta={[
            { label: "所属行业", value: selectedIndustryName },
            {
              label: "输出模板",
              value:
                outputTemplateLabelMap[form.outputTemplateType] ??
                form.outputTemplateType,
            },
            { label: "已填字段", value: String(countFilledFields(form)) },
          ]}
          title="新增产品页预览"
        />

        <section className="editor-shell">
          <div className="editor-main">
            <div id="smart-parser">
              <ProductSmartParser
                previewMode
                form={form}
                industries={sampleIndustries}
                onApplyParsedData={(patch) =>
                  setForm((prev) => ({ ...prev, ...patch }))
                }
              />
            </div>

            <section className="panel stack">
              <div className="section-heading">
                <h3>正式产品表单预览</h3>
                <p>
                  这里已经同步新版分区式录入结构，会和解析辅助一起组成最终的新建产品页。
                </p>
              </div>

              <ProductFormFields
                form={form}
                industries={sampleIndustries}
                onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
              />

              <div className="action-row">
                <button type="button" disabled>
                  预览模式不可提交
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setForm(defaultProductForm)}
                >
                  重置演示内容
                </button>
              </div>
            </section>
          </div>

          <aside className="editor-side sticky-side">
            <SummaryCard
              description="这里实时显示演示表单当前的核心录入结果，方便你确认信息层级是否顺手。"
              title="录入摘要"
            >
              <div className="summary-list">
                <div className="summary-row">
                  <span>所属行业</span>
                  <strong>{selectedIndustryName}</strong>
                </div>
                <div className="summary-row">
                  <span>建议售价</span>
                  <strong>{formatProductMoney(form.salePrice)}</strong>
                </div>
                <div className="summary-row">
                  <span>输出模板</span>
                  <strong>
                    {outputTemplateLabelMap[form.outputTemplateType] ??
                      form.outputTemplateType}
                  </strong>
                </div>
              </div>
            </SummaryCard>

            <SummaryCard
              description="正式环境下，你可以直接在这里完成解析写回、字段确认和产品创建。当前页面只用于检查视觉和结构。"
              title="预览说明"
            >
              <div className="summary-list">
                <div className="summary-row">
                  <span>当前模式</span>
                  <strong>公开演示</strong>
                </div>
                <div className="summary-row">
                  <span>解析接口</span>
                  <strong>未登录时使用演示数据</strong>
                </div>
                <div className="summary-row">
                  <span>适合确认</span>
                  <strong>整页节奏、表单层级、录入质感</strong>
                </div>
              </div>
            </SummaryCard>
          </aside>
        </section>
      </div>
    </PreviewShell>
  );
}
