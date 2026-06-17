# Database 100 global precheck verify result

Generated at: 2026-06-17T15:18:22.134Z
Status: `passed`
Input: `output/payroll/production-schema-migration-20260617-231344/database-100-global-precheck-post.tsv`

## Summary

| Metric | Count |
| --- | ---: |
| totalRows | 38 |
| hardGates | 29 |
| observations | 9 |
| mismatches | 0 |
| malformedRows | 0 |
| duplicateCheckNames | 0 |

## Observations

| Check | Actual |
| --- | --- |
| `archive.Notification.count` | `214` |
| `archive.AuditLog.count` | `27` |
| `payroll.SalarySlip.column.loginAccount` | `1` |
| `payroll.SalarySlip.column.publishBatchId` | `1` |
| `payroll.SalarySlip.column.userId` | `1` |
| `payroll.SalarySlip.column.wecomUserId` | `1` |
| `payroll.SalarySlip.count` | `1` |
| `payroll.SalaryNotifyLog.count` | `1` |
| `payroll.PayrollDraftBatch.count` | `1` |
