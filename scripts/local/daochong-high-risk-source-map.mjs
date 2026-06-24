#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCHEMA_PATH = "prisma/schema.prisma";
const API_SRC_DIR = "apps/api/src";

const SOURCE_MAP = [
  {
    id: "DCM-105",
    endpoint: "recharges",
    path: "/api/daochong/mobile/recharges",
    page: "客户充值",
    candidateModels: ["Customer", "PaymentRecord", "FileRecord", "FinanceAccount", "AuditLog"],
    missingModels: ["DaochongCustomerRecharge"],
    reusableFields: ["Customer.id", "PaymentRecord.amount", "PaymentRecord.paymentMethod", "FileRecord.businessType", "FileRecord.businessId"],
    missingFields: ["cashPhotoIds", "cashAmount", "cashCustodian", "chengchengApprovalStatus", "limengReviewStatus", "returnReason"],
    conclusion: "partial_source_available",
  },
  {
    id: "DCM-105",
    endpoint: "evidenceAssets",
    path: "/api/daochong/mobile/evidence-assets",
    page: "凭证详情",
    candidateModels: ["FileRecord", "FileFolder", "AuditLog"],
    missingModels: [],
    reusableFields: ["FileRecord.fileUrl", "FileRecord.businessType", "FileRecord.businessId", "FileRecord.permissionScope", "FileRecord.status", "FileRecord.uploaderUserId"],
    missingFields: ["thumbnailUrl", "reviewStatus", "lockedAt", "returnReason", "visibleRoles"],
    conclusion: "strong_source_with_review_gap",
  },
  {
    id: "DCM-106",
    endpoint: "settlementDrafts",
    path: "/api/daochong/mobile/settlement-drafts",
    page: "服务结算",
    candidateModels: ["Task", "Quotation", "SalesOrder", "ChannelSettlement", "PaymentRecord", "SalarySlip"],
    missingModels: ["DaochongServiceSettlementDraft"],
    reusableFields: ["Task.customerId", "Quotation.totalOriginalAmount", "PaymentRecord.amount", "SalarySlip.settlementId"],
    missingFields: ["appointmentId", "cardId", "consumeAmount", "validationStatus", "canSubmitApproval", "referralBonusAmount"],
    conclusion: "new_model_required",
  },
  {
    id: "DCM-106",
    endpoint: "consumptionApprovals",
    path: "/api/daochong/mobile/consumption-approvals",
    page: "耗卡审批",
    candidateModels: ["ApprovalRequest", "ApprovalRule", "AuditLog", "FileRecord"],
    missingModels: ["DaochongCardConsumptionApproval"],
    reusableFields: ["ApprovalRequest.targetType", "ApprovalRequest.targetId", "ApprovalRequest.status", "ApprovalRequest.payloadJson", "ApprovalRequest.decisionRemark"],
    missingFields: ["settlementDraftId", "cardId", "consumeAmount", "approvedBy", "approvedAt", "supplementRequirements"],
    conclusion: "generic_approval_reusable_but_domain_model_required",
  },
  {
    id: "DCM-107",
    endpoint: "financeSummary",
    path: "/api/daochong/mobile/finance-summary",
    page: "财务汇总",
    candidateModels: ["PaymentRecord", "ChannelSettlement", "SalarySlip", "PayrollDraftBatch", "FinanceAccount"],
    missingModels: ["DaochongFinanceSummary"],
    reusableFields: ["PaymentRecord.amount", "ChannelSettlement.totalPaidAmount", "SalarySlip.grossAmount", "PayrollDraftBatch.drafts"],
    missingFields: ["confirmedRechargeAmount", "pendingCashCustodyAmount", "approvedConsumeAmount", "exceptionCount", "payrollPreviewStatus", "canConfirmFinance"],
    conclusion: "aggregate_model_required",
  },
  {
    id: "DCM-107",
    endpoint: "financeEvidenceExceptions",
    path: "/api/daochong/mobile/finance-evidence-exceptions",
    page: "财务异常",
    candidateModels: ["FileRecord", "AuditLog"],
    missingModels: ["DaochongFinanceEvidenceException"],
    reusableFields: ["FileRecord.businessType", "FileRecord.businessId", "FileRecord.status", "AuditLog.content"],
    missingFields: ["exceptionReason", "currentOwner", "returnTarget", "exceptionStatus", "closedAt"],
    conclusion: "new_model_required",
  },
  {
    id: "DCM-107",
    endpoint: "bonusExpenseItems",
    path: "/api/daochong/mobile/bonus-expense-items",
    page: "报销和团队奖金",
    candidateModels: ["SalarySlip", "PayrollDraftBatch", "FileRecord", "AuditLog"],
    missingModels: ["DaochongBonusExpenseItem"],
    reusableFields: ["SalarySlip.deductionItems", "PayrollDraftBatch.drafts", "FileRecord.businessType", "FileRecord.businessId"],
    missingFields: ["itemType", "targetUserId", "amount", "reason", "financeStatus", "summaryMonth"],
    conclusion: "new_model_required",
  },
  {
    id: "DCM-108",
    endpoint: "projectCommunications",
    path: "/api/daochong/mobile/project-communications",
    page: "项目沟通",
    candidateModels: ["Task", "CustomerFollowup", "MeetingMinutesRecord", "FileRecord"],
    missingModels: ["DaochongProjectCommunication"],
    reusableFields: ["Task.title", "Task.customerId", "CustomerFollowup.content", "MeetingMinutesRecord.recordJson"],
    missingFields: ["projectScopes", "participants", "privacyLevel", "discussionSummary", "communicationStatus"],
    conclusion: "partial_source_available",
  },
  {
    id: "DCM-108",
    endpoint: "meetingNotes",
    path: "/api/daochong/mobile/meeting-notes",
    page: "会议纪要",
    candidateModels: ["MeetingMinutesRecord", "MeetingMinutesFolderPermission", "Task", "FileRecord"],
    missingModels: [],
    reusableFields: ["MeetingMinutesRecord.title", "MeetingMinutesRecord.meetingAt", "MeetingMinutesRecord.recordJson", "Task.assigneeUserId", "FileRecord.businessId"],
    missingFields: ["communicationId", "todoItems", "ownerUserIds", "relatedCustomerIds", "attachmentIds", "archiveStatus"],
    conclusion: "strong_source_with_mapping_gap",
  },
];

