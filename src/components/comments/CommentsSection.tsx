import React, { useEffect, useMemo, useRef, useState } from "react";
import { useCommentsStore } from "@/stores/commentsStore";
import type { Comment } from "@/types/comments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

interface CommentComposerProps {
  postId: string;
  parentId?: string | null;
  onSubmitted?: () => void;
  className?: string;
}

export const CommentComposer: React.FC<CommentComposerProps> = ({ postId, parentId = null, onSubmitted, className }) => {
  const [value, setValue] = useState("");
  const { add } = useCommentsStore();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Mention autocomplete state
  const [open, setOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const debouncedQuery = useDebounce(mentionQuery, 150);
  const [results, setResults] = useState<Array<{ id: string; username: string; display_name?: string | null; avatar_url?: string | null }>>([]);
  const [loading, setLoading] = useState(false);

  const canSubmit = value.trim().length > 0;

  // Fetch mention candidates
  useEffect(() => {
    const run = async () => {
      if (!debouncedQuery || debouncedQuery.length < 1) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .or(`username.ilike.${debouncedQuery}%,display_name.ilike.${debouncedQuery}%`)
          .limit(8);
        if (!error && data) setResults(data as any);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [debouncedQuery]);

  const updateMentionState = (text: string, caret: number | null) => {
    const pos = (caret ?? text.length) - 1;
    const upto = text.slice(0, Math.max(0, pos + 1));
    const at = upto.lastIndexOf('@');
    if (at === -1) {
      setOpen(false);
      setMentionQuery("");
      return;
    }
    const afterAt = text.slice(at + 1, Math.max(at + 1, caret ?? text.length));
    // Stop if whitespace or newline before caret
    if (/\s/.test(afterAt)) {
      setOpen(false);
      setMentionQuery("");
      return;
    }
    setMentionQuery(afterAt);
    setOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setValue(newVal);
    updateMentionState(newVal, e.target.selectionStart);
  };

  const handleSelectUser = (u: { id: string; username: string }) => {
    // Replace current @token with @username
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? value.length;
    const upto = value.slice(0, caret);
    const at = upto.lastIndexOf('@');
    if (at >= 0) {
      const before = value.slice(0, at);
      const after = value.slice(caret);
      const inserted = `@${u.username} `; // include trailing space
      const next = before + inserted + after;
      setValue(next);
    }
    setOpen(false);
    setMentionQuery("");
    // refocus textarea
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await add(postId, value.trim(), parentId);
    setValue("");
    setOpen(false);
    setMentionQuery("");
    onSubmitted?.();
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            placeholder={parentId ? "Write a reply..." : "Write a comment..."}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
        </PopoverTrigger>
        <PopoverContent align="start" className="p-0 w-80">
          <Command>
            <CommandInput placeholder="Mention user…" value={mentionQuery} onValueChange={setMentionQuery} />
            <CommandList>
              <CommandEmpty>{loading ? 'Searching…' : 'No users found'}</CommandEmpty>
              {results.map((u) => (
                <CommandItem key={u.id} value={u.username} onSelect={() => handleSelectUser(u)}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.display_name || u.username} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs">{(u.display_name || u.username).charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm">@{u.username}</div>
                      {u.display_name ? <div className="text-xs text-muted-foreground">{u.display_name}</div> : null}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
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
    const regex = /@([0-9a-fA-F-]{36}|[a-zA-Z0-9_.-]{2,32})\b/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const start = m.index;
      if (start > lastIndex) parts.push(text.slice(lastIndex, start));
      const token = m[1];
      const href = `/messages?to=${token}`;
      parts.push(<a key={`${token}-${start}`} href={href} className="text-primary hover:underline">@{token}</a>);
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
