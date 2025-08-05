import * as React from "react";
import { Heart, ThumbsUp, Award, Users, Lightbulb, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactionType } from "@/types/feed";

interface ReactionButtonProps {
  type: ReactionType;
  count: number;
  isActive: boolean;
  onClick: () => void;
  showCount?: boolean;
  size?: 'sm' | 'md';
}

const reactionConfig: Record<ReactionType, { icon: React.ComponentType<any>; label: string; color: string; activeColor: string }> = {
  like: {
    icon: ThumbsUp,
    label: "Like",
    color: "text-muted-foreground",
    activeColor: "text-blue-600"
  },
  love: {
    icon: Heart,
    label: "Love",
    color: "text-muted-foreground",
    activeColor: "text-red-500"
  },
  celebrate: {
    icon: Award,
    label: "Celebrate",
    color: "text-muted-foreground",
    activeColor: "text-yellow-500"
  },
  support: {
    icon: Users,
    label: "Support",
    color: "text-muted-foreground",
    activeColor: "text-green-500"
  },
  insightful: {
    icon: Lightbulb,
    label: "Insightful",
    color: "text-muted-foreground",
    activeColor: "text-purple-500"
  },
  curious: {
    icon: HelpCircle,
    label: "Curious",
    color: "text-muted-foreground",
    activeColor: "text-orange-500"
  }
};

export const ReactionButton = ({ 
  type, 
  count, 
  isActive, 
  onClick, 
  showCount = true,
  size = 'md'
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
      className={cn(
        "flex items-center space-x-1 px-3 py-1.5 rounded-full transition-all hover:bg-muted/50",
        isActive && "bg-muted"
      )}
    >
      <Icon 
        className={cn(
          sizeClasses[size],
          isActive ? config.activeColor : config.color,
          "transition-colors"
        )} 
      />
      {showCount && count > 0 && (
        <span className={cn(
          "text-sm font-medium",
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
      initial={{ opacity: 0, scale: 0.9, y: position === 'top' ? 10 : -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: position === 'top' ? 10 : -10 }}
      className={cn(
        "absolute left-0 z-10 flex items-center space-x-2 bg-background border rounded-full shadow-lg p-2",
        position === 'top' ? "bottom-full mb-2" : "top-full mt-2"
      )}
    >
      {reactions.map((reaction) => {
        const config = reactionConfig[reaction];
        const Icon = config.icon;
        const isActive = currentReaction === reaction;
        
        return (
          <motion.button
            key={reaction}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onReactionSelect(reaction)}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full transition-all hover:bg-muted",
              isActive && "bg-muted"
            )}
            title={config.label}
          >
            <Icon 
              className={cn(
                "h-5 w-5",
                isActive ? config.activeColor : config.color
              )} 
            />
          </motion.button>
        );
      })}
    </motion.div>
  );
};