"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./FilesWorkbenchPreview.module.css";

type PreviewViewKey = "all" | "contracts" | "delivery" | "trash";
type PreviewSurfaceMode = "list" | "grid";
type PreviewTone = "neutral" | "success" | "warning" | "danger";

type PreviewItem = {
  id: string;
  type: "file" | "folder";
  title: string;
  subtitle: string;
  category: string;
  owner: string;
  updatedAt: string;
  status: string;
  tone: PreviewTone;
  tags: string[];
  view: PreviewViewKey[];
  note: string;
};

const previewViews: Array<{
  key: PreviewViewKey;
  label: string;
  helper: string;
}> = [
  { key: "all", label: "全部文件", helper: "正式档案与目录" },
  { key: "contracts", label: "合同文件", helper: "签章与版本记录" },
  { key: "delivery", label: "客户交付", helper: "交付资料与证明" },
  { key: "trash", label: "回收区", helper: "管理员复核与清理" },
];

const previewItems: PreviewItem[] = [
  {
    id: "folder-contracts",
    type: "folder",
    title: "2026 合同档案",
    subtitle: "32 份文件 · 法务与销售共用",
    category: "目录",
    owner: "法务组",
    updatedAt: "今天 16:20",
    status: "稳定",
    tone: "neutral",
    tags: ["年度档案", "高频访问"],
    view: ["all", "contracts"],
    note: "用于展示目录作为主要入口时的高级感与秩序感。",
  },
  {
    id: "file-master",
    type: "file",
    title: "华东区域经销合作协议 V7",
    subtitle: "PDF · 3.2 MB · 已完成电子签章",
    category: "合同文件",
    owner: "陈雅萍",
    updatedAt: "今天 14:05",
    status: "已生效",
    tone: "success",
    tags: ["签章版", "华东", "核心客户"],
    view: ["all", "contracts"],
    note: "高频合同展示行，强调文件名、版本状态和更新时间的层级。",
  },
  {
    id: "file-delivery",
    type: "file",
    title: "客户培训交付包 04-18",
    subtitle: "ZIP · 186 MB · 含 PDF、PPT、录屏",
    category: "客户交付",
    owner: "李昊",
    updatedAt: "昨天 18:40",
    status: "待审核",
    tone: "warning",
    tags: ["培训", "交付", "需复核"],
    view: ["all", "delivery"],
    note: "交付类文件在这版里会更像运营对象，而不是单纯附件列表。",
  },
  {
    id: "file-obsolete",
    type: "file",
    title: "旧版产品报价附件 2025-Q4",
    subtitle: "XLSX · 940 KB · 历史模板",
    category: "报价附件",
    owner: "周晨",
    updatedAt: "04-16 09:18",
    status: "已归档",
    tone: "neutral",
    tags: ["旧版", "报价", "归档"],
    view: ["all"],
    note: "归档状态改为安静的中性色，不再和主内容抢焦点。",
  },
  {
    id: "trash-wrong-upload",
    type: "file",
    title: "误传文件示例：检测图片原始包",
    subtitle: "RAR · 24 MB · 误传文件",
    category: "回收区",
    owner: "刘哲",
    updatedAt: "今天 10:12",
    status: "7 天内到期",
    tone: "danger",
    tags: ["误传文件", "待清理"],
    view: ["trash"],
    note: "回收区里所有危险操作会集中到底部 action zone，不会分散在整页。",
  },
];

const metrics = [
  { label: "活跃文件", value: "1,286", helper: "较上周 +8.4%" },
  { label: "待审核", value: "43", helper: "交付与合同混合队列" },
  { label: "7 天内到期", value: "12", helper: "来自回收区自动清理策略" },
];

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function ToneBadge({ tone, children }: { tone: PreviewTone; children: string }) {
  return (
    <span className={cx(styles.badge, styles[`badge${tone[0].toUpperCase()}${tone.slice(1)}`])}>
      {children}
    </span>
  );
}

function FolderIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3.5 7.5h6l2 2h9v7a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 9.5v-1a3 3 0 0 1 3-3h3.8l2 2H20.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6.5 4.5h7l4 4v10a2.5 2.5 0 0 1-2.5 2.5h-8A2.5 2.5 0 0 1 4.5 18.5v-11A3 3 0 0 1 6.5 4.5Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M13.5 4.5v4h4" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function FilesWorkbenchPreview() {
  const [activeView, setActiveView] = useState<PreviewViewKey>("all");
  const [surfaceMode, setSurfaceMode] = useState<PreviewSurfaceMode>("list");
  const [selectedId, setSelectedId] = useState("file-master");

  const visibleItems = useMemo(
    () => previewItems.filter((item) => item.view.includes(activeView)),
    [activeView],
  );

  useEffect(() => {
    if (!visibleItems.some((item) => item.id === selectedId)) {
      setSelectedId(visibleItems[0]?.id ?? "");
    }
  }, [selectedId, visibleItems]);

  const selectedItem =
    visibleItems.find((item) => item.id === selectedId) ?? visibleItems[0] ?? null;

  return (
    <div className={styles.previewPage}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.previewEyebrow}>Preview only</span>
          <h1>档案中心高級版测试页</h1>
          <p>
            这版先专注于高级感和专业度验证，不接真实接口。你先确认版型、层级、质感，
            喜欢后我再把它同步回正式的 FilesWorkbench。
          </p>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.primaryAction} type="button">
            作为正式页候选
          </button>
          <button className={styles.secondaryAction} type="button">
            保留当前正式页
          </button>
        </div>
      </section>

      <section className={styles.metricStrip}>
        {metrics.map((metric) => (
          <article className={styles.metricCard} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.helper}</small>
          </article>
        ))}
      </section>

      <section className={styles.workspace}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span>档案视图</span>
            <strong>更像企业工作台的导航</strong>
          </div>
          <div className={styles.sidebarGroup}>
            {previewViews.map((view) => (
              <button
                className={cx(styles.sidebarItem, activeView === view.key && styles.sidebarItemActive)}
                key={view.key}
                onClick={() => setActiveView(view.key)}
                type="button"
              >
                <div>
                  <strong>{view.label}</strong>
                  <small>{view.helper}</small>
                </div>
                <span>{previewItems.filter((item) => item.view.includes(view.key)).length}</span>
              </button>
            ))}
          </div>
          <div className={styles.sidebarFooter}>
            <span>目录浏览</span>
            <button className={styles.folderLink} type="button">
              <FolderIcon />
              2026 合同档案
            </button>
            <button className={styles.folderLink} type="button">
              <FolderIcon />
              客户交付中心
            </button>
            <button className={styles.folderLink} type="button">
              <FolderIcon />
              内部制度文档
            </button>
          </div>
        </aside>

        <main className={styles.mainStage}>
          <section className={styles.filterBar}>
            <div className={styles.crumbs}>
              <span>档案中心</span>
              <span>/</span>
              <strong>{previewViews.find((view) => view.key === activeView)?.label}</strong>
            </div>
            <label className={styles.searchField}>
              <span>搜索文件名、标签、上传人</span>
              <input defaultValue={activeView === "trash" ? "误传文件" : ""} />
            </label>
            <div className={styles.filterActions}>
              <button className={styles.filterButton} type="button">
                更多筛选
              </button>
              <button
                className={cx(styles.modeButton, surfaceMode === "list" && styles.modeButtonActive)}
                onClick={() => setSurfaceMode("list")}
                type="button"
              >
                列表
              </button>
              <button
                className={cx(styles.modeButton, surfaceMode === "grid" && styles.modeButtonActive)}
                onClick={() => setSurfaceMode("grid")}
                type="button"
              >
                卡片
              </button>
            </div>
          </section>

          {activeView === "trash" ? (
            <section className={styles.noticeBand}>
              <div className={styles.noticeCopy}>
                <span className={styles.noticeTag}>仅管理员可见</span>
                <strong>回收区改成更像 admin console 的危险控制区，而不是重卡片集合。</strong>
                <p>删除原因筛选、到期提醒、清理动作都收敛到同一个操作带，视线更稳定。</p>
              </div>
              <div className={styles.noticeStats}>
                <div>
                  <span>回收中文件</span>
                  <strong>12</strong>
                </div>
                <div>
                  <span>24 小时内到期</span>
                  <strong>3</strong>
                </div>
                <div>
                  <span>当前筛选</span>
                  <strong>误传文件</strong>
                </div>
              </div>
            </section>
          ) : (
            <section className={styles.resultsHero}>
              <div>
                <span className={styles.previewEyebrow}>Workspace</span>
                <strong>{previewViews.find((view) => view.key === activeView)?.label}</strong>
                <p>工具列、结果概览和批量动作被压缩成更专业的工作面，不再像一层层堆卡片。</p>
              </div>
              <div className={styles.resultsMeta}>
                <span>共 {visibleItems.length} 项</span>
                <span>排序：最近更新</span>
                <span>主操作：上传文件</span>
              </div>
            </section>
          )}

          <section className={styles.resultsPanel}>
            <header className={styles.resultsHeader}>
              <div>
                <strong>{activeView === "trash" ? "回收区复核" : "目录内容"}</strong>
                <p>
                  {activeView === "trash"
                    ? "危险动作集中在底部 action zone，列表本身只负责辨识与判断。"
                    : "文件名、状态、标签和更新时间的优先级已经重新拉开。"}
                </p>
              </div>
              <div className={styles.resultsMeta}>
                <span>文件 {visibleItems.filter((item) => item.type === "file").length}</span>
                <span>目录 {visibleItems.filter((item) => item.type === "folder").length}</span>
              </div>
            </header>

            {surfaceMode === "list" ? (
              <div className={styles.list}>
                {visibleItems.map((item) => (
                  <button
                    className={cx(styles.listRow, selectedItem?.id === item.id && styles.listRowActive)}
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    type="button"
                  >
                    <span className={styles.typeIcon}>{item.type === "folder" ? <FolderIcon /> : <FileIcon />}</span>
                    <div className={styles.rowMain}>
                      <strong>{item.title}</strong>
                      <small>{item.subtitle}</small>
                    </div>
                    <div className={styles.rowMeta}>
                      <span>{item.category}</span>
                      <span>{item.owner}</span>
                      <span>{item.updatedAt}</span>
                    </div>
                    <ToneBadge tone={item.tone}>{item.status}</ToneBadge>
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.grid}>
                {visibleItems.map((item) => (
                  <button
                    className={cx(styles.gridCard, selectedItem?.id === item.id && styles.gridCardActive)}
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    type="button"
                  >
                    <span className={styles.gridIcon}>{item.type === "folder" ? <FolderIcon /> : <FileIcon />}</span>
                    <strong>{item.title}</strong>
                    <small>{item.subtitle}</small>
                    <div className={styles.tagRow}>
                      {item.tags.map((tag) => (
                        <span className={styles.tag} key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <ToneBadge tone={item.tone}>{item.status}</ToneBadge>
                  </button>
                ))}
              </div>
            )}

            {activeView === "trash" ? (
              <footer className={styles.actionZone}>
                <span>已选 1 项</span>
                <div className={styles.actionZoneButtons}>
                  <button className={styles.secondaryAction} type="button">
                    恢复
                  </button>
                  <button className={styles.dangerAction} type="button">
                    彻底删除
                  </button>
                </div>
              </footer>
            ) : null}
          </section>
        </main>

        <aside className={styles.inspector}>
          <div className={styles.inspectorHeader}>
            <span>Inspector</span>
            <strong>{selectedItem?.title ?? "未选择文件"}</strong>
            <p>右侧面板改成更标准的专业 inspector：先看对象，再看 metadata，最后才是操作。</p>
          </div>

          {selectedItem ? (
            <>
              <div className={styles.previewCanvas}>
                <span className={styles.previewCanvasIcon}>
                  {selectedItem.type === "folder" ? <FolderIcon /> : <FileIcon />}
                </span>
                <strong>{selectedItem.type === "folder" ? "目录封面" : "文件预览"}</strong>
                <small>{selectedItem.subtitle}</small>
              </div>

              <div className={styles.metaBlock}>
                <span>主信息</span>
                <div className={styles.definitionList}>
                  <div>
                    <small>分类</small>
                    <strong>{selectedItem.category}</strong>
                  </div>
                  <div>
                    <small>负责人</small>
                    <strong>{selectedItem.owner}</strong>
                  </div>
                  <div>
                    <small>最近更新</small>
                    <strong>{selectedItem.updatedAt}</strong>
                  </div>
                </div>
              </div>

              <div className={styles.metaBlock}>
                <span>标签与备注</span>
                <div className={styles.tagRow}>
                  {selectedItem.tags.map((tag) => (
                    <span className={styles.tag} key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
                <p>{selectedItem.note}</p>
              </div>

              <div className={styles.inspectorActions}>
                <button className={styles.primaryAction} type="button">
                  打开详情
                </button>
                <button className={styles.secondaryAction} type="button">
                  共享链接
                </button>
                <button className={styles.secondaryAction} type="button">
                  查看版本
                </button>
                <button className={styles.secondaryAction} type="button">
                  编辑属性
                </button>
              </div>
            </>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
