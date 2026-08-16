import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me (Protected by JWT Bearer token)
router.get('/me', authenticateToken, getMe);

export default router;
