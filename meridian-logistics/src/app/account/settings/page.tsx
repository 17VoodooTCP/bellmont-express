"use client";

import { useState } from "react";
import { Check, CircleCheck, Eye, EyeOff, LoaderCircle, Lock, LogOut, User } from "lucide-react";
import { useAccount } from "@/components/account/AccountProvider";
import {
  Card,
  PageHeader,
  Skeleton,
  fmtDate,
  inputCls,
  labelCls,
  primaryBtn,
  secondaryBtn,
} from "@/components/account/ui";
import { changePassword, updateProfile, type Account } from "@/lib/accountApi";

const RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "A letter", test: (p: string) => /[A-Za-z]/.test(p) },
  { label: "A number", test: (p: string) => /\d/.test(p) },
];

function Notice({ kind, children }: { kind: "ok" | "error"; children: React.ReactNode }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
        kind === "ok" ? "border border-emerald-200 bg-emerald-50 text-emerald-900" : "border border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {kind === "ok" && <CircleCheck size={16} />}
      {children}
    </p>
  );
}

/* Starts from the loaded profile, so no effect is needed to copy it into the
   form. After a save the saved values are what the fields already hold. */
function ProfileSection({ user, onSaved }: { user: Account; onSaved: (u: Account) => void }) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [company, setCompany] = useState(user.company ?? "");
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const dirty = name.trim() !== user.name || phone.trim() !== (user.phone ?? "") || company.trim() !== (user.company ?? "");

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setProfileMsg(null);
    try {
      onSaved(await updateProfile({ name: name.trim(), phone: phone.trim(), company: company.trim() }));
      setProfileMsg({ kind: "ok", text: "Profile saved." });
    } catch (err) {
      setProfileMsg({ kind: "error", text: err instanceof Error ? err.message : "Could not save." });
    } finally {
      setSaving(false);
    }
  };

  return (
      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-tint text-brand">
            <User size={19} />
          </span>
          <div>
            <p className="font-semibold text-ink">Profile</p>
            <p className="text-xs text-ink-mute">Shown on your bookings and used if our team needs to reach you.</p>
          </div>
        </div>
        <form onSubmit={saveProfile} className="mt-6 space-y-4">
          <div>
            <label htmlFor="s-name" className={labelCls}>Full name</label>
            <input id="s-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" className={inputCls} />
          </div>
          <div>
            <label htmlFor="s-email" className={labelCls}>Email address</label>
            <input id="s-email" value={user.email} disabled className={`${inputCls} notranslate cursor-not-allowed bg-ocean text-ink-mute`} />
            <p className="mt-1.5 text-xs text-ink-mute">To change your sign-in email, contact support.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="s-phone" className={labelCls}>Phone</label>
              <input id="s-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} autoComplete="tel" className={inputCls} />
            </div>
            <div>
              <label htmlFor="s-company" className={labelCls}>Company</label>
              <input id="s-company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} autoComplete="organization" className={inputCls} />
            </div>
          </div>
          {profileMsg && <Notice kind={profileMsg.kind}>{profileMsg.text}</Notice>}
          <button type="submit" disabled={!dirty || saving} className={primaryBtn}>
            {saving && <LoaderCircle size={16} className="animate-spin" />} Save profile
          </button>
        </form>
      </Card>
  );
}

export default function SettingsPage() {
  const { user, setUser, signOut } = useAccount();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [show, setShow] = useState(false);
  const [changing, setChanging] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const rules = RULES.map((r) => ({ ...r, ok: r.test(next) }));

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (!rules.every((r) => r.ok)) {
      setPwMsg({ kind: "error", text: "Your new password must meet all three rules." });
      return;
    }
    setChanging(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setPwMsg({ kind: "ok", text: "Password changed. Use your new password next time you sign in." });
    } catch (err) {
      setPwMsg({ kind: "error", text: err instanceof Error ? err.message : "Could not change password." });
    } finally {
      setChanging(false);
    }
  };

  if (!user) return <Skeleton className="h-96" />;

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Settings" title="Account settings" />

      <ProfileSection user={user} onSaved={setUser} />

      <Card className="mt-6 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-tint text-brand">
            <Lock size={19} />
          </span>
          <div>
            <p className="font-semibold text-ink">Password</p>
            <p className="text-xs text-ink-mute">Choose something long that you don&rsquo;t use anywhere else.</p>
          </div>
        </div>
        <form onSubmit={savePassword} className="mt-6 space-y-4">
          <div>
            <label htmlFor="s-current" className={labelCls}>Current password</label>
            <input id="s-current" type={show ? "text" : "password"} value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" className={inputCls} />
          </div>
          <div>
            <label htmlFor="s-next" className={labelCls}>New password</label>
            <div className="relative">
              <input id="s-next" type={show ? "text" : "password"} value={next} onChange={(e) => setNext(e.target.value)} required autoComplete="new-password" className={`${inputCls} pr-12`} />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide passwords" : "Show passwords"}
                className="absolute right-1.5 top-1/2 mt-[3px] grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-ink-mute hover:text-ink"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5" aria-live="polite">
              {rules.map((r) => (
                <li key={r.label} className={`flex items-center gap-1.5 text-xs ${r.ok ? "text-emerald-700" : "text-ink-mute"}`}>
                  <span className={`grid h-4 w-4 place-items-center rounded-full ${r.ok ? "bg-emerald-600 text-white" : "border border-line"}`}>
                    {r.ok && <Check size={11} strokeWidth={3} />}
                  </span>
                  {r.label}
                </li>
              ))}
            </ul>
          </div>
          {pwMsg && <Notice kind={pwMsg.kind}>{pwMsg.text}</Notice>}
          <button type="submit" disabled={changing || !current || !next} className={primaryBtn}>
            {changing && <LoaderCircle size={16} className="animate-spin" />} Change password
          </button>
        </form>
      </Card>

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
        <div>
          <p className="font-semibold text-ink">Account</p>
          <p className="mt-0.5 text-sm text-ink-soft">Member since {fmtDate(user.createdAt)}</p>
        </div>
        <button type="button" onClick={signOut} className={secondaryBtn}>
          <LogOut size={16} /> Sign out
        </button>
      </Card>
    </div>
  );
}
