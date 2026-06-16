# 大爱归心班表 JSON dry-run 只读报告

生成时间：2026-06-16
范围：`/opt/huigui-crm/storage/uploads/employee-launch-contract/roster.json`
状态：只读报告。未修改数据库、未修改业务代码、未迁移任何数据。

## 结论

当前班表仍以服务器本地 JSON 为主数据源。现有 `roster.json` 可以稳定解析为未来数据库表所需的周、团队、人员、每日班次、备注和发布信息。

当前文件摘要：

- 文件：`/opt/huigui-crm/storage/uploads/employee-launch-contract/roster.json`
- sha16：`5058a37e1547dfdb`
- version：2
- updatedAt：2026-06-14T00:01:24.789Z
- 团队：`bearhug-front`、`bearhug-kitchen`、`daochong`

## dry-run 总数

### latest drafts

| 指标 | 数量 |
| --- | ---: |
| weekCount | 3 |
| rowCount | 15 |
| shiftCount | 105 |
| noteCount | 0 |

### latest published

| 指标 | 数量 |
| --- | ---: |
| weekCount | 3 |
| rowCount | 15 |
| shiftCount | 105 |
| noteCount | 0 |

### draftsByWeek

| 指标 | 数量 |
| --- | ---: |
| weekCount | 6 |
| rowCount | 29 |
| shiftCount | 203 |
| noteCount | 1 |

### publishedByWeek

| 指标 | 数量 |
| --- | ---: |
| weekCount | 6 |
| rowCount | 30 |
| shiftCount | 210 |
| noteCount | 1 |

## 已发布历史周次

| teamId | weekKey | status | rows | shifts | notes | actor | updatedAt |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| `bearhug-front` | `06/15-06/21` | published | 5 | 35 | 0 | 彦蕊 | 2026-06-14T00:01:24.789Z |
| `bearhug-kitchen` | `06/01-06/07` | published | 5 | 35 | 0 | 申琦 | 2026-06-02T04:39:50.918Z |
| `bearhug-kitchen` | `06/08-06/14` | published | 5 | 35 | 0 | 申琦 | 2026-06-07T08:34:51.693Z |
| `bearhug-kitchen` | `06/15-06/21` | published | 5 | 35 | 0 | 申琦 | 2026-06-12T07:45:21.044Z |
| `daochong` | `06/08-06/14` | published | 5 | 35 | 1 | Lisa Li | 2026-06-07T12:13:11.025Z |
| `daochong` | `06/15-06/21` | published | 5 | 35 | 0 | 马立新～燕子 | 2026-06-12T09:22:54.916Z |

## latest published 当前周

### 熊抱前厅

- teamId：`bearhug-front`
- weekKey：`06/15-06/21`
- periodMode：`week`
- status：`published`
- rows：5
- shifts：35
- actor：彦蕊
- 人员快照：
  - lisa：`熊抱大地-lisa-lisali`
  - 阿蕊：`熊抱大地-阿蕊-Han`
  - 罗凯欣：`熊抱大地-罗凯欣-LuoKaiXin`
  - 迦迦：`熊抱大地-迦迦-part-time`
  - 翁姆：`熊抱大地-翁姆-front`

### 熊抱后厨

- teamId：`bearhug-kitchen`
- weekKey：`06/15-06/21`
- periodMode：`week`
- status：`published`
- rows：5
- shifts：35
- actor：申琦
- 人员快照：
  - 申琦：`熊抱大地-申琦-greatchef`
  - 关植海：`熊抱大地-关植海-kitchen`
  - 李洁：`熊抱大地-李洁-kitchen`
  - 陈武强：`熊抱大地-陈武强-kitchen`
  - 张玉：`熊抱大地-张玉-kitchen`

### 道冲元气

- teamId：`daochong`
- weekKey：`06/15-06/21`
- periodMode：`month`
- periodLabel：`06月整月`
- status：`published`
- rows：5
- shifts：35
- actor：马立新～燕子
- 人员快照：
  - 程程：`道冲元气-程程-ChengCheng`
  - 燕子：`道冲元气-燕子-Malixin`
  - 慧心：`道冲元气-慧心-huixin`
  - 觉心：`道冲元气-觉心-JiaoXin`
  - 子青：`道冲元气-子青-0da36207717ef93360b0e5115daba6ab`

