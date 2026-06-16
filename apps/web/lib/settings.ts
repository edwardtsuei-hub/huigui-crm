"use client";

import { apiFetch } from "./api";

export type SettingsUserRef = {
  id: string;
  name: string;
  roleName: string;
};

export type CompanyProfileConfig = {
  companyName: string;
  shortName: string;
  servicePhone: string;
  supportWechat: string;
  quotationValidityDays: number;
  quotationFooter: string;
};

export type NotificationPolicyConfig = {
  enableSystemNotifications: boolean;
  enableDiscussionNotifications: boolean;
  enableApprovalNotifications: boolean;
  dailyDigestEnabled: boolean;
  dailyDigestHour: number;
  dueSoonReminderHours: number;
};

export type WorkspacePreferencesConfig = {
  defaultScheduleView: "week" | "month";
  dashboardDensity: "comfortable" | "compact";
  showFirstRunGuides: boolean;
  enableTestDataTools: boolean;
};

export type SettingsSectionMeta<T> = {
  config: T;
  updatedAt?: string | null;
  updatedBy?: SettingsUserRef | null;
};

export type IntegrationStatus = {
  name: string;
  status: "ready" | "partial" | "missing";
  configuredFields: string[];
  missingFields: string[];
  note: string;
};

export type SettingsOverviewResponse = {
  companyProfile: SettingsSectionMeta<CompanyProfileConfig>;
  notificationPolicy: SettingsSectionMeta<NotificationPolicyConfig>;
  workspacePreferences: SettingsSectionMeta<WorkspacePreferencesConfig>;
  integrations: {
    wecom: IntegrationStatus;
    cos: IntegrationStatus;
  };
  runtime: {
    nodeEnv: string;
  };
};

export type SettingsOverviewDraft = {
  companyProfile: CompanyProfileConfig;
  notificationPolicy: NotificationPolicyConfig;
  workspacePreferences: WorkspacePreferencesConfig;
};

export function toSettingsDraft(data: SettingsOverviewResponse): SettingsOverviewDraft {
  return {
    companyProfile: data.companyProfile.config,
    notificationPolicy: data.notificationPolicy.config,
    workspacePreferences: data.workspacePreferences.config,
  };
}

export async function fetchSettingsOverview() {
  return apiFetch<SettingsOverviewResponse>("/settings/overview");
}

export async function updateSettingsOverview(payload: SettingsOverviewDraft) {
  return apiFetch<SettingsOverviewResponse>("/settings/overview", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
