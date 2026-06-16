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
  productStatusOptions,
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

const previewInitialForm: ProductFormValues = {
  ...defaultProductForm,
  name: "GB 叶面营养剂",
  displayName: "GB 叶面营养剂标准方案",
  industryGroupId: "i-1",
  industrySubgroupId: "i-1-2",
  spec: "500ml / 瓶",
  unit: "瓶",
  costPrice: "1280",
  salePrice: "2100",
  enterpriseStandardNo: "Q/HH 2026-01",
  intro: "用于农业种植场景的标准营养补充产品，适合在重点阶段做吸收效率优化。",
  scenarios: "果树膨果期、示范农场标准管理、区域交付试点。",
  tagText: "高吸收 / 快补养 / 标准交付",
  labelImageUrl: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80",
  productImageUrl: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80",
  outputTemplateType: "AGRICULTURE_PLAN",
  status: "ENABLED",
  remark: "演示数据：这类老产品适合先用解析辅助比对标签，再修正文案与模板。",
};

function countFilledFields(form: ProductFormValues) {
  return Object.values(form).filter((value) => String(value ?? "").trim()).length;
}

export default function ProductsEditPreviewPage() {
  const [form, setForm] = useState<ProductFormValues>(previewInitialForm);

  const selectedIndustryName = useMemo(() => {
    const group = sampleIndustries.find((industry) => industry.id === form.industryGroupId);
    const subgroup = group?.subgroups.find((item) => item.id === form.industrySubgroupId);
    return subgroup?.name ? `${group?.name ?? "未设置"} / ${subgroup.name}` : group?.name ?? "未设置";
  }, [form.industryGroupId, form.industrySubgroupId]);

  const statusLabel = useMemo(
    () => productStatusOptions.find((option) => option.value === form.status)?.label ?? "未设置",
    [form.status],
  );

  return (
    <PreviewShell
      actions={
        <>
          <Link className="button ghost inline" href="/login">
            前往登录
          </Link>
          <Link className="button secondary inline" href="/products-new-preview">
            查看新建页预览
          </Link>
        </>
      }
      description="这个地址不依赖 dashboard 登录态，方便你直接确认新版产品编辑页的布局、节奏和字段层级。"
    >
      <WorkspacePageHeader
        actions={
          <>
            <Link className="button secondary inline" href="#smart-parser">
              定位解析辅助
            </Link>
            <Link className="button ghost inline" href="/products-parser-preview">
              仅看解析器预览
            </Link>
            <Link className="button ghost inline" href="/products-new-preview">
              查看新建页预览
            </Link>
            <Link className="button ghost inline" href="/products-detail-preview">
              查看详情页预览
            </Link>
          </>
        }
        description="这一版用于确认老产品的维护体验。上方解析区负责吸收新标签或文案，下面的正式表单负责把价格、模板和展示资料沉淀回产品库。"
        eyebrow="产品维护预览"
        meta={[
          { label: "所属行业", value: selectedIndustryName },
          { label: "建议售价", value: formatProductMoney(form.salePrice) },
          {
            label: "输出模板",
            value:
              outputTemplateLabelMap[form.outputTemplateType] ??
              form.outputTemplateType,
          },
          { label: "当前状态", value: statusLabel },
          { label: "已填字段", value: `${countFilledFields(form)}/17` },
        ]}
        title={`编辑 ${form.displayName}`}
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
              <h3>正式编辑表单预览</h3>
              <p>
                这里已经同步新版分区式编辑结构，适合检查老产品修订时的录入节奏是否自然。
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
                onClick={() => setForm(previewInitialForm)}
              >
                恢复演示初始值
              </button>
              <Link className="button ghost inline" href="#smart-parser">
                回到解析辅助
              </Link>
            </div>
          </section>
        </div>

        <aside className="editor-side sticky-side">
          <SummaryCard
            description="这里实时显示演示表单当前的关键状态，方便你确认编辑页是不是足够清楚和稳。"
            title="当前快照"
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
              <div className="summary-row">
                <span>当前状态</span>
                <strong>{statusLabel}</strong>
              </div>
            </div>
          </SummaryCard>

          <SummaryCard
            description="预览页用于检查视觉和结构，不会提交真实数据。"
            title="编辑提醒"
          >
            <div className="summary-list">
              <div className="summary-row">
                <span>推荐顺序</span>
                <strong>先解析，再确认，再保存</strong>
              </div>
              <div className="summary-row">
                <span>高风险字段</span>
                <strong>售价 / 模板 / 标签文案</strong>
              </div>
              <div className="summary-row">
                <span>适合确认</span>
                <strong>整页层级、编辑流程、摘要侧栏</strong>
              </div>
            </div>
          </SummaryCard>
        </aside>
      </section>
    </PreviewShell>
  );
}
