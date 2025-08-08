import { create } from 'zustand';
import {
  UserAnalytics,
  ContentAnalytics,
  AudienceInsights,
  BusinessAnalytics,
  TimeSeriesData,
  AnalyticsDateRange,
  AnalyticsDashboard,
  PerformanceMetrics,
  CompetitorAnalytics,
  HashtagAnalytics,
} from '@/types/analytics';

interface AnalyticsState {
  // Data
  userAnalytics: UserAnalytics | null;
  contentAnalytics: ContentAnalytics[];
  audienceInsights: AudienceInsights | null;
  businessAnalytics: BusinessAnalytics | null;
  performanceMetrics: PerformanceMetrics[];
  competitorAnalytics: CompetitorAnalytics[];
  hashtagAnalytics: HashtagAnalytics[];
  timeSeriesData: Record<string, TimeSeriesData[]>;
  
  // UI State
  loading: boolean;
  selectedDateRange: AnalyticsDateRange;
  activeDashboard: AnalyticsDashboard | null;
  dashboards: AnalyticsDashboard[];
  
  // Actions
  loadUserAnalytics: () => Promise<void>;
  loadContentAnalytics: () => Promise<void>;
  loadAudienceInsights: () => Promise<void>;
  loadBusinessAnalytics: () => Promise<void>;
  loadPerformanceMetrics: () => Promise<void>;
  loadCompetitorAnalytics: () => Promise<void>;
  loadHashtagAnalytics: () => Promise<void>;
  setDateRange: (range: AnalyticsDateRange) => void;
  exportData: (format: 'pdf' | 'csv') => Promise<void>;
  createDashboard: (dashboard: Omit<AnalyticsDashboard, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDashboard: (id: string, updates: Partial<AnalyticsDashboard>) => void;
  setActiveDashboard: (dashboard: AnalyticsDashboard) => void;
}

// Mock data generators
const generateUserAnalytics = (): UserAnalytics => ({
  profileViews: 1247,
  profileViewsChange: 12.5,
  postViews: 8934,
  postViewsChange: -3.2,
  engagementRate: 4.7,
  engagementRateChange: 0.8,
  followerGrowth: 156,
  followerGrowthChange: 23.1,
  connectionRequests: {
    sent: 45,
    received: 89,
    accepted: 67,
    successRate: 75.3,
  },
  searchAppearances: 234,
  contentReach: 12456,
  impressions: 45678,
  clickThroughRate: 2.3,
  timeSpentOnPlatform: 127,
});

const generateContentAnalytics = (): ContentAnalytics[] => [
  {
    postId: '1',
    title: 'The Future of Remote Work',
    type: 'article',
    publishedAt: '2024-01-15',
    likes: 234,
    // comments: 45, - removed
    shares: 67,
    views: 1234,
    engagement: 5.2,
    reach: 2345,
    impressions: 3456,
    clickThroughRate: 3.4,
    hashtags: ['#remotework', '#future', '#productivity'],
    performance: 'high',
  },
  {
    postId: '2',
    title: 'Team Building Activities',
    type: 'image',
    publishedAt: '2024-01-14',
      likes: 89,
    // comments: 12, - removed
    shares: 23,
    views: 567,
    engagement: 3.1,
    reach: 789,
    impressions: 1234,
    clickThroughRate: 2.1,
    hashtags: ['#teambuilding', '#culture', '#workplace'],
    performance: 'medium',
  },
  {
    postId: '3',
    title: 'Quick productivity tip',
    type: 'text',
    publishedAt: '2024-01-13',
    likes: 45,
    // comments: 8, - removed
    shares: 12,
    views: 234,
    engagement: 2.3,
    reach: 345,
    impressions: 567,
    clickThroughRate: 1.8,
    hashtags: ['#productivity', '#tips'],
    performance: 'low',
  },
];

const generateAudienceInsights = (): AudienceInsights => ({
  demographics: {
    ageGroups: [
      { range: '18-24', percentage: 15 },
      { range: '25-34', percentage: 35 },
      { range: '35-44', percentage: 30 },
      { range: '45-54', percentage: 15 },
      { range: '55+', percentage: 5 },
    ],
    genderDistribution: [
      { gender: 'Male', percentage: 52 },
      { gender: 'Female', percentage: 46 },
      { gender: 'Other', percentage: 2 },
    ],
    industries: [
      { industry: 'Technology', percentage: 35 },
      { industry: 'Finance', percentage: 20 },
      { industry: 'Healthcare', percentage: 15 },
      { industry: 'Education', percentage: 12 },
      { industry: 'Marketing', percentage: 10 },
      { industry: 'Other', percentage: 8 },
    ],
    jobLevels: [
      { level: 'Entry Level', percentage: 25 },
      { level: 'Mid Level', percentage: 40 },
      { level: 'Senior Level', percentage: 25 },
      { level: 'Executive', percentage: 10 },
    ],
  },
  geographic: {
    countries: [
      { country: 'United States', percentage: 45, users: 4500 },
      { country: 'United Kingdom', percentage: 15, users: 1500 },
      { country: 'Canada', percentage: 12, users: 1200 },
      { country: 'Germany', percentage: 10, users: 1000 },
      { country: 'France', percentage: 8, users: 800 },
      { country: 'Other', percentage: 10, users: 1000 },
    ],
    cities: [
      { city: 'New York', percentage: 12, users: 1200 },
      { city: 'London', percentage: 8, users: 800 },
      { city: 'San Francisco', percentage: 7, users: 700 },
      { city: 'Toronto', percentage: 6, users: 600 },
      { city: 'Berlin', percentage: 5, users: 500 },
    ],
  },
  devices: {
    desktop: 60,
    mobile: 35,
    tablet: 5,
  },
  platforms: {
    web: 65,
    ios: 20,
    android: 15,
  },
});

const generateBusinessAnalytics = (): BusinessAnalytics => ({
  companyPageViews: 12456,
  employeeAdvocacy: {
    activeEmployees: 45,
    totalPosts: 234,
    avgEngagement: 4.2,
    reach: 23456,
  },
  recruitment: {
    jobPostings: 12,
    applications: 234,
    hires: 8,
    conversionRate: 3.4,
  },
  leadGeneration: {
    leads: 156,
    qualifiedLeads: 89,
    conversions: 23,
    conversionRate: 14.7,
  },
  events: {
    totalEvents: 8,
    totalAttendees: 456,
    avgAttendance: 57,
    upcomingEvents: 3,
  },
  brandMentions: {
    total: 234,
    positive: 156,
    neutral: 67,
    negative: 11,
    sentiment: 0.62,
  },
});

const generateTimeSeriesData = (): Record<string, TimeSeriesData[]> => {
  const generateSeries = (baseValue: number, days: number) => {
    const data: TimeSeriesData[] = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const value = baseValue + Math.random() * baseValue * 0.3 - baseValue * 0.15;
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(value),
        change: i === 0 ? 0 : Math.random() * 20 - 10,
      });
    }
    return data;
  };

  return {
    profileViews: generateSeries(100, 30),
    postViews: generateSeries(500, 30),
    engagement: generateSeries(50, 30),
    followers: generateSeries(1000, 30),
    impressions: generateSeries(2000, 30),
  };
};

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  // Initial state
  userAnalytics: null,
  contentAnalytics: [],
  audienceInsights: null,
  businessAnalytics: null,
  performanceMetrics: [],
  competitorAnalytics: [],
  hashtagAnalytics: [],
  timeSeriesData: {},
  loading: false,
  selectedDateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
    preset: '30d',
  },
  activeDashboard: null,
  dashboards: [],

  // Actions
  loadUserAnalytics: async () => {
    set({ loading: true });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      set({ userAnalytics: generateUserAnalytics() });
    } finally {
      set({ loading: false });
    }
  },

  loadContentAnalytics: async () => {
    set({ loading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      set({ contentAnalytics: generateContentAnalytics() });
    } finally {
      set({ loading: false });
    }
  },

  loadAudienceInsights: async () => {
    set({ loading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      set({ audienceInsights: generateAudienceInsights() });
    } finally {
      set({ loading: false });
    }
  },

  loadBusinessAnalytics: async () => {
    set({ loading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 900));
      set({ businessAnalytics: generateBusinessAnalytics() });
    } finally {
      set({ loading: false });
    }
  },

  loadPerformanceMetrics: async () => {
    set({ loading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      const metrics: PerformanceMetrics[] = [
        {
          kpi: 'Engagement Rate',
          current: 4.7,
          target: 5.0,
          change: 0.8,
          trend: 'up',
          unit: '%',
          format: 'percentage',
        },
        {
          kpi: 'Follower Growth',
          current: 156,
          target: 200,
          change: 23.1,
          trend: 'up',
          unit: '',
          format: 'number',
        },
        {
          kpi: 'Content Reach',
          current: 12456,
          target: 15000,
          change: -3.2,
          trend: 'down',
          unit: '',
          format: 'number',
        },
        {
          kpi: 'Response Time',
          current: 2.3,
          target: 2.0,
          change: -0.5,
          trend: 'up',
          unit: 'hours',
          format: 'duration',
        },
      ];
      set({ performanceMetrics: metrics });
    } finally {
      set({ loading: false });
    }
  },

  loadCompetitorAnalytics: async () => {
    set({ loading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const competitors: CompetitorAnalytics[] = [
        {
          companyName: 'TechCorp Inc.',
          followers: 25000,
          followersChange: 8.5,
          avgEngagement: 3.2,
          postFrequency: 5,
          topContent: generateContentAnalytics().slice(0, 2),
          marketShare: 15.7,
        },
        {
          companyName: 'Innovation Labs',
          followers: 18500,
          followersChange: 12.3,
          avgEngagement: 4.1,
          postFrequency: 7,
          topContent: generateContentAnalytics().slice(1, 3),
          marketShare: 12.4,
        },
      ];
      set({ competitorAnalytics: competitors });
    } finally {
      set({ loading: false });
    }
  },

  loadHashtagAnalytics: async () => {
    set({ loading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 700));
      const hashtags: HashtagAnalytics[] = [
        {
          hashtag: '#remotework',
          usage: 1245,
          usageChange: 23.5,
          reach: 45678,
          engagement: 4.2,
          trendScore: 8.7,
          relatedHashtags: ['#workfromhome', '#digital', '#productivity'],
        },
        {
          hashtag: '#productivity',
          usage: 987,
          usageChange: 15.2,
          reach: 34567,
          engagement: 3.8,
          trendScore: 7.3,
          relatedHashtags: ['#efficiency', '#tips', '#workflow'],
        },
      ];
      set({ hashtagAnalytics: hashtags, timeSeriesData: generateTimeSeriesData() });
    } finally {
      set({ loading: false });
    }
  },

  setDateRange: (range) => {
    set({ selectedDateRange: range });
    // Reload data based on new date range
    const { loadUserAnalytics, loadContentAnalytics } = get();
    loadUserAnalytics();
    loadContentAnalytics();
  },

  exportData: async (format) => {
    set({ loading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Simulate export process
      console.log(`Exporting data as ${format}...`);
    } finally {
      set({ loading: false });
    }
  },

  createDashboard: (dashboard) => {
    const newDashboard: AnalyticsDashboard = {
      ...dashboard,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set(state => ({
      dashboards: [...state.dashboards, newDashboard],
    }));
  },

  updateDashboard: (id, updates) => {
    set(state => ({
      dashboards: state.dashboards.map(dashboard =>
        dashboard.id === id
          ? { ...dashboard, ...updates, updatedAt: new Date().toISOString() }
          : dashboard
      ),
    }));
  },

  setActiveDashboard: (dashboard) => {
    set({ activeDashboard: dashboard });
  },
}));