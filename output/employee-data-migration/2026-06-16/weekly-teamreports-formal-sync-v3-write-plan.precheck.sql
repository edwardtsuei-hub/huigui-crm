-- Weekly teamReports formal sync v3 write-plan precheck.
-- SELECT-only evidence for D-line review.
-- This file is not an execution script.

SELECT id, loginAccount, name, status, dataScope, managerUserId
FROM `User`
WHERE loginAccount IN ('Han', 'greatchef', 'lisali', 'ChengCheng')
ORDER BY loginAccount ASC;

SELECT id, userId, weekStartDate, weekEndDate, status, dataScope, partitionKey, updatedAt
FROM `WeeklyReport`
WHERE id IN (
  'wr_b3f18d418c27145ced5e627c',
  'wr_f6d96e2ecf408970676e6808',
  'wr_3e8fad063c44a5bba1ee02f4',
  'wr_c681a1d1666dd11fde497046',
  'wr_b361a1934ab724cd56c5da14',
  'wr_6bf6e9ba0d49a18000a3fb7a'
)
ORDER BY id ASC;

SELECT wr.id, u.loginAccount, wr.userId, wr.weekStartDate, wr.weekEndDate, wr.status, wr.dataScope, wr.partitionKey
FROM `WeeklyReport` wr
JOIN `User` u ON u.id = wr.userId
WHERE wr.partitionKey = 'REAL'
  AND (
    (u.loginAccount = 'Han' AND wr.weekStartDate = '2026-05-24 16:00:00.000')
    OR (u.loginAccount = 'greatchef' AND wr.weekStartDate = '2026-05-24 16:00:00.000')
    OR (u.loginAccount = 'lisali' AND wr.weekStartDate = '2026-05-24 16:00:00.000')
    OR (u.loginAccount = 'lisali' AND wr.weekStartDate = '2026-05-31 16:00:00.000')
    OR (u.loginAccount = 'ChengCheng' AND wr.weekStartDate = '2026-06-07 16:00:00.000')
    OR (u.loginAccount = 'lisali' AND wr.weekStartDate = '2026-06-07 16:00:00.000')
  )
ORDER BY wr.weekStartDate ASC, u.loginAccount ASC;

SELECT 'WeeklyReportReviewItem' AS tableName, COUNT(*) AS rowCount
FROM `WeeklyReportReviewItem`
WHERE reportId IN (
  'wr_b3f18d418c27145ced5e627c',
  'wr_f6d96e2ecf408970676e6808',
  'wr_3e8fad063c44a5bba1ee02f4',
  'wr_c681a1d1666dd11fde497046',
  'wr_b361a1934ab724cd56c5da14',
  'wr_6bf6e9ba0d49a18000a3fb7a'
)
UNION ALL
SELECT 'WeeklyReportPlanItem' AS tableName, COUNT(*) AS rowCount
FROM `WeeklyReportPlanItem`
WHERE reportId IN (
  'wr_b3f18d418c27145ced5e627c',
  'wr_f6d96e2ecf408970676e6808',
  'wr_3e8fad063c44a5bba1ee02f4',
  'wr_c681a1d1666dd11fde497046',
  'wr_b361a1934ab724cd56c5da14',
  'wr_6bf6e9ba0d49a18000a3fb7a'
);

SELECT source, migrationStatus, COUNT(*) AS rowCount
FROM `WeeklyReportPayload`
GROUP BY source, migrationStatus
ORDER BY source ASC, migrationStatus ASC;

SELECT COUNT(*) AS sharedSharedDraftCount
FROM `WeeklyReportPayload`
WHERE source = 'api_db_first_bridge'
  AND migrationStatus = 'IMPORTED'
  AND sourceUserKey = 'shared'
  AND canonicalUserKey = 'shared'
  AND reportState = 'draft';

SELECT COUNT(DISTINCT sourceSha16) AS sharedSharedDraftDistinctSourceSha16
FROM `WeeklyReportPayload`
WHERE source = 'api_db_first_bridge'
  AND migrationStatus = 'IMPORTED'
  AND sourceUserKey = 'shared'
  AND canonicalUserKey = 'shared'
  AND reportState = 'draft';
