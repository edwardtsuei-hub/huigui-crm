# Weekly teamReports 修正执行授权包

日期：2026-06-17
状态：`waiting_for_explicit_rollback_rehearsal_authorization`

## 当前阶段

PR #15 已将 SQL 草案合并到 `main`，但还没有执行任何 SQL。

当前只允许进入下一步的前提是：用户明确授权一次「事务试跑」，并且试跑必须保留 SQL 末尾的 `ROLLBACK;`。

## 已具备的材料

- 指纹包：`output/employee-data-migration/2026-06-16/weekly-teamreports-correction-fingerprint-package.json`
- apply 草案：`output/employee-data-migration/2026-06-16/weekly-teamreports-correction-apply-draft.sql`
- rollback 草案：`output/employee-data-migration/2026-06-16/weekly-teamreports-correction-rollback-draft.sql`
- SQL 草案计划：`output/employee-data-migration/2026-06-16/weekly-teamreports-correction-sql-draft.json`

## SQL 草案安全结构

apply draft：

- `UPDATE=10`
- `COMMIT=0`
- `ROLLBACK=1`
- `SHA guard=10`
- `payload link guard=10`
- `child reportId guard=4`

rollback draft：

- `UPDATE=10`
- `COMMIT=0`
- `ROLLBACK=1`
- `SHA guard=10`
- `payload link guard=10`
- `child reportId guard=4`

## 下一步允许做什么

只有在用户明确说出类似「授权执行 ROLLBACK 事务试跑」后，才允许：

1. 重新跑 PR #14 的 `precheck.sql`。
2. 以事务方式执行 `weekly-teamreports-correction-apply-draft.sql`。
3. 保留 SQL 末尾 `ROLLBACK;`，不得改成 `COMMIT;`。
4. 读取 10 个 `affectedRows`。
5. 读取 postcheck 的 10 个 after SHA 检查结果。
6. 事务回滚后，再次跑 PR #14 precheck，确认生产数据仍回到 before SHA。

## 事务试跑通过标准

必须同时满足：

- precheck：12 个 before SHA 全部吻合。
- 目标 3 条周报 direct `WeeklyReportPayload` links 仍为 0。
- `WeeklyReportPayload` 分组仍为 `13 / 3 / 3`。
- `shared/shared/draft=13`。
- `distinct sourceSha16=13`。
- apply draft 10 个 `affectedRows` 全部为 1。
- apply postcheck 10 个 after SHA 全部为 true。
- ROLLBACK 后 12 个 before SHA 再次全部吻合。

任一条件不满足，必须停止，不得进入真实 `COMMIT`。

## 仍然禁止

在没有用户第二次明确授权前，仍然禁止：

- 把 `ROLLBACK;` 改成 `COMMIT;`
- 执行真实写库
- 部署
- 重启
- 打 rollback tag
- 修改 schema / migration / API / 前端
- 将 payroll/schema 既有改动混入本流程

## 真实 COMMIT 窗口的额外条件

即使事务试跑通过，真实写库也需要用户再次明确授权，且必须满足：

1. D 线确认试跑结果。
2. 再次确认 rollback draft 与 apply draft 同包保存。
3. 真实执行前重新跑 precheck。
4. 真实执行时只允许替换 apply draft 最后一行 `ROLLBACK;` 为 `COMMIT;`。
5. 执行后立即跑 postcheck 和发布门禁。

## 当前结论

当前状态适合等待用户决定是否进入「ROLLBACK 事务试跑」。在用户明确授权前，继续保持：

- `deploymentAllowed=false`
- 不写数据库
- 不部署
- 不重启
- 不打 rollback tag
