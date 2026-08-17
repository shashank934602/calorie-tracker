/**
 * ============================================================================
 * CalorieTrack Development Seed Dataset
 * 
 * DISCLAIMER:
 * This is sample developmental and testing data containing approximate nutritional
 * values for common foods. It is intended for software development and UI verification,
 * not authoritative clinical, dietary, or medical reference.
 * ============================================================================
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const DEV_FOODS_DATA = [
  {
    name: 'Whole Egg',
    servingUnit: 'g',
    caloriesPer100g: 143,
    proteinPer100g: 12.6,
    carbsPer100g: 0.7,
    fatPer100g: 9.5,
  },
  {
    name: 'Chicken Breast (Skinless)',
    servingUnit: 'g',
    caloriesPer100g: 165,
    proteinPer100g: 31.0,
    carbsPer100g: 0.0,
    fatPer100g: 3.6,
  },
  {
    name: 'White Rice (Cooked)',
    servingUnit: 'g',
    caloriesPer100g: 130,
    proteinPer100g: 2.7,
    carbsPer100g: 28.2,
    fatPer100g: 0.3,
  },
  {
    name: 'Whole Wheat Roti',
    servingUnit: 'g',
    caloriesPer100g: 264,
    proteinPer100g: 9.0,
    carbsPer100g: 49.0,
    fatPer100g: 3.5,
  },
  {
    name: 'Rolled Oats (Raw)',
    servingUnit: 'g',
    caloriesPer100g: 389,
    proteinPer100g: 16.9,
    carbsPer100g: 66.3,
    fatPer100g: 6.9,
  },
  {
    name: 'Whole Cow Milk',
    servingUnit: 'ml',
    caloriesPer100g: 61,
    proteinPer100g: 3.2,
    carbsPer100g: 4.8,
    fatPer100g: 3.3,
  },
  {
    name: 'Plain Curd / Dahi',
    servingUnit: 'g',
    caloriesPer100g: 60,
    proteinPer100g: 3.5,
    carbsPer100g: 4.7,
    fatPer100g: 3.2,
  },
  {
    name: 'Greek Yogurt (Plain 0% Fat)',
    servingUnit: 'g',
    caloriesPer100g: 59,
    proteinPer100g: 10.0,
    carbsPer100g: 3.6,
    fatPer100g: 0.4,
  },
  {
    name: 'Paneer (Cottage Cheese)',
    servingUnit: 'g',
    caloriesPer100g: 265,
    proteinPer100g: 18.3,
    carbsPer100g: 1.2,
    fatPer100g: 20.8,
  },
  {
    name: 'Cooked Yellow Dal (Lentils)',
    servingUnit: 'g',
    caloriesPer100g: 116,
    proteinPer100g: 9.0,
    carbsPer100g: 20.1,
    fatPer100g: 0.4,
  },
  {
    name: 'Banana',
    servingUnit: 'g',
    caloriesPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 22.8,
    fatPer100g: 0.3,
  },
  {
    name: 'Apple',
    servingUnit: 'g',
    caloriesPer100g: 52,
    proteinPer100g: 0.3,
    carbsPer100g: 13.8,
    fatPer100g: 0.2,
  },
  {
    name: 'Boiled Potato',
    servingUnit: 'g',
    caloriesPer100g: 87,
    proteinPer100g: 1.9,
    carbsPer100g: 20.1,
    fatPer100g: 0.1,
  },
  {
    name: 'Whole Wheat Bread',
    servingUnit: 'g',
    caloriesPer100g: 247,
    proteinPer100g: 13.0,
    carbsPer100g: 41.0,
    fatPer100g: 3.4,
  },
  {
    name: 'Natural Peanut Butter',
    servingUnit: 'g',
    caloriesPer100g: 588,
    proteinPer100g: 25.0,
    carbsPer100g: 20.0,
    fatPer100g: 50.0,
  },
  {
    name: 'Raw Almonds',
    servingUnit: 'g',
    caloriesPer100g: 579,
    proteinPer100g: 21.2,
    carbsPer100g: 21.6,
    fatPer100g: 49.9,
  },
  {
    name: 'Soya Chunks (Dry)',
    servingUnit: 'g',
    caloriesPer100g: 345,
    proteinPer100g: 52.0,
    carbsPer100g: 33.0,
    fatPer100g: 0.5,
  },
  {
    name: 'Fresh Broccoli',
    servingUnit: 'g',
    caloriesPer100g: 34,
    proteinPer100g: 2.8,
    carbsPer100g: 6.6,
    fatPer100g: 0.4,
  },
  {
    name: 'Fresh Tomato',
    servingUnit: 'g',
    caloriesPer100g: 18,
    proteinPer100g: 0.9,
    carbsPer100g: 3.9,
    fatPer100g: 0.2,
  },
  {
    name: 'Red Onion',
    servingUnit: 'g',
    caloriesPer100g: 40,
    proteinPer100g: 1.1,
    carbsPer100g: 9.3,
    fatPer100g: 0.1,
  },
  {
    name: 'Whey Protein Isolate Powder',
    servingUnit: 'g',
    caloriesPer100g: 390,
    proteinPer100g: 80.0,
    carbsPer100g: 6.0,
    fatPer100g: 4.0,
  },
];

export async function seedFoods(): Promise<void> {
  console.log('🌱 Seeding development foods database...');

  for (const food of DEV_FOODS_DATA) {
    await prisma.food.upsert({
      where: { name: food.name },
      update: {
        servingUnit: food.servingUnit,
        caloriesPer100g: food.caloriesPer100g,
        proteinPer100g: food.proteinPer100g,
        carbsPer100g: food.carbsPer100g,
        fatPer100g: food.fatPer100g,
      },
      create: food,
    });
  }

  const count = await prisma.food.count();
  console.log(`✅ Development food dataset ready! Total foods in database: ${count}`);
}

if (require.main === module) {
  seedFoods()
    .catch((err) => {
      console.error('❌ Failed to seed foods:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
