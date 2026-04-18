"use client";

import type { Tone } from "../components/system/primitives";

export type FilesQuickViewKey =
  | "all"
  | "recent"
  | "mine"
  | "favorites"
  | "archived"
  | "important"
  | "pending-review"
  | "shared"
  | "trash";

export type FilesViewMode = "table" | "grid";

export type FolderTreeNode = {
  id: string;
  name: string;
  parentId?: string | null;
  category?: string | null;
  itemCount: number;
  updatedAt: string;
  children: FolderTreeNode[];
};

export type FolderSummary = {
  id: string;
  itemType: "folder";
  name: string;
  parentId?: string | null;
  category?: string | null;
  tags: string[];
  permissionScope?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  childFolderCount: number;
  fileCount: number;
  itemCount: number;
};

export type FileSummary = {
  id: string;
  itemType: "file";
  fileName: string;
  fileUrl: string;
  fileType?: string | null;
  fileSizeBytes?: number | null;
  category?: string | null;
  tags: string[];
  note?: string | null;
  businessType?: string | null;
  businessId?: string | null;
  relatedEntity?: {
    type?: string | null;
    id?: string | null;
    name?: string | null;
  } | null;
  folderId?: string | null;
  status: FileStatusValue;
  isImportant: boolean;
  isArchived: boolean;
  permissionScope?: string | null;
  versionGroupId?: string | null;
  versionNumber: number;
  versionNote?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  deletedReason?: string | null;
  deletedBy?: {
    id: string;
    name: string;
    loginAccount?: string | null;
  } | null;
  retentionPolicyDays?: number | null;
  retentionExpiresAt?: string | null;
  retentionDaysRemaining?: number | null;
  uploader: {
    id: string;
    name: string;
    loginAccount?: string | null;
  };
};

export type FileDetailResponse = {
  itemType: "file";
  breadcrumbs: FolderSummary[];
  file: FileSummary;
  versions: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileType?: string | null;
    versionGroupId?: string | null;
    versionNumber: number;
    versionNote?: string | null;
    createdAt: string;
    updatedAt: string;
    uploader: {
      id: string;
      name: string;
      loginAccount?: string | null;
    };
  }>;
  activityLogs: Array<{
    id: string;
    userName: string;
    action: string;
    target: string;
    time: string;
  }>;
};

export type FilesLibraryResponse = {
  view: string;
  sortBy: string;
  currentFolder: FolderSummary | null;
  breadcrumbs: FolderSummary[];
  quickViews: Array<{ key: FilesQuickViewKey; label: string; count: number }>;
  stats: {
    totalFolders: number;
    totalFiles: number;
    currentFolderCount: number;
    currentFileCount: number;
  };
  folderTree: FolderTreeNode[];
  folders: FolderSummary[];
  files: FileSummary[];
  filters: {
    keyword: string;
    category: string;
    tag: string;
    status: FileStatusValue | null;
    relatedType: string;
    uploaderUserId: string;
    deleteReason: string;
  };
};

export type FileStatusValue =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "ARCHIVED"
  | "OBSOLETE";

export const filesQuickViewMeta: Array<{ key: FilesQuickViewKey; label: string; description: string }> = [
  { key: "all", label: "全部文件", description: "浏览当前企业资料中心的所有正式文件和资料夹。" },
  { key: "recent", label: "最近文件", description: "优先查看最近 7 天有变动的档案资料。" },
  { key: "mine", label: "我上传的", description: "聚焦我负责上传或维护的文档。" },
  { key: "favorites", label: "我收藏的", description: "把高频使用的档案固定到一个入口。" },
  { key: "archived", label: "已归档", description: "查看已归档但仍需保留追溯的文件。" },
  { key: "important", label: "重要文件", description: "优先处理标记为重要的档案。" },
  { key: "pending-review", label: "待审核", description: "适用于需要审批或确认状态的正式资料。" },
  { key: "shared", label: "共享资料", description: "聚焦可以跨团队共享查看的资料。" },
  { key: "trash", label: "回收区", description: "查看已移出活跃清单的文件。" }
];

export const fileCategoryOptions = [
  "合同文件",
  "培训资料",
  "客户交付",
  "制度文件",
  "报价附件",
  "项目资料",
  "内部资料"
];

