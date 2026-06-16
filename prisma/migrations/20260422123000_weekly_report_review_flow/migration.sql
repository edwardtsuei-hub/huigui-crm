ALTER TABLE `WeeklyReport`
    MODIFY `status` ENUM('DRAFT', 'SUBMITTED', 'RETURNED', 'APPROVED') NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN `managerReviewedAt` DATETIME(3) NULL,
    ADD COLUMN `managerReviewedById` VARCHAR(191) NULL,
    ADD COLUMN `managerReviewComment` TEXT NULL;

CREATE INDEX `WeeklyReport_managerReviewedById_idx`
    ON `WeeklyReport`(`managerReviewedById`);

ALTER TABLE `WeeklyReport`
    ADD CONSTRAINT `WeeklyReport_managerReviewedById_fkey`
    FOREIGN KEY (`managerReviewedById`) REFERENCES `User`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
