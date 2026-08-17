import { prisma } from '../config/prisma';
import { authService } from '../services/auth.service';
import { profileService } from '../services/profile.service';
import { foodService } from '../services/food.service';
import { weightService } from '../services/weight.service';
import { analyticsService } from '../services/analytics.service';
import { analyticsCalculator, DailyAggregatedMetrics } from '../services/analytics-calculator.service';
import { analyticsQuerySchema } from '../schemas/analytics.schema';

function assertEqual(actual: unknown, expected: unknown, testName: string) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`✅ PASS: ${testName}`);
  } else {
    console.error(
      `❌ FAIL: ${testName}\n  Expected: ${JSON.stringify(expected)}\n  Got: ${JSON.stringify(actual)}`
    );
    process.exit(1);
  }
}

async function runAnalyticsTests() {
  console.log('=== Running Analytics & Insights Test Suite ===\n');

  // --- UNIT TESTS: Pure Analytics Calculator Service ---
  console.log('--- 1. Testing AnalyticsCalculatorService (Pure Math) ---');

  // 1. Streak Calculation
  const streakTestData1 = [
    { date: '2026-08-16', hasLogs: true },
    { date: '2026-08-15', hasLogs: true },
    { date: '2026-08-14', hasLogs: true },
    { date: '2026-08-13', hasLogs: false },
    { date: '2026-08-12', hasLogs: true },
  ];
  assertEqual(analyticsCalculator.calculateCurrentStreak(streakTestData1), 3, 'Streak: 3-day active consecutive streak');

  const streakTestData2 = [
    { date: '2026-08-16', hasLogs: false },
    { date: '2026-08-15', hasLogs: true },
    { date: '2026-08-14', hasLogs: true },
  ];
  assertEqual(analyticsCalculator.calculateCurrentStreak(streakTestData2), 2, 'Streak: Active streak counted from yesterday');

  const streakTestData3 = [
    { date: '2026-08-16', hasLogs: false },
    { date: '2026-08-15', hasLogs: false },
    { date: '2026-08-14', hasLogs: true },
  ];
  assertEqual(analyticsCalculator.calculateCurrentStreak(streakTestData3), 0, 'Streak: Broken streak returns 0');

  // 2. Budget Adherence Calculation
  const adherenceMockDays: DailyAggregatedMetrics[] = [
    { date: '2026-08-10', hasLogs: true, calories: 2000, protein: 140, carbs: 220, fat: 60, weightKg: null, meals: { breakfast: 500, lunch: 700, dinner: 800, snack: 0 } }, // On budget (target 2000)
    { date: '2026-08-11', hasLogs: true, calories: 2150, protein: 145, carbs: 230, fat: 65, weightKg: null, meals: { breakfast: 500, lunch: 850, dinner: 800, snack: 0 } }, // On budget (+7.5%, within +/-10%)
    { date: '2026-08-12', hasLogs: true, calories: 2400, protein: 160, carbs: 260, fat: 75, weightKg: null, meals: { breakfast: 600, lunch: 900, dinner: 900, snack: 0 } }, // Over budget (>2200)
    { date: '2026-08-13', hasLogs: true, calories: 1600, protein: 120, carbs: 180, fat: 45, weightKg: null, meals: { breakfast: 400, lunch: 600, dinner: 600, snack: 0 } }, // Under budget (<1800)
    { date: '2026-08-14', hasLogs: false, calories: 0, protein: 0, carbs: 0, fat: 0, weightKg: null, meals: { breakfast: 0, lunch: 0, dinner: 0, snack: 0 } },
  ];

  const adherence = analyticsCalculator.calculateAdherence(adherenceMockDays, 2000);
  assertEqual(adherence.loggingRatePct, 80, 'Adherence: 4 of 5 days logged (80%)');
  assertEqual(adherence.daysOnBudget, 2, 'Adherence: 2 days within +/-10% target budget');
  assertEqual(adherence.daysOverBudget, 1, 'Adherence: 1 day over budget');
  assertEqual(adherence.daysUnderBudget, 1, 'Adherence: 1 day under budget');
  assertEqual(adherence.targetAdherencePct, 50, 'Adherence: 50% target adherence (2 of 4 logged days)');

  // 3. Estimated Energy Balance & Weight Change
  const energyBalance = analyticsCalculator.calculateEstimatedEnergyBalance(
    adherenceMockDays.filter((d) => d.hasLogs),
    2500, // TDEE = 2500
    -0.5 // Actual weight loss = -0.5kg
  );
  // Total calories = 2000 + 2150 + 2400 + 1600 = 8150. Total TDEE = 4 * 2500 = 10000. Deficit = -1850 kcal.
  assertEqual(energyBalance.estimatedNetPeriodDeficit, -1850, 'Energy Balance: Net period deficit -1850 kcal');
  // -1850 / 7700 = -0.24kg estimated
  assertEqual(energyBalance.estimatedWeightChangeKg, -0.24, 'Energy Balance: Labeled estimated weight change (-0.24 kg)');
  assertEqual(energyBalance.actualWeightChangeKg, -0.5, 'Energy Balance: Actual weight change preserved (-0.5 kg)');

  // --- SCHEMA TESTS: 365-Day Custom Range Limit ---
  console.log('\n--- 2. Testing Analytics Schema Validation & Range Limits ---');

  // Valid 30-day range
  const valid30d = analyticsQuerySchema.safeParse({ range: '30d' });
  assertEqual(valid30d.success, true, 'Schema: Valid 30d preset');

  // Valid custom 60-day range
  const validCustom = analyticsQuerySchema.safeParse({
    range: 'custom',
    startDate: '2026-06-01',
    endDate: '2026-07-31',
  });
  assertEqual(validCustom.success, true, 'Schema: Valid 60-day custom range');

  // Invalid custom range (> 365 days)
  const invalidOver365 = analyticsQuerySchema.safeParse({
    range: 'custom',
    startDate: '2025-01-01',
    endDate: '2026-02-01', // 396 days
  });
  assertEqual(invalidOver365.success, false, 'Schema: Rejects custom range exceeding 365 days');

  // Invalid custom range (startDate > endDate)
  const invalidInverted = analyticsQuerySchema.safeParse({
    range: 'custom',
    startDate: '2026-08-10',
    endDate: '2026-08-01',
  });
  assertEqual(invalidInverted.success, false, 'Schema: Rejects inverted date range (start > end)');

  // --- INTEGRATION TESTS: Database Aggregations & Timezones ---
  console.log('\n--- 3. Testing AnalyticsService Database Integration ---');

  const testEmail = `analytics_user_${Date.now()}@example.com`;
  const registerResult = await authService.register({
    name: 'Analytics Tester',
    email: testEmail,
    password: 'Password123!',
  });
  const userId = registerResult.user.id;

  // Setup Profile (Male, 28, 178cm, 80kg, moderately_active, lose_weight)
  await profileService.upsertProfile(userId, {
    age: 28,
    sex: 'male',
    heightCm: 178,
    weightKg: 80,
    targetWeightKg: 75,
    activityLevel: 'moderately_active',
    goal: 'lose_weight',
  });

  // Get food items
  const chicken = await prisma.food.findUniqueOrThrow({ where: { name: 'Chicken Breast (Skinless)' } });
  const rice = await prisma.food.findUniqueOrThrow({ where: { name: 'White Rice (Cooked)' } });

  // Log food entries across 3 dates in YYYY-MM-DD
  const d1 = '2026-08-14';
  const d2 = '2026-08-15';
  const d3 = '2026-08-16';

  // Day 1: 200g chicken (330 kcal) + 200g rice (260 kcal) = 590 kcal
  await foodService.createFoodEntry(userId, { foodId: chicken.id, quantityGrams: 200, mealType: 'lunch', consumedAt: `${d1}T12:00:00.000Z` });
  await foodService.createFoodEntry(userId, { foodId: rice.id, quantityGrams: 200, mealType: 'lunch', consumedAt: `${d1}T12:00:00.000Z` });

  // Day 2: 300g chicken (495 kcal) = 495 kcal
  await foodService.createFoodEntry(userId, { foodId: chicken.id, quantityGrams: 300, mealType: 'dinner', consumedAt: `${d2}T19:00:00.000Z` });

  // Day 3: 200g chicken (330 kcal) = 330 kcal
  await foodService.createFoodEntry(userId, { foodId: chicken.id, quantityGrams: 200, mealType: 'lunch', consumedAt: `${d3}T12:00:00.000Z` });

  // Log weight entries
  await weightService.createWeightEntry(userId, { weightKg: 80.0, recordedAt: `${d1}T08:00:00.000Z` });
  await weightService.createWeightEntry(userId, { weightKg: 79.2, recordedAt: `${d3}T08:00:00.000Z` });

  // Fetch 7-day trends for custom 3-day window
  const trendsResult = await analyticsService.getTrends(userId, {
    range: 'custom',
    startDate: d1,
    endDate: d3,
    timezoneOffset: 0,
  });

  assertEqual(trendsResult.days.length, 3, 'Trends: Exact 3 days returned in custom range');
  assertEqual(trendsResult.days[0].calories, 590, 'Trends: Day 1 total calories is 590 kcal');
  assertEqual(trendsResult.days[0].hasLogs, true, 'Trends: Day 1 hasLogs is true');
  assertEqual(trendsResult.days[1].calories, 495, 'Trends: Day 2 total calories is 495 kcal');
  assertEqual(trendsResult.days[2].calories, 330, 'Trends: Day 3 total calories is 330 kcal');
  assertEqual(trendsResult.days[0].weightKg, 80.0, 'Trends: Day 1 recorded weight 80.0kg');
  assertEqual(trendsResult.days[2].weightKg, 79.2, 'Trends: Day 3 recorded weight 79.2kg');

  // Fetch summary for the period
  const summaryResult = await analyticsService.getSummary(userId, {
    range: 'custom',
    startDate: d1,
    endDate: d3,
    timezoneOffset: 0,
  });

  assertEqual(summaryResult.period.loggedDaysCount, 3, 'Summary: 3 logged days');
  assertEqual(summaryResult.adherence.loggingRatePct, 100, 'Summary: 100% logging rate for 3-day window');
  assertEqual(summaryResult.adherence.currentStreakDays, 3, 'Summary: 3-day active streak');
  // Average calories = (590 + 495 + 330) / 3 = 471.67 -> 472 kcal
  assertEqual(summaryResult.averages.dailyCalories, 472, 'Summary: Daily average calories is 472 kcal');
  assertEqual(summaryResult.energyBalance.actualWeightChangeKg, -0.8, 'Summary: Actual weight change is -0.8kg (79.2 - 80.0)');

  // Multi-Tenant Isolation Test
  const otherUser = await authService.register({
    name: 'Other User',
    email: `other_${Date.now()}@example.com`,
    password: 'Password123!',
  });

  const otherTrends = await analyticsService.getTrends(otherUser.user.id, {
    range: 'custom',
    startDate: d1,
    endDate: d3,
    timezoneOffset: 0,
  });

  assertEqual(otherTrends.days.every((d) => !d.hasLogs && d.calories === 0), true, 'Security: Other user sees 0 food logs and 0 calories');

  console.log('\n🎉 ALL ANALYTICS & INSIGHTS TESTS PASSED PERFECTLY!\n');
}

runAnalyticsTests()
  .catch((err) => {
    console.error('❌ Analytics test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
