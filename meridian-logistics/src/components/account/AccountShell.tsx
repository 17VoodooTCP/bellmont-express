"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  PackagePlus,
  Settings,
  X,
} from "lucide-react";
import { useAccount } from "./AccountProvider";
import { Skeleton, timeAgo } from "./ui";

const NAV = [
  { href: "/account", label: "Overview", icon: LayoutDashboard },
  { href: "/account/ship", label: "New shipment", icon: PackagePlus },
  { href: "/account/shipments", label: "Shipments", icon: Package },
  { href: "/account/documents", label: "Documents", icon: FileText },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

function NotificationBell() {
  const router = useRouter();
  const { notifications, unread, markRead, markAllRead } = useAccount();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-line bg-white text-ink-soft transition-colors hover:text-ink"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-orange-ink px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_rgba(25,35,58,.18)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-semibold text-brand hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-ink-mute">You&rsquo;re all caught up.</li>
            )}
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    markRead(n.id);
                    setOpen(false);
                    if (n.link) router.push(n.link);
                  }}
                  className={`flex w-full gap-3 border-b border-line/70 px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-ocean ${n.readAt ? "" : "bg-brand-tint/40"}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-brand"}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{n.title}</span>
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
  );
}

function Toast() {
  const router = useRouter();
  const { toast, dismissToast, markRead } = useAccount();
  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-20 z-[60] flex md:right-6 md:top-24 w-[min(92vw,380px)] animate-[lc-pop_.35s_ease-out] gap-3 rounded-2xl border border-line bg-white p-4 shadow-[0_24px_60px_rgba(25,35,58,.22)]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-tint text-brand">
        <Bell size={18} />
      </span>
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={() => {
          markRead(toast.id);
          dismissToast();
          if (toast.link) router.push(toast.link);
        }}
      >
        <span className="block text-sm font-semibold text-ink">{toast.title}</span>
        {toast.body && <span className="mt-0.5 line-clamp-2 block text-xs text-ink-soft">{toast.body}</span>}
      </button>
      <button type="button" onClick={dismissToast} aria-label="Dismiss" className="self-start text-ink-mute hover:text-ink">
        <X size={16} />
      </button>
    </div>
  );
}

export default function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, signOut, live } = useAccount();

  /* Whole path segments only: /account/ship must not light up on /account/shipments. */
  const active = (href: string) =>
    href === "/account" ? pathname === "/account" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-svh bg-ocean pb-20 pt-24 md:pt-28">
      {/* minmax(0,1fr) on mobile too: an implicit column would grow to the tab
          strip's full width and widen the page instead of letting it scroll. */}
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-6 px-4 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
        {/* Sidebar (desktop) / tab strip (mobile) */}
        <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <div className="hidden rounded-2xl border border-line bg-white p-4 lg:block">
            {loading || !user ? (
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-deep text-sm font-bold text-white">
                  {initials(user.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                  <p className="notranslate truncate text-xs text-ink-mute">{user.email}</p>
                </div>
              </div>
            )}
            <nav className="mt-4 space-y-0.5 border-t border-line pt-3" aria-label="Account">
              {NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={active(href) ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active(href) ? "bg-brand-tint text-brand-deep" : "text-ink-soft hover:bg-ocean hover:text-ink"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              ))}
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-ocean hover:text-ink"
              >
                <LogOut size={18} />
                Sign out
              </button>
            </nav>
          </div>

          <nav
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden"
            aria-label="Account"
          >
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href) ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium ${
                  active(href) ? "border-brand-deep bg-brand-deep text-white" : "border-line bg-white text-ink-soft"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <div className="mb-6 flex items-center justify-end gap-3">
            <span className="mr-auto flex items-center gap-2 text-xs text-ink-mute" title={live ? "Live updates on" : "Reconnecting…"}>
              <span className={`h-2 w-2 rounded-full ${live ? "bg-emerald-500" : "bg-amber-400"}`} />
              {live ? "Live updates on" : "Connecting…"}
            </span>
            <NotificationBell />
            <button
              type="button"
              onClick={signOut}
              className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-white text-ink-soft hover:text-ink lg:hidden"
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
          {children}
        </div>
      </div>
      <Toast />
    </div>
  );
}
