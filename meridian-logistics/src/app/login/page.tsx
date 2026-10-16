import type { Metadata } from "next";
import { Suspense } from "react";
import { Bell, FileText, PackagePlus, ShieldCheck } from "lucide-react";
import AuthForm from "@/components/account/AuthForm";

export const metadata: Metadata = {
  title: "Sign in | Bellmont Express",
  description: "Sign in or create a Bellmont Express account to book shipments, follow them live and receive your documents.",
  alternates: { canonical: "/login" },
  robots: { index: false },
};

const POINTS = [
  {
    icon: PackagePlus,
    title: "Book in minutes",
    body: "Tell us what is moving and where. Our team confirms it and issues your tracking number.",
  },
  {
    icon: Bell,
    title: "Hear about every handoff",
    body: "Approvals, pickups, holds and deliveries reach your dashboard the moment they happen.",
  },
  {
    icon: FileText,
    title: "Documents in one inbox",
    body: "Receipts arrive in your account, ready to view, print or save as PDF.",
  },
];

export default function LoginPage() {
  return (
    <div className="grid min-h-svh bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-brand-deep px-12 pb-12 pt-32 text-white lg:flex lg:flex-col xl:px-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[.07]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #49629d 0%, transparent 70%)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-48 -left-24 h-[460px] w-[460px] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #ff5a1f 0%, transparent 70%)" }}
        />

        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">Customer portal</p>
          <h2 className="mt-5 text-[40px] font-bold leading-[1.08] xl:text-[46px]">
            Every shipment,
            <br />
            every handoff,
            <br />
            <span className="text-[#ffb08a]">one record.</span>
          </h2>
          <ul className="mt-12 space-y-7">
            {POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon size={20} />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-auto flex items-center gap-2 pt-12 text-xs text-white/60">
          <ShieldCheck size={15} />
          Passwords are hashed and never stored in readable form. Sign-in attempts are rate-limited.
        </p>
      </aside>

      {/* Form */}
      <section className="flex items-center justify-center px-5 pb-16 pt-28 sm:px-10 lg:pt-24">
        {/* useSearchParams lives in AuthForm, so it must sit inside Suspense
            for the page to prerender. */}
        <Suspense fallback={<div className="h-[520px] w-full max-w-[440px] animate-pulse rounded-3xl bg-ocean" />}>
          <AuthForm />
        </Suspense>
      </section>
    </div>
  );
}
