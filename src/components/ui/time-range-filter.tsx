import * as React from "react";
import { Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

export interface TimeRangeFilterProps {
  selectedRange: string;
  onRangeChange: (range: string) => void;
  className?: string;
}

const timeRangeLabels = {
  recent: "Last 24 hours",
  week: "This week", 
  month: "This month",
  all: "All time"
};

export const TimeRangeFilter = ({ selectedRange, onRangeChange, className }: TimeRangeFilterProps) => {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="h-4 w-4" />
        <label className="text-sm font-medium">Time range</label>
      </div>
      <Select value={selectedRange} onValueChange={onRangeChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(timeRangeLabels).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};