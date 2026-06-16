CREATE TABLE `WeeklyReport` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `weekStartDate` DATETIME(3) NOT NULL,
    `weekEndDate` DATETIME(3) NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED') NOT NULL DEFAULT 'DRAFT',
    `completedSummary` TEXT NULL,
    `focusSummary` TEXT NULL,
    `submittedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `WeeklyReport_userId_weekStartDate_key`(`userId`, `weekStartDate`),
    INDEX `WeeklyReport_userId_status_idx`(`userId`, `status`),
    INDEX `WeeklyReport_weekStartDate_idx`(`weekStartDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WeeklyReportReviewItem` (
    `id` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(191) NOT NULL,
    `sourcePlanItemId` VARCHAR(191) NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `plannedAt` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'INCOMPLETE') NOT NULL DEFAULT 'PENDING',
    `incompleteReason` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WeeklyReportReviewItem_reportId_idx`(`reportId`),
    INDEX `WeeklyReportReviewItem_sourcePlanItemId_idx`(`sourcePlanItemId`),
    INDEX `WeeklyReportReviewItem_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WeeklyReportPlanItem` (
    `id` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(191) NOT NULL,
    `sourceReviewItemId` VARCHAR(191) NULL,
    `taskId` VARCHAR(191) NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `plannedAt` DATETIME(3) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `WeeklyReportPlanItem_taskId_key`(`taskId`),
    INDEX `WeeklyReportPlanItem_reportId_idx`(`reportId`),
    INDEX `WeeklyReportPlanItem_sourceReviewItemId_idx`(`sourceReviewItemId`),
    INDEX `WeeklyReportPlanItem_plannedAt_idx`(`plannedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MonthlyGoal` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `targetYear` INTEGER NOT NULL,
    `targetMonth` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED') NOT NULL DEFAULT 'DRAFT',
    `summary` TEXT NULL,
    `submittedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MonthlyGoal_userId_targetYear_targetMonth_key`(`userId`, `targetYear`, `targetMonth`),
    INDEX `MonthlyGoal_userId_status_idx`(`userId`, `status`),
    INDEX `MonthlyGoal_targetYear_targetMonth_idx`(`targetYear`, `targetMonth`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MonthlyGoalItem` (
    `id` VARCHAR(191) NOT NULL,
    `monthlyGoalId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `metric` TEXT NULL,
    `dueAt` DATETIME(3) NULL,
    `progressNote` TEXT NULL,
    `riskNote` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MonthlyGoalItem_monthlyGoalId_idx`(`monthlyGoalId`),
    INDEX `MonthlyGoalItem_dueAt_idx`(`dueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WeeklyReport`
    ADD CONSTRAINT `WeeklyReport_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `WeeklyReportReviewItem`
    ADD CONSTRAINT `WeeklyReportReviewItem_reportId_fkey`
    FOREIGN KEY (`reportId`) REFERENCES `WeeklyReport`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WeeklyReportReviewItem`
    ADD CONSTRAINT `WeeklyReportReviewItem_sourcePlanItemId_fkey`
    FOREIGN KEY (`sourcePlanItemId`) REFERENCES `WeeklyReportPlanItem`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `WeeklyReportPlanItem`
    ADD CONSTRAINT `WeeklyReportPlanItem_reportId_fkey`
    FOREIGN KEY (`reportId`) REFERENCES `WeeklyReport`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WeeklyReportPlanItem`
    ADD CONSTRAINT `WeeklyReportPlanItem_sourceReviewItemId_fkey`
    FOREIGN KEY (`sourceReviewItemId`) REFERENCES `WeeklyReportReviewItem`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `WeeklyReportPlanItem`
    ADD CONSTRAINT `WeeklyReportPlanItem_taskId_fkey`
    FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MonthlyGoal`
    ADD CONSTRAINT `MonthlyGoal_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `MonthlyGoalItem`
    ADD CONSTRAINT `MonthlyGoalItem_monthlyGoalId_fkey`
    FOREIGN KEY (`monthlyGoalId`) REFERENCES `MonthlyGoal`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
