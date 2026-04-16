"use client";

import { useMemo } from "react";
import {
  customerStatusOptions,
  type CustomerFormValues,
  type IndustryGroupOption,
  type UserOption
} from "./types";

type CustomerFormFieldsProps = {
  form: CustomerFormValues;
  industries: IndustryGroupOption[];
  users: UserOption[];
  disableOwnerSelection: boolean;
  onChange: (patch: Partial<CustomerFormValues>) => void;
};

export function CustomerFormFields({
  form,
  industries,
  users,
  disableOwnerSelection,
  onChange
}: CustomerFormFieldsProps) {
  const selectedIndustry = useMemo(
    () => industries.find((item) => item.id === form.industryGroupId),
    [industries, form.industryGroupId]
  );

  return (
    <div className="form-grid">
      <div className="field">
        <label>客户名称</label>
        <input
          value={form.customerName}
          onChange={(event) => onChange({ customerName: event.target.value })}
          required
        />
      </div>
      <div className="field">
        <label>企业名称</label>
        <input
          value={form.companyName}
          onChange={(event) => onChange({ companyName: event.target.value })}
        />
      </div>
      <div className="field">
        <label>联系人</label>
        <input
          value={form.contactName}
          onChange={(event) => onChange({ contactName: event.target.value })}
        />
      </div>
      <div className="field">
        <label>手机</label>
        <input value={form.mobile} onChange={(event) => onChange({ mobile: event.target.value })} />
      </div>
      <div className="field">
        <label>微信号</label>
        <input
          value={form.wechatId}
          onChange={(event) => onChange({ wechatId: event.target.value })}
        />
      </div>
      <div className="field">
        <label>邮箱</label>
        <input value={form.email} onChange={(event) => onChange({ email: event.target.value })} />
      </div>
      <div className="field">
        <label>客户状态</label>
        <select value={form.status} onChange={(event) => onChange({ status: event.target.value })}>
          {customerStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>负责人</label>
        <select
          value={form.ownerUserId}
          onChange={(event) => onChange({ ownerUserId: event.target.value })}
          disabled={disableOwnerSelection}
        >
          <option value="">请选择负责人</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.displayName} · {user.roleName}
            </option>
          ))}
        </select>
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
        <label>省份</label>
        <input
          value={form.province}
          onChange={(event) => onChange({ province: event.target.value })}
        />
      </div>
      <div className="field">
        <label>城市</label>
        <input value={form.city} onChange={(event) => onChange({ city: event.target.value })} />
      </div>
      <div className="field">
        <label>区域</label>
        <input
          value={form.district}
          onChange={(event) => onChange({ district: event.target.value })}
        />
      </div>
      <div className="field">
        <label>详细地址</label>
        <input
          value={form.address}
          onChange={(event) => onChange({ address: event.target.value })}
        />
      </div>
      <div className="field">
        <label>客户来源</label>
        <input value={form.source} onChange={(event) => onChange({ source: event.target.value })} />
      </div>
      <div className="field">
        <label>预估金额</label>
        <input
          type="number"
          value={form.estimatedAmount}
          onChange={(event) => onChange({ estimatedAmount: event.target.value })}
        />
      </div>
      <div className="field">
        <label>成交概率（%）</label>
        <input
          type="number"
          min={0}
          max={100}
          value={form.dealProbability}
          onChange={(event) => onChange({ dealProbability: event.target.value })}
        />
      </div>
      <div className="field full">
        <label>合作方向</label>
        <input
          value={form.cooperationDirection}
          onChange={(event) => onChange({ cooperationDirection: event.target.value })}
        />
      </div>
      <div className="field full">
        <label>合作内容</label>
        <textarea
          value={form.cooperationContent}
          onChange={(event) => onChange({ cooperationContent: event.target.value })}
        />
      </div>
      <div className="field full">
        <label>备注</label>
        <textarea value={form.remark} onChange={(event) => onChange({ remark: event.target.value })} />
      </div>
    </div>
  );
}
