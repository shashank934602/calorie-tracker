import { prisma } from '../config/prisma';
import { aiFoodService } from '../services/ai-food.service';
import { unitConverter } from '../services/unit-converter.service';

function assertEqual(actual: unknown, expected: unknown, testName: string) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`✅ PASS: ${testName}`);
  } else {
    console.error(`❌ FAIL: ${testName}\n  Expected: ${JSON.stringify(expected)}\n  Got: ${JSON.stringify(actual)}`);
    process.exit(1);
  }
}

async function runTests() {
  console.log('=== Running AI Food Assistant & Parser Test Suite ===\n');

  // 1. Controlled Unit Converter Tests
  // Whole Egg: 3 eggs -> 150g (needsConfirmation: false)
  const eggPortion = unitConverter.resolvePortion('Whole Egg', 'g', 3, 'eggs');
  assertEqual(eggPortion.quantityInServingUnit, 150, 'Unit Converter: 3 eggs = 150g');
  assertEqual(eggPortion.needsConfirmation, false, 'Unit Converter: Egg portion is confirmed standard');

  // Roti: 2 rotis -> 80g (needsConfirmation: false)
  const rotiPortion = unitConverter.resolvePortion('Whole Wheat Roti', 'g', 2, 'rotis');
  assertEqual(rotiPortion.quantityInServingUnit, 80, 'Unit Converter: 2 rotis = 80g');

  // Banana: 1 medium banana -> 120g
  const bananaPortion = unitConverter.resolvePortion('Banana', 'g', 1, 'banana');
  assertEqual(bananaPortion.quantityInServingUnit, 120, 'Unit Converter: 1 banana = 120g');

  // Apple: 1 medium apple -> 180g
  const applePortion = unitConverter.resolvePortion('Apple', 'g', 1, 'apple');
  assertEqual(applePortion.quantityInServingUnit, 180, 'Unit Converter: 1 apple = 180g');

  // Bowl of Rice: 1 bowl -> 180g (needsConfirmation: true)
  const riceBowlPortion = unitConverter.resolvePortion('White Rice (Cooked)', 'g', 1, 'bowl');
  assertEqual(riceBowlPortion.quantityInServingUnit, 180, 'Unit Converter: 1 bowl rice = 180g');
  assertEqual(riceBowlPortion.needsConfirmation, true, 'Unit Converter: Bowl volume flagged for user confirmation');

  // Bowl of Dal: 1 bowl -> 200g (needsConfirmation: true)
  const dalBowlPortion = unitConverter.resolvePortion('Cooked Yellow Dal (Lentils)', 'g', 1, 'bowl');
  assertEqual(dalBowlPortion.quantityInServingUnit, 200, 'Unit Converter: 1 bowl dal = 200g');
  assertEqual(dalBowlPortion.needsConfirmation, true, 'Unit Converter: Bowl of dal flagged for confirmation');

  // Liquid volume: 250ml Milk (servingUnit: 'ml' -> 250ml, needsConfirmation: false)
  const milkPortion = unitConverter.resolvePortion('Whole Cow Milk', 'ml', 250, 'ml');
  assertEqual(milkPortion.quantityInServingUnit, 250, 'Unit Converter: 250ml milk preserved');
  assertEqual(milkPortion.needsConfirmation, false, 'Unit Converter: Native fluid unit matches catalog');

  // 2. AI Parsing & Matching Test: "3 eggs, 200g chicken and a bowl of rice for lunch"
  const testQuery = 'I had 3 eggs, 200g chicken and a bowl of rice for lunch';
  const previewResult = await aiFoodService.parseAndPreview(testQuery);

  assertEqual(previewResult.mealType, 'lunch', 'AI Parser: Identified Lunch meal type');
  assertEqual(previewResult.items.length, 3, 'AI Parser: Extracted 3 food items');

  // Item 1: Eggs -> Whole Egg (150g -> 143 kcal * 1.5 = 215 kcal)
  const eggItem = previewResult.items.find((i) => i.foodName.toLowerCase().includes('egg'));
  assertEqual(eggItem !== undefined, true, 'AI Parser: Found Egg item');
  assertEqual(eggItem?.matchedFoodName, 'Whole Egg', 'AI Matcher: Matched Whole Egg');
  assertEqual(eggItem?.quantityInServingUnit, 150, 'AI Parser: Resolved 150g for 3 eggs');
  assertEqual(eggItem?.calculatedNutrition?.calories, 215, 'Food Calculator: Deterministic 215 kcal for 150g eggs');

  // Item 2: Chicken -> Chicken Breast (200g -> 165 kcal * 2 = 330 kcal)
  const chickenItem = previewResult.items.find((i) => i.foodName.toLowerCase().includes('chicken'));
  assertEqual(chickenItem !== undefined, true, 'AI Parser: Found Chicken item');
  assertEqual(chickenItem?.matchedFoodName, 'Chicken Breast (Skinless)', 'AI Matcher: Matched Chicken Breast');
  assertEqual(chickenItem?.quantityInServingUnit, 200, 'AI Parser: 200g Chicken');
  assertEqual(chickenItem?.calculatedNutrition?.calories, 330, 'Food Calculator: Deterministic 330 kcal for 200g chicken');

  // Item 3: Rice -> White Rice (180g -> 130 kcal * 1.8 = 234 kcal)
  const riceItem = previewResult.items.find((i) => i.foodName.toLowerCase().includes('rice'));
  assertEqual(riceItem !== undefined, true, 'AI Parser: Found Rice item');
  assertEqual(riceItem?.matchedFoodName, 'White Rice (Cooked)', 'AI Matcher: Matched White Rice');
  assertEqual(riceItem?.quantityInServingUnit, 180, 'AI Parser: 180g Rice');
  assertEqual(riceItem?.calculatedNutrition?.calories, 234, 'Food Calculator: Deterministic 234 kcal for 180g rice');

  // Totals check: 215 + 330 + 234 = 779 kcal
  assertEqual(previewResult.totals.calories, 779, 'Food Calculator: Aggregated total calories is exactly 779 kcal');

  // 3. Unknown Food Handling
  const unknownQueryResult = await aiFoodService.parseAndPreview('500g mythical dragonfruit elixir');
  const unknownItem = unknownQueryResult.items[0];
  assertEqual(unknownItem.matchConfidence, 'none', 'Unknown Food: Flagged with confidence none');
  assertEqual(unknownItem.foodId, null, 'Unknown Food: foodId is null');
  assertEqual(unknownQueryResult.requiresUserClarification, true, 'Unknown Food: requiresUserClarification is true');

  // 4. Mocking Custom Structured Gemini Response
  aiFoodService.setMockMode(true, {
    mealType: 'breakfast',
    items: [
      { rawText: '2 rotis', foodName: 'Whole Wheat Roti', quantity: 2, unit: 'rotis' },
      { rawText: '1 cup milk', foodName: 'Whole Cow Milk', quantity: 1, unit: 'cup' },
    ],
  });

  const mockedResult = await aiFoodService.parseAndPreview('breakfast special');
  assertEqual(mockedResult.mealType, 'breakfast', 'Mock Mode: Correctly respected mock mealType');
  assertEqual(mockedResult.items.length, 2, 'Mock Mode: Processed 2 mocked items');
  assertEqual(mockedResult.items[0].matchedFoodName, 'Whole Wheat Roti', 'Mock Mode: Matched Roti');
  assertEqual(mockedResult.items[0].quantityInServingUnit, 80, 'Mock Mode: Converted 2 rotis to 80g');

  // Reset Mock Mode
  aiFoodService.setMockMode(false);

  // 5. Confirmation Safety Test: Verify parseAndPreview performs ZERO database mutations
  const initialEntryCount = await prisma.foodEntry.count();
  await aiFoodService.parseAndPreview('3 eggs and 200g chicken for dinner');
  const afterParseEntryCount = await prisma.foodEntry.count();
  assertEqual(afterParseEntryCount, initialEntryCount, 'Confirmation Safety: Parse endpoint wrote 0 entries to database');

  console.log('\n🎉 ALL AI FOOD LOGGING TESTS PASSED SUCCESSFULLY!\n');
}

runTests()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
