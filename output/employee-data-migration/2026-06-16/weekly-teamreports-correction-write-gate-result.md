# Weekly teamReports correction write gate result

Generated at: 2026-06-17T13:47:23.729Z
Status: `ready_for_commit_authorization_review`
Next allowed action: `request_second_explicit_commit_authorization_after_review`

## Decision

| Gate | Value |
| --- | --- |
| canRequestRollbackRehearsalAuthorization | `true` |
| rollbackRehearsalVerified | `true` |
| canRequestCommitAuthorization | `true` |
| commitAllowed | `false` |
| deploymentAllowed | `false` |
| reason | `Safe to ask user for the next explicit authorization; no database write is authorized by this artifact.` |

## Summary

| Metric | Value |
| --- | --- |
| checks | `9` |
| hardFailedChecks | `0` |
| commitBlocks | `0` |
| globalPrecheckStatus | `passed` |
| sqlGuardStatus | `passed` |
| authorizationStatus | `waiting_for_explicit_rollback_rehearsal_authorization` |
| rehearsalStatus | `passed` |
| realRehearsal | `true` |

## Safety

- Reads JSON artifacts only.
- Does not connect to the database.
- Does not execute SQL.
- Does not write database data.
- Does not authorize COMMIT.
- Keeps `deploymentAllowed=false`.

