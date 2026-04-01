import { Role } from '@prisma/client';
import {
  financialRepository,
  categoryRepository,
} from '../repositories/financial.repository';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import {
  CreateRecordInput,
  UpdateRecordInput,
  RecordFilters,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../types/financial.types';
import { hasPermission, ROLE_HIERARCHY, Permission } from '../constants/permissions';

export class FinancialService {
  // ── Records ──────────────────────────────────────────────────────────────────

  async listRecords(filters: RecordFilters, requesterId: string, requesterRole: Role) {
    // VIEWER & ANALYST without READ_ALL_RECORDS can only see their own records
    const canReadAll = hasPermission(requesterRole, Permission.READ_ALL_RECORDS);
    const scopedUserId = canReadAll ? filters.userId : requesterId;

    return financialRepository.findManyRecords(filters, scopedUserId);
  }

  async getRecordById(id: string, requesterId: string, requesterRole: Role) {
    const record = await financialRepository.findRecordById(id);
    if (!record) throw new NotFoundError('Financial record');

    const canReadAll = hasPermission(requesterRole, Permission.READ_ALL_RECORDS);
    if (!canReadAll && record.userId !== requesterId) {
      throw new NotFoundError('Financial record'); // Mask existence for unauthorised users
    }

    return record;
  }

  async createRecord(input: CreateRecordInput, userId: string) {
    // Validate category exists if provided
    if (input.categoryId) {
      const category = await categoryRepository.findById(input.categoryId);
      if (!category) throw new NotFoundError('Category');
    }

    return financialRepository.createRecord(userId, input);
  }

  async updateRecord(
    id: string,
    input: UpdateRecordInput,
    requesterId: string,
    requesterRole: Role,
  ) {
    const record = await financialRepository.findRecordById(id);
    if (!record) throw new NotFoundError('Financial record');

    const canUpdateAny = hasPermission(requesterRole, Permission.UPDATE_ANY_RECORD);
    const canUpdateOwn = hasPermission(requesterRole, Permission.UPDATE_OWN_RECORD);

    if (!canUpdateAny && (!canUpdateOwn || record.userId !== requesterId)) {
      throw new ForbiddenError('You do not have permission to update this record');
    }

    // Validate new categoryId if provided
    if (input.categoryId !== undefined && input.categoryId !== null) {
      const category = await categoryRepository.findById(input.categoryId);
      if (!category) throw new NotFoundError('Category');
    }

    return financialRepository.updateRecord(id, input);
  }

  async deleteRecord(id: string, requesterId: string, requesterRole: Role) {
    const record = await financialRepository.findRecordById(id);
    if (!record) throw new NotFoundError('Financial record');

    const canDelete = hasPermission(requesterRole, Permission.DELETE_RECORD);
    if (!canDelete) {
      throw new ForbiddenError('You do not have permission to delete records');
    }

    // Admins can delete any; if we want to restrict to own, check here
    if (
      ROLE_HIERARCHY[requesterRole] <= ROLE_HIERARCHY[Role.ANALYST] &&
      record.userId !== requesterId
    ) {
      throw new ForbiddenError('You can only delete your own records');
    }

    return financialRepository.softDeleteRecord(id);
  }

  // ── Categories ────────────────────────────────────────────────────────────

  async listCategories() {
    return categoryRepository.findAll();
  }

  async getCategoryById(id: string) {
    const category = await categoryRepository.findById(id);
    if (!category) throw new NotFoundError('Category');
    return category;
  }

  async createCategory(input: CreateCategoryInput) {
    const existing = await categoryRepository.findByName(input.name);
    if (existing) throw new ConflictError(`Category "${input.name}" already exists`);
    return categoryRepository.create(input);
  }

  async updateCategory(id: string, input: UpdateCategoryInput) {
    const category = await categoryRepository.findById(id);
    if (!category) throw new NotFoundError('Category');

    if (input.name && input.name !== category.name) {
      const existing = await categoryRepository.findByName(input.name);
      if (existing) throw new ConflictError(`Category "${input.name}" already exists`);
    }

    return categoryRepository.update(id, input);
  }

  async deleteCategory(id: string) {
    const category = await categoryRepository.findById(id);
    if (!category) throw new NotFoundError('Category');
    return categoryRepository.delete(id);
  }
}

export const financialService = new FinancialService();
