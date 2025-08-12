import React, { useState } from 'react';
import { Button } from './button';
import { Card } from './card';
import { Progress } from './progress';
import { Badge } from './badge';
import { CheckCircle, Clock, BarChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}

interface PollData {
  id: string;
  question: string;
  options: PollOption[];
  endTime: Date;
  totalVotes: number;
  userVote?: string;
  hasEnded: boolean;
}

interface PollCardProps {
  poll: PollData;
  onVoteUpdate?: (pollId: string, newResults: PollOption[]) => void;
}

export const PollCard: React.FC<PollCardProps> = ({ poll, onVoteUpdate }) => {
  const [isVoting, setIsVoting] = useState(false);
  const [userVote, setUserVote] = useState(poll.userVote);

  const timeUntilEnd = poll.endTime.getTime() - Date.now();
  const hasEnded = poll.hasEnded || timeUntilEnd <= 0;

  const formatTimeRemaining = () => {
    if (hasEnded) return null;
    
    const days = Math.floor(timeUntilEnd / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeUntilEnd % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    return "Less than 1h left";
  };

  const handleVote = async (optionId: string) => {
    if (hasEnded || isVoting) return;

    setIsVoting(true);
    try {
      // Call poll_vote function
      const { error } = await supabase.rpc('poll_vote', {
        p_poll_id: poll.id,
        p_option_id: optionId
      });

      if (error) throw error;

      // Get updated results
      const { data: results, error: resultsError } = await supabase.rpc('poll_results', {
        p_poll_id: poll.id
      });

      if (resultsError) throw resultsError;

      // Update local state
      setUserVote(optionId);
      
      // Notify parent component
      if (onVoteUpdate && results) {
        const updatedOptions = results.map((result: any) => ({
          id: result.option_id,
          text: result.option_text,
          votes: result.votes,
          percentage: result.pct
        }));
        onVoteUpdate(poll.id, updatedOptions);
      }

      toast.success('Vote recorded!');
    } catch (error) {
      console.error('Voting error:', error);
      toast.error('Failed to record vote. Please try again.');
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">{poll.question}</h3>
        
        <div className="space-y-2">
          {poll.options.map((option) => {
            const isSelected = userVote === option.id;
            const showResults = hasEnded || userVote;

            const interactive = !hasEnded && !!userVote; // allow changing vote before poll ends
            const handleRowClick = () => {
              if (!interactive || isVoting || option.id === userVote) return;
              handleVote(option.id);
            };
            const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
              if (!interactive || isVoting || option.id === userVote) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleVote(option.id);
              }
            };
            
            return (
              <div key={option.id} className="space-y-1">
                {!hasEnded && !userVote ? (
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start h-auto p-3 text-left",
                      isVoting && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => handleVote(option.id)}
                    disabled={isVoting}
                  >
                    {option.text}
                  </Button>
                ) : (
                  <div className="relative">
                    <div
                      role={interactive ? 'button' : undefined}
                      tabIndex={interactive ? 0 : -1}
                      onClick={handleRowClick}
                      onKeyDown={handleKeyDown}
                      className={cn(
                        "w-full p-3 border rounded-md",
                        isSelected && "border-primary bg-primary/5",
                        interactive && "cursor-pointer"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{option.text}</span>
                          {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                        </div>
                        <span className="text-sm font-medium">{option.percentage}%</span>
                      </div>
                    </div>
                    {showResults && (
                      <Progress 
                        value={option.percentage} 
                        className="absolute bottom-0 left-0 right-0 h-1 rounded-t-none" 
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <BarChart className="h-4 w-4" />
            <span>{poll.totalVotes} votes</span>
          </div>
          {!hasEnded && (
            userVote ? (
              <span className="text-xs">You can change your vote until the poll ends.</span>
            ) : (
              <span className="text-xs">Vote to see results</span>
            )
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {hasEnded ? (
            <Badge variant="secondary">Poll ended</Badge>
          ) : (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatTimeRemaining()}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};