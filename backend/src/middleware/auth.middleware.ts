import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtAccessTokenPayload } from '../services/token.service';

// Extend Express Request type to include authenticated user payload
export interface AuthenticatedRequest extends Request {
  user?: JwtAccessTokenPayload;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    res.status(401).json({
      status: 'error',
      message: 'Authorization header is required (Format: Bearer <token>)',
      code: 'AUTH_HEADER_MISSING',
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      status: 'error',
      message: 'Invalid authorization format (Format: Bearer <token>)',
      code: 'AUTH_FORMAT_INVALID',
    });
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtAccessTokenPayload;
    req.user = decoded;
    next();
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication access token has expired.',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    res.status(401).json({
      status: 'error',
      message: 'Invalid authentication access token.',
      code: 'TOKEN_INVALID',
    });
    return;
  }
};
