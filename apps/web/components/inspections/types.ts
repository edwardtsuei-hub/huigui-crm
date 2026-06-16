"use client";

export type InspectionListItem = {
  id: string;
  inspectionNo: string;
  title: string;
  projectType?: string | null;
  inspectionTarget: string;
  labName: string;
  customer?: { id: string; name: string } | null;
  product?: { id: string; name: string } | null;
  creator?: {
    id: string;
    displayName: string;
    department?: string | null;
  } | null;
  status: string;
  paymentStatus: string;
  submittedAt?: string | null;
  updatedAt: string;
  createdAt: string;
  sampleCount: number;
  itemCount: number;
  reportedItemCount: number;
  totalFee: string;
  totalPaidAmount: string;
  latestTimeline?: {
    eventType: string;
    content: string;
    eventAt: string;
  } | null;
};

export type InspectionDetail = InspectionListItem & {
  labCity?: string | null;
  labAddress?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  expectedCycleText?: string | null;
  bankInfo?: string | null;
  summaryText?: string | null;
  remark?: string | null;
  receivedAt?: string | null;
  samples: Array<{
    id: string;
    sampleName: string;
    sampleType?: string | null;
    sampleTarget?: string | null;
    sampleQuantityText?: string | null;
    sampledAt?: string | null;
    submittedAt?: string | null;
    plannedTestScope?: string | null;
    note?: string | null;
    items: Array<{
      id: string;
      itemName: string;
      itemCategory?: string | null;
      feeText?: string | null;
      feeAmount?: string | null;
      status: string;
      resultSummary?: string | null;
      progressNote?: string | null;
      completedAt?: string | null;
    }>;
  }>;
  payments: Array<{
    id: string;
    paidAt?: string | null;
    amount?: string | null;
    amountText?: string | null;
    method?: string | null;
    payerName?: string | null;
    voucherFileId?: string | null;
    invoiceFileId?: string | null;
    note?: string | null;
    createdAt: string;
  }>;
  timelines: Array<{
    id: string;
    sampleId?: string | null;
    itemId?: string | null;
    eventType: string;
    eventAt?: string | null;
    content: string;
    createdAt: string;
  }>;
  attachments: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    businessType?: string | null;
    createdAt: string;
  }>;
};

export type InspectionAttachmentCategory =
  | "inspection_report"
  | "inspection_payment_voucher"
  | "inspection_invoice"
  | "inspection_sample_photo"
  | "inspection_other";

