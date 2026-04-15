import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

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
  private cache: CachedToken | null = null;

  constructor(private readonly configService: ConfigService) {}

  async getAccessToken(forceRefresh = false) {
    if (!forceRefresh && this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.value;
    }

    return this.refreshAccessToken();
  }

  private async refreshAccessToken() {
    const corpId = this.configService.get<string>("WECOM_CORP_ID")?.trim();
    const secret = this.configService.get<string>("WECOM_SECRET")?.trim();

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
    this.cache = {
      value: payload.access_token,
      expiresAt: Date.now() + expiresInSeconds * 1000
    };

    return payload.access_token;
  }

  private getBaseUrl() {
    return (
      this.configService.get<string>("WECOM_BASE_URL")?.replace(/\/$/, "") ??
      "https://qyapi.weixin.qq.com"
    );
  }
}
