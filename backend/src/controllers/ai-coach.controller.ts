import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { aiCoachRequestSchema } from '../schemas/ai-coach.schema';
import { aiCoachContextService } from '../services/ai-coach-context.service';
import { aiCoachService } from '../services/ai-coach.service';
import { resetAllRateLimiters } from '../middleware/rate-limit.middleware';

/**
 * Backward-compatible helper to reset rate limits in unit tests
 */
export function resetRateLimits(): void {
  resetAllRateLimiters();
}

/**
 * POST /api/ai/coach/chat
 */
export const chatWithCoach = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ status: 'error', message: 'Unauthenticated', code: 'UNAUTHORIZED' });
      return;
    }

    const userId = req.user.userId;

    // 1. Validate input with Zod
    const validationResult = aiCoachRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: validationResult.error.format(),
      });
      return;
    }

    const { message, timezoneOffset } = validationResult.data;

    // 2. Build verified private application context
    const context = await aiCoachContextService.buildContext(userId, timezoneOffset);

    // 3. Generate coaching response
    const coachResponse = await aiCoachService.askCoach(message, context);

    res.status(200).json({
      status: 'success',
      data: coachResponse,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to process AI Coach request',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};
