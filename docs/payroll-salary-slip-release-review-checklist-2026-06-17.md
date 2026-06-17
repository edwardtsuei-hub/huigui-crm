# 薪资条上传与发送优化提交前检查清单（2026-06-17）

## 当前结论

本地代码层面可以进入测试库验收；不能直接进入生产发布。

必须继续拦截的事项：

- `blocked_waiting_for_vite_source`：员工端 Vite 源码未恢复，前端 UI 修复不能做。
- `blocked_waiting_for_database_connection`：当前本机无法连接真实 MySQL，不能完成真实闭环联调。
- `blocked_waiting_for_real_migration`：migration 尚未在测试库执行。

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
- 真实登录、上传、发布、通知、员工查看闭环已通过。
- 生产数据库已经迁移。
- 历史薪资条身份字段已经回填。

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

- `npm run test:payroll` 为 47/47 passed。
- `npm run preflight:payroll` 可以是 `passed_with_blockers`，但不能有 `failures`。
- 压缩发布包 diff 必须为空。
- 预检输出应包含 release route evidence，说明当前仅在压缩 release 中命中 `/payroll/batch`、`/finance/imports` 和“上传薪资表”，且没有 `.map` 或 `sourceMappingURL` 可还原源码。

## 测试库验收清单

测试库可达后执行：

```bash
npm run db:migrate:deploy
npm run verify:payroll-db -- \
  --out output/payroll/salary-slip-db-verify.json \
  --markdown-out output/payroll/salary-slip-db-verify.md
```

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

## 权限验收清单

需要人工确认：

- 保留薪资维护权限的账号是否都具备 `SUPER_ADMIN / ADMIN / FINANCE` 角色或 `action.payroll.publish` 权限。
- 原本只靠“财务 / 办公室 / 人事”文本命中的账号，是否需要补正式权限。
- 原本只有 `action.management.member.update` 的账号，不应再能维护薪资。

## 历史数据回填清单

历史回填只能先 dry-run：

```bash
node scripts/migrations/payroll/salary-identity-backfill-dryrun.mjs \
  --users-tsv output/payroll/users.tsv \
  --salary-slips-tsv output/payroll/salary-slips.tsv \
  --out output/payroll/salary-identity-backfill-plan.json \
  --markdown-out output/payroll/salary-identity-backfill-plan.md \
  --sql-out output/payroll/salary-identity-backfill-plan.sql \
  --no-write
```

人工复核要求：

- `name_hint_needs_manual` 不能自动回填。
- `identity_conflict_needs_manual` 必须逐条确认。
- `ambiguous_strong_match_needs_manual` 必须逐条确认。
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

- 测试库 migration 通过。
- 测试库 `verify:payroll-db` 无失败。
- 后端 UAT payload 发布验证通过。
- UAT 审计包 manifest 为 ready，且 SHA256 留档完整。
- 权限账号清单确认完成。
- 企业微信通知先在测试应用或 dry-run 模式确认。
- 压缩发布包 diff 为空。

必须 No-Go 的条件：

- 员工端源码仍未恢复但要求发布 UI 修复。
- 真实数据库验收未跑但要求生产上线。
- 权限清单未确认。
- 同名员工隔离未验证。
- 历史回填 SQL 未人工复核。

## 回滚原则

- 新增字段不回滚删除。
- 若发布异常，先收回 `action.payroll.publish` 或隐藏发布入口。
- 已写入薪资条与通知记录保留，用 `publishBatchId` 对账。
- 如身份回填出错，按备份和 `SalarySlip.id` 反向修正。
