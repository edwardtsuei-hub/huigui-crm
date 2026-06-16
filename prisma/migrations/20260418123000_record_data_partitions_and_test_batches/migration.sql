-- DropForeignKey
ALTER TABLE `FileFolder` DROP FOREIGN KEY `FileFolder_parentId_fkey`;

-- DropForeignKey
ALTER TABLE `MonthlyGoal` DROP FOREIGN KEY `MonthlyGoal_userId_fkey`;

-- DropForeignKey
ALTER TABLE `MonthlyGoalItem` DROP FOREIGN KEY `MonthlyGoalItem_monthlyGoalId_fkey`;

-- DropForeignKey
ALTER TABLE `WeeklyReport` DROP FOREIGN KEY `WeeklyReport_userId_fkey`;

-- DropForeignKey
ALTER TABLE `WeeklyReportPlanItem` DROP FOREIGN KEY `WeeklyReportPlanItem_reportId_fkey`;

-- DropForeignKey
ALTER TABLE `WeeklyReportReviewItem` DROP FOREIGN KEY `WeeklyReportReviewItem_reportId_fkey`;

-- DropIndex
DROP INDEX `FileFolder_parentId_name_key` ON `FileFolder`;

-- DropIndex
DROP INDEX `MonthlyGoal_userId_targetYear_targetMonth_key` ON `MonthlyGoal`;

-- DropIndex
DROP INDEX `WeeklyReport_userId_weekStartDate_key` ON `WeeklyReport`;

-- AlterTable
ALTER TABLE `AgriculturePlan` ADD COLUMN `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
    ADD COLUMN `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
    ADD COLUMN `testBatchId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ChannelPartner` ADD COLUMN `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
    ADD COLUMN `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
    ADD COLUMN `testBatchId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ChannelSettlement` ADD COLUMN `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
    ADD COLUMN `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
    ADD COLUMN `testBatchId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Contract` ADD COLUMN `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
    ADD COLUMN `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
    ADD COLUMN `testBatchId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Customer` ADD COLUMN `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
    ADD COLUMN `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
    ADD COLUMN `testBatchId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `FileFolder` ADD COLUMN `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
    ADD COLUMN `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
    ADD COLUMN `testBatchId` VARCHAR(191) NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `FileRecord` ADD COLUMN `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
    ADD COLUMN `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
    ADD COLUMN `testBatchId` VARCHAR(191) NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `InspectionOrder` ADD COLUMN `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
    ADD COLUMN `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
    ADD COLUMN `testBatchId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `MonthlyGoal` ADD COLUMN `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
    ADD COLUMN `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
    ADD COLUMN `testBatchId` VARCHAR(191) NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `MonthlyGoalItem` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `PaymentRecord` ADD COLUMN `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
    ADD COLUMN `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
    ADD COLUMN `testBatchId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Quotation` ADD COLUMN `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
    ADD COLUMN `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
    ADD COLUMN `testBatchId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `SalesOrder` ADD COLUMN `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
    ADD COLUMN `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
    ADD COLUMN `testBatchId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ShipmentRecord` ADD COLUMN `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
    ADD COLUMN `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
    ADD COLUMN `testBatchId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Task` ADD COLUMN `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
    ADD COLUMN `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
    ADD COLUMN `testBatchId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `WeeklyReport` ADD COLUMN `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
    ADD COLUMN `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
    ADD COLUMN `testBatchId` VARCHAR(191) NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `WeeklyReportPlanItem` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `WeeklyReportReviewItem` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- CreateTable
