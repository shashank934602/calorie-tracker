import { z } from 'zod';

export const profileSchema = z.object({
  age: z
    .number({ required_error: 'Age is required' })
    .int('Age must be an integer')
    .min(13, 'Age must be at least 13 years old')
    .max(120, 'Age cannot exceed 120 years'),
  sex: z.enum(['male', 'female'], {
    required_error: 'Sex is required (must be male or female)',
  }),
  heightCm: z
    .number({ required_error: 'Height in cm is required' })
    .min(50, 'Height must be at least 50 cm')
    .max(300, 'Height cannot exceed 300 cm'),
  weightKg: z
    .number({ required_error: 'Weight in kg is required' })
    .min(20, 'Weight must be at least 20 kg')
    .max(500, 'Weight cannot exceed 500 kg'),
  targetWeightKg: z
    .number()
    .min(20, 'Target weight must be at least 20 kg')
    .max(500, 'Target weight cannot exceed 500 kg')
    .optional()
    .nullable(),
  activityLevel: z.enum(
    [
      'sedentary',
      'lightly_active',
      'moderately_active',
      'very_active',
      'extremely_active',
    ],
    {
      required_error: 'Activity level is required',
    }
  ),
  goal: z.enum(['lose_weight', 'maintain_weight', 'gain_weight'], {
    required_error: 'Goal is required',
  }),
});

export type ProfileInput = z.infer<typeof profileSchema>;
