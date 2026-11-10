/**
 * Web Audio API synthesized sound effects for countdowns, alerts, and tournament transitions.
 * Pure programmatic synthesis — requires no external MP3/WAV assets, has 0 latency,
 * and runs reliably across all modern desktop and mobile browsers.
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
 * Plays a clean, crisp electronic countdown tick for 3, 2, 1.
 * Pitch escalates slightly from 3 down to 1 to build anticipation.
 */
export function playCountdownTick(count: number): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // 3 -> 880 Hz (A5), 2 -> 988 Hz (B5), 1 -> 1175 Hz (D6)
    const freq = count === 1 ? 1175 : count === 2 ? 988 : 880;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Short crisp click envelope
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch {
    // Ignore audio permission or playback errors
  }
}

/**
 * Plays a triumphant, energetic high-tech start chime when countdown hits "GO!" (0).
 */
export function playCountdownGo(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Primary ascending tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.18); // D6
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.35, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Harmonic secondary sparkle tone (A5 -> A6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.04);
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.24);
    gain2.gain.setValueAtTime(0.001, now + 0.04);
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.04);
    osc2.stop(now + 0.5);
  } catch {
    // Ignore audio permission or playback errors
  }
}
