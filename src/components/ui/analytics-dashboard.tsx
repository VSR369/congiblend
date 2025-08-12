import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Eye, 
  Heart, 
  Share2,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  description?: string;
}

const MetricCard = ({ title, value, change, trend, icon, description }: MetricCardProps) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <ArrowUpRight className="h-4 w-4 text-accent" />;
      case 'down':
        return <ArrowDownRight className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-accent';
      case 'down':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-4 w-4 text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={cn("flex items-center text-xs", getTrendColor())}>
            {getTrendIcon()}
            <span className="ml-1">
              {change > 0 ? '+' : ''}{change}%
            </span>
            {description && (
              <span className="ml-1 text-muted-foreground">
                {description}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface DateRangePickerProps {
  value: string;
  onValueChange: (value: string) => void;
}

const DateRangePicker = ({ value, onValueChange }: DateRangePickerProps) => (
  <Select value={value} onValueChange={onValueChange}>
    <SelectTrigger className="w-[180px]">
      <Calendar className="h-4 w-4 mr-2" />
      <SelectValue placeholder="Select range" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="7d">Last 7 days</SelectItem>
      <SelectItem value="30d">Last 30 days</SelectItem>
      <SelectItem value="90d">Last 3 months</SelectItem>
      <SelectItem value="1y">Last year</SelectItem>
      <SelectItem value="custom">Custom range</SelectItem>
    </SelectContent>
  </Select>
);

export const AnalyticsDashboard = () => {
  const {
    userAnalytics,
    contentAnalytics,
    audienceInsights,
    businessAnalytics,
    performanceMetrics,
    timeSeriesData,
    loading,
    selectedDateRange,
    setDateRange,
    loadUserAnalytics,
    loadContentAnalytics,
    loadAudienceInsights,
    loadBusinessAnalytics,
    loadPerformanceMetrics,
    exportData,
  } = useAnalyticsStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRangeValue] = useState<'7d' | '30d' | '90d' | '1y' | 'custom'>(selectedDateRange.preset);

  useEffect(() => {
    // Load all analytics data on mount
    loadUserAnalytics();
    loadContentAnalytics();
    loadAudienceInsights();
    loadBusinessAnalytics();
    loadPerformanceMetrics();
  }, []);

  const handleDateRangeChange = (value: string) => {
    setDateRangeValue(value as '7d' | '30d' | '90d' | '1y' | 'custom');
    const now = new Date();
    let start = new Date();

    switch (value) {
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }

    setDateRange({
      start,
      end: now,
      preset: value as '7d' | '30d' | '90d' | '1y' | 'custom',
    });
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    await exportData(format);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onValueChange={handleDateRangeChange} />
          <Button variant="outline" size="sm" onClick={() => {}}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Profile Views"
              value={userAnalytics?.profileViews.toLocaleString() || '0'}
              change={userAnalytics?.profileViewsChange}
              trend={userAnalytics && userAnalytics.profileViewsChange > 0 ? 'up' : 'down'}
              icon={<Eye className="h-4 w-4" />}
              description="from last period"
            />
            <MetricCard
              title="Post Views"
              value={userAnalytics?.postViews.toLocaleString() || '0'}
              change={userAnalytics?.postViewsChange}
              trend={userAnalytics && userAnalytics.postViewsChange > 0 ? 'up' : 'down'}
              icon={<BarChart3 className="h-4 w-4" />}
              description="from last period"
            />
            <MetricCard
              title="Engagement Rate"
              value={`${userAnalytics?.engagementRate || 0}%`}
              change={userAnalytics?.engagementRateChange}
              trend={userAnalytics && userAnalytics.engagementRateChange > 0 ? 'up' : 'down'}
              icon={<Heart className="h-4 w-4" />}
              description="from last period"
            />
            <MetricCard
              title="Follower Growth"
              value={userAnalytics?.followerGrowth.toLocaleString() || '0'}
              change={userAnalytics?.followerGrowthChange}
              trend={userAnalytics && userAnalytics.followerGrowthChange > 0 ? 'up' : 'down'}
              icon={<Users className="h-4 w-4" />}
              description="new followers"
            />
          </div>

          {/* Performance Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Engagement Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Engagement Trends</CardTitle>
                <CardDescription>
                  Daily engagement metrics over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={timeSeriesData.engagement || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Goals</CardTitle>
                <CardDescription>
                  Current performance vs targets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {performanceMetrics.map((metric, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{metric.kpi}</span>
                      <span className="text-muted-foreground">
                        {metric.current}{metric.unit} / {metric.target}{metric.unit}
                      </span>
                    </div>
                    <Progress 
                      value={(metric.current / metric.target) * 100} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Goal: {metric.target}{metric.unit}</span>
                      <span className={cn(
                        "flex items-center",
                        metric.change > 0 ? "text-accent" : "text-destructive"
                      )}>
                        {metric.change > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {metric.change > 0 ? '+' : ''}{metric.change}%
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Content */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Posts</CardTitle>
                <CardDescription>
                  Your best content by engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contentAnalytics.map((content, index) => (
                    <div key={content.postId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={content.performance === 'high' ? 'default' : content.performance === 'medium' ? 'secondary' : 'outline'}>
                            {content.performance}
                          </Badge>
                          <Badge variant="outline">
                            {content.type}
                          </Badge>
                        </div>
                        <p className="font-medium truncate mt-1">{content.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {content.likes} likes • {content.shares} shares
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{content.engagement}%</p>
                        <p className="text-xs text-muted-foreground">engagement</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Content Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Content Type Performance</CardTitle>
                <CardDescription>
                  Engagement by content type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { type: 'Article', engagement: 5.2, posts: 15 },
                    { type: 'Image', engagement: 3.1, posts: 45 },
                    { type: 'Video', engagement: 6.8, posts: 8 },
                    { type: 'Text', engagement: 2.3, posts: 67 },
                    { type: 'Events', engagement: 4.5, posts: 12 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="engagement" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audience Tab */}
        <TabsContent value="audience" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Demographics */}
            <Card>
              <CardHeader>
                <CardTitle>Age Demographics</CardTitle>
                <CardDescription>
                  Audience breakdown by age group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={audienceInsights?.demographics.ageGroups || []}
                      dataKey="percentage"
                      nameKey="range"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {(audienceInsights?.demographics.ageGroups || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Geographic Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Geographic Reach</CardTitle>
                <CardDescription>
                  Top countries by audience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {audienceInsights?.geographic.countries.slice(0, 5).map((country, index) => (
                    <div key={country.country} className="flex items-center justify-between">
                      <span className="font-medium">{country.country}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={country.percentage} className="w-20 h-2" />
                        <span className="text-sm font-medium min-w-0">{country.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Industry Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Industry Breakdown</CardTitle>
                <CardDescription>
                  Audience by industry sector
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={audienceInsights?.demographics.industries || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="industry" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="percentage" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Device Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Device Usage</CardTitle>
                <CardDescription>
                  How your audience accesses content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Desktop</span>
                    <span className="text-sm">{audienceInsights?.devices.desktop}%</span>
                  </div>
                  <Progress value={audienceInsights?.devices.desktop || 0} className="h-2" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Mobile</span>
                    <span className="text-sm">{audienceInsights?.devices.mobile}%</span>
                  </div>
                  <Progress value={audienceInsights?.devices.mobile || 0} className="h-2" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Tablet</span>
                    <span className="text-sm">{audienceInsights?.devices.tablet}%</span>
                  </div>
                  <Progress value={audienceInsights?.devices.tablet || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Business Tab */}
        <TabsContent value="business" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Company Performance</CardTitle>
                <CardDescription>
                  Key business metrics overview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold">{businessAnalytics?.companyPageViews.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Page Views</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{businessAnalytics?.employeeAdvocacy.activeEmployees}</p>
                    <p className="text-sm text-muted-foreground">Active Employees</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="font-medium mb-2">Employee Advocacy</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Posts</span>
                      <span>{businessAnalytics?.employeeAdvocacy.totalPosts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Engagement</span>
                      <span>{businessAnalytics?.employeeAdvocacy.avgEngagement}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Reach</span>
                      <span>{businessAnalytics?.employeeAdvocacy.reach.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recruitment Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>Recruitment Metrics</CardTitle>
                <CardDescription>
                  Hiring funnel performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { stage: 'Job Posts', value: businessAnalytics?.recruitment.jobPostings || 0 },
                    { stage: 'Applications', value: businessAnalytics?.recruitment.applications || 0 },
                    { stage: 'Hires', value: businessAnalytics?.recruitment.hires || 0 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Conversion Rate: <span className="font-medium">{businessAnalytics?.recruitment.conversionRate}%</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Brand Sentiment */}
            <Card>
              <CardHeader>
                <CardTitle>Brand Mentions</CardTitle>
                <CardDescription>
                  Sentiment analysis of brand mentions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Positive', value: businessAnalytics?.brandMentions.positive || 0 },
                        { name: 'Neutral', value: businessAnalytics?.brandMentions.neutral || 0 },
                        { name: 'Negative', value: businessAnalytics?.brandMentions.negative || 0 },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      <Cell fill="hsl(var(--chart-2))" />
                      <Cell fill="hsl(var(--muted))" />
                      <Cell fill="hsl(var(--destructive))" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Overall Sentiment: <span className="font-medium">
                      {((businessAnalytics?.brandMentions.sentiment || 0) * 100).toFixed(1)}%
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Lead Generation */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Generation</CardTitle>
                <CardDescription>
                  Lead funnel and conversion metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{businessAnalytics?.leadGeneration.leads}</p>
                    <p className="text-xs text-muted-foreground">Total Leads</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{businessAnalytics?.leadGeneration.qualifiedLeads}</p>
                    <p className="text-xs text-muted-foreground">Qualified</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{businessAnalytics?.leadGeneration.conversions}</p>
                    <p className="text-xs text-muted-foreground">Conversions</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Conversion Rate</span>
                    <span className="font-medium">{businessAnalytics?.leadGeneration.conversionRate}%</span>
                  </div>
                  <Progress value={businessAnalytics?.leadGeneration.conversionRate || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};