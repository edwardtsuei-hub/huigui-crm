# 薪资条真实迁移与身份回填运行手册（2026-06-17）

## 适用范围

本手册用于把本次薪资条后端改动从本地代码推进到测试库 / 生产库。

当前状态：

- 后端代码、schema、migration、mock 回归、UAT payload/API 工具和审计留档工具已完成。
- 未写生产数据库。
- 未部署。
- 未执行真实 migration。
- 员工端 Vite 源码仍未恢复，前端 UI 修复仍阻塞。

## 安全边界

- 生产执行前必须先做数据库备份。
- 生产执行前必须先在测试库或 staging 库跑完整流程。
- 禁止使用 `prisma db push`。
- 禁止直接执行未审查的回填 SQL。
- `salary-identity-backfill-dryrun.mjs` 不连接数据库，也不写数据库。
- dry-run 生成的 SQL 默认以 `ROLLBACK` 结尾，不能直接当生产执行结果。

## 代码侧验证

在迁移前先确认本地代码仍通过：

```bash
npm run db:generate
npm run test:payroll
npm run preflight:payroll
npm run lint -w @huigui/api
npm run build
```

当前已验证：

- `npm run db:generate` 通过。
- `npm run preflight:payroll` 通过，当前状态为 `passed_with_blockers`。
- `npm run test:payroll` 通过：33/33。
- `npm run lint -w @huigui/api` 通过。
- `npm run build` 通过。

## 结构迁移

迁移文件：

```text
prisma/migrations/20260617110000_payroll_publish_batch_identity/migration.sql
```

新增字段：

- `SalarySlip.publishBatchId`
- `SalarySlip.userId`
- `SalarySlip.wecomUserId`
- `SalarySlip.loginAccount`
- `SalaryNotifyLog.publishBatchId`
- `PayrollDraftBatch.publishBatchId`

建议执行顺序：

1. 备份数据库。
2. 在测试库执行 `npm run db:migrate:deploy`。
3. 检查 `_prisma_migrations` 里是否出现 `20260617110000_payroll_publish_batch_identity`。
4. 检查三张表的新字段和索引。
5. 执行只读数据库验收：

```bash
npm run verify:payroll-db -- \
  --out output/payroll/salary-slip-db-verify.json \
  --markdown-out output/payroll/salary-slip-db-verify.md
```

6. 跑 API / 上传 / 发布 / 查询联调。
7. 测试库通过后，再安排生产变更窗口。

## 身份回填 dry-run

用途：

- 找出历史 `SalarySlip` 哪些可以按明确身份字段自动回填。
- 找出哪些只是同名命中，必须人工确认。
- 生成 review-only SQL，默认 `ROLLBACK`。

脚本：

```text
scripts/migrations/payroll/salary-identity-backfill-dryrun.mjs
```

准备 TSV 导出：

```sql
SELECT
  id,
  loginAccount,
  name,
  wecomUserId,
  wecomName,
  department,
  roleCode
FROM User
ORDER BY id;
```

```sql
SELECT
  id,
  month,
  publishBatchId,
  teacherId,
  teacherName,
  userId,
  wecomUserId,
  loginAccount
FROM SalarySlip
ORDER BY month DESC, teacherName ASC, id ASC;
```

运行 dry-run：

```bash
node scripts/migrations/payroll/salary-identity-backfill-dryrun.mjs \
  --users-tsv output/payroll/users.tsv \
  --salary-slips-tsv output/payroll/salary-slips.tsv \
  --out output/payroll/salary-identity-backfill-plan.json \
  --markdown-out output/payroll/salary-identity-backfill-plan.md \
  --sql-out output/payroll/salary-identity-backfill-plan.sql \
  --no-write
```

输出解读：

- `auto_update_candidate`：明确身份字段唯一命中，可进入 SQL 草案。
- `already_complete`：身份字段已完整且一致，跳过。
- `name_hint_needs_manual`：只有姓名命中，不能自动回填。
- `ambiguous_strong_match_needs_manual`：明确身份命中多人，必须人工确认。
- `identity_conflict_needs_manual`：现有身份字段和用户表不一致，必须人工确认。
- `unmatched_needs_manual`：没有找到候选人，必须人工确认。

SQL 审查要求：

1. 先看 markdown 报告，确认 `needsManualReview` 项。
2. SQL 只应包含 `UPDATE SalarySlip`。
3. SQL 不能包含 `DELETE / DROP / TRUNCATE`。
4. SQL 默认 `ROLLBACK`，测试库确认后才能手动改为 `COMMIT`。
5. 生产执行前要记录 SQL 文件 SHA256。

## 真实联调验收

UAT 样例：

```text
tests/fixtures/payroll/salary-upload-uat-resolved-2026-06.csv
tests/fixtures/payroll/salary-upload-uat-unresolved-2026-06.csv
```

在前端 Vite 源码恢复前，可以先把 UAT CSV 转成后端接口 payload，在测试库中验证发布和通知链路：

```bash
npm run fixture:payroll-payload -- \
  --csv tests/fixtures/payroll/salary-upload-uat-resolved-2026-06.csv \
  --month 2026-06 \
  --out-dir output/payroll/uat-resolved-2026-06 \
  --synced-by "UAT 财务"
```

