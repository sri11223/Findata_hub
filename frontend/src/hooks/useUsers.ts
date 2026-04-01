import { useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage } from '../lib/api';
import { User, UserFilters, PaginationMeta, CreateUserInput, UpdateUserInput, Role, UserStatus } from '../lib/types';

interface UseUsersReturn {
  users: User[];
  pagination: PaginationMeta | null;
  isLoading: boolean;
  error: string | null;
  filters: UserFilters;
  setFilters: (f: UserFilters) => void;
  createUser: (input: CreateUserInput) => Promise<void>;
  updateUser: (id: string, input: UpdateUserInput) => Promise<void>;
  updateUserStatus: (id: string, status: UserStatus) => Promise<void>;
  changeUserRole: (id: string, role: Role) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UserFilters>({ page: 1, limit: 20 });

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.role) params.set('role', filters.role);
      if (filters.status) params.set('status', filters.status);
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));

      const res = await api.get(`/users?${params.toString()}`);
      setUsers(res.data.data.users || []);
      setPagination(res.data.meta?.pagination || null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const createUser = useCallback(async (input: CreateUserInput) => {
    await api.post('/users', input);
    await fetchUsers();
  }, [fetchUsers]);

  const updateUser = useCallback(async (id: string, input: UpdateUserInput) => {
    await api.patch(`/users/${id}`, input);
    await fetchUsers();
  }, [fetchUsers]);

  const updateUserStatus = useCallback(async (id: string, status: UserStatus) => {
    await api.patch(`/users/${id}/status`, { status });
    await fetchUsers();
  }, [fetchUsers]);

  const changeUserRole = useCallback(async (id: string, role: Role) => {
    await api.patch(`/users/${id}/role`, { role });
    await fetchUsers();
  }, [fetchUsers]);

  const deleteUser = useCallback(async (id: string) => {
    await api.delete(`/users/${id}`);
    await fetchUsers();
  }, [fetchUsers]);

  return {
    users, pagination, isLoading, error,
    filters, setFilters,
    createUser, updateUser, updateUserStatus, changeUserRole, deleteUser,
    refetch: fetchUsers,
  };
}
