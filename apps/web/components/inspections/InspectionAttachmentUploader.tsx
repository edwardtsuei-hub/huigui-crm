"use client";

import { useState } from "react";
import { uploadFileToCos } from "../../lib/cos";
import {
  inspectionAttachmentCategoryLabel,
  inspectionAttachmentCategoryOptions,
  type InspectionAttachmentCategory,
} from "./types";

type InspectionAttachmentUploaderProps = {
  inspectionId: string;
  canUpload: boolean;
  onUploaded: () => Promise<void> | void;
};

export function InspectionAttachmentUploader({
  inspectionId,
  canUpload,
  onUploaded,
}: InspectionAttachmentUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] =
    useState<InspectionAttachmentCategory>("inspection_report");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [inputKey, setInputKey] = useState(0);

  async function handleUpload() {
    if (!files.length) {
      setError("请先选择要上传的附件");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      for (const file of files) {
        await uploadFileToCos(file, {
          businessType: category,
          businessId: inspectionId,
          category: inspectionAttachmentCategoryLabel(category),
          note: note.trim() || undefined,
          relatedType: "INSPECTION_ORDER",
          relatedId: inspectionId,
          onProgress(percent) {
            setProgress((current) => ({
              ...current,
              [file.name]: percent,
            }));
          },
        });
      }

      setMessage(`已上传 ${files.length} 个附件`);
      setFiles([]);
      setNote("");
      setProgress({});
      setInputKey((current) => current + 1);
      await onUploaded();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "上传附件失败",
      );
    } finally {
      setUploading(false);
    }
  }

  if (!canUpload) {
    return (
      <div className="small muted">
        当前账号没有上传检测附件权限，如需补报告或回单，请联系有权限的同事协助。
      </div>
    );
  }

  return (
    <div className="summary-card stack">
      <div className="section-heading">
        <h3>上传附件</h3>
        <p>支持检测报告、付款回单、发票、样品照片和其他附件，上传后会自动挂到这张检测单下。</p>
      </div>

      <div className="field">
        <label htmlFor="inspection-attachment-category">附件类型</label>
        <select
          id="inspection-attachment-category"
          onChange={(event) =>
            setCategory(event.target.value as InspectionAttachmentCategory)
          }
          value={category}
        >
          {inspectionAttachmentCategoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <label className="files-upload-dropzone">
        <input
          key={inputKey}
          multiple
          onChange={(event) =>
            setFiles(Array.from(event.target.files ?? []))
          }
          type="file"
        />
        <strong>选择附件</strong>
        <span>支持一次选择多个文件，上传后会自动追加到当前检测单。</span>
        <small>建议按同一类型分批上传，后续检索会更清楚。</small>
      </label>

      <div className="field">
        <label htmlFor="inspection-attachment-note">上传备注</label>
        <textarea
          id="inspection-attachment-note"
          onChange={(event) => setNote(event.target.value)}
          placeholder="例如：首份正式报告、客户付款回单、补样照片"
          rows={3}
          value={note}
        />
      </div>

      {files.length ? (
        <div className="focus-list">
          {files.map((file) => (
            <article className="list-card" key={`${file.name}-${file.size}`}>
              <div className="detail-block__header">
                <strong>{file.name}</strong>
                <span className="status-pill neutral">
                  {progress[file.name] ? `${progress[file.name]}%` : "待上传"}
                </span>
              </div>
              <p>{Math.max(file.size / 1024, 1).toFixed(0)} KB</p>
            </article>
          ))}
        </div>
      ) : null}

      {message ? <div className="small">{message}</div> : null}
      {error ? <div className="small danger-text">{error}</div> : null}

      <div className="action-row">
        <button disabled={uploading} onClick={handleUpload} type="button">
          {uploading ? "上传中..." : "开始上传"}
        </button>
        {files.length ? (
          <button
            className="button secondary"
            disabled={uploading}
            onClick={() => {
              setFiles([]);
              setProgress({});
              setInputKey((current) => current + 1);
            }}
            type="button"
          >
            清空文件
          </button>
        ) : null}
      </div>
    </div>
  );
}
