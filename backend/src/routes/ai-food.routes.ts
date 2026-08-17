import { Router } from 'express';
import { parseFoodDescription } from '../controllers/ai-food.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { aiFoodParseRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// All AI endpoints require authentication
router.use(authenticateToken);

// POST /api/ai/food-parse (User Rate Limited: 20 req/min)
router.post('/food-parse', aiFoodParseRateLimiter, parseFoodDescription);

export default router;
