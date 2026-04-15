"use client";

type ParserInputPanelProps = {
  rawText: string;
  imagePreview: string;
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
    loading,
    error,
    statusMessage,
    onRawTextChange,
    onImageSelect,
    onRemoveImage,
    onParse
  } = props;

  return (
    <section className="panel stack">
      <div>
        <h3>产品信息智能解析</h3>
        <p className="muted">
          支持粘贴产品说明文字或上传标签截图，先生成解析建议，再人工确认后填入正式表单。
        </p>
      </div>

      <div className="form-grid">
        <div className="field full">
          <label>文本粘贴框</label>
          <textarea
            value={rawText}
            onChange={(event) => onRawTextChange(event.target.value)}
            placeholder="可粘贴标签全文、宣传文案、产品介绍、企业标准说明、成分说明、使用方法等"
            style={{ minHeight: 180 }}
          />
        </div>

        <div className="field full">
          <label>标签图片上传</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => onImageSelect(event.target.files?.[0] ?? null)}
          />
          <div className="small muted">支持 jpg / png / webp，第一版仅支持单张图片。</div>
          {imagePreview ? (
            <div className="quote-card" style={{ marginTop: 12 }}>
              <img
                src={imagePreview}
                alt="产品标签预览"
                style={{ width: 180, maxWidth: "100%", borderRadius: 12, display: "block" }}
              />
              <div className="toolbar" style={{ marginTop: 12 }}>
                <button type="button" className="button secondary inline" onClick={onRemoveImage}>
                  删除图片
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {error ? <div className="danger-text small">{error}</div> : null}
      {statusMessage ? <div className="small muted">{statusMessage}</div> : null}

      <div className="toolbar">
        <button type="button" onClick={onParse} disabled={loading}>
          {loading ? "解析中..." : "开始解析"}
        </button>
      </div>
    </section>
  );
}
