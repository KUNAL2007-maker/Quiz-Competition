import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  KeyRound,
  CheckCircle2,
  LogOut,
  ArrowRight,
  UserCheck,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    isAdmin,
    signInWithGoogle,
    signOutOperator,
  } = useAppContext();

  return (
    <div className="mx-auto max-w-xl space-y-8 py-4 sm:py-8">
      {/* Page Title */}
      <div className="text-center">
        <p className="font-mono text-xs tracking-widest text-[#B6FF3B]">
          SECURITY COMMAND IDENTITY ACCESS
        </p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F0F3F7]">
          Operator Authentication
        </h1>
        <p className="mt-3 text-sm text-[#929DAC] leading-relaxed">
          Authenticate to verify your operator callsign, synchronize competition scores with the live ranking ledger, and access restricted administrative consoles.
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="overflow-hidden rounded-xl border border-[#252D38] bg-[#0C1017] p-6 sm:p-8 shadow-2xl relative">
        {/* Subtle decorative glow */}
        <div
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-[#B6FF3B]/5 blur-3xl"
          aria-hidden="true"
        />

        {currentUser ? (
          /* Authenticated Operator State */
          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between border-b border-[#252D38] pb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#36F58A]" />
                <span className="font-mono text-xs font-semibold text-[#36F58A]">
                  AUTHENTICATED SESSION ACTIVE
                </span>
              </div>
              <span className="rounded bg-[#111722] border border-[#252D38] px-2.5 py-1 font-mono text-[11px] text-[#929DAC]">
                PROVIDER · GOOGLE
              </span>
            </div>

            {/* Profile Overview */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border border-[#252D38] bg-[#111722] p-4">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Operator avatar'}
                  referrerPolicy="no-referrer"
                  className="h-14 w-14 rounded-full border border-[#B6FF3B] object-cover shrink-0"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#B6FF3B] bg-[#07090D] text-[#B6FF3B]">
                  <Shield className="h-7 w-7" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="font-display text-base font-bold text-[#F0F3F7] truncate">
                  {currentUser.displayName || 'Operator'}
                </p>
                <p className="font-mono text-xs text-[#B6FF3B] truncate">
                  {currentUser.email}
                </p>
                <p className="mt-1 font-mono text-[10px] text-[#929DAC] truncate">
                  UID: {currentUser.uid}
                </p>
              </div>
            </div>

            {/* Admin Badge Banner if email is checkship66@gmail.com */}
            {isAdmin ? (
              <div className="rounded-lg border border-[#B6FF3B]/50 bg-[#B6FF3B]/10 p-4">
                <div className="flex items-start gap-3">
                  <KeyRound className="h-5 w-5 text-[#B6FF3B] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-mono text-xs font-bold text-[#B6FF3B]">
                      ADMIN CLEARANCE VERIFIED (checkship66@gmail.com)
                    </p>
                    <p className="mt-1 text-xs text-[#F0F3F7] leading-relaxed">
                      You are signed in with the system administrator account. You have full clearance to upload quizzes, create competitions, and manage per-question timers.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/admin')}
                      className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#B6FF3B] px-4 py-2 text-xs font-semibold text-[#07090D] hover:bg-[#c8ff66] transition-colors cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Launch Admin Dashboard & Quiz Creator</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-[#252D38] bg-[#07090D] p-3 text-xs text-[#929DAC]">
                <p>
                  Operator clearance active. Your quiz completions and scores will sync automatically with the live leaderboard.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#252D38] pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/competitions')}
                  className="rounded-md bg-[#111722] border border-[#252D38] px-3.5 py-2 text-xs font-medium text-[#F0F3F7] hover:border-[#B6FF3B] hover:text-[#B6FF3B] transition-colors cursor-pointer"
                >
                  Browse Competitions
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="rounded-md bg-[#111722] border border-[#252D38] px-3.5 py-2 text-xs font-medium text-[#929DAC] hover:text-[#F0F3F7] transition-colors cursor-pointer"
                >
                  View Profile
                </button>
              </div>

              <button
                type="button"
                onClick={signOutOperator}
                className="inline-flex items-center gap-2 rounded-md border border-[#FF365B]/60 bg-[#111722] px-3.5 py-2 text-xs font-medium text-[#FF365B] hover:bg-[#FF365B]/10 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          /* Unauthenticated Sign-In State */
          <div className="space-y-6 relative z-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#252D38] bg-[#111722] text-[#B6FF3B]">
              <Lock className="h-7 w-7" />
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-[#F0F3F7]">
                Sign In to Aegis Cipher Network
              </h2>
              <p className="mt-2 text-xs text-[#929DAC] leading-relaxed max-w-sm mx-auto">
                Use your Google account to log in. Administrators (<span className="text-[#B6FF3B] font-mono">checkship66@gmail.com</span>) will automatically unlock the Quiz Management Dashboard.
              </p>
            </div>

            {/* Google Sign-In Primary Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={signInWithGoogle}
                className="w-full max-w-md mx-auto flex items-center justify-center gap-3 rounded-lg border border-[#252D38] bg-[#111722] px-6 py-3.5 text-sm font-semibold text-[#F0F3F7] transition-all hover:border-[#B6FF3B] hover:bg-[#161E2C] hover:text-[#B6FF3B] focus-visible:outline-2 focus-visible:outline-[#B6FF3B] shadow-lg cursor-pointer"
              >
                {/* Official Google 'G' icon */}
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google Authentication</span>
              </button>
            </div>

            {/* Informational Security Notice */}
            <div className="border-t border-[#252D38] pt-5 text-left">
              <div className="flex items-start gap-2.5 text-xs text-[#929DAC]">
                <UserCheck className="h-4 w-4 text-[#B6FF3B] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Authentication is managed securely by Firebase Auth. No passwords are stored on our servers. Your public operator profile contains only your chosen callsign and display name.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
