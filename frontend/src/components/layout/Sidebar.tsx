import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import { hasPermission, Permission, formatRole, getRoleBadgeClass } from '../../lib/rbac';
import { Role } from '../../lib/types';
import { getInitials } from '../../lib/utils';
import {
  LayoutDashboard,
  Receipt,
  Tags,
  Users,
  LogOut,
  TrendingUp,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', permission: null },
  { to: '/records', icon: Receipt, label: 'Records', permission: null },
  { to: '/categories', icon: Tags, label: 'Categories', permission: null },
  { to: '/analytics', icon: TrendingUp, label: 'Analytics', permission: Permission.READ_ANALYTICS },
  { to: '/users', icon: Users, label: 'Users', permission: Permission.READ_ALL_USERS },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface-900/80 backdrop-blur-xl border-r border-surface-700/50 flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-surface-700/50">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          FinData Hub
        </h1>
        <p className="text-xs text-surface-500 mt-0.5">Finance Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          // Skip items the user doesn't have permission for
          if (item.permission && !hasPermission(user.role as Role, item.permission)) {
            return null;
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-600/20 text-primary-400 shadow-sm shadow-primary-500/10'
                    : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-surface-700/50">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 rounded-full bg-primary-600/30 flex items-center justify-center text-sm font-semibold text-primary-400">
            {getInitials(user.firstName, user.lastName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-200 truncate">
              {user.firstName} {user.lastName}
            </p>
            <span className={getRoleBadgeClass(user.role as Role)} style={{ fontSize: '10px', padding: '1px 6px' }}>
              {formatRole(user.role as Role)}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 mt-1 rounded-xl text-sm font-medium text-surface-400 hover:bg-surface-800 hover:text-danger-400 transition-all duration-200"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
