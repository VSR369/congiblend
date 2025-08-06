import * as React from "react";
import { Send } from "lucide-react";
import { Button } from "./button";
import { Textarea } from "./textarea";
import { Avatar } from "./avatar";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

interface CommentInputProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const CommentInput = ({ 
  onSubmit, 
  placeholder = "Write a comment...", 
  disabled = false,
  className 
}: CommentInputProps) => {
  const [content, setContent] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { user } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent("");
    } catch (error) {
      console.error("Error submitting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("flex space-x-3", className)}>
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
          disabled={disabled || isSubmitting}
          className="flex-1 min-h-[40px] max-h-[120px] resize-none"
          rows={1}
        />
        
        <Button
          type="submit"
          size="sm"
          disabled={!content.trim() || isSubmitting || disabled}
          className="self-end"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};