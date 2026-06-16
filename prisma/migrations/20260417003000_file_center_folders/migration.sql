-- CreateTable
CREATE TABLE `FileFolder` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `FileFolder_parentId_name_key`(`parentId`, `name`),
    INDEX `FileFolder_parentId_idx`(`parentId`),
    INDEX `FileFolder_updatedAt_idx`(`updatedAt`),
    INDEX `FileFolder_createdByUserId_idx`(`createdByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `FileRecord`
    ADD COLUMN `fileSizeBytes` INTEGER NULL,
    ADD COLUMN `folderId` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateIndex
CREATE INDEX `FileRecord_folderId_idx` ON `FileRecord`(`folderId`);

-- CreateIndex
CREATE INDEX `FileRecord_createdAt_idx` ON `FileRecord`(`createdAt`);

-- AddForeignKey
ALTER TABLE `FileFolder`
    ADD CONSTRAINT `FileFolder_parentId_fkey`
    FOREIGN KEY (`parentId`) REFERENCES `FileFolder`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FileFolder`
    ADD CONSTRAINT `FileFolder_createdByUserId_fkey`
    FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FileRecord`
    ADD CONSTRAINT `FileRecord_folderId_fkey`
    FOREIGN KEY (`folderId`) REFERENCES `FileFolder`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
