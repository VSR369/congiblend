import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal, MessageCircle, Share2, Bookmark, Flag, Heart } from "lucide-react";
import { formatRelativeTime } from "@/utils/formatters";
import { ReactionButton, ReactionPicker } from "./reaction-system";
import { Button } from "./button";
import { Avatar } from "./avatar";
import { Badge } from "./badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";
import { useFeedStore } from "@/stores/feedStore";
import { cn } from "@/lib/utils";
import type { Post, ReactionType } from "@/types/feed";

interface PostCardProps {
  post: Post;
  className?: string;
}

export const PostCard = ({ post, className }: PostCardProps) => {
  const [showReactionPicker, setShowReactionPicker] = React.useState(false);
  const [showComments, setShowComments] = React.useState(false);
  const { toggleReaction, toggleSave, sharePost } = useFeedStore();

  const handleReactionClick = () => {
    if (post.userReaction) {
      toggleReaction(post.id, post.userReaction);
    } else {
      setShowReactionPicker(!showReactionPicker);
    }
  };

  const handleReactionSelect = (reaction: ReactionType) => {
    toggleReaction(post.id, reaction);
    setShowReactionPicker(false);
  };

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
                      "relative aspect-video bg-muted",
                      post.media!.length === 3 && index === 0 ? "row-span-2" : ""
                    )}
                  >
                    <img
                      src={media.url}
                      alt={media.alt || "Post image"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
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
        return (
          <div className="space-y-4">
            <p className="text-foreground">{post.content}</p>
            {post.poll && (
              <div className="space-y-3 p-4 border rounded-lg">
                <h4 className="font-medium">{post.poll.question}</h4>
                <div className="space-y-2">
                  {post.poll.options.map((option) => (
                    <div key={option.id} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{option.text}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${option.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {post.poll.totalVotes} votes
                  {post.poll.expiresAt && (
                    <> • Expires {formatRelativeTime(post.poll.expiresAt)}</>
                  )}
                </p>
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
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("bg-card border rounded-lg p-6 space-y-4", className)}
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
      <div className="flex items-center justify-between border-t pt-3">
        <div className="flex items-center space-x-1">
          <div className="relative">
            <ReactionButton
              type={post.userReaction || 'like'}
              count={0}
              isActive={!!post.userReaction}
              onClick={handleReactionClick}
              showCount={false}
            />
            <AnimatePresence>
              {showReactionPicker && (
                <ReactionPicker
                  onReactionSelect={handleReactionSelect}
                  currentReaction={post.userReaction}
                />
              )}
            </AnimatePresence>
          </div>

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
            onClick={() => sharePost(post.id)}
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
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t pt-4 space-y-4"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
};