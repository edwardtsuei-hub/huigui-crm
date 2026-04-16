export const PUBLIC_ENTRY_URL =
  process.env.NEXT_PUBLIC_ENTRY_URL?.replace(/\/$/, "") ?? "https://crm.hui-health.com";

export const PUBLIC_ENTRY_HOST = PUBLIC_ENTRY_URL.replace(/^https?:\/\//, "");

export const PUBLIC_LOGIN_URL = `${PUBLIC_ENTRY_URL}/login`;
