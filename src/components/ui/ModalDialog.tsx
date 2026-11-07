import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const ModalDialog: React.FC<ModalDialogProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111110]/80 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-dialog-title"
    >
      <div className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] flex flex-col rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-5 sm:p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-[#2e2e2a] pb-4 shrink-0">
          <div>
            <h2 id="modal-dialog-title" className="font-display text-lg font-semibold text-[#f5f5f2]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-xs text-[#a8a8a2]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1.5 text-[#a8a8a2] transition-colors hover:bg-[#1b1b19] hover:text-[#f5f5f2] focus-visible:outline-2 focus-visible:outline-[#8dc63f] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="text-sm text-[#f5f5f2] overflow-y-auto pr-1 flex-1">{children}</div>

        {footer && (
          <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-[#2e2e2a] pt-4 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
