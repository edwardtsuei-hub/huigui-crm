# Weekly teamReports correction SQL guard result

Generated at: 2026-06-17T09:56:23.334Z
Status: `passed`

## Safety

- Static local file analysis only.
- Does not connect to the database.
- Does not execute SQL.
- Does not write database data.

## Summary

| Metric | Value |
| --- | --- |
| draftsChecked | `2` |
| failedChecks | `0` |
| applyStatus | `passed` |
| rollbackStatus | `passed` |

## apply draft

SQL: `output/employee-data-migration/2026-06-16/weekly-teamreports-correction-apply-draft.sql`
Status: `passed`

| Check | Actual | Expected | Status |
| --- | --- | --- | --- |
| `final_statement_is_rollback` | `ROLLBACK` | `ROLLBACK` | `passed` |
| `single_transaction_start` | `1` | `1` | `passed` |
| `single_rollback_statement` | `1` | `1` | `passed` |
| `no_commit_statement` | `0` | `0` | `passed` |
| `only_expected_update_count` | `10` | `10` | `passed` |
| `only_allowed_update_tables` | `none` | `WeeklyReport,WeeklyReportPlanItem,WeeklyReportReviewItem` | `passed` |
| `no_forbidden_executable_statements` | `none` | `none` | `passed` |
| `row_count_select_for_each_update` | `10` | `10` | `passed` |
| `precheck_select_for_each_update` | `10` | `10` | `passed` |
| `postcheck_select_for_each_update` | `10` | `10` | `passed` |
| `payload_link_guard_for_each_update` | `10` | `10` | `passed` |
| `sha_guard_and_prepost_count` | `30` | `30` | `passed` |
| `child_report_id_guard_count` | `4` | `4` | `passed` |
| `all_operation_guards_complete` | `all_complete` | `all_complete` | `passed` |

## rollback draft

SQL: `output/employee-data-migration/2026-06-16/weekly-teamreports-correction-rollback-draft.sql`
Status: `passed`

| Check | Actual | Expected | Status |
| --- | --- | --- | --- |
| `final_statement_is_rollback` | `ROLLBACK` | `ROLLBACK` | `passed` |
| `single_transaction_start` | `1` | `1` | `passed` |
| `single_rollback_statement` | `1` | `1` | `passed` |
| `no_commit_statement` | `0` | `0` | `passed` |
| `only_expected_update_count` | `10` | `10` | `passed` |
| `only_allowed_update_tables` | `none` | `WeeklyReport,WeeklyReportPlanItem,WeeklyReportReviewItem` | `passed` |
| `no_forbidden_executable_statements` | `none` | `none` | `passed` |
| `row_count_select_for_each_update` | `10` | `10` | `passed` |
| `precheck_select_for_each_update` | `10` | `10` | `passed` |
| `postcheck_select_for_each_update` | `10` | `10` | `passed` |
| `payload_link_guard_for_each_update` | `10` | `10` | `passed` |
| `sha_guard_and_prepost_count` | `30` | `30` | `passed` |
| `child_report_id_guard_count` | `4` | `4` | `passed` |
| `all_operation_guards_complete` | `all_complete` | `all_complete` | `passed` |

