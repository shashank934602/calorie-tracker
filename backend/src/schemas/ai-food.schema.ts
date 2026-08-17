import { z } from 'zod';
import { mealTypeEnum } from './food-entry.schema';

export const aiFoodParseRequestSchema = z.object({
  text: z
    .string({ required_error: 'Food description text is required' })
    .trim()
    .min(2, 'Food description must be at least 2 characters long')
    .max(500, 'Food description cannot exceed 500 characters'),
});

export const rawAiParsedItemSchema = z.object({
  rawText: z.string(),
  foodName: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  notes: z.string().optional(),
});

export const rawAiParsedResponseSchema = z.object({
  mealType: mealTypeEnum,
  items: z.array(rawAiParsedItemSchema),
});

export type AiFoodParseRequest = z.infer<typeof aiFoodParseRequestSchema>;
export type RawAiParsedItem = z.infer<typeof rawAiParsedItemSchema>;
export type RawAiParsedResponse = z.infer<typeof rawAiParsedResponseSchema>;
