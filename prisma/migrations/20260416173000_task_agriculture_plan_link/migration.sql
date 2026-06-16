ALTER TABLE `Task`
    ADD COLUMN `agriculturePlanId` VARCHAR(191) NULL;

CREATE INDEX `Task_agriculturePlanId_idx` ON `Task`(`agriculturePlanId`);

ALTER TABLE `Task`
    ADD CONSTRAINT `Task_agriculturePlanId_fkey`
    FOREIGN KEY (`agriculturePlanId`) REFERENCES `AgriculturePlan`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
