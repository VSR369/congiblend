import * as React from "react";
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { Button } from "./button";
import { LikeButton } from "./like-button";
import { CommentsSection } from "./comments-section";
import { RepostDropdown } from "./repost-dropdown";
import { QuoteRepostModal } from "./quote-repost-modal";
import { useFeedStore } from "@/stores/feedStore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Post } from "@/types/feed";

interface PostActionsProps {
  post: Post;
  onShare?: () => void;
  onSave?: () => void;
  className?: string;
}

interface ActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  isActive?: boolean;
  loading?: boolean;
  onClick?: () => void;
  'aria-label'?: string;
  className?: string;
}

const ActionButton = ({ 
  icon: Icon, 
  count, 
  isActive = false, 
  loading = false, 
  onClick, 
  'aria-label': ariaLabel,
  className 
}: ActionButtonProps) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={onClick}
    disabled={loading}
    aria-label={ariaLabel}
    className={cn(
      "flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors",
      isActive && "text-primary",
      className
    )}
  >
    <Icon className={cn("h-4 w-4", loading && "animate-pulse")} />
    {count !== undefined && count > 0 && (
      <span className="text-sm">{count}</span>
    )}
  </Button>
);

export const CommentButton = ({ 
  postId, 
  commentsCount = 0, 
  onClick, 
  className 
}: { 
  postId: string; 
  commentsCount?: number; 
  onClick?: () => void; 
  className?: string; 
}) => (
  <ActionButton
    icon={MessageCircle}
    count={commentsCount}
    onClick={onClick}
    aria-label={`Comment on post ${postId}`}
    className={className}
  />
);

export const ShareButton = ({ 
  postId, 
  sharesCount = 0, 
  loading = false, 
  onClick, 
  className 
}: { 
  postId: string; 
  sharesCount?: number; 
  loading?: boolean; 
  onClick?: () => void; 
  className?: string; 
}) => (
  <ActionButton
    icon={Share2}
    count={sharesCount}
    loading={loading}
    onClick={onClick}
    aria-label={`Share post ${postId}`}
    className={className}
  />
);

// Legacy ShareButton for backward compatibility - use RepostDropdown for new implementations

export const SaveButton = ({ 
  postId, 
  isSaved = false, 
  loading = false, 
  onClick, 
  className 
}: { 
  postId: string; 
  isSaved?: boolean; 
  loading?: boolean; 
  onClick?: () => void; 
  className?: string; 
}) => (
  <ActionButton
    icon={Bookmark}
    isActive={isSaved}
    loading={loading}
    onClick={onClick}
    aria-label={isSaved ? `Unsave post ${postId}` : `Save post ${postId}`}
    className={className}
  />
);

export const PostActions = ({ 
  post,
  onShare,
  onSave,
  className 
}: PostActionsProps) => {
  const { sharePost } = useFeedStore();
  const [showComments, setShowComments] = React.useState(false);
  const [showQuoteModal, setShowQuoteModal] = React.useState(false);
  const [repostLoading, setRepostLoading] = React.useState(false);

  // Simple repost handler
  const handleSimpleRepost = React.useCallback(async () => {
    setRepostLoading(true);
    try {
      await sharePost(post.id, 'share');
      toast({
        title: "Reposted",
        description: "Post has been reposted to your network.",
      });
    } catch (error: any) {
      if (error.message?.includes("own post")) {
        toast({
          title: "Cannot repost",
          description: "You cannot repost your own posts.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Repost failed",
          description: "Failed to repost. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setRepostLoading(false);
    }
  }, [post.id, sharePost]);

  // Quote repost handler
  const handleQuoteRepost = React.useCallback(() => {
    setShowQuoteModal(true);
  }, []);

  // Quote repost submission
  const handleQuoteRepostSubmit = React.useCallback(async (quoteContent: string) => {
    try {
      await sharePost(post.id, 'quote_repost', quoteContent);
      toast({
        title: "Reposted with your thoughts",
        description: "Your quote repost has been shared to your network.",
      });
    } catch (error: any) {
      if (error.message?.includes("own post")) {
        toast({
          title: "Cannot repost",
          description: "You cannot repost your own posts.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Quote repost failed",
          description: "Failed to share your quote repost. Please try again.",
          variant: "destructive"
        });
      }
      throw error; // Re-throw to let modal handle the error
    }
  }, [post.id, sharePost]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center space-x-1">
          <LikeButton 
            targetId={post.id} 
            targetType="post" 
            currentReaction={post.userReaction}
            reactions={post.reactions}
          />
          <CommentButton 
            postId={post.id} 
            commentsCount={post.commentsCount} 
            onClick={() => setShowComments(!showComments)} 
          />
          <RepostDropdown
            postId={post.id}
            sharesCount={post.sharesCount}
            loading={repostLoading}
            onSimpleRepost={handleSimpleRepost}
            onQuoteRepost={handleQuoteRepost}
          />
        </div>
        
        <SaveButton 
          postId={post.id} 
          isSaved={post.isSaved} 
          onClick={onSave} 
        />
      </div>

      {/* Comments Section */}
      {showComments && (
        <CommentsSection
          postId={post.id}
          comments={post.comments}
          commentsCount={post.commentsCount}
        />
      )}

      {/* Quote Repost Modal */}
      <QuoteRepostModal
        isOpen={showQuoteModal}
        onClose={() => setShowQuoteModal(false)}
        post={post}
        onSubmit={handleQuoteRepostSubmit}
      />
    </div>
  );
};