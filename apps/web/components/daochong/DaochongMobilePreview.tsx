"use client";

import { useMemo, useState } from "react";
import {
  adminRows,
  appointmentStateScenarios,
  appointmentTimeline,
  approvalEvidence,
  approvalRows,
  approvalReturnReasons,
  approvalStateScenarios,
  approvalStats,
  bonusFields,
  compensationStateScenarios,
  compensationFields,
  compensationRows,
  compensationToggles,
  createActions,
  customerEmptyState,
  customerRows,
  customerRecordSections,
  customerSummaryStats,
  customerTimeline,
  customersStats,
  financeRows,
  financeStateScenarios,
  financeStats,
  flowGroups,
  homeAppointments,
  homeEvents,
  homeRosterItems,
  homeStateScenarios,
  homeStats,
  memberPermissionGroups,
  memberStateScenarios,
  memberPermissionToggles,
  pageMeta,
  performanceRows,
  performanceStats,
  profileMenuItems,
  profileStats,
  projectFields,
  projectRows,
  projectStateScenarios,
  serviceNoteStateScenarios,
  serviceNoteStates,
  settlementChecklist,
  settlementEvidence,
  settlementStateScenarios,
  serviceNoteFields,
  settingsMenuItems,
  settlementFields,
  type ChecklistItem,
  type EvidenceItem,
  type EmptyStateItem,
  type HomeView,
  type MenuItem,
  type MoneyRow,
  type PageKey,
  type PermissionGroup,
  type RecordSection,
  type StateScenario,
  type StatusTone,
  type TimelineItem,
} from "./DaochongMobilePreview.data";
import styles from "./DaochongMobilePreview.module.css";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Currency({ value }: { value: string }) {
  return <strong className={styles.currency}>{value}</strong>;
}

function Status({ children, tone = "green" }: { children: string; tone?: StatusTone }) {
  return <span className={cx(styles.status, styles[tone])}>{children}</span>;
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className={styles.statCard}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function Field({ label, value, large = false }: { label: string; value: string; large?: boolean }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {large ? <textarea readOnly value={value} /> : <input readOnly value={value} />}
    </label>
  );
}

function ReceiptGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? styles.receiptGridCompact : styles.receiptGrid}>
      <button type="button">微信截图<br />已通过</button>
      <button type="button">储值扣款<br />待复核</button>
      <button type="button">异常凭证<br />需补传</button>
    </div>
  );
}

export function DaochongMobilePreviewExperience() {
  return (
    <main className={styles.pageRoot}>
      <div className={styles.pageFrame}>
        <header className={styles.previewHeader}>
          <div className={styles.brandCluster}>
            <span className={styles.brandMark}>道</span>
            <div>
              <span className={styles.pageEyebrow}>道冲元气手机端灰度预览</span>
              <h1>日程、服务、业绩和审批工作台</h1>
              <p>独立视觉预览，只验证体验和方向；不切正式入口、不写数据库、不接真实审批。</p>
            </div>
          </div>
          <div className={styles.previewActions}>
            <a className={styles.quietButton} href="/login">前往登录</a>
            <a className={styles.solidButton} href="/dashboard">返回正式首页</a>
          </div>
        </header>

        <DaochongMobilePreview />
      </div>
    </main>
  );
}

