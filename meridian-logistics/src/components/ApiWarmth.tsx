"use client";

/* Wires the cold-start warmer into the app, and exposes the status to any UI
   that wants to be honest about a slow first request.

   `<WarmOnLoad />` sits in the shell and pings once per visit.
   `useApiWarmth()` lets a page show "waking the service" instead of a spinner
   that looks broken.
   `warmOnIntent` arms the API the moment someone looks like they are heading
   for data — hovering or focusing a Track link — which usually buys the full
   boot time before they click. */

import { useEffect, useState } from "react";
import { getApiState, subscribeApi, warmApi, type ApiStatus } from "@/lib/wake";

export function WarmOnLoad() {
  useEffect(() => {
    /* Idle callback keeps the ping behind first paint, so warming never
       competes with rendering the page the visitor actually came for. */
    const w = window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(() => void warmApi(), { timeout: 1500 });
      return;
    }
    const t = setTimeout(() => void warmApi(), 400);
    return () => clearTimeout(t);
  }, []);

  return null;
}

export function useApiWarmth() {
  const [state, setState] = useState(getApiState);
  useEffect(() => subscribeApi(setState), []);

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (state.status !== "waking") {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed(Math.round((Date.now() - state.since) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.status, state.since]);

  return { status: state.status as ApiStatus, elapsed };
}

/** Attach to anything that leads to data: `{...warmOnIntent}` */
export const warmOnIntent = {
  onPointerEnter: () => void warmApi(),
  onFocus: () => void warmApi(),
} as const;
