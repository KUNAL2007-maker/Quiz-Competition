import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sliders,
  Bell,
  Volume2,
  Eye,
  Shield,
  UserCheck,
  RotateCcw,
  Terminal,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface ToggleRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  id,
  label,
  description,
  checked,
  onChange,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-[#2e2e2a] last:border-b-0">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-[#f5f5f2] cursor-pointer">
          {label}
        </label>
        <p className="mt-0.5 text-xs text-[#a8a8a2]">{description}</p>
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#8dc63f] ${
          checked
            ? 'border-[#7ab32e] bg-[#8dc63f]/20'
            : 'border-[#2e2e2a] bg-[#111110]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
            checked ? 'translate-x-5 bg-[#8dc63f]' : 'translate-x-1 bg-[#a8a8a2]'
          }`}
        />
      </button>
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    settings,
    updateSettings,
    resetSettings,
    resetQuizSession,
    addToast,
    currentUser,
    pythonEngineOnline,
    signInWithGoogle,
    signOutOperator,
  } = useAppContext();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#2e2e2a] pb-6">
        <div>
          <p className="font-mono text-xs tracking-wider text-[#8dc63f]">
            INTERFACE CONFIGURATION
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#f5f5f2]">
            Settings & Preferences
          </h1>
          <p className="mt-2 text-sm text-[#a8a8a2] max-w-2xl">
            Configure local appearance, audio cues, accessibility options, and interface preferences. Settings are applied in local browser state.
          </p>
        </div>

        <button
          type="button"
          onClick={resetSettings}
          className="inline-flex items-center gap-2 rounded-md border border-[#2e2e2a] bg-[#1b1b19] px-4 py-2 text-xs font-medium text-[#f5f5f2] hover:border-[#7ab32e] hover:text-[#8dc63f] transition-colors whitespace-nowrap shrink-0 self-start md:self-auto cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Reset Defaults</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Profile Preferences */}
        <section className="rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-6">
          <div className="mb-4 flex items-center gap-2.5 border-b border-[#2e2e2a] pb-3">
            <UserCheck className="h-4 w-4 text-[#8dc63f]" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-[#f5f5f2]">
              Profile Preferences
            </h2>
          </div>
          <p className="text-xs text-[#a8a8a2] leading-relaxed">
            Manage your local operator display name, callsign handle, biography, and emblem selection in the dedicated operator identity dossier.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] px-3.5 py-2 text-xs font-medium text-[#8dc63f] hover:border-[#7ab32e] cursor-pointer"
            >
              Open Operator Profile Editor
            </button>
          </div>
        </section>

        {/* 2. Appearance */}
        <section className="rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-6">
          <div className="mb-4 flex items-center gap-2.5 border-b border-[#2e2e2a] pb-3">
            <Sliders className="h-4 w-4 text-[#8dc63f]" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-[#f5f5f2]">
              Appearance & Surface Atmosphere
            </h2>
          </div>

          <ToggleRow
            id="toggle-grid-overlay"
            label="Tactical Grid Background"
            description="Render subtle structural grid lines across the workspace canvas."
            checked={settings.appearance.gridOverlay}
            onChange={(val) => updateSettings('appearance', { gridOverlay: val })}
          />
          <ToggleRow
            id="toggle-scanline-overlay"
            label="Subtle Scanline Texture"
            description="Apply low-opacity horizontal terminal scanlines over the background."
            checked={settings.appearance.scanlineOverlay}
            onChange={(val) => updateSettings('appearance', { scanlineOverlay: val })}
          />
          <ToggleRow
            id="toggle-compact-density"
            label="Compact Workspace Spacing"
            description="Reduce outer viewport padding for higher information density."
            checked={settings.appearance.compactDensity}
            onChange={(val) => updateSettings('appearance', { compactDensity: val })}
          />
        </section>

        {/* 3. Notification & Sound Preferences */}
        <section className="rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-6">
          <div className="mb-4 flex items-center gap-2.5 border-b border-[#2e2e2a] pb-3">
            <Bell className="h-4 w-4 text-[#8dc63f]" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-[#f5f5f2]">
              Notifications & Sound Effects
            </h2>
          </div>

          <ToggleRow
            id="toggle-comp-alerts"
            label="Competition Start Alerts"
            description="Show local interface alerts when a competition countdown reaches zero."
            checked={settings.notifications.competitionStartAlerts}
            onChange={(val) =>
              updateSettings('notifications', { competitionStartAlerts: val })
            }
          />
          <ToggleRow
            id="toggle-leaderboard-alerts"
            label="Leaderboard Update Notices"
            description="Notify when ranking movements occur in connected sessions."
            checked={settings.notifications.leaderboardUpdates}
            onChange={(val) =>
              updateSettings('notifications', { leaderboardUpdates: val })
            }
          />
          <ToggleRow
            id="toggle-sound-effects"
            label="Interface Sound Effects"
            description="Play restrained audio synthesis cues on countdown expiration (disabled by default)."
            checked={settings.audio.soundEffectsEnabled}
            onChange={(val) => updateSettings('audio', { soundEffectsEnabled: val })}
          />
        </section>

        {/* 4. Accessibility & Reduced Motion */}
        <section className="rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-6">
          <div className="mb-4 flex items-center gap-2.5 border-b border-[#2e2e2a] pb-3">
            <Eye className="h-4 w-4 text-[#8dc63f]" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-[#f5f5f2]">
              Accessibility & Motion
            </h2>
          </div>

          <ToggleRow
            id="toggle-reduced-motion"
            label="Reduced Motion Mode"
            description="Minimize interface transitions and animated progress indicators."
            checked={settings.accessibility.reducedMotion}
            onChange={(val) =>
              updateSettings('accessibility', { reducedMotion: val })
            }
          />
          <ToggleRow
            id="toggle-high-contrast"
            label="Enhanced Border Contrast"
            description="Increase structural border luminance for sharper panel separation."
            checked={settings.accessibility.highContrastBorders}
            onChange={(val) =>
              updateSettings('accessibility', { highContrastBorders: val })
            }
          />
        </section>

        {/* 5. Privacy Preferences (Local Frontend Contract) */}
        <section className="rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-6">
          <div className="mb-4 flex items-center gap-2.5 border-b border-[#2e2e2a] pb-3">
            <Shield className="h-4 w-4 text-[#8dc63f]" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-[#f5f5f2]">
              Privacy Preferences (Client UI State)
            </h2>
          </div>

          <ToggleRow
            id="toggle-public-profile"
            label="Public Operator Dossier"
            description="Local preference for profile visibility once a backend account service is linked."
            checked={settings.privacy.publicOperatorProfile}
            onChange={(val) =>
              updateSettings('privacy', { publicOperatorProfile: val })
            }
          />
          <ToggleRow
            id="toggle-display-handle"
            label="Show Callsign on Leaderboard"
            description="Local preference for displaying your operator callsign in public standings."
            checked={settings.privacy.displayLeaderboardHandle}
            onChange={(val) =>
              updateSettings('privacy', { displayLeaderboardHandle: val })
            }
          />
        </section>

        {/* 6. Session & Account UI (Firebase Auth & Python Backend) */}
        <section className="rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-6 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between gap-2.5 border-b border-[#2e2e2a] pb-3">
              <div className="flex items-center gap-2.5">
                <Terminal className="h-4 w-4 text-[#8dc63f]" aria-hidden="true" />
                <h2 className="font-display text-base font-semibold text-[#f5f5f2]">
                  Session, Firebase Auth & Python Engine
                </h2>
              </div>
              <span className="font-mono text-[11px] text-[#a4d65e]">
                {pythonEngineOnline ? 'PYTHON API · ONLINE' : 'PYTHON API · STANDBY'}
              </span>
            </div>

            <p className="text-xs text-[#a8a8a2] leading-relaxed">
              {currentUser
                ? 'Authenticated via Google account. Profile updates and quiz results are validated by the Python engine and persisted to Firestore.'
                : 'Connected to Firebase Authentication, Firestore Database, and the Python API validation gateway. All data collections start empty with zero demo data.'}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#2e2e2a] pt-4">
            {currentUser ? (
              <button
                type="button"
                onClick={signOutOperator}
                className="rounded-md border border-[#FF365B]/60 bg-[#1b1b19] px-3.5 py-2 text-xs font-medium text-[#FF365B] hover:bg-[#FF365B]/10 transition-colors cursor-pointer"
              >
                Sign Out of Firebase
              </button>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="rounded-md bg-[#8dc63f] px-4 py-2 text-xs font-semibold text-[#141a09] hover:bg-[#a4d65e] transition-colors cursor-pointer"
              >
                Authenticate with Google
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                resetQuizSession();
                addToast(
                  'Local Assessment Cache Cleared',
                  'Stored session answers and timers have been reset.'
                );
              }}
              className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] px-3.5 py-2 text-xs font-medium text-[#f5f5f2] hover:border-[#FF365B] hover:text-[#FF365B] transition-colors cursor-pointer"
            >
              Clear Local Assessment Session
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
