import * as React from "react";
import { MoreHorizontal, Bookmark, Heart, Trash2 } from "lucide-react";
import { formatRelativeTime } from "@/utils/formatters";
import { LikeButton } from "./like-button";
import { PostErrorBoundary } from "./post-error-boundary";

import { Button } from "./button";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";
import { Badge } from "./badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";
import { useFeedStore } from "@/stores/feedStore";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import type { Post, ReactionType } from "@/types/feed";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuthStore } from "@/stores/authStore";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { PostContent } from "./post-content";
import { buildPreview } from "@/utils/formatters";
import { PollCard } from "./poll-card";
import { PostDeleteDialog } from "./post-delete-dialog";

interface PostCardProps {
  post: Post;
  className?: string;
  virtualized?: boolean;
}

export const PostCard = React.memo(({ post, className, virtualized = false }: PostCardProps) => {
  const { toggleSave, rsvpEvent, updatePost, deletePost } = useFeedStore();
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  const { ref: commentsRef, isIntersecting: showComments } = useIntersectionObserver({
    rootMargin: '400px 0px',
    threshold: 0,
  });


  const handleSaveToggle = React.useCallback(() => {
    toggleSave(post.id);
  }, [post.id, toggleSave]);

  const isTempPost = post.id.startsWith('post-');

  const isOwner = Boolean(user?.id && post.author?.id && user!.id === post.author.id);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const handleConfirmDelete = React.useCallback(async () => {
    if (!isOwner) {
      toast({ title: 'Not allowed', description: 'Only the author can delete this post.', variant: 'destructive' });
      return;
    }
    if (isTempPost) return;
    try {
      setDeleting(true);
      await deletePost(post.id);
      setDeleteOpen(false);
      toast({ title: 'Post deleted' });
    } catch (err) {
      console.error('Delete failed', err);
      toast({ title: 'Delete failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  }, [isOwner, isTempPost, deletePost, post.id]);

  const handleRSVPChoice = React.useCallback(async (status: 'attending' | 'interested' | 'not_attending') => {
    if (isTempPost) {
      toast({
        title: 'Please wait',
        description: 'Your post is still publishing. Try again in a moment.',
      });
      return;
    }

    // Require authentication before RSVP
    if (!isAuthenticated) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to RSVP to events.',
        action: (
          <ToastAction altText="Sign in" onClick={() => navigate('/login')}>
            Sign in
          </ToastAction>
        ),
      });
      return;
    }

    try {
      await rsvpEvent(post.id, status);
      const title = status === 'attending' ? 'You’re going' : status === 'interested' ? 'Marked interested' : 'Marked can’t go';
      toast({ title });
    } catch (error) {
      console.error('RSVP error:', error);
      toast({ title: 'RSVP failed', description: 'Please try again.', variant: 'destructive' });
    }
  }, [isTempPost, post.id, rsvpEvent, isAuthenticated, navigate]);

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
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={(sp as any).photo_url || (sp as any).photoUrl || undefined}
                              alt={`${sp.name || 'Speaker'} photo`}
                            />
                            <AvatarFallback className="text-xs font-medium">
                              {(sp.name || 'S').slice(0,2).toUpperCase()}
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
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={isTempPost}
                    >
                      {isTempPost ? 'Publishing…' : post.event.userRSVP === 'attending' ? 'Going' : post.event.userRSVP === 'interested' ? 'Interested' : post.event.userRSVP === 'not_attending' ? 'Can’t go' : 'RSVP'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="z-50">
                    <DropdownMenuItem onClick={() => handleRSVPChoice('attending')}>Going</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRSVPChoice('interested')}>Interested</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRSVPChoice('not_attending')}>Can’t go</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {post.event.userRSVP && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {post.event.userRSVP === 'not_attending' ? "You can’t go" : `You’re ${post.event.userRSVP === 'attending' ? 'going' : 'interested'}`}
                  </p>
                )}
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

      case 'poll':
        return (
          <div className="space-y-3">
            <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
            {post.poll ? (
              <PollCard
                poll={post.poll}
                onVoteUpdate={(_pollId, newResults) => {
                  const totalVotes = newResults.reduce((sum, o) => sum + o.votes, 0);
                  updatePost(post.id, { poll: { ...post.poll!, options: newResults, totalVotes } });
                }}
              />
            ) : (
              <div className="text-sm text-muted-foreground">Loading poll…</div>
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
      <article className={cn("linkedin-post-card", virtualized ? "" : "[content-visibility:auto] [contain-intrinsic-size:600px]", className)}>
        {/* Post Header */}
        <div className="flex items-start justify-between p-4">
          <div className="flex items-start space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={post.author.avatar || undefined} alt={post.author.name} />
              <AvatarFallback className="text-sm font-medium">
                {post.author.name?.slice(0,2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
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
              {isOwner && !isTempPost && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
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

        <div ref={commentsRef as any} />
        {showComments ? (
          <CommentsSection postId={post.id} />
        ) : (
          <div className="px-4 pb-4 text-xs text-muted-foreground">Comments will load when in view</div>
        )}
        {isOwner && (
          <PostDeleteDialog
            post={post}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            onConfirm={handleConfirmDelete}
            loading={deleting}
          />
        )}
      </article>
    </PostErrorBoundary>
  );
});

PostCard.displayName = "PostCard";