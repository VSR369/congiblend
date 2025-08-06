import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, Bookmark, Calendar, MapPin, Users, Clock, FileText, Volume2, MoreHorizontal, Flag, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { LikeButton } from "./like-button";
import { CommentInput } from "./comment-input";
import { useFeedStore } from "@/stores/feedStore";
import { PostErrorBoundary } from "./post-error-boundary";
import { useToast } from "@/hooks/use-toast";
import type { Post, ReactionType } from "@/types/feed";
import { REACTION_CONFIG, getMostCommonReactions } from "@/utils/reactions";

interface PostCardProps {
  post: Post;
  className?: string;
}

export const EnhancedPostCard = ({ post, className }: PostCardProps) => {
  const [showReactionPicker, setShowReactionPicker] = React.useState(false);
  const [showComments, setShowComments] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [loadingStates, setLoadingStates] = React.useState({
    reacting: false,
    commenting: false,
    sharing: false,
    voting: false,
    saving: false
  });
  
  const { addComment, sharePost, toggleSave, votePoll } = useFeedStore();
  const { toast } = useToast();

  const updateLoadingState = (key: keyof typeof loadingStates, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  };


  const handleShare = async () => {
    if (loadingStates.sharing) return;
    updateLoadingState('sharing', true);
    
    try {
      await sharePost(post.id);
      toast({
        title: "Success",
        description: "Post shared successfully",
      });
    } catch (error: any) {
      console.error('Failed to share post:', error);
      if (error.message?.includes("own post")) {
        toast({
          title: "Error",
          description: "You cannot share your own posts",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error", 
          description: "Failed to share post",
          variant: "destructive",
        });
      }
    } finally {
      updateLoadingState('sharing', false);
    }
  };

  const handleSave = () => {
    if (loadingStates.saving) return;
    updateLoadingState('saving', true);
    
    try {
      toggleSave(post.id);
      toast({
        title: "Success",
        description: post.userSaved ? 'Post unsaved' : 'Post saved',
      });
    } finally {
      updateLoadingState('saving', false);
    }
  };

  const handleCommentSubmit = async (content: string) => {
    if (loadingStates.commenting) return;
    updateLoadingState('commenting', true);
    
    try {
      await addComment(post.id, content);
      toast({
        title: "Success",
        description: "Comment added",
      });
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      updateLoadingState('commenting', false);
    }
  };

  const handlePollVote = async (optionIndex: number) => {
    if (loadingStates.voting) return;
    updateLoadingState('voting', true);
    
    try {
      await votePoll(post.id, optionIndex);
      toast({
        title: "Success", 
        description: "Vote recorded",
      });
    } catch (error) {
      console.error('Failed to vote:', error);
      toast({
        title: "Error",
        description: "Failed to record vote", 
        variant: "destructive",
      });
    } finally {
      updateLoadingState('voting', false);
    }
  };

  const renderMediaContent = () => {
    if (!post.media || post.media.length === 0) return null;

    return (
      <div className="mt-3 space-y-3">
        {post.media.map((mediaItem) => {
          switch (mediaItem.type) {
            case 'image':
              return (
                <div key={mediaItem.id} className="relative rounded-lg overflow-hidden">
                  <img
                    src={mediaItem.url}
                    alt={mediaItem.alt}
                    className="w-full rounded-lg object-cover max-h-96"
                    loading="lazy"
                    onError={(e) => {
                      console.error('Image failed to load:', mediaItem.url);
                      // Hide broken images instead of showing placeholder
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              );

            case 'video':
              return (
                <div key={mediaItem.id} className="relative rounded-lg overflow-hidden">
                  <video
                    controls
                    preload="metadata"
                    className="w-full rounded-lg max-h-96"
                    poster={mediaItem.thumbnail}
                    onError={(e) => {
                      console.error('Video failed to load:', mediaItem.url);
                    }}
                  >
                    <source src={mediaItem.url} type="video/mp4" />
                    <source src={mediaItem.url} type="video/webm" />
                    <source src={mediaItem.url} type="video/mov" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              );

            case 'audio':
              return (
                <div key={mediaItem.id} className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center space-x-2 mb-3">
                    <Volume2 className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Audio</span>
                    {mediaItem.duration && (
                      <span className="text-xs text-muted-foreground">
                        {Math.floor(mediaItem.duration / 60)}:{String(mediaItem.duration % 60).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  <audio
                    controls
                    preload="metadata"
                    className="w-full"
                    onError={(e) => {
                      console.error('Audio failed to load:', mediaItem.url);
                    }}
                  >
                    <source src={mediaItem.url} type="audio/mp3" />
                    <source src={mediaItem.url} type="audio/wav" />
                    <source src={mediaItem.url} type="audio/ogg" />
                    Your browser does not support the audio tag.
                  </audio>
                </div>
              );

            case 'document':
              return (
                <div key={mediaItem.id} className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Document</span>
                    {mediaItem.size && (
                      <span className="text-xs text-muted-foreground">
                        {(mediaItem.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    )}
                  </div>
                  <a 
                    href={mediaItem.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm mt-1 block"
                  >
                    Open Document
                  </a>
                </div>
              );

            default:
              return null;
          }
        })}
      </div>
    );
  };

  const renderPollContent = () => {
    if (!post.poll) return null;

    return (
      <div className="mt-3 space-y-3 p-4 border rounded-lg bg-card">
        <h4 className="font-medium">{post.poll.question}</h4>
        <div className="space-y-2">
          {post.poll.options.map((option, index) => {
            const isSelected = post.poll?.userVote?.includes(index.toString());
            return (
              <button
                key={option.id}
                className={cn(
                  "w-full text-left space-y-2 p-3 border-2 rounded-lg transition-all",
                  "hover:shadow-sm disabled:cursor-not-allowed",
                  isSelected 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50 hover:bg-primary/5"
                )}
                onClick={() => handlePollVote(index)}
                disabled={loadingStates.voting || !!post.poll?.userVote?.length}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{option.text}</span>
                    {isSelected && (
                      <Badge variant="default" className="text-xs">
                        ✓ Selected
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {option.percentage}% ({option.votes})
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(option.percentage, 2)}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
          <span>{post.poll.totalVotes} total votes</span>
          {post.poll.expiresAt && (
            <span>Expires {formatDistanceToNow(post.poll.expiresAt, { addSuffix: true })}</span>
          )}
        </div>
      </div>
    );
  };

  const renderEventContent = () => {
    if (!post.event) return null;

    return (
      <div className="mt-3 p-4 border rounded-lg bg-card space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h4 className="font-semibold">{post.event.title}</h4>
            <p className="text-sm text-muted-foreground">{post.event.description}</p>
          </div>
          <Badge variant="outline">
            <Calendar className="w-3 h-3 mr-1" />
            Event
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{post.event.startDate.toLocaleDateString()}</span>
            </div>
            {post.event.location && (
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{post.event.location}</span>
              </div>
            )}
          </div>
          
          <div className="text-right">
            <div className="flex items-center justify-end space-x-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{post.event.attendees} attending</span>
            </div>
            {post.event.maxAttendees && (
              <p className="text-xs text-muted-foreground">
                of {post.event.maxAttendees} max
              </p>
            )}
          </div>
        </div>
        
        <Button 
          className="w-full" 
          variant={post.event.userRSVP === 'going' ? 'default' : 'outline'}
          size="sm"
        >
          {post.event.userRSVP === 'going' ? 'Going ✓' : 'RSVP'}
        </Button>
      </div>
    );
  };

  const renderPostContent = () => {
    return (
      <div className="space-y-3">
        {post.content && <p className="text-foreground whitespace-pre-wrap">{post.content}</p>}
        
        {/* Render media based on post type */}
        {(['image', 'video', 'audio'].includes(post.type)) && renderMediaContent()}
        
        {/* Render poll content */}
        {post.type === 'poll' && renderPollContent()}
        
        {/* Render event content */}
        {post.type === 'event' && renderEventContent()}
        
        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {post.hashtags.map((hashtag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {hashtag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <PostErrorBoundary>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={cn("bg-card border shadow-sm overflow-visible mb-8", className)}>
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={post.author.avatar} alt={post.author.name} />
                  <AvatarFallback>
                    {post.author.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-sm">{post.author.name}</h3>
                    {post.author.verified && (
                      <Badge variant="secondary" className="text-xs">
                        ✓
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    @{post.author.username} • {formatDistanceToNow(post.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Flag className="mr-2 h-4 w-4" />
                    Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Content */}
            {renderPostContent()}

            {/* Engagement Stats */}
            {(post.reactions.length > 0 || post.comments.length > 0) && (
              <div className="flex items-center justify-between py-3 text-sm text-muted-foreground">
                {post.reactions.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <div className="flex -space-x-1">
                      {getMostCommonReactions(post.reactions, 3).map(({ type, count }, i) => {
                        const config = REACTION_CONFIG[type];
                        const IconComponent = config.icon;
                        return (
                          <div 
                            key={type} 
                            className="flex items-center justify-center w-5 h-5 rounded-full bg-background border border-border -ml-1 first:ml-0"
                            title={`${count} ${config.label}`}
                          >
                            <IconComponent className={`w-3 h-3 ${config.color}`} />
                          </div>
                        );
                      })}
                    </div>
                    <span>{post.reactions.length}</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-4">
                  {post.comments.length > 0 && (
                    <span>{post.comments.length} comments</span>
                  )}
                  {post.shares > 0 && (
                    <span>{post.shares} shares</span>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <div className="flex items-center space-x-2">
                <LikeButton
                  targetId={post.id}
                  targetType="post"
                  currentReaction={post.userReaction}
                  reactionCounts={post.reactions.reduce((acc, reaction) => {
                    acc[reaction.type] = (acc[reaction.type] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)}
                />

                {/* Comment Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowComments(!showComments)}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-full transition-all",
                    "border border-border hover:border-border/80",
                    "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20"
                  )}
                  aria-label={`${showComments ? 'Hide' : 'Show'} comments (${post.comments.length})`}
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Comment</span>
                  {post.comments.length > 0 && (
                    <span className="text-xs bg-muted px-2 py-1 rounded-full">
                      {post.comments.length}
                    </span>
                  )}
                </motion.button>

                {/* Share Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleShare}
                  disabled={loadingStates.sharing}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-full transition-all",
                    "border border-border hover:border-border/80",
                    "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20",
                    loadingStates.sharing && "opacity-50 cursor-not-allowed"
                  )}
                  aria-label={`Share post (${post.shares} shares)`}
                >
                  <Share2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Share</span>
                  {post.shares > 0 && (
                    <span className="text-xs bg-muted px-2 py-1 rounded-full">
                      {post.shares}
                    </span>
                  )}
                </motion.button>
              </div>

              {/* Save Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={loadingStates.saving}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-full transition-all",
                  "border border-border hover:border-border/80",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20",
                  post.userSaved 
                    ? "text-foreground bg-primary/10 border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                  loadingStates.saving && "opacity-50 cursor-not-allowed"
                )}
                aria-label={`${post.userSaved ? 'Unsave' : 'Save'} post`}
              >
                <Bookmark className={cn("h-5 w-5 transition-colors", post.userSaved && "fill-current")} />
                <span className="text-sm font-medium">
                  {post.userSaved ? 'Saved' : 'Save'}
                </span>
              </motion.button>
            </div>

            {/* Comments Section */}
            <AnimatePresence>
              {showComments && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-4"
                >
                  <CommentInput 
                    onSubmit={handleCommentSubmit}
                    placeholder="Write a comment..."
                    disabled={loadingStates.commenting}
                  />
                  
                  <div className="space-y-3">
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="flex space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
                          <AvatarFallback>
                            {comment.author.name[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="bg-muted rounded-lg p-3">
                            <p className="text-xs font-medium">{comment.author.name}</p>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>{formatDistanceToNow(comment.createdAt, { addSuffix: true })}</span>
                            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
                              Like
                            </Button>
                            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
                              Reply
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>
    </PostErrorBoundary>
  );
};

export { EnhancedPostCard as PostCard };