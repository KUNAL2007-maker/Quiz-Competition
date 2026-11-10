/**
 * Traditional digital timer sound effects for 3, 2, 1, GO! countdown.
 * Programmatic Web Audio API synthesis — authentic, zero latency, runs on all browsers.
 */

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioCtx();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

/**
 * Traditional digital countdown beep for 3, 2, 1.
 * Standard 800 Hz clear digital pip, identical to classic digital timers & race start countdowns.
 */
export function playCountdownTick(_count: number): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Traditional digital timer tone: solid 800 Hz sine beep
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);

    const now = ctx.currentTime;
    // Crisp 120ms pip envelope
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.setValueAtTime(0.35, now + 0.09);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  } catch {
    // Ignore audio permission or playback errors
  }
}

/**
 * Traditional high-pitch start tone for "GO!" (0).
 * Standard 1600 Hz sustained beep (one octave higher, 450ms long), the classic "BEEEEEP!".
 */
export function playCountdownGo(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Traditional green-light / GO tone: 1600 Hz
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600, ctx.currentTime);

    const now = ctx.currentTime;
    // Long sustained tone (450ms)
    gain.gain.setValueAtTime(0.40, now);
    gain.gain.setValueAtTime(0.40, now + 0.40);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.46);
  } catch {
    // Ignore audio permission or playback errors
  }
}
