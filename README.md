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

第一阶段可用模块已经落库并接通基础接口：

- 账号密码登录与 `/api/auth/me`
- 客户管理
- 产品管理
- 农业方案报价
- 通用报价
- 报价记录与 PDF 导出
- `/api/health` 健康检查

## 项目结构

项目结构说明见 [docs/project-structure.md](./docs/project-structure.md)。

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

## 默认账号

- 用户名：`admin`
- 密码：`Huigui@123`

## 生产部署

腾讯云 CVM 部署说明见 [deploy/README.md](./deploy/README.md)。

生产发版记录见 [docs/deployment-log.md](./docs/deployment-log.md)。

仓库内已提供：

- 后端环境变量模板：`apps/api/.env.example`
- 前端环境变量模板：`apps/web/.env.example`
- Nginx 示例：`deploy/nginx/huigui.conf`
- PM2 配置：`deploy/pm2/ecosystem.config.cjs`
- 生产同步脚本：`scripts/ops/deploy-local-to-production.sh`
