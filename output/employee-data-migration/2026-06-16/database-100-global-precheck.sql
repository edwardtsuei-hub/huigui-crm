-- Database 100 readiness global precheck.
-- SELECT-only. Do not add INSERT / UPDATE / DELETE / DDL / COMMIT statements.

SELECT 'gate.rosterWeek.count' AS checkName, COUNT(*) AS actualValue, 6 AS expectedValue
FROM `RosterWeek`;

SELECT 'gate.rosterShift.count' AS checkName, COUNT(*) AS actualValue, 210 AS expectedValue
FROM `RosterShift`;

SELECT 'gate.rosterShift.orphan' AS checkName, COUNT(*) AS actualValue, 0 AS expectedValue
FROM `RosterShift` rs
LEFT JOIN `RosterWeek` rw ON rw.id = rs.rosterWeekId
WHERE rw.id IS NULL;

SELECT 'gate.weeklyReportPayload.total' AS checkName, COUNT(*) AS actualValue, 19 AS expectedValue
FROM `WeeklyReportPayload`;

SELECT CONCAT('gate.weeklyReportPayload.group.', source, '.', migrationStatus) AS checkName, COUNT(*) AS actualValue,
       CASE
         WHEN source = 'api_db_first_bridge' AND migrationStatus = 'IMPORTED' THEN 13
         WHEN source = 'legacy_weekly_workspace' AND migrationStatus = 'IMPORTED' THEN 3
         WHEN source = 'legacy_weekly_workspace' AND migrationStatus = 'NEEDS_REVIEW' THEN 3
         ELSE NULL
       END AS expectedValue
FROM `WeeklyReportPayload`
GROUP BY source, migrationStatus
ORDER BY source ASC, migrationStatus ASC;

SELECT 'gate.weeklyReportPayload.sharedSharedDraft' AS checkName, COUNT(*) AS actualValue, 13 AS expectedValue
FROM `WeeklyReportPayload`
WHERE source = 'api_db_first_bridge'
  AND migrationStatus = 'IMPORTED'
  AND sourceUserKey = 'shared'
  AND canonicalUserKey = 'shared'
  AND reportState = 'draft';

SELECT 'gate.weeklyReportPayload.sharedDistinctSha16' AS checkName, COUNT(DISTINCT sourceSha16) AS actualValue, 13 AS expectedValue
FROM `WeeklyReportPayload`
WHERE source = 'api_db_first_bridge'
  AND migrationStatus = 'IMPORTED'
  AND sourceUserKey = 'shared'
  AND canonicalUserKey = 'shared'
  AND reportState = 'draft';

SELECT 'gate.weeklyReport.reviewItem.orphan' AS checkName, COUNT(*) AS actualValue, 0 AS expectedValue
FROM `WeeklyReportReviewItem` item
LEFT JOIN `WeeklyReport` report ON report.id = item.reportId
WHERE report.id IS NULL;

SELECT 'gate.weeklyReport.planItem.orphan' AS checkName, COUNT(*) AS actualValue, 0 AS expectedValue
FROM `WeeklyReportPlanItem` item
LEFT JOIN `WeeklyReport` report ON report.id = item.reportId
WHERE report.id IS NULL;

SELECT 'weeklyCorrection.targetPayloadLinks' AS checkName, COUNT(p.id) AS actualValue, 0 AS expectedValue
FROM `WeeklyReport` wr
LEFT JOIN `WeeklyReportPayload` p ON p.weeklyReportId = wr.id
WHERE wr.id IN ('wr_b3f18d418c27145ced5e627c', 'wr_b361a1934ab724cd56c5da14', 'wr_6bf6e9ba0d49a18000a3fb7a');

SELECT 'weeklyCorrection.beforeSha.WeeklyReport.completedSummary.wr_b3f18d418c27145ced5e627c' AS checkName,
       SHA2(COALESCE(`completedSummary`, ''), 256) AS actualValue,
       'bbe18fd842f916c028d666489f428b3d83706a2fb334972a44ba398d58b8f4eb' AS expectedValue
