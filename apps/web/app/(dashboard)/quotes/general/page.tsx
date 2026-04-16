"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StepStrip } from "../../../../components/dashboard/StepStrip";
import { WorkspacePageHeader } from "../../../../components/dashboard/WorkspacePageHeader";
import { apiFetch } from "../../../../lib/api";
import { formatMoney } from "../../../../lib/workspace";

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
    items: [{ productId: "", quantity: "1", unitPrice: "", note: "" }],
  });

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiFetch<CustomerListResponse>("/customers"),
      apiFetch<ProductOption[]>("/products?status=ENABLED"),
      apiFetch<Array<{ id: string; name: string }>>("/meta/industries"),
    ])
      .then(([customerResponse, productResponse, industryResponse]) => {
        if (cancelled) {
          return;
        }

        setCustomers(customerResponse.items);
        setProducts(productResponse);
        setIndustries(industryResponse);
        if (!form.customerId && customerResponse.items[0]) {
          setForm((prev) => ({
            ...prev,
            customerId: customerResponse.items[0].id,
          }));
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "加载通用报价数据失败",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [form.customerId]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === form.customerId),
    [customers, form.customerId],
  );

  const selectedItemCount = useMemo(
    () => form.items.filter((item) => item.productId).length,
    [form.items],
  );

  const draftSubtotal = useMemo(
    () =>
      form.items.reduce((sum, item) => {
        if (!item.productId) {
          return sum;
        }
        return sum + Number(item.unitPrice || 0) * Number(item.quantity || 0);
      }, 0),
    [form.items],
  );

  const currentStep = preview ? 4 : 2;

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
          remark: item.note || undefined,
        })),
    };
  }

  async function handlePreview() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await apiFetch<PreviewResponse>(
        "/general-quotes/calculate",
        {
          method: "POST",
          body: JSON.stringify(normalizedPayload()),
        },
      );
      setPreview(response);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "预览失败",
      );
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
        body: JSON.stringify(normalizedPayload()),
      });
      setMessage("通用报价已创建，正在跳转。");
      router.push(`/quotations/${response.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "创建报价失败",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="workspace-stack">
      <WorkspacePageHeader
        actions={
          <>
            {selectedCustomer ? (
              <Link
                className="button secondary inline"
                href={`/customers/${selectedCustomer.id}`}
              >
                返回客户
              </Link>
            ) : null}
            <Link className="button secondary inline" href="/products">
              查看产品库
            </Link>
            <button
              className="button inline"
              onClick={handlePreview}
              type="button"
              disabled={loading}
            >
              {loading ? "计算中..." : "更新预览"}
            </button>
          </>
        }
        description="通用报价采用统一步骤条和固定摘要区，把客户、品项、折扣、备注和校验收束在同一条正式报价流程里。"
        eyebrow="报价编辑器"
        meta={[
          { label: "关联客户", value: selectedCustomer?.name || "未选择" },
          { label: "已选品项", value: String(selectedItemCount) },
        ]}
        title="通用报价"
      />

      <StepStrip
        currentStep={currentStep}
        steps={[
          "客户与行业",
          "产品品项",
          "折扣与备注",
          "摘要校验",
          "生成正式报价",
        ]}
      />

      <section className="editor-shell">
        <div className="editor-main">
          <section className="panel stack">
            <div className="section-heading">
              <h3>客户与行业</h3>
              <p>
                先锁定客户、行业和折扣方式，确保后续产品项都在同一报价上下文里计算。
              </p>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>关联客户</label>
                <select
                  value={form.customerId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      customerId: event.target.value,
                    }))
                  }
                >
                  <option value="">请选择客户</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}{" "}
                      {customer.companyName ? `· ${customer.companyName}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>行业</label>
                <select
                  value={form.industryGroupId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      industryGroupId: event.target.value,
                    }))
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
                    setForm((prev) => ({
                      ...prev,
                      discountType: event.target.value,
                    }))
                  }
                >
                  <option value="amount">直减金额</option>
                  <option value="percentage">折扣百分比</option>
                </select>
              </div>

              <div className="field">
                <label>
                  {form.discountType === "percentage"
                    ? "折扣（%）"
                    : "优惠金额"}
                </label>
                <input
                  type="number"
                  value={form.discountValue}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      discountValue: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="field full">
                <label>优惠原因</label>
                <input
                  placeholder="例如：首单试用、示范合作、组合采购"
                  value={form.discountReason}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      discountReason: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="field full">
                <label>备注</label>
                <textarea
                  value={form.remark}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, remark: event.target.value }))
                  }
                />
              </div>
            </div>
          </section>

          <section className="panel stack">
            <div className="panel-header">
              <div className="section-heading">
                <h3>产品品项</h3>
                <p>
                  每一行都是正式报价中的可交付项目，控制数量、单价和备注即可完成报价结构。
                </p>
              </div>
              <button
                className="button secondary inline"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    items: [
                      ...prev.items,
                      { productId: "", quantity: "1", unitPrice: "", note: "" },
                    ],
                  }))
                }
                type="button"
              >
                新增产品行
              </button>
            </div>

            <div className="stack">
              {form.items.map((item, index) => {
                const selectedProduct = products.find(
                  (product) => product.id === item.productId,
                );

                return (
                  <div className="item-card" key={`${index}-${item.productId}`}>
                    <div className="item-card__header">
                      <div className="stack compact-gap">
                        <strong>产品行 {index + 1}</strong>
                        <div className="small muted">
                          {selectedProduct
                            ? selectedProduct.displayName
                            : "请选择产品以补齐价格与规格"}
                        </div>
                      </div>

                      <button
                        className="button ghost inline"
                        disabled={form.items.length === 1}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            items: prev.items.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          }))
                        }
                        type="button"
                      >
                        删除该行
                      </button>
                    </div>

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
                                        products.find(
                                          (product) =>
                                            product.id === event.target.value,
                                        )?.suggestedPrice ?? "",
                                    }
                                  : current,
                              ),
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
                                itemIndex === index
                                  ? { ...current, quantity: event.target.value }
                                  : current,
                              ),
                            }))
                          }
                        />
                      </div>

                      <div className="field">
                        <label>单价</label>
                        <input readOnly value={item.unitPrice} />
                      </div>

                      <div className="field">
                        <label>规格 / 单位</label>
                        <input
                          readOnly
                          value={
                            selectedProduct
                              ? `${selectedProduct.specification || "默认规格"} / ${selectedProduct.unit || "项"}`
                              : ""
                          }
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
                                itemIndex === index
                                  ? { ...current, note: event.target.value }
                                  : current,
                              ),
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="editor-side sticky-side">
          <section className="preview-sheet">
            <div className="sheet-header">
              <h3>右侧摘要</h3>
              <div className="muted">
                固定查看报价结构、金额、折扣结果和正式生成动作。
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-list">
                <div className="summary-row">
                  <span>关联客户</span>
                  <strong>{selectedCustomer?.name || "--"}</strong>
                </div>
                <div className="summary-row">
                  <span>已选品项</span>
                  <strong>{selectedItemCount}</strong>
                </div>
                <div className="summary-row">
                  <span>当前小计</span>
                  <strong>{formatMoney(draftSubtotal)}</strong>
                </div>
              </div>
            </div>

            {message ? <div className="small">{message}</div> : null}
            {error ? <div className="small danger-text">{error}</div> : null}

            {preview ? (
              <div className="stack">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>产品</th>
                        <th>数量</th>
                        <th>小计</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.items.map((item) => (
                        <tr key={`${item.productId}-${item.displayName}`}>
                          <td>
                            <strong>{item.displayName}</strong>
                            <div className="small muted">
                              {item.specification || "--"}
                            </div>
                          </td>
                          <td>
                            {item.quantity} {item.unit || ""}
                          </td>
                          <td>{formatMoney(item.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="summary-card">
                  <div className="summary-list">
                    <div className="summary-row">
                      <span>小计</span>
                      <strong>{formatMoney(preview.subtotal)}</strong>
                    </div>
                    <div className="summary-row">
                      <span>优惠</span>
                      <strong>{formatMoney(preview.discountAmount)}</strong>
                    </div>
                    <div className="summary-row">
                      <span>总价</span>
                      <strong>{formatMoney(preview.totalAmount)}</strong>
                    </div>
                  </div>
                  {preview.discountReason ? (
                    <div className="small muted">
                      优惠原因：{preview.discountReason}
                    </div>
                  ) : null}
                  {preview.remark ? (
                    <div className="small muted">备注：{preview.remark}</div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="empty">
                选择客户、品项和数量后更新预览，右侧会显示正式报价结构和金额摘要。
              </div>
            )}

            <div className="action-row">
              <button onClick={handlePreview} type="button" disabled={loading}>
                {loading ? "计算中..." : "生成报价预览"}
              </button>
              <button
                className="button secondary"
                onClick={handleCreate}
                type="button"
                disabled={loading}
              >
                创建正式报价
              </button>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
