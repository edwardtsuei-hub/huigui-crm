# 大爱归心周报 userKey 映射只读报告

生成时间：2026-06-16
范围：`/opt/huigui-crm/storage/uploads/employee-launch-weekly/*.json` 与数据库 `User` / `WeeklyReport`
状态：只读报告。未修改数据库、未修改业务代码、未迁移任何数据。

## 结论

当前周报已经存在数据库版主表，但员工平台旧 workspace 仍保留多份本地 JSON。

本地周报 workspace 当前共 12 份，可以分为四类：

1. 可自动匹配候选：`lisali`、`greatchef`、`edwardtsuei`
2. 共享 workspace：`shared`、`da-ai-gui-xin.weekly-workspace.v1.shared`
3. 测试或 smoke：`employee-launch-weekly-smoke`、`weekly-summary-smoke-*`、`*.test`
4. 数据库已有但本地没有对应 workspace：`LuoKaiXin`

迁移时不要把全部 JSON 直接写成个人周报。尤其 `shared` 不能归到单一用户。

## 数据库现状

只读检查结果：

- `User`：24 条
- `Role`：11 条
- `WeeklyReport`：3 条

数据库 `WeeklyReport` 当前记录：

| loginAccount | status | weekStartDate | partitionKey | updatedAt |
| --- | --- | --- | --- | --- |
| `lisali` | `SUBMITTED` | 2026-06-14 | `REAL` | 2026-06-15 12:37:04 |
| `LuoKaiXin` | `DRAFT` | 2026-05-31 | `REAL` | 2026-05-29 05:55:09 |
| `admin` | `DRAFT` | 2026-04-19 | `REAL` | 2026-04-17 15:05:34 |

## userKey 标准化规则

旧员工平台 key 需要先做标准化：

```text
da-ai-gui-xin.weekly-workspace.v1.lisali -> lisali
da-ai-gui-xin.weekly-workspace.v1.shared -> shared
da-ai-gui-xin.weekly-workspace.v1.greatchef -> greatchef
```

建议迁移脚本统一用：

```text
canonicalUserKey = userKey 去掉 /^da-ai-gui-xin\.weekly-workspace\.v\d+\./ 前缀
```

## 本地 workspace 分类

| userKey | canonicalUserKey | 状态 | teamReports | sha16 | 建议处理 |
| --- | --- | --- | ---: | --- | --- |
| `da-ai-gui-xin.weekly-workspace.v1.bearhug.test` | `bearhug.test` | draft | 0 | `cbbd50f1711be9e9` | 测试账号，默认不进真实周报 |
| `employee-launch-weekly-smoke` | `employee-launch-weekly-smoke` | submitted | 3 | `cb31c83c1440443d` | smoke 数据，默认不迁移 |
| `weekly-summary-smoke-20260531092913` | 同左 | draft | 3 | `d4cd0a8fd0f0215b` | smoke 数据，默认不迁移 |
| `weekly-summary-smoke-20260531093323` | 同左 | draft | 3 | `b6f3c1853810ef5b` | smoke 数据，默认不迁移 |
| `weekly-summary-smoke-20260531093555` | 同左 | draft | 3 | `36bf7f4389c3bb92` | smoke 数据，默认不迁移 |
| `shared` | `shared` | draft | 16 | `1a8937dd4a8dd53d` | 共享 workspace，需人工拆分或转团队摘要 |
| `da-ai-gui-xin.weekly-workspace.v1.edwardtsuei` | `edwardtsuei` | draft | 3 | `7ab49224bb56969b` | 可匹配候选，需确认是否归 `admin` |
| `da-ai-gui-xin.weekly-workspace.v1.shared` | `shared` | submitted | 11 | `f114ef8c8df3b6c5` | 共享 workspace，需人工拆分或转团队摘要 |
| `lisali` | `lisali` | submitted | 3 | `a7534321040aead8` | 可匹配 `lisali`，数据库已有 2026-06-14 周报，避免覆盖 |
| `da-ai-gui-xin.weekly-workspace.v1.greatchef` | `greatchef` | draft | 3 | `5f46f495590685cb` | 可匹配 `greatchef`，数据库暂未见周报 |
| `da-ai-gui-xin.weekly-workspace.v1.daochong.test` | `daochong.test` | draft | 0 | `978287c9e9b0dc3e` | 测试账号，默认不进真实周报 |
| `da-ai-gui-xin.weekly-workspace.v1.lisali` | `lisali` | submitted | 1 | `ae7f7ed4bc296647` | 可匹配 `lisali`，但比数据库现有记录早，建议作为历史 payload |

## 自动匹配建议

### 可以自动候选，但仍需 dry-run 确认

- `lisali`
  - 匹配数据库用户 `loginAccount=lisali`
  - 已存在数据库周报，不应直接覆盖。
  - 建议把两个本地 workspace 作为 `WeeklyReportPayload` 历史来源保存。

- `greatchef`
  - 匹配数据库用户 `loginAccount=greatchef`
  - 当前数据库未见对应周报。
  - 可在 dry-run 中生成待创建草稿，但真实创建前要确认日期周期。

- `edwardtsuei`
  - 可匹配到 `admin` 账号的企业微信身份候选。
  - 因为 canonical key 不是 loginAccount，建议人工确认后再归属。

### 不应自动个人化

- `shared`
- `da-ai-gui-xin.weekly-workspace.v1.shared`

原因：

- `shared` 里有多人的 `teamReports`。
- 它更像团队工作台或公开汇总，不是个人周报。
- 建议迁为团队摘要、公开 digest、或拆成多条个人周报后人工确认。

### 默认排除

- `employee-launch-weekly-smoke`
- `weekly-summary-smoke-*`
- `bearhug.test`
- `daochong.test`

这些应进入测试数据归档或跳过真实迁移。

## 推荐迁移策略

第一步：新增 `WeeklyReportPayload`，不要覆盖 `WeeklyReport`。

字段建议：

- `weeklyReportId`
- `source`
- `sourceUserKey`
- `sourceFileName`
- `sourceSha16`
- `payloadJson`
- `migrationStatus`
- `migrationNote`

第二步：dry-run 生成三张清单。

1. `autoMatchCandidates`
2. `sharedWorkspaces`
3. `excludedTestWorkspaces`

第三步：对 `lisali` 做冲突处理。

- 数据库已有 2026-06-14 周报。
- 本地 `lisali` 记录 savedAt 为 2026-06-15，可能是同一周期最新来源。
- 旧前缀版 `da-ai-gui-xin.weekly-workspace.v1.lisali` savedAt 为 2026-06-04，建议作为历史 payload，不覆盖。

第四步：确认 `shared` 处理方式。

可选方案：

1. 转 `WeeklyPublicDigest`
2. 转团队周报摘要
3. 按 `teamReports` 人名拆分
4. 只归档为 legacy payload，不进入正式周报

## 验收标准

1. 所有 12 个本地 JSON 都有 sha16 留痕。
2. 自动匹配项不直接覆盖已存在的数据库周报。
3. `shared` 不被错误归入某个个人账号。
4. 测试和 smoke 数据不会进入真实 `REAL` 周报。
5. 迁移后普通员工仍只能看到自己的个人周报，管理角色按权限看团队周报。

## 下一步

在用户确认前，不执行真实迁移。

下一位协作者建议先写 dry-run 脚本，输出：

- 每个 JSON 对应的用户候选。
- 是否会创建新 `WeeklyReport`。
- 是否只创建 `WeeklyReportPayload`。
- 是否跳过。
- 冲突原因。
