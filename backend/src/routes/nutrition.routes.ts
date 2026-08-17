import { Router } from 'express';
import { getNutritionTargets } from '../controllers/profile.controller';
import { getDailySummary } from '../controllers/daily-summary.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All nutrition routes require authentication
router.use(authenticateToken);

// GET /api/nutrition/targets
router.get('/targets', getNutritionTargets);

// GET /api/nutrition/daily-summary?date=YYYY-MM-DD
router.get('/daily-summary', getDailySummary);

export default router;
