import { z } from 'zod';
import { VALIDATION } from './constants';

// Base schemas
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required');

export const passwordSchema = z
  .string()
  .min(VALIDATION.password.minLength, `Password must be at least ${VALIDATION.password.minLength} characters`)
  .regex(
    VALIDATION.password.pattern,
    'Password must contain uppercase, lowercase, number, and special character'
  );

export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s]*$/, 'Name can only contain letters and spaces');

export const phoneSchema = z
  .string()
  .regex(VALIDATION.phone, 'Please enter a valid phone number')
  .optional();

// Auth schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Profile schemas
export const profileSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

// File upload schema
export const fileSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type),
      'Only image files are allowed'
    ),
});

// Search schema
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Query is too long'),
  filters: z.object({
    category: z.string().optional(),
    dateFrom: z.date().optional(),
    dateTo: z.date().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Contact form schema
export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(100),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000),
});

// Custom validation helpers
export const validatePasswordStrength = (password: string) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  
  return {
    score,
    checks,
    strength: score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong',
  };
};

export const validateFileType = (file: File, allowedTypes: string[]) => {
  return allowedTypes.includes(file.type);
};

export const validateFileSize = (file: File, maxSizeInBytes: number) => {
  return file.size <= maxSizeInBytes;
};