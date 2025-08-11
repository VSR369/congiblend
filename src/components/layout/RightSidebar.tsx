import React from 'react';
import { 
  TrendingUp, 
  Hash,
  Users,
  ExternalLink,
  Plus,
  ChevronRight,
  Sparkles,
  MessageSquare,
  Heart,
  FileText,
  BookOpen
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

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
  { type: 'like', user: 'Emma Davis', action: 'liked your post', time: '5m ago' },
  { type: 'follow', user: 'David Brown', action: 'started following you', time: '1h ago' },
];

export const RightSidebar = () => {
  // Top lists state
  const [topArticles, setTopArticles] = React.useState<{ id: string; title: string }[]>([]);
  const [topSparks, setTopSparks] = React.useState<{ id: string; slug: string; title: string }[]>([]);
  const [loadingTop, setLoadingTop] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoadingTop(true);
        const [articlesRes, sparksRes] = await Promise.all([
          supabase
            .from('posts')
            .select('id, content, metadata, likes_count, reactions_count, created_at, post_type, visibility')
            .or('post_type.eq.article,not.metadata->>article_html.is.null')
            .eq('visibility', 'public')
            .limit(10),
          supabase
            .from('knowledge_sparks')
            .select('id, title, slug, view_count, is_featured, updated_at')
            .eq('is_active', true)
            .limit(10),
        ]);

        if (!active) return;

        const arts = (articlesRes.data || [])
          .map((p: any) => ({
            id: p.id,
            title: p?.metadata?.title || (p?.content || '').split('\n')[0] || 'Untitled',
            likes: p?.likes_count ?? 0,
            reactions: p?.reactions_count ?? 0,
            created_at: p?.created_at,
          }))
          .sort((a: any, b: any) =>
            (b.likes - a.likes) || (b.reactions - a.reactions) || (new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          )
          .slice(0, 3)
          .map(({ id, title }) => ({ id, title }));

        const ks = (sparksRes.data || [])
          .map((s: any) => ({
            id: s.id,
            slug: s.slug,
            title: s.title || 'Untitled Spark',
            featured: !!s.is_featured,
            views: s.view_count ?? 0,
            updated_at: s.updated_at,
          }))
          .sort((a: any, b: any) =>
            (Number(b.featured) - Number(a.featured)) || (b.views - a.views) || (new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          )
          .slice(0, 3)
          .map(({ id, slug, title }) => ({ id, slug, title }));

        setTopArticles(arts);
        setTopSparks(ks);
      } catch (e) {
        console.warn('RightSidebar: failed to load top lists', e);
      } finally {
        if (active) setLoadingTop(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="w-80 h-screen overflow-y-auto p-4 space-y-6">
      {/* Top Articles */}
      <div className="glass-card p-4 rounded-xl border border-white/10 animate-fade-in">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center">
            <FileText className="h-4 w-4 mr-2 text-primary" />
            Top Articles
          </h3>
        </div>
        {loadingTop ? (
          <div className="space-y-2">
            {[0,1,2].map((i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : topArticles.length === 0 ? (
          <p className="text-xs text-muted-foreground">No articles yet.</p>
        ) : (
          <ul className="space-y-2">
            {topArticles.map((a) => (
              <li key={a.id} className="animate-fade-in">
                <Button asChild variant="ghost" className="w-full justify-start h-8 px-2 text-sm truncate">
                  <Link to={`/articles/${a.id}`} title={a.title} aria-label={`Open article ${a.title}`}>
                    <span className="inline-flex items-center">
                      <FileText className="h-3.5 w-3.5 mr-2 text-primary" />
                      <span className="truncate">{a.title}</span>
                    </span>
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Top Knowledge Sparks */}
      <div className="glass-card p-4 rounded-xl border border-white/10 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center">
            <BookOpen className="h-4 w-4 mr-2 text-primary" />
            Top Knowledge Sparks
          </h3>
        </div>
        {loadingTop ? (
          <div className="space-y-2">
            {[0,1,2].map((i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : topSparks.length === 0 ? (
          <p className="text-xs text-muted-foreground">No sparks yet.</p>
        ) : (
          <ul className="space-y-2">
            {topSparks.map((s) => (
              <li key={s.id} className="animate-fade-in">
                <Button asChild variant="ghost" className="w-full justify-start h-8 px-2 text-sm truncate">
                  <Link to={`/knowledge-sparks/${s.slug}`} title={s.title} aria-label={`Open spark ${s.title}`}>
                    <span className="inline-flex items-center">
                      <BookOpen className="h-3.5 w-3.5 mr-2 text-primary" />
                      <span className="truncate">{s.title}</span>
                    </span>
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Trending Topics */}
      <div className="glass-card p-4 rounded-xl border border-white/10 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center">
            <TrendingUp className="h-4 w-4 mr-2 text-primary" />
            Trending Topics
          </h3>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="space-y-3 stable-list">
          {trendingTopics.map((topic, index) => (
            <div
              key={topic.name}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors debounced-enter"
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
      </div>

      {/* Suggested Connections */}
      <div className="glass-card p-4 rounded-xl border border-white/10 animate-fade-in"
        style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center">
            <Users className="h-4 w-4 mr-2 text-primary" />
            Suggested
          </h3>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="space-y-3 stable-list">
          {suggestedConnections.map((person, index) => (
            <div
              key={person.name}
              className="flex items-center justify-between debounced-enter"
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
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-4 rounded-xl border border-white/10 animate-fade-in"
        style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center">
            <Sparkles className="h-4 w-4 mr-2 text-primary" />
            Recent Activity
          </h3>
        </div>
        
        <div className="space-y-3 stable-list">
          {recentActivity.map((activity, index) => (
            <div
              key={index}
              className="flex items-start space-x-3 p-2 rounded-lg hover:bg-white/5 transition-colors debounced-enter"
              style={{ animationDelay: `${200 + index * 50}ms` }}
            >
              <div className="flex-shrink-0 mt-0.5">
                {activity.type === 'like' && <Heart className="h-3 w-3 text-primary" />}
                {activity.type === 'follow' && <Users className="h-3 w-3 text-accent" />}
                {activity.type === 'follow' && <Users className="h-3 w-3 text-accent" />}
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
      </div>

      {/* Quick Links */}
      <div className="glass-card p-4 rounded-xl border border-white/10 animate-fade-in"
        style={{ animationDelay: '0.3s' }}>
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
      </div>
    </div>
  );
};