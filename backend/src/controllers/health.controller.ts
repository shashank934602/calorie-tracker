import { Request, Response } from 'express';
import { env } from '../config/env';

export const getHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    message: 'CalorieTrack API is running smoothly',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    uptime: process.uptime(),
    version: '1.0.0',
  });
};
