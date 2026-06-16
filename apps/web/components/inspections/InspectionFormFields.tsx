"use client";

import { useMemo } from "react";
import {
  createInspectionPaymentForm,
  createInspectionSampleForm,
  createInspectionSampleItemForm,
  inspectionItemStatusOptions,
  inspectionOrderStatusOptions,
  inspectionPaymentStatusOptions,
  type InspectionCustomerOption,
  type InspectionFormValues,
  type InspectionProductOption,
} from "./types";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "../system/SearchableSelect";

type InspectionFormFieldsProps = {
  form: InspectionFormValues;
  customers: InspectionCustomerOption[];
  products: InspectionProductOption[];
  onChange: (patch: Partial<InspectionFormValues>) => void;
  onResetSamples: () => void;
  onResetPayments: () => void;
  onSampleChange: (
    sampleIndex: number,
    patch: Partial<InspectionFormValues["samples"][number]>,
  ) => void;
  onAddSample: () => void;
  onRemoveSample: (sampleIndex: number) => void;
  onItemChange: (
    sampleIndex: number,
    itemIndex: number,
    patch: Partial<InspectionFormValues["samples"][number]["items"][number]>,
  ) => void;
  onAddItem: (sampleIndex: number) => void;
  onRemoveItem: (sampleIndex: number, itemIndex: number) => void;
  onPaymentChange: (
    paymentIndex: number,
    patch: Partial<InspectionFormValues["payments"][number]>,
  ) => void;
  onAddPayment: () => void;
  onRemovePayment: (paymentIndex: number) => void;
};

