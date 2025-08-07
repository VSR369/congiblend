import { useState } from 'react';
import { AdaptiveContentFeed } from '@/components/ui/adaptive-content-feed';
import { AnalyticsDashboard } from '@/components/ui/analytics-dashboard';
import { EnhancedTabs, EnhancedTabsList, EnhancedTabsTrigger, EnhancedTabsContent } from '@/components/ui/enhanced-tabs';
import { BarChart3, Users, MessageSquare, Sparkles, TrendingUp, Zap, Plus, ArrowRight, Target } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { LeftSidebar } from '@/components/layout/LeftSidebar';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [activeTab, setActiveTab] = useState('feed');

  return (
    <div className="flex min-h-screen w-full bg-gradient-to-br from-white via-blue-50/30 to-gray-50/50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-blue-400/5" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl" />
      
      {/* Left Sidebar */}
      <LeftSidebar />

      {/* Main Content */}
      <div className="flex-1 relative">
          {/* Main Content Tabs - Start with Your Feed */}
          <section className="py-8 px-4">
            <div className="container mx-auto max-w-4xl">
              <div className="animate-fade-in">
              
                <EnhancedTabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="flex justify-center mb-8">
                    <div className="glass-card p-2 rounded-2xl">
                      <EnhancedTabsList variant="pills" className="bg-transparent">
                        <EnhancedTabsTrigger value="feed" variant="pills" className="transition-all duration-300 hover:shadow-glow">
                          <Users className="h-4 w-4" />
                          Your Feed
                        </EnhancedTabsTrigger>
                        <EnhancedTabsTrigger value="analytics" variant="pills" className="transition-all duration-300 hover:shadow-glow">
                          <BarChart3 className="h-4 w-4" />
                          Analytics
                        </EnhancedTabsTrigger>
                      </EnhancedTabsList>
                    </div>
                  </div>
                  
                  <EnhancedTabsContent value="feed" className="animate-fade-in">
                    <AdaptiveContentFeed />
                  </EnhancedTabsContent>
                  
                  <EnhancedTabsContent value="analytics" className="animate-fade-in">
                    <AnalyticsDashboard />
                  </EnhancedTabsContent>
                </EnhancedTabs>
              </div>
            </div>
        </section>
      </div>

      {/* Right Sidebar */}
      <div className="hidden xl:block flex-shrink-0">
        <RightSidebar />
      </div>
    </div>
  );
};

export default Index;
