"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import LanguageSwitcher from "./LanguageSwitcher";

const LINKS = [
  { href: "/tracking", label: "Track" },
  { href: "/rates", label: "Check Rates" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/features", label: "Features" },
  { href: "/#services", label: "Services" },
  { href: "/#network", label: "Network" },
  { href: "/#people", label: "People" },
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
      <div className={`pointer-events-auto mx-auto flex h-16 max-w-7xl items-center justify-between rounded-full border border-white/70 bg-white/90 px-4 shadow-[0_14px_35px_rgba(20,23,15,.08)] backdrop-blur-xl transition-all duration-300 md:px-5 ${scrolled ? "shadow-[0_18px_42px_rgba(20,23,15,.13)]" : ""}`}>
        <Link href="/" aria-label="Bellmont Express home" className="notranslate">
          <Logo size={24} />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-2 lg:flex xl:gap-3" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-medium transition-colors xl:px-3 xl:text-sm ${isActive(l.href) ? "bg-[#fff0d8] text-[#425c99]" : "text-ink-soft hover:text-ink"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/tracking"
            className="hidden whitespace-nowrap rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-sage lg:inline-block xl:px-5 xl:text-sm"
          >
            Track a shipment
          </Link>
          <button
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span className={`h-0.5 w-6 bg-ink transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`h-0.5 w-6 bg-ink ${open ? "opacity-0" : ""}`} />
            <span className={`h-0.5 w-6 bg-ink transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {open && (
        <nav
          className="pointer-events-auto mt-2 rounded-3xl border border-line bg-white px-5 py-4 shadow-xl lg:hidden"
          aria-label="Mobile"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`block rounded-xl px-3 py-3 text-base font-medium ${isActive(l.href) ? "bg-[#fff0d8] text-[#425c99]" : "text-ink"}`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/tracking"
            onClick={() => setOpen(false)}
            className="mt-2 inline-block rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white"
          >
            Track a shipment
          </Link>
        </nav>
      )}
    </header>
  );
}
