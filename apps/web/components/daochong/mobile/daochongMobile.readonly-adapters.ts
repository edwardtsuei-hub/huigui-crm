import type {
  DaochongAppointment,
  DaochongCustomer,
  DaochongFormField,
  DaochongMobileSnapshot,
  DaochongMoneyRow,
  DaochongStatusItem,
  DaochongTone,
  DaochongTimelineItem,
} from "./daochongMobile.types";

export type DaochongReadonlyProductRecord = {
  id?: string;
  name?: string | null;
  displayName?: string | null;
  salePrice?: number | string | null;
  spec?: string | null;
  unit?: string | null;
  status?: string | null;
  employeeVisible?: boolean | null;
  quoteEnabled?: boolean | null;
  intro?: string | null;
  remark?: string | null;
};

export type DaochongReadonlyShiftRosterResponse = {
  config?: {
    staff?: {
      daochong?: Array<{
        id?: string;
        name?: string;
        position?: string;
        phone?: string;
      }>;
    };
    dailyInfo?: {
      daochong?: Record<
        string,
        {
          activity?: string;
          note?: string;
          reservation?: string;
        }
      >;
    };
  };
  updatedAt?: string | null;
};

export type DaochongReadonlyCustomerRecord = {
  id?: string;
  customerName?: string | null;
  name?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  mobile?: string | null;
  status?: string | null;
  recentFollowupAt?: string | null;
  owner?: {
    displayName?: string | null;
    name?: string | null;
  } | null;
  _count?: {
    followups?: number | null;
    quotations?: number | null;
    contracts?: number | null;
    tasks?: number | null;
  } | null;
};

export type DaochongReadonlyCustomerListResponse =
  | DaochongReadonlyCustomerRecord[]
  | {
      items?: DaochongReadonlyCustomerRecord[] | null;
      page?: number | null;
      pageSize?: number | null;
      total?: number | null;
    };

type DaochongReadonlyUserSummary = {
  id?: string | null;
  displayName?: string | null;
  loginAccount?: string | null;
  name?: string | null;
};

export type DaochongReadonlyCustomerFollowupRecord = {
  id?: string;
  content?: string | null;
  createdAt?: string | null;
  followupDate?: string | null;
  followupType?: string | null;
  keyPoints?: string | null;
  needReminder?: boolean | null;
  nextAction?: string | null;
  nextFollowupAt?: string | null;
  creator?: DaochongReadonlyUserSummary | null;
};

export type DaochongReadonlyCustomerQuotationRecord = {
  id?: string;
  quotationNo?: string | null;
  type?: string | null;
  totalAmount?: number | string | null;
  status?: string | null;
  approvalStatus?: string | null;
  createdAt?: string | null;
};

export type DaochongReadonlyCustomerTaskRecord = {
  id?: string;
  title?: string | null;
  type?: string | null;
  status?: string | null;
  startAt?: string | null;
  createdAt?: string | null;
  content?: string | null;
  assignee?: DaochongReadonlyUserSummary | null;
};

export type DaochongReadonlyCustomerDetailRecord = DaochongReadonlyCustomerRecord & {
  address?: string | null;
  city?: string | null;
  cooperationContent?: string | null;
  cooperationDirection?: string | null;
  createdAt?: string | null;
  dealProbability?: number | string | null;
  district?: string | null;
  email?: string | null;
  estimatedAmount?: number | string | null;
  followups?: DaochongReadonlyCustomerFollowupRecord[] | null;
  province?: string | null;
  quotations?: DaochongReadonlyCustomerQuotationRecord[] | null;
  remark?: string | null;
  source?: string | null;
  successProbability?: number | string | null;
  tasks?: DaochongReadonlyCustomerTaskRecord[] | null;
  updatedAt?: string | null;
  wechat?: string | null;
  wechatId?: string | null;
};

export type DaochongReadonlyTaskRecord = {
  id?: string;
  title?: string | null;
  type?: string | null;
  status?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  reminderAt?: string | null;
  content?: string | null;
  customer?: {
    id?: string;
    name?: string | null;
  } | null;
  quotation?: {
    id?: string;
    quotationNo?: string | null;
    customer?: {
      id?: string;
      name?: string | null;
    } | null;
  } | null;
  agriculturePlan?: {
    id?: string;
    planName?: string | null;
    customer?: {
      id?: string;
      name?: string | null;
    } | null;
  } | null;
  assignee?: DaochongReadonlyUserSummary | null;
  creator?: DaochongReadonlyUserSummary | null;
};

export type DaochongReadonlyTaskListResponse =
  | DaochongReadonlyTaskRecord[]
  | {
      items?: DaochongReadonlyTaskRecord[] | null;
      page?: number | null;
      pageSize?: number | null;
      total?: number | null;
    };

