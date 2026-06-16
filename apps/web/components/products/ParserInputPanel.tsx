"use client";

import { useEffect, useId, useRef } from "react";
import styles from "./ProductParserPanels.module.css";

type ParserInputPanelProps = {
  rawText: string;
  imagePreview: string;
  selectedFileName: string;
  loading: boolean;
  error: string;
  statusMessage: string;
  onRawTextChange: (value: string) => void;
  onImageSelect: (file: File | null) => void;
  onRemoveImage: () => void;
  onParse: () => void;
};

export function ParserInputPanel(props: ParserInputPanelProps) {
  const {
    rawText,
    imagePreview,
    selectedFileName,
    loading,
    error,
    statusMessage,
    onRawTextChange,
    onImageSelect,
    onRemoveImage,
    onParse,
  } = props;
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!selectedFileName && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [selectedFileName]);

  return (
    <section className={`panel ${styles.panelShell}`}>
      <div className={styles.panelHeader}>
        <div className={styles.panelHeaderMain}>
          <span className={styles.stepTag}>Step 1</span>
          <h3>输入产品资料</h3>
          <p>
            支持贴入标签全文、宣传文案和产品说明，也可以直接上传标签截图。
            先把资料集中给解析器，再进入结构化确认。
          </p>
        </div>
        <div className={styles.headerMeta}>
          {selectedFileName ? "已选择图片" : rawText.trim() ? "文本待解析" : "等待输入"}
        </div>
      </div>

      <div className={styles.composerGrid}>
        <div className={styles.surfaceCard}>
          <div className={styles.surfaceHeading}>
            <strong>文本粘贴框</strong>
            <span>适合贴标签全文、产品介绍、企业标准说明、成分或使用方法。</span>
          </div>

          <textarea
            className={styles.textArea}
            value={rawText}
            onChange={(event) => onRawTextChange(event.target.value)}
            placeholder="可粘贴标签全文、宣传文案、产品介绍、企业标准说明、成分说明、使用方法等"
          />
        </div>

        <div className={styles.surfaceCard}>
          <div className={styles.surfaceHeading}>
            <strong>标签图片上传</strong>
            <span>支持 jpg / png / webp，当前版本先解析单张图片。</span>
          </div>

          <input
            id={inputId}
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => onImageSelect(event.target.files?.[0] ?? null)}
            className={styles.hiddenInput}
          />

          <div className={styles.uploadToolbar}>
            <button
              type="button"
              className="button secondary inline"
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFileName ? "重新选择图片" : "选择标签图片"}
            </button>
            <div className={styles.fileMeta}>
              {selectedFileName || "尚未选择文件"}
            </div>
          </div>

          {imagePreview ? (
            <div className={styles.previewBlock}>
              <img
                className={styles.previewImage}
                src={imagePreview}
                alt="产品标签预览"
              />

              <div className={styles.fieldActions}>
                <button
                  type="button"
                  className="button ghost inline"
                  onClick={onRemoveImage}
                >
                  删除图片
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.helperText}>
              上传后会先抽取图片文字，再和文本输入一起进入混合解析。
            </div>
          )}
        </div>
      </div>

      <div className={styles.statusRow}>
        <div>
          {error ? (
            <div className={styles.statusError}>{error}</div>
          ) : statusMessage ? (
            <div className={styles.statusNeutral}>{statusMessage}</div>
          ) : (
            <div className={styles.statusText}>
              你可以只贴文字、只传图片，或把两者一起交给解析器。
            </div>
          )}
        </div>

        <div className={styles.footerBar}>
          <button type="button" onClick={onParse} disabled={loading}>
            {loading ? "解析中..." : "开始解析"}
          </button>
        </div>
      </div>
    </section>
  );
}
