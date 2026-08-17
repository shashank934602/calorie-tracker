import { z } from 'zod';

export const aiCoachRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(500, 'Message cannot exceed 500 characters'),
  timezoneOffset: z.coerce.number().optional().default(0),
});

export type AiCoachRequestInput = z.infer<typeof aiCoachRequestSchema>;

/**
 * Schema for validating the raw JSON returned by Google Gemini
 */
export const aiCoachRawResponseSchema = z.object({
  reply: z.string().min(1, 'Reply must not be empty'),
  suggestedActions: z.array(z.string()).default([]),
  safetyFlagged: z.boolean().optional().default(false),
});

export type RawAiCoachResponse = z.infer<typeof aiCoachRawResponseSchema>;

/**
 * Context snapshot schema passed into AI Coach prompt
 */
export interface AiCoachVerifiedContext {
  userProfile: {
    age: number;
    sex: string;
    heightCm: number;
    weightKg: number;
    targetWeightKg: number | null;
    activityLevel: string;
    goal: string;
  } | null;
  targets: {
    dailyCalories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    tdee: number;
  };
  todaySummary: {
    date: string;
    consumedCalories: number;
    consumedProtein: number;
    consumedCarbs: number;
    consumedFat: number;
    remainingCalories: number;
    remainingProtein: number;
    remainingCarbs: number;
    remainingFat: number;
    mealsLogged: string[];
  };
  recentAnalytics7d: {
    averageDailyCalories: number;
    calorieDelta: number;
    loggingConsistencyPct: number;
    currentStreakDays: number;
    targetAdherencePct: number;
  };
  weightProgress: {
    startingWeightKg: number;
    currentWeightKg: number;
    targetWeightKg: number | null;
    totalChangeKg: number;
    percentageProgress: number | null;
  };
}

/**
 * Final client-facing response schema
 */
export interface AiCoachClientResponse {
  reply: string;
  suggestedActions: string[];
  contextHighlights: {
    remainingCalories: number;
    remainingProtein: number;
    currentStreak: number;
  };
  disclaimer: string;
}
