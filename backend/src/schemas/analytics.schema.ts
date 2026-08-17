import { z } from 'zod';

export const analyticsQuerySchema = z
  .object({
    range: z.enum(['7d', '30d', '90d', 'custom']).default('30d'),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in YYYY-MM-DD format')
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in YYYY-MM-DD format')
      .optional(),
    timezoneOffset: z.coerce.number().optional().default(0),
  })
  .refine(
    (data) => {
      if (data.range === 'custom') {
        if (!data.startDate || !data.endDate) {
          return false;
        }
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        if (start > end) {
          return false;
        }
        // Enforce maximum custom analytics range of 365 days
        const diffMs = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
        return diffDays <= 365;
      }
      return true;
    },
    {
      message:
        'For custom range, both startDate and endDate are required, startDate must not be after endDate, and the maximum allowed range is 365 days.',
      path: ['range'],
    }
  );

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
