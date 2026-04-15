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
- 域名：`crm.example.com`

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

把 `crm.example.com`、证书路径替换为你的正式值。

## 9. 部署后检查

```bash
pm2 status
pm2 logs huigui-api
pm2 logs huigui-web
curl http://127.0.0.1:3001/api/health
```

浏览器检查：

- `https://crm.example.com/login`
- `https://crm.example.com/dashboard`

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
