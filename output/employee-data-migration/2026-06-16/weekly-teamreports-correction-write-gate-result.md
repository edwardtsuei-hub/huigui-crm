# Weekly teamReports correction write gate result

Generated at: 2026-06-17T10:11:14.314Z
Status: `ready_for_explicit_rollback_rehearsal_authorization`
Next allowed action: `request_user_authorization_for_rollback_rehearsal`

## Decision

| Gate | Value |
| --- | --- |
| canRequestRollbackRehearsalAuthorization | `true` |
| rollbackRehearsalVerified | `false` |
| canRequestCommitAuthorization | `false` |
| commitAllowed | `false` |
| deploymentAllowed | `false` |
| reason | `Safe to ask user for the next explicit authorization; no database write is authorized by this artifact.` |

## Summary

| Metric | Value |
| --- | --- |
| checks | `7` |
| hardFailedChecks | `0` |
| commitBlocks | `1` |
| globalPrecheckStatus | `passed` |
| sqlGuardStatus | `passed` |
| authorizationStatus | `waiting_for_explicit_rollback_rehearsal_authorization` |
| rehearsalStatus | `passed` |
| realRehearsal | `false` |

## Failed Or Blocking Checks

| Check | Severity | Actual | Expected |
| --- | --- | --- | --- |
| `rehearsal.realProductionTranscript` | `soft_block_commit_only` | `{"transcript":"-","realRehearsal":false}` | `not provided before authorization, or real captured transcript path after authorization` |

## Safety

- Reads JSON artifacts only.
- Does not connect to the database.
- Does not execute SQL.
- Does not write database data.
- Does not authorize COMMIT.
- Keeps `deploymentAllowed=false`.

