import React, { useEffect, useState } from 'react';
import { Card } from './card';
import { Avatar } from './avatar';
import { 
  Flame, 
  Eye, 
  BookOpen, 
  FileText, 
  Image, 
  Video, 
  Mic, 
  BarChart, 
  Calendar, 
  Briefcase, 
  File, 
  Link, 
  Images,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { useActivityTracker } from '@/hooks/useActivityTracker';

interface UserStats {
  display_name: string;
  headline?: string;
  avatar_url?: string;
  total_posts: number;
  text_posts: number;
  image_posts: number;
  video_posts: number;
  voice_posts: number;
  article_posts: number;
  poll_posts: number;
  event_posts: number;
  job_posts: number;
  document_posts: number;
  link_posts: number;
  carousel_posts: number;
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
        .from('profiles')
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
        text_posts: postStats?.filter(p => p.post_type === 'text').length || 0,
        image_posts: postStats?.filter(p => p.post_type === 'image').length || 0,
        video_posts: postStats?.filter(p => p.post_type === 'video').length || 0,
        voice_posts: postStats?.filter(p => p.post_type === 'audio').length || 0,
        article_posts: postStats?.filter(p => p.post_type === 'article').length || 0,
        poll_posts: postStats?.filter(p => p.post_type === 'poll').length || 0,
        event_posts: postStats?.filter(p => p.post_type === 'event').length || 0,
        job_posts: postStats?.filter(p => p.post_type === 'job').length || 0,
        document_posts: postStats?.filter(p => p.post_type === 'document').length || 0,
        link_posts: postStats?.filter(p => p.post_type === 'link').length || 0,
        carousel_posts: postStats?.filter(p => p.post_type === 'carousel').length || 0,
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

        {/* Post Type Statistics */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Content Created</h4>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {/* Text Posts */}
            {stats.text_posts > 0 && (
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30">
                <div className="flex items-center space-x-1 mb-1">
                  <FileText className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-bold text-slate-600">{stats.text_posts}</span>
                </div>
                <span className="text-xs text-muted-foreground text-center">Text</span>
              </div>
            )}
            
            {/* Image Posts */}
            {stats.image_posts > 0 && (
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30">
                <div className="flex items-center space-x-1 mb-1">
                  <Image className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-bold text-blue-600">{stats.image_posts}</span>
                </div>
                <span className="text-xs text-muted-foreground text-center">Images</span>
              </div>
            )}
            
            {/* Video Posts */}
            {stats.video_posts > 0 && (
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30">
                <div className="flex items-center space-x-1 mb-1">
                  <Video className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-bold text-purple-600">{stats.video_posts}</span>
                </div>
                <span className="text-xs text-muted-foreground text-center">Videos</span>
              </div>
            )}
            
            {/* Voice/Audio Posts */}
            {stats.voice_posts > 0 && (
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30">
                <div className="flex items-center space-x-1 mb-1">
                  <Mic className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-bold text-green-600">{stats.voice_posts}</span>
                </div>
                <span className="text-xs text-muted-foreground text-center">Voice</span>
              </div>
            )}
            
            {/* Poll Posts */}
            {stats.poll_posts > 0 && (
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30">
                <div className="flex items-center space-x-1 mb-1">
                  <BarChart className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-bold text-orange-600">{stats.poll_posts}</span>
                </div>
                <span className="text-xs text-muted-foreground text-center">Polls</span>
              </div>
            )}
            
            {/* Article Posts */}
            {stats.article_posts > 0 && (
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30">
                <div className="flex items-center space-x-1 mb-1">
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-bold text-indigo-600">{stats.article_posts}</span>
                </div>
                <span className="text-xs text-muted-foreground text-center">Articles</span>
              </div>
            )}
            
            {/* Event Posts */}
            {stats.event_posts > 0 && (
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30">
                <div className="flex items-center space-x-1 mb-1">
                  <Calendar className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-bold text-red-600">{stats.event_posts}</span>
                </div>
                <span className="text-xs text-muted-foreground text-center">Events</span>
              </div>
            )}
            
            {/* Job Posts */}
            {stats.job_posts > 0 && (
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30">
                <div className="flex items-center space-x-1 mb-1">
                  <Briefcase className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-bold text-yellow-600">{stats.job_posts}</span>
                </div>
                <span className="text-xs text-muted-foreground text-center">Jobs</span>
              </div>
            )}
            
            {/* Document Posts */}
            {stats.document_posts > 0 && (
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30">
                <div className="flex items-center space-x-1 mb-1">
                  <File className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-bold text-gray-600">{stats.document_posts}</span>
                </div>
                <span className="text-xs text-muted-foreground text-center">Docs</span>
              </div>
            )}
            
            {/* Link Posts */}
            {stats.link_posts > 0 && (
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30">
                <div className="flex items-center space-x-1 mb-1">
                  <Link className="h-4 w-4 text-cyan-600" />
                  <span className="text-sm font-bold text-cyan-600">{stats.link_posts}</span>
                </div>
                <span className="text-xs text-muted-foreground text-center">Links</span>
              </div>
            )}
            
            {/* Carousel Posts */}
            {stats.carousel_posts > 0 && (
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30">
                <div className="flex items-center space-x-1 mb-1">
                  <Images className="h-4 w-4 text-pink-600" />
                  <span className="text-sm font-bold text-pink-600">{stats.carousel_posts}</span>
                </div>
                <span className="text-xs text-muted-foreground text-center">Carousel</span>
              </div>
            )}
            
            {/* Comments */}
            {stats.total_comments > 0 && (
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30">
                <div className="flex items-center space-x-1 mb-1">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-600">{stats.total_comments}</span>
                </div>
                <span className="text-xs text-muted-foreground text-center">Comments</span>
              </div>
            )}
          </div>
          
          {/* Show message if no content created yet */}
          {stats.total_posts === 0 && stats.total_comments === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No content created yet</p>
              <p className="text-xs text-muted-foreground">Start sharing your thoughts!</p>
            </div>
          )}
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