import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import COS from "cos-nodejs-sdk-v5";
import { getCredential, getPolicy } from "qcloud-cos-sts";
import { CreateUploadTokenDto } from "./dto/create-upload-token.dto";

type UploadTokenPayload = {
  bucket: string;
  region: string;
  key: string;
  url: string;
  startTime: number;
  expiredTime: number;
  credentials: {
    tmpSecretId: string;
    tmpSecretKey: string;
    sessionToken: string;
  };
};

@Injectable()
export class CosStorageService {
  private cosClient: COS | null = null;

  createUploadToken(dto: CreateUploadTokenDto): Promise<UploadTokenPayload> {
    const { secretId, secretKey, bucket, region } = this.getRequiredConfig();
    const key = this.buildObjectKey(dto);

    return getCredential({
      secretId,
      secretKey,
      durationSeconds: this.getDurationSeconds(),
      policy: getPolicy([
        {
          action: [
            "name/cos:PutObject",
            "name/cos:PostObject",
            "name/cos:InitiateMultipartUpload",
            "name/cos:ListMultipartUploads",
            "name/cos:ListParts",
            "name/cos:UploadPart",
            "name/cos:CompleteMultipartUpload"
          ],
          bucket,
          region,
          prefix: key
        }
      ])
    }).then((credential) => ({
      bucket,
      region,
      key,
      url: this.buildObjectUrl(key),
      startTime: credential.startTime,
      expiredTime: credential.expiredTime,
      credentials: credential.credentials
    }));
  }

  async getObjectBufferFromUrl(imageUrl: string) {
    const objectKey = this.extractObjectKeyFromUrl(imageUrl);
    if (!objectKey) {
      return null;
    }

    const { bucket, region } = this.getRequiredConfig();
    const response = await this.getClient().getObject({
      Bucket: bucket,
      Region: region,
      Key: objectKey
    });

    return response.Body;
  }

  buildObjectUrl(key: string) {
    const { bucket, region } = this.getRequiredConfig();
    return `https://${bucket}.cos.${region}.myqcloud.com/${key}`;
  }

  private buildObjectKey(dto: CreateUploadTokenDto) {
    const prefix = (process.env.COS_UPLOAD_PREFIX ?? "uploads").replace(/^\/+|\/+$/g, "");
    const businessType = (dto.businessType ?? "general").replace(/[^a-zA-Z0-9/_-]+/g, "-");
    const extension = this.getExtension(dto.fileName);
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.random().toString(36).slice(2, 10);
    const timestamp = Date.now();

    return `${prefix}/${businessType}/${day}/${timestamp}_${random}${extension}`;
  }

  private getExtension(fileName: string) {
    const cleanName = fileName.trim();
    const match = cleanName.match(/(\.[a-zA-Z0-9]+)$/);
    return match?.[1]?.toLowerCase() ?? "";
  }

  private extractObjectKeyFromUrl(imageUrl: string) {
    try {
      const targetUrl = new URL(imageUrl);
      const { bucket, region } = this.getRequiredConfig();
      const expectedHost = `${bucket}.cos.${region}.myqcloud.com`;

      if (targetUrl.hostname !== expectedHost) {
        return null;
      }

      return decodeURIComponent(targetUrl.pathname.replace(/^\/+/, ""));
    } catch {
      return null;
    }
  }

  private getDurationSeconds() {
    const value = Number(process.env.COS_UPLOAD_DURATION_SECONDS ?? "1800");
    if (Number.isFinite(value) && value > 0) {
      return Math.min(value, 7200);
    }
    return 1800;
  }

  private getClient() {
    const { secretId, secretKey } = this.getRequiredConfig();
    if (!this.cosClient) {
      this.cosClient = new COS({
        SecretId: secretId,
        SecretKey: secretKey,
        Protocol: "https:"
      });
    }
    return this.cosClient;
  }

  private getRequiredConfig() {
    const secretId = process.env.COS_SECRET_ID?.trim();
    const secretKey = process.env.COS_SECRET_KEY?.trim();
    const bucket = process.env.COS_BUCKET?.trim();
    const region = process.env.COS_REGION?.trim();

    if (!secretId || !secretKey || !bucket || !region) {
      throw new ServiceUnavailableException("COS 配置未完成，无法上传文件");
    }

    return { secretId, secretKey, bucket, region };
  }
}
