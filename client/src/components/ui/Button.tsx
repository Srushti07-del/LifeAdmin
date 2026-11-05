import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading = false, disabled, icon, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const sizeStyles = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
      md: 'text-sm px-4 py-2 gap-2 h-10',
      lg: 'text-base px-5 py-2.5 gap-2.5 h-12',
    }[size];

    const variantStyles = {
      primary: 'bg-primary-600 hover:bg-primary-700 text-white dark:bg-primary-400 dark:hover:bg-primary-300 dark:text-surface-950 font-semibold shadow-xs hover:shadow-sm',
      secondary: 'bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-900 dark:text-surface-100 font-medium border border-surface-200 dark:border-surface-700',
      outline: 'border border-surface-300 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-800 dark:text-surface-100 font-medium',
      ghost: 'hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-200 hover:text-surface-900 dark:hover:text-surface-100 font-medium',
      danger: 'bg-danger-600 hover:bg-danger-700 text-white font-semibold shadow-xs',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" /> : icon ? <span className="flex-shrink-0">{icon}</span> : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;

