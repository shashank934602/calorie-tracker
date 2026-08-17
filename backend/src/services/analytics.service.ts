import { prisma } from '../config/prisma';
import { profileService } from './profile.service';
import { foodCalculator } from './food-calculator.service';
import {
  analyticsCalculator,
  DailyAggregatedMetrics,
  AdherenceMetrics,
  AverageNutritionMetrics,
  MacroSplitMetrics,
  MealDistributionMetrics,
  EnergyBalanceEstimateMetrics,
} from './analytics-calculator.service';
import { AnalyticsQueryInput } from '../schemas/analytics.schema';

export interface AnalyticsPeriodInfo {
  range: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  loggedDaysCount: number;
}

export interface AnalyticsSummaryResponse {
  period: AnalyticsPeriodInfo;
  adherence: AdherenceMetrics;
  averages: AverageNutritionMetrics;
  macroSplit: MacroSplitMetrics;
  mealDistribution: MealDistributionMetrics;
  energyBalance: EnergyBalanceEstimateMetrics;
}

export interface AnalyticsTrendsResponse {
  period: AnalyticsPeriodInfo;
  days: DailyAggregatedMetrics[];
}

export class AnalyticsService {
  /**
   * Resolves date boundaries (start & end) and all intermediate local dates (YYYY-MM-DD).
   */
  private resolveDateRange(
    query: AnalyticsQueryInput
  ): { startDate: string; endDate: string; allDates: string[]; startUtc: Date; endUtc: Date } {
    const { range, startDate, endDate, timezoneOffset = 0 } = query;

    let startStr: string;
    let endStr: string;

    const now = new Date();
    const localNow = new Date(now.getTime() - timezoneOffset * 60 * 1000);
    const todayStr = localNow.toISOString().split('T')[0];

    if (range === 'custom' && startDate && endDate) {
      startStr = startDate;
      endStr = endDate;
    } else {
      const daysCount = range === '7d' ? 7 : range === '90d' ? 90 : 30;
      const startLocal = new Date(localNow);
      startLocal.setDate(startLocal.getDate() - (daysCount - 1));
      startStr = startLocal.toISOString().split('T')[0];
      endStr = todayStr;
    }

    // Build list of continuous local dates
    const allDates: string[] = [];
    const curr = new Date(startStr + 'T00:00:00Z');
    const end = new Date(endStr + 'T00:00:00Z');

    while (curr <= end) {
      allDates.push(curr.toISOString().split('T')[0]);
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    // Calculate exact UTC query range for database filter
    const [sY, sM, sD] = startStr.split('-').map(Number);
    const [eY, eM, eD] = endStr.split('-').map(Number);

    const startUtcMs = Date.UTC(sY, sM - 1, sD, 0, 0, 0, 0) + timezoneOffset * 60 * 1000;
    const endUtcMs = Date.UTC(eY, eM - 1, eD, 23, 59, 59, 999) + timezoneOffset * 60 * 1000;

    return {
      startDate: startStr,
      endDate: endStr,
      allDates,
      startUtc: new Date(startUtcMs),
      endUtc: new Date(endUtcMs),
    };
  }

  /**
   * Aggregates raw food and weight entries into contiguous daily time-series buckets.
   */
  private async getAggregatedDailyMetrics(
    userId: string,
    query: AnalyticsQueryInput
  ): Promise<{
    days: DailyAggregatedMetrics[];
    period: AnalyticsPeriodInfo;
    targetCalories: number;
    targetMacros: { protein: number; carbs: number; fat: number };
    tdee: number;
    actualWeightChangeKg: number | null;
  }> {
    const { startDate, endDate, allDates, startUtc, endUtc } = this.resolveDateRange(query);
    const timezoneOffset = query.timezoneOffset || 0;

    // 1. Fetch Profile targets
    let targetCalories = 2000;
    let tdee = 2000;
    let targetMacros = { protein: 140, carbs: 220, fat: 60 };

    try {
      const profileData = await profileService.getProfile(userId);
      if (profileData?.targets) {
        targetCalories = profileData.targets.dailyCalories;
        tdee = profileData.targets.tdee;
        targetMacros = {
          protein: profileData.targets.proteinGrams,
          carbs: profileData.targets.carbsGrams,
          fat: profileData.targets.fatGrams,
        };
      }
    } catch {
      // Use defaults if profile not setup
    }

    // 2. Fetch Food Entries and Weight Entries in range
    const [foodEntries, weightEntries] = await Promise.all([
      prisma.foodEntry.findMany({
        where: {
          userId,
          consumedAt: { gte: startUtc, lte: endUtc },
        },
        include: { food: true },
        orderBy: { consumedAt: 'asc' },
      }),
      prisma.weightEntry.findMany({
        where: {
          userId,
          recordedAt: { gte: startUtc, lte: endUtc },
        },
        orderBy: { recordedAt: 'asc' },
      }),
    ]);

    // 3. Initialize daily map for all dates
    const dailyMap: Map<string, DailyAggregatedMetrics> = new Map();
    for (const d of allDates) {
      dailyMap.set(d, {
        date: d,
        hasLogs: false,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        weightKg: null,
        meals: {
          breakfast: 0,
          lunch: 0,
          dinner: 0,
          snack: 0,
        },
      });
    }

    // 4. Map Food Entries into local calendar days
    for (const entry of foodEntries) {
      const localDate = new Date(entry.consumedAt.getTime() - timezoneOffset * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const dayBucket = dailyMap.get(localDate);
      if (dayBucket) {
        dayBucket.hasLogs = true;
        const nutrition = foodCalculator.calculateNutrition(entry.food, entry.quantityGrams);
        dayBucket.calories += nutrition.calories;
        dayBucket.protein += nutrition.protein;
        dayBucket.carbs += nutrition.carbs;
        dayBucket.fat += nutrition.fat;

        if (dayBucket.meals[entry.mealType] !== undefined) {
          dayBucket.meals[entry.mealType] += nutrition.calories;
        }
      }
    }

    // 5. Map Weight Entries into local calendar days (latest weight recorded for that day)
    for (const w of weightEntries) {
      const localDate = new Date(w.recordedAt.getTime() - timezoneOffset * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const dayBucket = dailyMap.get(localDate);
      if (dayBucket) {
        dayBucket.weightKg = w.weightKg;
      }
    }

    // 6. Round daily nutrition values
    const days: DailyAggregatedMetrics[] = [];
    for (const d of allDates) {
      const day = dailyMap.get(d)!;
      days.push({
        date: day.date,
        hasLogs: day.hasLogs,
        calories: Math.round(day.calories),
        protein: Math.round(day.protein * 10) / 10,
        carbs: Math.round(day.carbs * 10) / 10,
        fat: Math.round(day.fat * 10) / 10,
        weightKg: day.weightKg,
        meals: {
          breakfast: Math.round(day.meals.breakfast),
          lunch: Math.round(day.meals.lunch),
          dinner: Math.round(day.meals.dinner),
          snack: Math.round(day.meals.snack),
        },
      });
    }

    // Calculate actual weight change over period if weight entries exist
    let actualWeightChangeKg: number | null = null;
    if (weightEntries.length >= 2) {
      const startW = weightEntries[0].weightKg;
      const endW = weightEntries[weightEntries.length - 1].weightKg;
      actualWeightChangeKg = Math.round((endW - startW) * 10) / 10;
    }

    const period: AnalyticsPeriodInfo = {
      range: query.range,
      startDate,
      endDate,
      totalDays: allDates.length,
      loggedDaysCount: days.filter((d) => d.hasLogs).length,
    };

    return {
      days,
      period,
      targetCalories,
      targetMacros,
      tdee,
      actualWeightChangeKg,
    };
  }

  /**
   * Retrieves high-level analytics summary metrics for the given period.
   */
  async getSummary(userId: string, query: AnalyticsQueryInput): Promise<AnalyticsSummaryResponse> {
    const {
      days,
      period,
      targetCalories,
      targetMacros,
      tdee,
      actualWeightChangeKg,
    } = await this.getAggregatedDailyMetrics(userId, query);

    const loggedDays = days.filter((d) => d.hasLogs);

    const adherence = analyticsCalculator.calculateAdherence(days, targetCalories);
    const averages = analyticsCalculator.calculateAverages(loggedDays, targetCalories, targetMacros);
    const macroSplit = analyticsCalculator.calculateMacroSplit(averages, targetCalories);
    const mealDistribution = analyticsCalculator.calculateMealDistribution(days);
    const energyBalance = analyticsCalculator.calculateEstimatedEnergyBalance(
      loggedDays,
      tdee,
      actualWeightChangeKg
    );

    return {
      period,
      adherence,
      averages,
      macroSplit,
      mealDistribution,
      energyBalance,
    };
  }

  /**
   * Retrieves daily time-series metrics for trends and visual charts.
   */
  async getTrends(userId: string, query: AnalyticsQueryInput): Promise<AnalyticsTrendsResponse> {
    const { days, period } = await this.getAggregatedDailyMetrics(userId, query);
    return { period, days };
  }
}

export const analyticsService = new AnalyticsService();
