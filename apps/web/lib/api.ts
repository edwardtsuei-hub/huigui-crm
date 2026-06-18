"use client";

export const NOTIFICATIONS_CHANGED_EVENT = "huigui:notifications-changed";
export const DATA_MODE_CHANGED_EVENT = "huigui:data-mode-changed";
const AUTH_EXPIRES_AT_STORAGE_KEY = "huigui_auth_expires_at";
const AUTH_LAST_LOGIN_AT_STORAGE_KEY = "huigui_auth_last_login_at";
const RECORD_SCOPE_STORAGE_KEY = "huigui-record-scope";
const TEST_BATCH_ID_STORAGE_KEY = "huigui-test-batch-id";
const TEST_BATCH_NAME_STORAGE_KEY = "huigui-test-batch-name";

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  name?: string;
  loginAccount?: string | null;
  mobile?: string | null;
  email?: string | null;
  department?: string | null;
  title?: string | null;
  managerUserId?: string | null;
  dataScope?: string | null;
  roleCode:
    | "SUPER_ADMIN"
    | "ADMIN"
    | "SALES_MANAGER"
    | "SALES"
    | "PRODUCT_SPECIALIST"
    | "FINANCE";
  roleName: string;
  permissions?: string[];
  lastLoginAt?: string | null;
  wecomUserId?: string | null;
  wecomName?: string | null;
  wecomAvatar?: string | null;
};

type AuthPayload = {
  accessToken?: string;
  token?: string;
  user: CurrentUser;
};

export type RecordDataMode = {
  scope: "REAL" | "TEST";
  testBatchId: string | null;
  testBatchName: string | null;
};

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:4000/api";

const API_FALLBACK_STATUS_CODES = new Set([404, 405, 502, 503, 504]);
const LOCAL_API_PORTS = [3001, 4000];
const AUTH_SESSION_MONTHS = 2;

function buildApiUrl(baseUrl: string, path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function shouldRetryWithSameOrigin(status: number) {
  if (typeof window === "undefined" || ![502, 503, 504].includes(status)) {
    return false;
  }

  try {
    const configuredUrl = new URL(API_BASE_URL, window.location.origin);
    return configuredUrl.origin !== window.location.origin;
  } catch {
    return false;
  }
}

export async function fetchApi(path: string, init?: RequestInit) {
  let response: Response;

  try {
    response = await fetch(buildApiUrl(API_BASE_URL, path), init);
  } catch (error) {
    return retryFetchWithFallbacks(path, init, error);
  }

  if (!shouldRetryWithSameOrigin(response.status)) {
    if (!shouldFallbackToLocalApi(response.status)) {
      return response;
    }
  } else {
    return fetch(buildApiUrl("/api", path), init);
  }

  return fetch(buildApiUrl(getLocalApiBaseUrl(), path), init);
}

async function retryFetchWithFallbacks(path: string, init: RequestInit | undefined, originalError: unknown) {
  const fallbackBaseUrls = getFallbackApiBaseUrls();

  for (const baseUrl of fallbackBaseUrls) {
    try {
      const response = await fetch(buildApiUrl(baseUrl, path), init);
      if (!API_FALLBACK_STATUS_CODES.has(response.status)) {
        return response;
      }
    } catch {
      continue;
    }
  }

  throw originalError;
}

function getFallbackApiBaseUrls() {
  if (typeof window === "undefined") {
    return [];
  }

  const candidates = new Set<string>();
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  try {
    const configuredUrl = new URL(API_BASE_URL, window.location.origin);
    if (configuredUrl.origin !== window.location.origin) {
      candidates.add("/api");
    }
  } catch {
    candidates.add("/api");
  }

  if (["localhost", "127.0.0.1"].includes(hostname)) {
    for (const port of LOCAL_API_PORTS) {
      candidates.add(`${protocol}//${hostname}:${port}/api`);
    }

    if (hostname !== "localhost") {
      for (const port of LOCAL_API_PORTS) {
        candidates.add(`${protocol}//localhost:${port}/api`);
      }
    }

    if (hostname !== "127.0.0.1") {
      for (const port of LOCAL_API_PORTS) {
        candidates.add(`${protocol}//127.0.0.1:${port}/api`);
      }
    }
  }

  candidates.delete(API_BASE_URL);

  return Array.from(candidates);
}

function shouldFallbackToLocalApi(status: number) {
  if (typeof window === "undefined" || ![404, 405, 502, 503, 504].includes(status)) {
    return false;
  }

  const hostname = window.location.hostname;
  if (!["localhost", "127.0.0.1"].includes(hostname)) {
    return false;
  }

  try {
    const configuredUrl = new URL(API_BASE_URL, window.location.origin);
    return configuredUrl.origin === window.location.origin;
  } catch {
    return false;
  }
}

function getLocalApiBaseUrl() {
  if (typeof window === "undefined") {
    return "http://127.0.0.1:3001/api";
  }

  return `${window.location.protocol}//${window.location.hostname}:3001/api`;
}

export function getToken() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!hasValidAuthSession()) {
    return null;
  }

  return window.localStorage.getItem("huigui_token");
}

