import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { FileRecordStatus, Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { AuditService } from "../common/services/audit.service";
import { RecordPartitionService } from "../common/services/record-partition.service";
import type { UploadedImageFile } from "../product-parser/product-parser.types";
import { PrismaService } from "../prisma/prisma.service";
import { CosStorageService } from "./cos-storage.service";
import { CreateFileFolderDto } from "./dto/create-file-folder.dto";
import { CreateUploadTokenDto } from "./dto/create-upload-token.dto";
import { FileListQueryDto } from "./dto/file-list-query.dto";
import { FilesBatchActionDto } from "./dto/files-batch-action.dto";
import { LocalUploadDto } from "./dto/local-upload.dto";
import { UpdateFileFolderDto } from "./dto/update-file-folder.dto";
import { UpdateFileRecordDto } from "./dto/update-file-record.dto";
import { UploadCallbackDto } from "./dto/upload-callback.dto";

const recentDaysWindow = 7;
const trashRetentionDays = 90;
const trashRetentionMs = trashRetentionDays * 24 * 60 * 60 * 1000;
const visibleFolderCountSelect = {
  children: true,
  files: {
    where: {
      deletedAt: null
    }
  }
} satisfies Prisma.FileFolderCountOutputTypeSelect;

type FolderRecord = {
  id: string;
  name: string;
  parentId: string | null;
  category: string | null;
  tagText: string | null;
  permissionScope: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    children: number;
    files: number;
  };
};

type FolderTreeItem = {
  id: string;
  name: string;
  parentId: string | null;
  category: string | null;
  itemCount: number;
  updatedAt: Date;
  children: FolderTreeItem[];
};

