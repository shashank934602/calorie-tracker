import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtAccessTokenPayload {
  userId: string;
  sessionId: string;
}

export const REFRESH_COOKIE_NAME = 'calorietrack_refresh';

export class TokenService {
  /**
   * Generates a signed short-lived JWT access token.
   */
  public generateAccessToken(payload: JwtAccessTokenPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  }

  /**
   * Generates a cryptographically random, high-entropy refresh token string.
   */
  public generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Computes the SHA-256 hash of a refresh token for safe storage and lookup in PostgreSQL.
   */
  public hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Helper to determine sameSite and secure flags for cookie transmission.
   */
  private resolveCookieSecurityFlags(): { sameSite: 'lax' | 'none' | 'strict'; secure: boolean } {
    const isProd = env.NODE_ENV === 'production';
    const sameSite = env.COOKIE_SAME_SITE || (isProd ? 'none' : 'lax');
    const secure = isProd || sameSite === 'none';
    return { sameSite, secure };
  }

  /**
   * Returns secure HttpOnly cookie options for transmitting the refresh token.
   */
  public getRefreshCookieOptions(expiresAt: Date) {
    const { sameSite, secure } = this.resolveCookieSecurityFlags();
    return {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      expires: expiresAt,
    };
  }

  /**
   * Returns options for clearing the refresh token cookie upon logout or reuse revocation.
   */
  public getClearCookieOptions() {
    const { sameSite, secure } = this.resolveCookieSecurityFlags();
    return {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
    };
  }
}

export const tokenService = new TokenService();
