"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./InspectionsWorkspacePreview.module.css";

type QueueKey = "linking" | "report" | "payment";
type PreviewTone = "neutral" | "success" | "warning" | "danger";

type InspectionRecord = {
  id: string;
  queue: QueueKey;
  inspectionNo: string;
  title: string;
  target: string;
  customer: string;
  product: string;
  lab: string;
  owner: string;
  status: string;
  statusTone: PreviewTone;
  paymentStatus: string;
  paymentTone: PreviewTone;
  reportProgress: string;
  sampleMeta: string;
  amount: string;
  updatedAt: string;
  issue: string;
  nextAction: string;
  summary: string;
  timeline: Array<{ label: string; value: string }>;
};

const queues = [
  {
    key: "linking" as const,
    label: "待补关联",
    helper: "先把缺客户、缺产品的记录补齐",
    count: "08",
  },
  {
    key: "report" as const,
    label: "待催报告",
    helper: "优先催已经送检但还没回报告的单",
    count: "05",
  },
  {
    key: "payment" as const,
    label: "待登记付款",
    helper: "避免检测费用和回单继续堆积",
    count: "04",
  },
];

const queuePurpose: Record<
  QueueKey,
  {
    title: string;
    description: string;
  }
> = {
  linking: {
    title: "先补齐客户和产品关联",
    description: "这一队列的重点不是看进度，而是先把断掉的关系链补上。",
  },
  report: {
    title: "先催会影响交付的报告",
    description: "这一队列聚焦已经送检、客户也在等结果的检测单。",
  },
  payment: {
    title: "先把付款和回单登记完整",
    description: "这一队列处理的是费用动作，避免检测已经推进但账务还挂着。",
  },
};

