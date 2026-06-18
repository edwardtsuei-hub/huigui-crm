# 员工端薪资前端立猛账号灰度验证记录（2026-06-18）

## 结论

已按“使用立猛账号测试”的口径，在本机隔离测试库完成身份与薪资 API 验证、候选前端静态资源 smoke，并补完成可操作 Chrome 浏览器渲染与基础点击流验证。

本次仍未部署、未上传服务器、未切换 `current.release`、未写生产数据库、未发送企业微信真实通知。

## 测试边界

- 测试库：本机隔离库 `huigui_crm_payroll_test`。
- MySQL 端口：`127.0.0.1:3307`。
- API：本机 `http://127.0.0.1:4000/api`。
- 前端预览：本机 `http://127.0.0.1:4173`。
- 候选 release id：`20260618063203`。
- 候选包目录：`output/employee-frontend/release-candidates/employee-frontend-payroll-20260618063203`。
- 当前线上员工端 release 仍为：`20260616090241`。

## 本机测试账号

- 姓名：`周立猛`。
- 登录账号：`finance-zhoulimeng`。
- 企微用户 ID：`finance-zhoulimeng`。
- 角色：`FINANCE`。

本机测试过程中只重置了本机测试库中的该账号密码，用于标准登录 API 验证；未记录、未提交、未输出密码。

## 本机测试数据

- 月份：`2026-06`。
- 测试发布批次：`salary-publish-2026-06-limeng-gray`。
- 薪资条员工：`周立猛`。
- `teacherId`：`finance-zhoulimeng`。
- `loginAccount`：`finance-zhoulimeng`。
- `wecomUserId`：`finance-zhoulimeng`。
- 实发金额：`17700`。

该数据仅存在于本机隔离测试库，用于验证立猛身份字段可正确读回薪资条。

## 已通过验证

### API 健康检查

- `GET /api/health` 返回 HTTP 200。
- 返回 `status=ok`。

### 立猛账号标准登录

- `POST /api/auth/login` 返回 HTTP 201。
- 返回 access token。
- 返回用户为 `周立猛 / finance-zhoulimeng / FINANCE`。

### 立猛本人薪资读取

- `GET /api/me/salary-slips` 返回 HTTP 200。
- 只读回 1 条立猛本人薪资。
- 返回月份为 `2026-06`。
- 返回发布批次为 `salary-publish-2026-06-limeng-gray`。
- 返回身份字段为 `teacherId=user/wecom/loginAccount` 同一立猛身份链路。
- 返回实发金额为 `17700`。

### 财务按批次查询

- `GET /api/salary-slips?month=2026-06&publishBatchId=salary-publish-2026-06-limeng-gray` 返回 HTTP 200。
- 以 `FINANCE` 身份可查询到同一批次薪资条。
- 返回记录与本人读取一致。

### 候选前端静态资源

- `GET /payroll/batch?month=2026-06` 返回 HTTP 200。
- 返回候选前端 `index.html`。
- `index.html` 正确引用候选 JS：`/assets/index-ieN88Nfq.js`。
- `index.html` 正确引用候选 CSS：`/assets/index-EwN2VLzK.css`。
- 候选 JS 返回 HTTP 200。
- 候选 CSS 返回 HTTP 200。

### 可操作 Chrome 浏览器复验

- 使用本机 Chrome 打开候选预览：`http://127.0.0.1:4173/__auth`。
- 预览入口通过本机测试库和标准登录 API 写入浏览器会话；未输出、未提交密码或 token。
- 浏览器自动跳转到 `http://127.0.0.1:4173/payroll/batch?month=2026-06`。
- 页面可见 `大愛歸心员工端`、`薪资上传与发送`、当前用户 `周立猛`。
- 页面可见主入口 `薪资批量`、`导入中心`。
- `薪资批量发送` 页面可见月份 `2026-06`、`上传薪资表`、`发布追溯`、`薪资明细`、`通知名单`、`跳过名单`。
- 未出现 `当前账号没有薪资维护权限` 或无权限拦截页。
- 点击左侧 `导入中心` 后，浏览器进入 `http://127.0.0.1:4173/finance/imports?type=salary_slip&month=2026-06&returnTo=%2Fpayroll%2Fbatch`。
- `导入中心` 页面可见 `上传薪资表`、文件选择入口、`返回核对`。
- 点击 `返回核对` 后，浏览器回到 `http://127.0.0.1:4173/payroll/batch?month=2026-06`。

补充说明：

- 本机测试库当前已有一份旧草稿批次 `salary-publish-2026-06-20260617223618`，因此批量页展示的是该草稿的核对状态。
- 本轮没有选择真实薪资文件上传。
- 本轮没有勾选确认项。
- 本轮没有点击 `发布并记录通知`。
- 本轮没有发送企业微信真实通知。

## 未完成验证

### 浏览器端发布动作

本轮已完成可视化页面渲染、立猛账号进入、导入中心点击、返回核对点击。

仍不宣称以下事项已通过：

- 浏览器端选择真实薪资文件并完成解析。
- 勾选确认后发布薪资条。
- 记录通知日志。
- 发送或 dry-run 企业微信通知。

## 安全核对

- 未改 `apps/web/public/employee-frontend/current.release`。
- 未改 `apps/web/public/employee-frontend/current`。
- 未改 `apps/web/public/employee-frontend/releases/20260616090241/**`。
- 未部署候选包。
- 未发企业微信通知。
- 未写生产数据库。

## 当前判断

立猛账号的后端身份、权限和薪资读回链路已在本机测试库通过。

候选前端静态资源可被本机预览服务正常返回。

候选前端已通过可操作 Chrome 浏览器基础复验：立猛账号可进入薪资批量页、导入中心，并可从导入中心返回核对页。

正式 Go / No-Go 之前还缺：

- 真实文件上传点击流验证。
- 浏览器端发布与通知记录验证。
- 是否允许把候选包放到服务器并行灰度路径。
- 是否允许正式切换 `current.release`。
