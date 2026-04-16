"use client";

import { useMemo, useState, type ReactNode } from "react";

type DetailTab = {
  key: string;
  label: string;
  content: ReactNode;
};

type DetailTabsProps = {
  tabs: DetailTab[];
  initialKey?: string;
};

export function DetailTabs({ tabs, initialKey }: DetailTabsProps) {
  const fallbackKey = useMemo(
    () => initialKey ?? tabs[0]?.key ?? "",
    [initialKey, tabs],
  );
  const [activeKey, setActiveKey] = useState(fallbackKey);
  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  if (!activeTab) {
    return null;
  }

  return (
    <section className="detail-tabs panel stack">
      <div
        className="detail-tabs__nav"
        role="tablist"
        aria-label="详情扩展分区"
      >
        {tabs.map((tab) => (
          <button
            aria-selected={tab.key === activeTab.key}
            className={`detail-tabs__tab ${tab.key === activeTab.key ? "active" : ""}`}
            key={tab.key}
            onClick={() => setActiveKey(tab.key)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="detail-tabs__panel" role="tabpanel">
        {activeTab.content}
      </div>
    </section>
  );
}
