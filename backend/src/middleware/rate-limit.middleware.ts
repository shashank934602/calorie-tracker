import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  code?: string;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitRecord {
  timestamps: number[];
}

const allLimiterStores: Map<string, Map<string, RateLimitRecord>> = new Map();

/**
 * Creates an in-memory sliding-window rate limiter with automatic memory cleanup.
 */
export function createRateLimiter(limiterName: string, options: RateLimiterOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests. Please try again later.',
    code = 'RATE_LIMIT_EXCEEDED',
    keyGenerator = (req: Request) =>
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown_ip',
  } = options;

  const store = new Map<string, RateLimitRecord>();
  allLimiterStores.set(limiterName, store);

  // Periodic cleanup of expired entries every 5 minutes (unref so tests don't hang)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      const valid = record.timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        store.delete(key);
      } else {
        store.set(key, { timestamps: valid });
      }
    }
  }, 5 * 60 * 1000);

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = keyGenerator(req);

    const record = store.get(key) || { timestamps: [] };
    const validTimestamps = record.timestamps.filter((t) => now - t < windowMs);

    if (validTimestamps.length >= maxRequests) {
      const oldestValid = validTimestamps[0];
      const resetTime = oldestValid + windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000));

      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

      res.status(429).json({
        status: 'error',
        message,
        code,
      });
      return;
    }

    validTimestamps.push(now);
    store.set(key, { timestamps: validTimestamps });

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - validTimestamps.length);
    res.setHeader('X-RateLimit-Reset', Math.ceil((validTimestamps[0] + windowMs) / 1000));

    next();
  };
}

/**
 * Resets all rate limiter stores (primarily for automated testing)
 */
export function resetAllRateLimiters(): void {
  for (const store of allLimiterStores.values()) {
    store.clear();
  }
}

// 1. Auth Login: Max 5 attempts per 5 minutes per IP
export const loginRateLimiter = createRateLimiter('auth_login', {
  windowMs: 5 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many login attempts. Please try again after 5 minutes.',
  code: 'LOGIN_RATE_LIMIT_EXCEEDED',
});

// 2. Auth Register: Max 5 accounts per 1 hour per IP
export const registerRateLimiter = createRateLimiter('auth_register', {
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many registration requests from this IP. Please try again later.',
  code: 'REGISTER_RATE_LIMIT_EXCEEDED',
});

// 3. Auth Refresh: Max 30 refreshes per 1 minute per IP
export const refreshRateLimiter = createRateLimiter('auth_refresh', {
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many session refresh requests. Please wait a moment.',
  code: 'REFRESH_RATE_LIMIT_EXCEEDED',
});

// 4. AI Food Parse: Max 20 requests per 1 minute per user
export const aiFoodParseRateLimiter = createRateLimiter('ai_food_parse', {
  windowMs: 60 * 1000,
  maxRequests: 20,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user?.userId || req.ip || 'anonymous_user';
  },
  message: 'AI food parsing rate limit reached (20 requests/min). Please slow down.',
  code: 'AI_FOOD_RATE_LIMIT_EXCEEDED',
});

// 5. AI Coach Chat: Max 15 requests per 1 minute per user
export const aiCoachRateLimiter = createRateLimiter('ai_coach_chat', {
  windowMs: 60 * 1000,
  maxRequests: 15,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user?.userId || req.ip || 'anonymous_user';
  },
  message: 'AI Nutrition Coach rate limit reached (15 requests/min). Please slow down.',
  code: 'AI_COACH_RATE_LIMIT_EXCEEDED',
});
