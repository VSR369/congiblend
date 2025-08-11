import * as React from "react";
import { Search, Filter, Mic, X, Clock, Bookmark, TrendingUp, Hash, Users, Building2, Briefcase, FileText } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";
import { Badge } from "./badge";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Separator } from "./separator";
import { useSearchStore } from "@/stores/searchStore";
import { useSearchDebounce } from "@/hooks/useAdvancedDebounce";
import { useSearchWorker } from "@/hooks/useWebWorker";
import { cn } from "@/lib/utils";
import type { SearchResultType, SearchSuggestion } from "@/types/search";

interface UniversalSearchProps {
  className?: string;
  onResultClick?: () => void;
}

export const UniversalSearch = React.memo(({ className, onResultClick }: UniversalSearchProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  
  const {
    query,
    suggestions,
    recentSearches,
    trendingTopics,
    isSearching,
    totalResults,
    setQuery,
    search,
    loadSuggestions,
    clearRecentSearches
  } = useSearchStore();

  const [debouncedInput, cancelSearch, isSearchPending] = useSearchDebounce(inputValue, 300);
  const { search: workerSearch } = useSearchWorker();

  React.useEffect(() => {
    if (debouncedInput) {
      loadSuggestions(debouncedInput);
    }
  }, [debouncedInput, loadSuggestions]);

  const handleSearch = React.useCallback((searchQuery: string) => {
    cancelSearch(); // Cancel pending debounced search
    setQuery(searchQuery);
    setInputValue(searchQuery);
    search(searchQuery);
    setIsOpen(false);
    onResultClick?.();
  }, [setQuery, search, onResultClick, cancelSearch]);

  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setIsOpen(value.length > 0 || recentSearches.length > 0);
  }, [recentSearches.length]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      handleSearch(inputValue.trim());
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }, [handleSearch, inputValue]);

  // Memoized icon mappings
  const resultTypeIcons = React.useMemo(() => ({
    people: Users,
    posts: FileText,
    companies: Building2,
    jobs: Briefcase,
    sparks: FileText,
    all: Search
  }), []);

  const getSuggestionIcon = React.useCallback((suggestion: SearchSuggestion) => {
    switch (suggestion.type) {
      case 'hashtag': return Hash;
      case 'user': return Users;
      case 'company': return Building2;
      default: return Search;
    }
  }, []);

  // Optimized clear input handler
  const handleClearInput = React.useCallback(() => {
    cancelSearch(); // Cancel any pending search
    setInputValue("");
    setIsOpen(false);
  }, [cancelSearch]);

  return (
    <div className={cn("relative w-full max-w-2xl", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search people, posts, companies, sparks..."
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsOpen(true)}
              className="pl-12 pr-12 h-12 text-base"
            />
            
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <Button variant="ghost" size="icon-sm" className="h-8 w-8">
                <Mic className="h-4 w-4" />
              </Button>
              {inputValue && (
                  <Button 
                    variant="ghost" 
                    size="icon-sm" 
                    className="h-8 w-8"
                    onClick={handleClearInput}
                  >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {(isSearching || isSearchPending) && (
              <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        </PopoverTrigger>

        <PopoverContent 
          className="w-full p-0 mt-2" 
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <div className="max-h-96 overflow-y-auto">
            {/* Quick Results Summary */}
            {query && totalResults.all > 0 && (
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Quick Results</span>
                  <Badge variant="secondary">{totalResults.all} total</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(totalResults).filter(([key, count]) => key !== 'all' && count > 0).map(([type, count]) => {
                    const Icon = resultTypeIcons[type as SearchResultType];
                    return (
                      <button
                        key={type}
                        onClick={() => handleSearch(query)}
                        className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent text-left"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{count} {type}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search Suggestions */}
            {inputValue && suggestions.length > 0 && (
              <div className="p-4">
                <div className="text-xs font-medium text-muted-foreground mb-3">
                  Suggestions
                </div>
                <div className="space-y-1">
                  {suggestions.slice(0, 5).map((suggestion, index) => {
                    const Icon = getSuggestionIcon(suggestion);
                    return (
                      <button
                        key={`${suggestion.type}-${index}`}
                        onClick={() => handleSearch(suggestion.text)}
                        className="w-full flex items-center space-x-3 p-2 rounded-md hover:bg-accent text-left animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{suggestion.text}</p>
                          {suggestion.category && (
                            <p className="text-xs text-muted-foreground">{suggestion.category}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Searches */}
            {!inputValue && recentSearches.length > 0 && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Recent Searches</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearRecentSearches}
                    className="text-xs h-auto p-1"
                  >
                    Clear
                  </Button>
                </div>
                <div className="space-y-1">
                  {recentSearches.slice(0, 5).map((recentSearch, index) => (
                    <button
                      key={`recent-${index}`}
                      onClick={() => handleSearch(recentSearch)}
                      className="w-full flex items-center space-x-3 p-2 rounded-md hover:bg-accent text-left"
                    >
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{recentSearch}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Topics */}
            {!inputValue && trendingTopics.length > 0 && (
              <>
                <Separator />
                <div className="p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Trending</span>
                  </div>
                  <div className="space-y-2">
                    {trendingTopics.slice(0, 5).map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => handleSearch(topic.hashtag)}
                        className="w-full flex items-center justify-between p-2 rounded-md hover:bg-accent text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{topic.hashtag}</p>
                            <p className="text-xs text-muted-foreground">
                              {topic.posts.toLocaleString()} posts
                            </p>
                          </div>
                        </div>
                        {topic.trending && (
                          <Badge variant="secondary" className="text-xs">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {topic.growth > 0 ? '+' : ''}{topic.growth}%
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* No Results */}
            {inputValue && suggestions.length === 0 && !isSearching && (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground">No suggestions found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Press Enter to search for "{inputValue}"
                </p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}, (prevProps, nextProps) => {
  // Shallow comparison for UniversalSearch props
  return prevProps.className === nextProps.className &&
         prevProps.onResultClick === nextProps.onResultClick;
});

UniversalSearch.displayName = "UniversalSearch";