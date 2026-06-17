-- Weekly teamReports formal sync v3 dry-run precheck only.
-- This file intentionally contains no INSERT, UPDATE, DELETE, COMMIT, ROLLBACK, or transaction.
-- Do not turn this into production SQL without D-line review and explicit user approval.

SELECT id, loginAccount, name, managerUserId, dataScope, status
FROM `User`
WHERE loginAccount IN ('Han', 'greatchef', 'lisali', 'ChengCheng')
ORDER BY loginAccount ASC;

SELECT wr.id, u.loginAccount, wr.weekStartDate, wr.weekEndDate, wr.partitionKey, wr.status, wr.updatedAt
FROM `WeeklyReport` wr
JOIN `User` u ON u.id = wr.userId
WHERE u.loginAccount IN ('Han', 'greatchef', 'lisali', 'ChengCheng')
  AND DATE(DATE_ADD(wr.weekStartDate, INTERVAL 8 HOUR)) IN ('2026-05-25', '2026-06-01', '2026-06-08')
  AND wr.partitionKey = 'REAL'
ORDER BY wr.weekStartDate ASC, u.loginAccount ASC;

SELECT source, migrationStatus, COUNT(*) AS count
FROM `WeeklyReportPayload`
GROUP BY source, migrationStatus
ORDER BY source ASC, migrationStatus ASC;

SELECT COUNT(*) AS sharedSharedDraftCount
FROM `WeeklyReportPayload`
WHERE source = 'api_db_first_bridge'
  AND migrationStatus = 'IMPORTED'
  AND JSON_UNQUOTE(JSON_EXTRACT(payload, '$.scope')) = 'shared/shared'
  AND JSON_UNQUOTE(JSON_EXTRACT(payload, '$.status')) = 'draft';

SELECT COUNT(DISTINCT sourceSha16) AS sharedSharedDraftDistinctSourceSha16
FROM `WeeklyReportPayload`
WHERE source = 'api_db_first_bridge'
  AND migrationStatus = 'IMPORTED'
  AND JSON_UNQUOTE(JSON_EXTRACT(payload, '$.scope')) = 'shared/shared'
  AND JSON_UNQUOTE(JSON_EXTRACT(payload, '$.status')) = 'draft';

SELECT 'Han -> lisali' AS proposedRelation, child.loginAccount AS memberLogin, child.managerUserId AS currentManagerUserId, manager.id AS proposedManagerUserId
FROM `User` child
JOIN `User` manager ON manager.loginAccount = 'lisali'
WHERE child.loginAccount = 'Han';

SELECT 'greatchef -> lisali' AS proposedRelation, child.loginAccount AS memberLogin, child.managerUserId AS currentManagerUserId, manager.id AS proposedManagerUserId
FROM `User` child
JOIN `User` manager ON manager.loginAccount = 'lisali'
WHERE child.loginAccount = 'greatchef';

-- Required stop points before any future write plan:
-- 1. This v3 output includes 6 dry-run candidates and defers 2 incomplete candidates.
-- 2. Manager relation changes are excluded from weekly teamReports v3.
-- 3. Any future write plan must be reviewed again and explicitly approved by the user.
