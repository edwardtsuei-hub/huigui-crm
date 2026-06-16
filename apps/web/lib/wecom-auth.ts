"use client";

export type WecomConfig = {
  enabled: boolean;
  corpId: string;
  agentId: string;
  redirectUri?: string;
};

export type WecomLoginAction = "login" | "bind";

export const WECOM_LOGIN_CALLBACK_PATH = "/login/wecom/callback";
export const WECOM_LEGACY_LOGIN_STATE = "wecom-login";
export const WECOM_LOGIN_STATE_STORAGE_KEY = "huigui_wecom_login_state";
export const WECOM_LOGIN_ACTION_STORAGE_KEY = "huigui_wecom_login_action";

const WECOM_QR_CONNECT_URL = "https://open.work.weixin.qq.com/wwopen/sso/qrConnect";

export function createWecomLoginState() {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return `huigui${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }

  return `huigui${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

export function resolveWecomRedirectUri(configRedirectUri?: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${WECOM_LOGIN_CALLBACK_PATH}`;
  }

  if (!configRedirectUri) {
    return "";
  }

  try {
    return new URL(WECOM_LOGIN_CALLBACK_PATH, configRedirectUri).toString();
  } catch {
    return configRedirectUri;
  }
}

export function buildWecomLoginUrl(config: WecomConfig, action: WecomLoginAction) {
  const state = createWecomLoginState();
  window.sessionStorage.setItem(WECOM_LOGIN_STATE_STORAGE_KEY, state);
  window.sessionStorage.setItem(WECOM_LOGIN_ACTION_STORAGE_KEY, action);

  const redirectUri = resolveWecomRedirectUri(config.redirectUri);
  if (!redirectUri) {
    window.sessionStorage.removeItem(WECOM_LOGIN_STATE_STORAGE_KEY);
    window.sessionStorage.removeItem(WECOM_LOGIN_ACTION_STORAGE_KEY);
    throw new Error("企业微信登录回调地址不可用");
  }

  const loginUrl = new URL(WECOM_QR_CONNECT_URL);
  loginUrl.searchParams.set("appid", config.corpId);
  loginUrl.searchParams.set("agentid", config.agentId);
  loginUrl.searchParams.set("redirect_uri", redirectUri);
  loginUrl.searchParams.set("state", state);

  return loginUrl.toString();
}