export function DaochongMobilePreview() {
  const [activePage, setActivePage] = useState<PageKey>("home");
  const [homeView, setHomeView] = useState<HomeView>("today");
  const [createOpen, setCreateOpen] = useState(false);
  const meta = pageMeta[activePage];

  const currentGroup = useMemo(() => {
    if (["home", "appointment", "settlement", "serviceNote"].includes(activePage)) return "首页";
    if (activePage === "performance") return "我的业绩";
    if (["customers", "customerDetail"].includes(activePage)) return "客户";
    return "我的";
  }, [activePage]);

  function openPage(page: PageKey) {
    setActivePage(page);
    setCreateOpen(false);
  }

  return (
    <section className={styles.workspace}>
      <aside className={styles.flowRail}>
        <div className={styles.flowHeader}>
          <span>真实灰度预览</span>
          <h2>道冲元气手机端</h2>
          <p>按已确认流程做成可点击页面；当前仍使用模拟数据。</p>
        </div>

        {flowGroups.map((group) => (
          <div className={styles.flowGroup} key={group.title}>
            <h3>{group.title}</h3>
            {group.items.map((item) => (
              <button
                className={cx(styles.flowItem, activePage === item.key && styles.activeFlowItem)}
                key={item.key}
                onClick={() => openPage(item.key)}
                type="button"
              >
                <span>{item.label}</span>
                <small>{item.note}</small>
              </button>
            ))}
          </div>
        ))}
      </aside>

      <div className={styles.stage}>
        <div className={styles.phone}>
          <div className={styles.statusBar}>
            <span>9:41</span>
            <span className={styles.signal}>●●●</span>
          </div>

          <header className={styles.appHeader}>
            <div>
              <span className={styles.chip}>{meta.chip}</span>
              <h1>{meta.title}</h1>
              <p>{meta.subtitle}</p>
            </div>
            <button className={styles.headerAction} onClick={() => openPage("settings")} type="button">
              设置
            </button>
          </header>

          <div className={styles.phoneBody}>{renderPage(activePage, homeView, setHomeView, openPage)}</div>

          {createOpen ? <CreateSheet openPage={openPage} onClose={() => setCreateOpen(false)} /> : null}

          <nav className={styles.bottomNav}>
            <button className={currentGroup === "首页" ? styles.activeNav : undefined} onClick={() => openPage("home")} type="button">
              <span aria-hidden="true" className={cx(styles.navIcon, styles.navHome)} />
              首页
            </button>
            <button className={currentGroup === "我的业绩" ? styles.activeNav : undefined} onClick={() => openPage("performance")} type="button">
              <span aria-hidden="true" className={cx(styles.navIcon, styles.navPerformance)} />
              我的业绩
            </button>
            <button className={styles.createButton} onClick={() => setCreateOpen((value) => !value)} type="button">
              +
            </button>
            <button className={currentGroup === "客户" ? styles.activeNav : undefined} onClick={() => openPage("customers")} type="button">
              <span aria-hidden="true" className={cx(styles.navIcon, styles.navCustomers)} />
              客户
            </button>
            <button className={currentGroup === "我的" ? styles.activeNav : undefined} onClick={() => openPage("profile")} type="button">
              <span aria-hidden="true" className={cx(styles.navIcon, styles.navProfile)} />
              我的
            </button>
          </nav>
        </div>

        <aside className={styles.designNote}>
          <span>视觉方向</span>
          <strong>更接近真实手机产品，而不是静态图板。</strong>
          <p>冷白、雾绿、墨色和克制卡片层级会继续沿用。真实接数据时，上传截图、审批、提醒和空状态会再细化。</p>
        </aside>
      </div>
    </section>
  );
}

function renderPage(
  page: PageKey,
  homeView: HomeView,
  setHomeView: (value: HomeView) => void,
  openPage: (page: PageKey) => void,
) {
  switch (page) {
    case "home":
      return <HomePage homeView={homeView} setHomeView={setHomeView} openPage={openPage} />;
    case "appointment":
      return <AppointmentPage openPage={openPage} />;
    case "settlement":
      return <SettlementPage openPage={openPage} />;
    case "serviceNote":
      return <ServiceNotePage />;
    case "performance":
      return <PerformancePage />;
    case "customers":
      return <CustomersPage openPage={openPage} />;
    case "customerDetail":
      return <CustomerDetailPage openPage={openPage} />;
    case "approval":
      return <ApprovalPage />;
    case "profile":
      return <ProfilePage openPage={openPage} />;
    case "settings":
      return <SettingsPage openPage={openPage} />;
    case "members":
      return <MembersPage />;
    case "projects":
      return <ProjectsPage />;
    case "compensation":
      return <CompensationPage />;
    case "bonus":
      return <BonusPage />;
    case "finance":
      return <FinancePage />;
    default:
      return null;
  }
}

