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
  itemType?: "file";
  fileName: string;
  fileUrl: string;
  fileType?: string | null;
  fileSizeBytes?: number | null;
  category?: string | null;
  tags?: string[];
  note?: string | null;
  businessType?: string | null;
  businessId?: string | null;
  folderId?: string | null;
  relatedEntity?: {
    type?: string | null;
    id?: string | null;
    label?: string | null;
    name?: string | null;
    href?: string | null;
  } | null;
  status?: string;
  isImportant?: boolean;
  permissionScope?: string | null;
  versionGroupId?: string | null;
  versionNumber?: number;
  versionNote?: string | null;
};

type UploadFileOptions = {
  businessType: string;
  businessId?: string;
  folderId?: string;
  category?: string;
  tagText?: string;
  note?: string;
  relatedType?: string;
  relatedId?: string;
  isImportant?: boolean;
  status?: string;
  permissionScope?: string;
  versionGroupId?: string;
  versionNote?: string;
  onProgress?: (percent: number) => void;
};

export type UploadedCosImage = {
  fileId: string;
  fileName: string;
  fileUrl: string;
  key: string;
};

export type UploadedCosFile = UploadedCosImage & {
  fileType?: string;
  fileSizeBytes: number;
};

function shouldFallbackToLocalUpload(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /COS 配置未完成|无法上传文件/i.test(error.message);
}

async function uploadFileToLocal(
  file: File,
  options: UploadFileOptions
): Promise<UploadedCosFile> {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("fileName", file.name);
  formData.append("fileType", file.type);
  formData.append("businessType", options.businessType);

  if (options.businessId) {
    formData.append("businessId", options.businessId);
  }
  if (options.folderId) {
    formData.append("folderId", options.folderId);
  }
  if (options.category) {
    formData.append("category", options.category);
  }
  if (options.tagText) {
    formData.append("tagText", options.tagText);
  }
  if (options.note) {
    formData.append("note", options.note);
  }
  if (options.relatedType) {
    formData.append("relatedType", options.relatedType);
  }
  if (options.relatedId) {
    formData.append("relatedId", options.relatedId);
  }
  if (options.status) {
    formData.append("status", options.status);
  }
  if (options.permissionScope) {
    formData.append("permissionScope", options.permissionScope);
  }
  if (options.versionGroupId) {
    formData.append("versionGroupId", options.versionGroupId);
  }
  if (options.versionNote) {
    formData.append("versionNote", options.versionNote);
  }
  if (typeof options.isImportant === "boolean") {
    formData.append("isImportant", String(options.isImportant));
  }

  const fileRecord = await apiFetch<FileRecord>("/files/upload-local", {
    method: "POST",
    body: formData,
  });

  options.onProgress?.(100);

  return {
    fileId: fileRecord.id,
    fileName: fileRecord.fileName,
    fileUrl: fileRecord.fileUrl,
    fileType: file.type,
    fileSizeBytes: file.size,
    key: fileRecord.fileUrl,
  };
}

export async function uploadFileToCos(
  file: File,
  options: UploadFileOptions
): Promise<UploadedCosFile> {
  let uploadToken: UploadTokenResponse;

  try {
    uploadToken = await apiFetch<UploadTokenResponse>("/files/upload-token", {
      method: "POST",
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        businessType: options.businessType,
        businessId: options.businessId,
        folderId: options.folderId,
        category: options.category,
        relatedType: options.relatedType
      })
    });
  } catch (error) {
    if (shouldFallbackToLocalUpload(error)) {
      return uploadFileToLocal(file, options);
    }
    throw error;
  }

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
      businessId: options.businessId,
      folderId: options.folderId,
      fileSizeBytes: file.size,
      category: options.category,
      tagText: options.tagText,
      note: options.note,
      relatedType: options.relatedType,
      relatedId: options.relatedId,
      isImportant: options.isImportant,
      status: options.status,
      permissionScope: options.permissionScope,
      versionGroupId: options.versionGroupId,
      versionNote: options.versionNote
    })
  });

  return {
    fileId: fileRecord.id,
    fileName: fileRecord.fileName,
    fileUrl: fileRecord.fileUrl,
    fileType: file.type,
    fileSizeBytes: file.size,
    key: uploadToken.key
  };
}

export async function uploadImageToCos(
  file: File,
  options: UploadFileOptions
): Promise<UploadedCosImage> {
  const uploaded = await uploadFileToCos(file, options);
  return {
    fileId: uploaded.fileId,
    fileName: uploaded.fileName,
    fileUrl: uploaded.fileUrl,
    key: uploaded.key
  };
}
