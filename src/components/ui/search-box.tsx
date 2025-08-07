import * as React from "react"
import { Search, X, Clock, TrendingUp } from "lucide-react"
import { Input } from "./input"
import { Button } from "./button"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Badge } from "./badge"
import { Separator } from "./separator"
import { useDebounce } from "@/hooks/useDebounce"
import { cn } from "@/lib/utils"

export interface SearchResult {
  id: string
  title: string
  description?: string
  category?: string
  url?: string
  metadata?: Record<string, any>
}

export interface SearchBoxProps {
  placeholder?: string
  onSearch?: (query: string) => void
  onResultSelect?: (result: SearchResult) => void
  suggestions?: SearchResult[]
  recentSearches?: string[]
  popularSearches?: string[]
  loading?: boolean
  debounceMs?: number
  maxResults?: number
  showCategories?: boolean
  showRecent?: boolean
  showPopular?: boolean
  className?: string
}

export const SearchBox = React.memo(({
  placeholder = "Search...",
  onSearch,
  onResultSelect,
  suggestions = [],
  recentSearches = [],
  popularSearches = [],
  loading = false,
  debounceMs = 300,
  maxResults = 10,
  showCategories = true,
  showRecent = true,
  showPopular = true,
  className,
}: SearchBoxProps) => {
  // Performance monitoring
  const renderCountRef = React.useRef(0);
  const lastRenderTime = React.useRef(Date.now());
  
  React.useEffect(() => {
    renderCountRef.current++;
    const now = Date.now();
    console.log('🔍 SearchBox re-render:', {
      count: renderCountRef.current,
      timeSinceLastRender: now - lastRenderTime.current,
      suggestionsLength: suggestions.length,
      query: query.slice(0, 20),
      timestamp: now
    });
    lastRenderTime.current = now;
  });

  const [query, setQuery] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)
  const [storedRecent, setStoredRecent] = React.useState<string[]>(recentSearches)
  const debouncedQuery = useDebounce(query, debounceMs)

  React.useEffect(() => {
    if (debouncedQuery.trim() && onSearch) {
      console.log('🎯 SearchBox debounced search triggered:', debouncedQuery);
      onSearch(debouncedQuery.trim())
    }
  }, [debouncedQuery, onSearch])

  // Memoized functions for stable references
  const addToRecent = React.useCallback((searchQuery: string) => {
    console.log('📝 Adding to recent searches:', searchQuery);
    const updated = [searchQuery, ...storedRecent.filter(s => s !== searchQuery)].slice(0, 5)
    setStoredRecent(updated)
    // In a real app, you'd persist this to localStorage or a database
  }, [storedRecent])

  const removeFromRecent = React.useCallback((searchQuery: string) => {
    console.log('🗑️ Removing from recent searches:', searchQuery);
    setStoredRecent(prev => prev.filter(s => s !== searchQuery))
  }, [])

  const handleSearch = React.useCallback((searchQuery: string) => {
    console.log('🔍 Search executed:', searchQuery);
    if (searchQuery.trim()) {
      addToRecent(searchQuery.trim())
      onSearch?.(searchQuery.trim())
      setIsOpen(false)
    }
  }, [addToRecent, onSearch])

  const handleResultClick = React.useCallback((result: SearchResult) => {
    console.log('📋 Search result clicked:', result.title);
    setQuery(result.title)
    addToRecent(result.title)
    onResultSelect?.(result)
    setIsOpen(false)
  }, [addToRecent, onResultSelect])

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSearch(query)
    } else if (e.key === "Escape") {
      setIsOpen(false)
    }
  }, [handleSearch, query])

  // Memoized expensive calculations
  const filteredSuggestions = React.useMemo(() => {
    const start = performance.now();
    const result = suggestions.slice(0, maxResults);
    const end = performance.now();
    if (end - start > 1) {
      console.log('⚡ SearchBox suggestions filter took:', end - start, 'ms');
    }
    return result;
  }, [suggestions, maxResults]);

  const categories = React.useMemo(() => {
    if (!showCategories) return [];
    const start = performance.now();
    const result = [...new Set(filteredSuggestions.map(s => s.category).filter(Boolean))];
    const end = performance.now();
    if (end - start > 1) {
      console.log('⚡ SearchBox categories computation took:', end - start, 'ms');
    }
    return result;
  }, [showCategories, filteredSuggestions]);

  const hasContent = React.useMemo(() => 
    Boolean(query.trim()) || showRecent || showPopular,
    [query, showRecent, showPopular]
  );

  return (
    <div className={cn("relative w-full max-w-2xl", className)}>
      <Popover open={isOpen && hasContent} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setIsOpen(true)
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsOpen(true)}
              className="pl-10 pr-4"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="w-full p-0 mt-1" 
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <div className="max-h-96 overflow-y-auto">
            {/* Search Results */}
            {query.trim() && filteredSuggestions.length > 0 && (
              <div className="p-2">
                <div className="text-xs font-medium text-muted-foreground px-2 py-1 mb-2">
                  Search Results
                </div>
                {filteredSuggestions.map((result, index) => (
                  <div
                    key={result.id}
                    className="flex items-center space-x-3 px-2 py-2 rounded-md hover:bg-accent cursor-pointer group animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => handleResultClick(result)}
                  >
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.title}</p>
                      {result.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {result.description}
                        </p>
                      )}
                    </div>
                    {result.category && (
                      <Badge variant="secondary" className="text-xs">
                        {result.category}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Categories */}
            {query.trim() && showCategories && categories.length > 0 && (
              <>
                <Separator />
                <div className="p-2">
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1 mb-2">
                    Categories
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {categories.map((category) => (
                      <Badge
                        key={category}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => handleSearch(`category:${category}`)}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Recent Searches */}
            {!query.trim() && showRecent && storedRecent.length > 0 && (
              <div className="p-2">
                <div className="flex items-center justify-between px-2 py-1 mb-2">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Recent Searches
                    </span>
                  </div>
                </div>
                {storedRecent.map((recent) => (
                  <div
                    key={recent}
                    className="flex items-center justify-between px-2 py-2 rounded-md hover:bg-accent group"
                  >
                    <div
                      className="flex items-center space-x-3 flex-1 cursor-pointer"
                      onClick={() => {
                        setQuery(recent)
                        handleSearch(recent)
                      }}
                    >
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{recent}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFromRecent(recent)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Popular Searches */}
            {!query.trim() && showPopular && popularSearches.length > 0 && (
              <>
                {(showRecent && storedRecent.length > 0) && <Separator />}
                <div className="p-2">
                  <div className="flex items-center space-x-1 px-2 py-1 mb-2">
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Popular Searches
                    </span>
                  </div>
                  {popularSearches.map((popular) => (
                    <div
                      key={popular}
                      className="flex items-center space-x-3 px-2 py-2 rounded-md hover:bg-accent cursor-pointer"
                      onClick={() => {
                        setQuery(popular)
                        handleSearch(popular)
                      }}
                    >
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{popular}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* No Results */}
            {query.trim() && filteredSuggestions.length === 0 && !loading && (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground">No results found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your search terms
                </p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  const keysToCompare: (keyof SearchBoxProps)[] = [
    'suggestions', 'loading', 'placeholder', 'maxResults'
  ];
  
  return keysToCompare.every(key => {
    if (key === 'suggestions') {
      // Deep comparison for suggestions array
      return prevProps.suggestions?.length === nextProps.suggestions?.length &&
             prevProps.suggestions?.every((item, index) => 
               item.id === nextProps.suggestions?.[index]?.id
             );
    }
    return prevProps[key] === nextProps[key];
  });
});

SearchBox.displayName = "SearchBox";