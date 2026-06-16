# 企业微信接入与排错 Runbook

更新时间：2026-05-11

## 覆盖范围

当前 CRM 已接入以下企业微信能力：

- 企业微信扫码登录与账号绑定
- 成员通讯录搜索、管理员手动绑定、清除绑定
- 企业微信通知发送、送达状态查看、失败重试
- 企业微信回调验签、解密与日志落库
- CRM 日程同步到企业微信日历
- 管理中心企业微信监控页：`/management/wecom`

## 环境变量

API 进程需要配置：

```bash
APP_BASE_URL=https://crm.hui-health.com
WECOM_CORP_ID=
WECOM_AGENT_ID=
WECOM_SECRET=
WECOM_TOKEN=
WECOM_AES_KEY=
WECOM_BASE_URL=https://qyapi.weixin.qq.com
WECOM_CALENDAR_ID=
WECOM_CALENDAR_RETRY_LIMIT=5
```

字段说明：

- `APP_BASE_URL`：CRM 外网访问地址，用于扫码回调与企业微信卡片消息跳转。
- `WECOM_CORP_ID`：企业 ID。
- `WECOM_AGENT_ID`：自建应用 AgentId。
- `WECOM_SECRET`：自建应用 Secret。
- `WECOM_TOKEN`：企业微信回调 Token。
- `WECOM_AES_KEY`：企业微信回调 EncodingAESKey。
- `WECOM_BASE_URL`：默认 `https://qyapi.weixin.qq.com`。
- `WECOM_CALENDAR_ID`：用于同步 CRM 日程的企业微信日历 ID。
- `WECOM_CALENDAR_RETRY_LIMIT`：日历同步自动重试上限，默认 `5`。同步成功后会清零。

## 企业微信后台配置

在企业微信管理后台完成：

1. 创建或选择 CRM 自建应用。
2. 设置应用可见范围，确保需要登录 CRM 的成员都在范围内。
3. 配置网页授权可信域名为 CRM 域名，例如 `crm.hui-health.com`。
4. 配置授权回调地址指向登录页：`https://crm.hui-health.com/login`。
5. 配置接收消息/事件回调：
   - URL：`https://crm.hui-health.com/api/wecom/callback`
   - Token：填入 `WECOM_TOKEN`
   - EncodingAESKey：填入 `WECOM_AES_KEY`
6. 准备企业微信日历，并把日历 ID 写入 `WECOM_CALENDAR_ID`。
7. 确认 CRM 自建应用具备日历/日程接口权限；至少需要能调用日历列表、创建日程、更新日程、删除日程相关接口。

### CRM 同步日历要求

当前生产日历：

- 日历名称：`洄归CRM日程`
- `cal_id`：`wcVsZJDAAAO1E2gWQdU4b0XDygS7gqoA`
- 当前管理员：`edwardtsuei`

后续可以在企业微信日历中继续增加管理员。只要日程负责人已绑定企业微信，CRM 创建日程时会把该负责人的 `wecomUserId` 写入企业微信日程 `admins` 和 `attendees`。

创建或更换日历后，需要更新生产 `.env` 中的 `WECOM_CALENDAR_ID` 并重启 API 容器。建议随后在 `/schedule` 建一条测试日程，再到 `/management/wecom` 确认状态为「已同步」。

## 数据库迁移

本次企业微信补齐新增了：

- `WecomCallbackLog`
- `WecomCalendarSync`
- `WecomSyncStatus`

部署前建议先执行本地回归：

```bash
npm run test:wecom
npm run lint
```

部署后执行：

```bash
npm run db:migrate:deploy
npm run db:generate
```

## 上线后验收

完整逐项验收请使用：

- `docs/wecom-uat-checklist-2026-05-11.md`

1. 检查系统设置集成状态：
   - 打开 `/settings`
   - 确认企业微信字段不再缺失。
   - 确认 `Corp ID`、`Agent ID`、`Secret`、`回调 Token`、`AES Key`、`日历 ID` 都显示为已配置。

2. 验证扫码登录：
   - 打开 `/login`
   - 使用企业微信扫码登录。
   - 未绑定成员应提示联系管理员或先完成绑定。

3. 验证成员绑定：
   - 打开 `/management/members`
   - 搜索企业微信通讯录成员。
   - 绑定一个 CRM 成员，并发送测试通知。

4. 验证通知卡片：
   - 触发任务指派、审批或周报通知。
   - 企业微信内应收到卡片消息，按钮为「前往查看」。
   - 点击后应进入 CRM 对应页面。

5. 验证日历同步：
   - 在 `/schedule` 新建一个真实日程。
   - 负责人必须已绑定企业微信。
   - 打开 `/management/wecom`，确认日历同步为「已同步」或查看失败原因。
   - 修改标题或时间后，企业微信日程应同步更新。
   - 删除 CRM 日程后，企业微信日程应变成删除状态，CRM 同步记录为 `DELETED`。

