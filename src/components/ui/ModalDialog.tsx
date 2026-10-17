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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090D]/80 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-dialog-title"
    >
      <div className="relative w-full max-w-lg rounded-lg border border-[#252D38] bg-[#0C1017] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-[#252D38] pb-4">
          <div>
            <h2 id="modal-dialog-title" className="font-display text-lg font-semibold text-[#F0F3F7]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-xs text-[#929DAC]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1.5 text-[#929DAC] transition-colors hover:bg-[#111722] hover:text-[#F0F3F7] focus-visible:outline-2 focus-visible:outline-[#B6FF3B] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="text-sm text-[#F0F3F7]">{children}</div>

        {footer && (
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#252D38] pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
