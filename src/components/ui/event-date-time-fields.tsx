
import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface EventDateTimeFieldsProps {
  label: string;
  date?: Date;
  time: string;
  onDateChange: (date?: Date) => void;
  onTimeChange: (time: string) => void;
  required?: boolean;
}

export const EventDateTimeFields: React.FC<EventDateTimeFieldsProps> = ({
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
  required,
}) => {
  const formatted = date ? date.toLocaleDateString() : undefined;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatted ?? "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={onDateChange}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <input
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="w-full p-2 border border-border rounded-md bg-background"
          aria-label={`${label} time`}
          required={!!required}
        />
      </div>
    </div>
  );
};
