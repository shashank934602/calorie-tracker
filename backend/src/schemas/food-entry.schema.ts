import { z } from 'zod';

export const mealTypeEnum = z.enum(['breakfast', 'lunch', 'dinner', 'snack'], {
  required_error: 'Meal type is required (breakfast, lunch, dinner, or snack)',
});

export const createFoodEntrySchema = z.object({
  foodId: z.string({ required_error: 'Food ID is required' }).uuid('Invalid Food ID'),
  quantityGrams: z
    .number({ required_error: 'Quantity in grams is required' })
    .positive('Quantity must be greater than 0')
    .max(10000, 'Quantity cannot exceed 10,000 grams'),
  mealType: mealTypeEnum,
  consumedAt: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/))
    .optional(),
});

export const updateFoodEntrySchema = z.object({
  quantityGrams: z
    .number()
    .positive('Quantity must be greater than 0')
    .max(10000, 'Quantity cannot exceed 10,000 grams')
    .optional(),
  mealType: mealTypeEnum.optional(),
  consumedAt: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/))
    .optional(),
});

export const foodSearchQuerySchema = z.object({
  query: z.string().trim().optional().default(''),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
});

export const dateQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  timezoneOffset: z.coerce.number().int().min(-840).max(840).optional(), // in minutes
});

export type CreateFoodEntryInput = z.infer<typeof createFoodEntrySchema>;
export type UpdateFoodEntryInput = z.infer<typeof updateFoodEntrySchema>;
export type FoodSearchQuery = z.infer<typeof foodSearchQuerySchema>;
export type DateQuery = z.infer<typeof dateQuerySchema>;