FROM `WeeklyReport`
WHERE id = 'wr_b3f18d418c27145ced5e627c';

SELECT 'weeklyCorrection.beforeSha.WeeklyReport.focusSummary.wr_b3f18d418c27145ced5e627c' AS checkName,
       SHA2(COALESCE(`focusSummary`, ''), 256) AS actualValue,
       '4e347ce35fd68dfe2b4e6661ec9b0739e3d52d8c58d93df27735463712ea352e' AS expectedValue
FROM `WeeklyReport`
WHERE id = 'wr_b3f18d418c27145ced5e627c';

SELECT 'weeklyCorrection.beforeSha.WeeklyReportReviewItem.description.wri_7f9a9b2dbc48b1a374f8281c' AS checkName,
       SHA2(COALESCE(`description`, ''), 256) AS actualValue,
       'bbe18fd842f916c028d666489f428b3d83706a2fb334972a44ba398d58b8f4eb' AS expectedValue
FROM `WeeklyReportReviewItem`
WHERE id = 'wri_7f9a9b2dbc48b1a374f8281c';

SELECT 'weeklyCorrection.beforeSha.WeeklyReportPlanItem.description.wpi_4f5bf9170135688f49982adb' AS checkName,
       SHA2(COALESCE(`description`, ''), 256) AS actualValue,
       '56e41efb39d9402cc0f7082f6e33b87f4ced762a282e655482a1711a0e651753' AS expectedValue
FROM `WeeklyReportPlanItem`
WHERE id = 'wpi_4f5bf9170135688f49982adb';

SELECT 'weeklyCorrection.beforeSha.WeeklyReport.completedSummary.wr_b361a1934ab724cd56c5da14' AS checkName,
       SHA2(COALESCE(`completedSummary`, ''), 256) AS actualValue,
       '30f5319c8994c6d8498153ec8826e581eeb324ecf87d719c00a96e0cef49983b' AS expectedValue
FROM `WeeklyReport`
WHERE id = 'wr_b361a1934ab724cd56c5da14';

SELECT 'weeklyCorrection.beforeSha.WeeklyReport.focusSummary.wr_b361a1934ab724cd56c5da14' AS checkName,
       SHA2(COALESCE(`focusSummary`, ''), 256) AS actualValue,
       'e94c12f07884e9d3b65dfb73f0653ea1c4f5497d4699fdcbe9fb185ade95d9b4' AS expectedValue
FROM `WeeklyReport`
WHERE id = 'wr_b361a1934ab724cd56c5da14';

SELECT 'weeklyCorrection.beforeSha.WeeklyReportReviewItem.description.wri_5d12854bc0e9ce932fc43ddf' AS checkName,
       SHA2(COALESCE(`description`, ''), 256) AS actualValue,
       '30f5319c8994c6d8498153ec8826e581eeb324ecf87d719c00a96e0cef49983b' AS expectedValue
FROM `WeeklyReportReviewItem`
WHERE id = 'wri_5d12854bc0e9ce932fc43ddf';

SELECT 'weeklyCorrection.beforeSha.WeeklyReportPlanItem.description.wpi_aab34de461e592a3df8daf1c' AS checkName,
       SHA2(COALESCE(`description`, ''), 256) AS actualValue,
       '4d57c379f590c1a0938cb84a75eba827688061a8ad75d8bcc300ccfeb5b82cdc' AS expectedValue
FROM `WeeklyReportPlanItem`
WHERE id = 'wpi_aab34de461e592a3df8daf1c';

SELECT 'weeklyCorrection.beforeSha.WeeklyReport.completedSummary.wr_6bf6e9ba0d49a18000a3fb7a' AS checkName,
       SHA2(COALESCE(`completedSummary`, ''), 256) AS actualValue,
       'a89c4b0ce122c8a7961f66ace13ce5693e75cea5431d9c7d0152c0f6ecfc457b' AS expectedValue
FROM `WeeklyReport`
WHERE id = 'wr_6bf6e9ba0d49a18000a3fb7a';

