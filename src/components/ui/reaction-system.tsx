import * as React from "react";
import { Heart, ThumbsUp, Award, Users, Lightbulb, HelpCircle, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactionType } from "@/types/feed";

interface LikeButtonProps {
  totalReactions: number;
  userReaction?: ReactionType;
  onLikeToggle: () => void;
  onReactionSelect: (reaction: ReactionType) => void;
  isLoading?: boolean;
  className?: string;
}

interface ReactionButtonProps {
  type: ReactionType;
  count: number;
  isActive: boolean;
  onClick: () => void;
  showCount?: boolean;
  size?: 'sm' | 'md';
  isLoading?: boolean;
}

const reactionConfig: Record<ReactionType, { 
  icon: React.ComponentType<any>; 
  label: string; 
  color: string; 
  activeColor: string;
  bgColor: string;
}> = {
  like: {
    icon: ThumbsUp,
    label: "Like",
    color: "text-muted-foreground",
    activeColor: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20"
  },
  love: {
    icon: Heart,
    label: "Love",
    color: "text-muted-foreground",
    activeColor: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/20"
  },
  celebrate: {
    icon: Award,
    label: "Celebrate",
    color: "text-muted-foreground",
    activeColor: "text-yellow-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20"
  },
  support: {
    icon: Users,
    label: "Support",
    color: "text-muted-foreground",
    activeColor: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/20"
  },
  insightful: {
    icon: Lightbulb,
    label: "Insightful",
    color: "text-muted-foreground",
    activeColor: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950/20"
  },
  curious: {
    icon: HelpCircle,
    label: "Curious",
    color: "text-muted-foreground",
    activeColor: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950/20"
  }
};

