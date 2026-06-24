-- DCM-137 local review only.
-- Do not run this migration until Daochong finance Go/No-Go is explicitly approved.
-- Scope: readonly-first finance summary, evidence exception, and bonus/expense source tables.

CREATE TABLE `DaochongFinanceSummary` (
  `id` VARCHAR(191) NOT NULL,
  `summaryMonth` VARCHAR(7) NOT NULL,
  `confirmedRechargeAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `pendingCashCustodyAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `approvedConsumeAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `commissionAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `referralBonusAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `teamBonusAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `expenseAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `evidenceAssetIds` JSON NOT NULL,
  `sourceCutoffAt` DATETIME(3) NOT NULL,
  `exceptionCount` INTEGER NOT NULL DEFAULT 0,
  `payrollPreviewStatus` ENUM('NOT_GENERATED', 'DRAFT', 'PENDING_CONFIRMATION', 'CONFIRMED') NOT NULL DEFAULT 'NOT_GENERATED',
  `canConfirmFinance` BOOLEAN NOT NULL DEFAULT false,
  `financeStatus` ENUM('DRAFT', 'EVIDENCE_EXCEPTION', 'READY_FOR_REVIEW', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `confirmedByUserId` VARCHAR(191) NULL,
  `confirmedAt` DATETIME(3) NULL,
  `lockedAt` DATETIME(3) NULL,
  `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
  `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
  `testBatchId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
);

CREATE INDEX `DaochongFinanceSummary_summaryMonth_idx` ON `DaochongFinanceSummary`(`summaryMonth`);
CREATE INDEX `DaochongFinanceSummary_financeStatus_idx` ON `DaochongFinanceSummary`(`financeStatus`);
CREATE INDEX `DaochongFinanceSummary_payrollPreviewStatus_idx` ON `DaochongFinanceSummary`(`payrollPreviewStatus`);
CREATE INDEX `DaochongFinanceSummary_confirmedByUserId_idx` ON `DaochongFinanceSummary`(`confirmedByUserId`);
CREATE INDEX `DaochongFinanceSummary_partitionKey_idx` ON `DaochongFinanceSummary`(`partitionKey`);
CREATE INDEX `DaochongFinanceSummary_testBatchId_idx` ON `DaochongFinanceSummary`(`testBatchId`);

