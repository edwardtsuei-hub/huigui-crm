import type { CustomerItem } from "./types";
import { PriorityCustomerCard } from "./PriorityCustomerCard";

type PriorityCustomerPanelProps = {
  customers: CustomerItem[];
  selectedCustomerId?: string | null;
  selectedCustomer?: CustomerItem | null;
  onSelectCustomer: (customerId: string) => void;
  onOpenDetail: (customerId: string) => void;
  onAddToSchedule: (customerId: string) => void;
  onViewAll: () => void;
};

export function PriorityCustomerPanel({
  customers,
  selectedCustomerId,
  selectedCustomer,
  onSelectCustomer,
  onOpenDetail,
  onAddToSchedule,
  onViewAll,
}: PriorityCustomerPanelProps) {
  return (
    <aside className="priority-customer-panel" id="priority-customer-panel">
      <div className="priority-customer-panel__header">
        <div>
          <span className="priority-customer-panel__eyebrow">重点客户面板</span>
          <h3>右侧常驻决策区</h3>
          <p>把最值得推进的客户固定在右侧，减少在列表和详情之间来回跳。</p>
        </div>
        <button className="customer-inline-link" onClick={onViewAll} type="button">
          查看全部 &gt;
        </button>
      </div>

      {selectedCustomer ? (
        <div className="priority-customer-panel__selected">
          <span>当前选中客户</span>
          <strong>{selectedCustomer.name}</strong>
          <p>{selectedCustomer.priorityReason || "建议先处理这位客户，避免推进节奏继续停滞。"}</p>
          <div className="priority-customer-panel__selected-grid">
            <div>
              <span>负责人</span>
              <strong>{selectedCustomer.ownerName || "--"}</strong>
            </div>
            <div>
              <span>最近互动</span>
              <strong>{selectedCustomer.recentActivityAt || "--"}</strong>
            </div>
            <div>
              <span>下一步</span>
              <strong>{selectedCustomer.nextAction || "暂未设置下一步"}</strong>
            </div>
            <div>
              <span>行业</span>
              <strong>{selectedCustomer.industry || "未设置行业"}</strong>
            </div>
          </div>
          <div className="priority-customer-panel__selected-actions">
            <button
              className="button inline"
              onClick={() => onAddToSchedule(selectedCustomer.id)}
              type="button"
            >
              加入日程
            </button>
            <button
              className="button secondary inline"
              onClick={() => onOpenDetail(selectedCustomer.id)}
              type="button"
            >
              打开详情
            </button>
          </div>
        </div>
      ) : null}

      <div className="priority-customer-list">
        {customers.map((customer) => (
          <PriorityCustomerCard
            customer={customer}
            key={customer.id}
            onAddToSchedule={onAddToSchedule}
            onOpenDetail={onOpenDetail}
            onSelectCustomer={onSelectCustomer}
            selected={selectedCustomerId === customer.id}
          />
        ))}
      </div>
    </aside>
  );
}
