import * as React from "react";
import { X, Share2 } from "lucide-react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Textarea } from "./textarea";
import { Avatar } from "./avatar";
import { Badge } from "./badge";
import { formatRelativeTime } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import type { Post } from "@/types/feed";

interface QuoteRepostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onSubmit: (content: string) => Promise<void>;
  loading?: boolean;
}

export const QuoteRepostModal = ({ 
  isOpen, 
  onClose, 
  post, 
  onSubmit, 
  loading = false 
}: QuoteRepostModalProps) => {
  const [content, setContent] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent("");
      onClose();
    } catch (error) {
      console.error("Quote repost failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setContent("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-xl font-semibold">Repost with your thoughts</DialogTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quote content input */}
          <div className="space-y-2">
            <Textarea
              placeholder="What do you think about this?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-24 resize-none border-none p-0 text-base placeholder:text-muted-foreground focus-visible:ring-0"
              disabled={isSubmitting}
              maxLength={500}
            />
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Share your perspective with your network</span>
              <span className={cn(
                content.length > 450 && "text-orange-500",
                content.length >= 500 && "text-destructive"
              )}>
                {content.length}/500
              </span>
            </div>
          </div>

          {/* Original post preview */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                {post.author.avatar ? (
                  <img 
                    src={post.author.avatar} 
                    alt={post.author.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="text-sm font-medium">{post.author.name.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-sm">{post.author.name}</h4>
                  {post.author.verified && (
                    <Badge variant="secondary" className="text-xs">✓</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {post.author.title && `${post.author.title} • `}
                  {formatRelativeTime(post.createdAt)}
                </p>
                <div className="mt-2">
                  <p className="text-sm text-foreground line-clamp-4">
                    {post.content}
                  </p>
                  
                  {/* Show media preview if available */}
                  {post.media && post.media.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-1 max-w-64">
                      {post.media.slice(0, 2).map((media, index) => (
                        <div 
                          key={media.id}
                          className="aspect-video bg-muted rounded overflow-hidden"
                        >
                          {media.type === 'image' ? (
                            <img
                              src={media.url}
                              alt={media.alt}
                              className="w-full h-full object-cover"
                            />
                          ) : media.type === 'video' ? (
                            <video
                              src={media.url}
                              className="w-full h-full object-cover"
                              poster={media.thumbnail}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-xs">📄</span>
                            </div>
                          )}
                          {post.media!.length > 2 && index === 1 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white text-xs font-semibold">
                                +{post.media!.length - 2}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show poll preview if available */}
                  {post.poll && (
                    <div className="mt-2 p-2 border rounded text-xs">
                      <span className="font-medium">Poll: </span>
                      <span className="text-muted-foreground">
                        {post.poll.options.length} options • {post.poll.totalVotes} votes
                      </span>
                    </div>
                  )}

                  {/* Show event preview if available */}
                  {post.event && (
                    <div className="mt-2 p-2 border rounded text-xs">
                      <span className="font-medium">Event: </span>
                      <span className="text-muted-foreground">
                        {post.event.title}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting || content.length > 500}
              loading={isSubmitting}
              className="min-w-20"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Repost
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};