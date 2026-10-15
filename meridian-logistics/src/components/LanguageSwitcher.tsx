"use client";

import { useEffect, useRef, useState } from "react";

/* Google Translate stays invisible; we drive it through the googtrans
   cookie and reload. Only translated content ever appears.

   Shown in the footer as a region line (globe + country) above a plain,
   square-cornered language box. The box is a native <select>, so it works
   with the keyboard, screen readers and phone pickers out of the box. */

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "it", label: "Italiano" },
  { code: "nl", label: "Nederlands" },
  { code: "zh-CN", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "ar", label: "العربية" },
  { code: "hi", label: "हिन्दी" },
  { code: "ru", label: "Русский" },
  { code: "tr", label: "Türkçe" },
  { code: "pl", label: "Polski" },
  { code: "sv", label: "Svenska" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "th", label: "ไทย" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "sw", label: "Kiswahili" },
];

const REGION = "United States";

const readCurrent = () => {
  const m = document.cookie.match(/googtrans=\/en\/([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "en";
};

const applyLanguage = (code: string) => {
  const host = location.hostname;
  // Google scatters googtrans across domain scopes; overwrite every scope.
  // "/en/en" (English) reliably restores the original text where deleting fails.
  const value = `/en/${code}`;
  const scopes = ["", `;domain=${host}`, `;domain=.${host}`];
  const root = host.split(".").slice(-2).join(".");
  if (root !== host) scopes.push(`;domain=.${root}`);
  for (const scope of scopes) {
    if (code === "en") document.cookie = `googtrans=;path=/${scope};max-age=0`;
    document.cookie = `googtrans=${value};path=/${scope}`;
  }
  if (code === "en" && location.hash.includes("googtrans")) history.replaceState(null, "", location.pathname + location.search);
  location.reload();
};

export default function LanguageSwitcher() {
  const [current, setCurrent] = useState("en");
  const selectRef = useRef<HTMLSelectElement>(null);

  // the cookie only exists in the browser, so read it after mounting
  useEffect(() => {
    const code = readCurrent();
    if (LANGUAGES.some((l) => l.code === code)) setCurrent(code);
  }, []);

  /* The region line opens the same list. showPicker() opens a native
     select where supported; elsewhere focusing it is the next best thing. */
  const openPicker = () => {
    const el = selectRef.current;
    if (!el) return;
    el.focus();
    try { el.showPicker?.(); } catch { /* not allowed or not supported */ }
  };

  return (
    <div className="lang-switch">
      <button type="button" onClick={openPicker} className="lang-region">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" />
          <ellipse cx="12" cy="12" rx="4.2" ry="9.5" />
          <path d="M2.5 12h19M4 7h16M4 17h16" />
        </svg>
        <span className="notranslate">{REGION}</span>
      </button>
      <div className="lang-select-wrap">
        <select
          ref={selectRef}
          value={current}
          onChange={(e) => { setCurrent(e.target.value); applyLanguage(e.target.value); }}
          aria-label="Language"
          className="lang-select notranslate"
          translate="no"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
        <svg className="lang-chevron" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 9l7 7 7-7" />
        </svg>
      </div>
    </div>
  );
}
