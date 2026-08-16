import { nutritionCalculator, UserStats } from '../services/nutrition-calculator.service';

function assertEqual(actual: number, expected: number, testName: string) {
  if (actual === expected) {
    console.log(`✅ PASS: ${testName} (Got: ${actual})`);
  } else {
    console.error(`❌ FAIL: ${testName} (Expected: ${expected}, Got: ${actual})`);
    process.exit(1);
  }
}

console.log('=== Running Nutrition Calculator Tests ===\n');

// 1. Male BMR Test
// 80kg, 180cm, 30yo male: 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
const maleBmr = nutritionCalculator.calculateBMR({
  age: 30,
  sex: 'male',
  heightCm: 180,
  weightKg: 80,
});
assertEqual(maleBmr, 1780, 'Male BMR Calculation');

// 2. Female BMR Test
// 60kg, 165cm, 28yo female: 10*60 + 6.25*165 - 5*28 - 161 = 600 + 1031.25 - 140 - 161 = 1330.25 -> 1330
const femaleBmr = nutritionCalculator.calculateBMR({
  age: 28,
  sex: 'female',
  heightCm: 165,
  weightKg: 60,
});
assertEqual(femaleBmr, 1330, 'Female BMR Calculation');

// 3. TDEE Calculations across all activity levels
const bmrBase = 1780;
assertEqual(nutritionCalculator.calculateTDEE(bmrBase, 'sedentary'), Math.round(1780 * 1.2), 'TDEE Sedentary (1.2x)');
assertEqual(nutritionCalculator.calculateTDEE(bmrBase, 'lightly_active'), Math.round(1780 * 1.375), 'TDEE Lightly Active (1.375x)');
assertEqual(nutritionCalculator.calculateTDEE(bmrBase, 'moderately_active'), Math.round(1780 * 1.55), 'TDEE Moderately Active (1.55x)');
assertEqual(nutritionCalculator.calculateTDEE(bmrBase, 'very_active'), Math.round(1780 * 1.725), 'TDEE Very Active (1.725x)');
assertEqual(nutritionCalculator.calculateTDEE(bmrBase, 'extremely_active'), Math.round(1780 * 1.9), 'TDEE Extremely Active (1.9x)');

// 4. Goal Calorie Adjustments
const tdeeBase = 2759; // 1780 * 1.55
assertEqual(nutritionCalculator.calculateDailyCalories(tdeeBase, 'lose_weight'), 2259, 'Goal: Lose Weight (TDEE - 500)');
assertEqual(nutritionCalculator.calculateDailyCalories(tdeeBase, 'maintain_weight'), 2759, 'Goal: Maintain Weight (TDEE)');
assertEqual(nutritionCalculator.calculateDailyCalories(tdeeBase, 'gain_weight'), 3059, 'Goal: Gain Weight (TDEE + 300)');

// 5. Dynamic Macro Calculations with exact prompt example
// User: 80kg, 2150 kcal
// Protein: 1.8 * 80 = 144g (576 kcal)
// Fat: 2150 * 0.25 = 537.5 -> 60g (540 kcal)
// Carbs: (2150 - (576 + 540)) = 1034 -> 1034 / 4 = 258.5 -> 259g
const testMacros = nutritionCalculator.calculateMacros(2150, 80);
assertEqual(testMacros.proteinGrams, 144, 'Dynamic Macro: Protein Grams');
assertEqual(testMacros.proteinCalories, 576, 'Dynamic Macro: Protein Calories');
assertEqual(testMacros.fatGrams, 60, 'Dynamic Macro: Fat Grams');
assertEqual(testMacros.fatCalories, 540, 'Dynamic Macro: Fat Calories');
assertEqual(testMacros.carbsGrams, 259, 'Dynamic Macro: Carbs Grams');

// 6. Complete Target Engine Integration Test
const userStats: UserStats = {
  age: 30,
  sex: 'male',
  heightCm: 180,
  weightKg: 80,
  activityLevel: 'moderately_active',
  goal: 'lose_weight',
};
const targets = nutritionCalculator.calculateAllTargets(userStats);
assertEqual(targets.bmr, 1780, 'Full Engine: BMR');
assertEqual(targets.tdee, 2759, 'Full Engine: TDEE');
assertEqual(targets.dailyCalories, 2259, 'Full Engine: Daily Calories');
assertEqual(targets.proteinGrams, 144, 'Full Engine: Protein Grams');
assertEqual(targets.fatGrams, 63, 'Full Engine: Fat Grams'); // 2259 * 0.25 / 9 = 62.75 -> 63g

console.log('\n🎉 ALL 14 NUTRITION CALCULATION TESTS PASSED SUCCESSFULLY!\n');
