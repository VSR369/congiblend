import * as React from "react";
import { MoreHorizontal, Bookmark, Heart } from "lucide-react";
import { formatRelativeTime } from "@/utils/formatters";
import { LikeButton } from "./like-button";
import { PostErrorBoundary } from "./post-error-boundary";

import { Button } from "./button";
import { Avatar } from "./avatar";
import { Badge } from "./badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";
import { useFeedStore } from "@/stores/feedStore";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { Post, ReactionType } from "@/types/feed";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface PostCardProps {
  post: Post;
  className?: string;
}

export const PostCard = React.memo(({ post, className }: PostCardProps) => {
  const { toggleSave, votePoll, rsvpEvent } = useFeedStore();

  const handleSaveToggle = React.useCallback(() => {
    toggleSave(post.id);
  }, [post.id, toggleSave]);



  // PHASE 3: Memoized poll vote handler
  const handlePollVote = React.useCallback(async (optionIndex: number) => {
    try {
      console.log('Voting for option index:', optionIndex);
      await votePoll(post.id, optionIndex);
      toast({
        title: "Vote submitted",
        description: "Your vote has been recorded successfully.",
      });
    } catch (error) {
      console.error("Poll voting error:", error);
      toast({
        title: "Vote failed", 
        description: "Failed to submit your vote. Please try again.",
        variant: "destructive"
      });
    }
  }, [post.id, votePoll]);

  const totalReactions = post.reactions.length;
  const topReactions = React.useMemo(() => {
    const reactionCounts: Record<ReactionType, number> = {
      innovative: 0, practical: 0, well_researched: 0
    };
    
    post.reactions.forEach(reaction => {
      reactionCounts[reaction.type]++;
    });

    return Object.entries(reactionCounts)
      .filter(([_, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  }, [post.reactions]);

  const renderPostContent = () => {
    switch (post.type) {
      case 'image':
      case 'video':
      case 'document':
        return (
          <div className="space-y-3">
            <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
            {post.media && post.media.length > 0 && (
              <div className="grid grid-cols-1 gap-2 rounded-lg overflow-hidden">
                {post.media.slice(0, 4).map((media, index) => (
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
                        poster={media.thumbnail}
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : media.type === 'document' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-muted p-4">
                        <div className="text-4xl mb-2">📄</div>
                        <p className="text-sm font-medium text-center truncate w-full">
                          {media.alt || 'Document'}
                        </p>
                        <a 
                          href={media.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline mt-2"
                        >
                          Open Document
                        </a>
                      </div>
                    ) : (
                      <img
                        src={media.url}
                        alt={media.alt || "Post image"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          console.error('Image failed to load:', media.url);
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', media.url);
                        }}
                      />
                    )}
                    {post.media!.length > 4 && index === 3 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-lg font-semibold">
                          +{post.media!.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'poll':
        console.log('Rendering poll post:', post);
        console.log('Post poll data:', post.poll);
        return (
          <div className="space-y-4">
            <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
            {post.poll ? (
              <div className="space-y-3 p-4 border rounded-lg">
                <h4 className="font-medium">{post.poll.question}</h4>
                <div className="space-y-2">
                  {post.poll.options.map((option, index) => {
                    const isSelected = post.poll?.userVote?.includes(index.toString());
                    return (
                      <button
                        key={option.id} 
                        className={cn(
                          "w-full text-left space-y-2 p-4 border-2 rounded-lg transition-colors bg-card",
                          isSelected 
                            ? "border-primary bg-primary/10" 
                            : "hover:bg-primary/5 hover:border-primary"
                        )}
                        onClick={() => handlePollVote(index)}
                        disabled={!!post.poll?.userVote?.length}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-foreground">{option.text}</span>
                            {isSelected && (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                                ✓ Selected
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">
                            {option.percentage}% ({option.votes} vote{option.votes !== 1 ? 's' : ''})
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500 ease-out",
                              isSelected ? "bg-primary" : "bg-primary/70"
                            )}
                            style={{ width: `${Math.max(option.percentage, 2)}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
                  <span className="font-medium">{post.poll.totalVotes} total vote{post.poll.totalVotes !== 1 ? 's' : ''}</span>
                  {post.poll.expiresAt && (
                    <span>Expires {formatRelativeTime(post.poll.expiresAt)}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 border rounded-lg">
                <p className="text-muted-foreground">Poll data not available</p>
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
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">
                      {format(post.event.startDate, "dd MMM yyyy, HH:mm")}
                      {post.event.endDate && (
                        <>
                          {" "}–{" "}
                          {format(post.event.endDate, "dd MMM yyyy, HH:mm")}
                        </>
                      )}
                    </p>
                    {post.event.location && (
                      <p className="text-muted-foreground">{post.event.location}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{post.event.attendees} attending</p>
                    {post.event.maxAttendees && (
                      <p className="text-muted-foreground">
                        of {post.event.maxAttendees} max
                      </p>
                    )}
                  </div>
                </div>

                {/* Speakers from event_data */}
                {post.event_data?.speakers && post.event_data.speakers.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <h5 className="text-sm font-medium">Speakers</h5>
                    <div className="space-y-2">
                      {post.event_data.speakers.map((sp, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                            {sp.photo_url ? (
                              <img src={sp.photo_url} alt={`${sp.name} photo`} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <span className="text-xs font-medium">{(sp.name || 'S').slice(0,2).toUpperCase()}</span>
                            )}
                          </div>
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
                )}

                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => rsvpEvent(post.id, 'attending')}
                >
                  {post.event.userRSVP === 'attending' ? 'Going' : 'RSVP'}
                </Button>
              </div>
            )}
          </div>
        );

      case 'article':
        return (
          <div className="space-y-3">
            <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
            {post.linkPreview && (
              <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                {post.linkPreview.image && (
                  <img
                    src={post.linkPreview.image}
                    alt={post.linkPreview.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {post.linkPreview.domain}
                  </p>
                  <h4 className="font-semibold mt-1 line-clamp-2">
                    {post.linkPreview.title}
                  </h4>
                  {post.linkPreview.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {post.linkPreview.description}
                    </p>
                  )}
                </div>
              </div>
            )}
            <Button asChild variant="outline" size="sm">
              <Link to={`/articles/${post.id}`}>Read article</Link>
            </Button>
          </div>
        );

      default:
        return <p className="text-foreground whitespace-pre-wrap">{post.content}</p>;
    }
  };

  return (
    <PostErrorBoundary>
      <article className="linkedin-post-card">
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
                {post.edited && " • Edited"}
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

        {/* LinkedIn-Style Engagement Stats */}
        {totalReactions > 0 && (
          <div className="px-4 pb-3">
            {/* LinkedIn-style engagement summary */}
            {totalReactions > 0 && (
              <div className="flex items-center text-sm text-muted-foreground mb-2">
                <div className="flex items-center space-x-1">
                  <div className="flex -space-x-1">
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Heart className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <span className="ml-2 hover:text-primary cursor-pointer hover:underline">
                    {post.author.name} and {totalReactions > 1 ? `${totalReactions - 1} others` : 'others'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LinkedIn-Style Actions */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-0">
            <LikeButton
              targetId={post.id}
              targetType="post"
              currentReaction={post.userReaction}
              reactions={post.reactions}
            />



            <Button 
              variant="ghost" 
              onClick={handleSaveToggle}
              className={cn(
                "linkedin-action-btn hover:bg-muted h-12 px-4 rounded-none flex flex-col items-center",
                post.userSaved ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Bookmark className={cn("h-5 w-5 mb-1", post.userSaved && "fill-current")} />
              <span className="text-xs font-medium">Save</span>
            </Button>
          </div>
        </div>

        <CommentsSection postId={post.id} />
      </article>
    </PostErrorBoundary>
  );
});

PostCard.displayName = "PostCard";