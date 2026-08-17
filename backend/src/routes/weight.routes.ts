import { Router } from 'express';
import { 
  listWeightEntries, 
  createWeightEntry, 
  updateWeightEntry, 
  deleteWeightEntry, 
  getWeightSummary 
} from '../controllers/weight.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All weight routes require authentication
router.use(authenticateToken);

// GET /api/weight/summary
router.get('/summary', getWeightSummary);

// GET /api/weight
router.get('/', listWeightEntries);

// POST /api/weight
router.post('/', createWeightEntry);

// PUT /api/weight/:id
router.put('/:id', updateWeightEntry);

// DELETE /api/weight/:id
router.delete('/:id', deleteWeightEntry);

export default router;
