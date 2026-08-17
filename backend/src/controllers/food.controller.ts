import { Response } from 'express';
import { foodService } from '../services/food.service';
import { 
  foodSearchQuerySchema, 
  createFoodEntrySchema, 
  updateFoodEntrySchema,
  dateQuerySchema
} from '../schemas/food-entry.schema';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * GET /api/foods (Search food catalog)
 */
export const searchFoods = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const validation = foodSearchQuerySchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid search parameters',
        errors: validation.error.format(),
      });
      return;
    }

    const result = await foodService.searchFoods(validation.data);

    res.status(200).json({
      status: 'success',
      data: result.foods,
      pagination: result.pagination,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to search food catalog',
    });
  }
};

/**
 * GET /api/foods/:id (Get food details)
 */
export const getFoodById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const food = await foodService.getFoodById(id);

    res.status(200).json({
      status: 'success',
      data: food,
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Failed to retrieve food details',
    });
  }
};

/**
 * GET /api/food-entries?date=YYYY-MM-DD
 */
export const getFoodEntries = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthenticated' });
      return;
    }

    const queryValidation = dateQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid date parameter',
        errors: queryValidation.error.format(),
      });
      return;
    }

    const entries = await foodService.getFoodEntriesByDate(
      userId,
      queryValidation.data.date,
      queryValidation.data.timezoneOffset
    );

    res.status(200).json({
      status: 'success',
      data: entries,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch food entries',
    });
  }
};

/**
 * POST /api/food-entries
 */
export const createFoodEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthenticated' });
      return;
    }

    const validation = createFoodEntrySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validation.error.format(),
      });
      return;
    }

    const entry = await foodService.createFoodEntry(userId, validation.data);

    res.status(201).json({
      status: 'success',
      message: 'Food entry logged successfully',
      data: entry,
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Failed to create food entry',
    });
  }
};

/**
 * PUT /api/food-entries/:id
 */
export const updateFoodEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthenticated' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const validation = updateFoodEntrySchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validation.error.format(),
      });
      return;
    }

    const entry = await foodService.updateFoodEntry(userId, id, validation.data);

    res.status(200).json({
      status: 'success',
      message: 'Food entry updated successfully',
      data: entry,
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Failed to update food entry',
    });
  }
};

/**
 * DELETE /api/food-entries/:id
 */
export const deleteFoodEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthenticated' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await foodService.deleteFoodEntry(userId, id);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Failed to delete food entry',
    });
  }
};
