import { Router } from 'express';
import {
  register,
  login,
  googleLogin,
  refresh,
  logout,
  logoutAll,
  getSessions,
  revokeSession,
  getMe,
} from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  loginRateLimiter,
  registerRateLimiter,
  refreshRateLimiter,
} from '../middleware/rate-limit.middleware';

const router = Router();

// Public Authentication Endpoints (Rate Limited)
router.post('/register', registerRateLimiter, register);
router.post('/login', loginRateLimiter, login);
router.post('/google', loginRateLimiter, googleLogin);
router.post('/refresh', refreshRateLimiter, refresh);
router.post('/logout', logout);

// Protected Authentication & Session Endpoints
router.get('/me', authenticateToken, getMe);
router.post('/logout-all', authenticateToken, logoutAll);
router.get('/sessions', authenticateToken, getSessions);
router.delete('/sessions/:id', authenticateToken, revokeSession);

export default router;
