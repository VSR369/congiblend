import * as React from "react";
import { Send, Image, Smile, Paperclip } from "lucide-react";
import { Button } from "./button";
import { Textarea } from "./textarea";
import { Avatar } from "./avatar";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface CommentInputProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export const CommentInput = ({ 
  onSubmit, 
  placeholder = "Write a comment...", 
  disabled = false,
  className,
  value: controlledValue,
  onChange: onControlledChange
}: CommentInputProps) => {
  const [internalContent, setInternalContent] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // Use controlled value if provided, otherwise use internal state
  const content = controlledValue !== undefined ? controlledValue : internalContent;
  const setContent = onControlledChange || setInternalContent;
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      // Clear content after successful submission
      if (onControlledChange) {
        onControlledChange("");
      } else {
        setInternalContent("");
      }
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
      <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
        {user?.user_metadata?.avatar_url ? (
          <img src={user.user_metadata.avatar_url} alt={user.user_metadata?.display_name || "User"} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-medium">
            {(user?.user_metadata?.display_name || user?.email?.split('@')[0] || "U").charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      
      <div className="flex-1">
        <div className="relative border rounded-lg bg-background">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSubmitting}
            className="border-0 min-h-[44px] max-h-[120px] resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
            rows={1}
            autoFocus={true}
          />
          
            <div className="flex items-center justify-between p-2 border-t">
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Image className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Smile className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!content.trim() || isSubmitting || disabled}
                  className="h-7 px-3"
                >
                  Post
                </Button>
              </div>
            </div>
        </div>
      </div>
    </form>
  );
};