/**
 * Unit tests — UserService
 */
import '../../helpers/test-setup';

jest.mock('../../../src/config/database', () => ({
  prisma: {
    user: {
      findFirst:  jest.fn(),
      findUnique: jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
      count:      jest.fn(),
      findMany:   jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('bcryptjs', () => ({
  hash:    jest.fn().mockResolvedValue('$hashed'),
  compare: jest.fn(),
}));

import { userService } from '../../../src/services/user.service';
import { userRepository } from '../../../src/repositories/user.repository';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '../../../src/utils/errors';
import { Role, UserStatus } from '@prisma/client';

const makeUser = (overrides = {}) => ({
  id:        'user-1',
  email:     'user@example.com',
  firstName: 'Alice',
  lastName:  'Smith',
  role:      Role.VIEWER,
  status:    UserStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('UserService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── getUserById ────────────────────────────────────────────────────────────

  describe('getUserById', () => {
    it('returns the user when found', async () => {
      const user = makeUser();
      jest.spyOn(userRepository, 'findById').mockResolvedValue(user as never);

      const result = await userService.getUserById('user-1');
      expect(result).toEqual(user);
    });

    it('throws NotFoundError when user does not exist', async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(null);
      await expect(userService.getUserById('ghost')).rejects.toThrow(NotFoundError);
    });
  });

  // ── createUser ─────────────────────────────────────────────────────────────

  describe('createUser', () => {
    it('creates a user when email is unique', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      const newUser = makeUser({ role: Role.ANALYST });
      jest.spyOn(userRepository, 'create').mockResolvedValue(newUser as never);

      const result = await userService.createUser({
        email:     'analyst@example.com',
        password:  'Test@1234',
        firstName: 'Bob',
        lastName:  'Jones',
        role:      Role.ANALYST,
      });

      expect(result.role).toBe(Role.ANALYST);
    });

    it('throws ConflictError when email exists', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(makeUser() as never);

      await expect(
        userService.createUser({
          email:     'user@example.com',
          password:  'Test@1234',
          firstName: 'Bob',
          lastName:  'Jones',
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  // ── changeUserRole ─────────────────────────────────────────────────────────

  describe('changeUserRole', () => {
    it('prohibits changing own role', async () => {
      await expect(
        userService.changeUserRole('self-id', { role: Role.ADMIN }, 'self-id', Role.SUPER_ADMIN),
      ).rejects.toThrow(BadRequestError);
    });

    it('prohibits assigning role equal to or above requester', async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(makeUser() as never);

      await expect(
        userService.changeUserRole('other-id', { role: Role.ADMIN }, 'self-id', Role.ADMIN),
      ).rejects.toThrow(ForbiddenError);
    });

    it('succeeds when assigning a role below the requester', async () => {
      const target = makeUser({ id: 'target-id', role: Role.VIEWER });
      jest.spyOn(userRepository, 'findById').mockResolvedValue(target as never);
      const updatedUser = { ...target, role: Role.ANALYST };
      jest.spyOn(userRepository, 'updateRole').mockResolvedValue(updatedUser as never);

      const result = await userService.changeUserRole(
        'target-id',
        { role: Role.ANALYST },
        'admin-id',
        Role.SUPER_ADMIN,
      );

      expect(result.role).toBe(Role.ANALYST);
    });
  });

  // ── deleteUser ─────────────────────────────────────────────────────────────

  describe('deleteUser', () => {
    it('throws BadRequestError when deleting self', async () => {
      await expect(
        userService.deleteUser('self-id', 'self-id', Role.SUPER_ADMIN),
      ).rejects.toThrow(BadRequestError);
    });

    it('throws ForbiddenError when target has equal/higher role', async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(makeUser({ role: Role.ADMIN }) as never);

      await expect(
        userService.deleteUser('target', 'requester', Role.ADMIN),
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
