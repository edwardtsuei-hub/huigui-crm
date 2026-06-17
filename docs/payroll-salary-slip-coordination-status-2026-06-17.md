# 薪资条上传与发送优化总协调状态（2026-06-17）

## 执行约束

- 未修改 `apps/web/public/employee-frontend/releases/20260616090241/**` 压缩发布包。
- 未部署。
- 未写生产数据库。
- 未重启线上服务。
- 仓库根目录未发现 `.codegraph/`，因此本次按普通文件检索推进。

## 当前总状态

整体状态：后端线、mock 回归、后端 UAT 工具和审计留档工具已完成；前端源码恢复线和真实联调线仍阻塞。

仍保留的阻塞标记：

- `blocked_waiting_for_vite_source`：员工端 Vite 源码或 sourcemap/build artifacts 尚未恢复。
- `blocked_waiting_for_database_connection`：本机 Docker 不存在，真实 MySQL 联调无法执行。

本轮已完成：

- 补齐 payroll 后端 schema、migration、服务逻辑、权限收紧和通知追溯。
- 将薪资 mock/服务/UAT 工具回归扩展到 48 个场景。
- 新增薪资身份字段回填 dry-run 脚本、真实迁移运行手册、上线前预检脚本和只读数据库验收脚本。
- 新增真实联调 UAT 薪资上传 CSV 样例和预期说明。
- 新增 UAT CSV 转后端 API payload 工具，便于前端源码恢复前先测后端链路。
- UAT CSV 转 payload 工具会在生成发布 payload 前检查必要表头；缺少 `姓名 / 应发 / 实发` 或整组身份表头时只生成 `blocked_missing_required_headers` summary。
- UAT CSV 转 payload 工具会在生成发布 payload 前阻断缺失或非法的必填金额，避免异常金额被静默转成 0。
- UAT CSV 转 payload 工具会阻断缺少明确身份字段的薪资行，避免回退到姓名生成临时 ID。
- UAT CSV 转 payload 工具支持标准 CSV 引号单元格，能正确解析 `"12,000"` 这类千分位金额和引号内逗号。
- UAT CSV 转 payload 工具会清理 Excel 导出的 UTF-8 BOM，避免首列表头 `姓名` 识别失败。
- 新增 UAT API 提交脚本，默认 dry-run，显式 `--execute` 加 `--confirm-test-db PAYROLL_UAT_TEST_DB` 才会调用测试 API，并拒绝生产域名。
- UAT API 提交脚本会在 dry-run 前检查 `summary.json / salary-slips-sync.json / salary-notify-log.json` 的月份、发布批次、行数和通知人数是否一致；不一致时直接 blocked。
- UAT API 提交脚本会校验 `salary-slips/sync` 响应；批次号、写入数或 teacherIds 异常时不会继续记录通知日志。
- UAT API 提交脚本会校验 `salary-notify-logs` 写入响应；返回 `ok` 异常或返回批次号不一致时会标记失败。
- UAT API 提交脚本执行成功后会自动读回 `GET /salary-slips` 和 `GET /salary-notify-logs`，确认正式薪资条和通知记录都能按 `publishBatchId` 查到，并逐项核对金额、身份字段和通知人数。
- 新增 UAT 审计包工具，能把 payload 或测试 API read-back 结果导出为薪资条 CSV、通知明细 CSV、通知读回 JSON、manifest 和 README，并记录 SHA256。
- UAT 审计包工具会阻断失败的 API 提交结果；只要 submit result 状态失败或 validations 未通过，就只生成 blocked manifest，不导出误导性的薪资 CSV。
- UAT 审计包工具在传入 submit result 时必须拿到薪资条和通知记录 read-back 证据；缺少读回行时不会静默降级成 payload 证据。
- 新增 `GET /salary-notify-logs` 只读查询，支持按 `month / publishBatchId` 追溯薪资通知记录。
- 新增 `GET /salary-slips` 财务只读查询，支持按 `month / publishBatchId / teacherId / userId / wecomUserId / loginAccount` 对账正式薪资条。
- 新增提交前检查清单，明确 Go / No-Go、测试库验收、权限验收、历史回填和前端源码恢复后的验收点。
- 上线前预检已能排除 `employee-frontend/current` 和 `releases/**` 这类压缩产物路径，只把可维护前端源码候选作为解除前端阻塞的依据。
- 上线前预检会输出当前压缩 release 中 `/payroll/batch`、`/finance/imports`、`上传薪资表` 的命中文件，并确认是否存在 `.map` 或 `sourceMappingURL`。
- `npm run db:generate` 通过。
- `npm run preflight:payroll` 通过，状态为 `passed_with_blockers`。
- `npm run verify:payroll-db` 可运行；当前状态为 `blocked_waiting_for_database_connection`。
- `npm run test:payroll` 通过：48/48。
- `npm run lint -w @huigui/api` 通过。
- `npm run build` 通过。

