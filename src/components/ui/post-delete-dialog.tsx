import * as React from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import type { Post, PostType } from "@/types/feed";
import { cn } from "@/lib/utils";

interface PostDeleteDialogProps {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  loading?: boolean;
}

const typeSpecificMessage = (type: PostType): string => {
  switch (type) {
    case "image":
      return "Are you sure you want to delete this photo post? The image and all comments will be permanently removed.";
    case "video":
      return "Are you sure you want to delete this video post? The video file and all interactions will be permanently removed.";
    case "audio":
      return "Are you sure you want to delete this audio post? The audio file and all comments will be permanently removed.";
    case "poll":
      return "Are you sure you want to delete this poll? All votes and results will be permanently lost.";
    case "event":
      return "Are you sure you want to delete this event? All RSVPs and event details will be permanently removed.";
    case "text":
    default:
      return "Are you sure you want to delete this post? This action cannot be undone.";
  }
};

export function PostDeleteDialog({ post, open, onOpenChange, onConfirm, loading }: PostDeleteDialogProps) {
  const message = typeSpecificMessage(post.type);

  // Simple preview block (content + first media thumb if available)
  const mediaThumb = React.useMemo(() => {
    const m = post.media?.[0];
    if (!m) return null;
    if (m.type === "image") {
      return (
        <img
          src={m.url}
          alt={m.alt || "Media preview"}
          className="h-20 w-32 object-cover rounded-md border"
          loading="lazy"
        />
      );
    }
    return (
      <div className="h-20 w-32 rounded-md border bg-accent/50 flex items-center justify-center text-xs text-muted-foreground">
        {m.type.toUpperCase()} file
      </div>
    );
  }, [post.media]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-destructive" />
            <AlertDialogTitle>Delete {post.type === "image" ? "photo" : post.type}?</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="mt-2 rounded-md border p-3 bg-muted/30">
          <div className="flex items-start gap-3">
            {mediaThumb}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground line-clamp-3 whitespace-pre-wrap break-words">{post.content}</p>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }))}
            onClick={() => onConfirm()}
            aria-label="Confirm delete"
            disabled={loading}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
