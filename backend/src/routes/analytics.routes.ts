import { Router } from 'express';
import { getSummary, getTrends } from '../controllers/analytics.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All analytics endpoints require valid JWT authentication
router.get('/summary', authenticateToken, getSummary);
router.get('/trends', authenticateToken, getTrends);

export default router;