function HomePage({
  homeView,
  setHomeView,
  openPage,
}: {
  homeView: HomeView;
  setHomeView: (value: HomeView) => void;
  openPage: (page: PageKey) => void;
}) {
  return (
    <>
      <div className={styles.statsGrid}>
        {homeStats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} note={stat.note} value={stat.value} />
        ))}
      </div>

      <div className={styles.segmented}>
        <button className={homeView === "today" ? styles.activeSegment : undefined} onClick={() => setHomeView("today")} type="button">当天预约</button>
        <button className={homeView === "roster" ? styles.activeSegment : undefined} onClick={() => setHomeView("roster")} type="button">周班表</button>
        <button className={homeView === "events" ? styles.activeSegment : undefined} onClick={() => setHomeView("events")} type="button">活动</button>
      </div>
      <StateBoard items={homeStateScenarios} title="今日状态提醒" />

      {homeView === "today" ? (
        <div className={styles.list}>
          {homeAppointments.map((item) => (
            <button className={styles.appointmentCard} key={item.time} onClick={() => openPage(item.target)} type="button">
              <span className={styles.timePill}>{item.time}</span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.note}</small>
              </span>
              <Status tone={item.tone}>{item.action}</Status>
            </button>
          ))}
        </div>
      ) : null}

      {homeView === "roster" ? (
        <div className={styles.rosterGrid}>
          {homeRosterItems.map((item) => (
            <div key={item}>{item}</div>
          ))}
        </div>
      ) : null}

      {homeView === "events" ? (
        <div className={styles.list}>
          {homeEvents.map((event) => {
            const target = event.target;
            return (
              <div className={styles.noticeCard} key={event.title}>
                <strong>{event.title}</strong>
                <p>{event.note}</p>
                {event.action && target ? (
                  <button onClick={() => openPage(target)} type="button">{event.action}</button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

function AppointmentPage({ openPage }: { openPage: (page: PageKey) => void }) {
  return (
    <>
      <div className={styles.heroCard}>
        <span>今日 13:00 · 1 号房</span>
        <strong>周先生 · 经络放松</strong>
        <p>客户肩颈紧张，服务后请补居家调理建议。</p>
      </div>
      <div className={styles.actionGrid}>
        <button onClick={() => openPage("settlement")} type="button">确认完成</button>
        <button type="button">改约</button>
      </div>
      <StateBoard items={appointmentStateScenarios} title="预约处理状态" />
      <Timeline
        items={appointmentTimeline}
      />
    </>
  );
}

function SettlementPage({ openPage }: { openPage: (page: PageKey) => void }) {
  return (
    <>
      <div className={styles.heroCard}>
        <span>林女士 · 头疗深度调理</span>
        <strong>卡内余额 ¥4,200</strong>
        <p>有卡客户可直接耗卡；无卡客户必须上传截图才可确认服务。</p>
      </div>
      <div className={styles.formCard}>
        {settlementFields.map((field) => (
          <Field key={field.label} label={field.label} value={field.value} />
        ))}
      </div>
      <EvidenceGallery items={settlementEvidence} title="客户扣款截图" />
      <ChecklistPanel items={settlementChecklist} title="确认前校验" />
      <StateBoard items={settlementStateScenarios} title="结算提交状态" />
      <div className={styles.actionGrid}>
        <button onClick={() => openPage("serviceNote")} type="button">稍后补纪要</button>
        <button className={styles.primaryAction} onClick={() => openPage("approval")} type="button">确认并审批</button>
      </div>
    </>
  );
}

function ServiceNotePage() {
  return (
    <>
      <div className={styles.noticeCard}>
        <strong>12 小时后企业微信提醒</strong>
        <p>老师点击卡片会直接打开这张补填页面。</p>
      </div>
      <ChecklistPanel items={serviceNoteStates} title="纪要补填状态" />
      <StateBoard items={serviceNoteStateScenarios} title="纪要流转结果" />
      <div className={styles.profileCard}>
        <span className={styles.avatar}>林</span>
        <span>
          <strong>林女士 · 头疗深度调理</strong>
          <small>06/23 13:00 · 慧心老师 · 已确认耗卡</small>
        </span>
      </div>
      <div className={styles.formCard}>
        {serviceNoteFields.map((field) => (
          <Field key={field.label} label={field.label} large={field.large} value={field.value} />
        ))}
      </div>
    </>
  );
}

function CustomersPage({ openPage }: { openPage: (page: PageKey) => void }) {
  return (
    <>
      <div className={styles.searchBox}>搜索客户、手机号、项目</div>
      <div className={styles.statsGrid}>
        {customersStats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} note={stat.note} value={stat.value} />
        ))}
      </div>
      <div className={styles.list}>
        {customerRows.map((customer) => (
          <button className={styles.customerRow} key={customer.name} onClick={() => openPage("customerDetail")} type="button">
            <span className={styles.avatar}>{customer.avatar}</span>
            <span>
              <strong>{customer.name}</strong>
              <small>{customer.note}</small>
            </span>
            <Status tone={customer.tone}>{customer.status}</Status>
          </button>
        ))}
      </div>
      <EmptyStateCard item={customerEmptyState} />
    </>
  );
}

function CustomerDetailPage({ openPage }: { openPage: (page: PageKey) => void }) {
  return (
    <>
      <div className={styles.profileCard}>
        <span className={styles.bigAvatar}>林</span>
        <span>
          <strong>林女士</strong>
          <small>VIP 客户 · 慧心老师维护 · 最近服务 06/21</small>
        </span>
      </div>
      <div className={styles.actionGrid}>
        <button type="button">添加预约</button>
        <button onClick={() => openPage("serviceNote")} type="button">写纪要</button>
      </div>
      <div className={styles.summaryGrid}>
        {customerSummaryStats.map((stat) => (
          <div key={stat[0]}><span>{stat[0]}</span><strong>{stat[1]}</strong></div>
        ))}
      </div>
      <Timeline items={customerTimeline} />
      <RecordSections sections={customerRecordSections} />
    </>
  );
}

function PerformancePage() {
  return (
    <>
      <div className={styles.progressCard}>
        <div>
          <strong>6 月个人耗卡目标</strong>
          <Status>72%</Status>
        </div>
        <span className={styles.progressTrack}><span style={{ width: "72%" }} /></span>
        <small>已完成 43,200 · 差 16,800</small>
      </div>
      <div className={styles.statsGrid}>
        {performanceStats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} note={stat.note} value={stat.value} />
        ))}
      </div>
      <MoneyList rows={performanceRows} />
    </>
  );
}

function ApprovalPage() {
  return (
    <>
      <div className={styles.statsGrid}>
        {approvalStats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} note={stat.note} value={stat.value} />
        ))}
      </div>
      <div className={styles.list}>
        {approvalRows.map((row) => (
          <ReviewCard key={row.name} name={row.name} note={row.note} value={row.value} />
        ))}
      </div>
      <div className={styles.panelCard}>
        <strong>扣款截图二次检查</strong>
        <ReceiptGrid compact />
      </div>
      <EvidenceGallery items={approvalEvidence} title="凭证复核" />
      <ChecklistPanel items={approvalReturnReasons} title="退回原因模板" />
      <StateBoard items={approvalStateScenarios} title="审批结果状态" />
      <div className={styles.actionGrid}>
        <button type="button">退回补充</button>
        <button className={styles.primaryAction} type="button">通过审批</button>
      </div>
    </>
  );
}

