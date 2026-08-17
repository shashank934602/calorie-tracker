import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { tokenService, REFRESH_COOKIE_NAME } from '../services/token.service';
import { registerSchema, loginSchema } from '../schemas/auth.schema';
import { googleAuthSchema } from '../schemas/google-auth.schema';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Helper to extract client metadata
 */
const getClientMeta = (req: Request) => {
  const userAgent = req.headers['user-agent'] || undefined;
  const ipAddress =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    undefined;
  return { userAgent, ipAddress };
};

/**
 * POST /api/auth/google
 */
export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        '[GoogleAuth Backend DEBUG] POST /api/auth/google received. idToken present:',
        !!req.body?.idToken
      );
    }

    const validationResult = googleAuthSchema.safeParse(req.body);
    if (!validationResult.success) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[GoogleAuth Backend DEBUG] googleAuthSchema validation failed:',
          validationResult.error.format()
        );
      }
      res.status(400).json({
        status: 'error',
        message: 'Google authentication validation failed',
        errors: validationResult.error.format(),
      });
      return;
    }

    const { userAgent, ipAddress } = getClientMeta(req);
    const result = await authService.googleAuth(validationResult.data.idToken, userAgent, ipAddress);

    // Set HttpOnly refresh cookie
    res.cookie(
      REFRESH_COOKIE_NAME,
      result.rawRefreshToken,
      tokenService.getRefreshCookieOptions(result.refreshExpiresAt)
    );

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[GoogleAuth Backend DEBUG] Google login success for user ${result.user.email} (session: ${result.sessionId}). Emitting HTTP 200.`
      );
    }

    res.status(200).json({
      status: 'success',
      message: 'Authenticated with Google successfully',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        token: result.accessToken, // Backward-compatibility alias
      },
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    const statusCode = error.statusCode || 500;

    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[GoogleAuth Backend DEBUG] POST /api/auth/google error (status ${statusCode}):`,
        error.message
      );
    }

    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'An unexpected error occurred during Google authentication',
    });
  }
};

/**
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationResult.error.format(),
      });
      return;
    }

    const { userAgent, ipAddress } = getClientMeta(req);
    const result = await authService.register(validationResult.data, userAgent, ipAddress);

    // Set HttpOnly refresh cookie
    res.cookie(
      REFRESH_COOKIE_NAME,
      result.rawRefreshToken,
      tokenService.getRefreshCookieOptions(result.refreshExpiresAt)
    );

    res.status(201).json({
      status: 'success',
      message: 'Account created successfully',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        token: result.accessToken, // Backward-compatibility alias
      },
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'An unexpected error occurred during registration',
    });
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationResult.error.format(),
      });
      return;
    }

    const { userAgent, ipAddress } = getClientMeta(req);
    const result = await authService.login(validationResult.data, userAgent, ipAddress);

    // Set HttpOnly refresh cookie
    res.cookie(
      REFRESH_COOKIE_NAME,
      result.rawRefreshToken,
      tokenService.getRefreshCookieOptions(result.refreshExpiresAt)
    );

    res.status(200).json({
      status: 'success',
      message: 'Logged in successfully',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        token: result.accessToken, // Backward-compatibility alias
      },
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'An unexpected error occurred during login',
    });
  }
};

/**
 * POST /api/auth/refresh
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!rawRefreshToken) {
      res.status(401).json({
        status: 'error',
        message: 'No refresh token provided in cookie',
        code: 'MISSING_REFRESH_COOKIE',
      });
      return;
    }

    const { userAgent, ipAddress } = getClientMeta(req);
    const result = await authService.refresh(rawRefreshToken, userAgent, ipAddress);

    // Set updated HttpOnly refresh cookie
    res.cookie(
      REFRESH_COOKIE_NAME,
      result.rawRefreshToken,
      tokenService.getRefreshCookieOptions(result.refreshExpiresAt)
    );

    res.status(200).json({
      status: 'success',
      message: 'Session refreshed successfully',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        token: result.accessToken,
      },
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number; code?: string };
    const statusCode = error.statusCode || 401;

    // Clear compromised or invalid cookie
    res.clearCookie(REFRESH_COOKIE_NAME, tokenService.getClearCookieOptions());

    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Failed to refresh authentication session',
      code: error.code || 'REFRESH_FAILED',
    });
  }
};

/**
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (rawRefreshToken) {
      await authService.logout(rawRefreshToken);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, tokenService.getClearCookieOptions());

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.clearCookie(REFRESH_COOKIE_NAME, tokenService.getClearCookieOptions());
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to complete logout',
    });
  }
};

/**
 * POST /api/auth/logout-all
 */
export const logoutAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ status: 'error', message: 'Unauthenticated' });
      return;
    }

    await authService.logoutAll(req.user.userId);
    res.clearCookie(REFRESH_COOKIE_NAME, tokenService.getClearCookieOptions());

    res.status(200).json({
      status: 'success',
      message: 'Logged out from all active sessions successfully',
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to log out all sessions',
    });
  }
};

/**
 * GET /api/auth/sessions
 */
export const getSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ status: 'error', message: 'Unauthenticated' });
      return;
    }

    const sessions = await authService.getUserSessions(req.user.userId, req.user.sessionId);

    res.status(200).json({
      status: 'success',
      data: sessions,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to retrieve active sessions',
    });
  }
};

/**
 * DELETE /api/auth/sessions/:id
 */
export const revokeSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ status: 'error', message: 'Unauthenticated' });
      return;
    }

    const sessionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!sessionId) {
      res.status(400).json({ status: 'error', message: 'Session ID is required' });
      return;
    }

    await authService.revokeSession(req.user.userId, sessionId);

    // If the user revoked their current session, clear their cookie
    if (sessionId === req.user.sessionId) {
      res.clearCookie(REFRESH_COOKIE_NAME, tokenService.getClearCookieOptions());
    }

    res.status(200).json({
      status: 'success',
      message: 'Session revoked successfully',
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Failed to revoke session',
    });
  }
};

/**
 * GET /api/auth/me
 */
export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthenticated',
      });
      return;
    }

    const user = await authService.getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User account not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to retrieve user profile',
    });
  }
};
