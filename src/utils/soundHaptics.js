// ════════════════════════════════════════════════════════════════
// CLEANSWEEP X - SYNTHETIC HAPTIC & AUDIO ENGINE
// Inspired by Duolingo, Revolut, and Apple iOS tactile haptics.
// Pure Web Audio API — Zero latency, zero external assets.
// ════════════════════════════════════════════════════════════════

const SOUND_PREF_KEY = 'csx_sound_enabled';

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled() {
  try {
    const pref = localStorage.getItem(SOUND_PREF_KEY);
    return pref === null ? true : pref === 'true';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(SOUND_PREF_KEY, enabled ? 'true' : 'false');
  } catch {}
}

export function toggleSound() {
  const next = !isSoundEnabled();
  setSoundEnabled(next);
  if (next) {
    playTap();
  }
  return next;
}

// ── Physical Vibration API ──────────────────────────────────────
export function triggerHaptic(type = 'light') {
  if (typeof window === 'undefined' || !navigator?.vibrate) return;
  try {
    if (type === 'light') {
      navigator.vibrate(8);
    } else if (type === 'medium') {
      navigator.vibrate(14);
    } else if (type === 'double') {
      navigator.vibrate([10, 30, 12]);
    } else if (type === 'success') {
      navigator.vibrate([8, 40, 16]);
    }
  } catch {}
}

// ── Synthetic Haptic Audio Effects ─────────────────────────────

/**
 * Micro-Tap: Subtle mechanical 10ms click for cards, tabs, and filters.
 * Similar to iOS picker tick or Revolut pill switch.
 */
export function playTap() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.015);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.016);
  } catch {}
}

/**
 * Duolingo-style Bubbly Pop: Ascending, cheerful harmonic pop for "Keep" action.
 * Frequency jumps 420Hz -> 860Hz with soft rounded envelope.
 */
export function playKeepPop() {
  triggerHaptic('light');
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(860, now + 0.07);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  } catch {}
}

/**
 * Revolut / Punchy Mechanical Thud: Decisive down-pitch 320Hz -> 75Hz for "Unfollow" action.
 * Gives immediate physical feedback of closure.
 */
export function playUnfollowThud() {
  triggerHaptic('double');
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.09);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  } catch {}
}

/**
 * Mechanical Key Switch: Satisfying tactile mechanical switch click for keyboard dock buttons.
 */
export function playKeySwitch() {
  triggerHaptic('light');
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.025);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.026);
  } catch {}
}

/**
 * Undo Sound: Soft reverse sweep 180Hz -> 480Hz.
 */
export function playUndo() {
  triggerHaptic('light');
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.11);
  } catch {}
}

/**
 * Milestone Celebration Fanfare: 3-note ascending chime for milestones (e.g. 10, 25, 50, 100 reviewed).
 */
export function playCelebrationFanfare() {
  triggerHaptic('success');
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const noteDuration = 0.08;
    const startTime = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = startTime + idx * noteDuration;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + noteDuration * 1.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + noteDuration * 1.6);
    });
  } catch {}
}
