#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!existsSync(absolutePath)) {
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function check(name, passed, details) {
  return {
    name,
    status: passed ? "pass" : "fail",
    details,
  };
}

const controller = read("apps/api/src/daochong-mobile/daochong-mobile.controller.ts");
const permissions = read("apps/api/src/daochong-mobile/daochong-mobile.permissions.ts");
const permissionsDecorator = read("apps/api/src/common/decorators/permissions.decorator.ts");
const permissionsGuard = read("apps/api/src/common/guards/permissions.guard.ts");
const managementConstants = read("apps/api/src/management/management.constants.ts");
const service = read("apps/api/src/daochong-mobile/daochong-mobile.service.ts");
const dto = read("apps/api/src/daochong-mobile/dto/daochong-mobile.dto.ts");
const mobileApp = read("apps/web/components/daochong/mobile/DaochongMobileApp.tsx");
const readonlyAdapters = read("apps/web/components/daochong/mobile/daochongMobile.readonly-adapters.ts");
const compose = read("docker-compose.yml");
const releaseScript = read("scripts/ops/daochong-mobile-narrow-release.mjs");
const packageJson = read("package.json");
const submitAcceptance = read("scripts/local/daochong-mobile-chengcheng-submit-acceptance.mjs");
const tests = read("tests/daochong-mobile-write-regression.test.ts");
const limengPermissionMigration = read("prisma/migrations/20260624184000_daochong_limeng_review_permissions/migration.sql");

