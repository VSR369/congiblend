// App Configuration
export const APP_CONFIG = {
  name: 'CogniBlend Platform',
  version: '1.0.0',
  description: 'Modern React 18 Application',
  author: 'Lovable',
} as const;

// API Configuration
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  retryAttempts: 3,
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  auth: 'auth-store',
  theme: 'theme-store',
  preferences: 'user-preferences',
  cache: 'app-cache',
} as const;

// Route Paths
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  profile: '/profile',
  settings: '/settings',
  notFound: '/404',
} as const;

// Theme Configuration
export const THEME_CONFIG = {
  defaultTheme: 'light',
  accentColors: [
    '#8B5CF6', // Purple
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5A2B', // Brown
  ],
} as const;

// Pagination
export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
  defaultPage: 1,
} as const;

// File Upload
export const FILE_UPLOAD = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    document: ['application/pdf', 'application/msword', 'text/plain'],
    archive: ['application/zip', 'application/x-rar-compressed'],
  },
} as const;

// Validation
export const VALIDATION = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: {
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  },
  phone: /^[\+]?[1-9][\d]{0,15}$/,
} as const;

// Animation Durations
export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500,
  extraSlow: 1000,
} as const;

// Breakpoints (matching Tailwind)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  network: 'Network error. Please check your connection.',
  unauthorized: 'You are not authorized to perform this action.',
  forbidden: 'Access denied.',
  notFound: 'The requested resource was not found.',
  serverError: 'Internal server error. Please try again later.',
  validation: 'Please check your input and try again.',
  timeout: 'Request timeout. Please try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  saved: 'Data saved successfully!',
  updated: 'Updated successfully!',
  deleted: 'Deleted successfully!',
  created: 'Created successfully!',
  uploaded: 'File uploaded successfully!',
} as const;