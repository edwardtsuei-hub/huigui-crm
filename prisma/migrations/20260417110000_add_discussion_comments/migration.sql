CREATE TABLE `DiscussionComment` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `relatedType` VARCHAR(64) NOT NULL,
    `relatedId` VARCHAR(128) NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DiscussionComment_userId_idx`(`userId`),
    INDEX `DiscussionComment_relatedType_relatedId_createdAt_idx`(`relatedType`, `relatedId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `DiscussionComment`
    ADD CONSTRAINT `DiscussionComment_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
