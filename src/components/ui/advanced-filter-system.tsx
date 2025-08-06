import * as React from "react";
import { Filter, X, Check, RotateCcw } from "lucide-react";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Separator } from "./separator";
import { Badge } from "./badge";
import { PostOwnerFilter } from "./post-owner-filter";
import { AdvancedContentTypeFilter } from "./advanced-content-type-filter";
import { AdvancedTimeRangeFilter } from "./advanced-time-range-filter";
import { useFeedStore, type FeedFilters } from "@/stores/feedStore";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { PostType, User } from "@/types/feed";

interface AdvancedFilterSystemProps {
  className?: string;
}

export const AdvancedFilterSystem = ({ className }: AdvancedFilterSystemProps) => {
  const { filters, users, updateFilters, loading } = useFeedStore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [isApplying, setIsApplying] = React.useState(false);
  
  // Local state for pending filter changes
  const [pendingFilters, setPendingFilters] = React.useState<FeedFilters>(filters);
  const [pendingUser, setPendingUser] = React.useState<User | null>(null);

  // Sync local state with store when filters change externally
  React.useEffect(() => {
    setPendingFilters(filters);
    if (filters.userFilter !== 'all' && filters.userFilter !== 'my_posts' && filters.userFilter !== 'others') {
      const user = users.find(u => u.username === filters.userFilter);
      setSelectedUser(user || null);
      setPendingUser(user || null);
    } else {
      setSelectedUser(null);
      setPendingUser(null);
    }
  }, [filters, users]);

  const handlePostOwnerFilterChange = (filter: 'all' | 'mine' | 'others') => {
    setPendingFilters(prev => ({ 
      ...prev,
      userFilter: filter === 'mine' ? 'my_posts' : filter === 'others' ? 'others' : 'all' 
    }));
    setPendingUser(null);
  };

  const handleUserSelect = (user: User | null) => {
    setPendingUser(user);
    setPendingFilters(prev => ({ 
      ...prev,
      userFilter: user ? user.username : 'all' 
    }));
  };

  const handleContentTypesChange = (types: PostType[]) => {
    setPendingFilters(prev => ({ ...prev, contentTypes: types }));
  };

  const handleTimeRangeChange = (range: 'recent' | 'week' | 'month' | 'all') => {
    setPendingFilters(prev => ({ ...prev, timeRange: range }));
  };

  const clearAllFilters = () => {
    const defaultFilters = {
      userFilter: 'all' as const,
      contentTypes: ['text', 'image', 'video', 'article', 'poll', 'event', 'job'] as PostType[],
      timeRange: 'all' as const
    };
    setPendingFilters(defaultFilters);
    setPendingUser(null);
  };

  const applyFilters = async () => {
    setIsApplying(true);
    try {
      updateFilters(pendingFilters);
      setSelectedUser(pendingUser);
      setIsOpen(false);
      toast({
        title: "Filters applied",
        description: "Your feed has been updated with the new filters.",
      });
    } catch (error) {
      toast({
        title: "Error applying filters",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsApplying(false);
    }
  };

  const resetToApplied = () => {
    setPendingFilters(filters);
    setPendingUser(selectedUser);
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
    if (pendingFilters.userFilter === 'my_posts') return 'mine';
    if (pendingFilters.userFilter === 'others') return 'others';
    return pendingFilters.userFilter === 'all' ? 'all' : 'all';
  };

  const hasChanges = () => {
    return JSON.stringify(pendingFilters) !== JSON.stringify(filters) || 
           pendingUser?.id !== selectedUser?.id;
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "relative",
              hasChanges() && "border-primary bg-primary/5",
              loading && "opacity-60"
            )}
            disabled={loading}
          >
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
            {hasChanges() && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="start">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Advanced Filters</h4>
              <div className="flex items-center gap-2">
                {hasChanges() && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={resetToApplied}
                    className="text-muted-foreground"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>

            <Separator />

            <PostOwnerFilter
              selectedFilter={getDisplayFilter()}
              selectedUser={pendingUser}
              onFilterChange={handlePostOwnerFilterChange}
              onUserSelect={handleUserSelect}
            />

            <Separator />

            <AdvancedContentTypeFilter
              selectedTypes={pendingFilters.contentTypes}
              onTypesChange={handleContentTypesChange}
            />

            <Separator />

            <AdvancedTimeRangeFilter
              selectedRange={pendingFilters.timeRange}
              onRangeChange={handleTimeRangeChange}
            />

            <Separator />

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={applyFilters}
                disabled={!hasChanges() || isApplying}
                className="min-w-[100px]"
              >
                {isApplying ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent mr-2" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-2" />
                    Apply Filters
                  </>
                )}
              </Button>
            </div>
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