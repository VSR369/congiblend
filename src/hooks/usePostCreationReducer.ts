import { useReducer } from 'react';
import type { PostType } from '@/types/feed';

type EventSpeaker = {
  name: string;
  profile?: string;
  description?: string;
  photo_url?: string;
};

interface PostCreationState {
  activeTab: PostType;
  content: string;
  hashtags: string[];
  mentions: string[];
  isPosting: boolean;
  selectedFiles: File[];
  pollOptions: string[];
  eventData: {
    title: string;
    description: string;
    location: string;
    start_date: string;
    end_date: string;
    max_attendees: string;
    is_virtual: boolean;
    is_hybrid: boolean;
  };
  eventSpeakers: EventSpeaker[];
}

type PostCreationAction =
  | { type: 'SET_ACTIVE_TAB'; payload: PostType }
  | { type: 'SET_CONTENT'; payload: string }
  | { type: 'SET_HASHTAGS'; payload: string[] }
  | { type: 'SET_MENTIONS'; payload: string[] }
  | { type: 'SET_IS_POSTING'; payload: boolean }
  | { type: 'SET_SELECTED_FILES'; payload: File[] }
  | { type: 'SET_POLL_OPTIONS'; payload: string[] }
  | { type: 'SET_EVENT_DATA'; payload: Partial<PostCreationState['eventData']> }
  | { type: 'ADD_EVENT_SPEAKER' }
  | { type: 'UPDATE_EVENT_SPEAKER'; index: number; payload: Partial<EventSpeaker> }
  | { type: 'REMOVE_EVENT_SPEAKER'; index: number }
  | { type: 'RESET_FORM' };

const initialState: PostCreationState = {
  activeTab: 'text',
  content: '',
  hashtags: [],
  mentions: [],
  isPosting: false,
  selectedFiles: [],
  pollOptions: ['', ''],
  eventData: {
    title: '',
    description: '',
    location: '',
    start_date: '',
    end_date: '',
    max_attendees: '',
    is_virtual: false,
    is_hybrid: false
  },
  eventSpeakers: [],
};

function postCreationReducer(state: PostCreationState, action: PostCreationAction): PostCreationState {
  console.log('📝 PostCreation reducer action:', action.type, 'payload' in action ? action.payload : 'no payload');
  
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      console.log('🔄 Switching post type to:', action.payload);
      return { ...state, activeTab: action.payload };
      
    case 'SET_CONTENT':
      console.log('✍️ Content updated, length:', action.payload.length);
      return { ...state, content: action.payload };
      
    case 'SET_HASHTAGS':
      console.log('🏷️ Hashtags updated, count:', action.payload.length);
      return { ...state, hashtags: action.payload };
      
    case 'SET_MENTIONS':
      console.log('👥 Mentions updated, count:', action.payload.length);
      return { ...state, mentions: action.payload };
      
    case 'SET_IS_POSTING':
      console.log('📤 Posting state:', action.payload);
      return { ...state, isPosting: action.payload };
      
    case 'SET_SELECTED_FILES':
      console.log('📎 Files updated, count:', action.payload.length);
      return { ...state, selectedFiles: action.payload };
      
    case 'SET_POLL_OPTIONS':
      console.log('📊 Poll options updated, count:', action.payload.length);
      return { ...state, pollOptions: action.payload };
      
    case 'SET_EVENT_DATA':
      console.log('📅 Event data updated:', Object.keys(action.payload));
      return { 
        ...state, 
        eventData: { ...state.eventData, ...action.payload }
      };
      
    case 'ADD_EVENT_SPEAKER':
      console.log('🎤 Adding new event speaker');
      return {
        ...state,
        eventSpeakers: [
          ...state.eventSpeakers,
          { name: '', profile: '', description: '', photo_url: '' }
        ]
      };

    case 'UPDATE_EVENT_SPEAKER':
      console.log('🛠️ Updating event speaker at index:', (action as any).index);
      return {
        ...state,
        eventSpeakers: state.eventSpeakers.map((s, i) =>
          i === (action as any).index ? { ...s, ...(action as any).payload } : s
        )
      };

    case 'REMOVE_EVENT_SPEAKER':
      console.log('🗑️ Removing event speaker at index:', (action as any).index);
      return {
        ...state,
        eventSpeakers: state.eventSpeakers.filter((_, i) => i !== (action as any).index)
      };
      
    case 'RESET_FORM':
      console.log('🧹 Resetting post creation form');
      return initialState;
      
    default:
      return state;
  }
}

export function usePostCreationReducer() {
  const [state, dispatch] = useReducer(postCreationReducer, initialState);
  
  return { state, dispatch };
}