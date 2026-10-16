"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { getUserToken, register, signIn } from "@/lib/accountApi";
import { warmApi } from "@/lib/wake";

type Mode = "signin" | "register";

/** Only same-site paths may be returned to — `//evil.com` and absolute URLs
 *  would turn the sign-in page into an open redirect. */
function safeNext(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/account";
  return raw;
}

const RULES = [
  { id: "len", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "letter", label: "A letter", test: (p: string) => /[A-Za-z]/.test(p) },
  { id: "number", label: "A number", test: (p: string) => /\d/.test(p) },
];

const field =
  "mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-brand focus:ring-4 focus:ring-brand/10 sm:text-sm";
const label = "block text-[13px] font-semibold text-ink";

export default function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [mode, setMode] = useState<Mode>(params.get("mode") === "register" ? "register" : "signin");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");

  /* Already signed in: go straight on. Also starts waking the free-tier API
     while the visitor types, so the submit does not pay the boot time. */
  useEffect(() => {
    if (getUserToken()) router.replace(next);
    void warmApi();
  }, [router, next]);

  const rules = useMemo(() => RULES.map((r) => ({ ...r, ok: r.test(password) })), [password]);
  const passwordOk = rules.every((r) => r.ok);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    const url = new URL(window.location.href);
    if (m === "register") url.searchParams.set("mode", "register");
    else url.searchParams.delete("mode");
    window.history.replaceState(null, "", url);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "register" && !passwordOk) {
      setError("Choose a password that meets all three rules below.");
      return;
    }
    setBusy(true);
    const slowTimer = setTimeout(() => setSlow(true), 4000);
    try {
      if (mode === "signin") {
        const r = await signIn(email.trim(), password);
        router.replace(r.admin ? "/admin" : next);
      } else {
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          company: company.trim() || undefined,
          phone: phone.trim() || undefined,
        });
        router.replace(next === "/account" ? "/account?welcome=1" : next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      clearTimeout(slowTimer);
      setBusy(false);
      setSlow(false);
    }
  };

  return (
    <div className="w-full max-w-[440px]">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold leading-tight text-ink sm:text-[32px]">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {mode === "signin"
            ? "Sign in to book shipments, follow every milestone and collect your documents."
            : "Book shipments, follow them live and keep every receipt in one place. It takes a minute."}
        </p>
      </div>

      {/* Segmented switch */}
      <div role="tablist" aria-label="Account" className="mb-7 grid grid-cols-2 rounded-2xl bg-ocean p-1.5">
        {(["signin", "register"] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`rounded-xl py-2.5 text-sm font-semibold transition-all ${
              mode === m ? "bg-white text-ink shadow-[0_2px_10px_rgba(25,35,58,.08)]" : "text-ink-mute hover:text-ink"
            }`}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} noValidate={false} className="space-y-4">
        {mode === "register" && (
          <div>
            <label className={label} htmlFor="name">Full name</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              placeholder="Amara Osei"
              className={field}
            />
          </div>
        )}

        <div>
          <label className={label} htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete={mode === "signin" ? "username" : "email"}
            inputMode="email"
            placeholder="you@company.com"
            className={`${field} notranslate`}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label className={label} htmlFor="password">Password</label>
            {mode === "signin" && (
              <Link href="/support?topic=account" className="text-xs font-semibold text-brand hover:underline">
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              aria-describedby={mode === "register" ? "pw-rules" : undefined}
              className={`${field} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute right-1.5 top-1/2 mt-[3px] grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-ink-mute hover:text-ink"
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {mode === "register" && (
            <ul id="pw-rules" className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5" aria-live="polite">
              {rules.map((r) => (
                <li
                  key={r.id}
                  className={`flex items-center gap-1.5 text-xs transition-colors ${r.ok ? "text-emerald-700" : "text-ink-mute"}`}
                >
                  <span
                    className={`grid h-4 w-4 place-items-center rounded-full ${r.ok ? "bg-emerald-600 text-white" : "border border-line"}`}
                  >
                    {r.ok && <Check size={11} strokeWidth={3} />}
                  </span>
                  {r.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        {mode === "register" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="company">
                Company <span className="font-normal text-ink-mute">(optional)</span>
              </label>
              <input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                maxLength={120}
                autoComplete="organization"
                className={field}
              />
            </div>
            <div>
              <label className={label} htmlFor="phone">
                Phone <span className="font-normal text-ink-mute">(optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={40}
                autoComplete="tel"
                className={field}
              />
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-deep py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(30,41,80,.22)] transition-all hover:bg-brand disabled:cursor-wait disabled:opacity-70"
        >
          {busy && <LoaderCircle size={17} className="animate-spin" />}
          {busy
            ? mode === "signin"
              ? "Signing in…"
              : "Creating your account…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
        {slow && (
          <p className="text-center text-xs text-ink-mute" role="status">
            Still working — our service sleeps when idle and can take up to a minute to wake.
          </p>
        )}
      </form>

      <p className="mt-8 text-center text-sm text-ink-soft">
        {mode === "signin" ? "New to Bellmont Express? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => switchMode(mode === "signin" ? "register" : "signin")}
          className="font-semibold text-brand hover:underline"
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
      <p className="mt-3 text-center text-xs text-ink-mute">
        Just tracking a parcel?{" "}
        <Link href="/tracking" className="font-semibold text-ink-soft hover:text-ink hover:underline">
          Track without an account
        </Link>
      </p>
    </div>
  );
}
