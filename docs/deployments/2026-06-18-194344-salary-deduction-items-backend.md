# 2026-06-18 19:43:44 薪资个人承担明细后端上线记录

## 概览

- 环境：生产 `crm.hui-health.com` / `management.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：手动选择文件同步 + 远端 `docker compose build api app` + `npx prisma migrate deploy`
- 本次范围：薪资条 `deductionItems` 字段、薪资同步/查询 API、主系统薪资展示口径
- 未执行：`npm run db:seed`、员工端正式 release 切换、真实企业微信群发

## 上线前校验

- `npm run test:payroll`：53 项通过
- `npm run lint -w @huigui/api`：通过
- `npm run build -w @huigui/api`：通过
- `npm run build --workspace @huigui/web`：通过

## 备份

- 远端源码备份：`/opt/huigui-backups/huigui-crm-salary-deduction-items-20260618-194012.tar.gz`
  - SHA256：`ad94dd2c41c6ac258e05155bc8662e9f4419cfa9e7778377c7526e0bcba3cad5`
- 生产数据库备份：`/opt/huigui-backups/huigui-mysql-before-salary-deduction-items-20260618-194012.sql.gz`
  - SHA256：`27cb8b0bbf16c7c284b8a77edaf3f1a6cbaf319ae255b4dc7be961d29992f31f`

## 数据库迁移

- 迁移：`20260618143000_salary_slip_deduction_items`
- SQL：`ALTER TABLE SalarySlip ADD COLUMN deductionItems JSON NULL;`
- 执行结果：`All migrations have been successfully applied.`
- 上线后确认：
  - `SalarySlip.deductionItems` 字段存在：`1`
  - `_prisma_migrations` 完成记录存在：`1`
  - 当前 `SalarySlip` 行数：`5`

## 发布后核对

- `huigui-api`、`huigui-app`、`huigui-nginx` 均已重启并运行
- 容器内 API 健康检查通过
- `https://management.hui-health.com/api/health` 返回 `200`
- `https://crm.hui-health.com/api/health` 返回 `200`
- `https://management.hui-health.com/finance/payroll` 返回 `200`
- `https://management.hui-health.com/payroll/mine` 返回 `200`
- 未登录访问薪资 API 返回 `401 请先登录`，符合鉴权预期

## 剩余动作

- 若要让财务从正式员工端入口直接使用，需要单独执行员工端正式 release 切换。
- 若要真实群发企业微信薪资条，需要在正式入口确认批次后再由财务触发发送。
