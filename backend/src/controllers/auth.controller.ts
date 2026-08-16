import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { registerSchema, loginSchema } from '../schemas/auth.schema';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body with Zod
    const validationResult = registerSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationResult.error.format(),
      });
      return;
    }

    const result = await authService.register(validationResult.data);

    res.status(201).json({
      status: 'success',
      message: 'Account created successfully',
      data: result,
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'An unexpected error occurred during registration',
    });
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body with Zod
    const validationResult = loginSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationResult.error.format(),
      });
      return;
    }

    const result = await authService.login(validationResult.data);

    res.status(200).json({
      status: 'success',
      message: 'Logged in successfully',
      data: result,
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'An unexpected error occurred during login',
    });
  }
};

/**
 * GET /api/auth/me
 */
export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthenticated',
      });
      return;
    }

    const user = await authService.getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User account not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to retrieve user profile',
    });
  }
};
