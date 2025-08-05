export interface User {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  verified?: boolean;
  title?: string;
  company?: string;
}

export interface PostMedia {
  id: string;
  type: 'image' | 'video' | 'document';
  url: string;
  thumbnail?: string;
  alt?: string;
  caption?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  expiresAt?: Date;
  allowMultiple?: boolean;
  userVote?: string[];
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  isVirtual?: boolean;
  attendees: number;
  maxAttendees?: number;
  userRSVP?: 'going' | 'interested' | 'not_going';
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  salary?: string;
  description: string;
  requirements: string[];
  applications: number;
  userApplied?: boolean;
}

export interface LinkPreview {
  url: string;
  title: string;
  description?: string;
  image?: string;
  domain: string;
}

export type PostType = 'text' | 'image' | 'video' | 'article' | 'poll' | 'event' | 'job' | 'document' | 'link' | 'carousel';

export type ReactionType = 'like' | 'love' | 'celebrate' | 'support' | 'insightful' | 'curious';

export interface Reaction {
  id: string;
  type: ReactionType;
  user: User;
  createdAt: Date;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  createdAt: Date;
  reactions: Reaction[];
  replies?: Comment[];
  parentId?: string;
  edited?: boolean;
  editedAt?: Date;
}

export interface Post {
  id: string;
  type: PostType;
  author: User;
  content: string;
  media?: PostMedia[];
  poll?: Poll;
  event?: Event;
  job?: Job;
  linkPreview?: LinkPreview;
  hashtags: string[];
  mentions: User[];
  reactions: Reaction[];
  comments: Comment[];
  shares: number;
  saves: number;
  views: number;
  createdAt: Date;
  updatedAt?: Date;
  edited?: boolean;
  isPinned?: boolean;
  visibility: 'public' | 'connections' | 'private';
  userReaction?: ReactionType;
  userSaved?: boolean;
  userShared?: boolean;
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
  type: PostType;
  content: string;
  media?: File[];
  poll?: Omit<Poll, 'id' | 'totalVotes' | 'userVote'>;
  event?: Omit<Event, 'id' | 'attendees' | 'userRSVP'>;
  job?: Omit<Job, 'id' | 'applications' | 'userApplied'>;
  visibility: Post['visibility'];
  hashtags: string[];
  mentions: string[];
}