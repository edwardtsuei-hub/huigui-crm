# 2026-04-17 08:41:50 API OpenSSL 热修记录

## 概览

- 部署标签：`api-openssl-hotfix-20260417-084150`
- 环境：生产 `crm.hui-health.com`
- 目标服务器：`root@49.232.57.98`
- 目标目录：`/opt/huigui-crm`
- 源代码来源：本地当前工作区
- Git 修订：`573e3da`

## 本次备注

- 为 API Docker 镜像补齐 `openssl` 依赖，消除 Prisma 在 `migrate deploy` / `db:seed` 阶段的 OpenSSL 识别 warning。

## 处理过程

- 本地修改 [api/Dockerfile](/Users/i-datsuei/Desktop/Huigui%20CRM%20%26%20Quotation%20System/api/Dockerfile)，在 `builder` 和 `runner` 阶段都安装 `openssl`。
- 本地执行 `npm run lint -w @huigui/api` 通过。
- 由于本机 Docker daemon 未启动，未在本地完成镜像构建；改为直接在生产服务器重建 API 镜像。
- 远端确认 `api/Dockerfile` 已同步后，执行 `docker compose build api`。
- 远端执行 `docker compose up -d api` 切换新容器。
- 远端执行 `docker compose run --rm api npx prisma migrate deploy --schema=prisma/schema.prisma`。
- 远端执行 `docker compose run --rm api npm run db:seed`。

## 验证结果

- API 镜像重建成功。
- `prisma generate` 正常完成，无 OpenSSL 识别 warning。
- `prisma migrate deploy` 正常完成，无 OpenSSL 识别 warning。
- `npm run db:seed` 正常完成，无 OpenSSL 识别 warning。
- `https://crm.hui-health.com/api/health` 返回 `{"status":"ok","service":"huigui-api",...}`。
- `https://crm.hui-health.com/login` 返回 `HTTP/2 200`。

## 备份与回滚线索

- 本地源码备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260417-084150.tar.gz`
- 远端源码备份：`/opt/huigui-backups/huigui-crm-production-sync-20260417-084150.tar.gz`
- 如需回滚，可先恢复上述源码备份，再重新构建并启动容器。
