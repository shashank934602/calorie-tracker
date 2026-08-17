export interface FoodNutritionPer100g {
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export interface CalculatedFoodNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionAggregate {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export class FoodCalculatorService {
  /**
   * Calculates energy and macronutrients for an arbitrary weight in grams.
   * calories = caloriesPer100g * quantityGrams / 100
   * protein  = proteinPer100g  * quantityGrams / 100
   * carbs    = carbsPer100g    * quantityGrams / 100
   * fat      = fatPer100g      * quantityGrams / 100
   */
  public calculateNutrition(
    food: FoodNutritionPer100g,
    quantityGrams: number
  ): CalculatedFoodNutrition {
    if (quantityGrams < 0) {
      throw new Error('Quantity in grams cannot be negative');
    }

    const factor = quantityGrams / 100;

    const rawCalories = food.caloriesPer100g * factor;
    const rawProtein = food.proteinPer100g * factor;
    const rawCarbs = food.carbsPer100g * factor;
    const rawFat = food.fatPer100g * factor;

    return {
      // Calories are rounded to nearest whole integer
      calories: Math.round(rawCalories),
      // Macros are rounded to 1 decimal place
      protein: Math.round(rawProtein * 10) / 10,
      carbs: Math.round(rawCarbs * 10) / 10,
      fat: Math.round(rawFat * 10) / 10,
    };
  }

  /**
   * Aggregates a list of calculated nutrition entries into totals.
   */
  public aggregateTotals(items: CalculatedFoodNutrition[]): NutritionAggregate {
    return items.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: Math.round((acc.protein + item.protein) * 10) / 10,
        carbs: Math.round((acc.carbs + item.carbs) * 10) / 10,
        fat: Math.round((acc.fat + item.fat) * 10) / 10,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }
}

export const foodCalculator = new FoodCalculatorService();
