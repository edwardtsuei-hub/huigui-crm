import { EmptyState } from "../system/primitives";
import type { CustomerCardActionMenuItem } from "./CustomerCardActions";
import type { CustomerItem } from "./types";
import { CustomerCard } from "./CustomerCard";

type CustomerListProps = {
  customers: CustomerItem[];
  selectedCustomerId?: string | null;
  onSelectCustomer: (customerId: string) => void;
  onOpenDetail: (customerId: string) => void;
  onLogInteraction: (customerId: string) => void;
  onAddToSchedule: (customerId: string) => void;
  onCreateQuote: (customerId: string) => void;
  getMoreItems?: (customerId: string) => CustomerCardActionMenuItem[];
  onCreateCustomer: () => void;
};

export function CustomerList({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onOpenDetail,
  onLogInteraction,
  onAddToSchedule,
  onCreateQuote,
  getMoreItems,
  onCreateCustomer,
}: CustomerListProps) {
  if (!customers.length) {
    return (
      <div className="customer-list__empty">
        <EmptyState
          action={
            <button className="button inline" onClick={onCreateCustomer} type="button">
              新增客户
            </button>
          }
          description="当前筛选条件下还没有符合条件的客户，建议重置条件或直接新增客户。"
          title="暂无匹配客户"
        />
      </div>
    );
  }

  return (
    <div className="customer-list">
      {customers.map((customer) => (
        <CustomerCard
          customer={customer}
          key={customer.id}
          moreItems={getMoreItems?.(customer.id)}
          onAddToSchedule={onAddToSchedule}
          onCreateQuote={onCreateQuote}
          onLogInteraction={onLogInteraction}
          onOpenDetail={onOpenDetail}
          onSelectCustomer={onSelectCustomer}
          selected={selectedCustomerId === customer.id}
        />
      ))}
    </div>
  );
}
