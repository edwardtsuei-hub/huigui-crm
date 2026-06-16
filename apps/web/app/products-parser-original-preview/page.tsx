"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { WorkspacePageHeader } from "../../components/dashboard/WorkspacePageHeader";
import { ProductSmartParserOriginalPreview } from "../../components/products/ProductSmartParserOriginalPreview";
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

export default function ProductsParserOriginalPreviewPage() {
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
          <Link className="button secondary inline" href="/products-parser-preview">
            查看新版预览
          </Link>
        </>
      }
      description="这个地址用来还原 AI 解析辅助入口优化前的大致样子，方便你和新版直接对照。"
      label="公开对照页"
    >
      <div className="workspace-stack">
        <WorkspacePageHeader
          actions={
            <>
              <Link className="button secondary inline" href="/products-parser-preview">
                新版解析器
              </Link>
              <Link className="button ghost inline" href="/products/new#smart-parser">
                正式入口
              </Link>
            </>
          }
          description="这页保留了优化前偏传统的解析器结构：输入、结果、字段确认都是普通面板串联，方便和新版工作面直接比较。"
          eyebrow="原版对照"
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
          title="AI 解析辅助入口原版"
        />

        <section className="editor-shell">
          <div className="editor-main">
            <ProductSmartParserOriginalPreview
              form={form}
              industries={sampleIndustries}
              onApplyParsedData={(patch) =>
                setForm((prev) => ({ ...prev, ...patch }))
              }
            />
          </div>

          <aside className="editor-side sticky-side">
            <SummaryCard
              description="这里显示原版界面写回后的演示结果，便于你确认旧版更像表单工具，而不是完整工作面。"
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
              description="建议你先看这个原版，再看新版，差异会更明显。新版已经把输入、结果、确认拆成更清楚的工作节奏。"
              title="对照建议"
            >
              <div className="summary-list">
                <div className="summary-row">
                  <span>当前页面</span>
                  <strong>原版近似还原</strong>
                </div>
                <div className="summary-row">
                  <span>对比页面</span>
                  <strong>/products-parser-preview</strong>
                </div>
                <div className="summary-row">
                  <span>适合对比</span>
                  <strong>层级、信息密度、冲突处理感受</strong>
                </div>
              </div>
            </SummaryCard>
          </aside>
        </section>
      </div>
    </PreviewShell>
  );
}
