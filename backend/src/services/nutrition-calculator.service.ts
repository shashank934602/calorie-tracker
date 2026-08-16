export type Sex = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extremely_active';

export type Goal = 'lose_weight' | 'maintain_weight' | 'gain_weight';

export interface UserStats {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface MacroBreakdown {
  proteinGrams: number;
  proteinCalories: number;
  fatGrams: number;
  fatCalories: number;
  carbsGrams: number;
  carbsCalories: number;
}

export interface NutritionTargets {
  bmr: number;
  tdee: number;
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  macros: MacroBreakdown;
}

export class NutritionCalculatorService {
  private static readonly ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extremely_active: 1.9,
  };

  /**
   * Calculates Basal Metabolic Rate (BMR) using Mifflin-St Jeor equation.
   * Male: BMR = 10 * weightKg + 6.25 * heightCm - 5 * age + 5
   * Female: BMR = 10 * weightKg + 6.25 * heightCm - 5 * age - 161
   */
  public calculateBMR(stats: Pick<UserStats, 'age' | 'sex' | 'heightCm' | 'weightKg'>): number {
    const { age, sex, heightCm, weightKg } = stats;
    const baseBmr = 10 * weightKg + 6.25 * heightCm - 5 * age;

    if (sex === 'male') {
      return Math.round(baseBmr + 5);
    } else {
      return Math.round(baseBmr - 161);
    }
  }

  /**
   * Calculates Total Daily Energy Expenditure (TDEE).
   * TDEE = BMR * activityMultiplier
   */
  public calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
    const multiplier = NutritionCalculatorService.ACTIVITY_MULTIPLIERS[activityLevel];
    if (!multiplier) {
      throw new Error(`Invalid activity level: ${activityLevel}`);
    }
    return Math.round(bmr * multiplier);
  }

  /**
   * Calculates Daily Calorie Target based on user goal.
   * lose_weight: TDEE - 500
   * maintain_weight: TDEE
   * gain_weight: TDEE + 300
   */
  public calculateDailyCalories(tdee: number, goal: Goal): number {
    switch (goal) {
      case 'lose_weight':
        return Math.round(tdee - 500);
      case 'maintain_weight':
        return Math.round(tdee);
      case 'gain_weight':
        return Math.round(tdee + 300);
      default:
        throw new Error(`Invalid goal: ${goal}`);
    }
  }

  /**
   * Calculates dynamic macronutrient targets (Protein, Fat, Carbs).
   * - Protein = 1.8g * body weight in kg (4 kcal/g)
   * - Fat = 25% of daily calories (9 kcal/g)
   * - Carbohydrates = remaining calories after protein and fat (4 kcal/g)
   */
  public calculateMacros(dailyCalories: number, weightKg: number): MacroBreakdown {
    // 1. Protein target: 1.8g per kg body weight
    const proteinGrams = Math.round(1.8 * weightKg);
    const proteinCalories = proteinGrams * 4;

    // 2. Fat target: 25% of total daily calories
    const fatCaloriesTarget = dailyCalories * 0.25;
    const fatGrams = Math.round(fatCaloriesTarget / 9);
    const fatCalories = fatGrams * 9;

    // 3. Carbohydrates: remaining calories after protein and fat
    const remainingCalories = dailyCalories - (proteinCalories + fatCalories);
    const carbsCalories = Math.max(0, remainingCalories);
    const carbsGrams = Math.round(carbsCalories / 4);

    return {
      proteinGrams,
      proteinCalories,
      fatGrams,
      fatCalories,
      carbsGrams,
      carbsCalories,
    };
  }

  /**
   * Computes complete nutrition targets from user profile stats.
   */
  public calculateAllTargets(stats: UserStats): NutritionTargets {
    const bmr = this.calculateBMR(stats);
    const tdee = this.calculateTDEE(bmr, stats.activityLevel);
    const dailyCalories = this.calculateDailyCalories(tdee, stats.goal);
    const macros = this.calculateMacros(dailyCalories, stats.weightKg);

    return {
      bmr,
      tdee,
      dailyCalories,
      proteinGrams: macros.proteinGrams,
      carbsGrams: macros.carbsGrams,
      fatGrams: macros.fatGrams,
      macros,
    };
  }
}

export const nutritionCalculator = new NutritionCalculatorService();
