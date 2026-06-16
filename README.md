# 洄归生态客户管理与报价协同系统

基于 `Next.js + NestJS + Prisma + MySQL` 的 CRM 与报价协同系统，按 Sprint 方式推进：

- Sprint 1：登录、客户管理、产品管理、农业方案报价、通用报价、报价记录、PDF 输出
- Sprint 2：权限细化、合同管理、COS 上传、首页工作台、提醒任务、企业微信登录
- Sprint 3：大日历、工作计划、评论讨论、企业微信消息、报表、审计日志

## 技术栈

- 前端：Next.js 14 App Router
- 后端：NestJS 11
- ORM：Prisma
- 数据库：MySQL / 腾讯云 TDSQL-C MySQL
- 进程管理：PM2
- 反向代理：Nginx
- 文件存储：腾讯云 COS

## 当前状态

截至 `2026-04-20`，项目已经不是“只有第一阶段可用模块”的状态，当前代码与生产环境已覆盖以下主要能力：

- 登录认证、`/api/auth/me` 与首页工作台
- 客户管理
- 产品管理与产品解析
- 农业方案、通用报价、报价记录与详情页
- 档案中心与 `Files Workbench`
- 检测管理
- 订单总览、收款、发货、渠道结算
- 管理中心、成员、角色、审批与日志
- 工作管理、周报、月目标与团队视图
- 日程、通知、设置与财务账户
- `/api/health` 健康检查、Prisma 迁移、部署脚本与生产同步记录

当前阶段判断：

- `Sprint 1`、`Sprint 2` 已基本落地
- `Sprint 3` 的主要模块已进入代码与生产环境，但部分页面仍在持续做 UI 收口与 preview 闭环
- 最新一次生产同步为 `2026-04-19 20:07:28`
- 已于 `2026-04-20` 本地确认 `@huigui/api` 与 `@huigui/web` 的 `lint`、`build` 均通过

最新阶段盘点见 [docs/project-status-2026-04-20.md](./docs/project-status-2026-04-20.md)。

## 项目结构

项目结构说明见 [docs/project-structure.md](./docs/project-structure.md)。

如果要看最近两天的进度结论、未完成项与收尾建议，可直接看 [docs/project-status-2026-04-20.md](./docs/project-status-2026-04-20.md)。

## 本地开发

1. 安装依赖

```bash
npm install
```

2. 准备环境变量

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

仓库里也已经补了一套可直接用于本地开发的默认 `.env`，默认走：

- 前端：`http://localhost:3000`
- 后端：`http://localhost:3001/api`
- 数据库：`mysql://huigui:HuiguiDB2026@127.0.0.1:3306/huigui_crm`

3. 启动本地 MySQL

如果你装了 Docker Desktop，可以直接用仓库内的 `docker-compose.yml`：

```bash
npm run db:up
```

如果你本机没有 Docker，也可以安装本地 MySQL 8，然后执行：

```bash
mysql -uroot < scripts/local/init-mysql.sql
```

4. 生成 Prisma Client

```bash
npm run db:generate
```

5. 初始化数据库

```bash
npm run db:migrate:dev
npm run db:seed
```

6. 启动前后端

```bash
npm run dev
```

7. 打开本地地址

- 登录页：`http://localhost:3000/login`
- 工作台：`http://localhost:3000/dashboard`
- API 健康检查：`http://localhost:3001/api/health`

如果需要把“方案”入口与相关创建权限补齐给所有角色，可执行：

```bash
npm run permissions:sync-solutions
```

这条命令会使用当前环境里的 `DATABASE_URL`，为所有现有角色补齐：

- `menu.solutions`
- `page.solutions.workspace`
- `action.solution.create`
- `action.quotation.create`

## 默认账号

- 开发环境 seed 默认用户名：`admin`
- 开发环境 seed 默认密码：`HuiguiDev123`
- 生产环境执行 seed 前必须设置 `DEFAULT_ADMIN_PASSWORD`，密码至少 8 位并同时包含字母和数字。

## 生产部署

腾讯云 CVM 部署说明见 [deploy/README.md](./deploy/README.md)。

生产发版记录见 [docs/deployment-log.md](./docs/deployment-log.md)。

仓库内已提供：

- 后端环境变量模板：`apps/api/.env.example`
- 前端环境变量模板：`apps/web/.env.example`
- Nginx 示例：`deploy/nginx/huigui.conf`
- PM2 配置：`deploy/pm2/ecosystem.config.cjs`
- 生产同步脚本：`scripts/ops/deploy-local-to-production.sh`

推荐发布方式：

```bash
bash ./scripts/ops/deploy-local-to-production.sh --note "填写本次上线范围"
```

发布前先看本地与正式机之间还有哪些差异：

```bash
npm run deploy:status
```

这条状态命令会直接对比本地工作区与 `root@49.232.57.98:/opt/huigui-crm`，列出还没同步到服务器的文件差异。

正式发布脚本会自动执行本地源码备份、远端源码备份、`rsync` 同步、`docker compose build`、`npx prisma migrate deploy`、可选 `db:seed`、API 健康检查、HTTPS 回归检查，并在 `docs/deployment-log.md`、`docs/deployments/` 与 `docs/deploy-sync-state.json` 下写入同步记录，再把这些记录回写到服务器，保证两边台账一致。
