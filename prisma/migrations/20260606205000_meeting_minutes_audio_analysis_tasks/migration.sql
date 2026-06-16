CREATE TABLE `MeetingMinutesAudioAnalysisTask` (
    `id` VARCHAR(80) NOT NULL,
    `status` VARCHAR(32) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `folderLabel` VARCHAR(255) NOT NULL,
    `folderShortLabel` VARCHAR(128) NOT NULL,
    `meetingAt` DATETIME(3) NULL,
    `fileNamesJson` JSON NOT NULL,
    `inputJson` JSON NOT NULL,
    `resultJson` JSON NULL,
    `errorMessage` TEXT NULL,
    `createdBy` VARCHAR(128) NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `audioClearedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `MeetingMinutesAudioAnalysisTask_status_createdAt_idx`
    ON `MeetingMinutesAudioAnalysisTask`(`status`, `createdAt`);
CREATE INDEX `MeetingMinutesAudioAnalysisTask_createdAt_idx`
    ON `MeetingMinutesAudioAnalysisTask`(`createdAt`);
CREATE INDEX `MeetingMinutesAudioAnalysisTask_expiresAt_idx`
    ON `MeetingMinutesAudioAnalysisTask`(`expiresAt`);
CREATE INDEX `MeetingMinutesAudioAnalysisTask_createdByUserId_idx`
    ON `MeetingMinutesAudioAnalysisTask`(`createdByUserId`);
CREATE INDEX `MeetingMinutesAudioAnalysisTask_folderShortLabel_idx`
    ON `MeetingMinutesAudioAnalysisTask`(`folderShortLabel`);
