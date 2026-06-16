CREATE TABLE `InspectionOrder` (
    `id` VARCHAR(191) NOT NULL,
    `inspectionNo` VARCHAR(64) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NULL,
    `projectType` VARCHAR(64) NULL,
    `inspectionTarget` TEXT NOT NULL,
    `labName` VARCHAR(255) NOT NULL,
    `labCity` VARCHAR(64) NULL,
    `labAddress` TEXT NULL,
    `contactName` VARCHAR(128) NULL,
    `contactPhone` VARCHAR(32) NULL,
    `expectedCycleText` VARCHAR(128) NULL,
    `bankInfo` TEXT NULL,
    `summary` TEXT NULL,
    `remark` TEXT NULL,
    `submittedAt` DATETIME(3) NULL,
    `receivedAt` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'SAMPLED', 'SUBMITTED', 'RECEIVED', 'IN_PROGRESS', 'PARTIAL_REPORTED', 'COMPLETED', 'ARCHIVED', 'CANCELED') NOT NULL DEFAULT 'DRAFT',
    `paymentStatus` ENUM('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
    `createdByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InspectionOrder_inspectionNo_key`(`inspectionNo`),
    INDEX `InspectionOrder_customerId_idx`(`customerId`),
    INDEX `InspectionOrder_productId_idx`(`productId`),
    INDEX `InspectionOrder_createdByUserId_idx`(`createdByUserId`),
    INDEX `InspectionOrder_status_idx`(`status`),
    INDEX `InspectionOrder_paymentStatus_idx`(`paymentStatus`),
    INDEX `InspectionOrder_submittedAt_idx`(`submittedAt`),
    INDEX `InspectionOrder_updatedAt_idx`(`updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InspectionSample` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `sampleName` VARCHAR(255) NOT NULL,
    `sampleType` VARCHAR(64) NULL,
    `sampleTarget` TEXT NULL,
    `sampleQuantityText` VARCHAR(128) NULL,
    `sampledAt` DATETIME(3) NULL,
    `submittedAt` DATETIME(3) NULL,
    `plannedTestScope` TEXT NULL,
    `note` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InspectionSample_orderId_idx`(`orderId`),
    INDEX `InspectionSample_sampleType_idx`(`sampleType`),
    INDEX `InspectionSample_sampledAt_idx`(`sampledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InspectionSampleItem` (
    `id` VARCHAR(191) NOT NULL,
    `sampleId` VARCHAR(191) NOT NULL,
    `itemName` VARCHAR(255) NOT NULL,
    `itemCategory` VARCHAR(64) NULL,
    `feeText` VARCHAR(128) NULL,
    `feeAmount` DECIMAL(12, 2) NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'REPORTED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `resultSummary` TEXT NULL,
    `progressNote` TEXT NULL,
    `completedAt` DATETIME(3) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InspectionSampleItem_sampleId_idx`(`sampleId`),
    INDEX `InspectionSampleItem_itemCategory_idx`(`itemCategory`),
    INDEX `InspectionSampleItem_status_idx`(`status`),
    INDEX `InspectionSampleItem_completedAt_idx`(`completedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InspectionPayment` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `amount` DECIMAL(12, 2) NULL,
    `amountText` VARCHAR(128) NULL,
    `method` VARCHAR(64) NULL,
    `payerName` VARCHAR(128) NULL,
    `voucherFileId` VARCHAR(128) NULL,
    `invoiceFileId` VARCHAR(128) NULL,
    `note` TEXT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InspectionPayment_orderId_idx`(`orderId`),
    INDEX `InspectionPayment_paidAt_idx`(`paidAt`),
    INDEX `InspectionPayment_createdByUserId_idx`(`createdByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InspectionTimeline` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `sampleId` VARCHAR(128) NULL,
    `itemId` VARCHAR(128) NULL,
    `eventType` VARCHAR(64) NOT NULL,
    `eventAt` DATETIME(3) NULL,
    `content` TEXT NOT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InspectionTimeline_orderId_idx`(`orderId`),
    INDEX `InspectionTimeline_sampleId_idx`(`sampleId`),
    INDEX `InspectionTimeline_itemId_idx`(`itemId`),
    INDEX `InspectionTimeline_eventType_idx`(`eventType`),
    INDEX `InspectionTimeline_eventAt_idx`(`eventAt`),
    INDEX `InspectionTimeline_createdByUserId_idx`(`createdByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `InspectionOrder`
    ADD CONSTRAINT `InspectionOrder_customerId_fkey`
    FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `InspectionOrder`
    ADD CONSTRAINT `InspectionOrder_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `Product`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `InspectionOrder`
    ADD CONSTRAINT `InspectionOrder_createdByUserId_fkey`
    FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `InspectionSample`
    ADD CONSTRAINT `InspectionSample_orderId_fkey`
    FOREIGN KEY (`orderId`) REFERENCES `InspectionOrder`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `InspectionSampleItem`
    ADD CONSTRAINT `InspectionSampleItem_sampleId_fkey`
    FOREIGN KEY (`sampleId`) REFERENCES `InspectionSample`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `InspectionPayment`
    ADD CONSTRAINT `InspectionPayment_orderId_fkey`
    FOREIGN KEY (`orderId`) REFERENCES `InspectionOrder`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `InspectionTimeline`
    ADD CONSTRAINT `InspectionTimeline_orderId_fkey`
    FOREIGN KEY (`orderId`) REFERENCES `InspectionOrder`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
