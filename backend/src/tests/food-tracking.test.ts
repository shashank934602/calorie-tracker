import { foodCalculator } from '../services/food-calculator.service';
import { prisma } from '../config/prisma';
import { foodService } from '../services/food.service';
import { dailySummaryService } from '../services/daily-summary.service';

function assertEqual(actual: unknown, expected: unknown, testName: string) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`✅ PASS: ${testName}`);
  } else {
    console.error(`❌ FAIL: ${testName}\n  Expected: ${JSON.stringify(expected)}\n  Got: ${JSON.stringify(actual)}`);
    process.exit(1);
  }
}

async function runTests() {
  console.log('=== Running Food Tracking & Calculation Test Suite ===\n');

  // 1. Pure Food Nutrition Calculation Test
  // Chicken Breast per 100g: 165 kcal, 31.0g P, 0.0g C, 3.6g F
  // For 200g: 330 kcal, 62.0g P, 0.0g C, 7.2g F
  const chicken100g = { caloriesPer100g: 165, proteinPer100g: 31.0, carbsPer100g: 0.0, fatPer100g: 3.6 };
  const chicken200gCalc = foodCalculator.calculateNutrition(chicken100g, 200);
  assertEqual(chicken200gCalc.calories, 330, 'Food Calculator: 200g Chicken Calories');
  assertEqual(chicken200gCalc.protein, 62.0, 'Food Calculator: 200g Chicken Protein');
  assertEqual(chicken200gCalc.carbs, 0.0, 'Food Calculator: 200g Chicken Carbs');
  assertEqual(chicken200gCalc.fat, 7.2, 'Food Calculator: 200g Chicken Fat');

  // 2. Fractional gram weight calculation
  // Rolled Oats per 100g: 389 kcal, 16.9g P, 66.3g C, 6.9g F
  // For 45g: 389 * 0.45 = 175.05 -> 175 kcal, 16.9 * 0.45 = 7.6g P, 66.3 * 0.45 = 29.8g C, 6.9 * 0.45 = 3.1g F
  const oats100g = { caloriesPer100g: 389, proteinPer100g: 16.9, carbsPer100g: 66.3, fatPer100g: 6.9 };
  const oats45gCalc = foodCalculator.calculateNutrition(oats100g, 45);
  assertEqual(oats45gCalc.calories, 175, 'Food Calculator: 45g Oats Calories');
  assertEqual(oats45gCalc.protein, 7.6, 'Food Calculator: 45g Oats Protein');
  assertEqual(oats45gCalc.carbs, 29.8, 'Food Calculator: 45g Oats Carbs');
  assertEqual(oats45gCalc.fat, 3.1, 'Food Calculator: 45g Oats Fat');

  // 3. Database Food Search Test
  const searchResult = await foodService.searchFoods({ query: 'chicken', limit: 10, page: 1 });
  assertEqual(searchResult.foods.length > 0, true, 'Food Search: Found Chicken');
  assertEqual(searchResult.foods[0].name.toLowerCase().includes('chicken'), true, 'Food Search: Name matches query');

  // 4. Setup Test Users
  const testUser1 = await prisma.user.upsert({
    where: { email: 'foodtest1@example.com' },
    update: {},
    create: { email: 'foodtest1@example.com', name: 'Food Tester 1', passwordHash: 'hash123' },
  });

  const testUser2 = await prisma.user.upsert({
    where: { email: 'foodtest2@example.com' },
    update: {},
    create: { email: 'foodtest2@example.com', name: 'Food Tester 2', passwordHash: 'hash123' },
  });

  const chickenFood = searchResult.foods[0];

  // 5. Create FoodEntry Test
  const createdEntry = await foodService.createFoodEntry(testUser1.id, {
    foodId: chickenFood.id,
    quantityGrams: 200,
    mealType: 'lunch',
  });
  assertEqual(createdEntry.userId, testUser1.id, 'FoodEntry: Associated with User 1');
  assertEqual(createdEntry.mealType, 'lunch', 'FoodEntry: Meal is lunch');
  assertEqual(createdEntry.calculatedNutrition.calories, 330, 'FoodEntry: Computed 330 kcal');

  // 6. Update FoodEntry Test (Change to 150g)
  const updatedEntry = await foodService.updateFoodEntry(testUser1.id, createdEntry.id, {
    quantityGrams: 150,
  });
  assertEqual(updatedEntry.quantityGrams, 150, 'FoodEntry: Quantity updated to 150g');
  assertEqual(updatedEntry.calculatedNutrition.calories, Math.round(165 * 1.5), 'FoodEntry: Recomputed 248 kcal');

  // 7. Security Isolation Test: User 2 cannot modify User 1's entry
  let caughtUnauthorized = false;
  try {
    await foodService.updateFoodEntry(testUser2.id, createdEntry.id, { quantityGrams: 300 });
  } catch (err: unknown) {
    caughtUnauthorized = (err as Error & { statusCode?: number }).statusCode === 404;
  }
  assertEqual(caughtUnauthorized, true, 'Security: User 2 cannot modify User 1 food entry');

  // 8. Daily Summary & Meal Grouping Test
  const todayStr = new Date().toISOString().split('T')[0];
  const summary = await dailySummaryService.getDailySummary(testUser1.id, todayStr);
  assertEqual(summary.meals.lunch.entries.length > 0, true, 'Daily Summary: Lunch contains logged entry');
  assertEqual(summary.consumed.calories >= 248, true, 'Daily Summary: Consumed calories aggregated');
  assertEqual(typeof summary.remaining.calories, 'number', 'Daily Summary: Remaining calories calculated');

  // 9. Delete FoodEntry Test
  const deleteResult = await foodService.deleteFoodEntry(testUser1.id, createdEntry.id);
  assertEqual(deleteResult.id, createdEntry.id, 'FoodEntry: Deleted successfully');

  // 10. Verify Deletion
  const entriesAfterDelete = await foodService.getFoodEntriesByDate(testUser1.id, todayStr);
  assertEqual(entriesAfterDelete.some((e) => e.id === createdEntry.id), false, 'FoodEntry: Not in active list');

  console.log('\n🎉 ALL FOOD TRACKING TESTS PASSED SUCCESSFULLY!\n');
}

runTests()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
