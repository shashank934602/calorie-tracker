import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { requestLogger } from './middleware/logger.middleware';
import { errorHandler } from './middleware/error.middleware';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import nutritionRoutes from './routes/nutrition.routes';
import foodRoutes from './routes/food.routes';
import foodEntryRoutes from './routes/food-entry.routes';
import weightRoutes from './routes/weight.routes';
import aiFoodRoutes from './routes/ai-food.routes';
import aiCoachRoutes from './routes/ai-coach.routes';
import analyticsRoutes from './routes/analytics.routes';

const app: Application = express();

// 1. Configure Trust Proxy for accurate client IP identification
if (env.TRUST_PROXY || env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// 2. Production Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy:
      env.NODE_ENV === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'", env.CORS_ORIGIN],
            },
          }
        : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 3. Strict CORS configuration (explicit origin only, credentials enabled)
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Request-Id'],
    exposedHeaders: ['Retry-After', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  })
);

// 4. Request Body Parsers with 100KB size bounds (prevents payload memory DOS)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// 5. Sanitized Request Logger with Request IDs
app.use(requestLogger);

// 6. Application API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/food-entries', foodEntryRoutes);
app.use('/api/weight', weightRoutes);
app.use('/api/ai', aiFoodRoutes);
app.use('/api/ai/coach', aiCoachRoutes);
app.use('/api/analytics', analyticsRoutes);

// 7. 404 Handler for undefined routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Requested route not found',
    code: 'ROUTE_NOT_FOUND',
  });
});

// 8. Centralized Production Error Handler (sanitizes stack traces and database internals)
app.use(errorHandler);

export default app;