export type DaochongReadonlyAppointmentDetailRecord = {
  id?: string;
  taskId?: string | null;
  sourceType?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerMobile?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  teacherId?: string | null;
  teacherName?: string | null;
  roomId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  reminderAt?: string | null;
  arrivalStatus?: string | null;
  serviceStatus?: string | null;
  taskType?: string | null;
  taskTitle?: string | null;
  taskContent?: string | null;
  quotationId?: string | null;
  quotationNo?: string | null;
  quotationStatus?: string | null;
  settlementDraftId?: string | null;
  settlementDraftStatus?: string | null;
  serviceNoteId?: string | null;
  serviceNoteStatus?: string | null;
  serviceNoteDueAt?: string | null;
  reminderScheduledAt?: string | null;
  remindedAt?: string | null;
  completedAt?: string | null;
  evidenceAssetIds?: string[] | null;
  readonlyWarnings?: string[] | null;
  diagnostics?: unknown[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DaochongReadonlyAppointmentDetailResponse =
  | DaochongReadonlyAppointmentDetailRecord
  | {
      item?: DaochongReadonlyAppointmentDetailRecord | null;
      items?: DaochongReadonlyAppointmentDetailRecord[] | null;
      diagnostics?: unknown[] | null;
    };

export type DaochongReadonlyServiceNoteRecord = {
  id?: string;
  appointmentId?: string | null;
  settlementDraftId?: string | null;
  customerId?: string | null;
  teacherId?: string | null;
  projectId?: string | null;
  roomId?: string | null;
  sourceType?: string | null;
  pendingReason?: string | null;
  serviceSummary?: string | null;
  customerFeedback?: string | null;
  nextSuggestion?: string | null;
  preferenceNote?: string | null;
  preferenceSyncStatus?: string | null;
  noteStatus?: string | null;
  dueAt?: string | null;
  reminderScheduledAt?: string | null;
  remindedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DaochongReadonlyServiceNoteResponse =
  | DaochongReadonlyServiceNoteRecord[]
  | {
      items?: DaochongReadonlyServiceNoteRecord[] | null;
      diagnostics?: unknown[] | null;
    };

export type DaochongReadonlyWecomReminderDryRunRecord = {
  id?: string;
  serviceNoteId?: string | null;
  appointmentId?: string | null;
  settlementDraftId?: string | null;
  customerId?: string | null;
  customer?: DaochongReadonlyCustomerMini | null;
  teacherId?: string | null;
  teacher?: (DaochongReadonlyUserSummary & { wecomName?: string | null; wecomUserId?: string | null }) | null;
  project?: DaochongReadonlyProductMini | null;
  noteStatus?: string | null;
  dryRunStatus?: string | null;
  cardTitle?: string | null;
  cardSummary?: string | null;
  jumpPage?: string | null;
  scheduledAt?: string | null;
  dueAt?: string | null;
  reminderScheduledAt?: string | null;
  sentAt?: string | null;
  cancelledReason?: string | null;
  dryRunPayload?: Record<string, unknown> | null;
  readonlyWarnings?: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DaochongReadonlyWecomReminderDryRunResponse =
  | DaochongReadonlyWecomReminderDryRunRecord[]
  | {
      items?: DaochongReadonlyWecomReminderDryRunRecord[] | null;
      diagnostics?: unknown[] | null;
    };

export type DaochongReadonlyCustomerPreferenceRecord = {
  id?: string;
  customerId?: string | null;
  sourceServiceNoteId?: string | null;
  preferenceType?: string | null;
  preferenceLabel?: string | null;
  preferenceValue?: string | null;
  roomPreference?: string | null;
  lightPreference?: string | null;
  pressurePreference?: string | null;
  tabooNotes?: string | null;
  hobbyNotes?: string | null;
  visibility?: string | null;
  lastObservedAt?: string | null;
  updatedByUserId?: string | null;
  updatedAt?: string | null;
};

export type DaochongReadonlyCustomerPreferenceResponse =
  | DaochongReadonlyCustomerPreferenceRecord[]
  | {
      items?: DaochongReadonlyCustomerPreferenceRecord[] | null;
      diagnostics?: unknown[] | null;
    };

export type DaochongReadonlyCustomerCardBalanceRecord = {
  customerId?: string | null;
  customerName?: string | null;
  cardId?: string | null;
  cardName?: string | null;
  remainingAmount?: number | string | null;
  remainingTimes?: number | string | null;
  lastRechargeId?: string | null;
  lastConsumptionApprovalId?: string | null;
  balanceStatus?: string | null;
  computedAt?: string | null;
  readonlyWarnings?: string[] | null;
  summary?: {
    confirmedRechargeAmount?: number | string | null;
    approvedConsumeAmount?: number | string | null;
    rechargeCount?: number | null;
    consumptionApprovalCount?: number | null;
  } | null;
};

export type DaochongReadonlyCustomerCardBalanceResponse =
  | DaochongReadonlyCustomerCardBalanceRecord[]
  | {
      items?: DaochongReadonlyCustomerCardBalanceRecord[] | null;
      diagnostics?: unknown[] | null;
    };

export type DaochongReadonlyEvidenceAssetRecord = {
  id?: string;
  businessType?: string | null;
  businessId?: string | null;
  assetType?: string | null;
  thumbnailUrl?: string | null;
  originalUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSizeBytes?: number | string | null;
  uploadedBy?: (DaochongReadonlyUserSummary & { id?: string; loginAccount?: string | null }) | null;
  uploadedAt?: string | null;
  visibleRoles?: string[] | null;
  reviewStatus?: string | null;
  lockedAt?: string | null;
  returnReason?: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
  folderId?: string | null;
  isImportant?: boolean | null;
  permissionScope?: string | null;
  updatedAt?: string | null;
};

export type DaochongReadonlyEvidenceAssetResponse =
  | DaochongReadonlyEvidenceAssetRecord[]
  | {
      items?: DaochongReadonlyEvidenceAssetRecord[] | null;
      diagnostics?: unknown[] | null;
    };

type DaochongReadonlyCustomerMini = {
  id?: string | null;
  name?: string | null;
};

type DaochongReadonlyProductMini = {
  id?: string | null;
  name?: string | null;
};

export type DaochongReadonlyRechargeRecord = {
  id?: string;
  customer?: DaochongReadonlyCustomerMini | null;
  submittedBy?: DaochongReadonlyUserSummary | null;
  amount?: number | string | null;
  paymentMethod?: string | null;
  evidenceAssetIds?: string[] | null;
  cashPhotoAssetIds?: string[] | null;
  cashAmount?: number | string | null;
  cashCustodian?: DaochongReadonlyUserSummary | null;
  rechargeStatus?: string | null;
  chengchengApprover?: DaochongReadonlyUserSummary | null;
  chengchengApprovedAt?: string | null;
  limengReviewer?: DaochongReadonlyUserSummary | null;
  limengReviewedAt?: string | null;
  returnReason?: string | null;
  balanceAppliedAt?: string | null;
  financeSummaryMonth?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DaochongReadonlyRechargeResponse =
  | DaochongReadonlyRechargeRecord[]
  | {
      items?: DaochongReadonlyRechargeRecord[] | null;
      diagnostics?: unknown[] | null;
    };

export type DaochongRechargeApprovalActionItem = {
  id: string;
  amount: string;
  canChengchengApprove: boolean;
  canLimengReview: boolean;
  label: string;
  note: string;
  status: string;
  tone: DaochongTone;
};

export type DaochongConsumptionApprovalActionItem = {
  id: string;
  amount: string;
  canApprove: boolean;
  label: string;
  note: string;
  settlementDraftId: string;
  status: string;
  tone: DaochongTone;
};

export type DaochongReadonlySettlementDraftRecord = {
  id?: string;
  appointmentId?: string | null;
  customer?: DaochongReadonlyCustomerMini | null;
  teacher?: DaochongReadonlyUserSummary | null;
  project?: DaochongReadonlyProductMini | null;
  cardMode?: string | null;
  cardId?: string | null;
  originalAmount?: number | string | null;
  discountAmount?: number | string | null;
  discountReason?: string | null;
  finalAmount?: number | string | null;
  consumeAmount?: number | string | null;
  evidenceAssetIds?: string[] | null;
  referrerName?: string | null;
  referralBonusAmount?: number | string | null;
  validationStatus?: string | null;
  canSubmitApproval?: boolean | null;
  draftStatus?: string | null;
  submittedBy?: DaochongReadonlyUserSummary | null;
  submittedAt?: string | null;
  returnedReason?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DaochongReadonlySettlementDraftResponse =
  | DaochongReadonlySettlementDraftRecord[]
  | {
      items?: DaochongReadonlySettlementDraftRecord[] | null;
      diagnostics?: unknown[] | null;
    };

export type DaochongReadonlyConsumptionApprovalRecord = {
  id?: string;
  settlementDraftId?: string | null;
  settlementDraft?: {
    id?: string | null;
    appointmentId?: string | null;
    draftStatus?: string | null;
  } | null;
  customer?: DaochongReadonlyCustomerMini | null;
  teacher?: DaochongReadonlyUserSummary | null;
  cardId?: string | null;
  consumeAmount?: number | string | null;
  evidenceAssetIds?: string[] | null;
  discountReason?: string | null;
  referrerName?: string | null;
  referralBonusAmount?: number | string | null;
  approvalStatus?: string | null;
  approvedBy?: DaochongReadonlyUserSummary | null;
  approvedAt?: string | null;
  returnedBy?: DaochongReadonlyUserSummary | null;
  returnedAt?: string | null;
  returnReason?: string | null;
  supplementRequirements?: string | null;
  financeSummaryMonth?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DaochongReadonlyConsumptionApprovalResponse =
  | DaochongReadonlyConsumptionApprovalRecord[]
  | {
      items?: DaochongReadonlyConsumptionApprovalRecord[] | null;
      diagnostics?: unknown[] | null;
    };

export type DaochongReadonlyMeetingNoteRecord = {
  id?: string;
  communicationId?: string | null;
  title?: string | null;
  meetingAt?: string | null;
  conclusion?: string | null;
  todoItems?: string[] | null;
  ownerUserIds?: string[] | null;
  relatedCustomerIds?: string[] | null;
  attachmentIds?: string[] | null;
  archiveStatus?: string | null;
  folderId?: string | null;
  sourceType?: string | null;
  createdBy?: string | null;
  createdByUserId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DaochongReadonlyMeetingNoteResponse =
  | DaochongReadonlyMeetingNoteRecord[]
  | {
      items?: DaochongReadonlyMeetingNoteRecord[] | null;
      diagnostics?: unknown[] | null;
    };

export type DaochongReadonlyProjectCommunicationRecord = {
  id?: string;
  topic?: string | null;
  projectScopes?: string[] | null;
  participants?: string[] | null;
  relatedCustomerIds?: string[] | null;
  privacyLevel?: string | null;
  discussionSummary?: string | null;
  status?: string | null;
  meetingNoteId?: string | null;
  folderId?: string | null;
  sourceType?: string | null;
  attachmentIds?: string[] | null;
  createdBy?: string | null;
  createdByUserId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DaochongReadonlyProjectCommunicationResponse =
  | DaochongReadonlyProjectCommunicationRecord[]
  | {
      items?: DaochongReadonlyProjectCommunicationRecord[] | null;
      diagnostics?: unknown[] | null;
    };

export type DaochongReadonlyFinanceSummaryRecord = {
  id?: string;
  summaryMonth?: string | null;
  confirmedRechargeAmount?: number | string | null;
  pendingCashCustodyAmount?: number | string | null;
  approvedConsumeAmount?: number | string | null;
  commissionAmount?: number | string | null;
  referralBonusAmount?: number | string | null;
  teamBonusAmount?: number | string | null;
  expenseAmount?: number | string | null;
  evidenceAssetIds?: string[] | null;
  sourceCutoffAt?: string | null;
  exceptionCount?: number | null;
  payrollPreviewStatus?: string | null;
  canConfirmFinance?: boolean | null;
  financeStatus?: string | null;
  confirmedBy?: DaochongReadonlyUserSummary | null;
  confirmedAt?: string | null;
  lockedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DaochongReadonlyFinanceSummaryResponse =
  | DaochongReadonlyFinanceSummaryRecord[]
  | {
      items?: DaochongReadonlyFinanceSummaryRecord[] | null;
      diagnostics?: unknown[] | null;
    };

export type DaochongReadonlyFinanceEvidenceExceptionRecord = {
  id?: string;
  summaryId?: string | null;
  summaryMonth?: string | null;
  businessType?: string | null;
  businessId?: string | null;
  exceptionReason?: string | null;
  currentOwner?: DaochongReadonlyUserSummary | null;
  returnTarget?: DaochongReadonlyUserSummary | null;
  exceptionStatus?: string | null;
  evidenceAssetIds?: string[] | null;
  supplementRequirements?: string | null;
  resolvedBy?: DaochongReadonlyUserSummary | null;
  resolvedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DaochongReadonlyFinanceEvidenceExceptionResponse =
  | DaochongReadonlyFinanceEvidenceExceptionRecord[]
  | {
      items?: DaochongReadonlyFinanceEvidenceExceptionRecord[] | null;
      diagnostics?: unknown[] | null;
    };

export type DaochongReadonlyBonusExpenseItemRecord = {
  id?: string;
  itemType?: string | null;
  targetUser?: DaochongReadonlyUserSummary | null;
  customer?: {
    id?: string | null;
    name?: string | null;
  } | null;
  submittedBy?: DaochongReadonlyUserSummary | null;
  amount?: number | string | null;
  reason?: string | null;
  evidenceAssetIds?: string[] | null;
  financeStatus?: string | null;
  summaryMonth?: string | null;
  summaryId?: string | null;
  returnReason?: string | null;
  financeReviewedBy?: DaochongReadonlyUserSummary | null;
  financeReviewedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DaochongReadonlyBonusExpenseItemResponse =
  | DaochongReadonlyBonusExpenseItemRecord[]
  | {
      items?: DaochongReadonlyBonusExpenseItemRecord[] | null;
      diagnostics?: unknown[] | null;
    };

export type DaochongReadonlyCompensationRuleRecord = {
  id?: string | null;
  teacherId?: string | null;
  teacher?: DaochongReadonlyUserSummary | null;
  effectiveMonth?: string | null;
  baseSalary?: number | string | null;
  manualCommissionRate?: number | string | null;
  fixedCommissionAmount?: number | string | null;
  bonusRules?: string[] | null;
  welfareRules?: string[] | null;
  ruleStatus?: string | null;
  version?: string | number | null;
  readonlyWarnings?: string[] | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

export type DaochongReadonlyCompensationRuleResponse =
  | DaochongReadonlyCompensationRuleRecord[]
  | {
      items?: DaochongReadonlyCompensationRuleRecord[] | null;
      diagnostics?: unknown[] | null;
    };

export type DaochongReadonlyAdapterInput = {
  appointmentTaskResponse?: DaochongReadonlyTaskListResponse | null;
  compensationRuleResponse?: DaochongReadonlyCompensationRuleResponse | null;
  consumptionApprovalResponse?: DaochongReadonlyConsumptionApprovalResponse | null;
  customerCardBalanceResponse?: DaochongReadonlyCustomerCardBalanceResponse | null;
  customerListResponse?: DaochongReadonlyCustomerListResponse | null;
  evidenceAssetResponse?: DaochongReadonlyEvidenceAssetResponse | null;
  financeEvidenceExceptionResponse?: DaochongReadonlyFinanceEvidenceExceptionResponse | null;
  financeSummaryResponse?: DaochongReadonlyFinanceSummaryResponse | null;
  bonusExpenseItemResponse?: DaochongReadonlyBonusExpenseItemResponse | null;
  meetingNoteResponse?: DaochongReadonlyMeetingNoteResponse | null;
  projectCommunicationResponse?: DaochongReadonlyProjectCommunicationResponse | null;
  projectRecords?: DaochongReadonlyProductRecord[] | null;
  rechargeResponse?: DaochongReadonlyRechargeResponse | null;
  rosterResponse?: DaochongReadonlyShiftRosterResponse | null;
  settlementDraftResponse?: DaochongReadonlySettlementDraftResponse | null;
  wecomReminderDryRunResponse?: DaochongReadonlyWecomReminderDryRunResponse | null;
};

export type DaochongReadonlyResourceStatus =
  | "disabled"
  | "loading"
  | "success"
  | "empty"
  | "forbidden"
  | "error"
  | "fallback";

export type DaochongReadonlyResourceDiagnosticInput = {
  status: DaochongReadonlyResourceStatus;
  note?: string;
};

export type DaochongReadonlyDiagnosticsInput = {
  appointmentDetail?: DaochongReadonlyResourceDiagnosticInput;
  appointments?: DaochongReadonlyResourceDiagnosticInput;
  compensationRules?: DaochongReadonlyResourceDiagnosticInput;
  consumptionApprovals?: DaochongReadonlyResourceDiagnosticInput;
  customerCardBalances?: DaochongReadonlyResourceDiagnosticInput;
  customers?: DaochongReadonlyResourceDiagnosticInput;
  customerPreferences?: DaochongReadonlyResourceDiagnosticInput;
  evidenceAssets?: DaochongReadonlyResourceDiagnosticInput;
  financeEvidenceExceptions?: DaochongReadonlyResourceDiagnosticInput;
  financeSummary?: DaochongReadonlyResourceDiagnosticInput;
  bonusExpenseItems?: DaochongReadonlyResourceDiagnosticInput;
  meetingNotes?: DaochongReadonlyResourceDiagnosticInput;
  projectCommunications?: DaochongReadonlyResourceDiagnosticInput;
  projects?: DaochongReadonlyResourceDiagnosticInput;
  recharges?: DaochongReadonlyResourceDiagnosticInput;
  roster?: DaochongReadonlyResourceDiagnosticInput;
  serviceNotes?: DaochongReadonlyResourceDiagnosticInput;
  settlementDrafts?: DaochongReadonlyResourceDiagnosticInput;
  wecomReminderDryRuns?: DaochongReadonlyResourceDiagnosticInput;
};

function compactText(parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(" · ");
}

function textOrNull(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function formatMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "待设";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return numeric.toLocaleString("zh-CN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

function getCustomerRecords(response: DaochongReadonlyCustomerListResponse | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.items ?? [];
}

function getTaskRecords(response: DaochongReadonlyTaskListResponse | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.items ?? [];
}

function getAppointmentDetailRecord(
  response: DaochongReadonlyAppointmentDetailResponse | null | undefined,
): DaochongReadonlyAppointmentDetailRecord | null {
  if (!response || Array.isArray(response)) return null;
  const envelope = response as {
    item?: DaochongReadonlyAppointmentDetailRecord | null;
    items?: DaochongReadonlyAppointmentDetailRecord[] | null;
  };
  if ("item" in envelope || "items" in envelope) {
    return envelope.item ?? envelope.items?.[0] ?? null;
  }
  return response as DaochongReadonlyAppointmentDetailRecord;
}

function getServiceNoteRecords(response: DaochongReadonlyServiceNoteResponse | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.items ?? [];
}

function getWecomReminderDryRunRecords(response: DaochongReadonlyWecomReminderDryRunResponse | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.items ?? [];
}

function getCustomerPreferenceRecords(response: DaochongReadonlyCustomerPreferenceResponse | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.items ?? [];
}

function getCustomerCardBalanceRecords(response: DaochongReadonlyCustomerCardBalanceResponse | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.items ?? [];
}

function getEvidenceAssetRecords(response: DaochongReadonlyEvidenceAssetResponse | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.items ?? [];
}

function getRechargeRecords(response: DaochongReadonlyRechargeResponse | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.items ?? [];
}

function getSettlementDraftRecords(response: DaochongReadonlySettlementDraftResponse | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.items ?? [];
}

function getConsumptionApprovalRecords(response: DaochongReadonlyConsumptionApprovalResponse | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.items ?? [];
}

function getMeetingNoteRecords(response: DaochongReadonlyMeetingNoteResponse | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.items ?? [];
}

function getProjectCommunicationRecords(response: DaochongReadonlyProjectCommunicationResponse | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.items ?? [];
}

function getFinanceSummaryRecords(response: DaochongReadonlyFinanceSummaryResponse | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.items ?? [];
}

function getFinanceEvidenceExceptionRecords(response: DaochongReadonlyFinanceEvidenceExceptionResponse | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.items ?? [];
}

function getBonusExpenseItemRecords(response: DaochongReadonlyBonusExpenseItemResponse | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.items ?? [];
}

function getCompensationRuleRecords(response: DaochongReadonlyCompensationRuleResponse | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.items ?? [];
}

function getInitial(name: string) {
  const trimmed = name.trim();
  return trimmed ? Array.from(trimmed)[0] ?? "客" : "客";
}

function customerDisplayName(record: DaochongReadonlyCustomerRecord | DaochongReadonlyCustomerDetailRecord) {
  return record.name ?? record.customerName ?? record.contactName ?? record.companyName ?? "未命名客户";
}

function userDisplayName(user: DaochongReadonlyUserSummary | null | undefined) {
  return user?.displayName ?? user?.name ?? null;
}

function customerStatusDisplay(status: string | null | undefined): { status: string; tone: DaochongTone } {
  const normalized = status ?? "";
  const map: Record<string, { status: string; tone: DaochongTone }> = {
    CONTACTED: { status: "已联系", tone: "blue" },
    COOPERATING: { status: "合作中", tone: "green" },
    MET: { status: "已到店", tone: "green" },
    PAUSED: { status: "暂停", tone: "neutral" },
    UNCONTACTED: { status: "新客", tone: "amber" },
  };
  return map[normalized] ?? { status: normalized || "客户", tone: "neutral" };
}

function followupTypeDisplay(type: string | null | undefined) {
  const map: Record<string, string> = {
    MEETING: "面谈跟进",
    PHONE: "电话跟进",
    VISIT: "到访跟进",
    WECHAT: "微信跟进",
  };
  return type ? map[type] ?? "跟进记录" : "跟进记录";
}

function taskStatusDisplay(status: string | null | undefined) {
  const map: Record<string, string> = {
    CANCELLED: "已取消",
    CANCELED: "已取消",
    COMPLETED: "已完成",
    DONE: "已完成",
    IN_PROGRESS: "处理中",
    DOING: "处理中",
    PENDING: "待处理",
    TODO: "待处理",
  };
  return status ? map[status] ?? status : "任务";
}

function taskTypeDisplay(type: string | null | undefined) {
  const map: Record<string, string> = {
    CONTRACT: "合同事项",
    FOLLOW_UP: "客户跟进",
    MEETING: "会议",
    OTHER: "其他事项",
    PLAN: "计划",
    QUOTATION: "报价事项",
  };
  return type ? map[type] ?? type : "日程";
}

function serviceNoteStatusDisplay(status: string | null | undefined): { status: string; tone: DaochongTone } {
  const map: Record<string, { status: string; tone: DaochongTone }> = {
    CANCELLED: { status: "已取消", tone: "neutral" },
    COMPLETED: { status: "已完成", tone: "green" },
    OVERDUE: { status: "已超时", tone: "rose" },
    PENDING: { status: "待补", tone: "amber" },
    RETURNED: { status: "已退回", tone: "amber" },
  };
  return map[status ?? ""] ?? { status: status || "纪要", tone: "neutral" };
}

function serviceNoteSourceDisplay(sourceType: string | null | undefined) {
  const map: Record<string, string> = {
    APPOINTMENT_COMPLETED: "预约完成",
    MANUAL_BACKFILL: "手动补填",
    SETTLEMENT_DRAFT_CREATED: "结算草稿",
  };
  return sourceType ? map[sourceType] ?? sourceType : "服务纪要";
}

function preferenceTypeDisplay(type: string | null | undefined) {
  const map: Record<string, string> = {
    AROMA: "香型偏好",
    HOBBY: "个人爱好",
    LIGHT: "灯光偏好",
    OTHER: "其他偏好",
    PRESSURE: "力度偏好",
    ROOM: "房间偏好",
    TABOO: "禁忌说明",
  };
  return type ? map[type] ?? type : "客户偏好";
}

function preferenceVisibilityDisplay(visibility: string | null | undefined) {
  const map: Record<string, string> = {
    MANAGEMENT_ONLY: "仅管理可见",
    PRIVATE_NOTE: "私密备注",
    SERVICE_TEAM: "服务团队可见",
  };
  return visibility ? map[visibility] ?? visibility : "默认可见";
}

function appointmentActionDisplay(status: string | null | undefined): { action: string; tone: DaochongTone } {
  const map: Record<string, { action: string; tone: DaochongTone }> = {
    CANCELED: { action: "已取消", tone: "neutral" },
    CANCELLED: { action: "已取消", tone: "neutral" },
    DOING: { action: "处理中", tone: "blue" },
    DONE: { action: "已完成", tone: "green" },
    IN_PROGRESS: { action: "处理中", tone: "blue" },
    PENDING: { action: "处理", tone: "amber" },
    TODO: { action: "处理", tone: "amber" },
  };
  return map[status ?? ""] ?? { action: taskStatusDisplay(status), tone: "neutral" };
}

function quotationStatusDisplay(status: string | null | undefined) {
  const map: Record<string, string> = {
    GENERATED: "已生成",
    LOST: "已失效",
    SENT: "已发送",
    WON: "已成交",
  };
  return status ? map[status] ?? status : "报价";
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.split("T")[0] ?? value;
  }
  return date.toLocaleDateString("zh-CN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTimeLabel(value: string | null | undefined) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.split("T")[1]?.slice(0, 5) ?? value;
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
  });
}

function sortDateValue(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function latestByUpdatedAt<T extends { createdAt?: string | null; updatedAt?: string | null }>(records: T[]) {
  return records
    .slice()
    .sort((a, b) => sortDateValue(b.updatedAt ?? b.createdAt) - sortDateValue(a.updatedAt ?? a.createdAt))[0];
}

function formatFileSize(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  if (numeric >= 1024 * 1024) return `${(numeric / 1024 / 1024).toFixed(1)} MB`;
  if (numeric >= 1024) return `${Math.round(numeric / 1024)} KB`;
  return `${numeric} B`;
}

function evidenceReviewStatusDisplay(status: string | null | undefined): { status: string; tone: DaochongTone } {
  const map: Record<string, { status: string; tone: DaochongTone }> = {
    ACTIVE: { status: "可查", tone: "green" },
    ARCHIVED: { status: "已归档", tone: "neutral" },
    DRAFT: { status: "草稿", tone: "amber" },
    OBSOLETE: { status: "已作废", tone: "rose" },
    PENDING_REVIEW: { status: "待复核", tone: "amber" },
  };
  return map[status ?? ""] ?? { status: status || "只读", tone: "neutral" };
}

function archiveStatusDisplay(status: string | null | undefined) {
  const map: Record<string, string> = {
    archived: "已归档",
    draft: "草稿",
    readonly: "只读",
  };
  const normalized = (status ?? "").toLowerCase();
  return map[normalized] ?? status ?? "只读";
}

function communicationStatusDisplay(status: string | null | undefined): { status: string; tone: DaochongTone } {
  const map: Record<string, { status: string; tone: DaochongTone }> = {
    archived: { status: "已归档", tone: "neutral" },
    closed: { status: "已关闭", tone: "neutral" },
    draft: { status: "草稿", tone: "amber" },
    in_progress: { status: "协作中", tone: "blue" },
    readonly: { status: "只读", tone: "blue" },
  };
  const normalized = (status ?? "").toLowerCase();
  return map[normalized] ?? { status: status || "只读", tone: "neutral" };
}

function paymentMethodDisplay(method: string | null | undefined) {
  const map: Record<string, string> = {
    ALIPAY: "支付宝",
    BANK_TRANSFER: "转账",
    CARD_CONSUME: "耗卡",
    CASH: "现金",
    OTHER: "其他",
    WECHAT: "微信",
  };
  return method ? map[method] ?? method : "充值方式";
}

function rechargeStatusDisplay(status: string | null | undefined): { status: string; tone: DaochongTone } {
  const map: Record<string, { status: string; tone: DaochongTone }> = {
    CANCELLED: { status: "已取消", tone: "neutral" },
    CONFIRMED: { status: "已确认", tone: "green" },
    PENDING_CHENGCHENG_APPROVAL: { status: "程程待审", tone: "amber" },
    PENDING_LIMENG_REVIEW: { status: "立猛待复核", tone: "blue" },
    RETURNED_BY_CHENGCHENG: { status: "程程退回", tone: "rose" },
    RETURNED_BY_LIMENG: { status: "立猛退回", tone: "rose" },
  };
  return map[status ?? ""] ?? { status: status || "充值只读", tone: "neutral" };
}

function cardModeDisplay(cardMode: string | null | undefined) {
  const map: Record<string, string> = {
    NO_CARD: "无卡",
    PACKAGE_CARD: "套餐卡",
    PREPAID_CARD: "储值卡",
  };
  return cardMode ? map[cardMode] ?? cardMode : "卡项";
}

function settlementDraftStatusDisplay(status: string | null | undefined): { status: string; tone: DaochongTone } {
  const map: Record<string, { status: string; tone: DaochongTone }> = {
    BLOCKED_EVIDENCE: { status: "缺凭证", tone: "rose" },
    CANCELLED: { status: "已取消", tone: "neutral" },
    DRAFT: { status: "草稿", tone: "amber" },
    READY_FOR_APPROVAL: { status: "可提交", tone: "green" },
    RETURNED: { status: "已退回", tone: "rose" },
    SUBMITTED_FOR_APPROVAL: { status: "已提交", tone: "blue" },
  };
  return map[status ?? ""] ?? { status: status || "结算草稿", tone: "neutral" };
}

function consumptionApprovalStatusDisplay(status: string | null | undefined): { status: string; tone: DaochongTone } {
  const map: Record<string, { status: string; tone: DaochongTone }> = {
    APPROVED: { status: "已通过", tone: "green" },
    CANCELLED: { status: "已取消", tone: "neutral" },
    PENDING: { status: "待审批", tone: "amber" },
    RETURNED: { status: "已退回", tone: "rose" },
  };
  return map[status ?? ""] ?? { status: status || "耗卡审批", tone: "neutral" };
}

function financeStatusDisplay(status: string | null | undefined): { status: string; tone: DaochongTone } {
  const map: Record<string, { status: string; tone: DaochongTone }> = {
    CANCELLED: { status: "已取消", tone: "neutral" },
    CONFIRMED: { status: "已确认", tone: "green" },
    DRAFT: { status: "草稿", tone: "amber" },
    EVIDENCE_EXCEPTION: { status: "凭证异常", tone: "rose" },
    READY_FOR_REVIEW: { status: "待财务复核", tone: "blue" },
  };
  return map[status ?? ""] ?? { status: status || "财务只读", tone: "neutral" };
}

function payrollPreviewStatusDisplay(status: string | null | undefined) {
  const map: Record<string, string> = {
    CONFIRMED: "工资预览已确认",
    DRAFT: "工资预览草稿",
    NOT_GENERATED: "未生成工资",
    PENDING_CONFIRMATION: "工资预览待确认",
  };
  return status ? map[status] ?? status : "未生成工资";
}

function financeBusinessTypeDisplay(type: string | null | undefined) {
  const map: Record<string, string> = {
    BONUS: "奖金",
    CONSUMPTION_APPROVAL: "耗卡审批",
    EXPENSE: "报销",
    RECHARGE: "充值",
    SETTLEMENT: "结算",
    WELFARE: "福利",
  };
  return type ? map[type] ?? type : "财务业务";
}

function financeExceptionStatusDisplay(status: string | null | undefined): { status: string; tone: DaochongTone } {
  const map: Record<string, { status: string; tone: DaochongTone }> = {
    CANCELLED: { status: "已取消", tone: "neutral" },
    CLOSED: { status: "已关闭", tone: "neutral" },
    CONFIRMED: { status: "已确认", tone: "green" },
    PENDING_SUPPLEMENT: { status: "待补", tone: "rose" },
    SUPPLEMENTED: { status: "已补", tone: "blue" },
  };
  return map[status ?? ""] ?? { status: status || "异常", tone: "neutral" };
}

function bonusExpenseTypeDisplay(type: string | null | undefined) {
  const map: Record<string, string> = {
    DEDUCTION: "扣款",
    EXPENSE_REIMBURSEMENT: "报销申请",
    REFERRAL_BONUS: "推荐奖金",
    TEAM_BONUS: "团队奖金",
    WELFARE_ALLOWANCE: "福利补贴",
  };
  return type ? map[type] ?? type : "奖金报销";
}

function bonusExpenseFinanceStatusDisplay(status: string | null | undefined): { status: string; tone: DaochongTone } {
  const map: Record<string, { status: string; tone: DaochongTone }> = {
    CANCELLED: { status: "已取消", tone: "neutral" },
    DRAFT: { status: "草稿", tone: "amber" },
    INCLUDED_IN_SUMMARY: { status: "已入汇总", tone: "green" },
    PENDING_EVIDENCE: { status: "待凭证", tone: "rose" },
    PENDING_FINANCE_REVIEW: { status: "待财务", tone: "blue" },
    RETURNED: { status: "已退回", tone: "rose" },
  };
  return map[status ?? ""] ?? { status: status || "财务只读", tone: "neutral" };
}

export function adaptReadonlyProductsToProjectRows(
  records: DaochongReadonlyProductRecord[] | null | undefined,
  fallbackRows: DaochongMoneyRow[],
) {
  const usableRecords = (records ?? []).filter((record) => record.employeeVisible !== false);
  if (usableRecords.length === 0) return fallbackRows;

  return usableRecords.slice(0, 6).map((record) => ({
    label: record.displayName ?? record.name ?? "未命名服务项目",
    note:
      compactText([
        record.spec,
        record.unit,
        record.status === "DISABLED" ? "已停用" : "可预约",
        record.quoteEnabled === false ? "不可报价" : "可计入报价",
      ]) || "来自产品只读接口",
    value: formatMoney(record.salePrice),
  }));
}

export function adaptReadonlyRosterToTodayStatuses(
  rosterResponse: DaochongReadonlyShiftRosterResponse | null | undefined,
  fallbackStatuses: DaochongStatusItem[],
) {
  const staff = rosterResponse?.config?.staff?.daochong ?? [];
  if (staff.length === 0) return fallbackStatuses;

  return staff.slice(0, 4).map((member) => ({
    title: member.name ?? "未命名老师",
    note: compactText([member.position, member.phone ? `电话 ${member.phone}` : null]) || "道冲元气成员",
    status: "可排",
    tone: "green" as const,
  }));
}

export function adaptReadonlyTasksToAppointments(
  response: DaochongReadonlyTaskListResponse | null | undefined,
  fallbackAppointments: DaochongAppointment[],
): DaochongAppointment[] {
  const records = getTaskRecords(response);
  if (records.length === 0) return fallbackAppointments;

  return records.slice(0, 6).map((record) => {
    const customerName =
      record.customer?.name ??
      record.quotation?.customer?.name ??
      record.agriculturePlan?.customer?.name ??
      null;
    const assigneeName = userDisplayName(record.assignee);
    const { action, tone } = appointmentActionDisplay(record.status);
    const typeLabel = taskTypeDisplay(record.type);
    const title = compactText([customerName, record.title?.trim() || "未命名日程"]) || "未命名日程";
    const note =
      compactText([
        typeLabel,
        assigneeName ? `${assigneeName}负责` : null,
        record.content?.trim() || null,
        record.quotation?.quotationNo ? `报价 ${record.quotation.quotationNo}` : null,
      ]) || "来自 /tasks 日程只读接口，待转为道冲预约口径";

    return {
      action,
      id: record.id,
      note,
      page: "appointment",
      time: formatTimeLabel(record.startAt),
      title,
      tone,
    };
  });
}

export function adaptReadonlyAppointmentDetailToFields(
  response: DaochongReadonlyAppointmentDetailResponse | null | undefined,
  fallbackFields: DaochongFormField[],
) {
  const detail = getAppointmentDetailRecord(response);
  if (!detail?.id) return fallbackFields;

  const timeText = compactText([
    formatDateLabel(detail.startsAt),
    formatTimeLabel(detail.startsAt),
    detail.endsAt ? `至 ${formatTimeLabel(detail.endsAt)}` : null,
  ]);
  const sourceText = compactText([
    detail.sourceType,
    detail.taskId ? `任务 ${detail.taskId}` : null,
    detail.quotationNo ? `报价 ${detail.quotationNo}` : null,
  ]);

  return [
    {
      label: "预约客户",
      value: compactText([detail.customerName, detail.customerMobile]) || "未返回客户",
      helper: detail.customerId ? `客户 ${detail.customerId}` : "未绑定客户编号。",
    },
    {
      label: "服务项目",
      value: detail.projectName ?? detail.taskTitle ?? "未返回项目",
      helper: detail.projectId ? `项目 ${detail.projectId}` : sourceText || "来自 Task 候选口径。",
    },
    {
      label: "老师与房间",
      value: compactText([detail.teacherName, detail.roomId ? `${detail.roomId} 号房` : null]) || "未返回老师或房间",
      helper: detail.teacherId ? `老师 ${detail.teacherId}` : "房间仍需 DaochongServiceNote 或后续预约口径补齐。",
    },
    {
      label: "预约时间",
      value: timeText || "未返回时间",
      helper: detail.reminderAt ? `提醒 ${formatDateLabel(detail.reminderAt)} ${formatTimeLabel(detail.reminderAt)}` : "只读展示，不创建或调整提醒。",
    },
    {
      label: "服务状态",
      value: compactText([taskStatusDisplay(detail.arrivalStatus), detail.serviceStatus ? `服务 ${detail.serviceStatus}` : null]) || "未返回状态",
      helper: detail.settlementDraftId || detail.serviceNoteId
        ? compactText([detail.settlementDraftId ? `结算 ${detail.settlementDraftId}` : null, detail.serviceNoteId ? `纪要 ${detail.serviceNoteId}` : null])
        : "未匹配结算草稿或服务纪要，继续保留回退状态。",
    },
  ];
}

export function adaptReadonlyAppointmentDetailToStatuses(
  response: DaochongReadonlyAppointmentDetailResponse | null | undefined,
  fallbackStatuses: DaochongStatusItem[],
) {
  const detail = getAppointmentDetailRecord(response);
  if (!detail?.id) return fallbackStatuses;

  const warnings = detail.readonlyWarnings?.filter(Boolean) ?? [];
  const statuses: DaochongStatusItem[] = [
    {
      title: "预约详情只读",
      note: detail.diagnostics?.length ? "后端已返回只读映射诊断" : "已读取真实 Task 候选详情",
      status: "已读",
      tone: "green",
    },
    {
      title: "结算和纪要关联",
      note: compactText([
        detail.settlementDraftId ? `结算草稿 ${detail.settlementDraftStatus ?? detail.settlementDraftId}` : "未匹配结算草稿",
        detail.serviceNoteId ? `服务纪要 ${detail.serviceNoteStatus ?? detail.serviceNoteId}` : "未匹配服务纪要",
      ]),
      status: detail.settlementDraftId || detail.serviceNoteId ? "关联" : "待接",
      tone: detail.settlementDraftId || detail.serviceNoteId ? "blue" : "amber",
    },
    {
      title: "写动作仍关闭",
      note: warnings[1] ?? "不改约、不签到、不确认服务、不提交结算、不发送企业微信",
      status: "只读",
      tone: "amber",
    },
  ];

  return statuses;
}

export function adaptReadonlyCustomersToCustomers(
  response: DaochongReadonlyCustomerListResponse | null | undefined,
  fallbackCustomers: DaochongCustomer[],
) {
  const records = getCustomerRecords(response);
  if (records.length === 0) return fallbackCustomers;

  return records.slice(0, 8).map((record) => {
    const name = customerDisplayName(record);
    const ownerName = userDisplayName(record.owner);
    const count = record._count;
    const { status, tone } = customerStatusDisplay(record.status);
    const note =
      compactText([
        record.companyName && record.companyName !== name ? record.companyName : null,
        record.mobile ? `电话 ${record.mobile}` : null,
        ownerName ? `负责人 ${ownerName}` : null,
        count?.followups ? `跟进 ${count.followups}` : null,
      ]) || "来自客户只读接口";

    return {
      avatar: getInitial(name),
      id: record.id,
      name,
      note,
      status,
      tone,
    };
  });
}

export function adaptReadonlyCustomerDetailToProfileFields(
  record: DaochongReadonlyCustomerDetailRecord | null | undefined,
  fallbackFields: DaochongFormField[],
): DaochongFormField[] {
  if (!record) return fallbackFields;

  const name = customerDisplayName(record);
  const ownerName = userDisplayName(record.owner);
  const { status } = customerStatusDisplay(record.status);
  const address = compactText([record.province, record.city, record.district, record.address]);
  const wechat = record.wechat ?? record.wechatId ?? null;
  const probability = textOrNull(record.successProbability ?? record.dealProbability);

  return [
    {
      label: "客户姓名",
      value: name,
      helper: "来自 /customers/:id 只读接口。",
    },
    {
      label: "联系方式",
      value: compactText([record.mobile ? `电话 ${record.mobile}` : null, wechat ? `微信 ${wechat}` : null]) || "未填写",
      helper: "仅展示现有 CRM 联系字段。",
    },
    {
      label: "负责人",
      value: ownerName ?? "未分配",
      helper: "来自 CRM 客户负责人，不等于道冲服务老师。",
    },
    {
      label: "客户状态",
      value: compactText([status, probability ? `意向 ${probability}` : null]),
      helper: "CRM 状态，不代表道冲卡项状态。",
    },
    {
      label: "地址/来源",
      value: compactText([address || null, record.source ? `来源 ${record.source}` : null]) || "未填写",
      helper: "现有客户基础资料。",
    },
    {
      label: "备注",
      value: record.remark?.trim() || "未填写",
      helper: "道冲服务纪要和个人爱好仍需独立沉淀。",
    },
  ];
}

export function adaptReadonlyCustomerDetailToServiceHistory(
  record: DaochongReadonlyCustomerDetailRecord | null | undefined,
  fallbackHistory: DaochongTimelineItem[],
): DaochongTimelineItem[] {
  if (!record) return fallbackHistory;

  const entries: Array<DaochongTimelineItem & { sortAt?: string | null }> = [];

  for (const followup of record.followups ?? []) {
    const creatorName = userDisplayName(followup.creator);
    entries.push({
      title: followupTypeDisplay(followup.followupType),
      note:
        compactText([
          followup.content,
          followup.keyPoints ? `关键点 ${followup.keyPoints}` : null,
          followup.nextAction ? `下一步 ${followup.nextAction}` : null,
          creatorName ? `记录人 ${creatorName}` : null,
        ]) || "CRM 跟进记录",
      meta: formatDateLabel(followup.followupDate ?? followup.createdAt),
      sortAt: followup.followupDate ?? followup.createdAt,
      tone: "blue",
    });
  }

  for (const quotation of record.quotations ?? []) {
    entries.push({
      title: quotation.quotationNo ? `报价 ${quotation.quotationNo}` : "关联报价",
      note: compactText([quotation.type, quotationStatusDisplay(quotation.status), `金额 ${formatMoney(quotation.totalAmount)}`]),
      meta: formatDateLabel(quotation.createdAt),
      sortAt: quotation.createdAt,
      tone: "amber",
    });
  }

  for (const task of record.tasks ?? []) {
    const assigneeName = userDisplayName(task.assignee);
    entries.push({
      title: task.title?.trim() || "关联任务",
      note: compactText([taskStatusDisplay(task.status), task.content, assigneeName ? `负责人 ${assigneeName}` : null]),
      meta: formatDateLabel(task.startAt ?? task.createdAt),
      sortAt: task.startAt ?? task.createdAt,
      tone: task.status === "COMPLETED" || task.status === "DONE" ? "green" : "neutral",
    });
  }

  if (entries.length === 0) {
    return [
      {
        title: "暂无 CRM 跟进、报价或任务",
        note: "真实道冲服务记录、卡项余额和个人爱好仍等待独立接口。",
        meta: "只读",
        tone: "neutral",
      },
    ];
  }

  return entries
    .sort((a, b) => sortDateValue(b.sortAt) - sortDateValue(a.sortAt))
    .slice(0, 6)
    .map((entry) => ({
      meta: entry.meta,
      note: entry.note,
      title: entry.title,
      tone: entry.tone,
    }));
}

export function adaptReadonlyCustomerDetailToPreferenceRows(
  record: DaochongReadonlyCustomerDetailRecord | null | undefined,
  fallbackRows: DaochongMoneyRow[],
  preferenceResponse?: DaochongReadonlyCustomerPreferenceResponse | null,
): DaochongMoneyRow[] {
  const preferences = getCustomerPreferenceRecords(preferenceResponse);
  if (preferences.length > 0) {
    return preferences.slice(0, 6).map((preference) => ({
      label: preference.preferenceLabel?.trim() || preferenceTypeDisplay(preference.preferenceType),
      note:
        compactText([
          preference.preferenceValue,
          preference.roomPreference ? `房间 ${preference.roomPreference}` : null,
          preference.lightPreference ? `灯光 ${preference.lightPreference}` : null,
          preference.pressurePreference ? `力度 ${preference.pressurePreference}` : null,
          preference.tabooNotes ? `禁忌 ${preference.tabooNotes}` : null,
          preference.hobbyNotes ? `爱好 ${preference.hobbyNotes}` : null,
          preference.sourceServiceNoteId ? `来源纪要 ${preference.sourceServiceNoteId}` : null,
        ]) || "正式客户偏好只读记录",
      value: preferenceVisibilityDisplay(preference.visibility),
    }));
  }

  if (!record) return fallbackRows;

  const followups = record.followups?.length ?? 0;
  const quotations = record.quotations?.length ?? 0;
  const tasks = record.tasks?.length ?? 0;
  const latestFollowup = record.followups?.[0];

  return [
    {
      label: "CRM 跟进",
      note: latestFollowup?.content?.trim() || "现有客户详情里的 followups 数量",
      value: `${followups} 条`,
    },
    {
      label: "关联报价",
      note: "现有客户详情里的 quotations 数量，不等于道冲充值或耗卡",
      value: `${quotations} 条`,
    },
    {
      label: "关联任务",
      note: "现有客户详情里的 tasks 数量，可作为回访计划参考",
      value: `${tasks} 条`,
    },
    {
      label: "卡项余额",
      note: "当前 /customers/:id 未直出道冲卡项余额，后续需新口径",
      value: "待接",
    },
    {
      label: "个人爱好",
      note: "需要服务纪要或偏好接口同步，不能从 CRM 跟进直接等同",
      value: "待接",
    },
  ];
}

export function adaptReadonlyCustomerCardBalancesToRows(
  response: DaochongReadonlyCustomerCardBalanceResponse | null | undefined,
  fallbackRows: DaochongMoneyRow[],
): DaochongMoneyRow[] {
  const balances = getCustomerCardBalanceRecords(response);
  if (balances.length === 0) return fallbackRows;

  const balanceRows = balances.slice(0, 3).map((balance) => ({
    label: "卡项余额",
    note:
      compactText([
        balance.cardName,
        balance.summary?.confirmedRechargeAmount ? `已入账 ${formatMoney(balance.summary.confirmedRechargeAmount)}` : null,
        balance.summary?.approvedConsumeAmount ? `已耗卡 ${formatMoney(balance.summary.approvedConsumeAmount)}` : null,
        balance.lastRechargeId ? `最近充值 ${balance.lastRechargeId}` : null,
        balance.lastConsumptionApprovalId ? `最近耗卡 ${balance.lastConsumptionApprovalId}` : null,
        balance.readonlyWarnings?.[0],
      ]) || "客户卡项余额只读预览",
    value: formatMoney(balance.remainingAmount),
  }));

  const otherRows = fallbackRows.filter((row) => row.label !== "卡项余额");
  return [...balanceRows, ...otherRows].slice(0, 8);
}

function latestFollowup(record: DaochongReadonlyCustomerDetailRecord) {
  return (record.followups ?? [])
    .slice()
    .sort((a, b) => sortDateValue(b.followupDate ?? b.createdAt) - sortDateValue(a.followupDate ?? a.createdAt))[0];
}

function latestServiceNote(response: DaochongReadonlyServiceNoteResponse | null | undefined) {
  return getServiceNoteRecords(response)
    .slice()
    .sort((a, b) => sortDateValue(b.completedAt ?? b.createdAt ?? b.dueAt) - sortDateValue(a.completedAt ?? a.createdAt ?? a.dueAt))[0];
}

function latestWecomReminderDryRun(response: DaochongReadonlyWecomReminderDryRunResponse | null | undefined) {
  return getWecomReminderDryRunRecords(response)
    .slice()
    .sort((a, b) => sortDateValue(b.scheduledAt ?? b.dueAt ?? b.createdAt) - sortDateValue(a.scheduledAt ?? a.dueAt ?? a.createdAt))[0];
}

export function adaptReadonlyCustomerDetailToServiceNoteContextFields(
  record: DaochongReadonlyCustomerDetailRecord | null | undefined,
  fallbackFields: DaochongFormField[],
  serviceNoteResponse?: DaochongReadonlyServiceNoteResponse | null,
): DaochongFormField[] {
  const serviceNote = latestServiceNote(serviceNoteResponse);
  if (serviceNote) {
    const name = record ? customerDisplayName(record) : "当前客户";
    const status = serviceNoteStatusDisplay(serviceNote.noteStatus);
    return [
      {
        label: "关联客户",
        value: name,
        helper: "来自正式 service-notes 只读接口，不写服务纪要。",
      },
      {
        label: "正式纪要状态",
        value: status.status,
        helper: compactText([serviceNoteSourceDisplay(serviceNote.sourceType), serviceNote.dueAt ? `截止 ${formatDateLabel(serviceNote.dueAt)}` : null]),
      },
      {
        label: "本次摘要",
        value: serviceNote.serviceSummary?.trim() || serviceNote.pendingReason?.trim() || "待补摘要",
        helper: "只读展示正式 DaochongServiceNote，不提交修改。",
      },
      {
        label: "客户反馈",
        value: serviceNote.customerFeedback?.trim() || "未记录",
        helper: "客户反馈来自正式服务纪要字段。",
      },
      {
        label: "偏好同步",
        value: serviceNote.preferenceSyncStatus ?? "NOT_SYNCED",
        helper: serviceNote.preferenceNote?.trim() || "同步客户偏好仍需后续写动作确认。",
      },
    ];
  }

  if (!record) return fallbackFields;

  const name = customerDisplayName(record);
  const followup = latestFollowup(record);
  const creatorName = userDisplayName(followup?.creator);

  return [
    {
      label: "关联客户",
      value: name,
      helper: "来自 /customers/:id，只读展示，不写服务纪要。",
    },
    {
      label: "最近候选记录",
      value: followup
        ? compactText([formatDateLabel(followup.followupDate ?? followup.createdAt), followupTypeDisplay(followup.followupType)])
        : "暂无 CRM 跟进记录",
      helper: "当前只能用 CRM followups 作为服务纪要候选。",
    },
    {
      label: "记录人",
      value: creatorName ?? "未记录",
      helper: "记录人不等于本次道冲服务老师。",
    },
    {
      label: "待补原因",
      value: "正式道冲服务纪要接口未接入，当前只显示候选资料",
      helper: "不会触发 12 小时企业微信真实发送。",
    },
    {
      label: "偏好候选",
      value: compactText([followup?.keyPoints, followup?.nextAction, record.remark]) || "待服务纪要同步",
      helper: "不能直接写入个人爱好，需后续独立偏好口径。",
    },
  ];
}

export function adaptReadonlyCustomerDetailToServiceNotePendingRows(
  record: DaochongReadonlyCustomerDetailRecord | null | undefined,
  fallbackRows: DaochongMoneyRow[],
  serviceNoteResponse?: DaochongReadonlyServiceNoteResponse | null,
): DaochongMoneyRow[] {
  const serviceNotes = getServiceNoteRecords(serviceNoteResponse);
  if (serviceNotes.length > 0) {
    return serviceNotes.slice(0, 5).map((serviceNote) => {
      const status = serviceNoteStatusDisplay(serviceNote.noteStatus);
      return {
        label: serviceNote.serviceSummary?.trim() || `${serviceNoteSourceDisplay(serviceNote.sourceType)}服务纪要`,
        note:
          compactText([
            serviceNote.pendingReason,
            serviceNote.customerFeedback ? `反馈 ${serviceNote.customerFeedback}` : null,
            serviceNote.nextSuggestion ? `建议 ${serviceNote.nextSuggestion}` : null,
            serviceNote.dueAt ? `截止 ${formatDateLabel(serviceNote.dueAt)} ${formatTimeLabel(serviceNote.dueAt)}` : null,
          ]) || "正式服务纪要只读记录",
        value: status.status,
      };
    });
  }

  if (!record) return fallbackRows;

  const name = customerDisplayName(record);
  const followups = record.followups ?? [];
  if (followups.length === 0) {
    return [
      {
        label: `${name}服务纪要`,
        note: "没有 CRM 跟进候选，真实服务记录仍待 serviceNotes 接口",
        value: "待接",
      },
    ];
  }

  return followups.slice(0, 4).map((followup) => ({
    label: `${name}${followupTypeDisplay(followup.followupType)}`,
    note:
      compactText([
        followup.content,
        followup.keyPoints ? `关键点 ${followup.keyPoints}` : null,
        followup.nextAction ? `下一步 ${followup.nextAction}` : null,
      ]) || "CRM 跟进候选",
    value: followup.nextFollowupAt ? "有回访" : "候选",
  }));
}

export function adaptReadonlyCustomerDetailToServiceNoteReminderFields(
  record: DaochongReadonlyCustomerDetailRecord | null | undefined,
  fallbackFields: DaochongFormField[],
  serviceNoteResponse?: DaochongReadonlyServiceNoteResponse | null,
  wecomReminderDryRunResponse?: DaochongReadonlyWecomReminderDryRunResponse | null,
): DaochongFormField[] {
  const dryRun = latestWecomReminderDryRun(wecomReminderDryRunResponse);
  if (dryRun) {
    return [
      {
        label: "dry-run 来源",
        value: "wecom-reminder-dry-runs GET",
        helper: "正式 12 小时提醒预览，只读展示，不创建通知。",
      },
      {
        label: "提醒对象",
        value: userDisplayName(dryRun.teacher) ?? dryRun.teacherId ?? "服务老师待定",
        helper: dryRun.teacher?.wecomUserId ? `企业微信 ${dryRun.teacher.wecomUserId}` : "真实发送前仍需确认企业微信接收人。",
      },
      {
        label: "卡片标题",
        value: dryRun.cardTitle?.trim() || "服务纪要待补填",
        helper: "来自 dry-run payload 预览，不发送。",
      },
      {
        label: "卡片摘要",
        value: dryRun.cardSummary?.trim() || "请补充本次服务纪要和客户偏好。",
        helper: "后端只读生成的企业微信卡片摘要。",
      },
      {
        label: "点击进入",
        value: dryRun.jumpPage ?? "补填纪要 · serviceNote",
        helper: "跳转入口保持在灰度页面。",
      },
      {
        label: "计划触发",
        value: dryRun.scheduledAt
          ? `${formatDateLabel(dryRun.scheduledAt)} ${formatTimeLabel(dryRun.scheduledAt)}`
          : "待 12 小时规则",
        helper: "只读展示计划触发时间，不调度发送。",
      },
      {
        label: "发送状态",
        value: dryRun.sentAt ? `已记录 ${formatDateLabel(dryRun.sentAt)}` : "dry-run 未发送",
        helper: dryRun.cancelledReason ?? "本阶段不调用企业微信发送接口。",
      },
    ];
  }

  const serviceNote = latestServiceNote(serviceNoteResponse);
  if (serviceNote) {
    const name = record ? customerDisplayName(record) : "当前客户";
    return [
      {
        label: "dry-run 来源",
        value: "正式服务纪要只读",
        helper: "本阶段只读取 service-notes，不创建提醒记录。",
      },
      {
        label: "提醒对象",
        value: serviceNote.teacherId ?? "服务老师待定",
        helper: "真实发送前仍需确认老师企业微信接收人。",
      },
      {
        label: "卡片标题",
        value: `${name}服务纪要${serviceNoteStatusDisplay(serviceNote.noteStatus).status}`,
        helper: "仅为卡片文案预览，不发送。",
      },
      {
        label: "卡片摘要",
        value: serviceNote.serviceSummary?.trim() || serviceNote.pendingReason?.trim() || "请补充本次服务纪要和客户偏好。",
        helper: "来自正式服务纪要字段。",
      },
      {
        label: "点击进入",
        value: "补填纪要 · serviceNote",
        helper: "点击入口保持在灰度页面，不触发真实企业微信。",
      },
      {
        label: "计划触发",
        value: serviceNote.reminderScheduledAt
          ? `${formatDateLabel(serviceNote.reminderScheduledAt)} ${formatTimeLabel(serviceNote.reminderScheduledAt)}`
          : serviceNote.dueAt
            ? `${formatDateLabel(serviceNote.dueAt)} ${formatTimeLabel(serviceNote.dueAt)}`
            : "待 12 小时规则",
        helper: "只读展示提醒时间，不调度发送。",
      },
      {
        label: "发送状态",
        value: serviceNote.remindedAt ? `已记录 ${formatDateLabel(serviceNote.remindedAt)}` : "dry-run 未发送",
        helper: "本阶段不调用企业微信发送接口。",
      },
    ];
  }

  if (!record) return fallbackFields;

  const name = customerDisplayName(record);
  const followup = latestFollowup(record);
  const creatorName = userDisplayName(followup?.creator);

  return [
    {
      label: "dry-run 来源",
      value: followup ? "CRM 跟进候选" : "暂无候选",
      helper: "本阶段不创建真实提醒记录。",
    },
    {
      label: "提醒对象",
      value: creatorName ?? "服务老师待定",
      helper: "真实发送前需确认服务老师和企业微信接收人。",
    },
    {
      label: "卡片标题",
      value: `${name}服务纪要候选待确认`,
      helper: "仅为卡片文案预览，不发送。",
    },
    {
      label: "卡片摘要",
      value: followup?.content?.trim() || "请补充本次服务纪要和客户偏好。",
      helper: "后续需由正式服务纪要接口生成。",
    },
    {
      label: "点击进入",
      value: "补填纪要 · serviceNote",
      helper: "点击入口保持在灰度页面，不触发真实企业微信。",
    },
    {
      label: "计划触发",
      value: followup?.nextFollowupAt
        ? `${formatDateLabel(followup.nextFollowupAt)} ${formatTimeLabel(followup.nextFollowupAt)}`
        : "待正式 12 小时规则",
      helper: "CRM 下次跟进时间不等于道冲 12 小时纪要提醒。",
    },
    {
      label: "发送状态",
      value: "dry-run 未发送",
      helper: "本阶段不调用企业微信发送接口。",
    },
  ];
}

export function adaptReadonlyCustomerDetailToServiceNoteStatuses(
  record: DaochongReadonlyCustomerDetailRecord | null | undefined,
  fallbackStatuses: DaochongStatusItem[],
  serviceNoteResponse?: DaochongReadonlyServiceNoteResponse | null,
  preferenceResponse?: DaochongReadonlyCustomerPreferenceResponse | null,
  wecomReminderDryRunResponse?: DaochongReadonlyWecomReminderDryRunResponse | null,
): DaochongStatusItem[] {
  const serviceNotes = getServiceNoteRecords(serviceNoteResponse);
  const preferences = getCustomerPreferenceRecords(preferenceResponse);
  const dryRuns = getWecomReminderDryRunRecords(wecomReminderDryRunResponse);
  if (serviceNotes.length > 0 || preferences.length > 0 || dryRuns.length > 0) {
    const pendingCount = serviceNotes.filter((note) => ["OVERDUE", "PENDING", "RETURNED"].includes(note.noteStatus ?? "")).length;
    const remindedCount = serviceNotes.filter((note) => note.remindedAt).length;
    const readyDryRunCount = dryRuns.filter((item) => item.dryRunStatus === "ready_to_preview").length;
    return [
      {
        title: "serviceNotes 接口",
        note: "已读取正式道冲服务纪要 GET，只读模式不提交修改",
        status: serviceNotes.length > 0 ? `${serviceNotes.length} 条` : "空数据",
        tone: serviceNotes.length > 0 ? "green" : "amber",
      },
      {
        title: "待补纪要",
        note: "只读统计 PENDING / OVERDUE / RETURNED 状态，不触发提醒",
        status: pendingCount > 0 ? `${pendingCount} 条` : "无待补",
        tone: pendingCount > 0 ? "amber" : "green",
      },
      {
        title: dryRuns.length > 0 ? "wecom-reminder-dry-runs GET" : "12 小时提醒",
        note: dryRuns.length > 0
          ? "已读取 12 小时提醒 dry-run 预览，不创建通知、不调用企业微信"
          : "当前只展示 remindedAt / dueAt / reminderScheduledAt，不发送企业微信",
        status: dryRuns.length > 0
          ? `${dryRuns.length} 条预览`
          : remindedCount > 0
            ? `${remindedCount} 条已记录`
            : "未发送",
        tone: readyDryRunCount > 0 || remindedCount > 0 ? "blue" : "amber",
      },
      {
        title: "个人爱好同步",
        note: "已读取 customer-preferences GET，偏好同步写动作仍关闭",
        status: preferences.length > 0 ? `${preferences.length} 条` : "空数据",
        tone: preferences.length > 0 ? "green" : "amber",
      },
    ];
  }

  if (!record) return fallbackStatuses;

  const followupCount = record.followups?.length ?? 0;
  const reminderCount = (record.followups ?? []).filter((followup) => followup.nextFollowupAt || followup.needReminder).length;

  return [
    {
      title: "serviceNotes 接口",
      note: "未发现独立道冲服务纪要接口，当前基于 CRM followups 只读候选",
      status: "待建",
      tone: "amber",
    },
    {
      title: "CRM 跟进候选",
      note: "可作为补填纪要参考，但不会写入客户服务记录",
      status: `${followupCount} 条`,
      tone: followupCount > 0 ? "blue" : "neutral",
    },
    {
      title: "12 小时提醒",
      note: "当前只生成页面预览，不发送企业微信",
      status: reminderCount > 0 ? "候选" : "未生成",
      tone: "amber",
    },
    {
      title: "个人爱好同步",
      note: "需要正式服务纪要或偏好接口，不能直接从 CRM 跟进写入",
      status: "待接",
      tone: "neutral",
    },
  ];
}

export function adaptReadonlyCustomerDetailToServiceNoteReminderTimeline(
  record: DaochongReadonlyCustomerDetailRecord | null | undefined,
  fallbackTimeline: DaochongTimelineItem[],
  serviceNoteResponse?: DaochongReadonlyServiceNoteResponse | null,
  wecomReminderDryRunResponse?: DaochongReadonlyWecomReminderDryRunResponse | null,
): DaochongTimelineItem[] {
  const dryRuns = getWecomReminderDryRunRecords(wecomReminderDryRunResponse);
  if (dryRuns.length > 0) {
    return dryRuns.slice(0, 5).map((dryRun) => ({
      title: dryRun.sentAt ? "dry-run 已记录" : "dry-run 待发送预览",
      note:
        compactText([
          dryRun.cardSummary,
          dryRun.teacher ? `提醒 ${userDisplayName(dryRun.teacher) ?? dryRun.teacherId}` : null,
          dryRun.jumpPage ? `入口 ${dryRun.jumpPage}` : null,
          dryRun.readonlyWarnings?.[0],
        ]) || "企业微信 12 小时提醒 dry-run 只读预览",
      meta: formatDateLabel(dryRun.scheduledAt ?? dryRun.dueAt ?? dryRun.createdAt),
      tone: dryRun.sentAt ? "blue" : "amber",
    }));
  }

  const serviceNotes = getServiceNoteRecords(serviceNoteResponse);
  if (serviceNotes.length > 0) {
    return serviceNotes.slice(0, 5).map((serviceNote) => {
      const status = serviceNoteStatusDisplay(serviceNote.noteStatus);
      return {
        title: serviceNote.noteStatus === "COMPLETED" ? "正式纪要完成" : "正式纪要待处理",
        note:
          compactText([
            serviceNote.serviceSummary,
            serviceNote.nextSuggestion ? `建议 ${serviceNote.nextSuggestion}` : null,
            serviceNote.preferenceSyncStatus ? `偏好 ${serviceNote.preferenceSyncStatus}` : null,
          ]) || "正式 service-notes 只读记录",
        meta: formatDateLabel(serviceNote.completedAt ?? serviceNote.dueAt ?? serviceNote.createdAt),
        tone: status.tone,
      };
    });
  }

  if (!record) return fallbackTimeline;

  const followups = record.followups ?? [];
  if (followups.length === 0) {
    return [
      {
        title: "等待正式服务纪要",
        note: "当前客户没有 CRM 跟进候选，后续需从服务完成或补填记录读取",
        meta: "待接",
        tone: "neutral",
      },
    ];
  }

  return followups.slice(0, 4).map((followup) => ({
    title: followup.nextFollowupAt ? "候选提醒" : "候选纪要",
    note:
      compactText([
        followup.content,
        followup.nextAction ? `下一步 ${followup.nextAction}` : null,
        followup.nextFollowupAt ? `下次跟进 ${formatDateLabel(followup.nextFollowupAt)}` : null,
      ]) || "CRM 跟进候选",
    meta: formatDateLabel(followup.followupDate ?? followup.createdAt),
    tone: followup.nextFollowupAt ? "amber" : "blue",
  }));
}

export function adaptReadonlyEvidenceAssetsToFields(
  response: DaochongReadonlyEvidenceAssetResponse | null | undefined,
  fallbackFields: DaochongFormField[],
): DaochongFormField[] {
  const records = getEvidenceAssetRecords(response);
  const latest = latestByUpdatedAt(records);
  if (!latest) return fallbackFields;

  const uploaderName = userDisplayName(latest.uploadedBy);
  const visibleRoles = latest.visibleRoles?.length ? latest.visibleRoles.join("、") : latest.permissionScope;
  const status = evidenceReviewStatusDisplay(latest.reviewStatus);

  return [
    {
      label: "凭证编号",
      value: latest.id ?? "未命名凭证",
      helper: "来自 evidence-assets 只读 GET，不上传、不复核、不锁定。",
    },
    {
      label: "关联业务",
      value:
        compactText([
          latest.businessType ? `业务 ${latest.businessType}` : null,
          latest.businessId ? `编号 ${latest.businessId}` : null,
          latest.relatedType ? `关联 ${latest.relatedType}` : null,
          latest.relatedId ? `关联编号 ${latest.relatedId}` : null,
        ]) || "未绑定业务",
      helper: "读取 FileRecord 现有业务字段，不能等同道冲资金闭环。",
    },
    {
      label: "凭证类型",
      value: compactText([latest.assetType, latest.fileType, formatFileSize(latest.fileSizeBytes)]) || "只读附件",
      helper: latest.fileName ?? "FileRecord 附件字段。",
    },
    {
      label: "上传人",
      value: compactText([uploaderName, latest.uploadedAt ? formatDateLabel(latest.uploadedAt) : null]) || "未记录",
      helper: "上传信息来自现有文件记录，当前页面不修改。",
    },
    {
      label: "可见角色",
      value: visibleRoles?.trim() || "按 dataScope 和 FileRecord 权限",
      helper: "前端只展示接口返回范围，角色可见性仍由后端权限决定。",
    },
    {
      label: "当前状态",
      value: compactText([status.status, latest.lockedAt ? `锁定 ${formatDateLabel(latest.lockedAt)}` : null]) || "只读",
      helper: latest.returnReason?.trim() || "不执行审批、退回或归档动作。",
    },
  ];
}

export function adaptReadonlyEvidenceAssetsToRows(
  response: DaochongReadonlyEvidenceAssetResponse | null | undefined,
  fallbackRows: DaochongMoneyRow[],
): DaochongMoneyRow[] {
  const records = getEvidenceAssetRecords(response);
  if (records.length === 0) return fallbackRows;

  return records.slice(0, 5).map((record) => {
    const status = evidenceReviewStatusDisplay(record.reviewStatus);
    const uploaderName = userDisplayName(record.uploadedBy);
    return {
      label: record.fileName?.trim() || record.id || "未命名凭证",
      note:
        compactText([
          record.assetType,
          record.businessType ? `业务 ${record.businessType}` : null,
          uploaderName ? `上传 ${uploaderName}` : null,
          formatFileSize(record.fileSizeBytes),
          record.returnReason ? `备注 ${record.returnReason}` : null,
        ]) || "FileRecord 只读凭证",
      value: status.status,
    };
  });
}

export function adaptReadonlyEvidenceAssetsToTimeline(
  response: DaochongReadonlyEvidenceAssetResponse | null | undefined,
  fallbackTimeline: DaochongTimelineItem[],
): DaochongTimelineItem[] {
  const records = getEvidenceAssetRecords(response);
  if (records.length === 0) return fallbackTimeline;

  return records.slice(0, 5).map((record) => {
    const status = evidenceReviewStatusDisplay(record.reviewStatus);
    return {
      title: record.lockedAt ? "只读归档凭证" : "只读凭证记录",
      note:
        compactText([
          record.fileName,
          record.originalUrl ? "有原图链接" : "无原图链接",
          record.businessId ? `业务编号 ${record.businessId}` : null,
          record.isImportant ? "重要" : null,
        ]) || "来自 evidence-assets 只读 GET",
      meta: formatDateLabel(record.updatedAt ?? record.uploadedAt),
      tone: status.tone,
    };
  });
}

export function adaptReadonlyEvidenceAssetsToStatuses(
  response: DaochongReadonlyEvidenceAssetResponse | null | undefined,
  fallbackStatuses: DaochongStatusItem[],
): DaochongStatusItem[] {
  const records = getEvidenceAssetRecords(response);
  if (records.length === 0) return fallbackStatuses;

  const originalCount = records.filter((record) => record.originalUrl || record.thumbnailUrl).length;
  const pendingCount = records.filter((record) => ["DRAFT", "PENDING_REVIEW"].includes(record.reviewStatus ?? "")).length;
  const archivedCount = records.filter((record) => record.lockedAt || record.reviewStatus === "ARCHIVED").length;

  return [
    {
      title: "evidence-assets GET",
      note: "已从 FileRecord 只读映射凭证附件；不执行上传、复核或退回",
      status: `${records.length} 条`,
      tone: "green",
    },
    {
      title: "原图链接",
      note: "只展示接口返回的 thumbnailUrl / originalUrl，不下载、不重写文件",
      status: originalCount > 0 ? `${originalCount} 条` : "缺失",
      tone: originalCount > 0 ? "green" : "amber",
    },
    {
      title: "复核状态",
      note: "只读统计 reviewStatus，不进入充值余额、扣卡或财务最终口径",
      status: pendingCount > 0 ? `${pendingCount} 条待复核` : "无待复核",
      tone: pendingCount > 0 ? "amber" : "green",
    },
    {
      title: "归档锁定",
      note: "只读展示 lockedAt / ARCHIVED，不执行归档或解锁",
      status: archivedCount > 0 ? `${archivedCount} 条` : "未锁定",
      tone: archivedCount > 0 ? "neutral" : "amber",
    },
  ];
}

export function adaptReadonlyMeetingNotesToFields(
  response: DaochongReadonlyMeetingNoteResponse | null | undefined,
  fallbackFields: DaochongFormField[],
): DaochongFormField[] {
  const records = getMeetingNoteRecords(response);
  const latest = latestByUpdatedAt(records);
  if (!latest) return fallbackFields;

  return [
    {
      label: "会议纪要标题",
      value: latest.title?.trim() || "未命名会议纪要",
      helper: "来自 meeting-notes 只读 GET，不编辑、不归档。",
    },
    {
      label: "会议时间",
      value: compactText([formatDateLabel(latest.meetingAt), formatTimeLabel(latest.meetingAt)]) || "未记录",
      helper: compactText([latest.folderId ? `文件夹 ${latest.folderId}` : null, latest.sourceType]) || "MeetingMinutesRecord 时间字段。",
    },
    {
      label: "讨论结论",
      value: latest.conclusion?.trim() || "未填写结论",
      helper: "只解析 recordJson 中的 conclusion / summary / meetingSummary。",
    },
    {
      label: "关联客户",
      value: latest.relatedCustomerIds?.length ? latest.relatedCustomerIds.join("、") : "未关联客户",
      helper: "客户关联只展示，不同步客户档案。",
    },
    {
      label: "附件",
      value: latest.attachmentIds?.length ? `${latest.attachmentIds.length} 个附件` : "未绑定附件",
      helper: "附件仍需通过 evidence-assets 或文件记录单独查看。",
    },
  ];
}

export function adaptReadonlyMeetingNotesToTodoRows(
  response: DaochongReadonlyMeetingNoteResponse | null | undefined,
  fallbackRows: DaochongMoneyRow[],
): DaochongMoneyRow[] {
  const records = getMeetingNoteRecords(response);
  if (records.length === 0) return fallbackRows;

  const rows = records.flatMap((record) => {
    const todos = record.todoItems?.length ? record.todoItems : [record.conclusion || "未拆分待办"];
    return todos.map((todo, index) => ({
      label: todo,
      note:
        compactText([
          record.title,
          record.ownerUserIds?.[index] ? `负责人 ${record.ownerUserIds[index]}` : null,
          record.relatedCustomerIds?.length ? `客户 ${record.relatedCustomerIds.join("、")}` : null,
        ]) || "会议纪要只读待办",
      value: archiveStatusDisplay(record.archiveStatus),
    }));
  });

  return rows.slice(0, 5);
}

export function adaptReadonlyMeetingNotesToStatuses(
  response: DaochongReadonlyMeetingNoteResponse | null | undefined,
  fallbackStatuses: DaochongStatusItem[],
): DaochongStatusItem[] {
  const records = getMeetingNoteRecords(response);
  if (records.length === 0) return fallbackStatuses;

  const todoCount = records.reduce((count, record) => count + (record.todoItems?.length ?? 0), 0);
  const customerCount = records.reduce((count, record) => count + (record.relatedCustomerIds?.length ?? 0), 0);
  const archivedCount = records.filter((record) => archiveStatusDisplay(record.archiveStatus) === "已归档").length;

  return [
    {
      title: "meeting-notes GET",
      note: "已从 MeetingMinutesRecord 只读映射会议纪要；不编辑、不生成待办",
      status: `${records.length} 条`,
      tone: "green",
    },
    {
      title: "待办分发",
      note: "只展示 recordJson.todoItems，不写入首页或我的待办",
      status: todoCount > 0 ? `${todoCount} 项` : "未拆分",
      tone: todoCount > 0 ? "blue" : "amber",
    },
    {
      title: "客户同步",
      note: "只展示 relatedCustomerIds，不同步客户档案或服务建议",
      status: customerCount > 0 ? `${customerCount} 个` : "未关联",
      tone: customerCount > 0 ? "green" : "amber",
    },
    {
      title: "只读归档",
      note: "归档状态仅展示 archiveStatus，不执行归档或修改",
      status: archivedCount > 0 ? `${archivedCount} 条` : "只读",
      tone: archivedCount > 0 ? "neutral" : "blue",
    },
  ];
}

export function adaptReadonlyProjectCommunicationsToFields(
  response: DaochongReadonlyProjectCommunicationResponse | null | undefined,
  fallbackFields: DaochongFormField[],
): DaochongFormField[] {
  const records = getProjectCommunicationRecords(response);
  const latest = latestByUpdatedAt(records);
  if (!latest) return fallbackFields;

  const status = communicationStatusDisplay(latest.status);
  return [
    {
      label: "沟通主题",
      value: latest.topic?.trim() || "未命名项目沟通",
      helper: "来自 project-communications 只读 GET，不创建、不编辑。",
    },
    {
      label: "参与项目",
      value: latest.projectScopes?.length ? latest.projectScopes.join("、") : "未标注项目",
      helper: latest.folderId ? `来源文件夹 ${latest.folderId}` : "从 MeetingMinutesRecord recordJson 解析。",
    },
    {
      label: "参与人",
      value: latest.participants?.length ? latest.participants.join("、") : latest.createdBy ?? "未记录",
      helper: "只展示现有记录中的参与人或创建人。",
    },
    {
      label: "关联客户",
      value: latest.relatedCustomerIds?.length ? latest.relatedCustomerIds.join("、") : "未关联客户",
      helper: "只展示客户关联 id，不同步客户档案。",
    },
    {
      label: "当前状态",
      value: compactText([status.status, latest.meetingNoteId ? `纪要 ${latest.meetingNoteId}` : null]),
      helper: latest.privacyLevel ? `隐私 ${latest.privacyLevel}` : "不执行归档或权限变更。",
    },
  ];
}

export function adaptReadonlyProjectCommunicationsToRows(
  response: DaochongReadonlyProjectCommunicationResponse | null | undefined,
  fallbackRows: DaochongMoneyRow[],
): DaochongMoneyRow[] {
  const records = getProjectCommunicationRecords(response);
  if (records.length === 0) return fallbackRows;

  return records.slice(0, 5).map((record) => {
    const status = communicationStatusDisplay(record.status);
    return {
      label: record.topic?.trim() || record.id || "未命名项目沟通",
      note:
        compactText([
          record.projectScopes?.length ? `项目 ${record.projectScopes.join("、")}` : null,
          record.participants?.length ? `参与 ${record.participants.join("、")}` : null,
          record.relatedCustomerIds?.length ? `客户 ${record.relatedCustomerIds.join("、")}` : null,
          record.discussionSummary,
        ]) || "项目沟通只读记录",
      value: status.status,
    };
  });
}

export function adaptReadonlyProjectCommunicationsToStatuses(
  response: DaochongReadonlyProjectCommunicationResponse | null | undefined,
  fallbackStatuses: DaochongStatusItem[],
): DaochongStatusItem[] {
  const records = getProjectCommunicationRecords(response);
  if (records.length === 0) return fallbackStatuses;

  const participantCount = records.reduce((count, record) => count + (record.participants?.length ?? 0), 0);
  const customerCount = records.reduce((count, record) => count + (record.relatedCustomerIds?.length ?? 0), 0);
  const meetingCount = records.filter((record) => record.meetingNoteId).length;

  return [
    {
      title: "project-communications GET",
      note: "已从 MeetingMinutesRecord 只读映射项目沟通；不编辑、不归档",
      status: `${records.length} 条`,
      tone: "green",
    },
    {
      title: "跨项目参与",
      note: "只展示 recordJson.projectScopes / participants，不新增成员",
      status: participantCount > 0 ? `${participantCount} 人次` : "未标注",
      tone: participantCount > 0 ? "blue" : "amber",
    },
    {
      title: "客户脱敏",
      note: "只展示 relatedCustomerIds 或空状态，不展开客户资料",
      status: customerCount > 0 ? `${customerCount} 个` : "未关联",
      tone: customerCount > 0 ? "green" : "amber",
    },
    {
      title: "纪要归档",
      note: "只关联 MeetingMinutesRecord，不生成归档或待办",
      status: meetingCount > 0 ? `${meetingCount} 条` : "未关联",
      tone: meetingCount > 0 ? "blue" : "amber",
    },
  ];
}

export function adaptReadonlyProjectCommunicationsToTimeline(
  response: DaochongReadonlyProjectCommunicationResponse | null | undefined,
  fallbackTimeline: DaochongTimelineItem[],
): DaochongTimelineItem[] {
  const records = getProjectCommunicationRecords(response);
  if (records.length === 0) return fallbackTimeline;

  return records.slice(0, 5).map((record) => {
    const status = communicationStatusDisplay(record.status);
    return {
      title: record.topic?.trim() || "只读项目沟通",
      note:
        compactText([
          record.discussionSummary,
          record.attachmentIds?.length ? `附件 ${record.attachmentIds.length}` : null,
          record.createdBy ? `创建 ${record.createdBy}` : null,
        ]) || "来自 project-communications 只读 GET",
      meta: formatDateLabel(record.updatedAt ?? record.createdAt),
      tone: status.tone,
    };
  });
}

export function adaptReadonlyRechargesToFields(
  response: DaochongReadonlyRechargeResponse | null | undefined,
  fallbackFields: DaochongFormField[],
): DaochongFormField[] {
  const latest = latestByUpdatedAt(getRechargeRecords(response));
  if (!latest) return fallbackFields;

  const status = rechargeStatusDisplay(latest.rechargeStatus);
  const customerName = latest.customer?.name ?? "未命名客户";
  return [
    {
      label: "客户",
      value: customerName,
      helper: "来自 recharges 只读 GET，不新增充值。",
    },
    {
      label: "充值金额",
      value: `${formatMoney(latest.amount)} 元`,
      helper: latest.financeSummaryMonth ? `财务月份 ${latest.financeSummaryMonth}` : "未进入财务月份。",
    },
    {
      label: "充值方式",
      value: paymentMethodDisplay(latest.paymentMethod),
      helper: compactText([userDisplayName(latest.submittedBy) ? `提交 ${userDisplayName(latest.submittedBy)}` : null, latest.createdAt ? formatDateLabel(latest.createdAt) : null]),
    },
    {
      label: "充值截图",
      value: latest.evidenceAssetIds?.length ? `${latest.evidenceAssetIds.length} 个凭证` : "未返回凭证",
      helper: "只展示已绑定凭证，不上传或补传。",
    },
    {
      label: "现金照片",
      value: latest.cashPhotoAssetIds?.length ? `${latest.cashPhotoAssetIds.length} 个现金照片` : "未返回现金照片",
      helper: compactText([latest.cashAmount ? `现金 ${formatMoney(latest.cashAmount)}` : null, userDisplayName(latest.cashCustodian) ? `保管 ${userDisplayName(latest.cashCustodian)}` : null]) || "非现金或未填写现金信息。",
    },
    {
      label: "当前状态",
      value: status.status,
      helper: latest.returnReason?.trim() || "当前只读展示，不审批、不复核、不入账。",
    },
  ];
}

export function adaptReadonlyRechargesToRows(
  response: DaochongReadonlyRechargeResponse | null | undefined,
  fallbackRows: DaochongMoneyRow[],
): DaochongMoneyRow[] {
  const records = getRechargeRecords(response);
  if (records.length === 0) return fallbackRows;

  return records.slice(0, 6).map((record) => {
    const status = rechargeStatusDisplay(record.rechargeStatus);
    return {
      label: `${record.customer?.name ?? "未命名客户"}${paymentMethodDisplay(record.paymentMethod)}充值`,
      note:
        compactText([
          userDisplayName(record.submittedBy) ? `提交 ${userDisplayName(record.submittedBy)}` : null,
          record.evidenceAssetIds?.length ? `凭证 ${record.evidenceAssetIds.length}` : null,
          record.cashPhotoAssetIds?.length ? `现金照片 ${record.cashPhotoAssetIds.length}` : null,
          record.returnReason ? `退回 ${record.returnReason}` : null,
        ]) || "充值只读记录",
      value: status.status === "已确认" ? formatMoney(record.amount) : status.status,
    };
  });
}

export function adaptReadonlyRechargesToApprovalActionItems(
  response: DaochongReadonlyRechargeResponse | null | undefined,
): DaochongRechargeApprovalActionItem[] {
  return getRechargeRecords(response)
    .filter((record) => Boolean(record.id))
    .slice()
    .sort((a, b) => sortDateValue(b.updatedAt ?? b.createdAt) - sortDateValue(a.updatedAt ?? a.createdAt))
    .slice(0, 8)
    .map((record) => {
      const status = rechargeStatusDisplay(record.rechargeStatus);
      const submitter = userDisplayName(record.submittedBy);
      return {
        id: record.id ?? "",
        amount: formatMoney(record.amount),
        canChengchengApprove: record.rechargeStatus === "PENDING_CHENGCHENG_APPROVAL",
        canLimengReview: record.rechargeStatus === "PENDING_LIMENG_REVIEW",
        label: `${record.customer?.name ?? "未命名客户"} · ${paymentMethodDisplay(record.paymentMethod)}`,
        note:
          compactText([
            submitter ? `提交 ${submitter}` : null,
            record.evidenceAssetIds?.length ? `凭证 ${record.evidenceAssetIds.length}` : null,
            record.returnReason ? `退回 ${record.returnReason}` : null,
            record.updatedAt ? formatDateLabel(record.updatedAt) : null,
          ]) || "充值审批记录",
        status: status.status,
        tone: status.tone,
      };
    });
}

export function adaptReadonlyRechargesToStatuses(
  response: DaochongReadonlyRechargeResponse | null | undefined,
  fallbackStatuses: DaochongStatusItem[],
): DaochongStatusItem[] {
  const records = getRechargeRecords(response);
  if (records.length === 0) return fallbackStatuses;

  const pendingChengcheng = records.filter((record) => record.rechargeStatus === "PENDING_CHENGCHENG_APPROVAL").length;
  const pendingLimeng = records.filter((record) => record.rechargeStatus === "PENDING_LIMENG_REVIEW").length;
  const cashCount = records.filter((record) => record.paymentMethod === "CASH").length;
  const returnedCount = records.filter((record) => ["RETURNED_BY_CHENGCHENG", "RETURNED_BY_LIMENG"].includes(record.rechargeStatus ?? "")).length;

  return [
    {
      title: "recharges GET",
      note: "已接 DaochongCustomerRecharge 只读来源；不审批、不入账",
      status: `${records.length} 条`,
      tone: "green",
    },
    {
      title: "程程审批",
      note: "只读统计 PENDING_CHENGCHENG_APPROVAL，不触发审批",
      status: pendingChengcheng > 0 ? `${pendingChengcheng} 条` : "无待审",
      tone: pendingChengcheng > 0 ? "amber" : "green",
    },
    {
      title: "立猛复核",
      note: "只读统计 PENDING_LIMENG_REVIEW，不更新余额",
      status: pendingLimeng > 0 ? `${pendingLimeng} 条` : "无待复核",
      tone: pendingLimeng > 0 ? "blue" : "green",
    },
    {
      title: "现金交接",
      note: "只读展示现金金额、现金照片和保管人",
      status: cashCount > 0 ? `${cashCount} 条` : "无现金",
      tone: cashCount > 0 ? "amber" : "neutral",
    },
    {
      title: "退回记录",
      note: "只读展示退回原因，不发通知、不补传",
      status: returnedCount > 0 ? `${returnedCount} 条` : "无退回",
      tone: returnedCount > 0 ? "rose" : "green",
    },
  ];
}

export function adaptReadonlySettlementDraftsToFields(
  response: DaochongReadonlySettlementDraftResponse | null | undefined,
  fallbackFields: DaochongFormField[],
): DaochongFormField[] {
  const latest = latestByUpdatedAt(getSettlementDraftRecords(response));
  if (!latest) return fallbackFields;

  const status = settlementDraftStatusDisplay(latest.draftStatus);
  return [
    {
      label: "草稿编号",
      value: latest.id ?? "未命名草稿",
      helper: "来自 settlement-drafts 只读 GET，不保存草稿。",
    },
    {
      label: "关联预约",
      value: compactText([latest.appointmentId, latest.customer?.name, latest.project?.name]) || "未绑定预约",
      helper: userDisplayName(latest.teacher) ? `服务老师 ${userDisplayName(latest.teacher)}` : "未返回服务老师。",
    },
    {
      label: "客户卡项",
      value: compactText([cardModeDisplay(latest.cardMode), latest.cardId]) || "未返回卡项",
      helper: "只展示卡项模式，不扣减卡项。",
    },
    {
      label: "结算方式",
      value: compactText([`原价 ${formatMoney(latest.originalAmount)}`, `实付 ${formatMoney(latest.finalAmount)}`]),
      helper: latest.discountAmount ? `优惠 ${formatMoney(latest.discountAmount)}` : "未返回优惠金额。",
    },
    {
      label: "扣款凭证",
      value: latest.evidenceAssetIds?.length ? `${latest.evidenceAssetIds.length} 个凭证` : "未返回凭证",
      helper: "无凭证时只显示风险，不上传文件。",
    },
    {
      label: "优惠校验",
      value: latest.discountReason?.trim() || latest.validationStatus || "未返回校验",
      helper: latest.canSubmitApproval ? "只读显示可提交标记，当前不提交审批。" : "当前仍不可提交或未返回可提交标记。",
    },
    {
      label: "推荐人奖金",
      value: compactText([latest.referrerName, latest.referralBonusAmount ? `${formatMoney(latest.referralBonusAmount)} 元` : null]) || "无推荐奖金",
      helper: "只读展示推荐奖金，不进入最终财务。",
    },
    {
      label: "草稿状态",
      value: status.status,
      helper: latest.returnedReason?.trim() || "不提交审批、不扣卡。",
    },
  ];
}

export function adaptReadonlySettlementDraftsToRows(
  response: DaochongReadonlySettlementDraftResponse | null | undefined,
  fallbackRows: DaochongMoneyRow[],
): DaochongMoneyRow[] {
  const records = getSettlementDraftRecords(response);
  if (records.length === 0) return fallbackRows;

  return records.slice(0, 6).map((record) => {
    const status = settlementDraftStatusDisplay(record.draftStatus);
    return {
      label: compactText([record.customer?.name, record.project?.name]) || record.id || "结算草稿",
      note:
        compactText([
          cardModeDisplay(record.cardMode),
          `原价 ${formatMoney(record.originalAmount)}`,
          record.discountReason ? `优惠 ${record.discountReason}` : null,
          record.evidenceAssetIds?.length ? `凭证 ${record.evidenceAssetIds.length}` : null,
        ]) || "结算草稿只读记录",
      value: status.status,
    };
  });
}

export function adaptReadonlySettlementDraftsToStatuses(
  response: DaochongReadonlySettlementDraftResponse | null | undefined,
  fallbackStatuses: DaochongStatusItem[],
): DaochongStatusItem[] {
  const records = getSettlementDraftRecords(response);
  if (records.length === 0) return fallbackStatuses;

  const blockedCount = records.filter((record) => record.draftStatus === "BLOCKED_EVIDENCE").length;
  const readyCount = records.filter((record) => record.canSubmitApproval || record.draftStatus === "READY_FOR_APPROVAL").length;
  const returnedCount = records.filter((record) => record.draftStatus === "RETURNED").length;
  const noCardCount = records.filter((record) => record.cardMode === "NO_CARD").length;

  return [
    {
      title: "settlement-drafts GET",
      note: "已接 DaochongServiceSettlementDraft 只读来源；不保存、不提交",
      status: `${records.length} 条`,
      tone: "green",
    },
    {
      title: "无卡凭证",
      note: "只读统计 NO_CARD 结算，不上传扣款截图",
      status: noCardCount > 0 ? `${noCardCount} 条` : "无无卡",
      tone: noCardCount > 0 ? "amber" : "green",
    },
    {
      title: "凭证拦截",
      note: "只读统计 BLOCKED_EVIDENCE，不生成补传动作",
      status: blockedCount > 0 ? `${blockedCount} 条` : "无拦截",
      tone: blockedCount > 0 ? "rose" : "green",
    },
    {
      title: "提交审批",
      note: "只读展示 canSubmitApproval，不提交审批",
      status: readyCount > 0 ? `${readyCount} 条可提交` : "不可提交",
      tone: readyCount > 0 ? "green" : "amber",
    },
    {
      title: "退回补充",
      note: "只读展示 returnedReason，不发提醒",
      status: returnedCount > 0 ? `${returnedCount} 条` : "无退回",
      tone: returnedCount > 0 ? "rose" : "green",
    },
  ];
}

export function adaptReadonlyConsumptionApprovalsToFields(
  response: DaochongReadonlyConsumptionApprovalResponse | null | undefined,
  fallbackFields: DaochongFormField[],
): DaochongFormField[] {
  const latest = latestByUpdatedAt(getConsumptionApprovalRecords(response));
  if (!latest) return fallbackFields;

  const status = consumptionApprovalStatusDisplay(latest.approvalStatus);
  return [
    {
      label: "审批编号",
      value: latest.id ?? "未命名审批",
      helper: "来自 consumption-approvals 只读 GET，不审批。",
    },
    {
      label: "关联结算草稿",
      value: latest.settlementDraftId ?? "未返回结算草稿",
      helper: latest.settlementDraft?.appointmentId ? `预约 ${latest.settlementDraft.appointmentId}` : "未返回预约编号。",
    },
    {
      label: "客户与项目",
      value: compactText([latest.customer?.name, userDisplayName(latest.teacher)]) || "未返回客户和老师",
      helper: "只读展示客户和老师，不写客户记录。",
    },
    {
      label: "提交老师",
      value: userDisplayName(latest.teacher) ?? "未返回老师",
      helper: latest.createdAt ? formatDateLabel(latest.createdAt) : "未返回提交时间。",
    },
    {
      label: "卡项状态",
      value: latest.cardId ? `卡项 ${latest.cardId}` : "无卡或未返回卡项",
      helper: `耗卡 ${formatMoney(latest.consumeAmount)} 元`,
    },
    {
      label: "关联凭证",
      value: latest.evidenceAssetIds?.length ? `${latest.evidenceAssetIds.length} 个凭证` : "未返回凭证",
      helper: "只展示凭证 id，不上传、不复核。",
    },
    {
      label: "审批状态",
      value: status.status,
      helper: latest.returnReason?.trim() || latest.supplementRequirements?.trim() || "不通过、不退回、不扣卡。",
    },
  ];
}

export function adaptReadonlyConsumptionApprovalsToRows(
  response: DaochongReadonlyConsumptionApprovalResponse | null | undefined,
  fallbackRows: DaochongMoneyRow[],
): DaochongMoneyRow[] {
  const records = getConsumptionApprovalRecords(response);
  if (records.length === 0) return fallbackRows;

  return records.slice(0, 6).map((record) => {
    const status = consumptionApprovalStatusDisplay(record.approvalStatus);
    return {
      label: compactText([record.customer?.name, record.settlementDraftId]) || record.id || "耗卡审批",
      note:
        compactText([
          userDisplayName(record.teacher) ? `老师 ${userDisplayName(record.teacher)}` : null,
          record.discountReason ? `优惠 ${record.discountReason}` : null,
          record.referrerName ? `推荐 ${record.referrerName}` : null,
          record.evidenceAssetIds?.length ? `凭证 ${record.evidenceAssetIds.length}` : null,
        ]) || "耗卡审批只读记录",
      value: status.status === "已通过" ? formatMoney(record.consumeAmount) : status.status,
    };
  });
}

export function adaptReadonlyConsumptionApprovalsToActionItems(
  response: DaochongReadonlyConsumptionApprovalResponse | null | undefined,
): DaochongConsumptionApprovalActionItem[] {
  return getConsumptionApprovalRecords(response)
    .filter((record) => Boolean(record.id))
    .slice()
    .sort((a, b) => sortDateValue(b.updatedAt ?? b.createdAt) - sortDateValue(a.updatedAt ?? a.createdAt))
    .slice(0, 8)
    .map((record) => {
      const status = consumptionApprovalStatusDisplay(record.approvalStatus);
      const teacher = userDisplayName(record.teacher);
      return {
        id: record.id ?? "",
        amount: formatMoney(record.consumeAmount),
        canApprove: record.approvalStatus === "PENDING",
        label: compactText([record.customer?.name, record.settlementDraftId]) || "耗卡审批",
        note:
          compactText([
            teacher ? `老师 ${teacher}` : null,
            record.cardId ? `卡 ${record.cardId}` : "无卡结算",
            record.evidenceAssetIds?.length ? `凭证 ${record.evidenceAssetIds.length}` : null,
            record.returnReason ? `退回 ${record.returnReason}` : null,
            record.updatedAt ? formatDateLabel(record.updatedAt) : null,
          ]) || "耗卡审批记录",
        settlementDraftId: record.settlementDraftId ?? "",
        status: status.status,
        tone: status.tone,
      };
    });
}

export function adaptReadonlyConsumptionApprovalsToStatuses(
  response: DaochongReadonlyConsumptionApprovalResponse | null | undefined,
  fallbackStatuses: DaochongStatusItem[],
): DaochongStatusItem[] {
  const records = getConsumptionApprovalRecords(response);
  if (records.length === 0) return fallbackStatuses;

  const pendingCount = records.filter((record) => record.approvalStatus === "PENDING").length;
  const approvedCount = records.filter((record) => record.approvalStatus === "APPROVED").length;
  const returnedCount = records.filter((record) => record.approvalStatus === "RETURNED").length;
  const evidenceCount = records.reduce((count, record) => count + (record.evidenceAssetIds?.length ?? 0), 0);

  return [
    {
      title: "consumption-approvals GET",
      note: "已接 DaochongCardConsumptionApproval 只读来源；不审批、不扣卡",
      status: `${records.length} 条`,
      tone: "green",
    },
    {
      title: "待审批",
      note: "只读统计 PENDING，不触发审批待办",
      status: pendingCount > 0 ? `${pendingCount} 条` : "无待审",
      tone: pendingCount > 0 ? "amber" : "green",
    },
    {
      title: "已通过",
      note: "只读展示 APPROVED，不扣减卡项或写业绩",
      status: approvedCount > 0 ? `${approvedCount} 条` : "无通过",
      tone: approvedCount > 0 ? "green" : "neutral",
    },
    {
      title: "退回补充",
      note: "只读展示 returnReason / supplementRequirements，不发送提醒",
      status: returnedCount > 0 ? `${returnedCount} 条` : "无退回",
      tone: returnedCount > 0 ? "rose" : "green",
    },
    {
      title: "凭证复查",
      note: "只读统计 evidenceAssetIds，不打开复核动作",
      status: evidenceCount > 0 ? `${evidenceCount} 个` : "未绑定",
      tone: evidenceCount > 0 ? "blue" : "amber",
    },
  ];
}

export function adaptReadonlyConsumptionApprovalsToTimeline(
  response: DaochongReadonlyConsumptionApprovalResponse | null | undefined,
  fallbackTimeline: DaochongTimelineItem[],
): DaochongTimelineItem[] {
  const records = getConsumptionApprovalRecords(response);
  if (records.length === 0) return fallbackTimeline;

  return records.slice(0, 6).map((record) => {
    const status = consumptionApprovalStatusDisplay(record.approvalStatus);
    return {
      title: record.approvalStatus === "APPROVED" ? "审批只读通过" : record.approvalStatus === "RETURNED" ? "审批只读退回" : "审批只读待处理",
      note:
        compactText([
          record.customer?.name,
          `耗卡 ${formatMoney(record.consumeAmount)}`,
          record.returnReason ? `退回 ${record.returnReason}` : null,
          record.supplementRequirements ? `要求 ${record.supplementRequirements}` : null,
        ]) || "耗卡审批只读流转",
      meta: formatDateLabel(record.approvedAt ?? record.returnedAt ?? record.updatedAt ?? record.createdAt),
      tone: status.tone,
    };
  });
}

export function adaptReadonlyCompensationRulesToRows(
  response: DaochongReadonlyCompensationRuleResponse | null | undefined,
  fallbackRows: DaochongMoneyRow[],
): DaochongMoneyRow[] {
  const records = getCompensationRuleRecords(response);
  if (records.length === 0) return fallbackRows;

  return records.slice(0, 6).map((record) => {
    const teacherName = userDisplayName(record.teacher) || record.teacherId || "未指定老师";
    return {
      label: `${teacherName}薪酬规则`,
      note:
        compactText([
          record.effectiveMonth ? `生效 ${record.effectiveMonth}` : null,
          record.manualCommissionRate ? `提点 ${record.manualCommissionRate}%` : null,
          record.fixedCommissionAmount ? `固定 ${formatMoney(record.fixedCommissionAmount)}` : null,
          record.bonusRules?.length ? `奖金 ${record.bonusRules.length} 条` : null,
          record.welfareRules?.length ? `福利 ${record.welfareRules.length} 条` : null,
          record.readonlyWarnings?.[0],
        ]) || "薪酬配置只读记录",
      value: formatMoney(record.baseSalary),
    };
  });
}

export function adaptReadonlyCompensationRulesToFields(
  response: DaochongReadonlyCompensationRuleResponse | null | undefined,
  fallbackFields: DaochongFormField[],
): DaochongFormField[] {
  const latest = latestByUpdatedAt(getCompensationRuleRecords(response));
  if (!latest) return fallbackFields;

  const teacherName = userDisplayName(latest.teacher) || latest.teacherId || "未指定老师";
  return [
    {
      label: "老师",
      value: teacherName,
      helper: latest.teacherId ? `teacherId ${latest.teacherId}` : "薪酬配置只读记录",
    },
    {
      label: "生效月份",
      value: latest.effectiveMonth ?? "待设",
      helper: latest.version ? `版本 ${latest.version}` : "规则必须按月份生效",
    },
    {
      label: "底薪",
      value: formatMoney(latest.baseSalary),
      helper: "只读展示，不从工资单反推。",
    },
    {
      label: "提点规则",
      value: compactText([
        latest.manualCommissionRate ? `${latest.manualCommissionRate}%` : null,
        latest.fixedCommissionAmount ? `固定 ${formatMoney(latest.fixedCommissionAmount)}` : null,
      ]) || "待配置",
      helper: "项目级提点仍需独立配置源。",
    },
    {
      label: "奖金福利",
      value: compactText([
        latest.bonusRules?.length ? `奖金 ${latest.bonusRules.length} 条` : null,
        latest.welfareRules?.length ? `福利 ${latest.welfareRules.length} 条` : null,
      ]) || "待配置",
      helper: latest.readonlyWarnings?.[0] ?? "只读展示，不确认工资、不生成薪资条。",
    },
  ];
}

export function adaptReadonlyCompensationRulesToStatuses(
  response: DaochongReadonlyCompensationRuleResponse | null | undefined,
  fallbackStatuses: DaochongStatusItem[],
): DaochongStatusItem[] {
  const records = getCompensationRuleRecords(response);
  if (records.length === 0) return fallbackStatuses;

  const missingBaseSalary = records.filter((record) => record.baseSalary === null || record.baseSalary === undefined || record.baseSalary === "").length;
  const activeCount = records.filter((record) => (record.ruleStatus ?? "").toUpperCase() !== "DISABLED").length;
  return [
    {
      title: "compensation-rules GET",
      note: "已读取薪酬配置只读返回；不保存规则、不确认工资",
      status: `${records.length} 条`,
      tone: "green",
    },
    {
      title: "底薪口径",
      note: "底薪必须来自配置源，不从 SalarySlip 反推",
      status: missingBaseSalary > 0 ? `${missingBaseSalary} 个待补` : "已配置",
      tone: missingBaseSalary > 0 ? "amber" : "green",
    },
    {
      title: "规则生效",
      note: "只读查看 effectiveMonth/version，不改历史版本",
      status: activeCount > 0 ? `${activeCount} 个有效` : "无有效",
      tone: activeCount > 0 ? "blue" : "amber",
    },
    {
      title: "工资边界",
      note: "不生成工资、不发布薪资条、不发送企微",
      status: "关闭",
      tone: "amber",
    },
  ];
}

export function adaptReadonlyFinanceSummariesToRows(
  response: DaochongReadonlyFinanceSummaryResponse | null | undefined,
  fallbackRows: DaochongMoneyRow[],
): DaochongMoneyRow[] {
  const records = getFinanceSummaryRecords(response);
  if (records.length === 0) return fallbackRows;

  return records.slice(0, 4).flatMap((record) => {
    const month = record.summaryMonth ?? "未标注月份";
    return [
      {
        label: `${month} 已确认充值`,
        note: compactText([
          record.pendingCashCustodyAmount ? `现金待交接 ${formatMoney(record.pendingCashCustodyAmount)}` : null,
          record.evidenceAssetIds?.length ? `凭证 ${record.evidenceAssetIds.length}` : null,
        ]) || "来自 finance-summary 只读 GET",
        value: formatMoney(record.confirmedRechargeAmount),
      },
      {
        label: `${month} 已审耗卡`,
        note: compactText([
          record.commissionAmount ? `提点 ${formatMoney(record.commissionAmount)}` : null,
          record.exceptionCount ? `异常 ${record.exceptionCount}` : null,
        ]) || "只读汇总审批后耗卡金额",
        value: formatMoney(record.approvedConsumeAmount),
      },
      {
        label: `${month} 奖金报销`,
        note: compactText([
          `推荐 ${formatMoney(record.referralBonusAmount)}`,
          `团队 ${formatMoney(record.teamBonusAmount)}`,
          `报销 ${formatMoney(record.expenseAmount)}`,
        ]),
        value: formatMoney(
          Number(record.referralBonusAmount ?? 0) + Number(record.teamBonusAmount ?? 0) + Number(record.expenseAmount ?? 0),
        ),
      },
    ];
  }).slice(0, 6);
}

export function adaptReadonlyFinanceSummariesToDraftFields(
  response: DaochongReadonlyFinanceSummaryResponse | null | undefined,
  fallbackFields: DaochongFormField[],
): DaochongFormField[] {
  const latest = latestByUpdatedAt(getFinanceSummaryRecords(response));
  if (!latest) return fallbackFields;

  const status = financeStatusDisplay(latest.financeStatus);
  const confirmedBy = userDisplayName(latest.confirmedBy);
  return [
    {
      label: "汇总月份",
      value: latest.summaryMonth ?? "未标注月份",
      helper: "来自 finance-summary 只读 GET。",
    },
    {
      label: "草稿编号",
      value: latest.id ?? "未命名草稿",
      helper: "本阶段只读展示，不生成最终工资。",
    },
    {
      label: "数据截止",
      value: compactText([formatDateLabel(latest.sourceCutoffAt), formatTimeLabel(latest.sourceCutoffAt)]),
      helper: latest.evidenceAssetIds?.length ? `关联凭证 ${latest.evidenceAssetIds.length} 个` : "未返回关联凭证。",
    },
    {
      label: "进入口径",
      value: compactText([
        `耗卡 ${formatMoney(latest.approvedConsumeAmount)}`,
        `奖金 ${formatMoney(latest.teamBonusAmount)}`,
        `报销 ${formatMoney(latest.expenseAmount)}`,
      ]),
      helper: payrollPreviewStatusDisplay(latest.payrollPreviewStatus),
    },
    {
      label: "确认状态",
      value: compactText([status.status, confirmedBy ? `确认人 ${confirmedBy}` : null, latest.confirmedAt ? formatDateLabel(latest.confirmedAt) : null]),
      helper: latest.canConfirmFinance ? "只读显示可确认标记，当前页面不执行确认。" : "当前仍不可确认，写动作关闭。",
    },
  ];
}

export function adaptReadonlyFinanceExceptionsToRows(
  response: DaochongReadonlyFinanceEvidenceExceptionResponse | null | undefined,
  fallbackRows: DaochongMoneyRow[],
): DaochongMoneyRow[] {
  const records = getFinanceEvidenceExceptionRecords(response);
  if (records.length === 0) return fallbackRows;

  return records.slice(0, 6).map((record) => {
    const status = financeExceptionStatusDisplay(record.exceptionStatus);
    const owner = userDisplayName(record.currentOwner);
    return {
      label: compactText([financeBusinessTypeDisplay(record.businessType), record.businessId]) || record.id || "财务异常",
      note:
        compactText([
          record.exceptionReason,
          owner ? `当前处理 ${owner}` : null,
          record.supplementRequirements ? `要求 ${record.supplementRequirements}` : null,
          record.summaryMonth ? `月份 ${record.summaryMonth}` : null,
        ]) || "凭证异常只读记录",
      value: status.status,
    };
  });
}

export function adaptReadonlyBonusExpenseItemsToRows(
  response: DaochongReadonlyBonusExpenseItemResponse | null | undefined,
  fallbackRows: DaochongMoneyRow[],
): DaochongMoneyRow[] {
  const records = getBonusExpenseItemRecords(response);
  if (records.length === 0) return fallbackRows;

  return records.slice(0, 6).map((record) => {
    const status = bonusExpenseFinanceStatusDisplay(record.financeStatus);
    const target = userDisplayName(record.targetUser) ?? record.customer?.name;
    return {
      label: compactText([bonusExpenseTypeDisplay(record.itemType), target]) || record.id || "奖金报销",
      note:
        compactText([
          record.reason,
          userDisplayName(record.submittedBy) ? `提交 ${userDisplayName(record.submittedBy)}` : null,
          record.evidenceAssetIds?.length ? `凭证 ${record.evidenceAssetIds.length}` : null,
          record.returnReason ? `退回 ${record.returnReason}` : null,
        ]) || "奖金报销只读记录",
      value: status.status === "已入汇总" ? formatMoney(record.amount) : status.status,
    };
  });
}

export function adaptReadonlyFinanceToStatuses(
  summaryResponse: DaochongReadonlyFinanceSummaryResponse | null | undefined,
  exceptionResponse: DaochongReadonlyFinanceEvidenceExceptionResponse | null | undefined,
  bonusExpenseResponse: DaochongReadonlyBonusExpenseItemResponse | null | undefined,
  fallbackStatuses: DaochongStatusItem[],
): DaochongStatusItem[] {
  const summaries = getFinanceSummaryRecords(summaryResponse);
  const exceptions = getFinanceEvidenceExceptionRecords(exceptionResponse);
  const bonusItems = getBonusExpenseItemRecords(bonusExpenseResponse);
  if (summaries.length === 0 && exceptions.length === 0 && bonusItems.length === 0) return fallbackStatuses;

  const latestSummary = latestByUpdatedAt(summaries);
  const pendingExceptions = exceptions.filter((record) => record.exceptionStatus === "PENDING_SUPPLEMENT").length;
  const pendingBonusItems = bonusItems.filter((record) => ["PENDING_EVIDENCE", "PENDING_FINANCE_REVIEW", "RETURNED"].includes(record.financeStatus ?? "")).length;
  const status = financeStatusDisplay(latestSummary?.financeStatus);

  return [
    {
      title: "finance-summary GET",
      note: "已接 DaochongFinanceSummary 只读来源；不执行财务确认或工资生成",
      status: summaries.length > 0 ? `${summaries.length} 条` : "空数据",
      tone: summaries.length > 0 ? "green" : "amber",
    },
    {
      title: "凭证异常",
      note: "只读统计 DaochongFinanceEvidenceException，不退回、不补传",
      status: pendingExceptions > 0 ? `${pendingExceptions} 条待补` : `${exceptions.length} 条`,
      tone: pendingExceptions > 0 ? "rose" : exceptions.length > 0 ? "blue" : "green",
    },
    {
      title: "奖金报销",
      note: "只读统计 DaochongBonusExpenseItem，不纳入最终工资",
      status: pendingBonusItems > 0 ? `${pendingBonusItems} 条待处理` : `${bonusItems.length} 条`,
      tone: pendingBonusItems > 0 ? "amber" : bonusItems.length > 0 ? "green" : "neutral",
    },
    {
      title: "最终确认",
      note: "当前页面只展示 financeStatus / payrollPreviewStatus，确认动作仍关闭",
      status: latestSummary ? status.status : "未生成",
      tone: latestSummary ? status.tone : "neutral",
    },
  ];
}

export function adaptReadonlyFinanceToTimeline(
  summaryResponse: DaochongReadonlyFinanceSummaryResponse | null | undefined,
  exceptionResponse: DaochongReadonlyFinanceEvidenceExceptionResponse | null | undefined,
  bonusExpenseResponse: DaochongReadonlyBonusExpenseItemResponse | null | undefined,
  fallbackTimeline: DaochongTimelineItem[],
): DaochongTimelineItem[] {
  const summaries = getFinanceSummaryRecords(summaryResponse);
  const exceptions = getFinanceEvidenceExceptionRecords(exceptionResponse);
  const bonusItems = getBonusExpenseItemRecords(bonusExpenseResponse);
  if (summaries.length === 0 && exceptions.length === 0 && bonusItems.length === 0) return fallbackTimeline;

  const entries: Array<DaochongTimelineItem & { sortAt?: string | null }> = [];
  for (const record of summaries) {
    const status = financeStatusDisplay(record.financeStatus);
    entries.push({
      title: `${record.summaryMonth ?? "未标注月份"}财务草稿`,
      note: compactText([
        `耗卡 ${formatMoney(record.approvedConsumeAmount)}`,
        `充值 ${formatMoney(record.confirmedRechargeAmount)}`,
        payrollPreviewStatusDisplay(record.payrollPreviewStatus),
      ]),
      meta: status.status,
      sortAt: record.updatedAt ?? record.createdAt,
      tone: status.tone,
    });
  }
  for (const record of exceptions) {
    const status = financeExceptionStatusDisplay(record.exceptionStatus);
    entries.push({
      title: `异常 ${financeBusinessTypeDisplay(record.businessType)}`,
      note: compactText([record.exceptionReason, record.businessId, record.supplementRequirements]),
      meta: status.status,
      sortAt: record.updatedAt ?? record.createdAt,
      tone: status.tone,
    });
  }
  for (const record of bonusItems) {
    const status = bonusExpenseFinanceStatusDisplay(record.financeStatus);
    entries.push({
      title: bonusExpenseTypeDisplay(record.itemType),
      note: compactText([record.reason, `金额 ${formatMoney(record.amount)}`, record.summaryMonth]),
      meta: status.status,
      sortAt: record.updatedAt ?? record.createdAt,
      tone: status.tone,
    });
  }

  return entries
    .sort((a, b) => sortDateValue(b.sortAt) - sortDateValue(a.sortAt))
    .slice(0, 6)
    .map((entry) => ({
      meta: entry.meta,
      note: entry.note,
      title: entry.title,
      tone: entry.tone,
    }));
}

function diagnosticTone(status: DaochongReadonlyResourceStatus): DaochongStatusItem["tone"] {
  if (status === "success") return "green";
  if (status === "loading") return "blue";
  if (status === "disabled" || status === "fallback" || status === "empty") return "amber";
  return "rose";
}

function diagnosticLabel(status: DaochongReadonlyResourceStatus) {
  const labels: Record<DaochongReadonlyResourceStatus, string> = {
    disabled: "关闭",
    loading: "加载",
    success: "成功",
    empty: "空数据",
    forbidden: "无权限",
    error: "失败",
    fallback: "回退",
  };
  return labels[status];
}

function buildDiagnosticItem(
  title: string,
  fallbackNote: string,
  input: DaochongReadonlyResourceDiagnosticInput,
): DaochongStatusItem {
  return {
    title,
    note: input.note ?? fallbackNote,
    status: diagnosticLabel(input.status),
    tone: diagnosticTone(input.status),
  };
}

export function buildReadonlyDiagnostics(
  input: DaochongReadonlyDiagnosticsInput = {},
): DaochongStatusItem[] {
  return [
    buildDiagnosticItem("预约只读请求", "真实预约候选请求未开启，当前显示 mock 预约", input.appointments ?? { status: "fallback" }),
    buildDiagnosticItem("预约详情只读请求", "真实预约详情请求未开启，当前显示 mock 预约详情", input.appointmentDetail ?? { status: "fallback" }),
    buildDiagnosticItem("项目只读请求", "真实项目请求未开启，当前显示 mock 项目", input.projects ?? { status: "fallback" }),
    buildDiagnosticItem("班表只读请求", "真实班表请求未开启，当前显示 mock 班表", input.roster ?? { status: "fallback" }),
    buildDiagnosticItem("客户只读请求", "真实客户请求未开启，当前显示 mock 客户", input.customers ?? { status: "fallback" }),
    buildDiagnosticItem("客户卡项余额只读请求", "正式 customer-card-balances 请求未开启，当前显示卡项余额缺口", input.customerCardBalances ?? { status: "fallback" }),
    buildDiagnosticItem("服务纪要只读请求", "正式 service-notes 请求未开启，当前显示候选纪要", input.serviceNotes ?? { status: "fallback" }),
    buildDiagnosticItem("企微提醒 dry-run 只读请求", "正式 wecom-reminder-dry-runs 请求未开启，当前显示 mock 提醒预览", input.wecomReminderDryRuns ?? { status: "fallback" }),
    buildDiagnosticItem("客户偏好只读请求", "正式 customer-preferences 请求未开启，当前显示候选偏好", input.customerPreferences ?? { status: "fallback" }),
    buildDiagnosticItem("客户充值只读请求", "正式 recharges 请求未开启，当前显示 mock 充值", input.recharges ?? { status: "fallback" }),
    buildDiagnosticItem("结算草稿只读请求", "正式 settlement-drafts 请求未开启，当前显示 mock 草稿", input.settlementDrafts ?? { status: "fallback" }),
    buildDiagnosticItem("耗卡审批只读请求", "正式 consumption-approvals 请求未开启，当前显示 mock 审批", input.consumptionApprovals ?? { status: "fallback" }),
    buildDiagnosticItem("凭证附件只读请求", "正式 evidence-assets 请求未开启，当前显示 mock 凭证", input.evidenceAssets ?? { status: "fallback" }),
    buildDiagnosticItem("薪酬配置只读请求", "正式 compensation-rules 请求未开启，当前显示 mock 薪酬配置", input.compensationRules ?? { status: "fallback" }),
    buildDiagnosticItem("财务汇总只读请求", "正式 finance-summary 请求未开启，当前显示 mock 财务", input.financeSummary ?? { status: "fallback" }),
    buildDiagnosticItem(
      "财务异常只读请求",
      "正式 finance-evidence-exceptions 请求未开启，当前显示 mock 异常",
      input.financeEvidenceExceptions ?? { status: "fallback" },
    ),
    buildDiagnosticItem("奖金报销只读请求", "正式 bonus-expense-items 请求未开启，当前显示 mock 奖金报销", input.bonusExpenseItems ?? { status: "fallback" }),
    buildDiagnosticItem("项目沟通只读请求", "正式 project-communications 请求未开启，当前显示 mock 沟通", input.projectCommunications ?? { status: "fallback" }),
    buildDiagnosticItem("会议纪要只读请求", "正式 meeting-notes 请求未开启，当前显示 mock 会议", input.meetingNotes ?? { status: "fallback" }),
  ];
}

export function buildReadonlyApiSnapshot(
  baseSnapshot: DaochongMobileSnapshot,
  input: DaochongReadonlyAdapterInput = {},
  diagnostics?: DaochongReadonlyDiagnosticsInput,
): DaochongMobileSnapshot {
  const appointments = adaptReadonlyTasksToAppointments(input.appointmentTaskResponse, baseSnapshot.appointments);
  const projectRows = adaptReadonlyProductsToProjectRows(input.projectRecords, baseSnapshot.projectRows);
  const todayRosterStatuses = adaptReadonlyRosterToTodayStatuses(input.rosterResponse, baseSnapshot.todayRosterStatuses);
  const customers = adaptReadonlyCustomersToCustomers(input.customerListResponse, baseSnapshot.customers);
  const evidenceFields = adaptReadonlyEvidenceAssetsToFields(input.evidenceAssetResponse, baseSnapshot.evidenceFields);
  const evidenceRows = adaptReadonlyEvidenceAssetsToRows(input.evidenceAssetResponse, baseSnapshot.evidenceRows);
  const evidenceStatuses = adaptReadonlyEvidenceAssetsToStatuses(input.evidenceAssetResponse, baseSnapshot.evidenceStatuses);
  const evidenceTimeline = adaptReadonlyEvidenceAssetsToTimeline(input.evidenceAssetResponse, baseSnapshot.evidenceTimeline);
  const rechargeFields = adaptReadonlyRechargesToFields(input.rechargeResponse, baseSnapshot.rechargeFields);
  const rechargeRows = adaptReadonlyRechargesToRows(input.rechargeResponse, baseSnapshot.rechargeRows);
  const rechargeStatuses = adaptReadonlyRechargesToStatuses(input.rechargeResponse, baseSnapshot.rechargeStatuses);
  const settlementDraftFields = adaptReadonlySettlementDraftsToFields(input.settlementDraftResponse, baseSnapshot.settlementDraftFields);
  const settlementDraftRows = adaptReadonlySettlementDraftsToRows(input.settlementDraftResponse, baseSnapshot.settlementDraftRows);
  const settlementStatuses = adaptReadonlySettlementDraftsToStatuses(input.settlementDraftResponse, baseSnapshot.settlementStatuses);
  const approvalDetailFields = adaptReadonlyConsumptionApprovalsToFields(input.consumptionApprovalResponse, baseSnapshot.approvalDetailFields);
  const approvalRows = adaptReadonlyConsumptionApprovalsToRows(input.consumptionApprovalResponse, baseSnapshot.approvalRows);
  const approvalStatuses = adaptReadonlyConsumptionApprovalsToStatuses(input.consumptionApprovalResponse, baseSnapshot.approvalStatuses);
  const approvalTimeline = adaptReadonlyConsumptionApprovalsToTimeline(input.consumptionApprovalResponse, baseSnapshot.approvalTimeline);
  const financeRows = adaptReadonlyFinanceSummariesToRows(input.financeSummaryResponse, baseSnapshot.financeRows);
  const financeDraftFields = adaptReadonlyFinanceSummariesToDraftFields(input.financeSummaryResponse, baseSnapshot.financeDraftFields);
  const financeExceptionRows = adaptReadonlyFinanceExceptionsToRows(input.financeEvidenceExceptionResponse, baseSnapshot.financeExceptionRows);
  const financeBonusExpenseRows = adaptReadonlyBonusExpenseItemsToRows(input.bonusExpenseItemResponse, baseSnapshot.financeBonusExpenseRows);
  const compensationRows = adaptReadonlyCompensationRulesToRows(input.compensationRuleResponse, baseSnapshot.compensationRows);
  const compensationFormFields = adaptReadonlyCompensationRulesToFields(input.compensationRuleResponse, baseSnapshot.compensationFormFields);
  const compensationStatuses = adaptReadonlyCompensationRulesToStatuses(input.compensationRuleResponse, baseSnapshot.compensationStatuses);
  const financeStatuses = adaptReadonlyFinanceToStatuses(
    input.financeSummaryResponse,
    input.financeEvidenceExceptionResponse,
    input.bonusExpenseItemResponse,
    baseSnapshot.financeStatuses,
  );
  const financeTimeline = adaptReadonlyFinanceToTimeline(
    input.financeSummaryResponse,
    input.financeEvidenceExceptionResponse,
    input.bonusExpenseItemResponse,
    baseSnapshot.financeTimeline,
  );
  const communicationFields = adaptReadonlyProjectCommunicationsToFields(input.projectCommunicationResponse, baseSnapshot.communicationFields);
  const communicationRows = adaptReadonlyProjectCommunicationsToRows(input.projectCommunicationResponse, baseSnapshot.communicationRows);
  const communicationStatuses = adaptReadonlyProjectCommunicationsToStatuses(input.projectCommunicationResponse, baseSnapshot.communicationStatuses);
  const communicationTimeline = adaptReadonlyProjectCommunicationsToTimeline(input.projectCommunicationResponse, baseSnapshot.communicationTimeline);
  const meetingNoteFields = adaptReadonlyMeetingNotesToFields(input.meetingNoteResponse, baseSnapshot.meetingNoteFields);
  const meetingTodoRows = adaptReadonlyMeetingNotesToTodoRows(input.meetingNoteResponse, baseSnapshot.meetingTodoRows);
  const meetingNoteStatuses = adaptReadonlyMeetingNotesToStatuses(input.meetingNoteResponse, baseSnapshot.meetingNoteStatuses);
  const dataSourceDiagnostics = buildReadonlyDiagnostics(
    diagnostics ?? {
      appointments: input.appointmentTaskResponse
        ? {
            status: getTaskRecords(input.appointmentTaskResponse).length > 0 ? "success" : "empty",
            note: "已按 /tasks 分页字段映射预约候选",
          }
        : { status: "fallback", note: "尚未请求真实 /tasks，当前回退 mock 预约" },
      projects: input.projectRecords
        ? { status: input.projectRecords.length > 0 ? "success" : "empty", note: "已按 /products 字段映射服务项目" }
        : { status: "fallback", note: "尚未请求真实 /products，当前回退 mock 项目" },
      roster: input.rosterResponse
        ? { status: "success", note: "已按 /settings/shift-roster 映射道冲班表" }
        : { status: "fallback", note: "尚未请求真实班表，当前回退 mock 班表" },
      customers: input.customerListResponse
        ? {
            status: getCustomerRecords(input.customerListResponse).length > 0 ? "success" : "empty",
            note: "已按 /customers 分页字段映射客户列表",
          }
        : { status: "fallback", note: "尚未请求真实 /customers，当前回退 mock 客户" },
      customerCardBalances: input.customerCardBalanceResponse
        ? {
            status: getCustomerCardBalanceRecords(input.customerCardBalanceResponse).length > 0 ? "success" : "empty",
            note: "已按 customer-card-balances 字段映射客户卡项余额预览",
          }
        : { status: "fallback", note: "尚未请求真实 customer-card-balances，当前回退卡项余额缺口" },
      wecomReminderDryRuns: input.wecomReminderDryRunResponse
        ? {
            status: getWecomReminderDryRunRecords(input.wecomReminderDryRunResponse).length > 0 ? "success" : "empty",
            note: "已按 wecom-reminder-dry-runs 字段映射 12 小时提醒 dry-run",
          }
        : { status: "fallback", note: "尚未请求真实 wecom-reminder-dry-runs，当前回退 mock 提醒预览" },
      evidenceAssets: input.evidenceAssetResponse
        ? {
            status: getEvidenceAssetRecords(input.evidenceAssetResponse).length > 0 ? "success" : "empty",
            note: "已按 evidence-assets 字段映射凭证附件",
          }
        : { status: "fallback", note: "尚未请求真实 evidence-assets，当前回退 mock 凭证" },
      recharges: input.rechargeResponse
        ? {
            status: getRechargeRecords(input.rechargeResponse).length > 0 ? "success" : "empty",
            note: "已按 recharges 字段映射客户充值",
          }
        : { status: "fallback", note: "尚未请求真实 recharges，当前回退 mock 充值" },
      settlementDrafts: input.settlementDraftResponse
        ? {
            status: getSettlementDraftRecords(input.settlementDraftResponse).length > 0 ? "success" : "empty",
            note: "已按 settlement-drafts 字段映射结算草稿",
          }
        : { status: "fallback", note: "尚未请求真实 settlement-drafts，当前回退 mock 草稿" },
      consumptionApprovals: input.consumptionApprovalResponse
        ? {
            status: getConsumptionApprovalRecords(input.consumptionApprovalResponse).length > 0 ? "success" : "empty",
            note: "已按 consumption-approvals 字段映射耗卡审批",
          }
        : { status: "fallback", note: "尚未请求真实 consumption-approvals，当前回退 mock 审批" },
      financeSummary: input.financeSummaryResponse
        ? {
            status: getFinanceSummaryRecords(input.financeSummaryResponse).length > 0 ? "success" : "empty",
            note: "已按 finance-summary 字段映射财务汇总",
          }
        : { status: "fallback", note: "尚未请求真实 finance-summary，当前回退 mock 财务" },
      financeEvidenceExceptions: input.financeEvidenceExceptionResponse
        ? {
            status: getFinanceEvidenceExceptionRecords(input.financeEvidenceExceptionResponse).length > 0 ? "success" : "empty",
            note: "已按 finance-evidence-exceptions 字段映射财务异常",
          }
        : { status: "fallback", note: "尚未请求真实 finance-evidence-exceptions，当前回退 mock 异常" },
      bonusExpenseItems: input.bonusExpenseItemResponse
        ? {
            status: getBonusExpenseItemRecords(input.bonusExpenseItemResponse).length > 0 ? "success" : "empty",
            note: "已按 bonus-expense-items 字段映射奖金报销",
          }
        : { status: "fallback", note: "尚未请求真实 bonus-expense-items，当前回退 mock 奖金报销" },
      compensationRules: input.compensationRuleResponse
        ? {
            status: getCompensationRuleRecords(input.compensationRuleResponse).length > 0 ? "success" : "empty",
            note: "已按 compensation-rules 字段映射薪酬配置；不从薪资单反推",
          }
        : { status: "fallback", note: "尚未请求真实 compensation-rules，当前回退 mock 薪酬配置" },
      meetingNotes: input.meetingNoteResponse
        ? {
            status: getMeetingNoteRecords(input.meetingNoteResponse).length > 0 ? "success" : "empty",
            note: "已按 meeting-notes 字段映射会议纪要",
          }
        : { status: "fallback", note: "尚未请求真实 meeting-notes，当前回退 mock 会议" },
      projectCommunications: input.projectCommunicationResponse
        ? {
            status: getProjectCommunicationRecords(input.projectCommunicationResponse).length > 0 ? "success" : "empty",
            note: "已按 project-communications 字段映射项目沟通",
          }
        : { status: "fallback", note: "尚未请求真实 project-communications，当前回退 mock 沟通" },
    },
  );

  return {
    ...baseSnapshot,
    appointments,
    appointmentDetailFields: baseSnapshot.appointmentDetailFields,
    appointmentDetailStatuses: baseSnapshot.appointmentDetailStatuses,
    approvalDetailFields,
    approvalRows,
    approvalStatuses,
    approvalTimeline,
    communicationFields,
    communicationRows,
    communicationStatuses,
    communicationTimeline,
    compensationFormFields,
    compensationRows,
    compensationStatuses,
    dataSourceDiagnostics,
    customers,
    evidenceFields,
    evidenceRows,
    evidenceStatuses,
    evidenceTimeline,
    financeBonusExpenseRows,
    financeDraftFields,
    financeExceptionRows,
    financeRows,
    financeStatuses,
    financeTimeline,
    meetingNoteFields,
    meetingNoteStatuses,
    meetingTodoRows,
    projectRows,
    rechargeFields,
    rechargeRows,
    rechargeStatuses,
    settlementDraftFields,
    settlementDraftRows,
    settlementStatuses,
    todayRosterStatuses,
  };
}
