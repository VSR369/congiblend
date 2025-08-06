import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ThumbsUp, 
  Heart, 
  Laugh, 
  Star, 
  Zap, 
  Flame,
  Trophy,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ReactionType {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  hoverColor: string;
}

const reactionTypes: ReactionType[] = [
  {
    id: 'like',
    icon: ThumbsUp,
    label: 'Like',
    color: 'text-blue-500',
    hoverColor: 'hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950'
  },
  {
    id: 'love',
    icon: Heart,
    label: 'Love',
    color: 'text-red-500',
    hoverColor: 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950'
  },
  {
    id: 'laugh',
    icon: Laugh,
    label: 'Funny',
    color: 'text-yellow-500',
    hoverColor: 'hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-950'
  },
  {
    id: 'wow',
    icon: Star,
    label: 'Amazing',
    color: 'text-purple-500',
    hoverColor: 'hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950'
  },
  {
    id: 'insightful',
    icon: Lightbulb,
    label: 'Insightful',
    color: 'text-orange-500',
    hoverColor: 'hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950'
  },
  {
    id: 'brilliant',
    icon: Zap,
    label: 'Brilliant',
    color: 'text-cyan-500',
    hoverColor: 'hover:bg-cyan-50 hover:text-cyan-600 dark:hover:bg-cyan-950'
  },
  {
    id: 'fire',
    icon: Flame,
    label: 'Hot',
    color: 'text-red-400',
    hoverColor: 'hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950'
  },
  {
    id: 'celebrate',
    icon: Trophy,
    label: 'Celebrate',
    color: 'text-amber-500',
    hoverColor: 'hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950'
  }
];

import { useReactionData } from '@/hooks/useReactionData';

interface ReactionButtonProps {
  targetId: string;
  targetType: 'post' | 'comment';
  onReactionChange?: (reactionType: string | null) => void;
  className?: string;
}

export const ReactionButton: React.FC<ReactionButtonProps> = ({
  targetId,
  targetType,
  onReactionChange,
  className
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const { 
    currentUserReaction, 
    reactionCounts, 
    updateReactionData 
  } = useReactionData(targetId, targetType);
  
  const [isLoading, setIsLoading] = useState(false);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsHovering(true);
    setShowReactions(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    timeoutRef.current = setTimeout(() => {
      if (!isHovering) {
        setShowReactions(false);
      }
    }, 300);
  };

  const handleReactionClick = async (reactionType: string) => {
    const newReaction = currentUserReaction === reactionType ? null : reactionType;
    
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to react to posts.",
          variant: "destructive",
        });
        return;
      }

      // Check for existing reaction
      const { data: existingReaction } = await supabase
        .from('reactions')
        .select('*')
        .eq('target_id', targetId)
        .eq('target_type', targetType)
        .eq('user_id', user.id)
        .single();

      if (existingReaction) {
        if (newReaction === null) {
          // Remove reaction
          await supabase
            .from('reactions')
            .delete()
            .eq('id', existingReaction.id);
        } else {
          // Update reaction
          await supabase
            .from('reactions')
            .update({ 
              reaction_type: newReaction,
              created_at: new Date().toISOString()
            })
            .eq('id', existingReaction.id);
        }
      } else if (newReaction !== null) {
        // Create new reaction
        await supabase
          .from('reactions')
          .insert({
            target_id: targetId,
            target_type: targetType,
            user_id: user.id,
            reaction_type: newReaction,
          });
      }

      // Update local state
      updateReactionData(newReaction);
      onReactionChange?.(newReaction);
      
    } catch (error) {
      console.error('Error handling reaction:', error);
      toast({
        title: "Error",
        description: "Failed to update reaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
    
    setShowReactions(false);
  };

  const getTotalReactions = () => {
    return Object.values(reactionCounts).reduce((sum, count) => sum + count, 0);
  };

  const currentReactionData = reactionTypes.find(r => r.id === currentUserReaction);
  const defaultReaction = reactionTypes[0]; // Like

  return (
    <div className="relative inline-block">
      {/* Main Reaction Button */}
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleReactionClick('like')}
          disabled={isLoading}
          className={cn(
            "flex items-center space-x-2 transition-all duration-200 rounded-lg hover:bg-primary/10",
            currentUserReaction ? currentReactionData?.color : "text-muted-foreground hover:text-primary",
            className
          )}
        >
          {currentUserReaction && currentReactionData ? (
            <currentReactionData.icon className="h-4 w-4" />
          ) : (
            <defaultReaction.icon className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {currentUserReaction && currentReactionData ? currentReactionData.label : defaultReaction.label}
          </span>
          {getTotalReactions() > 0 && (
            <span className="text-xs text-muted-foreground">
              {getTotalReactions()}
            </span>
          )}
        </Button>

        {/* Reaction Selector Popup */}
        <AnimatePresence>
          {showReactions && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute bottom-full left-0 mb-2 z-50"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-center space-x-1 bg-background/95 backdrop-blur-sm border border-border rounded-full px-3 py-2 shadow-lg glass-card">
                {reactionTypes.map((reaction, index) => (
                  <motion.button
                    key={reaction.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05, duration: 0.15 }}
                    onClick={() => handleReactionClick(reaction.id)}
                    className={cn(
                      "p-2 rounded-full transition-all duration-200 transform hover:scale-110",
                      currentUserReaction === reaction.id 
                        ? `${reaction.color} bg-primary/10` 
                        : `text-muted-foreground ${reaction.hoverColor}`
                    )}
                    title={reaction.label}
                  >
                    <reaction.icon className="h-5 w-5" />
                  </motion.button>
                ))}
              </div>
              
              {/* Tooltip Arrow */}
              <div className="absolute top-full left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-border"></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reaction Summary Display */}
      {getTotalReactions() > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 mt-2 text-xs text-muted-foreground"
        >
          <div className="flex items-center space-x-1">
            {Object.entries(reactionCounts)
              .filter(([_, count]) => count > 0)
              .slice(0, 3)
              .map(([reactionId, count]) => {
                const reaction = reactionTypes.find(r => r.id === reactionId);
                if (!reaction) return null;
                
                return (
                  <div key={reactionId} className="flex items-center space-x-1">
                    <reaction.icon className={cn("h-3 w-3", reaction.color)} />
                    <span>{count}</span>
                  </div>
                );
              })}
          </div>
          
          {Object.keys(reactionCounts).length > 3 && (
            <span className="text-muted-foreground">
              +{Object.keys(reactionCounts).length - 3} more
            </span>
          )}
        </motion.div>
      )}
    </div>
  );
};