export type InspectionListResponse = {
  items: InspectionListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type InspectionCustomerOption = {
  id: string;
  name: string;
  companyName?: string | null;
};

export type InspectionProductOption = {
  id: string;
  displayName: string;
  suggestedPrice?: string | null;
  unit?: string | null;
  specification?: string | null;
};

export type InspectionSampleItemFormValues = {
  itemName: string;
  itemCategory: string;
  feeText: string;
  feeAmount: string;
  status: string;
  resultSummary: string;
  progressNote: string;
  completedAt: string;
};

export type InspectionSampleFormValues = {
  sampleName: string;
  sampleType: string;
  sampleTarget: string;
  sampleQuantityText: string;
  sampledAt: string;
  submittedAt: string;
  plannedTestScope: string;
  note: string;
  items: InspectionSampleItemFormValues[];
};

export type InspectionPaymentFormValues = {
  paidAt: string;
  amount: string;
  amountText: string;
  method: string;
  payerName: string;
  note: string;
};

export type InspectionFormValues = {
  title: string;
  customerId: string;
  productId: string;
  projectType: string;
  inspectionTarget: string;
  labName: string;
  labCity: string;
  labAddress: string;
  contactName: string;
  contactPhone: string;
  expectedCycleText: string;
  bankInfo: string;
  summary: string;
  remark: string;
  submittedAt: string;
  receivedAt: string;
  status: string;
  paymentStatus: string;
  timelineNote: string;
  samples: InspectionSampleFormValues[];
  payments: InspectionPaymentFormValues[];
};

export const inspectionOrderStatusOptions = [
  { value: "DRAFT", label: "草稿" },
  { value: "SAMPLED", label: "已取样" },
  { value: "SUBMITTED", label: "已送检" },
  { value: "RECEIVED", label: "已收样" },
  { value: "IN_PROGRESS", label: "检测中" },
  { value: "PARTIAL_REPORTED", label: "部分出报告" },
  { value: "COMPLETED", label: "已完成" },
  { value: "ARCHIVED", label: "已归档" },
  { value: "CANCELED", label: "已取消" },
] as const;

export const inspectionPaymentStatusOptions = [
  { value: "UNPAID", label: "未付款" },
  { value: "PARTIAL", label: "部分付款" },
  { value: "PAID", label: "已付款" },
  { value: "REFUNDED", label: "已退款" },
] as const;

export const inspectionItemStatusOptions = [
  { value: "PENDING", label: "待开始" },
  { value: "IN_PROGRESS", label: "检测中" },
  { value: "REPORTED", label: "已出结果" },
  { value: "FAILED", label: "异常 / 未通过" },
  { value: "CANCELED", label: "已取消" },
] as const;

export const inspectionAttachmentCategoryOptions: Array<{
  value: InspectionAttachmentCategory;
  label: string;
}> = [
  { value: "inspection_report", label: "检测报告" },
  { value: "inspection_payment_voucher", label: "付款回单" },
  { value: "inspection_invoice", label: "发票" },
  { value: "inspection_sample_photo", label: "样品照片" },
  { value: "inspection_other", label: "其他附件" },
];

export function createInspectionSampleItemForm(): InspectionSampleItemFormValues {
  return {
    itemName: "",
    itemCategory: "",
    feeText: "",
    feeAmount: "",
    status: "PENDING",
    resultSummary: "",
    progressNote: "",
    completedAt: "",
  };
}

export function createInspectionSampleForm(): InspectionSampleFormValues {
  return {
    sampleName: "",
    sampleType: "",
    sampleTarget: "",
    sampleQuantityText: "",
    sampledAt: "",
    submittedAt: "",
    plannedTestScope: "",
    note: "",
    items: [createInspectionSampleItemForm()],
  };
}

export function createInspectionPaymentForm(): InspectionPaymentFormValues {
  return {
    paidAt: "",
    amount: "",
    amountText: "",
    method: "",
    payerName: "",
    note: "",
  };
}

export function createInspectionForm(
  initial?: Partial<InspectionFormValues>,
): InspectionFormValues {
  const merged = {
    title: "",
    customerId: "",
    productId: "",
    projectType: "",
    inspectionTarget: "",
    labName: "",
    labCity: "",
    labAddress: "",
    contactName: "",
    contactPhone: "",
    expectedCycleText: "",
    bankInfo: "",
    summary: "",
    remark: "",
    submittedAt: "",
    receivedAt: "",
    status: "DRAFT",
    paymentStatus: "UNPAID",
    timelineNote: "",
    ...initial,
  };

  return {
    ...merged,
    samples: initial?.samples?.length
      ? initial.samples.map((sample) => ({
          ...createInspectionSampleForm(),
          ...sample,
          items: sample.items?.length
            ? sample.items.map((item) => ({
                ...createInspectionSampleItemForm(),
                ...item,
              }))
            : [createInspectionSampleItemForm()],
        }))
      : [createInspectionSampleForm()],
    payments: initial?.payments?.length
      ? initial.payments.map((payment) => ({
          ...createInspectionPaymentForm(),
          ...payment,
        }))
      : [],
  };
}

function trimOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function parseOptionalNumber(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function isInspectionSampleItemEmpty(
  item: InspectionSampleItemFormValues,
) {
  return ![
    item.itemName,
    item.itemCategory,
    item.feeText,
    item.feeAmount,
    item.resultSummary,
    item.progressNote,
    item.completedAt,
  ].some((value) => value.trim());
}

export function isInspectionSampleEmpty(sample: InspectionSampleFormValues) {
  return ![
    sample.sampleName,
    sample.sampleType,
    sample.sampleTarget,
    sample.sampleQuantityText,
    sample.sampledAt,
    sample.submittedAt,
    sample.plannedTestScope,
    sample.note,
  ].some((value) => value.trim()) &&
    sample.items.every((item) => isInspectionSampleItemEmpty(item));
}

export function isInspectionPaymentEmpty(payment: InspectionPaymentFormValues) {
  return ![
    payment.paidAt,
    payment.amount,
    payment.amountText,
    payment.method,
    payment.payerName,
    payment.note,
  ].some((value) => value.trim());
}

export function toInspectionPayload(form: InspectionFormValues) {
  const samples = form.samples
    .filter((sample) => !isInspectionSampleEmpty(sample))
    .map((sample) => ({
      sampleName: sample.sampleName.trim(),
      sampleType: trimOptionalText(sample.sampleType),
      sampleTarget: trimOptionalText(sample.sampleTarget),
      sampleQuantityText: trimOptionalText(sample.sampleQuantityText),
      sampledAt: trimOptionalText(sample.sampledAt),
      submittedAt: trimOptionalText(sample.submittedAt),
      plannedTestScope: trimOptionalText(sample.plannedTestScope),
      note: trimOptionalText(sample.note),
      items: sample.items
        .filter((item) => !isInspectionSampleItemEmpty(item))
        .map((item) => ({
          itemName: item.itemName.trim(),
          itemCategory: trimOptionalText(item.itemCategory),
          feeText: trimOptionalText(item.feeText),
          feeAmount: parseOptionalNumber(item.feeAmount),
          status: item.status || "PENDING",
          resultSummary: trimOptionalText(item.resultSummary),
          progressNote: trimOptionalText(item.progressNote),
          completedAt: trimOptionalText(item.completedAt),
        })),
    }));

  const payments = form.payments
    .filter((payment) => !isInspectionPaymentEmpty(payment))
    .map((payment) => ({
      paidAt: trimOptionalText(payment.paidAt),
      amount: parseOptionalNumber(payment.amount),
      amountText: trimOptionalText(payment.amountText),
      method: trimOptionalText(payment.method),
      payerName: trimOptionalText(payment.payerName),
      note: trimOptionalText(payment.note),
    }));

  return {
    title: form.title.trim(),
    customerId: trimOptionalText(form.customerId),
    productId: trimOptionalText(form.productId),
    projectType: trimOptionalText(form.projectType),
    inspectionTarget: form.inspectionTarget.trim(),
    labName: form.labName.trim(),
    labCity: trimOptionalText(form.labCity),
    labAddress: trimOptionalText(form.labAddress),
    contactName: trimOptionalText(form.contactName),
    contactPhone: trimOptionalText(form.contactPhone),
    expectedCycleText: trimOptionalText(form.expectedCycleText),
    bankInfo: trimOptionalText(form.bankInfo),
    summary: trimOptionalText(form.summary),
    remark: trimOptionalText(form.remark),
    submittedAt: trimOptionalText(form.submittedAt),
    receivedAt: trimOptionalText(form.receivedAt),
    status: form.status || "DRAFT",
    paymentStatus: form.paymentStatus || "UNPAID",
    samples: samples.length ? samples : undefined,
    payments: payments.length ? payments : undefined,
    timelines: trimOptionalText(form.timelineNote)
      ? [
          {
            eventType: "NOTE",
            content: form.timelineNote.trim(),
          },
        ]
      : undefined,
  };
}

export function inspectionDetailToFormValues(
  inspection: InspectionDetail,
): InspectionFormValues {
  return createInspectionForm({
    title: inspection.title,
    customerId: inspection.customer?.id ?? "",
    productId: inspection.product?.id ?? "",
    projectType: inspection.projectType ?? "",
    inspectionTarget: inspection.inspectionTarget,
    labName: inspection.labName,
    labCity: inspection.labCity ?? "",
    labAddress: inspection.labAddress ?? "",
    contactName: inspection.contactName ?? "",
    contactPhone: inspection.contactPhone ?? "",
    expectedCycleText: inspection.expectedCycleText ?? "",
    bankInfo: inspection.bankInfo ?? "",
    summary: inspection.summaryText ?? "",
    remark: inspection.remark ?? "",
    submittedAt: inspection.submittedAt?.slice(0, 10) ?? "",
    receivedAt: inspection.receivedAt?.slice(0, 10) ?? "",
    status: inspection.status,
    paymentStatus: inspection.paymentStatus,
    timelineNote: "",
    samples: inspection.samples.map((sample) => ({
      sampleName: sample.sampleName,
      sampleType: sample.sampleType ?? "",
      sampleTarget: sample.sampleTarget ?? "",
      sampleQuantityText: sample.sampleQuantityText ?? "",
      sampledAt: sample.sampledAt?.slice(0, 10) ?? "",
      submittedAt: sample.submittedAt?.slice(0, 10) ?? "",
      plannedTestScope: sample.plannedTestScope ?? "",
      note: sample.note ?? "",
      items: sample.items.map((item) => ({
        itemName: item.itemName,
        itemCategory: item.itemCategory ?? "",
        feeText: item.feeText ?? "",
        feeAmount: item.feeAmount ?? "",
        status: item.status,
        resultSummary: item.resultSummary ?? "",
        progressNote: item.progressNote ?? "",
        completedAt: item.completedAt?.slice(0, 10) ?? "",
      })),
    })),
    payments: inspection.payments.map((payment) => ({
      paidAt: payment.paidAt?.slice(0, 10) ?? "",
      amount: payment.amount ?? "",
      amountText: payment.amountText ?? "",
      method: payment.method ?? "",
      payerName: payment.payerName ?? "",
      note: payment.note ?? "",
    })),
  });
}

export function inspectionStatusLabel(status: string) {
  switch (status) {
    case "SAMPLED":
      return "已取样";
    case "SUBMITTED":
      return "已送检";
    case "RECEIVED":
      return "已收样";
    case "IN_PROGRESS":
      return "检测中";
    case "PARTIAL_REPORTED":
      return "部分出报告";
    case "COMPLETED":
      return "已完成";
    case "ARCHIVED":
      return "已归档";
    case "CANCELED":
      return "已取消";
    default:
      return "草稿";
  }
}

export function inspectionStatusTone(status: string) {
  switch (status) {
    case "COMPLETED":
    case "ARCHIVED":
      return "success";
    case "PARTIAL_REPORTED":
    case "RECEIVED":
    case "IN_PROGRESS":
    case "SUBMITTED":
    case "SAMPLED":
      return "warning";
    case "CANCELED":
      return "danger";
    default:
      return "neutral";
  }
}

export function inspectionPaymentStatusLabel(status: string) {
  switch (status) {
    case "PARTIAL":
      return "部分付款";
    case "PAID":
      return "已付款";
    case "REFUNDED":
      return "已退款";
    default:
      return "未付款";
  }
}

export function inspectionPaymentStatusTone(status: string) {
  switch (status) {
    case "PAID":
      return "success";
    case "PARTIAL":
      return "warning";
    case "REFUNDED":
      return "neutral";
    default:
      return "danger";
  }
}

export function inspectionAttachmentCategoryLabel(category?: string | null) {
  switch (category) {
    case "inspection_report":
      return "检测报告";
    case "inspection_payment_voucher":
      return "付款回单";
    case "inspection_invoice":
      return "发票";
    case "inspection_sample_photo":
      return "样品照片";
    default:
      return "其他附件";
  }
}
