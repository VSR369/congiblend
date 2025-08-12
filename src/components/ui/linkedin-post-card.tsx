import * as React from "react";
import { MoreHorizontal, Bookmark, Heart } from "lucide-react";
import { formatRelativeTime } from "@/utils/formatters";
import { LikeButton } from "./like-button";
import { PostErrorBoundary } from "./post-error-boundary";

import { Button } from "./button";
import { Badge } from "./badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";
import { useFeedStore } from "@/stores/feedStore";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { Post } from "@/types/feed";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";

import { PostContent } from "./post-content";
import { buildPreview } from "@/utils/formatters";

interface LinkedInPostCardProps {
  post: Post;
  className?: string;
}

export const LinkedInPostCard = React.memo(({ post, className }: LinkedInPostCardProps) => {
  const { toggleSave } = useFeedStore();

  const handleSaveToggle = React.useCallback(() => {
    toggleSave(post.id);
  }, [post.id, toggleSave]);



  const totalReactions = post.reactions.length;

  const renderPostContent = () => {
    switch (post.type) {
      case 'image':
      case 'video':
      case 'document':
        return (
          <div className="space-y-3">
            <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
            {post.media && post.media.length > 0 && (
              <div className={cn(
                "grid gap-2 rounded-lg overflow-hidden",
                post.media.length === 1 ? "grid-cols-1" : 
                post.media.length === 2 ? "grid-cols-2" :
                "grid-cols-2"
              )}>
                {post.media.slice(0, 4).map((media) => (
                  <div 
                    key={media.id}
                    className="relative bg-muted rounded-lg overflow-hidden aspect-video"
                  >
                    {media.type === 'video' ? (
                      <video
                        src={media.url}
                        className="w-full h-full object-cover"
                        controls
                        preload="metadata"
                      />
                    ) : media.type === 'document' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-muted p-4">
                        <div className="text-4xl mb-2">📄</div>
                        <p className="text-sm font-medium text-center">
                          {media.alt || 'Document'}
                        </p>
                      </div>
                    ) : (
                      <img
                        src={media.url}
                        alt={media.alt || "Post image"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );


      case 'event':
        return (
          <div className="space-y-3">
            <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
            {post.event && (
              <div className="p-4 border rounded-lg space-y-3">
                <h4 className="font-semibold">{post.event.title}</h4>
                <p className="text-sm text-muted-foreground">{post.event.description}</p>
                <div className="text-sm">
                  <p className="font-medium">
                    {post.event.startDate.toLocaleDateString()} at{" "}
                    {post.event.startDate.toLocaleTimeString()}
                  </p>
                  {post.event.location && (
                    <p className="text-muted-foreground">{post.event.location}</p>
                  )}
                </div>

                {(() => {
                  const raw = ((post as any).event?.speakers) ?? ((post as any).event_data?.speakers) ?? [];
                  const speakers = Array.isArray(raw) ? raw.map((s: any) => ({
                    name: s.name || s.fullName || s.title || 'Speaker',
                    profile: s.profile || s.profile_url || s.link || undefined,
                    photo: s.photo_url || s.photoUrl || s.photo || s.avatar_url || undefined,
                    description: s.description || s.bio || s.role || s.position || undefined,
                  })) : [];
                  if (!speakers.length) return null;
                  return (
                    <div className="mt-2 space-y-2">
                      <h5 className="text-sm font-medium">Speakers</h5>
                      <div className="space-y-2">
                        {speakers.map((sp, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={sp.photo} alt={`${sp.name} photo`} loading="lazy" />
                              <AvatarFallback className="text-xs font-medium">
                                {String(sp.name || 'S').slice(0,2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{sp.name}</span>
                                {sp.profile && (
                                  <a href={sp.profile} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                    Profile
                                  </a>
                                )}
                              </div>
                              {sp.description && (
                                <p className="text-xs text-muted-foreground">{sp.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );

      default:
        return (
          <PostContent
            content={post.content}
            truncatedContent={buildPreview(post.content)}
            shouldTruncate={post.content.length > 220}
          />
        );
    }
  };

  return (
    <PostErrorBoundary>
      <article className={cn("bg-card border rounded-lg", className)}>
        {/* Post Header */}
        <div className="flex items-start justify-between p-4">
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center">
              {post.author.avatar ? (
                <img src={post.author.avatar} alt={post.author.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-medium">{post.author.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold">{post.author.name}</h3>
                {post.author.verified && (
                  <Badge variant="secondary" className="text-xs">✓</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {post.author.title && `${post.author.title} • `}
                {formatRelativeTime(post.createdAt)}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleSaveToggle}>
                <Bookmark className="h-4 w-4 mr-2" />
                {post.userSaved ? "Remove from saved" : "Save post"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Post Content */}
        <div className="px-4 pb-3">
          {renderPostContent()}
          
          {/* Hashtags */}
          {post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {post.hashtags.map((hashtag) => (
                <Badge key={hashtag} variant="secondary" className="text-xs">
                  {hashtag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Engagement Stats */}
        {totalReactions > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground px-4 pb-2 border-b">
            <div className="flex items-center space-x-4">
              {totalReactions > 0 && (
                <span className="flex items-center space-x-1">
                  <Heart className="h-4 w-4 text-primary" />
                  <span>{totalReactions}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-1">
            <LikeButton
              targetId={post.id}
              targetType="post"
              currentReaction={post.userReaction}
              reactions={post.reactions}
            />

            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSaveToggle}
              className={cn(
                "text-muted-foreground",
                post.userSaved && "text-primary"
              )}
            >
              <Bookmark className={cn("h-4 w-4", post.userSaved && "fill-current")} />
            </Button>
          </div>
        </div>

      </article>
    </PostErrorBoundary>
  );
});

LinkedInPostCard.displayName = "LinkedInPostCard";
