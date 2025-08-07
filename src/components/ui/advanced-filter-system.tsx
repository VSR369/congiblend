import * as React from "react";
import { Filter, X } from "lucide-react";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Separator } from "./separator";
import { Badge } from "./badge";
import { PostOwnerFilter } from "./post-owner-filter";
import { AdvancedContentTypeFilter } from "./advanced-content-type-filter";
import { AdvancedTimeRangeFilter } from "./advanced-time-range-filter";
import { useFeedStore } from "@/stores/feedStore";
import { cn } from "@/lib/utils";
import type { PostType, User } from "@/types/feed";

interface AdvancedFilterSystemProps {
  className?: string;
}

export const AdvancedFilterSystem = ({ className }: AdvancedFilterSystemProps) => {
  const { filters, users, updateFilters } = useFeedStore();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  // Find the selected user object based on the filter
  React.useEffect(() => {
    if (filters.userFilter !== 'all' && filters.userFilter !== 'my_posts' && filters.userFilter !== 'others') {
      const user = users.find(u => u.username === filters.userFilter);
      setSelectedUser(user || null);
    } else {
      setSelectedUser(null);
    }
  }, [filters.userFilter, users]);

  const handlePostOwnerFilterChange = (filter: 'all' | 'mine' | 'others') => {
    updateFilters({ 
      userFilter: filter === 'mine' ? 'my_posts' : filter === 'others' ? 'others' : 'all' 
    });
  };

  const handleUserSelect = (user: User | null) => {
    setSelectedUser(user);
    updateFilters({ 
      userFilter: user ? user.username : 'all' 
    });
  };

  const handleContentTypesChange = (types: PostType[]) => {
    updateFilters({ contentTypes: types });
  };

  const handleTimeRangeChange = (range: 'recent' | 'week' | 'month' | 'all') => {
    updateFilters({ timeRange: range });
  };

  const clearAllFilters = () => {
    updateFilters({
      userFilter: 'all',
      contentTypes: ['text', 'image', 'video', 'article', 'poll', 'event', 'job'],
      timeRange: 'all'
    });
    setSelectedUser(null);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.userFilter !== 'all') count++;
    if (filters.contentTypes.length < 7) count++;
    if (filters.timeRange !== 'all') count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  const getDisplayFilter = () => {
    if (filters.userFilter === 'my_posts') return 'mine';
    if (filters.userFilter === 'others') return 'others';
    return filters.userFilter === 'all' ? 'all' : 'all';
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            Filter
            {activeFilterCount > 0 && (
              <Badge 
                variant="secondary" 
                className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="start">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Advanced Filters</h4>
              {activeFilterCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            <Separator />

            <PostOwnerFilter
              selectedFilter={getDisplayFilter()}
              selectedUser={selectedUser}
              onFilterChange={handlePostOwnerFilterChange}
              onUserSelect={handleUserSelect}
            />

            <Separator />

            <AdvancedContentTypeFilter
              selectedTypes={filters.contentTypes}
              onTypesChange={handleContentTypesChange}
            />

            <Separator />

            <AdvancedTimeRangeFilter
              selectedRange={filters.timeRange}
              onRangeChange={handleTimeRangeChange}
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {filters.userFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              {selectedUser ? selectedUser.name : 
               filters.userFilter === 'my_posts' ? 'My Posts' : 
               filters.userFilter === 'others' ? 'Others' : 
               filters.userFilter}
              <button 
                onClick={() => {
                  updateFilters({ userFilter: 'all' });
                  setSelectedUser(null);
                }}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {filters.contentTypes.length < 7 && (
            <Badge variant="secondary" className="text-xs">
              {filters.contentTypes.length} content types
              <button 
                onClick={() => updateFilters({ contentTypes: ['text', 'image', 'video', 'article', 'poll', 'event', 'job'] })}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {filters.timeRange !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              {filters.timeRange === 'recent' ? 'Last 24h' :
               filters.timeRange === 'week' ? 'This week' :
               filters.timeRange === 'month' ? 'This month' :
               filters.timeRange}
              <button 
                onClick={() => updateFilters({ timeRange: 'all' })}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};