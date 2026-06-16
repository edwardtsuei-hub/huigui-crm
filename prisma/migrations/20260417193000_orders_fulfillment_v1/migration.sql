-- CreateTable
CREATE TABLE `SalesOrder` (
    `id` VARCHAR(191) NOT NULL,
    `orderNo` VARCHAR(64) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `quotationId` VARCHAR(191) NULL,
    `contractId` VARCHAR(191) NULL,
    `channelPartnerId` VARCHAR(191) NULL,
    `orderDate` DATETIME(3) NOT NULL,
    `orderType` VARCHAR(32) NULL,
    `recipientName` VARCHAR(128) NULL,
    `recipientPhone` VARCHAR(32) NULL,
    `recipientProvince` VARCHAR(64) NULL,
    `recipientCity` VARCHAR(64) NULL,
    `recipientDistrict` VARCHAR(64) NULL,
    `recipientAddress` VARCHAR(255) NULL,
    `usagePurpose` TEXT NULL,
    `warehouseName` VARCHAR(128) NULL,
    `totalProductAmount` DECIMAL(12, 2) NULL,
    `discountAmount` DECIMAL(12, 2) NULL,
    `shippingFee` DECIMAL(12, 2) NULL,
    `receivableAmount` DECIMAL(12, 2) NULL,
    `receivedAmount` DECIMAL(12, 2) NULL,
    `paymentStatus` ENUM('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
    `shipmentStatus` ENUM('PENDING', 'PARTIAL', 'SHIPPED', 'DELIVERED', 'RETURNED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `settlementStatus` ENUM('NOT_REQUIRED', 'PENDING', 'PARTIAL', 'SETTLED', 'VOIDED') NOT NULL DEFAULT 'NOT_REQUIRED',
    `status` ENUM('DRAFT', 'CONFIRMED', 'IN_FULFILLMENT', 'COMPLETED', 'CANCELED') NOT NULL DEFAULT 'DRAFT',
    `remark` TEXT NULL,
    `ownerUserId` VARCHAR(191) NOT NULL,
    `creatorUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SalesOrder_orderNo_key`(`orderNo`),
    INDEX `SalesOrder_customerId_idx`(`customerId`),
    INDEX `SalesOrder_quotationId_idx`(`quotationId`),
    INDEX `SalesOrder_contractId_idx`(`contractId`),
    INDEX `SalesOrder_channelPartnerId_idx`(`channelPartnerId`),
    INDEX `SalesOrder_ownerUserId_idx`(`ownerUserId`),
    INDEX `SalesOrder_creatorUserId_idx`(`creatorUserId`),
    INDEX `SalesOrder_orderDate_idx`(`orderDate`),
    INDEX `SalesOrder_status_idx`(`status`),
    INDEX `SalesOrder_paymentStatus_idx`(`paymentStatus`),
    INDEX `SalesOrder_shipmentStatus_idx`(`shipmentStatus`),
    INDEX `SalesOrder_settlementStatus_idx`(`settlementStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesOrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `lineNo` INTEGER NOT NULL,
    `itemName` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(64) NULL,
    `spec` VARCHAR(128) NULL,
    `unit` VARCHAR(32) NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NULL,
    `lineAmount` DECIMAL(12, 2) NULL,
    `usagePurpose` TEXT NULL,
    `remark` TEXT NULL,
    `detailJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SalesOrderItem_orderId_idx`(`orderId`),
    INDEX `SalesOrderItem_productId_idx`(`productId`),
    UNIQUE INDEX `SalesOrderItem_orderId_lineNo_key`(`orderId`, `lineNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentRecord` (
    `id` VARCHAR(191) NOT NULL,
    `paymentNo` VARCHAR(64) NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `financeAccountId` VARCHAR(191) NULL,
    `payerName` VARCHAR(128) NULL,
    `paymentMethod` ENUM('CASH', 'BANK_TRANSFER', 'WECHAT', 'ALIPAY', 'OTHER') NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `paidAt` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'FAILED', 'VOIDED') NOT NULL DEFAULT 'CONFIRMED',
    `referenceNo` VARCHAR(128) NULL,
    `remark` TEXT NULL,
    `creatorUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PaymentRecord_paymentNo_key`(`paymentNo`),
    INDEX `PaymentRecord_orderId_idx`(`orderId`),
    INDEX `PaymentRecord_financeAccountId_idx`(`financeAccountId`),
    INDEX `PaymentRecord_creatorUserId_idx`(`creatorUserId`),
    INDEX `PaymentRecord_paidAt_idx`(`paidAt`),
    INDEX `PaymentRecord_status_idx`(`status`),
    INDEX `PaymentRecord_paymentMethod_idx`(`paymentMethod`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShipmentRecord` (
    `id` VARCHAR(191) NOT NULL,
    `shipmentNo` VARCHAR(64) NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `warehouseName` VARCHAR(128) NULL,
    `courierCompany` VARCHAR(128) NULL,
    `trackingNo` VARCHAR(128) NULL,
    `shippedAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'SHIPPED', 'DELIVERED', 'RETURNED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `recipientName` VARCHAR(128) NULL,
    `recipientPhone` VARCHAR(32) NULL,
    `recipientAddress` VARCHAR(255) NULL,
    `remark` TEXT NULL,
    `operatorUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ShipmentRecord_shipmentNo_key`(`shipmentNo`),
    INDEX `ShipmentRecord_orderId_idx`(`orderId`),
    INDEX `ShipmentRecord_operatorUserId_idx`(`operatorUserId`),
    INDEX `ShipmentRecord_status_idx`(`status`),
    INDEX `ShipmentRecord_shippedAt_idx`(`shippedAt`),
    INDEX `ShipmentRecord_deliveredAt_idx`(`deliveredAt`),
    INDEX `ShipmentRecord_trackingNo_idx`(`trackingNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShipmentItem` (
    `id` VARCHAR(191) NOT NULL,
    `shipmentId` VARCHAR(191) NOT NULL,
    `orderItemId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `itemName` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ShipmentItem_shipmentId_idx`(`shipmentId`),
    INDEX `ShipmentItem_orderItemId_idx`(`orderItemId`),
    INDEX `ShipmentItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChannelPartner` (
    `id` VARCHAR(191) NOT NULL,
    `partnerName` VARCHAR(191) NOT NULL,
    `contactName` VARCHAR(128) NULL,
    `mobile` VARCHAR(32) NULL,
    `wechatId` VARCHAR(128) NULL,
    `province` VARCHAR(64) NULL,
    `city` VARCHAR(64) NULL,
    `district` VARCHAR(64) NULL,
    `address` VARCHAR(255) NULL,
    `settlementType` ENUM('DIRECT_SUPPLY', 'CHANNEL_RESALE', 'CHANNEL_REBATE', 'OTHER') NULL,
    `settlementRuleText` TEXT NULL,
    `remark` TEXT NULL,
    `ownerUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ChannelPartner_ownerUserId_idx`(`ownerUserId`),
    INDEX `ChannelPartner_partnerName_idx`(`partnerName`),
    INDEX `ChannelPartner_city_idx`(`city`),
    INDEX `ChannelPartner_settlementType_idx`(`settlementType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChannelSettlement` (
    `id` VARCHAR(191) NOT NULL,
    `settlementNo` VARCHAR(64) NOT NULL,
    `channelPartnerId` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NULL,
    `periodEnd` DATETIME(3) NULL,
    `totalSupplyAmount` DECIMAL(12, 2) NULL,
    `totalCostAmount` DECIMAL(12, 2) NULL,
    `totalProfitAmount` DECIMAL(12, 2) NULL,
    `totalPaidAmount` DECIMAL(12, 2) NULL,
    `status` ENUM('NOT_REQUIRED', 'PENDING', 'PARTIAL', 'SETTLED', 'VOIDED') NOT NULL DEFAULT 'PENDING',
    `remark` TEXT NULL,
    `creatorUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ChannelSettlement_settlementNo_key`(`settlementNo`),
    INDEX `ChannelSettlement_channelPartnerId_idx`(`channelPartnerId`),
    INDEX `ChannelSettlement_creatorUserId_idx`(`creatorUserId`),
    INDEX `ChannelSettlement_status_idx`(`status`),
    INDEX `ChannelSettlement_periodStart_periodEnd_idx`(`periodStart`, `periodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChannelSettlementItem` (
    `id` VARCHAR(191) NOT NULL,
    `settlementId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `orderItemId` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NULL,
    `orderDate` DATETIME(3) NULL,
    `itemName` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(12, 2) NULL,
    `supplyUnitPrice` DECIMAL(12, 2) NULL,
    `supplyAmount` DECIMAL(12, 2) NULL,
    `cashPaymentAmount` DECIMAL(12, 2) NULL,
    `paymentNote` VARCHAR(64) NULL,
    `costUnitPrice` DECIMAL(12, 2) NULL,
    `costAmount` DECIMAL(12, 2) NULL,
    `profitAmount` DECIMAL(12, 2) NULL,
    `remark` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ChannelSettlementItem_settlementId_idx`(`settlementId`),
    INDEX `ChannelSettlementItem_orderId_idx`(`orderId`),
    INDEX `ChannelSettlementItem_orderItemId_idx`(`orderItemId`),
    INDEX `ChannelSettlementItem_productId_idx`(`productId`),
    INDEX `ChannelSettlementItem_orderDate_idx`(`orderDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinanceAccount` (
    `id` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(255) NOT NULL,
    `accountName` VARCHAR(128) NULL,
    `accountNo` VARCHAR(128) NOT NULL,
    `bankName` VARCHAR(255) NULL,
    `accountType` VARCHAR(64) NULL,
    `usageScene` VARCHAR(128) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `remark` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FinanceAccount_companyName_idx`(`companyName`),
    INDEX `FinanceAccount_accountNo_idx`(`accountNo`),
    INDEX `FinanceAccount_enabled_idx`(`enabled`),
    INDEX `FinanceAccount_isDefault_idx`(`isDefault`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SalesOrder` ADD CONSTRAINT `SalesOrder_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesOrder` ADD CONSTRAINT `SalesOrder_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `Quotation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesOrder` ADD CONSTRAINT `SalesOrder_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesOrder` ADD CONSTRAINT `SalesOrder_channelPartnerId_fkey` FOREIGN KEY (`channelPartnerId`) REFERENCES `ChannelPartner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesOrder` ADD CONSTRAINT `SalesOrder_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesOrder` ADD CONSTRAINT `SalesOrder_creatorUserId_fkey` FOREIGN KEY (`creatorUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesOrderItem` ADD CONSTRAINT `SalesOrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `SalesOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesOrderItem` ADD CONSTRAINT `SalesOrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentRecord` ADD CONSTRAINT `PaymentRecord_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `SalesOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentRecord` ADD CONSTRAINT `PaymentRecord_financeAccountId_fkey` FOREIGN KEY (`financeAccountId`) REFERENCES `FinanceAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentRecord` ADD CONSTRAINT `PaymentRecord_creatorUserId_fkey` FOREIGN KEY (`creatorUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShipmentRecord` ADD CONSTRAINT `ShipmentRecord_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `SalesOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShipmentRecord` ADD CONSTRAINT `ShipmentRecord_operatorUserId_fkey` FOREIGN KEY (`operatorUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShipmentItem` ADD CONSTRAINT `ShipmentItem_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `ShipmentRecord`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShipmentItem` ADD CONSTRAINT `ShipmentItem_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `SalesOrderItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShipmentItem` ADD CONSTRAINT `ShipmentItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelPartner` ADD CONSTRAINT `ChannelPartner_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelSettlement` ADD CONSTRAINT `ChannelSettlement_channelPartnerId_fkey` FOREIGN KEY (`channelPartnerId`) REFERENCES `ChannelPartner`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelSettlement` ADD CONSTRAINT `ChannelSettlement_creatorUserId_fkey` FOREIGN KEY (`creatorUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelSettlementItem` ADD CONSTRAINT `ChannelSettlementItem_settlementId_fkey` FOREIGN KEY (`settlementId`) REFERENCES `ChannelSettlement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelSettlementItem` ADD CONSTRAINT `ChannelSettlementItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `SalesOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelSettlementItem` ADD CONSTRAINT `ChannelSettlementItem_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `SalesOrderItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelSettlementItem` ADD CONSTRAINT `ChannelSettlementItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
