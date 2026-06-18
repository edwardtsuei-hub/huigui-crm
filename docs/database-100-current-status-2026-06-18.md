# Database 100 当前状态

日期：2026-06-18
状态：`core_database_passed_release_gate_pending`

## 结论

生产数据库核心链路当前已经通过最新只读门禁。

本轮只读刷新结果：

- `/api/health` 返回 `status=ok`。
- `huigui-api`、`huigui-mysql`、`huigui-nginx` 均在运行，未因本轮检查重启。
- database 100 global precheck：38 行，29 个 hard gates，0 mismatch。
- payroll 专用 DB verify：`passed`，无 blockers、无 failures、无 warnings。

这表示核心数据库状态已经从“schema 已落地但有历史 warning”，推进到“payroll 历史旧数据 warning 已收口”。

## 已完成

| 模块 | 当前结果 |
| --- | --- |
| 排班 | `RosterWeek=6`，`RosterShift=210`，orphan=0 |
| 周报 payload | total=19，分组稳定，shared/shared/draft=13 |
| weekly teamReports | 已真实 COMMIT，final SHA hard gates 通过 |
| payroll schema | 生产 migration 已完成，字段和索引存在 |
| payroll 历史身份 | 方案 A 已完成，identityIncomplete=0 |
| payroll 历史批次 | 方案 B 主方案已完成，SalarySlip / SalaryNotifyLog 缺 publishBatchId=0 |
| payroll DB verify | `passed`，0 warning |
| database 100 global precheck | `passed`，0 mismatch |

## 最新证据

| 文件 | 用途 |
| --- | --- |
| `output/employee-data-migration/2026-06-16/database-100-global-precheck-current-20260618.tsv` | 最新生产 database 100 只读输出 |
| `output/employee-data-migration/2026-06-16/database-100-global-precheck-current-20260618-verify.json` | 最新 global precheck 机器校验 |
| `output/employee-data-migration/2026-06-16/database-100-global-precheck-current-20260618-verify.md` | 最新 global precheck 摘要 |
| `output/payroll/payroll-current-db-verify-20260618.json` | 最新 payroll DB verify |
| `output/payroll/payroll-current-db-verify-20260618.md` | 最新 payroll DB verify 摘要 |

## 仍未等于整套系统 100 分的事项

这些不是当前 core database hard gate 失败，而是完整产品发布 / 全域归档的剩余项：

1. `EmployeeLaunchEvidenceArchive` 仍停在 schema draft / archive plan，尚未进入正式 Prisma schema migration。
2. Phase2 TEST / 审计证据 81 条仍未真实入库归档。
3. `FileRecord` 历史附件归档仍有 local 附件不可达和元数据不足问题。
4. 员工端 payroll 前端候选已合入并完成静态/API 灰度，但浏览器可视化点击流仍未完成。
5. 企业微信真实通知仍未授权。
6. 正式切换员工端 release 仍需 Go / No-Go。
7. D 线发布门禁仍需要独立最终复核；本文件不授权部署。

## 下一步建议

优先顺序：

1. D 线做一次最终只读发布门禁复核，确认 `deploymentAllowed` 是否仍为 false 或可进入 Go / No-Go。
2. 补员工端候选包浏览器可视化点击流验证。
3. 如果要追求全域数据库 100 分，启动 `EmployeeLaunchEvidenceArchive` 正式 schema migration 方案，但仍需先生成 migration draft，不直接写生产。