type NormalizedQuery = {
  folderId: string | null;
  view: string;
  itemIds: string[];
  keyword: string;
  category: string;
  tag: string;
  status: FileRecordStatus | null;
  relatedType: string;
  uploaderUserId: string;
  deleteReason: string;
  sortBy: string;
  updatedFrom: Date | null;
  updatedTo: Date | null;
};

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cosStorageService: CosStorageService,
    private readonly auditService: AuditService,
    private readonly recordPartition: RecordPartitionService,
  ) {}

  @Cron("0 15 3 * * *", {
    timeZone: "Asia/Shanghai",
  })
  async purgeExpiredTrashFilesBySchedule() {
    await this.purgeExpiredTrashFiles("schedule");
  }

  private withPartition<
    T extends Prisma.FileFolderWhereInput | Prisma.FileRecordWhereInput
  >(user: AuthenticatedUser, baseWhere: T) {
    return this.recordPartition.mergeWhere(
      baseWhere,
      this.recordPartition.buildWhere(user) as T,
    );
  }

  createUploadToken(dto: CreateUploadTokenDto) {
    return this.cosStorageService.createUploadToken(dto);
  }

  async uploadLocalFile(
    file: UploadedImageFile | undefined,
    dto: LocalUploadDto,
    user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException("请先选择要上传的文件");
    }

    const businessType = this.normalizeLocalPathSegment(dto.businessType || "files_center");
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const extension = this.getFileExtension(dto.fileName || file.originalname);
    const storedFileName = `${Date.now()}_${randomUUID().slice(0, 8)}${extension}`;
    const relativePath = path.posix.join(businessType, day, storedFileName);
    const outputDir = path.join(this.getLocalUploadRoot(), businessType, day);
    const outputPath = path.join(outputDir, storedFileName);

    await mkdir(outputDir, { recursive: true });
    await writeFile(outputPath, file.buffer);

    return this.createFileRecord(
      {
        fileName: (dto.fileName?.trim() || file.originalname).trim(),
        fileUrl: `/uploads/${relativePath}`,
        fileType: dto.fileType?.trim() || file.mimetype,
        businessType: dto.businessType?.trim() || "files_center",
        businessId: dto.businessId,
        category: dto.category,
        tagText: dto.tagText,
        note: dto.note,
        relatedType: dto.relatedType,
        relatedId: dto.relatedId,
        folderId: dto.folderId,
        isImportant: dto.isImportant,
        status: dto.status,
        permissionScope: dto.permissionScope,
        versionGroupId: dto.versionGroupId,
        versionNote: dto.versionNote,
        fileSizeBytes: dto.fileSizeBytes ?? file.size,
      },
      user,
    );
  }

  async listLibrary(query: FileListQueryDto, user: AuthenticatedUser) {
    const options = this.normalizeQuery(query, user);
    if (options.view === "trash") {
      this.assertTrashManager(user);
    }

    if (this.canManageTrash(user)) {
      await this.purgeExpiredTrashFiles("request");
    }

    const allFolders = await this.prisma.fileFolder.findMany({
      where: this.withPartition(user, {}),
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        parentId: true,
        category: true,
        tagText: true,
        permissionScope: true,
        note: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: visibleFolderCountSelect
        }
      }
    });

    const currentFolder = options.folderId
      ? allFolders.find((folder) => folder.id === options.folderId) ?? null
      : null;

    if (options.folderId && !currentFolder) {
      throw new NotFoundException("资料夹不存在");
    }

    const descendantIds = currentFolder ? this.collectDescendantIds(allFolders, currentFolder.id) : [];
    const folderWhere = this.buildFolderWhere(options, user);
    const fileWhere = this.buildFileWhere(options, user, descendantIds);
    const [folders, files, breadcrumbs, stats] = await Promise.all([
      this.prisma.fileFolder.findMany({
        where: folderWhere,
        orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          parentId: true,
          category: true,
          tagText: true,
          permissionScope: true,
          note: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: visibleFolderCountSelect
          }
        }
      }),
      this.prisma.fileRecord.findMany({
        where: fileWhere,
        orderBy: this.buildFileOrderBy(options.sortBy),
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          fileType: true,
          fileSizeBytes: true,
          category: true,
          tagText: true,
          note: true,
          businessType: true,
          businessId: true,
          relatedType: true,
          relatedId: true,
          folderId: true,
          status: true,
          isImportant: true,
          isArchived: true,
          permissionScope: true,
          versionGroupId: true,
          versionNumber: true,
          versionNote: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          deletedByUserId: true,
          deletedReason: true,
          deletedBy: {
            select: {
              id: true,
              name: true,
              loginAccount: true
            }
          },
          uploader: {
            select: {
              id: true,
              name: true,
              loginAccount: true
            }
          }
        }
      }),
      currentFolder ? this.buildBreadcrumbs(currentFolder) : Promise.resolve([]),
      this.buildStats(user, options.itemIds)
    ]);

    return {
      view: options.view,
      sortBy: options.sortBy,
      currentFolder: currentFolder ? this.serializeFolder(currentFolder) : null,
      breadcrumbs,
      quickViews: this.buildQuickViews(stats, user),
      stats: {
        totalFolders: allFolders.length,
        totalFiles: stats.all,
        currentFolderCount: folders.length,
        currentFileCount: files.length
      },
      folderTree: this.buildFolderTree(allFolders, null),
      folders: folders.map((folder) => this.serializeFolder(folder)),
      files: files.map((file) => this.serializeFile(file)),
      filters: {
        keyword: options.keyword,
      category: options.category,
      tag: options.tag,
      status: options.status,
      relatedType: options.relatedType,
      uploaderUserId: options.uploaderUserId,
      deleteReason: options.deleteReason
      }
    };
  }

  async createFolder(dto: CreateFileFolderDto, user: AuthenticatedUser) {
    const name = dto.name.trim();
    const parentId = dto.parentId?.trim() || null;

    if (!name) {
      throw new BadRequestException("资料夹名称不能为空");
    }

    if (parentId) {
      await this.ensureFolderExists(parentId, user);
    }

    await this.ensureFolderNameAvailable(parentId, name, user);
    const partition = await this.recordPartition.getWritableCreateData(user);

    const folder = await this.prisma.fileFolder.create({
      data: {
        name,
        parentId,
        category: this.normalizeNullableText(dto.category),
        tagText: this.normalizeTags(dto.tagText),
        permissionScope: this.normalizeNullableText(dto.permissionScope),
        note: this.normalizeNullableText(dto.note),
        createdByUserId: user.id,
        dataScope: partition.dataScope,
        partitionKey: partition.partitionKey,
        testBatchId: partition.testBatchId,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        category: true,
        tagText: true,
        permissionScope: true,
        note: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: visibleFolderCountSelect
        }
      }
    });

    await this.touchFolderChain(parentId);
    return this.serializeFolder(folder);
  }

  async updateFolder(id: string, dto: UpdateFileFolderDto, user: AuthenticatedUser) {
    const folder = await this.prisma.fileFolder.findFirst({
      where: this.withPartition(user, { id }),
      select: {
        id: true,
        name: true,
        parentId: true
      }
    });

    if (!folder) {
      throw new NotFoundException("资料夹不存在");
    }

    const nextName = dto.name?.trim();
    if (typeof nextName === "string") {
      if (!nextName) {
        throw new BadRequestException("资料夹名称不能为空");
      }

      if (nextName !== folder.name) {
        await this.ensureFolderNameAvailable(folder.parentId, nextName, user, folder.id);
      }
    }

    const updated = await this.prisma.fileFolder.update({
      where: { id },
      data: {
        name: nextName ?? undefined,
        category: this.normalizeOptionalText(dto.category),
        tagText: this.normalizeOptionalTags(dto.tagText),
        permissionScope: this.normalizeOptionalText(dto.permissionScope),
        note: this.normalizeOptionalText(dto.note)
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        category: true,
        tagText: true,
        permissionScope: true,
        note: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: visibleFolderCountSelect
        }
      }
    });

    await this.touchFolderChain(updated.parentId);
    return this.serializeFolder(updated);
  }

  async deleteFolder(id: string, user: AuthenticatedUser) {
    const folder = await this.prisma.fileFolder.findFirst({
      where: this.withPartition(user, { id }),
      select: {
        id: true,
        parentId: true,
        _count: {
          select: visibleFolderCountSelect
        }
      }
    });

    if (!folder) {
      throw new NotFoundException("资料夹不存在");
    }

    const trashedFileCount = await this.prisma.fileRecord.count({
      where: this.withPartition(user, {
        folderId: id,
        deletedAt: {
          not: null
        }
      })
    });

    if (folder._count.children > 0 || folder._count.files > 0) {
      throw new BadRequestException("请先清空子资料夹和文件后再删除");
    }

    if (trashedFileCount > 0) {
      throw new BadRequestException("该资料夹还有回收区文件，请先由管理员恢复或彻底删除后再移除资料夹");
    }

    await this.prisma.fileFolder.delete({
      where: { id }
    });

    await this.touchFolderChain(folder.parentId);
    return { success: true };
  }

  async createFileRecord(dto: UploadCallbackDto, user: AuthenticatedUser) {
    const folderId = dto.folderId?.trim() || null;
    if (folderId) {
      await this.ensureFolderExists(folderId, user);
    }

    const requestedVersionGroupId = dto.versionGroupId?.trim() || null;
    const versionGroupId = requestedVersionGroupId ?? null;
    let versionNumber = 1;

    if (versionGroupId) {
      const latestVersion = await this.prisma.fileRecord.findFirst({
        where: this.withPartition(user, { versionGroupId }),
        orderBy: [{ versionNumber: "desc" }, { createdAt: "desc" }],
        select: { versionNumber: true }
      });
      versionNumber = (latestVersion?.versionNumber ?? 0) + 1;
    }

    const normalizedStatus = this.normalizeStatus(dto.status) ?? FileRecordStatus.ACTIVE;
    const partition = await this.recordPartition.getWritableCreateData(user);
    const created = await this.prisma.fileRecord.create({
      data: {
        fileName: dto.fileName.trim(),
        fileUrl: dto.fileUrl,
        fileType: this.normalizeNullableText(dto.fileType),
        fileSizeBytes: dto.fileSizeBytes,
        category: this.normalizeNullableText(dto.category ?? dto.businessType),
        tagText: this.normalizeTags(dto.tagText),
        note: this.normalizeNullableText(dto.note),
        businessType: this.normalizeNullableText(dto.businessType),
        businessId: this.normalizeNullableText(dto.businessId),
        relatedType: this.normalizeNullableText(dto.relatedType),
        relatedId: this.normalizeNullableText(dto.relatedId),
        folderId,
        status: normalizedStatus,
        isImportant: dto.isImportant ?? false,
        isArchived: normalizedStatus === FileRecordStatus.ARCHIVED,
        permissionScope: this.normalizeNullableText(dto.permissionScope),
        versionGroupId,
        versionNumber,
        versionNote: this.normalizeNullableText(dto.versionNote),
        uploaderUserId: user.id,
        dataScope: partition.dataScope,
        partitionKey: partition.partitionKey,
        testBatchId: partition.testBatchId,
      },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileType: true,
        fileSizeBytes: true,
        category: true,
        tagText: true,
        note: true,
        businessType: true,
        businessId: true,
        relatedType: true,
        relatedId: true,
        folderId: true,
        status: true,
        isImportant: true,
        isArchived: true,
        permissionScope: true,
        versionGroupId: true,
        versionNumber: true,
        versionNote: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        deletedByUserId: true,
        deletedReason: true,
        deletedBy: {
          select: {
            id: true,
            name: true,
            loginAccount: true
          }
        },
        uploader: {
          select: {
            id: true,
            name: true,
            loginAccount: true
          }
        }
      }
    });

    const file =
      created.versionGroupId === null
        ? await this.prisma.fileRecord.update({
            where: { id: created.id },
            data: {
              versionGroupId: created.id
            },
            select: {
              id: true,
              fileName: true,
              fileUrl: true,
              fileType: true,
              fileSizeBytes: true,
              category: true,
              tagText: true,
              note: true,
              businessType: true,
              businessId: true,
              relatedType: true,
              relatedId: true,
              folderId: true,
              status: true,
              isImportant: true,
              isArchived: true,
              permissionScope: true,
              versionGroupId: true,
              versionNumber: true,
              versionNote: true,
              createdAt: true,
              updatedAt: true,
              deletedAt: true,
              deletedByUserId: true,
              deletedReason: true,
              deletedBy: {
                select: {
                  id: true,
                  name: true,
                  loginAccount: true
                }
              },
              uploader: {
                select: {
                  id: true,
                  name: true,
                  loginAccount: true
                }
              }
            }
          })
        : created;

    await this.touchFolderChain(folderId);
    return this.serializeFile(file);
  }

  async updateFileById(id: string, dto: UpdateFileRecordDto, user: AuthenticatedUser) {
    const file = await this.prisma.fileRecord.findFirst({
      where: this.withPartition(user, {
        id,
        deletedAt: null
      }),
      select: {
        id: true,
        fileName: true,
        folderId: true,
        status: true,
        isArchived: true
      }
    });

    if (!file) {
      throw new NotFoundException("文件不存在");
    }

    const nextFileName = dto.fileName?.trim();
    if (typeof nextFileName === "string" && !nextFileName) {
      throw new BadRequestException("文件名称不能为空");
    }

    const nextFolderId =
      typeof dto.folderId === "string" ? dto.folderId.trim() || null : undefined;
    if (typeof nextFolderId === "string" && nextFolderId) {
      await this.ensureFolderExists(nextFolderId, user);
    }

    const nextStatus = this.normalizeStatus(dto.status);
    const shouldArchive =
      dto.isArchived === true || nextStatus === FileRecordStatus.ARCHIVED
        ? true
        : dto.isArchived === false
          ? false
          : undefined;

    const updated = await this.prisma.fileRecord.update({
      where: { id },
      data: {
        fileName: nextFileName ?? undefined,
        category: this.normalizeOptionalText(dto.category),
        tagText: this.normalizeOptionalTags(dto.tagText),
        note: this.normalizeOptionalText(dto.note),
        relatedType: this.normalizeOptionalText(dto.relatedType),
        relatedId: this.normalizeOptionalText(dto.relatedId),
        folderId: nextFolderId,
        isImportant: dto.isImportant,
        isArchived: shouldArchive,
        status:
          nextStatus ??
          (shouldArchive === true
            ? FileRecordStatus.ARCHIVED
            : shouldArchive === false && file.status === FileRecordStatus.ARCHIVED
              ? FileRecordStatus.ACTIVE
              : undefined),
        permissionScope: this.normalizeOptionalText(dto.permissionScope),
        versionNote: this.normalizeOptionalText(dto.versionNote)
      },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileType: true,
        fileSizeBytes: true,
        category: true,
        tagText: true,
        note: true,
        businessType: true,
        businessId: true,
        relatedType: true,
        relatedId: true,
        folderId: true,
        status: true,
        isImportant: true,
        isArchived: true,
        permissionScope: true,
        versionGroupId: true,
        versionNumber: true,
        versionNote: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        deletedByUserId: true,
        deletedReason: true,
        deletedBy: {
          select: {
            id: true,
            name: true,
            loginAccount: true
          }
        },
        uploader: {
          select: {
            id: true,
            name: true,
            loginAccount: true
          }
        }
      }
    });

    if (file.folderId !== updated.folderId) {
      await Promise.all([this.touchFolderChain(file.folderId), this.touchFolderChain(updated.folderId)]);
    } else {
      await this.touchFolderChain(updated.folderId);
    }

    return this.serializeFile(updated);
  }

  async batchAction(dto: FilesBatchActionDto, user: AuthenticatedUser) {
    const action = dto.action.trim().toLowerCase();
    const fileIds = this.normalizeIdList(dto.fileIds ?? []);
    const folderIds = this.normalizeIdList(dto.folderIds ?? []);
    const deleteReason = this.normalizeDeleteReason(dto.deleteReason);

    if (action === "empty_trash") {
      this.assertTrashManager(user);
      if (!deleteReason) {
        throw new BadRequestException("请填写清空回收区原因");
      }

      const trashFiles = await this.prisma.fileRecord.findMany({
        where: this.withPartition(user, {
          deletedAt: {
            not: null
          }
        }),
        select: {
          id: true,
          fileUrl: true,
          folderId: true,
          fileName: true
        }
      });

      await this.purgeFiles(trashFiles);
      if (trashFiles.length) {
        await this.auditService.log({
          userId: user.id,
          action: "DELETE",
          module: "档案",
          targetType: "FileRecord",
          targetName: "回收区",
          content: `清空回收区。原因：${deleteReason}`,
          afterSummary: `彻底删除 ${trashFiles.length} 个文件：${this.buildAuditFileNameSummary(trashFiles.map((file) => file.fileName))}`
        });
      }
      return {
        success: true,
        purgedCount: trashFiles.length
      };
    }

    if (!fileIds.length && !folderIds.length) {
      throw new BadRequestException("请先选择需要处理的文件或资料夹");
    }

    if (action === "archive") {
      if (!fileIds.length) {
        throw new BadRequestException("请选择需要归档的文件");
      }

      await this.prisma.fileRecord.updateMany({
        where: this.withPartition(user, {
          id: { in: fileIds },
          deletedAt: null
        }),
        data: {
          isArchived: true,
          status: FileRecordStatus.ARCHIVED
        }
      });

      const touchedFolders = await this.prisma.fileRecord.findMany({
        where: this.withPartition(user, { id: { in: fileIds } }),
        select: { folderId: true }
      });
      await Promise.all(touchedFolders.map((item) => this.touchFolderChain(item.folderId)));
      return { success: true };
    }

    if (action === "delete") {
      const trashDeleteReason = deleteReason || "成员手动删除";
      if (fileIds.length) {
        await this.prisma.fileRecord.updateMany({
          where: this.withPartition(user, {
            id: { in: fileIds },
            deletedAt: null
          }),
          data: {
            deletedAt: new Date(),
            deletedByUserId: user.id,
            deletedReason: trashDeleteReason
          }
        });
      }

      for (const folderId of folderIds) {
        await this.deleteFolder(folderId, user);
      }

      return { success: true };
    }

    if (action === "restore") {
      this.assertTrashManager(user);
      if (!fileIds.length) {
        throw new BadRequestException("请选择需要恢复的文件");
      }

      await this.prisma.fileRecord.updateMany({
        where: this.withPartition(user, {
          id: { in: fileIds },
          deletedAt: {
            not: null
          }
        }),
        data: {
          deletedAt: null,
          deletedByUserId: null,
          deletedReason: null
        }
      });

      const touchedFolders = await this.prisma.fileRecord.findMany({
        where: this.withPartition(user, {
          id: { in: fileIds }
        }),
        select: { folderId: true }
      });
      await Promise.all(touchedFolders.map((item) => this.touchFolderChain(item.folderId)));

      return { success: true };
    }

    if (action === "purge") {
      this.assertTrashManager(user);
      if (!fileIds.length) {
        throw new BadRequestException("请选择需要彻底删除的文件");
      }
      if (!deleteReason) {
        throw new BadRequestException("请填写彻底删除原因");
      }

      const trashFiles = await this.prisma.fileRecord.findMany({
        where: this.withPartition(user, {
          id: { in: fileIds },
          deletedAt: {
            not: null
          }
        }),
        select: {
          id: true,
          fileUrl: true,
          folderId: true,
          fileName: true
        }
      });

      await this.purgeFiles(trashFiles);
      if (trashFiles.length) {
        await this.auditService.log({
          userId: user.id,
          action: "DELETE",
          module: "档案",
          targetType: "FileRecord",
          targetName:
            trashFiles.length === 1 ? trashFiles[0].fileName : `批量彻底删除 ${trashFiles.length} 个文件`,
          content: `彻底删除回收区文件。原因：${deleteReason}`,
          afterSummary: this.buildAuditFileNameSummary(trashFiles.map((file) => file.fileName))
        });
      }
      return {
        success: true,
        purgedCount: trashFiles.length
      };
    }

    if (action === "move") {
      const targetFolderId = dto.targetFolderId?.trim() || null;
      if (targetFolderId) {
        await this.ensureFolderExists(targetFolderId, user);
      }

      if (fileIds.length) {
        const movingFiles = await this.prisma.fileRecord.findMany({
          where: this.withPartition(user, {
            id: { in: fileIds },
            deletedAt: null
          }),
          select: {
            id: true,
            folderId: true
          }
        });

        await this.prisma.fileRecord.updateMany({
          where: this.withPartition(user, {
            id: { in: fileIds },
            deletedAt: null
          }),
          data: {
            folderId: targetFolderId
          }
        });

        await Promise.all(
          movingFiles.flatMap((file) => [this.touchFolderChain(file.folderId), this.touchFolderChain(targetFolderId)])
        );
      }

      for (const folderId of folderIds) {
        await this.moveFolder(folderId, targetFolderId, user);
      }

      return { success: true };
    }

    if (action === "update_metadata") {
      const nextStatus = this.normalizeStatus(dto.status);

      if (fileIds.length) {
        await this.prisma.fileRecord.updateMany({
          where: this.withPartition(user, {
            id: { in: fileIds },
            deletedAt: null
          }),
          data: {
            category: this.normalizeOptionalText(dto.category),
            tagText: this.normalizeOptionalTags(dto.tagText),
            isImportant: dto.isImportant,
            status: nextStatus ?? undefined,
            isArchived: nextStatus ? nextStatus === FileRecordStatus.ARCHIVED : undefined
          }
        });
      }

      if (folderIds.length) {
        await this.prisma.fileFolder.updateMany({
          where: this.withPartition(user, {
            id: { in: folderIds }
          }),
          data: {
            category: this.normalizeOptionalText(dto.category),
            tagText: this.normalizeOptionalTags(dto.tagText)
          }
        });
      }

      return { success: true };
    }

    throw new BadRequestException("不支持的批量操作");
  }

  async getFileById(id: string, user: AuthenticatedUser) {
    const file = await this.prisma.fileRecord.findFirst({
      where: this.withPartition(user, {
        id,
        ...(this.canManageTrash(user) ? {} : { deletedAt: null })
      }),
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            parentId: true,
            category: true,
            tagText: true,
            permissionScope: true,
            note: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: visibleFolderCountSelect
            }
          }
        },
        uploader: {
          select: {
            id: true,
            name: true,
            loginAccount: true
          }
        },
        deletedBy: {
          select: {
            id: true,
            name: true,
            loginAccount: true
          }
        }
      }
    });

    if (!file) {
      throw new NotFoundException("文件不存在");
    }

    const versionGroupId = file.versionGroupId ?? file.id;
    const [breadcrumbs, versions] = await Promise.all([
      file.folder ? this.buildBreadcrumbs(file.folder) : Promise.resolve([]),
      this.prisma.fileRecord.findMany({
        where: this.withPartition(user, {
          versionGroupId,
          ...(file.deletedAt ? {} : { deletedAt: null })
        }),
        orderBy: [{ versionNumber: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          fileType: true,
          versionGroupId: true,
          versionNumber: true,
          versionNote: true,
          createdAt: true,
          updatedAt: true,
          uploader: {
            select: {
              id: true,
              name: true,
              loginAccount: true
            }
          }
        }
      })
    ]);

    return {
      itemType: "file",
      breadcrumbs,
      file: this.serializeFile(file),
      versions: versions.map((item) => ({
        id: item.id,
        fileName: item.fileName,
        fileUrl: item.fileUrl,
        fileType: item.fileType,
        versionGroupId: item.versionGroupId,
        versionNumber: item.versionNumber,
        versionNote: item.versionNote,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        uploader: item.uploader
      })),
      activityLogs: this.buildActivityLogs(file, versions.length)
    };
  }

  private normalizeQuery(query: FileListQueryDto, user: AuthenticatedUser): NormalizedQuery {
    return {
      folderId: query.folderId?.trim() || null,
      view: (query.view?.trim().toLowerCase() || "all").replace(/_/g, "-"),
      itemIds: this.parseCommaSeparatedIds(query.itemIds),
      keyword: query.keyword?.trim() || "",
      category: query.category?.trim() || "",
      tag: query.tag?.trim() || "",
      status: this.normalizeStatus(query.status),
      relatedType: query.relatedType?.trim() || "",
      uploaderUserId:
        query.uploaderUserId?.trim() || (query.view?.trim().toLowerCase() === "mine" ? user.id : ""),
      deleteReason: query.deleteReason?.trim() || "",
      sortBy: query.sortBy?.trim() || "updated_desc",
      updatedFrom: this.parseDate(query.updatedFrom),
      updatedTo: this.parseDate(query.updatedTo, true)
    };
  }

  private getLocalUploadRoot() {
    return process.env.LOCAL_UPLOAD_DIR?.trim() || path.join(process.cwd(), "storage/uploads");
  }

  private normalizeLocalPathSegment(value: string) {
    const normalized = value.trim().replace(/[^a-zA-Z0-9/_-]+/g, "-").replace(/^\/+|\/+$/g, "");
    return normalized || "files_center";
  }

  private getFileExtension(fileName: string) {
    const cleanName = fileName.trim();
    const match = cleanName.match(/(\.[a-zA-Z0-9]+)$/);
    return match?.[1]?.toLowerCase() ?? "";
  }

  private buildFolderWhere(options: NormalizedQuery, user: AuthenticatedUser): Prisma.FileFolderWhereInput {
    const where: Prisma.FileFolderWhereInput = {};

    if (options.view === "favorites" && options.itemIds.length) {
      where.id = { in: options.itemIds };
    } else if (options.view !== "all" && !options.folderId) {
      where.id = {
        in: []
      };
    } else {
      where.parentId = options.folderId;
    }

    if (options.keyword) {
      where.name = {
        contains: options.keyword
      };
    }

    if (options.category) {
      where.category = options.category;
    }

    if (options.tag) {
      where.tagText = {
        contains: options.tag
      };
    }

    return this.withPartition(user, where);
  }

  private buildFileWhere(
    options: NormalizedQuery,
    user: AuthenticatedUser,
    descendantIds: string[]
  ): Prisma.FileRecordWhereInput {
    const where: Prisma.FileRecordWhereInput = {};

    if (options.view === "trash") {
      where.deletedAt = {
        not: null
      };
    } else {
      where.deletedAt = null;
    }

    switch (options.view) {
      case "recent":
        where.updatedAt = {
          gte: this.getRecentBoundary()
        };
        break;
      case "mine":
        where.uploaderUserId = user.id;
        break;
      case "favorites":
        where.id = {
          in: options.itemIds.length ? options.itemIds : ["__never__"]
        };
        break;
      case "archived":
        where.OR = [{ isArchived: true }, { status: FileRecordStatus.ARCHIVED }];
        break;
      case "important":
        where.isImportant = true;
        break;
      case "pending-review":
        where.status = FileRecordStatus.PENDING_REVIEW;
        break;
      case "shared":
        where.permissionScope = {
          contains: "shared"
        };
        break;
      default:
        break;
    }

    if (options.folderId) {
      if (options.keyword) {
        where.folderId = {
          in: [options.folderId, ...descendantIds]
        };
      } else if (options.view === "all") {
        where.folderId = options.folderId;
      }
    } else if (options.view === "all") {
      where.folderId = null;
    }

    if (options.keyword) {
      where.fileName = {
        contains: options.keyword
      };
    }

    if (options.category) {
      where.category = options.category;
    }

    if (options.tag) {
      where.tagText = {
        contains: options.tag
      };
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.relatedType) {
      where.relatedType = options.relatedType;
    }

    if (options.uploaderUserId) {
      where.uploaderUserId = options.uploaderUserId;
    }

    if (options.deleteReason) {
      where.deletedReason = {
        contains: options.deleteReason
      };
    }

    if (options.updatedFrom || options.updatedTo) {
      where.updatedAt = {
        ...(where.updatedAt && typeof where.updatedAt === "object" ? where.updatedAt : {}),
        ...(options.updatedFrom ? { gte: options.updatedFrom } : {}),
        ...(options.updatedTo ? { lte: options.updatedTo } : {})
      };
    }

    return this.withPartition(user, where);
  }

  private buildFileOrderBy(sortBy: string): Prisma.FileRecordOrderByWithRelationInput[] {
    switch (sortBy) {
      case "updated_asc":
        return [{ updatedAt: "asc" }, { fileName: "asc" }];
      case "created_desc":
        return [{ createdAt: "desc" }, { fileName: "asc" }];
      case "name_asc":
        return [{ fileName: "asc" }];
      case "name_desc":
        return [{ fileName: "desc" }];
      case "size_desc":
        return [{ fileSizeBytes: "desc" }, { updatedAt: "desc" }];
      case "size_asc":
        return [{ fileSizeBytes: "asc" }, { updatedAt: "desc" }];
      default:
        return [{ updatedAt: "desc" }, { fileName: "asc" }];
    }
  }

  private async buildStats(user: AuthenticatedUser, favoriteIds: string[]) {
    const [all, recent, mine, archived, important, pendingReview, shared, trash, favoriteFiles, favoriteFolders] =
      await Promise.all([
        this.prisma.fileRecord.count({ where: this.withPartition(user, { deletedAt: null }) }),
        this.prisma.fileRecord.count({
          where: this.withPartition(user, {
            deletedAt: null,
            updatedAt: {
              gte: this.getRecentBoundary()
            }
          })
        }),
        this.prisma.fileRecord.count({
          where: this.withPartition(user, {
            deletedAt: null,
            uploaderUserId: user.id
          })
        }),
        this.prisma.fileRecord.count({
          where: this.withPartition(user, {
            deletedAt: null,
            OR: [{ isArchived: true }, { status: FileRecordStatus.ARCHIVED }]
          })
        }),
        this.prisma.fileRecord.count({
          where: this.withPartition(user, {
            deletedAt: null,
            isImportant: true
          })
        }),
        this.prisma.fileRecord.count({
          where: this.withPartition(user, {
            deletedAt: null,
            status: FileRecordStatus.PENDING_REVIEW
          })
        }),
        this.prisma.fileRecord.count({
          where: this.withPartition(user, {
            deletedAt: null,
            permissionScope: {
              contains: "shared"
            }
          })
        }),
        this.canManageTrash(user)
          ? this.prisma.fileRecord.count({
              where: this.withPartition(user, {
                deletedAt: {
                  not: null
                }
              })
            })
          : Promise.resolve(0),
        favoriteIds.length
          ? this.prisma.fileRecord.count({
              where: this.withPartition(user, {
                id: {
                  in: favoriteIds
                },
                deletedAt: null
              })
            })
          : Promise.resolve(0),
        favoriteIds.length
          ? this.prisma.fileFolder.count({
              where: this.withPartition(user, {
                id: {
                  in: favoriteIds
                }
              })
            })
          : Promise.resolve(0)
      ]);

    return {
      all,
      recent,
      mine,
      favorites: favoriteFiles + favoriteFolders,
      archived,
      important,
      pendingReview,
      shared,
      trash
    };
  }

  private buildQuickViews(stats: Record<string, number>, user: Pick<AuthenticatedUser, "roleCode">) {
    const quickViews = [
      { key: "all", label: "全部文件", count: stats.all },
      { key: "recent", label: "最近文件", count: stats.recent },
      { key: "mine", label: "我上传的", count: stats.mine },
      { key: "favorites", label: "我收藏的", count: stats.favorites },
      { key: "archived", label: "已归档", count: stats.archived },
      { key: "important", label: "重要文件", count: stats.important },
      { key: "pending-review", label: "待审核", count: stats.pendingReview },
      { key: "shared", label: "共享资料", count: stats.shared },
      { key: "trash", label: "回收区", count: stats.trash }
    ];

    return this.canManageTrash(user) ? quickViews : quickViews.filter((item) => item.key !== "trash");
  }

  private serializeFolder(folder: FolderRecord) {
    return {
      id: folder.id,
      itemType: "folder" as const,
      name: folder.name,
      parentId: folder.parentId,
      category: folder.category,
      tags: this.parseTags(folder.tagText),
      permissionScope: folder.permissionScope,
      note: folder.note,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
      childFolderCount: folder._count.children,
      fileCount: folder._count.files,
      itemCount: folder._count.children + folder._count.files
    };
  }

  private serializeFile(file: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string | null;
    fileSizeBytes: number | null;
    category: string | null;
    tagText: string | null;
    note: string | null;
    businessType: string | null;
    businessId: string | null;
    relatedType: string | null;
    relatedId: string | null;
    folderId: string | null;
    status: FileRecordStatus;
    isImportant: boolean;
    isArchived: boolean;
    permissionScope: string | null;
    versionGroupId: string | null;
    versionNumber: number;
    versionNote: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    deletedReason: string | null;
    deletedBy: {
      id: string;
      name: string;
      loginAccount: string | null;
    } | null;
    uploader: {
      id: string;
      name: string;
      loginAccount: string | null;
    };
  }) {
    const retentionExpiresAt = this.getTrashRetentionExpiresAt(file.deletedAt);
    return {
      id: file.id,
      itemType: "file" as const,
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      fileType: file.fileType,
      fileSizeBytes: file.fileSizeBytes,
      category: file.category,
      tags: this.parseTags(file.tagText),
      note: file.note,
      businessType: file.businessType,
      businessId: file.businessId,
      relatedEntity:
        file.relatedType || file.relatedId
          ? {
              type: file.relatedType,
              id: file.relatedId,
              name: file.relatedId ?? file.businessId ?? file.relatedType
            }
          : null,
      folderId: file.folderId,
      status: file.status,
      isImportant: file.isImportant,
      isArchived: file.isArchived,
      permissionScope: file.permissionScope,
      versionGroupId: file.versionGroupId,
      versionNumber: file.versionNumber,
      versionNote: file.versionNote,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      deletedAt: file.deletedAt,
      deletedReason: file.deletedAt ? file.deletedReason ?? "成员手动删除" : null,
      deletedBy: file.deletedAt ? file.deletedBy : null,
      retentionPolicyDays: file.deletedAt ? trashRetentionDays : null,
      retentionExpiresAt,
      retentionDaysRemaining: this.getTrashRetentionDaysRemaining(retentionExpiresAt),
      uploader: file.uploader
    };
  }

  private buildFolderTree(folders: FolderRecord[], parentId: string | null): FolderTreeItem[] {
    return folders
      .filter((folder) => folder.parentId === parentId)
      .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))
      .map((folder) => ({
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        category: folder.category,
        itemCount: folder._count.children + folder._count.files,
        updatedAt: folder.updatedAt,
        children: this.buildFolderTree(folders, folder.id)
      }));
  }

  private collectDescendantIds(folders: FolderRecord[], rootId: string) {
    const descendants: string[] = [];
    const queue = [rootId];

    while (queue.length) {
      const parentId = queue.shift() ?? null;
      const children = folders.filter((folder) => folder.parentId === parentId);
      for (const child of children) {
        descendants.push(child.id);
        queue.push(child.id);
      }
    }

    return descendants;
  }

  private buildActivityLogs(
    file: {
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
      deletedReason: string | null;
      deletedBy: { name: string } | null;
      uploader: { name: string };
      versionNote: string | null;
      isArchived: boolean;
      status: FileRecordStatus;
      relatedType: string | null;
      relatedId: string | null;
    },
    versionCount: number
  ) {
    const logs = [
      {
        id: "created",
        userName: file.uploader.name,
        action: "上传了文件",
        target: "当前版本",
        time: file.createdAt
      }
    ];

    if (versionCount > 1) {
      logs.push({
        id: "version",
        userName: file.uploader.name,
        action: "维护了版本链",
        target: `当前共有 ${versionCount} 个版本`,
        time: file.updatedAt
      });
    }

    if (file.versionNote) {
      logs.push({
        id: "version-note",
        userName: file.uploader.name,
        action: "补充了版本说明",
        target: file.versionNote,
        time: file.updatedAt
      });
    }

    if (file.isArchived || file.status === FileRecordStatus.ARCHIVED) {
      logs.push({
        id: "archived",
        userName: file.uploader.name,
        action: "标记为已归档",
        target: "归档记录",
        time: file.updatedAt
      });
    }

    if (file.deletedAt) {
      logs.push({
        id: "deleted",
        userName: file.deletedBy?.name ?? "历史记录未保留",
        action: "移入了回收区",
        target: file.deletedReason ?? "成员手动删除",
        time: file.deletedAt
      });
    }

    if (file.relatedType || file.relatedId) {
      logs.push({
        id: "related",
        userName: file.uploader.name,
        action: "关联了业务对象",
        target: `${file.relatedType ?? "对象"} ${file.relatedId ?? ""}`.trim(),
        time: file.updatedAt
      });
    }

    return logs.sort((left, right) => right.time.getTime() - left.time.getTime());
  }

  private async moveFolder(folderId: string, targetFolderId: string | null, user: AuthenticatedUser) {
    const folder = await this.prisma.fileFolder.findFirst({
      where: this.withPartition(user, { id: folderId }),
      select: {
        id: true,
        name: true,
        parentId: true
      }
    });

    if (!folder) {
      throw new NotFoundException("资料夹不存在");
    }

    if (targetFolderId === folder.id) {
      throw new BadRequestException("不能把资料夹移动到自身");
    }

    if (targetFolderId) {
      await this.ensureFolderExists(targetFolderId, user);
      await this.ensureFolderMoveAllowed(folder.id, targetFolderId, user);
      await this.ensureFolderNameAvailable(targetFolderId, folder.name, user, folder.id);
    } else {
      await this.ensureFolderNameAvailable(null, folder.name, user, folder.id);
    }

    await this.prisma.fileFolder.update({
      where: { id: folder.id },
      data: {
        parentId: targetFolderId
      }
    });

    await Promise.all([this.touchFolderChain(folder.parentId), this.touchFolderChain(targetFolderId)]);
  }

  private canManageTrash(user: Pick<AuthenticatedUser, "roleCode">) {
    return user.roleCode === "SUPER_ADMIN" || user.roleCode === "ADMIN";
  }

  private assertTrashManager(user: Pick<AuthenticatedUser, "roleCode">) {
    if (!this.canManageTrash(user)) {
      throw new ForbiddenException("只有管理员可以查看和清理回收区");
    }
  }

  private async ensureFolderMoveAllowed(folderId: string, targetFolderId: string, user: AuthenticatedUser) {
    let pointer = targetFolderId;

    while (pointer) {
      if (pointer === folderId) {
        throw new BadRequestException("不能把资料夹移动到自己的子层级");
      }

      const folder = await this.prisma.fileFolder.findFirst({
        where: this.withPartition(user, { id: pointer }),
        select: { parentId: true }
      });

      if (!folder?.parentId) {
        break;
      }

      pointer = folder.parentId;
    }
  }

  private async ensureFolderExists(id: string, user: AuthenticatedUser) {
    const folder = await this.prisma.fileFolder.findFirst({
      where: this.withPartition(user, { id }),
      select: { id: true }
    });

    if (!folder) {
      throw new NotFoundException("资料夹不存在");
    }

    return folder;
  }

  private async ensureFolderNameAvailable(parentId: string | null, name: string, user: AuthenticatedUser, excludeId?: string) {
    const duplicatedFolder = await this.prisma.fileFolder.findFirst({
      where: this.withPartition(user, {
        parentId,
        name,
        ...(excludeId ? { id: { not: excludeId } } : {})
      }),
      select: { id: true }
    });

    if (duplicatedFolder) {
      throw new BadRequestException("当前层级已存在同名资料夹");
    }
  }

  private async buildBreadcrumbs(folder: FolderRecord) {
    const breadcrumbs = [folder];
    let pointer = folder.parentId;

    while (pointer) {
      const current = await this.prisma.fileFolder.findUnique({
        where: { id: pointer },
        select: {
          id: true,
          name: true,
          parentId: true,
          category: true,
          tagText: true,
          permissionScope: true,
          note: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: visibleFolderCountSelect
          }
        }
      });

      if (!current) {
        break;
      }

      breadcrumbs.push(current);
      pointer = current.parentId;
    }

    return breadcrumbs.reverse().map((item) => this.serializeFolder(item));
  }

  private async touchFolderChain(folderId: string | null) {
    let pointer = folderId;

    while (pointer) {
      const folder = await this.prisma.fileFolder.update({
        where: { id: pointer },
        data: {
          updatedAt: new Date()
        },
        select: { parentId: true }
      });

      pointer = folder.parentId;
    }
  }

  private getTrashRetentionExpiresAt(deletedAt: Date | null) {
    if (!deletedAt) {
      return null;
    }

    return new Date(deletedAt.getTime() + trashRetentionMs);
  }

  private getTrashRetentionDaysRemaining(retentionExpiresAt: Date | null) {
    if (!retentionExpiresAt) {
      return null;
    }

    const remainingMs = retentionExpiresAt.getTime() - Date.now();
    if (remainingMs <= 0) {
      return 0;
    }

    return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  }

  private normalizeDeleteReason(value?: string | null) {
    if (!value) {
      return "";
    }

    const normalized = value.trim();
    return normalized ? normalized : "";
  }

  private buildAuditFileNameSummary(fileNames: string[]) {
    const names = fileNames.filter(Boolean);
    if (!names.length) {
      return "未命名文件";
    }

    if (names.length <= 3) {
      return names.join("、");
    }

    return `${names.slice(0, 3).join("、")} 等 ${names.length} 个文件`;
  }

  private async purgeExpiredTrashFiles(source: "schedule" | "request") {
    const cutoff = new Date(Date.now() - trashRetentionMs);
    const expiredFiles = await this.prisma.fileRecord.findMany({
      where: {
        deletedAt: {
          not: null,
          lte: cutoff,
        },
      },
      select: {
        id: true,
        fileUrl: true,
        folderId: true,
      },
    });

    if (!expiredFiles.length) {
      return 0;
    }

    await this.purgeFiles(expiredFiles);
    this.logger.log(
      `${source === "schedule" ? "定时任务" : "访问触发"}已清理 ${expiredFiles.length} 个超过 ${trashRetentionDays} 天保留期的回收区文件`,
    );
    return expiredFiles.length;
  }

  private async purgeFiles(files: Array<{ id: string; fileUrl: string; folderId: string | null }>) {
    if (!files.length) {
      return;
    }

    const fileIds = files.map((file) => file.id);
    await this.prisma.fileRecord.deleteMany({
      where: {
        id: {
          in: fileIds
        }
      }
    });

    const uniqueUrls = Array.from(new Set(files.map((file) => file.fileUrl).filter(Boolean)));
    await Promise.all(
      uniqueUrls.map(async (fileUrl) => {
        const remainingCount = await this.prisma.fileRecord.count({
          where: {
            fileUrl
          }
        });

        if (remainingCount === 0) {
          await this.removeStoredFile(fileUrl);
        }
      })
    );

    await Promise.all(files.map((file) => this.touchFolderChain(file.folderId)));
  }

  private async removeStoredFile(fileUrl: string) {
    if (!fileUrl) {
      return;
    }

    if (fileUrl.startsWith("/uploads/")) {
      const uploadRoot = path.resolve(this.getLocalUploadRoot());
      const relativePath = decodeURIComponent(fileUrl.replace(/^\/uploads\/+/, ""));
      const absolutePath = path.resolve(uploadRoot, relativePath);

      if (absolutePath === uploadRoot || !absolutePath.startsWith(`${uploadRoot}${path.sep}`)) {
        return;
      }

      await rm(absolutePath, { force: true });
      return;
    }

    try {
      await this.cosStorageService.deleteObjectByUrl(fileUrl);
    } catch {
      return;
    }
  }

  private normalizeStatus(value?: string | null) {
    if (!value) {
      return null;
    }

    const normalized = value.trim().toUpperCase().replace(/-/g, "_");
    if (!normalized) {
      return null;
    }

    if (normalized in FileRecordStatus) {
      return FileRecordStatus[normalized as keyof typeof FileRecordStatus];
    }

    throw new BadRequestException("文件状态不合法");
  }

  private normalizeTags(value?: string | null) {
    const tags = this.parseTags(value);
    return tags.length ? tags.join(", ") : null;
  }

  private normalizeOptionalTags(value?: string | null) {
    if (typeof value !== "string") {
      return undefined;
    }

    return this.normalizeTags(value);
  }

  private parseTags(value?: string | null) {
    if (!value) {
      return [];
    }

    return Array.from(
      new Set(
        value
          .split(/[,，\n]/)
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }

  private normalizeNullableText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private normalizeOptionalText(value?: string | null) {
    if (typeof value !== "string") {
      return undefined;
    }

    return this.normalizeNullableText(value);
  }

  private normalizeIdList(values: string[]) {
    return Array.from(
      new Set(
        values
          .map((value) => value.trim())
          .filter(Boolean)
      )
    );
  }

  private parseCommaSeparatedIds(value?: string) {
    if (!value) {
      return [];
    }

    return this.normalizeIdList(value.split(","));
  }

  private parseDate(value?: string, endOfDay = false) {
    if (!value?.trim()) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    if (endOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }

    return date;
  }

  private getRecentBoundary() {
    return new Date(Date.now() - recentDaysWindow * 24 * 60 * 60 * 1000);
  }
}
