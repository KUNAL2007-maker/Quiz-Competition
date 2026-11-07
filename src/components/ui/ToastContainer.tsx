import React from 'react';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useAppContext();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 sm:inset-x-auto sm:right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-4 shadow-xl transition-all"
        >
          {toast.variant === 'success' && (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#a4d65e] mt-0.5" aria-hidden="true" />
          )}
          {toast.variant === 'alert' && (
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#FF365B] mt-0.5" aria-hidden="true" />
          )}
          {(!toast.variant || toast.variant === 'default') && (
            <Info className="h-4 w-4 shrink-0 text-[#8dc63f] mt-0.5" aria-hidden="true" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#f5f5f2]">{toast.title}</p>
            {toast.description && (
              <p className="mt-1 text-xs text-[#a8a8a2] leading-relaxed">{toast.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="rounded p-1 text-[#a8a8a2] hover:bg-[#1b1b19] hover:text-[#f5f5f2] cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
