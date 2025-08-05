import { create } from 'zustand';
import type { Post, FeedSettings, CreatePostData, ReactionType } from '@/types/feed';

interface FeedState {
  posts: Post[];
  loading: boolean;
  hasMore: boolean;
  feedSettings: FeedSettings;
  
  // Actions
  loadPosts: (reset?: boolean) => Promise<void>;
  createPost: (data: CreatePostData) => Promise<void>;
  updatePost: (postId: string, updates: Partial<Post>) => void;
  deletePost: (postId: string) => void;
  
  // Engagement actions
  toggleReaction: (postId: string, reaction: ReactionType) => void;
  addComment: (postId: string, content: string, parentId?: string) => void;
  deleteComment: (postId: string, commentId: string) => void;
  toggleSave: (postId: string) => void;
  sharePost: (postId: string) => void;
  
  // Settings
  updateFeedSettings: (settings: Partial<FeedSettings>) => void;
}

// Mock data generator
const generateMockPosts = (count: number, startIndex: number = 0): Post[] => {
  const mockUsers = [
    { id: '1', name: 'Sarah Johnson', username: 'sarahj', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b5e5?w=150&h=150&fit=crop&crop=face' },
    { id: '2', name: 'Mike Chen', username: 'mikechen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' },
    { id: '3', name: 'Alex Rivera', username: 'alexr', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face' },
  ];

  const postTypes: Post['type'][] = ['text', 'image', 'poll', 'article', 'event'];
  const reactions: ReactionType[] = ['like', 'love', 'celebrate', 'support'];

  return Array.from({ length: count }, (_, i) => {
    const index = startIndex + i;
    const author = mockUsers[index % mockUsers.length];
    const type = postTypes[index % postTypes.length];
    
    const basePost: Omit<Post, 'type' | 'content' | 'poll' | 'event'> = {
      id: `post-${index}`,
      author,
      media: type === 'image' ? [{
        id: `media-${index}`,
        type: 'image',
        url: `https://images.unsplash.com/photo-${1500000000000 + index}?w=800&h=600&fit=crop`,
        alt: 'Post image'
      }] : undefined,
      hashtags: ['#technology', '#innovation'][Math.random() > 0.5 ? 0 : 1] ? ['#technology'] : ['#innovation'],
      mentions: [],
      reactions: Array.from({ length: Math.floor(Math.random() * 50) }, (_, j) => ({
        id: `reaction-${index}-${j}`,
        type: reactions[j % reactions.length],
        user: mockUsers[j % mockUsers.length],
        createdAt: new Date(Date.now() - Math.random() * 86400000)
      })),
      comments: Array.from({ length: Math.floor(Math.random() * 10) }, (_, j) => ({
        id: `comment-${index}-${j}`,
        content: `This is a great comment about the post! Really insightful content.`,
        author: mockUsers[j % mockUsers.length],
        createdAt: new Date(Date.now() - Math.random() * 3600000),
        reactions: []
      })),
      shares: Math.floor(Math.random() * 25),
      saves: Math.floor(Math.random() * 15),
      views: Math.floor(Math.random() * 500),
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 7),
      visibility: 'public',
      userReaction: Math.random() > 0.7 ? reactions[Math.floor(Math.random() * reactions.length)] : undefined,
      userSaved: Math.random() > 0.8,
      userShared: Math.random() > 0.9
    };

    switch (type) {
      case 'text':
        return {
          ...basePost,
          type: 'text',
          content: `This is an engaging text post with some interesting thoughts about technology and innovation. What do you think about the future of digital transformation? #technology #innovation`
        };
      
      case 'image':
        return {
          ...basePost,
          type: 'image',
          content: `Check out this amazing view! Sometimes you need to step back and appreciate the beauty around us. 📸✨`
        };
      
      case 'poll':
        return {
          ...basePost,
          type: 'poll',
          content: `What's your preferred work setup in 2024?`,
          poll: {
            id: `poll-${index}`,
            question: "What's your preferred work setup?",
            options: [
              { id: '1', text: 'Fully Remote', votes: 45, percentage: 45 },
              { id: '2', text: 'Hybrid', votes: 35, percentage: 35 },
              { id: '3', text: 'Office-based', votes: 20, percentage: 20 }
            ],
            totalVotes: 100,
            expiresAt: new Date(Date.now() + 86400000 * 7)
          }
        };
      
      case 'article':
        return {
          ...basePost,
          type: 'article',
          content: `I just published a new article about the latest trends in web development. Here are the key takeaways that every developer should know...`,
          linkPreview: {
            url: 'https://example.com/article',
            title: 'The Future of Web Development: Trends to Watch in 2024',
            description: 'Exploring the latest technologies and methodologies shaping modern web development.',
            image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop',
            domain: 'example.com'
          }
        };
      
      case 'event':
        return {
          ...basePost,
          type: 'event',
          content: `Join us for an exciting tech meetup! Don't miss this opportunity to network and learn.`,
          event: {
            id: `event-${index}`,
            title: 'Tech Innovation Meetup 2024',
            description: 'Connect with fellow developers and learn about the latest in tech innovation.',
            startDate: new Date(Date.now() + 86400000 * 30),
            location: 'San Francisco, CA',
            attendees: 127,
            maxAttendees: 200
          }
        };
      
      default:
        return {
          ...basePost,
          type: 'text',
          content: 'Default post content'
        };
    }
  });
};

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  loading: false,
  hasMore: true,
  feedSettings: {
    showRecentFirst: true,
    contentTypes: ['text', 'image', 'video', 'article', 'poll', 'event', 'job'],
    showFromConnections: true,
    showFromCompanies: true,
    showTrending: true,
    filterHashtags: []
  },

  loadPosts: async (reset = false) => {
    const state = get();
    if (state.loading) return;

    set({ loading: true });

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const currentLength = reset ? 0 : state.posts.length;
      const newPosts = generateMockPosts(10, currentLength);
      
      set({
        posts: reset ? newPosts : [...state.posts, ...newPosts],
        loading: false,
        hasMore: currentLength + newPosts.length < 100 // Simulate finite feed
      });
    } catch (error) {
      set({ loading: false });
    }
  },

  createPost: async (data: CreatePostData) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newPost: Post = {
      id: `post-${Date.now()}`,
      type: data.type,
      author: {
        id: 'current-user',
        name: 'You',
        username: 'you',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      },
      content: data.content,
      hashtags: data.hashtags,
      mentions: [],
      reactions: [],
      comments: [],
      shares: 0,
      saves: 0,
      views: 0,
      createdAt: new Date(),
      visibility: data.visibility,
      poll: data.poll as any,
      event: data.event as any,
      job: data.job as any
    };

    set(state => ({
      posts: [newPost, ...state.posts]
    }));
  },

  updatePost: (postId: string, updates: Partial<Post>) => {
    set(state => ({
      posts: state.posts.map(post =>
        post.id === postId ? { ...post, ...updates } : post
      )
    }));
  },

  deletePost: (postId: string) => {
    set(state => ({
      posts: state.posts.filter(post => post.id !== postId)
    }));
  },

  toggleReaction: (postId: string, reaction: ReactionType) => {
    set(state => ({
      posts: state.posts.map(post => {
        if (post.id !== postId) return post;
        
        const hasReaction = post.userReaction === reaction;
        return {
          ...post,
          userReaction: hasReaction ? undefined : reaction,
          reactions: hasReaction
            ? post.reactions.filter(r => r.user.id !== 'current-user')
            : [
                ...post.reactions.filter(r => r.user.id !== 'current-user'),
                {
                  id: `reaction-${Date.now()}`,
                  type: reaction,
                  user: {
                    id: 'current-user',
                    name: 'You',
                    username: 'you'
                  },
                  createdAt: new Date()
                }
              ]
        };
      })
    }));
  },

  addComment: (postId: string, content: string, parentId?: string) => {
    const newComment = {
      id: `comment-${Date.now()}`,
      content,
      author: {
        id: 'current-user',
        name: 'You',
        username: 'you',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      },
      createdAt: new Date(),
      reactions: [],
      parentId
    };

    set(state => ({
      posts: state.posts.map(post => {
        if (post.id !== postId) return post;
        
        return {
          ...post,
          comments: [...post.comments, newComment]
        };
      })
    }));
  },

  deleteComment: (postId: string, commentId: string) => {
    set(state => ({
      posts: state.posts.map(post => {
        if (post.id !== postId) return post;
        
        return {
          ...post,
          comments: post.comments.filter(c => c.id !== commentId)
        };
      })
    }));
  },

  toggleSave: (postId: string) => {
    set(state => ({
      posts: state.posts.map(post => {
        if (post.id !== postId) return post;
        
        return {
          ...post,
          userSaved: !post.userSaved,
          saves: post.userSaved ? post.saves - 1 : post.saves + 1
        };
      })
    }));
  },

  sharePost: (postId: string) => {
    set(state => ({
      posts: state.posts.map(post => {
        if (post.id !== postId) return post;
        
        return {
          ...post,
          userShared: true,
          shares: post.shares + 1
        };
      })
    }));
  },

  updateFeedSettings: (settings: Partial<FeedSettings>) => {
    set(state => ({
      feedSettings: { ...state.feedSettings, ...settings }
    }));
  }
}));