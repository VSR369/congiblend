import * as React from "react";
import { useState } from "react";
import { Badge } from "./badge";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface PostContentProps {
  content: string;
  hashtags?: string[];
  children?: React.ReactNode;
  className?: string;
  truncatedContent?: string;
  shouldTruncate?: boolean;
  onExpandToggle?: (expanded: boolean) => void;
}

export const PostContent = ({ 
  content, 
  hashtags, 
  children, 
  className, 
  truncatedContent,
  shouldTruncate = false,
  onExpandToggle
}: PostContentProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpandToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onExpandToggle?.(newExpanded);
  };

  const displayContent = shouldTruncate && !isExpanded ? truncatedContent : content;

  return (
    <div className={cn("space-y-3", className)}>
      {content && (
        <div className="relative">
          <p className="text-foreground whitespace-pre-wrap leading-relaxed break-words hyphens-auto">
            {displayContent}
          </p>
          
          {shouldTruncate && (
            <div className={cn(
              "transition-all duration-300",
              !isExpanded && "mt-2"
            )}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExpandToggle}
                className="h-auto p-0 text-primary hover:text-primary/80 font-medium"
              >
                {isExpanded ? "Read Less" : "Read More"}
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Additional content like media, polls, events */}
      {children}
      
      {/* Hashtags */}
      {hashtags && hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {hashtags.map((hashtag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {hashtag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};