/* Bellmont Express mark: an amber rounded badge, slanted forward, carrying a
   white stroked B — built the same way as the reference "F" badge.

   Colours are literal hex, not var() references, because the mark is also
   inlined into generated documents (invoices, letters) that have no
   stylesheet. Kept free of <defs> ids for the same reason, and so several
   marks on one page can never collide. */

const BADGE = "#f6a23a";
const WORDMARK = "#49629d";

/* Drawn in a 128x100 box. The badge and the letter share one group that is
   skewed 12 degrees, so the B leans with the badge; the translate re-centres
   the shear around the badge's middle. */
/* Exported so the integrations hub draws the identical badge. */
export const MARK_PATHS = `
  <g transform="translate(10.6 0) skewX(-12)">
    <rect x="16" y="8" width="96" height="84" rx="22" fill="${BADGE}"/>
    <path d="M50 28V72M50 28H64C71 28 75 32 75 38.5C75 45 71 49 64 49H50M50 49H67C74.5 49 79 53.5 79 60.5C79 67.5 74.5 72 67 72H50"
      fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;

const RATIO = 128 / 100;

/** The badge alone. `size` is its height in px. */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={Math.round(size * RATIO)}
      height={size}
      viewBox="0 0 128 100"
      aria-hidden="true"
      className="shrink-0"
      dangerouslySetInnerHTML={{ __html: MARK_PATHS }}
    />
  );
}

/** Badge plus wordmark. `size` is the badge height in px. */
export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center select-none"
      style={{ gap: Math.round(size * 0.16) }}
    >
      <LogoMark size={size} />
      <span
        className="leading-none whitespace-nowrap"
        style={{
          fontFamily: "var(--font-logo), var(--font-body), sans-serif",
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: Math.round(size * 0.95),
          letterSpacing: "-0.015em",
          color: WORDMARK,
        }}
      >
        Bellmont Express
      </span>
    </span>
  );
}

/* Inline SVG string for generated documents. */
export const LOGO_SVG_STRING = `<svg width="58" height="46" viewBox="0 0 128 100" xmlns="http://www.w3.org/2000/svg">${MARK_PATHS}</svg>`;
