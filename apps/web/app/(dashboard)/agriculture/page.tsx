"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StepStrip } from "../../../components/dashboard/StepStrip";
import { WorkspacePageHeader } from "../../../components/dashboard/WorkspacePageHeader";
import { apiFetch } from "../../../lib/api";
import { formatMoney } from "../../../lib/workspace";

type CustomerOption = {
  id: string;
  name: string;
  companyName?: string | null;
};

type CustomerListResponse = {
  items: CustomerOption[];
};

type AgriculturePreview = {
  planName: string;
  discountType: "percentage" | "perBucket";
  discountValue: number;
  discountReason?: string;
  remark?: string;
  perBucketPrice: number;
  unresolvedCount: number;
  totals: {
    gaKg: number;
    gbKg: number;
    gcKg: number;
    gaBuckets: number;
    gbBuckets: number;
    gcBuckets: number;
    totalBuckets: number;
    totalOriginal: number;
    totalDiscounted: number;
  };
  crops: Array<{
    cropName: string;
    cropLabel: string;
    cropType: string | null;
    autoMatched: boolean;
    matchedKeyword?: string | null;
    unresolved: boolean;
    cycleDays: number | null;
    cycleLabel: string;
    stage: "initial" | "maintenance";
    quoteLines: Array<{
      displayName: string;
      bucketCount: number;
      lineTotal: number;
    }>;
  }>;
};

const cropTypeOptions = [
  { value: "cotton", label: "棉花" },
  { value: "fruit", label: "果树类" },
  { value: "asparagus", label: "根茎类（芦笋）" },
  { value: "root_other", label: "根茎类（其他）" },
  { value: "leafy", label: "叶菜类" },
  { value: "melon", label: "瓜果类" },
  { value: "grain", label: "谷类" },
  { value: "seeds", label: "种子类" },
  { value: "flowers", label: "花卉类" },
  { value: "herbs", label: "药用及辛香植物 / 茶叶 / 灌木及其他类" },
  { value: "sprouts", label: "芽菜类" },
];

const defaultCrop = {
  cropName: "",
  manualCropType: "leafy",
  areaMu: "10",
  startDate: "",
  actualCycleDays: "",
  stage: "initial",
  isOrganic: false,
  needGC: true,
  gcWaterLiters: "300",
};

