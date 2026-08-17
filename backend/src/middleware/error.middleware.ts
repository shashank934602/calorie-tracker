import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';

export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number = 500, code: string = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized production error handling middleware
 */
export function errorHandler(
  err: Error & { statusCode?: number; code?: string; type?: string; status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Zod Validation Error
  if (err instanceof ZodError) {
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: err.format(),
    });
    return;
  }

  // 2. Body Parser Payload Too Large
  if (err.type === 'entity.too.large' || err.status === 413) {
    res.status(413).json({
      status: 'error',
      message: 'Request payload exceeds the maximum allowed limit of 100KB',
      code: 'PAYLOAD_TOO_LARGE',
    });
    return;
  }

  // 3. Body Parser Invalid JSON
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      status: 'error',
      message: 'Malformed JSON payload',
      code: 'INVALID_JSON',
    });
    return;
  }

  // 4. Prisma Known Database Request Errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaCode = (err as unknown as { code: string }).code;

    if (prismaCode === 'P2002') {
      res.status(409).json({
        status: 'error',
        message: 'A record with these unique details already exists',
        code: 'CONFLICT',
      });
      return;
    }

    if (prismaCode === 'P2025') {
      res.status(404).json({
        status: 'error',
        message: 'Requested record was not found',
        code: 'NOT_FOUND',
      });
      return;
    }

    if (prismaCode === 'P2003') {
      res.status(400).json({
        status: 'error',
        message: 'Foreign key constraint failed',
        code: 'FOREIGN_KEY_VIOLATION',
      });
      return;
    }
  }

  // 5. Custom AppError or Explicit Status
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR');

  // In production, never expose internal database or library errors
  const isProduction = env.NODE_ENV === 'production';
  let message = err.message || 'An unexpected error occurred';

  if (statusCode >= 500 && isProduction) {
    message = 'An unexpected error occurred. Please try again later.';
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    code: errorCode,
  });
}