// Modern Like Button with secondary reactions
export const LikeButton = ({ 
  totalReactions, 
  userReaction, 
  onLikeToggle, 
  onReactionSelect,
  isLoading = false,
  className 
}: LikeButtonProps) => {
  const [showReactionPicker, setShowReactionPicker] = React.useState(false);
  const [longPressTimer, setLongPressTimer] = React.useState<NodeJS.Timeout | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const isLiked = !!userReaction;
  const primaryReaction = userReaction || 'like';
  const config = reactionConfig[primaryReaction];
  const Icon = config.icon;

  // Handle long press / hover for reaction picker
  const handleMouseDown = () => {
    const timer = setTimeout(() => {
      setShowReactionPicker(true);
    }, 700); // Longer delay for more intentional long press
    setLongPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // Only trigger like if reaction picker isn't showing
    if (!showReactionPicker) {
      onLikeToggle();
    }
  };

  const handleMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    // Hide picker when mouse leaves
    setShowReactionPicker(false);
  };

  // Simple click handler for immediate like toggle
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!showReactionPicker) {
      onLikeToggle();
    }
  };

  const handleReactionSelect = (reaction: ReactionType) => {
    onReactionSelect(reaction);
    setShowReactionPicker(false);
  };

  // Close picker when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowReactionPicker(false);
      }
    };

    if (showReactionPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showReactionPicker]);

  return (
    <div className={cn("relative", className)}>
      <motion.button
        ref={buttonRef}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        disabled={isLoading}
        className={cn(
          "flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-200",
          "border border-border hover:border-border/80",
          "focus:outline-none focus:ring-2 focus:ring-primary/20",
          isLiked 
            ? cn("text-foreground border-primary/30", config.bgColor)
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
        aria-label={`${isLiked ? 'Unlike' : 'Like'} post (${totalReactions} reactions)`}
      >
        <motion.div
          animate={isLiked ? { scale: [1, 1.2, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Icon 
            className={cn(
              "h-5 w-5 transition-colors",
              isLiked ? config.activeColor : "text-muted-foreground"
            )} 
          />
        </motion.div>
        
        {totalReactions > 0 && (
          <span className={cn(
            "text-sm font-medium transition-colors",
            isLiked ? config.activeColor : "text-muted-foreground"
          )}>
            {totalReactions}
          </span>
        )}
        {/* More reactions indicator - only show when not already reacted */}
        {!isLiked && (
          <MoreHorizontal className="h-3 w-3 opacity-60" />
        )}
        
        {/* Long press hint */}
        {!isLiked && (
          <span className="text-xs text-muted-foreground/60 ml-1">
            Hold for more
          </span>
        )}
      </motion.button>

      {/* Reaction Picker */}
      <AnimatePresence>
        {showReactionPicker && (
          <ReactionPicker 
            onReactionSelect={handleReactionSelect}
            currentReaction={userReaction}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Legacy reaction button for backward compatibility
export const ReactionButton = ({ 
  type, 
  count, 
  isActive, 
  onClick, 
  showCount = true,
  size = 'md',
  isLoading = false
}: ReactionButtonProps) => {
  const config = reactionConfig[type];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "flex items-center space-x-1 px-3 py-1.5 rounded-full transition-all",
        "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
        isActive && cn("text-foreground", config.bgColor),
        isLoading && "opacity-50 cursor-not-allowed"
      )}
      aria-label={`${config.label} (${count})`}
    >
      <motion.div
        animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Icon 
          className={cn(
            sizeClasses[size],
            isActive ? config.activeColor : config.color,
            "transition-colors"
          )} 
        />
      </motion.div>
      {showCount && count > 0 && (
        <span className={cn(
          "text-sm font-medium transition-colors",
          isActive ? config.activeColor : "text-muted-foreground"
        )}>
          {count}
        </span>
      )}
    </motion.button>
  );
};

interface ReactionPickerProps {
  onReactionSelect: (reaction: ReactionType) => void;
  currentReaction?: ReactionType;
  position?: 'top' | 'bottom';
}

export const ReactionPicker = ({ 
  onReactionSelect, 
  currentReaction,
  position = 'top'
}: ReactionPickerProps) => {
  const reactions: ReactionType[] = ['like', 'love', 'celebrate', 'support', 'insightful', 'curious'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: position === 'top' ? 20 : -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: position === 'top' ? 20 : -20 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "absolute left-1/2 transform -translate-x-1/2 z-50",
        "flex items-center space-x-1 bg-background/95 backdrop-blur-sm",
        "border border-border rounded-full shadow-lg p-2",
        "ring-1 ring-black/5 dark:ring-white/10",
        position === 'top' ? "bottom-full mb-3" : "top-full mt-3"
      )}
    >
      {reactions.map((reaction, index) => {
        const config = reactionConfig[reaction];
        const Icon = config.icon;
        const isActive = currentReaction === reaction;
        
        return (
          <motion.button
            key={reaction}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              duration: 0.15, 
              delay: index * 0.03,
              ease: "easeOut"
            }}
            whileHover={{ 
              scale: 1.3, 
              y: -2,
              transition: { duration: 0.1 }
            }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onReactionSelect(reaction)}
            className={cn(
              "relative flex items-center justify-center w-10 h-10 rounded-full",
              "transition-all duration-200 hover:shadow-md",
              "focus:outline-none focus:ring-2 focus:ring-primary/20",
              isActive 
                ? cn("shadow-md", config.bgColor, "ring-2 ring-current ring-opacity-20")
                : "hover:bg-accent/80"
            )}
            title={config.label}
            aria-label={`React with ${config.label}`}
          >
            <Icon 
              className={cn(
                "h-5 w-5 transition-colors",
                isActive ? config.activeColor : config.color
              )} 
            />
            
            {/* Active indicator */}
            {isActive && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"
              />
            )}
          </motion.button>
        );
      })}
      
      {/* Pointer arrow */}
      <div className={cn(
        "absolute left-1/2 transform -translate-x-1/2 w-0 h-0",
        position === 'top' 
          ? "top-full border-l-4 border-r-4 border-t-4 border-transparent border-t-border"
          : "bottom-full border-l-4 border-r-4 border-b-4 border-transparent border-b-border"
      )} />
    </motion.div>
  );
};