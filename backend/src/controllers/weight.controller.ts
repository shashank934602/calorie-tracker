import { Response } from 'express';
import { weightService } from '../services/weight.service';
import { 
  createWeightEntrySchema, 
  updateWeightEntrySchema, 
  weightQuerySchema 
} from '../schemas/weight.schema';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * GET /api/weight
 */
export const listWeightEntries = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthenticated' });
      return;
    }

    const queryValidation = weightQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid query parameters',
        errors: queryValidation.error.format(),
      });
      return;
    }

    const entries = await weightService.listWeightEntries(userId, queryValidation.data);

    res.status(200).json({
      status: 'success',
      data: entries,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to retrieve weight entries',
    });
  }
};

/**
 * POST /api/weight
 */
export const createWeightEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthenticated' });
      return;
    }

    const validation = createWeightEntrySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validation.error.format(),
      });
      return;
    }

    const entry = await weightService.createWeightEntry(userId, validation.data);

    res.status(201).json({
      status: 'success',
      message: 'Weight entry recorded successfully',
      data: entry,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to record weight entry',
    });
  }
};

/**
 * PUT /api/weight/:id
 */
export const updateWeightEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthenticated' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const validation = updateWeightEntrySchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validation.error.format(),
      });
      return;
    }

    const entry = await weightService.updateWeightEntry(userId, id, validation.data);

    res.status(200).json({
      status: 'success',
      message: 'Weight entry updated successfully',
      data: entry,
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Failed to update weight entry',
    });
  }
};

/**
 * DELETE /api/weight/:id
 */
export const deleteWeightEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthenticated' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await weightService.deleteWeightEntry(userId, id);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Failed to delete weight entry',
    });
  }
};

/**
 * GET /api/weight/summary
 */
export const getWeightSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthenticated' });
      return;
    }

    const summary = await weightService.getWeightSummary(userId);

    res.status(200).json({
      status: 'success',
      data: summary,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to compute weight summary',
    });
  }
};