function ProfilePage({ openPage }: { openPage: (page: PageKey) => void }) {
  return (
    <>
      <div className={styles.profileCard}>
        <span className={styles.bigAvatar}>慧</span>
        <span>
          <strong>慧心</strong>
          <small>道冲元气 · 老师 · 今日早班</small>
        </span>
      </div>
      <div className={styles.statsGrid}>
        {profileStats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} note={stat.note} value={stat.value} />
        ))}
      </div>
      <MenuList items={profileMenuItems} openPage={openPage} />
    </>
  );
}

function SettingsPage({ openPage }: { openPage: (page: PageKey) => void }) {
  return (
    <>
      <div className={styles.noticeCard}>
        <strong>管理员管理放在「成员与权限」</strong>
        <p>由程程添加、停用和授权管理员；管理员再按权限审批耗卡或查看汇总。</p>
      </div>
      <MenuList items={settingsMenuItems} openPage={openPage} />
    </>
  );
}

function MembersPage() {
  return (
    <>
      <div className={styles.profileCard}>
        <span className={styles.bigAvatar}>程</span>
        <span>
          <strong>程程</strong>
          <small>主理人 · 唯一添加和授权管理员入口</small>
        </span>
      </div>
      <div className={styles.list}>
        {adminRows.map((admin) => (
          <AdminRow key={admin.name} name={admin.name} note={admin.note} status={admin.status} />
        ))}
      </div>
      <div className={styles.togglePanel}>
        {memberPermissionToggles.map((item) => (
          <label key={item.label}>
            <span>{item.label}</span>
            <input checked={item.checked} readOnly type="checkbox" />
          </label>
        ))}
      </div>
      <PermissionMatrix groups={memberPermissionGroups} />
      <StateBoard items={memberStateScenarios} title="成员变更状态" />
    </>
  );
}

