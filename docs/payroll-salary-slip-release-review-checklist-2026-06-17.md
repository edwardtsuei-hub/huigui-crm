# 薪资条上传与发送优化提交前检查清单（2026-06-17）

## 当前结论

本地代码层面、本机隔离 MySQL 后端 UAT 和生产 schema postcheck 已完成；仍不能直接进入完整生产发布。

迁移前 readiness gate 留档：

- `status=ready_for_test_db_migration_authorization`
- `productionMigrationAllowed=false`
- 该 gate 是生产执行前证据；上一授权流程已完成生产 schema migration，本次收口只做只读确认和证据归档，未重复执行新的 `db:migrate:deploy`。
- 当前主口径以 `docs/payroll-salary-slip-production-migration-result-2026-06-17.md` 为准。

必须继续拦截的事项：

- `blocked_waiting_for_vite_source`：员工端 Vite 源码未恢复，前端 UI 修复不能做。
- `blocked_waiting_for_local_docker`：本机 Docker 不存在；仅阻塞 Docker 标准演练路径。
- `blocked_waiting_for_publish_batch_id_manual_assignment`：旧薪资条和旧通知记录的身份字段方案 A 已完成；`publishBatchId` 仍需人工指定 `2026-05` 批次并单独授权。

## 允许进入评审的内容

- 后端 `salary-slips/sync` 发布批次与身份字段写入。
- 正式薪资条可按 `month / publishBatchId` 财务只读查询。
- 员工本人薪资条查询从姓名过滤改为明确身份字段查询。
- 薪资维护权限收紧。
- 通知记录保留历史并关联 `publishBatchId`。
- 通知记录可按 `month / publishBatchId` 只读查询。
- 草稿批次关联 `publishBatchId`。
- 身份回填 dry-run 脚本。
- 只读数据库验收脚本。
- UAT CSV 样例与 payload 生成工具。
- UAT API dry-run / submit 工具。
- UAT 审计包导出工具。

## 不允许本次提交宣称完成的内容

- 员工端上传入口 UI 已修复。
- 导入中心深链预填和上传后返回已修复。
- 前端真实登录、上传、发布、通知、员工查看闭环已通过。
- 历史薪资条身份字段已经回填。
- 企业微信真实通知已经发布。

## 评审前命令

在提交或合并前，至少重新执行：

```bash
npm run db:generate
npm run test:payroll
npm run preflight:payroll
npm run lint -w @huigui/api
npm run build
git diff --name-only -- apps/web/public/employee-frontend/releases/20260616090241
```

期望结果：

- `npm run test:payroll` 为 48/48 passed。
- `npm run preflight:payroll` 可以是 `passed_with_blockers`，但不能有 `failures`；当前预期 blockers 为前端源码和 Docker 环境。
- 压缩发布包 diff 必须为空。
- 预检输出应包含 release route evidence，说明当前仅在压缩 release 中命中 `/payroll/batch`、`/finance/imports` 和“上传薪资表”，且没有 `.map` 或 `sourceMappingURL` 可还原源码。

## 测试库验收清单

已在本机隔离 MySQL 测试库完成一次后端演练：

- 测试库：`huigui_crm_test`。
- migration：`20260617110000_payroll_publish_batch_identity` 已应用。
- 空库只读验收：`output/payroll/test-db-verify-20260617.md`，状态 `passed`。
- UAT API execute：`output/payroll/uat-resolved-2026-06/api-submit-result.json`，状态 `executed`，blockers 为空。
- UAT read-back：正式薪资条 4 条、通知记录 1 条，金额和身份字段校验通过。
- 审计包：`output/payroll/uat-resolved-2026-06/audit-package/manifest.json`，状态 `ready`，`sourceMode=api_readback`。
- UAT 后只读验收：`output/payroll/test-db-verify-after-uat-20260617.md`，状态 `passed_with_warnings`；warning 对应 UAT 故意覆盖的无企微账号跳过通知和同名身份隔离场景。

如换外部测试库或 staging 库，仍需重新执行：

```bash
npm run db:migrate:deploy
npm run verify:payroll-db -- \
  --out output/payroll/salary-slip-db-verify.json \
  --markdown-out output/payroll/salary-slip-db-verify.md
```

## 生产 schema postcheck 结果

上一授权流程已完成生产 schema migration；本次收口只读确认目标 migration 已在生产库完成：