export function getCurrentUser() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!hasValidAuthSession()) {
    return null;
  }

  const raw = window.localStorage.getItem("huigui_user");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CurrentUser;
  } catch {
    clearAuth();
    return null;
  }
}

export function setAuth(payload: AuthPayload) {
  const accessToken = payload.accessToken ?? payload.token;
  if (!accessToken) {
    throw new Error("登录响应缺少 access token");
  }

  const now = new Date();
  window.localStorage.setItem("huigui_token", accessToken);
  window.localStorage.setItem("huigui_user", JSON.stringify(payload.user));
  window.localStorage.setItem(AUTH_LAST_LOGIN_AT_STORAGE_KEY, now.toISOString());
  window.localStorage.setItem(
    AUTH_EXPIRES_AT_STORAGE_KEY,
    buildAuthExpiryDate(now).toISOString(),
  );
}

export function clearAuth() {
  window.localStorage.removeItem("huigui_token");
  window.localStorage.removeItem("huigui_user");
  window.localStorage.removeItem(AUTH_EXPIRES_AT_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_LAST_LOGIN_AT_STORAGE_KEY);
  window.localStorage.removeItem(RECORD_SCOPE_STORAGE_KEY);
  window.localStorage.removeItem(TEST_BATCH_ID_STORAGE_KEY);
  window.localStorage.removeItem(TEST_BATCH_NAME_STORAGE_KEY);
}

function buildAuthExpiryDate(baseDate: Date) {
  const expiresAt = new Date(baseDate);
  expiresAt.setMonth(expiresAt.getMonth() + AUTH_SESSION_MONTHS);
  return expiresAt;
}

function hasValidAuthSession() {
  if (typeof window === "undefined") {
    return false;
  }

  const token = window.localStorage.getItem("huigui_token");
  const rawUser = window.localStorage.getItem("huigui_user");
  if (!token || !rawUser) {
    return false;
  }

  const expiresAt = window.localStorage.getItem(AUTH_EXPIRES_AT_STORAGE_KEY);
  if (!expiresAt) {
    const now = new Date();
    window.localStorage.setItem(AUTH_LAST_LOGIN_AT_STORAGE_KEY, now.toISOString());
    window.localStorage.setItem(
      AUTH_EXPIRES_AT_STORAGE_KEY,
      buildAuthExpiryDate(now).toISOString(),
    );
    return true;
  }

  const expiryDate = new Date(expiresAt);
  if (Number.isNaN(expiryDate.getTime()) || expiryDate.getTime() <= Date.now()) {
    clearAuth();
    return false;
  }

  return true;
}

export function getRecordDataMode(): RecordDataMode {
  if (typeof window === "undefined") {
    return {
      scope: "REAL",
      testBatchId: null,
      testBatchName: null,
    };
  }

  const scope =
    window.localStorage.getItem(RECORD_SCOPE_STORAGE_KEY) === "TEST"
      ? "TEST"
      : "REAL";
  const testBatchId = window.localStorage.getItem(TEST_BATCH_ID_STORAGE_KEY);
  const testBatchName = window.localStorage.getItem(TEST_BATCH_NAME_STORAGE_KEY);

  if (scope === "TEST" && testBatchId) {
    return {
      scope,
      testBatchId,
      testBatchName,
    };
  }

  return {
    scope: "REAL",
    testBatchId: null,
    testBatchName: null,
  };
}

