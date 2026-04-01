import { useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage } from '../lib/api';
import { DashboardSummary, MonthlyTrend, CategoryTotal, FinancialRecord } from '../lib/types';

interface DashboardData {
  summary: DashboardSummary | null;
  trends: MonthlyTrend[];
  categoryTotals: CategoryTotal[];
  recentActivity: FinancialRecord[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDashboard(): DashboardData {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [recentActivity, setRecentActivity] = useState<FinancialRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryRes, recentRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/recent?limit=10'),
      ]);
      setSummary(summaryRes.data.data.summary);
      setRecentActivity(recentRes.data.data.activity || []);

      // Try analytics (ANALYST+ only, may 403 for VIEWER)
      try {
        const [trendsRes, catRes] = await Promise.all([
          api.get('/dashboard/trends?months=6'),
          api.get('/dashboard/categories'),
        ]);
        setTrends(trendsRes.data.data.trends || []);
        setCategoryTotals(catRes.data.data.categoryTotals || []);
      } catch {
        // VIEWER won't have analytics access — that's OK
        setTrends([]);
        setCategoryTotals([]);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  return { summary, trends, categoryTotals, recentActivity, isLoading, error, refetch: fetchDashboard };
}