export function InspectionFormFields({
  form,
  customers,
  products,
  onChange,
  onResetSamples,
  onResetPayments,
  onSampleChange,
  onAddSample,
  onRemoveSample,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onPaymentChange,
  onAddPayment,
  onRemovePayment,
}: InspectionFormFieldsProps) {
  const customerOptions = useMemo<SearchableSelectOption[]>(
    () =>
      customers.map((customer) => ({
        id: customer.id,
        label: customer.name,
        description: customer.companyName || "客户档案",
        keywords: [customer.name, customer.companyName].filter(Boolean).join(" "),
      })),
    [customers],
  );

  const productOptions = useMemo<SearchableSelectOption[]>(
    () =>
      products.map((product) => ({
        id: product.id,
        label: product.displayName,
        description:
          [product.specification, product.unit].filter(Boolean).join(" · ") ||
          "产品档案",
        keywords: [
          product.displayName,
          product.specification,
          product.unit,
          product.suggestedPrice,
        ]
          .filter(Boolean)
          .join(" "),
      })),
    [products],
  );

  return (
    <div className="stack">
      <section className="stack">
        <div className="section-heading">
          <h3>基础信息</h3>
          <p>先把检测单是谁、测什么、送到哪里填完整，后面样本和付款才能顺着走。</p>
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="inspection-title">检测单标题</label>
            <input
              id="inspection-title"
              onChange={(event) => onChange({ title: event.target.value })}
              placeholder="例如：水溶肥全项检测"
              value={form.title}
            />
          </div>

          <div className="field">
            <label htmlFor="inspection-target">检测对象</label>
            <input
              id="inspection-target"
              onChange={(event) =>
                onChange({ inspectionTarget: event.target.value })
              }
              placeholder="填写产品、配方、样本或批次名称"
              value={form.inspectionTarget}
            />
          </div>

          <div className="field">
            <label htmlFor="inspection-customer">关联客户</label>
            <SearchableSelect
              emptyText="没有匹配客户，保持为空即可"
              id="inspection-customer"
              onChange={(value) => onChange({ customerId: value })}
              options={customerOptions}
              placeholder="搜索并选择客户"
              value={form.customerId}
            />
          </div>

          <div className="field">
            <label htmlFor="inspection-product">关联产品</label>
            <SearchableSelect
              emptyText="没有匹配产品，保持为空即可"
              id="inspection-product"
              onChange={(value) => onChange({ productId: value })}
              options={productOptions}
              placeholder="搜索并选择产品"
              value={form.productId}
            />
          </div>

          <div className="field">
            <label htmlFor="inspection-project-type">检测类型</label>
            <input
              id="inspection-project-type"
              onChange={(event) => onChange({ projectType: event.target.value })}
              placeholder="例如：常规理化 / 微生物 / 全项"
              value={form.projectType}
            />
          </div>

          <div className="field">
            <label htmlFor="inspection-lab-name">送检机构</label>
            <input
              id="inspection-lab-name"
              onChange={(event) => onChange({ labName: event.target.value })}
              placeholder="例如：梅里埃、SGS"
              value={form.labName}
            />
          </div>

          <div className="field">
            <label htmlFor="inspection-status">检测状态</label>
            <select
              id="inspection-status"
              onChange={(event) => onChange({ status: event.target.value })}
              value={form.status}
            >
              {inspectionOrderStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="inspection-payment-status">付款状态</label>
            <select
              id="inspection-payment-status"
              onChange={(event) =>
                onChange({ paymentStatus: event.target.value })
              }
              value={form.paymentStatus}
            >
              {inspectionPaymentStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="inspection-submitted-at">送检日期</label>
            <input
              id="inspection-submitted-at"
              type="date"
              onChange={(event) => onChange({ submittedAt: event.target.value })}
              value={form.submittedAt}
            />
          </div>

          <div className="field">
            <label htmlFor="inspection-received-at">收样日期</label>
            <input
              id="inspection-received-at"
              type="date"
              onChange={(event) => onChange({ receivedAt: event.target.value })}
              value={form.receivedAt}
            />
          </div>

          <div className="field">
            <label htmlFor="inspection-lab-city">送检地</label>
            <input
              id="inspection-lab-city"
              onChange={(event) => onChange({ labCity: event.target.value })}
              placeholder="例如：上海"
              value={form.labCity}
            />
          </div>

          <div className="field">
            <label htmlFor="inspection-cycle">预计周期</label>
            <input
              id="inspection-cycle"
              onChange={(event) =>
                onChange({ expectedCycleText: event.target.value })
              }
              placeholder="例如：5-7个工作日"
              value={form.expectedCycleText}
            />
          </div>

          <div className="field">
            <label htmlFor="inspection-contact-name">对接人</label>
            <input
              id="inspection-contact-name"
              onChange={(event) => onChange({ contactName: event.target.value })}
              placeholder="实验室联系人"
              value={form.contactName}
            />
          </div>

          <div className="field">
            <label htmlFor="inspection-contact-phone">联系电话</label>
            <input
              id="inspection-contact-phone"
              onChange={(event) =>
                onChange({ contactPhone: event.target.value })
              }
              placeholder="电话 / 手机"
              value={form.contactPhone}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="inspection-lab-address">送检地址</label>
          <textarea
            id="inspection-lab-address"
            onChange={(event) => onChange({ labAddress: event.target.value })}
            placeholder="填写实验室地址、收件方式或寄样说明"
            rows={3}
            value={form.labAddress}
          />
        </div>

        <div className="field">
          <label htmlFor="inspection-bank-info">付款 / 对公信息</label>
          <textarea
            id="inspection-bank-info"
            onChange={(event) => onChange({ bankInfo: event.target.value })}
            placeholder="可填写收款账户、开票要求或付款提醒"
            rows={3}
            value={form.bankInfo}
          />
        </div>
      </section>

      <section className="stack">
        <div className="detail-block__header">
          <div className="section-heading">
            <h3>样本与检测项目</h3>
            <p>这一块对应 Excel 里的“样本 + 检测项目”，以后催报告也会按这里推进。</p>
          </div>
          <div className="action-row">
            <button
              className="button secondary"
              onClick={onResetSamples}
              type="button"
            >
              重置样本
            </button>
            <button onClick={onAddSample} type="button">
              新增样本
            </button>
          </div>
        </div>

        <div className="focus-list">
          {form.samples.map((sample, sampleIndex) => (
            <article className="list-card stack" key={`sample-${sampleIndex}`}>
              <div className="detail-block__header">
                <div>
                  <strong>样本 {sampleIndex + 1}</strong>
                  <div className="small muted">
                    没有多样本时留一张卡即可，后续随时可以补。
                  </div>
                </div>
                {form.samples.length > 1 ? (
                  <button
                    className="button secondary inline"
                    onClick={() => onRemoveSample(sampleIndex)}
                    type="button"
                  >
                    删除样本
                  </button>
                ) : null}
              </div>

              <div className="grid-2">
                <div className="field">
                  <label htmlFor={`sample-name-${sampleIndex}`}>样本名称</label>
                  <input
                    id={`sample-name-${sampleIndex}`}
                    onChange={(event) =>
                      onSampleChange(sampleIndex, {
                        sampleName: event.target.value,
                      })
                    }
                    placeholder="例如：水溶肥 A 样"
                    value={sample.sampleName}
                  />
                </div>

                <div className="field">
                  <label htmlFor={`sample-type-${sampleIndex}`}>样本类型</label>
                  <input
                    id={`sample-type-${sampleIndex}`}
                    onChange={(event) =>
                      onSampleChange(sampleIndex, {
                        sampleType: event.target.value,
                      })
                    }
                    placeholder="例如：粉剂 / 液体 / 土样"
                    value={sample.sampleType}
                  />
                </div>

                <div className="field">
                  <label htmlFor={`sample-quantity-${sampleIndex}`}>
                    取样量
                  </label>
                  <input
                    id={`sample-quantity-${sampleIndex}`}
                    onChange={(event) =>
                      onSampleChange(sampleIndex, {
                        sampleQuantityText: event.target.value,
                      })
                    }
                    placeholder="例如：500g / 2瓶"
                    value={sample.sampleQuantityText}
                  />
                </div>

                <div className="field">
                  <label htmlFor={`sample-sampled-at-${sampleIndex}`}>
                    取样日期
                  </label>
                  <input
                    id={`sample-sampled-at-${sampleIndex}`}
                    type="date"
                    onChange={(event) =>
                      onSampleChange(sampleIndex, {
                        sampledAt: event.target.value,
                      })
                    }
                    value={sample.sampledAt}
                  />
                </div>

                <div className="field">
                  <label htmlFor={`sample-submitted-at-${sampleIndex}`}>
                    样本送检日期
                  </label>
                  <input
                    id={`sample-submitted-at-${sampleIndex}`}
                    type="date"
                    onChange={(event) =>
                      onSampleChange(sampleIndex, {
                        submittedAt: event.target.value,
                      })
                    }
                    value={sample.submittedAt}
                  />
                </div>

                <div className="field">
                  <label htmlFor={`sample-target-${sampleIndex}`}>样本目标</label>
                  <input
                    id={`sample-target-${sampleIndex}`}
                    onChange={(event) =>
                      onSampleChange(sampleIndex, {
                        sampleTarget: event.target.value,
                      })
                    }
                    placeholder="例如：登记证续展 / 出口备案"
                    value={sample.sampleTarget}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor={`sample-scope-${sampleIndex}`}>检测范围</label>
                <textarea
                  id={`sample-scope-${sampleIndex}`}
                  onChange={(event) =>
                    onSampleChange(sampleIndex, {
                      plannedTestScope: event.target.value,
                    })
                  }
                  placeholder="可写检测项目组合、执行标准或计划范围"
                  rows={2}
                  value={sample.plannedTestScope}
                />
              </div>

              <div className="field">
                <label htmlFor={`sample-note-${sampleIndex}`}>样本备注</label>
                <textarea
                  id={`sample-note-${sampleIndex}`}
                  onChange={(event) =>
                    onSampleChange(sampleIndex, { note: event.target.value })
                  }
                  placeholder="样本包装、寄送说明、补样提醒"
                  rows={2}
                  value={sample.note}
                />
              </div>

              <div className="stack">
                <div className="detail-block__header">
                  <div className="section-heading">
                    <h3>检测项目</h3>
                    <p>建议按一个样本下的多个检测项来拆，这样后面“部分出报告”更准确。</p>
                  </div>
                  <button onClick={() => onAddItem(sampleIndex)} type="button">
                    新增项目
                  </button>
                </div>

                <div className="focus-list">
                  {sample.items.map((item, itemIndex) => (
                    <article
                      className="summary-card stack"
                      key={`sample-${sampleIndex}-item-${itemIndex}`}
                    >
                      <div className="detail-block__header">
                        <strong>项目 {itemIndex + 1}</strong>
                        {sample.items.length > 1 ? (
                          <button
                            className="button secondary inline"
                            onClick={() => onRemoveItem(sampleIndex, itemIndex)}
                            type="button"
                          >
                            删除项目
                          </button>
                        ) : null}
                      </div>

                      <div className="grid-2">
                        <div className="field">
                          <label htmlFor={`item-name-${sampleIndex}-${itemIndex}`}>
                            项目名称
                          </label>
                          <input
                            id={`item-name-${sampleIndex}-${itemIndex}`}
                            onChange={(event) =>
                              onItemChange(sampleIndex, itemIndex, {
                                itemName: event.target.value,
                              })
                            }
                            placeholder="例如：总氮、总磷、pH"
                            value={item.itemName}
                          />
                        </div>

                        <div className="field">
                          <label
                            htmlFor={`item-category-${sampleIndex}-${itemIndex}`}
                          >
                            项目分类
                          </label>
                          <input
                            id={`item-category-${sampleIndex}-${itemIndex}`}
                            onChange={(event) =>
                              onItemChange(sampleIndex, itemIndex, {
                                itemCategory: event.target.value,
                              })
                            }
                            placeholder="例如：理化 / 微生物"
                            value={item.itemCategory}
                          />
                        </div>

                        <div className="field">
                          <label htmlFor={`item-fee-${sampleIndex}-${itemIndex}`}>
                            金额
                          </label>
                          <input
                            id={`item-fee-${sampleIndex}-${itemIndex}`}
                            inputMode="decimal"
                            onChange={(event) =>
                              onItemChange(sampleIndex, itemIndex, {
                                feeAmount: event.target.value,
                              })
                            }
                            placeholder="直接填数字"
                            value={item.feeAmount}
                          />
                        </div>

                        <div className="field">
                          <label
                            htmlFor={`item-fee-text-${sampleIndex}-${itemIndex}`}
                          >
                            金额说明
                          </label>
                          <input
                            id={`item-fee-text-${sampleIndex}-${itemIndex}`}
                            onChange={(event) =>
                              onItemChange(sampleIndex, itemIndex, {
                                feeText: event.target.value,
                              })
                            }
                            placeholder="例如：含税 / 打包价"
                            value={item.feeText}
                          />
                        </div>

                        <div className="field">
                          <label
                            htmlFor={`item-status-${sampleIndex}-${itemIndex}`}
                          >
                            项目状态
                          </label>
                          <select
                            id={`item-status-${sampleIndex}-${itemIndex}`}
                            onChange={(event) =>
                              onItemChange(sampleIndex, itemIndex, {
                                status: event.target.value,
                              })
                            }
                            value={item.status}
                          >
                            {inspectionItemStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="field">
                          <label
                            htmlFor={`item-completed-at-${sampleIndex}-${itemIndex}`}
                          >
                            完成日期
                          </label>
                          <input
                            id={`item-completed-at-${sampleIndex}-${itemIndex}`}
                            type="date"
                            onChange={(event) =>
                              onItemChange(sampleIndex, itemIndex, {
                                completedAt: event.target.value,
                              })
                            }
                            value={item.completedAt}
                          />
                        </div>
                      </div>

                      <div className="field">
                        <label
                          htmlFor={`item-progress-${sampleIndex}-${itemIndex}`}
                        >
                          进度说明
                        </label>
                        <textarea
                          id={`item-progress-${sampleIndex}-${itemIndex}`}
                          onChange={(event) =>
                            onItemChange(sampleIndex, itemIndex, {
                              progressNote: event.target.value,
                            })
                          }
                          placeholder="例如：实验室已收样，预计下周出结果"
                          rows={2}
                          value={item.progressNote}
                        />
                      </div>

                      <div className="field">
                        <label
                          htmlFor={`item-result-${sampleIndex}-${itemIndex}`}
                        >
                          结果摘要
                        </label>
                        <textarea
                          id={`item-result-${sampleIndex}-${itemIndex}`}
                          onChange={(event) =>
                            onItemChange(sampleIndex, itemIndex, {
                              resultSummary: event.target.value,
                            })
                          }
                          placeholder="已有结果时可先写摘要，正式报告后再补附件"
                          rows={2}
                          value={item.resultSummary}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="stack">
        <div className="detail-block__header">
          <div className="section-heading">
            <h3>付款登记</h3>
            <p>付款记录是可选项，先建检测单，费用回单后再逐笔补也可以。</p>
          </div>
          <div className="action-row">
            {form.payments.length ? (
              <button
                className="button secondary"
                onClick={onResetPayments}
                type="button"
              >
                清空付款
              </button>
            ) : null}
            <button onClick={onAddPayment} type="button">
              新增付款
            </button>
          </div>
        </div>

        {form.payments.length ? (
          <div className="focus-list">
            {form.payments.map((payment, paymentIndex) => (
              <article className="summary-card stack" key={`payment-${paymentIndex}`}>
                <div className="detail-block__header">
                  <strong>付款 {paymentIndex + 1}</strong>
                  <button
                    className="button secondary inline"
                    onClick={() => onRemovePayment(paymentIndex)}
                    type="button"
                  >
                    删除付款
                  </button>
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label htmlFor={`payment-date-${paymentIndex}`}>付款日期</label>
                    <input
                      id={`payment-date-${paymentIndex}`}
                      type="date"
                      onChange={(event) =>
                        onPaymentChange(paymentIndex, {
                          paidAt: event.target.value,
                        })
                      }
                      value={payment.paidAt}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor={`payment-amount-${paymentIndex}`}>付款金额</label>
                    <input
                      id={`payment-amount-${paymentIndex}`}
                      inputMode="decimal"
                      onChange={(event) =>
                        onPaymentChange(paymentIndex, {
                          amount: event.target.value,
                        })
                      }
                      placeholder="直接填数字"
                      value={payment.amount}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor={`payment-amount-text-${paymentIndex}`}>
                      金额说明
                    </label>
                    <input
                      id={`payment-amount-text-${paymentIndex}`}
                      onChange={(event) =>
                        onPaymentChange(paymentIndex, {
                          amountText: event.target.value,
                        })
                      }
                      placeholder="例如：预付款 / 尾款"
                      value={payment.amountText}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor={`payment-method-${paymentIndex}`}>付款方式</label>
                    <input
                      id={`payment-method-${paymentIndex}`}
                      onChange={(event) =>
                        onPaymentChange(paymentIndex, {
                          method: event.target.value,
                        })
                      }
                      placeholder="例如：对公转账"
                      value={payment.method}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor={`payment-payer-${paymentIndex}`}>付款方</label>
                    <input
                      id={`payment-payer-${paymentIndex}`}
                      onChange={(event) =>
                        onPaymentChange(paymentIndex, {
                          payerName: event.target.value,
                        })
                      }
                      placeholder="例如：客户公司名称"
                      value={payment.payerName}
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor={`payment-note-${paymentIndex}`}>备注</label>
                  <textarea
                    id={`payment-note-${paymentIndex}`}
                    onChange={(event) =>
                      onPaymentChange(paymentIndex, { note: event.target.value })
                    }
                    placeholder="可写回单、开票、对账说明"
                    rows={2}
                    value={payment.note}
                  />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty">
            当前还没有付款记录，后续在详情页或再次编辑时也可以补。
          </div>
        )}
      </section>

      <section className="stack">
        <div className="section-heading">
          <h3>摘要与备注</h3>
          <p>摘要偏业务视角，备注偏内部交接；额外进度会落成一条初始化时间线。</p>
        </div>

        <div className="field">
          <label htmlFor="inspection-summary">摘要</label>
          <textarea
            id="inspection-summary"
            onChange={(event) => onChange({ summary: event.target.value })}
            placeholder="总结本次检测目标、送检原因或关键背景"
            rows={3}
            value={form.summary}
          />
        </div>

        <div className="field">
          <label htmlFor="inspection-remark">内部备注</label>
          <textarea
            id="inspection-remark"
            onChange={(event) => onChange({ remark: event.target.value })}
            placeholder="给销售、财务或产品团队的内部说明"
            rows={3}
            value={form.remark}
          />
        </div>

        <div className="field">
          <label htmlFor="inspection-timeline-note">初始化进度备注</label>
          <textarea
            id="inspection-timeline-note"
            onChange={(event) => onChange({ timelineNote: event.target.value })}
            placeholder="例如：客户催报告较急，优先安排微生物项目"
            rows={3}
            value={form.timelineNote}
          />
        </div>
      </section>
    </div>
  );
}

export {
  createInspectionPaymentForm,
  createInspectionSampleForm,
  createInspectionSampleItemForm,
};
