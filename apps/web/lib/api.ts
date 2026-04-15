"use client";

export const NOTIFICATIONS_CHANGED_EVENT = "huigui:notifications-changed";

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  roleCode: "SUPER_ADMIN" | "SENIOR_MANAGER" | "STAFF";
  roleName: string;
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

export function emitNotificationsChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
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
  return text.trim() || "请求失败";
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
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
