import { z } from 'zod';

export const createWeightEntrySchema = z.object({
  weightKg: z
    .number({ required_error: 'Weight in kg is required' })
    .positive('Weight must be greater than 0')
    .min(20, 'Weight must be at least 20 kg')
    .max(500, 'Weight cannot exceed 500 kg'),
  recordedAt: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/))
    .optional(),
  note: z.string().max(500, 'Note cannot exceed 500 characters').trim().optional().nullable(),
});

export const updateWeightEntrySchema = z.object({
  weightKg: z
    .number()
    .positive('Weight must be greater than 0')
    .min(20, 'Weight must be at least 20 kg')
    .max(500, 'Weight cannot exceed 500 kg')
    .optional(),
  recordedAt: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/))
    .optional(),
  note: z.string().max(500, 'Note cannot exceed 500 characters').trim().optional().nullable(),
});

export const weightQuerySchema = z.object({
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
});

export type CreateWeightEntryInput = z.infer<typeof createWeightEntrySchema>;
export type UpdateWeightEntryInput = z.infer<typeof updateWeightEntrySchema>;
export type WeightQuery = z.infer<typeof weightQuerySchema>;
