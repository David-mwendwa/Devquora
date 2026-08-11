// The "D" is drawn rather than typed: a flat spine and rounded bowl keep it legible as a
// capital D, while the tail sweeping off the bottom-left and the three knocked-out dots
// make it read as a speech bubble — Devquora is where developers discuss what they write,
// not just publish it. The dots are true holes (even-odd fill) rather than dark-filled
// circles, so the mark drops onto any surface — cream page, near-black page, brass favicon
// badge — without needing a per-surface variant.
//
// Two things here are load-bearing and easy to undo by accident:
//   1. It's sized in `em` against Inter's cap height (0.727em), so it tracks the wordmark's
//      font-size automatically. The previous version took a pixel `size` prop, which
//      silently desynced in the footer where the text shrinks to `text-xs`.
//   2. `inline align-baseline` overrides Tailwind's preflight, which sets svg to
//      `display:block`. Without it the glyph leaves the text flow and needs a hand-tuned
//      vertical nudge — which is exactly what the old `relative top-[3px]` was papering over.
// The glyph's box is exactly cap height, and the tail tip lands on the baseline, so it sits
// on the text baseline with no offset at any size.
const DevquoraMark = ({ className = '' }) => (
  <svg
    viewBox="0 0 19.5 22"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={`inline h-[0.727em] w-auto align-baseline ${className}`}>
    <path
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M1 0H9.5C15.6 0 19.5 4.5 19.5 10.1C19.5 15.7 15.6 20.4 9.5 20.4H6.3L1 22Z
         M3.7 10.1a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0-3.8 0
         M8.35 10.1a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0-3.8 0
         M13 10.1a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0-3.8 0"
    />
  </svg>
);

// `onDark` is for the auth page's always-dark branding panel, which keeps its own
// background regardless of the site-wide theme — so it can't use `dark:` variants,
// which key off the toggle rather than the surface underneath.
const Logo = ({ className = '', textClassName = '', onDark = false }) => {
  const ink = onDark ? 'text-dark-50' : 'text-dark-800 dark:text-dark-200';
  const accent = onDark ? 'text-primary-400' : 'text-primary-500 dark:text-primary-400';
  const word = onDark ? 'text-primary-400' : 'text-primary-600 dark:text-primary-400';

  return (
    <span
      className={`inline-block whitespace-nowrap font-heading text-xl font-extrabold tracking-tight ${ink} ${className} ${textClassName}`}>
      <DevquoraMark className={accent} />
      ev
      <span aria-hidden="true" className={`mx-0.5 font-mono ${accent}`}>
        /
      </span>
      <span className={word}>quora</span>
    </span>
  );
};

export default Logo;
export { DevquoraMark };
