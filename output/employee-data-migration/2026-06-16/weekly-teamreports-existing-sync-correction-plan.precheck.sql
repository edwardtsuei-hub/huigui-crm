-- Weekly teamReports existing sync correction plan precheck.
-- SELECT-only. This file is not an UPDATE script.

SELECT wr.id, u.loginAccount, wr.status, wr.dataScope, wr.partitionKey,
       CHAR_LENGTH(COALESCE(wr.completedSummary, '')) AS completedLength,
       CHAR_LENGTH(COALESCE(wr.focusSummary, '')) AS focusLength,
       CHAR_LENGTH(COALESCE(wr.managerReviewComment, '')) AS managerCommentLength
FROM `WeeklyReport` wr
JOIN `User` u ON u.id = wr.userId
WHERE wr.id IN (
  'wr_b3f18d418c27145ced5e627c',
  'wr_b361a1934ab724cd56c5da14',
  'wr_6bf6e9ba0d49a18000a3fb7a'
)
ORDER BY wr.weekStartDate ASC, u.loginAccount ASC;

SELECT 'WeeklyReportReviewItem' AS tableName, id, reportId, title, sortOrder, CHAR_LENGTH(COALESCE(description, '')) AS descriptionLength
FROM `WeeklyReportReviewItem`
WHERE id IN (
  'wri_7f9a9b2dbc48b1a374f8281c',
  'wri_5d12854bc0e9ce932fc43ddf',
  'wri_c0dc353f8490b81a8c2f2314'
)
UNION ALL
SELECT 'WeeklyReportPlanItem' AS tableName, id, reportId, title, sortOrder, CHAR_LENGTH(COALESCE(description, '')) AS descriptionLength
FROM `WeeklyReportPlanItem`
WHERE id IN (
  'wpi_4f5bf9170135688f49982adb',
  'wpi_aab34de461e592a3df8daf1c',
  'wpi_30251efba4234d81299d5bf2'
)
ORDER BY reportId ASC, tableName ASC, sortOrder ASC;

SELECT wr.id, COUNT(p.id) AS payloadLinks
FROM `WeeklyReport` wr
LEFT JOIN `WeeklyReportPayload` p ON p.weeklyReportId = wr.id
WHERE wr.id IN (
  'wr_b3f18d418c27145ced5e627c',
  'wr_b361a1934ab724cd56c5da14',
  'wr_6bf6e9ba0d49a18000a3fb7a'
)
GROUP BY wr.id
ORDER BY wr.id ASC;

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
