# Weekly teamReports correction rehearsal verify result

Generated at: 2026-06-17T10:05:34.333Z
Status: `passed`

## Safety

- Parses captured output only.
- Does not connect to the database.
- Does not execute SQL.
- Does not write database data.

## Summary

| Metric | Value |
| --- | ---: |
| transcriptRows | 46 |
| expectedOperations | 10 |
| operationChecks | 30 |
| payloadLinkChecks | 3 |
| payloadGroupChecks | 3 |
| sharedScalarChecks | 1 |
| afterRollbackPrecheckProvided | true |
| afterRollbackPrecheckHardGates | 29 |
| failedChecks | 0 |

## Required Pass Criteria

- 10 apply precheck rows match before SHA.
- 10 affectedRows rows equal 1.
- 10 apply postcheck rows match after SHA.
- Target WeeklyReportPayload direct links remain 0 before and after draft updates.
- WeeklyReportPayload group counts remain 13 / 3 / 3.
- shared/shared draft and distinct sourceSha16 scalar gates remain 13.
- After rollback, every hard gate in database-100 global precheck still matches expected.

