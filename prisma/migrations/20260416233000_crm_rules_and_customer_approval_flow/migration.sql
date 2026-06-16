ALTER TABLE `Customer`
    ADD COLUMN `ownerProtectionMonths` INTEGER NOT NULL DEFAULT 3;

UPDATE `Customer`
SET `ownerProtectionMonths` = 3
WHERE `ownerProtectionMonths` IS NULL OR `ownerProtectionMonths` < 1;

ALTER TABLE `ApprovalRule`
    MODIFY `code` ENUM(
        'DISCOUNT',
        'LOW_PRICE',
        'EXPORT_QUOTATION',
        'CUSTOMER_TRANSFER',
        'CUSTOMER_CLAIM',
        'CUSTOMER_PROTECTION_EXTENSION'
    ) NOT NULL;

ALTER TABLE `ApprovalRequest`
    MODIFY `type` ENUM(
        'DISCOUNT',
        'LOW_PRICE',
        'EXPORT_QUOTATION',
        'CUSTOMER_TRANSFER',
        'CUSTOMER_CLAIM',
        'CUSTOMER_PROTECTION_EXTENSION'
    ) NOT NULL;

CREATE TABLE `SystemSetting` (
    `id` VARCHAR(191) NOT NULL,
    `settingKey` VARCHAR(128) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(64) NOT NULL,
    `configJson` JSON NOT NULL,
    `updatedByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SystemSetting_settingKey_key`(`settingKey`),
    INDEX `SystemSetting_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SystemSetting`
    ADD CONSTRAINT `SystemSetting_updatedByUserId_fkey`
    FOREIGN KEY (`updatedByUserId`) REFERENCES `User`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
