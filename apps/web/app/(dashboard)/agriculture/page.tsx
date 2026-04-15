"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

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
    estimatedHarvestDate?: string;
    stage: "initial" | "maintenance";
    isOrganic: boolean;
    needGC: boolean;
    gcWaterLiters: number;
    gaCycleKg: number;
    gbCycleKg: number;
    gcKg: number;
    gaBuckets: number;
    gbBuckets: number;
    gcBuckets: number;
    totalBuckets: number;
    discountedAmount: number;
    notes: string[];
    quoteLines: Array<{
      productCode: string;
      displayName: string;
      specification: string;
      bucketCount: number;
      totalKg: number;
      lineTotal: number;
      note: string;
    }>;
    scheduleRows: Array<{
      step: string;
      time: string;
      estimatedDate?: string;
      product: "GA" | "GB" | "GC";
      kgPerMu: number | null;
      waterLPerMu: number | null;
      totalKg: number | null;
      totalWaterL: number | null;
      tutorial: string;
      note: string;
    }>;
  }>;
  notes: string[];
  documentSections: Array<{ title: string; body: string }>;
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
  { value: "sprouts", label: "芽菜类" }
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
  gcWaterLiters: "300"
};

export default function AgriculturePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [preview, setPreview] = useState<AgriculturePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customerId: "",
    planName: "农业生态种植方案",
    discountType: "percentage",
    discountValue: "0",
    discountReason: "",
    remark: "",
    crops: [{ ...defaultCrop, cropName: "番茄", areaMu: "10", actualCycleDays: "75" }]
  });

  useEffect(() => {
    apiFetch<CustomerListResponse>("/customers")
      .then((response) => {
        setCustomers(response.items);
        if (!form.customerId && response.items[0]) {
          setForm((prev) => ({ ...prev, customerId: response.items[0].id }));
        }
      })
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : "加载客户失败")
      );
  }, []);

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
        actualCycleDays: crop.actualCycleDays ? Number(crop.actualCycleDays) : undefined,
        stage: crop.stage,
        isOrganic: crop.isOrganic,
        needGC: crop.needGC,
        gcWaterLiters: Number(crop.gcWaterLiters || 0)
      }))
    };
  }

  async function handlePreview() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await apiFetch<AgriculturePreview>("/agriculture/preview", {
        method: "POST",
        body: JSON.stringify(payload())
      });
      setPreview(response);
      if (response.unresolvedCount > 0) {
        setMessage("有作物未精确命中，请在左侧手动选择作物类别后重新预览。");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "农业方案预览失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await apiFetch<{ id: string }>("/agriculture/quotations", {
        method: "POST",
        body: JSON.stringify(payload())
      });
      router.push(`/quotations/${response.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "创建农业报价失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="layout-grid">
      <section className="panel stack">
        <div className="toolbar">
          <button
            className="button secondary inline"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                crops: [...prev.crops, { ...defaultCrop }]
              }))
            }
          >
            新增作物
          </button>
          <button onClick={handlePreview} disabled={loading}>
            {loading ? "计算中..." : "生成种植方案预览"}
          </button>
        </div>

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
            <label>方案名称</label>
            <input
              value={form.planName}
              onChange={(event) => setForm((prev) => ({ ...prev, planName: event.target.value }))}
            />
          </div>
          <div className="field">
            <label>优惠方式</label>
            <select
              value={form.discountType}
              onChange={(event) => setForm((prev) => ({ ...prev, discountType: event.target.value }))}
            >
              <option value="percentage">优惠比例（%）</option>
              <option value="perBucket">每桶优惠金额（元）</option>
            </select>
          </div>
          <div className="field">
            <label>{form.discountType === "percentage" ? "优惠比例（%）" : "每桶优惠金额（元）"}</label>
            <input
              type="number"
              step="0.1"
              value={form.discountValue}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, discountValue: event.target.value }))
              }
            />
          </div>
          <div className="field full">
            <label>优惠原因</label>
            <input
              value={form.discountReason}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, discountReason: event.target.value }))
              }
              placeholder="例如：首单试用、示范基地合作"
            />
          </div>
          <div className="field full">
            <label>备注</label>
            <textarea value={form.remark} onChange={(event) => setForm((prev) => ({ ...prev, remark: event.target.value }))} />
          </div>
        </div>

        <div className="stack">
          {form.crops.map((crop, index) => {
            const cropPreview = preview?.crops[index];
            return (
              <div className="quote-card" key={`${index}-${crop.cropName}`}>
                <div className="toolbar">
                  <strong>作物 {index + 1}</strong>
                  <div className="toolbar">
                    <button
                      type="button"
                      className="button ghost inline"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          crops: [...prev.crops.slice(0, index + 1), { ...defaultCrop }, ...prev.crops.slice(index + 1)]
                        }))
                      }
                    >
                      复制新增
                    </button>
                    <button
                      type="button"
                      className="button ghost inline"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          crops: prev.crops.filter((_, itemIndex) => itemIndex !== index)
                        }))
                      }
                      disabled={form.crops.length === 1}
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
                            itemIndex === index ? { ...item, cropName: event.target.value } : item
                          )
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>自动识别类别</label>
                    <input
                      value={
                        cropPreview
                          ? `${cropPreview.cropLabel}${cropPreview.autoMatched ? `（命中：${cropPreview.matchedKeyword || "自动"}` : "（手动选择"}`
                          : "等待预览识别"
                      }
                      readOnly
                    />
                  </div>
                  <div className="field">
                    <label>未命中时手动类别</label>
                    <select
                      value={crop.manualCropType}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          crops: prev.crops.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, manualCropType: event.target.value }
                              : item
                          )
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
                            itemIndex === index ? { ...item, areaMu: event.target.value } : item
                          )
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>起始日期（非必填）</label>
                    <input
                      type="date"
                      value={crop.startDate}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          crops: prev.crops.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, startDate: event.target.value } : item
                          )
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>种植时间（天）</label>
                    <input
                      type="number"
                      step="1"
                      value={crop.actualCycleDays}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          crops: prev.crops.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, actualCycleDays: event.target.value }
                              : item
                          )
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
                            itemIndex === index ? { ...item, stage: event.target.value } : item
                          )
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
                              ? { ...item, isOrganic: event.target.value === "true" }
                              : item
                          )
                        }))
                      }
                    >
                      <option value="false">常规</option>
                      <option value="true">有机</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>GC 沁种方案</label>
                    <select
                      value={crop.needGC ? "true" : "false"}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          crops: prev.crops.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, needGC: event.target.value === "true" }
                              : item
                          )
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
                              ? { ...item, gcWaterLiters: event.target.value }
                              : item
                          )
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {message ? <div className="warning-text small">{message}</div> : null}
        {error ? <div className="danger-text small">{error}</div> : null}
      </section>

      <section className="preview-sheet">
        {preview ? (
          <div className="stack">
            <div className="sheet-header">
              <h3>{preview.planName}</h3>
              <div className="muted">
                统一桶价 ¥{preview.perBucketPrice.toFixed(2)} · 总桶数 {preview.totals.totalBuckets} ·
                优惠后总价 ¥{preview.totals.totalDiscounted.toFixed(2)}
              </div>
            </div>

            <div className="metrics">
              <article className="metric-card">
                <div className="metric-label">GA 用量 / 桶数</div>
                <div className="metric-value" style={{ fontSize: 24 }}>
                  {preview.totals.gaKg}kg / {preview.totals.gaBuckets}
                </div>
              </article>
              <article className="metric-card">
                <div className="metric-label">GB 用量 / 桶数</div>
                <div className="metric-value" style={{ fontSize: 24 }}>
                  {preview.totals.gbKg}kg / {preview.totals.gbBuckets}
                </div>
              </article>
              <article className="metric-card">
                <div className="metric-label">GC 用量 / 桶数</div>
                <div className="metric-value" style={{ fontSize: 24 }}>
                  {preview.totals.gcKg}kg / {preview.totals.gcBuckets}
                </div>
              </article>
            </div>

            <div className="quote-card">
              <div>原价合计：¥{preview.totals.totalOriginal.toFixed(2)}</div>
              <div>优惠后合计：¥{preview.totals.totalDiscounted.toFixed(2)}</div>
              {preview.discountReason ? <div>优惠原因：{preview.discountReason}</div> : null}
              {preview.remark ? <div>备注：{preview.remark}</div> : null}
            </div>

            {preview.crops.map((crop) => (
              <div className="quote-card" key={`${crop.cropName}-${crop.cycleLabel}`}>
                <strong>
                  {crop.cropName}｜{crop.cropLabel}
                </strong>
                <div className="small muted">
                  {crop.cycleLabel}
                  {crop.estimatedHarvestDate ? ` · 预计收成 ${crop.estimatedHarvestDate}` : ""}
                  {" · "}
                  {crop.stage === "initial" ? "首次使用" : "改善后"} · {crop.isOrganic ? "有机" : "常规"}
                </div>
                {crop.unresolved ? (
                  <div className="warning-text small" style={{ marginTop: 8 }}>
                    该作物尚未确认类别，请手动选择后重新预览。
                  </div>
                ) : (
                  <>
                    <div className="small" style={{ marginTop: 8 }}>
                      GA {crop.gaCycleKg}kg / {crop.gaBuckets}桶，GB {crop.gbCycleKg}kg / {crop.gbBuckets}桶，
                      GC {crop.gcKg}kg / {crop.gcBuckets}桶，合计 {crop.totalBuckets}桶，金额 ¥
                      {crop.discountedAmount.toFixed(2)}
                    </div>

                    <div className="table-wrap" style={{ marginTop: 12 }}>
                      <table>
                        <thead>
                          <tr>
                            <th>步骤</th>
                            <th>时间节点</th>
                            <th>预计日期</th>
                            <th>产品</th>
                            <th>每亩用量</th>
                            <th>阶段总量</th>
                          </tr>
                        </thead>
                        <tbody>
                          {crop.scheduleRows.map((row) => (
                            <tr key={`${crop.cropName}-${row.step}-${row.product}`}>
                              <td>{row.step}</td>
                              <td>{row.time}</td>
                              <td>{row.estimatedDate || "-"}</td>
                              <td>{row.product}</td>
                              <td>{row.product === "GC" ? "-" : `${row.kgPerMu?.toFixed(2)}kg/亩`}</td>
                              <td>
                                {row.product === "GC"
                                  ? row.note
                                  : `${row.totalKg?.toFixed(2)}kg / ${row.totalWaterL?.toFixed(2)}L`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="stack" style={{ marginTop: 12 }}>
                      {crop.quoteLines.map((line) => (
                        <div className="followup-card" key={`${crop.cropName}-${line.productCode}`}>
                          <strong>{line.displayName}</strong>
                          <div className="small muted">
                            {line.specification} · {line.bucketCount}桶 · {line.totalKg}kg
                          </div>
                          <div className="small">金额：¥{line.lineTotal.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>

                    <ul className="small" style={{ margin: "12px 0 0 18px" }}>
                      {crop.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ))}

            <div className="stack">
              {preview.documentSections.map((section) => (
                <div className="quote-card" key={section.title}>
                  <strong>{section.title}</strong>
                  <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{section.body}</div>
                </div>
              ))}
            </div>

            <div className="quote-card">
              <strong>统一说明</strong>
              <ul className="small" style={{ margin: "12px 0 0 18px" }}>
                {preview.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>

            <div className="toolbar">
              <button onClick={handlePreview} disabled={loading}>
                重新预览
              </button>
              <button
                className="button secondary"
                onClick={handleCreate}
                disabled={loading || preview.unresolvedCount > 0}
              >
                写入报价记录并导出
              </button>
            </div>
          </div>
        ) : (
          <div className="empty">
            左侧已切换为你现有农业模块的字段结构。填写作物、阶段、农场类型、GC 与优惠规则后，
            点击“生成种植方案预览”即可得到正式后台版预览。
          </div>
        )}
      </section>
    </div>
  );
}