## 三线结果

### 线 1：前端上传入口与导入中心返回闭环

结果：阻塞，等待可维护员工端 Vite 源码。

已确认：

- 当前员工前端指向 `apps/web/public/employee-frontend/current.release -> 20260616090241`。
- `/payroll/batch` 仍只定位到压缩产物：
  - `apps/web/public/employee-frontend/releases/20260616090241/assets/payroll-batch-page-CXA8ZBid.js`
- `/finance/imports` 相关逻辑仍只出现在同一 release 的压缩模块里。
- 当前 release 未发现 `.map` sourcemap、`.ts`、`.tsx` 或 `.jsx` 源文件。
- `apps/web/app` 的 Next.js 源码树不包含员工端 `/payroll/batch` 或 `/finance/imports` 路由。
- 当前发布包文本中能看到“上传薪资表”“去导入中心”和 `/finance/imports`，但没有源码就不能安全修复或重构 UI。

未执行：

- 未修改压缩 JS。
- 未部署新员工端。

恢复条件：

1. 提供员工端 Vite 源码仓库、源码目录或可还原 sourcemap/build artifacts。
2. 确认 `/payroll/batch` 与 `/finance/imports` 源文件位置。
3. 在源码中实现上传入口、空状态入口、深链预填、上传后返回和 `.xls` 格式提示。

### 线 2：后端权限、查询、发布批次、通知记录

结果：已完成本地代码落地，待真实数据库迁移与联调确认。

已完成：

- `SalarySlip` 新增 `publishBatchId / userId / wecomUserId / loginAccount` 字段和索引。
- `SalaryNotifyLog` 新增 `publishBatchId` 字段和索引。
- `PayrollDraftBatch` 新增 `publishBatchId` 字段和索引。
- 新增 migration：
  - `prisma/migrations/20260617110000_payroll_publish_batch_identity/migration.sql`
