"use client";

import type { LucideIcon } from "lucide-react";

type FilterOption = {
  id: string;
  label: string;
  icon?: LucideIcon;
};

type FilterChipsProps = {
  options: FilterOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
};

export function FilterChips({ options, selectedValue, onSelect }: FilterChipsProps) {
  return (
    <div className="mt-3 flex overflow-x-auto whitespace-nowrap py-px">
      <div className="flex gap-2">
        {options.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              selectedValue === item.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {item.icon && <item.icon className="h-3.5 w-3.5" />}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
