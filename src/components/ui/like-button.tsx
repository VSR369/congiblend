import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ThumbsUp, 
  Heart, 
  Lightbulb, 
  Target, 
  Sparkles, 
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeedStore } from '@/stores/feedStore';
import type { ReactionType } from '@/types/feed';

interface LikeButtonProps {
  targetId: string;
  targetType: 'post' | 'comment';
  currentReaction?: ReactionType | null;
  reactionCounts?: Record<string, number>;
  className?: string;
}

const REACTION_CONFIG = {
  like: {
    icon: ThumbsUp,
    label: 'Like',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
  },
  love: {
    icon: Heart,
    label: 'Love',
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100',
  },
  insightful: {
    icon: Lightbulb,
    label: 'Insightful',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 hover:bg-yellow-100',
  },
  support: {
    icon: Target,
    label: 'Support',
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
  },
  celebrate: {
    icon: Award,
    label: 'Celebrate',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
  },
  curious: {
    icon: Sparkles,
    label: 'Curious',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 hover:bg-pink-100',
  },
} as const;

export const LikeButton: React.FC<LikeButtonProps> = ({
  targetId,
  targetType,
  currentReaction,
  reactionCounts = {},
  className
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const { toggleReaction } = useFeedStore();

  const totalReactions = Object.values(reactionCounts).reduce((sum, count) => sum + count, 0);
  
  const handleMouseEnter = () => {
    setIsHovering(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Show picker after 600ms hover (LinkedIn timing)
    timeoutRef.current = setTimeout(() => {
      if (isHovering) {
        setShowPicker(true);
      }
    }, 600);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Hide picker after short delay
    setTimeout(() => {
      if (!isHovering) {
        setShowPicker(false);
      }
    }, 200);
  };

  const handleClick = async () => {
    // LinkedIn behavior: click toggles between Like and no reaction
    if (currentReaction === 'like') {
      await toggleReaction(targetId, null); // Remove reaction
    } else {
      await toggleReaction(targetId, 'like'); // Set to Like
    }
  };

  const handleReactionSelect = async (reactionType: ReactionType) => {
    setShowPicker(false);
    setIsHovering(false);
    await toggleReaction(targetId, reactionType);
  };

  // Determine button appearance based on current reaction
  const currentConfig = currentReaction ? REACTION_CONFIG[currentReaction] : REACTION_CONFIG.like;
  const isActive = !!currentReaction;

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200",
          isActive 
            ? cn(currentConfig.bgColor, currentConfig.color)
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          className
        )}
      >
        <currentConfig.icon className="h-5 w-5" />
        <span className="text-sm font-medium">
          {currentConfig.label}
          {totalReactions > 0 && (
            <span className="ml-1 text-xs">
              {totalReactions}
            </span>
          )}
        </span>
      </button>

      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-0 mb-2 z-50"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={handleMouseLeave}
          >
            <div className="flex items-center space-x-1 bg-background border border-border rounded-full px-2 py-1 shadow-lg">
              {Object.entries(REACTION_CONFIG).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => handleReactionSelect(type as ReactionType)}
                  className={cn(
                    "p-2 rounded-full transition-all duration-200 hover:scale-110",
                    config.bgColor,
                    "hover:shadow-md"
                  )}
                  title={config.label}
                >
                  <config.icon className={cn("h-5 w-5", config.color)} />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};