import * as React from "react";
import { Users } from "lucide-react";
import { FilterOption } from "./filter-option";
import { UserSearchFilter } from "./user-search-filter";
import { cn } from "@/lib/utils";
import type { User } from "@/types/feed";

interface PostOwnerFilterProps {
  selectedFilter: 'all' | 'mine' | 'others' | string;
  selectedUser?: User | null;
  onFilterChange: (filter: 'all' | 'mine' | 'others') => void;
  onUserSelect: (user: User | null) => void;
  className?: string;
}

export const PostOwnerFilter = ({
  selectedFilter,
  selectedUser,
  onFilterChange,
  onUserSelect,
  className
}: PostOwnerFilterProps) => {
  const handleFilterOptionClick = (value: string) => {
    if (value === 'all' || value === 'mine' || value === 'others') {
      onFilterChange(value);
      // Clear user selection when switching to preset filters
      if (selectedUser) {
        onUserSelect(null);
      }
    }
  };

  const handleUserSelect = (user: User | null) => {
    onUserSelect(user);
    // When a specific user is selected, the filter should reflect that
    if (user) {
      // Don't change the selectedFilter here as it will be handled by the parent
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4" />
        <label className="text-sm font-medium">Show posts from</label>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <FilterOption
          value="all"
          isSelected={selectedFilter === 'all' && !selectedUser}
          onClick={handleFilterOptionClick}
        >
          All Posts
        </FilterOption>
        <FilterOption
          value="mine"
          isSelected={selectedFilter === 'mine' && !selectedUser}
          onClick={handleFilterOptionClick}
        >
          My Posts
        </FilterOption>
        <FilterOption
          value="others"
          isSelected={selectedFilter === 'others' && !selectedUser}
          onClick={handleFilterOptionClick}
        >
          Others' Posts
        </FilterOption>
      </div>

      <UserSearchFilter
        placeholder="Filter by specific user..."
        selectedUser={selectedUser}
        onUserSelect={handleUserSelect}
      />
    </div>
  );
};