ALTER TABLE `ProductParseLog`
    ADD COLUMN `reviewStatus` ENUM('PENDING', 'CONFIRMED', 'IGNORED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `reviewNote` TEXT NULL,
    ADD COLUMN `reviewedByUserId` VARCHAR(191) NULL,
    ADD COLUMN `resolvedProductId` VARCHAR(191) NULL,
    ADD COLUMN `reviewedAt` DATETIME(3) NULL;

CREATE INDEX `ProductParseLog_reviewedByUserId_idx` ON `ProductParseLog`(`reviewedByUserId`);
CREATE INDEX `ProductParseLog_resolvedProductId_idx` ON `ProductParseLog`(`resolvedProductId`);
CREATE INDEX `ProductParseLog_reviewStatus_idx` ON `ProductParseLog`(`reviewStatus`);

ALTER TABLE `ProductParseLog`
    ADD CONSTRAINT `ProductParseLog_reviewedByUserId_fkey`
    FOREIGN KEY (`reviewedByUserId`) REFERENCES `User`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE `ProductParseLog`
    ADD CONSTRAINT `ProductParseLog_resolvedProductId_fkey`
    FOREIGN KEY (`resolvedProductId`) REFERENCES `Product`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
