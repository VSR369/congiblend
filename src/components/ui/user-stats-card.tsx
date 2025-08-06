import React, { useEffect, useState } from 'react';
import { Card } from './card';
import { Avatar } from './avatar';
import { Flame, Eye, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { useActivityTracker } from '@/hooks/useActivityTracker';

interface UserStats {
  display_name: string;
  headline?: string;
  avatar_url?: string;
  total_posts: number;
  video_posts: number;
  voice_posts: number;
  article_posts: number;
  text_posts: number;
  poll_posts: number;
  total_comments: number;
  profile_views_count: number;
  current_streak_days: number;
}

export const UserStatsCard: React.FC = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { trackActivity } = useActivityTracker();

  useEffect(() => {
    fetchUserStats();
    trackActivity('view');
  }, []);

  const fetchUserStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user info and profile views
      const { data: userData } = await supabase
        .from('users')
        .select('display_name, headline, avatar_url, profile_views_count, current_streak_days')
        .eq('id', user.id)
        .single();

      // Get post statistics
      const { data: postStats } = await supabase
        .from('posts')
        .select('post_type')
        .eq('user_id', user.id);

      // Get comment count
      const { data: commentStats } = await supabase
        .from('comments')
        .select('id')
        .eq('user_id', user.id);

      // Process post statistics
      const postCounts = {
        total_posts: postStats?.length || 0,
        video_posts: postStats?.filter(p => p.post_type === 'video').length || 0,
        voice_posts: postStats?.filter(p => p.post_type === 'audio').length || 0,
        article_posts: postStats?.filter(p => p.post_type === 'article').length || 0,
        text_posts: postStats?.filter(p => p.post_type === 'text').length || 0,
        poll_posts: postStats?.filter(p => p.post_type === 'poll').length || 0,
      };

      setStats({
        display_name: userData?.display_name || user.user_metadata?.full_name || 'User',
        headline: userData?.headline || 'Solution Provider',
        avatar_url: userData?.avatar_url,
        ...postCounts,
        total_comments: commentStats?.length || 0,
        profile_views_count: userData?.profile_views_count || 0,
        current_streak_days: userData?.current_streak_days || 0,
      });

      // Update user activity (already tracked in useEffect)
      // The login activity tracking will happen automatically

    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-muted animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
            <div className="h-3 w-32 bg-muted rounded animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center">
              <div className="h-6 w-8 bg-muted rounded animate-pulse mx-auto mb-1"></div>
              <div className="h-3 w-12 bg-muted rounded animate-pulse mx-auto"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Card className="p-4 space-y-4 bg-gradient-to-br from-background to-muted/30">
        {/* User Info */}
        <div className="flex items-center space-x-3">
          <Avatar className="w-12 h-12">
            {stats.avatar_url ? (
              <img src={stats.avatar_url} alt={stats.display_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                {stats.display_name.charAt(0).toUpperCase()}
              </div>
            )}
          </Avatar>
          <div>
            <h3 className="font-semibold text-sm">{stats.display_name}</h3>
            <p className="text-xs text-muted-foreground">{stats.headline}</p>
          </div>
        </div>

        {/* Post Statistics */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{stats.voice_posts}</div>
            <div className="text-xs text-muted-foreground">Voice Posts</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">{stats.video_posts}</div>
            <div className="text-xs text-muted-foreground">Video Posts</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{stats.article_posts}</div>
            <div className="text-xs text-muted-foreground">Articles</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">{stats.total_comments}</div>
            <div className="text-xs text-muted-foreground">Comments</div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>Profile Views</span>
            </div>
            <span className="font-semibold">{stats.profile_views_count}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>Total Posts</span>
            </div>
            <span className="font-semibold">{stats.total_posts}</span>
          </div>
        </div>

        {/* Streak */}
        {stats.current_streak_days > 0 && (
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-3 text-center"
          >
            <div className="flex items-center justify-center space-x-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="font-semibold text-orange-700">
                {stats.current_streak_days}-day streak!
              </span>
            </div>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
};