"use client";

/* Cold-start warming for the free-tier API.
 *
 * Render's free instances sleep after ~15 minutes idle and take 30-60s to boot
 * on the next request. If the first request we ever make is the visitor
 * pressing "Track", they sit watching a spinner for most of a minute.
 *
 * So we move that wait somewhere it costs nothing: the moment anyone lands on
 * any page, we quietly ping /api/health. The instance boots while they read the
 * hero, and by the time they reach tracking it is already up.
 *
 * Deliberately NOT a keep-alive timer. Render bills free web services by
 * instance-hours (750/month); pinging on a schedule would burn the monthly
 * budget keeping the box awake for nobody. This only ever fires on a real
 * visit, so it adds no idle cost.
 */

export type ApiStatus = "unknown" | "waking" | "warm" | "unreachable";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/* Once warm, assume it stays warm for a little under Render's idle window, so
   a visitor moving between pages does not re-ping on every navigation. */
const WARM_TTL_MS = 10 * 60 * 1000;

/* A sleeping instance holds the connection open while it boots, so the budget
   has to cover a full cold start rather than a normal request. */
const ATTEMPT_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 3;

type State = { status: ApiStatus; since: number; warmAt: number };

const state: State = { status: "unknown", since: 0, warmAt: 0 };
const listeners = new Set<(s: State) => void>();
let inFlight: Promise<boolean> | null = null;

function publish(next: Partial<State>) {
  Object.assign(state, next);
  listeners.forEach((fn) => fn({ ...state }));
}

export function getApiState(): State {
  return { ...state };
}

export function subscribeApi(fn: (s: State) => void): () => void {
  listeners.add(fn);
  fn({ ...state });
  /* Braces matter: Set.delete returns a boolean, which is not a valid
     useEffect cleanup return. */
  return () => {
    listeners.delete(fn);
  };
}

async function ping(signal: AbortSignal) {
  const res = await fetch(`${API}/api/health`, {
    signal,
    cache: "no-store",
    /* A plain GET keeps this a CORS-simple request: no preflight, so a
       sleeping instance does not have to answer OPTIONS before it can boot. */
    method: "GET",
  });
  return res.ok;
}

/**
 * Wake the API if it might be asleep. Safe to call as often as you like:
 * concurrent calls share one request, and a recently warm API is a no-op.
 */
export function warmApi(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  if (state.status === "warm" && Date.now() - state.warmAt < WARM_TTL_MS) {
    return Promise.resolve(true);
  }
  if (inFlight) return inFlight;

  publish({ status: "waking", since: Date.now() });

  inFlight = (async () => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
      try {
        const ok = await ping(controller.signal);
        clearTimeout(timer);
        if (ok) {
          publish({ status: "warm", warmAt: Date.now() });
          return true;
        }
      } catch {
        clearTimeout(timer);
        /* A boot can drop the first connection outright; that is expected. */
      }
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
      }
    }
    publish({ status: "unreachable" });
    return false;
  })();

  /* Release the slot once settled so a later visit can retry. */
  void inFlight.finally(() => {
    inFlight = null;
  });

  return inFlight;
}

/** How long the current wake attempt has been running, in seconds. */
export function wakingFor(): number {
  if (state.status !== "waking" || !state.since) return 0;
  return Math.round((Date.now() - state.since) / 1000);
}
