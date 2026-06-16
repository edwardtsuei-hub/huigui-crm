type CustomerOverviewStatsProps = {
  totalCustomers: number;
  todayFollowCount: number;
  highIntentCount: number;
  linkedQuoteCount: number;
};

export function CustomerOverviewStats({
  totalCustomers,
  todayFollowCount,
  highIntentCount,
  linkedQuoteCount,
}: CustomerOverviewStatsProps) {
  const items = [
    { label: "客户总数", value: totalCustomers, description: "当前客户池规模" },
    { label: "今日待跟进", value: todayFollowCount, description: "建议优先推进" },
    { label: "高意向客户", value: highIntentCount, description: "当前重点推进" },
    { label: "已关联报价", value: linkedQuoteCount, description: "已进入报价阶段" },
  ];

  return (
    <section className="customer-overview-grid">
      {items.map((item) => (
        <article className="customer-overview-card" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <p>{item.description}</p>
        </article>
      ))}
    </section>
  );
}