export function setRecordDataMode(mode: {
  scope: "REAL" | "TEST";
  testBatchId?: string | null;
  testBatchName?: string | null;
}) {
  if (typeof window === "undefined") {
    return;
  }

  if (mode.scope === "TEST" && mode.testBatchId) {
    window.localStorage.setItem(RECORD_SCOPE_STORAGE_KEY, "TEST");
    window.localStorage.setItem(TEST_BATCH_ID_STORAGE_KEY, mode.testBatchId);
    if (mode.testBatchName) {
      window.localStorage.setItem(TEST_BATCH_NAME_STORAGE_KEY, mode.testBatchName);
    } else {
      window.localStorage.removeItem(TEST_BATCH_NAME_STORAGE_KEY);
    }
  } else {
    window.localStorage.setItem(RECORD_SCOPE_STORAGE_KEY, "REAL");
    window.localStorage.removeItem(TEST_BATCH_ID_STORAGE_KEY);
    window.localStorage.removeItem(TEST_BATCH_NAME_STORAGE_KEY);
  }

  window.dispatchEvent(new Event(DATA_MODE_CHANGED_EVENT));
}

export function hasPermission(
  user: CurrentUser | null | undefined,
  permissionCode: string,
) {
  if (!user) {
    return false;
  }

  if (user.roleCode === "SUPER_ADMIN") {
    return true;
  }

  if (
    ["menu.finance", "page.finance.payroll", "action.payroll.publish"].includes(
      permissionCode,
    )
  ) {
    return canMaintainPayroll(user);
  }

  return user.permissions?.includes(permissionCode) ?? false;
}

export function hasAnyPermission(
  user: CurrentUser | null | undefined,
  permissionCodes: string[],
) {
  return permissionCodes.some((permissionCode) =>
    hasPermission(user, permissionCode),
  );
}

export function canMaintainPayroll(user: CurrentUser | null | undefined) {
  if (!user) {
    return false;
  }

  return ["SUPER_ADMIN", "ADMIN", "FINANCE"].includes(user.roleCode)
    || Boolean(user.permissions?.includes("action.payroll.publish"));
}

export function isExecutionSalesRole(user: CurrentUser | null | undefined) {
  return user?.roleCode === "SALES";
}

export function emitNotificationsChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

function getHttpErrorMessage(status: number) {
  switch (status) {
    case 502:
    case 503:
    case 504:
      return `服务暂时不可用（HTTP ${status}），请稍后重试或联系管理员检查后端服务。`;
    case 500:
      return "服务器处理请求时发生错误，请稍后重试。";
    default:
      return status > 0 ? `请求失败（HTTP ${status}）` : "请求失败";
  }
}

function looksLikeHtmlDocument(text: string, contentType: string) {
  if (contentType.includes("text/html")) {
    return true;
  }

  return /<!doctype html|<html[\s>]|<head[\s>]|<body[\s>]/i.test(text);
}

export async function readErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;

    if (Array.isArray(payload?.message)) {
      return payload.message.join("；");
    }

    if (typeof payload?.message === "string" && payload.message.trim()) {
      return payload.message;
    }
  }

  const text = await response.text().catch(() => "");
  const normalizedText = text.trim();

  if (!normalizedText) {
    return getHttpErrorMessage(response.status);
  }

  if (looksLikeHtmlDocument(normalizedText, contentType)) {
    return getHttpErrorMessage(response.status);
  }

  return normalizedText;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const dataMode = getRecordDataMode();
  const isFormDataBody =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetchApi(path, {
    ...init,
    headers: {
      ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "x-huigui-record-scope": dataMode.scope,
      ...(dataMode.scope === "TEST" && dataMode.testBatchId
        ? { "x-huigui-test-batch-id": dataMode.testBatchId }
        : {}),
      ...(init?.headers ?? {})
    }
  });

  if (response.status === 401) {
    clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("登录已失效");
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

export async function apiFetchBlob(path: string, init?: RequestInit) {
  const token = getToken();
  const dataMode = getRecordDataMode();
  const response = await fetchApi(path, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "x-huigui-record-scope": dataMode.scope,
      ...(dataMode.scope === "TEST" && dataMode.testBatchId
        ? { "x-huigui-test-batch-id": dataMode.testBatchId }
        : {}),
      ...(init?.headers ?? {})
    }
  });

  if (response.status === 401) {
    clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("登录已失效");
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.blob();
}
