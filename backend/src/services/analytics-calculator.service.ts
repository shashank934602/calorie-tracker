export interface DailyAggregatedMetrics {
  date: string;
  hasLogs: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  weightKg: number | null;
  meals: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
  };
}

export interface AdherenceMetrics {
  loggingRatePct: number;
  currentStreakDays: number;
  targetAdherencePct: number;
  daysOnBudget: number;
  daysOverBudget: number;
  daysUnderBudget: number;
}

export interface AverageNutritionMetrics {
  dailyCalories: number;
  targetCalories: number;
  calorieDelta: number;
  proteinGrams: number;
  targetProteinGrams: number;
  carbsGrams: number;
  targetCarbsGrams: number;
  fatGrams: number;
  targetFatGrams: number;
}

export interface MacroSplitMetrics {
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  targetProteinPct: number;
  targetCarbsPct: number;
  targetFatPct: number;
}

export interface MealDistributionMetrics {
  breakfast: { calories: number; percentage: number };
  lunch: { calories: number; percentage: number };
  dinner: { calories: number; percentage: number };
  snack: { calories: number; percentage: number };
}

export interface EnergyBalanceEstimateMetrics {
  tdee: number;
  estimatedNetPeriodDeficit: number;
  estimatedWeightChangeKg: number;
  actualWeightChangeKg: number | null;
}

