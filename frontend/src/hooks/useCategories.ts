import { useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage } from '../lib/api';
import { Category, CreateCategoryInput, UpdateCategoryInput } from '../lib/types';

interface UseCategoriesReturn {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  createCategory: (input: CreateCategoryInput) => Promise<void>;
  updateCategory: (id: string, input: UpdateCategoryInput) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/financial/categories');
      setCategories(res.data.data.categories || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const createCategory = useCallback(async (input: CreateCategoryInput) => {
    await api.post('/financial/categories', input);
    await fetchCategories();
  }, [fetchCategories]);

  const updateCategory = useCallback(async (id: string, input: UpdateCategoryInput) => {
    await api.patch(`/financial/categories/${id}`, input);
    await fetchCategories();
  }, [fetchCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    await api.delete(`/financial/categories/${id}`);
    await fetchCategories();
  }, [fetchCategories]);

  return { categories, isLoading, error, createCategory, updateCategory, deleteCategory, refetch: fetchCategories };
}
