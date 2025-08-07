// Web Worker for heavy content processing
// This file will be loaded as a web worker

interface ProcessingTask {
  id: string;
  type: 'search' | 'filter' | 'hashtag' | 'analytics';
  data: any;
}

interface ProcessingResult {
  id: string;
  result: any;
  error?: string;
}

// Search processing
function processSearch(query: string, items: any[]): any[] {
  const lowerQuery = query.toLowerCase();
  const results = [];
  
  for (const item of items) {
    let score = 0;
    
    // Title/content matching
    if (item.content?.toLowerCase().includes(lowerQuery)) {
      score += 10;
    }
    
    // Hashtag matching
    if (item.hashtags?.some((tag: string) => 
      tag.toLowerCase().includes(lowerQuery))) {
      score += 8;
    }
    
    // Author matching
    if (item.author?.name?.toLowerCase().includes(lowerQuery)) {
      score += 6;
    }
    
    // Fuzzy matching for typos
    const words = lowerQuery.split(' ');
    for (const word of words) {
      if (item.content?.toLowerCase().includes(word)) {
        score += 2;
      }
    }
    
    if (score > 0) {
      results.push({ ...item, searchScore: score });
    }
  }
  
  // Sort by relevance score
  return results.sort((a, b) => b.searchScore - a.searchScore);
}

// Filter processing
function processFilter(items: any[], filters: any): any[] {
  return items.filter(item => {
    // Content type filter
    if (filters.contentTypes?.length > 0 && 
        !filters.contentTypes.includes(item.type)) {
      return false;
    }
    
    // Time range filter
    if (filters.timeRange && filters.timeRange !== 'all') {
      const itemDate = new Date(item.createdAt);
      const now = new Date();
      
      switch (filters.timeRange) {
        case 'recent':
          return now.getTime() - itemDate.getTime() < 24 * 60 * 60 * 1000;
        case 'week':
          return now.getTime() - itemDate.getTime() < 7 * 24 * 60 * 60 * 1000;
        case 'month':
          return now.getTime() - itemDate.getTime() < 30 * 24 * 60 * 60 * 1000;
      }
    }
    
    return true;
  });
}

// Hashtag extraction and processing
function extractHashtags(content: string): string[] {
  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
  const matches = content.match(hashtagRegex) || [];
  return [...new Set(matches.map(tag => tag.toLowerCase()))];
}

// Analytics calculation
function calculateAnalytics(posts: any[]): any {
  const analytics = {
    totalPosts: posts.length,
    totalReactions: 0,
    totalShares: 0,
    avgEngagement: 0,
    topHashtags: {},
    contentTypeDistribution: {},
    timeDistribution: {}
  };
  
  const hashtagCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  const timeCounts: Record<string, number> = {};
  
  for (const post of posts) {
    // Count reactions and shares
    analytics.totalReactions += post.reactions?.length || 0;
    analytics.totalShares += post.shares || 0;
    
    // Process hashtags
    const hashtags = extractHashtags(post.content || '');
    for (const tag of hashtags) {
      hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
    }
    
    // Count content types
    typeCounts[post.type] = (typeCounts[post.type] || 0) + 1;
    
    // Time distribution (by hour)
    const hour = new Date(post.createdAt).getHours();
    timeCounts[hour] = (timeCounts[hour] || 0) + 1;
  }
  
  // Calculate averages
  if (posts.length > 0) {
    analytics.avgEngagement = 
      (analytics.totalReactions + analytics.totalShares) / posts.length;
  }
  
  // Top hashtags
  analytics.topHashtags = Object.entries(hashtagCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .reduce((acc, [tag, count]) => ({ ...acc, [tag]: count }), {});
  
  analytics.contentTypeDistribution = typeCounts;
  analytics.timeDistribution = timeCounts;
  
  return analytics;
}

// Message handler
self.onmessage = function(e: MessageEvent<ProcessingTask>) {
  const { id, type, data } = e.data;
  
  try {
    let result: any;
    
    switch (type) {
      case 'search':
        result = processSearch(data.query, data.items);
        break;
      case 'filter':
        result = processFilter(data.items, data.filters);
        break;
      case 'hashtag':
        result = extractHashtags(data.content);
        break;
      case 'analytics':
        result = calculateAnalytics(data.posts);
        break;
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    
    self.postMessage({ id, result } as ProcessingResult);
  } catch (error) {
    self.postMessage({ 
      id, 
      result: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    } as ProcessingResult);
  }
};

export {};