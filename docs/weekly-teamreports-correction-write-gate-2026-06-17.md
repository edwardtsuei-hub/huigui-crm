# Weekly teamReports 修正写入总门禁

日期：2026-06-17
状态：`ready_for_explicit_rollback_rehearsal_authorization`

## 目标

把 weekly teamReports 修正流程中已经存在的分散门禁汇总为一个单一 go/no-go 判断，避免把“工具验证通过”误读为“已经可以写库”。

本轮新增：

- `scripts/migrations/employee-data/weekly-teamreports-correction-write-gate.mjs`
- `output/employee-data-migration/2026-06-16/weekly-teamreports-correction-write-gate-result.json`
- `output/employee-data-migration/2026-06-16/weekly-teamreports-correction-write-gate-result.md`

## 安全边界

- 只读取既有 JSON 产物。
- 不连接数据库。
- 不执行 SQL。
- 不写生产数据库。
- 不生成生产 SQL。
- 不修改 schema、migration、API、前端或业务代码。
- 不部署、不重启、不打 rollback tag。
- 不授权 `ROLLBACK` 事务试跑。
- 不授权真实 `COMMIT`。

## 汇总输入

| 输入 | 用途 |
| --- | --- |
| `database-100-global-precheck-verify-result.json` | 确认全局 hard gate 无 mismatch |
| `weekly-teamreports-correction-sql-guard-result.json` | 确认 apply / rollback SQL 草案仍是安全结构 |
| `weekly-teamreports-correction-rehearsal-verify-result.json` | 识别事务试跑验收结果；当前为合成 transcript 工具验证，不等于真实试跑 |
| `weekly-teamreports-correction-execution-authorization.json` | 确认当前仍等待用户明确授权 ROLLBACK 事务试跑 |

## 当前总门禁结果

命令：

```bash
node scripts/migrations/employee-data/weekly-teamreports-correction-write-gate.mjs \
  --global-precheck output/employee-data-migration/2026-06-16/database-100-global-precheck-verify-result.json \
  --sql-guard output/employee-data-migration/2026-06-16/weekly-teamreports-correction-sql-guard-result.json \
  --rehearsal-verify output/employee-data-migration/2026-06-16/weekly-teamreports-correction-rehearsal-verify-result.json \
  --authorization output/employee-data-migration/2026-06-16/weekly-teamreports-correction-execution-authorization.json \
  --out output/employee-data-migration/2026-06-16/weekly-teamreports-correction-write-gate-result.json \
  --markdown-out output/employee-data-migration/2026-06-16/weekly-teamreports-correction-write-gate-result.md
```

输出摘要：

| 指标 | 值 |
| --- | --- |
| status | `ready_for_explicit_rollback_rehearsal_authorization` |
| nextAllowedAction | `request_user_authorization_for_rollback_rehearsal` |
| hardFailedChecks | `0` |
| commitAllowed | `false` |
| deploymentAllowed | `false` |

## 关键判断

当前 `weekly-teamreports-correction-rehearsal-verify-result.json` 的 transcript 来源是 `-`，属于合成 transcript 工具验证，不是真实生产事务试跑输出。

因此总门禁明确：

- 可以向用户申请下一步 `ROLLBACK` 事务试跑授权。
- 不可把当前状态解释为真实试跑已通过。
- 不可申请真实 `COMMIT`。
- 不可部署。

## 总门禁顺序

1. 全局 hard gate 必须全部通过。
2. SQL 静态守卫必须通过。
3. 授权包必须处于 `waiting_for_explicit_rollback_rehearsal_authorization`。
4. 用户明确授权后，才允许执行保留 `ROLLBACK;` 的事务试跑。
5. 事务试跑后，rehearsal verifier 必须使用真实捕获 transcript 路径并返回 `passed`。
6. 只有真实试跑 `passed` 后，才允许进入第二次用户授权讨论。
7. 即使进入第二次授权讨论，`COMMIT` 仍不能由任何工具或文档自动放行。

## 当前结论

当前写入总门禁已准备好，状态是：

`ready_for_explicit_rollback_rehearsal_authorization`

这代表下一步可以向用户申请明确授权：

`授权执行 weekly teamReports ROLLBACK 事务试跑`

在用户明确授权前，继续保持：

- 不执行 SQL
- 不写数据库
- 不部署
- 不重启
- 不打 rollback tag
- `commitAllowed=false`
- `deploymentAllowed=false`
