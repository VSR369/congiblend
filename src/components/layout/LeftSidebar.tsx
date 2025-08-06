import React from 'react';
import { motion } from 'framer-motion';
import { 
  Home, 
  Users, 
  BarChart3, 
  User, 
  Settings, 
  Plus,
  MessageCircle,
  Eye,
  FileText,
  TrendingUp
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { UserStatsCard } from '@/components/ui/user-stats-card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const navigationItems = [
  { title: 'Mission Control', url: '/', icon: Home },
  { title: 'Articles', url: '/articles', icon: FileText },
  { title: 'Messages', url: '/messages', icon: MessageCircle },
];

export const LeftSidebar = () => {
  const location = useLocation();

  return (
    <div className="w-80 h-screen overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-white to-blue-50/30">
      {/* User Stats Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <UserStatsCard />
      </motion.div>

      {/* Navigation Menu */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2"
      >
        {navigationItems.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link 
              to={item.url}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 
                ${location.pathname === item.url 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                }
              `}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.title}</span>
            </Link>
          </motion.div>
        ))}
      </motion.div>
      {/* Footer Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="glass-card p-3 rounded-lg border border-white/10"
      >
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-2">
            Professional Network
          </p>
          <div className="text-xs font-medium text-primary">
            🎯 Level up your connections
          </div>
        </div>
      </motion.div>
    </div>
  );
};