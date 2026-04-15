"use client";

import COS from "cos-js-sdk-v5";
import { apiFetch } from "./api";

type UploadTokenResponse = {
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

type FileRecord = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType?: string | null;
  businessType?: string | null;
  businessId?: string | null;
};

type UploadParsedImageOptions = {
  businessType: string;
  businessId?: string;
  onProgress?: (percent: number) => void;
};

export type UploadedCosImage = {
  fileId: string;
  fileName: string;
  fileUrl: string;
  key: string;
};

export async function uploadImageToCos(
  file: File,
  options: UploadParsedImageOptions
): Promise<UploadedCosImage> {
  const uploadToken = await apiFetch<UploadTokenResponse>("/files/upload-token", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      businessType: options.businessType,
      businessId: options.businessId
    })
  });

  const cos = new COS({
    SecretId: uploadToken.credentials.tmpSecretId,
    SecretKey: uploadToken.credentials.tmpSecretKey,
    SecurityToken: uploadToken.credentials.sessionToken,
    StartTime: uploadToken.startTime,
    ExpiredTime: uploadToken.expiredTime
  });

  await new Promise<void>((resolve, reject) => {
    cos.uploadFile(
      {
        Bucket: uploadToken.bucket,
        Region: uploadToken.region,
        Key: uploadToken.key,
        Body: file,
        onProgress(progress) {
          options.onProgress?.(Math.round((progress.percent ?? 0) * 100));
        }
      },
      (error) => {
        if (error) {
          reject(new Error(error.message || "上传图片到 COS 失败"));
          return;
        }
        resolve();
      }
    );
  });

  const fileRecord = await apiFetch<FileRecord>("/files/callback", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      fileUrl: uploadToken.url,
      fileType: file.type,
      businessType: options.businessType,
      businessId: options.businessId
    })
  });

  return {
    fileId: fileRecord.id,
    fileName: fileRecord.fileName,
    fileUrl: fileRecord.fileUrl,
    key: uploadToken.key
  };
}
