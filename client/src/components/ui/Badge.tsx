import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function Badge({
  className = '',
  variant = 'secondary',
  size = 'md',
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  }[size];

  const variantStyles = {
    primary: 'bg-primary-50 dark:bg-surface-800 text-primary-800 dark:text-primary-200 border border-primary-200 dark:border-primary-600/50',
    secondary: 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-100 border border-surface-200 dark:border-surface-700',
    success: 'bg-emerald-50 dark:bg-[#1b4332] text-emerald-800 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-600/50',
    warning: 'bg-amber-50 dark:bg-[#54390e] text-amber-800 dark:text-amber-100 border border-amber-200 dark:border-amber-600/50',
    danger: 'bg-rose-50 dark:bg-[#5c2828] text-rose-800 dark:text-rose-100 border border-rose-200 dark:border-rose-600/50',
    neutral: 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 border border-surface-200 dark:border-surface-700',
  }[variant];

  const dotColors = {
    primary: 'bg-primary-600 dark:bg-primary-300',
    secondary: 'bg-surface-500 dark:bg-surface-300',
    success: 'bg-emerald-600 dark:bg-emerald-400',
    warning: 'bg-amber-600 dark:bg-amber-400',
    danger: 'bg-rose-600 dark:bg-rose-400',
    neutral: 'bg-surface-500 dark:bg-surface-300',
  }[variant];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors} flex-shrink-0`} />}
      {children}
    </span>
  );
}

export default Badge;

