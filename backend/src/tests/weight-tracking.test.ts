import { prisma } from '../config/prisma';
import { weightCalculator } from '../services/weight-calculator.service';
import { weightService } from '../services/weight.service';
import { profileService } from '../services/profile.service';

function assertEqual(actual: unknown, expected: unknown, testName: string) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`✅ PASS: ${testName}`);
  } else {
    console.error(`❌ FAIL: ${testName}\n  Expected: ${JSON.stringify(expected)}\n  Got: ${JSON.stringify(actual)}`);
    process.exit(1);
  }
}

async function runTests() {
  console.log('=== Running Weight Tracking & Progress Test Suite ===\n');

  // 1. Pure Calculation: Lose Weight Progress
  // Start: 90kg, Target: 80kg, Current: 85kg -> 5kg lost out of 10kg needed = 50%
  const loseResult = weightCalculator.calculateSummary({
    entries: [
      { id: '1', weightKg: 90, recordedAt: new Date('2026-01-01T00:00:00Z') },
      { id: '2', weightKg: 87, recordedAt: new Date('2026-01-15T00:00:00Z') },
      { id: '3', weightKg: 85, recordedAt: new Date('2026-02-01T00:00:00Z') },
    ],
    targetWeightKg: 80,
    goal: 'lose_weight',
  });
  assertEqual(loseResult.startingWeight, 90, 'Weight Calculator: Starting weight (earliest)');
  assertEqual(loseResult.currentWeight, 85, 'Weight Calculator: Current weight (latest)');
  assertEqual(loseResult.totalChange, -5, 'Weight Calculator: Total change (-5kg)');
  assertEqual(loseResult.remainingToGoal, 5, 'Weight Calculator: Remaining to lose (5kg)');
  assertEqual(loseResult.percentageProgress, 50, 'Weight Calculator: 50% progress toward lose weight goal');

  // 2. Pure Calculation: Gain Weight Progress
  // Start: 60kg, Target: 70kg, Current: 64kg -> 4kg gained out of 10kg needed = 40%
  const gainResult = weightCalculator.calculateSummary({
    entries: [
      { id: '1', weightKg: 60, recordedAt: new Date('2026-01-01T00:00:00Z') },
      { id: '2', weightKg: 64, recordedAt: new Date('2026-01-15T00:00:00Z') },
    ],
    targetWeightKg: 70,
    goal: 'gain_weight',
  });
  assertEqual(gainResult.startingWeight, 60, 'Gain Goal: Starting weight 60kg');
  assertEqual(gainResult.currentWeight, 64, 'Gain Goal: Current weight 64kg');
  assertEqual(gainResult.totalChange, 4, 'Gain Goal: Total change +4kg');
  assertEqual(gainResult.remainingToGoal, 6, 'Gain Goal: Remaining 6kg');
  assertEqual(gainResult.percentageProgress, 40, 'Gain Goal: 40% progress');

  // 3. Pure Calculation: Missing Target Weight
  const missingTargetResult = weightCalculator.calculateSummary({
    entries: [
      { id: '1', weightKg: 75, recordedAt: new Date('2026-01-01T00:00:00Z') },
      { id: '2', weightKg: 73, recordedAt: new Date('2026-01-15T00:00:00Z') },
    ],
    targetWeightKg: null,
    goal: 'lose_weight',
  });
  assertEqual(missingTargetResult.targetWeight, null, 'Missing Target: Target weight is null');
  assertEqual(missingTargetResult.percentageProgress, null, 'Missing Target: Percentage progress is null');

  // 4. Pure Calculation: Maintain Weight Goal
  const maintainResult = weightCalculator.calculateSummary({
    entries: [
      { id: '1', weightKg: 70, recordedAt: new Date('2026-01-01T00:00:00Z') },
      { id: '2', weightKg: 70.8, recordedAt: new Date('2026-01-15T00:00:00Z') },
    ],
    targetWeightKg: 70,
    goal: 'maintain_weight',
  });
  assertEqual(maintainResult.percentageProgress, null, 'Maintain Goal: Progress percentage is null');
  assertEqual(maintainResult.totalChange, 0.8, 'Maintain Goal: Variance +0.8kg');

  // 5. Database Setup: Create Test Users
  const testUserA = await prisma.user.upsert({
    where: { email: 'weighttest_a@example.com' },
    update: {},
    create: { email: 'weighttest_a@example.com', name: 'Weight Tester A', passwordHash: 'hash123' },
  });

  const testUserB = await prisma.user.upsert({
    where: { email: 'weighttest_b@example.com' },
    update: {},
    create: { email: 'weighttest_b@example.com', name: 'Weight Tester B', passwordHash: 'hash123' },
  });

  // Set Profile for User A
  await profileService.upsertProfile(testUserA.id, {
    age: 28,
    sex: 'male',
    heightCm: 175,
    weightKg: 85,
    targetWeightKg: 75,
    activityLevel: 'moderately_active',
    goal: 'lose_weight',
  });

  // 6. Create Weight Entries for User A
  const entryA1 = await weightService.createWeightEntry(testUserA.id, {
    weightKg: 85,
    recordedAt: '2026-01-01T10:00:00.000Z',
    note: 'Starting point',
  });
  assertEqual(entryA1.weightKg, 85, 'Weight Entry 1 created (85kg)');

  const entryA2 = await weightService.createWeightEntry(testUserA.id, {
    weightKg: 82,
    recordedAt: '2026-01-15T10:00:00.000Z',
    note: 'Mid-month checkin',
  });
  assertEqual(entryA2.weightKg, 82, 'Weight Entry 2 created (82kg)');

  // 7. Verify Summary for User A
  const summaryA = await weightService.getWeightSummary(testUserA.id);
  assertEqual(summaryA.startingWeight, 85, 'Summary: Starting weight is 85kg');
  assertEqual(summaryA.currentWeight, 82, 'Summary: Current weight is 82kg');
  assertEqual(summaryA.totalChange, -3, 'Summary: Total change is -3kg');
  assertEqual(summaryA.remainingToGoal, 7, 'Summary: Remaining to lose is 7kg');
  assertEqual(summaryA.percentageProgress, 30, 'Summary: 30% progress (3kg / 10kg)');

  // 8. Test Historical Starting Weight Protection
  // If user later updates their profile weight, starting weight in weight summary MUST remain 85kg (earliest entry)
  await profileService.upsertProfile(testUserA.id, {
    age: 28,
    sex: 'male',
    heightCm: 175,
    weightKg: 80, // updated in profile
    targetWeightKg: 75,
    activityLevel: 'moderately_active',
    goal: 'lose_weight',
  });
  const summaryAfterProfileEdit = await weightService.getWeightSummary(testUserA.id);
  assertEqual(summaryAfterProfileEdit.startingWeight, 85, 'Historical Protection: Starting weight remains 85kg from first entry');

  // 9. Update Weight Entry
  const updatedEntryA2 = await weightService.updateWeightEntry(testUserA.id, entryA2.id, {
    weightKg: 81.5,
  });
  assertEqual(updatedEntryA2.weightKg, 81.5, 'Weight Entry updated to 81.5kg');

  const summaryAfterEdit = await weightService.getWeightSummary(testUserA.id);
  assertEqual(summaryAfterEdit.currentWeight, 81.5, 'Summary: Current weight updated to 81.5kg');
  assertEqual(summaryAfterEdit.totalChange, -3.5, 'Summary: Total change updated to -3.5kg');
  assertEqual(summaryAfterEdit.percentageProgress, 35, 'Summary: 35% progress (3.5kg / 10kg)');

  // 10. Security & Tenant Isolation: User B cannot modify or delete User A's entry
  let caughtUnauthorized = false;
  try {
    await weightService.updateWeightEntry(testUserB.id, entryA1.id, { weightKg: 99 });
  } catch (err: unknown) {
    caughtUnauthorized = (err as Error & { statusCode?: number }).statusCode === 404;
  }
  assertEqual(caughtUnauthorized, true, 'Security: User B cannot modify User A weight entry');

  // 11. Delete Weight Entry
  const deleteResult = await weightService.deleteWeightEntry(testUserA.id, entryA2.id);
  assertEqual(deleteResult.id, entryA2.id, 'Weight Entry deleted successfully');

  // Clean up remaining test entry
  await weightService.deleteWeightEntry(testUserA.id, entryA1.id);

  console.log('\n🎉 ALL WEIGHT TRACKING & PROGRESS TESTS PASSED SUCCESSFULLY!\n');
}

runTests()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
