import { Response } from 'express';
import { aiFoodService } from '../services/ai-food.service';
import { aiFoodParseRequestSchema } from '../schemas/ai-food.schema';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// In-memory rate limiting store: userId -> { count: number; resetAt: number }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_MINUTE = 20;

/**
 * POST /api/ai/food-parse
 * Parses natural-language food text, matches catalog records, and computes preview totals.
 * Zero database mutations occur in this endpoint.
 */
export const parseFoodDescription = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthenticated' });
      return;
    }

    // 1. Rate Limiting Check
    const now = Date.now();
    const userLimit = rateLimitMap.get(userId);

    if (userLimit && userLimit.resetAt > now) {
      if (userLimit.count >= MAX_REQUESTS_PER_MINUTE) {
        res.status(429).json({
          status: 'error',
          message: 'Rate limit exceeded: You can make at most 20 AI parsing requests per minute. Please wait a moment.',
        });
        return;
      }
      userLimit.count += 1;
    } else {
      rateLimitMap.set(userId, { count: 1, resetAt: now + 60000 });
    }

    // 2. Request Validation
    const validation = aiFoodParseRequestSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid input parameters',
        errors: validation.error.format(),
      });
      return;
    }

    // 3. AI Parsing & Deterministic Nutrition Preview
    const preview = await aiFoodService.parseAndPreview(validation.data.text);

    res.status(200).json({
      status: 'success',
      data: preview,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('AI food parse error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to process AI food description',
    });
  }
};
