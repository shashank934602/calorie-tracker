import { Response } from 'express';
import { profileService } from '../services/profile.service';
import { profileSchema } from '../schemas/profile.schema';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * GET /api/profile
 */
export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthenticated',
      });
      return;
    }

    const data = await profileService.getProfile(userId);

    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to retrieve user profile',
    });
  }
};

/**
 * PUT /api/profile
 */
export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthenticated',
      });
      return;
    }

    // Validate request body with Zod
    const validationResult = profileSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationResult.error.format(),
      });
      return;
    }

    const data = await profileService.upsertProfile(userId, validationResult.data);

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data,
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Failed to update profile',
    });
  }
};

/**
 * GET /api/nutrition/targets
 */
export const getNutritionTargets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthenticated',
      });
      return;
    }

    const targets = await profileService.getNutritionTargets(userId);

    res.status(200).json({
      status: 'success',
      data: targets,
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Failed to retrieve nutrition targets',
    });
  }
};
