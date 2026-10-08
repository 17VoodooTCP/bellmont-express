"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* Google Translate stays invisible; we drive it through the googtrans
   cookie and reload. Only translated content ever appears. */

const LANGUAGES = [
  { code: "en", country: "us", label: "English" },
  { code: "es", country: "es", label: "Español" },
  { code: "fr", country: "fr", label: "Français" },
  { code: "de", country: "de", label: "Deutsch" },
  { code: "pt", country: "br", label: "Português" },
  { code: "it", country: "it", label: "Italiano" },
  { code: "nl", country: "nl", label: "Nederlands" },
  { code: "zh-CN", country: "cn", label: "中文" },
  { code: "ja", country: "jp", label: "日本語" },
  { code: "ko", country: "kr", label: "한국어" },
  { code: "ar", country: "sa", label: "العربية" },
  { code: "hi", country: "in", label: "हिन्दी" },
  { code: "ru", country: "ru", label: "Русский" },
  { code: "tr", country: "tr", label: "Türkçe" },
  { code: "pl", country: "pl", label: "Polski" },
  { code: "sv", country: "se", label: "Svenska" },
  { code: "vi", country: "vn", label: "Tiếng Việt" },
  { code: "th", country: "th", label: "ไทย" },
  { code: "id", country: "id", label: "Bahasa" },
  { code: "sw", country: "ke", label: "Kiswahili" },
];

/* Flags are the open-source flag-icons set (MIT), drawn at a true 4:3 so
   nothing is cropped or stretched; served from /public/flags. */
const flagSrc = (country: string) => `/flags/${country}.svg`;

const readCurrent = () => {
  const m = document.cookie.match(/googtrans=\/en\/([^;]+)/);
  const code = m ? decodeURIComponent(m[1]) : "en";
  return code === "en" ? "en" : code;
};

export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(LANGUAGES[0]);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const code = readCurrent();
    const found = LANGUAGES.find((l) => l.code === code);
    if (found) setCurrent(found);
  }, []);

  /* The nav bar clips its contents (overflow: hidden keeps its texture
     inside the rounded corners), so the list renders in a layer on
     <body> and is placed under the button. */
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = buttonRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
    };
  }, [open]);

  // close on an outside press or Escape; the list lives outside the button
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); buttonRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (lang: (typeof LANGUAGES)[number]) => {
    const host = location.hostname;
    // Google scatters googtrans across domain scopes; overwrite every scope.
    // "/en/en" (English) reliably restores the original text where deleting fails.
    const value = `/en/${lang.code}`;
    const scopes = ["", `;domain=${host}`, `;domain=.${host}`];
    const root = host.split(".").slice(-2).join(".");
    if (root !== host) scopes.push(`;domain=.${root}`);
    for (const scope of scopes) {
      if (lang.code === "en") {
        document.cookie = `googtrans=;path=/${scope};max-age=0`;
      }
      document.cookie = `googtrans=${value};path=/${scope}`;
    }
    if (lang.code === "en" && location.hash.includes("googtrans")) {
      location.hash = "";
    }
    location.reload();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${current.label}`}
        className="lang-button"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={flagSrc(current.country)} alt="" width={24} height={18} className="lang-flag" />
        <span className="lang-name notranslate hidden sm:inline">{current.label}</span>
      </button>

      {open && pos && createPortal(
        <ul
          ref={listRef}
          role="listbox"
          aria-label="Choose a language"
          className="lang-list"
          style={{ top: pos.top, right: pos.right }}
        >
          {LANGUAGES.map((lang) => (
            <li key={lang.code}>
              <button
                type="button"
                role="option"
                aria-selected={lang.code === current.code}
                onClick={() => pick(lang)}
                className={`lang-option ${lang.code === current.code ? "lang-option--current" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagSrc(lang.country)} alt="" width={24} height={18} loading="lazy" className="lang-flag" />
                <span className="lang-name notranslate">{lang.label}</span>
              </button>
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </>
  );
}
