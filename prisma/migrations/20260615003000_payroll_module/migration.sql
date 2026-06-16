CREATE TABLE `SalarySlip` (
  `id` VARCHAR(120) NOT NULL,
  `month` VARCHAR(7) NOT NULL,
  `teacherId` VARCHAR(120) NOT NULL,
  `teacherName` VARCHAR(120) NOT NULL,
  `grossAmount` DECIMAL(12, 2) NOT NULL,
  `commissionAmount` DECIMAL(12, 2) NULL,
  `profitSharingAmount` DECIMAL(12, 2) NULL,
  `deductionAmount` DECIMAL(12, 2) NOT NULL,
  `netAmount` DECIMAL(12, 2) NOT NULL,
  `source` VARCHAR(32) NOT NULL,
  `sourceLabel` VARCHAR(255) NULL,
  `settlementId` VARCHAR(120) NULL,
  `syncedBy` VARCHAR(120) NOT NULL,
  `syncedAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `SalarySlip_month_teacherId_key`(`month`, `teacherId`),
  INDEX `SalarySlip_month_idx`(`month`),
  INDEX `SalarySlip_teacherId_idx`(`teacherId`),
  INDEX `SalarySlip_teacherName_idx`(`teacherName`),
  INDEX `SalarySlip_syncedAt_idx`(`syncedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SalaryNotifyLog` (
  `id` VARCHAR(160) NOT NULL,
  `month` VARCHAR(7) NOT NULL,
  `at` DATETIME(3) NOT NULL,
  `actionLabel` VARCHAR(80) NOT NULL,
  `modeLabel` VARCHAR(80) NOT NULL,
  `status` VARCHAR(32) NOT NULL,
  `tone` VARCHAR(32) NULL,
  `message` TEXT NOT NULL,
  `delivered` JSON NOT NULL,
  `skipped` JSON NOT NULL,
  `failed` JSON NOT NULL,
  `notifyUrl` VARCHAR(500) NULL,
  `createdBy` VARCHAR(120) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `SalaryNotifyLog_month_at_idx`(`month`, `at`),
  INDEX `SalaryNotifyLog_status_idx`(`status`),
  INDEX `SalaryNotifyLog_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PayrollDraftBatch` (
  `month` VARCHAR(7) NOT NULL,
  `drafts` JSON NOT NULL,
  `publishedAt` DATETIME(3) NULL,
  `notifyStatus` VARCHAR(32) NULL,
  `excelReviewedAt` DATETIME(3) NULL,
  `updatedBy` VARCHAR(120) NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`month`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
