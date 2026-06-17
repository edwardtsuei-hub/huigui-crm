# Database 100 global precheck verify result

Generated at: 2026-06-17T13:46:06.783Z
Status: `passed`
Input: `output/employee-data-migration/2026-06-16/database-100-global-precheck-before-rollback-rehearsal.tsv`

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
| `payroll.SalarySlip.column.loginAccount` | `0` |
| `payroll.SalarySlip.column.publishBatchId` | `0` |
| `payroll.SalarySlip.column.userId` | `0` |
| `payroll.SalarySlip.column.wecomUserId` | `0` |
| `payroll.SalarySlip.count` | `1` |
| `payroll.SalaryNotifyLog.count` | `1` |
| `payroll.PayrollDraftBatch.count` | `1` |
