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
    <div className="flex gap-1 border-b border-[rgba(0,0,0,0.1)] mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px ${
            activeTab === tab.key
              ? "border-[#cf9358] text-[#9a6d2a]"
              : "border-transparent text-[rgba(0,0,0,0.5)] hover:text-[rgba(0,0,0,0.88)] hover:border-[rgba(0,0,0,0.15)]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
