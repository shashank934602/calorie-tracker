import { Router } from 'express';
import { 
  getFoodEntries, 
  createFoodEntry, 
  updateFoodEntry, 
  deleteFoodEntry 
} from '../controllers/food.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All food entry routes require authentication
router.use(authenticateToken);

// GET /api/food-entries?date=YYYY-MM-DD
router.get('/', getFoodEntries);

// POST /api/food-entries
router.post('/', createFoodEntry);

// PUT /api/food-entries/:id
router.put('/:id', updateFoodEntry);

// DELETE /api/food-entries/:id
router.delete('/:id', deleteFoodEntry);

export default router;