CREATE TABLE `TestBatch` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('ACTIVE', 'CLOSED', 'CLEARED') NOT NULL DEFAULT 'ACTIVE',
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedAt` DATETIME(3) NULL,
    `clearedAt` DATETIME(3) NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TestBatch_code_key`(`code`),
    INDEX `TestBatch_status_idx`(`status`),
    INDEX `TestBatch_createdByUserId_idx`(`createdByUserId`),
    INDEX `TestBatch_startedAt_idx`(`startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `AgriculturePlan_partitionKey_idx` ON `AgriculturePlan`(`partitionKey`);

-- CreateIndex
CREATE INDEX `AgriculturePlan_testBatchId_idx` ON `AgriculturePlan`(`testBatchId`);

-- CreateIndex
CREATE INDEX `ChannelPartner_partitionKey_idx` ON `ChannelPartner`(`partitionKey`);

-- CreateIndex
CREATE INDEX `ChannelPartner_testBatchId_idx` ON `ChannelPartner`(`testBatchId`);

-- CreateIndex
CREATE INDEX `ChannelSettlement_partitionKey_idx` ON `ChannelSettlement`(`partitionKey`);

-- CreateIndex
CREATE INDEX `ChannelSettlement_testBatchId_idx` ON `ChannelSettlement`(`testBatchId`);

-- CreateIndex
CREATE INDEX `Contract_partitionKey_idx` ON `Contract`(`partitionKey`);

-- CreateIndex
CREATE INDEX `Contract_testBatchId_idx` ON `Contract`(`testBatchId`);

-- CreateIndex
CREATE INDEX `Customer_partitionKey_idx` ON `Customer`(`partitionKey`);

-- CreateIndex
CREATE INDEX `Customer_testBatchId_idx` ON `Customer`(`testBatchId`);

-- CreateIndex
CREATE INDEX `FileFolder_partitionKey_idx` ON `FileFolder`(`partitionKey`);

-- CreateIndex
CREATE INDEX `FileFolder_testBatchId_idx` ON `FileFolder`(`testBatchId`);

-- CreateIndex
CREATE UNIQUE INDEX `FileFolder_parentId_name_partitionKey_key` ON `FileFolder`(`parentId`, `name`, `partitionKey`);

-- CreateIndex
CREATE INDEX `FileRecord_partitionKey_idx` ON `FileRecord`(`partitionKey`);

-- CreateIndex
CREATE INDEX `FileRecord_testBatchId_idx` ON `FileRecord`(`testBatchId`);

-- CreateIndex
CREATE INDEX `InspectionOrder_partitionKey_idx` ON `InspectionOrder`(`partitionKey`);

-- CreateIndex
CREATE INDEX `InspectionOrder_testBatchId_idx` ON `InspectionOrder`(`testBatchId`);

-- CreateIndex
CREATE INDEX `MonthlyGoal_partitionKey_idx` ON `MonthlyGoal`(`partitionKey`);

-- CreateIndex
CREATE INDEX `MonthlyGoal_testBatchId_idx` ON `MonthlyGoal`(`testBatchId`);

-- CreateIndex
CREATE UNIQUE INDEX `MonthlyGoal_userId_targetYear_targetMonth_partitionKey_key` ON `MonthlyGoal`(`userId`, `targetYear`, `targetMonth`, `partitionKey`);

-- CreateIndex
CREATE INDEX `PaymentRecord_partitionKey_idx` ON `PaymentRecord`(`partitionKey`);

-- CreateIndex
CREATE INDEX `PaymentRecord_testBatchId_idx` ON `PaymentRecord`(`testBatchId`);

-- CreateIndex
CREATE INDEX `Quotation_partitionKey_idx` ON `Quotation`(`partitionKey`);

-- CreateIndex
CREATE INDEX `Quotation_testBatchId_idx` ON `Quotation`(`testBatchId`);

-- CreateIndex
CREATE INDEX `SalesOrder_partitionKey_idx` ON `SalesOrder`(`partitionKey`);

-- CreateIndex
CREATE INDEX `SalesOrder_testBatchId_idx` ON `SalesOrder`(`testBatchId`);

-- CreateIndex
CREATE INDEX `ShipmentRecord_partitionKey_idx` ON `ShipmentRecord`(`partitionKey`);

-- CreateIndex
CREATE INDEX `ShipmentRecord_testBatchId_idx` ON `ShipmentRecord`(`testBatchId`);

-- CreateIndex
CREATE INDEX `Task_partitionKey_idx` ON `Task`(`partitionKey`);

-- CreateIndex
CREATE INDEX `Task_testBatchId_idx` ON `Task`(`testBatchId`);

-- CreateIndex
CREATE INDEX `WeeklyReport_partitionKey_idx` ON `WeeklyReport`(`partitionKey`);

-- CreateIndex
CREATE INDEX `WeeklyReport_testBatchId_idx` ON `WeeklyReport`(`testBatchId`);

-- CreateIndex
CREATE UNIQUE INDEX `WeeklyReport_userId_weekStartDate_partitionKey_key` ON `WeeklyReport`(`userId`, `weekStartDate`, `partitionKey`);

-- AddForeignKey
ALTER TABLE `TestBatch` ADD CONSTRAINT `TestBatch_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_testBatchId_fkey` FOREIGN KEY (`testBatchId`) REFERENCES `TestBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspectionOrder` ADD CONSTRAINT `InspectionOrder_testBatchId_fkey` FOREIGN KEY (`testBatchId`) REFERENCES `TestBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quotation` ADD CONSTRAINT `Quotation_testBatchId_fkey` FOREIGN KEY (`testBatchId`) REFERENCES `TestBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgriculturePlan` ADD CONSTRAINT `AgriculturePlan_testBatchId_fkey` FOREIGN KEY (`testBatchId`) REFERENCES `TestBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_testBatchId_fkey` FOREIGN KEY (`testBatchId`) REFERENCES `TestBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesOrder` ADD CONSTRAINT `SalesOrder_testBatchId_fkey` FOREIGN KEY (`testBatchId`) REFERENCES `TestBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentRecord` ADD CONSTRAINT `PaymentRecord_testBatchId_fkey` FOREIGN KEY (`testBatchId`) REFERENCES `TestBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShipmentRecord` ADD CONSTRAINT `ShipmentRecord_testBatchId_fkey` FOREIGN KEY (`testBatchId`) REFERENCES `TestBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelPartner` ADD CONSTRAINT `ChannelPartner_testBatchId_fkey` FOREIGN KEY (`testBatchId`) REFERENCES `TestBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelSettlement` ADD CONSTRAINT `ChannelSettlement_testBatchId_fkey` FOREIGN KEY (`testBatchId`) REFERENCES `TestBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_testBatchId_fkey` FOREIGN KEY (`testBatchId`) REFERENCES `TestBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeeklyReport` ADD CONSTRAINT `WeeklyReport_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeeklyReport` ADD CONSTRAINT `WeeklyReport_testBatchId_fkey` FOREIGN KEY (`testBatchId`) REFERENCES `TestBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeeklyReportReviewItem` ADD CONSTRAINT `WeeklyReportReviewItem_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `WeeklyReport`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeeklyReportPlanItem` ADD CONSTRAINT `WeeklyReportPlanItem_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `WeeklyReport`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MonthlyGoal` ADD CONSTRAINT `MonthlyGoal_testBatchId_fkey` FOREIGN KEY (`testBatchId`) REFERENCES `TestBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MonthlyGoal` ADD CONSTRAINT `MonthlyGoal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MonthlyGoalItem` ADD CONSTRAINT `MonthlyGoalItem_monthlyGoalId_fkey` FOREIGN KEY (`monthlyGoalId`) REFERENCES `MonthlyGoal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FileFolder` ADD CONSTRAINT `FileFolder_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `FileFolder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FileFolder` ADD CONSTRAINT `FileFolder_testBatchId_fkey` FOREIGN KEY (`testBatchId`) REFERENCES `TestBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FileRecord` ADD CONSTRAINT `FileRecord_testBatchId_fkey` FOREIGN KEY (`testBatchId`) REFERENCES `TestBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
