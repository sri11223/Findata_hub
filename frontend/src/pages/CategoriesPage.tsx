import { useState } from 'react';
import { useCategories } from '../hooks/useCategories';
import { useAuth } from '../lib/auth-context';
import { hasPermission, Permission } from '../lib/rbac';
import { Role, Category, CreateCategoryInput, UpdateCategoryInput } from '../lib/types';
import { getErrorMessage } from '../lib/api';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';
import { Plus, Edit3, Trash2, Tags } from 'lucide-react';

export default function CategoriesPage() {
  const { user } = useAuth();
  const { categories, isLoading, createCategory, updateCategory, deleteCategory } = useCategories();
  const canManage = user && hasPermission(user.role as Role, Permission.MANAGE_CATEGORIES);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<CreateCategoryInput>({ name: '', type: 'EXPENSE', color: '#6366f1', description: '' });

  const resetForm = () => setForm({ name: '', type: 'EXPENSE', color: '#6366f1', description: '' });

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      await createCategory({ ...form, color: form.color || undefined, description: form.description || undefined });
      toast.success('Category created');
      setShowCreateModal(false);
      resetForm();
    } catch (err) { toast.error(getErrorMessage(err)); } finally { setIsSubmitting(false); }
  };

  const handleUpdate = async () => {
    if (!editingCat) return;
    setIsSubmitting(true);
    try {
      const input: UpdateCategoryInput = {
        name: form.name || undefined,
        type: form.type || undefined,
        color: form.color || undefined,
        description: form.description || undefined,
      };
      await updateCategory(editingCat.id, input);
      toast.success('Category updated');
      setEditingCat(null);
      resetForm();
    } catch (err) { toast.error(getErrorMessage(err)); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsSubmitting(true);
    try {
      await deleteCategory(deletingId);
      toast.success('Category deleted');
      setDeletingId(null);
    } catch (err) { toast.error(getErrorMessage(err)); } finally { setIsSubmitting(false); }
  };

  const openEdit = (cat: Category) => {
    setForm({ name: cat.name, type: cat.type, color: cat.color || '#6366f1', description: cat.description || '' });
    setEditingCat(cat);
  };

  const typeBadge = (type: string) => {
    const classes: Record<string, string> = {
      INCOME: 'bg-success-500/15 text-success-400',
      EXPENSE: 'bg-danger-500/15 text-danger-400',
      BOTH: 'bg-primary-500/15 text-primary-400',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${classes[type] || ''}`}>
        {type}
      </span>
    );
  };

  const catForm = (
    <div className="space-y-4">
      <div>
        <label className="label-text">Name</label>
        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="e.g., Groceries" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-text">Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'INCOME' | 'EXPENSE' | 'BOTH' })} className="select-field">
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="BOTH">Both</option>
          </select>
        </div>
        <div>
          <label className="label-text">Color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.color || '#6366f1'} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0" />
            <input type="text" value={form.color || ''} onChange={(e) => setForm({ ...form, color: e.target.value })} className="input-field font-mono text-sm" placeholder="#6366f1" />
          </div>
        </div>
      </div>
      <div>
        <label className="label-text">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field resize-none" rows={2} placeholder="Optional description..." />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={() => { setShowCreateModal(false); setEditingCat(null); resetForm(); }} className="btn-ghost text-sm" disabled={isSubmitting}>Cancel</button>
        <button onClick={editingCat ? handleUpdate : handleCreate} className="btn-primary text-sm" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : editingCat ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  );

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-surface-400">{categories.length} categories</p>
        {canManage && (
          <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="btn-primary text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Category
          </button>
        )}
      </div>

      {categories.length === 0 ? (
        <EmptyState icon={<Tags className="w-12 h-12" />} title="No categories" description="Create categories to organize your financial records." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="glass-card-hover p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: cat.color || '#6366f1' }} />
                  <h3 className="text-base font-semibold text-surface-200">{cat.name}</h3>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg text-surface-400 hover:text-primary-400 hover:bg-surface-700 transition-colors">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeletingId(cat.id)} className="p-1.5 rounded-lg text-surface-400 hover:text-danger-400 hover:bg-surface-700 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {typeBadge(cat.type)}
              {cat.description && <p className="text-xs text-surface-500 mt-2 line-clamp-2">{cat.description}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); resetForm(); }} title="Create Category">{catForm}</Modal>
      <Modal isOpen={!!editingCat} onClose={() => { setEditingCat(null); resetForm(); }} title="Edit Category">{catForm}</Modal>
      <ConfirmDialog isOpen={!!deletingId} onClose={() => setDeletingId(null)} onConfirm={handleDelete} title="Delete Category" message="Are you sure? Records using this category will become uncategorized." isLoading={isSubmitting} />
    </div>
  );
}
