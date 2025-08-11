import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useFeedStore } from '@/stores/feedStore';
import type { ReactionType, Reaction } from '@/types/feed';
import { REACTION_CONFIG, getReactionCounts } from '@/utils/reactions';
import { ThumbsUp } from 'lucide-react';

interface LikeButtonProps {
  targetId: string;
  targetType: 'post';
  likesCount?: number;
  userLiked?: boolean;
  currentReaction?: ReactionType | null;
  reactions?: Reaction[];
  className?: string;
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  targetId,
  targetType,
  likesCount = 0,
  userLiked = false,
  currentReaction,
  reactions = [],
  className
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();
  const { toggleReaction, toggleLike } = useFeedStore();

  // Calculate reaction counts from reactions array
  const reactionCounts = getReactionCounts(reactions);
  const totalReactions = reactions.length;
  
  // PHASE 3: Debounced hover handlers to prevent rapid state changes
  const handleMouseEnter = React.useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => setShowPicker(true), 500);
  }, []);

  const handleMouseLeave = React.useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => setShowPicker(false), 300);
  }, []);

  const handlePickerMouseEnter = () => {
    // Keep picker open when hovering over it - clear hide timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const handlePickerMouseLeave = () => {
    // Hide picker when leaving the picker area
    setShowPicker(false);
  };

  const handleClick = async () => {
    await toggleLike(targetId);
  };

  const handleReactionSelect = async (reactionType: ReactionType) => {
    setShowPicker(false);
    await toggleReaction(targetId, reactionType);
  };

  const isLiked = !!userLiked;

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isLiked}
        aria-label={isLiked ? 'Unlike' : 'Like'}
        className={cn(
          "flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200",
          "hover:bg-muted",
          isLiked 
            ? "text-primary font-medium"
            : "text-muted-foreground hover:text-foreground",
          className
        )}
      >
        <ThumbsUp className="h-5 w-5" />
        <span className="text-sm">
          Like
          {likesCount > 0 && (
            <span className="ml-1 text-xs opacity-70">
              {likesCount}
            </span>
          )}
        </span>
      </button>

      {/* Reaction counts displayed separately */}
      {(reactionCounts.innovative || reactionCounts.practical || reactionCounts.well_researched) && (
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {(['innovative','practical','well_researched'] as ReactionType[]).map((t) => {
            const count = (reactionCounts as any)[t] || 0;
            if (!count) return null;
            const Cfg = REACTION_CONFIG[t];
            const Icon = Cfg.icon;
            return (
              <span key={t} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5">
                <Icon className="h-3.5 w-3.5" />
                <span>{count}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* PHASE 1: Pure CSS animation for picker */}
      {showPicker && (
        <div
          className="absolute bottom-full left-0 mb-2 z-50 animate-scale-in"
          onMouseEnter={handlePickerMouseEnter}
          onMouseLeave={handlePickerMouseLeave}
        >
          <div className="flex items-center space-x-1 bg-background border border-border rounded-full px-3 py-2 shadow-lg optimized-container">
            {Object.entries(REACTION_CONFIG).map(([type, config]) => (
              <button
                key={type}
                onClick={() => handleReactionSelect(type as ReactionType)}
                className={cn(
                  "p-2 rounded-full transition-all duration-150",
                  "hover:scale-125 hover:shadow-md will-change-transform",
                  config.bgHover,
                  config.hoverColor
                )}
                title={config.label}
              >
                <config.icon 
                  className={cn("h-4 w-4", config.color)}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
