"use client";

import { type ReactNode, useMemo } from "react";
import styles from "./ProductFormFields.module.css";
import {
  outputTemplateOptions,
  outputTemplateLabelMap,
  productStatusOptions,
  type IndustryGroupOption,
  type ProductFormValues
} from "./types";

type ProductFormFieldsProps = {
  form: ProductFormValues;
  industries: IndustryGroupOption[];
  onChange: (patch: Partial<ProductFormValues>) => void;
};

type SectionCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  pills: string[];
  children: ReactNode;
};

type FieldProps = {
  label: string;
  hint: string;
  required?: boolean;
  full?: boolean;
  note?: string;
  children: ReactNode;
};

function SectionCard({ eyebrow, title, description, pills, children }: SectionCardProps) {
  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <div className={styles.sectionCopy}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h4>{title}</h4>
          <p>{description}</p>
        </div>
        <div className={styles.sectionPills}>
          {pills.map((pill) => (
            <span key={pill}>{pill}</span>
          ))}
        </div>
      </header>
      {children}
    </section>
  );
}

function Field({ label, hint, required = false, full = false, note, children }: FieldProps) {
  return (
    <label className={full ? styles.fieldFull : styles.field}>
      <div className={styles.fieldTop}>
        <div className={styles.fieldTitle}>
          <strong>{label}</strong>
          {required ? <span className={styles.required}>必填</span> : null}
        </div>
        <span>{hint}</span>
      </div>
      <div className={styles.control}>{children}</div>
      {note ? <p className={styles.fieldNote}>{note}</p> : null}
    </label>
  );
}

