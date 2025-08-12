
import React from 'react';
import { FileText, Image, Video, Music, Calendar, Briefcase } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import type { PostType } from '@/types/feed';

interface PostTypeSelectorProps {
  activeType: PostType;
  onTypeChange: (type: PostType) => void;
  className?: string;
}

// Updated post types to include polls
const postTypes: { type: PostType; label: string; icon: React.ComponentType<any>; description: string }[] = [
  { type: "text", label: "Text", icon: FileText, description: "Share your thoughts" },
  { type: "image", label: "Photo", icon: Image, description: "Share images" },
  { type: "video", label: "Video", icon: Video, description: "Upload videos" },
  { type: "audio", label: "Audio", icon: Music, description: "Share audio files" },
  { type: "event", label: "Event", icon: Calendar, description: "Announce events" },
  { type: "poll", label: "Poll", icon: Briefcase, description: "Create polls" },
];

export const PostTypeSelector: React.FC<PostTypeSelectorProps> = ({
  activeType,
  onTypeChange,
  className
}) => {
  return (
    <div className={cn("grid grid-cols-6 gap-2", className)}>
      {postTypes.map((type) => {
        const Icon = type.icon;
        const isActive = activeType === type.type;
        
        return (
          <Button
            key={type.type}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onTypeChange(type.type)}
            className={cn(
              "flex flex-col items-center p-3 h-auto aspect-square",
              isActive && "bg-primary text-primary-foreground"
            )}
            title={type.description}
          >
            <Icon className="h-4 w-4 mb-1" />
            <span className="text-xs">{type.label}</span>
          </Button>
        );
      })}
    </div>
  );
};