const records: InspectionRecord[] = [
  {
    id: "insp-1",
    queue: "linking",
    inspectionNo: "INSP-20260419-018",
    title: "水溶肥全项检测",
    target: "华穗示范农场 4 月批次",
    customer: "未关联客户",
    product: "HN-Root Pro 500ml",
    lab: "梅里埃检测中心",
    owner: "李昊",
    status: "已送检",
    statusTone: "warning",
    paymentStatus: "部分付款",
    paymentTone: "warning",
    reportProgress: "已出 2 / 6 项",
    sampleMeta: "样本 2 / 项目 6",
    amount: "¥6,800 / 已付 ¥3,000",
    updatedAt: "今天 09:26",
    issue: "客户还没挂回去，客户详情页和送检对账都会断掉。",
    nextAction: "先补客户关联，再把最新回单挂进附件区。",
    summary: "这张检测单已经开始出部分结果，但因为客户未挂接，后续回传和对账都不好追。",
    timeline: [
      { label: "送检时间", value: "04/18 14:20" },
      { label: "当前卡点", value: "缺客户关联" },
      { label: "下一步", value: "补客户并同步附件" },
    ],
  },
  {
    id: "insp-2",
    queue: "linking",
    inspectionNo: "INSP-20260418-011",
    title: "微量元素组合检测",
    target: "远辰渠道试样 A 组",
    customer: "远辰渠道集团",
    product: "未关联产品",
    lab: "青岛农检实验室",
    owner: "王潇",
    status: "检测中",
    statusTone: "warning",
    paymentStatus: "未付款",
    paymentTone: "danger",
    reportProgress: "检测中",
    sampleMeta: "样本 1 / 项目 4",
    amount: "¥3,600 / 已付 ¥0",
    updatedAt: "今天 08:54",
    issue: "产品未挂接，后面产品主档看不到这条检测进度。",
    nextAction: "补产品关联，并确认财务是否已收到付款通知。",
    summary: "这类挂了客户没挂产品的单，最容易在产品资料沉淀时漏掉。",
    timeline: [
      { label: "送检时间", value: "04/17 10:05" },
      { label: "当前卡点", value: "缺产品关联" },
      { label: "下一步", value: "补产品并跟付款" },
    ],
  },
  {
    id: "insp-3",
    queue: "report",
    inspectionNo: "INSP-20260416-024",
    title: "叶面肥稳定性复检",
    target: "锦禾健康复检批次",
    customer: "锦禾健康",
    product: "LeafMax 1L",
    lab: "华测检测",
    owner: "陈雅萍",
    status: "已收样",
    statusTone: "warning",
    paymentStatus: "已付款",
    paymentTone: "success",
    reportProgress: "待回正式报告",
    sampleMeta: "样本 3 / 项目 9",
    amount: "¥9,200 / 已付 ¥9,200",
    updatedAt: "昨天 17:42",
    issue: "客户已经在催结论，但正式报告还没回来。",
    nextAction: "今天午前给实验室打电话确认出报告窗口。",
    summary: "已经具备交付条件，只差实验室把正式报告回传，属于今天应该优先催的类型。",
    timeline: [
      { label: "收样时间", value: "04/17 16:10" },
      { label: "当前卡点", value: "实验室未回正式报告" },
      { label: "下一步", value: "确认报告时间" },
    ],
  },
  {
    id: "insp-4",
    queue: "report",
    inspectionNo: "INSP-20260415-009",
    title: "菌剂活性检测",
    target: "诚安医养服务项目样本",
    customer: "诚安医养服务",
    product: "BioCare Plus",
    lab: "山东质检院",
    owner: "admin",
    status: "部分出报告",
    statusTone: "success",
    paymentStatus: "已付款",
    paymentTone: "success",
    reportProgress: "已出 4 / 7 项",
    sampleMeta: "样本 2 / 项目 7",
    amount: "¥5,400 / 已付 ¥5,400",
    updatedAt: "昨天 15:08",
    issue: "部分结果已回，但最终总结页还没形成。",
    nextAction: "整理已回项目，先把可交付部分同步给客户。",
    summary: "这类部分出报告的单，不该只停留在状态字段里，应该直接告诉我们可不可以先交。",
    timeline: [
      { label: "最近进展", value: "已回 4 项结果" },
      { label: "当前卡点", value: "最终总结页未整理" },
      { label: "下一步", value: "先发阶段性结果" },
    ],
  },
  {
    id: "insp-5",
    queue: "payment",
    inspectionNo: "INSP-20260419-005",
    title: "土壤重金属检测",
    target: "蒲公英中学种植基地",
    customer: "蒲公英中学",
    product: "基地土壤样本",
    lab: "国检华北中心",
    owner: "李昊",
    status: "草稿",
    statusTone: "neutral",
    paymentStatus: "待登记回单",
    paymentTone: "warning",
    reportProgress: "待送检",
    sampleMeta: "样本 1 / 项目 5",
    amount: "¥4,200 / 已付 ¥4,200",
    updatedAt: "今天 10:03",
    issue: "款已打，但系统里还没挂付款回单。",
    nextAction: "补回单附件，并把付款状态切到已付款。",
    summary: "这类已经付款却没登记的单，月底对账时最容易变成人工追单。",
    timeline: [
      { label: "付款时间", value: "今天 09:12" },
      { label: "当前卡点", value: "缺付款回单" },
      { label: "下一步", value: "上传回单并更新状态" },
    ],
  },
  {
    id: "insp-6",
    queue: "payment",
    inspectionNo: "INSP-20260417-014",
    title: "有机质对比检测",
    target: "华东区域示范田样本",
    customer: "华东区域合作社",
    product: "土样对比包",
    lab: "苏州第三方实验室",
    owner: "陈雅萍",
    status: "检测中",
    statusTone: "warning",
    paymentStatus: "部分付款",
    paymentTone: "warning",
    reportProgress: "待回 5 项",
    sampleMeta: "样本 4 / 项目 10",
    amount: "¥12,600 / 已付 ¥8,000",
    updatedAt: "昨天 19:18",
    issue: "尾款日期只在线下沟通过，系统里没有登记计划。",
    nextAction: "补录付款计划，避免报告回来后还要重新追账。",
    summary: "付款状态不只是财务信息，也会直接决定报告释放和客户交付节奏。",
    timeline: [
      { label: "付款进度", value: "已付 63%" },
      { label: "当前卡点", value: "尾款计划未登记" },
      { label: "下一步", value: "补录回款节点" },
    ],
  },
];

