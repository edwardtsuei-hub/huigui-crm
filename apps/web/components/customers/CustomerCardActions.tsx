import { ActionMenu } from "../system/primitives";

export type CustomerCardActionMenuItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  tone?: "default" | "danger";
};

type CustomerCardActionsProps = {
  customerId: string;
  onOpenDetail: (customerId: string) => void;
  onLogInteraction: (customerId: string) => void;
  onAddToSchedule: (customerId: string) => void;
  onCreateQuote: (customerId: string) => void;
  moreItems?: CustomerCardActionMenuItem[];
};

export function CustomerCardActions({
  customerId,
  onOpenDetail,
  onLogInteraction,
  onAddToSchedule,
  onCreateQuote,
  moreItems = [],
}: CustomerCardActionsProps) {
  return (
    <div
      className="customer-card__actions"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        className="button inline"
        onClick={() => onLogInteraction(customerId)}
        type="button"
      >
        记互动
      </button>
      <button
        className="button secondary inline customer-card__action-accent"
        onClick={() => onAddToSchedule(customerId)}
        type="button"
      >
        加入日程
      </button>
      <button
        className="button secondary inline"
        onClick={() => onOpenDetail(customerId)}
        type="button"
      >
        详情
      </button>
      <button
        className="button secondary inline"
        onClick={() => onCreateQuote(customerId)}
        type="button"
      >
        报价
      </button>
      {moreItems.length ? <ActionMenu items={moreItems} /> : null}
    </div>
  );
}
