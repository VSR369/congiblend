import * as React from "react";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";

interface PostContentProps {
  content: string;
  hashtags?: string[];
  children?: React.ReactNode;
  className?: string;
}

export const PostContent = ({ content, hashtags, children, className }: PostContentProps) => (
  <div className={cn("space-y-3", className)}>
    {content && <p className="text-foreground whitespace-pre-wrap">{content}</p>}
    
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