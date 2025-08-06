import * as React from "react";
import { Send, AlertCircle } from "lucide-react";
import { Button } from "./button";
import { Textarea } from "./textarea";
import { Alert, AlertDescription } from "./alert";
import { supabase } from "@/integrations/supabase/client";
import { useComments } from "@/hooks/useComments";
import { cn } from "@/lib/utils";

interface CommentInputProps {
  postId: string;
  onCommentAdded?: (comment: any) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  parentId?: string;
}

export const CommentInput = ({ 
  postId,
  onCommentAdded,
  placeholder = "Write a comment...", 
  disabled = false,
  className,
  parentId
}: CommentInputProps) => {
  const [content, setContent] = React.useState("");
  const [user, setUser] = React.useState<any>(null);
  
  const { isLoading, error, addComment, clearError } = useComments(onCommentAdded);

  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isLoading) return;

    try {
      await addComment(postId, content.trim(), parentId);
      setContent("");
    } catch (error) {
      // Error is handled by the useComments hook
      console.error("Error submitting comment:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="flex space-x-3">
        <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt={user.user_metadata?.display_name || "User"} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-medium">
              {(user?.user_metadata?.display_name || user?.email?.split('@')[0] || "U").charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        
        <div className="flex-1 flex space-x-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className="flex-1 min-h-[40px] max-h-[120px] resize-none"
            rows={1}
          />
          
          <Button
            type="submit"
            size="sm"
            disabled={!content.trim() || isLoading || disabled}
            className="self-end"
          >
            {isLoading ? (
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};