"use client";

import { useMemo, useState } from "react";

type SearchGroupKey =
  | "customer"
  | "quotation"
  | "order"
  | "inspection"
  | "member"
  | "entry";

type PreviewItem = {
  group: SearchGroupKey;
  title: string;
  subtitle: string;
  hint: string;
  keywords: string[];
};

const initialQuery = "张小兰";

const previewItems: PreviewItem[] = [
  {
    group: "customer",
    title: "张小兰",
    subtitle: "家庭种植试用客户 · 山东省 / 青岛 / 黄岛区",
    hint: "客户详情",
    keywords: ["张小兰", "家庭种植试用客户", "青岛", "黄岛区", "customer"],
  },
  {
    group: "quotation",
    title: "GEN-20260415-NRFA",
    subtitle: "华穗示范农场 · 已生成 · ¥18,600",
    hint: "报价详情",
    keywords: ["gen-20260415-nrfa", "华穗示范农场", "18600", "quotation"],
  },
  {
    group: "order",
    title: "SO-20260415-001",
    subtitle: "张小兰 · CONFIRMED · 待发货",
    hint: "订单详情",
    keywords: ["so-20260415-001", "张小兰", "待发货", "order"],
  },
  {
    group: "inspection",
    title: "JC20260417-010",
    subtitle: "光伏板清洁测试 · 中析研究院 · 草稿",
    hint: "检测详情",
    keywords: ["jc20260417-010", "光伏板清洁测试", "中析研究院", "inspection"],
  },
  {
    group: "member",
    title: "admin",
    subtitle: "超级管理员 · 管理中心",
    hint: "成员管理",
    keywords: ["admin", "超级管理员", "管理中心", "member"],
  },
  {
    group: "entry",
    title: "财务账户配置",
    subtitle: "工作台入口 · 设置 / 财务",
    hint: "工作台入口",
    keywords: ["财务账户", "设置", "finance", "entry"],
  },
];

const groupMeta: Record<
  SearchGroupKey,
  { label: string; accent: string; background: string }
> = {
  customer: {
    label: "客户",
    accent: "var(--brand-strong)",
    background: "rgba(61, 151, 96, 0.12)",
  },
  quotation: {
    label: "报价",
    accent: "var(--warning)",
    background: "rgba(255, 200, 110, 0.18)",
  },
  order: {
    label: "订单",
    accent: "var(--success)",
    background: "rgba(59, 176, 108, 0.14)",
  },
  inspection: {
    label: "检测",
    accent: "var(--danger)",
    background: "rgba(184, 73, 63, 0.12)",
  },
  member: {
    label: "成员",
    accent: "var(--text-strong)",
    background: "rgba(16, 33, 23, 0.08)",
  },
  entry: {
    label: "入口",
    accent: "var(--muted-strong)",
    background: "rgba(111, 127, 115, 0.12)",
  },
};

const groupOrder: SearchGroupKey[] = [
  "customer",
  "quotation",
  "order",
  "inspection",
  "member",
  "entry",
];

function matchItem(item: PreviewItem, keyword: string) {
  if (!keyword) {
    return false;
  }

  return item.keywords.some((entry) => entry.toLowerCase().includes(keyword));
}

