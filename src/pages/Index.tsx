import { useState } from 'react';
import { AdaptiveContentFeed } from '@/components/ui/adaptive-content-feed';
import { AnalyticsDashboard } from '@/components/ui/analytics-dashboard';
import { EnhancedTabs, EnhancedTabsList, EnhancedTabsTrigger, EnhancedTabsContent } from '@/components/ui/enhanced-tabs';
import { BarChart3, Users, MessageSquare, Sparkles, TrendingUp, Zap, Plus, ArrowRight, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [activeTab, setActiveTab] = useState('feed');

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-background via-muted/40 to-muted/60 overflow-hidden">
      {/* Background Elements */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" aria-hidden="true" />
      <div className="pointer-events-none absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" aria-hidden="true" />
      
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

    </div>
  );
};

export default Index;
