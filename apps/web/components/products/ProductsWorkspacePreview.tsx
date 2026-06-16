"use client";

import Link from "next/link";
import {
  FilterBar,
  SectionCard,
  StatusBadge,
  SummaryCard,
} from "../system/primitives";
import styles from "./ProductsWorkspacePreview.module.css";

const mockProducts = [
  {
    id: "hui-eco-feed-01",
    title: "洄归微生态发酵饲料",
    internalName: "HG Fermented Feed Pro",
    badge: "客户可见",
    summary:
      "统一承接发酵工艺、适用场景、报价模板和标准号，避免产品资料散落在销售话术里。",
    category: "畜禽营养 / 微生态",
    spec: "25kg / 袋",
    visibility: "客户可见 · 允许报价",
    price: "¥ 2,980 / 吨",
    priceNote: "成本 ¥ 2,240 / 吨",
    template: "通用报价模板",
    templateNote: "适用于标准客户报价与初次沟通",
    statusTone: "success" as const,
    statusLabel: "启用",
  },
  {
    id: "hui-bio-solution-02",
    title: "种养循环菌剂方案包",
    internalName: "HG Bio Loop Kit",
    badge: "农业方案",
    summary:
      "更偏方案型资产，挂接农业方案、检测建议和交付说明，方便售前直接复制到方案页。",
    category: "农业方案 / 土壤改良",
    spec: "12 组 / 套",
    visibility: "仅内部 · 允许报价",
    price: "¥ 18,600 / 套",
    priceNote: "待补分项成本",
    template: "农业方案模板",
    templateNote: "适用于整包方案和交付计划",
    statusTone: "warning" as const,
    statusLabel: "待完善",
  },
  {
    id: "hui-cleaning-03",
    title: "生态圈舍净护清洁剂",
    internalName: "HG CleanGuard",
    badge: "停用归档",
    summary:
      "保留历史模板与规格说明，但当前停用，不再作为默认报价资产进入一线销售流程。",
    category: "清洁消杀 / 环境维护",
    spec: "10L / 桶",
    visibility: "仅内部 · 报价已关闭",
    price: "¥ 468 / 桶",
    priceNote: "上次更新 04/12",
    template: "未设置模板",
    templateNote: "待确认是否继续保留",
    statusTone: "neutral" as const,
    statusLabel: "停用",
  },
];

const templateSummary = [
  { label: "通用报价模板", value: 12, percent: 46 },
  { label: "农业方案模板", value: 8, percent: 31 },
  { label: "未设置模板", value: 6, percent: 23 },
];

