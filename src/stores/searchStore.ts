import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  SearchUser, 
  SearchPost, 
  SearchCompany, 
  SearchJob,
  SearchResultType,
  SearchFilters,
  SavedSearch,
  SearchSuggestion,
  TrendingTopic,
  Recommendation
} from '@/types/search';

interface SearchState {
  // Search state
  query: string;
  activeTab: SearchResultType;
  filters: SearchFilters;
  isSearching: boolean;
  
  // Results
  users: SearchUser[];
  posts: SearchPost[];
  companies: SearchCompany[];
  jobs: SearchJob[];
  totalResults: { [K in SearchResultType]: number };
  
  // History and suggestions
  recentSearches: string[];
  savedSearches: SavedSearch[];
  suggestions: SearchSuggestion[];
  
  // Discovery
  trendingTopics: TrendingTopic[];
  recommendations: Recommendation[];
  
  // Actions
  setQuery: (query: string) => void;
  setActiveTab: (tab: SearchResultType) => void;
  updateFilters: (filters: Partial<SearchFilters>) => void;
  search: (query: string, tab?: SearchResultType) => Promise<void>;
  loadSuggestions: (query: string) => Promise<void>;
  saveSearch: (name: string) => void;
  deleteSavedSearch: (id: string) => void;
  clearRecentSearches: () => void;
  loadDiscovery: () => Promise<void>;
}

// Mock data generators
const generateMockUsers = (count: number): SearchUser[] => {
  const industries = ['Technology', 'Finance', 'Healthcare', 'Education', 'Marketing'];
  const skills = ['JavaScript', 'React', 'Python', 'Data Science', 'Design', 'Marketing', 'Sales'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i}`,
    name: `User ${i + 1}`,
    username: `user${i + 1}`,
    title: `Senior Developer`,
    company: `Company ${i + 1}`,
    location: 'San Francisco, CA',
    avatar: `https://images.unsplash.com/photo-${1500000000000 + i}?w=150&h=150&fit=crop&crop=face`,
    verified: Math.random() > 0.8,
    connections: Math.floor(Math.random() * 1000),
    mutualConnections: Math.floor(Math.random() * 50),
    skills: skills.slice(0, Math.floor(Math.random() * 4) + 2),
    industry: industries[Math.floor(Math.random() * industries.length)]
  }));
};

const generateMockPosts = (count: number): SearchPost[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `post-${i}`,
    content: `This is a sample post about technology and innovation. #tech #innovation`,
    author: generateMockUsers(1)[0],
    type: ['text', 'image', 'article'][Math.floor(Math.random() * 3)] as any,
    hashtags: ['#tech', '#innovation', '#startup'],
    reactions: Math.floor(Math.random() * 100),
    comments: Math.floor(Math.random() * 50),
    createdAt: new Date(Date.now() - Math.random() * 86400000 * 30)
  }));
};

