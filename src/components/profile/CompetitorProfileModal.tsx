import React, { useState, useEffect, useId } from 'react';
import {
  User,
  Phone,
  Mail,
  ShieldCheck,
  Lock,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface CompetitorProfileModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onProfileComplete?: () => void;
}

export const CompetitorProfileModal: React.FC<CompetitorProfileModalProps> = ({
  isOpen,
  onClose,
  onProfileComplete,
}) => {
  const { currentUser, profile, saveCompetitorProfile } = useAppContext();
  const nameInputId = useId();
  const whatsappInputId = useId();

  const [displayName, setDisplayName] = useState(
    profile.displayName || currentUser?.displayName || ''
  );
  const [whatsappNumber, setWhatsappNumber] = useState(
    profile.whatsappNumber || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deterministically assign a random/unique cyber avatar based on the user's UID (cannot be edited)
  const seed = currentUser?.uid || 'cyber-operator-default';
  const assignedAvatarUrl =
    profile.avatarUrl ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}&backgroundColor=07090d`;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim() || displayName.trim().length < 2) {
      setError('Please provide your real full name (at least 2 characters).');
      return;
    }

    // Strip spaces/hyphens for validation
    const digitsOnly = whatsappNumber.replace(/\D/g, '');
    if (digitsOnly.length < 8 || digitsOnly.length > 15) {
      setError('Please enter a valid WhatsApp number with country code (e.g. +91 9876543210).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saveCompetitorProfile({
        displayName: displayName.trim(),
        whatsappNumber: whatsappNumber.trim(),
        avatarUrl: assignedAvatarUrl,
      });

      if (res.success) {
        if (onProfileComplete) {
          onProfileComplete();
        }
      } else {
        setError(res.error || 'Failed to save profile. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#07090D]/85 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] flex flex-col rounded-xl border border-[#252D38] bg-[#0C1017] p-6 sm:p-8 shadow-2xl space-y-6 overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start gap-3.5 border-b border-[#252D38] pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#B6FF3B]/50 bg-[#B6FF3B]/10 text-[#B6FF3B]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="profile-modal-title"
              className="font-display text-lg sm:text-xl font-bold text-[#F0F3F7]"
            >
              Complete Competitor Profile
            </h2>
            <p className="mt-1 text-xs text-[#929DAC] leading-relaxed">
              To be eligible for quiz scoring and tournament prizes, verify your winner contact details.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-[#FF365B]/60 bg-[#FF365B]/10 p-3 text-xs text-[#FF365B]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Random Assigned Avatar (Locked - user cannot change) */}
          <div className="flex items-center gap-4 rounded-lg border border-[#252D38] bg-[#07090D] p-3.5">
            <div className="relative h-14 w-14 rounded-full border-2 border-[#B6FF3B] bg-[#111722] p-1 shrink-0 overflow-hidden">
              <img
                src={assignedAvatarUrl}
                alt="System-assigned avatar"
                className="h-full w-full object-cover rounded-full"
              />
              <div
                title="Avatar is locked to prevent identity impersonation"
                className="absolute bottom-0 right-0 rounded-full bg-[#07090D] border border-[#B6FF3B] p-0.5 text-[#B6FF3B]"
              >
                <Lock className="h-2.5 w-2.5" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-[#B6FF3B]" />
                <span className="font-mono text-[11px] font-semibold text-[#B6FF3B]">
                  SYSTEM-ASSIGNED AVATAR (LOCKED)
                </span>
              </div>
              <p className="text-[11px] text-[#929DAC] mt-0.5 leading-relaxed">
                Avatars are randomly generated by tournament identity protocol and cannot be altered.
              </p>
            </div>
          </div>

          {/* Full Name Field */}
          <div>
            <label
              htmlFor={nameInputId}
              className="block font-mono text-[11px] font-medium text-[#929DAC] mb-1.5"
            >
              Full Legal Name <span className="text-[#FF365B]">*</span>
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#929DAC]" />
              <input
                id={nameInputId}
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Kunal Sharma"
                className="w-full rounded-lg border border-[#252D38] bg-[#07090D] py-2.5 pl-9 pr-3 text-xs text-[#F0F3F7] placeholder-[#929DAC]/50 focus:border-[#B6FF3B] focus:outline-none transition-colors"
              />
            </div>
            <p className="mt-1 text-[10px] text-[#929DAC]/70">
              Used on the live ranking ledger and competition certificates.
            </p>
          </div>

          {/* WhatsApp Number Field */}
          <div>
            <label
              htmlFor={whatsappInputId}
              className="block font-mono text-[11px] font-medium text-[#929DAC] mb-1.5"
            >
              WhatsApp Contact Number <span className="text-[#FF365B]">*</span>
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#36F58A]" />
              <input
                id={whatsappInputId}
                type="tel"
                required
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="w-full rounded-lg border border-[#252D38] bg-[#07090D] py-2.5 pl-9 pr-3 text-xs text-[#F0F3F7] placeholder-[#929DAC]/50 focus:border-[#B6FF3B] focus:outline-none transition-colors"
              />
            </div>
            <p className="mt-1 text-[10px] text-[#929DAC]/70">
              If you win, the administrator will directly WhatsApp you to send your reward.
            </p>
          </div>

          {/* Logged in Email Field (Read Only) */}
          <div>
            <label
              htmlFor="comp-email"
              className="block font-mono text-[11px] font-medium text-[#929DAC] mb-1.5"
            >
              Registered Email (Locked to Login Session)
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#929DAC]" />
              <input
                id="comp-email"
                type="email"
                readOnly
                disabled
                value={currentUser?.email || 'unassigned@operator'}
                className="w-full rounded-lg border border-[#252D38] bg-[#07090D]/50 py-2.5 pl-9 pr-9 text-xs text-[#929DAC] focus:outline-none cursor-not-allowed select-none"
              />
              <Lock className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#929DAC]/50" />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#252D38]">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#252D38] bg-[#111722] px-4 py-2.5 text-xs font-medium text-[#929DAC] hover:text-[#F0F3F7] cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#B6FF3B] px-5 py-2.5 text-xs font-semibold text-[#07090D] hover:bg-[#c8ff66] transition-colors disabled:opacity-50 cursor-pointer shadow-md"
            >
              <span>{isSubmitting ? 'Saving Profile...' : 'Save & Unlock Quiz Access'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
