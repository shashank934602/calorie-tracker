import { Response } from 'express';
import { dailySummaryService } from '../services/daily-summary.service';
import { dateQuerySchema } from '../schemas/food-entry.schema';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * GET /api/nutrition/daily-summary?date=YYYY-MM-DD&timezoneOffset=...
 */
export const getDailySummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
        message: 'Invalid query parameters',
        errors: queryValidation.error.format(),
      });
      return;
    }

    const summary = await dailySummaryService.getDailySummary(
      userId,
      queryValidation.data.date,
      queryValidation.data.timezoneOffset
    );

    res.status(200).json({
      status: 'success',
      data: summary,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to generate daily summary',
    });
  }
};
