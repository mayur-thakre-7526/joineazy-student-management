import { z } from 'zod';

export const createCourseSchema = z.object({
  title: z
    .string({ required_error: 'Course title is required' })
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(255, 'Title cannot exceed 255 characters'),
  course_code: z
    .string({ required_error: 'Course code is required' })
    .trim()
    .min(2, 'Course code must be at least 2 characters')
    .max(50, 'Course code cannot exceed 50 characters')
    .regex(
      /^[A-Za-z0-9_-]+$/,
      'Course code must only contain alphanumeric characters, underscores, and hyphens (e.g. CS101, SE-2026)'
    )
    .transform((val) => val.toUpperCase()),
  description: z
    .string()
    .trim()
    .max(5000, 'Description cannot exceed 5000 characters')
    .optional()
    .default(''),
});

export const enrollCourseSchema = z.object({
  course_code: z
    .string({ required_error: 'Course code is required' })
    .trim()
    .min(2, 'Course code must be at least 2 characters')
    .max(50, 'Course code cannot exceed 50 characters')
    .transform((val) => val.toUpperCase()),
});

export const uuidParamSchema = z
  .string()
  .uuid('Invalid course ID format. Must be a valid UUID.');
