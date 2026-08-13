/* Bellmont Express Cargo B mark: a bold B built from two cargo lanes with a
   route line passing through the lower curve. */

const INK = "#14170f";
const SAGE = "#61735a";

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" className="shrink-0">
      <path d="M27 20h34c21 0 34 9 34 24 0 9-5 16-13 20 10 4 15 11 15 20 0 16-14 26-38 26H27V20Zm17 15v22h16c11 0 18-4 18-11s-7-11-18-11H44Zm0 35v25h18c12 0 19-5 19-13s-7-12-19-12H44Z" fill={SAGE} />
      <path d="M27 20h17v74H27z" fill={INK} />
      <path d="M19 96c12-8 24-10 34-6 11 4 22 4 32-4 7-5 14-7 22-5" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="107" cy="81" r="4" fill={SAGE} />
    </svg>
  );
}

export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <LogoMark size={size} />
      <span className="display leading-none tracking-tight" style={{ fontSize: size * 0.66 }}>
        <span className="font-bold">Bellmont</span>
        <span className="font-medium text-sage"> Express</span>
      </span>
    </span>
  );
}

/* Inline SVG string for generated documents */
export const LOGO_SVG_STRING = `<svg width="46" height="46" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M27 20h34c21 0 34 9 34 24 0 9-5 16-13 20 10 4 15 11 15 20 0 16-14 26-38 26H27V20Zm17 15v22h16c11 0 18-4 18-11s-7-11-18-11H44Zm0 35v25h18c12 0 19-5 19-13s-7-12-19-12H44Z" fill="${SAGE}"/><path d="M27 20h17v74H27z" fill="${INK}"/><path d="M19 96c12-8 24-10 34-6 11 4 22 4 32-4 7-5 14-7 22-5" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/><circle cx="107" cy="81" r="4" fill="${SAGE}"/></svg>`;
