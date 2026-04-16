"use client";

export const NOTIFICATIONS_CHANGED_EVENT = "huigui:notifications-changed";

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

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:4000/api";

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
  const response = await fetch(buildApiUrl(API_BASE_URL, path), init);

  if (!shouldRetryWithSameOrigin(response.status)) {
    if (!shouldFallbackToLocalApi(response.status)) {
      return response;
    }
  } else {
    return fetch(buildApiUrl("/api", path), init);
  }

  return fetch(buildApiUrl(getLocalApiBaseUrl(), path), init);
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
  return window.localStorage.getItem("huigui_token");
}

export function getCurrentUser() {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem("huigui_user");
  return raw ? (JSON.parse(raw) as CurrentUser) : null;
}

export function setAuth(payload: AuthPayload) {
  const accessToken = payload.accessToken ?? payload.token;
  if (!accessToken) {
    throw new Error("登录响应缺少 access token");
  }

  window.localStorage.setItem("huigui_token", accessToken);
  window.localStorage.setItem("huigui_user", JSON.stringify(payload.user));
}

export function clearAuth() {
  window.localStorage.removeItem("huigui_token");
  window.localStorage.removeItem("huigui_user");
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
  const isFormDataBody =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetchApi(path, {
    ...init,
    headers: {
      ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
