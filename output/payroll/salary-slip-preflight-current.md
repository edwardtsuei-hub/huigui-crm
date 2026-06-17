# Payroll salary slip preflight

Generated at: 2026-06-17T22:14:09.652Z
Status: `passed_with_blockers`
Writes database: no
Deploys: no

## Blockers

- `blocked_waiting_for_local_docker`

## Failures

- None

## Environment

- CodeGraph present: no
- Current release: `20260616090241`
- Protected release diff lines: 0
- Docker available: no
- MySQL client available: yes
- Release source-like files: 0
- Release route/token hits: 4
- Release sourcemap files: 0
- Release sourceMappingURL files: 0
- Maintainable frontend source candidates: 2

### Release Route Evidence

- `apps/web/public/employee-frontend/releases/20260616090241/assets/app-contexts-CUzvWnXS.js` (159758 bytes): `/finance/imports`
- `apps/web/public/employee-frontend/releases/20260616090241/assets/app-static-data-CPLFq21v.js` (54049 bytes): `/finance/imports`
- `apps/web/public/employee-frontend/releases/20260616090241/assets/index-C20sRqov.js` (2001764 bytes): `/payroll/batch`, `/finance/imports`
- `apps/web/public/employee-frontend/releases/20260616090241/assets/payroll-batch-page-CXA8ZBid.js` (99358 bytes): `/finance/imports`, `上传薪资表`

## Safety Checks

- Schema checks: pass
- Migration checks: pass
- Destructive migration tokens: none
- Forbidden service tokens: none
- Regression coverage checks: pass