export default function AgriculturePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerIdFromQuery = searchParams.get("customerId") || "";
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [preview, setPreview] = useState<AgriculturePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customerId: customerIdFromQuery,
    planName: "农业生态种植方案",
    discountType: "percentage",
    discountValue: "0",
    discountReason: "",
    remark: "",
    crops: [
      { ...defaultCrop, cropName: "番茄", areaMu: "10", actualCycleDays: "75" },
    ],
  });

  useEffect(() => {
    let cancelled = false;

    apiFetch<CustomerListResponse>("/customers")
      .then((response) => {
        if (cancelled) {
          return;
        }

        setCustomers(response.items);
        if (!customerIdFromQuery && !form.customerId && response.items[0]) {
          setForm((prev) => ({ ...prev, customerId: response.items[0].id }));
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "加载客户失败",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customerIdFromQuery, form.customerId]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === form.customerId),
    [customers, form.customerId],
  );

  const currentStep = preview ? 4 : 2;

  function payload() {
    return {
      customerId: form.customerId,
      planName: form.planName,
      discountType: form.discountType,
      discountValue: Number(form.discountValue || 0),
      discountReason: form.discountReason || undefined,
      remark: form.remark || undefined,
      crops: form.crops.map((crop) => ({
        cropName: crop.cropName,
        manualCropType: crop.manualCropType || undefined,
        areaMu: Number(crop.areaMu || 0),
        startDate: crop.startDate || undefined,
        actualCycleDays: crop.actualCycleDays
          ? Number(crop.actualCycleDays)
          : undefined,
        stage: crop.stage,
        isOrganic: crop.isOrganic,
        needGC: crop.needGC,
        gcWaterLiters: Number(crop.gcWaterLiters || 0),
      })),
    };
  }

  async function handlePreview() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await apiFetch<AgriculturePreview>(
        "/agriculture/preview",
        {
          method: "POST",
          body: JSON.stringify(payload()),
        },
      );
      setPreview(response);
      if (response.unresolvedCount > 0) {
        setMessage("有作物未精确命中，建议先手动确认类别后再生成正式报价。");
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "农业方案预览失败",
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
      const response = await apiFetch<{ id: string }>(
        "/agriculture/quotations",
        {
          method: "POST",
          body: JSON.stringify(payload()),
        },
      );
      router.push(`/quotations/${response.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "创建农业报价失败",
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
            <Link className="button secondary inline" href="/quotations">
              查看档案
            </Link>
            <button
              className="button inline"
              onClick={handlePreview}
              type="button"
              disabled={loading}
            >
              {loading ? "预览中..." : "更新预览"}
            </button>
          </>
        }
        description="农业方案统一走步骤化编辑：先锁定基础信息，再配置作物、周期与桶数，最后在右侧摘要区完成优惠校验和正式生成。"
        eyebrow="方案编辑器"
        meta={[
          { label: "关联客户", value: selectedCustomer?.name || "未选择" },
          { label: "作物数", value: String(form.crops.length) },
        ]}
        title="农业方案"
      />

      <StepStrip
        currentStep={currentStep}
        steps={["基础信息", "作物配置", "周期与桶数", "优惠规则", "预览与生成"]}
      />

      <section className="editor-shell">
        <div className="editor-main">
          <section className="panel stack">
            <div className="section-heading">
              <h3>基础信息</h3>
              <p>
                先锁定客户、方案名称和优惠规则，让后续桶数计算始终处于同一业务上下文。
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
                <label>方案名称</label>
                <input
                  value={form.planName}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      planName: event.target.value,
                    }))
                  }
                />
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
                  <option value="percentage">优惠比例（%）</option>
                  <option value="perBucket">每桶优惠金额（元）</option>
                </select>
              </div>

              <div className="field">
                <label>
                  {form.discountType === "percentage"
                    ? "优惠比例（%）"
                    : "每桶优惠金额（元）"}
                </label>
                <input
                  type="number"
                  step="0.1"
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
                  placeholder="例如：示范基地合作、首批试用"
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
                <h3>作物配置</h3>
                <p>
                  每个作物独立维护类别、面积、周期、阶段和 GC
                  设置，方便逐项校验桶数。
                </p>
              </div>
              <button
                className="button secondary inline"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    crops: [...prev.crops, { ...defaultCrop }],
                  }))
                }
                type="button"
              >
                新增作物
              </button>
            </div>

            <div className="stack">
              {form.crops.map((crop, index) => {
                const cropPreview = preview?.crops[index];

                return (
                  <div className="item-card" key={`${index}-${crop.cropName}`}>
                    <div className="item-card__header">
                      <div className="stack compact-gap">
                        <strong>作物 {index + 1}</strong>
                        <div className="small muted">
                          {cropPreview
                            ? `${cropPreview.cropLabel}${cropPreview.unresolved ? " · 待确认类别" : " · 已生成桶数"}`
                            : "预览后展示识别类别与桶数结果"}
                        </div>
                      </div>

                      <div className="item-card__actions">
                        <button
                          className="button ghost inline"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              crops: [
                                ...prev.crops.slice(0, index + 1),
                                { ...defaultCrop },
                                ...prev.crops.slice(index + 1),
                              ],
                            }))
                          }
                          type="button"
                        >
                          复制新增
                        </button>
                        <button
                          className="button ghost inline"
                          disabled={form.crops.length === 1}
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              crops: prev.crops.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            }))
                          }
                          type="button"
                        >
                          删除
                        </button>
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="field">
                        <label>作物名称</label>
                        <input
                          value={crop.cropName}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              crops: prev.crops.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, cropName: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        />
                      </div>

                      <div className="field">
                        <label>识别类别</label>
                        <input
                          readOnly
                          value={
                            cropPreview
                              ? `${cropPreview.cropLabel}${cropPreview.autoMatched ? `（命中：${cropPreview.matchedKeyword || "自动"}）` : "（手动选择）"}`
                              : "等待预览识别"
                          }
                        />
                      </div>

                      <div className="field">
                        <label>手动作物类别</label>
                        <select
                          value={crop.manualCropType}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              crops: prev.crops.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      manualCropType: event.target.value,
                                    }
                                  : item,
                              ),
                            }))
                          }
                        >
                          {cropTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="field">
                        <label>种植面积（亩）</label>
                        <input
                          type="number"
                          step="0.1"
                          value={crop.areaMu}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              crops: prev.crops.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, areaMu: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        />
                      </div>

                      <div className="field">
                        <label>起始日期</label>
                        <input
                          type="date"
                          value={crop.startDate}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              crops: prev.crops.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, startDate: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        />
                      </div>

                      <div className="field">
                        <label>种植时间（天）</label>
                        <input
                          type="number"
                          value={crop.actualCycleDays}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              crops: prev.crops.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      actualCycleDays: event.target.value,
                                    }
                                  : item,
                              ),
                            }))
                          }
                        />
                      </div>

                      <div className="field">
                        <label>使用阶段</label>
                        <select
                          value={crop.stage}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              crops: prev.crops.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, stage: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        >
                          <option value="initial">首次使用</option>
                          <option value="maintenance">改善后</option>
                        </select>
                      </div>

                      <div className="field">
                        <label>农场类型</label>
                        <select
                          value={crop.isOrganic ? "true" : "false"}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              crops: prev.crops.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      isOrganic: event.target.value === "true",
                                    }
                                  : item,
                              ),
                            }))
                          }
                        >
                          <option value="false">常规</option>
                          <option value="true">有机</option>
                        </select>
                      </div>

                      <div className="field">
                        <label>GC 方案</label>
                        <select
                          value={crop.needGC ? "true" : "false"}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              crops: prev.crops.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      needGC: event.target.value === "true",
                                    }
                                  : item,
                              ),
                            }))
                          }
                        >
                          <option value="true">需要</option>
                          <option value="false">不需要</option>
                        </select>
                      </div>

                      <div className="field">
                        <label>GC 水量（L）</label>
                        <input
                          type="number"
                          step="10"
                          value={crop.gcWaterLiters}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              crops: prev.crops.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      gcWaterLiters: event.target.value,
                                    }
                                  : item,
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
                持续固定显示桶数、金额、作物命中情况和生成动作。
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-list">
                <div className="summary-row">
                  <span>关联客户</span>
                  <strong>{selectedCustomer?.name || "--"}</strong>
                </div>
                <div className="summary-row">
                  <span>作物数量</span>
                  <strong>{form.crops.length}</strong>
                </div>
                <div className="summary-row">
                  <span>优惠规则</span>
                  <strong>
                    {form.discountType === "percentage"
                      ? `${form.discountValue || 0}%`
                      : `${form.discountValue || 0} 元/桶`}
                  </strong>
                </div>
              </div>
            </div>

            {message ? (
              <div className="warning-text small">{message}</div>
            ) : null}
            {error ? <div className="danger-text small">{error}</div> : null}

            {preview ? (
              <div className="stack">
                <div className="summary-card">
                  <div className="summary-list">
                    <div className="summary-row">
                      <span>统一桶价</span>
                      <strong>{formatMoney(preview.perBucketPrice)}</strong>
                    </div>
                    <div className="summary-row">
                      <span>总桶数</span>
                      <strong>{preview.totals.totalBuckets}</strong>
                    </div>
                    <div className="summary-row">
                      <span>优惠后总价</span>
                      <strong>
                        {formatMoney(preview.totals.totalDiscounted)}
                      </strong>
                    </div>
                  </div>
                </div>

                <section className="insight-grid">
                  <article className="insight-card">
                    <div className="insight-label">GA 桶数</div>
                    <div className="insight-value">
                      {preview.totals.gaBuckets}
                    </div>
                    <div className="insight-note">{preview.totals.gaKg}kg</div>
                  </article>
                  <article className="insight-card">
                    <div className="insight-label">GB 桶数</div>
                    <div className="insight-value">
                      {preview.totals.gbBuckets}
                    </div>
                    <div className="insight-note">{preview.totals.gbKg}kg</div>
                  </article>
                  <article className="insight-card">
                    <div className="insight-label">GC 桶数</div>
                    <div className="insight-value">
                      {preview.totals.gcBuckets}
                    </div>
                    <div className="insight-note">{preview.totals.gcKg}kg</div>
                  </article>
                </section>

                <div className="focus-list">
                  {preview.crops.map((crop) => (
                    <article className="focus-card" key={crop.cropName}>
                      <div className="focus-card__top">
                        <div className="focus-card__meta">
                          <h4>{crop.cropName}</h4>
                          <div className="small muted">{crop.cropLabel}</div>
                        </div>
                        <span
                          className={`status-pill ${crop.unresolved ? "warning" : "success"}`}
                        >
                          {crop.unresolved ? "待确认" : "已命中"}
                        </span>
                      </div>

                      <div className="focus-card__detail">
                        <span>周期</span>
                        <strong>{crop.cycleLabel}</strong>
                      </div>

                      {crop.quoteLines.slice(0, 2).map((line) => (
                        <div
                          className="focus-card__detail"
                          key={`${crop.cropName}-${line.displayName}`}
                        >
                          <span>{line.displayName}</span>
                          <strong>
                            {line.bucketCount} 桶 ·{" "}
                            {formatMoney(line.lineTotal)}
                          </strong>
                        </div>
                      ))}
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty">
                先在左侧补齐客户、作物与优惠，再生成预览查看桶数和金额。
              </div>
            )}

            <div className="action-row">
              <button onClick={handlePreview} type="button" disabled={loading}>
                {loading ? "计算中..." : "生成预览"}
              </button>
              <button
                className="button secondary"
                onClick={handleCreate}
                type="button"
                disabled={loading}
              >
                生成正式报价
              </button>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
