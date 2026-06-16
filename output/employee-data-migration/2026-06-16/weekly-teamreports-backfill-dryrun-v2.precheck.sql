-- Weekly teamReports safe dry-run precheck only.
-- This file intentionally contains no INSERT, UPDATE, DELETE, COMMIT, or transaction.
-- Do not turn this into production SQL without A/D review and user approval.

SELECT id, loginAccount, name, managerUserId, dataScope, status
FROM `User`
WHERE loginAccount IN ('Han', 'greatchef', 'lisali', 'ChengCheng');

SELECT wr.id, u.loginAccount, wr.weekStartDate, wr.partitionKey, wr.status, wr.updatedAt
FROM `WeeklyReport` wr
JOIN `User` u ON u.id = wr.userId
WHERE u.loginAccount IN ('Han', 'greatchef', 'lisali', 'ChengCheng')
  AND DATE(wr.weekStartDate) IN ('2026-05-25', '2026-06-01', '2026-06-08')
  AND wr.partitionKey = 'REAL'
ORDER BY wr.weekStartDate ASC, u.loginAccount ASC;

-- Required stop points before any future write plan:
-- 1. Existing WeeklyReport rows must use their real id for child rows.
-- 2. User.managerUserId changes must be approved separately.
-- 3. Child table replacement must not delete user-edited content without backup.
