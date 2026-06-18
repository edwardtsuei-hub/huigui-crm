# Payroll WeCom test send post-merge readonly check

Generated at: 2026-06-18T01:58:24.919Z

## Scope

PR #38 has been merged into `main`.

- Merge commit: `9d941e7`
- Feature commit: `ebb20a7 Add payroll WeCom test send flow`
- Current branch: `main`
- Current employee frontend release: `20260616090241`
- Candidate employee frontend package remains undeployed.

This check is readonly. It did not deploy, restart services, switch frontend releases, write database rows, send real WeCom messages, create rollback tags, or execute rollback.

## Local regression tests

| Test | Result |
| --- | --- |
| `npm run test:payroll` | passed, 50 tests |
| `npm run test:wecom` | passed, 9 tests |

Coverage confirmed:

- Salary WeCom test send only targets the explicit allowlist.
- Test send records a `SalaryNotifyLog`.
- Already-sent recipients in the same publish batch are skipped to avoid duplicates.
- Shared WeCom message and calendar regressions still pass.

## Production health

| Check | Result |
| --- | --- |
| `https://management.hui-health.com/api/health` | HTTP 200 |
| API status | `ok` |
| Service | `huigui-api` |

## Database 100 global precheck

Input:

- `output/employee-data-migration/2026-06-16/database-100-global-precheck-after-pr38.tsv`
- `output/employee-data-migration/2026-06-16/database-100-global-precheck-after-pr38-verify.json`
- `output/employee-data-migration/2026-06-16/database-100-global-precheck-after-pr38-verify.md`

Result:

| Metric | Count |
| --- | ---: |
| totalRows | 38 |
| hardGates | 29 |
| observations | 9 |
| mismatches | 0 |
| malformedRows | 0 |
| duplicateCheckNames | 0 |

Key gate baseline remains stable:

- `RosterWeek=6`
- `RosterShift=210`
- orphan `RosterShift=0`
- `WeeklyReportPayload total=19`
- `api_db_first_bridge / IMPORTED = 13`
- `legacy_weekly_workspace / IMPORTED = 3`
- `legacy_weekly_workspace / NEEDS_REVIEW = 3`
- shared/shared/draft remains `13`
- distinct `sourceSha16` remains `13`

## Payroll DB verification

Input:

- `output/payroll/payroll-db-verify-after-pr38.combined.txt`
- `output/payroll/payroll-db-verify-after-pr38.json`
- `output/payroll/payroll-db-verify-after-pr38.md`

Result:

| Check | Result |
| --- | --- |
| status | `passed` |
| blockers | 0 |
| failures | 0 |
| warnings | 0 |
| migration applied | yes |
| missing columns | none |
| missing indexes | none |
| `SalarySlip` count | 1 |
| `SalaryNotifyLog` count | 1 |
| `PayrollDraftBatch` count | 1 |
| incomplete salary identities | 0 |
| missing publish batch ids | 0 |
| duplicate teacher names | 0 |

Recent notify log remains:

- month: `2026-05`
- publish batch: `salary-publish-2026-05-codex-single-trial`
- status: `sent`

## Decision

Status: `ready_for_release_decision_with_gate`

`deploymentAllowed=false` remains in force.

Reason:

- Backend code and tests are green.
- Production database gates are stable.
- Payroll database verification is clean.
- Employee frontend payroll candidate is still not deployed.
- Browser upload and publish end-to-end validation against a stable API is not yet complete.

## Next actions

1. Keep PR #38 merged on `main`; no rollback is indicated by this readonly check.
2. Run the employee frontend payroll candidate against a stable API session.
3. Validate browser upload parsing, unresolved-difference blocking, publish confirmation gates, post-publish readback by `publishBatchId`, employee self salary isolation, and WeCom dry-run/test-send behavior.
4. Only after browser UAT passes should the user decide whether to switch the employee frontend release.
5. Do not enable live salary WeCom sending beyond the explicit test-send path without a separate approval.
