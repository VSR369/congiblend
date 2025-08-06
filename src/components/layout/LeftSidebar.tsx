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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
      {/* User Profile Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-blue-100/50 shadow-sm"
      >
        <div className="flex items-center space-x-3 mb-4">
          <Avatar className="h-12 w-12 border-2 border-blue-100">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
              JD
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              John Doe
            </h3>
            <p className="text-sm text-gray-600 truncate">
              Solution Provider
            </p>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3 text-center text-xs">
          <div className="bg-blue-50 rounded-lg p-2">
            <div className="text-blue-600 font-semibold">3</div>
            <div className="text-gray-500">Voice Posts</div>
          </div>
          <div className="bg-green-50 rounded-lg p-2">
            <div className="text-green-600 font-semibold">4</div>
            <div className="text-gray-500">Video Posts</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-2">
            <div className="text-purple-600 font-semibold">1</div>
            <div className="text-gray-500">Articles</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-2">
            <div className="text-orange-600 font-semibold">12</div>
            <div className="text-gray-500">Comments</div>
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Profile Views</span>
            <span className="text-gray-900 font-medium">89</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Article Reads</span>
            <span className="text-gray-900 font-medium">156</span>
          </div>
        </div>
        
        <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center text-orange-700 text-sm">
            <span className="mr-2">🔥</span>
            <span className="font-medium">3-day streak!</span>
          </div>
        </div>
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