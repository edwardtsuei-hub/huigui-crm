-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(32) NULL,
    `email` VARCHAR(128) NULL,
    `passwordHash` VARCHAR(255) NULL,
    `wecomUserId` VARCHAR(128) NULL,
    `department` VARCHAR(128) NULL,
    `status` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `roleId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_wecomUserId_key`(`wecomUserId`),
    INDEX `User_roleId_idx`(`roleId`),
    INDEX `User_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Role_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permission` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `module` VARCHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Permission_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePermission` (
    `id` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,

    INDEX `RolePermission_roleId_idx`(`roleId`),
    INDEX `RolePermission_permissionId_idx`(`permissionId`),
    UNIQUE INDEX `RolePermission_roleId_permissionId_key`(`roleId`, `permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IndustryGroup` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `IndustryGroup_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IndustrySubgroup` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `IndustrySubgroup_groupId_idx`(`groupId`),
    UNIQUE INDEX `IndustrySubgroup_groupId_name_key`(`groupId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(255) NULL,
    `contactName` VARCHAR(128) NULL,
    `mobile` VARCHAR(32) NULL,
    `wechatId` VARCHAR(128) NULL,
    `email` VARCHAR(128) NULL,
    `province` VARCHAR(64) NULL,
    `city` VARCHAR(64) NULL,
    `district` VARCHAR(64) NULL,
    `address` VARCHAR(255) NULL,
    `source` VARCHAR(128) NULL,
    `industryGroupId` VARCHAR(191) NULL,
    `industrySubgroupId` VARCHAR(191) NULL,
    `status` ENUM('UNCONTACTED', 'CONTACTED', 'MET', 'COOPERATING', 'PAUSED') NOT NULL DEFAULT 'UNCONTACTED',
    `ownerUserId` VARCHAR(191) NOT NULL,
    `cooperationDirection` TEXT NULL,
    `cooperationContent` TEXT NULL,
    `estimatedAmount` DECIMAL(12, 2) NULL,
    `dealProbability` INTEGER NULL,
    `remark` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Customer_ownerUserId_idx`(`ownerUserId`),
    INDEX `Customer_status_idx`(`status`),
    INDEX `Customer_industryGroupId_idx`(`industryGroupId`),
    INDEX `Customer_industrySubgroupId_idx`(`industrySubgroupId`),
    INDEX `Customer_province_city_idx`(`province`, `city`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerFollowup` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `followupDate` DATETIME(3) NOT NULL,
    `followupType` VARCHAR(64) NOT NULL,
    `content` TEXT NOT NULL,
    `keyPoints` TEXT NULL,
    `nextAction` TEXT NULL,
    `nextContactAt` DATETIME(3) NULL,
    `needReminder` BOOLEAN NOT NULL DEFAULT false,
    `creatorUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CustomerFollowup_customerId_idx`(`customerId`),
    INDEX `CustomerFollowup_creatorUserId_idx`(`creatorUserId`),
    INDEX `CustomerFollowup_followupDate_idx`(`followupDate`),
    INDEX `CustomerFollowup_nextContactAt_idx`(`nextContactAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `industryGroupId` VARCHAR(191) NULL,
    `industrySubgroupId` VARCHAR(191) NULL,
    `sku` VARCHAR(64) NULL,
    `spec` VARCHAR(128) NULL,
    `unit` VARCHAR(32) NULL,
    `costPrice` DECIMAL(12, 2) NULL,
    `salePrice` DECIMAL(12, 2) NULL,
    `enterpriseStandardNo` VARCHAR(128) NULL,
    `intro` TEXT NULL,
    `scenarios` TEXT NULL,
    `labelText` TEXT NULL,
    `labelImageUrl` VARCHAR(500) NULL,
    `productImageUrl` VARCHAR(500) NULL,
    `quoteEnabled` BOOLEAN NOT NULL DEFAULT true,
    `employeeVisible` BOOLEAN NOT NULL DEFAULT true,
    `customerVisible` BOOLEAN NOT NULL DEFAULT true,
    `outputTemplateType` ENUM('AGRICULTURE_PLAN', 'PRODUCT_QUOTE', 'SOLUTION_QUOTE') NOT NULL,
    `remark` TEXT NULL,
    `status` ENUM('ENABLED', 'DISABLED') NOT NULL DEFAULT 'ENABLED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Product_industryGroupId_idx`(`industryGroupId`),
    INDEX `Product_industrySubgroupId_idx`(`industrySubgroupId`),
    INDEX `Product_status_idx`(`status`),
    INDEX `Product_quoteEnabled_idx`(`quoteEnabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quotation` (
    `id` VARCHAR(191) NOT NULL,
    `quotationNo` VARCHAR(64) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `industryGroupId` VARCHAR(191) NULL,
    `quotationType` ENUM('AGRICULTURE', 'INDUSTRY', 'SERVICE', 'BREEDING', 'GENERAL') NOT NULL,
    `totalOriginalAmount` DECIMAL(12, 2) NOT NULL,
    `totalDiscountedAmount` DECIMAL(12, 2) NOT NULL,
    `discountType` VARCHAR(32) NULL,
    `discountValue` DECIMAL(12, 2) NULL,
    `discountReason` TEXT NULL,
    `remark` TEXT NULL,
    `pdfUrl` VARCHAR(500) NULL,
    `shareToken` VARCHAR(128) NULL,
    `creatorUserId` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'GENERATED', 'SENT', 'WON', 'LOST') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Quotation_quotationNo_key`(`quotationNo`),
    UNIQUE INDEX `Quotation_shareToken_key`(`shareToken`),
    INDEX `Quotation_customerId_idx`(`customerId`),
    INDEX `Quotation_creatorUserId_idx`(`creatorUserId`),
    INDEX `Quotation_industryGroupId_idx`(`industryGroupId`),
    INDEX `Quotation_quotationType_idx`(`quotationType`),
    INDEX `Quotation_status_idx`(`status`),
    INDEX `Quotation_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuotationItem` (
    `id` VARCHAR(191) NOT NULL,
    `quotationId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `itemName` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `originalAmount` DECIMAL(12, 2) NOT NULL,
    `discountedAmount` DECIMAL(12, 2) NOT NULL,
    `detailJson` JSON NULL,

    INDEX `QuotationItem_quotationId_idx`(`quotationId`),
    INDEX `QuotationItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgriculturePlan` (
    `id` VARCHAR(191) NOT NULL,
    `quotationId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `totalOriginalAmount` DECIMAL(12, 2) NOT NULL,
    `totalDiscountedAmount` DECIMAL(12, 2) NOT NULL,
    `detailJson` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AgriculturePlan_quotationId_key`(`quotationId`),
    INDEX `AgriculturePlan_customerId_idx`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contract` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `contractName` VARCHAR(191) NOT NULL,
    `contractNo` VARCHAR(128) NULL,
    `contractType` VARCHAR(64) NULL,
    `signedAt` DATETIME(3) NULL,
    `effectiveAt` DATETIME(3) NULL,
    `expiredAt` DATETIME(3) NULL,
    `amount` DECIMAL(12, 2) NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED') NOT NULL DEFAULT 'DRAFT',
    `permissionLevel` ENUM('ADMIN_ONLY', 'ADMIN_MANAGER', 'OWNER_ONLY', 'ALL_VISIBLE') NOT NULL,
    `fileUrl` VARCHAR(500) NULL,
    `remark` TEXT NULL,
    `creatorUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Contract_customerId_idx`(`customerId`),
    INDEX `Contract_creatorUserId_idx`(`creatorUserId`),
    INDEX `Contract_status_idx`(`status`),
    INDEX `Contract_expiredAt_idx`(`expiredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Task` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `type` ENUM('FOLLOW_UP', 'MEETING', 'PLAN', 'CONTRACT', 'QUOTATION', 'OTHER') NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `quotationId` VARCHAR(191) NULL,
    `assigneeUserId` VARCHAR(191) NOT NULL,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NULL,
    `reminderAt` DATETIME(3) NULL,
    `content` TEXT NULL,
    `status` ENUM('TODO', 'DOING', 'DONE', 'CANCELED') NOT NULL DEFAULT 'TODO',
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Task_customerId_idx`(`customerId`),
    INDEX `Task_quotationId_idx`(`quotationId`),
    INDEX `Task_assigneeUserId_idx`(`assigneeUserId`),
    INDEX `Task_status_idx`(`status`),
    INDEX `Task_reminderAt_idx`(`reminderAt`),
    INDEX `Task_startAt_idx`(`startAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskComment` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TaskComment_taskId_idx`(`taskId`),
    INDEX `TaskComment_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(64) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `relatedType` VARCHAR(64) NULL,
    `relatedId` VARCHAR(128) NULL,
    `sendChannel` ENUM('SYSTEM', 'WECOM', 'EMAIL') NOT NULL,
    `sendStatus` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_idx`(`userId`),
    INDEX `Notification_sendStatus_idx`(`sendStatus`),
    INDEX `Notification_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FileRecord` (
    `id` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(500) NOT NULL,
    `fileType` VARCHAR(64) NULL,
    `businessType` VARCHAR(64) NULL,
    `businessId` VARCHAR(128) NULL,
    `uploaderUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FileRecord_uploaderUserId_idx`(`uploaderUserId`),
    INDEX `FileRecord_businessType_businessId_idx`(`businessType`, `businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(64) NOT NULL,
    `module` VARCHAR(64) NOT NULL,
    `targetType` VARCHAR(64) NULL,
    `targetId` VARCHAR(128) NULL,
    `content` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_userId_idx`(`userId`),
    INDEX `AuditLog_module_idx`(`module`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IndustrySubgroup` ADD CONSTRAINT `IndustrySubgroup_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `IndustryGroup`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_industryGroupId_fkey` FOREIGN KEY (`industryGroupId`) REFERENCES `IndustryGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_industrySubgroupId_fkey` FOREIGN KEY (`industrySubgroupId`) REFERENCES `IndustrySubgroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerFollowup` ADD CONSTRAINT `CustomerFollowup_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerFollowup` ADD CONSTRAINT `CustomerFollowup_creatorUserId_fkey` FOREIGN KEY (`creatorUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_industryGroupId_fkey` FOREIGN KEY (`industryGroupId`) REFERENCES `IndustryGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_industrySubgroupId_fkey` FOREIGN KEY (`industrySubgroupId`) REFERENCES `IndustrySubgroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quotation` ADD CONSTRAINT `Quotation_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quotation` ADD CONSTRAINT `Quotation_industryGroupId_fkey` FOREIGN KEY (`industryGroupId`) REFERENCES `IndustryGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quotation` ADD CONSTRAINT `Quotation_creatorUserId_fkey` FOREIGN KEY (`creatorUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuotationItem` ADD CONSTRAINT `QuotationItem_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `Quotation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuotationItem` ADD CONSTRAINT `QuotationItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgriculturePlan` ADD CONSTRAINT `AgriculturePlan_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `Quotation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgriculturePlan` ADD CONSTRAINT `AgriculturePlan_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_creatorUserId_fkey` FOREIGN KEY (`creatorUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `Quotation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_assigneeUserId_fkey` FOREIGN KEY (`assigneeUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskComment` ADD CONSTRAINT `TaskComment_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskComment` ADD CONSTRAINT `TaskComment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FileRecord` ADD CONSTRAINT `FileRecord_uploaderUserId_fkey` FOREIGN KEY (`uploaderUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

