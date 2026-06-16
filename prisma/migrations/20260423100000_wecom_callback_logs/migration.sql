CREATE TABLE `WecomCallbackLog` (
    `id` VARCHAR(191) NOT NULL,
    `event` VARCHAR(64) NULL,
    `changeType` VARCHAR(64) NULL,
    `fromUserId` VARCHAR(128) NULL,
    `agentId` VARCHAR(64) NULL,
    `rawXml` TEXT NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'RECEIVED',
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WecomCallbackLog_event_idx`(`event`),
    INDEX `WecomCallbackLog_changeType_idx`(`changeType`),
    INDEX `WecomCallbackLog_status_idx`(`status`),
    INDEX `WecomCallbackLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
