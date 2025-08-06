import * as React from "react";
import { Check } from "lucide-react";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";
import type { PostType } from "@/types/feed";

interface FilterChipProps {
  type: PostType;
  children: React.ReactNode;
  isSelected?: boolean;
  onToggle?: (type: PostType) => void;
  className?: string;
}

export const FilterChip = ({ 
  type, 
  children, 
  isSelected = false, 
  onToggle, 
  className 
}: FilterChipProps) => (
  <button
    onClick={() => onToggle?.(type)}
    className={cn(
      "inline-flex items-center space-x-2 px-3 py-2 rounded-full",
      "border-2 transition-all duration-200",
      "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/20",
      isSelected
        ? "border-primary bg-primary text-primary-foreground shadow-md"
        : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5",
      className
    )}
  >
    {isSelected && <Check className="h-3 w-3" />}
    <span className="text-sm font-medium">{children}</span>
  </button>
);