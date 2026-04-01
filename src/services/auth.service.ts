import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { userRepository } from '../repositories/user.repository';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.helpers';
import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from '../utils/errors';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
}

export class AuthService {
  // ── Register ────────────────────────────────────────────────────────────────

  async register(input: RegisterInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('An account with this email address already exists');
    }

    const hashedPassword = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

    const user = await userRepository.create({
      email:     input.email,
      password:  hashedPassword,
      firstName: input.firstName,
      lastName:  input.lastName,
    });

    const tokens = this.issueTokens(user.id, user.email, user.role);
    await userRepository.updateRefreshToken(user.id, tokens.refreshToken);

    return { user, tokens };
  }

  // ── Login ───────────────────────────────────────────────────────────────────

  async login(input: LoginInput) {
    const user = await userRepository.findByEmail(input.email);

    // Use a constant-time comparison even for "not found" to prevent timing attacks
    const dummyHash = '$2a$12$invalidhashinvalidhashinvalidha';
    const passwordMatch = await bcrypt.compare(
      input.password,
      user?.password ?? dummyHash,
    );

    if (!user || !passwordMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedError('Your account is inactive. Please contact support.');
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedError('Your account has been suspended. Please contact support.');
    }

    const tokens = this.issueTokens(user.id, user.email, user.role);
    await userRepository.updateRefreshToken(user.id, tokens.refreshToken);

    const safeUser = await userRepository.findById(user.id);
    return { user: safeUser, tokens };
  }

  // ── Refresh ─────────────────────────────────────────────────────────────────

  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    const payload = verifyRefreshToken(rawRefreshToken);

    const user = await userRepository.findByIdWithPassword(payload.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Verify the stored token matches (rotation check)
    if (user.refreshToken !== rawRefreshToken) {
      // Potential token reuse — invalidate all sessions
      await userRepository.updateRefreshToken(user.id, null);
      throw new UnauthorizedError('Refresh token has already been used. Please log in again.');
    }

    const tokens = this.issueTokens(user.id, user.email, user.role);
    await userRepository.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  // ── Logout ──────────────────────────────────────────────────────────────────

  async logout(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User');
    await userRepository.updateRefreshToken(userId, null);
  }

  // ── Get current user ────────────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User');
    return user;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private issueTokens(userId: string, email: string, role: string): AuthTokens {
    return {
      accessToken:  signAccessToken({ userId, email, role: role as never }),
      refreshToken: signRefreshToken({ userId }),
    };
  }
}

export const authService = new AuthService();
