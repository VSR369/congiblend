import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Hash,
  Users,
  ExternalLink,
  Plus,
  ChevronRight,
  Sparkles,
  MessageSquare,
  Heart
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const trendingTopics = [
  { name: '#ProductLaunch', posts: 234, growth: '+12%' },
  { name: '#RemoteWork', posts: 189, growth: '+8%' },
  { name: '#Innovation', posts: 156, growth: '+15%' },
  { name: '#StartupLife', posts: 134, growth: '+6%' },
  { name: '#TechTrends', posts: 98, growth: '+22%' },
];

const suggestedConnections = [
  { name: 'Sarah Johnson', title: 'UX Designer at Google', avatar: '/placeholder.svg' },
  { name: 'Mike Chen', title: 'Frontend Developer', avatar: '/placeholder.svg' },
  { name: 'Lisa Wang', title: 'Product Manager at Meta', avatar: '/placeholder.svg' },
];

const recentActivity = [
  { type: 'like', user: 'Alex Smith', action: 'liked your post', time: '2m ago' },
  { type: 'comment', user: 'Emma Davis', action: 'commented on your post', time: '5m ago' },
  { type: 'follow', user: 'David Brown', action: 'started following you', time: '1h ago' },
];

export const RightSidebar = () => {
  return (
    <div className="w-80 h-screen overflow-y-auto p-4 space-y-6">
      {/* Trending Topics */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-card p-4 rounded-xl border border-white/10"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center">
            <TrendingUp className="h-4 w-4 mr-2 text-primary" />
            Trending Topics
          </h3>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="space-y-3">
          {trendingTopics.map((topic, index) => (
            <div
              key={topic.name}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center space-x-2">
                <Hash className="h-3 w-3 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{topic.name}</p>
                  <p className="text-xs text-muted-foreground">{topic.posts} posts</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                {topic.growth}
              </Badge>
            </div>
          ))}
        </div>
        
        <Button variant="ghost" className="w-full mt-3 text-xs text-muted-foreground hover:text-primary">
          View all trends
        </Button>
      </motion.div>

      {/* Suggested Connections */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="glass-card p-4 rounded-xl border border-white/10"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center">
            <Users className="h-4 w-4 mr-2 text-primary" />
            Suggested
          </h3>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="space-y-3">
          {suggestedConnections.map((person, index) => (
            <div
              key={person.name}
              className="flex items-center justify-between animate-fade-in"
              style={{ animationDelay: `${100 + index * 50}ms` }}
            >
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8 border border-white/20">
                  <AvatarImage src={person.avatar} />
                  <AvatarFallback className="bg-gradient-primary text-white text-xs">
                    {person.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {person.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {person.title}
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 px-2 text-xs border-primary/20 hover:bg-primary/10 hover:text-primary"
              >
                <Plus className="h-3 w-3 mr-1" />
                Follow
              </Button>
            </div>
          ))}
        </div>
        
        <Button variant="ghost" className="w-full mt-3 text-xs text-muted-foreground hover:text-primary">
          See more suggestions
        </Button>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="glass-card p-4 rounded-xl border border-white/10"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center">
            <Sparkles className="h-4 w-4 mr-2 text-primary" />
            Recent Activity
          </h3>
        </div>
        
        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <div
              key={index}
              className="flex items-start space-x-3 p-2 rounded-lg hover:bg-white/5 transition-colors animate-fade-in"
              style={{ animationDelay: `${200 + index * 50}ms` }}
            >
              <div className="flex-shrink-0 mt-0.5">
                {activity.type === 'like' && <Heart className="h-3 w-3 text-red-400" />}
                {activity.type === 'comment' && <MessageSquare className="h-3 w-3 text-blue-400" />}
                {activity.type === 'follow' && <Users className="h-3 w-3 text-green-400" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-foreground">
                  <span className="font-medium">{activity.user}</span>{' '}
                  <span className="text-muted-foreground">{activity.action}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
        
        <Button variant="ghost" className="w-full mt-3 text-xs text-muted-foreground hover:text-primary">
          View all activity
        </Button>
      </motion.div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="glass-card p-4 rounded-xl border border-white/10"
      >
        <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
        
        <div className="space-y-2">
          {['Help Center', 'Privacy Policy', 'Terms of Service', 'About Us'].map((link, index) => (
            <div
              key={link}
              className="animate-fade-in"
              style={{ animationDelay: `${300 + index * 25}ms` }}
            >
              <Button 
                variant="ghost" 
                className="w-full justify-between h-8 px-2 text-xs text-muted-foreground hover:text-primary"
              >
                {link}
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};