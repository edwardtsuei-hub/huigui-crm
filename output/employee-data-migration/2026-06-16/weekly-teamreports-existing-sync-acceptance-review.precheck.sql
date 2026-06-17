-- Weekly teamReports existing sync acceptance review.
-- SELECT-only evidence. This file must not be used as a write script.

SELECT wr.id, u.loginAccount, wr.status, wr.dataScope, wr.partitionKey, wr.weekStartDate, wr.weekEndDate, wr.submittedAt,
       CHAR_LENGTH(COALESCE(wr.completedSummary, '')) AS completedLength,
       CHAR_LENGTH(COALESCE(wr.focusSummary, '')) AS focusLength,
       CHAR_LENGTH(COALESCE(wr.managerReviewComment, '')) AS managerCommentLength
FROM `WeeklyReport` wr
JOIN `User` u ON u.id = wr.userId
WHERE wr.id IN (
  'wr_b3f18d418c27145ced5e627c',
  'wr_f6d96e2ecf408970676e6808',
  'wr_3e8fad063c44a5bba1ee02f4',
  'wr_c681a1d1666dd11fde497046',
  'wr_b361a1934ab724cd56c5da14',
  'wr_6bf6e9ba0d49a18000a3fb7a'
)
ORDER BY wr.weekStartDate ASC, u.loginAccount ASC;

SELECT wr.id, u.loginAccount, COUNT(DISTINCT ri.id) AS reviewItems, COUNT(DISTINCT pi.id) AS planItems, COUNT(DISTINCT p.id) AS payloadLinks
FROM `WeeklyReport` wr
JOIN `User` u ON u.id = wr.userId
LEFT JOIN `WeeklyReportReviewItem` ri ON ri.reportId = wr.id
LEFT JOIN `WeeklyReportPlanItem` pi ON pi.reportId = wr.id
LEFT JOIN `WeeklyReportPayload` p ON p.weeklyReportId = wr.id
WHERE wr.id IN (
  'wr_b3f18d418c27145ced5e627c',
  'wr_f6d96e2ecf408970676e6808',
  'wr_3e8fad063c44a5bba1ee02f4',
  'wr_c681a1d1666dd11fde497046',
  'wr_b361a1934ab724cd56c5da14',
  'wr_6bf6e9ba0d49a18000a3fb7a'
)
GROUP BY wr.id, u.loginAccount
ORDER BY wr.weekStartDate ASC, u.loginAccount ASC;

SELECT loginAccount, id, managerUserId
FROM `User`
WHERE loginAccount IN ('Han', 'greatchef', 'lisali', 'ChengCheng')
ORDER BY loginAccount ASC;
