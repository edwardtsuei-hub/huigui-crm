import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createDecipheriv, createHash } from "crypto";
import { WecomCallbackQueryDto } from "./dto/wecom.dto";
import { WecomTokenService } from "./wecom-token.service";

type WecomBaseResponse = {
  errcode: number;
  errmsg: string;
  invaliduser?: string;
  invalidparty?: string;
  invalidtag?: string;
  [key: string]: unknown;
};

type WecomRequestOptions = {
  body?: Record<string, unknown>;
  query?: Record<string, string | number | boolean | undefined>;
  requiresToken?: boolean;
};

@Injectable()
export class WecomService {
  constructor(
    private readonly configService: ConfigService,
    private readonly tokenService: WecomTokenService
  ) {}

  getClientConfig() {
    const corpId = this.configService.get<string>("WECOM_CORP_ID")?.trim() ?? "";
    const agentId = this.configService.get<string>("WECOM_AGENT_ID")?.trim() ?? "";

    return {
      enabled: Boolean(corpId && agentId),
      corpId,
      agentId
    };
  }

  async get<T extends WecomBaseResponse>(
    path: string,
    query?: Record<string, string | number | boolean | undefined>
  ) {
    return this.request<T>(path, { query, requiresToken: true });
  }

  async post<T extends WecomBaseResponse>(
    path: string,
    body: Record<string, unknown>,
    query?: Record<string, string | number | boolean | undefined>
  ) {
    return this.request<T>(path, { body, query, requiresToken: true });
  }

  verifyCallback(query: WecomCallbackQueryDto) {
    this.ensureCallbackConfig();

    if (!query.echostr) {
      throw new BadRequestException("缺少 echostr");
    }

    this.validateSignature(query.msg_signature, query.timestamp, query.nonce, query.echostr);
    return this.decrypt(query.echostr);
  }

  handleCallback(query: WecomCallbackQueryDto, rawBody: string) {
    this.ensureCallbackConfig();

    if (!rawBody) {
      return;
    }

    const encrypted = this.extractXmlValue(rawBody, "Encrypt");
    if (!encrypted) {
      return;
    }

    this.validateSignature(query.msg_signature, query.timestamp, query.nonce, encrypted);
    this.decrypt(encrypted);
  }

  private async request<T extends WecomBaseResponse>(
    path: string,
    options: WecomRequestOptions
  ) {
    this.ensureAppConfig();

    const requiresToken = options.requiresToken ?? true;
    const query = { ...(options.query ?? {}) };

    if (requiresToken) {
      query.access_token = await this.tokenService.getAccessToken();
    }

    let payload = await this.performRequest<T>(path, options.body, query);

    if (requiresToken && this.isTokenExpired(payload.errcode)) {
      query.access_token = await this.tokenService.getAccessToken(true);
      payload = await this.performRequest<T>(path, options.body, query);
    }

    if (payload.errcode !== 0) {
      throw new BadGatewayException(this.buildApiErrorMessage(payload));
    }

    return payload;
  }

  private async performRequest<T extends WecomBaseResponse>(
    path: string,
    body?: Record<string, unknown>,
    query?: Record<string, string | number | boolean | undefined>
  ) {
    const url = new URL(`${this.getBaseUrl()}${path}`);

    Object.entries(query ?? {}).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });

    const response = await fetch(url.toString(), {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new BadGatewayException(`企业微信接口请求失败: ${response.status}`);
    }

    return (await response.json()) as T;
  }

  private buildApiErrorMessage(payload: WecomBaseResponse) {
    const invalidTargets = [payload.invaliduser, payload.invalidparty, payload.invalidtag]
      .filter(Boolean)
      .join(" / ");

    return invalidTargets
      ? `企业微信接口调用失败: ${payload.errmsg} (${payload.errcode})，无效目标: ${invalidTargets}`
      : `企业微信接口调用失败: ${payload.errmsg} (${payload.errcode})`;
  }

  private validateSignature(signature: string, timestamp: string, nonce: string, value: string) {
    const token = this.configService.get<string>("WECOM_TOKEN")?.trim();

    if (!token) {
      throw new ServiceUnavailableException("企业微信回调 Token 未配置");
    }

    const expected = createHash("sha1")
      .update([token, timestamp, nonce, value].sort().join(""))
      .digest("hex");

    if (expected !== signature) {
      throw new UnauthorizedException("企业微信回调签名校验失败");
    }
  }

  private decrypt(encrypted: string) {
    const aesKey = this.getAesKey();
    const iv = aesKey.subarray(0, 16);

    const decipher = createDecipheriv("aes-256-cbc", aesKey, iv);
    decipher.setAutoPadding(false);

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64")),
      decipher.final()
    ]);
    const plainBuffer = this.pkcs7Unpad(decrypted);
    const contentBuffer = plainBuffer.subarray(16);
    const messageLength = contentBuffer.readUInt32BE(0);
    const xml = contentBuffer.subarray(4, 4 + messageLength).toString("utf8");
    const corpId = contentBuffer.subarray(4 + messageLength).toString("utf8");

    if (corpId !== this.configService.get<string>("WECOM_CORP_ID")?.trim()) {
      throw new UnauthorizedException("企业微信回调 CorpID 校验失败");
    }

    return xml;
  }

  private pkcs7Unpad(buffer: Buffer) {
    const padding = buffer[buffer.length - 1];
    if (padding < 1 || padding > 32) {
      return buffer;
    }
    return buffer.subarray(0, buffer.length - padding);
  }

  private getAesKey() {
    const raw = this.configService.get<string>("WECOM_AES_KEY")?.trim();

    if (!raw) {
      throw new ServiceUnavailableException("企业微信回调 AES Key 未配置");
    }

    return Buffer.from(`${raw}=`, "base64");
  }

  private extractXmlValue(xml: string, tag: string) {
    const cdataMatch = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]><\\/${tag}>`));
    if (cdataMatch?.[1]) {
      return cdataMatch[1];
    }

    const plainMatch = xml.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`));
    return plainMatch?.[1];
  }

  private isTokenExpired(errcode: number) {
    return [40014, 42001, 42007].includes(errcode);
  }

  private ensureAppConfig() {
    const corpId = this.configService.get<string>("WECOM_CORP_ID")?.trim();
    const agentId = this.configService.get<string>("WECOM_AGENT_ID")?.trim();
    const secret = this.configService.get<string>("WECOM_SECRET")?.trim();

    if (!corpId || !agentId || !secret) {
      throw new ServiceUnavailableException("企业微信接入尚未配置完整");
    }
  }

  private ensureCallbackConfig() {
    this.ensureAppConfig();

    if (
      !this.configService.get<string>("WECOM_TOKEN")?.trim() ||
      !this.configService.get<string>("WECOM_AES_KEY")?.trim()
    ) {
      throw new ServiceUnavailableException("企业微信回调配置尚未完成");
    }
  }

  private getBaseUrl() {
    return (
      this.configService.get<string>("WECOM_BASE_URL")?.replace(/\/$/, "") ??
      "https://qyapi.weixin.qq.com"
    );
  }
}
