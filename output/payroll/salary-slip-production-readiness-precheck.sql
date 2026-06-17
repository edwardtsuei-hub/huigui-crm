-- Payroll salary slip production readiness precheck.
-- SELECT-only. This verifies the production database is still before the
-- payroll publish-batch identity migration.

SELECT 'migration.applied' AS checkName, COUNT(*) AS actualValue, 0 AS expectedValue
FROM _prisma_migrations
WHERE migration_name = '20260617110000_payroll_publish_batch_identity'
  AND rolled_back_at IS NULL;

SELECT CONCAT('column.', expected.table_name, '.', expected.column_name) AS checkName,
       COUNT(actual.column_name) AS actualValue,
       0 AS expectedValue
FROM (
  SELECT 'SalarySlip' AS table_name, 'publishBatchId' AS column_name
  UNION ALL SELECT 'SalarySlip', 'userId'
  UNION ALL SELECT 'SalarySlip', 'wecomUserId'
  UNION ALL SELECT 'SalarySlip', 'loginAccount'
  UNION ALL SELECT 'SalaryNotifyLog', 'publishBatchId'
  UNION ALL SELECT 'PayrollDraftBatch', 'publishBatchId'
) expected
LEFT JOIN information_schema.columns actual
  ON actual.table_schema = DATABASE()
 AND actual.table_name = expected.table_name
 AND actual.column_name = expected.column_name
GROUP BY expected.table_name, expected.column_name
ORDER BY expected.table_name, expected.column_name;

SELECT CONCAT('index.', expected.index_name) AS checkName,
       COUNT(actual.index_name) AS actualValue,
       0 AS expectedValue
FROM (
  SELECT 'SalarySlip_publishBatchId_idx' AS index_name
  UNION ALL SELECT 'SalarySlip_userId_idx'
  UNION ALL SELECT 'SalarySlip_wecomUserId_idx'
  UNION ALL SELECT 'SalarySlip_loginAccount_idx'
  UNION ALL SELECT 'SalaryNotifyLog_publishBatchId_idx'
  UNION ALL SELECT 'PayrollDraftBatch_publishBatchId_idx'
) expected
LEFT JOIN information_schema.statistics actual
  ON actual.table_schema = DATABASE()
 AND actual.index_name = expected.index_name
GROUP BY expected.index_name
ORDER BY expected.index_name;

SELECT 'table.SalarySlip.count' AS checkName, COUNT(*) AS actualValue, NULL AS expectedValue FROM SalarySlip;
SELECT 'table.SalaryNotifyLog.count' AS checkName, COUNT(*) AS actualValue, NULL AS expectedValue FROM SalaryNotifyLog;
SELECT 'table.PayrollDraftBatch.count' AS checkName, COUNT(*) AS actualValue, NULL AS expectedValue FROM PayrollDraftBatch;
