export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  avatar?: string;
  avatar_url?: string;
  display_name?: string;
  bio?: string;
  verified?: boolean;
  title?: string;
  company?: string;
  location?: string;
  website?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isFollowing?: boolean;
  joinedAt?: Date;
  created_at?: string;
}

export interface PostMedia {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  thumbnail?: string;
  alt?: string;
  caption?: string;
  duration?: number;
  size?: number;
}


export interface Event {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  isVirtual?: boolean;
  isHybrid?: boolean;
  attendees: number;
  maxAttendees?: number;
  userRSVP?: 'attending' | 'interested' | 'not_attending';
  speakers?: Array<{
    name: string;
    profile?: string;
    description?: string;
    photo_url?: string;
  }>;
}


export interface LinkPreview {
  url: string;
  title: string;
  description?: string;
  image?: string;
  domain: string;
}

export type PostType = 'text' | 'image' | 'video' | 'audio' | 'article' | 'event' | 'document' | 'link' | 'carousel' | 'poll';

export type ReactionType = 'innovative' | 'practical' | 'well_researched';

export interface Reaction {
  id: string;
  type: ReactionType;
  user: User;
  createdAt: Date;
}

// Comment interface removed - comments functionality not implemented

export interface Post {
  id: string;
  type: PostType;
  author: User;
  content: string;
  media?: PostMedia[];
  
  // Poll data
  poll?: {
    id: string;
    question: string;
    options: Array<{
      id: string;
      text: string;
      votes: number;
      percentage: number;
    }>;
    endTime: Date;
    totalVotes: number;
    userVote?: string; // option id if user voted
    hasEnded: boolean;
  };
  
  event?: Event;
  event_data?: {
    title: string;
    description?: string;
    start_date: string;
    end_date?: string | null;
    location?: string | null;
    max_attendees?: number | null;
    is_virtual?: boolean;
    is_hybrid?: boolean;
    speakers?: Array<{
      name: string;
      profile?: string;
      description?: string;
      photo_url?: string;
    }>;
  };
  
  linkPreview?: LinkPreview;
  hashtags: string[];
  mentions: User[];
  reactions: Reaction[];
  // Comments removed - functionality not implemented
  likes: number;
  saves: number;
  views: number;
  createdAt: Date;
  updatedAt?: Date;
  edited?: boolean;
  isPinned?: boolean;
  visibility: 'public' | 'connections' | 'private';
  userReaction?: ReactionType;
  userLiked?: boolean;
  userSaved?: boolean;
  isSaved?: boolean;
  isOptimistic?: boolean;
}


export interface FeedSettings {
  showRecentFirst: boolean;
  contentTypes: PostType[];
  showFromConnections: boolean;
  showFromCompanies: boolean;
  showTrending: boolean;
  filterHashtags: string[];
}

export interface CreatePostData {
  content: string;
  post_type?: PostType;
  visibility?: 'public' | 'connections' | 'private';
  media_urls?: string[];
  // Poll data
  poll_data?: {
    question: string;
    options: string[];
    duration_days: number;
  };
  event_data?: {
    title: string;
    description?: string;
    start_date: string;
    end_date?: string | null;
    location?: string | null;
    max_attendees?: number | null;
    is_virtual?: boolean;
    is_hybrid?: boolean;
    speakers?: Array<{
      name: string;
      profile?: string;
      description?: string;
      photo_url?: string;
    }>;
  };
  metadata?: any;
}