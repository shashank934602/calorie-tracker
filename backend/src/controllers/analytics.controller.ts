import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { analyticsService } from '../services/analytics.service';
import { analyticsQuerySchema } from '../schemas/analytics.schema';

/**
 * GET /api/analytics/summary
 */
export const getSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ status: 'error', message: 'Unauthenticated' });
      return;
    }

    const validationResult = analyticsQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid analytics query parameters',
        errors: validationResult.error.format(),
      });
      return;
    }

    const summary = await analyticsService.getSummary(req.user.userId, validationResult.data);

    res.status(200).json({
      status: 'success',
      data: summary,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to generate analytics summary',
    });
  }
};

/**
 * GET /api/analytics/trends
 */
export const getTrends = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ status: 'error', message: 'Unauthenticated' });
      return;
    }

    const validationResult = analyticsQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid analytics query parameters',
        errors: validationResult.error.format(),
      });
      return;
    }

    const trends = await analyticsService.getTrends(req.user.userId, validationResult.data);

    res.status(200).json({
      status: 'success',
      data: trends,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to generate analytics trends',
    });
  }
};
