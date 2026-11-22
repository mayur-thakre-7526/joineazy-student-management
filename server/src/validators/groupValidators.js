import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z
    .string({ required_error: 'Group name is required' })
    .trim()
    .min(2, 'Group name must be at least 2 characters')
    .max(100, 'Group name cannot exceed 100 characters'),
});

export const inviteSchema = z
  .object({
    email: z.string().trim().email('Invalid email address format').optional(),
    student_id: z.string().uuid('Invalid student ID format (must be UUID)').optional(),
  })
  .refine((data) => data.email || data.student_id, {
    message: 'Either email or student_id must be provided to send an invitation',
  });

export const respondSchema = z.object({
  action: z.enum(['ACCEPT', 'REJECT'], {
    required_error: 'Action must be either ACCEPT or REJECT',
  }),
});

export const uuidParamSchema = z.string().uuid('Invalid identifier format (must be a valid UUID)');
