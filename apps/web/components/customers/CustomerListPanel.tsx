import type { CustomerCardActionMenuItem } from "./CustomerCardActions";
import { CustomerList } from "./CustomerList";
import { CustomerListToolbar, type CustomerToolbarOption } from "./CustomerListToolbar";
import type { CustomerQuickFilterOption } from "./CustomerQuickFilters";
import type { CustomerItem } from "./types";

type CustomerListPanelProps = {
  customers: CustomerItem[];
  selectedCustomerId?: string | null;
  searchKeyword: string;
  statusFilter: string;
  industryFilter: string;
  ownerFilter: string;
  quickFilter: string | null;
  activeQuickFilterLabel?: string;
  sortBy: string;
  resultCount: number;
  statusOptions: CustomerToolbarOption[];
  industryOptions: CustomerToolbarOption[];
  ownerOptions: CustomerToolbarOption[];
  sortOptions: CustomerToolbarOption[];
  quickFilterOptions: CustomerQuickFilterOption[];
  onSearchKeywordChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onIndustryFilterChange: (value: string) => void;
  onOwnerFilterChange: (value: string) => void;
  onQuickFilterChange: (value: string | null) => void;
  onSortByChange: (value: string) => void;
  onResetFilters: () => void;
  onSelectCustomer: (customerId: string) => void;
  onOpenDetail: (customerId: string) => void;
  onLogInteraction: (customerId: string) => void;
  onAddToSchedule: (customerId: string) => void;
  onCreateQuote: (customerId: string) => void;
  getMoreItems?: (customerId: string) => CustomerCardActionMenuItem[];
  onCreateCustomer: () => void;
};

export function CustomerListPanel({
  customers,
  selectedCustomerId,
  searchKeyword,
  statusFilter,
  industryFilter,
  ownerFilter,
  quickFilter,
  activeQuickFilterLabel,
  sortBy,
  resultCount,
  statusOptions,
  industryOptions,
  ownerOptions,
  sortOptions,
  quickFilterOptions,
  onSearchKeywordChange,
  onStatusFilterChange,
  onIndustryFilterChange,
  onOwnerFilterChange,
  onQuickFilterChange,
  onSortByChange,
  onResetFilters,
  onSelectCustomer,
  onOpenDetail,
  onLogInteraction,
  onAddToSchedule,
  onCreateQuote,
  getMoreItems,
  onCreateCustomer,
}: CustomerListPanelProps) {
  return (
    <section className="customer-list-panel" id="customer-list-panel">
      <div className="customer-list-panel__header">
        <div>
          <span className="customer-list-panel__eyebrow">客户池切片</span>
          <h3>{activeQuickFilterLabel || "全部客户"}</h3>
          <p>先按值得处理的原因筛，再进入字段过滤和具体客户操作。</p>
        </div>
        <span className="customer-list-panel__count">当前结果 {resultCount}</span>
      </div>

      <CustomerListToolbar
        industryFilter={industryFilter}
        industryOptions={industryOptions}
        onIndustryFilterChange={onIndustryFilterChange}
        onOwnerFilterChange={onOwnerFilterChange}
        onQuickFilterChange={onQuickFilterChange}
        onResetFilters={onResetFilters}
        onSearchKeywordChange={onSearchKeywordChange}
        onSortByChange={onSortByChange}
        onStatusFilterChange={onStatusFilterChange}
        ownerFilter={ownerFilter}
        ownerOptions={ownerOptions}
        quickFilter={quickFilter}
        quickFilterOptions={quickFilterOptions}
        resultCount={resultCount}
        searchKeyword={searchKeyword}
        sortBy={sortBy}
        sortOptions={sortOptions}
        statusFilter={statusFilter}
        statusOptions={statusOptions}
      />

      <CustomerList
        customers={customers}
        getMoreItems={getMoreItems}
        onAddToSchedule={onAddToSchedule}
        onCreateCustomer={onCreateCustomer}
        onCreateQuote={onCreateQuote}
        onLogInteraction={onLogInteraction}
        onOpenDetail={onOpenDetail}
        onSelectCustomer={onSelectCustomer}
        selectedCustomerId={selectedCustomerId}
      />
    </section>
  );
}
