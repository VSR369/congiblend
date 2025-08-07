import React from 'react';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Users, Calendar, MapPin, Briefcase } from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Card, CardContent, CardHeader } from './card';
import { LazyMedia } from '@/components/stable/LazyMedia';
import { RepostDropdown } from './repost-dropdown';
import { QuoteRepostModal } from './quote-repost-modal';
import { QuotePostCard } from './quote-post-card';
import { useFeedStore } from '@/stores/feedStore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Post } from '@/types/feed';

interface EnhancedPostCardProps {
  post: Post;
  className?: string;
}

export const EnhancedPostCard: React.FC<EnhancedPostCardProps> = ({ post, className }) => {
  const { toggleReaction, votePoll, sharePost } = useFeedStore();
  const [showQuoteModal, setShowQuoteModal] = React.useState(false);
  const [repostLoading, setRepostLoading] = React.useState(false);
  
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'now';
  };

  const handleLike = async () => {
    try {
      await toggleReaction(post.id, post.userReaction === 'like' ? null : 'like');
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handlePollVote = async (optionIndex: number) => {
    try {
      await votePoll(post.id, optionIndex);
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

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

  const renderMedia = () => {
    if (!post.media || post.media.length === 0) return null;

    return (
      <div className="mt-3">
        <LazyMedia 
          media={post.media} 
          postId={post.id} 
          className="w-full"
        />
      </div>
    );
  };

  const renderPoll = () => {
    if (!post.poll) return null;

    return (
      <div className="mt-3 p-4 border rounded-lg">
        <h4 className="font-medium mb-3">{post.poll.question}</h4>
        <div className="space-y-2">
          {post.poll.options.map((option, index) => (
            <button
              key={option.id}
              onClick={() => handlePollVote(index)}
              className="w-full relative border rounded-md p-3 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">{option.text}</span>
                <span className="text-xs text-muted-foreground">{option.percentage}%</span>
              </div>
              <div
                className="absolute bottom-0 left-0 h-1 bg-primary rounded-b-md transition-all"
                style={{ width: `${option.percentage}%` }}
              />
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {post.poll.totalVotes} votes
          {post.poll.expiresAt && ` • Expires ${formatDate(post.poll.expiresAt)}`}
        </p>
      </div>
    );
  };

  const renderEvent = () => {
    if (!post.event_data && post.type !== 'event') return null;

    // Handle event data from either event object or event_data field
    const eventInfo = post.event_data;
    if (!eventInfo) return null;

    // Convert string dates to Date objects
    const startDate = new Date(eventInfo.start_date);
    const endDate = eventInfo.end_date ? new Date(eventInfo.end_date) : null;

    return (
      <div className="mt-3 p-4 border rounded-lg bg-muted/30">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-lg">{eventInfo.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{eventInfo.description}</p>
            <div className="space-y-2 mt-3 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span>{startDate.toLocaleDateString()} at {startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                {endDate && (
                  <span className="text-muted-foreground">
                    - {endDate.toLocaleDateString()} at {endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                )}
              </div>
              {eventInfo.location && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{eventInfo.location}</span>
                </div>
              )}
              {eventInfo.max_attendees && (
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Max {eventInfo.max_attendees} attendees</span>
                </div>
              )}
              <div className="flex gap-2 mt-2">
                {eventInfo.is_virtual && (
                  <Badge variant="secondary" className="text-xs">Virtual Event</Badge>
                )}
                {eventInfo.is_hybrid && (
                  <Badge variant="secondary" className="text-xs">Hybrid Event</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };


  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={post.author.avatar} alt={post.author.name} />
              <AvatarFallback>
                {post.author.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-1">
                <span className="font-medium">{post.author.name}</span>
                {post.author.verified && (
                  <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-xs text-primary-foreground">✓</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <span>@{post.author.username}</span>
                <span>•</span>
                <span>{formatDate(post.createdAt)}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Quote repost content (if this is a quote repost) */}
        {post.isQuoteRepost && post.quoteContent && (
          <div className="text-sm leading-relaxed mb-3">
            {post.quoteContent}
          </div>
        )}
        
        {/* Original post content or quote repost original */}
        {post.isQuoteRepost && post.originalPost ? (
          <QuotePostCard originalPost={post.originalPost} />
        ) : (
          <>
            {/* Post Content */}
            <div className="text-sm leading-relaxed">
              {post.content}
            </div>

            {/* Hashtags */}
            {post.hashtags && post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.hashtags.map((hashtag) => (
                  <span key={hashtag} className="text-primary text-sm hover:underline cursor-pointer">
                    {hashtag}
                  </span>
                ))}
              </div>
            )}

            {/* Media */}
            {renderMedia()}

            {/* Poll */}
            {renderPoll()}

            {/* Event */}
            {renderEvent()}
          </>
        )}


        {/* Engagement Bar */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={cn(
                "text-muted-foreground hover:text-red-500",
                post.userReaction === 'like' && "text-red-500"
              )}
            >
              <Heart className="h-4 w-4 mr-1" />
              <span className="text-xs">{post.likes}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-blue-500">
              <MessageCircle className="h-4 w-4 mr-1" />
              <span className="text-xs">{post.commentsCount}</span>
            </Button>
            
            <RepostDropdown
              postId={post.id}
              sharesCount={post.sharesCount}
              loading={repostLoading}
              onSimpleRepost={handleSimpleRepost}
              onQuoteRepost={handleQuoteRepost}
              className="h-8 px-2"
            />
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "text-muted-foreground hover:text-yellow-500",
              post.isSaved && "text-yellow-500"
            )}
          >
            <Bookmark className="h-4 w-4" />
          </Button>
        </div>

        {/* Quote Repost Modal */}
        <QuoteRepostModal
          isOpen={showQuoteModal}
          onClose={() => setShowQuoteModal(false)}
          post={post}
          onSubmit={handleQuoteRepostSubmit}
        />
      </CardContent>
    </Card>
  );
};