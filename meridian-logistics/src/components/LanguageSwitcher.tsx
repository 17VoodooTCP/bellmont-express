"use client";

import { useEffect, useRef, useState } from "react";

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

const readCurrent = () => {
  const m = document.cookie.match(/googtrans=\/en\/([^;]+)/);
  const code = m ? decodeURIComponent(m[1]) : "en";
  return code === "en" ? "en" : code;
};

export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(LANGUAGES[0]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const code = readCurrent();
    const found = LANGUAGES.find((l) => l.code === code);
    if (found) setCurrent(found);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

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
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${current.label}`}
        className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm font-medium hover:border-ink transition-colors"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {/* SVG flags stay sharp at any pixel density; the old 20px PNGs were
            being stretched on high-resolution screens and looked soft. */}
        <img
          src={`https://flagcdn.com/${current.country}.svg`}
          alt=""
          width={22}
          height={16}
          className="lang-flag"
        />
        <span className="lang-name notranslate hidden sm:inline">{current.label}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 max-h-80 w-52 overflow-y-auto rounded-xl border border-line bg-white py-2 shadow-xl"
        >
          {LANGUAGES.map((lang) => (
            <li key={lang.code}>
              <button
                role="option"
                aria-selected={lang.code === current.code}
                onClick={() => pick(lang)}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-brand-tint ${
                  lang.code === current.code ? "font-semibold text-brand" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://flagcdn.com/${lang.country}.svg`}
                  alt=""
                  width={22}
                  height={16}
                  loading="lazy"
                  className="lang-flag"
                />
                <span className="lang-name notranslate">{lang.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