const checks = [
  check(
    "controller-write-routes",
    controller.includes('@Post("service-notes")') &&
      controller.includes('@Patch("service-notes/:serviceNoteId")') &&
      controller.includes('@Post("recharges")') &&
      controller.includes('@Patch("recharges/:rechargeId/chengcheng-approval")') &&
      controller.includes('@Patch("recharges/:rechargeId/chengcheng-return")') &&
      controller.includes('@Patch("recharges/:rechargeId/limeng-review")') &&
      controller.includes('@Patch("recharges/:rechargeId/limeng-return")') &&
      controller.includes('@Post("settlement-drafts")') &&
      controller.includes('@Patch("settlement-drafts/:settlementDraftId")') &&
      controller.includes('@Post("settlement-drafts/:settlementDraftId/submit")') &&
      controller.includes('@Patch("consumption-approvals/:approvalId/approve")') &&
      controller.includes('@Patch("consumption-approvals/:approvalId/return")') &&
      controller.includes('@Post("wecom-reminders/send-test")'),
    "Controller exposes service note write, recharge create/review, settlement draft save/submit, consumption approval, and WeCom test-send routes.",
  ),
  check(
    "limeng-dedicated-permissions",
    permissions.includes("page.daochong.recharge_review") &&
      permissions.includes("action.daochong.recharge.limeng_review") &&
      permissions.includes("action.daochong.recharge.limeng_return") &&
      managementConstants.includes("DAOCHONG_MOBILE_PERMISSIONS.rechargeReviewRead") &&
      managementConstants.includes("DAOCHONG_MOBILE_PERMISSIONS.limengRechargeReview") &&
      managementConstants.includes("DAOCHONG_MOBILE_PERMISSIONS.limengRechargeReturn") &&
      managementConstants.includes("FINANCE: [") &&
      !managementConstants.match(/FINANCE:\s*\[[\s\S]*?page\.customers\.detail[\s\S]*?\]/),
    "Limeng gets dedicated Daochong recharge review permissions without broad customer-detail access.",
  ),
  check(
    "any-permission-guard",
    permissionsDecorator.includes("ANY_PERMISSIONS_KEY") &&
      permissionsDecorator.includes("AnyPermissions") &&
      permissionsGuard.includes("ANY_PERMISSIONS_KEY") &&
      permissionsGuard.includes("anyPermissions.some") &&
      permissionsGuard.includes("hasPermission(request.user, permissionCode)"),
    "Permission guard supports narrow OR-read access while preserving existing strict permission checks.",
  ),
  check(
    "controller-limeng-permission-boundary",
    controller.includes("AnyPermissions") &&
      controller.includes("DAOCHONG_MOBILE_PERMISSIONS.rechargeReviewRead") &&
      controller.includes("@Permissions(DAOCHONG_MOBILE_PERMISSIONS.limengRechargeReview)") &&
      controller.includes("@Permissions(DAOCHONG_MOBILE_PERMISSIONS.limengRechargeReturn)") &&
      controller.includes('@Patch("recharges/:rechargeId/chengcheng-approval")') &&
      controller.includes('@Permissions("page.customers.detail")'),
    "Recharge list accepts customer-detail or narrow review-read, while Limeng review/return use dedicated action permissions.",
  ),
  check(
    "limeng-permission-migration",
    limengPermissionMigration.includes("page.daochong.recharge_review") &&
      limengPermissionMigration.includes("action.daochong.recharge.limeng_review") &&
      limengPermissionMigration.includes("action.daochong.recharge.limeng_return") &&
      limengPermissionMigration.includes("`Role`.`code` IN ('SUPER_ADMIN', 'FINANCE')") &&
      limengPermissionMigration.includes("INSERT IGNORE INTO `RolePermission`"),
    "Production migration will insert the dedicated permissions and assign only SUPER_ADMIN/FINANCE.",
  ),
  check(
    "narrow-release-limeng-permission-sync",
    releaseScript.includes("apps/api/src/common/decorators/permissions.decorator.ts") &&
      releaseScript.includes("apps/api/src/common/guards/permissions.guard.ts") &&
      releaseScript.includes("apps/api/src/management/management.constants.ts") &&
      releaseScript.includes("prisma/migrations/20260624184000_daochong_limeng_review_permissions") &&
      releaseScript.includes("syncFiles"),
    "Narrow release script syncs the dedicated permission guard, catalog, and migration files.",
  ),
  check(
    "dto-write-contract",
    dto.includes("CreateDaochongServiceNoteDto") &&
      dto.includes("UpdateDaochongServiceNoteDto") &&
      dto.includes("CreateDaochongRechargeDto") &&
      dto.includes("ReturnDaochongRechargeByChengchengDto") &&
      dto.includes("ReturnDaochongRechargeByLimengDto") &&
      dto.includes("SaveDaochongSettlementDraftDto") &&
      dto.includes("ReturnDaochongConsumptionApprovalDto") &&
      dto.includes("SendDaochongWecomReminderTestDto") &&
      dto.includes("DaochongServiceNotePreferenceWriteDto"),
    "DTOs cover service-note write, recharge create/return, Limeng return, settlement draft save, consumption return, preference sync, and test-send payloads.",
  ),
  check(
    "write-switch",
    service.includes("DAOCHONG_MOBILE_WRITE_ENABLED") &&
      compose.includes("DAOCHONG_MOBILE_WRITE_ENABLED") &&
      releaseScript.includes("ENABLE_PRODUCTION_WRITES") &&
      releaseScript.includes('DAOCHONG_MOBILE_WRITE_ENABLED: ENABLE_PRODUCTION_WRITES ? "true" : "false"'),
    "Write chain is guarded by an API env switch; narrow release keeps production writes disabled unless explicitly re-enabled.",
  ),
  check(
    "wecom-allowlist",
    service.includes("DAOCHONG_WECOM_TEST_SEND_ENABLED") &&
      service.includes("DAOCHONG_WECOM_TEST_ALLOWLIST") &&
      service.includes("assertWecomTestTargetAllowed") &&
      service.includes('allowlist.includes("*")') &&
      compose.includes("DAOCHONG_WECOM_TEST_ALLOWLIST"),
    "WeCom test-send requires explicit enablement and a non-wildcard allowlist.",
  ),
  check(
    "write-chain",
    service.includes("createServiceNote(") &&
      service.includes("updateServiceNote(") &&
      service.includes("daochongServiceNote.create") &&
      service.includes("daochongServiceNote.update") &&
      service.includes("createPreferenceRows"),
    "Service note write and preference sync paths are present.",
  ),
  check(
    "recharge-create-chain",
    service.includes("createRecharge(") &&
      service.includes("daochongCustomerRecharge.create") &&
      service.includes('rechargeStatus: "PENDING_CHENGCHENG_APPROVAL"') &&
      service.includes("balanceApplied: false") &&
      service.includes("financeConfirmed: false") &&
      service.includes("wecomSent: false"),
    "Recharge create path writes only a pending Chengcheng approval and reports no balance, finance, or WeCom side effects.",
  ),
  check(
    "recharge-chengcheng-approval-chain",
    service.includes("approveRechargeByChengcheng(") &&
      service.includes("returnRechargeByChengcheng(") &&
      service.includes("ensureRechargeWriteAccess(") &&
      service.includes('rechargeStatus: "PENDING_LIMENG_REVIEW"') &&
      service.includes('rechargeStatus: "RETURNED_BY_CHENGCHENG"') &&
      service.includes("只有待程程审批的充值") &&
      service.includes("balanceApplied: false") &&
      service.includes("financeConfirmed: false") &&
      service.includes("wecomSent: false"),
    "Chengcheng approval advances only to Limeng review, return stops the recharge, and both report no balance, finance, or WeCom side effects.",
  ),
  check(
    "recharge-limeng-review-chain",
    service.includes("reviewRechargeByLimeng(") &&
      service.includes("returnRechargeByLimeng(") &&
      service.includes("ensureRechargeWriteAccess(") &&
      service.includes('rechargeStatus: "CONFIRMED"') &&
      service.includes('rechargeStatus: "RETURNED_BY_LIMENG"') &&
      service.includes("只有待立猛复核的充值") &&
      service.includes("financeSummaryMonthFor") &&
      service.includes("balanceApplied: true") &&
      service.includes("financeConfirmed: false") &&
      service.includes("wecomSent: false"),
    "Limeng review confirms only pending Limeng recharges, applies the balance marker, and still avoids payroll-final or WeCom side effects.",
  ),
  check(
    "recharge-cash-guards",
    service.includes("现金充值必须填写现金金额") &&
      service.includes("现金充值必须关联现金照片") &&
      service.includes('paymentMethod === "CASH"'),
    "Cash recharge requires a cash amount and linked cash-photo asset ids.",
  ),
  check(
    "settlement-draft-save-chain",
    service.includes("createSettlementDraft(") &&
      service.includes("updateSettlementDraft(") &&
      service.includes("buildSettlementDraftWriteData(") &&
      service.includes("daochongServiceSettlementDraft.create") &&
      service.includes("daochongServiceSettlementDraft.update") &&
      service.includes('action: "settlement_draft_saved"') &&
      service.includes("approvalCreated: false") &&
      service.includes("cardDeducted: false") &&
      service.includes("balanceApplied: false") &&
      service.includes("financeConfirmed: false") &&
      service.includes("wecomSent: false"),
    "Settlement draft save/update writes only the draft and reports no approval, card, balance, finance, or WeCom side effects.",
  ),
  check(
    "settlement-submit-chain",
    service.includes("submitSettlementDraft(") &&
      service.includes('draftStatus: "SUBMITTED_FOR_APPROVAL"') &&
      service.includes("daochongCardConsumptionApproval.create") &&
      service.includes('approvalStatus: "PENDING"') &&
      service.includes("financeSummaryMonth: null") &&
      service.includes('action: "settlement_submitted_pending_consumption_approval"') &&
      service.includes("approvalCreated: true") &&
      service.includes("cardDeducted: false") &&
      service.includes("balanceApplied: false") &&
      service.includes("financeConfirmed: false") &&
      service.includes("wecomSent: false"),
    "Settlement submit creates a pending consumption approval while keeping card deduction, balance application, finance, and WeCom disabled.",
  ),
  check(
    "consumption-approval-chain",
    service.includes("approveConsumptionApproval(") &&
      service.includes("returnConsumptionApproval(") &&
      service.includes("ensureConsumptionApprovalWriteAccess(") &&
      service.includes('approvalStatus: "APPROVED"') &&
      service.includes('approvalStatus: "RETURNED"') &&
      service.includes('draftStatus: "RETURNED"') &&
      service.includes('action: "consumption_approved_no_card_deduction"') &&
      service.includes('action: "consumption_returned_to_settlement_draft"') &&
      service.includes("cardDeducted: false") &&
      service.includes("balanceApplied: false") &&
      service.includes("financeConfirmed: false") &&
      service.includes("wecomSent: false"),
    "Consumption approval can approve or return the approval record without deducting cards, applying balance, confirming finance, or sending WeCom.",
  ),
  check(
    "frontend-write-panel",
    mobileApp.includes('data-testid="daochong-service-note-write-panel"') &&
      mobileApp.includes('data-testid="daochong-service-note-submit"') &&
      mobileApp.includes("apiFetch<DaochongServiceNoteWriteResponse>") &&
      mobileApp.includes('"/daochong/mobile/service-notes"') &&
      mobileApp.includes('method: isUpdate ? "PATCH" : "POST"'),
    "Mobile UI exposes service note create/update through the guarded API client.",
  ),
  check(
    "frontend-recharge-write-panel",
    mobileApp.includes('data-testid="daochong-recharge-write-panel"') &&
      mobileApp.includes('data-testid="daochong-recharge-submit"') &&
      mobileApp.includes("apiFetch<DaochongRechargeWriteResponse>") &&
      mobileApp.includes('"/daochong/mobile/recharges"') &&
      mobileApp.includes('method: "POST"') &&
      mobileApp.includes("fetchDaochongReadonlyHighRisk()"),
    "Mobile UI exposes recharge create through the guarded API client and refreshes readonly recharge data.",
  ),
  check(
    "frontend-recharge-chengcheng-panel",
    mobileApp.includes("daochong-recharge-chengcheng-panel") &&
      mobileApp.includes("daochong-recharge-chengcheng-approve") &&
      mobileApp.includes("daochong-recharge-chengcheng-return") &&
      mobileApp.includes("daochong-recharge-return-reason") &&
      mobileApp.includes("submitRechargeChengchengDecision") &&
      mobileApp.includes("chengcheng-approval") &&
      mobileApp.includes("chengcheng-return") &&
      mobileApp.includes('role.key === "chengcheng"') &&
      readonlyAdapters.includes("adaptReadonlyRechargesToApprovalActionItems") &&
      readonlyAdapters.includes("canChengchengApprove"),
    "Mobile UI exposes a Chengcheng-only recharge approval/return panel backed by structured readonly recharge ids.",
  ),
  check(
    "frontend-recharge-limeng-panel",
    mobileApp.includes("daochong-recharge-limeng-panel") &&
      mobileApp.includes("daochong-recharge-limeng-review") &&
      mobileApp.includes("daochong-recharge-limeng-return") &&
      mobileApp.includes("daochong-recharge-limeng-return-reason") &&
      mobileApp.includes("limeng-review") &&
      mobileApp.includes("limeng-return") &&
      mobileApp.includes('role.key === "finance"') &&
      readonlyAdapters.includes("canLimengReview") &&
      readonlyAdapters.includes('record.rechargeStatus === "PENDING_LIMENG_REVIEW"'),
    "Mobile UI exposes a finance/Limeng-only recharge review/return panel backed by structured readonly recharge ids.",
  ),
  check(
    "frontend-settlement-draft-panel",
    mobileApp.includes('data-testid="daochong-settlement-draft-write-panel"') &&
      mobileApp.includes('data-testid="daochong-settlement-draft-save"') &&
      mobileApp.includes('data-testid="daochong-settlement-draft-submit"') &&
      mobileApp.includes("apiFetch<DaochongSettlementDraftWriteResponse>") &&
      mobileApp.includes('"/daochong/mobile/settlement-drafts"') &&
      mobileApp.includes('`/daochong/mobile/settlement-drafts/${encodeURIComponent(draftId)}/submit`') &&
      mobileApp.includes('method: draftId ? "PATCH" : "POST"') &&
      mobileApp.includes("不会扣卡或入账"),
    "Mobile UI exposes settlement draft save and submit through guarded API calls and keeps no-card-deduction messaging visible.",
  ),
  check(
    "frontend-consumption-approval-panel",
    mobileApp.includes('data-testid="daochong-consumption-approval-panel"') &&
      mobileApp.includes('data-testid="daochong-consumption-approve"') &&
      mobileApp.includes('data-testid="daochong-consumption-return"') &&
      mobileApp.includes('data-testid="daochong-consumption-return-reason"') &&
      mobileApp.includes("apiFetch<DaochongConsumptionApprovalWriteResponse>") &&
      mobileApp.includes("adaptReadonlyConsumptionApprovalsToActionItems") &&
      mobileApp.includes("submitConsumptionApprovalDecision") &&
      mobileApp.includes('action === "approve" ? "approve" : "return"') &&
      mobileApp.includes("hasPermission(activeRole, \"approveConsumption\")") &&
      mobileApp.includes("不会扣卡或入账"),
    "Mobile UI exposes consumption approval approve/return through guarded API calls for approved roles only.",
  ),
  check(
    "frontend-recharge-chengcheng-submit-acceptance",
    submitAcceptance.includes("daochong-recharge-chengcheng-approve") &&
      submitAcceptance.includes("daochong-recharge-chengcheng-return") &&
      submitAcceptance.includes("Fetch.enable") &&
      submitAcceptance.includes("PENDING_LIMENG_REVIEW") &&
      submitAcceptance.includes("RETURNED_BY_CHENGCHENG") &&
      submitAcceptance.includes("touchesDatabase: false"),
    "Optional browser-level local TEST acceptance covers Chengcheng approve/return without database or production writes.",
  ),
  check(
    "frontend-readback-loop",
    mobileApp.includes("fetchDaochongReadonlyCustomerDetail(selectedCustomer.id)") &&
      mobileApp.includes("applyCustomerDetailResult(selectedCustomer, refreshed)") &&
      mobileApp.includes("getLatestServiceNoteForWrite(serviceNotes)") &&
      mobileApp.includes("DCM-00 到 DCM-176"),
    "Mobile UI refreshes readonly customer detail after a service note write and marks the current phase.",
  ),
  check(
    "wecom-send-loop",
    service.includes("sendWecomReminderTest(") &&
      service.includes("sendTextCardMessage") &&
      service.includes("target === serviceNote.teacher.wecomUserId") &&
      service.includes("markedReminded"),
    "Test send uses text cards and only marks reminded when target is the note teacher.",
  ),
  check(
    "destructive-actions-absent",
    !/deleteMany\s*\(|delete\s*\(|drop\s+table|truncate\s+table/i.test(service),
    "Daochong mobile service does not add destructive write actions.",
  ),
  check(
    "regression-tests",
    tests.includes("Daochong service note write creates the note") &&
      tests.includes("Daochong settlement draft save does not create approval or apply balance") &&
      tests.includes("Daochong settlement draft submit rejects drafts that are not ready") &&
      tests.includes("Daochong settlement draft submit creates pending consumption approval without side effects") &&
      tests.includes("Daochong no-card settlement submit uses final amount without card deduction") &&
      tests.includes("Daochong consumption approval approve does not deduct card or confirm finance") &&
      tests.includes("Daochong consumption approval return sends the draft back without finance effects") &&
      tests.includes("Daochong recharge write creates a pending Chengcheng approval") &&
      tests.includes("Daochong cash recharge requires cash amount and cash photo ids") &&
      tests.includes("Daochong Chengcheng approval moves recharge to Limeng review") &&
      tests.includes("Daochong Chengcheng return keeps recharge out of Limeng review") &&
    tests.includes("Daochong Chengcheng approval rejects recharges that already left the pending state") &&
      tests.includes("Daochong Limeng review confirms recharge and applies balance marker") &&
      tests.includes("Daochong Limeng return keeps recharge out of confirmed balance") &&
      tests.includes("Daochong Limeng review rejects non pending Limeng state") &&
      tests.includes("Daochong Limeng dedicated permissions are cataloged without granting Finance customer detail") &&
      tests.includes("Daochong Limeng routes use dedicated permissions") &&
      tests.includes("Permission guard accepts any one of the narrow read permissions") &&
      tests.includes("rejects targets outside the allowlist") &&
      tests.includes("marks reminded only when the allowlisted target is the note teacher") &&
      packageJson.includes("test:daochong-mobile-write"),
    "Regression coverage and package script are present.",
  ),
];

const failed = checks.filter((item) => item.status === "fail");
const result = {
  status: failed.length ? "fail" : "pass",
  phase: "dao-chong-recharge-limeng-real-account-permission-gate",
  executesCommands: false,
  touchesDatabase: false,
  writesFiles: false,
  checks,
  nextAllowedAction: failed.length
    ? "Fix failed write acceptance checks before production release."
    : "Wait for a separate production-release confirmation before any narrow release, real data smoke, or allowlisted WeCom test send.",
};

console.log(JSON.stringify(result, null, 2));
process.exit(failed.length ? 1 : 0);