export function GlobalSearchPreview() {
  const [query, setQuery] = useState(initialQuery);

  const trimmedQuery = query.trim();

  const groupedResults = useMemo(() => {
    const keyword = trimmedQuery.toLowerCase();

    return groupOrder
      .map((group) => ({
        group,
        items: previewItems.filter(
          (item) => item.group === group && matchItem(item, keyword),
        ),
      }))
      .filter((entry) => entry.items.length > 0);
  }, [trimmedQuery]);

  const totalResults = groupedResults.reduce(
    (sum, entry) => sum + entry.items.length,
    0,
  );

  const hasQuery = trimmedQuery.length > 0;
  const hasResults = totalResults > 0;

  return (
    <div className="workspace-stack">
      <section className="panel stack" style={{ overflow: "visible" }}>
        <div style={{ display: "grid", gap: 8 }}>
          <strong style={{ fontSize: 14, color: "var(--text-strong)" }}>
            搜索预览：只验证顶栏入口与独立搜索层
          </strong>
          <p style={{ margin: 0, color: "var(--muted-strong)", lineHeight: 1.65 }}>
            现在支持可输入、可清空，用来确认搜索层层级与空状态是否顺眼。
          </p>
        </div>

        <header
          className="topbar"
          style={{
            position: "relative",
            border: "1px solid var(--line)",
            borderRadius: 26,
            background: "rgba(255, 255, 255, 0.94)",
            boxShadow: "0 10px 22px rgba(20, 36, 26, 0.05)",
          }}
        >
          <div className="topbar__page">
            <h1 className="topbar__page-title">客户详情</h1>
            <p className="topbar__page-subtitle">
              模拟真实页面顶栏位置，不改正式业务逻辑。
            </p>
          </div>

          <div className="topbar__actions">
            <div className="data-mode-badge">
              <strong>正式数据</strong>
              <span>员工可见</span>
            </div>

            <div
              className="command-search"
              style={{ minWidth: 380, flex: "0 1 420px" }}
            >
              <div
                className="command-search__field"
                style={{
                  background: "rgba(248, 250, 248, 0.98)",
                  boxShadow: "inset 0 0 0 1px rgba(34, 52, 39, 0.06)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    color: "var(--muted)",
                    fontSize: 16,
                    lineHeight: 1,
                  }}
                >
                  ⌕
                </span>
                <input
                  aria-label="全域搜索预览"
                  className="command-search__input"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索客户、报价、订单、检测、成员或入口"
                  value={query}
                />
                {hasQuery ? (
                  <button
                    aria-label="清空搜索词"
                    type="button"
                    onClick={() => setQuery("")}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--muted)",
                      fontSize: 16,
                      cursor: "pointer",
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>

            <button className="button secondary inline" type="button">
              快捷创建
            </button>

            <button
              aria-label="通知预览"
              className="bell-button"
              type="button"
            >
              <span aria-hidden="true" style={{ fontSize: 16 }}>
                🔔
              </span>
              <span className="bell-button__count">1</span>
            </button>

            <button className="button ghost inline" type="button">
              admin / 超级管理员
            </button>
          </div>
        </header>

        <section
          style={{
            marginTop: 2,
            padding: 18,
            border: "1px solid rgba(34, 52, 39, 0.08)",
            borderRadius: 26,
            background: "rgba(255, 255, 255, 0.98)",
            boxShadow: "0 10px 22px rgba(20, 36, 26, 0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              paddingBottom: 12,
              borderBottom: "1px solid rgba(34, 52, 39, 0.08)",
            }}
          >
            <div style={{ display: "grid", gap: 4 }}>
              <strong style={{ fontSize: 18, color: "var(--text-strong)" }}>
                全局搜索
              </strong>
              <p style={{ margin: 0, color: "var(--muted-strong)" }}>
                搜索结果进入独立搜索层，正文退后，但不会被结果层直接压住。
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "var(--muted-strong)",
                fontSize: 13,
              }}
            >
              <span>关键词：{hasQuery ? trimmedQuery : "未输入"}</span>
              <span>·</span>
              <span>{totalResults} 条结果</span>
              <button className="button ghost inline" type="button">
                关闭
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 0,
              marginTop: 10,
              borderRadius: 18,
              overflow: "hidden",
              background: "rgba(255, 255, 255, 0.96)",
              border: "1px solid rgba(34, 52, 39, 0.06)",
            }}
          >
            {hasQuery && hasResults ? (
              groupedResults.map((entry, index) => (
                <section
                  key={entry.group}
                  style={{
                    display: "grid",
                    gap: 8,
                    padding: "14px 16px",
                    borderTop:
                      index === 0 ? "none" : "1px solid rgba(34, 52, 39, 0.06)",
                    background: "rgba(255, 255, 255, 0.98)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <strong
                      style={{
                        fontSize: 12,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--muted-strong)",
                      }}
                    >
                      {groupMeta[entry.group].label}
                    </strong>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      {entry.items.length} 条
                    </span>
                  </div>

                  {entry.items.map((item) => (
                    <button
                      key={`${item.group}-${item.title}`}
                      type="button"
                      style={{
                        display: "grid",
                        gap: 4,
                        padding: "14px 16px",
                        borderRadius: 16,
                        border: "1px solid rgba(34, 52, 39, 0.06)",
                        background: "#ffffff",
                        textAlign: "left",
                        cursor: "pointer",
                        boxShadow: "0 1px 2px rgba(20, 36, 26, 0.03)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <strong style={{ fontSize: 16, color: "var(--text-strong)" }}>
                          {item.title}
                        </strong>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: groupMeta[item.group].background,
                            color: groupMeta[item.group].accent,
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {groupMeta[item.group].label}
                        </span>
                      </div>
                      <span style={{ color: "var(--muted-strong)", fontSize: 14 }}>
                        {item.subtitle}
                      </span>
                      <span style={{ color: "var(--muted)", fontSize: 13 }}>
                        {item.hint}
                      </span>
                    </button>
                  ))}
                </section>
              ))
            ) : hasQuery ? (
              <div
                style={{
                  display: "grid",
                  gap: 4,
                  padding: "22px 18px",
                  background: "#ffffff",
                }}
              >
                <strong style={{ fontSize: 15, color: "var(--text-strong)" }}>
                  没有找到匹配结果
                </strong>
                <span style={{ color: "var(--muted-strong)", fontSize: 14 }}>
                  这版只是预览逻辑，你可以继续换关键词确认空状态与层级。
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 4,
                  padding: "22px 18px",
                  background: "#ffffff",
                }}
              >
                <strong style={{ fontSize: 15, color: "var(--text-strong)" }}>
                  请输入关键词
                </strong>
                <span style={{ color: "var(--muted-strong)", fontSize: 14 }}>
                  删除默认词后，这里会先显示空状态，不直接塞满静态结果。
                </span>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 12,
              color: "var(--muted-strong)",
              fontSize: 13,
            }}
          >
            <span>这版重点：可输入、可清空、结果层更干净</span>
            <span>·</span>
            <span>第一版结果优先级：客户、报价、订单、检测、成员、入口</span>
          </div>
        </section>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
          gap: 20,
          opacity: 0.52,
          filter: "saturate(0.8)",
        }}
      >
        <section className="panel stack">
          <div className="panel-header">
            <div>
              <strong>客户详情骨架</strong>
              <p style={{ margin: "6px 0 0", color: "var(--muted-strong)" }}>
                搜索打开时，正文退后，但仍保留页面上下文。
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <div
              style={{
                display: "grid",
                gap: 8,
                padding: 16,
                borderRadius: 18,
                background: "var(--bg-muted)",
              }}
            >
              <strong style={{ fontSize: 18 }}>张小兰</strong>
              <span style={{ color: "var(--muted-strong)" }}>
                家庭种植试用客户 · 山东省 / 青岛 / 黄岛区
              </span>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span className="button ghost inline">编辑客户</span>
                <span className="button ghost inline">新增提醒</span>
                <span className="button ghost inline">新建报价</span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {[
                ["当前状态", "已联系"],
                ["意向评分", "55"],
                ["预计金额", "¥600"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "grid",
                    gap: 6,
                    padding: 14,
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.72)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <span style={{ color: "var(--muted)" }}>{label}</span>
                  <strong style={{ fontSize: 18 }}>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel stack">
          <div className="panel-header">
            <div>
              <strong>第一版结果范围</strong>
              <p style={{ margin: "6px 0 0", color: "var(--muted-strong)" }}>
                搜索层独立显示，结果优先级按业务对象排序。
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {groupOrder.map((group) => (
              <div
                key={group}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 16,
                  background: "var(--bg-muted)",
                }}
              >
                <strong>{groupMeta[group].label}</strong>
                <span style={{ color: "var(--muted-strong)", fontSize: 13 }}>
                  {group === "entry" ? "保留，但排在业务对象之后" : "第一版纳入"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
