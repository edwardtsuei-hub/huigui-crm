export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  name?: string;
  loginAccount?: string | null;
  department?: string | null;
  title?: string | null;
  roleCode: string;
  roleName: string;
  permissions?: string[];
  wecomUserId?: string | null;
  wecomName?: string | null;
};

type AuthPayload = {
  accessToken?: string;
  token?: string;
  user: CurrentUser;
};

const TOKEN_KEY = "huigui_token";
const USER_KEY = "huigui_user";
const AUTH_EXPIRES_AT_KEY = "huigui_auth_expires_at";
const AUTH_LAST_LOGIN_AT_KEY = "huigui_auth_last_login_at";
const AUTH_SESSION_MONTHS = 2;

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "/api";

function buildUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function buildAuthExpiryDate(baseDate: Date) {
  const expiresAt = new Date(baseDate);
  expiresAt.setMonth(expiresAt.getMonth() + AUTH_SESSION_MONTHS);
  return expiresAt;
}

export function clearAuth() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(AUTH_EXPIRES_AT_KEY);
  window.localStorage.removeItem(AUTH_LAST_LOGIN_AT_KEY);
}

export function setAuth(payload: AuthPayload) {
  const accessToken = payload.accessToken ?? payload.token;
  if (!accessToken) {
    throw new Error("登录响应缺少 access token");
  }

  const now = new Date();
  window.localStorage.setItem(TOKEN_KEY, accessToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
  window.localStorage.setItem(AUTH_LAST_LOGIN_AT_KEY, now.toISOString());
  window.localStorage.setItem(AUTH_EXPIRES_AT_KEY, buildAuthExpiryDate(now).toISOString());
}

export function hasValidAuthSession() {
  const token = window.localStorage.getItem(TOKEN_KEY);
  const rawUser = window.localStorage.getItem(USER_KEY);
  if (!token || !rawUser) {
    return false;
  }

  const rawExpiresAt = window.localStorage.getItem(AUTH_EXPIRES_AT_KEY);
  if (!rawExpiresAt) {
    const now = new Date();
    window.localStorage.setItem(AUTH_LAST_LOGIN_AT_KEY, now.toISOString());
    window.localStorage.setItem(AUTH_EXPIRES_AT_KEY, buildAuthExpiryDate(now).toISOString());
    return true;
  }

  const expiresAt = new Date(rawExpiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    clearAuth();
    return false;
  }

  return true;
}

export function getToken() {
  return hasValidAuthSession() ? window.localStorage.getItem(TOKEN_KEY) : null;
}

export function getCurrentUser() {
  if (!hasValidAuthSession()) {
    return null;
  }

  const rawUser = window.localStorage.getItem(USER_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as CurrentUser;
  } catch {
    clearAuth();
    return null;
  }
}

async function readErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
    if (Array.isArray(payload?.message)) {
      return payload.message.join("；");
    }
    if (typeof payload?.message === "string" && payload.message.trim()) {
      return payload.message;
    }
  }

  const text = await response.text().catch(() => "");
  return text.trim() || `请求失败（HTTP ${response.status}）`;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const isFormDataBody =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401) {
    clearAuth();
    throw new Error("登录已失效");
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

export function login(username: string, password: string) {
  return apiFetch<AuthPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function canMaintainPayroll(user: CurrentUser | null) {
  if (!user) {
    return false;
  }
  const roleCode = user.roleCode?.toUpperCase();
  return roleCode === "SUPER_ADMIN"
    || roleCode === "ADMIN"
    || roleCode === "FINANCE"
    || Boolean(user.permissions?.includes("action.payroll.publish"));
}
