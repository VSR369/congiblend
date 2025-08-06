import { useState } from 'react';
import { motion } from 'framer-motion';
import { ContentFeed } from '@/components/ui/content-feed';
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
          {/* Enhanced Hero Section */}
          <section className="relative py-16 px-4 overflow-hidden">
            {/* Floating Elements */}
            <motion.div
              className="absolute top-10 left-10 w-20 h-20 bg-primary/10 rounded-full blur-xl"
              animate={{
                y: [0, -20, 0],
                x: [0, 10, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute top-32 right-16 w-16 h-16 bg-primary/15 rounded-full blur-xl"
              animate={{
                y: [0, 20, 0],
                x: [0, -15, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            
            <div className="container mx-auto text-center relative z-10 max-w-4xl">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-elegant">Innovation Hub Platform</span>
                </div>
                
                <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                  <span className="gradient-text bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                    Transform Your
                  </span>
                  <br />
                  <span className="text-foreground">Professional Network</span>
                </h1>
                
                <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                  Experience the future of professional networking with AI-powered insights, 
                  beautiful design, and seamless collaboration tools.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                  <Button size="lg" className="elegant-button group px-8 py-3 text-lg">
                    <Plus className="mr-2 h-5 w-5" />
                    Start Creating
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button variant="ghost" size="lg" className="glass-button px-8 py-3 text-lg">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Explore Network
                  </Button>
                </div>
                
                {/* Compact Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                  {[
                    { icon: Users, value: "50K+", label: "Members", color: "text-blue-400" },
                    { icon: MessageSquare, value: "1M+", label: "Conversations", color: "text-green-400" },
                    { icon: Sparkles, value: "100K+", label: "Ideas", color: "text-purple-400" },
                    { icon: TrendingUp, value: "95%", label: "Success", color: "text-orange-400" },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      className="text-center p-4 glass-card rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-glow"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      whileHover={{ y: -5 }}
                    >
                      <stat.icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
                      <div className="text-xl font-bold text-foreground mb-1">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>

          {/* Main Content Tabs */}
          <section className="pb-20 px-4">
            <div className="container mx-auto max-w-4xl">
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

      {/* Right Sidebar */}
      <div className="hidden xl:block flex-shrink-0">
        <RightSidebar />
      </div>
    </div>
  );
};

export default Index;
