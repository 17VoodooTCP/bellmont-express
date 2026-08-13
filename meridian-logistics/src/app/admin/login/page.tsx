"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/adminApi";
import { LogoMark } from "@/components/Logo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email.trim(), password);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-ocean px-5 pt-16">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl border border-line bg-white p-8 shadow-sm"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <LogoMark size={44} />
          <h1 className="text-xl font-bold">Bellmont Express Admin</h1>
          <p className="text-xs text-ink-mute">Operations console sign-in</p>
        </div>
        {error && (
          <p role="alert" className="mt-5 rounded-xl bg-sage-tint px-4 py-3 text-xs text-sage-deep">
            {error}
          </p>
        )}
        <label className="mt-6 block text-xs font-semibold uppercase tracking-widest text-ink-mute">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            className="notranslate mt-1.5 w-full rounded-xl border border-line px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-ink"
          />
        </label>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-widest text-ink-mute">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="mt-1.5 w-full rounded-xl border border-line px-4 py-3 text-sm font-normal outline-none focus:border-ink"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-full bg-ink py-3.5 text-sm font-semibold text-white transition-colors hover:bg-sage disabled:opacity-50"
        >
          {busy ? "Signing in… (service may take a minute to wake)" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
