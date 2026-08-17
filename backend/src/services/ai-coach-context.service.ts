import { profileService } from './profile.service';
import { dailySummaryService } from './daily-summary.service';
import { analyticsService } from './analytics.service';
import { weightService } from './weight.service';
import { AiCoachVerifiedContext } from '../schemas/ai-coach.schema';

export class AiCoachContextService {
  /**
   * Builds a verified, deterministic context snapshot for the user.
   */
  async buildContext(userId: string, timezoneOffset: number = 0): Promise<AiCoachVerifiedContext> {
    // 1. Concurrently fetch profile, today's summary, 7-day analytics, and weight summary
    const [profileData, todaySummary, analytics7d, weightSummary] = await Promise.all([
      profileService.getProfile(userId).catch(() => null),
      dailySummaryService.getDailySummary(userId, undefined, timezoneOffset).catch(() => null),
      analyticsService.getSummary(userId, { range: '7d', timezoneOffset }).catch(() => null),
      weightService.getWeightSummary(userId).catch(() => null),
    ]);

    // 2. Extract profile & target information
    const userProfile = profileData?.profile
      ? {
          age: profileData.profile.age,
          sex: profileData.profile.sex,
          heightCm: profileData.profile.heightCm,
          weightKg: profileData.profile.weightKg,
          targetWeightKg: profileData.profile.targetWeightKg,
          activityLevel: profileData.profile.activityLevel,
          goal: profileData.profile.goal,
        }
      : null;

    const targets = {
      dailyCalories: profileData?.targets.dailyCalories || 2000,
      proteinGrams: profileData?.targets.proteinGrams || 140,
      carbsGrams: profileData?.targets.carbsGrams || 220,
      fatGrams: profileData?.targets.fatGrams || 60,
      tdee: profileData?.targets.tdee || 2000,
    };

    // 3. Extract today's logged meals and remaining macros
    const mealsLogged: string[] = [];
    if (todaySummary?.meals) {
      for (const [mealType, group] of Object.entries(todaySummary.meals)) {
        if (group.entries && group.entries.length > 0) {
          mealsLogged.push(mealType);
        }
      }
    }

    const todaySnapshot = {
      date: todaySummary?.date || new Date().toISOString().split('T')[0],
      consumedCalories: todaySummary?.consumed.calories || 0,
      consumedProtein: todaySummary?.consumed.protein || 0,
      consumedCarbs: todaySummary?.consumed.carbs || 0,
      consumedFat: todaySummary?.consumed.fat || 0,
      remainingCalories: todaySummary?.remaining.calories ?? targets.dailyCalories,
      remainingProtein: todaySummary?.remaining.protein ?? targets.proteinGrams,
      remainingCarbs: todaySummary?.remaining.carbs ?? targets.carbsGrams,
      remainingFat: todaySummary?.remaining.fat ?? targets.fatGrams,
      mealsLogged,
    };

    // 4. Extract recent 7-day adherence and streak
    const recentAnalytics7d = {
      averageDailyCalories: analytics7d?.averages.dailyCalories || todaySnapshot.consumedCalories,
      calorieDelta: analytics7d?.averages.calorieDelta || (todaySnapshot.consumedCalories - targets.dailyCalories),
      loggingConsistencyPct: analytics7d?.adherence.loggingRatePct ?? 100,
      currentStreakDays: analytics7d?.adherence.currentStreakDays ?? (mealsLogged.length > 0 ? 1 : 0),
      targetAdherencePct: analytics7d?.adherence.targetAdherencePct ?? 100,
    };

    // 5. Extract weight progress
    const weightProgress = {
      startingWeightKg: weightSummary?.startingWeight ?? userProfile?.weightKg ?? 75,
      currentWeightKg: weightSummary?.currentWeight ?? userProfile?.weightKg ?? 75,
      targetWeightKg: weightSummary?.targetWeight ?? userProfile?.targetWeightKg ?? null,
      totalChangeKg: weightSummary?.totalChange ?? 0,
      percentageProgress: weightSummary?.percentageProgress ?? null,
    };

    return {
      userProfile,
      targets,
      todaySummary: todaySnapshot,
      recentAnalytics7d,
      weightProgress,
    };
  }
}

export const aiCoachContextService = new AiCoachContextService();
