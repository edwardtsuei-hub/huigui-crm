"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { WorkspacePageHeader } from "../../components/dashboard/WorkspacePageHeader";
import { ProductSmartParser } from "../../components/products/ProductSmartParser";
import { PreviewShell } from "../../components/system/PreviewShell";
import {
  defaultProductForm,
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

export default function ProductsParserPreviewPage() {
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
      description="这个地址不依赖 dashboard 登录态，方便你直接确认 AI 解析辅助入口的设计和流程。"
    >
      <div className="workspace-stack">
        <WorkspacePageHeader
          actions={
            <>
              <Link className="button ghost inline" href="/products-parser-original-preview">
                查看原版对照
              </Link>
              <Link className="button ghost inline" href="/products-new-preview">
                查看完整录入预览
              </Link>
              <Link className="button ghost inline" href="/products-edit-preview">
                查看编辑页预览
              </Link>
              <Link className="button ghost inline" href="/products-detail-preview">
                查看详情页预览
              </Link>
              <Link className="button secondary inline" href="/products-preview">
                查看产品页预览
              </Link>
              <Link className="button ghost inline" href="/products">
                正式产品页
              </Link>
            </>
          }
          description="这版专门用来确认新增产品页里的 AI 解析辅助入口。未登录时会用演示结果代替真实解析接口，方便你直接检查设计。"
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
          title="AI 解析辅助入口预览"
        />

        <section className="editor-shell">
          <div className="editor-main">
            <ProductSmartParser
              previewMode
              form={form}
              industries={sampleIndustries}
              onApplyParsedData={(patch) =>
                setForm((prev) => ({ ...prev, ...patch }))
              }
            />
          </div>

          <aside className="editor-side sticky-side">
            <SummaryCard
              description="这里显示当前演示表单已接收的结果，方便你确认解析确认区的写回逻辑。"
              title="写回摘要"
            >
              <div className="summary-list">
                <div className="summary-row">
                  <span>产品名称</span>
                  <strong>{form.name || "未填"}</strong>
                </div>
                <div className="summary-row">
                  <span>对外显示</span>
                  <strong>{form.displayName || "未填"}</strong>
                </div>
                <div className="summary-row">
                  <span>行业</span>
                  <strong>{selectedIndustryName}</strong>
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
              description="未登录情况下，这里用本地演示结果代替真实解析响应，只用于确认视觉、信息层级和交互节奏。"
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
                  <strong>输入区、结果区、字段确认区</strong>
                </div>
              </div>
            </SummaryCard>
          </aside>
        </section>
      </div>
    </PreviewShell>
  );
}
