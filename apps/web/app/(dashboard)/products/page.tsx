"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch, getCurrentUser } from "../../../lib/api";
import { ProductSmartParser } from "../../../components/products/ProductSmartParser";
import {
  defaultProductForm,
  type IndustryGroupOption,
  type ProductFormValues
} from "../../../components/products/types";

type ProductRecord = {
  id: string;
  name: string;
  displayName: string;
  industryGroupId?: string | null;
  industrySubgroupId?: string | null;
  specification?: string | null;
  unit?: string | null;
  costPrice?: string | null;
  suggestedPrice: string;
  outputTemplateType: string;
  status: string;
  enabled: boolean;
  standardNumber?: string | null;
  summary?: string | null;
  scenarios?: string | null;
  remark?: string | null;
  labelText?: string | null;
  industryGroup?: { name: string } | null;
  industrySubgroup?: { name: string } | null;
  imageUrl?: string | null;
  tagScreenshotUrl?: string | null;
};

export default function ProductsPage() {
  const currentUser = getCurrentUser();
  const canEdit = currentUser?.roleCode !== "STAFF";
  const [industries, setIndustries] = useState<IndustryGroupOption[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [filters, setFilters] = useState({ search: "", industryGroupId: "", enabled: "" });
  const [form, setForm] = useState<ProductFormValues>(defaultProductForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedIndustry = useMemo(
    () => industries.find((item) => item.id === form.industryGroupId),
    [industries, form.industryGroupId]
  );

  async function loadData() {
    const searchParams = new URLSearchParams();
    if (filters.search) searchParams.set("keyword", filters.search);
    if (filters.industryGroupId) searchParams.set("industryGroupId", filters.industryGroupId);
    if (filters.enabled) searchParams.set("status", filters.enabled);

    const [productResponse, industryResponse] = await Promise.all([
      apiFetch<ProductRecord[]>(`/products?${searchParams.toString()}`),
      apiFetch<IndustryGroupOption[]>("/meta/industries")
    ]);

    setProducts(productResponse);
    setIndustries(industryResponse);
  }

  useEffect(() => {
    loadData().catch((requestError) =>
      setError(requestError instanceof Error ? requestError.message : "加载产品失败")
    );
  }, [filters.search, filters.industryGroupId, filters.enabled]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) {
      setError("员工角色当前仅可查看产品，管理角色可维护产品库。");
      return;
    }

    setMessage("");
    setError("");

    try {
      const payload = {
        ...form,
        costPrice: form.costPrice ? Number(form.costPrice) : undefined,
        salePrice: Number(form.salePrice)
      };

      if (form.id) {
        await apiFetch(`/products/${form.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        setMessage("产品已更新");
      } else {
        await apiFetch("/products", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setMessage("产品已创建");
      }

      setForm(defaultProductForm);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "保存产品失败");
    }
  }

  return (
    <div className="stack">
      <ProductSmartParser
        form={form}
        industries={industries}
        onApplyParsedData={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
      />

      <div className="layout-grid">
      <section className="panel stack">
        <div className="toolbar">
          <input
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            placeholder="搜索产品名称 / 对外显示名称"
          />
          <select
            value={filters.industryGroupId}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, industryGroupId: event.target.value }))
            }
          >
            <option value="">全部行业</option>
            {industries.map((industry) => (
              <option key={industry.id} value={industry.id}>
                {industry.name}
              </option>
            ))}
          </select>
          <select
            value={filters.enabled}
            onChange={(event) => setFilters((prev) => ({ ...prev, enabled: event.target.value }))}
          >
            <option value="">全部状态</option>
            <option value="ENABLED">启用</option>
            <option value="DISABLED">停用</option>
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>产品</th>
                <th>行业</th>
                <th>规格 / 单位</th>
                <th>建议售价</th>
                <th>成本价</th>
                <th>模板</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {products.length ? (
                products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.displayName}</strong>
                      <div className="small muted">{product.name}</div>
                    </td>
                    <td>
                      {product.industryGroup?.name || "--"}
                      <div className="small muted">{product.industrySubgroup?.name || ""}</div>
                    </td>
                    <td>
                      {product.specification || "--"} / {product.unit || "--"}
                    </td>
                    <td>¥{product.suggestedPrice}</td>
                    <td>{product.costPrice ? `¥${product.costPrice}` : "--"}</td>
                    <td>{product.outputTemplateType}</td>
                    <td>{product.enabled ? "启用" : "停用"}</td>
                    <td>
                      <button
                        className="button secondary inline"
                        onClick={() =>
                          setForm({
                            id: product.id,
                            name: product.name,
                            displayName: product.displayName,
                            industryGroupId: product.industryGroupId ?? "",
                            industrySubgroupId: product.industrySubgroupId ?? "",
                            spec: product.specification ?? "",
                            unit: product.unit ?? "项",
                            costPrice: product.costPrice ?? "",
                            salePrice: product.suggestedPrice ?? "",
                            enterpriseStandardNo: product.standardNumber ?? "",
                            intro: product.summary ?? "",
                            scenarios: product.scenarios ?? "",
                            tagText: product.labelText ?? "",
                            labelImageUrl: product.tagScreenshotUrl ?? "",
                            productImageUrl: product.imageUrl ?? "",
                            outputTemplateType: product.outputTemplateType,
                            status: product.enabled ? "ENABLED" : "DISABLED",
                            remark: product.remark ?? ""
                          })
                        }
                      >
                        编辑
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <div className="empty">产品库为空，建议先补农业方案与通用报价所需产品。</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3>{form.id ? "编辑产品" : "新增产品"}</h3>
        <p className="muted">图片与标签截图先保留 URL / 上传入口，Sprint 2 接入腾讯云 COS 直传。</p>
        {!canEdit ? <div className="warning-text small">当前为员工角色，仅可查看产品库。</div> : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field">
            <label>产品名称</label>
            <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
          </div>
          <div className="field">
            <label>对外显示名称</label>
            <input
              value={form.displayName}
              onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
              required
            />
          </div>
          <div className="field">
            <label>行业大类</label>
            <select
              value={form.industryGroupId}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  industryGroupId: event.target.value,
                  industrySubgroupId: ""
                }))
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
              onChange={(event) => setForm((prev) => ({ ...prev, industrySubgroupId: event.target.value }))}
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
            <input
              value={form.spec}
              onChange={(event) => setForm((prev) => ({ ...prev, spec: event.target.value }))}
            />
          </div>
          <div className="field">
            <label>单位</label>
            <input value={form.unit} onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))} />
          </div>
          <div className="field">
            <label>成本价</label>
            <input
              type="number"
              value={form.costPrice}
              onChange={(event) => setForm((prev) => ({ ...prev, costPrice: event.target.value }))}
            />
          </div>
          <div className="field">
            <label>建议售价</label>
            <input
              type="number"
              value={form.salePrice}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, salePrice: event.target.value }))
              }
              required
            />
          </div>
          <div className="field">
            <label>企业标准号</label>
            <input
              value={form.enterpriseStandardNo}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, enterpriseStandardNo: event.target.value }))
              }
            />
          </div>
          <div className="field">
            <label>标签文字</label>
            <input value={form.tagText} onChange={(event) => setForm((prev) => ({ ...prev, tagText: event.target.value }))} />
          </div>
          <div className="field">
            <label>标签截图 URL</label>
            <input
              value={form.labelImageUrl}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, labelImageUrl: event.target.value }))
              }
            />
          </div>
          <div className="field">
            <label>产品图片 URL</label>
            <input
              value={form.productImageUrl}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, productImageUrl: event.target.value }))
              }
            />
          </div>
          <div className="field">
            <label>输出模板类型</label>
            <select
              value={form.outputTemplateType}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, outputTemplateType: event.target.value }))
              }
            >
              <option value="AGRICULTURE_PLAN">农业方案</option>
              <option value="PRODUCT_QUOTE">产品报价</option>
              <option value="SOLUTION_QUOTE">方案报价</option>
            </select>
          </div>
          <div className="field full">
            <label>产品简介</label>
            <textarea
              value={form.intro}
              onChange={(event) => setForm((prev) => ({ ...prev, intro: event.target.value }))}
            />
          </div>
          <div className="field full">
            <label>适用场景</label>
            <textarea
              value={form.scenarios}
              onChange={(event) => setForm((prev) => ({ ...prev, scenarios: event.target.value }))}
            />
          </div>
          <div className="field full">
            <label>标签文字</label>
            <textarea
              value={form.tagText}
              onChange={(event) => setForm((prev) => ({ ...prev, tagText: event.target.value }))}
            />
          </div>
          <div className="field">
            <label>是否启用</label>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, status: event.target.value }))
              }
            >
              <option value="ENABLED">启用</option>
              <option value="DISABLED">停用</option>
            </select>
          </div>
          <div className="field full">
            <label>备注</label>
            <textarea
              value={form.remark}
              onChange={(event) => setForm((prev) => ({ ...prev, remark: event.target.value }))}
            />
          </div>
          {message ? <div className="small">{message}</div> : null}
          {error ? <div className="small danger-text">{error}</div> : null}
          <div className="toolbar">
            <button type="submit">{form.id ? "更新产品" : "创建产品"}</button>
            <button type="button" className="button secondary" onClick={() => setForm(defaultProductForm)}>
              清空表单
            </button>
          </div>
        </form>
      </section>
      </div>
    </div>
  );
}
