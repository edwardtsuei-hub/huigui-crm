"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { WorkspacePageHeader } from "../../../../components/dashboard/WorkspacePageHeader";
import {
  InspectionFormFields,
  createInspectionPaymentForm,
  createInspectionSampleForm,
} from "../../../../components/inspections/InspectionFormFields";
import {
  createInspectionForm,
  isInspectionPaymentEmpty,
  isInspectionSampleEmpty,
  isInspectionSampleItemEmpty,
  toInspectionPayload,
  type InspectionCustomerOption,
  type InspectionFormValues,
  type InspectionProductOption,
} from "../../../../components/inspections/types";
import {
  apiFetch,
  getCurrentUser,
  hasAnyPermission,
} from "../../../../lib/api";
import { formatMoney } from "../../../../lib/workspace";

type CustomerListResponse = {
  items: InspectionCustomerOption[];
};

type InspectionCreateResult = {
  id: string;
};

function getNumericValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function InspectionNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = getCurrentUser();
  const canEdit = hasAnyPermission(currentUser, [
    "action.inspection.create",
    "action.inspection.update",
  ]);
  const initialPrefill = {
    customerId: searchParams.get("customerId") ?? "",
    productId: searchParams.get("productId") ?? "",
    title: searchParams.get("title") ?? "",
    inspectionTarget: searchParams.get("inspectionTarget") ?? "",
  };
  const [form, setForm] = useState<InspectionFormValues>(() =>
    createInspectionForm(initialPrefill),
  );
  const [customers, setCustomers] = useState<InspectionCustomerOption[]>([]);
  const [products, setProducts] = useState<InspectionProductOption[]>([]);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        const [customerResponse, productResponse] = await Promise.all([
          apiFetch<CustomerListResponse>("/customers?pageSize=200"),
          apiFetch<InspectionProductOption[]>("/products?status=ENABLED"),
        ]);

        if (cancelled) {
          return;
        }

        setCustomers(customerResponse.items);
        setProducts(productResponse);
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "加载检测录入配置失败",
          );
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const selectedProduct = products.find((product) => product.id === form.productId);
    const selectedCustomer = customers.find(
      (customer) => customer.id === form.customerId,
    );

    if (!selectedProduct && !selectedCustomer) {
      return;
    }

    setForm((current) => {
      let changed = false;
      let next = current;

      if (!current.inspectionTarget.trim() && selectedProduct?.displayName) {
        next = {
          ...next,
          inspectionTarget: selectedProduct.displayName,
        };
        changed = true;
      }

      if (!current.title.trim()) {
        const subject = selectedProduct?.displayName ?? selectedCustomer?.name;
        if (subject) {
          next = {
            ...next,
            title: `${subject}检测`,
          };
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [customers, form.customerId, form.productId, products]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === form.customerId) ?? null,
    [customers, form.customerId],
  );
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === form.productId) ?? null,
    [form.productId, products],
  );
  const sampleCount = useMemo(
    () => form.samples.filter((sample) => !isInspectionSampleEmpty(sample)).length,
    [form.samples],
  );
  const itemCount = useMemo(
    () =>
      form.samples.reduce(
        (total, sample) =>
          total +
          sample.items.filter((item) => !isInspectionSampleItemEmpty(item)).length,
        0,
      ),
    [form.samples],
  );
  const totalFee = useMemo(
    () =>
      form.samples.reduce(
        (sampleTotal, sample) =>
          sampleTotal +
          sample.items.reduce(
            (itemTotal, item) => itemTotal + getNumericValue(item.feeAmount),
            0,
          ),
        0,
      ),
    [form.samples],
  );
  const paidAmount = useMemo(
    () =>
      form.payments.reduce(
        (sum, payment) => sum + getNumericValue(payment.amount),
        0,
      ),
    [form.payments],
  );

  function updateForm(patch: Partial<InspectionFormValues>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function updateSample(
    sampleIndex: number,
    patch: Partial<InspectionFormValues["samples"][number]>,
  ) {
    setForm((current) => ({
      ...current,
      samples: current.samples.map((sample, index) =>
        index === sampleIndex ? { ...sample, ...patch } : sample,
      ),
    }));
  }

  function updateItem(
    sampleIndex: number,
    itemIndex: number,
    patch: Partial<InspectionFormValues["samples"][number]["items"][number]>,
  ) {
    setForm((current) => ({
      ...current,
      samples: current.samples.map((sample, currentSampleIndex) =>
        currentSampleIndex === sampleIndex
          ? {
              ...sample,
              items: sample.items.map((item, currentItemIndex) =>
                currentItemIndex === itemIndex ? { ...item, ...patch } : item,
              ),
            }
          : sample,
      ),
    }));
  }

  function updatePayment(
    paymentIndex: number,
    patch: Partial<InspectionFormValues["payments"][number]>,
  ) {
    setForm((current) => ({
      ...current,
      payments: current.payments.map((payment, index) =>
        index === paymentIndex ? { ...payment, ...patch } : payment,
      ),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canEdit) {
      setError("当前角色没有新建检测单权限。");
      return;
    }

    if (!form.title.trim() || !form.inspectionTarget.trim() || !form.labName.trim()) {
      setError("请先填写检测单标题、检测对象和送检机构。");
      return;
    }

    const invalidSample = form.samples.find(
      (sample) => !isInspectionSampleEmpty(sample) && !sample.sampleName.trim(),
    );
    if (invalidSample) {
      setError("存在已填写内容但缺少样本名称的样本卡，请先补齐。");
      return;
    }

    const invalidItem = form.samples
      .flatMap((sample) => sample.items)
      .find((item) => !isInspectionSampleItemEmpty(item) && !item.itemName.trim());
    if (invalidItem) {
      setError("存在已填写内容但缺少项目名称的检测项目，请先补齐。");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const created = await apiFetch<InspectionCreateResult>("/inspections", {
        method: "POST",
        body: JSON.stringify(toInspectionPayload(form)),
      });
      setMessage("检测单已创建，正在跳转详情页...");
      router.replace(`/inspections/${created.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "创建检测单失败",
      );
    } finally {
      setLoading(false);
    }
  }

  if (bootstrapping) {
    return <section className="panel">正在加载检测录入配置...</section>;
  }

  if (!canEdit) {
    return (
      <section className="panel stack">
        <h3>当前角色不可新增检测单</h3>
        <p className="muted">
          请使用具备检测录入权限的账号创建，或联系管理员开放权限。
        </p>
        <div className="action-row">
          <Link className="button secondary inline" href="/inspections">
            返回检测列表
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="workspace-stack">
      <WorkspacePageHeader
        actions={
          <>
            <Link className="button secondary inline" href="/inspections">
              返回检测列表
            </Link>
            {selectedCustomer ? (
              <Link
                className="button secondary inline"
                href={`/customers/${selectedCustomer.id}`}
              >
                查看客户
              </Link>
            ) : null}
            {selectedProduct ? (
              <Link
                className="button secondary inline"
                href={`/products/${selectedProduct.id}`}
              >
                查看产品
              </Link>
            ) : null}
          </>
        }
        description="检测单单独成页录入，先确定对象和实验室，再按样本拆项目、登记费用和初始进度。"
        eyebrow="检测录入"
        meta={[
          { label: "关联客户", value: selectedCustomer?.name ?? "未关联" },
          { label: "关联产品", value: selectedProduct?.displayName ?? "未关联" },
          { label: "样本数", value: String(sampleCount) },
          { label: "项目数", value: String(itemCount) },
        ]}
        title="新建检测单"
      />

      <section className="editor-shell">
        <div className="editor-main">
          <section className="panel stack">
            <div className="section-heading">
              <h3>检测单录入</h3>
              <p>
                录入结构按“检测单 - 样本 - 项目 - 付款”拆开，和你那张 Excel 的工作流是一致的。
              </p>
            </div>

            <form className="stack" onSubmit={handleSubmit}>
              <InspectionFormFields
                customers={customers}
                form={form}
                onAddItem={(sampleIndex) =>
                  setForm((current) => ({
                    ...current,
                    samples: current.samples.map((sample, index) =>
                      index === sampleIndex
                        ? {
                            ...sample,
                            items: [...sample.items, createInspectionSampleForm().items[0]],
                          }
                        : sample,
                    ),
                  }))
                }
                onAddPayment={() =>
                  setForm((current) => ({
                    ...current,
                    payments: [...current.payments, createInspectionPaymentForm()],
                  }))
                }
                onAddSample={() =>
                  setForm((current) => ({
                    ...current,
                    samples: [...current.samples, createInspectionSampleForm()],
                  }))
                }
                onChange={updateForm}
                onItemChange={updateItem}
                onPaymentChange={updatePayment}
                onRemoveItem={(sampleIndex, itemIndex) =>
                  setForm((current) => ({
                    ...current,
                    samples: current.samples.map((sample, index) =>
                      index === sampleIndex
                        ? {
                            ...sample,
                            items: sample.items.filter(
                              (_, currentItemIndex) => currentItemIndex !== itemIndex,
                            ),
                          }
                        : sample,
                    ),
                  }))
                }
                onRemovePayment={(paymentIndex) =>
                  setForm((current) => ({
                    ...current,
                    payments: current.payments.filter(
                      (_, index) => index !== paymentIndex,
                    ),
                  }))
                }
                onRemoveSample={(sampleIndex) =>
                  setForm((current) => ({
                    ...current,
                    samples: current.samples.filter(
                      (_, index) => index !== sampleIndex,
                    ),
                  }))
                }
                onResetPayments={() => updateForm({ payments: [] })}
                onResetSamples={() =>
                  updateForm({ samples: [createInspectionSampleForm()] })
                }
                onSampleChange={updateSample}
                products={products}
              />

              {message ? <div className="small">{message}</div> : null}
              {error ? <div className="small danger-text">{error}</div> : null}

              <div className="action-row">
                <button disabled={loading} type="submit">
                  {loading ? "创建中..." : "创建检测单"}
                </button>
                <button
                  className="button secondary"
                  onClick={() => setForm(createInspectionForm(initialPrefill))}
                  type="button"
                >
                  重置表单
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="editor-side sticky-side">
          <section className="panel stack">
            <div className="section-heading">
              <h3>录入摘要</h3>
              <p>右侧先看结构是否合理，再决定今天是建单、催报告还是补回款。</p>
            </div>

            <div className="summary-card">
              <div className="summary-list">
                <div className="summary-row">
                  <span>当前样本</span>
                  <strong>{sampleCount}</strong>
                </div>
                <div className="summary-row">
                  <span>检测项目</span>
                  <strong>{itemCount}</strong>
                </div>
                <div className="summary-row">
                  <span>预计费用</span>
                  <strong>{formatMoney(totalFee)}</strong>
                </div>
                <div className="summary-row">
                  <span>已登记付款</span>
                  <strong>{formatMoney(paidAmount)}</strong>
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="section-heading">
                <h3>录入提醒</h3>
                <p>
                  样本卡可以先少后多。真正决定“是否能催进度”的，是项目名称和状态有没有拆清楚。
                </p>
              </div>
            </div>

            {form.payments.some((payment) => !isInspectionPaymentEmpty(payment)) ? (
              <div className="summary-card">
                <div className="section-heading">
                  <h3>付款提示</h3>
                  <p>
                    已经录入了付款信息的话，建议同步上传回单到档案中心，后面财务就能直接串起来。
                  </p>
                </div>
              </div>
            ) : null}
          </section>
        </aside>
      </section>
    </div>
  );
}
