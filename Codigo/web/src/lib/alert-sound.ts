export type AlertTone = 'obstacle' | 'fall' | 'test';

let context: AudioContext | null = null;

/** Creates (or resumes) the audio context. Must run from a user gesture such as a click. */
export function enableAlertSound(): boolean {
  if (typeof window === 'undefined') return false;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return false;
  context ??= new Ctor();
  void context.resume();
  return true;
}

function tone(ctx: AudioContext, start: number, frequency: number, duration: number, volume: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function playAlertSound(kind: AlertTone) {
  if (!context || context.state === 'closed') return;
  const now = context.currentTime;
  if (kind === 'fall') for (let i = 0; i < 4; i++) { tone(context, now + i * 0.32, 880, 0.16, 0.35); tone(context, now + i * 0.32 + 0.16, 660, 0.16, 0.35); }
  else if (kind === 'obstacle') tone(context, now, 880, 0.18, 0.25);
  else tone(context, now, 660, 0.15, 0.2);
}
