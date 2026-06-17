# Database 100 global precheck verify result

Generated at: 2026-06-17T14:14:22.257Z
Status: `blocked`
Input: `output/employee-data-migration/2026-06-16/database-100-global-precheck-after-commit-old-baseline.tsv`

## Summary

| Metric | Count |
| --- | ---: |
| totalRows | 38 |
| hardGates | 29 |
| observations | 9 |
| mismatches | 10 |
| malformedRows | 0 |
| duplicateCheckNames | 0 |

## Mismatches

| Check | Actual | Expected |
| --- | --- | --- |
| `weeklyCorrection.beforeSha.WeeklyReport.completedSummary.wr_b3f18d418c27145ced5e627c` | `9855315c7448f0c200cd7b0d7ddbdcd394f69825290f23690b959527a41fadf1` | `bbe18fd842f916c028d666489f428b3d83706a2fb334972a44ba398d58b8f4eb` |
| `weeklyCorrection.beforeSha.WeeklyReport.focusSummary.wr_b3f18d418c27145ced5e627c` | `3758965d005dfb52be4a8baf7ed7bd9c9a632422cd0c6904e28e384e9f78ed4f` | `4e347ce35fd68dfe2b4e6661ec9b0739e3d52d8c58d93df27735463712ea352e` |
| `weeklyCorrection.beforeSha.WeeklyReportReviewItem.description.wri_7f9a9b2dbc48b1a374f8281c` | `480fadca9a11169fc70c56621931f834825f9870ad9a848688dedc1205a87b57` | `bbe18fd842f916c028d666489f428b3d83706a2fb334972a44ba398d58b8f4eb` |
| `weeklyCorrection.beforeSha.WeeklyReportPlanItem.description.wpi_4f5bf9170135688f49982adb` | `3758965d005dfb52be4a8baf7ed7bd9c9a632422cd0c6904e28e384e9f78ed4f` | `56e41efb39d9402cc0f7082f6e33b87f4ced762a282e655482a1711a0e651753` |
| `weeklyCorrection.beforeSha.WeeklyReport.completedSummary.wr_b361a1934ab724cd56c5da14` | `7a578b1b5427ab49956404be36665c477f4b90d4508c572cbd39aa7aa5ae2df1` | `30f5319c8994c6d8498153ec8826e581eeb324ecf87d719c00a96e0cef49983b` |
| `weeklyCorrection.beforeSha.WeeklyReport.focusSummary.wr_b361a1934ab724cd56c5da14` | `4d57c379f590c1a0938cb84a75eba827688061a8ad75d8bcc300ccfeb5b82cdc` | `e94c12f07884e9d3b65dfb73f0653ea1c4f5497d4699fdcbe9fb185ade95d9b4` |
| `weeklyCorrection.beforeSha.WeeklyReportReviewItem.description.wri_5d12854bc0e9ce932fc43ddf` | `ee332a2387a2106c9de5b4a931c3c1278d91bb873b28d07900610e4a8ae3654e` | `30f5319c8994c6d8498153ec8826e581eeb324ecf87d719c00a96e0cef49983b` |
| `weeklyCorrection.beforeSha.WeeklyReport.completedSummary.wr_6bf6e9ba0d49a18000a3fb7a` | `ce9ce54b54eb94efbaa9deaf0c920a9ff1315560d7f4998153678cb17bbfa622` | `a89c4b0ce122c8a7961f66ace13ce5693e75cea5431d9c7d0152c0f6ecfc457b` |
| `weeklyCorrection.beforeSha.WeeklyReport.focusSummary.wr_6bf6e9ba0d49a18000a3fb7a` | `117b721758dcc41a3310f6ed42ffdb56f38b6eaf790a0a471fa7593d2c59daaa` | `db86fd344bfb99561594a5c686ddd9cbf71efa83a0e2eec9ad8651e92bf59202` |
| `weeklyCorrection.beforeSha.WeeklyReportReviewItem.description.wri_c0dc353f8490b81a8c2f2314` | `0f7b5ccb00a3bc174c6cbc6fb1d6bd849e3414a64b0ac050299898c76388924c` | `a89c4b0ce122c8a7961f66ace13ce5693e75cea5431d9c7d0152c0f6ecfc457b` |

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
