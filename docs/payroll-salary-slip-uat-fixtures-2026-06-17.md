# 薪资条上传与发送 UAT 样例（2026-06-17）

## 样例文件

可发布样例：

```text
tests/fixtures/payroll/salary-upload-uat-resolved-2026-06.csv
```

差异阻断样例：

```text
tests/fixtures/payroll/salary-upload-uat-unresolved-2026-06.csv
```

## 可发布样例预期

- 总行数：4。
- 可企微通知：2。
- 跳过通知：2。
- 同名员工：2 位，必须依赖 `员工ID / 用户ID / 企业微信账号 / 登录账号` 隔离。
- 合作老师：跳过企业微信通知。
- 无企微账号员工：跳过企业微信通知，但仍生成薪资条。

发布后应确认：

- `salary-slips/sync` 被调用。
- 每一行都带 `teacherId / userId / wecomUserId / loginAccount` 中的明确身份字段。
- 返回 `/payroll/batch`。
- 通知记录保存 `publishBatchId`。
- 员工本人查询不能因同名看到另一人的薪资条。

## 差异阻断样例预期

- 总行数：1。
- 未处理差异：1。
- 发布应被阻断。
- 阻断前不得调用 `salary-slips/sync`。

## 使用边界

- 这些样例只用于本地 / 测试库 / UAT。
- 不写生产数据库。
- 不用于真实薪资金额。
- 员工端 Vite 候选正式接入 release 前，不能用这些样例直接修改压缩发布包。

## 生成后端 API payload

在员工端 Vite 候选完成测试账号验收前，可以先用样例生成后端接口 payload：

```bash
npm run fixture:payroll-payload -- \
  --csv tests/fixtures/payroll/salary-upload-uat-resolved-2026-06.csv \
  --month 2026-06 \
  --out-dir output/payroll/uat-payloads \
  --synced-by "UAT 财务"
```

可发布样例会生成：

```text
summary.json
salary-slips-sync.json
salary-notify-log.json
```

其中：

- `salary-slips-sync.json` 对应 `POST /salary-slips/sync`。
- `salary-notify-log.json` 对应 `POST /salary-notify-logs`。
- 两份 payload 使用同一个 `publishBatchId`。

如果输入的是差异阻断样例，只会生成 `summary.json`，不会生成发布 payload。

如果 CSV 缺少必要表头（`姓名 / 应发 / 实发`）或缺少整组身份表头（`员工ID / 用户ID / 企业微信账号 / 登录账号 / 系统账号`），只会生成 `summary.json`，状态为 `blocked_missing_required_headers`，不会生成发布 payload。

如果 CSV 中必填金额（`应发 / 实发`）为空或不是有效数字，也只会生成 `summary.json`，状态为 `blocked_invalid_amounts`，不会生成发布 payload。`提成 / 分润 / 扣款` 可为空，空值按 0 处理；如果填写了非数字，则同样阻断。

如果某行缺少明确身份字段（`员工ID / 用户ID / 企业微信账号 / 登录账号`），只会生成 `summary.json`，状态为 `blocked_missing_identity`，不会用姓名生成临时 ID 发布。

CSV 解析支持标准引号单元格，金额可以写成 `"12,000"`，姓名或备注字段中出现逗号也不会拆坏列。

Excel 导出的 UTF-8 BOM 会被清理，不会导致第一列表头 `姓名` 识别失败。

## 测试 API dry-run 与提交

先生成调用计划，不写数据库：

```bash
npm run uat:payroll-api -- \
  --payload-dir output/payroll/uat-payloads \
  --api-base-url http://127.0.0.1:4000/api \
  --out output/payroll/uat-payloads/api-submit-dry-run.json
```

计划里应包含：

- `writesDatabase: false`
- `POST /salary-slips/sync`
- `POST /salary-notify-logs`
- `GET /salary-slips?month=...&publishBatchId=...`
- `GET /salary-notify-logs?month=...&publishBatchId=...`
- 同一个 `publishBatchId`
- 执行模式下会校验 `salary-slips/sync` 响应，校验通过后才会记录通知日志。

测试库确认后才执行：

```bash
PAYROLL_UAT_TOKEN="测试库财务账号 JWT" \
npm run uat:payroll-api -- \
  --payload-dir output/payroll/uat-payloads \
  --api-base-url http://127.0.0.1:4000/api \
  --token-env PAYROLL_UAT_TOKEN \
  --out output/payroll/uat-payloads/api-submit-result.json \
  --execute \
  --confirm-test-db PAYROLL_UAT_TEST_DB
```

安全边界：

- 默认 dry-run，不写数据库。
- `--execute` 和 `--confirm-test-db PAYROLL_UAT_TEST_DB` 同时存在才会调用测试 API。
- 生产域名会被拒绝。
- 差异阻断样例不会调用接口。
- `salary-slips/sync` 返回批次号或 teacherIds 异常时，不会继续调用 `salary-notify-logs`。
- 三份 payload 文件的月份、发布批次、行数或通知人数不一致时，会在 dry-run 阶段 blocked，不生成接口调用计划。
- 执行成功后会自动读回正式薪资条和通知记录，确认它们都能按 `publishBatchId` 查到。
- 正式薪资条读回会核对金额字段和明确身份字段，避免接口返回成功但入库数据错位。
- 通知记录读回会核对 `delivered / skipped / failed` 数量，避免通知审计记录和实际 payload 不一致。

## 生成 UAT 审计包

测试 API 执行成功后，生成留档包：

```bash
npm run audit:payroll-package -- \
  --payload-dir output/payroll/uat-payloads \
  --submit-result output/payroll/uat-payloads/api-submit-result.json \
  --out-dir output/payroll/uat-audit-package
```

如果还没有执行测试 API，也可以只基于 payload 生成预审包：

```bash
npm run audit:payroll-package -- \
  --payload-dir output/payroll/uat-payloads \
  --out-dir output/payroll/uat-audit-package
```

审计包应包含：

- `manifest.json`
- `README.md`
- `salary-slips.csv`
- `notify-delivered.csv`
- `notify-skipped.csv`
- `notify-failed.csv`
- `notify-log-readback.json`

验收点：

- `manifest.json` 的 `writesDatabase` 必须为 `false`。
- 测试 API 已执行时，`sourceMode` 应为 `api_readback`。
- 只基于 payload 预审时，`sourceMode` 为 `payload`。
- `files` 中每个输出文件都要有 SHA256。
- 差异阻断样例只允许生成 blocked manifest，不应生成薪资条 CSV。
