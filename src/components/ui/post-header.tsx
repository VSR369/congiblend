import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Badge } from "./badge";
import { Button } from "./button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";
import { MoreHorizontal, Flag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { User } from "@/types/feed";

interface PostHeaderProps {
  author: User;
  createdAt: Date;
  isOwnPost?: boolean;
  className?: string;
}

interface UserAvatarProps {
  src?: string;
  name: string;
  className?: string;
}

interface UserInfoProps {
  author: User;
  createdAt: Date;
  className?: string;
}

interface PostOwnerBadgeProps {
  visible: boolean;
  className?: string;
}

export const UserAvatar = ({ src, name, className }: UserAvatarProps) => (
  <Avatar className={cn("h-10 w-10", className)}>
    <AvatarImage src={src} alt={name} />
    <AvatarFallback>
      {name.split(' ').map(n => n[0]).join('').toUpperCase()}
    </AvatarFallback>
  </Avatar>
);

export const UserInfo = ({ author, createdAt, className }: UserInfoProps) => (
  <div className={className}>
    <div className="flex items-center space-x-2">
      <h3 className="font-semibold text-sm">{author.name}</h3>
      {author.verified && (
        <Badge variant="secondary" className="text-xs">
          ✓
        </Badge>
      )}
    </div>
    <div className="text-xs text-muted-foreground">
      {author.title && author.company && (
        <span>{author.title} at {author.company} • </span>
      )}
      <span>@{author.username} • {formatDistanceToNow(createdAt, { addSuffix: true })}</span>
    </div>
  </div>
);

export const PostOwnerBadge = ({ visible, className }: PostOwnerBadgeProps) => {
  if (!visible) return null;
  
  return (
    <Badge variant="outline" className={cn("text-xs", className)}>
      You
    </Badge>
  );
};

export const PostHeader = ({ author, createdAt, isOwnPost = false, className }: PostHeaderProps) => (
  <div className={cn("flex items-start justify-between mb-4", className)}>
    <div className="flex items-center space-x-3">
      <UserAvatar src={author.avatar} name={author.name} />
      <UserInfo author={author} createdAt={createdAt} />
      <PostOwnerBadge visible={isOwnPost} />
    </div>
    
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <Flag className="mr-2 h-4 w-4" />
          Report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);