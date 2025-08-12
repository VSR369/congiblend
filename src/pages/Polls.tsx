import React, { useState, useEffect } from 'react';
import { PollCard } from '@/components/ui/poll-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostCreationModal } from '@/components/ui/post-creation-modal';
import { Plus, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Post } from '@/types/feed';

export default function Polls() {
  const { user } = useAuthStore();
  const [polls, setPolls] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      setLoading(true);
      
      // Fetch poll posts with poll data
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id,
            display_name,
            username,
            avatar_url
          ),
          polls (
            id,
            question,
            end_time,
            poll_options (
              id,
              option_text,
              idx
            )
          )
        `)
        .eq('post_type', 'poll')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include poll results
      const transformedPosts = await Promise.all(
        (posts || []).map(async (post) => {
          if (post.polls?.[0]) {
            const poll = post.polls[0];
            
            // Get poll results
            const { data: results, error: resultsError } = await supabase.rpc('poll_results', {
              p_poll_id: poll.id
            });

            if (resultsError) {
              console.error('Error fetching poll results:', resultsError);
            }

            // Get user's vote if authenticated
            let userVote = null;
            if (user) {
              const { data: vote } = await supabase
                .from('poll_votes')
                .select('option_id')
                .eq('poll_id', poll.id)
                .eq('voter_id', user.id)
                .maybeSingle();
              
              userVote = vote?.option_id;
            }

            const options = (results || []).map((result: any) => ({
              id: result.option_id,
              text: result.option_text,
              votes: result.votes,
              percentage: result.pct
            }));

            const totalVotes = options.reduce((sum, opt) => sum + opt.votes, 0);
            const hasEnded = new Date(poll.end_time) <= new Date();

            return {
              id: post.id,
              type: 'poll' as const,
              author: {
                id: post.profiles.id,
                name: post.profiles.display_name || post.profiles.username,
                username: post.profiles.username,
                avatar: post.profiles.avatar_url
              },
              content: post.content,
              poll: {
                id: poll.id,
                question: poll.question,
                options,
                endTime: new Date(poll.end_time),
                totalVotes,
                userVote,
                hasEnded
              },
              createdAt: new Date(post.created_at),
              hashtags: [],
              mentions: [],
              reactions: [],
              likes: post.likes_count || 0,
              saves: 0,
              views: 0,
              visibility: post.visibility as 'public' | 'connections' | 'private'
            } as Post;
          }
          return null;
        })
      );

      setPolls(transformedPosts.filter(Boolean) as Post[]);
    } catch (error) {
      console.error('Error fetching polls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVoteUpdate = (pollId: string, newResults: any[]) => {
    setPolls(prev => prev.map(post => {
      if (post.poll?.id === pollId) {
        return {
          ...post,
          poll: {
            ...post.poll,
            options: newResults,
            totalVotes: newResults.reduce((sum, opt) => sum + opt.votes, 0)
          }
        };
      }
      return post;
    }));
  };

  const filterPolls = (polls: Post[]) => {
    const now = new Date();
    switch (activeTab) {
      case 'active':
        return polls.filter(p => p.poll && !p.poll.hasEnded && new Date(p.poll.endTime) > now);
      case 'ended':
        return polls.filter(p => p.poll && (p.poll.hasEnded || new Date(p.poll.endTime) <= now));
      case 'my-polls':
        return polls.filter(p => p.author.id === user?.id);
      default:
        return polls;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg">Loading polls...</div>
      </div>
    );
  }

  const filteredPolls = filterPolls(polls);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Polls</h1>
          <p className="text-muted-foreground">Share your questions and gather insights</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Poll
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            All
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Active
          </TabsTrigger>
          <TabsTrigger value="ended" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Ended
          </TabsTrigger>
          <TabsTrigger value="my-polls">My Polls</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredPolls.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No polls found</h3>
                <p className="text-muted-foreground">
                  {activeTab === 'my-polls' 
                    ? "You haven't created any polls yet."
                    : "No polls available in this category."
                  }
                </p>
                <Button onClick={() => setShowCreateModal(true)} className="mt-4">
                  Create Your First Poll
                </Button>
              </div>
            </Card>
          ) : (
            filteredPolls.map((post) => (
              post.poll && (
                <PollCard
                  key={post.id}
                  poll={post.poll}
                  onVoteUpdate={handleVoteUpdate}
                />
              )
            ))
          )}
        </TabsContent>
      </Tabs>

      <PostCreationModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        initialType="poll"
        allowedTypes={['poll']}
      />
    </div>
  );
}