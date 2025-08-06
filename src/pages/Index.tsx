import { useState } from 'react';
import { motion } from 'framer-motion';
import { ContentFeed } from '@/components/ui/content-feed';
import { AnalyticsDashboard } from '@/components/ui/analytics-dashboard';
import { EnhancedTabs, EnhancedTabsList, EnhancedTabsTrigger, EnhancedTabsContent } from '@/components/ui/enhanced-tabs';
import { BarChart3, Users, MessageSquare, Sparkles, TrendingUp, Zap } from 'lucide-react';

const Index = () => {
  const [activeTab, setActiveTab] = useState('feed');

  return (
    <div className="min-h-screen gradient-background">
      {/* Enhanced Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        {/* Floating Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-float"></div>
          <div className="absolute bottom-20 right-1/4 w-24 h-24 bg-accent/10 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-40 right-1/3 w-16 h-16 bg-primary/20 rounded-full blur-lg animate-float" style={{ animationDelay: '4s' }}></div>
        </div>
        
        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-elegant">Innovation Hub Platform</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold gradient-text-hero mb-6 text-hero">
              Transform Your
              <br />
              Professional Network
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto text-elegant leading-relaxed">
              Experience the future of professional networking with AI-powered insights, 
              beautiful design, and seamless collaboration tools.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="button-elegant px-8 py-4 rounded-xl font-semibold text-lg shadow-elegant hover:shadow-glow transition-all duration-300"
              >
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Explore Platform
                </span>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="button-glass px-8 py-4 rounded-xl font-semibold text-lg"
              >
                <span className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Get Started
                </span>
              </motion.div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-md mx-auto">
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <div className="text-2xl font-bold gradient-text">10K+</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </motion.div>
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <div className="text-2xl font-bold gradient-text">50M+</div>
                <div className="text-sm text-muted-foreground">Connections</div>
              </motion.div>
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <div className="text-2xl font-bold gradient-text">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <EnhancedTabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex justify-center mb-12">
                <div className="glass-card p-2 rounded-2xl">
                  <EnhancedTabsList variant="pills" className="bg-transparent">
                    <EnhancedTabsTrigger value="feed" variant="pills" className="transition-all duration-300 hover:shadow-glow">
                      <Users className="h-4 w-4" />
                      Content Feed
                    </EnhancedTabsTrigger>
                    <EnhancedTabsTrigger value="analytics" variant="pills" className="transition-all duration-300 hover:shadow-glow">
                      <BarChart3 className="h-4 w-4" />
                      Analytics
                    </EnhancedTabsTrigger>
                  </EnhancedTabsList>
                </div>
              </div>
              
              <EnhancedTabsContent value="feed" className="animate-fade-in">
                <ContentFeed />
              </EnhancedTabsContent>
              
              <EnhancedTabsContent value="analytics" className="animate-fade-in">
                <AnalyticsDashboard />
              </EnhancedTabsContent>
            </EnhancedTabs>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
