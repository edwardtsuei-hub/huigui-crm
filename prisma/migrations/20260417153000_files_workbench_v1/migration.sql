-- AlterTable
ALTER TABLE `FileFolder`
  ADD COLUMN `category` VARCHAR(64) NULL,
  ADD COLUMN `tagText` TEXT NULL,
  ADD COLUMN `permissionScope` VARCHAR(128) NULL,
  ADD COLUMN `note` TEXT NULL;

-- CreateEnum replacement for MySQL via column usage
-- AlterTable
ALTER TABLE `FileRecord`
  ADD COLUMN `category` VARCHAR(64) NULL,
  ADD COLUMN `tagText` TEXT NULL,
  ADD COLUMN `note` TEXT NULL,
  ADD COLUMN `relatedType` VARCHAR(64) NULL,
  ADD COLUMN `relatedId` VARCHAR(128) NULL,
  ADD COLUMN `status` ENUM('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'ARCHIVED', 'OBSOLETE') NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN `isImportant` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `isArchived` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `permissionScope` VARCHAR(128) NULL,
  ADD COLUMN `versionGroupId` VARCHAR(191) NULL,
  ADD COLUMN `versionNumber` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `versionNote` TEXT NULL,
  ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `FileRecord_relatedType_relatedId_idx` ON `FileRecord`(`relatedType`, `relatedId`);

-- CreateIndex
CREATE INDEX `FileRecord_category_idx` ON `FileRecord`(`category`);

-- CreateIndex
CREATE INDEX `FileRecord_status_idx` ON `FileRecord`(`status`);

-- CreateIndex
CREATE INDEX `FileRecord_isImportant_idx` ON `FileRecord`(`isImportant`);

-- CreateIndex
CREATE INDEX `FileRecord_isArchived_idx` ON `FileRecord`(`isArchived`);

-- CreateIndex
CREATE INDEX `FileRecord_versionGroupId_idx` ON `FileRecord`(`versionGroupId`);

-- CreateIndex
CREATE INDEX `FileRecord_deletedAt_idx` ON `FileRecord`(`deletedAt`);