- `POST /salary-slips/sync` 写入发布批次号和明确身份字段。
- `POST /salary-slips/sync` 返回 `createdCount / updatedCount / skippedCount / teacherIds / publishBatchId / warnings`。
- `POST /salary-slips/sync` 会拒绝空明细和非数字金额，避免发布“成功但无数据”或金额被静默写成 0。
- `POST /salary-slips/sync` 会拒绝缺少明确身份的明细，避免正式薪资条只能按姓名或临时 ID 存库。
- `POST /salary-slips/sync` 会对负数和合计不一致的金额返回 warning，提示财务复核。
- `POST /salary-slips/sync` 只替换当前 `publishBatchId` 下的同月同员工薪资条，不会覆盖同月其他发布批次历史。
- `GET /salary-slips` 支持财务按月份、发布批次和明确身份字段查询正式薪资条，默认最多返回 500 条，最大 2000 条。
- `GET /salary-slips` 必须带 `month / publishBatchId / teacherId / userId / wecomUserId / loginAccount` 至少一个筛选条件，避免误拉全量薪资条。
- `POST /salary-slips/sync` 默认薪资条 ID 按月份、发布批次和 `teacherId` 稳定生成；同一批次重跑稳定覆盖，不同批次互不覆盖。
- `GET /me/salary-slips` 改为数据库层 `where OR` 查询。
- 本人薪资条查询只按明确身份字段授权：`teacherId / userId / wecomUserId / loginAccount`。
- 姓名只保留为 warning hint，不再参与本人授权过滤。
- 薪资维护权限收紧为 `SUPER_ADMIN / ADMIN / FINANCE / action.payroll.publish`。
- 已移除 `action.management.member.update` 兼容放行。
- 已移除“角色名 / 部门 / 姓名像财务或办公室”这类文本正则放行。
- 通知记录不再 prune 删除旧记录。
- 工作区读取通知记录改为最近 240 条展示，历史记录保留在库内。
- 通知记录默认 ID 包含 `publishBatchId` 和随机段；同一批次重复通知默认新增审计记录，不会因同月时间戳撞 ID 覆盖历史。
- `GET /salary-notify-logs` 支持按月份和发布批次查询历史通知记录，默认最多返回 240 条，最大 1000 条。
- `POST /salary-notify-logs` 必须带 `publishBatchId`，或能从当月唯一发布批次自动推断；否则拒绝写入，避免通知记录与发布批次断链。
- `GET /salary-notify-logs` 必须带 `month` 或 `publishBatchId`，避免无筛选拉取通知历史。
- 通知记录和草稿批次都会保存 `publishBatchId`，便于导入批次、正式薪资条、通知记录对账。

待确认：

- migration 尚未对真实数据库执行。
- 历史薪资条如果只有姓名或旧 `teacherId`，需要人工确认是否要补一版身份字段回填脚本。
- 权限收紧后，原先靠“财务/办公室/人事”等文字命中的账号需要补明确角色或 `action.payroll.publish` 权限。

### 线 3：本地 mock 与自动化回归

结果：已完成；真实联调仍等待本地数据库。

已覆盖：

