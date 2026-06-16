CREATE TABLE `WeeklyPublicDigest` (
    `id` VARCHAR(191) NOT NULL,
    `weekStartDate` DATETIME(3) NOT NULL,
    `weekEndDate` DATETIME(3) NOT NULL,
    `department` VARCHAR(128) NOT NULL DEFAULT '',
    `provider` VARCHAR(64) NOT NULL DEFAULT 'heuristic',
    `generatedSummary` TEXT NULL,
    `publishedSummary` TEXT NULL,
    `generatedAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `publishedById` VARCHAR(191) NULL,
    `sourceTotalReportCount` INTEGER NOT NULL DEFAULT 0,
    `sourceIncludedReportCount` INTEGER NOT NULL DEFAULT 0,
    `sourceApprovedReportCount` INTEGER NOT NULL DEFAULT 0,
    `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
    `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
    `testBatchId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WeeklyPublicDigest_weekStartDate_department_partitionKey_key`(`weekStartDate`, `department`, `partitionKey`),
    INDEX `WeeklyPublicDigest_weekStartDate_idx`(`weekStartDate`),
    INDEX `WeeklyPublicDigest_department_idx`(`department`),
    INDEX `WeeklyPublicDigest_publishedById_idx`(`publishedById`),
    INDEX `WeeklyPublicDigest_partitionKey_idx`(`partitionKey`),
    INDEX `WeeklyPublicDigest_testBatchId_idx`(`testBatchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WeeklyPublicDigest`
    ADD CONSTRAINT `WeeklyPublicDigest_publishedById_fkey`
    FOREIGN KEY (`publishedById`) REFERENCES `User`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
