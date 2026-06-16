CREATE TABLE `MonthlyGoalAiSummarySnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `monthlyGoalId` VARCHAR(191) NOT NULL,
    `sourceYear` INTEGER NOT NULL,
    `sourceMonth` INTEGER NOT NULL,
    `provider` VARCHAR(64) NOT NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `weeklyReportCount` INTEGER NOT NULL DEFAULT 0,
    `submittedWeeklyReportCount` INTEGER NOT NULL DEFAULT 0,
    `goalItemCount` INTEGER NOT NULL DEFAULT 0,
    `sectionsJson` JSON NOT NULL,
    `weeklyReportsJson` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MonthlyGoalAiSummarySnapshot_goal_period_key`(`monthlyGoalId`, `sourceYear`, `sourceMonth`),
    INDEX `MonthlyGoalAiSummarySnapshot_monthlyGoalId_updatedAt_idx`(`monthlyGoalId`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MonthlyGoalAiSummarySnapshot`
    ADD CONSTRAINT `MonthlyGoalAiSummarySnapshot_monthlyGoalId_fkey`
    FOREIGN KEY (`monthlyGoalId`) REFERENCES `MonthlyGoal`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
