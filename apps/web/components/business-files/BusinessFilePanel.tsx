"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { uploadFileToCos } from "../../lib/cos";
import {
  businessTypeLabel,
  fileCategoryLabel,
  fileStatusMeta,
  formatFileDate,
  formatFileSize,
  previewUrl,
  type FilesLibraryResponse,
  type FileSummary,
} from "../../lib/files";

export type BusinessFileType =
  | "CUSTOMER"
  | "QUOTATION"
  | "SALES_ORDER"
  | "INSPECTION_ORDER"
  | "PRODUCT"
  | "CONTRACT"
  | "PROJECT";

type BusinessFileCategoryOption = {
  value: string;
  label: string;
};

type BusinessFilePanelProps = {
  businessType: BusinessFileType;
  businessId: string;
  title?: string;
  description?: string;
  canView: boolean;
  canUpload: boolean;
  defaultCategory: string;
  categoryOptions?: BusinessFileCategoryOption[];
  emptyText?: string;
  containerClassName?: string;
  onUploaded?: () => Promise<void> | void;
};

function uploadQueueKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function BusinessFilePanel({
  businessType,
  businessId,
  title = "关联档案",
  description,
  canView,
  canUpload,
  defaultCategory,
  categoryOptions,
  emptyText = "当前还没有关联附件。",
  containerClassName = "panel stack",
  onUploaded,
}: BusinessFilePanelProps) {
  const normalizedCategoryOptions = useMemo(
    () =>
      categoryOptions?.length
        ? categoryOptions
        : [{ value: defaultCategory, label: defaultCategory }],
    [categoryOptions, defaultCategory],
  );
  const [files, setFiles] = useState<FileSummary[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [category, setCategory] = useState(defaultCategory);
  const [note, setNote] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [statusMap, setStatusMap] = useState<
    Record<string, "queued" | "uploading" | "success" | "failed">
  >({});
  const [inputKey, setInputKey] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const filesHref = useMemo(() => {
    const params = new URLSearchParams({
      relatedType: businessType,
      relatedId: businessId,
    });
    return `/files?${params.toString()}`;
  }, [businessId, businessType]);

  const loadFiles = useCallback(async () => {
    if (!canView || !businessId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        view: "all",
        relatedType: businessType,
        relatedId: businessId,
        sortBy: "updated_desc",
      });
      const response = await apiFetch<FilesLibraryResponse>(
        `/files?${params.toString()}`,
      );
      setFiles(response.files);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "加载关联档案失败",
      );
    } finally {
      setLoading(false);
    }
  }, [businessId, businessType, canView]);

  useEffect(() => {
    setCategory(defaultCategory);
  }, [defaultCategory]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  function appendFiles(nextFiles: File[]) {
    setSelectedFiles((current) => {
      const map = new Map(current.map((file) => [uploadQueueKey(file), file]));
      for (const file of nextFiles) {
        map.set(uploadQueueKey(file), file);
      }
      return Array.from(map.values());
    });
    setStatusMap((current) => {
      const next = { ...current };
      for (const file of nextFiles) {
        next[uploadQueueKey(file)] = "queued";
      }
      return next;
    });
  }

  async function handleUpload() {
    if (!selectedFiles.length) {
      setError("请先选择要上传的附件");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      for (const file of selectedFiles) {
        const key = uploadQueueKey(file);
        setStatusMap((current) => ({ ...current, [key]: "uploading" }));
        await uploadFileToCos(file, {
          businessType,
          businessId,
          relatedType: businessType,
          relatedId: businessId,
          category: category || defaultCategory,
          note: note.trim() || undefined,
          isImportant,
          status: "ARCHIVED",
          onProgress(percent) {
            setProgress((current) => ({ ...current, [key]: percent }));
          },
        });
        setStatusMap((current) => ({ ...current, [key]: "success" }));
      }

      setMessage(`已上传 ${selectedFiles.length} 个附件`);
      setSelectedFiles([]);
      setNote("");
      setIsImportant(false);
      setProgress({});
      setInputKey((current) => current + 1);
      await loadFiles();
      await onUploaded?.();
    } catch (requestError) {
      setStatusMap((current) =>
        Object.fromEntries(
          Object.entries(current).map(([key, value]) => [
            key,
            value === "uploading" ? "failed" : value,
          ]),
        ) as Record<string, "queued" | "uploading" | "success" | "failed">,
      );
      setError(
        requestError instanceof Error ? requestError.message : "上传附件失败",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className={containerClassName}>
      <div className="section-heading">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>

      {!canView ? (
        <div className="small muted">当前账号没有档案中心权限。</div>
      ) : (
        <>
          {canUpload ? (
            <div className="summary-card stack">
              <div className="form-grid">
                <div className="field">
                  <label htmlFor={`business-file-category-${businessId}`}>
                    附件类型
                  </label>
                  <select
                    id={`business-file-category-${businessId}`}
                    onChange={(event) => setCategory(event.target.value)}
                    value={category}
                  >
                    {normalizedCategoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="field">
                  <span>标记</span>
                  <span className="files-toolbar__checkbox">
                    <input
                      checked={isImportant}
                      onChange={(event) => setIsImportant(event.target.checked)}
                      type="checkbox"
                    />
                    <span>重要文件</span>
                  </span>
                </label>
              </div>

              <label
                className="files-upload-dropzone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  appendFiles(Array.from(event.dataTransfer.files ?? []));
                }}
              >
                <input
                  key={inputKey}
                  multiple
                  onChange={(event) =>
                    appendFiles(Array.from(event.target.files ?? []))
                  }
                  type="file"
                />
                <strong>选择附件</strong>
                <span>上传后归入{businessTypeLabel(businessType)}档案。</span>
                <small>
                  {selectedFiles.length
                    ? `已选择 ${selectedFiles.length} 个文件`
                    : "支持一次选择多个文件"}
                </small>
              </label>

              <div className="field">
                <label htmlFor={`business-file-note-${businessId}`}>
                  上传备注
                </label>
                <textarea
                  id={`business-file-note-${businessId}`}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="补充版本、来源或交付说明"
                  rows={3}
                  value={note}
                />
              </div>

              {selectedFiles.length ? (
                <div className="focus-list">
                  {selectedFiles.map((file) => {
                    const key = uploadQueueKey(file);
                    const state = statusMap[key] ?? "queued";
                    const percent = progress[key];
                    return (
                      <article className="list-card" key={key}>
                        <div className="detail-block__header">
                          <strong>{file.name}</strong>
                          <span className={`status-pill ${state === "failed" ? "danger" : state === "success" ? "success" : "neutral"}`}>
                            {state === "uploading"
                              ? `${percent ?? 0}%`
                              : state === "success"
                                ? "已上传"
                                : state === "failed"
                                  ? "失败"
                                  : "待上传"}
                          </span>
                        </div>
                        <p>{formatFileSize(file.size)}</p>
                      </article>
                    );
                  })}
                </div>
              ) : null}

              <div className="action-row">
                <button disabled={uploading} onClick={handleUpload} type="button">
                  {uploading ? "上传中..." : "开始上传"}
                </button>
                {selectedFiles.length ? (
                  <button
                    className="button secondary"
                    disabled={uploading}
                    onClick={() => {
                      setSelectedFiles([]);
                      setProgress({});
                      setStatusMap({});
                      setInputKey((current) => current + 1);
                    }}
                    type="button"
                  >
                    清空文件
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="small muted">当前账号不能上传附件。</div>
          )}

          {message ? <div className="small success-text">{message}</div> : null}
          {error ? <div className="small danger-text">{error}</div> : null}

          <div className="focus-list">
            {loading ? <div className="empty">正在加载关联附件...</div> : null}
            {!loading && files.length
              ? files.map((file) => {
                  const status = fileStatusMeta(file.status);
                  return (
                    <article className="list-card" key={file.id}>
                      <div className="detail-block__header">
                        <div>
                          <strong>{file.fileName}</strong>
                          <div className="small muted">
                            {fileCategoryLabel(file.category)} ·{" "}
                            {formatFileSize(file.fileSizeBytes)} ·{" "}
                            {formatFileDate(file.updatedAt)}
                          </div>
                        </div>
                        <span className={`status-pill ${status.tone}`}>
                          {status.label}
                        </span>
                      </div>
                      {file.note ? <p>{file.note}</p> : null}
                      <div className="action-row">
                        <a
                          className="button secondary inline"
                          href={previewUrl(file)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          打开附件
                        </a>
                        <Link className="button ghost inline" href={`/files?view=favorites&itemIds=${encodeURIComponent(file.id)}`}>
                          查看档案
                        </Link>
                      </div>
                    </article>
                  );
                })
              : null}
            {!loading && !files.length ? <div className="empty">{emptyText}</div> : null}
          </div>

          <div className="action-row">
            <button
              className="button secondary inline"
              disabled={loading}
              onClick={() => void loadFiles()}
              type="button"
            >
              刷新附件
            </button>
            <Link className="button ghost inline" href={filesHref}>
              打开档案中心
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
