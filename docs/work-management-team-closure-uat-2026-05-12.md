# 工作管理团队周报闭环 V1（2026-05-12）

## 结论

- 工作管理页已补上团队周报闭环入口。
- 主管可在 `/work-management/weekly-reports` 侧栏看到当前周次的团队差异视图，并直接完成催交和计划派生待办。
- 本轮只做周报闭环最小可用版，不改月目标结构。

## 已实现

1. 团队周报差异视图
   - 新增接口：`GET /api/work-management/weekly-reports/team-closure`
   - 按当前周次返回可管理成员的状态：
     - `MISSING`
     - `DRAFT`
     - `RETURNED`
     - `SUBMITTED`
     - `APPROVED`
   - 返回总人数、待催交、缺交、草稿、退回、已提交、已通过等统计。

2. 一键催交
   - 新增接口：`POST /api/work-management/weekly-reports/remind`
   - 只催交缺交、草稿、退回成员。
   - 支持指定 `userIds` 催交单个成员。
   - 催交会写入系统通知并通过企业微信事件通知发送。

3. 周报计划派生待办
   - 新增接口：`POST /api/work-management/weekly-reports/:id/derive-tasks`
   - 主管查看团队成员周报时，可把有计划时间且尚未生成任务的计划项派生为待办。
   - 派生后会回写 `WeeklyReportPlanItem.taskId`，避免重复生成。
   - 成员会收到系统通知和企业微信通知。

4. 前端入口
   - `/work-management/weekly-reports` 右侧新增 `团队周报闭环` 卡片。
   - 卡片展示闭环统计、待催交成员列表、单人催交按钮。
   - 当前打开团队成员周报时，显示 `派生待办` 操作。

## 验收方式

1. 用有 `action.work_management.review` 权限的主管账号打开：
   - `https://crm.hui-health.com/work-management/weekly-reports`
2. 查看右侧 `团队周报闭环`：
   - 确认总成员、待催交、已提交、已通过等数字与实际团队状态一致。
   - 缺交、草稿、退回成员应优先显示。
3. 点击 `一键催交`：
   - 缺交、草稿、退回成员收到企业微信或系统通知。
   - 已提交 / 已通过成员不会被催交。
4. 打开一份团队成员周报：
   - 若该周报有计划时间且尚未生成待办，右侧显示 `派生待办（N）`。
   - 点击后确认任务中心出现对应待办。
   - 再次点击不会重复生成同一计划项的待办。

## 回归测试

- 新增脚本：`npm run test:work-management`
- 覆盖：
  - 团队周报差异统计
  - 指定成员催交通知
  - 未派生计划项生成待办并回写 `taskId`

## 本轮验证

- `npm run test:work-management`
- `npm run lint -w @huigui/api`
- `npm run lint -w @huigui/web`

## 下一步

- 月目标团队闭环：
  - 月目标催交
  - 月目标差异视图
  - 月目标项派生任务
- 通知 / 日程处理动作：
  - 通知里直接确认、跳转、稍后提醒
  - 日程中直接回写任务状态