CREATE TABLE `DaochongFinanceEvidenceException` (
  `id` VARCHAR(191) NOT NULL,
  `summaryId` VARCHAR(191) NULL,
  `businessType` ENUM('RECHARGE', 'SETTLEMENT', 'CONSUMPTION_APPROVAL', 'BONUS', 'EXPENSE', 'WELFARE') NOT NULL,
  `businessId` VARCHAR(191) NOT NULL,
  `exceptionReason` TEXT NOT NULL,
  `currentOwnerUserId` VARCHAR(191) NULL,
  `returnTargetUserId` VARCHAR(191) NULL,
  `exceptionStatus` ENUM('PENDING_SUPPLEMENT', 'SUPPLEMENTED', 'CONFIRMED', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_SUPPLEMENT',
  `evidenceAssetIds` JSON NULL,
  `supplementRequirements` TEXT NULL,
  `resolvedByUserId` VARCHAR(191) NULL,
  `resolvedAt` DATETIME(3) NULL,
  `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
  `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
  `testBatchId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
);

CREATE INDEX `DaochongFinanceEvidenceException_summaryId_idx` ON `DaochongFinanceEvidenceException`(`summaryId`);
CREATE INDEX `DaochongFinanceEvidenceException_business_idx` ON `DaochongFinanceEvidenceException`(`businessType`, `businessId`);
CREATE INDEX `DaochongFinanceEvidenceException_currentOwnerUserId_idx` ON `DaochongFinanceEvidenceException`(`currentOwnerUserId`);
CREATE INDEX `DaochongFinanceEvidenceException_returnTargetUserId_idx` ON `DaochongFinanceEvidenceException`(`returnTargetUserId`);
CREATE INDEX `DaochongFinanceEvidenceException_resolvedByUserId_idx` ON `DaochongFinanceEvidenceException`(`resolvedByUserId`);
CREATE INDEX `DaochongFinanceEvidenceException_exceptionStatus_idx` ON `DaochongFinanceEvidenceException`(`exceptionStatus`);
CREATE INDEX `DaochongFinanceEvidenceException_partitionKey_idx` ON `DaochongFinanceEvidenceException`(`partitionKey`);
CREATE INDEX `DaochongFinanceEvidenceException_testBatchId_idx` ON `DaochongFinanceEvidenceException`(`testBatchId`);

CREATE TABLE `DaochongBonusExpenseItem` (
  `id` VARCHAR(191) NOT NULL,
  `itemType` ENUM('TEAM_BONUS', 'REFERRAL_BONUS', 'WELFARE_ALLOWANCE', 'EXPENSE_REIMBURSEMENT', 'DEDUCTION') NOT NULL,
  `targetUserId` VARCHAR(191) NULL,
  `customerId` VARCHAR(191) NULL,
  `submittedByUserId` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `reason` TEXT NOT NULL,
  `evidenceAssetIds` JSON NULL,
  `financeStatus` ENUM('DRAFT', 'PENDING_EVIDENCE', 'PENDING_FINANCE_REVIEW', 'RETURNED', 'INCLUDED_IN_SUMMARY', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `summaryMonth` VARCHAR(7) NULL,
  `summaryId` VARCHAR(191) NULL,
  `returnReason` TEXT NULL,
  `financeReviewedByUserId` VARCHAR(191) NULL,
  `financeReviewedAt` DATETIME(3) NULL,
  `dataScope` ENUM('REAL', 'TEST') NOT NULL DEFAULT 'REAL',
  `partitionKey` VARCHAR(64) NOT NULL DEFAULT 'REAL',
  `testBatchId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
);

CREATE INDEX `DaochongBonusExpenseItem_itemType_idx` ON `DaochongBonusExpenseItem`(`itemType`);
CREATE INDEX `DaochongBonusExpenseItem_targetUserId_idx` ON `DaochongBonusExpenseItem`(`targetUserId`);
CREATE INDEX `DaochongBonusExpenseItem_customerId_idx` ON `DaochongBonusExpenseItem`(`customerId`);
CREATE INDEX `DaochongBonusExpenseItem_submittedByUserId_idx` ON `DaochongBonusExpenseItem`(`submittedByUserId`);
CREATE INDEX `DaochongBonusExpenseItem_financeStatus_idx` ON `DaochongBonusExpenseItem`(`financeStatus`);
CREATE INDEX `DaochongBonusExpenseItem_summaryMonth_idx` ON `DaochongBonusExpenseItem`(`summaryMonth`);
CREATE INDEX `DaochongBonusExpenseItem_summaryId_idx` ON `DaochongBonusExpenseItem`(`summaryId`);
CREATE INDEX `DaochongBonusExpenseItem_financeReviewedByUserId_idx` ON `DaochongBonusExpenseItem`(`financeReviewedByUserId`);
CREATE INDEX `DaochongBonusExpenseItem_partitionKey_idx` ON `DaochongBonusExpenseItem`(`partitionKey`);
CREATE INDEX `DaochongBonusExpenseItem_testBatchId_idx` ON `DaochongBonusExpenseItem`(`testBatchId`);

ALTER TABLE `DaochongFinanceSummary`
  ADD CONSTRAINT `DaochongFinanceSummary_confirmedByUserId_fkey`
  FOREIGN KEY (`confirmedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `DaochongFinanceEvidenceException`
  ADD CONSTRAINT `DaochongFinanceEvidenceException_summaryId_fkey`
  FOREIGN KEY (`summaryId`) REFERENCES `DaochongFinanceSummary`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `DaochongFinanceEvidenceException`
  ADD CONSTRAINT `DaochongFinanceEvidenceException_currentOwnerUserId_fkey`
  FOREIGN KEY (`currentOwnerUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `DaochongFinanceEvidenceException`
  ADD CONSTRAINT `DaochongFinanceEvidenceException_returnTargetUserId_fkey`
  FOREIGN KEY (`returnTargetUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `DaochongFinanceEvidenceException`
  ADD CONSTRAINT `DaochongFinanceEvidenceException_resolvedByUserId_fkey`
  FOREIGN KEY (`resolvedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `DaochongBonusExpenseItem`
  ADD CONSTRAINT `DaochongBonusExpenseItem_targetUserId_fkey`
  FOREIGN KEY (`targetUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `DaochongBonusExpenseItem`
  ADD CONSTRAINT `DaochongBonusExpenseItem_customerId_fkey`
  FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `DaochongBonusExpenseItem`
  ADD CONSTRAINT `DaochongBonusExpenseItem_submittedByUserId_fkey`
  FOREIGN KEY (`submittedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `DaochongBonusExpenseItem`
  ADD CONSTRAINT `DaochongBonusExpenseItem_financeReviewedByUserId_fkey`
  FOREIGN KEY (`financeReviewedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `DaochongBonusExpenseItem`
  ADD CONSTRAINT `DaochongBonusExpenseItem_summaryId_fkey`
  FOREIGN KEY (`summaryId`) REFERENCES `DaochongFinanceSummary`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
