# 道冲手机端 B 线结算/耗卡发布归档

日期：2026-06-25

状态：`bline_settlement_consumption_narrow_release_smoke_passed`

## 发布信息

- 发布线：B 线结算/耗卡手机端 UI 与接口源码。
- 发布标签：`daochong-mobile-bline-settlement-consumption-20260624-1530`。
- 生产备份：`/opt/huigui-backups/daochong-mobile-bline-settlement-consumption-20260624-1530.tar.gz`。
- 发布窗口：2026-06-24 23:29 到 23:40（Asia/Shanghai）。
- 发布方式：`scripts/ops/daochong-mobile-narrow-release.mjs --execute`。

## 本轮上线内容

- 结算草稿：保存草稿、更新草稿、提交审批入口源码已发布。
- 耗卡审批：审批通过、退回补充入口源码已发布。
- 手机端 UI：服务结算面板和耗卡审批面板已发布到 `management.hui-health.com/daochong-mobile`。
- 只读刷新：提交后仍走只读刷新链路，不直接打开扣卡、财务确认或企业微信发送。
- 发布脚本保护：窄发布脚本默认保持 `DAOCHONG_MOBILE_WRITE_ENABLED=false`，只有后续单独明确设置 `DAOCHONG_RELEASE_ENABLE_PRODUCTION_WRITES=true` 才允许打开生产写入。

## 发布前本地验收

- `npm run verify:daochong-mobile-write`：通过。
- `npm run test:daochong-mobile-write`：20/20 通过。
- `npm run lint -w @huigui/api`：通过。
- `npm run lint -w @huigui/web`：通过。
- `npm run verify:daochong-mobile-readonly`：通过，保留无灰度 URL 的预期提醒。
- `npm run precheck:daochong-mobile-cutover`：`ready_for_manual_go_no_go`，仍需人工确认才能进入更高风险动作。

## 发布执行结果

- 生产备份已创建。
- 合并文件和道冲手机端源码已同步。
- 生产 Prisma schema 校验通过。
- `npx prisma migrate deploy` 结果：没有待应用 migration。
- `api`、`app` 镜像构建完成。
- `api`、`app`、`nginx` 已重启并保持运行。

## 发布后 smoke

| 检查项 | 结果 |
| --- | --- |
| `https://management.hui-health.com/api/health` | 200 |
| `https://management.hui-health.com/daochong-mobile` | 200 |
| `https://management.hui-health.com/daochong-mobile-preview` | 200 |
| `https://crm.hui-health.com/daochong-mobile` | 200 |
| `GET /api/daochong/mobile/settlement-drafts` 未登录访问 | 401 |
| `GET /api/daochong/mobile/consumption-approvals` 未登录访问 | 401 |

页面包内已确认以下 B 线标记存在：

- `daochong-settlement-draft-write-panel`
- `daochong-settlement-draft-save`
- `daochong-settlement-draft-submit`
- `daochong-consumption-approval-panel`
- `daochong-consumption-approve`
- `daochong-consumption-return`

页面文案已确认：

- `api-readonly`
- `只读请求已开启`
- `服务结算`
- `耗卡审批`
- `结算草稿`

## 生产保护状态

- `ENABLE_DAOCHONG_MOBILE_GRAY=true`
- `NEXT_PUBLIC_ENABLE_DAOCHONG_MOBILE_GRAY=true`
- `NEXT_PUBLIC_DAOCHONG_MOBILE_DATA_SOURCE=api-readonly`
- `NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH=true`
- `DAOCHONG_MOBILE_SHADOW_READONLY=true`
- `DAOCHONG_MOBILE_HIGH_RISK_READONLY=true`
- `DAOCHONG_MOBILE_WRITE_ENABLED=false`
- `DAOCHONG_WECOM_TEST_SEND_ENABLED=false`
- `DAOCHONG_WECOM_TEST_ALLOWLIST=`

## 明确未执行

- 未创建真实结算草稿。
- 未提交真实耗卡审批。
- 未通过或退回真实审批。
- 未扣卡。
- 未入账。
- 未确认财务。
- 未发企业微信。
- 未做真实客户资料 smoke。

## 下一步边界

- 客户真实资料未到位前，不做真实充值、真实结算或真实耗卡 smoke。
- 如后续要测试写入链路，必须重新进入单独确认门，并明确是否允许打开 `DAOCHONG_MOBILE_WRITE_ENABLED`。
- 如后续要做企业微信测试发送，必须单独确认测试目标和 allowlist。
- 如后续要入账、扣卡或财务确认，必须单独确认生产写入与回滚方案。
