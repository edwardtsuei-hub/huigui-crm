ALTER TABLE `SalarySlip`
  ADD COLUMN `publishBatchId` VARCHAR(160) NULL,
  ADD COLUMN `userId` VARCHAR(120) NULL,
  ADD COLUMN `wecomUserId` VARCHAR(128) NULL,
  ADD COLUMN `loginAccount` VARCHAR(64) NULL;

CREATE INDEX `SalarySlip_publishBatchId_idx` ON `SalarySlip`(`publishBatchId`);
CREATE INDEX `SalarySlip_userId_idx` ON `SalarySlip`(`userId`);
CREATE INDEX `SalarySlip_wecomUserId_idx` ON `SalarySlip`(`wecomUserId`);
CREATE INDEX `SalarySlip_loginAccount_idx` ON `SalarySlip`(`loginAccount`);

ALTER TABLE `SalaryNotifyLog`
  ADD COLUMN `publishBatchId` VARCHAR(160) NULL;

CREATE INDEX `SalaryNotifyLog_publishBatchId_idx` ON `SalaryNotifyLog`(`publishBatchId`);

ALTER TABLE `PayrollDraftBatch`
  ADD COLUMN `publishBatchId` VARCHAR(160) NULL;

CREATE INDEX `PayrollDraftBatch_publishBatchId_idx` ON `PayrollDraftBatch`(`publishBatchId`);
