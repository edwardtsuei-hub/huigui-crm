import {
  customerQuoteStatusLabel,
  type CustomerItem,
} from "./types";

type CustomerCardMetaProps = {
  customer: CustomerItem;
};

export function CustomerCardMeta({ customer }: CustomerCardMetaProps) {
  return (
    <div className="customer-card__meta">
      <span>负责人：{customer.ownerName || "--"}</span>
      <span>行业：{customer.industry || "未设置行业"}</span>
      <span>跟进 {customer.followUpCount ?? 0} 次</span>
      <span>报价状态：{customerQuoteStatusLabel(customer.quoteStatus)}</span>
    </div>
  );
}
