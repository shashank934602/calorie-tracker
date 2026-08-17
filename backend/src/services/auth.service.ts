import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { RegisterInput, LoginInput } from '../schemas/auth.schema';
import { tokenService } from './token.service';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSessionResult {
  user: UserResponse;
  accessToken: string;
  rawRefreshToken: string;
  refreshExpiresAt: Date;
  sessionId: string;
}

export interface SessionInfo {
  id: string;
  createdAt: Date;
  lastUsedAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
  isCurrent: boolean;
}

export class AuthService {
  private googleClient: OAuth2Client | null = null;

  private getGoogleClient(): OAuth2Client {
    if (!this.googleClient) {
      this.googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID || undefined);
    }
    return this.googleClient;
  }

  /**
   * Authenticates a verified Google ID token, performing safe account creation or linking.
   */
  async googleAuth(
    idToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthSessionResult> {
    const client = this.getGoogleClient();
    let payload;

    if (env.NODE_ENV === 'development') {
      console.log(
        '[GoogleAuth Backend DEBUG] Verifying ID token with audience configured:',
        env.GOOGLE_CLIENT_ID ? `${env.GOOGLE_CLIENT_ID.substring(0, 12)}...` : '(none configured in backend/.env)'
      );
    }

    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID || undefined,
      });
      payload = ticket.getPayload();
    } catch (err: unknown) {
      const originalMsg = err instanceof Error ? err.message : 'Token verification failed';
      if (env.NODE_ENV === 'development') {
        console.error('[GoogleAuth Backend DEBUG] verifyIdToken failed:', originalMsg);
      }
      const error = new Error(`Invalid or expired Google ID token: ${originalMsg}`);
      (error as Error & { statusCode?: number }).statusCode = 401;
      throw error;
    }

    if (!payload || !payload.sub || !payload.email) {
      if (env.NODE_ENV === 'development') {
        console.error('[GoogleAuth Backend DEBUG] Missing sub or email claims in payload');
      }
      const error = new Error('Google token is missing required identity claims');
      (error as Error & { statusCode?: number }).statusCode = 401;
      throw error;
    }

    if (env.NODE_ENV === 'development') {
      console.log(
        '[GoogleAuth Backend DEBUG] Token claims verified successfully. tokenAudience:',
        payload.aud,
        'emailVerified:',
        payload.email_verified
      );
    }

    // Security: verify that the email was verified by Google
    if (!payload.email_verified) {
      const error = new Error('Google email address is not verified');
      (error as Error & { statusCode?: number }).statusCode = 401;
      throw error;
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const name = payload.name || payload.given_name || email.split('@')[0];

    // Account Resolution & Linking:
    // 1. Check if user already exists with this googleId
    let user = await prisma.user.findUnique({
      where: { googleId },
    });

    if (!user) {
      // 2. Check if user exists with this verified email (Account Linking)
      const existingByEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingByEmail) {
        if (env.NODE_ENV === 'development') {
          console.log('[GoogleAuth Backend DEBUG] Account linking: Attaching googleId to existing user.');
        }
        // Link Google ID to existing account
        user = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: { googleId },
        });
      } else {
        if (env.NODE_ENV === 'development') {
          console.log('[GoogleAuth Backend DEBUG] Account creation: Creating new Google-only user.');
        }
        // 3. Create brand new Google-only account (passwordHash = null)
        user = await prisma.user.create({
          data: {
            email,
            name,
            googleId,
            passwordHash: null,
          },
        });
      }
    } else {
      if (env.NODE_ENV === 'development') {
        console.log('[GoogleAuth Backend DEBUG] Returning user authenticated by googleId.');
      }
    }

    // 4. Generate refresh token & hash
    const rawRefreshToken = tokenService.generateRefreshToken();
    const tokenHash = tokenService.hashToken(rawRefreshToken);
    const refreshExpiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000
    );

    // 5. Create Session & RefreshToken atomically
    const session = await prisma.$transaction(async (tx) => {
      const newSession = await tx.session.create({
        data: {
          userId: user.id,
          userAgent: userAgent || null,
          ipAddress: ipAddress || null,
        },
      });

      await tx.refreshToken.create({
        data: {
          sessionId: newSession.id,
          tokenHash,
          expiresAt: refreshExpiresAt,
        },
      });

      return newSession;
    });

    // 6. Generate signed JWT access token
    const accessToken = tokenService.generateAccessToken({
      userId: user.id,
      sessionId: session.id,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken,
      rawRefreshToken,
      refreshExpiresAt,
      sessionId: session.id,
    };
  }

  /**
   * Registers a new user account and creates their initial active session.
   */
  async register(
    data: RegisterInput,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthSessionResult> {
    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      const error = new Error('An account with this email address already exists');
      (error as Error & { statusCode?: number }).statusCode = 409;
      throw error;
    }

    // 2. Hash password with bcrypt (salt rounds = 10)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    // 3. Generate refresh token & compute hash
    const rawRefreshToken = tokenService.generateRefreshToken();
    const tokenHash = tokenService.hashToken(rawRefreshToken);
    const refreshExpiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000
    );

    // 4. Create User, Session, and RefreshToken atomically
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
        },
      });

      const newSession = await tx.session.create({
        data: {
          userId: newUser.id,
          userAgent: userAgent || null,
          ipAddress: ipAddress || null,
        },
      });

      await tx.refreshToken.create({
        data: {
          sessionId: newSession.id,
          tokenHash,
          expiresAt: refreshExpiresAt,
        },
      });

      return { user: newUser, session: newSession };
    });

    // 5. Generate signed JWT access token (15m)
    const accessToken = tokenService.generateAccessToken({
      userId: result.user.id,
      sessionId: result.session.id,
    });

    return {
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        createdAt: result.user.createdAt,
        updatedAt: result.user.updatedAt,
      },
      accessToken,
      rawRefreshToken,
      refreshExpiresAt,
      sessionId: result.session.id,
    };
  }

  /**
   * Authenticates user credentials and establishes a new session.
   */
  async login(
    data: LoginInput,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthSessionResult> {
    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      const error = new Error('Invalid email or password');
      (error as Error & { statusCode?: number }).statusCode = 401;
      throw error;
    }

    // Guard: Prevent password login on Google-only accounts
    if (!user.passwordHash) {
      const error = new Error(
        'This account was registered using Google Sign-In. Please sign in with Google.'
      );
      (error as Error & { statusCode?: number }).statusCode = 401;
      throw error;
    }

    // 2. Verify password against stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      (error as Error & { statusCode?: number }).statusCode = 401;
      throw error;
    }

    // 3. Generate refresh token & compute hash
    const rawRefreshToken = tokenService.generateRefreshToken();
    const tokenHash = tokenService.hashToken(rawRefreshToken);
    const refreshExpiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000
    );

    // 4. Create Session and RefreshToken
    const session = await prisma.$transaction(async (tx) => {
      const newSession = await tx.session.create({
        data: {
          userId: user.id,
          userAgent: userAgent || null,
          ipAddress: ipAddress || null,
        },
      });

      await tx.refreshToken.create({
        data: {
          sessionId: newSession.id,
          tokenHash,
          expiresAt: refreshExpiresAt,
        },
      });

      return newSession;
    });

    // 5. Generate signed JWT access token (15m)
    const accessToken = tokenService.generateAccessToken({
      userId: user.id,
      sessionId: session.id,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken,
      rawRefreshToken,
      refreshExpiresAt,
      sessionId: session.id,
    };
  }

  /**
   * Refreshes access token and rotates refresh token with strict reuse detection.
   */
  async refresh(
    rawRefreshToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthSessionResult> {
    if (!rawRefreshToken) {
      const error = new Error('No refresh token provided');
      (error as Error & { statusCode?: number; code?: string }).statusCode = 401;
      (error as Error & { statusCode?: number; code?: string }).code = 'MISSING_REFRESH_TOKEN';
      throw error;
    }

    const tokenHash = tokenService.hashToken(rawRefreshToken);

    return prisma.$transaction(async (tx) => {
      // 1. Look up token in database
      const existingToken = await tx.refreshToken.findUnique({
        where: { tokenHash },
        include: {
          session: {
            include: { user: true },
          },
        },
      });

      if (!existingToken) {
        const error = new Error('Invalid refresh token');
        (error as Error & { statusCode?: number; code?: string }).statusCode = 401;
        (error as Error & { statusCode?: number; code?: string }).code = 'INVALID_REFRESH_TOKEN';
        throw error;
      }

      const session = existingToken.session;

      // 2. Check if Session is already revoked
      if (session.revokedAt) {
        const error = new Error('Session has been revoked');
        (error as Error & { statusCode?: number; code?: string }).statusCode = 401;
        (error as Error & { statusCode?: number; code?: string }).code = 'SESSION_REVOKED';
        throw error;
      }

      // 3. Strict Multi-Generation Reuse Detection: If token is already replaced or revoked
      if (existingToken.revokedAt !== null || existingToken.replacedByTokenId !== null) {
        // Attack/Replay detected: Revoke the entire Session and all associated tokens in family
        const now = new Date();
        await prisma.session.update({
          where: { id: session.id },
          data: { revokedAt: now },
        });

        await prisma.refreshToken.updateMany({
          where: { sessionId: session.id, revokedAt: null },
          data: { revokedAt: now },
        });

        const error = new Error(
          'Security Alert: Refresh token reuse detected. The session has been revoked.'
        );
        (error as Error & { statusCode?: number; code?: string }).statusCode = 401;
        (error as Error & { statusCode?: number; code?: string }).code = 'REFRESH_TOKEN_REUSE_DETECTED';
        throw error;
      }

      // 4. Check if token is expired
      const now = new Date();
      if (existingToken.expiresAt < now) {
        await prisma.refreshToken.update({
          where: { id: existingToken.id },
          data: { revokedAt: now },
        });

        const error = new Error('Refresh token has expired. Please log in again.');
        (error as Error & { statusCode?: number; code?: string }).statusCode = 401;
        (error as Error & { statusCode?: number; code?: string }).code = 'REFRESH_TOKEN_EXPIRED';
        throw error;
      }

      // 5. Atomic Token Rotation
      const newRawToken = tokenService.generateRefreshToken();
      const newHash = tokenService.hashToken(newRawToken);
      const newExpiresAt = new Date(
        Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000
      );

      // Create new token
      const newTokenRecord = await tx.refreshToken.create({
        data: {
          sessionId: session.id,
          tokenHash: newHash,
          expiresAt: newExpiresAt,
        },
      });

      // Revoke current token and link replacement
      await tx.refreshToken.update({
        where: { id: existingToken.id },
        data: {
          revokedAt: now,
          replacedByTokenId: newTokenRecord.id,
        },
      });

      // Update session lastUsedAt
      await tx.session.update({
        where: { id: session.id },
        data: {
          lastUsedAt: now,
          userAgent: userAgent || session.userAgent,
          ipAddress: ipAddress || session.ipAddress,
        },
      });

      // 6. Generate new short-lived access token
      const accessToken = tokenService.generateAccessToken({
        userId: session.user.id,
        sessionId: session.id,
      });

      return {
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          createdAt: session.user.createdAt,
          updatedAt: session.user.updatedAt,
        },
        accessToken,
        rawRefreshToken: newRawToken,
        refreshExpiresAt: newExpiresAt,
        sessionId: session.id,
      };
    });
  }

  /**
   * Revokes the session associated with the provided refresh token upon logout.
   */
  async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;

    const tokenHash = tokenService.hashToken(rawRefreshToken);
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (tokenRecord) {
      const now = new Date();
      await prisma.$transaction([
        prisma.session.update({
          where: { id: tokenRecord.sessionId },
          data: { revokedAt: now },
        }),
        prisma.refreshToken.updateMany({
          where: { sessionId: tokenRecord.sessionId, revokedAt: null },
          data: { revokedAt: now },
        }),
      ]);
    }
  }

  /**
   * Revokes all active sessions belonging to the user.
   */
  async logoutAll(userId: string): Promise<void> {
    const now = new Date();
    const activeSessions = await prisma.session.findMany({
      where: { userId, revokedAt: null },
      select: { id: true },
    });

    const sessionIds = activeSessions.map((s) => s.id);

    if (sessionIds.length > 0) {
      await prisma.$transaction([
        prisma.session.updateMany({
          where: { id: { in: sessionIds } },
          data: { revokedAt: now },
        }),
        prisma.refreshToken.updateMany({
          where: { sessionId: { in: sessionIds }, revokedAt: null },
          data: { revokedAt: now },
        }),
      ]);
    }
  }

  /**
   * Returns all active sessions for a user, highlighting the current session.
   */
  async getUserSessions(userId: string, currentSessionId?: string): Promise<SessionInfo[]> {
    const sessions = await prisma.session.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        lastUsedAt: true,
        userAgent: true,
        ipAddress: true,
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      isCurrent: s.id === currentSessionId,
    }));
  }

  /**
   * Revokes a specific session belonging to the user.
   */
  async revokeSession(userId: string, sessionIdToRevoke: string): Promise<void> {
    const session = await prisma.session.findFirst({
      where: { id: sessionIdToRevoke, userId },
    });

    if (!session) {
      const error = new Error('Session not found or does not belong to you');
      (error as Error & { statusCode?: number }).statusCode = 404;
      throw error;
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.session.update({
        where: { id: sessionIdToRevoke },
        data: { revokedAt: now },
      }),
      prisma.refreshToken.updateMany({
        where: { sessionId: sessionIdToRevoke, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
  }

  /**
   * Retrieves user profile by ID without password hash.
   */
  async getUserById(userId: string): Promise<UserResponse | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

export const authService = new AuthService();
