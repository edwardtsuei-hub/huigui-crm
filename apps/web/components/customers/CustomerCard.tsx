import type { CustomerItem } from "./types";
import { CustomerCardActions, type CustomerCardActionMenuItem } from "./CustomerCardActions";
import { CustomerCardHeader } from "./CustomerCardHeader";
import { CustomerCardMainInfo } from "./CustomerCardMainInfo";
import { CustomerCardMeta } from "./CustomerCardMeta";

type CustomerCardProps = {
  customer: CustomerItem;
  selected?: boolean;
  onSelectCustomer: (customerId: string) => void;
  onOpenDetail: (customerId: string) => void;
  onLogInteraction: (customerId: string) => void;
  onAddToSchedule: (customerId: string) => void;
  onCreateQuote: (customerId: string) => void;
  moreItems?: CustomerCardActionMenuItem[];
};

export function CustomerCard({
  customer,
  selected = false,
  onSelectCustomer,
  onOpenDetail,
  onLogInteraction,
  onAddToSchedule,
  onCreateQuote,
  moreItems,
}: CustomerCardProps) {
  return (
    <article
      className={selected ? "customer-card selected" : "customer-card"}
      id={`customer-card-${customer.id}`}
      onClick={() => onSelectCustomer(customer.id)}
    >
      <CustomerCardHeader customer={customer} />
      <CustomerCardMainInfo customer={customer} />
      <CustomerCardMeta customer={customer} />
      <CustomerCardActions
        customerId={customer.id}
        moreItems={moreItems}
        onAddToSchedule={onAddToSchedule}
        onCreateQuote={onCreateQuote}
        onLogInteraction={onLogInteraction}
        onOpenDetail={onOpenDetail}
      />
    </article>
  );
}
