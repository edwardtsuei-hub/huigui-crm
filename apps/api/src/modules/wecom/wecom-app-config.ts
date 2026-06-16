import type { ConfigService } from "@nestjs/config";

export type WecomResolvedAppConfig = {
  appKey: string;
  appBaseUrl: string;
  corpId: string;
  agentId: string;
  secret: string;
  redirectUri: string;
};

const DEFAULT_CRM_DOMAIN = "crm.hui-health.com";
const DEFAULT_MANAGEMENT_DOMAIN = "management.hui-health.com";
const LOGIN_CALLBACK_PATH = "/login/wecom/callback";

function trim(value?: string | null) {
  return value?.trim() ?? "";
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function normalizeHost(value?: string | null) {
  const trimmed = trim(value);
  if (!trimmed) {
    return "";
  }

  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).hostname.toLowerCase();
  } catch {
    return trimmed
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .split(":")[0]
      .toLowerCase();
  }
}

function resolveHost(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return normalizeHost(url);
  }
}

function readDomainConfig(
  configService: ConfigService,
  key: string,
  defaultDomain: string
) {
  const prefix = `WECOM_${key.toUpperCase()}`;

  return {
    appKey: key,
    domain: normalizeHost(configService.get<string>(`${prefix}_DOMAIN`) ?? defaultDomain),
    agentId: trim(configService.get<string>(`${prefix}_AGENT_ID`)),
    secret: trim(configService.get<string>(`${prefix}_SECRET`))
  };
}

export function resolveWecomAppConfig(
  configService: ConfigService,
  origin?: string
): WecomResolvedAppConfig {
  const corpId = trim(configService.get<string>("WECOM_CORP_ID"));
  const appBaseUrl = trimTrailingSlash(
    trim(origin) || trim(configService.get<string>("APP_BASE_URL"))
  );
  const host = resolveHost(appBaseUrl);
  const fallback = {
    appKey: "default",
    agentId: trim(configService.get<string>("WECOM_AGENT_ID")),
    secret: trim(configService.get<string>("WECOM_SECRET"))
  };
  const candidates = [
    readDomainConfig(configService, "crm", DEFAULT_CRM_DOMAIN),
    readDomainConfig(configService, "management", DEFAULT_MANAGEMENT_DOMAIN)
  ];
  const matched = candidates.find((candidate) => candidate.domain && candidate.domain === host);
  const appKey = matched?.appKey ?? fallback.appKey;
  const agentId = matched?.agentId || fallback.agentId;
  const secret = matched?.secret || fallback.secret;
  const redirectUri = appBaseUrl ? `${appBaseUrl}${LOGIN_CALLBACK_PATH}` : "";

  return {
    appKey,
    appBaseUrl,
    corpId,
    agentId,
    secret,
    redirectUri
  };
}
