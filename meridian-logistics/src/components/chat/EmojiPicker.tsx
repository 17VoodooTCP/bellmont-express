"use client";

/* A compact emoji picker for the chat composers. Built in rather than a
   package: the popular pickers ship hundreds of KB of data for thousands of
   emoji, and support chat needs a few hundred. Native emoji, so they render
   in each device's own font and arrive as ordinary text. */

import { useEffect, useRef, useState } from "react";

const CATEGORIES: { id: string; label: string; icon: string; emoji: string[] }[] = [
  {
    id: "smileys",
    label: "Smileys",
    icon: "😊",
    emoji: "😀 😃 😄 😁 😆 😅 😂 🤣 😊 🙂 😉 😍 🥰 😘 😋 😎 🤩 🥳 🤗 🤔 🤨 😐 😑 🙄 😏 😌 😴 😪 😮 😯 😲 🥺 😢 😭 😤 😠 😡 🤯 😳 🥶 🥵 😱 😬 🤐 🤫 🫡 🙃 😇".split(" "),
  },
  {
    id: "gestures",
    label: "Gestures",
    icon: "👍",
    emoji: "👍 👎 👌 ✌️ 🤞 🤝 🙏 👏 🙌 👋 🤙 💪 👊 ✊ 🫶 👀 🫠 🤷 🙋 🙆 🙅 💁 🤦 👆 👇 👈 👉 ☝️ ✋ 🖐️".split(" "),
  },
  {
    id: "hearts",
    label: "Hearts",
    icon: "❤️",
    emoji: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❤️‍🔥 💕 💞 💓 💗 💖 💘 💝 ✨ ⭐ 🌟 💯 🔥 🎉 🎊 🏆 🥇 ✅ ☑️ ❌".split(" "),
  },
  {
    id: "shipping",
    label: "Shipping",
    icon: "📦",
    emoji: "📦 📫 📬 📮 🏷️ 🧾 📄 📑 📋 🗂️ 🚚 🚛 🚐 🚗 🛻 🚂 🚢 ⛴️ ✈️ 🛫 🛬 🚁 🛵 🚲 🏭 🏬 🏠 🏢 🗺️ 📍 🧭 ⏰ ⏳ 📅 🧊 ❄️ 🌡️ 💵 💳 🔒".split(" "),
  },
  {
    id: "symbols",
    label: "Symbols",
    icon: "❓",
    emoji: "❓ ❗ ‼️ ⚠️ 🚫 ⛔ ✔️ ➕ ➖ 🔁 🔄 ⏩ ⏪ 🆗 🆕 🆘 ℹ️ 📞 ✉️ 📧 💬 🗨️ 🔔 🔕 📌 🔗 🕐 🕒 🕕 🕘".split(" "),
  },
];

const RECENT_KEY = "bellmont_recent_emoji";
const RECENT_MAX = 16;

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function pushRecent(e: string) {
  try {
    const next = [e, ...readRecent().filter((x) => x !== e)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* private mode: no recents, the picker still works */
  }
}

/**
 * Insert `text` into a text field at the caret, replacing any selection, and
 * put the caret after it. Returns the new value for the caller's state.
 */
export function insertAtCaret(el: HTMLInputElement | HTMLTextAreaElement | null, value: string, text: string) {
  if (!el) return value + text;
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const next = value.slice(0, start) + text + value.slice(end);
  const caret = start + text.length;
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(caret, caret);
  });
  return next;
}

export default function EmojiPicker({
  onPick,
  buttonClassName = "",
  align = "left",
}: {
  onPick: (emoji: string) => void;
  buttonClassName?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("recent");
  const [recent, setRecent] = useState<string[]>([]);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const r = readRecent();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage, an external store, when the picker opens
    setRecent(r);
    setTab((t) => (t === "recent" && !r.length ? "smileys" : t));
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const pick = (e: string) => {
    pushRecent(e);
    onPick(e);
  };

  const tabs = [
    ...(recent.length ? [{ id: "recent", label: "Recent", icon: "🕘", emoji: recent }] : []),
    ...CATEGORIES,
  ];
  const current = tabs.find((t) => t.id === tab) ?? tabs[0]!;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Add an emoji"
        aria-expanded={open}
        aria-haspopup="dialog"
        className={buttonClassName}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
          <path d="M9 9.5h.01M15 9.5h.01" strokeWidth="2.6" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Emoji"
          className={`absolute bottom-full z-[60] mb-2 w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#e6e1d3] bg-white shadow-[0_18px_50px_rgba(30,41,80,.22)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="flex gap-0.5 border-b border-[#efebe0] px-2 pt-2" role="tablist" aria-label="Emoji categories">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={t.id === current.id}
                title={t.label}
                aria-label={t.label}
                onClick={() => setTab(t.id)}
                className={`grid h-9 w-9 place-items-center rounded-t-lg text-lg transition-colors ${
                  t.id === current.id ? "bg-[#f4f2ec]" : "opacity-60 hover:opacity-100"
                }`}
              >
                {t.icon}
              </button>
            ))}
          </div>
          <p className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wider text-[#8a90a0]">{current.label}</p>
          <div className="grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto p-2" role="tabpanel">
            {current.emoji.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => pick(e)}
                aria-label={e}
                className="grid h-9 w-9 place-items-center rounded-lg text-[22px] leading-none transition-transform hover:scale-110 hover:bg-[#f4f2ec]"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** A message made only of emoji (up to a few) is shown large, like messengers do. */
export function isEmojiOnly(text: string) {
  const t = text.trim();
  if (!t || t.length > 24 || /[0-9A-Za-z#*]/.test(t)) return false;
  return /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s)+$/u.test(t) && /\p{Extended_Pictographic}/u.test(t);
}
