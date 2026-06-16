import type { CustomerItem } from "./types";
import { CustomerStageBadge } from "./CustomerCardHeader";

type PriorityCustomerCardProps = {
  customer: CustomerItem;
  selected?: boolean;
  onSelectCustomer: (customerId: string) => void;
  onOpenDetail: (customerId: string) => void;
  onAddToSchedule: (customerId: string) => void;
};

export function PriorityCustomerCard({
  customer,
  selected = false,
  onSelectCustomer,
  onOpenDetail,
  onAddToSchedule,
}: PriorityCustomerCardProps) {
  return (
    <article className={selected ? "priority-customer-card selected" : "priority-customer-card"}>
      <button
        className="priority-customer-card__surface"
        onClick={() => onSelectCustomer(customer.id)}
        type="button"
      >
        <div className="priority-customer-card__header">
          <div>
            <h4>{customer.name}</h4>
            <p>{customer.ownerName ? `负责人：${customer.ownerName}` : `客户编号：${customer.code ?? "--"}`}</p>
          </div>
          <CustomerStageBadge stage={customer.stage} />
        </div>

        <div className="priority-customer-card__reason">
          {customer.priorityReason || "建议优先处理这位客户，避免推进节奏继续停滞。"}
        </div>

        <div className="priority-customer-card__meta">
          <div>
            <span>下一步</span>
            <strong>{customer.nextAction || "--"}</strong>
          </div>
          <div>
            <span>最近互动</span>
            <strong>{customer.recentActivityAt || "--"}</strong>
          </div>
        </div>
      </button>

      <div
        className="priority-customer-card__actions"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="button secondary inline"
          onClick={() => onOpenDetail(customer.id)}
          type="button"
        >
          打开详情
        </button>
        <button
          className="button inline"
          onClick={() => onAddToSchedule(customer.id)}
          type="button"
        >
          加入日程
        </button>
      </div>
    </article>
  );
}