6. 验证回调日志：
   - 在企业微信后台重新保存回调配置或触发应用事件。
   - 打开 `/management/wecom`，确认回调日志出现记录。

7. 运行 HTTPS 回归检查：

```bash
CRM_DOMAIN=crm.hui-health.com CRM_EXPECT_WECOM_ENABLED=true ./scripts/ops/check-crm-https.sh
```

## 管理与排错

### 企业微信监控页

入口：`/management/wecom`

可查看：

- 日历同步状态、失败原因、重试次数
- 企业微信通知送达状态
- 企业微信回调日志

日历同步失败时，可点击「重试」。

如果存在多条失败记录，可点击「重试失败项」。系统会返回扫描、重试、成功、失败、跳过数量。

### 手动调试接口

以下接口仅用于管理或排错，已限制为具备成员管理权限的账号调用：

- `POST /api/wecom/message/send`
- `POST /api/wecom/calendar/create`
- `POST /api/wecom/calendar/update`
- `POST /api/wecom/calendar/delete`

普通 CRM 日程同步不需要直接调用这些接口；日常使用应通过 `/schedule` 新增、修改、删除日程。

### 自动巡检与重试

API 启动后会每 10 分钟巡检企业微信日历同步记录：

- 范围：`PENDING` 和 `FAILED`
- 每轮最多处理 10 条
- 只重试有关联 CRM 日程的记录
- 已删除或缺少关联任务的孤儿记录会标记为 `DELETED`
- 默认最多连续重试 5 次，可通过 `WECOM_CALENDAR_RETRY_LIMIT` 调整
- 同步成功后 `retryCount` 会归零

巡检日志关键词：

```text
企业微信日历巡检完成
```

### 常见问题

**扫码登录提示企业微信未配置完整**

检查：

- `WECOM_CORP_ID`
- `WECOM_AGENT_ID`
- `WECOM_SECRET`
- API 进程是否已重启

**扫码后提示未识别内部成员身份**

检查：

- 企业微信应用可见范围是否包含该成员
- 登录成员是否属于当前企业
- 企业微信后台网页授权可信域名是否正确

**企业微信通知失败**

检查：

- 成员是否已绑定 `wecomUserId`
- 自建应用是否可向该成员发送消息
- `/management/wecom` 中的通知与错误记录

**消息卡片不能跳转**

检查：

- `APP_BASE_URL` 是否为 HTTPS 外网地址
- 企业微信客户端是否能访问该域名
- CRM 登录状态是否有效

**回调配置校验失败**

检查：

- URL 是否为 `https://crm.hui-health.com/api/wecom/callback`
- `WECOM_TOKEN` 是否与企业微信后台一致
- `WECOM_AES_KEY` 是否与企业微信后台一致
- `WECOM_CORP_ID` 是否正确

**日历同步失败**

检查：

- `WECOM_CALENDAR_ID` 是否已配置
- 日程负责人是否绑定企业微信
- 企业微信应用是否有日历相关权限
- `/management/wecom` 中的 `lastSyncError`

常见错误：

- `field schedule.reminders expect type object`：`reminders` 必须是 object，不能传数组。
- `schedule.reminders.remind_before_event_secs ... invalid`：提醒提前量过长；CRM 已限制最多提前 24 小时。
- `api forbidden (48002)`：常见原因是企业微信日程接口权限未开，或日程 payload 仍使用旧字段。当前 CRM 使用新版 `admins` 字段，并携带 `agentid`。
- `WECOM_CALENDAR_ID 未配置`：生产 `.env` 缺少日历 ID，或 API 容器尚未重启。
- `日程负责人未绑定企业微信`：到 `/management/members` 绑定该负责人的企业微信成员。

### 日程接口字段注意事项

企业微信日程创建/更新接口当前使用：

- 顶层 `agentid`
- `schedule.cal_id`
- `schedule.admins`
- `schedule.attendees`
- `schedule.reminders`

不要把 `admins` 写成旧版 `organizer`；不要把 `reminders` 写成数组。

## 回滚建议

如企业微信接口异常，不需要回滚 CRM 主功能：

- 清空或移除 `WECOM_CALENDAR_ID` 可暂停日历同步，CRM 日程仍可保存。
- 清空 `WECOM_SECRET` 会使企业微信登录与消息发送不可用，但账号密码登录仍可使用。
- 回调落库失败不会阻断企业微信回调返回 `success`。

## 相关代码

- 后端企业微信模块：`apps/api/src/modules/wecom`
- 通知发送与重试：`apps/api/src/modules/notifications/notification.service.ts`
- 日历自动巡检：`apps/api/src/modules/wecom/wecom-calendar-retry.service.ts`
- 日历同步核心：`apps/api/src/modules/wecom/wecom-calendar.service.ts`
- 管理端监控接口：`apps/api/src/management/management.service.ts`
- 管理端监控页面：`apps/web/app/(dashboard)/management/wecom/page.tsx`
- 回归测试：`tests/wecom-regression.test.ts`
