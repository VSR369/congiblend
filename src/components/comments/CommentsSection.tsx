import React, { useEffect, useRef, useState } from "react";
import { useCommentsStore } from "@/stores/commentsStore";
import { CommentComposer } from "@/components/ui/comment-composer";
import { CommentItem } from "@/components/ui/comment-item";
import { MessageCircle } from "lucide-react";


interface CommentsSectionProps {
  postId: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ postId }) => {
  const state = useCommentsStore((s) => s.byPostId[postId]);
  const load = useCommentsStore((s) => s.load);
  const subscribe = useCommentsStore((s) => s.subscribe);
  const unsubscribe = useCommentsStore((s) => s.unsubscribe);

  useEffect(() => {
    load(postId);
    subscribe(postId);
    return () => unsubscribe(postId);
  }, [postId, load, subscribe, unsubscribe]);

  const [open, setOpen] = useState(false);
  const panelId = `comments-panel-${postId}`;
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const el = panelRef.current?.querySelector('textarea') as HTMLTextAreaElement | null;
        el?.focus();
      }, 0);
    }
  }, [open]);

  if (!state || state.loading) {
    return (
      <div className="p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
          Loading comments...
        </div>
      </div>
    );
  }

  const commentCount = state.comments.length;

  return (
    <section aria-label="Comments" className="border-t border-border/50">
      {/* Comments Header */}
      <div className="px-4 sm:px-6 py-3 border-b border-border/50">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <MessageCircle className="h-4 w-4" />
          <span>
            {open ? "Hide comments" : "Comments"}
            {commentCount > 0 ? ` (${commentCount})` : ""}
          </span>
        </button>
      </div>

      {/* Comments Panel */}
      <div id={panelId} ref={panelRef} role="region" aria-label="Comments panel">
        {/* Comment Composer */}
        <div className="px-4 sm:px-6 py-3 border-b border-border/30">
          <CommentComposer postId={postId} />
        </div>

        {/* Comments List */}
        {open ? (
          <div className="px-4 sm:px-6 py-3 animate-fade-in">
            {commentCount === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No comments yet</p>
                <p className="text-xs text-muted-foreground mt-1">Be the first to share your thoughts</p>
              </div>
            ) : (
              <div className="space-y-4">
                {state.comments.map((comment) => (
                  <CommentItem key={comment.id} comment={comment} postId={postId} />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
};
