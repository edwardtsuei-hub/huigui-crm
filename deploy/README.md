# 腾讯云 CVM 部署手册

本文档对应当前 monorepo 结构：

- 前端：`apps/web`，Next.js 14
- 后端：`apps/api`，NestJS 11
- ORM：Prisma
- 数据库：MySQL / 腾讯云 TDSQL-C MySQL
- 文件：腾讯云 COS
- 进程：PM2
- 反向代理：Nginx

## 1. 服务器准备

推荐配置：

- CVM：Ubuntu 22.04 LTS，4 核 8G
- 数据库：TDSQL-C MySQL 8.0
- COS：私有读写 Bucket
- 域名：`crm.hui-health.com`

初始化命令：

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip vim build-essential nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 2. 部署目录

```bash
sudo mkdir -p /srv/huigui/current
sudo mkdir -p /srv/huigui/logs
sudo chown -R $USER:$USER /srv/huigui
```

克隆项目：

```bash
cd /srv/huigui/current
git clone <你的仓库地址> .
```

## 3. 安装依赖

```bash
cd /srv/huigui/current
npm install
```

## 4. 环境变量

后端：

```bash
cp apps/api/.env.example apps/api/.env
vim apps/api/.env
```

前端：

```bash
cp apps/web/.env.example apps/web/.env
vim apps/web/.env
```

如果你希望本地开发和服务器共用一份变量，也可以维护根目录 `.env` 作为补充。

## 5. Prisma 初始化

```bash
cd /srv/huigui/current
npm run db:generate
npx prisma migrate deploy
npm run db:seed
```

## 6. 构建

```bash
cd /srv/huigui/current
npm run build
```

## 7. PM2 启动

推荐使用仓库内的 PM2 配置：

```bash
cd /srv/huigui/current
pm2 start deploy/pm2/ecosystem.config.cjs
pm2 save
pm2 startup
```

如果你更喜欢命令式启动，可以直接执行：

```bash
cd /srv/huigui/current
PORT=3001 pm2 start "npm run start -w @huigui/api" --name huigui-api
PORT=3000 HOSTNAME=0.0.0.0 pm2 start "npm run start -w @huigui/web" --name huigui-web
pm2 save
```

## 8. Nginx 配置

复制示例配置：

```bash
sudo cp deploy/nginx/huigui.conf /etc/nginx/sites-available/huigui
sudo ln -sf /etc/nginx/sites-available/huigui /etc/nginx/sites-enabled/huigui
sudo nginx -t
sudo systemctl reload nginx
```

确认 `server_name`、证书路径和 DNS 解析都已指向 `crm.hui-health.com`。

## 9. 部署后检查

```bash
pm2 status
pm2 logs huigui-api
pm2 logs huigui-web
curl http://127.0.0.1:3001/api/health
```

浏览器检查：

- `https://crm.hui-health.com/login`
- `https://crm.hui-health.com/dashboard`

## 10. 第一阶段上线范围

- 客户管理
- 产品管理
- 农业方案报价
- 通用报价
- 报价记录与 PDF 导出

## 11. 后续扩展

- COS 上传接口：`/api/files/upload-token`、`/api/files/callback`
- 企业微信登录：Sprint 2 接入
- 企业微信消息提醒：Sprint 3 接入

## 12. HTTPS 回归检查

证书续期、Nginx 重载或 Docker 重建后，可以直接运行仓库内的脚本做一轮入口回归：

```bash
cd /srv/huigui/current
CRM_DOMAIN=crm.hui-health.com ./scripts/ops/check-crm-https.sh
```

如果希望顺带校验登录接口，可临时传入管理员账号：

```bash
CRM_DOMAIN=crm.hui-health.com CRM_USERNAME=admin CRM_PASSWORD='Huigui@123' ./scripts/ops/check-crm-https.sh
```

## 13. 本地工作区直推生产

如果当前修改还没有整理成 Git 提交，但需要把“本地当前状态”完整同步到生产服务器，优先使用：

```bash
./scripts/ops/deploy-local-to-production.sh
```

这条脚本会自动执行：

- 备份服务器当前源代码到 `/opt/huigui-backups/`
- 用 `rsync` 将本地工作区同步到 `/opt/huigui-crm`
- 重建并重启 `api / app / nginx`
- 等待 API 健康检查恢复
- 执行 `npm run db:seed`
- 运行 HTTPS 回归脚本

每次执行完成后，记得同步更新：

- `docs/deployment-log.md`
- `docs/deployments/`