SELECT 'weeklyCorrection.beforeSha.WeeklyReport.focusSummary.wr_6bf6e9ba0d49a18000a3fb7a' AS checkName,
       SHA2(COALESCE(`focusSummary`, ''), 256) AS actualValue,
       'db86fd344bfb99561594a5c686ddd9cbf71efa83a0e2eec9ad8651e92bf59202' AS expectedValue
FROM `WeeklyReport`
WHERE id = 'wr_6bf6e9ba0d49a18000a3fb7a';

SELECT 'weeklyCorrection.beforeSha.WeeklyReportReviewItem.description.wri_c0dc353f8490b81a8c2f2314' AS checkName,
       SHA2(COALESCE(`description`, ''), 256) AS actualValue,
       'a89c4b0ce122c8a7961f66ace13ce5693e75cea5431d9c7d0152c0f6ecfc457b' AS expectedValue
FROM `WeeklyReportReviewItem`
WHERE id = 'wri_c0dc353f8490b81a8c2f2314';

SELECT 'weeklyCorrection.beforeSha.WeeklyReportPlanItem.description.wpi_30251efba4234d81299d5bf2' AS checkName,
       SHA2(COALESCE(`description`, ''), 256) AS actualValue,
       '117b721758dcc41a3310f6ed42ffdb56f38b6eaf790a0a471fa7593d2c59daaa' AS expectedValue
FROM `WeeklyReportPlanItem`
WHERE id = 'wpi_30251efba4234d81299d5bf2';

SELECT 'archive.EmployeeLaunchEvidenceArchive.tableExists' AS checkName, COUNT(*) AS actualValue, 0 AS expectedValue
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name = 'EmployeeLaunchEvidenceArchive';

SELECT CONCAT('archive.FileRecord.column.', expected.column_name) AS checkName,
       COUNT(actual.column_name) AS actualValue,
       0 AS expectedValue
FROM (
  SELECT 'storageKey' AS column_name
  UNION ALL SELECT 'sourceFile'
  UNION ALL SELECT 'legacyAttachmentId'
) expected
LEFT JOIN information_schema.columns actual
  ON actual.table_schema = DATABASE()
 AND actual.table_name = 'FileRecord'
 AND actual.column_name = expected.column_name
GROUP BY expected.column_name
ORDER BY expected.column_name ASC;

SELECT 'archive.FileRecord.count' AS checkName, COUNT(*) AS actualValue, 0 AS expectedValue
FROM `FileRecord`;

SELECT 'archive.Notification.count' AS checkName, COUNT(*) AS actualValue, NULL AS expectedValue
FROM `Notification`;

SELECT 'archive.AuditLog.count' AS checkName, COUNT(*) AS actualValue, NULL AS expectedValue
FROM `AuditLog`;

SELECT CONCAT('payroll.SalarySlip.column.', expected.column_name) AS checkName,
       COUNT(actual.column_name) AS actualValue,
       NULL AS expectedValue
FROM (
  SELECT 'publishBatchId' AS column_name
  UNION ALL SELECT 'userId'
  UNION ALL SELECT 'wecomUserId'
  UNION ALL SELECT 'loginAccount'
) expected
LEFT JOIN information_schema.columns actual
  ON actual.table_schema = DATABASE()
 AND actual.table_name = 'SalarySlip'
 AND actual.column_name = expected.column_name
GROUP BY expected.column_name
ORDER BY expected.column_name ASC;

SELECT 'payroll.SalarySlip.count' AS checkName, COUNT(*) AS actualValue, NULL AS expectedValue
FROM `SalarySlip`;

SELECT 'payroll.SalaryNotifyLog.count' AS checkName, COUNT(*) AS actualValue, NULL AS expectedValue
FROM `SalaryNotifyLog`;

SELECT 'payroll.PayrollDraftBatch.count' AS checkName, COUNT(*) AS actualValue, NULL AS expectedValue
FROM `PayrollDraftBatch`;