- migration：`20260617110000_payroll_publish_batch_identity`。
- `_prisma_migrations.finished_at=2026-06-17T15:04:24.177Z`。
- 本次收口未重复执行新的生产 `db:migrate:deploy`。
- 结构验收：6 个目标字段、6 个目标索引均存在。
- 生产只读验收：`output/payroll/production-schema-migration-20260617-231344/payroll-postcheck.md`，状态 `passed_with_warnings`，无 blockers、无 failures。
- database 100：`output/payroll/production-schema-migration-20260617-231344/database-100-global-precheck-post-verify.md`，38 行、29 个 hard gates、0 mismatch。

生产 warning 不阻断 schema migration，但阻断“宣称历史数据完全整理完成”：

- `salary_slips_with_incomplete_identity`：1 条旧薪资条身份字段不完整。
- `salary_slips_missing_publish_batch_id`：1 条旧薪资条或相关旧通知链路缺发布批次字段。
- 旧通知记录 `recentNotifyLogs[0].publishBatchId=null`，需要纳入历史数据复核。

历史回填 dry-run 和方案 A 真实回填已完成：

- 证据目录：`output/payroll/history-identity-backfill-dryrun-20260617-232715`。
- 结果文档：`docs/payroll-salary-slip-history-identity-backfill-dryrun-2026-06-17.md`。
- 授权评审单：`docs/payroll-salary-slip-history-backfill-authorization-request-2026-06-17.md`。
- 24 条使用者身分索引、1 条历史薪资条、1 条历史通知记录、1 条草稿批次已只读导出。
- 1 条历史薪资条原为 `auto_update_candidate`，0 条人工身份冲突；2026-06-18 已按授权完成方案 A。
- 受影响月份为 `2026-05`；旧薪资条和旧通知记录各有 1 条 `publishBatchId` 缺口，且没有可自动推断的发布批次候选。
- 审查 SQL 默认 `ROLLBACK`，SHA256：`c0ebb809bf4253e2067b3e87b7a2c390c88dc3618dba74167d0f270f29c62ca0`。
- 方案 A 执行包已准备：`output/payroll/history-identity-backfill-dryrun-20260617-232715/scheme-a-execution-package.md`。
- 方案 A 生产只读 before-check 已执行，目标薪资条三项身份字段仍为 `NULL`；结果 SHA256：`92b9c932856a10932a2706f5161676940a1aa2f64b2fb9f98da8d2eda18a1c23`。
- 方案 A 执行结果：`docs/payroll-salary-slip-history-backfill-result-2026-06-18.md`。
- 方案 A 后 payroll DB verify：`identityIncomplete=0`，warning 只剩 `salary_slips_missing_publish_batch_id`。

必须确认：

- `_prisma_migrations` 包含 `20260617110000_payroll_publish_batch_identity`。
- `SalarySlip` 有 `publishBatchId / userId / wecomUserId / loginAccount` 字段和索引。
- `SalaryNotifyLog` 有 `publishBatchId` 字段和索引。
- `PayrollDraftBatch` 有 `publishBatchId` 字段和索引。
- `verify:payroll-db` 没有 `failures`。
- `GET /salary-slips?month=YYYY-MM&publishBatchId=...` 能返回对应正式薪资条。
- `GET /salary-slips` 无筛选条件时应拒绝查询，不能返回全量薪资条。
- `GET /salary-notify-logs?month=YYYY-MM&publishBatchId=...` 能返回对应历史通知记录。
- `POST /salary-notify-logs` 缺少 `publishBatchId` 且无法从当月唯一发布批次推断时应拒绝写入。
- `GET /salary-notify-logs` 无 `month / publishBatchId` 时应拒绝查询。

## 后端 UAT 验收清单

前端源码恢复前，可以先用 payload 工具验证后端链路：

```bash
npm run fixture:payroll-payload -- \
  --csv tests/fixtures/payroll/salary-upload-uat-resolved-2026-06.csv \
  --month 2026-06 \
  --out-dir output/payroll/uat-resolved-2026-06 \
  --synced-by "UAT 财务"
```

验收点：

