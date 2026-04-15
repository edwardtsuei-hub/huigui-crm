# 项目结构

```text
.
├── apps
│   ├── api
│   │   ├── src
│   │   │   ├── auth
│   │   │   ├── customers
│   │   │   ├── products
│   │   │   ├── agriculture-plans
│   │   │   ├── general-quotes
│   │   │   ├── quotations
│   │   │   ├── meta
│   │   │   ├── health
│   │   │   ├── prisma
│   │   │   └── common
│   │   ├── package.json
│   │   └── .env.example
│   └── web
│       ├── app
│       │   ├── (auth)
│       │   └── (dashboard)
│       ├── lib
│       ├── package.json
│       └── .env.example
├── prisma
│   ├── migrations
│   ├── seed
│   └── schema.prisma
├── deploy
│   ├── nginx
│   └── pm2
└── docs
```

## 第一阶段已覆盖

- 登录与基础权限
- 客户管理
- 产品管理
- 农业方案报价
- 通用报价
- 报价记录与 PDF 导出

## 第二阶段预留

- COS 上传
- 合同管理
- 首页工作台增强
- 企业微信登录与提醒