const generateMockCompanies = (count: number): SearchCompany[] => {
  const industries = ['Technology', 'Finance', 'Healthcare', 'E-commerce', 'Consulting'];
  const sizes = ['1-10', '11-50', '51-200', '201-500', '500+'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `company-${i}`,
    name: `Company ${i + 1}`,
    logo: `https://images.unsplash.com/photo-${1600000000000 + i}?w=100&h=100&fit=crop`,
    industry: industries[Math.floor(Math.random() * industries.length)],
    size: sizes[Math.floor(Math.random() * sizes.length)],
    location: 'San Francisco, CA',
    followers: Math.floor(Math.random() * 10000),
    description: `Leading company in ${industries[0].toLowerCase()}`,
    verified: Math.random() > 0.7,
    jobOpenings: Math.floor(Math.random() * 20)
  }));
};

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      // Initial state
      query: '',
      activeTab: 'all',
      filters: {},
      isSearching: false,
      
      // Results
      users: [],
      posts: [],
      companies: [],
      jobs: [],
      totalResults: { all: 0, people: 0, posts: 0, companies: 0, jobs: 0 },
      
      // History and suggestions
      recentSearches: [],
      savedSearches: [],
      suggestions: [],
      
      // Discovery
      trendingTopics: [
        { id: '1', hashtag: '#ai', posts: 1247, growth: 15.2, category: 'Technology', trending: true },
        { id: '2', hashtag: '#sustainability', posts: 892, growth: 8.7, category: 'Environment', trending: true },
        { id: '3', hashtag: '#remotework', posts: 1543, growth: -2.1, category: 'Work', trending: false },
        { id: '4', hashtag: '#blockchain', posts: 673, growth: 12.4, category: 'Technology', trending: true },
        { id: '5', hashtag: '#leadership', posts: 2134, growth: 5.8, category: 'Business', trending: false }
      ],
      recommendations: [
        {
          id: '1',
          type: 'user',
          title: 'Sarah Johnson',
          description: 'Senior Product Manager at Google',
          reason: 'You have 12 mutual connections',
          data: { id: 'user-1' },
          score: 0.95
        },
        {
          id: '2',
          type: 'company',
          title: 'OpenAI',
          description: 'AI research and deployment company',
          reason: 'Based on your interest in AI and machine learning',
          data: { id: 'company-1' },
          score: 0.88
        }
      ],

      // Actions
      setQuery: (query: string) => {
        set({ query });
      },

      setActiveTab: (tab: SearchResultType) => {
        set({ activeTab: tab });
      },

      updateFilters: (newFilters: Partial<SearchFilters>) => {
        set(state => ({
          filters: { ...state.filters, ...newFilters }
        }));
      },

      search: async (query: string, tab?: SearchResultType) => {
        if (!query.trim()) return;
        
        set({ isSearching: true, query, activeTab: tab || get().activeTab });
        
        // Add to recent searches
        const recentSearches = get().recentSearches;
        const updatedRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
        
        try {
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Generate mock results
          const users = generateMockUsers(Math.floor(Math.random() * 20) + 5);
          const posts = generateMockPosts(Math.floor(Math.random() * 15) + 3);
          const companies = generateMockCompanies(Math.floor(Math.random() * 10) + 2);
          
          set({
            users,
            posts,
            companies,
            jobs: [],
            totalResults: {
              all: users.length + posts.length + companies.length,
              people: users.length,
              posts: posts.length,
              companies: companies.length,
              jobs: 0
            },
            recentSearches: updatedRecent,
            isSearching: false
          });
        } catch (error) {
          set({ isSearching: false });
        }
      },

      loadSuggestions: async (query: string) => {
        if (!query.trim()) {
          set({ suggestions: [] });
          return;
        }
        
        // Simulate API call for suggestions
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const suggestions: SearchSuggestion[] = [
          { type: 'query', text: `${query} jobs`, category: 'Jobs' },
          { type: 'query', text: `${query} companies`, category: 'Companies' },
          { type: 'hashtag', text: `#${query}`, category: 'Hashtags' },
          { type: 'skill', text: `${query} skills`, category: 'Skills' },
        ];
        
        set({ suggestions });
      },

      saveSearch: (name: string) => {
        const state = get();
        const savedSearch: SavedSearch = {
          id: Date.now().toString(),
          name,
          query: state.query,
          filters: state.filters,
          alertEnabled: false,
          createdAt: new Date(),
          lastRun: new Date(),
          resultCount: state.totalResults.all
        };
        
        set(state => ({
          savedSearches: [...state.savedSearches, savedSearch]
        }));
      },

      deleteSavedSearch: (id: string) => {
        set(state => ({
          savedSearches: state.savedSearches.filter(s => s.id !== id)
        }));
      },

      clearRecentSearches: () => {
        set({ recentSearches: [] });
      },

      loadDiscovery: async () => {
        // This would load personalized recommendations
        // For now, we use the static data above
      }
    }),
    {
      name: 'search-store',
      partialize: (state) => ({
        recentSearches: state.recentSearches,
        savedSearches: state.savedSearches,
        filters: state.filters
      })
    }
  )
);