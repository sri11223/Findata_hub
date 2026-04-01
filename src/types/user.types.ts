import { Role, UserStatus } from '@prisma/client';

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: Role;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface UpdateUserStatusInput {
  status: UserStatus;
}

export interface ChangeUserRoleInput {
  role: Role;
}

export interface UserFilters {
  role?: Role;
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
}

/** Safe user shape — never includes password or refreshToken. */
export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}