function ProjectsPage() {
  return (
    <>
      <MoneyList rows={projectRows} />
      <div className={styles.formCard}>
        {projectFields.map((field) => (
          <Field key={field.label} label={field.label} value={field.value} />
        ))}
      </div>
      <StateBoard items={projectStateScenarios} title="项目配置状态" />
    </>
  );
}

function CompensationPage() {
  return (
    <>
      <MoneyList rows={compensationRows} />
      <div className={styles.formCard}>
        {compensationFields.map((field) => (
          <Field key={field.label} label={field.label} value={field.value} />
        ))}
      </div>
      <div className={styles.togglePanel}>
        {compensationToggles.map((item) => (
          <label key={item.label}><span>{item.label}</span><input checked={item.checked} readOnly type="checkbox" /></label>
        ))}
      </div>
      <StateBoard items={compensationStateScenarios} title="薪酬规则状态" />
    </>
  );
}

function BonusPage() {
  return (
    <>
      <div className={styles.formCard}>
        {bonusFields.map((field) => (
          <Field key={field.label} label={field.label} large={field.large} value={field.value} />
        ))}
        <div className={styles.uploadBox}>
          <strong>可选附件</strong>
          <small>活动截图、会议纪要或确认记录</small>
        </div>
      </div>
      <div className={styles.noticeCard}>
        <strong>提交后进入财务汇总</strong>
        <p>财务能看到对象、金额、原因和附件；老师只看到与自己相关的奖金结果。</p>
      </div>
    </>
  );
}

function FinancePage() {
  return (
    <>
      <div className={styles.statsGrid}>
        {financeStats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} note={stat.note} value={stat.value} />
        ))}
      </div>
      <MoneyList rows={financeRows} />
      <div className={styles.panelCard}>
        <strong>凭证浏览</strong>
        <ReceiptGrid compact />
      </div>
      <StateBoard items={financeStateScenarios} title="财务汇总状态" />
    </>
  );
}

