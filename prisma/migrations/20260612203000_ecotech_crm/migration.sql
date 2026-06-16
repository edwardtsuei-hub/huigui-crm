CREATE TABLE `EcotechCustomerRecord` (
  `id` VARCHAR(128) NOT NULL,
  `department` VARCHAR(128) NOT NULL DEFAULT '洄归生态科技',
  `customerName` VARCHAR(255) NULL,
  `ownerName` VARCHAR(128) NULL,
  `status` VARCHAR(64) NULL,
  `industry` VARCHAR(64) NULL,
  `nextFollowupAt` DATETIME(3) NULL,
  `recordJson` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `EcotechCustomerRecord_department_idx`(`department`),
  INDEX `EcotechCustomerRecord_customerName_idx`(`customerName`),
  INDEX `EcotechCustomerRecord_ownerName_idx`(`ownerName`),
  INDEX `EcotechCustomerRecord_status_idx`(`status`),
  INDEX `EcotechCustomerRecord_industry_idx`(`industry`),
  INDEX `EcotechCustomerRecord_nextFollowupAt_idx`(`nextFollowupAt`),
  INDEX `EcotechCustomerRecord_updatedAt_idx`(`updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EcotechQuotationRecord` (
  `id` VARCHAR(128) NOT NULL,
  `department` VARCHAR(128) NOT NULL DEFAULT '洄归生态科技',
  `code` VARCHAR(128) NULL,
  `title` VARCHAR(255) NULL,
  `customerName` VARCHAR(255) NULL,
  `status` VARCHAR(64) NULL,
  `industry` VARCHAR(64) NULL,
  `source` VARCHAR(64) NULL,
  `totalAmount` DECIMAL(12, 2) NULL,
  `recordJson` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `EcotechQuotationRecord_department_idx`(`department`),
  INDEX `EcotechQuotationRecord_code_idx`(`code`),
  INDEX `EcotechQuotationRecord_customerName_idx`(`customerName`),
  INDEX `EcotechQuotationRecord_status_idx`(`status`),
  INDEX `EcotechQuotationRecord_industry_idx`(`industry`),
  INDEX `EcotechQuotationRecord_updatedAt_idx`(`updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EcotechProductRecord` (
  `id` VARCHAR(128) NOT NULL,
  `department` VARCHAR(128) NOT NULL DEFAULT '洄归生态科技',
  `sku` VARCHAR(128) NULL,
  `name` VARCHAR(255) NULL,
  `brand` VARCHAR(64) NULL,
  `category` VARCHAR(128) NULL,
  `status` VARCHAR(64) NULL,
  `recordJson` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `EcotechProductRecord_department_idx`(`department`),
  INDEX `EcotechProductRecord_sku_idx`(`sku`),
  INDEX `EcotechProductRecord_name_idx`(`name`),
  INDEX `EcotechProductRecord_brand_idx`(`brand`),
  INDEX `EcotechProductRecord_category_idx`(`category`),
  INDEX `EcotechProductRecord_status_idx`(`status`),
  INDEX `EcotechProductRecord_updatedAt_idx`(`updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EcotechOrderRecord` (
  `id` VARCHAR(128) NOT NULL,
  `department` VARCHAR(128) NOT NULL DEFAULT '洄归生态科技',
  `code` VARCHAR(128) NULL,
  `customerName` VARCHAR(255) NULL,
  `status` VARCHAR(64) NULL,
  `totalAmount` DECIMAL(12, 2) NULL,
  `financeAccount` VARCHAR(128) NULL,
  `recordJson` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `EcotechOrderRecord_department_idx`(`department`),
  INDEX `EcotechOrderRecord_code_idx`(`code`),
  INDEX `EcotechOrderRecord_customerName_idx`(`customerName`),
  INDEX `EcotechOrderRecord_status_idx`(`status`),
  INDEX `EcotechOrderRecord_financeAccount_idx`(`financeAccount`),
  INDEX `EcotechOrderRecord_updatedAt_idx`(`updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EcotechFinanceAccountRecord` (
  `id` VARCHAR(128) NOT NULL,
  `department` VARCHAR(128) NOT NULL DEFAULT '洄归生态科技',
  `entity` VARCHAR(255) NULL,
  `accountName` VARCHAR(255) NULL,
  `bank` VARCHAR(255) NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `recordJson` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `EcotechFinanceAccountRecord_department_idx`(`department`),
  INDEX `EcotechFinanceAccountRecord_entity_idx`(`entity`),
  INDEX `EcotechFinanceAccountRecord_accountName_idx`(`accountName`),
  INDEX `EcotechFinanceAccountRecord_active_idx`(`active`),
  INDEX `EcotechFinanceAccountRecord_updatedAt_idx`(`updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EcotechChannelPartnerRecord` (
  `id` VARCHAR(128) NOT NULL,
  `department` VARCHAR(128) NOT NULL DEFAULT '洄归生态科技',
  `name` VARCHAR(255) NULL,
  `contact` VARCHAR(128) NULL,
  `phone` VARCHAR(64) NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `recordJson` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `EcotechChannelPartnerRecord_department_idx`(`department`),
  INDEX `EcotechChannelPartnerRecord_name_idx`(`name`),
  INDEX `EcotechChannelPartnerRecord_contact_idx`(`contact`),
  INDEX `EcotechChannelPartnerRecord_active_idx`(`active`),
  INDEX `EcotechChannelPartnerRecord_updatedAt_idx`(`updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EcotechContractRecord` (
  `id` VARCHAR(128) NOT NULL,
  `department` VARCHAR(128) NOT NULL DEFAULT '洄归生态科技',
  `code` VARCHAR(128) NULL,
  `title` VARCHAR(255) NULL,
  `customerName` VARCHAR(255) NULL,
  `status` VARCHAR(64) NULL,
  `endAt` DATETIME(3) NULL,
  `recordJson` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `EcotechContractRecord_department_idx`(`department`),
  INDEX `EcotechContractRecord_code_idx`(`code`),
  INDEX `EcotechContractRecord_customerName_idx`(`customerName`),
  INDEX `EcotechContractRecord_status_idx`(`status`),
  INDEX `EcotechContractRecord_endAt_idx`(`endAt`),
  INDEX `EcotechContractRecord_updatedAt_idx`(`updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EcotechInspectionRecord` (
  `id` VARCHAR(128) NOT NULL,
  `department` VARCHAR(128) NOT NULL DEFAULT '洄归生态科技',
  `code` VARCHAR(128) NULL,
  `customerName` VARCHAR(255) NULL,
  `currentStage` VARCHAR(64) NULL,
  `paymentStatus` VARCHAR(64) NULL,
  `expectedReportAt` DATETIME(3) NULL,
  `recordJson` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `EcotechInspectionRecord_department_idx`(`department`),
  INDEX `EcotechInspectionRecord_code_idx`(`code`),
  INDEX `EcotechInspectionRecord_customerName_idx`(`customerName`),
  INDEX `EcotechInspectionRecord_currentStage_idx`(`currentStage`),
  INDEX `EcotechInspectionRecord_paymentStatus_idx`(`paymentStatus`),
  INDEX `EcotechInspectionRecord_expectedReportAt_idx`(`expectedReportAt`),
  INDEX `EcotechInspectionRecord_updatedAt_idx`(`updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `EcotechProductRecord` (`id`, `department`, `sku`, `name`, `brand`, `category`, `status`, `recordJson`, `createdAt`, `updatedAt`) VALUES
('p-seed-ga', '洄归生态科技', 'HG-GA-10', 'GA 土壤启动液', 'huigui', '配方产品', 'active', '{"id":"p-seed-ga","sku":"HG-GA-10","name":"GA 土壤启动液","brand":"huigui","category":"配方产品","spec":"10kg/桶","unit":"桶","unitPrice":2100,"status":"active","tags":["配方","土壤"],"description":"农业方案 GA 配方，翻土前喷施土壤。","referenceCount":0,"createdAt":"2026-06-12T00:00:00.000Z","createdBy":"系统种子","updatedAt":"2026-06-12T00:00:00.000Z"}', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('p-seed-gb', '洄归生态科技', 'HG-GB-10', 'GB 叶面管理液', 'huigui', '配方产品', 'active', '{"id":"p-seed-gb","sku":"HG-GB-10","name":"GB 叶面管理液","brand":"huigui","category":"配方产品","spec":"10kg/桶","unit":"桶","unitPrice":2100,"status":"active","tags":["配方","叶面"],"description":"农业方案 GB 配方，生长期关键节点管理。","referenceCount":0,"createdAt":"2026-06-12T00:00:00.000Z","createdBy":"系统种子","updatedAt":"2026-06-12T00:00:00.000Z"}', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('p-seed-gc', '洄归生态科技', 'HG-GC-10', 'GC 种子沁种液', 'huigui', '配方产品', 'active', '{"id":"p-seed-gc","sku":"HG-GC-10","name":"GC 种子沁种液","brand":"huigui","category":"配方产品","spec":"10kg/桶","unit":"桶","unitPrice":2100,"status":"active","tags":["配方","种子"],"description":"芽菜类专用，培育前种子沁种。","referenceCount":0,"createdAt":"2026-06-12T00:00:00.000Z","createdBy":"系统种子","updatedAt":"2026-06-12T00:00:00.000Z"}', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('p-seed-aqua', '洄归生态科技', 'HG-AQ-10', '海能量养殖元素', 'huigui', '养殖产品', 'active', '{"id":"p-seed-aqua","sku":"HG-AQ-10","name":"海能量养殖元素","brand":"huigui","category":"养殖产品","spec":"10kg/桶","unit":"桶","unitPrice":2100,"status":"active","tags":["养殖","鱼虾"],"description":"养殖专用配方，稳定水体、降低氨氮亚硝，提升鱼虾存活与活力。","referenceCount":0,"createdAt":"2026-06-12T00:00:00.000Z","createdBy":"系统种子","updatedAt":"2026-06-12T00:00:00.000Z"}', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('p-seed-detergent', '洄归生态科技', 'HR-CL-500', '洄家居清洁液', 'huiret', '清洁剂', 'active', '{"id":"p-seed-detergent","sku":"HR-CL-500","name":"洄家居清洁液","brand":"huiret","category":"清洁剂","spec":"500ml/瓶","unit":"瓶","unitPrice":38,"status":"active","tags":["清洁","企业赠品"],"description":"天然成分家居清洁液，常用于企业赠品。","referenceCount":0,"createdAt":"2026-06-12T00:00:00.000Z","createdBy":"系统种子","updatedAt":"2026-06-12T00:00:00.000Z"}', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('p-seed-tissue', '洄归生态科技', 'HR-TS-12', '洄抽取式卫生纸', 'huiret', '纸品', 'active', '{"id":"p-seed-tissue","sku":"HR-TS-12","name":"洄抽取式卫生纸","brand":"huiret","category":"纸品","spec":"120 抽 × 12 包","unit":"箱","unitPrice":156,"status":"active","tags":["纸品","批量"],"description":"可批量采购，适合企业日常与赠礼。","referenceCount":0,"createdAt":"2026-06-12T00:00:00.000Z","createdBy":"系统种子","updatedAt":"2026-06-12T00:00:00.000Z"}', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

INSERT INTO `EcotechFinanceAccountRecord` (`id`, `department`, `entity`, `accountName`, `bank`, `active`, `recordJson`, `createdAt`, `updatedAt`) VALUES
('fa-seed-1', '洄归生态科技', '北京洄归生态科技有限责任公司', '北京洄归生态科技有限责任公司', '招商银行股份有限公司北京城市副中心分行', true, '{"id":"fa-seed-1","entity":"北京洄归生态科技有限责任公司","accountName":"北京洄归生态科技有限责任公司","bank":"招商银行股份有限公司北京城市副中心分行","accountNo":"110967529010006","scope":"洄歸所有报价 / 订单；纳税人识别号：91110112MAG0X8ED3N；地址：北京市通州区观音庵南街4号院2号楼1至2层108；开户行联行号：308100005738","active":true,"createdAt":"2026-06-12T00:00:00.000Z"}', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