export class AnalyticsCalculatorService {
  /**
   * Calculates the current active consecutive logging streak ending on or adjacent to the most recent day.
   */
  public calculateCurrentStreak(days: { date: string; hasLogs: boolean }[]): number {
    if (days.length === 0) return 0;

    // Sort days descending (most recent first)
    const sortedDesc = [...days].sort((a, b) => b.date.localeCompare(a.date));

    let streak = 0;

    // If today or yesterday has a log, count backward
    let startIndex = 0;
    if (!sortedDesc[0].hasLogs) {
      if (sortedDesc.length > 1 && sortedDesc[1].hasLogs) {
        // Most recent day hasn't finished yet, count from previous day
        startIndex = 1;
      } else {
        return 0;
      }
    }

    for (let i = startIndex; i < sortedDesc.length; i++) {
      if (sortedDesc[i].hasLogs) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Calculates logging consistency and calorie target adherence (within +/- 10% budget buffer).
   */
  public calculateAdherence(
    allDays: DailyAggregatedMetrics[],
    targetCalories: number
  ): AdherenceMetrics {
    const totalDays = allDays.length;
    const loggedDays = allDays.filter((d) => d.hasLogs);
    const loggedCount = loggedDays.length;

    const loggingRatePct = totalDays > 0 ? Math.round((loggedCount / totalDays) * 100) : 0;
    const currentStreakDays = this.calculateCurrentStreak(allDays);

    if (loggedCount === 0 || targetCalories <= 0) {
      return {
        loggingRatePct,
        currentStreakDays,
        targetAdherencePct: 0,
        daysOnBudget: 0,
        daysOverBudget: 0,
        daysUnderBudget: 0,
      };
    }

    const lowerBound = targetCalories * 0.9;
    const upperBound = targetCalories * 1.1;

    let daysOnBudget = 0;
    let daysOverBudget = 0;
    let daysUnderBudget = 0;

    for (const day of loggedDays) {
      if (day.calories >= lowerBound && day.calories <= upperBound) {
        daysOnBudget++;
      } else if (day.calories > upperBound) {
        daysOverBudget++;
      } else {
        daysUnderBudget++;
      }
    }

    const targetAdherencePct = Math.round((daysOnBudget / loggedCount) * 100);

    return {
      loggingRatePct,
      currentStreakDays,
      targetAdherencePct,
      daysOnBudget,
      daysOverBudget,
      daysUnderBudget,
    };
  }

  /**
   * Calculates period average daily intakes compared with profile targets.
   */
  public calculateAverages(
    loggedDays: DailyAggregatedMetrics[],
    targetCalories: number,
    targetMacros: { protein: number; carbs: number; fat: number }
  ): AverageNutritionMetrics {
    const count = loggedDays.length;
    if (count === 0) {
      return {
        dailyCalories: 0,
        targetCalories,
        calorieDelta: -targetCalories,
        proteinGrams: 0,
        targetProteinGrams: targetMacros.protein,
        carbsGrams: 0,
        targetCarbsGrams: targetMacros.carbs,
        fatGrams: 0,
        targetFatGrams: targetMacros.fat,
      };
    }

    const totalCals = loggedDays.reduce((acc, d) => acc + d.calories, 0);
    const totalProt = loggedDays.reduce((acc, d) => acc + d.protein, 0);
    const totalCarbs = loggedDays.reduce((acc, d) => acc + d.carbs, 0);
    const totalFat = loggedDays.reduce((acc, d) => acc + d.fat, 0);

    const dailyCalories = Math.round(totalCals / count);
    const proteinGrams = Math.round((totalProt / count) * 10) / 10;
    const carbsGrams = Math.round((totalCarbs / count) * 10) / 10;
    const fatGrams = Math.round((totalFat / count) * 10) / 10;

    return {
      dailyCalories,
      targetCalories,
      calorieDelta: dailyCalories - targetCalories,
      proteinGrams,
      targetProteinGrams: targetMacros.protein,
      carbsGrams,
      targetCarbsGrams: targetMacros.carbs,
      fatGrams,
      targetFatGrams: targetMacros.fat,
    };
  }

  /**
   * Computes the macro caloric distribution percentages (P/C/F) vs target ratios.
   */
  public calculateMacroSplit(
    averages: AverageNutritionMetrics,
    targetCalories: number
  ): MacroSplitMetrics {
    const actualCals = averages.dailyCalories || 1;
    const targetCals = targetCalories || 1;

    const proteinCals = averages.proteinGrams * 4;
    const carbsCals = averages.carbsGrams * 4;
    const fatCals = averages.fatGrams * 9;
    const totalComputedCals = proteinCals + carbsCals + fatCals || actualCals;

    const proteinPct = Math.round((proteinCals / totalComputedCals) * 100);
    const carbsPct = Math.round((carbsCals / totalComputedCals) * 100);
    const fatPct = Math.max(0, 100 - proteinPct - carbsPct);

    const targetProtCals = averages.targetProteinGrams * 4;
    const targetCarbCals = averages.targetCarbsGrams * 4;
    const targetFatCals = averages.targetFatGrams * 9;
    const totalTargetComputed = targetProtCals + targetCarbCals + targetFatCals || targetCals;

    const targetProteinPct = Math.round((targetProtCals / totalTargetComputed) * 100);
    const targetCarbsPct = Math.round((targetCarbCals / totalTargetComputed) * 100);
    const targetFatPct = Math.max(0, 100 - targetProteinPct - targetCarbsPct);

    return {
      proteinPct,
      carbsPct,
      fatPct,
      targetProteinPct,
      targetCarbsPct,
      targetFatPct,
    };
  }

  /**
   * Calculates overall proportion of caloric intake across meal types.
   */
  public calculateMealDistribution(allDays: DailyAggregatedMetrics[]): MealDistributionMetrics {
    let breakfastCals = 0;
    let lunchCals = 0;
    let dinnerCals = 0;
    let snackCals = 0;

    for (const day of allDays) {
      breakfastCals += day.meals.breakfast;
      lunchCals += day.meals.lunch;
      dinnerCals += day.meals.dinner;
      snackCals += day.meals.snack;
    }

    const totalMealCals = breakfastCals + lunchCals + dinnerCals + snackCals;

    if (totalMealCals === 0) {
      return {
        breakfast: { calories: 0, percentage: 0 },
        lunch: { calories: 0, percentage: 0 },
        dinner: { calories: 0, percentage: 0 },
        snack: { calories: 0, percentage: 0 },
      };
    }

    const bPct = Math.round((breakfastCals / totalMealCals) * 100);
    const lPct = Math.round((lunchCals / totalMealCals) * 100);
    const dPct = Math.round((dinnerCals / totalMealCals) * 100);
    const sPct = Math.max(0, 100 - bPct - lPct - dPct);

    const loggedCount = allDays.filter((d) => d.hasLogs).length || 1;

    return {
      breakfast: { calories: Math.round(breakfastCals / loggedCount), percentage: bPct },
      lunch: { calories: Math.round(lunchCals / loggedCount), percentage: lPct },
      dinner: { calories: Math.round(dinnerCals / loggedCount), percentage: dPct },
      snack: { calories: Math.round(snackCals / loggedCount), percentage: sPct },
    };
  }

  /**
   * Estimates cumulative caloric deficit/surplus and theoretical weight impact (~7700 kcal per kg).
   */
  public calculateEstimatedEnergyBalance(
    loggedDays: DailyAggregatedMetrics[],
    tdee: number,
    actualWeightChangeKg: number | null
  ): EnergyBalanceEstimateMetrics {
    if (loggedDays.length === 0 || tdee <= 0) {
      return {
        tdee,
        estimatedNetPeriodDeficit: 0,
        estimatedWeightChangeKg: 0,
        actualWeightChangeKg,
      };
    }

    // Net energy balance = Sum(Daily Calories - TDEE)
    const netEnergyBalance = loggedDays.reduce((acc, day) => acc + (day.calories - tdee), 0);
    const estimatedWeightChangeKg = Math.round((netEnergyBalance / 7700) * 100) / 100;

    return {
      tdee,
      estimatedNetPeriodDeficit: Math.round(netEnergyBalance),
      estimatedWeightChangeKg,
      actualWeightChangeKg,
    };
  }
}

export const analyticsCalculator = new AnalyticsCalculatorService();
