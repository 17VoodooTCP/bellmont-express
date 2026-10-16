"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ClipboardList, X } from "lucide-react";
import {
  adminNotifications,
  getToken,
  readAdminNotification,
  readAllAdminNotifications,
  type AppNotification,
} from "@/lib/adminApi";
import { connectNotifications } from "@/lib/accountApi";

/** Re-broadcast on window so admin pages refresh their lists live. */
export const ADMIN_LIVE_EVENT = "bellmont:admin-live";
export type AdminLiveDetail = { event: string; payload: unknown };

const timeAgo = (iso: string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

/* A short two-note chime. Browsers only allow audio after the page has been
   interacted with; before that this fails silently, which is fine. */
function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [660, 880].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      o.type = "sine";
      const t = ctx.currentTime + i * 0.14;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.4);
    });
    setTimeout(() => void ctx.close(), 1000);
  } catch {
    /* no audio, no problem */
  }
}

/**
 * Live alerts for the operations console. Mounted once for every /admin
 * route; does nothing until an admin is signed in.
 */
export default function AdminNotifier() {
  const pathname = usePathname();
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [popups, setPopups] = useState<AppNotification[]>([]);
  const [token, setTokenState] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const baseTitle = useRef("");

  const onLogin = pathname === "/admin/login";

  /* Track the admin token: it appears after sign-in and vanishes on sign-out. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the token from localStorage, an external store
    setTokenState(getToken());
  }, [pathname]);

  const load = useCallback(async () => {
    try {
      const r = await adminNotifications();
      setItems(r.notifications);
      setUnread(r.unread);
    } catch {
      /* the page itself handles an expired session */
    }
  }, []);

  useEffect(() => {
    if (!token || onLogin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state is set after the request resolves
    void load();
    const socket = connectNotifications(token);
    socket.on("notification", (n: AppNotification) => {
      setItems((list) => [n, ...list].slice(0, 50));
      setUnread((u) => u + 1);
      setPopups((list) => [n, ...list].slice(0, 3));
      chime();
    });
    socket.onAny((event: string, payload: unknown) => {
      window.dispatchEvent(new CustomEvent<AdminLiveDetail>(ADMIN_LIVE_EVENT, { detail: { event, payload } }));
    });
    return () => {
      socket.close();
    };
  }, [token, onLogin, load]);

  /* Pop-ups leave on their own after a while. */
  useEffect(() => {
    if (!popups.length) return;
    const t = setTimeout(() => setPopups((list) => list.slice(0, -1)), 12000);
    return () => clearTimeout(t);
  }, [popups]);

  /* "(3) Operations console" in the tab, so a new request is noticed from
     another tab. */
  useEffect(() => {
    if (!baseTitle.current) baseTitle.current = document.title.replace(/^\(\d+\+?\)\s*/, "");
    document.title = unread ? `(${unread > 9 ? "9+" : unread}) ${baseTitle.current}` : baseTitle.current;
  }, [unread, pathname]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!token || onLogin) return null;

  const go = (n: AppNotification) => {
    if (!n.readAt) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      setUnread((u) => Math.max(0, u - 1));
      void readAdminNotification(n.id).catch(() => {});
    }
    setPopups((list) => list.filter((x) => x.id !== n.id));
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const markAll = () => {
    const now = new Date().toISOString();
    setItems((list) => list.map((x) => (x.readAt ? x : { ...x, readAt: now })));
    setUnread(0);
    void readAllAdminNotifications().catch(() => {});
  };

  return (
    <>
      <div ref={box} className="fixed right-4 top-4 z-[70] md:right-6">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={`Admin notifications${unread ? `, ${unread} unread` : ""}`}
          aria-expanded={open}
          className="relative grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-ink shadow-[0_8px_24px_rgba(25,35,58,.12)] hover:bg-ocean"
        >
          <Bell size={19} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-orange-ink px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-[min(92vw,400px)] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_rgba(25,35,58,.2)]">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-semibold">Operations alerts</p>
              {unread > 0 && (
                <button type="button" onClick={markAll} className="text-xs font-semibold text-brand hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <ul className="max-h-[65vh] overflow-y-auto">
              {items.length === 0 && <li className="px-4 py-10 text-center text-sm text-ink-mute">No alerts yet.</li>}
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => go(n)}
                    className={`flex w-full gap-3 border-b border-line/70 px-4 py-3.5 text-left last:border-0 hover:bg-ocean ${n.readAt ? "" : "bg-brand-tint/40"}`}
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-brand"}`} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{n.title}</span>
                      {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-ink-soft">{n.body}</span>}
                      <span className="mt-1 block text-[11px] text-ink-mute">{timeAgo(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Live pop-ups */}
      <div className="fixed right-4 top-20 z-[70] flex w-[min(92vw,380px)] flex-col gap-3 md:right-6" aria-live="assertive">
        {popups.map((n) => (
          <div
            key={n.id}
            role="alert"
            className="flex animate-[lc-pop_.35s_ease-out] gap-3 rounded-2xl border border-line bg-white p-4 shadow-[0_24px_60px_rgba(25,35,58,.24)]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-deep text-white">
              <ClipboardList size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{n.title}</p>
              {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{n.body}</p>}
              {n.link && (
                <button
                  type="button"
                  onClick={() => go(n)}
                  className="mt-2.5 rounded-lg bg-brand-deep px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand"
                >
                  Review
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPopups((list) => list.filter((x) => x.id !== n.id))}
              aria-label="Dismiss"
              className="self-start text-ink-mute hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
