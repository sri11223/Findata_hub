import { useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { hasPermission, Permission } from '../lib/rbac';
import { Role, DashboardAnalytics, TransactionType } from '../lib/types';
import { formatCurrency } from '../lib/utils';
import Spinner from '../components/ui/Spinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend,
  LineChart, Line, RadialBarChart, RadialBar,
} from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#eab308', '#ef4444', '#06b6d4', '#ec4899', '#f97316', '#8b5cf6', '#14b8a6', '#f43f5e'];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState(6);
  const canView = user && hasPermission(user.role as Role, Permission.READ_ANALYTICS);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/dashboard/analytics?months=${months}`);
      setAnalytics(res.data.data.analytics);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [months]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (!canView) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center glass-card p-12 max-w-md">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-surface-100 mb-2">Analytics Restricted</h2>
          <p className="text-surface-400">You need the Analyst role or above to access analytics.</p>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;
  if (error) return <div className="glass-card p-8 text-center text-danger-400">{error}</div>;
  if (!analytics) return null;

  const { summary, categoryTotals, monthlyTrends } = analytics;

  const incomeCategories = categoryTotals.filter(c => c.type === TransactionType.INCOME && c.total > 0)
    .map(c => ({ name: c.categoryName || 'Uncategorized', value: Number(c.total), count: c.count }));
  const expenseCategories = categoryTotals.filter(c => c.type === TransactionType.EXPENSE && c.total > 0)
    .map(c => ({ name: c.categoryName || 'Uncategorized', value: Number(c.total), count: c.count }));

  const netTrends = monthlyTrends.map(t => ({ ...t, net: Number(t.income) - Number(t.expenses) }));

  // Radial data for summary
  const totalFlow = Number(summary.totalIncome) + Number(summary.totalExpenses);
  const incomePercent = totalFlow > 0 ? (Number(summary.totalIncome) / totalFlow) * 100 : 50;
  const radialData = [
    { name: 'Income', value: incomePercent, fill: '#22c55e' },
    { name: 'Expense', value: 100 - incomePercent, fill: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-surface-400">Full analytics overview</p>
        <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className="select-field w-auto text-sm">
          <option value={3}>Last 3 months</option>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
          <option value={24}>Last 24 months</option>
        </select>
      </div>

      {/* Top Row: Summary + Radial */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <p className="text-sm text-surface-400 mb-1">Total Income</p>
          <p className="text-2xl font-bold text-success-400">{formatCurrency(summary.totalIncome)}</p>
          <p className="text-xs text-surface-500 mt-1">{summary.incomeCount} transactions</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-sm text-surface-400 mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-danger-400">{formatCurrency(summary.totalExpenses)}</p>
          <p className="text-xs text-surface-500 mt-1">{summary.expenseCount} transactions</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-sm text-surface-400 mb-1">Net Balance</p>
          <p className={`text-2xl font-bold ${Number(summary.netBalance) >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
            {formatCurrency(summary.netBalance)}
          </p>
          <p className="text-xs text-surface-500 mt-1">{Number(summary.netBalance) >= 0 ? 'Surplus' : 'Deficit'}</p>
        </div>
        <div className="glass-card p-5 flex items-center justify-center">
          <ResponsiveContainer width={120} height={120}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
              <RadialBar dataKey="value" cornerRadius={8} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="ml-2 space-y-1">
            <div className="flex items-center gap-1.5 text-xs"><div className="w-2 h-2 rounded-full bg-success-500" /><span className="text-surface-400">{incomePercent.toFixed(0)}% Inc</span></div>
            <div className="flex items-center gap-1.5 text-xs"><div className="w-2 h-2 rounded-full bg-danger-500" /><span className="text-surface-400">{(100 - incomePercent).toFixed(0)}% Exp</span></div>
          </div>
        </div>
      </div>

      {/* Net Balance Trend Line */}
      <div className="glass-card p-6">
        <h3 className="text-base font-semibold text-surface-200 mb-4">Net Balance Trend</h3>
        {netTrends.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={netTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="monthLabel" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} />
              <Line type="monotone" dataKey="net" name="Net" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }} />
              <Line type="monotone" dataKey="income" name="Income" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" />
              <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-center text-surface-500 py-12">No trend data</p>}
      </div>

      {/* Monthly Comparison */}
      <div className="glass-card p-6">
        <h3 className="text-base font-semibold text-surface-200 mb-4">Monthly Income vs Expenses</h3>
        {monthlyTrends.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrends}>
              <defs>
                <linearGradient id="analyticsIncGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="analyticsExpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="monthLabel" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
              <Area type="monotone" dataKey="income" name="Income" stroke="#22c55e" fill="url(#analyticsIncGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" fill="url(#analyticsExpGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <p className="text-center text-surface-500 py-12">No trend data</p>}
      </div>

      {/* Category Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Categories */}
        <div className="glass-card p-6">
          <h3 className="text-base font-semibold text-surface-200 mb-4">Income by Category</h3>
          {incomeCategories.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={incomeCategories} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={4} dataKey="value">
                    {incomeCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {incomeCategories.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-surface-400">{item.name}</span>
                      <span className="text-surface-600">({item.count})</span>
                    </div>
                    <span className="text-surface-300 font-medium">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-center text-surface-500 py-12">No income data</p>}
        </div>

        {/* Expense Categories */}
        <div className="glass-card p-6">
          <h3 className="text-base font-semibold text-surface-200 mb-4">Expenses by Category</h3>
          {expenseCategories.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={expenseCategories} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={4} dataKey="value">
                    {expenseCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {expenseCategories.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-surface-400">{item.name}</span>
                      <span className="text-surface-600">({item.count})</span>
                    </div>
                    <span className="text-surface-300 font-medium">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-center text-surface-500 py-12">No expense data</p>}
        </div>
      </div>

      {/* Top categories bar chart */}
      {expenseCategories.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-base font-semibold text-surface-200 mb-4">Top Expense Categories</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={expenseCategories.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} width={120} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="value" name="Amount" fill="#ef4444" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
