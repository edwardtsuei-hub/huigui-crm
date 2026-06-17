-- Weekly teamReports correction fingerprint package precheck.
-- SELECT-only. This file is not an UPDATE script.

SELECT 'WeeklyReport.completedSummary' AS target, id, SHA2(COALESCE(completedSummary, ''), 256) AS currentSha256,
       CASE id
         WHEN 'wr_b3f18d418c27145ced5e627c' THEN 'bbe18fd842f916c028d666489f428b3d83706a2fb334972a44ba398d58b8f4eb'
         WHEN 'wr_b361a1934ab724cd56c5da14' THEN '30f5319c8994c6d8498153ec8826e581eeb324ecf87d719c00a96e0cef49983b'
         WHEN 'wr_6bf6e9ba0d49a18000a3fb7a' THEN 'a89c4b0ce122c8a7961f66ace13ce5693e75cea5431d9c7d0152c0f6ecfc457b'
       END AS expectedBeforeSha256
FROM `WeeklyReport`
WHERE id IN ('wr_b3f18d418c27145ced5e627c','wr_b361a1934ab724cd56c5da14','wr_6bf6e9ba0d49a18000a3fb7a')
UNION ALL
SELECT 'WeeklyReport.focusSummary' AS target, id, SHA2(COALESCE(focusSummary, ''), 256) AS currentSha256,
       CASE id
         WHEN 'wr_b3f18d418c27145ced5e627c' THEN '4e347ce35fd68dfe2b4e6661ec9b0739e3d52d8c58d93df27735463712ea352e'
         WHEN 'wr_b361a1934ab724cd56c5da14' THEN 'e94c12f07884e9d3b65dfb73f0653ea1c4f5497d4699fdcbe9fb185ade95d9b4'
         WHEN 'wr_6bf6e9ba0d49a18000a3fb7a' THEN 'db86fd344bfb99561594a5c686ddd9cbf71efa83a0e2eec9ad8651e92bf59202'
       END AS expectedBeforeSha256
FROM `WeeklyReport`
WHERE id IN ('wr_b3f18d418c27145ced5e627c','wr_b361a1934ab724cd56c5da14','wr_6bf6e9ba0d49a18000a3fb7a')
UNION ALL
SELECT 'WeeklyReportReviewItem.description' AS target, id, SHA2(COALESCE(description, ''), 256) AS currentSha256,
       CASE id
         WHEN 'wri_7f9a9b2dbc48b1a374f8281c' THEN 'bbe18fd842f916c028d666489f428b3d83706a2fb334972a44ba398d58b8f4eb'
         WHEN 'wri_5d12854bc0e9ce932fc43ddf' THEN '30f5319c8994c6d8498153ec8826e581eeb324ecf87d719c00a96e0cef49983b'
         WHEN 'wri_c0dc353f8490b81a8c2f2314' THEN 'a89c4b0ce122c8a7961f66ace13ce5693e75cea5431d9c7d0152c0f6ecfc457b'
       END AS expectedBeforeSha256
FROM `WeeklyReportReviewItem`
WHERE id IN ('wri_7f9a9b2dbc48b1a374f8281c','wri_5d12854bc0e9ce932fc43ddf','wri_c0dc353f8490b81a8c2f2314')
UNION ALL
SELECT 'WeeklyReportPlanItem.description' AS target, id, SHA2(COALESCE(description, ''), 256) AS currentSha256,
       CASE id
         WHEN 'wpi_4f5bf9170135688f49982adb' THEN '56e41efb39d9402cc0f7082f6e33b87f4ced762a282e655482a1711a0e651753'
         WHEN 'wpi_aab34de461e592a3df8daf1c' THEN '4d57c379f590c1a0938cb84a75eba827688061a8ad75d8bcc300ccfeb5b82cdc'
         WHEN 'wpi_30251efba4234d81299d5bf2' THEN '117b721758dcc41a3310f6ed42ffdb56f38b6eaf790a0a471fa7593d2c59daaa'
       END AS expectedBeforeSha256
FROM `WeeklyReportPlanItem`
WHERE id IN ('wpi_4f5bf9170135688f49982adb','wpi_aab34de461e592a3df8daf1c','wpi_30251efba4234d81299d5bf2');

SELECT wr.id, COUNT(p.id) AS payloadLinks
FROM `WeeklyReport` wr
LEFT JOIN `WeeklyReportPayload` p ON p.weeklyReportId = wr.id
WHERE wr.id IN ('wr_b3f18d418c27145ced5e627c','wr_b361a1934ab724cd56c5da14','wr_6bf6e9ba0d49a18000a3fb7a')
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
