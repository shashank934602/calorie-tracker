import { Router } from 'express';
import { searchFoods, getFoodById } from '../controllers/food.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Food catalog search and retrieval requires authentication
router.use(authenticateToken);

// GET /api/foods?query=...&limit=...&page=...
router.get('/', searchFoods);

// GET /api/foods/:id
router.get('/:id', getFoodById);

export default router;
