"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../../lib/api";

type CustomerOption = {
  id: string;
  name: string;
  companyName?: string | null;
};

type CustomerListResponse = {
  items: CustomerOption[];
};

type ProductOption = {
  id: string;
  displayName: string;
  suggestedPrice: string;
  unit?: string | null;
  specification?: string | null;
};

type IndustryGroup = {
  id: string;
  name: string;
};

type PreviewResponse = {
  items: Array<{
    productId: string;
    displayName: string;
    specification?: string | null;
    unit?: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    note?: string;
  }>;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  discountReason?: string;
  remark?: string;
};

export default function GeneralQuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [industries, setIndustries] = useState<IndustryGroup[]>([]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customerId: searchParams.get("customerId") || "",
    industryGroupId: "",
    discountType: "amount",
    discountValue: "0",
    discountReason: "",
    remark: "",
    items: [{ productId: "", quantity: "1", unitPrice: "", note: "" }]
  });

  useEffect(() => {
    Promise.all([
      apiFetch<CustomerListResponse>("/customers"),
      apiFetch<ProductOption[]>("/products?status=ENABLED"),
      apiFetch<Array<{ id: string; name: string }>>("/meta/industries")
    ])
      .then(([customerResponse, productResponse, industryResponse]) => {
        setCustomers(customerResponse.items);
        setProducts(productResponse);
        setIndustries(industryResponse);
        if (!form.customerId && customerResponse.items[0]) {
          setForm((prev) => ({ ...prev, customerId: customerResponse.items[0].id }));
        }
      })
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : "加载通用报价数据失败")
      );
  }, []);

  function normalizedPayload() {
    return {
      customerId: form.customerId,
      industryGroupId: form.industryGroupId || undefined,
      discountType: form.discountType,
      discountValue: Number(form.discountValue || 0),
      discountReason: form.discountReason || undefined,
      remark: form.remark || undefined,
      products: form.items
        .filter((item) => item.productId)
        .map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          remark: item.note || undefined
        }))
    };
  }

  async function handlePreview() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await apiFetch<PreviewResponse>("/general-quotes/calculate", {
        method: "POST",
        body: JSON.stringify(normalizedPayload())
      });
      setPreview(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "预览失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await apiFetch<{ id: string }>("/general-quotes", {
        method: "POST",
        body: JSON.stringify(normalizedPayload())
      });
      setMessage("通用报价已创建，正在跳转。");
      router.push(`/quotations/${response.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "创建报价失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="layout-grid">
      <section className="panel stack">
        <div className="form-grid">
          <div className="field">
            <label>关联客户</label>
            <select
              value={form.customerId}
              onChange={(event) => setForm((prev) => ({ ...prev, customerId: event.target.value }))}
            >
              <option value="">请选择客户</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.companyName ? `· ${customer.companyName}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>行业</label>
            <select
              value={form.industryGroupId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, industryGroupId: event.target.value }))
              }
            >
              <option value="">默认沿用客户行业</option>
              {industries.map((industry) => (
                <option key={industry.id} value={industry.id}>
                  {industry.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>优惠方式</label>
            <select
              value={form.discountType}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, discountType: event.target.value }))
              }
            >
              <option value="amount">直减金额</option>
              <option value="percentage">折扣百分比</option>
            </select>
          </div>
          <div className="field">
            <label>{form.discountType === "percentage" ? "折扣（%）" : "优惠金额"}</label>
            <input
              type="number"
              value={form.discountValue}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, discountValue: event.target.value }))
              }
            />
          </div>
          <div className="field">
            <label>优惠原因</label>
            <input
              value={form.discountReason}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, discountReason: event.target.value }))
              }
            />
          </div>
          <div className="field full">
            <label>备注</label>
            <textarea value={form.remark} onChange={(event) => setForm((prev) => ({ ...prev, remark: event.target.value }))} />
          </div>
        </div>

        <div className="stack">
          {form.items.map((item, index) => {
            const selectedProduct = products.find((product) => product.id === item.productId);
            return (
              <div className="quote-card" key={`${index}-${item.productId}`}>
                <div className="form-grid">
                  <div className="field">
                    <label>产品</label>
                    <select
                      value={item.productId}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          items: prev.items.map((current, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...current,
                                  productId: event.target.value,
                                  unitPrice:
                                    products.find((product) => product.id === event.target.value)?.suggestedPrice ?? ""
                                }
                              : current
                          )
                        }))
                      }
                    >
                      <option value="">请选择产品</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>数量</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          items: prev.items.map((current, itemIndex) =>
                            itemIndex === index ? { ...current, quantity: event.target.value } : current
                          )
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>单价</label>
                    <input
                      readOnly
                      value={item.unitPrice}
                    />
                  </div>
                  <div className="field">
                    <label>规格 / 单位</label>
                    <input
                      value={
                        selectedProduct
                          ? `${selectedProduct.specification || "默认规格"} / ${selectedProduct.unit || "项"}`
                          : ""
                      }
                      readOnly
                    />
                  </div>
                  <div className="field full">
                    <label>备注</label>
                    <input
                      value={item.note}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          items: prev.items.map((current, itemIndex) =>
                            itemIndex === index ? { ...current, note: event.target.value } : current
                          )
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="toolbar" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="button ghost inline"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        items: prev.items.filter((_, itemIndex) => itemIndex !== index)
                      }))
                    }
                    disabled={form.items.length === 1}
                  >
                    删除该行
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="toolbar">
          <button
            className="button secondary"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                items: [...prev.items, { productId: "", quantity: "1", unitPrice: "", note: "" }]
              }))
            }
          >
            新增产品行
          </button>
          <button onClick={handlePreview} disabled={loading}>
            {loading ? "计算中..." : "预览通用报价"}
          </button>
        </div>
        {message ? <div className="small">{message}</div> : null}
        {error ? <div className="small danger-text">{error}</div> : null}
      </section>

      <section className="preview-sheet">
        {preview ? (
          <div className="stack">
            <div className="sheet-header">
              <h3>通用报价单预览</h3>
              <div className="muted">支持工业 / 服务业 / 养殖业报价与 PDF 输出</div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>产品</th>
                    <th>规格</th>
                    <th>数量</th>
                    <th>单价</th>
                    <th>小计</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.items.map((item) => (
                    <tr key={`${item.productId}-${item.displayName}`}>
                      <td>{item.displayName}</td>
                      <td>{item.specification || "--"}</td>
                      <td>
                        {item.quantity} {item.unit || ""}
                      </td>
                      <td>¥{item.unitPrice.toFixed(2)}</td>
                      <td>¥{item.lineTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="quote-card">
              <div>小计：¥{preview.subtotal.toFixed(2)}</div>
              <div>优惠：¥{preview.discountAmount.toFixed(2)}</div>
              <div>总价：¥{preview.totalAmount.toFixed(2)}</div>
              {preview.discountReason ? <div>优惠原因：{preview.discountReason}</div> : null}
              {preview.remark ? <div>备注：{preview.remark}</div> : null}
            </div>

            <div className="toolbar">
              <button onClick={handlePreview} disabled={loading}>
                重新预览
              </button>
              <button className="button secondary" onClick={handleCreate} disabled={loading}>
                创建通用报价
              </button>
            </div>
          </div>
        ) : (
          <div className="empty">选择客户、产品和数量后点击“预览通用报价”，这里会生成报价单预览。</div>
        )}
      </section>
    </div>
  );
}
