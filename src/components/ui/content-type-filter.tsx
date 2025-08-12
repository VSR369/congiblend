import * as React from "react";
import { FileText } from "lucide-react";
import { Checkbox } from "./checkbox";
import { PostType } from "@/types/feed";

export interface ContentTypeFilterProps {
  selectedTypes: PostType[];
  onTypesChange: (types: PostType[]) => void;
  className?: string;
}

const contentTypeLabels: Record<PostType, string> = {
  text: "Text Posts",
  image: "Images",
  video: "Videos", 
  audio: "Audio",
  article: "Articles",
  
  event: "Events",
  document: "Documents",
  link: "Links",
  carousel: "Carousels"
};

export const ContentTypeFilter = ({ selectedTypes, onTypesChange, className }: ContentTypeFilterProps) => {
  const handleTypeToggle = (type: PostType) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    
    onTypesChange(newTypes);
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4" />
        <label className="text-sm font-medium">Content types</label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(contentTypeLabels).map(([type, label]) => (
          <div key={type} className="flex items-center space-x-2">
            <Checkbox
              id={type}
              checked={selectedTypes.includes(type as PostType)}
              onCheckedChange={() => handleTypeToggle(type as PostType)}
            />
            <label
              htmlFor={type}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {label}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};