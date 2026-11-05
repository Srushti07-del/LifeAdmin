import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  panelClassName?: string;
  headerClassName?: string;
  contentClassName?: string;
  titleClassName?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  panelClassName = '',
  headerClassName = '',
  contentClassName = '',
  titleClassName = '',
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-4 sm:p-6"
      style={{
        height: '100dvh',
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
      }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-surface-950/40 dark:bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        className={`relative w-full ${maxWidthStyles} bg-white dark:bg-surface-0 rounded-2xl border border-surface-200 dark:border-surface-700 p-6 shadow-modal z-10 animate-scale-in flex max-h-full min-h-0 flex-col ${panelClassName}`}
        style={{ maxHeight: 'calc(100dvh - 2rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))' }}
      >
        {/* Header */}
        {(title || description) && (
          <div className={`flex items-start justify-between pb-4 border-b border-surface-200 dark:border-surface-700 ${headerClassName}`}>
            <div>
              {title && (
                <h2
                  id="modal-title"
                  className={titleClassName || 'text-lg font-bold text-surface-900 dark:text-surface-100 font-editorial'}
                >
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="text-xs text-surface-600 dark:text-surface-300 mt-1">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-surface-500 dark:text-surface-300 hover:text-surface-900 dark:hover:text-surface-100 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className={`flex-1 min-h-0 overflow-y-auto py-4 ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default Modal;

