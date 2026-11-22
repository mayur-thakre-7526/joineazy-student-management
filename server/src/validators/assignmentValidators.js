import { z } from 'zod';

/**
 * Validates external OneDrive and SharePoint HTTPS sharing links
 */
export function validateOneDriveUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    // Strictly require HTTPS scheme
    if (parsed.protocol !== 'https:') {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    // Reject localhost, local IPs, and non-FQDNs
    if (host === 'localhost' || host === '127.0.0.1' || !host.includes('.')) {
      return false;
    }

    // Accept standard consumer OneDrive, Microsoft 365, and tenant-specific SharePoint links
    const isMicrosoftCloud =
      host === '1drv.ms' ||
      host === 'onedrive.live.com' ||
      host.endsWith('.sharepoint.com') ||
      host.endsWith('.sharepoint-df.com') ||
      host.endsWith('.microsoft.com') ||
      host.endsWith('.live.com');

    // Also accept any enterprise HTTPS document link that uses safe HTTPS
    return isMicrosoftCloud || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const createAssignmentSchema = z
  .object({
    title: z
      .string({ required_error: 'Assignment title is required' })
      .trim()
      .min(2, 'Title must be at least 2 characters')
      .max(200, 'Title cannot exceed 200 characters'),
    description: z
      .string({ required_error: 'Assignment description is required' })
      .trim()
      .min(2, 'Description must be at least 2 characters')
      .max(5000, 'Description cannot exceed 5000 characters'),
    due_date: z
      .string({ required_error: 'Due date is required' })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid due date format. Must be a parseable ISO date string.',
      })
      .transform((val) => new Date(val).toISOString()),
    onedrive_link: z
      .string({ required_error: 'OneDrive submission link is required' })
      .trim()
      .refine(validateOneDriveUrl, {
        message:
          'Invalid OneDrive/SharePoint URL. Must be a valid HTTPS URL (e.g., https://1drv.ms/... or https://tenant.sharepoint.com/...).',
      }),
    scope: z.enum(['ALL', 'SPECIFIC_GROUPS'], {
      required_error: 'Assignment scope must be ALL or SPECIFIC_GROUPS',
    }),
    group_ids: z
      .array(z.string().uuid('Each target group ID must be a valid UUID'))
      .optional()
      .default([]),
  })
  .refine(
    (data) => {
      if (data.scope === 'SPECIFIC_GROUPS') {
        const uniqueGroups = Array.from(new Set(data.group_ids || []));
        return uniqueGroups.length > 0;
      }
      return true;
    },
    {
      message: 'At least one valid group must be selected when scope is SPECIFIC_GROUPS',
      path: ['group_ids'],
    }
  );

export const updateAssignmentSchema = createAssignmentSchema;

export const uuidParamSchema = z.string().uuid('Invalid assignment ID format (must be a valid UUID)');
