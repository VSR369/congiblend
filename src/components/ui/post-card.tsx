import * as React from "react";
import { MoreHorizontal, MessageCircle, Share2, Bookmark, Flag, Heart } from "lucide-react";
import { formatRelativeTime } from "@/utils/formatters";
import { LikeButton } from "./like-button";
import { PostErrorBoundary } from "./post-error-boundary";
import { CommentInput } from "./comment-input";
import { Button } from "./button";
import { Avatar } from "./avatar";
import { Badge } from "./badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";
import { useFeedStore } from "@/stores/feedStore";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { Post, ReactionType } from "@/types/feed";

interface PostCardProps {
  post: Post;
  className?: string;
}

export const PostCard = React.memo(({ post, className }: PostCardProps) => {
  const [showComments, setShowComments] = React.useState(false);
  const { toggleSave, sharePost, addComment, votePoll } = useFeedStore();

  const handleCommentSubmit = React.useCallback(async (content: string) => {
    try {
      await addComment(post.id, content);
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully.",
      });
    } catch (error) {
      toast({
        title: "Comment failed",
        description: "Failed to add comment. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }, [post.id, addComment]);

  const handleShare = React.useCallback(async () => {
    try {
      await sharePost(post.id);
      toast({
        title: "Post shared",
        description: "Post has been shared successfully.",
      });
    } catch (error: any) {
      if (error.message?.includes("own post")) {
        toast({
          title: "Cannot share",
          description: "You cannot share your own posts. Try copying the link instead.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Share failed",
          description: "Failed to share post. Please try again.",
          variant: "destructive"
        });
      }
    }
  }, [post.id, sharePost]);

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
      like: 0, love: 0, celebrate: 0, support: 0, insightful: 0, curious: 0
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
            <p className="text-foreground">{post.content}</p>
            {post.media && post.media.length > 0 && (
              <div className={cn(
                "grid gap-2 rounded-lg overflow-hidden",
                post.media.length === 1 ? "grid-cols-1" : 
                post.media.length === 2 ? "grid-cols-2" :
                "grid-cols-2 grid-rows-2"
              )}>
                {post.media.slice(0, 4).map((media, index) => (
                  <div 
                    key={media.id}
                    className={cn(
                      "relative aspect-video bg-muted rounded-lg overflow-hidden",
                      post.media!.length === 3 && index === 0 ? "row-span-2" : ""
                    )}
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
            <p className="text-foreground">{post.content}</p>
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
            <p className="text-foreground">{post.content}</p>
            {post.event && (
              <div className="p-4 border rounded-lg space-y-3">
                <h4 className="font-semibold">{post.event.title}</h4>
                <p className="text-sm text-muted-foreground">{post.event.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">
                      {post.event.startDate.toLocaleDateString()} at{" "}
                      {post.event.startDate.toLocaleTimeString()}
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
                <Button className="w-full" variant="outline">
                  {post.event.userRSVP === 'going' ? 'Going' : 'RSVP'}
                </Button>
              </div>
            )}
          </div>
        );

      case 'article':
        return (
          <div className="space-y-3">
            <p className="text-foreground">{post.content}</p>
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
          </div>
        );

      default:
        return <p className="text-foreground">{post.content}</p>;
    }
  };

  return (
    <PostErrorBoundary>
      <article
        className={cn("post-card bg-card border rounded-lg p-6 space-y-4", className)}
      >
      {/* Post Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center">
            {post.author.avatar ? (
              <img src={post.author.avatar} alt={post.author.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-medium">{post.author.name.charAt(0)}</span>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold">{post.author.name}</h3>
              {post.author.verified && (
                <Badge variant="secondary" className="text-xs">
                  ✓
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              @{post.author.username}
              {post.author.title && ` • ${post.author.title}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(post.createdAt)}
              {post.edited && " • Edited"}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Bookmark className="h-4 w-4 mr-2" />
              {post.userSaved ? "Remove from saved" : "Save post"}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Flag className="h-4 w-4 mr-2" />
              Report post
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Post Content */}
      <div className="space-y-3">
        {renderPostContent()}
        
        {/* Hashtags */}
        {post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.hashtags.map((hashtag) => (
              <Badge key={hashtag} variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80">
                {hashtag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Engagement Stats */}
      {(totalReactions > 0 || post.comments.length > 0) && (
        <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-3">
          <div className="flex items-center space-x-4">
            {totalReactions > 0 && (
              <span className="flex items-center space-x-1">
                <div className="flex -space-x-1">
                  {topReactions.slice(0, 3).map(([reaction]) => (
                    <div key={reaction} className="w-5 h-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                      <Heart className="h-3 w-3 text-red-500" />
                    </div>
                  ))}
                </div>
                <span>{totalReactions}</span>
              </span>
            )}
            
            {post.comments.length > 0 && (
              <button 
                onClick={() => setShowComments(!showComments)}
                className="hover:underline"
              >
                {post.comments.length} comment{post.comments.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {post.shares > 0 && <span>{post.shares} shares</span>}
            {post.views > 0 && <span>{post.views} views</span>}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-3 bg-card">
        <div className="flex items-center space-x-1">
          <LikeButton
            targetId={post.id}
            targetType="post"
            currentReaction={post.userReaction}
            reactionCounts={post.reactions.reduce((acc, reaction) => {
              acc[reaction.type] = (acc[reaction.type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)}
          />

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowComments(!showComments)}
            className="text-muted-foreground hover:text-foreground"
          >
            <MessageCircle className="h-5 w-5 mr-1" />
            Comment
          </Button>

          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleShare}
            className="text-muted-foreground hover:text-foreground"
          >
            <Share2 className="h-5 w-5 mr-1" />
            Share
          </Button>

          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => toggleSave(post.id)}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              post.userSaved && "text-primary"
            )}
          >
            <Bookmark className={cn("h-5 w-5", post.userSaved && "fill-current")} />
          </Button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t pt-4 space-y-4 animate-fade-in">
          {post.comments.slice(0, 3).map((comment) => (
            <div key={comment.id} className="flex space-x-3">
              <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                {comment.author.avatar ? (
                  <img src={comment.author.avatar} alt={comment.author.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-medium">{comment.author.name.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-sm">{comment.author.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                </div>
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <button className="hover:underline">Like</button>
                  <button className="hover:underline">Reply</button>
                </div>
              </div>
            </div>
          ))}
          
          {post.comments.length > 3 && (
            <button className="text-sm text-muted-foreground hover:underline">
              View all {post.comments.length} comments
            </button>
          )}
          
          {/* Comment Input */}
          <div className="pt-3 border-t">
            <CommentInput 
              onSubmit={handleCommentSubmit}
              placeholder="Write a comment..."
            />
          </div>
        </div>
      )}
    </article>
    </PostErrorBoundary>
  );
});