const quickFilters = [
  "只看缺客户",
  "只看缺产品",
  "只看本周催报告",
  "只看未登记回单",
];

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function ToneBadge({
  tone,
  children,
}: {
  tone: PreviewTone;
  children: string;
}) {
  return (
    <span
      className={cx(
        styles.badge,
        styles[`badge${tone[0].toUpperCase()}${tone.slice(1)}`],
      )}
    >
      {children}
    </span>
  );
}

export function InspectionsWorkspacePreview() {
  const [activeQueue, setActiveQueue] = useState<QueueKey>("linking");
  const [selectedRecordId, setSelectedRecordId] = useState("insp-1");

  const visibleRecords = useMemo(
    () => records.filter((item) => item.queue === activeQueue),
    [activeQueue],
  );

  const selectedRecord =
    visibleRecords.find((item) => item.id === selectedRecordId) ??
    visibleRecords[0] ??
    null;
  const activeQueueMeta = queuePurpose[activeQueue];

  return (
    <div className={styles.previewPage}>
      <section className={styles.commandDeck}>
        <div className={styles.commandCopy}>
          <span className={styles.eyebrow}>Inspections preview</span>
          <h1>检测待办工作台</h1>
          <p>
            这页只做一件事：帮你决定今天先处理哪一批检测单。
            先选队列，再点一张单，右侧就告诉你这张单卡在哪、下一步该做什么。
          </p>
          <div className={styles.statsStrip}>
            {queues.map((queue) => (
              <div className={styles.statChip} key={queue.key}>
                <span>{queue.label}</span>
                <strong>{queue.count}</strong>
              </div>
            ))}
          </div>
          <div className={styles.commandActions}>
            <Link className={styles.primaryAction} href="/inspections">
              对照正式检测页
            </Link>
            <Link className={styles.secondaryAction} href="/inspections/new">
              看新建检测
            </Link>
          </div>
        </div>

        <div className={styles.commandMeta}>
          <div className={styles.liveCard}>
            <span>这页怎么用</span>
            <strong>先选队列，再处理单笔</strong>
            <small>这不是总览页，它是一张检测待办处理台。</small>
            <ToneBadge tone="warning">Preview 示例数据</ToneBadge>
            <div className={styles.stepList}>
              <div className={styles.stepItem}>
                <b>1</b>
                <span>先选今天要处理的队列</span>
              </div>
              <div className={styles.stepItem}>
                <b>2</b>
                <span>再选一张当前最重要的检测单</span>
              </div>
              <div className={styles.stepItem}>
                <b>3</b>
                <span>右侧直接看卡点和下一步动作</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.workspace}>
        <div className={styles.mainColumn}>
          <section className={styles.queuePanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>主工作区</span>
                <strong>先选今天要处理的队列。</strong>
                <p className={styles.headerText}>
                  每个队列代表一种动作，不是普通状态分类。先确定动作，再进入单笔处理。
                </p>
              </div>
              <div className={styles.queueTabs}>
                {queues.map((queue) => (
                  <button
                    className={cx(
                      styles.queueTab,
                      activeQueue === queue.key && styles.queueTabActive,
                    )}
                    key={queue.key}
                    onClick={() => setActiveQueue(queue.key)}
                    type="button"
                  >
                    <span>{queue.label}</span>
                    <strong>{queue.count}</strong>
                    <small>{queue.helper}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.queueIntro}>
              <div className={styles.queueIntroCopy}>
                <span>{queues.find((queue) => queue.key === activeQueue)?.label}</span>
                <strong>{activeQueueMeta.title}</strong>
                <p>
                  {activeQueueMeta.description} 当前示例展示 {visibleRecords.length} 张重点单。
                </p>
              </div>
              <div className={styles.filterCluster}>
                {quickFilters.map((label) => (
                  <button className={styles.filterChip} key={label} type="button">
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.listBoard}>
              {visibleRecords.map((record, index) => {
                const isSelected = selectedRecord?.id === record.id;

                return (
                  <button
                    className={cx(styles.recordRow, isSelected && styles.recordRowActive)}
                    key={record.id}
                    onClick={() => setSelectedRecordId(record.id)}
                    style={{ animationDelay: `${index * 55}ms` }}
                    type="button"
                  >
                    <div className={styles.recordMain}>
                      <div className={styles.recordTitleRow}>
                        <strong>{record.title}</strong>
                        <div className={styles.recordBadges}>
                          <ToneBadge tone={record.statusTone}>{record.status}</ToneBadge>
                          <ToneBadge tone={record.paymentTone}>
                            {record.paymentStatus}
                          </ToneBadge>
                        </div>
                      </div>
                      <span className={styles.recordEyebrow}>{record.inspectionNo}</span>
                      <div className={styles.recordDetailLine}>
                        <span>检测对象</span>
                        <strong>{record.target}</strong>
                      </div>
                      <div className={styles.recordDetailLine}>
                        <span>客户 / 产品</span>
                        <strong>
                          {record.customer} / {record.product}
                        </strong>
                      </div>
                      <div className={styles.issueInline}>
                        <span>当前卡点</span>
                        <strong>{record.issue}</strong>
                      </div>
                    </div>

                    <div className={styles.recordAside}>
                      <div className={styles.recordMeta}>
                        <div className={styles.recordMetaGroup}>
                          <span>送检机构</span>
                          <strong>{record.lab}</strong>
                        </div>
                        <div className={styles.recordMetaGroup}>
                          <span>报告进度</span>
                          <strong>{record.reportProgress}</strong>
                        </div>
                        <div className={styles.recordMetaGroup}>
                          <span>费用</span>
                          <strong>{record.amount}</strong>
                        </div>
                        <div className={styles.recordMetaGroup}>
                          <span>最近更新</span>
                          <strong>{record.updatedAt}</strong>
                        </div>
                      </div>
                      <div className={styles.inlineNote}>
                        <span>下一步</span>
                        <strong>{record.nextAction}</strong>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <aside className={styles.sideRail}>
          {selectedRecord ? (
            <section className={styles.inspectorPanel}>
              <div className={styles.sectionHeader}>
                <div>
                  <span className={styles.sectionEyebrow}>当前 Inspector</span>
                  <strong>{selectedRecord.title}</strong>
                </div>
                <ToneBadge tone={selectedRecord.statusTone}>
                  {selectedRecord.status}
                </ToneBadge>
              </div>

              <p className={styles.inspectorLead}>{selectedRecord.summary}</p>

              <div className={styles.inspectorGrid}>
                <div>
                  <span>检测对象</span>
                  <strong>{selectedRecord.target}</strong>
                </div>
                <div>
                  <span>负责人</span>
                  <strong>{selectedRecord.owner}</strong>
                </div>
                <div>
                  <span>客户</span>
                  <strong>{selectedRecord.customer}</strong>
                </div>
                <div>
                  <span>产品</span>
                  <strong>{selectedRecord.product}</strong>
                </div>
                <div>
                  <span>样本 / 项目</span>
                  <strong>{selectedRecord.sampleMeta}</strong>
                </div>
                <div>
                  <span>送检机构</span>
                  <strong>{selectedRecord.lab}</strong>
                </div>
              </div>

              <div className={styles.inspectorGrid}>
                <div>
                  <span>报告进度</span>
                  <strong>{selectedRecord.reportProgress}</strong>
                </div>
                <div>
                  <span>付款状态</span>
                  <strong>{selectedRecord.paymentStatus}</strong>
                </div>
                <div>
                  <span>费用</span>
                  <strong>{selectedRecord.amount}</strong>
                </div>
                <div>
                  <span>最近更新</span>
                  <strong>{selectedRecord.updatedAt}</strong>
                </div>
              </div>

              <div className={styles.issueCard}>
                <span>当前卡点</span>
                <strong>{selectedRecord.issue}</strong>
                <p>{selectedRecord.nextAction}</p>
              </div>

              <div className={styles.timeline}>
                {selectedRecord.timeline.map((item) => (
                  <div className={styles.timelineRow} key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>

              <div className={styles.commandActions}>
                <Link className={styles.primaryAction} href="/inspections">
                  查看真实列表
                </Link>
                <Link className={styles.secondaryAction} href="/inspections/new">
                  去新建检测
                </Link>
              </div>
            </section>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
