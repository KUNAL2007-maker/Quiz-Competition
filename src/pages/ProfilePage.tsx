import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Edit3,
  Award,
  History,
  BarChart2,
  Shield,
  Check,
  AlertCircle,
  Phone,
  Mail,
  Lock,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { validateOperatorProfileInput } from '../utils/timerLogic';
import { EmptyStateBlock } from '../components/ui/EmptyStateBlock';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, profile, updateProfile, results } = useAppContext();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [whatsappNumber, setWhatsappNumber] = useState(profile.whatsappNumber || '');
  const [biography, setBiography] = useState(profile.biography);
  const [validationErrors, setValidationErrors] = useState<{
    displayName?: string;
    username?: string;
    whatsappNumber?: string;
    biography?: string;
  }>({});

  const handleOpenEdit = () => {
    setDisplayName(profile.displayName);
    setUsername(profile.username);
    setWhatsappNumber(profile.whatsappNumber || '');
    setBiography(profile.biography);
    setValidationErrors({});
    setIsEditing(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateOperatorProfileInput({
      displayName,
      username,
      biography,
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    updateProfile({
      displayName: displayName.trim(),
      username: username.trim(),
      whatsappNumber: whatsappNumber.trim(),
      biography: biography.trim(),
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-8">
      {/* Operator Identity Dossier Header Card */}
      <section className="rounded-lg border border-[#252D38] bg-[#0C1017] p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Neutral Operator Avatar Slot */}
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-[#252D38] bg-[#111722] text-[#B6FF3B] overflow-hidden">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="Operator avatar preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-8 w-8" aria-hidden="true" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#929DAC]">
                <span>OPERATOR DOSSIER</span>
                <span aria-hidden="true">·</span>
                <span>LOCAL UI STATE</span>
                {profile.createdAt && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>CREATED {profile.createdAt}</span>
                  </>
                )}
                {profile.isVerified && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#36F58A]">VERIFIED</span>
                  </>
                )}
              </div>

              <h1 className="mt-1 font-display text-2xl font-bold text-[#F0F3F7]">
                {profile.displayName || 'Unassigned Operator Identity'}
              </h1>

              <p className="mt-0.5 font-mono text-xs text-[#B6FF3B]">
                {profile.username ? `@${profile.username}` : 'No callsign handle assigned'}
              </p>

              <div className="mt-2.5 flex flex-wrap items-center gap-4 font-mono text-xs">
                {profile.whatsappNumber && (
                  <span className="inline-flex items-center gap-1.5 text-[#36F58A]">
                    <Phone className="h-3.5 w-3.5" />
                    <span>WhatsApp: {profile.whatsappNumber}</span>
                  </span>
                )}
                {currentUser?.email && (
                  <span className="inline-flex items-center gap-1.5 text-[#929DAC]">
                    <Mail className="h-3.5 w-3.5" />
                    <span>Email: {currentUser.email}</span>
                  </span>
                )}
              </div>

              <p className="mt-3 max-w-2xl text-sm text-[#929DAC] leading-relaxed">
                {profile.biography ||
                  'Operator biography has not been configured. Use the local profile editor to set your display name, callsign handle, and operational focus.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start">
            {!isEditing && (
              <button
                type="button"
                onClick={handleOpenEdit}
                className="inline-flex items-center gap-2 rounded-md bg-[#B6FF3B] px-4 py-2 text-xs font-semibold text-[#07090D] hover:bg-[#c8ff66] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Working Profile Edit Form */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            className="mt-8 border-t border-[#252D38] pt-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-[#F0F3F7]">
                  Edit Competitor Profile Details
                </h2>
                <p className="text-xs text-[#929DAC]">
                  Update your contact details to ensure prize awards reach you upon winning.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="profile-display-name"
                  className="block font-mono text-xs text-[#929DAC] mb-1.5"
                >
                  FULL LEGAL NAME *
                </label>
                <input
                  id="profile-display-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter operator display name..."
                  className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3.5 py-2 text-sm text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none"
                />
                {validationErrors.displayName && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#FF365B]">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{validationErrors.displayName}</span>
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="profile-whatsapp"
                  className="block font-mono text-xs text-[#929DAC] mb-1.5"
                >
                  WHATSAPP CONTACT NUMBER *
                </label>
                <input
                  id="profile-whatsapp"
                  type="tel"
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3.5 py-2 text-sm text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-username"
                  className="block font-mono text-xs text-[#929DAC] mb-1.5"
                >
                  USERNAME / CALLSIGN
                </label>
                <input
                  id="profile-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. operator_01"
                  className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3.5 py-2 font-mono text-sm text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none"
                />
                {validationErrors.username && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#FF365B]">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{validationErrors.username}</span>
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="profile-email-ro"
                  className="block font-mono text-xs text-[#929DAC] mb-1.5"
                >
                  REGISTERED EMAIL (LOCKED)
                </label>
                <div className="relative">
                  <input
                    id="profile-email-ro"
                    type="email"
                    readOnly
                    disabled
                    value={currentUser?.email || 'unassigned@operator'}
                    className="w-full rounded-md border border-[#252D38] bg-[#07090D]/50 px-3.5 py-2 text-sm text-[#929DAC] cursor-not-allowed"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#929DAC]/50" />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-biography"
                className="block font-mono text-xs text-[#929DAC] mb-1.5"
              >
                SHORT BIOGRAPHY ({biography.length}/280)
              </label>
              <textarea
                id="profile-biography"
                rows={3}
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                placeholder="Describe your cybersecurity specialization or operational focus..."
                className="w-full rounded-md border border-[#252D38] bg-[#07090D] p-3.5 text-sm text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none"
              />
              {validationErrors.biography && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#FF365B]">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{validationErrors.biography}</span>
                </p>
              )}
            </div>

            {/* Locked Avatar Notice */}
            <div className="rounded-lg border border-[#252D38] bg-[#07090D] p-4 flex items-center gap-3">
              <Lock className="h-5 w-5 text-[#B6FF3B] shrink-0" />
              <div className="text-xs text-[#929DAC]">
                <span className="font-semibold text-[#F0F3F7]">System-Assigned Profile Avatar</span>:
                To ensure anti-impersonation and tournament integrity, profile photos are randomly assigned by the platform identity protocol and cannot be altered.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#252D38] pt-4">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-md border border-[#252D38] bg-[#111722] px-4 py-2 text-xs font-medium text-[#929DAC] hover:text-[#F0F3F7] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md bg-[#B6FF3B] px-4 py-2 text-xs font-semibold text-[#07090D] hover:bg-[#c8ff66] cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Apply Local Profile State</span>
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Structured Panels for Operator History, Badges, Categories, and Results (Strictly Empty Until Real Data Exists) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Competition & Participation History */}
        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold text-[#F0F3F7]">
            01. Competition & Participation History
          </h2>
          {results.length === 0 ? (
            <EmptyStateBlock
              icon={History}
              visualType="grid"
              codeLabel="HISTORY · NO RECORDS"
              title="No Competition History"
              description="Completed cybersecurity tournaments and round participation timestamps will appear here once you enter and finish an event."
              actionLabel="Browse Competitions"
              onAction={() => navigate('/competitions')}
            />
          ) : null}
        </section>

        {/* Performance Overview & Strongest Categories */}
        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold text-[#F0F3F7]">
            02. Performance Overview & Strongest Categories
          </h2>
          {profile.strongestCategories.length === 0 ? (
            <EmptyStateBlock
              icon={BarChart2}
              visualType="radar"
              codeLabel="METRICS · UNCALIBRATED"
              title="No Category Performance Data"
              description="Strongest cybersecurity domains (such as Reverse Engineering, Cryptography, or Network Forensics) are calculated from verified quiz results."
              actionLabel="Open Performance Page"
              onAction={() => navigate('/results')}
            />
          ) : null}
        </section>

        {/* Achievement Badges */}
        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold text-[#F0F3F7]">
            03. Achievement Badges & Clearances
          </h2>
          {profile.badges.length === 0 ? (
            <EmptyStateBlock
              icon={Award}
              visualType="matrix"
              codeLabel="BADGES · NONE EARNED"
              title="No Achievement Badges Unlocked"
              description="Verified tournament commendations and clearance credentials will populate this panel upon completing official competition rounds."
            />
          ) : null}
        </section>

        {/* Recent Results Summary */}
        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold text-[#F0F3F7]">
            04. Recent Quiz Competition Results
          </h2>
          {results.length === 0 ? (
            <EmptyStateBlock
              icon={Shield}
              visualType="terminal"
              codeLabel="RESULTS · EMPTY"
              title="No Recent Quiz Results"
              description="Individual competition scorecards and accuracy breakdowns will be listed here after your first official submission."
              actionLabel="Inspect Results Archive"
              onAction={() => navigate('/results')}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
};
