"use client";

/* Cloudflare Turnstile — the captcha on the sign-in and sign-up forms.

   Rendered "interaction-only": for most visitors it runs invisibly and
   hands back a token in a second or so; it only shows a checkbox when
   Cloudflare wants a click. Tokens are single-use and last five minutes, so
   forms call reset() after every attempt.

   Without NEXT_PUBLIC_TURNSTILE_SITE_KEY nothing renders and forms submit
   as before — the server only enforces the check once its secret is set. */

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
export const turnstileEnabled = Boolean(TURNSTILE_SITE_KEY);

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loader: Promise<TurnstileApi> | null = null;

/** Loads Cloudflare's script once per page, however many widgets mount. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loader ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile missing")));
    script.onerror = () => {
      loader = null; // let a later mount try again
      script.remove();
      reject(new Error("Turnstile script blocked"));
    };
    document.head.appendChild(script);
  });
  return loader;
}

export type TurnstileHandle = {
  /** Get a fresh token: call after every submit, successful or not. */
  reset: () => void;
};

export default function Turnstile({
  action,
  onToken,
  onError,
  ref,
}: {
  /** Must match the action the server expects (login / register). */
  action: string;
  /** Called with a token when ready, and with "" when it expires or resets. */
  onToken: (token: string) => void;
  onError?: (message: string) => void;
  ref?: Ref<TurnstileHandle>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  /* Callbacks through refs, so a parent re-render doesn't re-create the widget. */
  const tokenCb = useRef(onToken);
  const errorCb = useRef(onError);
  useEffect(() => {
    tokenCb.current = onToken;
    errorCb.current = onError;
  });

  useImperativeHandle(ref, () => ({
    reset: () => {
      tokenCb.current("");
      if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
    },
  }));

  useEffect(() => {
    if (!turnstileEnabled || !box.current) return;
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !box.current) return;
        widget.current = api.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          theme: "light",
          size: "flexible",
          appearance: "interaction-only",
          callback: (token: string) => tokenCb.current(token),
          "expired-callback": () => tokenCb.current(""),
          "error-callback": () => {
            tokenCb.current("");
            errorCb.current?.("The security check hit a problem. Refresh the page and try again.");
            return true; // handled here; don't throw in the console
          },
        });
      })
      .catch(() => {
        errorCb.current?.(
          "The security check couldn't load. If you use an ad or content blocker, allow this site and refresh.",
        );
      });
    return () => {
      cancelled = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [action]);

  if (!turnstileEnabled) return null;
  /* Empty while invisible; the checkbox appears here only if one is needed. */
  return <div ref={box} />;
}
