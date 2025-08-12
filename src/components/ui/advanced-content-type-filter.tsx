import * as React from "react";
import { FileText, Image, Video, MessageSquare, Calendar, FileType, Link, RotateCcw, Volume2 } from "lucide-react";
import { FilterChip } from "./filter-chip";
import { cn } from "@/lib/utils";
import type { PostType } from "@/types/feed";

interface AdvancedContentTypeFilterProps {
  selectedTypes: PostType[];
  onTypesChange: (types: PostType[]) => void;
  className?: string;
}

const contentTypeConfig = {
  text: { label: "Text", icon: FileText },
  image: { label: "Images", icon: Image },
  video: { label: "Videos", icon: Video },
  audio: { label: "Audio", icon: Volume2 },
  article: { label: "Articles", icon: FileType },
  
  event: { label: "Events", icon: Calendar },
  document: { label: "Documents", icon: FileText },
  link: { label: "Links", icon: Link },
  carousel: { label: "Carousels", icon: RotateCcw }
};

export const AdvancedContentTypeFilter = ({
  selectedTypes,
  onTypesChange,
  className
}: AdvancedContentTypeFilterProps) => {
  const handleTypeToggle = (type: PostType) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    
    onTypesChange(newTypes);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4" />
        <label className="text-sm font-medium">Content types</label>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {Object.entries(contentTypeConfig).map(([type, config]) => {
          const IconComponent = config.icon;
          return (
            <FilterChip
              key={type}
              type={type as PostType}
              isSelected={selectedTypes.includes(type as PostType)}
              onToggle={handleTypeToggle}
              className="group"
            >
              <IconComponent className="h-3 w-3" />
              {config.label}
            </FilterChip>
          );
        })}
      </div>
    </div>
  );
};