# 大爱归心员工数据迁移 dry-run 运行记录

生成时间：2026-06-16
状态：只读 dry-run。未修改数据库、未修改业务代码、未修改现有 JSON 数据。

## 本次新增文件

脚本：

- `/opt/huigui-crm/scripts/migrations/employee-data/weekly-userkey-dryrun.mjs`
- `/opt/huigui-crm/scripts/migrations/employee-data/roster-json-dryrun.mjs`

输出：

- `/opt/huigui-crm/output/employee-data-migration/2026-06-16/users.tsv`
- `/opt/huigui-crm/output/employee-data-migration/2026-06-16/weekly-db.tsv`
- `/opt/huigui-crm/output/employee-data-migration/2026-06-16/weekly-userkey-dryrun.json`
- `/opt/huigui-crm/output/employee-data-migration/2026-06-16/weekly-userkey-dryrun.md`
- `/opt/huigui-crm/output/employee-data-migration/2026-06-16/roster-json-dryrun.json`
- `/opt/huigui-crm/output/employee-data-migration/2026-06-16/roster-json-dryrun.md`

## 输入快照

生成了两个只读 TSV 输入快照：

- `users.tsv`：24 行，对应当前数据库用户。
- `weekly-db.tsv`：3 行，对应当前数据库 `WeeklyReport`。

这两个文件不包含数据库密码或环境变量密钥。

## 执行命令

```bash
cd /opt/huigui-crm
OUT="output/employee-data-migration/2026-06-16"

node scripts/migrations/employee-data/weekly-userkey-dryrun.mjs \
  --weekly-dir /opt/huigui-crm/storage/uploads/employee-launch-weekly \
  --users-tsv "$OUT/users.tsv" \
  --weekly-db-tsv "$OUT/weekly-db.tsv" \
  --out "$OUT/weekly-userkey-dryrun.json" \
  --markdown-out "$OUT/weekly-userkey-dryrun.md" \
  --no-write

node scripts/migrations/employee-data/roster-json-dryrun.mjs \
  --roster-file /opt/huigui-crm/storage/uploads/employee-launch-contract/roster.json \
  --bucket publishedByWeek \
  --out "$OUT/roster-json-dryrun.json" \
  --markdown-out "$OUT/roster-json-dryrun.md" \
  --no-write
```

## 周报 dry-run 摘要

```json
{
  "fileCount": 12,
  "byBucket": {
    "test-or-smoke": 6,
    "shared-workspace": 2,
    "auto-match-candidate": 4
  },
  "byAction": {
    "skip_test_data": 6,
    "needs_manual_shared_split": 2,
    "attach_payload_only": 3,
    "create_weekly_report_candidate": 1
  }
}
```

关键判断：

- `shared` 和 `da-ai-gui-xin.weekly-workspace.v1.shared` 必须人工拆分或转团队摘要。
- `lisali` 两份本地 workspace 都匹配到数据库用户 `lisali`，但数据库已有周报，因此建议只挂 payload，不覆盖。
- `edwardtsuei` 匹配到 admin 候选，建议只挂 payload 或人工确认。
- `greatchef` 匹配到用户且数据库暂无周报，是唯一 `create_weekly_report_candidate`。
- smoke/test 数据默认跳过真实迁移。

## 班表 dry-run 摘要

```json
{
  "rosterWeeks": 6,
  "rosterShifts": 210,
  "notes": 1,
  "teams": [
    "bearhug-front",
    "bearhug-kitchen",
    "daochong"
  ]
}
```

已发布周次：

| team | week | rows | shifts | notes | actor |
| --- | --- | ---: | ---: | ---: | --- |
| `bearhug-front` | `06/15-06/21` | 5 | 35 | 0 | 彦蕊 |
| `bearhug-kitchen` | `06/01-06/07` | 5 | 35 | 0 | 申琦 |
| `bearhug-kitchen` | `06/08-06/14` | 5 | 35 | 0 | 申琦 |
| `bearhug-kitchen` | `06/15-06/21` | 5 | 35 | 0 | 申琦 |
| `daochong` | `06/08-06/14` | 5 | 35 | 1 | Lisa Li |
| `daochong` | `06/15-06/21` | 5 | 35 | 0 | 马立新～燕子 |

警告：

- `ACTOR_UNMAPPED`：当前只保留 `actorName` 文本，没有在 dry-run 阶段映射 `User.id`。

## 验证结论

1. 两个脚本语法检查通过。
2. 两个脚本运行成功。
3. 输出报告已生成。
4. 未执行任何数据库写入。
5. 未修改原始 `employee-launch-weekly/*.json`。
6. 未修改原始 `employee-launch-contract/roster.json`。

## 给下一位协作者

继续前请先阅读：

- `docs/employee-data-migration-readonly-plan-2026-06-16.md`
- `docs/weekly-userkey-mapping-report-2026-06-16.md`
- `docs/roster-json-dryrun-report-2026-06-16.md`
- `docs/employee-data-migration-engineering-draft-2026-06-16.md`
- `docs/employee-data-dryrun-run-record-2026-06-16.md`

下一步仍建议只读：

1. 补 `weekly-userkey-dryrun.mjs` 的单元样例或 fixtures。
2. 补 `roster-json-dryrun.mjs` 的完整输出字段说明。
3. 人工确认 `shared` 周报处理方式。
4. 用户确认后，再进入 Prisma migration 草案落地。
