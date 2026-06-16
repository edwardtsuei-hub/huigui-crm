type CustomerTodaySummaryProps = {
  summary: string;
  suggestion: string;
  priorityCount: number;
  pendingActionCount: number;
  riskQuoteCount: number;
  onViewPriorityCustomers: () => void;
  onViewTodaySchedule: () => void;
  onLogInteraction: () => void;
};

function SummaryMetricCard({
  value,
  label,
  description,
}: {
  value: number;
  label: string;
  description: string;
}) {
  return (
    <article className="customer-summary-metric">
      <strong>{value}</strong>
      <span>{label}</span>
      <p>{description}</p>
    </article>
  );
}

export function CustomerTodaySummary({
  summary,
  suggestion,
  priorityCount,
  pendingActionCount,
  riskQuoteCount,
  onViewPriorityCustomers,
  onViewTodaySchedule,
  onLogInteraction,
}: CustomerTodaySummaryProps) {
  return (
    <section className="customer-summary">
      <div className="customer-summary__header">
        <div className="customer-summary__copy">
          <div className="customer-summary__eyebrow">今日推进逻辑</div>
          <h3>让客户页像业务调度台，而不是普通客户列表。</h3>
          <p>{summary}</p>
        </div>
      </div>

      <div className="customer-summary__grid">
        <SummaryMetricCard
          description={`今天建议优先处理 ${priorityCount} 位客户，先把最有机会推进的放到第一屏。`}
          label="今天先拿下谁"
          value={priorityCount}
        />
        <SummaryMetricCard
          description={`当前有 ${riskQuoteCount} 条报价发出后仍未回访，最容易失温。`}
          label="不要忽略什么"
          value={riskQuoteCount}
        />
        <SummaryMetricCard
          description={`还有 ${pendingActionCount} 条下一步动作没进入日程，管理动作要补上。`}
          label="管理动作要补哪"
          value={pendingActionCount}
        />
      </div>

      <div className="customer-summary__actions">
        <button className="button inline" onClick={onViewPriorityCustomers} type="button">
          查看重点客户
        </button>
        <button
          className="button secondary inline"
          onClick={onViewTodaySchedule}
          type="button"
        >
          查看今日日程
        </button>
        <button
          className="customer-text-button"
          onClick={onLogInteraction}
          type="button"
        >
          {suggestion}
        </button>
      </div>
    </section>
  );
}
