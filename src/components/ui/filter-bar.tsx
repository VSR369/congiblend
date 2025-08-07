import * as React from "react";
import { Filter, X } from "lucide-react";
import { Button } from "./button";
import { Badge } from "./badge";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Separator } from "./separator";
import { PostFilter } from "./post-filter";
import { ContentTypeFilter } from "./content-type-filter";
import { TimeRangeFilter } from "./time-range-filter";
import { useFeedStore } from "@/stores/feedStore";
import { PostType } from "@/types/feed";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  className?: string;
}

const timeRangeLabels = {
  recent: "Last 24 hours",
  week: "This week", 
  month: "This month",
  all: "All time"
};

export const FilterBar = ({ className }: FilterBarProps) => {
  const { filters, users, updateFilters } = useFeedStore();
  const [isOpen, setIsOpen] = React.useState(false);

  const clearAllFilters = () => {
    updateFilters({
      userFilter: 'all',
      contentTypes: ['text', 'image', 'video', 'article', 'poll', 'event'],
      timeRange: 'all'
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.userFilter !== 'all') count++;
    if (filters.contentTypes.length < 6) count++;
    if (filters.timeRange !== 'all') count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

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
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filter Posts</h4>
              {activeFilterCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            <Separator />

            <PostFilter
              selectedFilter={filters.userFilter}
              onFilterChange={(value) => updateFilters({ userFilter: value })}
            />

            <Separator />

            <ContentTypeFilter
              selectedTypes={filters.contentTypes}
              onTypesChange={(types) => updateFilters({ contentTypes: types })}
            />

            <Separator />

            <TimeRangeFilter
              selectedRange={filters.timeRange}
              onRangeChange={(range: any) => updateFilters({ timeRange: range })}
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {filters.userFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              {filters.userFilter === 'my_posts' ? 'My Posts' : 
               filters.userFilter === 'others' ? 'Others' : 
               users.find(u => u.username === filters.userFilter)?.name || filters.userFilter}
              <button 
                onClick={() => updateFilters({ userFilter: 'all' })}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {filters.contentTypes.length < 6 && (
            <Badge variant="secondary" className="text-xs">
              {filters.contentTypes.length} types
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
              {timeRangeLabels[filters.timeRange]}
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