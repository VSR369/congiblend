import * as React from "react";
import { cn } from "@/lib/utils";

interface FilterOptionProps {
  value: string;
  children: React.ReactNode;
  isSelected?: boolean;
  onClick?: (value: string) => void;
  className?: string;
}

export const FilterOption = ({ 
  value, 
  children, 
  isSelected = false, 
  onClick, 
  className 
}: FilterOptionProps) => (
  <button
    onClick={() => onClick?.(value)}
    className={cn(
      "px-3 py-2 text-sm rounded-lg transition-all duration-200",
      "border border-border hover:border-primary/50",
      "focus:outline-none focus:ring-2 focus:ring-primary/20",
      isSelected 
        ? "bg-primary text-primary-foreground border-primary shadow-sm" 
        : "bg-background text-foreground hover:bg-primary/5",
      className
    )}
  >
    {children}
  </button>
);