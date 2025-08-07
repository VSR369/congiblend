import * as React from "react";
import { formatRelativeTime } from "@/utils/formatters";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";
import type { Post } from "@/types/feed";

interface QuotePostCardProps {
  originalPost: Post;
  className?: string;
}

export const QuotePostCard = ({ originalPost, className }: QuotePostCardProps) => {
  return (
    <div className={cn("border rounded-lg p-4 bg-muted/30 mt-3", className)}>
      <div className="flex items-start space-x-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
          {originalPost.author.avatar ? (
            <img 
              src={originalPost.author.avatar} 
              alt={originalPost.author.name} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <span className="text-sm font-medium">{originalPost.author.name.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="font-semibold text-sm">{originalPost.author.name}</h4>
            {originalPost.author.verified && (
              <Badge variant="secondary" className="text-xs">✓</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {originalPost.author.title && `${originalPost.author.title} • `}
            {formatRelativeTime(originalPost.createdAt)}
          </p>
          <div className="mt-2">
            <p className="text-sm text-foreground">
              {originalPost.content}
            </p>
            
            {/* Show media if available */}
            {originalPost.media && originalPost.media.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-1 max-w-64">
                {originalPost.media.slice(0, 4).map((media, index) => (
                  <div 
                    key={media.id}
                    className="relative aspect-video bg-muted rounded overflow-hidden"
                  >
                    {media.type === 'image' ? (
                      <img
                        src={media.url}
                        alt={media.alt}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : media.type === 'video' ? (
                      <video
                        src={media.url}
                        className="w-full h-full object-cover"
                        poster={media.thumbnail}
                        controls={false}
                        preload="metadata"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <span className="text-lg">📄</span>
                      </div>
                    )}
                    {originalPost.media!.length > 4 && index === 3 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">
                          +{originalPost.media!.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Show poll if available */}
            {originalPost.poll && (
              <div className="mt-2 p-3 border rounded-md bg-background/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">📊 Poll</span>
                  <span className="text-xs text-muted-foreground">
                    {originalPost.poll.totalVotes} votes
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {originalPost.poll.options.length} options
                  {originalPost.poll.expiresAt && (
                    <> • Expires {formatRelativeTime(originalPost.poll.expiresAt)}</>
                  )}
                </p>
              </div>
            )}

            {/* Show event if available */}
            {originalPost.event && (
              <div className="mt-2 p-3 border rounded-md bg-background/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">📅 {originalPost.event.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {originalPost.event.attendees} attending
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {originalPost.event.startDate.toLocaleDateString()}
                  {originalPost.event.location && <> • {originalPost.event.location}</>}
                </p>
              </div>
            )}

            {/* Show hashtags if available */}
            {originalPost.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {originalPost.hashtags.slice(0, 3).map((hashtag) => (
                  <Badge key={hashtag} variant="secondary" className="text-xs">
                    {hashtag}
                  </Badge>
                ))}
                {originalPost.hashtags.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{originalPost.hashtags.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};