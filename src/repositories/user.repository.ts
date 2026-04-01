import { Prisma, Role, UserStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { UserFilters, CreateUserInput, UpdateUserInput } from '../types/user.types';
import { parsePagination } from '../utils/pagination';

// Columns returned from the DB — never expose password or refreshToken
const safeUserSelect = {
  id:        true,
  email:     true,
  firstName: true,
  lastName:  true,
  role:      true,
  status:    true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export class UserRepository {
  // ── Finders ─────────────────────────────────────────────────────────────────

  async findById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: safeUserSelect,
    });
  }

  async findByIdWithPassword(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async findMany(filters: UserFilters) {
    const { page, limit, skip } = parsePagination(filters.page, filters.limit);

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(filters.role   && { role:   filters.role }),
      ...(filters.status && { status: filters.status }),
      ...(filters.search && {
        OR: [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName:  { contains: filters.search, mode: 'insensitive' } },
          { email:     { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: safeUserSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  async create(data: CreateUserInput & { password: string }) {
    return prisma.user.create({
      data: {
        email:     data.email,
        password:  data.password,
        firstName: data.firstName,
        lastName:  data.lastName,
        role:      data.role ?? Role.VIEWER,
      },
      select: safeUserSelect,
    });
  }

  async update(id: string, data: UpdateUserInput) {
    return prisma.user.update({
      where: { id },
      data,
      select: safeUserSelect,
    });
  }

  async updateStatus(id: string, status: UserStatus) {
    return prisma.user.update({
      where: { id },
      data:  { status },
      select: safeUserSelect,
    });
  }

  async updateRole(id: string, role: Role) {
    return prisma.user.update({
      where: { id },
      data:  { role },
      select: safeUserSelect,
    });
  }

  async updateRefreshToken(id: string, token: string | null): Promise<void> {
    await prisma.user.update({
      where: { id },
      data:  { refreshToken: token },
    });
  }

  async softDelete(id: string) {
    return prisma.user.update({
      where: { id },
      data:  { deletedAt: new Date(), status: UserStatus.INACTIVE },
      select: safeUserSelect,
    });
  }

  async countByRole(role: Role): Promise<number> {
    return prisma.user.count({ where: { role, deletedAt: null } });
  }
}

export const userRepository = new UserRepository();
