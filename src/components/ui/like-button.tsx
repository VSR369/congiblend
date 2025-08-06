import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ThumbsUp, 
  Heart, 
  Lightbulb, 
  Target, 
  Award,
  Smile
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
    color: 'hsl(var(--primary))',
    hoverColor: 'hover:text-blue-600',
    bgHover: 'hover:bg-blue-50',
  },
  love: {
    icon: Heart,
    label: 'Love',
    color: 'hsl(var(--destructive))',
    hoverColor: 'hover:text-red-600',
    bgHover: 'hover:bg-red-50',
  },
  insightful: {
    icon: Lightbulb,
    label: 'Insightful',
    color: 'hsl(45 93% 47%)',
    hoverColor: 'hover:text-yellow-600',
    bgHover: 'hover:bg-yellow-50',
  },
  support: {
    icon: Target,
    label: 'Support',
    color: 'hsl(142 76% 36%)',
    hoverColor: 'hover:text-green-600',
    bgHover: 'hover:bg-green-50',
  },
  celebrate: {
    icon: Award,
    label: 'Celebrate',
    color: 'hsl(262 83% 58%)',
    hoverColor: 'hover:text-purple-600',
    bgHover: 'hover:bg-purple-50',
  },
  curious: {
    icon: Smile,
    label: 'Curious',
    color: 'hsl(329 86% 70%)',
    hoverColor: 'hover:text-pink-600',
    bgHover: 'hover:bg-pink-50',
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
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();
  const { toggleReaction } = useFeedStore();

  const totalReactions = Object.values(reactionCounts).reduce((sum, count) => sum + count, 0);
  
  const handleMouseEnter = () => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Show picker after 300ms hover (LinkedIn timing)
    hoverTimeoutRef.current = setTimeout(() => {
      setShowPicker(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    // Clear the show timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Hide picker immediately when leaving the entire component
    setShowPicker(false);
  };

  const handlePickerMouseEnter = () => {
    // Keep picker open when hovering over it
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const handleClick = async () => {
    // LinkedIn behavior: click toggles between Like and no reaction
    if (currentReaction === 'like') {
      await toggleReaction(targetId, null);
    } else {
      await toggleReaction(targetId, 'like');
    }
  };

  const handleReactionSelect = async (reactionType: ReactionType) => {
    setShowPicker(false);
    await toggleReaction(targetId, reactionType);
  };

  // Determine button appearance based on current reaction
  const currentConfig = currentReaction ? REACTION_CONFIG[currentReaction] : REACTION_CONFIG.like;
  const isActive = !!currentReaction;

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200",
          "hover:bg-muted",
          isActive 
            ? "text-primary font-medium"
            : "text-muted-foreground hover:text-foreground",
          className
        )}
        style={isActive ? { color: currentConfig.color } : undefined}
      >
        <currentConfig.icon className="h-5 w-5" />
        <span className="text-sm">
          {currentConfig.label}
          {totalReactions > 0 && (
            <span className="ml-1 text-xs opacity-70">
              {totalReactions}
            </span>
          )}
        </span>
      </button>

      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ 
              duration: 0.15,
              ease: [0.16, 1, 0.3, 1]
            }}
            className="absolute bottom-full left-0 mb-2 z-50"
            onMouseEnter={handlePickerMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="flex items-center space-x-1 bg-background border border-border rounded-full px-3 py-2 shadow-lg">
              {Object.entries(REACTION_CONFIG).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => handleReactionSelect(type as ReactionType)}
                  className={cn(
                    "p-2 rounded-full transition-all duration-150",
                    "hover:scale-125 hover:shadow-md",
                    config.bgHover,
                    config.hoverColor
                  )}
                  title={config.label}
                >
                  <config.icon 
                    className="h-4 w-4" 
                    style={{ color: config.color }}
                  />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
