import React, { useEffect, useMemo, useState } from "react";
import { useCommentsStore } from "@/stores/commentsStore";
import type { Comment } from "@/types/comments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface CommentComposerProps {
  postId: string;
  parentId?: string | null;
  onSubmitted?: () => void;
  className?: string;
}

export const CommentComposer: React.FC<CommentComposerProps> = ({ postId, parentId = null, onSubmitted, className }) => {
  const [value, setValue] = useState("");
  const { add } = useCommentsStore();

  const canSubmit = value.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await add(postId, value.trim(), parentId);
    setValue("");
    onSubmitted?.();
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={parentId ? "Write a reply..." : "Write a comment..."}
      />
      <div className="flex justify-end">
        <Button disabled={!canSubmit} onClick={handleSubmit} size="sm">
          {parentId ? "Reply" : "Comment"}
        </Button>
      </div>
    </div>
  );
};

interface CommentItemProps {
  comment: Comment;
  postId: string;
  depth?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, postId, depth = 0 }) => {
  const [showReply, setShowReply] = useState(false);
  const indent = Math.min(depth, 3) * 16;

  const contentNodes = useMemo(() => {
    const parts: React.ReactNode[] = [];
    const text = comment.content || '';
    const regex = /@([0-9a-fA-F-]{36})\b/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const start = m.index;
      if (start > lastIndex) parts.push(text.slice(lastIndex, start));
      const id = m[1];
      parts.push(<a key={`${id}-${start}`} href={`/messages?to=${id}`} className="text-primary hover:underline">@{id}</a>);
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts;
  }, [comment.content]);

  if (comment.is_deleted) {
    return (
      <div className="text-sm text-muted-foreground" style={{ marginLeft: indent }}>
        Comment removed
      </div>
    );
  }

  return (
    <div className="space-y-2" style={{ marginLeft: indent }}>
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center">
          {comment.author?.avatar_url ? (
            <img src={comment.author.avatar_url} alt={comment.author?.display_name || "User avatar"} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-medium">
              {(comment.author?.display_name || comment.author?.username || "U").charAt(0)}
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">{comment.author?.display_name || comment.author?.username || "User"}</div>
          <div className="text-sm text-foreground whitespace-pre-wrap">{contentNodes}</div>
          <div className="mt-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setShowReply((s) => !s)}>
              Reply
            </Button>
          </div>
          {showReply && (
            <CommentComposer postId={postId} parentId={comment.id} onSubmitted={() => setShowReply(false)} className="mt-2" />
          )}
          {comment.children && comment.children.length > 0 && (
            <div className="mt-2 space-y-3">
              {comment.children.map((child) => (
                <CommentItem key={child.id} comment={child} postId={postId} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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

  if (!state || state.loading) {
    return (
      <div className="px-4 pb-4 text-sm text-muted-foreground">Loading comments…</div>
    );
  }

  return (
    <section aria-label="Comments" className="px-4 pb-4 space-y-4">
      <CommentComposer postId={postId} />
      <div className="space-y-4">
        {state.comments.length === 0 ? (
          <div className="text-sm text-muted-foreground">Be the first to comment.</div>
        ) : (
          state.comments.map((c) => <CommentItem key={c.id} comment={c} postId={postId} />)
        )}
      </div>
    </section>
  );
};
