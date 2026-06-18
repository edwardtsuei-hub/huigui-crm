# 发布前最终只读门禁刷新

日期：2026-06-18
状态：`ready_for_go_no_go_review`
部署许可：`deploymentAllowed=false`

## 结论

本轮只读刷新显示：生产数据库核心门禁已经通过，payroll 历史旧数据 warning 已收口，员工端 payroll 候选前端完成了本机浏览器 smoke 验证。

但本文件不授权部署，也不授权切换员工端 release。

仍需 Go / No-Go 决策后才允许：

- 上传候选员工端 release 到服务器。
- 切换 `current.release`。
- 触发企业微信真实通知。
- 执行任何部署或重启。

## 生产只读门禁

| 检查 | 结果 |
| --- | --- |
| `/api/health` | HTTP 200，`status=ok` |
| `huigui-api` | running，未因本轮检查重启 |
| `huigui-mysql` | healthy |
| `huigui-nginx` | running |
| database 100 global precheck | `passed` |
| database 100 hard gates | 29 |
| database 100 mismatches | 0 |
| payroll DB verify | `passed` |
| payroll blockers | 0 |
| payroll failures | 0 |
| payroll warnings | 0 |

关键数据库口径：

- `RosterWeek=6`
- `RosterShift=210`
- orphan `RosterShift=0`
- `WeeklyReportPayload total=19`
- `api_db_first_bridge / IMPORTED=13`
- `legacy_weekly_workspace / IMPORTED=3`
- `legacy_weekly_workspace / NEEDS_REVIEW=3`
- `shared/shared/draft=13`
- distinct `sourceSha16=13`
- `SalarySlip` 身份字段完整缺口=0
- `SalarySlip` / `SalaryNotifyLog` 缺 `publishBatchId`=0

## 员工端候选浏览器 smoke

本机 preview：

```text
http://127.0.0.1:4173
```

候选 release：

```text
20260618063203
```

已验证：

- `/payroll/batch?month=2026-06` 能在 Chrome 中真实渲染。
- 页面显示员工端侧栏、`薪资批量发送`、月份选择器、刷新按钮、上传薪资表按钮。
- 点击 `上传薪资表` 后，正确跳转：

```text
/finance/imports?type=salary_slip&month=2026-06&returnTo=%2Fpayroll%2Fbatch
```

- 导入中心显示 `上传薪资表`、CSV/XLSX/XLS 提示和文件选择控件。
- 点击 `返回核对` 后，正确回到：

```text
/payroll/batch?month=2026-06
```

本轮未执行：

- 未上传文件。
- 未发布薪资。
- 未写生产数据库。
- 未发送企业微信通知。
- 未切换线上员工端 release。

## 仍需 Go / No-Go 前补验

本机浏览器 smoke 发现 `/payroll/batch` 回到核对页后出现本机 API `HTTP 500` 提示。该问题来自本机测试 API / 数据环境，不影响本轮生产只读数据库门禁，但说明完整浏览器业务流仍未闭环。

Go / No-Go 前仍需补：

1. 使用稳定测试 API 或灰度环境完成文件上传解析。
2. 验证未处理差异会阻断发布。
3. 验证发布按钮只在核对原表和通知名单后可用。
4. 验证发布后可按 `publishBatchId` 读回薪资条和通知记录。
5. 验证员工本人只能查看自己的薪资条。
6. 验证企业微信通知保持 dry-run / 测试应用，除非另行授权真实通知。

## 证据文件

| 文件 | 用途 |
| --- | --- |
| `docs/database-100-current-status-2026-06-18.md` | 当前 database 100 状态 |
| `output/employee-data-migration/2026-06-16/database-100-global-precheck-current-20260618-verify.json` | 最新 database 100 校验 |
| `output/payroll/payroll-current-db-verify-20260618.json` | 最新 payroll DB verify |
| `docs/employee-frontend-payroll-limeng-gray-validation-2026-06-18.md` | 立猛账号灰度验证记录 |
| `docs/employee-frontend-payroll-release-candidate-2026-06-18.md` | 员工端候选包记录 |

## 最终判断

数据库核心已经可以进入 Go / No-Go 评审。

正式发布仍不应直接执行。下一步应先补稳定环境下的员工端上传 / 发布 / 回读浏览器闭环，然后由用户明确授权是否切换员工端 release。
