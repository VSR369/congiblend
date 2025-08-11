
import React from 'react';
import { Home, FileText, MessageCircle, Lightbulb } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { UserStatsCard } from '@/components/ui/user-stats-card';

const navigationItems = [
  { title: 'Mission Control', url: '/', icon: Home },
  { title: 'Articles', url: '/articles', activeMatch: '/articles', icon: FileText },
  { title: 'Messages', url: '/messages', icon: MessageCircle },
  { title: 'Knowledge Sparks', url: '/knowledge-sparks', icon: Lightbulb },
];

export const LeftSidebar = () => {
  const location = useLocation();
  return (
    <div className="w-full sm:w-80 h-screen overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-background to-muted/30">
      {/* User Stats Card */}
      <div className="animate-fade-in">
        <UserStatsCard />
      </div>

      {/* PHASE 1: Navigation Menu with CSS animations */}
      <div className="space-y-2 stable-animation">
        {navigationItems.map((item, index) => (
          <div 
            key={item.title}
            className="debounced-enter"
            style={{ animationDelay: `${100 + index * 50}ms` }}
          >
            <Link 
              to={item.url}
              onMouseEnter={() => { if (item.url === '/knowledge-sparks') import("../../pages/KnowledgeSparks"); }}
              onFocus={() => { if (item.url === '/knowledge-sparks') import("../../pages/KnowledgeSparks"); }}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 
                ${((item.activeMatch ?? item.url) === '/' 
                  ? location.pathname === (item.activeMatch ?? item.url)
                  : location.pathname.startsWith(item.activeMatch ?? item.url))
                  ? 'bg-primary/10 text-primary border border-primary/30' 
                  : 'text-foreground hover:bg-muted hover:text-primary'
                }
              `}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.title}</span>
            </Link>
          </div>
        ))}

      </div>
      {/* Footer Card */}
      <div className="glass-card p-3 rounded-lg border border-white/10 animate-fade-in">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-2">
            Professional Network
          </p>
          <div className="text-xs font-medium text-primary">
            🎯 Level up your connections
          </div>
        </div>
      </div>
    </div>
  );
};