export function ProductsWorkspacePreview() {
  return (
    <div className={styles.previewPage}>
      <section className="split-workspace">
        <div className="workspace-main">
          <SectionCard
            actions={
              <div className={styles.sectionBadges}>
                <StatusBadge tone="success" variant="badge">
                  当前结果 26
                </StatusBadge>
                <StatusBadge tone="neutral" variant="badge">
                  设计预览
                </StatusBadge>
              </div>
            }
            className={styles.mainCard}
            description="这版只验证正式产品页的工作台布局和卡片语气，不接真实接口。"
            title="产品工作台预览"
          >
            <div className={styles.dataNote}>
              <span className={styles.dataNoteDot} />
              <span>预览页展示的是静态样例，用来确认布局、筛选区和资产列表的方向。</span>
            </div>

            <FilterBar className={styles.filterBar}>
              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label htmlFor="preview-product-search">搜索</label>
                <input
                  defaultValue="发酵 / 方案 / 清洁"
                  id="preview-product-search"
                  readOnly
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="preview-product-industry">适用行业</label>
                <select defaultValue="all" id="preview-product-industry" disabled>
                  <option value="all">全部行业</option>
                  <option value="breeding">养殖</option>
                  <option value="agriculture">农业</option>
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="preview-product-status">启用状态</label>
                <select defaultValue="all" id="preview-product-status" disabled>
                  <option value="all">全部状态</option>
                  <option value="enabled">启用</option>
                  <option value="disabled">停用</option>
                </select>
              </div>
            </FilterBar>

            <div className={styles.filterExtras}>
              <div className={styles.filterQuickRow}>
                <button className={styles.filterQuickButtonActive} type="button">
                  全部资产 26
                </button>
                <button className={styles.filterQuickButton} type="button">
                  待完善 5
                </button>
                <button className={styles.filterQuickButton} type="button">
                  客户可见 14
                </button>
                <button className={styles.filterQuickButton} type="button">
                  可直接报价 18
                </button>
                <button className={styles.filterQuickButton} type="button">
                  停用归档 3
                </button>
              </div>

              <div className={styles.filterSummaryRow}>
                <span className={styles.filterSummaryChip}>当前视图 26 条</span>
                <span className={styles.filterSummaryChip}>聚焦产品资产盘点</span>
                <span className={styles.filterSummaryChip}>客户可见 14</span>
                <span className={styles.filterSummaryChip}>允许报价 18</span>
                <span className={styles.filterSummaryChip}>停用中 3</span>
              </div>
            </div>

            <div className={styles.listHeader}>
              <span className={styles.listHeaderPrimary}>产品名称</span>
              <span>分类 / 行业</span>
              <span>规格 / 可见</span>
              <span>建议售价</span>
              <span>模板类型</span>
              <span className={styles.listHeaderActions}>操作</span>
            </div>

            <div className={styles.productList}>
              {mockProducts.map((product) => (
                <article className={styles.productRow} key={product.id}>
                  <div className={styles.primaryCell}>
                    <div className={styles.primaryTop}>
                      <div className={styles.productTitleGroup}>
                        <strong>{product.title}</strong>
                        <div className={styles.inlineMeta}>
                          <span>{product.internalName}</span>
                          <span>{product.badge}</span>
                        </div>
                      </div>
                      <StatusBadge tone={product.statusTone}>
                        {product.statusLabel}
                      </StatusBadge>
                    </div>
                    <p>{product.summary}</p>
                    <div className={styles.primaryFoot}>
                      <span>标准号待补齐</span>
                      <span>{product.visibility}</span>
                      <span>最近同步 04/19</span>
                    </div>
                  </div>

                  <div className={styles.infoCell}>
                    <span>分类 / 行业</span>
                    <strong>{product.category}</strong>
                    <small>统一挂接行业标签和场景说明</small>
                  </div>

                  <div className={styles.infoCell}>
                    <span>规格 / 可见</span>
                    <strong>{product.spec}</strong>
                    <small>{product.visibility}</small>
                  </div>

                  <div className={styles.infoCell}>
                    <span>建议售价</span>
                    <strong>{product.price}</strong>
                    <small>{product.priceNote}</small>
                  </div>

                  <div className={styles.infoCell}>
                    <span>模板类型</span>
                    <strong>{product.template}</strong>
                    <small>{product.templateNote}</small>
                  </div>

                  <div className={styles.actionCell}>
                    <Link className="button secondary inline" href="/products-detail-preview">
                      查看详情
                    </Link>
                    <Link className="button ghost inline" href="/products-edit-preview">
                      编辑资料
                    </Link>
                    <Link className="button ghost inline" href="/quotations-preview">
                      新建报价
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        </div>

        <aside className="workspace-side sticky-side">
          <SummaryCard
            className={styles.sideCard}
            description="先看模板类型分布，再决定哪些资产还要继续补标准号、报价模板和可见性。"
            title="模板结构"
          >
            <div className={styles.summaryList}>
              {templateSummary.map((item) => (
                <article className={styles.summaryItem} key={item.label}>
                  <div className={styles.summaryItemTop}>
                    <div className={styles.summaryLabel}>
                      <strong>{item.label}</strong>
                      <span>{item.value} 条产品</span>
                    </div>
                    <StatusBadge tone="neutral" variant="badge">
                      {item.percent}%
                    </StatusBadge>
                  </div>
                  <div className={styles.summaryBarTrack}>
                    <div
                      className={styles.summaryBarFill}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </article>
              ))}
            </div>

            <div className={styles.assistCard}>
              <div className={styles.assistCopy}>
                <strong>这一页的作用</strong>
                <p>把产品页从“资料堆叠”改回资产管理视角，先筛选、再维护、最后进入详情。</p>
              </div>

              <div className={styles.assistStats}>
                <article>
                  <span>待补标准号</span>
                  <strong>7</strong>
                  <small>优先补齐合规展示字段</small>
                </article>
                <article>
                  <span>停用中</span>
                  <strong>3</strong>
                  <small>与现役产品清楚区分</small>
                </article>
                <article>
                  <span>客户可见</span>
                  <strong>14</strong>
                  <small>用于正式对外沟通</small>
                </article>
              </div>

              <div className={styles.attentionList}>
                <article className={styles.attentionItem}>
                  <strong>报价已关闭 3 条</strong>
                  <p>这些产品保留历史资料，但不会直接进入一线报价流程，适合在详情页继续核对。</p>
                </article>
                <article className={styles.attentionItem}>
                  <strong>待补标准号 7 条</strong>
                  <p>外发前建议先统一标准号、标签和模板口径，让列表和详情页看到的是同一套资产信号。</p>
                </article>
              </div>

              <div className={styles.sideNote}>
                <p>这版 preview 现在已经和正式页对齐到同一套资产工作台语气，可以继续拿它做细部视觉校对。</p>
              </div>
            </div>
          </SummaryCard>
        </aside>
      </section>
    </div>
  );
}
