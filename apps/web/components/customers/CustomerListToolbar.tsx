import { CustomerQuickFilters, type CustomerQuickFilterOption } from "./CustomerQuickFilters";

export type CustomerToolbarOption = {
  value: string;
  label: string;
};

type CustomerListToolbarProps = {
  searchKeyword: string;
  statusFilter: string;
  industryFilter: string;
  ownerFilter: string;
  quickFilter: string | null;
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
};

export function CustomerListToolbar({
  searchKeyword,
  statusFilter,
  industryFilter,
  ownerFilter,
  quickFilter,
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
}: CustomerListToolbarProps) {
  return (
    <div className="customer-toolbar">
      <div className="customer-toolbar__grid">
        <label className="field customer-toolbar__field customer-toolbar__field--search">
          <span>搜索</span>
          <input
            onChange={(event) => onSearchKeywordChange(event.target.value)}
            placeholder="搜索客户名称 / 联系人 / 手机"
            value={searchKeyword}
          />
        </label>

        <label className="field customer-toolbar__field">
          <span>状态</span>
          <select
            onChange={(event) => onStatusFilterChange(event.target.value)}
            value={statusFilter}
          >
            <option value="">全部状态</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field customer-toolbar__field">
          <span>行业</span>
          <select
            onChange={(event) => onIndustryFilterChange(event.target.value)}
            value={industryFilter}
          >
            <option value="">全部行业</option>
            {industryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field customer-toolbar__field">
          <span>负责人</span>
          <select
            onChange={(event) => onOwnerFilterChange(event.target.value)}
            value={ownerFilter}
          >
            <option value="">全部负责人</option>
            {ownerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="customer-toolbar__footer">
        <CustomerQuickFilters
          activeValue={quickFilter}
          filters={quickFilterOptions}
          onChange={onQuickFilterChange}
        />

        <div className="customer-toolbar__meta">
          <label className="field customer-toolbar__sort">
            <span>排序</span>
            <select
              onChange={(event) => onSortByChange(event.target.value)}
              value={sortBy}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <span>当前结果 {resultCount}</span>

          <button
            className="button ghost inline"
            onClick={onResetFilters}
            type="button"
          >
            重置条件
          </button>
        </div>
      </div>
    </div>
  );
}
