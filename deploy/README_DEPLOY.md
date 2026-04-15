# 腾讯云 Lighthouse Docker CE 部署说明

本文档适用于：

- 服务器：腾讯云 Lighthouse
- 系统：Ubuntu
- 镜像：Docker CE
- 部署方式：`docker compose`

当前部署结构：

- `nginx`：统一入口，80 端口对外
- `app`：Next.js，容器内监听 `3000`
- `api`：NestJS，容器内监听 `3001`
- `mysql`：本机 Docker 部署 MySQL 8.0
- `api/start.sh`：容器启动时等待数据库、执行 `npx prisma migrate deploy`，再启动 NestJS

## 1. 首次准备

把项目上传或拉到服务器，例如：

```bash
cd /opt
git clone <your-repo-url> huigui-crm
cd huigui-crm
```

复制环境变量模板：

```bash
cp .env.example .env
vim .env
```

至少需要确认这些变量：

- `APP_BASE_URL`
- `JWT_SECRET`
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_PASSWORD`
- `DB_HOST` / `DB_PORT`
- `COS_*`

如果你准备改用腾讯云数据库：

- 将 `DB_HOST` 改为云数据库内网地址
- 按需调整 `DB_PORT`
- 如密码包含特殊字符，直接填写 `DATABASE_URL`
- 部署时使用 `./deploy/deploy.sh --skip-mysql`

## 2. 一键部署

给脚本执行权限：

```bash
chmod +x api/start.sh
chmod +x deploy/deploy.sh
```

使用本机 Docker MySQL 部署：

```bash
./deploy/deploy.sh
```

部署完成后查看状态：

```bash
docker compose config
docker compose ps
docker compose logs -f nginx api app
```

## 3. 目录说明

- `docker-compose.yml`：整套容器编排
- `app/Dockerfile`：前端镜像
- `api/Dockerfile`：后端镜像
- `deploy/nginx.conf`：Nginx 反向代理配置
- `deploy/deploy.sh`：部署脚本
- `storage/mysql`：MySQL 数据目录
- `storage/uploads`：本地上传目录

## 4. 路由转发规则

- `/` -> `app:3000`
- `/api/` -> `api:3001`
- `/uploads/` -> Nginx 直接读取挂载目录

## 5. Prisma 迁移策略

后端容器启动时会自动执行：

```bash
npx prisma migrate deploy
```

所以正常流程下不需要手动进入容器执行迁移。

## 6. 切换到腾讯云数据库

当前 compose 默认带本机 MySQL，后续切换腾讯云数据库时不需要改 Dockerfile。

只需要：

1. 修改 `.env`
2. 将 `DB_HOST`、`DB_PORT`、`MYSQL_DATABASE`、`MYSQL_USER`、`MYSQL_PASSWORD` 改为腾讯云数据库信息
3. 如果密码包含特殊字符，建议直接填写完整的 `DATABASE_URL`
4. 使用跳过本机 MySQL 的方式启动

命令如下：

```bash
./deploy/deploy.sh --skip-mysql
```

这时只会启动：

- `nginx`
- `app`
- `api`

不会启动本机 `mysql` 容器。

## 7. 常用命令

重建并更新容器：

```bash
docker compose up -d --build
```

只看后端日志：

```bash
docker compose logs -f api
```

只重启后端：

```bash
docker compose restart api
```

停止整套服务：

```bash
docker compose down
```

停止并删除本机数据库容器：

```bash
docker compose stop mysql
docker compose rm -f mysql
```

## 8. 上线前检查

- 域名是否已解析到 Lighthouse 公网 IP
- Lighthouse 安全组是否已放行 `80`
- `.env` 中 `APP_BASE_URL` 是否为正式域名
- COS 配置是否完整
- 数据库密码和 `JWT_SECRET` 是否已替换默认值
