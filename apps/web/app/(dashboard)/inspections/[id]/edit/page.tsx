"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { WorkspacePageHeader } from "../../../../../components/dashboard/WorkspacePageHeader";
import {
  InspectionFormFields,
  createInspectionPaymentForm,
  createInspectionSampleForm,
} from "../../../../../components/inspections/InspectionFormFields";
import {
  createInspectionForm,
  inspectionDetailToFormValues,
  isInspectionPaymentEmpty,
  isInspectionSampleEmpty,
  isInspectionSampleItemEmpty,
  toInspectionPayload,
  type InspectionCustomerOption,
  type InspectionDetail,
  type InspectionFormValues,
  type InspectionProductOption,
} from "../../../../../components/inspections/types";
import {
  apiFetch,
  getCurrentUser,
  hasAnyPermission,
} from "../../../../../lib/api";
import { formatMoney } from "../../../../../lib/workspace";

type CustomerListResponse = {
  items: InspectionCustomerOption[];
};

function getNumericValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function InspectionEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const currentUser = getCurrentUser();
  const canEdit = hasAnyPermission(currentUser, [
    "action.inspection.create",
    "action.inspection.update",
  ]);
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [form, setForm] = useState<InspectionFormValues>(createInspectionForm());
  const [customers, setCustomers] = useState<InspectionCustomerOption[]>([]);
  const [products, setProducts] = useState<InspectionProductOption[]>([]);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [detailResponse, customerResponse, productResponse] =
          await Promise.all([
            apiFetch<InspectionDetail>(`/inspections/${params.id}`),
            apiFetch<CustomerListResponse>("/customers?pageSize=200"),
            apiFetch<InspectionProductOption[]>("/products?status=ENABLED"),
          ]);

        if (cancelled) {
          return;
        }

        setInspection(detailResponse);
        setCustomers(customerResponse.items);
        setProducts(productResponse);
        setForm(inspectionDetailToFormValues(detailResponse));
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "加载检测详情失败",
          );
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

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
      setError("当前角色没有编辑检测单权限。");
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
      await apiFetch(`/inspections/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify(toInspectionPayload(form)),
      });
      setMessage("检测单已更新，正在返回详情页...");
      router.replace(`/inspections/${params.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "更新检测单失败",
      );
    } finally {
      setLoading(false);
    }
  }

  if (bootstrapping) {
    return <section className="panel">正在加载检测详情...</section>;
  }

  if (!inspection) {
    return <section className="panel">{error || "未找到检测单信息"}</section>;
  }

  if (!canEdit) {
    return (
      <section className="panel stack">
        <h3>当前角色不可编辑检测单</h3>
        <p className="muted">
          请使用具备检测维护权限的账号编辑，或联系管理员开放权限。
        </p>
        <div className="action-row">
          <Link
            className="button secondary inline"
            href={`/inspections/${inspection.id}`}
          >
            返回检测详情
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
            <Link
              className="button secondary inline"
              href={`/inspections/${inspection.id}`}
            >
              返回检测详情
            </Link>
            <Link className="button ghost inline" href="/inspections">
              返回检测列表
            </Link>
          </>
        }
        description="编辑页重点是维护样本、项目、付款和进度备注，让检测单始终和真实执行情况对齐。"
        eyebrow="检测维护"
        meta={[
          { label: "检测单号", value: inspection.inspectionNo },
          { label: "关联客户", value: selectedCustomer?.name ?? "未关联" },
          { label: "关联产品", value: selectedProduct?.displayName ?? "未关联" },
          { label: "当前项目数", value: String(itemCount) },
        ]}
        title={`编辑 ${inspection.title}`}
      />

      <section className="editor-shell">
        <div className="editor-main">
          <section className="panel stack">
            <div className="section-heading">
              <h3>编辑检测单</h3>
              <p>
                这里会整体保存当前检测结构。样本、项目和付款会以当前页面内容为准覆盖更新。
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
                  {loading ? "保存中..." : "保存更新"}
                </button>
                <button
                  className="button secondary"
                  onClick={() => setForm(inspectionDetailToFormValues(inspection))}
                  type="button"
                >
                  恢复原值
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="editor-side sticky-side">
          <section className="panel stack">
            <div className="section-heading">
              <h3>当前快照</h3>
              <p>正式保存前再看一眼费用、付款和项目数量，避免把执行状态改乱。</p>
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
                <h3>维护提醒</h3>
                <p>
                  进度时间线不会被历史覆盖。若这次有新的催办说明，请写在“初始化进度备注”里追加。
                </p>
              </div>
            </div>

            {selectedCustomer ? (
              <div className="summary-card">
                <div className="section-heading">
                  <h3>关联客户</h3>
                  <p>这张检测单会继续挂在当前客户下，客户详情页右侧也会同步看到。</p>
                </div>
                <Link
                  className="button secondary inline"
                  href={`/customers/${selectedCustomer.id}`}
                >
                  查看客户
                </Link>
              </div>
            ) : null}
          </section>
        </aside>
      </section>
    </div>
  );
}
