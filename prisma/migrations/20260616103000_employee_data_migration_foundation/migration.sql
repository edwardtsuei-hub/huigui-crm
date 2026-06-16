CREATE TABLE `RosterWeek` (
  `id` VARCHAR(191) NOT NULL,
  `teamKey` VARCHAR(80) NOT NULL,
  `teamLabel` VARCHAR(120) NOT NULL,
  `weekKey` VARCHAR(40) NOT NULL,
  `weekLabel` VARCHAR(80) NULL,
  `periodMode` ENUM('WEEK', 'MONTH') NOT NULL DEFAULT 'WEEK',
  `periodLabel` VARCHAR(80) NULL,
  `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `source` VARCHAR(64) NOT NULL DEFAULT 'legacy_roster_json',
  `sourceSha16` VARCHAR(32) NULL,
  `sourceUpdatedAt` DATETIME(3) NULL,
  `actorName` VARCHAR(120) NULL,
  `actorUserId` VARCHAR(191) NULL,
  `publishedAt` DATETIME(3) NULL,
  `version` INTEGER NOT NULL DEFAULT 1,
  `rawSnapshot` JSON NULL,
  `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
  `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
  `testBatchId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `RosterWeek_teamKey_weekKey_status_partitionKey_key`(`teamKey`, `weekKey`, `status`, `partitionKey`),
  INDEX `RosterWeek_teamKey_weekKey_idx`(`teamKey`, `weekKey`),
  INDEX `RosterWeek_status_idx`(`status`),
  INDEX `RosterWeek_publishedAt_idx`(`publishedAt`),
  INDEX `RosterWeek_partitionKey_idx`(`partitionKey`),
  INDEX `RosterWeek_testBatchId_idx`(`testBatchId`),
  INDEX `RosterWeek_actorUserId_idx`(`actorUserId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RosterShift` (
  `id` VARCHAR(191) NOT NULL,
  `rosterWeekId` VARCHAR(191) NOT NULL,
  `personExternalId` VARCHAR(160) NOT NULL,
  `personUserId` VARCHAR(191) NULL,
  `personName` VARCHAR(120) NOT NULL,
  `role` VARCHAR(120) NULL,
  `department` VARCHAR(120) NULL,
  `teamKey` VARCHAR(80) NOT NULL,
  `dayName` VARCHAR(16) NOT NULL,
  `dateLabel` VARCHAR(20) NOT NULL,
  `shiftLabel` VARCHAR(40) NOT NULL,
  `startTime` VARCHAR(16) NULL,
  `endTime` VARCHAR(16) NULL,
  `isRest` BOOLEAN NOT NULL DEFAULT false,
  `notesJson` JSON NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `RosterShift_rosterWeekId_personExternalId_dayName_key`(`rosterWeekId`, `personExternalId`, `dayName`),
  INDEX `RosterShift_rosterWeekId_idx`(`rosterWeekId`),
  INDEX `RosterShift_personExternalId_idx`(`personExternalId`),
  INDEX `RosterShift_personUserId_idx`(`personUserId`),
  INDEX `RosterShift_teamKey_idx`(`teamKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RosterAuditLog` (
  `id` VARCHAR(191) NOT NULL,
  `rosterWeekId` VARCHAR(191) NULL,
  `action` VARCHAR(80) NOT NULL,
  `actorUserId` VARCHAR(191) NULL,
  `actorName` VARCHAR(120) NULL,
  `beforeJson` JSON NULL,
  `afterJson` JSON NULL,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `RosterAuditLog_rosterWeekId_idx`(`rosterWeekId`),
  INDEX `RosterAuditLog_actorUserId_idx`(`actorUserId`),
  INDEX `RosterAuditLog_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AttendancePeriod` (
  `id` VARCHAR(191) NOT NULL,
  `periodKey` VARCHAR(40) NOT NULL,
  `status` VARCHAR(40) NOT NULL,
  `reviewState` VARCHAR(40) NOT NULL,
  `makeupConfirmed` BOOLEAN NOT NULL DEFAULT false,
  `attendanceLocked` BOOLEAN NOT NULL DEFAULT false,
  `totalOpenItems` INTEGER NOT NULL DEFAULT 0,
  `source` VARCHAR(64) NOT NULL DEFAULT 'legacy_schedule_json',
  `sourceSha16` VARCHAR(32) NULL,
  `rawSnapshot` JSON NULL,
  `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
  `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
  `testBatchId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `AttendancePeriod_periodKey_partitionKey_key`(`periodKey`, `partitionKey`),
  INDEX `AttendancePeriod_reviewState_idx`(`reviewState`),
  INDEX `AttendancePeriod_attendanceLocked_idx`(`attendanceLocked`),
  INDEX `AttendancePeriod_partitionKey_idx`(`partitionKey`),
  INDEX `AttendancePeriod_testBatchId_idx`(`testBatchId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WeeklyReportPayload` (
  `id` VARCHAR(191) NOT NULL,
  `weeklyReportId` VARCHAR(191) NULL,
  `userId` VARCHAR(191) NULL,
  `source` VARCHAR(80) NOT NULL DEFAULT 'legacy_weekly_workspace',
  `sourceUserKey` VARCHAR(200) NOT NULL,
  `canonicalUserKey` VARCHAR(160) NULL,
  `sourceFileName` VARCHAR(255) NOT NULL,
  `sourceSha16` VARCHAR(32) NOT NULL,
  `reportState` VARCHAR(40) NULL,
  `savedAt` DATETIME(3) NULL,
  `payloadJson` JSON NOT NULL,
  `migrationStatus` ENUM('DRY_RUN', 'IMPORTED', 'SKIPPED', 'CONFLICT', 'NEEDS_REVIEW') NOT NULL DEFAULT 'DRY_RUN',
  `migrationNote` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `WeeklyReportPayload_sourceFileName_sourceSha16_key`(`sourceFileName`, `sourceSha16`),
  INDEX `WeeklyReportPayload_weeklyReportId_idx`(`weeklyReportId`),
  INDEX `WeeklyReportPayload_userId_idx`(`userId`),
  INDEX `WeeklyReportPayload_sourceUserKey_idx`(`sourceUserKey`),
  INDEX `WeeklyReportPayload_canonicalUserKey_idx`(`canonicalUserKey`),
  INDEX `WeeklyReportPayload_migrationStatus_idx`(`migrationStatus`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `RosterWeek`
  ADD CONSTRAINT `RosterWeek_actorUserId_fkey`
  FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE `RosterWeek`
  ADD CONSTRAINT `RosterWeek_testBatchId_fkey`
  FOREIGN KEY (`testBatchId`) REFERENCES `TestBatch`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE `RosterShift`
  ADD CONSTRAINT `RosterShift_rosterWeekId_fkey`
  FOREIGN KEY (`rosterWeekId`) REFERENCES `RosterWeek`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE `RosterShift`
  ADD CONSTRAINT `RosterShift_personUserId_fkey`
  FOREIGN KEY (`personUserId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE `RosterAuditLog`
  ADD CONSTRAINT `RosterAuditLog_rosterWeekId_fkey`
  FOREIGN KEY (`rosterWeekId`) REFERENCES `RosterWeek`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE `RosterAuditLog`
  ADD CONSTRAINT `RosterAuditLog_actorUserId_fkey`
  FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE `AttendancePeriod`
  ADD CONSTRAINT `AttendancePeriod_testBatchId_fkey`
  FOREIGN KEY (`testBatchId`) REFERENCES `TestBatch`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE `WeeklyReportPayload`
  ADD CONSTRAINT `WeeklyReportPayload_weeklyReportId_fkey`
  FOREIGN KEY (`weeklyReportId`) REFERENCES `WeeklyReport`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE `WeeklyReportPayload`
  ADD CONSTRAINT `WeeklyReportPayload_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
