# 大爱归心薪资企微双人 0 元测试记录（2026-06-18）

## 结论

已在生产环境完成一次明确标记为测试的双人 0 元薪资条批次，并通过大爱归心企业微信应用发送给测试对象。

- 月份：`2026-06`
- 发布批次：`salary-publish-2026-06-codex-daai-two-person-zero`
- 通知链接：`https://management.hui-health.com/payroll/mine?month=2026-06&from=wecom-test`
- 状态：`sent`
- 本次未切换员工端正式 release。
- 本次未写入 `PayrollDraftBatch`。

## 生产通道确认

部署后在生产容器内确认：

- `https://management.hui-health.com` 解析为 `employee` 应用，AgentId `1000025`。
- `https://crm.hui-health.com` 仍解析为 `crm` 应用，AgentId `1000024`。
- 新发送接口 `POST /api/salary-notify-logs/send` 已上线，未登录访问返回 401，未触发发送。
- 员工端正式 release 仍为 `20260616090241`，`current` 仍指向 `releases/20260616090241`。

## 测试对象

| 对象 | 企业微信 userid | 测试 teacherId | 金额 |
| --- | --- | --- | ---: |
| 崔以达（企微通道测试） | `edwardtsuei` | `codex-test-edwardtsuei-20260618` | 0 |
| 周立猛（企微通道测试） | `DaDiShangDeYiXiangZhe` | `codex-test-limeng-20260618` | 0 |

说明：第一次尝试复用真实 `teacherId` 时，生产表的 `SalarySlip_month_teacherId_key` 唯一约束阻止了写入；该尝试没有留下目标测试批次的薪资条或通知记录。随后改用明确的 `codex-test-*` teacherId，仍保留真实 `userId / wecomUserId / loginAccount` 用于通知和本人读回。

## API 执行结果

`POST /api/salary-slips/sync`：

- `ok=true`
- `createdCount=2`
- `updatedCount=0`
- `skippedCount=0`
- `warnings=[]`

`POST /api/salary-notify-logs/send-test` dry-run：

- `status=preview`
- `delivered=2`
- `skipped=0`
- `failed=0`

`POST /api/salary-notify-logs/send-test` real send：

- `status=sent`
- `delivered=2`
- `skipped=0`
- `failed=0`

读回核对：

- `GET /api/salary-slips?month=2026-06&publishBatchId=salary-publish-2026-06-codex-daai-two-person-zero` 返回 2 条。
- `GET /api/salary-notify-logs?month=2026-06&publishBatchId=salary-publish-2026-06-codex-daai-two-person-zero` 返回 2 条，状态为 `sent` 和 `preview`。

## 剩余事项

财务正式上传薪资并群发企业微信薪资条前，还需要完成：

- 财务账号在正式入口完成上传、解析、确认发布的浏览器验收。
- 员工端 `apps/employee-frontend` 候选 release 的 Go / No-Go。
- 正式切换员工端 release 前，继续保持 `20260616090241` 可回滚。
