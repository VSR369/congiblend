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
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const navigationItems = [
  { title: 'Home', url: '/', icon: Home },
  { title: 'My Network', url: '/network', icon: Users },
  { title: 'Analytics', url: '/analytics', icon: BarChart3 },
  { title: 'Profile', url: '/profile', icon: User },
  { title: 'Settings', url: '/settings', icon: Settings },
];

const quickActions = [
  { title: 'Create Post', icon: Plus },
  { title: 'Messages', icon: MessageCircle },
];

export const LeftSidebar = () => {
  const location = useLocation();

  return (
    <Sidebar side="left" className="glass-card border-0">
      <SidebarHeader className="p-4">
        {/* User Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 rounded-xl border border-white/10"
        >
          <div className="flex items-center space-x-3 mb-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                JD
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                John Doe
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                Product Manager
              </p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center text-primary">
                <Eye className="h-3 w-3 mr-1" />
                <span className="text-xs font-medium">1.2K</span>
              </div>
              <p className="text-xs text-muted-foreground">Views</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center text-primary">
                <FileText className="h-3 w-3 mr-1" />
                <span className="text-xs font-medium">24</span>
              </div>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center text-primary">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span className="text-xs font-medium">89%</span>
              </div>
              <p className="text-xs text-muted-foreground">Growth</p>
            </div>
          </div>
        </motion.div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Navigation Menu */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground font-medium">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild
                      className={`
                        transition-all duration-200 rounded-lg hover:bg-primary/10 hover:text-primary
                        ${location.pathname === item.url ? 'bg-primary/10 text-primary border-r-2 border-primary' : ''}
                      `}
                    >
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </motion.div>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="my-4 bg-border/50" />

        {/* Quick Actions */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground font-medium">
            Quick Actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-2">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start h-9 px-3 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200"
                  >
                    <action.icon className="h-4 w-4 mr-2" />
                    <span className="font-medium">{action.title}</span>
                  </Button>
                </motion.div>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
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
      </SidebarFooter>
    </Sidebar>
  );
};