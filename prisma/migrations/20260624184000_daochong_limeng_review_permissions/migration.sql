INSERT INTO `Permission` (`id`, `code`, `name`, `module`, `category`, `description`, `sortOrder`, `createdAt`) VALUES
  (
    'perm-daochong-recharge-review-read',
    'page.daochong.recharge_review',
    '道冲充值复核读取',
    'daochong',
    'PAGE',
    '允许财务读取道冲充值复核列表，不授予客户详情通用权限。',
    292,
    CURRENT_TIMESTAMP(3)
  ),
  (
    'perm-daochong-limeng-recharge-review',
    'action.daochong.recharge.limeng_review',
    '道冲立猛复核充值',
    'daochong',
    'ACTION',
    '允许立猛复核待复核充值并写入余额应用标记。',
    671,
    CURRENT_TIMESTAMP(3)
  ),
  (
    'perm-daochong-limeng-recharge-return',
    'action.daochong.recharge.limeng_return',
    '道冲立猛退回充值',
    'daochong',
    'ACTION',
    '允许立猛退回待复核充值，不应用余额。',
    672,
    CURRENT_TIMESTAMP(3)
  )
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `module` = VALUES(`module`),
  `category` = VALUES(`category`),
  `description` = VALUES(`description`),
  `sortOrder` = VALUES(`sortOrder`);

INSERT IGNORE INTO `RolePermission` (`id`, `roleId`, `permissionId`)
SELECT
  CONCAT(
    'rp-',
    LOWER(REPLACE(`Role`.`code`, '_', '-')),
    '-',
    REPLACE(REPLACE(`Permission`.`code`, '.', '-'), '_', '-')
  ) AS `id`,
  `Role`.`id` AS `roleId`,
  `Permission`.`id` AS `permissionId`
FROM `Role`
JOIN `Permission`
WHERE `Role`.`code` IN ('SUPER_ADMIN', 'FINANCE')
  AND `Permission`.`code` IN (
    'page.daochong.recharge_review',
    'action.daochong.recharge.limeng_review',
    'action.daochong.recharge.limeng_return'
  );
