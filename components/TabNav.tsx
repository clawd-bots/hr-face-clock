"use client";

type Tab = {
  key: string;
  label: string;
};

type TabNavProps = {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
};

export default function TabNav({ tabs, activeTab, onTabChange }: TabNavProps) {
  return (
    <div className="flex gap-1 border-b border-sw-ink-200 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`px-4 py-2.5 text-sw-caption font-medium transition-colors duration-sw-fast border-b-2 -mb-px ${
            activeTab === tab.key
              ? "border-sw-gold-500 text-sw-gold-600"
              : "border-transparent text-sw-ink-500 hover:text-sw-ink-900 hover:border-sw-ink-200"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
