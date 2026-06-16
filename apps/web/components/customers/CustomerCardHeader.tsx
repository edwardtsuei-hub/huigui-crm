import type { CustomerItem } from "./types";

type CustomerCardHeaderProps = {
  customer: CustomerItem;
};

function customerStageLabel(stage: CustomerItem["stage"]) {
  switch (stage) {
    case "new":
      return "新客户";
    case "contacted":
      return "已联系";
    case "following":
      return "跟进中";
    case "quoted":
      return "报价中";
    case "cooperating":
      return "合作中";
    case "paused":
      return "已停滞";
    default:
      return "待跟进";
  }
}

function customerStageClassName(stage: CustomerItem["stage"]) {
  switch (stage) {
    case "contacted":
      return "customer-stage-badge customer-stage-badge--contacted";
    case "following":
      return "customer-stage-badge customer-stage-badge--following";
    case "quoted":
      return "customer-stage-badge customer-stage-badge--quoted";
    case "cooperating":
      return "customer-stage-badge customer-stage-badge--cooperating";
    case "paused":
      return "customer-stage-badge customer-stage-badge--paused";
    case "new":
    default:
      return "customer-stage-badge";
  }
}

function customerPriorityLabel(priority: CustomerItem["priority"]) {
  switch (priority) {
    case "urgent":
      return "紧急";
    case "high":
      return "高意向";
    default:
      return "";
  }
}

function customerPriorityClassName(priority: CustomerItem["priority"]) {
  return priority === "urgent"
    ? "customer-priority-badge customer-priority-badge--urgent"
    : "customer-priority-badge";
}

export function CustomerStageBadge({
  stage,
}: {
  stage: CustomerItem["stage"];
}) {
  return (
    <span className={customerStageClassName(stage)}>{customerStageLabel(stage)}</span>
  );
}

export function CustomerPriorityBadge({
  priority,
}: {
  priority?: CustomerItem["priority"];
}) {
  if (!priority || priority === "normal") {
    return null;
  }

  return (
    <span className={customerPriorityClassName(priority)}>
      {customerPriorityLabel(priority)}
    </span>
  );
}

export function CustomerCardHeader({ customer }: CustomerCardHeaderProps) {
  return (
    <div className="customer-card__header">
      <div className="customer-card__identity">
        <div className="customer-card__name-row">
          <h4>{customer.name}</h4>
          <CustomerStageBadge stage={customer.stage} />
          <CustomerPriorityBadge priority={customer.priority} />
        </div>
        <div className="customer-card__code">客户编号：{customer.code ?? "--"}</div>
        <div className="customer-card__subline">
          <span>{customer.ownerName ? `负责人：${customer.ownerName}` : "负责人待分配"}</span>
          <span>{customer.industry || "未设置行业"}</span>
          <span>{customer.source ? `来源：${customer.source}` : "来源未记录"}</span>
          <span>{customer.lastUpdatedAt ? `最近更新：${customer.lastUpdatedAt}` : "最近更新时间待补充"}</span>
        </div>
      </div>
    </div>
  );
}
