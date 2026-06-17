# Payroll salary slip migration readiness gate

Generated at: 2026-06-17T15:13:59.385Z
Status: `blocked`
Next allowed action: `fix_failed_gate`

## Decision

| Gate | Value |
| --- | --- |
| canRequestTestDbMigrationAuthorization | `false` |
| canRequestProductionMigrationAuthorization | `false` |
| productionMigrationAllowed | `false` |
| reason | One or more hard readiness checks failed. |

## Summary

| Metric | Value |
| --- | --- |
| hardFailures | `1` |
| softBlockers | `2` |
| preflightStatus | `passed_with_blockers` |
| globalPrecheckStatus | `passed` |
| globalPrecheckMismatches | `0` |
| migrationStaticPassed | `true` |
| productionPrecheckMismatches | `13` |
| productionMigrationApplied | `true` |

## Hard Failures

- `production_pre_migration_state_not_clean`

## Soft Blockers

- `frontend_vite_source_missing_blocks_full_ui_release_not_test_db_migration`
- `local_docker_missing_blocks_local_db_rehearsal`

## Migration Static Guard

- Passed: `true`
- Statements: 9
- ALTER TABLE statements: 3
- CREATE INDEX statements: 6
- Missing snippets: none
- Forbidden keywords: none

## Production Pre-Migration Snapshot

- Migration applied: `true`
- Hard mismatches: 13
- Required columns still absent: 0
- Required indexes still absent: 0
- table.SalarySlip.count: 1
- table.SalaryNotifyLog.count: 1
- table.PayrollDraftBatch.count: 1

## Required Before Production

- Run the migration in a test or staging database first.
- Run salary-slip-db-verify against that migrated test database.
- Run payroll UAT API execute mode only against an explicitly confirmed test database.
- Generate and review payroll audit package from API readback evidence.
- Take a production database backup.
- Get a separate explicit production migration authorization.
- Run production migration in a controlled window, then run salary-slip-db-verify and database-100 global precheck.

## Safety

- This gate does not connect to the database.
- This gate does not execute migration SQL.
- This gate does not deploy or restart services.
- Production migration remains forbidden until a separate explicit production authorization.
