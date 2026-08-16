import { Router } from 'express';
import { getNutritionTargets } from '../controllers/profile.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All nutrition routes require authentication
router.use(authenticateToken);

// GET /api/nutrition/targets
router.get('/targets', getNutritionTargets);

export default router;
