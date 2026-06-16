import { createHash } from "node:crypto";
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

type Phase2AttachmentCosPresignInput = {
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  module?: string;
  folder?: string;
  sha256?: string;
};

type Phase2AttachmentCosPresignPayload = {
  uploadUrl: string;
  fileUrl: string;
  previewUrl: string;
  storageKey: string;
  objectKey: string;
  headers: Record<string, string>;
  expiresInSec: number;
  readExpiresInSec: number;
  storageProvider: "cos";
};

type Phase2AttachmentCosRefreshPayload = {
  fileUrl: string;
  previewUrl: string;
  storageKey: string;
  objectKey: string;
  expiresInSec: number;
  storageProvider: "cos";
};

@Injectable()
export class CosStorageService {
  private cosClient: COS | null = null;

  createPhase2AttachmentPresign(input: Phase2AttachmentCosPresignInput): Phase2AttachmentCosPresignPayload {
    const objectKey = this.buildPhase2ObjectKey(input);
    const mimeType = input.mimeType?.trim() || "application/octet-stream";
    const uploadExpiresInSec = 15 * 60;
    const readExpiresInSec = 60 * 60;
    const headers = { "Content-Type": mimeType };
    const uploadUrl = this.createSignedObjectUrl(objectKey, "PUT", uploadExpiresInSec);
    const fileUrl = this.createSignedObjectUrl(objectKey, "GET", readExpiresInSec);

    return {
      uploadUrl,
      fileUrl,
      previewUrl: fileUrl,
      storageKey: objectKey,
      objectKey,
      headers,
      expiresInSec: uploadExpiresInSec,
      readExpiresInSec,
      storageProvider: "cos"
    };
  }

  refreshPhase2AttachmentReadUrl(storageKey: string): Phase2AttachmentCosRefreshPayload {
    const objectKey = this.normalizeObjectKey(storageKey);
    const expiresInSec = 60 * 60;
    const fileUrl = this.createSignedObjectUrl(objectKey, "GET", expiresInSec);

    return {
      fileUrl,
      previewUrl: fileUrl,
      storageKey: objectKey,
      objectKey,
      expiresInSec,
      storageProvider: "cos"
    };
  }

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

  async deleteObjectByUrl(fileUrl: string) {
    const objectKey = this.extractObjectKeyFromUrl(fileUrl);
    if (!objectKey) {
      return false;
    }

    const { bucket, region } = this.getRequiredConfig();
    await this.getClient().deleteObject({
      Bucket: bucket,
      Region: region,
      Key: objectKey
    });

    return true;
  }

  buildObjectUrl(key: string) {
    const { bucket, region } = this.getRequiredConfig();
    return `https://${bucket}.cos.${region}.myqcloud.com/${key}`;
  }

  private createSignedObjectUrl(key: string, method: "GET" | "PUT", expiresInSec: number) {
    const { bucket, region } = this.getRequiredConfig();
    return this.getClient().getObjectUrl({
      Bucket: bucket,
      Region: region,
      Key: key,
      Method: method,
      Sign: true,
      Expires: expiresInSec,
      Protocol: "https:"
    });
  }

  private buildPhase2ObjectKey(input: Phase2AttachmentCosPresignInput) {
    const prefix = (process.env.COS_UPLOAD_PREFIX ?? "uploads").replace(/^\/+|\/+$/g, "");
    const module = this.normalizePathSegment(input.module, "attachments");
    const folder = this.normalizePathSegment(input.folder, "general");
    const cleanFileName = this.normalizeFileName(input.fileName);
    const extension = this.getExtension(cleanFileName);
    const baseName = extension ? cleanFileName.slice(0, -extension.length) : cleanFileName;
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const digest = createHash("sha256")
      .update([
        cleanFileName,
        input.mimeType ?? "",
        input.sizeBytes ?? "",
        input.module ?? "",
        input.folder ?? "",
        input.sha256 ?? "",
        Date.now(),
        Math.random().toString(36).slice(2)
      ].join("|"))
      .digest("hex")
      .slice(0, 16);

    return `${prefix}/${module}/${folder}/${day}/${Date.now()}_${digest}_${baseName}${extension}`;
  }

  private normalizeObjectKey(value: string) {
    return value.trim().replace(/^enterprise-cloud:\/+/, "").replace(/^\/+/, "");
  }

  private normalizeFileName(value: string) {
    return value
      .trim()
      .replace(/[\\/:*?"<>|#]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 160) || "attachment";
  }

  private normalizePathSegment(value: string | undefined, fallback: string) {
    const raw = value?.trim() || fallback;
    const normalized = raw
      .replace(/[\\:*?"<>|#]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/\/+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);

    return normalized || fallback;
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
