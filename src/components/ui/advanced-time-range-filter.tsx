import * as React from "react";
import { Calendar, Clock } from "lucide-react";
import { FilterOption } from "./filter-option";
import { cn } from "@/lib/utils";

interface AdvancedTimeRangeFilterProps {
  selectedRange: string;
  onRangeChange: (range: string) => void;
  className?: string;
}

const timeRangeOptions = [
  { value: "recent", label: "Last 24 Hours", icon: Clock },
  { value: "week", label: "This Week", icon: Calendar },
  { value: "month", label: "This Month", icon: Calendar },
  { value: "all", label: "All Time", icon: Calendar }
];

export const AdvancedTimeRangeFilter = ({
  selectedRange,
  onRangeChange,
  className
}: AdvancedTimeRangeFilterProps) => {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="h-4 w-4" />
        <label className="text-sm font-medium">Time range</label>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {timeRangeOptions.map((option) => {
          const IconComponent = option.icon;
          return (
            <FilterOption
              key={option.value}
              value={option.value}
              isSelected={selectedRange === option.value}
              onClick={onRangeChange}
              className="flex items-center space-x-2"
            >
              <IconComponent className="h-3 w-3" />
              <span>{option.label}</span>
            </FilterOption>
          );
        })}
      </div>
    </div>
  );
};