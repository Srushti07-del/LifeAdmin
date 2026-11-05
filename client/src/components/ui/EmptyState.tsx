import React from 'react';
import Button from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-surface-300 dark:border-surface-700 bg-white/50 dark:bg-surface-800/50 ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-surface-800 text-primary-700 dark:text-primary-300 flex items-center justify-center mb-4 shadow-xs border border-primary-200 dark:border-surface-700">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100 font-editorial mb-1">
        {title}
      </h3>
      <p className="text-xs text-surface-600 dark:text-surface-300 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;

