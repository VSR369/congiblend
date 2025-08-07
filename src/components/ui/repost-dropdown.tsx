import * as React from "react";
import { Share2, MessageSquare } from "lucide-react";
import { Button } from "./button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";
import { cn } from "@/lib/utils";

interface RepostDropdownProps {
  postId: string;
  sharesCount?: number;
  loading?: boolean;
  onSimpleRepost: () => void;
  onQuoteRepost: () => void;
  className?: string;
}

export const RepostDropdown = ({ 
  postId, 
  sharesCount = 0, 
  loading = false, 
  onSimpleRepost, 
  onQuoteRepost,
  className 
}: RepostDropdownProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          disabled={loading}
          className={cn(
            "linkedin-action-btn text-muted-foreground hover:bg-muted h-12 px-4 rounded-none flex flex-col items-center",
            className
          )}
        >
          <Share2 className={cn("h-5 w-5 mb-1", loading && "animate-pulse")} />
          <span className="text-xs font-medium">Repost</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56">
        <DropdownMenuItem onClick={onSimpleRepost} className="flex items-center py-3">
          <Share2 className="h-4 w-4 mr-3" />
          <div className="flex flex-col">
            <span className="font-medium">Repost</span>
            <span className="text-xs text-muted-foreground">Share instantly to your network</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onQuoteRepost} className="flex items-center py-3">
          <MessageSquare className="h-4 w-4 mr-3" />
          <div className="flex flex-col">
            <span className="font-medium">Repost with your thoughts</span>
            <span className="text-xs text-muted-foreground">Add your own commentary</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};