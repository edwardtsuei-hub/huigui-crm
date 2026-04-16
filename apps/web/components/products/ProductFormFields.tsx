"use client";

import { useMemo } from "react";
import {
  outputTemplateOptions,
  productStatusOptions,
  type IndustryGroupOption,
  type ProductFormValues
} from "./types";

type ProductFormFieldsProps = {
  form: ProductFormValues;
  industries: IndustryGroupOption[];
  onChange: (patch: Partial<ProductFormValues>) => void;
};

export function ProductFormFields({ form, industries, onChange }: ProductFormFieldsProps) {
  const selectedIndustry = useMemo(
    () => industries.find((item) => item.id === form.industryGroupId),
    [industries, form.industryGroupId]
  );

  return (
    <div className="form-grid">
      <div className="field">
        <label>产品名称</label>
        <input value={form.name} onChange={(event) => onChange({ name: event.target.value })} required />
      </div>
      <div className="field">
        <label>对外显示名称</label>
        <input
          value={form.displayName}
          onChange={(event) => onChange({ displayName: event.target.value })}
          required
        />
      </div>
      <div className="field">
        <label>行业大类</label>
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
      </div>
      <div className="field">
        <label>细分行业</label>
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
      </div>
      <div className="field">
        <label>规格</label>
        <input value={form.spec} onChange={(event) => onChange({ spec: event.target.value })} />
      </div>
      <div className="field">
        <label>单位</label>
        <input value={form.unit} onChange={(event) => onChange({ unit: event.target.value })} />
      </div>
      <div className="field">
        <label>成本价</label>
        <input
          type="number"
          value={form.costPrice}
          onChange={(event) => onChange({ costPrice: event.target.value })}
        />
      </div>
      <div className="field">
        <label>建议售价</label>
        <input
          type="number"
          value={form.salePrice}
          onChange={(event) => onChange({ salePrice: event.target.value })}
          required
        />
      </div>
      <div className="field">
        <label>企业标准号</label>
        <input
          value={form.enterpriseStandardNo}
          onChange={(event) => onChange({ enterpriseStandardNo: event.target.value })}
        />
      </div>
      <div className="field">
        <label>输出模板类型</label>
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
      </div>
      <div className="field full">
        <label>产品简介</label>
        <textarea value={form.intro} onChange={(event) => onChange({ intro: event.target.value })} />
      </div>
      <div className="field full">
        <label>适用场景</label>
        <textarea
          value={form.scenarios}
          onChange={(event) => onChange({ scenarios: event.target.value })}
        />
      </div>
      <div className="field full">
        <label>标签文字</label>
        <textarea value={form.tagText} onChange={(event) => onChange({ tagText: event.target.value })} />
      </div>
      <div className="field">
        <label>标签截图 URL</label>
        <input
          value={form.labelImageUrl}
          onChange={(event) => onChange({ labelImageUrl: event.target.value })}
        />
      </div>
      <div className="field">
        <label>产品图片 URL</label>
        <input
          value={form.productImageUrl}
          onChange={(event) => onChange({ productImageUrl: event.target.value })}
        />
      </div>
      <div className="field">
        <label>是否启用</label>
        <select value={form.status} onChange={(event) => onChange({ status: event.target.value })}>
          {productStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field full">
        <label>备注</label>
        <textarea value={form.remark} onChange={(event) => onChange({ remark: event.target.value })} />
      </div>
    </div>
  );
}
