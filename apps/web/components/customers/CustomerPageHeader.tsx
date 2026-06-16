type CustomerPageHeaderProps = {
  onOpenSchedule: () => void;
  onCreateCustomer: () => void;
  priorityCount: number;
  pendingActionCount: number;
  riskQuoteCount: number;
};

export function CustomerPageHeader({
  onOpenSchedule,
  onCreateCustomer,
  priorityCount,
  pendingActionCount,
  riskQuoteCount,
}: CustomerPageHeaderProps) {
  return (
    <section className="customer-page-header">
      <div className="customer-page-header__copy">
        <div className="page-header__eyebrow">今日客户推进工作台</div>
        <h2>客户管理</h2>
        <p>先判断今天该推进谁、哪条风险不能拖，再进入具体客户和跟进动作。</p>
      </div>

      <div className="customer-page-header__side">
        <div className="customer-page-header__status-card">
          <span>当前节奏</span>
          <strong>优先 {priorityCount} 位客户</strong>
          <small>
            报价风险 {riskQuoteCount} 条 · 待安排动作 {pendingActionCount} 条
          </small>
        </div>

        <div className="customer-page-header__actions">
          <button
            className="button secondary inline"
            onClick={onOpenSchedule}
            type="button"
          >
            查看今日跟进日程
          </button>
          <button className="button inline" onClick={onCreateCustomer} type="button">
            新增客户
          </button>
        </div>
      </div>
    </section>
  );
}