- `salary-slips-sync.json` 可用于调用发布接口。
- CSV 必须包含 `姓名 / 应发 / 实发` 表头，且至少包含 `员工ID / 用户ID / 企业微信账号 / 登录账号 / 系统账号` 任一身份表头；缺少时只能生成 blocked summary，不能生成发布 payload。
- CSV 中 `应发 / 实发` 必须是有效数字；非法或缺失时只能生成 blocked summary，不能生成发布 payload。
- CSV 每一行必须至少有 `员工ID / 用户ID / 企业微信账号 / 登录账号` 之一；缺少明确身份时不能生成发布 payload。
- CSV parser 必须支持标准引号单元格，`"12,000"` 这类千分位金额不能被拆列。
- Excel 导出的 UTF-8 BOM 不能影响第一列表头识别。
- `npm run uat:payroll-api` 默认只生成 dry-run 计划，不写数据库。
- dry-run 前必须校验 `summary.json / salary-slips-sync.json / salary-notify-log.json` 的月份、发布批次、行数和通知人数一致。
- 执行模式下必须先校验 `salary-slips/sync` 响应，通过后才能记录通知日志。
- 通知日志写入响应必须返回 `ok: true`；如返回 `publishBatchId`，必须与本次批次一致。
- 执行成功后必须自动读回 `GET /salary-slips` 和 `GET /salary-notify-logs`，并在 `validations` 中显示通过。
- 读回正式薪资条必须核对 `publishBatchId / teacherIds / grossAmount / commissionAmount / profitSharingAmount / deductionAmount / netAmount / userId / wecomUserId / loginAccount`。
- 读回通知记录必须核对同一 `publishBatchId` 下 `delivered / skipped / failed` 数量。
- 返回包含 `createdCount / updatedCount / skippedCount / teacherIds / publishBatchId / warnings`。
- 空明细和非数字金额必须被 `salary-slips/sync` 拒绝。
- 缺少 `teacherId / userId / wecomUserId / loginAccount` 任一明确身份的明细必须被 `salary-slips/sync` 拒绝，且不能写入正式薪资条。
- 负数或合计不一致金额必须进入 `warnings`，供财务复核。
- 正式薪资条写入明确身份字段。
- 正式薪资条可通过 `GET /salary-slips` 按 `publishBatchId` 对账。
- 正式薪资条同步只替换当前 `publishBatchId`，不能覆盖同月其他发布批次。
- 正式薪资条默认 ID 由月份、发布批次和员工身份稳定生成，不受导入行号影响；同一批次重跑稳定覆盖，不同批次各自留档。
- 通知记录写入同一个 `publishBatchId`。
- 通知记录未显式传 `id` 时，默认 ID 必须包含发布批次并保持唯一，避免同批次多次通知覆盖历史。
- 通知记录不能缺失 `publishBatchId`；旧入口未传时，只允许后端从当月唯一发布批次自动补齐。
- 合作老师不进入通知名单。
- 无企微账号员工不进入企微通知名单。
- 同名员工只看到自己的薪资条。

阻断样例：

```bash
npm run fixture:payroll-payload -- \
  --csv tests/fixtures/payroll/salary-upload-uat-unresolved-2026-06.csv \
  --month 2026-06 \
  --out-dir output/payroll/uat-unresolved-2026-06
```

验收点：

- 只生成 blocked summary。
- 不生成 `salary-slips-sync.json`。
- 不生成 `salary-notify-log.json`。
- 不允许调用发布接口。

测试库 API 调用命令：

```bash
npm run uat:payroll-api -- \
  --payload-dir output/payroll/uat-resolved-2026-06 \
  --api-base-url http://127.0.0.1:4000/api \
  --out output/payroll/uat-resolved-2026-06/api-submit-dry-run.json
```

显式执行必须同时满足：

- 使用测试库 API 地址。
- 使用具备薪资发布权限的测试账号 token。
- 命令包含 `--execute`。
- 命令包含 `--confirm-test-db PAYROLL_UAT_TEST_DB`。
- 不指向生产域名。

测试库执行成功后生成审计包：

```bash
npm run audit:payroll-package -- \
  --payload-dir output/payroll/uat-resolved-2026-06 \
  --submit-result output/payroll/uat-resolved-2026-06/api-submit-result.json \
  --out-dir output/payroll/uat-resolved-2026-06/audit-package
```

审计包验收点：

- `manifest.json` 的 `status` 为 `ready`。
- `manifest.json` 的 `writesDatabase` 为 `false`。
- `sourceMode` 优先为 `api_readback`。
- `salary-slips.csv` 行数与正式薪资条读回数量一致。
- `notify-log-readback.json` 包含同一 `publishBatchId` 的通知记录。
- `manifest.json` 中所有输出文件都有 SHA256。
- 如果 API submit result 的 `status` 为 `failed` 或任一 validation 未通过，审计包必须是 blocked manifest，不能生成薪资条 CSV。
- 如果传入 API submit result 但缺少薪资条或通知记录 read-back 行，审计包必须是 blocked manifest，不能退回 payload 证据。
- 差异阻断样例只允许生成 blocked manifest。

本机测试库本轮结果：

