import bcrypt from 'bcryptjs';
import { Role, UserStatus } from '@prisma/client';
import { env } from '../config/env';
import { userRepository } from '../repositories/user.repository';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '../utils/errors';
import {
  UserFilters,
  CreateUserInput,
  UpdateUserInput,
  UpdateUserStatusInput,
  ChangeUserRoleInput,
} from '../types/user.types';
import { ROLE_HIERARCHY } from '../constants/permissions';

export class UserService {
  // ── List ────────────────────────────────────────────────────────────────────

  async listUsers(filters: UserFilters) {
    return userRepository.findMany(filters);
  }

  // ── Get by ID ────────────────────────────────────────────────────────────────

  async getUserById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User');
    return user;
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  async createUser(input: CreateUserInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    const hashedPassword = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

    return userRepository.create({
      email:     input.email,
      password:  hashedPassword,
      firstName: input.firstName,
      lastName:  input.lastName,
      role:      input.role,
    });
  }

  // ── Update profile ───────────────────────────────────────────────────────────

  async updateUser(targetId: string, input: UpdateUserInput, requesterId: string, requesterRole: Role) {
    const target = await userRepository.findById(targetId);
    if (!target) throw new NotFoundError('User');

    // Non-admin users can only update themselves
    if (ROLE_HIERARCHY[requesterRole] < ROLE_HIERARCHY[Role.ADMIN] && targetId !== requesterId) {
      throw new ForbiddenError('You can only update your own profile');
    }

    // Email uniqueness check
    if (input.email && input.email !== target.email) {
      const existing = await userRepository.findByEmail(input.email);
      if (existing) throw new ConflictError('Email address is already in use');
    }

    return userRepository.update(targetId, input);
  }

  // ── Update status ────────────────────────────────────────────────────────────

  async updateUserStatus(
    targetId: string,
    input: UpdateUserStatusInput,
    requesterId: string,
    requesterRole: Role,
  ) {
    const target = await userRepository.findById(targetId);
    if (!target) throw new NotFoundError('User');

    // Admins cannot suspend/deactivate a SUPER_ADMIN or another ADMIN with higher/equal role
    if (
      ROLE_HIERARCHY[requesterRole] <= ROLE_HIERARCHY[target.role as Role] &&
      targetId !== requesterId
    ) {
      throw new ForbiddenError('You cannot modify the status of a user with equal or higher role');
    }

    return userRepository.updateStatus(targetId, input.status);
  }

  // ── Change role ──────────────────────────────────────────────────────────────

  async changeUserRole(
    targetId: string,
    input: ChangeUserRoleInput,
    requesterId: string,
    requesterRole: Role,
  ) {
    if (targetId === requesterId) {
      throw new BadRequestError('You cannot change your own role');
    }

    const target = await userRepository.findById(targetId);
    if (!target) throw new NotFoundError('User');

    // Cannot assign a role higher than your own
    if (ROLE_HIERARCHY[input.role] >= ROLE_HIERARCHY[requesterRole]) {
      throw new ForbiddenError(`You cannot assign the ${input.role} role (it is at or above your own role)`);
    }

    return userRepository.updateRole(targetId, input.role);
  }

  // ── Soft delete ──────────────────────────────────────────────────────────────

  async deleteUser(targetId: string, requesterId: string, requesterRole: Role) {
    if (targetId === requesterId) {
      throw new BadRequestError('You cannot delete your own account through this endpoint');
    }

    const target = await userRepository.findById(targetId);
    if (!target) throw new NotFoundError('User');

    if (ROLE_HIERARCHY[requesterRole] <= ROLE_HIERARCHY[target.role as Role]) {
      throw new ForbiddenError('You cannot delete a user with equal or higher role');
    }

    return userRepository.softDelete(targetId);
  }
}

export const userService = new UserService();
