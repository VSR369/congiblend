import * as React from "react";
import { Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Separator } from "./separator";
import { useFeedStore } from "@/stores/feedStore";

export interface PostFilterProps {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  className?: string;
}

export const PostFilter = ({ selectedFilter, onFilterChange, className }: PostFilterProps) => {
  const { users, loadUsers } = useFeedStore();

  React.useEffect(() => {
    if (users.length === 0) {
      loadUsers();
    }
  }, [users.length, loadUsers]);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4" />
        <label className="text-sm font-medium">Show posts from</label>
      </div>
      <Select value={selectedFilter} onValueChange={onFilterChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All users</SelectItem>
          <SelectItem value="my_posts">My posts only</SelectItem>
          <SelectItem value="others">Others' posts</SelectItem>
          <Separator className="my-2" />
          {users.map((user) => (
            <SelectItem key={user.id} value={user.username}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span>{user.name}</span>
                {user.title && (
                  <span className="text-xs text-muted-foreground">
                    • {user.title}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};