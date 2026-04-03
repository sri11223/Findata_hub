import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../lib/auth-context';
import { hasPermission, Permission } from '../lib/rbac';
import { Role, TransactionType } from '../lib/types';
import { formatCurrency, formatRelativeTime } from '../lib/utils';
import Spinner from '../components/ui/Spinner';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';

const PIE_COLORS = ['#6366f1', '#22c55e', '#eab308', '#ef4444', '#06b6d4', '#ec4899', '#f97316', '#8b5cf6', '#14b8a6', '#f43f5e'];

export default function DashboardPage() {
  const { summary, trends, categoryTotals, recentActivity, isLoading, error } = useDashboard();
  const { user } = useAuth();
  const canViewAnalytics = user && hasPermission(user.role as Role, Permission.READ_ANALYTICS);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-danger-400">{error}</p>
      </div>
    );
  }

  const summaryCards = [
    {
      label: 'Total Income',
      value: formatCurrency(summary?.totalIncome ?? 0),
      icon: TrendingUp,
      iconBg: 'bg-success-500/20',
      iconColor: 'text-success-400',
      count: summary?.incomeCount ?? 0,
      countLabel: 'transactions',
    },
    {
      label: 'Total Expenses',
      value: formatCurrency(summary?.totalExpenses ?? 0),
      icon: TrendingDown,
      iconBg: 'bg-danger-500/20',
      iconColor: 'text-danger-400',
      count: summary?.expenseCount ?? 0,
      countLabel: 'transactions',
    },
    {
      label: 'Net Balance',
      value: formatCurrency(summary?.netBalance ?? 0),
      icon: Wallet,
      iconBg: 'bg-primary-500/20',
      iconColor: 'text-primary-400',
      count: null,
      countLabel: (summary?.netBalance ?? 0) >= 0 ? 'Surplus' : 'Deficit',
    },
    {
      label: 'Total Records',
      value: String(summary?.recordCount ?? 0),
      icon: Receipt,
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
      count: null,
      countLabel: 'financial entries',
    },
  ];

  // Prepare pie chart data
  const expenseByCategory = categoryTotals
    .filter((c) => c.type === TransactionType.EXPENSE && c.total > 0)
    .map((c) => ({
      name: c.categoryName || 'Uncategorized',
      value: Number(c.total),
    }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="glass-card-hover p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-surface-100">{card.value}</p>
              <p className="text-sm text-surface-400 mt-1">{card.label}</p>
              {card.count !== null && (
                <p className="text-xs text-surface-500 mt-2">
                  {card.count} {card.countLabel}
                </p>
              )}
              {card.count === null && (
                <p className="text-xs text-surface-500 mt-2">{card.countLabel}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      {canViewAnalytics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Trends - Area Chart */}
          <div className="lg:col-span-2 glass-card p-6">
            <h3 className="text-base font-semibold text-surface-200 mb-4">Monthly Trends</h3>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="monthLabel" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Area type="monotone" dataKey="income" name="Income" stroke="#22c55e" fill="url(#incomeGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-surface-500 py-12">No trend data available</p>
            )}
          </div>

          {/* Category Breakdown - Pie Chart */}
          <div className="glass-card p-6">
            <h3 className="text-base font-semibold text-surface-200 mb-4">Expense by Category</h3>
            {expenseByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {expenseByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-surface-500 py-12">No category data available</p>
            )}
            {/* Legend */}
            <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto">
              {expenseByCategory.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-surface-400">{item.name}</span>
                  </div>
                  <span className="text-surface-300 font-medium">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Income vs Expense Bar Chart */}
      {canViewAnalytics && trends.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-base font-semibold text-surface-200 mb-4">Income vs Expense Comparison</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trends} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="monthLabel" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }}
              />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
              <Bar dataKey="income" name="Income" fill="#22c55e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Activity */}
      <div className="glass-card p-6">
        <h3 className="text-base font-semibold text-surface-200 mb-4">Recent Activity</h3>
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-800/40 hover:bg-surface-800/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      record.type === TransactionType.INCOME
                        ? 'bg-success-500/20 text-success-400'
                        : 'bg-danger-500/20 text-danger-400'
                    }`}
                  >
                    {record.type === TransactionType.INCOME ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-200">
                      {record.description || record.category?.name || record.type}
                    </p>
                    <p className="text-xs text-surface-500">
                      {record.category?.name && `${record.category.name} · `}
                      {formatRelativeTime(record.date)}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    record.type === TransactionType.INCOME ? 'text-success-400' : 'text-danger-400'
                  }`}
                >
                  {record.type === TransactionType.INCOME ? '+' : '-'}
                  {formatCurrency(record.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-surface-500 py-8">No recent activity</p>
        )}
      </div>
    </div>
  );
}
