export const CRM_RULES_SETTING_KEY = "CRM_RULES";

export type CrmExpiredVisibilityScope = "TEAM" | "DEPARTMENT" | "ALL_SALES";

export type CrmRulesConfig = {
  defaultProtectionMonths: number;
  maxProtectionMonths: number;
  expiredOwnerLabel: string;
  expiredVisibilityScope: CrmExpiredVisibilityScope;
  claimRequiresFreshFollowup: boolean;
  claimFollowupValidDays: number;
  claimRequiresApproval: boolean;
  claimApprovalRoleCode: string;
  transferRequiresApproval: boolean;
  transferResetsProtection: boolean;
  transferReasonRequired: boolean;
  allowProtectionExtension: boolean;
  extensionRequiresApproval: boolean;
  extensionApprovalRoleCode: string;
  superAdminBypassApproval: boolean;
};

export const DEFAULT_CRM_RULES: CrmRulesConfig = {
  defaultProtectionMonths: 3,
  maxProtectionMonths: 6,
  expiredOwnerLabel: "待维护",
  expiredVisibilityScope: "TEAM",
  claimRequiresFreshFollowup: true,
  claimFollowupValidDays: 7,
  claimRequiresApproval: true,
  claimApprovalRoleCode: "SALES_MANAGER",
  transferRequiresApproval: true,
  transferResetsProtection: true,
  transferReasonRequired: true,
  allowProtectionExtension: true,
  extensionRequiresApproval: true,
  extensionApprovalRoleCode: "SALES_MANAGER",
  superAdminBypassApproval: true,
};

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function normalizeCrmRulesConfig(
  raw?: Record<string, unknown> | null,
): CrmRulesConfig {
  return {
    defaultProtectionMonths: clampInteger(
      raw?.defaultProtectionMonths,
      DEFAULT_CRM_RULES.defaultProtectionMonths,
      1,
      12,
    ),
    maxProtectionMonths: clampInteger(
      raw?.maxProtectionMonths,
      DEFAULT_CRM_RULES.maxProtectionMonths,
      1,
      12,
    ),
    expiredOwnerLabel:
      typeof raw?.expiredOwnerLabel === "string" &&
      raw.expiredOwnerLabel.trim()
        ? raw.expiredOwnerLabel.trim()
        : DEFAULT_CRM_RULES.expiredOwnerLabel,
    expiredVisibilityScope:
      raw?.expiredVisibilityScope === "DEPARTMENT" ||
      raw?.expiredVisibilityScope === "ALL_SALES"
        ? raw.expiredVisibilityScope
        : DEFAULT_CRM_RULES.expiredVisibilityScope,
    claimRequiresFreshFollowup:
      typeof raw?.claimRequiresFreshFollowup === "boolean"
        ? raw.claimRequiresFreshFollowup
        : DEFAULT_CRM_RULES.claimRequiresFreshFollowup,
    claimFollowupValidDays: clampInteger(
      raw?.claimFollowupValidDays,
      DEFAULT_CRM_RULES.claimFollowupValidDays,
      1,
      90,
    ),
    claimRequiresApproval:
      typeof raw?.claimRequiresApproval === "boolean"
        ? raw.claimRequiresApproval
        : DEFAULT_CRM_RULES.claimRequiresApproval,
    claimApprovalRoleCode:
      typeof raw?.claimApprovalRoleCode === "string" &&
      raw.claimApprovalRoleCode.trim()
        ? raw.claimApprovalRoleCode.trim()
        : DEFAULT_CRM_RULES.claimApprovalRoleCode,
    transferRequiresApproval:
      typeof raw?.transferRequiresApproval === "boolean"
        ? raw.transferRequiresApproval
        : DEFAULT_CRM_RULES.transferRequiresApproval,
    transferResetsProtection:
      typeof raw?.transferResetsProtection === "boolean"
        ? raw.transferResetsProtection
        : DEFAULT_CRM_RULES.transferResetsProtection,
    transferReasonRequired:
      typeof raw?.transferReasonRequired === "boolean"
        ? raw.transferReasonRequired
        : DEFAULT_CRM_RULES.transferReasonRequired,
    allowProtectionExtension:
      typeof raw?.allowProtectionExtension === "boolean"
        ? raw.allowProtectionExtension
        : DEFAULT_CRM_RULES.allowProtectionExtension,
    extensionRequiresApproval:
      typeof raw?.extensionRequiresApproval === "boolean"
        ? raw.extensionRequiresApproval
        : DEFAULT_CRM_RULES.extensionRequiresApproval,
    extensionApprovalRoleCode:
      typeof raw?.extensionApprovalRoleCode === "string" &&
      raw.extensionApprovalRoleCode.trim()
        ? raw.extensionApprovalRoleCode.trim()
        : DEFAULT_CRM_RULES.extensionApprovalRoleCode,
    superAdminBypassApproval:
      typeof raw?.superAdminBypassApproval === "boolean"
        ? raw.superAdminBypassApproval
        : DEFAULT_CRM_RULES.superAdminBypassApproval,
  };
}
