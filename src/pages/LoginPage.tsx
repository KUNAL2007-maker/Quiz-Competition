import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  KeyRound,
  LogOut,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/competitions';

  const {
    currentUser,
    profile,
    isAdmin,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOutOperator,
  } = useAppContext();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    const effectiveTarget =
      redirectTarget === '/quiz' && !profile.isProfileComplete
        ? '/profile?required=1'
        : redirectTarget;

    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        const res = await signInWithEmail(email, password);
        if (res.success) {
          navigate(effectiveTarget);
        } else {
          setErrorMessage(res.error || 'Failed to sign in. Please verify your credentials.');
        }
      } else {
        const res = await signUpWithEmail(email, password);
        if (res.success) {
          navigate(effectiveTarget);
        } else {
          setErrorMessage(res.error || 'Failed to create account. Please try again.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      const effectiveTarget =
        redirectTarget === '/quiz' && !profile.isProfileComplete
          ? '/profile?required=1'
          : redirectTarget;
      navigate(effectiveTarget);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Google authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-6 sm:py-12">
      {/* Active Session View if already signed in */}
      {currentUser ? (
        <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#2e2e2a] pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#a4d65e]" />
              <span className="font-mono text-xs font-semibold text-[#a4d65e]">
                ACTIVE SESSION
              </span>
            </div>
            <span className="rounded bg-[#1b1b19] border border-[#2e2e2a] px-2 py-0.5 font-mono text-[11px] text-[#a8a8a2]">
              {currentUser.email ? (currentUser.email.slice(0, 3) + '••••@••••.com') : 'Connected'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Avatar"
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-full border border-[#7ab32e] object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#7ab32e] bg-[#1b1b19] text-[#8dc63f]">
                <ShieldCheck className="h-7 w-7" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base font-bold text-[#f5f5f2] truncate">
                {currentUser.displayName || 'Competitor'}
              </h2>
              <p className="font-mono text-xs text-[#a8a8a2] truncate">
                {currentUser.email ? (currentUser.email.slice(0, 3) + '••••@••••.com') : 'Connected'}
              </p>
              {isAdmin && (
                <span className="mt-1 inline-block rounded bg-[#8dc63f]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#8dc63f]">
                  ADMINISTRATOR
                </span>
              )}
            </div>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#8dc63f] px-4 py-3 text-xs font-semibold text-[#141a09] hover:bg-[#a4d65e] transition-colors cursor-pointer"
            >
              <KeyRound className="h-4 w-4" />
              <span>Open Admin Dashboard & Quiz Creator</span>
            </button>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-[#2e2e2a] pt-4">
            <button
              type="button"
              onClick={() => {
                const target =
                  redirectTarget === '/quiz' && !profile.isProfileComplete
                    ? '/profile?required=1'
                    : redirectTarget;
                navigate(target);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#2e2e2a] bg-[#1b1b19] px-4 py-2 text-xs font-medium text-[#f5f5f2] hover:border-[#7ab32e] hover:text-[#8dc63f] cursor-pointer"
            >
              <span>Continue to Quizzes</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={signOutOperator}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#FF365B]/50 bg-[#1b1b19] px-3.5 py-2 text-xs font-medium text-[#FF365B] hover:bg-[#FF365B]/10 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      ) : (
        /* Simple Clean Login Card */
        <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-6 sm:p-8 space-y-6 shadow-2xl">
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#2e2e2a] bg-[#1b1b19] text-[#8dc63f]">
              <Lock className="h-5 w-5" />
            </div>
            <h1 className="font-display text-2xl font-bold text-[#f5f5f2]">
              {mode === 'signin' ? 'Sign In' : 'Create an Account'}
            </h1>
            <p className="text-xs text-[#a8a8a2]">
              {mode === 'signin'
                ? 'Enter your credentials to access the quiz competition.'
                : 'Register an account to participate in competitions.'}
            </p>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="rounded-md border border-[#FF365B]/60 bg-[#FF365B]/10 px-3.5 py-2.5 text-xs text-[#FF365B]">
              {errorMessage}
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block font-mono text-[11px] font-medium text-[#a8a8a2] mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8a8a2]" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="w-full rounded-lg border border-[#2e2e2a] bg-[#111110] py-2.5 pl-9 pr-3 text-xs text-[#f5f5f2] placeholder-[#a8a8a2]/50 focus:border-[#7ab32e] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block font-mono text-[11px] font-medium text-[#a8a8a2] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8a8a2]" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  className="w-full rounded-lg border border-[#2e2e2a] bg-[#111110] py-2.5 pl-9 pr-9 text-xs text-[#f5f5f2] placeholder-[#a8a8a2]/50 focus:border-[#7ab32e] focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a8a8a2] hover:text-[#f5f5f2] cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#8dc63f] py-3 text-xs font-semibold text-[#141a09] hover:bg-[#a4d65e] transition-colors disabled:opacity-50 cursor-pointer shadow-md mt-2"
            >
              {mode === 'signin' ? (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>{isSubmitting ? 'Creating Account...' : 'Create Account'}</span>
                </>
              )}
            </button>
          </form>

          {/* Toggle between Sign In / Sign Up */}
          <div className="text-center text-xs text-[#a8a8a2]">
            {mode === 'signin' ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage('');
                  }}
                  className="text-[#8dc63f] hover:underline font-medium cursor-pointer"
                >
                  Sign Up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage('');
                  }}
                  className="text-[#8dc63f] hover:underline font-medium cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#2e2e2a] w-full" />
            <span className="bg-[#1b1b19] px-3 font-mono text-[11px] text-[#a8a8a2]">
              OR
            </span>
            <div className="border-t border-[#2e2e2a] w-full" />
          </div>

          {/* Google Login Button */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-[#2e2e2a] bg-[#1b1b19] py-3 px-4 text-xs font-semibold text-[#f5f5f2] hover:border-[#7ab32e] hover:bg-[#161E2C] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
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
            <span>Continue with Google</span>
          </button>
        </div>
      )}
    </div>
  );
};
