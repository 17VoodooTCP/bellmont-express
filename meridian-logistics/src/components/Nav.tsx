"use client";

import Link from "next/link";
import { warmOnIntent } from "@/components/ApiWarmth";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import LanguageSwitcher from "./LanguageSwitcher";
import NavIntro from "./NavIntro";

/* Kept short so the bar reads cleanly and leaves room for the arrival
   animation; the rest of the site is reachable from the footer. */
const LINKS = [
  { href: "/tracking", label: "Track" },
  { href: "/rates", label: "Check Rates" },
  { href: "/pricing", label: "Pricing" },
  { href: "/features", label: "Features" },
  { href: "/#services", label: "Services" },
];

export default function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hash, setHash] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    const onHashChange = () => setHash(window.location.hash);
    onScroll();
    onHashChange();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  const isActive = (href: string) => {
    if (href.startsWith("/#")) return pathname === "/" && hash === href.slice(1);
    return pathname === href || (href === "/tracking" && pathname.startsWith("/tracking"));
  };

  return (
    <header
      className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-2 md:px-5 md:pt-3"
    >
      <div className={`nav-shell pointer-events-auto mx-auto grid h-14 w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center nav-bar rounded-[18px] border lg:flex lg:w-fit lg:justify-start lg:gap-6 border-white/70 bg-white/90 px-4 shadow-[0_14px_35px_rgba(20,23,15,.08)] backdrop-blur-xl transition-all duration-300 md:px-5 ${scrolled ? "shadow-[0_18px_42px_rgba(20,23,15,.13)]" : ""}`}>
        <NavIntro />
        <button
          className="flex h-10 w-10 justify-self-start flex-col items-center justify-center gap-1.5 lg:hidden"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={`h-0.5 w-6 bg-ink transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
          <span className={`h-0.5 w-6 bg-ink ${open ? "opacity-0" : ""}`} />
          <span className={`h-0.5 w-6 bg-ink transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
        </button>
        <Link href="/" aria-label="Bellmont Express home" className="notranslate justify-self-center">
          <span className="lg:hidden"><Logo size={22} /></span>
          <span className="hidden lg:inline-flex"><Logo size={26} /></span>
        </Link>

        <span aria-hidden="true" className="nav-divider hidden lg:block" />

        <nav className="hidden items-center gap-1 lg:flex xl:gap-2" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`nav-link whitespace-nowrap rounded-none px-2.5 py-2 text-[13px] font-medium transition-colors xl:px-3 xl:text-sm ${isActive(l.href) ? "bg-[#fff0d8] text-[#425c99]" : "text-ink-soft hover:text-ink"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <span aria-hidden="true" className="nav-divider hidden lg:block" />

        <div className="flex items-center gap-3 justify-self-end">
          <LanguageSwitcher />
          <Link
            href="/tracking"
            {...warmOnIntent}
            className="nav-cta hidden whitespace-nowrap rounded-full bg-iris px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-iris-deep lg:inline-block xl:px-5 xl:text-sm"
          >
            Track a shipment
          </Link>
        </div>
      </div>

      {open && (
        <nav
          className="pointer-events-auto mt-2 rounded-[18px] border border-line bg-white px-5 py-4 shadow-xl lg:hidden"
          aria-label="Mobile"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`block rounded-none px-3 py-3 text-base font-medium ${isActive(l.href) ? "bg-[#fff0d8] text-[#425c99]" : "text-ink"}`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/tracking"
            {...warmOnIntent}
            onClick={() => setOpen(false)}
            className="nav-cta mt-2 inline-block rounded-full bg-iris px-5 py-2 text-sm font-semibold text-white"
          >
            Track a shipment
          </Link>
        </nav>
      )}
    </header>
  );
}
