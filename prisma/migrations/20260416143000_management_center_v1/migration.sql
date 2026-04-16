-- AlterTable
ALTER TABLE `User` ADD COLUMN `createdByUserId` VARCHAR(191) NULL,
    ADD COLUMN `dataScope` ENUM('ALL', 'DEPARTMENT', 'TEAM', 'OWNED', 'PARTICIPATED') NOT NULL DEFAULT 'OWNED',
    ADD COLUMN `lastLoginAt` DATETIME(3) NULL,
    ADD COLUMN `loginAccount` VARCHAR(64) NULL,
    ADD COLUMN `managerUserId` VARCHAR(191) NULL,
    ADD COLUMN `note` TEXT NULL,
    ADD COLUMN `title` VARCHAR(128) NULL;

-- AlterTable
ALTER TABLE `Role` ADD COLUMN `defaultDataScope` ENUM('ALL', 'DEPARTMENT', 'TEAM', 'OWNED', 'PARTICIPATED') NOT NULL DEFAULT 'OWNED',
    ADD COLUMN `isSystem` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Permission` ADD COLUMN `category` VARCHAR(32) NOT NULL,
    ADD COLUMN `description` VARCHAR(255) NULL,
    ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Quotation` ADD COLUMN `approvalStatus` ENUM('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'NOT_REQUIRED',
    ADD COLUMN `exportApprovalStatus` ENUM('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'NOT_REQUIRED',
    ADD COLUMN `exportedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `AuditLog` ADD COLUMN `afterSummary` TEXT NULL,
    ADD COLUMN `beforeSummary` TEXT NULL,
    ADD COLUMN `deviceInfo` VARCHAR(255) NULL,
    ADD COLUMN `ipAddress` VARCHAR(64) NULL,
    ADD COLUMN `result` VARCHAR(32) NULL,
    ADD COLUMN `source` VARCHAR(32) NULL,
    ADD COLUMN `targetName` VARCHAR(255) NULL;

-- CreateTable
CREATE TABLE `ApprovalRule` (
    `id` VARCHAR(191) NOT NULL,
    `code` ENUM('DISCOUNT', 'LOW_PRICE', 'EXPORT_QUOTATION', 'CUSTOMER_TRANSFER') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(255) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `configJson` JSON NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `updatedByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ApprovalRule_code_key`(`code`),
    INDEX `ApprovalRule_enabled_idx`(`enabled`),
    INDEX `ApprovalRule_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApprovalRequest` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('DISCOUNT', 'LOW_PRICE', 'EXPORT_QUOTATION', 'CUSTOMER_TRANSFER') NOT NULL,
    `targetType` VARCHAR(64) NOT NULL,
    `targetId` VARCHAR(128) NOT NULL,
    `quotationId` VARCHAR(191) NULL,
    `status` ENUM('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `requesterUserId` VARCHAR(191) NOT NULL,
    `requiredRoleCode` VARCHAR(64) NULL,
    `actorUserId` VARCHAR(191) NULL,
    `title` VARCHAR(255) NOT NULL,
    `summary` TEXT NULL,
    `payloadJson` JSON NULL,
    `decisionRemark` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `decidedAt` DATETIME(3) NULL,

    INDEX `ApprovalRequest_type_idx`(`type`),
    INDEX `ApprovalRequest_status_idx`(`status`),
    INDEX `ApprovalRequest_targetType_targetId_idx`(`targetType`, `targetId`),
    INDEX `ApprovalRequest_quotationId_idx`(`quotationId`),
    INDEX `ApprovalRequest_requesterUserId_idx`(`requesterUserId`),
    INDEX `ApprovalRequest_requiredRoleCode_idx`(`requiredRoleCode`),
    INDEX `ApprovalRequest_actorUserId_idx`(`actorUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `User_loginAccount_key` ON `User`(`loginAccount`);

-- CreateIndex
CREATE INDEX `User_department_idx` ON `User`(`department`);

-- CreateIndex
CREATE INDEX `User_managerUserId_idx` ON `User`(`managerUserId`);

-- CreateIndex
CREATE INDEX `User_dataScope_idx` ON `User`(`dataScope`);

-- CreateIndex
CREATE INDEX `User_lastLoginAt_idx` ON `User`(`lastLoginAt`);

-- CreateIndex
CREATE INDEX `User_createdByUserId_idx` ON `User`(`createdByUserId`);

-- CreateIndex
CREATE INDEX `Quotation_approvalStatus_idx` ON `Quotation`(`approvalStatus`);

-- CreateIndex
CREATE INDEX `Quotation_exportApprovalStatus_idx` ON `Quotation`(`exportApprovalStatus`);

-- CreateIndex
CREATE INDEX `AuditLog_result_idx` ON `AuditLog`(`result`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_managerUserId_fkey` FOREIGN KEY (`managerUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApprovalRule` ADD CONSTRAINT `ApprovalRule_updatedByUserId_fkey` FOREIGN KEY (`updatedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApprovalRequest` ADD CONSTRAINT `ApprovalRequest_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `Quotation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApprovalRequest` ADD CONSTRAINT `ApprovalRequest_requesterUserId_fkey` FOREIGN KEY (`requesterUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApprovalRequest` ADD CONSTRAINT `ApprovalRequest_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