- `salary-slips/sync`：HTTP 201，创建 4 条，`publishBatchId=salary-publish-2026-06-uat-fixture`。
- `salary-notify-logs`：HTTP 201，写入通知日志 1 条。
- `GET /salary-slips` read-back：返回 4 条，无 missing teacher、wrong batch、identity missing、amount mismatch 或 identity mismatch。
- `GET /salary-notify-logs` read-back：同批次匹配 1 条，delivered 2、skipped 2、failed 0。
- 审计包 manifest：`status=ready`，`sourceMode=api_readback`，薪资条 4 行、通知送达 2 行、跳过 2 行、失败 0 行。

## 权限验收清单

需要人工确认：

- 保留薪资维护权限的账号是否都具备 `SUPER_ADMIN / ADMIN / FINANCE` 角色或 `action.payroll.publish` 权限。
- 原本只靠“财务 / 办公室 / 人事”文本命中的账号，是否需要补正式权限。
- 原本只有 `action.management.member.update` 的账号，不应再能维护薪资。

## 历史数据回填清单

历史回填已经完成一次只读导出和 dry-run：

```bash
node scripts/migrations/payroll/salary-identity-backfill-dryrun.mjs \
  --users-tsv output/payroll/history-identity-backfill-dryrun-20260617-232715/users.tsv \
  --salary-slips-tsv output/payroll/history-identity-backfill-dryrun-20260617-232715/salary-slips.tsv \
  --out output/payroll/history-identity-backfill-dryrun-20260617-232715/salary-identity-backfill-plan.json \
  --markdown-out output/payroll/history-identity-backfill-dryrun-20260617-232715/salary-identity-backfill-plan.md \
  --sql-out output/payroll/history-identity-backfill-dryrun-20260617-232715/salary-identity-backfill-plan.sql \
  --no-write
```

本轮 dry-run 原始结果：

- `auto_update_candidate`：1 条。
- `needsManualReview`：0 条身份冲突。
- 旧通知记录 `publishBatchId`：1 条缺失，受影响月份 `2026-05` 无自动候选。
- SQL 默认 `ROLLBACK`。
- SQL SHA256：`c0ebb809bf4253e2067b3e87b7a2c390c88dc3618dba74167d0f270f29c62ca0`。

方案 A 已按授权完成：

- 更新 1 条 `SalarySlip` 的 `userId / wecomUserId / loginAccount`。
- 不回填 `publishBatchId`。
- 不更新 `SalaryNotifyLog`。
- 执行结果文档：`docs/payroll-salary-slip-history-backfill-result-2026-06-18.md`。

人工复核要求：

- `name_hint_needs_manual` 不能自动回填。
- `identity_conflict_needs_manual` 必须逐条确认。
- `ambiguous_strong_match_needs_manual` 必须逐条确认。
- 旧薪资条和旧通知记录的 `publishBatchId` 回填不由方案 A 覆盖；必须先人工指定 `2026-05` 发布批次，再另行确认和授权。
- SQL 默认 `ROLLBACK`，测试库确认后才能人工改为 `COMMIT`。
- SQL 文件必须记录 SHA256。

## 前端源码恢复后的验收清单

源码恢复后再做这些项：

- `/payroll/batch` 有明确上传薪资表入口。
- 空状态能引导去上传或导入中心。
- `/finance/imports` 支持从薪资页面深链预填。
- 上传完成后能回到 `/payroll/batch`。
- `.csv / .xlsx / .xls` 提示清楚，`.xls` 不承诺浏览器内预览。
- 差异未处理时发布按钮不可用。

## 生产前 Go / No-Go

可以继续推进的条件：

- 测试库 migration 已通过。
- 测试库 `verify:payroll-db` 无失败。
- 后端 UAT payload 发布验证已通过。
- UAT 审计包 manifest 为 ready，且 SHA256 留档完整。
- 生产 schema migration 已通过，并有 postcheck 证据。
- 权限账号清单确认完成。
- 企业微信通知先在测试应用或 dry-run 模式确认。
- 压缩发布包 diff 为空。

必须 No-Go 的条件：

- 员工端源码仍未恢复但要求发布 UI 修复。
- 生产 warning 未处理却宣称历史数据已完整回填。
- 权限清单未确认。
- 同名员工隔离未验证。
- 历史回填 SQL 未人工复核。

## 回滚原则

- 新增字段不回滚删除。
- 若发布异常，先收回 `action.payroll.publish` 或隐藏发布入口。
- 已写入薪资条与通知记录保留，用 `publishBatchId` 对账。
- 如身份回填出错，按备份和 `SalarySlip.id` 反向修正。
