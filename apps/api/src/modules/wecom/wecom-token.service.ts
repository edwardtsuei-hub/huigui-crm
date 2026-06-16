import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { resolveWecomAppConfig } from "./wecom-app-config";

type WecomTokenResponse = {
  errcode: number;
  errmsg: string;
  access_token?: string;
  expires_in?: number;
};

type CachedToken = {
  value: string;
  expiresAt: number;
};

@Injectable()
export class WecomTokenService {
  private cache = new Map<string, CachedToken>();

  constructor(private readonly configService: ConfigService) {}

  async getAccessToken(forceRefresh = false, origin?: string) {
    const appConfig = resolveWecomAppConfig(this.configService, origin);
    const cacheKey = appConfig.appKey;
    const cached = this.cache.get(cacheKey);

    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    return this.refreshAccessToken(origin);
  }

  private async refreshAccessToken(origin?: string) {
    const appConfig = resolveWecomAppConfig(this.configService, origin);
    const { corpId, secret } = appConfig;

    if (!corpId || !secret) {
      throw new ServiceUnavailableException("企业微信接入尚未配置完整");
    }

    const url = new URL(`${this.getBaseUrl()}/cgi-bin/gettoken`);
    url.searchParams.set("corpid", corpId);
    url.searchParams.set("corpsecret", secret);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new BadGatewayException(`企业微信 token 接口请求失败: ${response.status}`);
    }

    const payload = (await response.json()) as WecomTokenResponse;
    if (payload.errcode !== 0 || !payload.access_token || !payload.expires_in) {
      throw new BadGatewayException(
        `企业微信 token 获取失败: ${payload.errmsg} (${payload.errcode})`
      );
    }

    const expiresInSeconds = Math.max(payload.expires_in - 300, 60);
    this.cache.set(appConfig.appKey, {
      value: payload.access_token,
      expiresAt: Date.now() + expiresInSeconds * 1000
    });

    return payload.access_token;
  }

  private getBaseUrl() {
    return (
      this.configService.get<string>("WECOM_BASE_URL")?.replace(/\/$/, "") ??
      "https://qyapi.weixin.qq.com"
    );
  }
}
