/**
 * Unit tests — AuthService
 *
 * The Prisma client and bcrypt are mocked so tests run without a real database.
 */
import '../../helpers/test-setup';

// ── Mock modules before the service is imported ───────────────────────────────
jest.mock('../../../src/config/database', () => ({
  prisma: {
    user: {
      findFirst:  jest.fn(),
      findUnique: jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({
  hash:    jest.fn().mockResolvedValue('$hashed'),
  compare: jest.fn(),
}));

import bcrypt from 'bcryptjs';
import { authService } from '../../../src/services/auth.service';
import { userRepository } from '../../../src/repositories/user.repository';
import { ConflictError, UnauthorizedError } from '../../../src/utils/errors';
import { Role, UserStatus } from '@prisma/client';

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockUser = {
  id:        'user-uuid-1',
  email:     'test@example.com',
  firstName: 'Test',
  lastName:  'User',
  role:      Role.VIEWER,
  status:    UserStatus.ACTIVE,
  password:  '$hashed',
  refreshToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const safeUser = {
  id:        mockUser.id,
  email:     mockUser.email,
  firstName: mockUser.firstName,
  lastName:  mockUser.lastName,
  role:      mockUser.role,
  status:    mockUser.status,
  createdAt: mockUser.createdAt,
  updatedAt: mockUser.updatedAt,
};

// ── Test suite ────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates a new user and returns tokens', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockResolvedValue(safeUser);
      jest.spyOn(userRepository, 'updateRefreshToken').mockResolvedValue(undefined);

      const result = await authService.register({
        email:     'test@example.com',
        password:  'Test@1234',
        firstName: 'Test',
        lastName:  'User',
      });

      expect(result.user).toEqual(safeUser);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(bcrypt.hash).toHaveBeenCalledWith('Test@1234', expect.any(Number));
    });

    it('throws ConflictError when email is already taken', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(safeUser as never);

      await expect(
        authService.register({
          email:     'test@example.com',
          password:  'Test@1234',
          firstName: 'Test',
          lastName:  'User',
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns tokens on valid credentials', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockUser as never);
      jest.spyOn(userRepository, 'findById').mockResolvedValue(safeUser as never);
      jest.spyOn(userRepository, 'updateRefreshToken').mockResolvedValue(undefined);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login({
        email:    'test@example.com',
        password: 'Test@1234',
      });

      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('throws UnauthorizedError on wrong password', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockUser as never);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({ email: 'test@example.com', password: 'Wrong@123' }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError when user not found', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({ email: 'nobody@example.com', password: 'Test@1234' }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError for suspended account', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      } as never);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        authService.login({ email: 'test@example.com', password: 'Test@1234' }),
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  // ── logout ─────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('clears the refresh token', async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(safeUser as never);
      const updateSpy = jest
        .spyOn(userRepository, 'updateRefreshToken')
        .mockResolvedValue(undefined);

      await authService.logout('user-uuid-1');

      expect(updateSpy).toHaveBeenCalledWith('user-uuid-1', null);
    });
  });
});
