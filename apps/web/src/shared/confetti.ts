import confetti from 'canvas-confetti';

/** A short burst in Flossy's colours. Skipped when the visitor prefers less motion. */
export function celebrate() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#22c7a0', '#ff8fb1', '#ffc93c', '#6ea8ff', '#ffffff'];
  confetti({ particleCount: 90, spread: 75, origin: { y: 0.55 }, colors, zIndex: 2000, disableForReducedMotion: true });
  setTimeout(
    () =>
      confetti({
        particleCount: 50,
        spread: 110,
        origin: { y: 0.5 },
        colors,
        zIndex: 2000,
        disableForReducedMotion: true,
      }),
    180,
  );
}
