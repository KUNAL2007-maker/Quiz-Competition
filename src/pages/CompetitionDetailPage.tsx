import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Lock,
  FileText,
  ArrowRight,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { CountdownTimer } from '../components/competition/CountdownTimer';
import { EmptyStateBlock } from '../components/ui/EmptyStateBlock';
import { ModalDialog } from '../components/ui/ModalDialog';

export const CompetitionDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    selectedCompetition,
    targetStartTime,
    setTargetStartTime,
    startQuizSession,
    addToast,
  } = useAppContext();

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [customTimestampInput, setCustomTimestampInput] = useState('');

  const effectiveStartTime = selectedCompetition?.startTime || targetStartTime;

  const handleEnterQuiz = useCallback(() => {
    if (!currentUser) {
      navigate('/login?redirect=/quiz');
      return;
    }
    if (selectedCompetition) {
      startQuizSession(selectedCompetition);
    }
    navigate('/quiz');
  }, [currentUser, selectedCompetition, startQuizSession, navigate]);

  const handleCountdownComplete = useCallback(() => {
    setIsTransitioning(true);
    addToast(
      'Countdown Reached Zero',
      'Transitioning into the assessment environment...',
      'success'
    );
    if (!currentUser) {
      navigate('/login?redirect=/quiz');
      return;
    }
    if (selectedCompetition) {
      startQuizSession(selectedCompetition);
    }
    const timer = window.setTimeout(() => {
      navigate('/quiz');
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [currentUser, selectedCompetition, startQuizSession, navigate, addToast]);

  const handleApplyCustomTimestamp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTimestampInput.trim()) {
      setTargetStartTime(null);
      setIsScheduleModalOpen(false);
      return;
    }
    const parsed = Date.parse(customTimestampInput);
    if (Number.isNaN(parsed)) {
      addToast('Invalid Timestamp Format', 'Provide a valid ISO date/time string.', 'alert');
      return;
    }
    setTargetStartTime(new Date(parsed).toISOString());
    setIsScheduleModalOpen(false);
    addToast('Target Timestamp Configured', 'Local countdown timer synchronized to target time.', 'success');
  };

  return (
    <div className="space-y-8">
      {/* Visible Transition Overlay when countdown reaches zero */}
      {isTransitioning && (
        <div
          role="status"
          aria-live="assertive"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07090D]/95 p-6 text-center backdrop-blur-md"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#B6FF3B] bg-[#111722] text-[#B6FF3B]">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="font-mono text-xs tracking-widest text-[#B6FF3B]">
            COUNTDOWN COMPLETE · ARENA UNLOCKED
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-[#F0F3F7]">
            Initializing Focused Assessment Environment
          </h2>
          <p className="mt-2 text-sm text-[#929DAC] max-w-md">
            Redirecting operator terminal to the quiz interface...
          </p>
        </div>
      )}

      {/* Top Arena Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#252D38] pb-6">
        <div>
          <p className="font-mono text-xs tracking-wider text-[#B6FF3B]">
            COMPETITION WAITING ROOM
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#F0F3F7]">
            {selectedCompetition ? selectedCompetition.title : 'Staging Arena & Countdown'}
          </h1>
          <p className="mt-2 text-sm text-[#929DAC] max-w-2xl">
            {selectedCompetition?.description ||
              'Secure digital staging room for scheduled cybersecurity competitions. The assessment environment unlocks automatically when a valid target start time expires.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsScheduleModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-[#252D38] bg-[#111722] px-3.5 py-2 text-xs font-medium text-[#F0F3F7] hover:border-[#B6FF3B] hover:text-[#B6FF3B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Configure Target Timestamp</span>
          </button>

          <button
            type="button"
            onClick={handleEnterQuiz}
            className="inline-flex items-center gap-2 rounded-md bg-[#B6FF3B] px-4 py-2 text-xs font-semibold text-[#07090D] hover:bg-[#c8ff66] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>{selectedCompetition ? 'Enter Assessment Terminal' : 'Open Quiz Interface'}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Prominent Countdown Timer Component */}
      <CountdownTimer
        targetStartTime={effectiveStartTime}
        onCountdownZero={handleCountdownComplete}
        onEnterQuizNow={handleEnterQuiz}
      />

      {/* Competition Information or Selection-Required State */}
      {!selectedCompetition ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <EmptyStateBlock
              icon={ShieldAlert}
              visualType="matrix"
              codeLabel="SELECTION REQUIRED · NO COMPETITION LOADED"
              title="No Competition Selected"
              description="Select an active or upcoming competition from the directory to inspect its scheduled start time, total duration, difficulty clearance, rules, and quiz format."
              actionLabel="Browse Competitions Directory"
              onAction={() => navigate('/competitions')}
              secondaryActionLabel="Inspect Quiz Terminal"
              onSecondaryAction={() => navigate('/quiz')}
            />
          </div>

          {/* Pre-Competition Interface Specification Card (Clearly treated as visual UI contract) */}
          <div className="rounded-lg border border-[#252D38] bg-[#0C1017] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#252D38] pb-3">
                <h2 className="font-display text-sm font-semibold text-[#F0F3F7]">
                  Staging Room Specification
                </h2>
                <Lock className="h-4 w-4 text-[#929DAC]" aria-hidden="true" />
              </div>

              <p className="mt-4 text-xs text-[#929DAC] leading-relaxed">
                This waiting room enforces client-side time synchronization against a supplied target timestamp.
              </p>

              <dl className="mt-5 space-y-3 border-t border-[#252D38] pt-4 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-[#929DAC]">Selected Event</dt>
                  <dd className="font-mono text-[#F0F3F7]">None</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[#929DAC]">Target Timestamp</dt>
                  <dd className="font-mono text-[#F0F3F7]">
                    {effectiveStartTime ? 'Configured' : 'Unassigned'}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[#929DAC]">Auto-Transition</dt>
                  <dd className="font-mono text-[#36F58A]">Armed on 00:00</dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 rounded-md border border-[#252D38] bg-[#111722]/60 p-3">
              <p className="font-mono text-[11px] text-[#929DAC]">
                UI CONTRACT NOTE
              </p>
              <p className="mt-1 text-xs text-[#929DAC]/90 leading-relaxed">
                Competition rules, duration, and format fields render dynamically when a competition record is selected.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Structured sections when a real competition is selected */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border border-[#252D38] bg-[#0C1017] p-6">
              <h2 className="font-display text-lg font-semibold text-[#F0F3F7]">
                Operational Briefing & Format
              </h2>
              {selectedCompetition.description && (
                <p className="mt-2 text-sm text-[#929DAC] leading-relaxed">
                  {selectedCompetition.description}
                </p>
              )}

              <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[#252D38] pt-4">
                {selectedCompetition.status && (
                  <div>
                    <dt className="font-mono text-xs text-[#929DAC]">STATUS</dt>
                    <dd className="mt-1 font-mono text-sm font-semibold text-[#B6FF3B]">
                      {selectedCompetition.status.toUpperCase()}
                    </dd>
                  </div>
                )}
                {selectedCompetition.durationMinutes !== undefined && (
                  <div>
                    <dt className="font-mono text-xs text-[#929DAC]">DURATION</dt>
                    <dd className="mt-1 font-mono text-sm text-[#F0F3F7]">
                      {selectedCompetition.durationMinutes} Minutes
                    </dd>
                  </div>
                )}
                {selectedCompetition.difficulty && (
                  <div>
                    <dt className="font-mono text-xs text-[#929DAC]">DIFFICULTY</dt>
                    <dd className="mt-1 font-mono text-sm text-[#F0F3F7]">
                      {selectedCompetition.difficulty}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {selectedCompetition.rules && selectedCompetition.rules.length > 0 && (
              <div className="rounded-lg border border-[#252D38] bg-[#0C1017] p-6">
                <h3 className="font-display text-base font-semibold text-[#F0F3F7] flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#B6FF3B]" />
                  <span>Rules of Engagement</span>
                </h3>
                <ul className="mt-4 space-y-2 text-sm text-[#929DAC] list-disc list-inside">
                  {selectedCompetition.rules.map((rule, i) => (
                    <li key={i}>{rule}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {selectedCompetition.requirements && selectedCompetition.requirements.length > 0 && (
              <div className="rounded-lg border border-[#252D38] bg-[#0C1017] p-6">
                <h3 className="font-display text-base font-semibold text-[#F0F3F7]">
                  Participation Requirements
                </h3>
                <ul className="mt-4 space-y-2 text-xs text-[#929DAC] list-disc list-inside">
                  {selectedCompetition.requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal to configure target timestamp for countdown verification */}
      <ModalDialog
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title="Configure Target Start Timestamp"
        subtitle="Set or clear a local target start timestamp to verify countdown synchronization and automatic quiz transition."
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setTargetStartTime(null);
                setCustomTimestampInput('');
                setIsScheduleModalOpen(false);
                addToast('Countdown Cleared', 'Waiting room returned to standby state.');
              }}
              className="rounded-md border border-[#252D38] bg-[#111722] px-4 py-2 text-xs font-medium text-[#929DAC] hover:text-[#F0F3F7] cursor-pointer"
            >
              Reset to Standby
            </button>
            <button
              type="submit"
              form="schedule-timestamp-form"
              className="rounded-md bg-[#B6FF3B] px-4 py-2 text-xs font-semibold text-[#07090D] hover:bg-[#c8ff66] cursor-pointer"
            >
              Apply Timestamp
            </button>
          </>
        }
      >
        <form id="schedule-timestamp-form" onSubmit={handleApplyCustomTimestamp} className="space-y-4">
          <div>
            <label
              htmlFor="target-iso-input"
              className="block font-mono text-xs text-[#929DAC] mb-1.5"
            >
              TARGET START TIMESTAMP (ISO 8601)
            </label>
            <input
              id="target-iso-input"
              type="text"
              value={customTimestampInput}
              onChange={(e) => setCustomTimestampInput(e.target.value)}
              placeholder="YYYY-MM-DDTHH:mm:ss.sssZ"
              className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3 py-2 font-mono text-xs text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-[#929DAC]">Quick Presets:</span>
            <button
              type="button"
              onClick={() =>
                setCustomTimestampInput(new Date(Date.now() + 5000).toISOString())
              }
              className="rounded border border-[#252D38] bg-[#111722] px-2.5 py-1 font-mono text-xs text-[#B6FF3B] hover:border-[#B6FF3B] cursor-pointer"
            >
              +5 Seconds
            </button>
            <button
              type="button"
              onClick={() =>
                setCustomTimestampInput(new Date(Date.now() + 60000).toISOString())
              }
              className="rounded border border-[#252D38] bg-[#111722] px-2.5 py-1 font-mono text-xs text-[#F0F3F7] hover:border-[#B6FF3B] cursor-pointer"
            >
              +1 Minute
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};
