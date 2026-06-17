# Weekly teamReports 修正执行包 dry-run / before-after 指纹

日期：2026-06-17
状态：`execution_package_dry_run_only`

## 安全边界

- 本轮只生成 before/after 指纹执行包 dry-run。
- 未写数据库。
- 未执行 `--apply`。
- 未生成可执行 `UPDATE` SQL。
- 未生成写库脚本。
- 未改 schema、migration、API、前端。
- 未部署、未重启、未打 rollback tag。
- `deploymentAllowed=false` 继续保持。

## 执行包范围

本包只覆盖 3 条周报的文本修正候选：

- `Han / 2026-05-25`
- `ChengCheng / 2026-06-08`
- `lisali / 2026-06-08`

字段范围：

- 3 条 `WeeklyReport.completedSummary`
- 3 条 `WeeklyReport.focusSummary`
- 3 条 `WeeklyReportReviewItem.description`
- 3 条 `WeeklyReportPlanItem.description`

总计：12 个字段级候选变更。

## before/after 指纹摘要

| target | field | before chars | after chars | before sha256 | after sha256 |
| --- | --- | ---: | ---: | --- | --- |
| Han report | `completedSummary` | 110 | 100 | `bbe18fd842f916c028d666489f428b3d83706a2fb334972a44ba398d58b8f4eb` | `9855315c7448f0c200cd7b0d7ddbdcd394f69825290f23690b959527a41fadf1` |
| Han report | `focusSummary` | 106 | 78 | `4e347ce35fd68dfe2b4e6661ec9b0739e3d52d8c58d93df27735463712ea352e` | `3758965d005dfb52be4a8baf7ed7bd9c9a632422cd0c6904e28e384e9f78ed4f` |
| Han reviewItem | `description` | 110 | 117 | `bbe18fd842f916c028d666489f428b3d83706a2fb334972a44ba398d58b8f4eb` | `480fadca9a11169fc70c56621931f834825f9870ad9a848688dedc1205a87b57` |
| Han planItem | `description` | 93 | 78 | `56e41efb39d9402cc0f7082f6e33b87f4ced762a282e655482a1711a0e651753` | `3758965d005dfb52be4a8baf7ed7bd9c9a632422cd0c6904e28e384e9f78ed4f` |
| ChengCheng report | `completedSummary` | 262 | 85 | `30f5319c8994c6d8498153ec8826e581eeb324ecf87d719c00a96e0cef49983b` | `7a578b1b5427ab49956404be36665c477f4b90d4508c572cbd39aa7aa5ae2df1` |
| ChengCheng report | `focusSummary` | 34 | 21 | `e94c12f07884e9d3b65dfb73f0653ea1c4f5497d4699fdcbe9fb185ade95d9b4` | `4d57c379f590c1a0938cb84a75eba827688061a8ad75d8bcc300ccfeb5b82cdc` |
| ChengCheng reviewItem | `description` | 262 | 105 | `30f5319c8994c6d8498153ec8826e581eeb324ecf87d719c00a96e0cef49983b` | `ee332a2387a2106c9de5b4a931c3c1278d91bb873b28d07900610e4a8ae3654e` |
| ChengCheng planItem | `description` | 21 | 21 | `4d57c379f590c1a0938cb84a75eba827688061a8ad75d8bcc300ccfeb5b82cdc` | `4d57c379f590c1a0938cb84a75eba827688061a8ad75d8bcc300ccfeb5b82cdc` |
| lisali report | `completedSummary` | 249 | 277 | `a89c4b0ce122c8a7961f66ace13ce5693e75cea5431d9c7d0152c0f6ecfc457b` | `ce9ce54b54eb94efbaa9deaf0c920a9ff1315560d7f4998153678cb17bbfa622` |
| lisali report | `focusSummary` | 26 | 13 | `db86fd344bfb99561594a5c686ddd9cbf71efa83a0e2eec9ad8651e92bf59202` | `117b721758dcc41a3310f6ed42ffdb56f38b6eaf790a0a471fa7593d2c59daaa` |
| lisali reviewItem | `description` | 249 | 294 | `a89c4b0ce122c8a7961f66ace13ce5693e75cea5431d9c7d0152c0f6ecfc457b` | `0f7b5ccb00a3bc174c6cbc6fb1d6bd849e3414a64b0ac050299898c76388924c` |
| lisali planItem | `description` | 13 | 13 | `117b721758dcc41a3310f6ed42ffdb56f38b6eaf790a0a471fa7593d2c59daaa` | `117b721758dcc41a3310f6ed42ffdb56f38b6eaf790a0a471fa7593d2c59daaa` |

说明：

- ChengCheng planItem 与 lisali planItem 的 before/after 指纹相同，说明计划项本身无需实际改动；保留在包内只是为了证明子表一致性。
- 未来执行包若生成真实 SQL，应跳过 after 指纹与 before 指纹相同的字段，避免无意义写入。

## 执行前强制校验

执行前必须跑：

`output/employee-data-migration/2026-06-16/weekly-teamreports-correction-fingerprint-package.precheck.sql`

必须满足：

- 12 个字段的当前 SHA256 仍等于本包记录的 before SHA256。
- 3 条目标周报 direct payload links 仍为 0。
- payload 门禁仍为 `13 / 3 / 3`。
- `shared/shared/draft=13`。

如果任一 before SHA 不匹配，说明生产数据已变化，必须停止并重新生成执行包。

## 回滚原则

未来如果真实修正被授权，回滚包必须使用本包的 before 文本和 before SHA。

回滚前必须确认：

- 当前字段 SHA 等于本包 after SHA。
- 没有新增 payload 关联。
- 没有用户后续编辑。

本阶段不生成回滚 SQL。

## 下一步

请 D 线复核本 dry-run 包。若通过，下一阶段仍应先生成“可执行 SQL 草案 + 回滚 SQL 草案”，并再次由用户明确授权后才允许执行。
