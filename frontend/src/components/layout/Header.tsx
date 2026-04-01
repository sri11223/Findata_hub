import { useAuth } from '../../lib/auth-context';
import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/records': 'Financial Records',
  '/categories': 'Categories',
  '/analytics': 'Analytics',
  '/users': 'User Management',
};

export default function Header() {
  const { user } = useAuth();
  const location = useLocation();

  const title = pageTitles[location.pathname] || 'FinData Hub';

  return (
    <header className="sticky top-0 z-30 bg-surface-950/80 backdrop-blur-xl border-b border-surface-700/30">
      <div className="flex items-center justify-between px-8 py-4">
        <div>
          <h2 className="text-xl font-semibold text-surface-100">{title}</h2>
          <p className="text-xs text-surface-500 mt-0.5">
            Welcome back, {user?.firstName}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative p-2.5 rounded-xl bg-surface-800/60 text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
}
