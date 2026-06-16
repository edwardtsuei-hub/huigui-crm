CREATE TABLE `WecomCalendarSync` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NULL,
    `calendarId` VARCHAR(128) NULL,
    `scheduleId` VARCHAR(128) NULL,
    `syncStatus` ENUM('PENDING', 'SYNCED', 'FAILED', 'DELETED') NOT NULL DEFAULT 'PENDING',
    `lastSyncError` TEXT NULL,
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `lastSyncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WecomCalendarSync_taskId_key`(`taskId`),
    INDEX `WecomCalendarSync_syncStatus_idx`(`syncStatus`),
    INDEX `WecomCalendarSync_scheduleId_idx`(`scheduleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WecomCalendarSync`
    ADD CONSTRAINT `WecomCalendarSync_taskId_fkey`
    FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
