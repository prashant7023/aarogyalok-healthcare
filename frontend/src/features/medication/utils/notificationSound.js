/**
 * utils/notificationSound.js
 *
 * Synthesises a pleasant 3-note ascending chime using the Web Audio API.
 * No external files needed — works offline and on all modern browsers.
 *
 * playReminderChime() — call when a medication reminder arrives.
 * playSnoozeSound()   — softer single tone for snooze confirmation.
 */

function getAudioContext() {
    if (typeof window === 'undefined') return null;
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        // Singleton so we don't create too many contexts
        if (!window._medAudioCtx || window._medAudioCtx.state === 'closed') {
            window._medAudioCtx = new Ctx();
        }
        return window._medAudioCtx;
    } catch {
        return null;
    }
}

/**
 * Play one sine-wave note with an exponential decay envelope.
 * @param {AudioContext} ctx
 * @param {number} freq      Frequency in Hz
 * @param {number} startTime AudioContext time to start
 * @param {number} duration  Note duration in seconds
 * @param {number} gain      Peak volume (0–1)
 */
function playTone(ctx, freq, startTime, duration = 0.6, gain = 0.35) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // Gentle attack → sustain → fade
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
}

/**
 * 3-note ascending chime: C5 → E5 → G5
 * Sounds like a hospital/pharmacy notification — pleasant and clear.
 */
export function playReminderChime() {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const notes = [
        { freq: 523.25, delay: 0 },     // C5
        { freq: 659.25, delay: 0.18 },  // E5
        { freq: 783.99, delay: 0.36 },  // G5
        { freq: 1046.5, delay: 0.58 },  // C6 — final high note
    ];

    notes.forEach(({ freq, delay }) => {
        playTone(ctx, freq, now + delay, 0.7, 0.3);
    });
}

/**
 * Single soft descending tone for snooze confirmation.
 */
export function playSnoozeSound() {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    playTone(ctx, 440, now, 0.5, 0.18);       // A4
    playTone(ctx, 349.23, now + 0.15, 0.5, 0.12); // F4
}

/**
 * Short positive tick for "Taken" success.
 */
export function playTakenSound() {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    playTone(ctx, 880, now, 0.25, 0.2);        // A5
    playTone(ctx, 1174.66, now + 0.1, 0.35, 0.15); // D6
}
