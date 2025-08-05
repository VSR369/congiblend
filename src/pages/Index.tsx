import { useState } from 'react';
import { motion } from 'framer-motion';
import { ContentFeed } from '@/components/ui/content-feed';
import { AnalyticsDashboard } from '@/components/ui/analytics-dashboard';
import { EnhancedTabs, EnhancedTabsList, EnhancedTabsTrigger, EnhancedTabsContent } from '@/components/ui/enhanced-tabs';
import { BarChart3, Users, MessageSquare } from 'lucide-react';

const Index = () => {
  const [activeTab, setActiveTab] = useState('feed');

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Hero Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-4">
              Your Professional Network
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Connect, share, and engage with a sophisticated analytics-powered platform.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          <EnhancedTabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-center mb-8">
              <EnhancedTabsList variant="pills">
                <EnhancedTabsTrigger value="feed" variant="pills">
                  <Users className="h-4 w-4" />
                  Content Feed
                </EnhancedTabsTrigger>
                <EnhancedTabsTrigger value="analytics" variant="pills">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </EnhancedTabsTrigger>
              </EnhancedTabsList>
            </div>
            
            <EnhancedTabsContent value="feed">
              <ContentFeed />
            </EnhancedTabsContent>
            
            <EnhancedTabsContent value="analytics">
              <AnalyticsDashboard />
            </EnhancedTabsContent>
          </EnhancedTabs>
        </div>
      </section>
    </div>
  );
};

export default Index;
