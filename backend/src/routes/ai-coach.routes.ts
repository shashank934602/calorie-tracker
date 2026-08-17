import { Router } from 'express';
import { chatWithCoach } from '../controllers/ai-coach.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { aiCoachRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// Protected AI Coach Chat Endpoint (Rate Limited: 15 req/min/user)
router.post('/chat', authenticateToken, aiCoachRateLimiter, chatWithCoach);

export default router;