## 建议转换规则

### RosterWeek

每个 teamId + weekKey + status 生成一条 `RosterWeek`。

建议唯一键：

```text
teamKey + weekKey + status + partitionKey
```

字段映射：

| JSON 字段 | RosterWeek 字段 |
| --- | --- |
| `teamId` | `teamKey` |
| `teamLabel` | `teamLabel` |
| `weekKey` | `weekKey` |
| `weekLabel` | `weekLabel` |
| `periodMode` | `periodMode` |
| `periodLabel` | `periodLabel` |
| `status` | `status` |
| `updatedAt` | `updatedAt` 或 `sourceUpdatedAt` |
| `publishedAt` | `publishedAt` |
| `actorName` | `actorName`，后续再映射 `actorUserId` |

### RosterShift

每个 row + day 生成一条 `RosterShift`。

建议唯一键：

```text
rosterWeekId + personExternalId + dayLabel
```

字段映射：

| JSON 字段 | RosterShift 字段 |
| --- | --- |
| `row.person.id` | `personExternalId` |
| `row.person.name` | `personName` |
| `row.person.role` | `role` |
| `row.person.department` | `department` |
| `row.person.teamId` | `teamKey` |
| `day.day` | `dayName` |
| `day.label` | `dateLabel` |
| `row.shifts[day.day]` | `shiftLabel` |
| `row.notes[day.day]` | `notesJson` |

第一期可先保留 `personExternalId/personName` 快照，不强制关联 `User.id`。这样能避免人员主数据不完整导致迁移阻塞。

## 需要人工确认的点

1. `periodMode=month` 的道冲元气 06/15-06/21 是否代表整月排班规则，还是只是当前周按整月模式展示。
2. `latest drafts` 中 status 也可能是 `published`，迁移时是否需要保留 drafts/latest 两套索引。
3. `draftsByWeek` 与 `publishedByWeek` 有重叠，应以 `publishedByWeek` 作为已发布主数据，`draftsByWeek` 作为草稿或历史草稿。
4. `actorName` 目前是文本，不一定能直接映射到 `User`。
5. 部分人员是兼职或外部人员，未必有系统账号，例如 `part-time`、`front`、`kitchen` 结尾的 personExternalId。

## 推荐迁移步骤

1. 先只迁 `publishedByWeek`。
2. `draftsByWeek` 作为第二批迁移，或保存为草稿历史。
3. 迁移前输出完整 dry-run 表：
   - RosterWeek 待创建数量。
   - RosterShift 待创建数量。
   - 每个 team/week 的人员数量。
   - 无法解析的班次标签。
   - 无法映射 actor 的发布人。
4. 迁移后 API 先双读对比，不立即切主读源。
5. 对比通过后再让 `/api/roster/workspace` 从数据库回组装旧格式响应。

## 验收标准

1. publishedByWeek 6 个已发布周次全部可在数据库中找到。
2. publishedByWeek 210 条班次全部可在数据库中找到。
3. 06/15-06/21 当前周三个团队各 5 人、35 条班次。
4. 道冲 06/08-06/14 的 1 条 note 不丢失。
5. 清空浏览器 localStorage 后，仍能从服务器看到相同已发布班表。
6. 切换电脑或浏览器后，已发布班表一致。

## 回滚建议

不要删除旧文件：

- `/opt/huigui-crm/storage/uploads/employee-launch-contract/roster.json`

切库初期保留开关：

```text
ROSTER_READ_SOURCE=json|database
ROSTER_WRITE_MODE=json_only|dual_write|database_only
```

如果数据库读出现问题，可临时切回 JSON 主读源。

## 下一步

在用户确认前，不执行真实迁移。

下一位协作者建议先生成 dry-run 脚本，脚本只输出：

- 将创建的 `RosterWeek` JSON。
- 将创建的 `RosterShift` JSON。
- 冲突和无法映射清单。

确认无误后，再生成 Prisma migration 和真实回填脚本。
