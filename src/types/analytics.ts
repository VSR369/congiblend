export interface UserAnalytics {
  profileViews: number;
  profileViewsChange: number;
  postViews: number;
  postViewsChange: number;
  engagementRate: number;
  engagementRateChange: number;
  followerGrowth: number;
  followerGrowthChange: number;
  connectionRequests: {
    sent: number;
    received: number;
    accepted: number;
    successRate: number;
  };
  searchAppearances: number;
  contentReach: number;
  impressions: number;
  clickThroughRate: number;
  timeSpentOnPlatform: number; // in minutes
}

export interface ContentAnalytics {
  postId: string;
  title: string;
  type: 'text' | 'image' | 'video' | 'article' | 'poll';
  publishedAt: string;
  likes: number;
  // comments: number; - removed, comments functionality not implemented
  shares: number;
  views: number;
  engagement: number;
  reach: number;
  impressions: number;
  clickThroughRate: number;
  hashtags: string[];
  performance: 'high' | 'medium' | 'low';
}

export interface AudienceInsights {
  demographics: {
    ageGroups: { range: string; percentage: number }[];
    genderDistribution: { gender: string; percentage: number }[];
    industries: { industry: string; percentage: number }[];
    jobLevels: { level: string; percentage: number }[];
  };
  geographic: {
    countries: { country: string; percentage: number; users: number }[];
    cities: { city: string; percentage: number; users: number }[];
  };
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  platforms: {
    web: number;
    ios: number;
    android: number;
  };
}

export interface BusinessAnalytics {
  companyPageViews: number;
  employeeAdvocacy: {
    activeEmployees: number;
    totalPosts: number;
    avgEngagement: number;
    reach: number;
  };
  recruitment: {
    jobPostings: number;
    applications: number;
    hires: number;
    conversionRate: number;
  };
  leadGeneration: {
    leads: number;
    qualifiedLeads: number;
    conversions: number;
    conversionRate: number;
  };
  events: {
    totalEvents: number;
    totalAttendees: number;
    avgAttendance: number;
    upcomingEvents: number;
  };
  brandMentions: {
    total: number;
    positive: number;
    neutral: number;
    negative: number;
    sentiment: number; // -1 to 1
  };
}

export interface TimeSeriesData {
  date: string;
  value: number;
  change?: number;
}

export interface ChartData {
  name: string;
  value: number;
  color?: string;
  percentage?: number;
}

export interface AnalyticsDateRange {
  start: Date;
  end: Date;
  preset: '7d' | '30d' | '90d' | '1y' | 'custom';
}

export interface AnalyticsDashboard {
  id: string;
  name: string;
  layout: DashboardWidget[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'map';
  title: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  config: {
    chartType?: 'line' | 'bar' | 'pie' | 'area' | 'funnel' | 'gauge';
    dataSource: string;
    filters?: Record<string, any>;
    timeRange?: AnalyticsDateRange;
  };
}

export interface PerformanceMetrics {
  kpi: string;
  current: number;
  target: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
  format: 'number' | 'percentage' | 'currency' | 'duration';
}

export interface CompetitorAnalytics {
  companyName: string;
  followers: number;
  followersChange: number;
  avgEngagement: number;
  postFrequency: number;
  topContent: ContentAnalytics[];
  marketShare: number;
}

export interface HashtagAnalytics {
  hashtag: string;
  usage: number;
  usageChange: number;
  reach: number;
  engagement: number;
  trendScore: number;
  relatedHashtags: string[];
}