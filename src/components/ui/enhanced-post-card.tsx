import React from 'react';
import { Lightbulb, Bookmark, MoreHorizontal, Users, Calendar, MapPin } from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Card, CardContent, CardHeader } from './card';
import { useFeedStore } from '@/stores/feedStore';
import { cn } from '@/lib/utils';
import type { Post } from '@/types/feed';
import { usePollResults } from '@/hooks/usePolls';
import { toast } from '@/hooks/use-toast';
import { PostContent } from './post-content';
import { buildPreview } from '@/utils/formatters';

interface EnhancedPostCardProps {
  post: Post;
  className?: string;
}

export const EnhancedPostCard: React.FC<EnhancedPostCardProps> = ({ post, className }) => {
  const { toggleReaction } = useFeedStore();

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
      await toggleReaction(post.id, post.userReaction === 'innovative' ? null : 'innovative');
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  // Poll handling with server RPCs
  const { results, voting, statusLabel, castVote, refresh } = usePollResults(
    post.type === 'poll' ? post.id : undefined
  );

  const handlePollVote = async (optionIndex: number) => {
    try {
      await castVote(optionIndex);
      toast({
        title: "Vote submitted",
        description: "Your vote has been recorded.",
      });
    } catch (e: any) {
      if (e?.message === "AUTH_REQUIRED") {
        toast({
          title: "Sign in required",
          description: "Please sign in to vote on polls.",
          variant: "destructive",
        });
        return;
      }
      const msg = String(e?.message || '').toLowerCase();
      if (msg.includes('poll is closed') || msg.includes('closed')) {
        toast({
          title: "Poll closed",
          description: "This poll is closed.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Vote failed",
        description: e?.message || "Failed to vote.",
        variant: "destructive",
      });
    }
  };

  const renderMedia = () => {
    if (!post.media || post.media.length === 0) return null;

    return (
      <div className="mt-3">
        <div className="grid grid-cols-1 gap-2">
          {post.media.map((media) => (
            <div key={media.id} className="rounded-lg overflow-hidden bg-muted">
              {media.type === 'image' && (
                <img 
                  src={media.url} 
                  alt={media.alt} 
                  className="w-full h-auto object-cover"
                />
              )}
              {media.type === 'video' && (
                <video 
                  src={media.url} 
                  controls 
                  className="w-full h-auto"
                />
              )}
              {media.type === 'audio' && (
                <audio 
                  src={media.url} 
                  controls 
                  className="w-full"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPoll = () => {
    // Prefer server results; fallback to existing post.poll if present
    const closed = results?.closed ?? false;
    const userSelected = results?.userSelected ?? (post.poll?.userVote?.length ? Number(post.poll?.userVote?.[0]) : null);
    const opts = results?.options ?? post.poll?.options?.map(o => ({
      text: o.text,
      votes: Math.round((o.percentage / 100) * (post.poll?.totalVotes || 0)) || 0,
      percentage: o.percentage,
    })) ?? [];

    if (!(post as any).poll && !results) return null;

    return (
      <div className="mt-3 p-4 border rounded-lg">
        {post.poll?.question && <h4 className="font-medium mb-3">{post.poll.question}</h4>}
        <div className="space-y-2">
          {opts.map((option, index) => (
            <button
              key={`${index}-${option.text}`}
              onClick={() => handlePollVote(index)}
              className={cn(
                "w-full relative border rounded-md p-3 text-left transition-colors",
                userSelected === index ? "border-primary bg-primary/10" : "hover:bg-muted/50"
              )}
              disabled={closed || voting}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">{option.text}</span>
                <span className="text-xs text-muted-foreground">
                  {typeof option.percentage === "number" ? `${option.percentage}%` : ""}
                  {typeof option.votes === "number" ? ` • ${option.votes} votes` : ""}
                </span>
              </div>
              <div
                className="absolute bottom-0 left-0 h-1 bg-primary rounded-b-md transition-all"
                style={{ width: `${Math.min(100, Math.max(0, option.percentage || 0))}%` }}
              />
            </button>
          ))}
        </div>
        {!closed && (
          <p className="text-xs text-muted-foreground mt-2">
            You can change your vote until the poll closes.
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">{statusLabel}</p>
          <Button variant="ghost" size="sm" className="text-xs" onClick={refresh} disabled={voting}>
            Refresh
          </Button>
        </div>
      </div>
    );
  };

  const renderEvent = () => {
    if (!post.event_data && post.type !== 'event') return null;

    const eventInfo = post.event_data;
    if (!eventInfo) return null;

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

        {(() => {
          const raw = (eventInfo as any).speakers ?? (post as any).event?.speakers ?? [];
          const speakers = Array.isArray(raw) ? raw.map((s: any) => ({
            name: s.name || s.fullName || s.title || 'Speaker',
            profile: s.profile || s.profile_url || s.link || undefined,
            photo: s.photo_url || s.photoUrl || s.photo || s.avatar_url || undefined,
            description: s.description || s.bio || s.role || s.position || undefined,
          })) : [];
          if (!speakers.length) return null;
          return (
            <div className="mt-3">
              <h5 className="text-sm font-medium">Speakers</h5>
              <div className="mt-2 space-y-2">
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
        <PostContent
          content={post.content}
          className="text-sm leading-relaxed"
          truncatedContent={buildPreview(post.content)}
          shouldTruncate={post.content.length > 220}
        />

        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {post.hashtags.map((hashtag) => (
              <span key={hashtag} className="text-primary text-sm hover:underline cursor-pointer">
                {hashtag}
              </span>
            ))}
          </div>
        )}

        {renderMedia()}

        {post.type === 'poll' && renderPoll()}

        {renderEvent()}

        <div className="flex items-center justify-between pt-4 mt-4 border-t">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={cn(
                "text-muted-foreground hover:text-primary",
                post.userReaction === 'innovative' && "text-primary"
              )}
            >
              <Lightbulb className="h-4 w-4 mr-1" />
              <span className="text-xs">{post.likes}</span>
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "text-muted-foreground hover:text-primary",
              post.isSaved && "text-primary"
            )}
          >
            <Bookmark className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
