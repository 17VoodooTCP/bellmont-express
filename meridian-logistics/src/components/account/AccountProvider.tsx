"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Socket } from "socket.io-client";
import {
  ApiError,
  connectNotifications,
  getMe,
  getUserToken,
  myNotifications,
  readAllNotifications,
  readNotification,
  SESSION_EVENT,
  signOut as clearSession,
  type Account,
  type AppNotification,
} from "@/lib/accountApi";

/**
 * The signed-in customer, their notifications, and the live channel.
 *
 * One provider per account area: it loads the profile, keeps a single
 * authenticated socket open, and lets any page subscribe to live events
 * (a shipment approved, a document arriving) without each page opening its
 * own connection.
 */

type Listener = (payload: unknown) => void;

type AccountState = {
  user: Account | null;
  loading: boolean;
  setUser: (u: Account) => void;
  signOut: () => void;
  notifications: AppNotification[];
  unread: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  /** Most recent live notification, for the toast. Cleared by dismissToast. */
  toast: AppNotification | null;
  dismissToast: () => void;
  /** Subscribe to a live event; returns the unsubscribe function. */
  on: (event: string, fn: Listener) => () => void;
  live: boolean;
};

const Ctx = createContext<AccountState | null>(null);

export function useAccount() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAccount must be used inside <AccountProvider>");
  return v;
}

export default function AccountProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState<AppNotification | null>(null);
  const [live, setLive] = useState(false);
  const listeners = useRef(new Map<string, Set<Listener>>());

  const signOut = useCallback(() => {
    clearSession();
    router.replace("/login");
  }, [router]);

  /* Load the session; send anyone without one to sign in, remembering where
     they were going. */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!getUserToken()) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        router.replace(`/login?next=${next}`);
        return;
      }
      try {
        const me = await getMe();
        if (cancelled) return;
        setUser(me);
        const feed = await myNotifications();
        if (cancelled) return;
        setNotifications(feed.notifications);
        setUnread(feed.unread);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const onSession = () => {
      if (!getUserToken()) router.replace("/login");
    };
    window.addEventListener(SESSION_EVENT, onSession);
    return () => {
      cancelled = true;
      window.removeEventListener(SESSION_EVENT, onSession);
    };
  }, [router]);

  /* One live connection for the whole account area. */
  useEffect(() => {
    if (!user) return;
    const token = getUserToken();
    if (!token) return;
    const socket: Socket = connectNotifications(token);
    socket.on("connect", () => setLive(true));
    socket.on("disconnect", () => setLive(false));
    socket.on("unauthorized", () => signOut());
    socket.on("notification", (n: AppNotification) => {
      setNotifications((list) => [n, ...list].slice(0, 50));
      setUnread((u) => u + 1);
      setToast(n);
    });
    socket.onAny((event: string, payload: unknown) => {
      listeners.current.get(event)?.forEach((fn) => fn(payload));
    });
    return () => {
      socket.close();
    };
  }, [user, signOut]);

  /* Toasts dismiss themselves. */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  const on = useCallback((event: string, fn: Listener) => {
    const set = listeners.current.get(event) ?? new Set<Listener>();
    set.add(fn);
    listeners.current.set(event, set);
    return () => {
      set.delete(fn);
    };
  }, []);

  const markRead = useCallback(
    (id: string) => {
      const target = notifications.find((n) => n.id === id);
      if (!target || target.readAt) return;
      const now = new Date().toISOString();
      setNotifications((list) => list.map((n) => (n.id === id ? { ...n, readAt: now } : n)));
      setUnread((u) => Math.max(0, u - 1));
      void readNotification(id).catch(() => {});
    },
    [notifications],
  );

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    setNotifications((list) => list.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    setUnread(0);
    void readAllNotifications().catch(() => {});
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        setUser,
        signOut,
        notifications,
        unread,
        markRead,
        markAllRead,
        toast,
        dismissToast: () => setToast(null),
        on,
        live,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
