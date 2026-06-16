ALTER TABLE `Customer`
    ADD COLUMN `ownerAssignedAt` DATETIME(3) NULL,
    ADD COLUMN `ownerProtectedUntil` DATETIME(3) NULL;

UPDATE `Customer` AS c
LEFT JOIN (
    SELECT
        `customerId`,
        MAX(`followupDate`) AS `latestFollowupAt`
    FROM `CustomerFollowup`
    GROUP BY `customerId`
) AS f
    ON f.`customerId` = c.`id`
SET c.`ownerAssignedAt` = COALESCE(c.`ownerAssignedAt`, f.`latestFollowupAt`, c.`createdAt`),
    c.`ownerProtectedUntil` = COALESCE(
        c.`ownerProtectedUntil`,
        DATE_ADD(COALESCE(f.`latestFollowupAt`, c.`createdAt`), INTERVAL 3 MONTH)
    );

ALTER TABLE `Customer`
    MODIFY `ownerAssignedAt` DATETIME(3) NOT NULL,
    MODIFY `ownerProtectedUntil` DATETIME(3) NOT NULL;

CREATE INDEX `Customer_ownerProtectedUntil_idx` ON `Customer`(`ownerProtectedUntil`);
