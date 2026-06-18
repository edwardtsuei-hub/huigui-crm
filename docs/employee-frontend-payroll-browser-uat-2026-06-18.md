# 员工端薪资前端浏览器验收记录（2026-06-18）

## 结论

员工端薪资前端已完成本地真实浏览器验收。

- 验收页面：`apps/employee-frontend`
- 验收方式：Chrome 实际点击 + 本地隔离 API
- 上传文件：`/tmp/browser-uat-resolved.csv`
- 验收月份：`2026-06`
- 发布批次：`salary-publish-2026-06-20260618042059`
- 正式员工端入口：未切换
- 生产数据库：本次浏览器验收未写入
- 企业微信：本次浏览器验收未发送
- 部署 / 重启：未执行

## 浏览器验收结果

已通过：

- 登录页可输入本地测试账号和密码，并进入员工端。
- `/finance/imports?type=salary_slip&month=2026-06&returnTo=/payroll/batch` 能打开导入中心。
- 导入中心显示上传薪资表、薪资表类型、返回核对入口。
- Chrome 文件选择器能选择 `/tmp/browser-uat-resolved.csv`。
- 上传后页面显示 `已保存薪资表草稿，可返回核对。`
- 上传预览显示 `可发布`，3 行明细均为 `已处理`。
- `/payroll/batch?month=2026-06` 能读回薪资草稿。
- 页面显示薪资草稿文件名、发布批次、3 行明细、实发合计 `¥19,500.00`、1 人可企微通知、2 人跳过通知。
- 发布按钮在未勾选“我已核对原始薪资表 / 我已确认通知名单”前保持禁用。
- 勾选两项确认后，发布按钮启用。
- 点击发布后，本地隔离接口完成 dry-run 闭环，页面提示：`已发布 3 条薪资条；本地 dry-run：可通知 1 人，未发送真实企业微信。`
- 发布追溯读回：正式薪资条 `3 条`，通知记录 `1 条`。

## 本地 API 调用记录

结果文件：

- `output/employee-frontend/payroll-browser-uat-20260618-pr38/local-api-calls.json`
- `output/employee-frontend/payroll-browser-uat-20260618-pr38/browser-uat-result.json`

本地 API 内存状态：

- 草稿批次：`1`
- 薪资条：`3`
- 通知记录：`1`

关键调用：

- `PUT /api/payroll/draft-batches/2026-06`：保存上传草稿。
- `POST /api/salary-slips/sync`：本地同步 3 条薪资条。
- `POST /api/salary-notify-logs/send`：本地 dry-run 通知记录 1 条；没有连接真实企业微信。
- `GET /api/salary-slips` 和 `GET /api/salary-notify-logs`：发布后读回追溯数据。

## 安全边界

- 生产数据库 touched：否
- 生产 SQL generated：否
- 真实企业微信发送：否
- 部署：否
- 重启：否
- 正式员工端 release 切换：否
- rollback tag：否

## 已完成的配套检查

- `npm run test:payroll`：通过，50 项。
- `npm run test:wecom`：通过，9 项。
- `npm run lint:employee`：通过。
- PR #38 合并后生产只读门禁：通过，`deploymentAllowed=false` 仍保持。
- PR #38 合并后 payroll DB verify：通过，blockers / failures / warnings 均为 0。

## 当前判断

员工端薪资前端本地浏览器验收通过，支持进入最终发布决策。

仍未执行正式发布动作。下一步只能在用户明确授权后进入灰度 / 正式 release 切换，并保留旧 release 回滚路径。