- 当前发布包仍有薪资表上传入口文本。
- CSV 上传预览、返回 `/payroll/batch`、发布和通知名单生成。
- XLSX 上传复核门禁。
- XLS 可上传但提示不能浏览器预览。
- 字段缺失阻断发布。
- 差异未处理阻断 `salary-slips/sync`。
- `salary-slips/sync` 返回统计、teacherIds、publishBatchId、重复 warning。
- `salary-slips/sync` 拒绝空明细和非数字金额。
- `salary-slips/sync` 拒绝缺少明确员工身份的明细，且不会写库。
- `salary-slips/sync` 对金额异常返回 warning 但不阻断复杂薪资结构。
- `salary-slips/sync` 只替换当前发布批次，默认 ID 不依赖导入行号；同一批次同一员工重复同步会得到稳定 ID，不同批次保留各自记录。
- 财务可按 `month / publishBatchId` 查询正式薪资条，便于 UAT 和上线后对账。
- 财务查询正式薪资条不能无筛选条件拉取全量数据。
- 员工本人查询只走数据库身份字段，不按同名越权。
- 仅姓名相同不能授权查看薪资条。
- 财务文本 / 成员管理权限不再误放行薪资维护。
- 通知记录保存 publishBatchId 且不删除历史。
- 通知记录默认 ID 带发布批次，同一发布批次多次通知会保留多条历史。
- 通知记录可按 `month / publishBatchId` 查询，工作区读取不再无上限拉全量历史。
- 通知记录写入必须带 publishBatchId；如旧入口未传但当月只有一个发布批次，后端会自动补齐；当月多批次时必须显式传。
- 通知记录查询必须带月份或发布批次。
- 草稿批次保存 publishBatchId 便于后续核对。
- 薪资身份回填 dry-run 只为明确身份匹配生成 SQL，姓名匹配只进入人工复核。
- 上线前预检会检查 schema、migration、服务权限、测试覆盖、前端源码阻塞和压缩发布包 diff。
- 上线前预检会排除员工端 `current` 发布别名和 `releases/**` 压缩产物，避免把构建后的 JS 误判为可维护源码。
- 上线前预检会保留压缩 release 的路由命中证据：当前 `/payroll/batch` 在 `index-C20sRqov.js`，上传薪资表文案在 `payroll-batch-page-CXA8ZBid.js`，`/finance/imports` 分布在压缩模块中；同时确认没有 sourcemap。
- 只读数据库验收脚本会在测试库可达后检查 migration、字段、索引、薪资身份完整度和同名风险。
- UAT 样例覆盖同名身份隔离、合作老师跳过通知、无企微账号跳过通知、差异未处理阻断发布。
- UAT payload 工具可生成 `salary-slips-sync.json` 和 `salary-notify-log.json`；差异阻断样例不会生成发布 payload。
- UAT payload 工具会阻断缺少 `姓名 / 应发 / 实发` 或整组身份表头的 CSV，生成 `blocked_missing_required_headers` summary。
- UAT payload 工具会阻断必填金额异常，生成 `blocked_invalid_amounts` summary，不会生成发布 payload。
- UAT payload 工具会阻断缺少 `员工ID / 用户ID / 企业微信账号 / 登录账号` 的行，生成 `blocked_missing_identity` summary。
- UAT payload 工具能解析带引号的 CSV 金额和姓名，避免千分位逗号把薪资列拆坏。
- UAT payload 工具会清理 UTF-8 BOM，避免 Excel CSV 第一列表头错位。
- UAT API 提交工具默认只生成 dry-run 计划；未显式 `--execute` 和 `--confirm-test-db PAYROLL_UAT_TEST_DB` 不写测试库；生产域名会被拒绝。
- UAT API 提交工具会先校验三份 payload 文件的一致性，防止 summary、同步 payload、通知 payload 批次不一致时仍生成调用计划。
- UAT API 提交工具会先校验 `salary-slips/sync` 返回的 `publishBatchId / teacherIds / createdCount / updatedCount / skippedCount`，通过后才调用 `salary-notify-logs`。
- UAT API 提交工具会校验 `salary-notify-logs` 写入响应的 `ok / publishBatchId`，避免通知记录接口返回错批次但流程继续被视为成功。
- UAT API 提交工具会在执行后自动 read-back 核对正式薪资条数量、teacherIds、publishBatchId、金额、身份字段和通知记录人数。
- UAT API 提交工具会拦截测试 API 表面成功但读回数据错位的情况，例如金额变动、`userId / wecomUserId / loginAccount` 不一致、通知 delivered/skipped/failed 数量不一致。
- UAT 审计包工具在 payload ready 时生成留档包；在差异未解决时只生成 blocked manifest，不生成薪资发布材料。
- UAT 审计包工具优先使用测试 API read-back 结果作为正式证据，并保留提交结果、输入 payload 和输出文件的 SHA256。
- UAT 审计包工具会拒绝失败的 API submit result，防止把金额或身份读回失败的数据包装成 ready 审计包。
- UAT 审计包工具会拒绝缺少 API read-back 行的 submit result，防止把真实联调证据缺失的结果包装成 ready 审计包。

验证结果：

| 检查项 | 结果 |
| --- | --- |
| `.codegraph/` | 不存在 |
| 员工端 Vite 源码 | 未定位到 |
| 当前 release sourcemap | 未发现 |
| `npm run db:generate` | 通过 |
| `npm run preflight:payroll` | 通过，`passed_with_blockers` |
| `npm run verify:payroll-db` | 可运行，当前阻塞于数据库连接 |
| `npm run test:payroll` | 通过，48/48 |
| `npm run lint -w @huigui/api` | 通过 |
| `npm run build` | 通过 |
| Docker | 不存在，`docker: command not found` |
| 真实 MySQL 联调 | 未执行，等待本地数据库可达 |

## 文件改动清单

后端：

