# 道冲手机端立猛真实账号 smoke 与收口归档

日期：2026-06-24

## 本轮目标

完成道冲手机端充值复核链路的最小真实账号验证，并在验证后把线上写入开关收回，只保留只读灰度能力。

本轮坚持的边界：

- 不给周立猛账号授予 `page.customers.detail` 客户详情通用权限。
- 不发送企业微信。
- 不新增客户、不新增充值记录。
- 只使用已点名的 1 条真实充值记录完成最小链路验证。
- 验证完成后关闭真实写入开关。

## 发布与备份

| 阶段 | 发布标签 / 备份 | 结果 |
| --- | --- | --- |
| 立猛专用权限包正式窄发布 | `daochong-mobile-limeng-real-permission-20260624-192735` | 成功 |
| 权限包备份 | `/opt/huigui-backups/daochong-mobile-limeng-real-permission-20260624-192735.tar.gz` | 已存在 |
| 立猛 scope 修复包正式窄发布 | `daochong-mobile-limeng-scope-fix-20260624-195739` | 成功 |
| scope 修复包备份 | `/opt/huigui-backups/daochong-mobile-limeng-scope-fix-20260624-195739.tar.gz` | 已存在 |
| 写入开关收口环境备份 | `/opt/huigui-backups/daochong-mobile-write-close-env-20260624-204304.env` | 已存在 |

## 变更边界

### 立猛专用权限包

- 新增立猛充值复核读取权限：`page.daochong.recharge_review`。
- 新增立猛充值复核动作权限：`action.daochong.recharge.limeng_review`。
- 新增立猛充值退回动作权限：`action.daochong.recharge.limeng_return`。
- `FINANCE` 角色获得上述 3 条道冲专用权限。
- `FINANCE` 角色仍未获得 `page.customers.detail`。
- 充值列表允许 `page.customers.detail` 或 `page.daochong.recharge_review` 任一权限读取。
- 立猛复核和立猛退回只认专用动作权限。

### 立猛 scope 修复包

真实 smoke 前发现：周立猛账号可以读取复核列表，但写复核时被客户归属部门范围挡住。原因是样本客户归属 `admin / 管理中心`，周立猛账号是 `财务人事 / DEPARTMENT` 范围。

修复方式：

- 立猛确认/退回仍要求专用动作权限。
- 立猛确认/退回不再额外套客户归属范围。
- 充值创建、程程审批、客户余额、客户详情等其它路径不放宽。
- 周立猛仍不能访问客户详情类接口。

## 验证记录

本地验证：

- `npm run verify:daochong-mobile-write`：通过。
- `npm run test:daochong-mobile-write`：14 条通过。
- API 类型检查：通过。
- Web 类型检查：通过。

线上发布验证：

- API / app 镜像构建成功。
- Prisma 迁移状态正常。
- scope 修复包发布时无待执行迁移。
- API / app / nginx 重启后服务正常。
- 公开路由验证：
  - `https://management.hui-health.com/api/health` -> `200`
  - `https://management.hui-health.com/daochong-mobile` -> `200`
  - `https://crm.hui-health.com/daochong-mobile` -> `200`
  - 未登录 `https://management.hui-health.com/api/daochong/mobile/compensation-rules` -> `401`

## 真实 smoke 结果

目标记录：

- 充值记录 ID：`cmqqptn4k0007s501p523g5fs`
- 客户：`道冲企微闭环测试-20260623201528`
- 金额：`1`
- 起始状态：`PENDING_CHENGCHENG_APPROVAL`

执行链路：

| 步骤 | 执行身份 | 结果 |
| --- | --- | --- |
| 程程阶段推进 | `seed-admin-user / admin / SUPER_ADMIN` | 状态变为 `PENDING_LIMENG_REVIEW` |
| 立猛复核 | `manual-DaDiShangDeYiXiangZhe-0e3106ca5b6611f19d0d56ca918eaa42 / 周立猛` | 状态变为 `CONFIRMED` |

最终记录状态：

- `rechargeStatus`：`CONFIRMED`
- `balanceAppliedAt`：`2026-06-24T12:12:33.303Z`
- `financeSummaryMonth`：`2026-06`
- `chengchengApprovedByUserId`：`seed-admin-user`
- `limengReviewedByUserId`：`manual-DaDiShangDeYiXiangZhe-0e3106ca5b6611f19d0d56ca918eaa42`
- `returnReason`：`null`

真实充值状态计数：

| 状态 | 数量 |
| --- | ---: |
| `CONFIRMED` | 2 |

## 权限读回

周立猛账号：

- 姓名：`周立猛`
- 登录账号：`DaDiShangDeYiXiangZhe`
- 部门：`财务人事`
- 角色：`FINANCE`
- 数据范围：`DEPARTMENT`
- 权限数量：37

关键权限：

| 权限 | 结果 |
| --- | --- |
| `page.daochong.recharge_review` | 有 |
| `action.daochong.recharge.limeng_review` | 有 |
| `action.daochong.recharge.limeng_return` | 有 |
| `page.customers.detail` | 无 |

边界验证：

- 周立猛可读取充值复核列表。
- 周立猛可完成立猛复核动作。
- 周立猛访问客户余额类客户详情接口仍返回 `403`。

## 当前线上状态

环境开关：

| 开关 | 当前值 |
| --- | --- |
| `NEXT_PUBLIC_DAOCHONG_MOBILE_DATA_SOURCE` | `api-readonly` |
| `NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH` | `true` |
| `DAOCHONG_MOBILE_SHADOW_READONLY` | `true` |
| `DAOCHONG_MOBILE_HIGH_RISK_READONLY` | `true` |
| `DAOCHONG_MOBILE_WRITE_ENABLED` | `false` |
| `DAOCHONG_WECOM_TEST_SEND_ENABLED` | `false` |
| `DAOCHONG_WECOM_TEST_ALLOWLIST` | 空 |

收口验证：

- 写接口调用返回 `403：道冲手机端真实写入未开启。`
- smoke 记录保持 `CONFIRMED`，收口前后未变化。
- 企业微信发送仍关闭。
- 最近日志未发现业务异常。

## 保持关闭

收口后仍保持关闭：

- 道冲手机端真实充值写入。
- 程程审批写入。
- 立猛复核写入。
- 服务纪要真实写入。
- 立猛退回写入。
- 程程退回写入。
- 企业微信测试发送。
- 企业微信白名单。
- 客户详情通用权限授予给财务角色。

## 下次重新开放写入的确认门

如后续要重新开放小范围真实写入，建议必须先进入：

**道冲手机端写入重开发布前确认门**

重开前建议复核：

- 当前 release 和线上文件仍是预期版本。
- `DAOCHONG_MOBILE_WRITE_ENABLED=false` 当前确实收口。
- 周立猛仍有 3 条专用权限且无 `page.customers.detail`。
- 企业微信发送仍关闭，白名单为空。
- 待验证的真实记录必须由用户点名。
- 明确是否允许真实余额应用。
- 明确是否允许程程阶段由超级管理员代推。
- 明确是否仍禁止企业微信发送。

确认后才允许把 `DAOCHONG_MOBILE_WRITE_ENABLED` 临时打开，并在 smoke 后再次收口。

## 结论

本轮真实链路已经闭环：立猛专用权限生效，周立猛真实账号可完成充值复核，客户详情通用权限未扩大，企业微信未发送。线上当前已回到只读灰度加写入关闭状态。
