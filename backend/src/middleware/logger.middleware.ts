import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface RequestWithId extends Request {
  id?: string;
}

/**
 * Sanitizes URLs to remove potential sensitive query tokens or secrets
 */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url, 'http://localhost');
    const sensitiveKeys = ['token', 'password', 'secret', 'key', 'apiKey', 'code'];
    for (const key of sensitiveKeys) {
      if (parsed.searchParams.has(key)) {
        parsed.searchParams.set(key, '[REDACTED]');
      }
    }
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}

/**
 * Production request logger with unique request tracking and zero secret exposure
 */
export function requestLogger(req: RequestWithId, res: Response, next: NextFunction): void {
  const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);

  const start = Date.now();
  const sanitized = sanitizeUrl(req.originalUrl || req.url);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${reqId}] ${req.method} ${sanitized} ${status} (${duration}ms)`);
  });

  next();
}
