import Link from "next/link";
import Logo from "./Logo";

const COLS = [
  {
    title: "Services",
    items: [
      { label: "Ocean Freight", href: "/services" },
      { label: "Air Freight", href: "/services" },
      { label: "Road Freight", href: "/services" },
      { label: "Rail Freight", href: "/services" },
      { label: "Warehousing", href: "/services" },
      { label: "Express", href: "/services" },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/about" },
      { label: "Newsroom", href: "/about" },
      { label: "Sustainability", href: "/about" },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "Track a Shipment", href: "/tracking" },
      { label: "Help Center", href: "/support" },
      { label: "Claims", href: "/support" },
      { label: "Documentation", href: "/support" },
    ],
  },
];

/* Official brand glyphs: real marks, not illustrations */
const SOCIALS = [
  {
    label: "X",
    href: "https://x.com/bellmontexpress",
    color: "#11140f",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/bellmontexpress",
    color: "#0A66C2",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/bellmontexpress",
    color: "#1877F2",
    path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <span className="notranslate"><Logo size={28} /></span>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-mute">
              Moving the world&rsquo;s cargo across ocean, air, road and rail,
              with live visibility on every mile.
            </p>
            <a
              href="mailto:support@bellmontexpress.com"
              className="notranslate mt-5 inline-block text-sm font-semibold text-ink transition-colors hover:text-sage"
            >
              support@bellmontexpress.com
            </a>
            <div className="mt-5 flex items-center gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="social-icon flex h-9 w-9 items-center justify-center rounded-full border border-line transition-colors hover:border-transparent hover:text-white"
                  style={{ color: s.color }}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
          {COLS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-mute">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-ink-soft transition-colors hover:text-sage"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-line pt-6 text-xs text-ink-mute md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Bellmont Express · bellmontexpress.com</p>
          <p className="notranslate">Ocean · Air · Road · Rail</p>
        </div>
      </div>
    </footer>
  );
}