预期输出：

```text
output/payroll/uat-resolved-2026-06/summary.json
output/payroll/uat-resolved-2026-06/salary-slips-sync.json
output/payroll/uat-resolved-2026-06/salary-notify-log.json
```

未处理差异样例只应生成 blocked summary，不应生成发布 payload：

```bash
npm run fixture:payroll-payload -- \
  --csv tests/fixtures/payroll/salary-upload-uat-unresolved-2026-06.csv \
  --month 2026-06 \
  --out-dir output/payroll/uat-unresolved-2026-06
```

提交到测试 API 前，先生成 dry-run 调用计划，不写数据库：

```bash
npm run uat:payroll-api -- \
  --payload-dir output/payroll/uat-resolved-2026-06 \
  --api-base-url http://127.0.0.1:4000/api \
  --out output/payroll/uat-resolved-2026-06/api-submit-dry-run.json
```

测试库 API、token 和权限账号确认后，再显式执行：

```bash
PAYROLL_UAT_TOKEN="测试库财务账号 JWT" \
npm run uat:payroll-api -- \
  --payload-dir output/payroll/uat-resolved-2026-06 \
  --api-base-url http://127.0.0.1:4000/api \
  --token-env PAYROLL_UAT_TOKEN \
  --out output/payroll/uat-resolved-2026-06/api-submit-result.json \
  --execute \
  --confirm-test-db PAYROLL_UAT_TEST_DB
```

测试 API 执行成功后生成审计包：

```bash
npm run audit:payroll-package -- \
  --payload-dir output/payroll/uat-resolved-2026-06 \
  --submit-result output/payroll/uat-resolved-2026-06/api-submit-result.json \
  --out-dir output/payroll/uat-resolved-2026-06/audit-package
```

审计包必须保留：

- `manifest.json`
- `README.md`
- `salary-slips.csv`
- `notify-delivered.csv`
- `notify-skipped.csv`
- `notify-failed.csv`
- `notify-log-readback.json`

审计包确认项：

- `manifest.json` 的 `status` 为 `ready`。
- `manifest.json` 的 `sourceMode` 优先为 `api_readback`。
- `manifest.json` 的 `writesDatabase` 为 `false`。
- `salary-slips.csv` 和 `notify-log-readback.json` 使用同一 `publishBatchId`。
- `manifest.json` 中输出文件 SHA256 完整。

安全规则：

- 默认不写数据库。
- 必须同时传 `--execute` 和 `--confirm-test-db PAYROLL_UAT_TEST_DB` 才会调用接口。
- 生产域名会被脚本拒绝。
- 非本地、非测试命名的 API 地址需要额外传 `--allow-non-local`，且仍不能像生产域名。
- 脚本会先校验 `salary-slips/sync` 返回的 `publishBatchId / teacherIds / createdCount / updatedCount / skippedCount`。
- 只有同步响应校验通过，才会继续调用 `salary-notify-logs` 写通知记录。

测试账号准备：

- 至少 1 个 `FINANCE` 或拥有 `action.payroll.publish` 的账号。
- 至少 2 个同名或近似姓名员工，用于验证不按姓名越权。
- 至少 1 个无企微账号员工。
- 至少 1 个合作老师，验证通知跳过。

联调路径：

1. 登录财务账号。
2. 上传 `salary-upload-uat-resolved-2026-06.csv`。
3. 检查导入草稿。
4. 确认差异已处理。
5. 发布薪资条。
6. 检查 `salary-slips/sync` 返回统计和 `publishBatchId`。
7. 确认 `api-submit-result.json` 里的 `validations` 通过。
8. 调用 `GET /salary-slips?month=2026-06&publishBatchId=...`，确认正式薪资条写入 `userId / wecomUserId / loginAccount`。
9. 检查通知记录写入 `publishBatchId`。
10. 调用 `GET /salary-notify-logs?month=2026-06&publishBatchId=...`，确认能按月和发布批次追溯通知记录。
11. 用员工账号访问本人薪资条，只能看到自己的记录。
12. 用同名员工账号确认不能看到另一个人的薪资条。
13. 上传 `salary-upload-uat-unresolved-2026-06.csv`。
14. 确认差异未处理时发布被阻断，且不会调用 `salary-slips/sync`。

## 前端仍阻塞

前端 UI 修复必须等待员工端 Vite 源码：

- 不修改 `apps/web/public/employee-frontend/releases/20260616090241/**`。
- 不直接 patch 压缩 JS。
- 源码恢复后再补 `/payroll/batch` 上传入口、导入中心深链预填、上传后返回。

## 回滚思路

结构迁移已经新增字段，不删除旧字段，不影响旧数据读取。

如果上线后需要暂停：

1. 保留 migration，不回滚字段。
2. 暂停前端入口或发布按钮。
3. 收回 `action.payroll.publish` 临时权限。
4. 保留已写入的薪资条和通知日志。
5. 如回填 SQL 有误，在备份和执行记录基础上按 `SalarySlip.id` 反向修正身份字段。
