interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {icon && <div className="mb-4 text-surface-500">{icon}</div>}
      <h3 className="text-lg font-semibold text-surface-300 mb-1">{title}</h3>
      <p className="text-sm text-surface-500 mb-6 text-center max-w-sm">{description}</p>
      {action}
    </div>
  );
}
