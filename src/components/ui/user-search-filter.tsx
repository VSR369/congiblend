import * as React from "react";
import { Search, X, User } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Badge } from "./badge";
import { useFeedStore } from "@/stores/feedStore";
import { cn } from "@/lib/utils";
import type { User as UserType } from "@/types/feed";

interface UserSearchFilterProps {
  placeholder?: string;
  selectedUser?: UserType | null;
  onUserSelect?: (user: UserType | null) => void;
  className?: string;
}

export const UserSearchFilter = ({ 
  placeholder = "Search for a user...", 
  selectedUser,
  onUserSelect,
  className 
}: UserSearchFilterProps) => {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const { users, loadUsers } = useFeedStore();

  React.useEffect(() => {
    if (users.length === 0) {
      loadUsers();
    }
  }, [users.length, loadUsers]);

  const filteredUsers = users.filter(user => {
    // Safety check for null/undefined values
    const name = user.name || '';
    const username = user.username || '';
    const query = searchQuery.toLowerCase();
    return name.toLowerCase().includes(query) || username.toLowerCase().includes(query);
  });

  const handleUserSelect = (user: UserType) => {
    onUserSelect?.(user);
    setOpen(false);
    setSearchQuery("");
  };

  const handleClear = () => {
    onUserSelect?.(null);
    setSearchQuery("");
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedUser ? (
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                  {(selectedUser.name || selectedUser.username || '?').charAt(0).toUpperCase()}
                </div>
                <span>{selectedUser.name || selectedUser.username}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput 
              placeholder="Search users..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup>
                {filteredUsers.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.username}
                    onSelect={() => handleUserSelect(user)}
                    className="flex items-center space-x-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs">
                      {(user.name || user.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{user.name || user.username}</div>
                      <div className="text-sm text-muted-foreground">@{user.username || 'unknown'}</div>
                      {user.title && (
                        <div className="text-xs text-muted-foreground">{user.title}</div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedUser && (
        <Badge variant="secondary" className="inline-flex items-center space-x-1">
          <User className="h-3 w-3" />
          <span>{selectedUser.name || selectedUser.username}</span>
          <button 
            onClick={handleClear}
            className="ml-1 hover:bg-muted-foreground/20 rounded-full"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
    </div>
  );
};