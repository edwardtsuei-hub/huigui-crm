export type CustomerQuickFilterOption = {
  value: string;
  label: string;
  count: number;
};

type CustomerQuickFiltersProps = {
  activeValue: string | null;
  filters: CustomerQuickFilterOption[];
  onChange: (value: string | null) => void;
};

export function CustomerQuickFilters({
  activeValue,
  filters,
  onChange,
}: CustomerQuickFiltersProps) {
  return (
    <div className="customer-quick-filters">
      {filters.map((filter) => {
        const active = activeValue === filter.value;

        return (
          <button
            className={active ? "customer-quick-filter active" : "customer-quick-filter"}
            key={filter.value}
            onClick={() => onChange(active ? null : filter.value)}
            type="button"
          >
            <span>{filter.label}</span>
            <strong>{filter.count}</strong>
          </button>
        );
      })}
    </div>
  );
}