- `apps/api/src/payroll/payroll.service.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260617110000_payroll_publish_batch_identity/migration.sql`
- `scripts/migrations/payroll/salary-identity-backfill-dryrun.mjs`
- `scripts/migrations/payroll/salary-slip-preflight.mjs`
- `scripts/migrations/payroll/salary-slip-db-verify.mjs`
- `scripts/migrations/payroll/salary-fixture-to-api-payload.mjs`
- `scripts/migrations/payroll/salary-api-uat-submit.mjs`
- `scripts/migrations/payroll/salary-audit-package.mjs`

测试与构建：

- `tests/payroll-salary-slip-regression.test.ts`
- `tests/fixtures/payroll/salary-upload-uat-resolved-2026-06.csv`
- `tests/fixtures/payroll/salary-upload-uat-unresolved-2026-06.csv`
- `package.json`

记录文档：

- `docs/payroll-salary-slip-upload-send-optimization-plan-2026-06-17.md`
- `docs/payroll-salary-slip-coordination-status-2026-06-17.md`
- `docs/payroll-salary-slip-real-migration-runbook-2026-06-17.md`
- `docs/payroll-salary-slip-uat-fixtures-2026-06-17.md`
- `docs/payroll-salary-slip-release-review-checklist-2026-06-17.md`

明确未改动：

- `apps/web/public/employee-frontend/releases/20260616090241/**`

## 阻塞项

1. `blocked_waiting_for_vite_source`
   - 需要员工端 Vite 源码或 sourcemap/build artifacts，才能安全完成前端 UI 优化。

2. `blocked_waiting_for_database_connection`
   - 当前机器没有 Docker CLI。
   - 真实 MySQL 未确认可达。
   - 不能完整验证真实登录、上传、发布、通知、员工查看闭环。

3. `blocked_waiting_for_real_migration`
   - migration 已写好，但未在真实数据库执行。
   - 需要在本地 / 测试库先跑迁移和回归，再安排生产变更窗口。

## 还需要人工确认的事项

1. 员工端 Vite 源码在哪个仓库、目录或构建机上。
2. 是否接受本次权限收紧策略：不再允许文本像“财务/办公室/人事”或 `action.management.member.update` 维护薪资。
3. 哪些账号需要补 `FINANCE` 角色或 `action.payroll.publish` 权限。
4. 历史薪资条是否需要身份字段回填：`userId / wecomUserId / loginAccount`。
5. 本地联调使用 Docker 还是外部 MySQL；需要提供可达数据库后再跑真实链路。
6. 真实企业微信通知是否先在测试应用 / dry-run 模式验证。

## 下一步

1. 恢复员工端 Vite 源码后，补前端上传入口和导入中心返回闭环。
2. 本地或测试库可达后，执行 Prisma migration 并跑真实 API 回归。
3. 执行 `npm run verify:payroll-db`，只读检查 migration、字段、索引和历史薪资身份完整度。
4. 导出 `User` 和 `SalarySlip` TSV，运行 `salary-identity-backfill-dryrun.mjs` 生成回填评估报告。
5. 用 `npm run fixture:payroll-payload` 生成后端接口 payload。
6. 用 `npm run uat:payroll-api` 先 dry-run 检查接口调用计划；测试库确认后再显式 `--execute --confirm-test-db PAYROLL_UAT_TEST_DB` 验证 `salary-slips/sync`、`salary-notify-logs` 和读回对账。
7. 用 `npm run audit:payroll-package` 生成测试库 UAT 审计包，检查 manifest、README、CSV、JSON 和 SHA256。
8. 用测试账号验证完整链路：登录、上传薪资表、复核差异、发布薪资条、通知记录、员工本人查看。
9. 用 `tests/fixtures/payroll` 的 UAT 样例验证同名隔离、合作老师跳过、无企微账号跳过和差异阻断。
10. 对历史薪资条做身份字段回填评估，避免旧数据只能靠姓名识别。
11. 合并前按 `docs/payroll-salary-slip-release-review-checklist-2026-06-17.md` 做 Go / No-Go 评审。
