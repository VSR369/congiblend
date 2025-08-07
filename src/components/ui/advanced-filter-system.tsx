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

export const AdvancedFilterSystem = React.memo(({ className }: AdvancedFilterSystemProps) => {
  // Performance monitoring
  const renderCountRef = React.useRef(0);
  const lastRenderTime = React.useRef(Date.now());
  
  React.useEffect(() => {
    renderCountRef.current++;
    const now = Date.now();
    console.log('🔧 AdvancedFilterSystem re-render:', {
      count: renderCountRef.current,
      timeSinceLastRender: now - lastRenderTime.current,
      timestamp: now
    });
    lastRenderTime.current = now;
  });

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

  const handlePostOwnerFilterChange = React.useCallback((filter: 'all' | 'mine' | 'others') => {
    console.log('👤 Post owner filter changed:', filter);
    updateFilters({ 
      userFilter: filter === 'mine' ? 'my_posts' : filter === 'others' ? 'others' : 'all' 
    });
  }, [updateFilters]);

  const handleUserSelect = React.useCallback((user: User | null) => {
    console.log('👥 User selected:', user?.username || 'none');
    setSelectedUser(user);
    updateFilters({ 
      userFilter: user ? user.username : 'all' 
    });
  }, [updateFilters]);

  const handleContentTypesChange = React.useCallback((types: PostType[]) => {
    console.log('📝 Content types changed, count:', types.length);
    updateFilters({ contentTypes: types });
  }, [updateFilters]);

  const handleTimeRangeChange = React.useCallback((range: 'recent' | 'week' | 'month' | 'all') => {
    console.log('⏰ Time range changed:', range);
    updateFilters({ timeRange: range });
  }, [updateFilters]);

  const clearAllFilters = React.useCallback(() => {
    console.log('🧹 Clearing all filters');
    updateFilters({
      userFilter: 'all',
      contentTypes: ['text', 'image', 'video', 'article', 'poll', 'event'],
      timeRange: 'all'
    });
    setSelectedUser(null);
  }, [updateFilters]);

  const getActiveFilterCount = React.useCallback(() => {
    const start = performance.now();
    let count = 0;
    if (filters.userFilter !== 'all') count++;
    if (filters.contentTypes.length < 6) count++;
    if (filters.timeRange !== 'all') count++;
    const end = performance.now();
    if (end - start > 1) {
      console.log('⚡ Filter count calculation took:', end - start, 'ms');
    }
    return count;
  }, [filters]);

  const activeFilterCount = React.useMemo(() => getActiveFilterCount(), [getActiveFilterCount]);

  const getDisplayFilter = React.useMemo(() => {
    if (filters.userFilter === 'my_posts') return 'mine';
    if (filters.userFilter === 'others') return 'others';
    return filters.userFilter === 'all' ? 'all' : 'all';
  }, [filters.userFilter]);

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
              selectedFilter={getDisplayFilter}
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
          
          {filters.contentTypes.length < 6 && (
            <Badge variant="secondary" className="text-xs">
              {filters.contentTypes.length} content types
              <button 
                onClick={() => updateFilters({ contentTypes: ['text', 'image', 'video', 'article', 'poll', 'event'] })}
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
}, (prevProps, nextProps) => {
  return prevProps.className === nextProps.className;
});

AdvancedFilterSystem.displayName = "AdvancedFilterSystem";