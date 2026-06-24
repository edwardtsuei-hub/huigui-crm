-- DCM-141 local review only.
-- Do not run this migration until Daochong money Go/No-Go is explicitly approved.
-- Scope: readonly-first recharge, settlement draft, and card consumption approval source tables.

CREATE TABLE `DaochongCustomerRecharge` (
  `id` VARCHAR(191) NOT NULL,
  `customerId` VARCHAR(191) NOT NULL,
  `submittedByUserId` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `paymentMethod` ENUM('WECHAT', 'ALIPAY', 'BANK_TRANSFER', 'CASH', 'CARD_CONSUME', 'OTHER') NOT NULL,
  `evidenceAssetIds` JSON NOT NULL,
  `cashPhotoAssetIds` JSON NULL,
  `cashAmount` DECIMAL(12, 2) NULL,
  `cashCustodianUserId` VARCHAR(191) NULL,
  `rechargeStatus` ENUM('PENDING_CHENGCHENG_APPROVAL', 'RETURNED_BY_CHENGCHENG', 'PENDING_LIMENG_REVIEW', 'RETURNED_BY_LIMENG', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_CHENGCHENG_APPROVAL',
  `chengchengApprovedByUserId` VARCHAR(191) NULL,
  `chengchengApprovedAt` DATETIME(3) NULL,
  `limengReviewedByUserId` VARCHAR(191) NULL,
  `limengReviewedAt` DATETIME(3) NULL,
  `returnReason` TEXT NULL,
  `balanceAppliedAt` DATETIME(3) NULL,
  `financeSummaryMonth` VARCHAR(7) NULL,
  `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
  `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
  `testBatchId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
);

CREATE INDEX `DaochongCustomerRecharge_customerId_idx` ON `DaochongCustomerRecharge`(`customerId`);
CREATE INDEX `DaochongCustomerRecharge_submittedByUserId_idx` ON `DaochongCustomerRecharge`(`submittedByUserId`);
CREATE INDEX `DaochongCustomerRecharge_cashCustodianUserId_idx` ON `DaochongCustomerRecharge`(`cashCustodianUserId`);
CREATE INDEX `DaochongCustomerRecharge_chengchengApprovedByUserId_idx` ON `DaochongCustomerRecharge`(`chengchengApprovedByUserId`);
CREATE INDEX `DaochongCustomerRecharge_limengReviewedByUserId_idx` ON `DaochongCustomerRecharge`(`limengReviewedByUserId`);
CREATE INDEX `DaochongCustomerRecharge_rechargeStatus_idx` ON `DaochongCustomerRecharge`(`rechargeStatus`);
CREATE INDEX `DaochongCustomerRecharge_financeSummaryMonth_idx` ON `DaochongCustomerRecharge`(`financeSummaryMonth`);
CREATE INDEX `DaochongCustomerRecharge_partitionKey_idx` ON `DaochongCustomerRecharge`(`partitionKey`);
CREATE INDEX `DaochongCustomerRecharge_testBatchId_idx` ON `DaochongCustomerRecharge`(`testBatchId`);

CREATE TABLE `DaochongServiceSettlementDraft` (
  `id` VARCHAR(191) NOT NULL,
  `appointmentId` VARCHAR(191) NULL,
  `customerId` VARCHAR(191) NOT NULL,
  `teacherId` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NULL,
  `cardMode` ENUM('NO_CARD', 'PREPAID_CARD', 'PACKAGE_CARD') NOT NULL DEFAULT 'NO_CARD',
  `cardId` VARCHAR(191) NULL,
  `originalAmount` DECIMAL(12, 2) NOT NULL,
  `discountAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `discountReason` TEXT NULL,
  `finalAmount` DECIMAL(12, 2) NOT NULL,
  `consumeAmount` DECIMAL(12, 2) NULL,
  `evidenceAssetIds` JSON NOT NULL,
  `referrerName` VARCHAR(128) NULL,
  `referralBonusAmount` DECIMAL(12, 2) NULL,
  `validationStatus` VARCHAR(64) NOT NULL DEFAULT 'PENDING',
  `canSubmitApproval` BOOLEAN NOT NULL DEFAULT FALSE,
  `draftStatus` ENUM('DRAFT', 'BLOCKED_EVIDENCE', 'READY_FOR_APPROVAL', 'SUBMITTED_FOR_APPROVAL', 'RETURNED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `submittedByUserId` VARCHAR(191) NULL,
  `submittedAt` DATETIME(3) NULL,
  `returnedReason` TEXT NULL,
  `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
  `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
  `testBatchId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
);

CREATE INDEX `DaochongServiceSettlementDraft_customerId_idx` ON `DaochongServiceSettlementDraft`(`customerId`);
CREATE INDEX `DaochongServiceSettlementDraft_teacherId_idx` ON `DaochongServiceSettlementDraft`(`teacherId`);
CREATE INDEX `DaochongServiceSettlementDraft_projectId_idx` ON `DaochongServiceSettlementDraft`(`projectId`);
CREATE INDEX `DaochongServiceSettlementDraft_submittedByUserId_idx` ON `DaochongServiceSettlementDraft`(`submittedByUserId`);
CREATE INDEX `DaochongServiceSettlementDraft_appointmentId_idx` ON `DaochongServiceSettlementDraft`(`appointmentId`);
CREATE INDEX `DaochongServiceSettlementDraft_draftStatus_idx` ON `DaochongServiceSettlementDraft`(`draftStatus`);
CREATE INDEX `DaochongServiceSettlementDraft_submittedAt_idx` ON `DaochongServiceSettlementDraft`(`submittedAt`);
CREATE INDEX `DaochongServiceSettlementDraft_partitionKey_idx` ON `DaochongServiceSettlementDraft`(`partitionKey`);
CREATE INDEX `DaochongServiceSettlementDraft_testBatchId_idx` ON `DaochongServiceSettlementDraft`(`testBatchId`);

CREATE TABLE `DaochongCardConsumptionApproval` (
  `id` VARCHAR(191) NOT NULL,
  `settlementDraftId` VARCHAR(191) NOT NULL,
  `customerId` VARCHAR(191) NOT NULL,
  `teacherId` VARCHAR(191) NOT NULL,
  `cardId` VARCHAR(191) NULL,
  `consumeAmount` DECIMAL(12, 2) NOT NULL,
  `evidenceAssetIds` JSON NOT NULL,
  `discountReason` TEXT NULL,
  `referrerName` VARCHAR(128) NULL,
  `referralBonusAmount` DECIMAL(12, 2) NULL,
  `approvalStatus` ENUM('PENDING', 'APPROVED', 'RETURNED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `approvedByUserId` VARCHAR(191) NULL,
  `approvedAt` DATETIME(3) NULL,
  `returnedByUserId` VARCHAR(191) NULL,
  `returnedAt` DATETIME(3) NULL,
  `returnReason` TEXT NULL,
  `supplementRequirements` TEXT NULL,
  `financeSummaryMonth` VARCHAR(7) NULL,
  `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
  `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
  `testBatchId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
);

CREATE INDEX `DaochongCardConsumptionApproval_settlementDraftId_idx` ON `DaochongCardConsumptionApproval`(`settlementDraftId`);
CREATE INDEX `DaochongCardConsumptionApproval_customerId_idx` ON `DaochongCardConsumptionApproval`(`customerId`);
CREATE INDEX `DaochongCardConsumptionApproval_teacherId_idx` ON `DaochongCardConsumptionApproval`(`teacherId`);
CREATE INDEX `DaochongCardConsumptionApproval_approvedByUserId_idx` ON `DaochongCardConsumptionApproval`(`approvedByUserId`);
CREATE INDEX `DaochongCardConsumptionApproval_returnedByUserId_idx` ON `DaochongCardConsumptionApproval`(`returnedByUserId`);
CREATE INDEX `DaochongCardConsumptionApproval_approvalStatus_idx` ON `DaochongCardConsumptionApproval`(`approvalStatus`);
CREATE INDEX `DaochongCardConsumptionApproval_financeSummaryMonth_idx` ON `DaochongCardConsumptionApproval`(`financeSummaryMonth`);
CREATE INDEX `DaochongCardConsumptionApproval_partitionKey_idx` ON `DaochongCardConsumptionApproval`(`partitionKey`);
CREATE INDEX `DaochongCardConsumptionApproval_testBatchId_idx` ON `DaochongCardConsumptionApproval`(`testBatchId`);

ALTER TABLE `DaochongCustomerRecharge`
  ADD CONSTRAINT `DaochongCustomerRecharge_customerId_fkey`
  FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `DaochongCustomerRecharge`
  ADD CONSTRAINT `DaochongCustomerRecharge_submittedByUserId_fkey`
  FOREIGN KEY (`submittedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `DaochongCustomerRecharge`
  ADD CONSTRAINT `DaochongCustomerRecharge_cashCustodianUserId_fkey`
  FOREIGN KEY (`cashCustodianUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `DaochongCustomerRecharge`
  ADD CONSTRAINT `DaochongCustomerRecharge_chengchengApprovedByUserId_fkey`
  FOREIGN KEY (`chengchengApprovedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `DaochongCustomerRecharge`
  ADD CONSTRAINT `DaochongCustomerRecharge_limengReviewedByUserId_fkey`
  FOREIGN KEY (`limengReviewedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `DaochongServiceSettlementDraft`
  ADD CONSTRAINT `DaochongServiceSettlementDraft_customerId_fkey`
  FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `DaochongServiceSettlementDraft`
  ADD CONSTRAINT `DaochongServiceSettlementDraft_teacherId_fkey`
  FOREIGN KEY (`teacherId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `DaochongServiceSettlementDraft`
  ADD CONSTRAINT `DaochongServiceSettlementDraft_projectId_fkey`
  FOREIGN KEY (`projectId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `DaochongServiceSettlementDraft`
  ADD CONSTRAINT `DaochongServiceSettlementDraft_submittedByUserId_fkey`
  FOREIGN KEY (`submittedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `DaochongCardConsumptionApproval`
  ADD CONSTRAINT `DaochongCardConsumptionApproval_settlementDraftId_fkey`
  FOREIGN KEY (`settlementDraftId`) REFERENCES `DaochongServiceSettlementDraft`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `DaochongCardConsumptionApproval`
  ADD CONSTRAINT `DaochongCardConsumptionApproval_customerId_fkey`
  FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `DaochongCardConsumptionApproval`
  ADD CONSTRAINT `DaochongCardConsumptionApproval_teacherId_fkey`
  FOREIGN KEY (`teacherId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `DaochongCardConsumptionApproval`
  ADD CONSTRAINT `DaochongCardConsumptionApproval_approvedByUserId_fkey`
  FOREIGN KEY (`approvedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `DaochongCardConsumptionApproval`
  ADD CONSTRAINT `DaochongCardConsumptionApproval_returnedByUserId_fkey`
  FOREIGN KEY (`returnedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
