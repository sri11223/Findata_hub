import { ReactNode } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm glass-card p-6 shadow-2xl shadow-black/50">
        <h3 className="text-lg font-semibold text-surface-100 mb-2">{title}</h3>
        <div className="text-sm text-surface-400 mb-6">{message}</div>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-ghost text-sm" disabled={isLoading}>
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-danger text-sm" disabled={isLoading}>
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
