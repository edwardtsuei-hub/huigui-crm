# A 线：员工数据 DB-first API 桥接上线记录（2026-06-16）

## 结论

A 线已完成并上线：班表、周报 workspace 的线上 API 已改成 DB-first 读写桥。

外部接口路径保持不变，前端不需要改路径：

- `GET /api/roster/workspace`
- `PATCH /api/roster/workspace`
- `POST /api/weekly/workspace/:userKey/reset`
- `GET /api/weekly/workspace/:userKey`
- `PATCH /api/weekly/workspace/:userKey`

当前策略：优先读写 MySQL 新表；保留旧 JSON workspace 作为兼容和兜底。线上可用 kill switch 回到 JSON-only。

## 本次修改文件

- `/opt/huigui-crm/apps/api/src/employee-launch/employee-launch.service.ts`
- `/opt/huigui-crm/apps/api/src/employee-launch/employee-launch.controller.ts`

## 备份

- `/opt/huigui-crm/backups/employee-db-first-20260616-1145/employee-launch.service.ts.before`
  - SHA256: `fe2469a04627c8df37ba3b533208c60c7eb2820a6ee4a13b41574d8d97be168d`
- `/opt/huigui-crm/backups/employee-db-first-20260616-1145/employee-launch.controller.ts.before`
  - SHA256: `45f992868a2c9032c3bfceea72789c74eef19cca4991163f940c201e80f75e6f`

上线后文件指纹：

- service: `c07e0845d3e5daf464d489041f1ad009cdd652cd5d94f5c4707ba8958c6310e7`
- controller: `90314cdfa46c22ebf5714d1e1ca090aa58a0674d8f2a41259adea1efcb5089bf`

## 已上线版本

- Docker image: `sha256:1df33524f23f7c53a4e207bb232690ce4329ea1a3edab16938a9c11e1013b2c4`
- API 容器：`huigui-api` 已重新创建并启动
- 健康检查：`https://management.hui-health.com/api/health` 返回 `status=ok`

## 只读验收结果

验收方式：容器内临时生成 5 分钟有效的短期 JWT，只读请求接口；不打印 token，不读取或输出 env 密钥，不写业务数据。

班表：

- `GET /api/roster/workspace` HTTP 200
- `meta.persistence = db-first`
- 接口返回团队：`daochong`, `bearhug-kitchen`, `bearhug-front`
- DB 中 `RosterWeek` 生产分区已发布周次：
  - `bearhug-front`: 1
  - `bearhug-kitchen`: 3
  - `daochong`: 2

周报：

- `GET /api/weekly/workspace/lisali` HTTP 200
- `userKey = lisali`
- `reportState = submitted`
- `teamReports = 3`
- 周报表结构确认字段：`sourceUserKey`, `canonicalUserKey`, `reportState`, `payloadJson`

服务状态：

- `huigui-api`: Up
- `huigui-app`: Up
- `huigui-mysql`: Up healthy
- `huigui-nginx`: Up
- API 日志：启动成功，未看到本次验收触发的运行异常

## 主要实现点

- 班表 GET：从 `RosterWeek.rawSnapshot` 聚合出旧 workspace 结构，接口路径不变。
- 班表 PATCH：仍接收旧 workspace body，先 upsert 到 `RosterWeek/RosterShift`，再写旧 JSON 兼容文件。
- 周报 GET：优先从 `WeeklyReportPayload.payloadJson` 读取；缺数据时回退旧 JSON。
- 周报 PATCH / reset / save / submit / reminder / summary：保存旧 JSON 后同步 upsert 到 `WeeklyReportPayload`。
- Prisma client 未重新依赖新 model 属性；桥接层使用 raw SQL，降低线上生成 client 漂移风险。

## Kill Switch

如线上发现员工数据桥接异常，可以把 API 环境切回 JSON-only：

- `EMPLOYEE_DATA_DB_BRIDGE_MODE=json-only`
- 或 `EMPLOYEE_DATA_DB_BRIDGE_DISABLED=1`

然后只重启 API 容器。切换前请先记录当前容器状态和 API 日志。

## 回滚方式

如需要完全回滚代码：

1. 将备份文件安装回原路径：
   - `employee-launch.service.ts.before` -> `apps/api/src/employee-launch/employee-launch.service.ts`
   - `employee-launch.controller.ts.before` -> `apps/api/src/employee-launch/employee-launch.controller.ts`
2. 重新构建 API image。
3. 重新创建 API 容器。
4. 验证 `/api/health` 和员工模块关键接口。

## 仍需其他线继续

- B 线：前端员工模块 localStorage / indexedDB 只读审计，确认 UI 是否仍只看本地缓存。
- C 线：schedule / finance / OCR / platform 等员工 JSON workspace 第二批只读同步评估。
- D 线：发布、回滚、验收 runbook，补齐多人协作停止条件和验收颗粒度。

统一控制文档：

- `/opt/huigui-crm/docs/parallel-collaboration-control-2026-06-16.md`
- `/opt/huigui-crm/output/employee-data-migration/2026-06-16/parallel-collaboration-control.json`

## 停止条件

A 线当前可以停止，除非用户要求继续做写路径演练或把 kill switch 写入 compose/env。生产写路径演练需要更谨慎，建议先由 D 线定义验收样本，再执行最小 no-op 写入验证。
