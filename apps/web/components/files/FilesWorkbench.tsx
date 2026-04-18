"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ActionMenu,
  DataTable,
  EmptyState,
  PageHeader,
  RightDrawer,
  SectionCard,
  StatusBadge,
  TimelineBlock
} from "../system/primitives";
import { apiFetch, getCurrentUser } from "../../lib/api";
import { uploadFileToCos } from "../../lib/cos";
import {
  collectFolderOptions,
  fileCategoryLabel,
  fileCategoryOptions,
  fileSortOptions,
  fileStatusMeta,
  fileStatusOptions,
  fileTypeKey,
  filesQuickViewMeta,
  findFolderPath,
  formatFileDate,
  formatFileSize,
  previewKind,
  previewUrl,
  type FileDetailResponse,
  type FileSummary,
  type FilesLibraryResponse,
  type FilesQuickViewKey,
  type FilesViewMode,
  type FileStatusValue,
  type FolderSummary,
  type FolderTreeNode
} from "../../lib/files";

const FAVORITES_STORAGE_KEY = "huigui:file-favorites";
const TRASH_RETENTION_DAYS = 90;
const CUSTOM_REASON_OPTION = "其他";
const DELETE_REASON_OPTIONS = ["重复上传", "版本已替换", "误传文件", "资料已失效", CUSTOM_REASON_OPTION];
const PERMANENT_DELETE_REASON_OPTIONS = ["确认无须保留", "已完成人工备份", "超期清理", "合规清理", CUSTOM_REASON_OPTION];
const TRASH_REASON_FILTER_OPTIONS = ["成员手动删除", "重复上传", "版本已替换", "误传文件", "资料已失效"];

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function LineIcon({
  children,
  className,
  size = 16
}: {
  children: ReactNode;
  className?: string;
  size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
      width={size}
    >
      {children}
    </svg>
  );
}

function SearchLineIcon({ size = 16 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <circle cx="11" cy="11" r="5.5" />
      <path d="m19 19-3.5-3.5" />
    </LineIcon>
  );
}

function UploadLineIcon({ size = 16 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <path d="M12 15V5" />
      <path d="m8.5 8.5 3.5-3.5 3.5 3.5" />
      <path d="M5 18.5h14" />
    </LineIcon>
  );
}

function FolderPlusLineIcon({ size = 16 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <path d="M3.5 8.5h6l1.8 2h9.2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />
      <path d="M16 7v5M13.5 9.5h5" />
    </LineIcon>
  );
}

function RefreshLineIcon({ size = 16 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <path d="M20 11a8 8 0 1 0 1.3 4.4" />
      <path d="M20 4v7h-7" />
    </LineIcon>
  );
}

function FolderLineIcon({ size = 16 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <path d="M3.5 8.5h6l1.8 2h9.2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />
      <path d="M3.5 8.5v-1a2 2 0 0 1 2-2h4l1.6 1.8" />
    </LineIcon>
  );
}

function StackFilesLineIcon({ size = 16 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <path d="M8 5.5h7l3 3v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" />
      <path d="M15 5.5v3h3" />
      <path d="M4.5 8.5V6.5a2 2 0 0 1 2-2h7" />
    </LineIcon>
  );
}

function ClockLineIcon({ size = 16 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 1.5" />
    </LineIcon>
  );
}

function StarLineIcon({ size = 16 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <path d="m12 4 2.3 4.7 5.2.8-3.7 3.7.9 5.3-4.7-2.5-4.7 2.5.9-5.3-3.7-3.7 5.2-.8Z" />
    </LineIcon>
  );
}

function ArchiveLineIcon({ size = 16 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <rect x="4" y="6" width="16" height="4" rx="1.6" />
      <path d="M6.5 10v8a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-8" />
      <path d="M10 14h4" />
    </LineIcon>
  );
}

function FlagLineIcon({ size = 16 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <path d="M6 20V5" />
      <path d="M6 6h8l-1.2 2.4L14 11H6" />
    </LineIcon>
  );
}

function TrashLineIcon({ size = 16 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <path d="M5 7h14" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M7 7.5 8 19a2 2 0 0 0 2 1.8h4a2 2 0 0 0 2-1.8l1-11.5" />
      <path d="M10 11v5M14 11v5" />
    </LineIcon>
  );
}

function ShareLineIcon({ size = 16 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="7" r="2" />
      <circle cx="18" cy="17" r="2" />
      <path d="m8 11 8-3" />
      <path d="m8 13 8 3" />
    </LineIcon>
  );
}

function InfoLineIcon({ size = 16 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 10.5V16" />
      <path d="M12 8h.01" />
    </LineIcon>
  );
}

function SearchFileLineIcon({ size = 16 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <path d="M8 5.5h6.5l2.5 2.5v5.5" />
      <path d="M14.5 5.5v3h3" />
      <circle cx="10" cy="15" r="3.5" />
      <path d="m15.5 20.5-2.4-2.4" />
    </LineIcon>
  );
}

function DocumentLineIcon({ size = 16 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <path d="M8 4.5h7l3 3v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z" />
      <path d="M15 4.5v3h3" />
    </LineIcon>
  );
}

function ImageLineIcon({ size = 16 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <rect x="4.5" y="5.5" width="15" height="13" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m7 16 3.5-3.5 2.5 2.5 2.5-2.5 2 3.5" />
    </LineIcon>
  );
}

function VideoLineIcon({ size = 16 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <rect x="4.5" y="6.5" width="11" height="11" rx="2" />
      <path d="m15.5 10 4-2.5v9l-4-2.5" />
      <path d="m9.5 10 3 2-3 2Z" />
    </LineIcon>
  );
}

function AudioLineIcon({ size = 16 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <path d="M8 10v4" />
      <path d="M12 8v8" />
      <path d="M16 10v4" />
      <path d="M6 14a4 4 0 0 0 12 0" />
      <path d="M6 10a4 4 0 0 1 12 0" />
    </LineIcon>
  );
}

function ZipLineIcon({ size = 16 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <path d="M8 4.5h7l3 3v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z" />
      <path d="M15 4.5v3h3" />
      <path d="M11 7.5h2M11 10h2M11 12.5h2M11 15h2" />
    </LineIcon>
  );
}

type SelectableLibraryItem = FolderSummary | FileSummary;

type SelectionPayload = {
  fileIds: string[];
  folderIds: string[];
};

type ActionTarget = {
  title: string;
  fileIds: string[];
  folderIds: string[];
};

type RenameTarget = {
  kind: "file" | "folder";
  id: string;
  name: string;
};

type MetadataTarget = {
  mode: "single" | "batch";
  title: string;
  fileIds: string[];
  folderIds: string[];
  category?: string | null;
  tags?: string[];
  status?: FileStatusValue;
  isImportant?: boolean;
};

type MoveTarget = {
  title: string;
  fileIds: string[];
  folderIds: string[];
  currentFolderId?: string | null;
};

function buildSelectionPayload(ids: string[], items: SelectableLibraryItem[]): SelectionPayload {
  return ids.reduce<SelectionPayload>(
    (accumulator, id) => {
      const item = items.find((candidate) => candidate.id === id);
      if (!item) {
        return accumulator;
      }

      if (item.itemType === "file") {
        accumulator.fileIds.push(id);
      } else {
        accumulator.folderIds.push(id);
      }
      return accumulator;
    },
    { fileIds: [], folderIds: [] }
  );
}

function isTrashManager(roleCode?: string | null) {
  return roleCode === "SUPER_ADMIN" || roleCode === "ADMIN";
}

function buildDeleteActionTarget(item: SelectableLibraryItem): ActionTarget {
  return {
    title: item.itemType === "file" ? "移入回收区" : "删除资料夹",
    fileIds: item.itemType === "file" ? [item.id] : [],
    folderIds: item.itemType === "folder" ? [item.id] : []
  };
}

function buildSelectionActionTarget(selectedIds: string[], payload: SelectionPayload): ActionTarget {
  return {
    title: `处理已选 ${selectedIds.length} 项`,
    fileIds: payload.fileIds,
    folderIds: payload.folderIds
  };
}

function describeDeleteAction(target: ActionTarget | null) {
  const fileCount = target?.fileIds.length ?? 0;
  const folderCount = target?.folderIds.length ?? 0;

  if (fileCount > 0 && folderCount === 0) {
    return {
      title: "确认将这些文件移入回收区吗？",
      description: "移入回收区后，只有管理员可以查看、恢复或彻底删除。",
      confirmText: "移入回收区"
    };
  }

  if (fileCount === 0 && folderCount > 0) {
    return {
      title: "确认删除这些资料夹吗？",
      description: "空资料夹会被直接删除，且无法从回收区恢复。",
      confirmText: "直接删除"
    };
  }

  return {
    title: "确认处理这些档案吗？",
    description: "文件会移入回收区，空资料夹会直接删除。回收区只有管理员可以查看和清理。",
    confirmText: "确认处理"
  };
}

function persistFavorites(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
}

function readFavorites() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function buildUploaderSearchText(file: FileSummary) {
  return [file.uploader.name, file.uploader.loginAccount, file.note, file.relatedEntity?.name]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
}

function buildFilesRoute(params: { view?: string | null; folder?: string | null }) {
  const searchParams = new URLSearchParams();
  if (params.view && params.view !== "all") {
    searchParams.set("view", params.view);
  }
  if (params.folder) {
    searchParams.set("folder", params.folder);
  }
  const query = searchParams.toString();
  return query ? `/files?${query}` : "/files";
}

function dedupeConsecutiveLabels(labels: string[]) {
  return labels
    .map((label) => label.trim())
    .filter(Boolean)
    .reduce<string[]>((trail, label) => {
      if (trail[trail.length - 1] !== label) {
        trail.push(label);
      }
      return trail;
    }, []);
}

function wait(duration: number) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function formatTrashRetentionLabel(item: FileSummary) {
  if (!item.deletedAt) {
    return `保留 ${TRASH_RETENTION_DAYS} 天`;
  }

  if (!item.retentionExpiresAt) {
    return `保留 ${TRASH_RETENTION_DAYS} 天`;
  }

  if ((item.retentionDaysRemaining ?? 0) <= 0) {
    return `已到期 · 截止 ${formatFileDate(item.retentionExpiresAt)}`;
  }

  if ((item.retentionDaysRemaining ?? 0) <= 1) {
    return `24 小时内到期 · 截止 ${formatFileDate(item.retentionExpiresAt)}`;
  }

  if ((item.retentionDaysRemaining ?? 0) <= 7) {
    return `7 天内到期 · 截止 ${formatFileDate(item.retentionExpiresAt)}`;
  }

  return `剩余 ${item.retentionDaysRemaining} 天 · 截止 ${formatFileDate(item.retentionExpiresAt)}`;
}

function formatMetricNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function FilesGuideNotice({
  onCreateFolder,
  onUpload
}: {
  onCreateFolder: () => void;
  onUpload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const steps = [
    {
      label: "先建立资料结构",
      description: "按业务、客户或资料类型先分好目录，后面筛选、归档和交接都会更顺。"
    },
    {
      label: "再上传正式档案",
      description: "合同、培训资料和客户交付建议直接归到目标目录，避免后续反复移动。"
    },
    {
      label: "最后补分类与标签",
      description: "把分类、标签和备注一次补齐，右侧属性区和快速筛选才能真正发挥作用。"
    }
  ];

  return (
    <section className={cn("files-guide", open && "is-open")}>
      <div className="files-guide__summary">
        <div className="files-guide__summary-copy">
          <span className="files-guide__eyebrow">浏览建议</span>
          <strong>先建资料夹，再放正式文件</strong>
          <p>把目录结构先定清楚，进入档案中心后就会更像在浏览文件，而不是先选中再去右侧处理。</p>
        </div>
        <button
          className="button ghost inline files-guide__summary-action"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {open ? "收起引导" : "查看新手引导"}
        </button>
      </div>

      {open ? (
        <div className="files-guide__panel">
          <div className="files-guide__steps">
            {steps.map((step) => (
              <article className="files-guide__step" key={step.label}>
                <strong>{step.label}</strong>
                <p>{step.description}</p>
              </article>
            ))}
          </div>

          <div className="action-row files-guide__actions">
            <button className="button inline" onClick={onUpload} type="button">
              上传文件
            </button>
            <button className="button secondary inline" onClick={onCreateFolder} type="button">
              新建资料夹
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function FilesOverviewStrip({
  currentViewLabel,
  visibleCount,
  totalFiles,
  pendingReviewCount,
}: {
  currentViewLabel: string;
  visibleCount: number;
  totalFiles: number;
  pendingReviewCount: number;
}) {
  return (
    <section className="files-overview-strip" aria-label="档案总览">
      <article className="files-overview-card">
        <span className="files-overview-card__label">当前视图</span>
        <strong className="files-overview-card__value">{formatMetricNumber(visibleCount)}</strong>
        <small className="files-overview-card__helper">{currentViewLabel}</small>
      </article>
      <article className="files-overview-card">
        <span className="files-overview-card__label">正式文件</span>
        <strong className="files-overview-card__value">{formatMetricNumber(totalFiles)}</strong>
        <small className="files-overview-card__helper">全部正式资料总量</small>
      </article>
      <article className="files-overview-card">
        <span className="files-overview-card__label">待审核</span>
        <strong className="files-overview-card__value">{formatMetricNumber(pendingReviewCount)}</strong>
        <small className="files-overview-card__helper">优先复核交付与合同</small>
      </article>
    </section>
  );
}

function FilesSparseHint({
  currentLabel,
  onCreateFolder,
  onUpload
}: {
  currentLabel: string;
  onCreateFolder: () => void;
  onUpload: () => void;
}) {
  return (
    <section className="files-sparse-hint">
      <div className="files-sparse-hint__copy">
        <strong>{currentLabel} 里的内容还不多</strong>
        <p>继续上传文件或补一层资料夹结构，这个目录会更像真正的档案浏览区，而不是一个空白容器。</p>
      </div>
      <div className="action-row files-sparse-hint__actions">
        <button className="button inline" onClick={onUpload} type="button">
          上传文件
        </button>
        <button className="button secondary inline" onClick={onCreateFolder} type="button">
          新建资料夹
        </button>
      </div>
    </section>
  );
}

function TrashWorkspaceNotice({
  totalCount,
  selectedCount,
  latestDeletedAt,
  expiringSoonCount,
  dueWithinDayCount,
  earliestExpiresAt,
  activeDeleteReason,
  onDeleteReasonChange,
  onBackToLibrary,
  onEmptyTrash
}: {
  totalCount: number;
  selectedCount: number;
  latestDeletedAt?: string | null;
  expiringSoonCount: number;
  dueWithinDayCount: number;
  earliestExpiresAt?: string | null;
  activeDeleteReason: string;
  onDeleteReasonChange: (value: string) => void;
  onBackToLibrary: () => void;
  onEmptyTrash: () => void;
}) {
  const reminderText =
    totalCount === 0
      ? "回收区当前为空。成员删除的文件会先暂存在这里，仅管理员可以恢复、彻底删除或等待系统自动清理。"
      : expiringSoonCount > 0
        ? `有 ${expiringSoonCount} 个文件将在 7 天内自动清理，其中 ${dueWithinDayCount} 个会在 24 小时内到期，建议先恢复或下载备份。`
        : "当前没有临近到期的文件。系统会按 90 天保留策略每日自动清理超期文件。";

  return (
    <section className="files-trash-notice">
      <div className="files-trash-notice__copy">
        <span className="files-trash-notice__eyebrow">仅管理员可见</span>
        <strong>回收区保留成员移出的文件，便于统一恢复和清理。</strong>
        <p>恢复后文件会回到原目录；当前按 90 天保留策略显示到期时间，彻底删除或清空回收区后，将同时从存储中移除，无法再找回。</p>
      </div>
      <div className="files-trash-notice__summary">
        <div className="files-trash-notice__summary-card">
          <span className="files-trash-notice__summary-label">回收中文件</span>
          <strong className="files-trash-notice__summary-value">{totalCount}</strong>
          <span className="files-trash-notice__summary-helper">仅管理员可恢复或彻底删除</span>
        </div>
        <div className="files-trash-notice__summary-card">
          <span className="files-trash-notice__summary-label">7 天内到期</span>
          <strong className="files-trash-notice__summary-value">{expiringSoonCount}</strong>
          <span className="files-trash-notice__summary-helper">
            {dueWithinDayCount ? `${dueWithinDayCount} 个会在 24 小时内到期` : "建议先处理需要保留的文件"}
          </span>
        </div>
        <div className="files-trash-notice__summary-card">
          <span className="files-trash-notice__summary-label">最早自动清理</span>
          <strong className="files-trash-notice__summary-value">
            {earliestExpiresAt ? formatFileDate(earliestExpiresAt) : "暂无"}
          </strong>
          <span className="files-trash-notice__summary-helper">系统每日自动清理超期文件</span>
        </div>
      </div>
      <div className="files-trash-notice__filters">
        <span className="files-trash-notice__filters-label">按删除原因筛选</span>
        <div className="files-trash-notice__filters-options">
          <button
            className={cn("button ghost inline files-trash-notice__filter", !activeDeleteReason && "active")}
            onClick={() => onDeleteReasonChange("")}
            type="button"
          >
            全部
          </button>
          {TRASH_REASON_FILTER_OPTIONS.map((option) => (
            <button
              key={option}
              className={cn("button ghost inline files-trash-notice__filter", activeDeleteReason === option && "active")}
              onClick={() => onDeleteReasonChange(activeDeleteReason === option ? "" : option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="files-trash-notice__reminder">{reminderText}</div>
      <div className="files-trash-notice__meta">
        <span>当前 {totalCount} 个待处理文件</span>
        <span>保留策略 {TRASH_RETENTION_DAYS} 天</span>
        {selectedCount ? <span>已选择 {selectedCount} 个</span> : null}
        {latestDeletedAt ? <span>最近移入：{formatFileDate(latestDeletedAt)}</span> : null}
      </div>
      <div className="action-row files-trash-notice__actions">
        <button className="button secondary inline" onClick={onBackToLibrary} type="button">
          返回全部文件
        </button>
        {totalCount ? (
          <button className="button ghost inline" onClick={onEmptyTrash} type="button">
            清空回收区
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function FilesWorkbench() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useMemo(() => getCurrentUser(), []);
  const canManageTrash = isTrashManager(currentUser?.roleCode);
  const activeView = ((searchParams.get("view") ?? "all").replace(/_/g, "-") as FilesQuickViewKey) || "all";
  const trashMode = activeView === "trash" && canManageTrash;
  const currentFolderId = searchParams.get("folder");
  const [library, setLibrary] = useState<FilesLibraryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedItem, setSelectedItem] = useState<{ kind: "file" | "folder"; id: string } | null>(null);
  const [fileDetail, setFileDetail] = useState<FileDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<FilesViewMode>("table");
  const [keywordInput, setKeywordInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [relatedTypeFilter, setRelatedTypeFilter] = useState("");
  const [uploaderFilter, setUploaderFilter] = useState("");
  const [deleteReasonFilter, setDeleteReasonFilter] = useState("");
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");
  const [importantOnly, setImportantOnly] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState("updated_desc");
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  const [metadataTarget, setMetadataTarget] = useState<MetadataTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ActionTarget | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<SelectionPayload | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<ActionTarget | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<ActionTarget | null>(null);
  const [emptyTrashOpen, setEmptyTrashOpen] = useState(false);
  const [versionTarget, setVersionTarget] = useState<FileSummary | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const deferredKeyword = useDeferredValue(keywordInput.trim());
  const deferredTag = useDeferredValue(tagFilter.trim());
  const deferredRelatedType = useDeferredValue(relatedTypeFilter.trim());
  const deferredUploader = useDeferredValue(uploaderFilter.trim().toLowerCase());

  useEffect(() => {
    setFavorites(readFavorites());
    const nextViewMode =
      typeof window !== "undefined" && window.localStorage.getItem("huigui:files-view-mode") === "grid"
        ? "grid"
        : "table";
    setViewMode(nextViewMode);
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (activeView === "trash" && !canManageTrash) {
      navigate({ view: "all", folder: null });
    }
  }, [activeView, canManageTrash]);

  useEffect(() => {
    if (!trashMode && deleteReasonFilter) {
      setDeleteReasonFilter("");
    }
  }, [trashMode, deleteReasonFilter]);

  useEffect(() => {
    if (!highlightedItemId) {
      return;
    }

    const timer = window.setTimeout(() => setHighlightedItemId(null), 3000);
    return () => window.clearTimeout(timer);
  }, [highlightedItemId]);

  useEffect(() => {
    let ignore = false;

    async function loadLibrary() {
      if (activeView === "trash" && !canManageTrash) {
        setLibrary(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        params.set("view", activeView);
        params.set("sortBy", sortBy);
        if (currentFolderId) params.set("folderId", currentFolderId);
        if (deferredKeyword) params.set("keyword", deferredKeyword);
        if (categoryFilter) params.set("category", categoryFilter);
        if (deferredTag) params.set("tag", deferredTag);
        if (statusFilter) params.set("status", statusFilter);
        if (deferredRelatedType) params.set("relatedType", deferredRelatedType);
        if (trashMode && deleteReasonFilter) params.set("deleteReason", deleteReasonFilter);
        if (updatedFrom) params.set("updatedFrom", updatedFrom);
        if (updatedTo) params.set("updatedTo", updatedTo);
        if (activeView === "favorites" && favorites.length) {
          params.set("itemIds", favorites.join(","));
        }

        const response = await apiFetch<FilesLibraryResponse>(`/files?${params.toString()}`);
        if (!ignore) {
          setLibrary(response);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError instanceof Error ? requestError.message : "档案中心加载失败");
          setLibrary(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadLibrary();

    return () => {
      ignore = true;
    };
  }, [
    activeView,
    canManageTrash,
    currentFolderId,
    deferredKeyword,
    deferredTag,
    categoryFilter,
    statusFilter,
    deferredRelatedType,
    deleteReasonFilter,
    updatedFrom,
    updatedTo,
    sortBy,
    refreshKey,
    favorites.join("|")
  ]);

  const allItems = useMemo<SelectableLibraryItem[]>(
    () => [...(library?.folders ?? []), ...(library?.files ?? [])],
    [library]
  );
  const visibleItems = useMemo<SelectableLibraryItem[]>(() => {
    return allItems.filter((item) => {
      if (importantOnly && item.itemType === "file" && !item.isImportant) {
        return false;
      }

      if (
        deferredUploader &&
        item.itemType === "file" &&
        !buildUploaderSearchText(item).includes(deferredUploader)
      ) {
        return false;
      }

      return true;
    });
  }, [allItems, importantOnly, deferredUploader]);
  const visibleFolders = useMemo(
    () => visibleItems.filter((item): item is FolderSummary => item.itemType === "folder"),
    [visibleItems]
  );
  const visibleFiles = useMemo(
    () => visibleItems.filter((item): item is FileSummary => item.itemType === "file"),
    [visibleItems]
  );
  const currentFolderSelection =
    selectedItem?.kind === "folder" && currentFolderId && selectedItem.id === currentFolderId
      ? library?.currentFolder ?? null
      : null;

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => visibleItems.some((item) => item.id === id)));

    if (
      selectedItem &&
      !visibleItems.some((item) => item.id === selectedItem.id) &&
      !(selectedItem.kind === "folder" && currentFolderSelection)
    ) {
      setSelectedItem(null);
      setFileDetail(null);
    }
  }, [currentFolderSelection, selectedItem, visibleItems]);

  useEffect(() => {
    if (!selectedItem || selectedItem.kind !== "file") {
      setFileDetail(null);
      setDetailError("");
      return;
    }

    const selectedFileId = selectedItem.id;
    let ignore = false;

    async function loadDetail() {
      setDetailLoading(true);
      setDetailError("");

      try {
        const response = await apiFetch<FileDetailResponse>(`/files/${selectedFileId}`);
        if (!ignore) {
          setFileDetail(response);
        }
      } catch (requestError) {
        if (!ignore) {
          setDetailError(requestError instanceof Error ? requestError.message : "文件详情加载失败");
          setFileDetail(null);
        }
      } finally {
        if (!ignore) {
          setDetailLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      ignore = true;
    };
  }, [selectedItem]);

  const selectionPayload = useMemo(() => buildSelectionPayload(selectedIds, visibleItems), [selectedIds, visibleItems]);
  const selectedFiles = useMemo(
    () =>
      selectionPayload.fileIds
        .map((id) => visibleFiles.find((file) => file.id === id))
        .filter((item): item is FileSummary => Boolean(item)),
    [selectionPayload.fileIds, visibleFiles]
  );
  const latestDeletedAt = useMemo(() => {
    if (!trashMode || !visibleFiles.length) {
      return null;
    }

    return (
      [...visibleFiles]
        .map((file) => file.deletedAt)
        .filter((value): value is string => Boolean(value))
        .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null
    );
  }, [trashMode, visibleFiles]);
  const trashRetentionSummary = useMemo(() => {
    if (!trashMode || !visibleFiles.length) {
      return {
        expiringSoonCount: 0,
        dueWithinDayCount: 0,
        earliestExpiresAt: null as string | null
      };
    }

    const remainingValues = visibleFiles
      .map((file) => ({
        retentionDaysRemaining: file.retentionDaysRemaining ?? Number.POSITIVE_INFINITY,
        retentionExpiresAt: file.retentionExpiresAt ?? null
      }))
      .filter((file) => Boolean(file.retentionExpiresAt));

    return {
      expiringSoonCount: remainingValues.filter(
        (file) => Number.isFinite(file.retentionDaysRemaining) && file.retentionDaysRemaining > 0 && file.retentionDaysRemaining <= 7
      ).length,
      dueWithinDayCount: remainingValues.filter(
        (file) => Number.isFinite(file.retentionDaysRemaining) && file.retentionDaysRemaining > 0 && file.retentionDaysRemaining <= 1
      ).length,
      earliestExpiresAt:
        remainingValues
          .map((file) => file.retentionExpiresAt)
          .filter((value): value is string => Boolean(value))
          .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0] ?? null
    };
  }, [trashMode, visibleFiles]);
  const deleteModalCopy = useMemo(() => describeDeleteAction(deleteTarget), [deleteTarget]);

  const currentViewMeta =
    library?.quickViews.find((item) => item.key === activeView) ??
    filesQuickViewMeta.filter((item) => item.key !== "trash" || canManageTrash).find((item) => item.key === activeView) ??
    filesQuickViewMeta.filter((item) => item.key !== "trash" || canManageTrash)[0];
  const selectedLibraryItem = selectedItem
    ? allItems.find((item) => item.id === selectedItem.id) ?? currentFolderSelection ?? null
    : null;
  const folderOptions = collectFolderOptions(library?.folderTree ?? []);
  const selectedFolderPath =
    selectedLibraryItem?.itemType === "folder" && library
      ? findFolderPath(library.folderTree, selectedLibraryItem.id)
      : [];
  const currentDirectoryLabel = library?.currentFolder?.name ?? currentViewMeta.label;
  const pendingReviewCount = library?.quickViews.find((item) => item.key === "pending-review")?.count ?? 0;
  const currentFolderLocationLabel = library?.currentFolder
    ? dedupeConsecutiveLabels([
        "档案中心",
        "根目录",
        ...((library?.breadcrumbs ?? []).map((item) => item.name)),
        library.currentFolder.name
      ]).join(" / ")
    : "档案中心 / 根目录";
  const currentLocationLabel = dedupeConsecutiveLabels([
    "档案中心",
    "根目录",
    ...((library?.breadcrumbs ?? []).map((item) => item.name)),
    currentDirectoryLabel
  ]).join(" / ");
  const advancedFilterCount = [
    tagFilter,
    relatedTypeFilter,
    uploaderFilter,
    trashMode ? deleteReasonFilter : "",
    updatedFrom,
    updatedTo,
    importantOnly ? "important" : ""
  ].filter(Boolean).length;

  function navigate(next: { view?: string | null; folder?: string | null }) {
    startTransition(() => {
      router.replace(
        buildFilesRoute({
          view: next.view ?? activeView,
          folder: next.folder ?? null
        }),
        { scroll: false }
      );
    });
  }

  function handleOpenFolder(folderId: string) {
    setSelectedItem({ kind: "folder", id: folderId });
    setSelectedIds([]);
    navigate({ view: "all", folder: folderId });
  }

  function openCreateFolder(parentId?: string | null) {
    setCreateFolderParentId(parentId ?? currentFolderId ?? null);
    setCreateFolderOpen(true);
  }

  function handleOpenRoot() {
    setSelectedItem(null);
    setSelectedIds([]);
    navigate({ view: "all", folder: null });
  }

  function handleQuickViewChange(view: FilesQuickViewKey) {
    setSelectedItem(null);
    setSelectedIds([]);
    navigate({ view, folder: null });
  }

  function resetAdvancedFilters() {
    setTagFilter("");
    setRelatedTypeFilter("");
    setUploaderFilter("");
    setDeleteReasonFilter("");
    setUpdatedFrom("");
    setUpdatedTo("");
    setImportantOnly(false);
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function handleSelectAll(checked: boolean) {
    setSelectedIds(checked ? visibleItems.map((item) => item.id) : []);
  }

  function handleToggleFavorite(id: string) {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      persistFavorites(next);
      return next;
    });
  }

  function handleOpenItem(item: SelectableLibraryItem) {
    if (item.itemType === "folder") {
      handleOpenFolder(item.id);
      return;
    }

    setSelectedItem({ kind: "file", id: item.id });
  }

  function openMetadataForSingle(item: SelectableLibraryItem) {
    if (item.itemType === "file") {
      setMetadataTarget({
        mode: "single",
        title: `编辑文件信息`,
        fileIds: [item.id],
        folderIds: [],
        category: item.category,
        tags: item.tags,
        status: item.status,
        isImportant: item.isImportant
      });
      return;
    }

    setMetadataTarget({
      mode: "single",
      title: `编辑资料夹信息`,
      fileIds: [],
      folderIds: [item.id],
      category: item.category,
      tags: item.tags
    });
  }

  async function refreshAndSelect(item?: { kind: "file" | "folder"; id: string } | null) {
    setRefreshKey((value) => value + 1);
    if (item) {
      setSelectedItem(item);
    }
  }

  async function handleBatchAction(
    action: "move" | "delete" | "archive" | "update_metadata" | "restore" | "purge" | "empty_trash",
    payload: Record<string, unknown>
  ) {
    const animatedIds =
      action === "delete" ||
      action === "archive" ||
      action === "restore" ||
      action === "purge" ||
      action === "empty_trash"
        ? action === "empty_trash"
          ? visibleItems.map((item) => item.id)
          : [...((payload.fileIds as string[] | undefined) ?? []), ...((payload.folderIds as string[] | undefined) ?? [])]
        : [];

    try {
      if (animatedIds.length) {
        setRemovingIds(animatedIds);
        await wait(180);
      }

      await apiFetch("/files/batch", {
        method: "POST",
        body: JSON.stringify({
          action,
          fileIds: payload.fileIds,
          folderIds: payload.folderIds,
          targetFolderId: payload.targetFolderId,
          category: payload.category,
          tagText: payload.tagText,
          isImportant: payload.isImportant,
          status: payload.status,
          deleteReason: payload.deleteReason
        })
      });

      if (action === "delete") {
        const fileCount = ((payload.fileIds as string[] | undefined) ?? []).length;
        const folderCount = ((payload.folderIds as string[] | undefined) ?? []).length;
        setToastMessage(
          fileCount > 0 && folderCount > 0
            ? "文件已移入回收区，空资料夹已删除。"
            : fileCount > 0
              ? "已移入回收区。"
              : "资料夹已删除。"
        );
      }
      if (action === "archive") {
        setToastMessage("已归档。");
      }
      if (action === "restore") {
        setToastMessage("已恢复到原目录。");
      }
      if (action === "purge") {
        setToastMessage("已彻底删除，无法恢复。");
      }
      if (action === "empty_trash") {
        setToastMessage("回收区已清空。");
      }

      setSelectedIds([]);
      setDeleteTarget(null);
      setArchiveTarget(null);
      setRestoreTarget(null);
      setPurgeTarget(null);
      setEmptyTrashOpen(false);
      setMoveTarget(null);
      setMetadataTarget(null);
      await refreshAndSelect(null);
    } catch (requestError) {
      setRemovingIds([]);
      throw requestError;
    } finally {
      setRemovingIds([]);
    }
  }

  return (
    <div className="workspace-stack files-workbench">
      <PageHeader
        eyebrow={trashMode ? "管理员工作区" : "正式资料工作区"}
        title="档案中心"
        description="管理正式资料、合同与归档文件，支持在线预览与业务关联。"
        meta={
          library
            ? [
                { label: "当前视图", value: currentViewMeta.label },
                { label: "可见项目", value: formatMetricNumber(visibleItems.length) },
                {
                  label: trashMode ? "待清理" : "待审核",
                  value: formatMetricNumber(
                    trashMode
                      ? library.quickViews.find((item) => item.key === "trash")?.count ?? 0
                      : pendingReviewCount
                  ),
                  tone: trashMode ? "danger" : "warning",
                },
              ]
            : undefined
        }
        actions={
          <div className="action-row files-header-actions">
            <button className="button inline files-header-actions__primary" onClick={() => setUploadOpen(true)} type="button">
              <UploadLineIcon />
              <span>上传文件</span>
            </button>
            <button className="button secondary inline files-header-actions__secondary" onClick={() => openCreateFolder()} type="button">
              <FolderPlusLineIcon />
              <span>新建资料夹</span>
            </button>
            <button className="button ghost inline files-header-actions__tertiary" onClick={() => setRefreshKey((value) => value + 1)} type="button">
              <RefreshLineIcon />
              <span>刷新清单</span>
            </button>
          </div>
        }
      />

      {!trashMode && library ? (
        <FilesOverviewStrip
          currentViewLabel={currentViewMeta.label}
          pendingReviewCount={pendingReviewCount}
          totalFiles={library.stats.totalFiles}
          visibleCount={visibleItems.length}
        />
      ) : null}

      <FilesGuideNotice onCreateFolder={() => openCreateFolder()} onUpload={() => setUploadOpen(true)} />

      <FilesToolbar
        breadcrumbs={library?.breadcrumbs ?? []}
        currentLabel={currentDirectoryLabel}
        keyword={keywordInput}
        onKeywordChange={setKeywordInput}
        category={categoryFilter}
        onCategoryChange={setCategoryFilter}
        tag={tagFilter}
        onTagChange={setTagFilter}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        relatedType={relatedTypeFilter}
        onRelatedTypeChange={setRelatedTypeFilter}
        uploaderKeyword={uploaderFilter}
        onUploaderKeywordChange={setUploaderFilter}
        updatedFrom={updatedFrom}
        onUpdatedFromChange={setUpdatedFrom}
        updatedTo={updatedTo}
        onUpdatedToChange={setUpdatedTo}
        importantOnly={importantOnly}
        onImportantOnlyChange={setImportantOnly}
        moreFiltersOpen={moreFiltersOpen}
        onToggleMoreFilters={() => setMoreFiltersOpen((current) => !current)}
        onResetMoreFilters={resetAdvancedFilters}
        advancedFilterCount={advancedFilterCount}
        hasActiveFilters={Boolean(
          keywordInput ||
            categoryFilter ||
            statusFilter ||
            tagFilter ||
            relatedTypeFilter ||
            uploaderFilter ||
            updatedFrom ||
            updatedTo ||
            importantOnly ||
            sortBy !== "updated_desc"
        )}
        onClearFilters={() => {
          setKeywordInput("");
          setCategoryFilter("");
          setStatusFilter("");
          setSortBy("updated_desc");
          resetAdvancedFilters();
          setMoreFiltersOpen(false);
        }}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          if (typeof window !== "undefined") {
            window.localStorage.setItem("huigui:files-view-mode", mode);
          }
        }}
        onNavigateRoot={handleOpenRoot}
        onNavigateFolder={handleOpenFolder}
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      <div className="files-layout">
        <aside className="files-left-panel">
          <FilesSidebar
            items={library?.quickViews ?? []}
            activeKey={activeView}
            onSelect={handleQuickViewChange}
            tree={library?.folderTree ?? []}
            activeFolderId={currentFolderId}
            onOpenFolder={handleOpenFolder}
            canManageTrash={canManageTrash}
          />
        </aside>

        <section className="files-center-panel">
          <div className="panel files-workspace-panel">
            <div className="files-workspace-stage" key={`${activeView}:${currentFolderId ?? "root"}`}>
              {trashMode ? (
                <TrashWorkspaceNotice
                  totalCount={visibleFiles.length}
                  selectedCount={selectedIds.length}
                  latestDeletedAt={latestDeletedAt}
                  expiringSoonCount={trashRetentionSummary.expiringSoonCount}
                  dueWithinDayCount={trashRetentionSummary.dueWithinDayCount}
                  earliestExpiresAt={trashRetentionSummary.earliestExpiresAt}
                  activeDeleteReason={deleteReasonFilter}
                  onDeleteReasonChange={setDeleteReasonFilter}
                  onBackToLibrary={() => handleQuickViewChange("all")}
                  onEmptyTrash={() => setEmptyTrashOpen(true)}
                />
              ) : null}
              <FilesListHeader
                eyebrow={trashMode ? "管理员工作区" : "Workspace"}
                currentLabel={currentDirectoryLabel}
                itemCount={visibleItems.length}
                folderCount={visibleFolders.length}
                fileCount={visibleFiles.length}
                selectedCount={selectedIds.length}
                sortLabel={fileSortOptions.find((option) => option.value === sortBy)?.label ?? "最近更新"}
                browseHint={
                  trashMode
                    ? "回收区中的文件仅管理员可见，可恢复到原目录，或彻底删除。"
                    : visibleFolders.length
                    ? "单击资料夹直接进入，复选框仅用于批量选择。"
                    : "选择文件后，可在右侧查看属性、版本与辅助操作。"
                }
                headerActions={
                  trashMode && visibleFiles.length ? (
                    <button className="button ghost inline" onClick={() => setEmptyTrashOpen(true)} type="button">
                      清空回收区
                    </button>
                  ) : null
                }
                bulkActions={
                  selectedIds.length ? (
                    trashMode ? (
                      <>
                        <button
                          className="button ghost inline"
                          onClick={() => selectedFiles.forEach((file) => window.open(file.fileUrl, "_blank", "noopener,noreferrer"))}
                          type="button"
                        >
                          下载
                        </button>
                        <button
                          className="button secondary inline"
                          onClick={() => setRestoreTarget(buildSelectionActionTarget(selectedIds, selectionPayload))}
                          type="button"
                        >
                          恢复
                        </button>
                        <button
                          className="button danger inline"
                          onClick={() => setPurgeTarget(buildSelectionActionTarget(selectedIds, selectionPayload))}
                          type="button"
                        >
                          彻底删除
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="button ghost inline"
                          onClick={() => selectedFiles.forEach((file) => window.open(file.fileUrl, "_blank", "noopener,noreferrer"))}
                          type="button"
                        >
                          下载
                        </button>
                        <button
                          className="button ghost inline"
                          onClick={() =>
                            setMoveTarget({
                              title: `移动已选 ${selectedIds.length} 项`,
                              fileIds: selectionPayload.fileIds,
                              folderIds: selectionPayload.folderIds
                            })
                          }
                          type="button"
                        >
                          移动
                        </button>
                        <button
                          className="button ghost inline"
                          onClick={() =>
                            setMetadataTarget({
                              mode: "batch",
                              title: `批量设置分类`,
                              fileIds: selectionPayload.fileIds,
                              folderIds: selectionPayload.folderIds
                            })
                          }
                          type="button"
                        >
                          设置分类
                        </button>
                        <button
                          className="button ghost inline"
                          onClick={() =>
                            setMetadataTarget({
                              mode: "batch",
                              title: `批量打标签`,
                              fileIds: selectionPayload.fileIds,
                              folderIds: selectionPayload.folderIds
                            })
                          }
                          type="button"
                        >
                          打标签
                        </button>
                        {selectionPayload.fileIds.length ? (
                          <button className="button ghost inline" onClick={() => setArchiveTarget(selectionPayload)} type="button">
                            归档
                          </button>
                        ) : null}
                        <button
                          className="button danger inline"
                          onClick={() => setDeleteTarget(buildSelectionActionTarget(selectedIds, selectionPayload))}
                          type="button"
                        >
                          {selectionPayload.fileIds.length && !selectionPayload.folderIds.length ? "移入回收区" : "删除"}
                        </button>
                      </>
                    )
                  ) : null
                }
              />

              {loading ? (
                <FilesTableSkeleton />
              ) : visibleItems.length ? (
                viewMode === "table" ? (
                  <FileTable
                    items={visibleItems}
                    selectedIds={selectedIds}
                    favorites={favorites}
                    highlightedId={highlightedItemId}
                    removingIds={removingIds}
                    activeId={selectedItem?.id ?? null}
                    onSelect={toggleSelection}
                    onOpenItem={handleOpenItem}
                    onSelectAll={handleSelectAll}
                    allSelected={Boolean(visibleItems.length) && selectedIds.length === visibleItems.length}
                    trashMode={trashMode}
                    onRename={(item) =>
                      setRenameTarget({
                        kind: item.itemType,
                        id: item.id,
                        name: item.itemType === "file" ? item.fileName : item.name
                      })
                    }
                    onMove={(item) =>
                      setMoveTarget({
                        title: `移动${item.itemType === "file" ? "文件" : "资料夹"}`,
                        fileIds: item.itemType === "file" ? [item.id] : [],
                        folderIds: item.itemType === "folder" ? [item.id] : [],
                        currentFolderId: item.itemType === "file" ? item.folderId : item.parentId
                      })
                    }
                    onEditMetadata={openMetadataForSingle}
                    onDelete={(item) => setDeleteTarget(buildDeleteActionTarget(item))}
                    onArchive={(item) =>
                      item.itemType === "file" ? setArchiveTarget({ fileIds: [item.id], folderIds: [] }) : null
                    }
                    onRestore={(item) =>
                      item.itemType === "file"
                        ? setRestoreTarget({ title: `恢复文件`, fileIds: [item.id], folderIds: [] })
                        : null
                    }
                    onPermanentDelete={(item) =>
                      item.itemType === "file"
                        ? setPurgeTarget({ title: `彻底删除文件`, fileIds: [item.id], folderIds: [] })
                        : null
                    }
                    onToggleFavorite={handleToggleFavorite}
                    onOpenVersion={(item) => {
                      if (item.itemType === "file") {
                        setVersionTarget(item);
                      }
                    }}
                  />
                ) : (
                  <FileGrid
                    items={visibleItems}
                    selectedIds={selectedIds}
                    favorites={favorites}
                    highlightedId={highlightedItemId}
                    removingIds={removingIds}
                    activeId={selectedItem?.id ?? null}
                    onSelect={toggleSelection}
                    onOpenItem={handleOpenItem}
                    onRename={(item) =>
                      setRenameTarget({
                        kind: item.itemType,
                        id: item.id,
                        name: item.itemType === "file" ? item.fileName : item.name
                      })
                    }
                    onEditMetadata={openMetadataForSingle}
                    onDelete={(item) => setDeleteTarget(buildDeleteActionTarget(item))}
                    trashMode={trashMode}
                    onRestore={(item) =>
                      item.itemType === "file"
                        ? setRestoreTarget({ title: `恢复文件`, fileIds: [item.id], folderIds: [] })
                        : null
                    }
                    onPermanentDelete={(item) =>
                      item.itemType === "file"
                        ? setPurgeTarget({ title: `彻底删除文件`, fileIds: [item.id], folderIds: [] })
                        : null
                    }
                    onToggleFavorite={handleToggleFavorite}
                  />
                )
              ) : (
                <FilesEmptyState
                  title={
                    trashMode
                      ? "回收区暂时为空"
                      : deferredKeyword || advancedFilterCount
                        ? "没有找到匹配的档案"
                        : "当前目录还没有文件"
                  }
                  description={
                    trashMode
                      ? "移入回收区的文件会先保留在这里，仅管理员可以恢复或彻底删除。"
                      : deferredKeyword || advancedFilterCount
                      ? "可以试试更换关键词，或调整分类、状态和标签筛选条件。"
                      : "你可以先新建资料夹，或直接上传合同、培训资料、交付文件等正式档案。"
                  }
                  variant={trashMode || deferredKeyword || advancedFilterCount ? "search" : "folder"}
                  primaryActionText={trashMode ? "返回全部文件" : "上传文件"}
                  onPrimaryAction={() => (trashMode ? handleQuickViewChange("all") : setUploadOpen(true))}
                  secondaryActionText={trashMode ? undefined : "新建资料夹"}
                  onSecondaryAction={() => (trashMode ? undefined : openCreateFolder())}
                />
              )}

              {visibleItems.length > 0 && visibleItems.length <= 2 && !deferredKeyword && !advancedFilterCount && !trashMode ? (
                <FilesSparseHint
                  currentLabel={currentDirectoryLabel}
                  onCreateFolder={() => openCreateFolder()}
                  onUpload={() => setUploadOpen(true)}
                />
              ) : null}
            </div>
          </div>
        </section>

        <aside className="files-right-panel">
          <FilesInspector
            key={selectedItem ? `${selectedItem.kind}:${selectedItem.id}` : "empty"}
            item={selectedLibraryItem}
            file={selectedLibraryItem?.itemType === "file" ? fileDetail?.file ?? selectedLibraryItem : null}
            breadcrumbs={fileDetail?.breadcrumbs ?? []}
            folderPath={selectedFolderPath}
            activityLogs={fileDetail?.activityLogs ?? []}
            loading={detailLoading}
            error={detailError}
            onOpenFolder={(folderId) => handleOpenFolder(folderId)}
            onCreateChildFolder={(folderId) => openCreateFolder(folderId)}
            onRename={(item) =>
              setRenameTarget({
                kind: item.itemType,
                id: item.id,
                name: item.itemType === "file" ? item.fileName : item.name
              })
            }
            onMove={(item) =>
              setMoveTarget({
                title: `移动${item.itemType === "file" ? "文件" : "资料夹"}`,
                fileIds: item.itemType === "file" ? [item.id] : [],
                folderIds: item.itemType === "folder" ? [item.id] : [],
                currentFolderId: item.itemType === "file" ? item.folderId : item.parentId
              })
            }
            onDelete={(item) =>
              setDeleteTarget(buildDeleteActionTarget(item))
            }
            onArchive={(item) =>
              item.itemType === "file" ? setArchiveTarget({ fileIds: [item.id], folderIds: [] }) : null
            }
            trashMode={trashMode}
            onRestore={(item) =>
              item.itemType === "file"
                ? setRestoreTarget({ title: `恢复文件`, fileIds: [item.id], folderIds: [] })
                : null
            }
            onPermanentDelete={(item) =>
              item.itemType === "file"
                ? setPurgeTarget({ title: `彻底删除文件`, fileIds: [item.id], folderIds: [] })
                : null
            }
          />
        </aside>
      </div>

      {toastMessage ? (
        <div aria-live="polite" className="files-toast" role="status">
          {toastMessage}
        </div>
      ) : null}

      <CreateFolderModal
        open={createFolderOpen}
        parentFolderId={createFolderParentId ?? currentFolderId}
        currentLocationLabel={currentFolderLocationLabel}
        folderOptions={folderOptions}
        folderTree={library?.folderTree ?? []}
        onClose={() => {
          setCreateFolderOpen(false);
          setCreateFolderParentId(null);
        }}
        onCreated={async (folder) => {
          setCreateFolderOpen(false);
          setCreateFolderParentId(null);
          setToastMessage("资料夹已创建。");
          if (folder.parentId === currentFolderId) {
            setHighlightedItemId(folder.id);
            await refreshAndSelect({ kind: "folder", id: folder.id });
            return;
          }

          if (selectedItem?.kind === "folder" && selectedItem.id === folder.parentId) {
            await refreshAndSelect({ kind: "folder", id: selectedItem.id });
            return;
          }

          await refreshAndSelect(null);
        }}
      />

      <UploadFilesDrawer
        open={uploadOpen}
        folderId={currentFolderId}
        currentLocationLabel={currentFolderLocationLabel}
        folderOptions={folderOptions}
        folderTree={library?.folderTree ?? []}
        onClose={() => setUploadOpen(false)}
        onUploaded={async ({ fileIds, targetFolderId, keepOpen }) => {
          if (!keepOpen) {
            setUploadOpen(false);
          }
          setToastMessage(
            keepOpen
              ? `已上传 ${fileIds.length} 个文件，部分文件上传失败。`
              : fileIds.length > 1
                ? `已上传 ${fileIds.length} 个文件。`
                : "文件上传成功。"
          );

          const firstFileId = fileIds[0];
          if (firstFileId && targetFolderId === currentFolderId) {
            setHighlightedItemId(firstFileId);
            await refreshAndSelect({ kind: "file", id: firstFileId });
            return;
          }

          await refreshAndSelect(null);
        }}
      />

      <RenameItemModal
        open={Boolean(renameTarget)}
        target={renameTarget}
        onClose={() => setRenameTarget(null)}
        onSaved={async () => {
          setRenameTarget(null);
          setToastMessage("名称已更新。");
          await refreshAndSelect(renameTarget ? { kind: renameTarget.kind, id: renameTarget.id } : null);
        }}
      />

      <MoveItemsModal
        open={Boolean(moveTarget)}
        target={moveTarget}
        folderOptions={folderOptions}
        onClose={() => setMoveTarget(null)}
        onMoved={async () => {
          setMoveTarget(null);
          setToastMessage("已移动到新目录。");
          await refreshAndSelect(null);
        }}
      />

      <EditMetadataModal
        open={Boolean(metadataTarget)}
        target={metadataTarget}
        onClose={() => setMetadataTarget(null)}
        onSaved={async () => {
          setMetadataTarget(null);
          setToastMessage("已保存档案设置。");
          await refreshAndSelect(selectedItem);
        }}
      />

      <ConfirmFilesModal
        open={Boolean(deleteTarget)}
        tone="danger"
        title={deleteModalCopy.title}
        description={deleteModalCopy.description}
        confirmText={deleteModalCopy.confirmText}
        reasonMode={deleteTarget?.fileIds.length ? "optional" : "none"}
        reasonLabel="删除原因"
        reasonHelperText={
          deleteTarget?.fileIds.length
            ? "删除原因会记录到移入回收区的文件中；不填写时，系统会默认记为“成员手动删除”。"
            : "资料夹会被直接删除，不进入回收区。"
        }
        reasonPresets={DELETE_REASON_OPTIONS}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async (deleteReason) => {
          if (!deleteTarget) return;
          await handleBatchAction("delete", { ...deleteTarget, deleteReason });
        }}
      />

      <ConfirmFilesModal
        open={Boolean(archiveTarget)}
        tone="neutral"
        title="确认归档这些档案吗？"
        description="归档后，文件仍可查看，但会从活跃清单中移出。"
        confirmText="确认归档"
        onClose={() => setArchiveTarget(null)}
        onConfirm={async () => {
          if (!archiveTarget) return;
          await handleBatchAction("archive", archiveTarget);
        }}
      />

      <ConfirmFilesModal
        open={Boolean(restoreTarget)}
        tone="neutral"
        title="确认恢复这些文件吗？"
        description="恢复后，文件会回到原目录，并重新出现在正常浏览列表中。"
        confirmText="恢复文件"
        onClose={() => setRestoreTarget(null)}
        onConfirm={async () => {
          if (!restoreTarget) return;
          await handleBatchAction("restore", restoreTarget);
        }}
      />

      <ConfirmFilesModal
        open={Boolean(purgeTarget)}
        tone="danger"
        title="确认彻底删除这些文件吗？"
        description="彻底删除后，文件会从回收区和存储中移除，无法再恢复。"
        confirmText="彻底删除"
        reasonMode="required"
        reasonLabel="彻底删除原因"
        reasonHelperText="这是不可恢复操作，原因会写入管理操作日志。"
        reasonPresets={PERMANENT_DELETE_REASON_OPTIONS}
        onClose={() => setPurgeTarget(null)}
        onConfirm={async (deleteReason) => {
          if (!purgeTarget) return;
          await handleBatchAction("purge", { ...purgeTarget, deleteReason });
        }}
      />

      <ConfirmFilesModal
        open={emptyTrashOpen}
        tone="danger"
        title="确认清空回收区吗？"
        description="清空后，回收区中的文件会被彻底删除，且无法恢复。"
        confirmText="清空回收区"
        reasonMode="required"
        reasonLabel="清空原因"
        reasonHelperText="建议只在确认所有文件都不再需要时执行，原因会写入管理操作日志。"
        reasonPresets={PERMANENT_DELETE_REASON_OPTIONS}
        onClose={() => setEmptyTrashOpen(false)}
        onConfirm={async (deleteReason) => {
          await handleBatchAction("empty_trash", { deleteReason });
        }}
      />

      <UploadNewVersionDrawer
        open={Boolean(versionTarget)}
        target={versionTarget}
        onClose={() => setVersionTarget(null)}
        onUploaded={async (fileId) => {
          setVersionTarget(null);
          await refreshAndSelect(fileId ? { kind: "file", id: fileId } : selectedItem);
        }}
      />
    </div>
  );
}

export function FilesToolbar({
  breadcrumbs,
  currentLabel,
  keyword,
  onKeywordChange,
  category,
  onCategoryChange,
  tag,
  onTagChange,
  status,
  onStatusChange,
  relatedType,
  onRelatedTypeChange,
  uploaderKeyword,
  onUploaderKeywordChange,
  updatedFrom,
  onUpdatedFromChange,
  updatedTo,
  onUpdatedToChange,
  importantOnly,
  onImportantOnlyChange,
  moreFiltersOpen,
  onToggleMoreFilters,
  onResetMoreFilters,
  advancedFilterCount,
  hasActiveFilters,
  onClearFilters,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  onNavigateRoot,
  onNavigateFolder
}: {
  breadcrumbs: FolderSummary[];
  currentLabel: string;
  keyword: string;
  onKeywordChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  tag: string;
  onTagChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  relatedType: string;
  onRelatedTypeChange: (value: string) => void;
  uploaderKeyword: string;
  onUploaderKeywordChange: (value: string) => void;
  updatedFrom: string;
  onUpdatedFromChange: (value: string) => void;
  updatedTo: string;
  onUpdatedToChange: (value: string) => void;
  importantOnly: boolean;
  onImportantOnlyChange: (value: boolean) => void;
  moreFiltersOpen: boolean;
  onToggleMoreFilters: () => void;
  onResetMoreFilters: () => void;
  advancedFilterCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  viewMode: FilesViewMode;
  onViewModeChange: (value: FilesViewMode) => void;
  onNavigateRoot: () => void;
  onNavigateFolder: (folderId: string) => void;
}) {
  const normalizedBreadcrumbs = breadcrumbs.filter(
    (item, index) => !(index === breadcrumbs.length - 1 && item.name === currentLabel)
  );

  return (
    <section className="files-toolbar panel">
      <div className="files-toolbar__primary">
        <div className="files-toolbar__crumbs">
          <button className="files-breadcrumb" onClick={onNavigateRoot} type="button">
            档案中心
          </button>
          {normalizedBreadcrumbs.map((item) => (
            <button className="files-breadcrumb" key={item.id} onClick={() => onNavigateFolder(item.id)} type="button">
              {item.name}
            </button>
          ))}
          <span className="files-breadcrumb current">{currentLabel}</span>
        </div>

        <label className="files-toolbar__search">
          <SearchLineIcon />
          <input
            placeholder="搜索文件名、资料夹、标签或上传人"
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
          />
        </label>

        <div className="files-toolbar__tools">
          <div className="files-toolbar__popover-wrap">
            <button className={cn("button ghost inline", moreFiltersOpen && "active")} onClick={onToggleMoreFilters} type="button">
              更多筛选{advancedFilterCount ? ` · ${advancedFilterCount}` : ""}
            </button>
            {moreFiltersOpen ? (
              <div className="files-toolbar__popover">
                <label>
                  <span>标签</span>
                  <input placeholder="标签筛选" value={tag} onChange={(event) => onTagChange(event.target.value)} />
                </label>
                <label>
                  <span>上传人</span>
                  <input
                    placeholder="按上传人名称筛选"
                    value={uploaderKeyword}
                    onChange={(event) => onUploaderKeywordChange(event.target.value)}
                  />
                </label>
                <label>
                  <span>关联对象</span>
                  <input
                    placeholder="选择客户、报价或项目（选填）"
                    value={relatedType}
                    onChange={(event) => onRelatedTypeChange(event.target.value)}
                  />
                </label>
                <label>
                  <span>开始时间</span>
                  <input type="date" value={updatedFrom} onChange={(event) => onUpdatedFromChange(event.target.value)} />
                </label>
                <label>
                  <span>结束时间</span>
                  <input type="date" value={updatedTo} onChange={(event) => onUpdatedToChange(event.target.value)} />
                </label>
                <label className="checkbox-row files-toolbar__checkbox">
                  <input checked={importantOnly} onChange={(event) => onImportantOnlyChange(event.target.checked)} type="checkbox" />
                  <span>仅看重要文件</span>
                </label>
                <div className="files-toolbar__popover-actions">
                  <button className="button ghost inline" onClick={onResetMoreFilters} type="button">
                    清空高级筛选
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="files-view-switch">
            <button
              className={cn("button ghost inline", viewMode === "table" && "active")}
              onClick={() => onViewModeChange("table")}
              type="button"
            >
              列表
            </button>
            <button
              className={cn("button ghost inline", viewMode === "grid" && "active")}
              onClick={() => onViewModeChange("grid")}
              type="button"
            >
              卡片
            </button>
          </div>
        </div>
      </div>

      <div className="files-toolbar__secondary">

        <select value={category} onChange={(event) => onCategoryChange(event.target.value)}>
          <option value="">全部分类</option>
          {fileCategoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select value={status} onChange={(event) => onStatusChange(event.target.value)}>
          <option value="">全部状态</option>
          {fileStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select value={sortBy} onChange={(event) => onSortChange(event.target.value)}>
          {fileSortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {hasActiveFilters ? (
          <button className="button ghost inline" onClick={onClearFilters} type="button">
            清空筛选
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function FilesSidebar({
  items,
  activeKey,
  onSelect,
  tree,
  activeFolderId,
  onOpenFolder,
  canManageTrash
}: {
  items: Array<{ key: FilesQuickViewKey; label: string; count: number }>;
  activeKey: FilesQuickViewKey;
  onSelect: (key: FilesQuickViewKey) => void;
  tree: FolderTreeNode[];
  activeFolderId?: string | null;
  onOpenFolder: (folderId: string) => void;
  canManageTrash: boolean;
}) {
  const [foldersExpanded, setFoldersExpanded] = useState(true);
  const mergedItems = filesQuickViewMeta
    .filter((meta) => meta.key !== "trash" || canManageTrash)
    .map((meta) => ({
      ...meta,
      count: items.find((item) => item.key === meta.key)?.count ?? 0
    }));
  const groups: Array<{ title: string; keys: FilesQuickViewKey[] }> = [
    { title: "浏览", keys: ["all", "recent", "mine", "favorites"] },
    { title: "状态", keys: ["archived", "important", "pending-review", "trash"] },
    { title: "共享", keys: ["shared"] }
  ];
  const iconMap: Record<FilesQuickViewKey, ReactNode> = {
    all: <StackFilesLineIcon />,
    recent: <ClockLineIcon />,
    mine: <UploadLineIcon />,
    favorites: <StarLineIcon />,
    archived: <ArchiveLineIcon />,
    important: <FlagLineIcon />,
    "pending-review": <ClockLineIcon />,
    shared: <ShareLineIcon />,
    trash: <TrashLineIcon />
  };

  return (
    <div className="files-sidebar">
      <div className="files-sidebar__context">
        <span>档案视图</span>
        <strong>更像企业工作台的导航</strong>
      </div>

      {groups.map((group) => (
        <section className="files-sidebar__group" key={group.title}>
          <div className="files-sidebar__heading">{group.title}</div>
          <div className="files-sidebar__list">
            {group.keys.map((key) => {
              const item = mergedItems.find((candidate) => candidate.key === key);
              if (!item) {
                return null;
              }

              return (
                <button
                  className={cn("files-sidebar__item", activeKey === item.key && "active")}
                  key={item.key}
                  onClick={() => onSelect(item.key)}
                  type="button"
                >
                  <span className="files-sidebar__icon">{iconMap[item.key]}</span>
                  <span className="files-sidebar__label">{item.label}</span>
                  {item.count > 0 ? <span className="files-sidebar__count">{item.count}</span> : null}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <section className="files-sidebar__group">
        <button className="files-sidebar__toggle" onClick={() => setFoldersExpanded((current) => !current)} type="button">
          <span>目录浏览</span>
          <span>{foldersExpanded ? "收起" : "展开"}</span>
        </button>

        {foldersExpanded ? (
          tree.length ? (
            <div className="folder-tree slim">
              {tree.map((node) => (
                <FolderTreeNodeRow
                  activeFolderId={activeFolderId}
                  key={node.id}
                  node={node}
                  onOpenFolder={onOpenFolder}
                />
              ))}
            </div>
          ) : (
            <div className="files-sidebar__empty small muted">常用目录会显示在这里。</div>
          )
        ) : null}
      </section>
    </div>
  );
}

function FolderTreeNodeRow({
  node,
  activeFolderId,
  onOpenFolder,
  depth = 0
}: {
  node: FolderTreeNode;
  activeFolderId?: string | null;
  onOpenFolder: (folderId: string) => void;
  depth?: number;
}) {
  return (
    <div className="folder-tree__node">
      <button
        className={cn("folder-tree__button", activeFolderId === node.id && "active")}
        onClick={() => onOpenFolder(node.id)}
        style={{ paddingLeft: `${10 + depth * 14}px` }}
        type="button"
      >
        <span className="folder-tree__label">
          <span className="folder-tree__glyph">
            <FolderLineIcon />
          </span>
          <span>{node.name}</span>
        </span>
        <small>{node.itemCount}</small>
      </button>

      {node.children.length ? (
        <div className="folder-tree__children">
          {node.children.map((child) => (
            <FolderTreeNodeRow
              activeFolderId={activeFolderId}
              depth={depth + 1}
              key={child.id}
              node={child}
              onOpenFolder={onOpenFolder}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FilesListHeader({
  eyebrow,
  currentLabel,
  itemCount,
  folderCount,
  fileCount,
  selectedCount,
  sortLabel,
  browseHint,
  bulkActions,
  headerActions
}: {
  eyebrow?: string;
  currentLabel: string;
  itemCount: number;
  folderCount: number;
  fileCount: number;
  selectedCount: number;
  sortLabel: string;
  browseHint?: string;
  bulkActions?: ReactNode;
  headerActions?: ReactNode;
}) {
  return (
    <div className="files-list-shell">
      <section className="files-list-header">
        <div className="files-list-header__summary">
          <div className="files-list-header__copy">
            {eyebrow ? <span className="files-list-header__eyebrow">{eyebrow}</span> : null}
            <strong>{currentLabel}</strong>
            {browseHint ? <p className="files-list-header__note">{browseHint}</p> : null}
          </div>
          <div className="files-list-header__meta">
            <span>共 {itemCount} 项</span>
            <span>文件夹 {folderCount}</span>
            <span>文件 {fileCount}</span>
            <span>排序：{sortLabel}</span>
          </div>
        </div>
        {headerActions ? <div className="action-row files-list-header__actions">{headerActions}</div> : null}
      </section>
      {selectedCount ? (
        <section className="files-bulkbar">
          <div className="files-bulkbar__summary">已选择 {selectedCount} 项</div>
          <div className="action-row files-bulkbar__actions">{bulkActions}</div>
        </section>
      ) : null}
    </div>
  );
}

function FilesTableSkeleton() {
  return (
    <div className="files-workspace-state files-skeleton-table" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="files-skeleton-table__row" key={`files-skeleton-row-${index}`}>
          <span className="files-skeleton files-skeleton--checkbox" />
          <span className="files-skeleton files-skeleton--name" />
          <span className="files-skeleton files-skeleton--meta" />
          <span className="files-skeleton files-skeleton--meta" />
          <span className="files-skeleton files-skeleton--meta" />
          <span className="files-skeleton files-skeleton--meta" />
          <span className="files-skeleton files-skeleton--meta" />
          <span className="files-skeleton files-skeleton--meta" />
          <span className="files-skeleton files-skeleton--meta" />
        </div>
      ))}
    </div>
  );
}

function fileTypeDisplayLabel(item: FileSummary) {
  switch (fileTypeKey(item)) {
    case "pdf":
      return "PDF 文档";
    case "word":
      return "Word 文档";
    case "excel":
      return "Excel 表格";
    case "ppt":
      return "PPT 演示稿";
    case "image":
      return "图片文件";
    case "video":
      return "视频文件";
    case "audio":
      return "音频文件";
    case "zip":
      return "压缩文件";
    default:
      return item.fileType || "普通文件";
  }
}

function buildTableItemMeta(item: SelectableLibraryItem) {
  if (item.itemType === "folder") {
    return `${item.childFolderCount} 个子资料夹 / ${item.fileCount} 个文件`;
  }

  if (item.note?.trim()) {
    return item.note.trim();
  }

  if (item.relatedEntity?.name) {
    return `${fileTypeDisplayLabel(item)} · ${item.relatedEntity.name}`;
  }

  return `${fileTypeDisplayLabel(item)} · 版本 V${item.versionNumber}`;
}

function buildTableSizeOrCount(item: SelectableLibraryItem) {
  return item.itemType === "file"
    ? formatFileSize(item.fileSizeBytes)
    : `${item.itemCount} 项`;
}

export function FileTable({
  items,
  selectedIds,
  favorites,
  highlightedId,
  removingIds,
  activeId,
  onSelect,
  onSelectAll,
  allSelected,
  onOpenItem,
  onRename,
  onMove,
  onEditMetadata,
  onDelete,
  onArchive,
  trashMode = false,
  onRestore,
  onPermanentDelete,
  onToggleFavorite,
  onOpenVersion
}: {
  items: SelectableLibraryItem[];
  selectedIds: string[];
  favorites: string[];
  highlightedId?: string | null;
  removingIds?: string[];
  activeId?: string | null;
  onSelect: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  allSelected: boolean;
  onOpenItem: (item: SelectableLibraryItem) => void;
  onRename: (item: SelectableLibraryItem) => void;
  onMove: (item: SelectableLibraryItem) => void;
  onEditMetadata: (item: SelectableLibraryItem) => void;
  onDelete: (item: SelectableLibraryItem) => void;
  onArchive: (item: SelectableLibraryItem) => void;
  trashMode?: boolean;
  onRestore?: (item: SelectableLibraryItem) => void;
  onPermanentDelete?: (item: SelectableLibraryItem) => void;
  onToggleFavorite: (id: string) => void;
  onOpenVersion: (item: SelectableLibraryItem) => void;
}) {
  return (
    <DataTable className="files-table">
      <colgroup>
        <col className="files-table__col files-table__col--select" />
        <col className="files-table__col files-table__col--name" />
        <col className="files-table__col files-table__col--category" />
        <col className="files-table__col files-table__col--tags" />
        <col className="files-table__col files-table__col--size" />
        <col className="files-table__col files-table__col--updated" />
        <col className="files-table__col files-table__col--uploader" />
        <col className="files-table__col files-table__col--status" />
        <col className="files-table__col files-table__col--actions" />
      </colgroup>
      <thead>
        <tr>
          <th className="files-table__select-col">
            <input
              aria-label="全选档案"
              checked={allSelected}
              onChange={(event) => onSelectAll(event.target.checked)}
              type="checkbox"
            />
          </th>
          <th className="files-table__name-col">名称</th>
          <th className="files-table__category-col">分类</th>
          <th className="files-table__tags-col">标签</th>
          <th className="files-table__size-col">数量 / 大小</th>
          <th className="files-table__updated-col">{trashMode ? "移入时间" : "更新时间"}</th>
          <th className="files-table__uploader-col">{trashMode ? "删除人" : "上传人"}</th>
          <th className="files-table__status-col">状态</th>
          <th className="files-table__actions-col">操作</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const checked = selectedIds.includes(item.id);
          const isFavorite = favorites.includes(item.id);
          const name = item.itemType === "file" ? item.fileName : item.name;
          const meta = buildTableItemMeta(item);

          return (
            <tr
              className={cn(
                "files-row",
                item.itemType === "folder" && "is-folder",
                checked && "is-selected",
                activeId === item.id && "is-active",
                removingIds?.includes(item.id) && "is-removing",
                highlightedId === item.id && "is-highlighted"
              )}
              key={item.id}
              onClick={() => onOpenItem(item)}
            >
              <td className="files-table__select-col" onClick={(event) => event.stopPropagation()}>
                <input checked={checked} onChange={() => onSelect(item.id)} type="checkbox" />
              </td>
              <td className="files-table__name-col">
                <button
                  className={cn("files-name-cell", item.itemType === "folder" && "is-folder")}
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenItem(item);
                  }}
                  type="button"
                >
                  <span className="files-name-cell__icon">
                    <FileTypeIcon item={item} />
                  </span>
                  <span className="files-name-cell__copy">
                    <strong title={name}>{name}</strong>
                    <small title={meta}>{meta}</small>
                  </span>
                </button>
              </td>
              <td className="files-table__category-col">{fileCategoryLabel(item.category)}</td>
              <td className="files-table__tags-col">
                <TagGroup maxVisible={2} tags={item.tags} />
              </td>
              <td className="files-table__size-col">{buildTableSizeOrCount(item)}</td>
              <td className="files-table__updated-col">
                {formatFileDate(trashMode && item.itemType === "file" ? item.deletedAt ?? item.updatedAt : item.updatedAt)}
              </td>
              <td className="files-table__uploader-col">
                {item.itemType === "file" ? (
                  trashMode ? (
                    item.deletedBy?.name || <span className="files-table__placeholder">历史记录未保留</span>
                  ) : (
                    item.uploader.name
                  )
                ) : (
                  <span className="files-table__placeholder">--</span>
                )}
              </td>
              <td className="files-table__status-col">
                {trashMode && item.itemType === "file" ? (
                  <StatusBadge tone="danger">回收中</StatusBadge>
                ) : item.itemType === "file" ? (
                  <FileStatusBadge status={item.status} />
                ) : (
                  <StatusBadge>资料夹</StatusBadge>
                )}
              </td>
              <td className="files-table__actions-col" onClick={(event) => event.stopPropagation()}>
                <FileRowActions
                  item={item}
                  isFavorite={isFavorite}
                  onToggleFavorite={() => onToggleFavorite(item.id)}
                  onOpen={() => onOpenItem(item)}
                  onRename={() => onRename(item)}
                  onMove={() => onMove(item)}
                  onEditMetadata={() => onEditMetadata(item)}
                  onDelete={() => onDelete(item)}
                  onArchive={() => onArchive(item)}
                  trashMode={trashMode}
                  onRestore={onRestore ? () => onRestore(item) : undefined}
                  onPermanentDelete={onPermanentDelete ? () => onPermanentDelete(item) : undefined}
                  onOpenVersion={() => onOpenVersion(item)}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}

export function FileGrid({
  items,
  selectedIds,
  favorites,
  highlightedId,
  removingIds,
  activeId,
  onSelect,
  onOpenItem,
  onRename,
  onEditMetadata,
  onDelete,
  trashMode = false,
  onRestore,
  onPermanentDelete,
  onToggleFavorite
}: {
  items: SelectableLibraryItem[];
  selectedIds: string[];
  favorites: string[];
  highlightedId?: string | null;
  removingIds?: string[];
  activeId?: string | null;
  onSelect: (id: string) => void;
  onOpenItem: (item: SelectableLibraryItem) => void;
  onRename: (item: SelectableLibraryItem) => void;
  onEditMetadata: (item: SelectableLibraryItem) => void;
  onDelete: (item: SelectableLibraryItem) => void;
  trashMode?: boolean;
  onRestore?: (item: SelectableLibraryItem) => void;
  onPermanentDelete?: (item: SelectableLibraryItem) => void;
  onToggleFavorite: (id: string) => void;
}) {
  return (
    <div className="files-grid">
      {items.map((item) => {
        const checked = selectedIds.includes(item.id);
        const name = item.itemType === "file" ? item.fileName : item.name;
        const gridEyebrow =
          item.itemType === "folder" ? "资料夹浏览" : fileTypeDisplayLabel(item);
        const gridSummary =
          item.itemType === "folder"
            ? `${item.childFolderCount} 个子资料夹 · ${item.fileCount} 个文件`
            : buildTableItemMeta(item);
        const gridMeta =
          item.itemType === "folder"
            ? [`分类：${fileCategoryLabel(item.category)}`, `更新于 ${formatFileDate(item.updatedAt)}`]
            : trashMode
              ? [
                  `${item.deletedBy?.name ?? "历史记录未保留"} · ${formatTrashRetentionLabel(item)}`,
                  `移入于 ${formatFileDate(item.deletedAt ?? item.updatedAt)}`
                ]
              : [`${fileCategoryLabel(item.category)} · ${formatFileSize(item.fileSizeBytes)}`, `更新于 ${formatFileDate(item.updatedAt)}`];

        return (
          <article
            className={cn(
              "files-grid-card",
              item.itemType === "folder" && "is-folder",
              checked && "is-selected",
              activeId === item.id && "is-active",
              removingIds?.includes(item.id) && "is-removing",
              highlightedId === item.id && "is-highlighted"
            )}
            key={item.id}
            onClick={() => onOpenItem(item)}
          >
            <div className="files-grid-card__top">
              <label className="checkbox-row" onClick={(event) => event.stopPropagation()}>
                <input checked={checked} onChange={() => onSelect(item.id)} type="checkbox" />
              </label>
              <button
                aria-label={favorites.includes(item.id) ? "取消收藏" : "加入收藏"}
                className={cn("icon-button files-grid-card__favorite", favorites.includes(item.id) && "active")}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleFavorite(item.id);
                }}
                type="button"
              >
                <StarLineIcon size={16} />
              </button>
            </div>

            <button
              className={cn("files-grid-card__body", item.itemType === "folder" && "is-folder")}
              onClick={(event) => {
                event.stopPropagation();
                onOpenItem(item);
              }}
              type="button"
            >
              <div className={cn("files-grid-card__cover", item.itemType === "folder" && "is-folder")}>
                <FileTypeIcon item={item} large />
                <span className="files-grid-card__cover-hint">
                  {item.itemType === "folder" ? "单击进入资料夹" : "单击查看属性"}
                </span>
              </div>

              <div className="files-grid-card__copy">
                <span className="files-grid-card__eyebrow">{gridEyebrow}</span>
                <strong>{name}</strong>
                <p>{gridSummary}</p>
              </div>

              <div className="files-grid-card__meta">
                {gridMeta.map((meta) => (
                  <span key={`${item.id}-${meta}`}>{meta}</span>
                ))}
              </div>
            </button>

            <div className="files-grid-card__footer" onClick={(event) => event.stopPropagation()}>
              <TagGroup tags={item.tags} maxVisible={2} />
              <ActionMenu
                items={
                  trashMode
                    ? [
                        { label: "查看属性", onClick: () => onOpenItem(item) },
                        { label: "恢复", onClick: () => onRestore?.(item) },
                        { label: "彻底删除", onClick: () => onPermanentDelete?.(item), tone: "danger" as const }
                      ]
                    : [
                        { label: item.itemType === "folder" ? "打开" : "查看属性", onClick: () => onOpenItem(item) },
                        { label: "重命名", onClick: () => onRename(item) },
                        { label: "编辑标签", onClick: () => onEditMetadata(item) },
                        { label: "删除", onClick: () => onDelete(item), tone: "danger" as const }
                      ]
                }
                label="更多"
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function FilesInspector({
  item,
  file,
  breadcrumbs,
  folderPath,
  activityLogs,
  loading,
  error,
  onOpenFolder,
  onCreateChildFolder,
  onRename,
  onMove,
  onDelete,
  onArchive,
  trashMode = false,
  onRestore,
  onPermanentDelete
}: {
  item: SelectableLibraryItem | null;
  file: FileSummary | null;
  breadcrumbs: FolderSummary[];
  folderPath: FolderTreeNode[];
  activityLogs: FileDetailResponse["activityLogs"];
  loading?: boolean;
  error?: string;
  onOpenFolder: (folderId: string) => void;
  onCreateChildFolder: (folderId: string) => void;
  onRename: (item: SelectableLibraryItem) => void;
  onMove: (item: SelectableLibraryItem) => void;
  onDelete: (item: SelectableLibraryItem) => void;
  onArchive: (item: SelectableLibraryItem) => void;
  trashMode?: boolean;
  onRestore?: (item: SelectableLibraryItem) => void;
  onPermanentDelete?: (item: SelectableLibraryItem) => void;
}) {
  if (!item) {
    return (
      <div className="panel files-inspector empty files-inspector--animated">
        <div className="files-inspector__empty">
          <div className="files-inspector__empty-icon">
            <InfoLineIcon size={28} />
          </div>
          <strong>查看档案详情</strong>
          <p>选择一个文件或资料夹后，这里会显示预览、标签、上传信息和操作记录。</p>
        </div>
      </div>
    );
  }

  const fileItem = item.itemType === "file" ? (file ?? item) : null;
  const isFile = item.itemType === "file";
  const folder = item.itemType === "folder" ? item : null;
  const previewMode = fileItem ? previewKind(fileItem) : null;
  const activityItems = activityLogs.slice(0, 5);
  const inspectorTags =
    isFile && fileItem?.isImportant && !item.tags.includes("重要文件") ? ["重要文件", ...item.tags] : item.tags;
  const fileTypeText = (() => {
    if (!fileItem) {
      return "资料夹";
    }

    const labelMap: Record<string, string> = {
      pdf: "PDF 文档",
      word: "Word 文档",
      excel: "Excel 表格",
      ppt: "PPT 文档",
      image: "图片文件",
      video: "视频文件",
      audio: "音频文件",
      zip: "压缩文件",
      other: "普通文件"
    };

    return labelMap[fileTypeKey(fileItem)] ?? (fileItem.fileType?.trim() || "普通文件");
  })();
  const relationLabelMap: Record<string, string> = {
    customer: "关联客户",
    client: "关联客户",
    quote: "关联报价",
    quotation: "关联报价",
    project: "关联项目",
    contract: "关联合同"
  };
  const relationType = fileItem?.relatedEntity?.type?.toLowerCase() ?? "";
  const relationLabel = relationLabelMap[relationType] ?? "关联对象";
  const relationValue = fileItem?.relatedEntity?.name || fileItem?.relatedEntity?.id || "暂无关联对象";
  const folderPathLabel = folder
    ? folderPath.length
      ? `根目录 / ${folderPath.map((entry) => entry.name).join(" / ")}`
      : `根目录 / ${folder.name}`
    : "";
  const filePathLabel = breadcrumbs.length ? `根目录 / ${breadcrumbs.map((entry) => entry.name).join(" / ")}` : "根目录";
  const deletedAtLabel = isFile && fileItem?.deletedAt ? formatFileDate(fileItem.deletedAt) : "";
  const deletedByLabel = isFile ? fileItem?.deletedBy?.name || "历史记录未保留" : "";
  const deletedReasonLabel = isFile ? fileItem?.deletedReason || "成员手动删除" : "";
  const retentionLabel = isFile && fileItem ? formatTrashRetentionLabel(fileItem) : "";
  const identitySummary = isFile
    ? trashMode && deletedAtLabel
      ? `已移入回收区 · ${retentionLabel}`
      : `${fileTypeText} · ${formatFileSize(fileItem?.fileSizeBytes)}`
    : `资料夹 · ${folder!.childFolderCount} 个子资料夹 / ${folder!.fileCount} 个文件`;
  const identityNote = isFile ? fileItem?.note?.trim() : folder?.note?.trim();
  const corePathLabel = isFile ? filePathLabel : folderPathLabel;

  return (
    <div className="panel files-inspector files-inspector--animated">
      <div className="files-inspector__body files-inspector__content">
        <section className="files-inspector__section files-inspector__section--preview">
          <div className="files-inline-heading">
            <strong>预览</strong>
            {isFile ? (
              trashMode ? (
                <StatusBadge tone="danger">回收中</StatusBadge>
              ) : (
                <FileStatusBadge status={fileItem!.status} />
              )
            ) : (
              <span className="files-inspector__eyebrow">资料夹</span>
            )}
          </div>
          <div className="files-inspector__identity-preview">
            {isFile ? (
              <>
                {previewMode === "image" ? <img alt={fileItem!.fileName} className="files-preview-image" src={fileItem!.fileUrl} /> : null}
                {previewMode === "pdf" || previewMode === "office" || previewMode === "text" ? (
                  <iframe className="files-preview-frame" src={previewUrl(fileItem!)} title={fileItem!.fileName} />
                ) : null}
                {previewMode === "video" ? <video className="files-preview-media" controls src={fileItem!.fileUrl} /> : null}
                {previewMode === "audio" ? <audio className="files-preview-audio" controls src={fileItem!.fileUrl} /> : null}
                {previewMode === "download" ? (
                  <div className="files-preview-fallback compact">
                    <FileTypeIcon item={fileItem!} large />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="files-preview-fallback compact">
                <FileTypeIcon item={folder!} large />
              </div>
            )}
          </div>
        </section>

        <section className="files-inspector__section files-inspector__identity">
          <h4>核心信息</h4>
          <div className="files-inspector__identity-copy">
            <strong className="files-inspector__identity-title">{isFile ? fileItem!.fileName : folder!.name}</strong>
            <p className="files-inspector__identity-summary">{identitySummary}</p>
            {identityNote ? <p className="files-inspector__identity-note">{identityNote}</p> : null}
          </div>
          <div className="files-detail-list">
            <DetailRow label="名称" value={isFile ? fileItem!.fileName : folder!.name} />
            <DetailRow label="类型" value={fileTypeText} />
            <DetailRow label="路径" value={corePathLabel} />
          </div>
        </section>

        <section className="files-inspector__section">
          <h4>属性信息</h4>
          <div className="files-detail-list">
            {isFile ? (
              <>
                <DetailRow label="分类" value={fileCategoryLabel(fileItem!.category)} />
                <DetailRow label="文件大小" value={formatFileSize(fileItem!.fileSizeBytes)} />
                <DetailRow label="更新时间" value={formatFileDate(fileItem!.updatedAt)} />
                {trashMode && deletedAtLabel ? <DetailRow label="移入回收区" value={deletedAtLabel} /> : null}
                {trashMode ? <DetailRow label="删除人" value={deletedByLabel} /> : null}
                {trashMode ? <DetailRow label="删除原因" value={deletedReasonLabel} /> : null}
                {trashMode ? <DetailRow label="保留策略" value={`保留 ${fileItem?.retentionPolicyDays ?? TRASH_RETENTION_DAYS} 天`} /> : null}
                {trashMode && fileItem?.retentionExpiresAt ? <DetailRow label="保留至" value={formatFileDate(fileItem.retentionExpiresAt)} /> : null}
                {trashMode ? <DetailRow label="剩余保留" value={retentionLabel} /> : null}
                <DetailRow label="上传人" value={fileItem!.uploader.name} />
                <DetailRow label="状态" value={trashMode ? "回收中" : fileStatusMeta(fileItem!.status).label} />
                <DetailRow label={relationLabel} value={relationValue} />
              </>
            ) : (
              <>
                <DetailRow label="分类" value={fileCategoryLabel(folder!.category)} />
                <DetailRow label="子项数量" value={`${folder!.childFolderCount} 个资料夹 / ${folder!.fileCount} 个文件`} />
                <DetailRow label="更新时间" value={formatFileDate(folder!.updatedAt)} />
                <DetailRow label="上传人" value="--" />
              </>
            )}
          </div>
          <div className="files-inspector__meta-stack">
            <div className="files-inspector__meta-block">
              <span className="files-inspector__meta-label">标签</span>
              {inspectorTags.length ? <TagGroup maxVisible={3} tags={inspectorTags} /> : <p className="small muted">暂无标签</p>}
            </div>
          </div>
        </section>

        <section className="files-inspector__section">
          <h4>操作记录</h4>
          {loading ? (
            <div className="files-skeleton-stack" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="files-skeleton-card" key={`files-activity-skeleton-${index}`}>
                  <span className="files-skeleton files-skeleton--line medium" />
                  <span className="files-skeleton files-skeleton--line long" />
                  <span className="files-skeleton files-skeleton--line short" />
                </div>
              ))}
            </div>
          ) : activityItems.length ? (
            <div className="files-activity-list">
              {activityItems.map((activity) => (
                <div className="files-activity-list__item" key={activity.id}>
                  <strong>{`${activity.userName} ${activity.action}`}</strong>
                  {activity.target ? <p>{activity.target}</p> : null}
                  <small>{formatFileDate(activity.time)}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="small muted">还没有操作记录，后续上传、编辑、归档等动作会显示在这里。</p>
          )}
        </section>

        <section className="files-inspector__section files-inspector__section--actions">
          <h4>快捷操作</h4>
          <div className="files-inspector__actions">
            {isFile ? (
              <button
                className="button secondary inline files-inspector__action-leading"
                onClick={() => window.open(fileItem!.fileUrl, "_blank", "noopener,noreferrer")}
                type="button"
              >
                下载文件
              </button>
            ) : (
              <button
                className="button secondary inline files-inspector__action-leading"
                onClick={() => onOpenFolder(folder!.id)}
                type="button"
              >
                打开资料夹
              </button>
            )}
            {!trashMode ? (
              <>
                <button className="button ghost inline" onClick={() => onRename(item)} type="button">
                  重命名
                </button>
                <button className="button ghost inline" onClick={() => onMove(item)} type="button">
                  移动
                </button>
              </>
            ) : null}
            {trashMode && isFile ? (
              <button className="button secondary inline" onClick={() => onRestore?.(item)} type="button">
                恢复
              </button>
            ) : isFile ? (
              <button className="button ghost inline" onClick={() => onArchive(item)} type="button">
                归档
              </button>
            ) : (
              <button className="button ghost inline" onClick={() => onCreateChildFolder(folder!.id)} type="button">
                新建子资料夹
              </button>
            )}
            {trashMode && isFile ? (
              <button className="button danger inline" onClick={() => onPermanentDelete?.(item)} type="button">
                彻底删除
              </button>
            ) : (
              <button className="button danger inline" onClick={() => onDelete(item)} type="button">
                删除
              </button>
            )}
          </div>
          {error ? <div className="danger-text small">{error}</div> : null}
        </section>
      </div>
    </div>
  );
}

export function FileRowActions({
  item,
  isFavorite,
  onToggleFavorite,
  onOpen,
  onRename,
  onMove,
  onEditMetadata,
  onDelete,
  onArchive,
  trashMode = false,
  onRestore,
  onPermanentDelete,
  onOpenVersion
}: {
  item: SelectableLibraryItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
  onRename: () => void;
  onMove: () => void;
  onEditMetadata: () => void;
  onDelete: () => void;
  onArchive: () => void;
  trashMode?: boolean;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
  onOpenVersion: () => void;
}) {
  const items = trashMode
    ? [
        { label: "查看属性", onClick: onOpen },
        ...(item.itemType === "file"
          ? [
              { label: "下载", onClick: () => window.open(item.fileUrl, "_blank", "noopener,noreferrer") },
              { label: "复制链接", onClick: () => navigator.clipboard?.writeText(item.fileUrl) },
              { label: "恢复", onClick: onRestore }
            ]
          : []),
        { label: "彻底删除", onClick: onPermanentDelete, tone: "danger" as const }
      ]
    : [
        { label: item.itemType === "folder" ? "打开" : "查看属性", onClick: onOpen },
        { label: isFavorite ? "取消收藏" : "加入收藏", onClick: onToggleFavorite },
        { label: "重命名", onClick: onRename },
        { label: "移动", onClick: onMove },
        { label: "编辑标签", onClick: onEditMetadata },
        ...(item.itemType === "file"
          ? [
              { label: "下载", onClick: () => window.open(item.fileUrl, "_blank", "noopener,noreferrer") },
              { label: "复制链接", onClick: () => navigator.clipboard?.writeText(item.fileUrl) },
              { label: "上传新版本", onClick: onOpenVersion },
              { label: "归档", onClick: onArchive }
            ]
          : []),
        { label: "删除", onClick: onDelete, tone: "danger" as const }
      ];

  return <ActionMenu items={items} />;
}

export function FileTypeIcon({
  item,
  large = false
}: {
  item: SelectableLibraryItem;
  large?: boolean;
}) {
  const type = item.itemType === "folder" ? "folder" : fileTypeKey(item);
  const labelMap: Record<string, string> = {
    folder: "资料夹",
    pdf: "PDF 文件",
    word: "Word 文档",
    excel: "Excel 表格",
    ppt: "PPT 演示文稿",
    image: "图片文件",
    video: "视频文件",
    audio: "音频文件",
    zip: "压缩文件",
    other: "普通文件"
  };
  const badgeMap: Record<string, string> = {
    folder: "DIR",
    pdf: "PDF",
    word: "DOC",
    excel: "XLS",
    ppt: "PPT",
    image: "IMG",
    video: "VID",
    audio: "AUD",
    zip: "ZIP",
    other: "FILE"
  };
  const iconMap: Record<string, ReactNode> = {
    folder: <FolderLineIcon size={large ? 28 : 18} />,
    pdf: <DocumentLineIcon size={large ? 28 : 18} />,
    word: <DocumentLineIcon size={large ? 28 : 18} />,
    excel: <StackFilesLineIcon size={large ? 28 : 18} />,
    ppt: <DocumentLineIcon size={large ? 28 : 18} />,
    image: <ImageLineIcon size={large ? 28 : 18} />,
    video: <VideoLineIcon size={large ? 28 : 18} />,
    audio: <AudioLineIcon size={large ? 28 : 18} />,
    zip: <ZipLineIcon size={large ? 28 : 18} />,
    other: <DocumentLineIcon size={large ? 28 : 18} />
  };

  return (
    <span
      aria-label={labelMap[type] ?? "普通文件"}
      className={cn("file-type-icon", large && "large")}
      data-type={type}
      title={labelMap[type] ?? "普通文件"}
    >
      <span className="file-type-icon__glyph">{iconMap[type] ?? <DocumentLineIcon size={large ? 28 : 18} />}</span>
      <span className="file-type-icon__badge">{badgeMap[type] ?? "FILE"}</span>
    </span>
  );
}

export function FileStatusBadge({ status }: { status?: string | null }) {
  const meta = fileStatusMeta(status);
  return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

export function TagGroup({
  tags,
  maxVisible = 3
}: {
  tags: string[];
  maxVisible?: number;
}) {
  const visible = tags.slice(0, maxVisible);
  const hiddenCount = Math.max(tags.length - visible.length, 0);

  return tags.length ? (
    <div className="tag-group">
      {visible.map((tag) => (
        <span className="tag-group__item" key={tag}>
          {tag}
        </span>
      ))}
      {hiddenCount ? <span className="tag-group__more">+{hiddenCount}</span> : null}
    </div>
  ) : (
    <span className="small muted">--</span>
  );
}

export function FilesEmptyState({
  title,
  description,
  variant = "folder",
  primaryActionText,
  onPrimaryAction,
  secondaryActionText,
  onSecondaryAction
}: {
  title: string;
  description: string;
  variant?: "folder" | "search";
  primaryActionText?: string;
  onPrimaryAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
}) {
  return (
    <div className="files-empty-state panel">
      <div className="files-empty-state__icon">
        {variant === "search" ? <SearchFileLineIcon size={28} /> : <FolderLineIcon size={28} />}
      </div>
      <EmptyState
        title={title}
        description={description}
        action={
          primaryActionText || secondaryActionText ? (
            <div className="action-row">
              {primaryActionText ? (
                <button className="button inline" onClick={onPrimaryAction} type="button">
                  {primaryActionText}
                </button>
              ) : null}
              {secondaryActionText ? (
                <button className="button secondary inline" onClick={onSecondaryAction} type="button">
                  {secondaryActionText}
                </button>
              ) : null}
            </div>
          ) : null
        }
      />
    </div>
  );
}

export function FilePreviewPanel({
  file,
  loading
}: {
  file: FileSummary;
  loading?: boolean;
}) {
  const kind = previewKind(file);

  return (
    <SectionCard title="在线预览" description="减少反复下载，在侧栏中快速确认文件内容。">
      {loading ? <div className="small muted">正在加载预览...</div> : null}
      {kind === "image" ? <img alt={file.fileName} className="files-preview-image" src={file.fileUrl} /> : null}
      {kind === "pdf" || kind === "office" || kind === "text" ? (
        <iframe className="files-preview-frame" src={previewUrl(file)} title={file.fileName} />
      ) : null}
      {kind === "video" ? <video className="files-preview-media" controls src={file.fileUrl} /> : null}
      {kind === "audio" ? <audio className="files-preview-audio" controls src={file.fileUrl} /> : null}
      {kind === "download" ? (
        <div className="files-preview-fallback">
          <strong>当前文件暂不支持在线预览</strong>
          <p>建议直接下载查看，或在右侧版本信息里继续追踪文件记录。</p>
          <a className="button inline" href={file.fileUrl} rel="noreferrer" target="_blank">
            下载文件
          </a>
        </div>
      ) : null}
    </SectionCard>
  );
}

export function FileDetailPanel({
  file,
  breadcrumbs,
  versions
}: {
  file: FileSummary;
  breadcrumbs: FolderSummary[];
  versions: FileDetailResponse["versions"];
}) {
  return (
    <SectionCard title="文件详情" description="展示分类、标签、版本、权限和业务对象关联信息。">
      <div className="files-detail-list">
        <DetailRow label="文件名称" value={file.fileName} />
        <DetailRow label="文件类型" value={file.fileType || "未记录"} />
        <DetailRow label="分类" value={fileCategoryLabel(file.category)} />
        <DetailRow label="标签" value={file.tags.length ? file.tags.join(" / ") : "--"} />
        <DetailRow label="文件大小" value={formatFileSize(file.fileSizeBytes)} />
        <DetailRow label="上传时间" value={formatFileDate(file.createdAt)} />
        <DetailRow label="上传人" value={file.uploader.name} />
        <DetailRow label="当前版本" value={`V${file.versionNumber}`} />
        <DetailRow label="状态" value={fileStatusMeta(file.status).label} />
        <DetailRow label="权限范围" value={file.permissionScope || "未设置"} />
        <DetailRow
          label="关联对象"
          value={file.relatedEntity?.name || file.relatedEntity?.id || file.relatedEntity?.type || "--"}
        />
        <DetailRow
          label="所在路径"
          value={breadcrumbs.length ? breadcrumbs.map((item) => item.name).join(" / ") : "根目录"}
        />
      </div>

      {versions.length ? (
        <div className="files-version-list">
          <strong>版本记录</strong>
          {versions.map((version) => (
            <div className="files-version-list__item" key={version.id}>
              <div>
                <strong>V{version.versionNumber}</strong>
                <span>{formatFileDate(version.updatedAt)}</span>
              </div>
              <p>{version.versionNote || "暂无版本说明"}</p>
            </div>
          ))}
        </div>
      ) : null}
    </SectionCard>
  );
}

export function FolderDetailPanel({
  folder,
  path,
  onOpenFolder
}: {
  folder: FolderSummary;
  path: FolderTreeNode[];
  onOpenFolder: () => void;
}) {
  return (
    <SectionCard title="资料夹详情" description="查看当前目录的分类、标签与子项数量。">
      <div className="files-detail-list">
        <DetailRow label="资料夹名称" value={folder.name} />
        <DetailRow label="分类" value={fileCategoryLabel(folder.category)} />
        <DetailRow label="标签" value={folder.tags.length ? folder.tags.join(" / ") : "--"} />
        <DetailRow label="子资料夹" value={`${folder.childFolderCount}`} />
        <DetailRow label="文件数量" value={`${folder.fileCount}`} />
        <DetailRow label="权限范围" value={folder.permissionScope || "未设置"} />
        <DetailRow label="所在路径" value={path.length ? path.map((item) => item.name).join(" / ") : folder.name} />
      </div>
      <button className="button inline" onClick={onOpenFolder} type="button">
        打开资料夹
      </button>
      {folder.note ? <p className="small muted">{folder.note}</p> : null}
    </SectionCard>
  );
}

export function ActivityTimeline({
  items
}: {
  items: FileDetailResponse["activityLogs"];
}) {
  return (
    <SectionCard title="最近操作记录" description="追踪上传、版本维护和归档动作。">
      {items.length ? (
        <TimelineBlock
          items={items.map((item) => ({
            id: item.id,
            title: `${item.userName} ${item.action}`,
            description: item.target,
            meta: formatFileDate(item.time)
          }))}
        />
      ) : (
        <EmptyState title="还没有操作记录" description="后续上传、移动和版本操作会记录在这里。" />
      )}
    </SectionCard>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="files-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function uploadQueueKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function resolveFolderLocationLabel({
  folderId,
  currentFolderId,
  currentLocationLabel,
  folderTree
}: {
  folderId?: string | null;
  currentFolderId?: string | null;
  currentLocationLabel: string;
  folderTree: FolderTreeNode[];
}) {
  if (folderId) {
    const path = findFolderPath(folderTree, folderId);
    if (path.length) {
      return ["档案中心", "根目录", ...path.map((item) => item.name)].join(" / ");
    }
  }

  if (currentFolderId) {
    return folderId === currentFolderId ? currentLocationLabel : "档案中心 / 根目录";
  }

  return "档案中心 / 根目录";
}

function ModalShell({
  open,
  title,
  description,
  onClose,
  children,
  width = "regular"
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  width?: "regular" | "wide";
}) {
  if (!open) {
    return null;
  }

  return (
    <>
      <button className="drawer-backdrop open" onClick={onClose} type="button" />
      <div className={cn("files-modal-shell", width === "wide" && "wide")}>
        <div className="panel stack files-modal-card">
          <div className="panel-header">
            <div className="section-heading">
              <h3>{title}</h3>
              {description ? <p>{description}</p> : null}
            </div>
            <button className="icon-button" onClick={onClose} type="button">
              关闭
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}

export function CreateFolderModal({
  open,
  parentFolderId,
  currentLocationLabel,
  folderOptions,
  folderTree,
  onClose,
  onCreated
}: {
  open: boolean;
  parentFolderId?: string | null;
  currentLocationLabel: string;
  folderOptions: Array<{ id: string; label: string }>;
  folderTree: FolderTreeNode[];
  onClose: () => void;
  onCreated: (folder: FolderSummary) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [targetFolderId, setTargetFolderId] = useState("");
  const [category, setCategory] = useState("");
  const [tagText, setTagText] = useState("");
  const [permissionScope, setPermissionScope] = useState("");
  const [note, setNote] = useState("");
  const [locationOpen, setLocationOpen] = useState(false);
  const [moreSettingsOpen, setMoreSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
      setTargetFolderId(parentFolderId ?? "");
      setCategory("");
      setTagText("");
      setPermissionScope("");
      setNote("");
      setLocationOpen(false);
      setMoreSettingsOpen(false);
      setError("");
      setSaving(false);
    }
  }, [open, parentFolderId]);

  async function handleSubmit() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("请输入资料夹名称");
      return;
    }

    if (trimmedName.length > 50) {
      setError("资料夹名称请控制在 50 个字以内");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const folder = await apiFetch<FolderSummary>("/files/folders", {
        method: "POST",
        body: JSON.stringify({
          name: trimmedName,
          parentId: targetFolderId || null,
          category: category || undefined,
          tagText,
          permissionScope,
          note
        })
      });
      await onCreated(folder);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "创建资料夹失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={open}
      title="新建资料夹"
      description="在当前目录下创建一个新的资料夹，用于整理正式资料和归档文件。"
      onClose={onClose}
    >
      <div className="files-form-grid">
        <label>
          <span>资料夹名称</span>
          <input placeholder="例如：2026 合同 / 培训资料 / 客户交付" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="span-2 files-location-field">
          <span>所属位置</span>
          <div className="files-location-field__summary">
            <strong>
              {resolveFolderLocationLabel({
                folderId: targetFolderId || null,
                currentFolderId: parentFolderId,
                currentLocationLabel,
                folderTree
              })}
            </strong>
            <button
              className="button ghost inline"
              onClick={() => setLocationOpen((value) => !value)}
              type="button"
            >
              {locationOpen ? "收起位置" : "更改位置"}
            </button>
          </div>
          {locationOpen ? (
            <select value={targetFolderId} onChange={(event) => setTargetFolderId(event.target.value)}>
              <option value="">根目录</option>
              {folderOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <label>
          <span>分类</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">未设置</option>
            {fileCategoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="span-2">
          <span>备注说明</span>
          <textarea
            placeholder="补充这个资料夹的用途或归档说明（选填）"
            rows={4}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <div className="span-2 files-disclosure">
          <button
            className="button ghost inline"
            onClick={() => setMoreSettingsOpen((value) => !value)}
            type="button"
          >
            更多设置
          </button>
          {moreSettingsOpen ? (
            <div className="files-disclosure__panel files-form-grid">
              <label>
                <span>标签</span>
                <input
                  placeholder="添加标签，方便后续筛选"
                  value={tagText}
                  onChange={(event) => setTagText(event.target.value)}
                />
              </label>
              <label>
                <span>权限范围</span>
                <input
                  placeholder="默认继承当前目录权限"
                  value={permissionScope}
                  onChange={(event) => setPermissionScope(event.target.value)}
                />
              </label>
            </div>
          ) : null}
        </div>
      </div>
      {error ? <div className="danger-text small">{error}</div> : null}
      <div className="drawer-footer-actions">
        <button className="button secondary inline" onClick={onClose} type="button">
          取消
        </button>
        <button className="button inline" disabled={saving} onClick={handleSubmit} type="button">
          {saving ? "创建中..." : "创建资料夹"}
        </button>
      </div>
    </ModalShell>
  );
}

export function UploadFilesDrawer({
  open,
  folderId,
  currentLocationLabel,
  folderOptions,
  folderTree,
  onClose,
  onUploaded
}: {
  open: boolean;
  folderId?: string | null;
  currentLocationLabel: string;
  folderOptions: Array<{ id: string; label: string }>;
  folderTree: FolderTreeNode[];
  onClose: () => void;
  onUploaded: (result: {
    fileIds: string[];
    targetFolderId: string | null;
    keepOpen?: boolean;
  }) => Promise<void>;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [targetFolderId, setTargetFolderId] = useState("");
  const [category, setCategory] = useState("");
  const [tagText, setTagText] = useState("");
  const [relatedType, setRelatedType] = useState("");
  const [relatedId, setRelatedId] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [permissionScope, setPermissionScope] = useState("");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [statusMap, setStatusMap] = useState<Record<string, "queued" | "uploading" | "success" | "failed">>({});
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [locationOpen, setLocationOpen] = useState(false);
  const [moreSettingsOpen, setMoreSettingsOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setTargetFolderId(folderId ?? "");
      setCategory("");
      setTagText("");
      setRelatedType("");
      setRelatedId("");
      setIsImportant(false);
      setPermissionScope("");
      setNote("");
      setProgress({});
      setStatusMap({});
      setFileErrors({});
      setLocationOpen(false);
      setMoreSettingsOpen(false);
      setError("");
      setUploading(false);
    }
  }, [folderId, open]);

  function appendFiles(nextFiles: File[]) {
    if (!nextFiles.length) {
      return;
    }

    setError("");
    setFiles((current) => {
      const map = new Map(current.map((item) => [uploadQueueKey(item), item]));
      nextFiles.forEach((file) => {
        map.set(uploadQueueKey(file), file);
      });
      return Array.from(map.values());
    });

    setStatusMap((current) => {
      const next = { ...current };
      nextFiles.forEach((file) => {
        next[uploadQueueKey(file)] = "queued";
      });
      return next;
    });
  }

  function removeQueuedFile(target: File) {
    const key = uploadQueueKey(target);
    setError("");
    setFiles((current) => current.filter((file) => uploadQueueKey(file) !== key));
    setProgress((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setStatusMap((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setFileErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function handleUpload() {
    if (!files.length) {
      setError("请先选择要上传的文件");
      return;
    }

    setUploading(true);
    setError("");
    const uploadedFileIds: string[] = [];
    const failedFiles: File[] = [];

    try {
      for (const file of files) {
        const key = uploadQueueKey(file);
        setStatusMap((current) => ({ ...current, [key]: "uploading" }));
        setFileErrors((current) => ({ ...current, [key]: "" }));

        try {
          const uploaded = await uploadFileToCos(file, {
            businessType: category || "files_center",
            folderId: targetFolderId || undefined,
            category,
            tagText,
            relatedType,
            relatedId,
            isImportant,
            permissionScope,
            note,
            status: "ACTIVE",
            onProgress(percent) {
              setProgress((current) => ({ ...current, [key]: percent }));
            }
          });

          uploadedFileIds.push(uploaded.fileId);
          setProgress((current) => ({ ...current, [key]: 100 }));
          setStatusMap((current) => ({ ...current, [key]: "success" }));
        } catch (requestError) {
          failedFiles.push(file);
          setStatusMap((current) => ({ ...current, [key]: "failed" }));
          setFileErrors((current) => ({
            ...current,
            [key]: requestError instanceof Error ? requestError.message : "上传失败"
          }));
        }
      }

      if (uploadedFileIds.length) {
        await onUploaded({
          fileIds: uploadedFileIds,
          targetFolderId: targetFolderId || null,
          keepOpen: failedFiles.length > 0
        });
      }

      if (failedFiles.length) {
        setFiles(failedFiles);
        setError(
          uploadedFileIds.length
            ? "部分文件上传失败，请重试"
            : "文件上传失败，请重试"
        );
        return;
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "文件上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <RightDrawer
      className="files-upload-drawer-shell"
      open={open}
      title="上传文件"
      description="支持上传合同、培训资料、客户交付和其他正式档案。"
      onClose={onClose}
      footer={
        <div className="drawer-footer-actions">
          <button className="button secondary inline" onClick={onClose} type="button">
            取消
          </button>
          <button className="button inline" disabled={uploading} onClick={handleUpload} type="button">
            {uploading ? "上传中..." : "开始上传"}
          </button>
        </div>
      }
      widthClass="files-drawer"
    >
      <div className="files-upload-drawer">
        <section className="files-upload-drawer__hero">
          <label
            className="files-upload-dropzone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              appendFiles(Array.from(event.dataTransfer.files ?? []));
            }}
          >
            <strong>将文件拖到这里，或点击选择文件</strong>
            <span>支持上传多个文件，建议按资料用途归类后再整理到对应目录。</span>
            <input
              multiple
              onChange={(event) => {
                appendFiles(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
              type="file"
            />
            <small>{files.length ? `已选择 ${files.length} 个文件` : "支持一次选择多个文件"}</small>
          </label>
        </section>

        <section className="files-upload-drawer__queue">
          <div className="files-inline-heading">
            <strong>待上传文件</strong>
            <span>{files.length ? `${files.length} 个文件待处理` : "文件列表会显示在这里"}</span>
          </div>

          <div className="files-upload-drawer__queue-body">
            {files.length ? (
              <div className="files-upload-list">
                {files.map((file) => {
                  const queueKey = uploadQueueKey(file);
                  const uploadStatus = statusMap[queueKey] ?? "queued";
                  const uploadProgress = progress[queueKey];
                  const progressLabel =
                    uploadStatus === "uploading"
                      ? `${uploadProgress ?? 0}%`
                      : uploadStatus === "success"
                        ? "100%"
                        : uploadStatus === "failed"
                          ? "上传失败"
                          : "待上传";

                  return (
                    <div className="files-upload-list__item" key={queueKey}>
                      <div className="files-upload-list__meta">
                        <div className="files-upload-list__top">
                          <strong>{file.name}</strong>
                          <span>{formatFileSize(file.size)}</span>
                        </div>
                        <div className="files-upload-list__progress">
                          <div className="files-upload-list__bar">
                            <span
                              className="files-upload-list__bar-fill"
                              style={{ width: `${uploadProgress ?? 0}%` }}
                            />
                          </div>
                          <div className="files-upload-list__status-row">
                            <span className={cn("files-upload-list__status", uploadStatus)}>
                              {uploadStatus === "uploading"
                                ? "上传中"
                                : uploadStatus === "success"
                                  ? "已完成"
                                  : uploadStatus === "failed"
                                    ? "失败"
                                    : "待上传"}
                            </span>
                            <span>{progressLabel}</span>
                          </div>
                          {fileErrors[queueKey] ? (
                            <span className="danger-text small">{fileErrors[queueKey]}</span>
                          ) : null}
                        </div>
                      </div>
                      <button
                        className="button ghost inline"
                        disabled={uploading}
                        onClick={() => removeQueuedFile(file)}
                        type="button"
                      >
                        移除
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="files-upload-drawer__empty">
                <strong>还没有待上传文件</strong>
                <p>先从上方选择文件，列表会在这里滚动展示，底部设置区会保持可见。</p>
              </div>
            )}
          </div>
        </section>

        <section className="files-upload-drawer__settings">
          <div className="files-inline-heading">
            <strong>上传设置</strong>
            <span>上传前统一设置目录、分类与标签</span>
          </div>

          <div className="files-form-grid files-upload-drawer__settings-grid">
            <div className="span-2 files-location-field">
              <span>所属目录</span>
              <div className="files-location-field__summary">
                <strong>
                  {resolveFolderLocationLabel({
                    folderId: targetFolderId || null,
                    currentFolderId: folderId,
                    currentLocationLabel,
                    folderTree
                  })}
                </strong>
                <button
                  className="button ghost inline"
                  onClick={() => setLocationOpen((value) => !value)}
                  type="button"
                >
                  {locationOpen ? "收起位置" : "更改位置"}
                </button>
              </div>
              {locationOpen ? (
                <select value={targetFolderId} onChange={(event) => setTargetFolderId(event.target.value)}>
                  <option value="">根目录</option>
                  {folderOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            <label>
              <span>文件分类</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">未设置</option>
                {fileCategoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>标签</span>
              <input
                placeholder="添加标签，方便后续筛选与查找"
                value={tagText}
                onChange={(event) => setTagText(event.target.value)}
              />
            </label>
            <label className="span-2">
              <span>备注说明</span>
              <textarea
                placeholder="补充文件背景、版本说明或交付信息（选填）"
                rows={4}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <div className="span-2 files-disclosure">
              <button
                className="button ghost inline"
                onClick={() => setMoreSettingsOpen((value) => !value)}
                type="button"
              >
                更多设置
              </button>
              {moreSettingsOpen ? (
                <div className="files-disclosure__panel files-form-grid">
                  <label>
                    <span>关联对象类型</span>
                    <select value={relatedType} onChange={(event) => setRelatedType(event.target.value)}>
                      <option value="">未设置</option>
                      <option value="customer">客户</option>
                      <option value="quotation">报价</option>
                      <option value="project">项目</option>
                      <option value="contract">合同</option>
                    </select>
                  </label>
                  <label>
                    <span>关联对象</span>
                    <input
                      placeholder="选择客户、报价或项目（选填）"
                      value={relatedId}
                      onChange={(event) => setRelatedId(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>权限范围</span>
                    <input
                      placeholder="默认继承当前目录权限"
                      value={permissionScope}
                      onChange={(event) => setPermissionScope(event.target.value)}
                    />
                  </label>
                  <label className="checkbox-row">
                    <input checked={isImportant} onChange={(event) => setIsImportant(event.target.checked)} type="checkbox" />
                    <span>标记为重要文件</span>
                  </label>
                </div>
              ) : null}
            </div>
          </div>

          {error ? <div className="danger-text small">{error}</div> : null}
        </section>
      </div>
    </RightDrawer>
  );
}

export function RenameItemModal({
  open,
  target,
  onClose,
  onSaved
}: {
  open: boolean;
  target: RenameTarget | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(target?.name ?? "");
    setError("");
    setSaving(false);
  }, [target]);

  async function handleSave() {
    if (!target) return;
    if (!value.trim()) {
      setError("请输入新名称");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await apiFetch(target.kind === "file" ? `/files/${target.id}` : `/files/folders/${target.id}`, {
        method: "PATCH",
        body: JSON.stringify(target.kind === "file" ? { fileName: value.trim() } : { name: value.trim() })
      });
      await onSaved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={open}
      title={target?.kind === "file" ? "重命名文件" : "重命名资料夹"}
      description="请输入新的显示名称"
      onClose={onClose}
    >
      <label>
        <span>新名称</span>
        <input value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      {error ? <div className="danger-text small">{error}</div> : null}
      <div className="drawer-footer-actions">
        <button className="button secondary inline" onClick={onClose} type="button">
          取消
        </button>
        <button className="button inline" disabled={saving} onClick={handleSave} type="button">
          {saving ? "保存中..." : "保存"}
        </button>
      </div>
    </ModalShell>
  );
}

export function MoveItemsModal({
  open,
  target,
  folderOptions,
  onClose,
  onMoved
}: {
  open: boolean;
  target: MoveTarget | null;
  folderOptions: Array<{ id: string; label: string }>;
  onClose: () => void;
  onMoved: () => Promise<void>;
}) {
  const [targetFolderId, setTargetFolderId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTargetFolderId(target?.currentFolderId ?? "");
    setSaving(false);
    setError("");
  }, [target]);

  async function handleMove() {
    if (!target) return;
    setSaving(true);
    setError("");

    try {
      await apiFetch("/files/batch", {
        method: "POST",
        body: JSON.stringify({
          action: "move",
          fileIds: target.fileIds,
          folderIds: target.folderIds,
          targetFolderId
        })
      });
      await onMoved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "移动失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={open}
      title={target?.title ?? "移动档案"}
      description="请选择新的目标目录，目录树会保留在左侧面板中持续可见。"
      onClose={onClose}
    >
      <label>
        <span>目标目录</span>
        <select value={targetFolderId} onChange={(event) => setTargetFolderId(event.target.value)}>
          <option value="">根目录</option>
          {folderOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {error ? <div className="danger-text small">{error}</div> : null}
      <div className="drawer-footer-actions">
        <button className="button secondary inline" onClick={onClose} type="button">
          取消
        </button>
        <button className="button inline" disabled={saving} onClick={handleMove} type="button">
          {saving ? "移动中..." : "确认移动"}
        </button>
      </div>
    </ModalShell>
  );
}

export function EditMetadataModal({
  open,
  target,
  onClose,
  onSaved
}: {
  open: boolean;
  target: MetadataTarget | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [category, setCategory] = useState("");
  const [tagText, setTagText] = useState("");
  const [status, setStatus] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setCategory(target?.category ?? "");
    setTagText(target?.tags?.join(", ") ?? "");
    setStatus(target?.status ?? "");
    setIsImportant(Boolean(target?.isImportant));
    setSaving(false);
    setError("");
  }, [target]);

  async function handleSave() {
    if (!target) return;

    setSaving(true);
    setError("");

    try {
      if (target.mode === "single" && target.fileIds.length === 1 && !target.folderIds.length) {
        await apiFetch(`/files/${target.fileIds[0]}`, {
          method: "PATCH",
          body: JSON.stringify({
            category,
            tagText,
            status: status || undefined,
            isImportant
          })
        });
      } else if (target.mode === "single" && target.folderIds.length === 1 && !target.fileIds.length) {
        await apiFetch(`/files/folders/${target.folderIds[0]}`, {
          method: "PATCH",
          body: JSON.stringify({
            category,
            tagText
          })
        });
      } else {
        await apiFetch("/files/batch", {
          method: "POST",
          body: JSON.stringify({
            action: "update_metadata",
            fileIds: target.fileIds,
            folderIds: target.folderIds,
            category,
            tagText,
            status: status || undefined,
            isImportant: target.fileIds.length ? isImportant : undefined
          })
        });
      }

      await onSaved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell open={open} title={target?.title ?? "编辑信息"} description="统一维护分类、标签与状态。" onClose={onClose}>
      <div className="files-form-grid">
        <label>
          <span>分类</span>
          <input value={category} onChange={(event) => setCategory(event.target.value)} />
        </label>
        <label>
          <span>标签</span>
          <input value={tagText} onChange={(event) => setTagText(event.target.value)} />
        </label>
        {target?.fileIds.length ? (
          <>
            <label>
              <span>状态</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">保持不变</option>
                {fileStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-row">
              <input checked={isImportant} onChange={(event) => setIsImportant(event.target.checked)} type="checkbox" />
              <span>设为重要文件</span>
            </label>
          </>
        ) : null}
      </div>
      {error ? <div className="danger-text small">{error}</div> : null}
      <div className="drawer-footer-actions">
        <button className="button secondary inline" onClick={onClose} type="button">
          取消
        </button>
        <button className="button inline" disabled={saving} onClick={handleSave} type="button">
          {saving ? "保存中..." : "保存标签"}
        </button>
      </div>
    </ModalShell>
  );
}

export function ConfirmFilesModal({
  open,
  title,
  description,
  confirmText,
  reasonMode = "none",
  reasonLabel = "原因",
  reasonHelperText,
  reasonPresets = [],
  onClose,
  onConfirm,
  tone
}: {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  reasonMode?: "none" | "optional" | "required";
  reasonLabel?: string;
  reasonHelperText?: string;
  reasonPresets?: string[];
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  tone: "neutral" | "danger";
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  useEffect(() => {
    setSubmitting(false);
    setError("");
    setSelectedReason("");
    setCustomReason("");
  }, [open, title]);

  const resolvedReason =
    selectedReason && selectedReason !== CUSTOM_REASON_OPTION
      ? selectedReason
      : customReason.trim();

  async function handleConfirm() {
    if (reasonMode === "required" && !resolvedReason) {
      setError(`请填写${reasonLabel}`);
      return;
    }

    if (selectedReason === CUSTOM_REASON_OPTION && !customReason.trim()) {
      setError(`请补充${reasonLabel}`);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onConfirm(resolvedReason || undefined);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "处理失败");
      setSubmitting(false);
    }
  }

  return (
    <ModalShell open={open} title={title} description={description} onClose={onClose}>
      {reasonMode !== "none" ? (
        <div className="files-confirm-reason">
          <div className="files-confirm-reason__header">
            <strong>
              {reasonLabel}
              {reasonMode === "required" ? "（必填）" : "（选填）"}
            </strong>
            {reasonHelperText ? <span>{reasonHelperText}</span> : null}
          </div>
          {reasonPresets.length ? (
            <div className="files-confirm-reason__options">
              {reasonPresets.map((option) => (
                <button
                  key={option}
                  className={cn("button ghost inline files-confirm-reason__option", selectedReason === option && "active")}
                  onClick={() => {
                    setSelectedReason((current) => (current === option ? "" : option));
                    if (option !== CUSTOM_REASON_OPTION) {
                      setCustomReason("");
                    }
                    setError("");
                  }}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}
          {(selectedReason === CUSTOM_REASON_OPTION || !reasonPresets.length) ? (
            <label className="files-confirm-reason__field">
              <span>补充说明</span>
              <textarea
                placeholder={reasonMode === "required" ? "请说明这次删除的具体原因" : "如有需要，可补充删除原因"}
                rows={3}
                value={customReason}
                onChange={(event) => {
                  setCustomReason(event.target.value);
                  setError("");
                }}
              />
            </label>
          ) : null}
        </div>
      ) : null}
      {error ? <div className="danger-text small">{error}</div> : null}
      <div className="drawer-footer-actions">
        <button className="button secondary inline" onClick={onClose} type="button">
          取消
        </button>
        <button className={cn("button inline", tone === "danger" && "danger")} disabled={submitting} onClick={handleConfirm} type="button">
          {submitting ? "处理中..." : confirmText}
        </button>
      </div>
    </ModalShell>
  );
}

export function UploadNewVersionDrawer({
  open,
  target,
  onClose,
  onUploaded
}: {
  open: boolean;
  target: FileSummary | null;
  onClose: () => void;
  onUploaded: (fileId?: string) => Promise<void>;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [versionNote, setVersionNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setVersionNote("");
      setSaving(false);
      setProgress(0);
      setError("");
    }
  }, [open]);

  async function handleUpload() {
    if (!target || !selectedFile) {
      setError("请先选择新版本文件");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const uploaded = await uploadFileToCos(selectedFile, {
        businessType: target.category || target.businessType || "files_center",
        folderId: target.folderId ?? undefined,
        category: target.category || undefined,
        tagText: target.tags.join(", "),
        relatedType: target.relatedEntity?.type || undefined,
        relatedId: target.relatedEntity?.id || undefined,
        isImportant: target.isImportant,
        permissionScope: target.permissionScope || undefined,
        status: target.status,
        versionGroupId: target.versionGroupId || target.id,
        versionNote,
        onProgress(percent) {
          setProgress(percent);
        }
      });

      await onUploaded(uploaded.fileId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "上传新版本失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RightDrawer
      open={open}
      title="上传新版本"
      description={target ? `为 ${target.fileName} 追加新的版本记录。` : "上传文件新版本"}
      onClose={onClose}
      footer={
        <div className="drawer-footer-actions">
          <button className="button secondary inline" onClick={onClose} type="button">
            取消
          </button>
          <button className="button inline" disabled={saving} onClick={handleUpload} type="button">
            {saving ? "上传中..." : "上传新版本"}
          </button>
        </div>
      }
      widthClass="files-drawer"
    >
      <div className="drawer-group">
        <label className="files-upload-dropzone">
          <span>选择新版本文件</span>
          <input
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            type="file"
          />
          <small>{selectedFile ? `${selectedFile.name} · ${formatFileSize(selectedFile.size)}` : "请选择同一文档的新版本文件"}</small>
        </label>
        <label>
          <span>版本说明</span>
          <textarea
            placeholder="补充这次更新的内容，例如：补充签章页 / 修正报价条款 / 更新培训版本。"
            rows={4}
            value={versionNote}
            onChange={(event) => setVersionNote(event.target.value)}
          />
        </label>
        {progress ? <div className="small muted">当前进度：{progress}%</div> : null}
        {error ? <div className="danger-text small">{error}</div> : null}
      </div>
    </RightDrawer>
  );
}
