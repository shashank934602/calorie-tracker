import { profileService } from './profile.service';
import { foodService, DecoratedFoodEntry, getCalendarDayRange } from './food.service';
import { foodCalculator, CalculatedFoodNutrition } from './food-calculator.service';

export interface MealGroup {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  entries: DecoratedFoodEntry[];
  totals: CalculatedFoodNutrition;
}

export interface DailySummaryResponse {
  date: string;
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  consumed: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  remaining: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  meals: {
    breakfast: MealGroup;
    lunch: MealGroup;
    dinner: MealGroup;
    snack: MealGroup;
  };
}

export class DailySummaryService {
  /**
   * Generates a comprehensive daily nutritional summary for a specific calendar date.
   */
  async getDailySummary(
    userId: string,
    dateStr?: string,
    timezoneOffsetMinutes?: number
  ): Promise<DailySummaryResponse> {
    // 1. Determine effective calendar date string (YYYY-MM-DD)
    const { effectiveDate } = getCalendarDayRange(dateStr, timezoneOffsetMinutes);

    // 2. Fetch user's calculated targets (or fallback to defaults if profile is pending)
    let targets = {
      calories: 2000,
      protein: 140,
      carbs: 220,
      fat: 60,
    };

    try {
      const profileData = await profileService.getProfile(userId);
      if (profileData?.targets) {
        targets = {
          calories: profileData.targets.dailyCalories,
          protein: profileData.targets.proteinGrams,
          carbs: profileData.targets.carbsGrams,
          fat: profileData.targets.fatGrams,
        };
      }
    } catch (err) {
      console.warn('Could not load user profile targets for summary:', err);
    }

    // 3. Fetch all entries logged for this user on this calendar day
    const entries = await foodService.getFoodEntriesByDate(userId, effectiveDate, timezoneOffsetMinutes);

    // 4. Group entries by meal type
    const mealTypes: ('breakfast' | 'lunch' | 'dinner' | 'snack')[] = [
      'breakfast',
      'lunch',
      'dinner',
      'snack',
    ];

    const meals: Record<'breakfast' | 'lunch' | 'dinner' | 'snack', MealGroup> = {
      breakfast: { mealType: 'breakfast', entries: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
      lunch: { mealType: 'lunch', entries: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
      dinner: { mealType: 'dinner', entries: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
      snack: { mealType: 'snack', entries: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
    };

    for (const entry of entries) {
      meals[entry.mealType].entries.push(entry);
    }

    // Calculate totals for each meal category
    for (const type of mealTypes) {
      const nutritionList = meals[type].entries.map((e) => e.calculatedNutrition);
      meals[type].totals = foodCalculator.aggregateTotals(nutritionList);
    }

    // 5. Aggregate overall daily consumption
    const allCalculated = entries.map((e) => e.calculatedNutrition);
    const consumed = foodCalculator.aggregateTotals(allCalculated);

    // 6. Calculate remaining
    const remaining = {
      calories: Math.round(targets.calories - consumed.calories),
      protein: Math.round((targets.protein - consumed.protein) * 10) / 10,
      carbs: Math.round((targets.carbs - consumed.carbs) * 10) / 10,
      fat: Math.round((targets.fat - consumed.fat) * 10) / 10,
    };

    return {
      date: effectiveDate,
      targets,
      consumed,
      remaining,
      meals,
    };
  }
}

export const dailySummaryService = new DailySummaryService();
