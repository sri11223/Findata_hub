import { prisma } from '../config/database';

import { Prisma } from '@prisma/client';

export interface CreateAuditLogInput {
  userId:     string;
  action:     string;
  resource:   string;
  resourceId?: string;
  details?:   Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditRepository {
  async create(data: CreateAuditLogInput) {
    return prisma.auditLog.create({ data });
  }

  async findByUser(userId: string, limit = 50) {
    return prisma.auditLog.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    limit,
    });
  }

  async findByResource(resource: string, resourceId: string, limit = 50) {
    return prisma.auditLog.findMany({
      where:   { resource, resourceId },
      orderBy: { createdAt: 'desc' },
      take:    limit,
    });
  }
}

export const auditRepository = new AuditRepository();
