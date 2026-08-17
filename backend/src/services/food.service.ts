import { prisma } from '../config/prisma';
import { CreateFoodEntryInput, UpdateFoodEntryInput, FoodSearchQuery } from '../schemas/food-entry.schema';
import { foodCalculator, CalculatedFoodNutrition } from './food-calculator.service';

export interface DecoratedFoodEntry {
  id: string;
  userId: string;
  foodId: string;
  quantityGrams: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  consumedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  food: {
    id: string;
    name: string;
    servingUnit: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
  };
  calculatedNutrition: CalculatedFoodNutrition;
}

/**
 * Computes consistent start and end Date boundaries for a calendar day (YYYY-MM-DD).
 */
export function getCalendarDayRange(
  dateStr?: string,
  timezoneOffsetMinutes?: number
): { startOfDay: Date; endOfDay: Date; effectiveDate: string } {
  let effectiveDate = dateStr;

  if (!effectiveDate || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) {
    const now = new Date();
    if (timezoneOffsetMinutes !== undefined) {
      const localNow = new Date(now.getTime() - timezoneOffsetMinutes * 60 * 1000);
      effectiveDate = localNow.toISOString().split('T')[0];
    } else {
      effectiveDate = now.toISOString().split('T')[0];
    }
  }

  const [year, month, day] = effectiveDate.split('-').map(Number);

  let startOfDay: Date;
  let endOfDay: Date;

  if (timezoneOffsetMinutes !== undefined) {
    // Adjust by user's local timezone offset in minutes (e.g., -330 for UTC+5:30)
    const startUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) + timezoneOffsetMinutes * 60 * 1000;
    const endUtcMs = Date.UTC(year, month - 1, day, 23, 59, 59, 999) + timezoneOffsetMinutes * 60 * 1000;
    startOfDay = new Date(startUtcMs);
    endOfDay = new Date(endUtcMs);
  } else {
    // Default UTC calendar boundaries
    startOfDay = new Date(`${effectiveDate}T00:00:00.000Z`);
    endOfDay = new Date(`${effectiveDate}T23:59:59.999Z`);
  }

  return { startOfDay, endOfDay, effectiveDate };
}

export class FoodService {
  /**
   * Searches the food catalog by name with pagination.
   */
  async searchFoods(query: FoodSearchQuery) {
    const { query: searchStr, limit, page } = query;
    const skip = (page - 1) * limit;

    const whereClause = searchStr
      ? {
          name: {
            contains: searchStr,
            mode: 'insensitive' as const,
          },
        }
      : {};

    const [foods, total] = await Promise.all([
      prisma.food.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.food.count({
        where: whereClause,
      }),
    ]);

    return {
      foods,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves a single food item by ID.
   */
  async getFoodById(id: string) {
    const food = await prisma.food.findUnique({
      where: { id },
    });

    if (!food) {
      const error = new Error('Food item not found');
      (error as Error & { statusCode?: number }).statusCode = 404;
      throw error;
    }

    return food;
  }

  /**
   * Helper to format and calculate dynamic nutrition for a food entry.
   */
  private decorateEntry(entry: {
    id: string;
    userId: string;
    foodId: string;
    quantityGrams: number;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    consumedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    food: {
      id: string;
      name: string;
      servingUnit: string;
      caloriesPer100g: number;
      proteinPer100g: number;
      carbsPer100g: number;
      fatPer100g: number;
    };
  }): DecoratedFoodEntry {
    const calculatedNutrition = foodCalculator.calculateNutrition(
      entry.food,
      entry.quantityGrams
    );

    return {
      ...entry,
      calculatedNutrition,
    };
  }

  /**
   * Creates a new food entry for the authenticated user.
   */
  async createFoodEntry(userId: string, data: CreateFoodEntryInput): Promise<DecoratedFoodEntry> {
    // 1. Verify food exists
    const food = await prisma.food.findUnique({
      where: { id: data.foodId },
    });

    if (!food) {
      const error = new Error('Selected food item does not exist in catalog');
      (error as Error & { statusCode?: number }).statusCode = 404;
      throw error;
    }

    // 2. Determine consumption timestamp
    let consumedAt: Date;
    if (data.consumedAt) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(data.consumedAt)) {
        consumedAt = new Date(`${data.consumedAt}T12:00:00.000Z`);
      } else {
        consumedAt = new Date(data.consumedAt);
      }
    } else {
      consumedAt = new Date();
    }

    // 3. Create entry in PostgreSQL
    const entry = await prisma.foodEntry.create({
      data: {
        userId,
        foodId: data.foodId,
        quantityGrams: data.quantityGrams,
        mealType: data.mealType,
        consumedAt,
      },
      include: {
        food: true,
      },
    });

    return this.decorateEntry(entry);
  }

  /**
   * Updates an existing food entry ensuring user ownership.
   */
  async updateFoodEntry(
    userId: string,
    entryId: string,
    data: UpdateFoodEntryInput
  ): Promise<DecoratedFoodEntry> {
    const existing = await prisma.foodEntry.findFirst({
      where: {
        id: entryId,
        userId,
      },
      include: {
        food: true,
      },
    });

    if (!existing) {
      const error = new Error('Food entry not found or unauthorized to modify');
      (error as Error & { statusCode?: number }).statusCode = 404;
      throw error;
    }

    let consumedAt: Date | undefined = undefined;
    if (data.consumedAt) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(data.consumedAt)) {
        consumedAt = new Date(`${data.consumedAt}T12:00:00.000Z`);
      } else {
        consumedAt = new Date(data.consumedAt);
      }
    }

    const updated = await prisma.foodEntry.update({
      where: { id: entryId },
      data: {
        ...(data.quantityGrams !== undefined && { quantityGrams: data.quantityGrams }),
        ...(data.mealType !== undefined && { mealType: data.mealType }),
        ...(consumedAt !== undefined && { consumedAt }),
      },
      include: {
        food: true,
      },
    });

    return this.decorateEntry(updated);
  }

  /**
   * Deletes a food entry ensuring user ownership.
   */
  async deleteFoodEntry(userId: string, entryId: string): Promise<{ id: string; message: string }> {
    const existing = await prisma.foodEntry.findFirst({
      where: {
        id: entryId,
        userId,
      },
    });

    if (!existing) {
      const error = new Error('Food entry not found or unauthorized to delete');
      (error as Error & { statusCode?: number }).statusCode = 404;
      throw error;
    }

    await prisma.foodEntry.delete({
      where: { id: entryId },
    });

    return {
      id: entryId,
      message: 'Food entry deleted successfully',
    };
  }

  /**
   * Retrieves all food entries for a specific calendar date.
   */
  async getFoodEntriesByDate(
    userId: string,
    dateStr?: string,
    timezoneOffsetMinutes?: number
  ): Promise<DecoratedFoodEntry[]> {
    const { startOfDay, endOfDay } = getCalendarDayRange(dateStr, timezoneOffsetMinutes);

    const entries = await prisma.foodEntry.findMany({
      where: {
        userId,
        consumedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        food: true,
      },
      orderBy: {
        consumedAt: 'asc',
      },
    });

    return entries.map((e) => this.decorateEntry(e));
  }
}

export const foodService = new FoodService();
