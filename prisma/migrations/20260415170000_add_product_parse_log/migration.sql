CREATE TABLE `ProductParseLog` (
    `id` VARCHAR(191) NOT NULL,
    `rawText` TEXT NULL,
    `imageUrl` VARCHAR(500) NULL,
    `parsedJson` JSON NOT NULL,
    `sourceType` VARCHAR(32) NOT NULL,
    `operatorUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductParseLog_operatorUserId_idx`(`operatorUserId`),
    INDEX `ProductParseLog_sourceType_idx`(`sourceType`),
    INDEX `ProductParseLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ProductParseLog`
ADD CONSTRAINT `ProductParseLog_operatorUserId_fkey`
FOREIGN KEY (`operatorUserId`) REFERENCES `User`(`id`)
ON DELETE RESTRICT ON UPDATE CASCADE;
