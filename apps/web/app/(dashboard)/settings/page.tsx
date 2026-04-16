"use client";

import Link from "next/link";
import { WorkspacePageHeader } from "../../../components/dashboard/WorkspacePageHeader";
import { API_BASE_URL, getCurrentUser } from "../../../lib/api";

const moduleStatus = [
  {
    name: "客户与报价",
    status: "已上线",
    note: "客户管理、农业方案、通用报价与报价归档已可直接操作。",
  },
  {
    name: "提醒体系",
    status: "已上线",
    note: "提醒和未读状态已接通，支持列表筛选与批量已读。",
  },
  {
    name: "产品素材库",
    status: "迭代中",
    note: "已补齐专属新建 / 编辑 / 详情页，图片上传仍先以 URL 方式接入。",
  },
  {
    name: "系统集成",
    status: "预留中",
    note: "企业微信、文件上传与日历排期接口已预留，后续继续接实装配置。",
  },
];

const quickLinks = [
  { href: "/customers/new", label: "新增客户", note: "补齐负责人与合作方向" },
  { href: "/products/new", label: "新增产品", note: "沉淀价格、模板与素材" },
  { href: "/schedule", label: "提醒历史", note: "查看今日提醒与未读" },
  { href: "/quotations", label: "档案中心", note: "回看历史报价与 PDF" },
];

export default function SettingsPage() {
  const currentUser = getCurrentUser();

  return (
    <div className="workspace-stack">
      <WorkspacePageHeader
        description="设置页继续承担总控台角色，用来查看当前环境、模块状态与常用管理入口，不再使用说明型 hero。"
        eyebrow="系统配置"
        meta={[
          { label: "当前账号", value: currentUser?.displayName ?? "未登录" },
          { label: "角色", value: currentUser?.roleName ?? "未知" },
        ]}
        title="设置"
      />

      <section className="split-workspace">
        <div className="workspace-main">
          <section className="panel stack">
            <div className="section-heading">
              <h3>模块状态</h3>
              <p>
                这里不是传统空白设置页，而是一页式看到当前系统哪些功能已可用、哪些还在迭代。
              </p>
            </div>

            <div className="stack">
              {moduleStatus.map((item) => (
                <article className="summary-card" key={item.name}>
                  <div className="summary-list">
                    <div className="summary-row">
                      <span>{item.name}</span>
                      <span
                        className={`status-pill ${item.status === "已上线" ? "success" : item.status === "迭代中" ? "warning" : "neutral"}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="small muted">{item.note}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>常用入口</h3>
              <p>把最常用的配置相关操作聚合在这里，减少来回切页找入口。</p>
            </div>

            <div className="grid-2">
              {quickLinks.map((item) => (
                <Link className="quote-card" href={item.href} key={item.href}>
                  <strong>{item.label}</strong>
                  <div className="small muted" style={{ marginTop: 8 }}>
                    {item.note}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className="workspace-side sticky-side">
          <section className="panel stack">
            <div className="section-heading">
              <h3>当前会话</h3>
              <p>
                用来快速确认登录角色与当前 API 指向，方便排查权限或环境问题。
              </p>
            </div>

            <div className="summary-card">
              <div className="summary-list">
                <div className="summary-row">
                  <span>当前账号</span>
                  <strong>{currentUser?.displayName ?? "未登录"}</strong>
                </div>
                <div className="summary-row">
                  <span>角色</span>
                  <strong>{currentUser?.roleName ?? "未知"}</strong>
                </div>
                <div className="summary-row">
                  <span>API 地址</span>
                  <strong style={{ fontSize: 14 }}>{API_BASE_URL}</strong>
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="section-heading">
                <h3>下一阶段建议</h3>
                <p>
                  优先把通知策略、文件上传和企业微信配置做成真正可编辑的配置项，再把这里接到保存
                  API。
                </p>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
