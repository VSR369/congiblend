export interface SearchUser {
  id: string;
  name: string;
  username: string;
  title: string;
  company: string;
  location: string;
  avatar?: string;
  verified: boolean;
  connections: number;
  mutualConnections: number;
  skills: string[];
  industry: string;
}

export interface SearchPost {
  id: string;
  content: string;
  author: SearchUser;
  type: 'text' | 'image' | 'video' | 'article' | 'poll' | 'event';
  hashtags: string[];
  reactions: number;
  comments: number;
  createdAt: Date;
  media?: string[];
}

export interface SearchCompany {
  id: string;
  name: string;
  logo?: string;
  industry: string;
  size: string;
  location: string;
  followers: number;
  description: string;
  verified: boolean;
  jobOpenings: number;
}

export interface SearchJob {
  id: string;
  title: string;
  company: SearchCompany;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  remote: boolean;
  salary?: string;
  postedAt: Date;
  applicants: number;
  skills: string[];
}
export interface SearchSpark {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
}

export type SearchResultType = 'all' | 'people' | 'posts' | 'companies' | 'jobs' | 'sparks';

export interface SearchFilters {
  location?: string;
  industry?: string[];
  skills?: string[];
  connections?: 'first' | 'second' | 'third';
  dateRange?: 'day' | 'week' | 'month' | 'year';
  postType?: string[];
  companySize?: string[];
  jobType?: string[];
  salaryRange?: [number, number];
  remote?: boolean;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  alertEnabled: boolean;
  createdAt: Date;
  lastRun: Date;
  resultCount: number;
}

export interface SearchSuggestion {
  type: 'query' | 'user' | 'company' | 'hashtag' | 'skill';
  text: string;
  data?: any;
  category?: string;
}

export interface TrendingTopic {
  id: string;
  hashtag: string;
  posts: number;
  growth: number;
  category: string;
  trending: boolean;
}

export interface Recommendation {
  id: string;
  type: 'user' | 'post' | 'company' | 'job' | 'event';
  title: string;
  description: string;
  reason: string;
  data: any;
  score: number;
}