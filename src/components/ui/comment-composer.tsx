import React, { useEffect, useRef, useState } from "react";
import { useCommentsStore } from "@/stores/commentsStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { Smile, Send } from "lucide-react";

interface CommentComposerProps {
  postId: string;
  parentId?: string | null;
  onSubmitted?: () => void;
  className?: string;
}

export const CommentComposer: React.FC<CommentComposerProps> = ({ 
  postId, 
  parentId = null, 
  onSubmitted, 
  className 
}) => {
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { add } = useCommentsStore();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Mention autocomplete state
  const [open, setOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const debouncedQuery = useDebounce(mentionQuery, 150);
  const [results, setResults] = useState<Array<{ id: string; username: string; display_name?: string | null; avatar_url?: string | null }>>([]);
  const [loading, setLoading] = useState(false);

  const canSubmit = value.trim().length > 0 && !isSubmitting;

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
    setIsSubmitting(true);
    try {
      await add(postId, value.trim(), parentId);
      setValue("");
      setOpen(false);
      setMentionQuery("");
      onSubmitted?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("linkedin-comment-composer", className)}>
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarImage src="" alt="Your avatar" />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            You
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-3">
          <Popover open={open && mentionQuery.length > 0} onOpenChange={(next) => setOpen(next && mentionQuery.length > 0)}>
            <PopoverTrigger asChild>
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                placeholder={parentId ? "Write a reply..." : "Add a comment..."}
                className="min-h-[60px] resize-none border-0 bg-transparent p-0 text-sm placeholder:text-muted-foreground focus-visible:ring-0"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setOpen(false);
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                onBlur={() => setOpen(false)}
              />
            </PopoverTrigger>
            <PopoverContent align="start" className="p-0 w-80">
              <Command>
                <CommandInput placeholder="Search users..." value={mentionQuery} onValueChange={setMentionQuery} />
                <CommandList>
                  <CommandEmpty>{loading ? 'Searching users...' : 'No users found'}</CommandEmpty>
                  {results.map((u) => (
                    <CommandItem key={u.id} value={u.username} onSelect={() => handleSelectUser(u)}>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={u.avatar_url || ""} alt={u.display_name || u.username} />
                          <AvatarFallback className="text-xs">
                            {(u.display_name || u.username).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="text-sm font-medium">@{u.username}</div>
                          {u.display_name && (
                            <div className="text-xs text-muted-foreground">{u.display_name}</div>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
                <Smile className="h-4 w-4" />
              </Button>
            </div>
            
            <Button 
              onClick={handleSubmit} 
              disabled={!canSubmit}
              size="sm"
              className="h-8 px-4 text-xs font-medium"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  Posting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="h-3 w-3" />
                  {parentId ? "Reply" : "Post"}
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};