import { useState } from 'react';
import { useRecords } from '../hooks/useRecords';
import { useCategories } from '../hooks/useCategories';
import { useAuth } from '../lib/auth-context';
import { hasPermission, Permission } from '../lib/rbac';
import { Role, TransactionType, CreateRecordInput, UpdateRecordInput, FinancialRecord } from '../lib/types';
import { formatCurrency, formatDate } from '../lib/utils';
import { getErrorMessage } from '../lib/api';
import Spinner from '../components/ui/Spinner';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
} from 'lucide-react';

export default function RecordsPage() {
  const { user } = useAuth();
  const { records, pagination, isLoading, filters, setFilters, createRecord, updateRecord, deleteRecord } = useRecords();
  const { categories } = useCategories();

  const canCreate = user && hasPermission(user.role as Role, Permission.CREATE_RECORD);
  const canUpdateOwn = user && hasPermission(user.role as Role, Permission.UPDATE_OWN_RECORD);
  const canUpdateAny = user && hasPermission(user.role as Role, Permission.UPDATE_ANY_RECORD);
  const canDelete = user && hasPermission(user.role as Role, Permission.DELETE_RECORD);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Form states
  const [form, setForm] = useState<CreateRecordInput>({
    amount: 0,
    type: TransactionType.INCOME,
    date: new Date().toISOString().slice(0, 16),
    description: '',
    categoryId: '',
    tags: [],
  });

  const resetForm = () => {
    setForm({
      amount: 0,
      type: TransactionType.INCOME,
      date: new Date().toISOString().slice(0, 16),
      description: '',
      categoryId: '',
      tags: [],
    });
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const input: CreateRecordInput = {
        amount: Number(form.amount),
        type: form.type,
        date: new Date(form.date).toISOString(),
        description: form.description || undefined,
        categoryId: form.categoryId || undefined,
        tags: form.tags?.length ? form.tags : undefined,
      };
      await createRecord(input);
      toast.success('Record created successfully');
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingRecord) return;
    setIsSubmitting(true);
    try {
      const input: UpdateRecordInput = {
        amount: Number(form.amount),
        type: form.type,
        date: new Date(form.date).toISOString(),
        description: form.description || undefined,
        categoryId: form.categoryId || undefined,
      };
      await updateRecord(editingRecord.id, input);
      toast.success('Record updated successfully');
      setEditingRecord(null);
      resetForm();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsSubmitting(true);
    try {
      await deleteRecord(deletingId);
      toast.success('Record deleted successfully');
      setDeletingId(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (record: FinancialRecord) => {
    setForm({
      amount: Number(record.amount),
      type: record.type,
      date: new Date(record.date).toISOString().slice(0, 16),
      description: record.description || '',
      categoryId: record.categoryId || '',
      tags: record.tags || [],
    });
    setEditingRecord(record);
  };

  const handleSearch = () => {
    setFilters({ ...filters, search: searchText, page: 1 });
  };

  const canEditRecord = (record: FinancialRecord) => {
    if (canUpdateAny) return true;
    if (canUpdateOwn && record.userId === user?.id) return true;
    return false;
  };

  const recordForm = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-text">Amount</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
            className="input-field"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="label-text">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as TransactionType })}
            className="select-field"
          >
            <option value={TransactionType.INCOME}>Income</option>
            <option value={TransactionType.EXPENSE}>Expense</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label-text">Category</label>
        <select
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          className="select-field"
        >
          <option value="">No category</option>
          {categories
            .filter((c) => c.type === form.type || c.type === 'BOTH')
            .map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
        </select>
      </div>
      <div>
        <label className="label-text">Date</label>
        <input
          type="datetime-local"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="input-field"
        />
      </div>
      <div>
        <label className="label-text">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input-field resize-none"
          rows={2}
          placeholder="Optional description..."
          maxLength={500}
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={() => { setShowCreateModal(false); setEditingRecord(null); resetForm(); }}
          className="btn-ghost text-sm"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          onClick={editingRecord ? handleUpdate : handleCreate}
          className="btn-primary text-sm"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : editingRecord ? 'Update Record' : 'Create Record'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="input-field pl-10"
              placeholder="Search records..."
            />
          </div>
          <button onClick={handleSearch} className="btn-secondary text-sm">
            <Search className="w-4 h-4" />
          </button>
        </div>
        {canCreate && (
          <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="btn-primary text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Record
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-surface-500" />
          <select
            value={filters.type || ''}
            onChange={(e) => setFilters({ ...filters, type: e.target.value as TransactionType || undefined, page: 1 })}
            className="select-field w-auto text-sm"
          >
            <option value="">All types</option>
            <option value={TransactionType.INCOME}>Income</option>
            <option value={TransactionType.EXPENSE}>Expense</option>
          </select>
          <select
            value={filters.categoryId || ''}
            onChange={(e) => setFilters({ ...filters, categoryId: e.target.value || undefined, page: 1 })}
            className="select-field w-auto text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={filters.sortBy || 'date'}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as 'date' | 'amount' | 'createdAt' })}
            className="select-field w-auto text-sm"
          >
            <option value="date">Sort by date</option>
            <option value="amount">Sort by amount</option>
            <option value="createdAt">Sort by created</option>
          </select>
          <select
            value={filters.sortOrder || 'desc'}
            onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value as 'asc' | 'desc' })}
            className="select-field w-auto text-sm"
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : records.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-12 h-12" />}
          title="No records found"
          description="Create your first financial record to get started."
          action={canCreate ? (
            <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="btn-primary text-sm">
              <Plus className="w-4 h-4 inline mr-1" /> Create Record
            </button>
          ) : undefined}
        />
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-700/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Description</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Date</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Amount</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        record.type === TransactionType.INCOME
                          ? 'bg-success-500/15 text-success-400'
                          : 'bg-danger-500/15 text-danger-400'
                      }`}>
                        {record.type === TransactionType.INCOME ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {record.type}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-surface-200 truncate max-w-xs">{record.description || '—'}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      {record.category ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-surface-300">
                          {record.category.color && (
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: record.category.color }} />
                          )}
                          {record.category.name}
                        </span>
                      ) : (
                        <span className="text-sm text-surface-500">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-surface-400">{formatDate(record.date)}</td>
                    <td className={`px-5 py-3.5 text-right text-sm font-semibold ${
                      record.type === TransactionType.INCOME ? 'text-success-400' : 'text-danger-400'
                    }`}>
                      {record.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(record.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEditRecord(record) && (
                          <button
                            onClick={() => openEdit(record)}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-primary-400 hover:bg-surface-700 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeletingId(record.id)}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-danger-400 hover:bg-surface-700 transition-colors"
                          >
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
              <Pagination
                pagination={pagination}
                onPageChange={(page) => setFilters({ ...filters, page })}
              />
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); resetForm(); }} title="Create Financial Record">
        {recordForm}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingRecord} onClose={() => { setEditingRecord(null); resetForm(); }} title="Edit Financial Record">
        {recordForm}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Record"
        message="Are you sure you want to delete this record? This action is a soft delete and can be reversed by an admin."
        confirmText="Delete"
        isLoading={isSubmitting}
      />
    </div>
  );
}
