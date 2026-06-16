export const PUBLIC_ENTRY_URL =
  process.env.NEXT_PUBLIC_ENTRY_URL?.replace(/\/$/, "") ?? "https://crm.hui-health.com";

export const PUBLIC_ENTRY_HOST = PUBLIC_ENTRY_URL.replace(/^https?:\/\//, "");

export const PUBLIC_LOGIN_URL = `${PUBLIC_ENTRY_URL}/login`;

export const MANAGEMENT_ENTRY_URL =
  process.env.NEXT_PUBLIC_MANAGEMENT_ENTRY_URL?.replace(/\/$/, "") ??
  "https://management.hui-health.com";

export const MANAGEMENT_ENTRY_HOST = MANAGEMENT_ENTRY_URL.replace(/^https?:\/\//, "");

export const PUBLIC_ENTRY_PATH = "/dashboard";

// Keep a stable entry route so the real homepage can be swapped later
// without changing every login/redirect callsite.
export const MANAGEMENT_ENTRY_PATH = "/work-management/home";

function normalizeEntryHost(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.replace(/^https?:\/\//, "").replace(/\/$/, "").split(":")[0].toLowerCase();
}

export function isManagementEntryHost(host?: string | null) {
  return normalizeEntryHost(host) === normalizeEntryHost(MANAGEMENT_ENTRY_HOST);
}

export function resolveAuthenticatedEntryPath(host?: string | null) {
  return isManagementEntryHost(host) ? MANAGEMENT_ENTRY_PATH : PUBLIC_ENTRY_PATH;
}

export function resolveDisplayedEntryHost(host?: string | null) {
  return isManagementEntryHost(host) ? MANAGEMENT_ENTRY_HOST : PUBLIC_ENTRY_HOST;
}
