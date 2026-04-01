import { useState } from 'react';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../lib/auth-context';
import { hasPermission, Permission, formatRole, getRoleBadgeClass, getStatusBadgeClass } from '../lib/rbac';
import { Role, UserStatus, User, CreateUserInput } from '../lib/types';
import { formatDate, getInitials } from '../lib/utils';
import { getErrorMessage } from '../lib/api';
import Spinner from '../components/ui/Spinner';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';
import { Plus, Edit3, Trash2, Shield, UserCheck, UserX, Search, Users } from 'lucide-react';

export default function UsersPage() {
  const { user: me } = useAuth();
  const { users, pagination, isLoading, filters, setFilters, createUser, updateUser, updateUserStatus, changeUserRole, deleteUser } = useUsers();

  const canCreate = me && hasPermission(me.role as Role, Permission.CREATE_USER);
  const canUpdateStatus = me && hasPermission(me.role as Role, Permission.UPDATE_USER_STATUS);
  const canChangeRole = me && hasPermission(me.role as Role, Permission.CHANGE_USER_ROLE);
  const canDeleteUser = me && hasPermission(me.role as Role, Permission.DELETE_USER);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchText, setSearchText] = useState('');

  const [createForm, setCreateForm] = useState<CreateUserInput>({ email: '', password: '', firstName: '', lastName: '', role: Role.VIEWER });

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      await createUser(createForm);
      toast.success('User created');
      setShowCreateModal(false);
      setCreateForm({ email: '', password: '', firstName: '', lastName: '', role: Role.VIEWER });
    } catch (err) { toast.error(getErrorMessage(err)); } finally { setIsSubmitting(false); }
  };

  const handleUpdateProfile = async () => {
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      await updateUser(editingUser.id, { firstName: editingUser.firstName, lastName: editingUser.lastName, email: editingUser.email });
      toast.success('User updated');
      setEditingUser(null);
    } catch (err) { toast.error(getErrorMessage(err)); } finally { setIsSubmitting(false); }
  };

  const handleStatusChange = async (userId: string, status: UserStatus) => {
    try {
      await updateUserStatus(userId, status);
      toast.success(`User ${status.toLowerCase()}`);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleRoleChange = async (userId: string, role: Role) => {
    try {
      await changeUserRole(userId, role);
      toast.success('Role changed');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsSubmitting(true);
    try {
      await deleteUser(deletingId);
      toast.success('User deleted');
      setDeletingId(null);
    } catch (err) { toast.error(getErrorMessage(err)); } finally { setIsSubmitting(false); }
  };

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setFilters({ ...filters, search: searchText, page: 1 })}
              className="input-field pl-10"
              placeholder="Search users..."
            />
          </div>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> New User
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filters.role || ''}
            onChange={(e) => setFilters({ ...filters, role: e.target.value as Role || undefined, page: 1 })}
            className="select-field w-auto text-sm"
          >
            <option value="">All roles</option>
            {Object.values(Role).map((r) => <option key={r} value={r}>{formatRole(r)}</option>)}
          </select>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as UserStatus || undefined, page: 1 })}
            className="select-field w-auto text-sm"
          >
            <option value="">All statuses</option>
            {Object.values(UserStatus).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Users Table */}
      {users.length === 0 ? (
        <EmptyState icon={<Users className="w-12 h-12" />} title="No users found" description="No users match your filters." />
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-700/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">User</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Joined</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-600/30 flex items-center justify-center text-xs font-semibold text-primary-400">
                          {getInitials(u.firstName, u.lastName)}
                        </div>
                        <span className="text-sm font-medium text-surface-200">{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-surface-400">{u.email}</td>
                    <td className="px-5 py-3.5">
                      {canChangeRole && u.id !== me?.id ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                          className="select-field w-auto text-xs py-1 px-2"
                        >
                          {Object.values(Role).map((r) => <option key={r} value={r}>{formatRole(r)}</option>)}
                        </select>
                      ) : (
                        <span className={getRoleBadgeClass(u.role as Role)}>{formatRole(u.role as Role)}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {canUpdateStatus && u.id !== me?.id ? (
                        <select
                          value={u.status}
                          onChange={(e) => handleStatusChange(u.id, e.target.value as UserStatus)}
                          className={`select-field w-auto text-xs py-1 px-2 ${
                            u.status === 'ACTIVE' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
                            u.status === 'SUSPENDED' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                            'text-gray-400 border-gray-500/30 bg-gray-500/10'
                          }`}
                        >
                          {Object.values(UserStatus).map((s) => (
                            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={getStatusBadgeClass(u.status)}>{u.status}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-surface-400">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditingUser({ ...u })} className="p-1.5 rounded-lg text-surface-400 hover:text-primary-400 hover:bg-surface-700 transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {canDeleteUser && u.id !== me?.id && (
                          <button onClick={() => setDeletingId(u.id)} className="p-1.5 rounded-lg text-surface-400 hover:text-danger-400 hover:bg-surface-700 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && (
            <div className="px-5 py-3 border-t border-surface-700/50">
              <Pagination pagination={pagination} onPageChange={(page) => setFilters({ ...filters, page })} />
            </div>
          )}
        </div>
      )}

      {/* Create User Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create User">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">First Name</label>
              <input type="text" value={createForm.firstName} onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="label-text">Last Name</label>
              <input type="text" value={createForm.lastName} onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })} className="input-field" required />
            </div>
          </div>
          <div>
            <label className="label-text">Email</label>
            <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="label-text">Password</label>
            <input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className="input-field" required minLength={8} />
          </div>
          <div>
            <label className="label-text">Role</label>
            <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as Role })} className="select-field">
              {Object.values(Role).map((r) => <option key={r} value={r}>{formatRole(r)}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreateModal(false)} className="btn-ghost text-sm">Cancel</button>
            <button onClick={handleCreate} className="btn-primary text-sm" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create User'}</button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Edit User">
        {editingUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text">First Name</label>
                <input type="text" value={editingUser.firstName} onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label-text">Last Name</label>
                <input type="text" value={editingUser.lastName} onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })} className="input-field" />
              </div>
            </div>
            <div>
              <label className="label-text">Email</label>
              <input type="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} className="input-field" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditingUser(null)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={handleUpdateProfile} className="btn-primary text-sm" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog isOpen={!!deletingId} onClose={() => setDeletingId(null)} onConfirm={handleDelete} title="Delete User" message="This will soft-delete the user. They won't be able to log in." isLoading={isSubmitting} />
    </div>
  );
}
