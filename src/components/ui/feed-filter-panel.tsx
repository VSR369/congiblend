import * as React from "react";
import { Check, Filter, X, Users, Calendar, FileText } from "lucide-react";
import { Button } from "./button";
import { Badge } from "./badge";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Checkbox } from "./checkbox";
import { Separator } from "./separator";
import { useFeedStore } from "@/stores/feedStore";
import { PostType } from "@/types/feed";
import { cn } from "@/lib/utils";

interface FeedFilterPanelProps {
  className?: string;
}

const contentTypeLabels: Record<PostType, string> = {
  text: "Text Posts",
  image: "Images",
  video: "Videos", 
  audio: "Audio",
  article: "Articles",
  poll: "Polls",
  event: "Events",
  document: "Documents",
  link: "Links",
  carousel: "Carousels"
};

const timeRangeLabels = {
  recent: "Last 24 hours",
  week: "This week", 
  month: "This month",
  all: "All time"
};

export const FeedFilterPanel = ({ className }: FeedFilterPanelProps) => {
  const { filters, users, updateFilters, loadUsers } = useFeedStore();
  const [isOpen, setIsOpen] = React.useState(false);
  const currentUser = React.useMemo(() => {
    // Get current user from auth (simplified for now)
    return null; // Will be replaced with actual auth user
  }, []);

  React.useEffect(() => {
    if (users.length === 0) {
      loadUsers();
    }
  }, [users.length, loadUsers]);

  const handleContentTypeToggle = (type: PostType) => {
    const newTypes = filters.contentTypes.includes(type)
      ? filters.contentTypes.filter(t => t !== type)
      : [...filters.contentTypes, type];
    
    updateFilters({ contentTypes: newTypes });
  };

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

            {/* User Filter */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <label className="text-sm font-medium">Show posts from</label>
              </div>
              <Select 
                value={filters.userFilter} 
                onValueChange={(value) => updateFilters({ userFilter: value })}
              >
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

            <Separator />

            {/* Content Type Filter */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <label className="text-sm font-medium">Content types</label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(contentTypeLabels).map(([type, label]) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={type}
                      checked={filters.contentTypes.includes(type as PostType)}
                      onCheckedChange={() => handleContentTypeToggle(type as PostType)}
                    />
                    <label
                      htmlFor={type}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Time Range Filter */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <label className="text-sm font-medium">Time range</label>
              </div>
              <Select 
                value={filters.timeRange} 
                onValueChange={(value: any) => updateFilters({ timeRange: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(timeRangeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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