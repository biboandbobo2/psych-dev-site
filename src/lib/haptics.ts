export function triggerHaptic(pattern: number | number[] = 12) {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;
  if (window.matchMedia && !window.matchMedia('(max-width: 639px)').matches) return;
  navigator.vibrate(pattern);
}
