# Employee frontend payroll local UAT

Generated at: 2026-06-18T02:12:58.466Z

## Scope

This UAT validates the employee frontend payroll candidate flow after PR #38 was merged.

It used:

- Employee frontend dev server on `127.0.0.1:5173`
- Local in-memory API stub on `127.0.0.1:4000`
- Real frontend payroll parsing and gate functions from `apps/employee-frontend/src/lib/payroll.ts`
- Local API save / sync / notify / readback simulation

This did not touch production data.

## Safety

- Production database touched: no
- Deployment executed: no
- Service restarted: no
- Employee frontend release switched: no
- Real WeCom message sent: no
- Production SQL generated: no

## Browser automation note

Full browser automation was attempted, but the local Chrome / Playwright browser layer was not stable in this environment:

- System Chrome did not expose the remote debugging endpoint reliably.
- Playwright browser download was blocked by the local proxy.

Fallback used a function-level UAT plus a local API chain verification. This still exercised the real payroll frontend parser, validation gates, notification list derivation, and API payload/readback sequence, but it should not be treated as a final human browser acceptance pass.

## Result

Status: `passed`

Report files:

- `output/employee-frontend/payroll-uat-20260618-pr38/payroll-frontend-logic-uat-report.json`
- `output/employee-frontend/payroll-uat-20260618-pr38/payroll-frontend-logic-uat-report.md`

## Checks

| Check | Result |
| --- | --- |
| Upload URL routes to finance imports with payroll return path | passed |
| Unresolved CSV parses | passed |
| Unresolved CSV is blocked by `blocked_unresolved_differences` | passed |
| Unresolved draft is not publish-ready | passed |
| Unresolved draft can be saved to local API stub for review | passed |
| Resolved CSV parses all rows | passed |
| Resolved CSV validation status is `ready` | passed |
| Resolved draft ready helper returns true | passed |
| Notify list has one deliverable WeCom user | passed |
| Notify list skips partner and missing-WeCom rows | passed |
| Readback is empty before publish | passed |
| Local API sync creates three salary slip rows | passed |
| Local API notify log accepts the same publish batch id | passed |
| Post-publish salary slip readback has three rows | passed |
| Post-publish notify log readback has one row | passed |
| No real WeCom send-test path was called | passed |

## Local UAT data

Resolved publish batch id:

- `salary-publish-2026-07-20260618021258`

Resolved CSV covered:

- One deliverable formal employee with WeCom userid.
- One partner teacher skipped from WeCom notification.
- One formal employee without WeCom userid skipped with reason `缺少企业微信账号`.

Unresolved CSV covered:

- One row with `差异状态=unresolved`, blocked before publish.

## Decision

This local fallback UAT supports keeping PR #38 merged and supports the frontend candidate moving to a final browser acceptance pass.

`deploymentAllowed=false` remains in force.

Reason:

- Core backend and WeCom regression tests passed.
- Production database readonly gates passed after PR #38.
- Frontend payroll parsing and publish gate logic passed against a local API chain.
- Final click-level browser UAT against a stable API is still not completed.

## Next actions

1. Run final human/browser UAT with a stable non-production API or an explicitly approved gray environment.
2. Confirm upload parsing from the actual browser file picker.
3. Confirm the publish button is disabled until both review checkboxes are selected.
4. Confirm post-publish UI readback displays salary slip and notify log counts by `publishBatchId`.
5. Confirm employee self salary isolation in the real API session.
6. Keep live WeCom sending outside the explicit test-send path gated by a separate approval.
