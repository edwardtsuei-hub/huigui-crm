CREATE TABLE `MeetingMinutesRecord` (
    `id` VARCHAR(80) NOT NULL,
    `folderId` VARCHAR(80) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `meetingAt` DATETIME(3) NOT NULL,
    `sourceType` VARCHAR(32) NOT NULL,
    `recordJson` JSON NOT NULL,
    `createdBy` VARCHAR(128) NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MeetingMinutesFolderPermission` (
    `folderId` VARCHAR(80) NOT NULL,
    `allowedIdentityIdsJson` JSON NOT NULL,
    `allowedParticipantIdsJson` JSON NOT NULL,
    `managerIdentityIdsJson` JSON NOT NULL,
    `updatedByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`folderId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `MeetingMinutesRecord_folderId_meetingAt_idx`
    ON `MeetingMinutesRecord`(`folderId`, `meetingAt`);
CREATE INDEX `MeetingMinutesRecord_meetingAt_idx`
    ON `MeetingMinutesRecord`(`meetingAt`);
CREATE INDEX `MeetingMinutesRecord_sourceType_idx`
    ON `MeetingMinutesRecord`(`sourceType`);
CREATE INDEX `MeetingMinutesRecord_createdByUserId_idx`
    ON `MeetingMinutesRecord`(`createdByUserId`);
CREATE INDEX `MeetingMinutesFolderPermission_updatedByUserId_idx`
    ON `MeetingMinutesFolderPermission`(`updatedByUserId`);
