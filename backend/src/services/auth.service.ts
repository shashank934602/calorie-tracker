import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { RegisterInput, LoginInput } from '../schemas/auth.schema';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResult {
  user: UserResponse;
  token: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export class AuthService {
  /**
   * Generates a signed JWT for an authenticated user.
   */
  private generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  }

  /**
   * Registers a new user account.
   */
  async register(data: RegisterInput): Promise<AuthResult> {
    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      const error = new Error('An account with this email address already exists');
      (error as Error & { statusCode?: number }).statusCode = 409;
      throw error;
    }

    // Hash password with bcrypt (salt rounds = 10)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    // Create user in PostgreSQL database
    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Generate JWT token
    const token = this.generateToken({
      userId: newUser.id,
      email: newUser.email,
    });

    return {
      user: newUser,
      token,
    };
  }

  /**
   * Authenticates a user with email and password.
   */
  async login(data: LoginInput): Promise<AuthResult> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      const error = new Error('Invalid email or password');
      (error as Error & { statusCode?: number }).statusCode = 401;
      throw error;
    }

    // Verify password against stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      (error as Error & { statusCode?: number }).statusCode = 401;
      throw error;
    }

    // Generate JWT token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    };
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
