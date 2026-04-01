import { useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage } from '../lib/api';
import {
  FinancialRecord,
  RecordFilters,
  PaginationMeta,
  CreateRecordInput,
  UpdateRecordInput,
} from '../lib/types';

interface UseRecordsReturn {
  records: FinancialRecord[];
  pagination: PaginationMeta | null;
  isLoading: boolean;
  error: string | null;
  filters: RecordFilters;
  setFilters: (f: RecordFilters) => void;
  createRecord: (input: CreateRecordInput) => Promise<void>;
  updateRecord: (id: string, input: UpdateRecordInput) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useRecords(): UseRecordsReturn {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RecordFilters>({ page: 1, limit: 20, sortBy: 'date', sortOrder: 'desc' });

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.type) params.set('type', filters.type);
      if (filters.categoryId) params.set('categoryId', filters.categoryId);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

      const res = await api.get(`/financial/records?${params.toString()}`);
      setRecords(res.data.data.records || []);
      setPagination(res.data.meta?.pagination || null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const createRecord = useCallback(async (input: CreateRecordInput) => {
    await api.post('/financial/records', input);
    await fetchRecords();
  }, [fetchRecords]);

  const updateRecord = useCallback(async (id: string, input: UpdateRecordInput) => {
    await api.patch(`/financial/records/${id}`, input);
    await fetchRecords();
  }, [fetchRecords]);

  const deleteRecord = useCallback(async (id: string) => {
    await api.delete(`/financial/records/${id}`);
    await fetchRecords();
  }, [fetchRecords]);

  return {
    records, pagination, isLoading, error,
    filters, setFilters,
    createRecord, updateRecord, deleteRecord,
    refetch: fetchRecords,
  };
}