function CreateSheet({ openPage, onClose }: { openPage: (page: PageKey) => void; onClose: () => void }) {
  return (
    <div className={styles.sheet}>
      <button aria-label="关闭创建面板" className={styles.sheetBackdrop} onClick={onClose} type="button" />
      <div className={styles.sheetPanel}>
        <span className={styles.handle} />
        <div className={styles.sheetHeader}>
          <strong>新建</strong>
          <Status tone="neutral">按权限显示</Status>
        </div>
        <div className={styles.sheetGrid}>
          {createActions.map((action) => (
            <button key={action[0]} onClick={() => openPage(action[2])} type="button">
              <strong>{action[0]}</strong>
              <small>{action[1]}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className={styles.timeline}>
      {items.map((item) => (
        <div key={item[0]}>
          <span />
          <p><strong>{item[0]}</strong><small>{item[1]}</small></p>
        </div>
      ))}
    </div>
  );
}

function MoneyList({ rows }: { rows: MoneyRow[] }) {
  return (
    <div className={styles.moneyList}>
      {rows.map((row) => (
        <div key={row[0]}>
          <span><strong>{row[0]}</strong><small>{row[1]}</small></span>
          <Currency value={row[2]} />
        </div>
      ))}
    </div>
  );
}

function ReviewCard({ name, note, value }: { name: string; note: string; value: string }) {
  return (
    <div className={styles.reviewCard}>
      <span className={styles.timePill}>{value}<small>元</small></span>
      <span><strong>{name}</strong><small>{note}</small></span>
      <Status tone="amber">待审</Status>
    </div>
  );
}

function StateBoard({ items, title }: { items: StateScenario[]; title: string }) {
  return (
    <section className={styles.stateBoard}>
      <div className={styles.sectionTitle}>
        <strong>{title}</strong>
        <small>状态预览</small>
      </div>
      <div className={styles.stateList}>
        {items.map((item) => (
          <div className={styles.stateRow} key={item.title}>
            <span>
              <strong>{item.title}</strong>
              <small>{item.note}</small>
            </span>
            <Status tone={item.tone}>{item.status}</Status>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyStateCard({ item }: { item: EmptyStateItem }) {
  return (
    <section className={styles.emptyState}>
      <span className={styles.emptyMark}>空</span>
      <strong>{item.title}</strong>
      <p>{item.note}</p>
      <button type="button">{item.action}</button>
    </section>
  );
}

function EvidenceGallery({ items, title }: { items: EvidenceItem[]; title: string }) {
  return (
    <div className={styles.evidencePanel}>
      <div className={styles.sectionTitle}>
        <strong>{title}</strong>
        <small>可点开原图复核</small>
      </div>
      <div className={styles.evidenceGrid}>
        {items.map((item) => (
          <button className={styles.evidenceCard} key={item.title} type="button">
            <span className={styles.receiptMock}>
              <i />
              <i />
              <i />
            </span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.note}</small>
            </span>
            <Status tone={item.tone}>{item.status}</Status>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChecklistPanel({ items, title }: { items: ChecklistItem[]; title: string }) {
  return (
    <div className={styles.checkPanel}>
      <div className={styles.sectionTitle}>
        <strong>{title}</strong>
        <small>提交前自动检查</small>
      </div>
      {items.map((item) => (
        <div className={styles.checkRow} key={item.label}>
          <span>
            <strong>{item.label}</strong>
            <small>{item.note}</small>
          </span>
          <Status tone={item.tone}>{item.status}</Status>
        </div>
      ))}
    </div>
  );
}

function RecordSections({ sections }: { sections: RecordSection[] }) {
  return (
    <div className={styles.recordSections}>
      {sections.map((section) => (
        <section className={styles.recordSection} key={section.title}>
          <div className={styles.sectionTitle}>
            <strong>{section.title}</strong>
            <small>{section.items.length} 条</small>
          </div>
          <Timeline items={section.items} />
        </section>
      ))}
    </div>
  );
}

function PermissionMatrix({ groups }: { groups: PermissionGroup[] }) {
  return (
    <div className={styles.permissionMatrix}>
      {groups.map((group) => (
        <section key={group.title}>
          <div className={styles.sectionTitle}>
            <strong>{group.title}</strong>
            <small>程程配置</small>
          </div>
          <div className={styles.permissionGrid}>
            {group.items.map((item) => (
              <span className={item.checked ? styles.permissionOn : styles.permissionOff} key={item.label}>
                {item.label}
              </span>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MenuList({
  items,
  openPage,
}: {
  items: MenuItem[];
  openPage: (page: PageKey) => void;
}) {
  return (
    <div className={styles.menuList}>
      {items.map((item) => (
        <button key={item[0]} onClick={() => openPage(item[2])} type="button">
          <span>{item[0].slice(0, 1)}</span>
          <strong>{item[0]}</strong>
          <small>{item[1]}</small>
        </button>
      ))}
    </div>
  );
}

function AdminRow({ name, note, status }: { name: string; note: string; status: string }) {
  return (
    <div className={styles.customerRow}>
      <span className={styles.avatar}>{name.slice(0, 1)}</span>
      <span><strong>{name}</strong><small>{note}</small></span>
      <Status tone={status === "启用" ? "green" : "amber"}>{status}</Status>
    </div>
  );
}