export function ProductFormFields({ form, industries, onChange }: ProductFormFieldsProps) {
  const selectedIndustry = useMemo(
    () => industries.find((item) => item.id === form.industryGroupId),
    [industries, form.industryGroupId]
  );
  const selectedSubgroup = useMemo(
    () => selectedIndustry?.subgroups.find((item) => item.id === form.industrySubgroupId),
    [selectedIndustry, form.industrySubgroupId]
  );
  const filledCount = useMemo(
    () => Object.values(form).filter((value) => String(value ?? "").trim()).length,
    [form]
  );
  const statusLabel = useMemo(
    () => productStatusOptions.find((option) => option.value === form.status)?.label ?? "未设置",
    [form.status]
  );
  const templateLabel = useMemo(
    () => outputTemplateLabelMap[form.outputTemplateType] ?? form.outputTemplateType,
    [form.outputTemplateType]
  );

  return (
    <div className={styles.formShell}>
      <div className={styles.overviewGrid}>
        <article className={styles.overviewCard}>
          <span>填写进度</span>
          <strong>{filledCount}/17</strong>
          <p>解析器先帮你吸收信息，这里负责把最终可发布的字段收敛完整。</p>
        </article>
        <article className={styles.overviewCard}>
          <span>行业定位</span>
          <strong>{selectedIndustry?.name ?? "未设置"}</strong>
          <p>{selectedSubgroup?.name ? `当前细分行业：${selectedSubgroup.name}` : "建议至少挂到行业大类，方便后续筛选与报价。"}</p>
        </article>
        <article className={styles.overviewCard}>
          <span>报价输出</span>
          <strong>{templateLabel}</strong>
          <p>当前发布状态：{statusLabel}。模板与状态会直接影响前台可见性和报价链路。</p>
        </article>
      </div>

      <SectionCard
        eyebrow="基础结构"
        title="产品识别信息"
        description="先确认内部名称、对外显示名与基础规格，后面解析器写回时才不会覆盖错位。"
        pills={["报价页主标题", "产品库检索关键字"]}
      >
        <div className={styles.fieldsGrid}>
          <Field label="产品名称" hint="后台内部识别用，建议与采购或交付命名一致。" required>
            <input
              value={form.name}
              onChange={(event) => onChange({ name: event.target.value })}
              placeholder="例如：GB 叶面营养剂"
              required
            />
          </Field>
          <Field label="对外显示名称" hint="面向客户展示，适合更口语化和销售化。" required>
            <input
              value={form.displayName}
              onChange={(event) => onChange({ displayName: event.target.value })}
              placeholder="例如：高吸收叶面营养方案"
              required
            />
          </Field>
          <Field label="规格" hint="可填包装、含量或服务版本，便于报价时区分。" note="例如：500ml / 套餐版 / 单次检测。">
            <input
              value={form.spec}
              onChange={(event) => onChange({ spec: event.target.value })}
              placeholder="例如：500ml"
            />
          </Field>
          <Field label="单位" hint="报价时的计量单位，保持和交付一致。">
            <input
              value={form.unit}
              onChange={(event) => onChange({ unit: event.target.value })}
              placeholder="例如：瓶 / 项 / 次"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="报价归档"
        title="行业、模板与价格"
        description="这一组决定产品在什么业务场景里出现，以及后续报价单默认走哪套模板。"
        pills={["用于前台筛选", "影响模板渲染"]}
      >
        <div className={styles.fieldsGrid}>
          <Field label="行业大类" hint="至少绑定一个行业大类，客户经理才能快速定位。">
            <select
              value={form.industryGroupId}
              onChange={(event) =>
                onChange({
                  industryGroupId: event.target.value,
                  industrySubgroupId: ""
                })
              }
            >
              <option value="">请选择行业</option>
              {industries.map((industry) => (
                <option key={industry.id} value={industry.id}>
                  {industry.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="细分行业" hint="细分行业越准确，后续模板推荐越稳。">
            <select
              value={form.industrySubgroupId}
              onChange={(event) => onChange({ industrySubgroupId: event.target.value })}
            >
              <option value="">请选择细分行业</option>
              {selectedIndustry?.subgroups.map((subgroup) => (
                <option key={subgroup.id} value={subgroup.id}>
                  {subgroup.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="输出模板类型" hint="决定报价页默认排版和信息组织方式。">
            <select
              value={form.outputTemplateType}
              onChange={(event) => onChange({ outputTemplateType: event.target.value })}
            >
              {outputTemplateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="是否启用" hint="停用后可保留数据，但不建议继续对外使用。">
            <select value={form.status} onChange={(event) => onChange({ status: event.target.value })}>
              {productStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="成本价" hint="内部参考值，可为空；用于判断毛利空间。">
            <input
              type="number"
              value={form.costPrice}
              onChange={(event) => onChange({ costPrice: event.target.value })}
              placeholder="例如：1200"
            />
          </Field>
          <Field label="建议售价" hint="默认带入报价链路，建议录入标准面价。" required>
            <input
              type="number"
              value={form.salePrice}
              onChange={(event) => onChange({ salePrice: event.target.value })}
              placeholder="例如：2100"
              required
            />
          </Field>
          <Field
            label="企业标准号"
            hint="有标签备案或企业标准时建议录入，便于标签与资料统一。"
            full
          >
            <input
              value={form.enterpriseStandardNo}
              onChange={(event) => onChange({ enterpriseStandardNo: event.target.value })}
              placeholder="例如：Q/HY 003-2025"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="内容沉淀"
        title="销售文案与使用场景"
        description="这部分会直接决定报价文案、方案输出和客户看到的第一层理解，所以建议保留成句表达。"
        pills={["支持 AI 先写回", "建议人工再润色"]}
      >
        <div className={styles.fieldsGrid}>
          <Field label="产品简介" hint="适合写成 1 到 3 句的产品价值概括。" full>
            <textarea
              value={form.intro}
              onChange={(event) => onChange({ intro: event.target.value })}
              placeholder="例如：面向农业种植场景的叶面营养解决方案，适合提升吸收效率并优化阶段性管理。"
            />
          </Field>
          <Field label="适用场景" hint="写清楚适合的人群、季节或业务场景，便于前台销售直接调用。" full>
            <textarea
              value={form.scenarios}
              onChange={(event) => onChange({ scenarios: event.target.value })}
              placeholder="例如：果树膨果期、蔬菜高频补养、示范农场标准化管理。"
            />
          </Field>
          <Field label="标签文字" hint="对应包装标签或前台短描述，建议控制在便于快速扫读的长度。" full>
            <textarea
              value={form.tagText}
              onChange={(event) => onChange({ tagText: event.target.value })}
              placeholder="例如：高吸收 / 快速补养 / 适配多种作物。"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="展示资料"
        title="图片资源与补充备注"
        description="如果已经有标签图、产品图或人工补充说明，可以一并沉淀，后续检索和协作会更顺。"
        pills={["支持后续补录", "便于资料联动"]}
      >
        <div className={styles.fieldsGrid}>
          <Field label="标签截图 URL" hint="可放标签拍照、详情图或包装截图链接。">
            <input
              value={form.labelImageUrl}
              onChange={(event) => onChange({ labelImageUrl: event.target.value })}
              placeholder="https://"
            />
          </Field>
          <Field label="产品图片 URL" hint="用于产品卡片或详情展示，建议使用稳定可访问地址。">
            <input
              value={form.productImageUrl}
              onChange={(event) => onChange({ productImageUrl: event.target.value })}
              placeholder="https://"
            />
          </Field>
          <Field label="备注" hint="记录人工判断、禁用原因或特殊交付说明。" full>
            <textarea
              value={form.remark}
              onChange={(event) => onChange({ remark: event.target.value })}
              placeholder="例如：当前适合作为农业方案报价中的基础项，标签仍需二次校对。"
            />
          </Field>
        </div>
      </SectionCard>
    </div>
  );
}