function readText(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function listFiles(dir) {
  const fullDir = path.join(ROOT, dir);
  if (!existsSync(fullDir)) {
    return [];
  }

  return readdirSync(fullDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(ROOT, path.join(entry.parentPath ?? fullDir, entry.name)).replaceAll("\\", "/"))
    .filter((file) => file.endsWith(".ts"));
}

function modelNames(schema) {
  return Array.from(schema.matchAll(/^model\s+([A-Za-z0-9_]+)/gm)).map((match) => match[1]);
}

function fieldExists(schema, modelName, fieldName) {
  const modelMatch = schema.match(new RegExp(`model\\s+${modelName}\\s+\\{([\\s\\S]*?)\\n\\}`, "m"));
  return Boolean(modelMatch?.[1] && new RegExp(`^\\s*${fieldName}\\b`, "m").test(modelMatch[1]));
}

function apiFileHits(files, endpoint) {
  const endpointTokens = endpoint
    .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    .split(/[-_]/)
    .filter(Boolean);
  return files.filter((file) => endpointTokens.some((token) => file.toLowerCase().includes(token)));
}

function summarizeEndpoint(entry, schema, models, apiFiles) {
  const presentCandidateModels = entry.candidateModels.filter((model) => models.includes(model));
  const absentCandidateModels = entry.candidateModels.filter((model) => !models.includes(model));
  const presentMissingModels = entry.missingModels.filter((model) => models.includes(model));
  const missingModels = entry.missingModels.filter((model) => !models.includes(model));
  const reusableFieldEvidence = entry.reusableFields.map((field) => {
    const [model, fieldName] = field.split(".");
    return {
      field,
      present: models.includes(model) && fieldExists(schema, model, fieldName),
    };
  });

  return {
    ...entry,
    sourceStatus:
      missingModels.length === 0 && reusableFieldEvidence.some((field) => field.present)
        ? "mappable_readonly"
        : presentCandidateModels.length > 0
          ? "partial_mapping"
          : "blocked_missing_source",
    presentCandidateModels,
    absentCandidateModels,
    presentMissingModels,
    missingModels,
    reusableFieldEvidence,
    matchingApiFiles: apiFileHits(apiFiles, entry.endpoint),
    writesAllowed: false,
  };
}

function main() {
  const schema = readText(SCHEMA_PATH);
  const models = modelNames(schema);
  const apiFiles = listFiles(API_SRC_DIR);
  const endpoints = SOURCE_MAP.map((entry) => summarizeEndpoint(entry, schema, models, apiFiles));
  const hasGaps = endpoints.some((entry) => entry.missingModels.length > 0 || entry.missingFields.length > 0);
  const summary = {
    status: endpoints.some((entry) => entry.sourceStatus === "blocked_missing_source")
      ? "source_map_has_blockers"
      : hasGaps
        ? "source_map_ready_with_gaps"
        : "source_map_ready",
    phase: "DCM-105-DCM-108",
    executesCommands: false,
    touchesDatabase: false,
    schemaPath: SCHEMA_PATH,
    endpoints,
    nextAllowedAction:
      "Review source mapping before implementing real high-risk readonly adapters; writes, approvals, card consumption and finance confirmation remain out of scope.",
  };

  console.log(JSON.stringify(summary, null, 2));
}

main();
