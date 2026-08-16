import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profile.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All profile routes require authentication
router.use(authenticateToken);

// GET /api/profile
router.get('/', getProfile);

// PUT /api/profile
router.put('/', updateProfile);

export default router;