export const fileStatusOptions: Array<{ value: FileStatusValue; label: string }> = [
  { value: "DRAFT", label: "草稿" },
  { value: "PENDING_REVIEW", label: "待审核" },
  { value: "ACTIVE", label: "已生效" },
  { value: "ARCHIVED", label: "已归档" },
  { value: "OBSOLETE", label: "已废弃" }
];

export const fileSortOptions = [
  { value: "updated_desc", label: "最近更新" },
  { value: "updated_asc", label: "最早更新" },
  { value: "created_desc", label: "最近创建" },
  { value: "name_asc", label: "名称 A-Z" },
  { value: "name_desc", label: "名称 Z-A" },
  { value: "size_desc", label: "文件最大" },
  { value: "size_asc", label: "文件最小" }
];

export function formatFileDate(value?: string | null) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export function formatFileSize(value?: number | null) {
  if (!value || value <= 0) {
    return "--";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function fileStatusMeta(value?: string | null): { label: string; tone: Tone } {
  switch (value) {
    case "DRAFT":
      return { label: "草稿", tone: "warning" };
    case "PENDING_REVIEW":
      return { label: "待审核", tone: "warning" };
    case "ACTIVE":
      return { label: "已生效", tone: "success" };
    case "ARCHIVED":
      return { label: "已归档", tone: "neutral" };
    case "OBSOLETE":
      return { label: "已废弃", tone: "danger" };
    default:
      return { label: value || "未设置", tone: "neutral" };
  }
}

export function fileCategoryLabel(value?: string | null) {
  return value?.trim() || "未分类";
}

export function uploaderLabel(file: FileSummary) {
  return file.uploader.loginAccount
    ? `${file.uploader.name}（${file.uploader.loginAccount}）`
    : file.uploader.name;
}

export function fileExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function previewKind(file: Pick<FileSummary, "fileName" | "fileType">) {
  const type = file.fileType?.toLowerCase() ?? "";
  const extension = fileExtension(file.fileName);

  if (type.startsWith("image/")) {
    return "image";
  }

  if (type === "application/pdf" || extension === "pdf") {
    return "pdf";
  }

  if (type.startsWith("video/")) {
    return "video";
  }

  if (type.startsWith("audio/")) {
    return "audio";
  }

  if (
    ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(extension) ||
    [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ].includes(type)
  ) {
    return "office";
  }

  if (type.startsWith("text/") || ["txt", "md", "json", "csv", "log"].includes(extension)) {
    return "text";
  }

  return "download";
}

export function previewUrl(file: Pick<FileSummary, "fileName" | "fileType" | "fileUrl">) {
  if (previewKind(file) === "office") {
    return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(file.fileUrl)}`;
  }

  return file.fileUrl;
}

export function fileTypeKey(
  item: Pick<FileSummary, "fileName" | "fileType"> | Pick<FolderSummary, "itemType">
) {
  if ("itemType" in item && item.itemType === "folder") {
    return "folder";
  }

  if (!("fileName" in item)) {
    return "other";
  }

  const type = item.fileType?.toLowerCase() ?? "";
  const extension = fileExtension(item.fileName);

  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (extension === "pdf" || type === "application/pdf") return "pdf";
  if (["doc", "docx"].includes(extension)) return "word";
  if (["xls", "xlsx", "csv"].includes(extension)) return "excel";
  if (["ppt", "pptx"].includes(extension)) return "ppt";
  if (["zip", "rar", "7z"].includes(extension)) return "zip";
  return "other";
}

export function findFolderPath(tree: FolderTreeNode[], targetId: string): FolderTreeNode[] {
  for (const node of tree) {
    if (node.id === targetId) {
      return [node];
    }

    const childPath = findFolderPath(node.children, targetId);
    if (childPath.length) {
      return [node, ...childPath];
    }
  }

  return [];
}

export function collectFolderOptions(tree: FolderTreeNode[], depth = 0): Array<{ id: string; label: string }> {
  return tree.flatMap((node) => [
    { id: node.id, label: `${"　".repeat(depth)}${depth ? "└ " : ""}${node.name}` },
    ...collectFolderOptions(node.children, depth + 1)
  ]);
}
