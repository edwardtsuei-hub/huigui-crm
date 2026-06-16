import type { CustomerItem } from "./types";
import { formatMoney } from "../../lib/workspace";

type CustomerCardMainInfoProps = {
  customer: CustomerItem;
};

function InfoBlock({
  label,
  value,
  subValue,
  strong = false,
}: {
  label: string;
  value: string;
  subValue?: string;
  strong?: boolean;
}) {
  return (
    <div className="customer-card__info-block">
      <span>{label}</span>
      <strong className={strong ? "strong" : undefined}>{value}</strong>
      <p>{subValue}</p>
    </div>
  );
}

export function CustomerCardMainInfo({
  customer,
}: CustomerCardMainInfoProps) {
  return (
    <div className="customer-card__main">
      <InfoBlock
        label="下一步"
        strong
        subValue={customer.priorityReason || "先补齐推进动作，便于后续加入日程。"}
        value={customer.nextAction || "暂未设置下一步"}
      />
      <InfoBlock
        label="最近互动"
        subValue={customer.recentActivitySummary || "近期还没有正式互动记录"}
        value={customer.recentActivityAt || "--"}
      />
      <InfoBlock
        label="意向 / 金额"
        subValue={
          customer.quoteAmount != null
            ? formatMoney(customer.quoteAmount)
            : "暂无金额信息"
        }
        value={
          customer.intentionScore != null ? `${customer.intentionScore}%` : "--"
        }
      />
    </div>
  );
}
