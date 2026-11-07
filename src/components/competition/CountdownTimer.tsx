import React, { useState, useEffect, useRef } from 'react';
import { calculateCountdown, formatPad } from '../../utils/timerLogic';
import { Volume2, VolumeX, Bell, Clock, ArrowRight } from 'lucide-react';

interface CountdownTimerProps {
  targetStartTime: string | number | null | undefined;
  onCountdownZero?: () => void;
  onEnterQuizNow?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetStartTime,
  onCountdownZero,
  onEnterQuizNow,
}) => {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [notifEnabled, setNotifEnabled] = useState<boolean>(false);
  const hasTriggeredZeroRef = useRef<boolean>(false);

  const countdown = calculateCountdown(targetStartTime, nowMs);

  // Reset zero trigger when targetStartTime changes
  useEffect(() => {
    hasTriggeredZeroRef.current = false;
    setNowMs(Date.now());
  }, [targetStartTime]);

  // Drift-free 1-second interval that recalculates from Date.now()
  useEffect(() => {
    if (!countdown.isValid || countdown.isExpired) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const currentNow = Date.now();
      setNowMs(currentNow);
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [countdown.isValid, countdown.isExpired, targetStartTime]);

  // Trigger expiration callback once when countdown reaches zero
  useEffect(() => {
    if (countdown.isValid && countdown.isExpired && !hasTriggeredZeroRef.current) {
      hasTriggeredZeroRef.current = true;
      if (soundEnabled) {
        try {
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
          }
        } catch {
          // Ignore audio permission restrictions
        }
      }
      if (onCountdownZero) {
        onCountdownZero();
      }
    }
  }, [countdown.isValid, countdown.isExpired, soundEnabled, onCountdownZero]);

  const handleToggleNotification = async () => {
    if (!notifEnabled && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          setNotifEnabled(true);
        } else {
          setNotifEnabled((prev) => !prev);
        }
      } catch {
        setNotifEnabled((prev) => !prev);
      }
    } else {
      setNotifEnabled((prev) => !prev);
    }
  };

  // Waiting State when no valid timestamp is configured
  if (!countdown.isValid) {
    return (
      <div className="rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2e2e2a] pb-5">
          <div>
            <p className="font-mono text-xs text-[#a8a8a2]">
              COUNTDOWN MODULE · STANDBY
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-[#f5f5f2]">
              Awaiting Scheduled Start Timestamp
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              aria-pressed={soundEnabled}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                soundEnabled
                  ? 'border-[#7ab32e] bg-[#1b1b19] text-[#8dc63f]'
                  : 'border-[#2e2e2a] bg-[#1b1b19] text-[#a8a8a2] hover:text-[#f5f5f2]'
              }`}
            >
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              <span>Audio Chime: {soundEnabled ? 'Enabled' : 'Off'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleNotification}
              aria-pressed={notifEnabled}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                notifEnabled
                  ? 'border-[#7ab32e] bg-[#1b1b19] text-[#8dc63f]'
                  : 'border-[#2e2e2a] bg-[#1b1b19] text-[#a8a8a2] hover:text-[#f5f5f2]'
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Browser Alert: {notifEnabled ? 'Armed' : 'Off'}</span>
            </button>
          </div>
        </div>

        {/* Unpopulated Segmented Display */}
        <div className="my-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'DAYS', value: '--' },
            { label: 'HOURS', value: '--' },
            { label: 'MINUTES', value: '--' },
            { label: 'SECONDS', value: '--' },
          ].map((unit) => (
            <div
              key={unit.label}
              className="flex flex-col items-center justify-center rounded-lg border border-[#2e2e2a] bg-[#1b1b19]/70 py-6 px-4"
            >
              <span className="font-mono text-4xl md:text-5xl font-bold tracking-wider text-[#a8a8a2]/40 tabular-nums">
                {unit.value}
              </span>
              <span className="mt-2 font-mono text-[11px] tracking-widest text-[#a8a8a2]">
                {unit.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-md border border-[#2e2e2a] bg-[#1b1b19]/40 p-4">
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-[#a8a8a2] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-[#a8a8a2] leading-relaxed">
              No active start timestamp is currently assigned to this waiting room. The countdown clock remains locked in standby until a competition start schedule is supplied.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active or Expired Valid Countdown Display
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (countdown.progressPercent / 100) * circumference;

  return (
    <div className="rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2e2e2a] pb-5">
        <div>
          <p className="font-mono text-xs text-[#8dc63f]">
            {countdown.isExpired
              ? 'ARENA STATUS · THRESHOLD REACHED'
              : 'ARENA STATUS · COUNTDOWN SYNCHRONIZED'}
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold text-[#f5f5f2]">
            {countdown.isExpired
              ? 'Quiz Competition Ready — Entering Quiz'
              : 'Time Remaining Until Quiz Unlocks'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            aria-pressed={soundEnabled}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              soundEnabled
                ? 'border-[#7ab32e] bg-[#1b1b19] text-[#8dc63f]'
                : 'border-[#2e2e2a] bg-[#1b1b19] text-[#a8a8a2] hover:text-[#f5f5f2]'
            }`}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span>Audio Chime: {soundEnabled ? 'Enabled' : 'Off'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleNotification}
            aria-pressed={notifEnabled}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              notifEnabled
                ? 'border-[#7ab32e] bg-[#1b1b19] text-[#8dc63f]'
                : 'border-[#2e2e2a] bg-[#1b1b19] text-[#a8a8a2] hover:text-[#f5f5f2]'
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            <span>Browser Alert: {notifEnabled ? 'Armed' : 'Off'}</span>
          </button>
        </div>
      </div>

      <div className="my-8 flex flex-col lg:flex-row items-center gap-8">
        {/* Circular Progress Indicator */}
        <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
          <svg className="h-36 w-36 -rotate-90 transform" viewBox="0 0 128 128">
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="#2e2e2a"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke={countdown.isExpired ? '#a4d65e' : '#8dc63f'}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-mono text-lg font-bold text-[#f5f5f2] tabular-nums">
              {countdown.progressPercent}%
            </span>
            <span className="font-mono text-[10px] text-[#a8a8a2]">SYNC</span>
          </div>
        </div>

        {/* Segmented Monospace Digits */}
        <div
          className={`grid flex-1 w-full gap-4 ${
            countdown.days > 0 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'
          }`}
        >
          {countdown.days > 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-[#2e2e2a] bg-[#1b1b19] py-6 px-4">
              <span className="font-mono text-4xl md:text-5xl font-bold text-[#8dc63f] tabular-nums drop-shadow-[0_0_12px_rgba(141, 198, 63,0.2)]">
                {formatPad(countdown.days)}
              </span>
              <span className="mt-2 font-mono text-[11px] tracking-widest text-[#a8a8a2]">
                DAYS
              </span>
            </div>
          )}

          <div className="flex flex-col items-center justify-center rounded-lg border border-[#2e2e2a] bg-[#1b1b19] py-6 px-4">
            <span className="font-mono text-4xl md:text-5xl font-bold text-[#8dc63f] tabular-nums drop-shadow-[0_0_12px_rgba(141, 198, 63,0.2)]">
              {formatPad(countdown.hours)}
            </span>
            <span className="mt-2 font-mono text-[11px] tracking-widest text-[#a8a8a2]">
              HOURS
            </span>
          </div>

          <div className="flex flex-col items-center justify-center rounded-lg border border-[#2e2e2a] bg-[#1b1b19] py-6 px-4">
            <span className="font-mono text-4xl md:text-5xl font-bold text-[#8dc63f] tabular-nums drop-shadow-[0_0_12px_rgba(141, 198, 63,0.2)]">
              {formatPad(countdown.minutes)}
            </span>
            <span className="mt-2 font-mono text-[11px] tracking-widest text-[#a8a8a2]">
              MINUTES
            </span>
          </div>

          <div className="flex flex-col items-center justify-center rounded-lg border border-[#2e2e2a] bg-[#1b1b19] py-6 px-4">
            <span className="font-mono text-4xl md:text-5xl font-bold text-[#a4d65e] tabular-nums drop-shadow-[0_0_12px_rgba(164, 214, 94,0.25)]">
              {formatPad(countdown.seconds)}
            </span>
            <span className="mt-2 font-mono text-[11px] tracking-widest text-[#a8a8a2]">
              SECONDS
            </span>
          </div>
        </div>
      </div>

      {countdown.isExpired && onEnterQuizNow && (
        <div className="mt-4 flex items-center justify-between rounded-md border border-[#a4d65e]/40 bg-[#1b1b19] p-4">
          <p className="text-xs font-medium text-[#a4d65e]">
            Countdown complete. Transitioning to quiz competition...
          </p>
          <button
            type="button"
            onClick={onEnterQuizNow}
            className="inline-flex items-center gap-2 rounded-md bg-[#8dc63f] px-4 py-2 text-xs font-semibold text-[#141a09] hover:bg-[#a4d65e] cursor-pointer"
          >
            <span>Enter Quiz Competition</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
