"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Check,
  CircleCheck,
  LoaderCircle,
  MapPin,
  Rocket,
  Send,
  Timer,
  Zap,
} from "lucide-react";
import { useAccount } from "@/components/account/AccountProvider";
import {
  Card,
  PageHeader,
  SERVICE_LABEL,
  inputCls,
  labelCls,
  primaryBtn,
  secondaryBtn,
} from "@/components/account/ui";
import {
  PACKAGE_TYPES,
  createRequest,
  type NewRequest,
  type ServiceLevel,
  type ShipmentRequest,
} from "@/lib/accountApi";

type Form = {
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  originCity: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  destinationCity: string;
  packageType: string;
  weight: string;
  dimensions: string;
  declaredValue: string;
  contents: string;
  serviceLevel: ServiceLevel;
  pickupDate: string;
  notes: string;
};

const EMPTY: Form = {
  senderName: "",
  senderPhone: "",
  senderAddress: "",
  originCity: "",
  receiverName: "",
  receiverPhone: "",
  receiverAddress: "",
  destinationCity: "",
  packageType: "Parcel",
  weight: "",
  dimensions: "",
  declaredValue: "",
  contents: "",
  serviceLevel: "standard",
  pickupDate: "",
  notes: "",
};

const STEPS = ["Route", "Package", "Service", "Review"] as const;

const SERVICES: { id: ServiceLevel; icon: typeof Timer; title: string; body: string }[] = [
  { id: "standard", icon: Timer, title: "Standard", body: "Our regular schedule. The best value for most shipments." },
  { id: "express", icon: Zap, title: "Express", body: "Faster handling at every stage of the journey." },
  { id: "priority", icon: Rocket, title: "Priority", body: "Moves first, with the shortest transit we can offer." },
];

/* The customer's own calendar date. toISOString() would give the UTC date,
   which is already tomorrow on a US evening and would hide today. */
const today = () => {
  const d = new Date();
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, "0")).join("-");
};

/* An unfinished booking survives leaving the page, for this tab only
   (sessionStorage), and is keyed to the account so it never shows to
   someone else signing in on the same browser. */
type Draft = { form: Partial<Form>; step: number };
const draftKey = (userId: string) => `bellmont_ship_draft:${userId}`;

function readDraft(userId: string): Draft | null {
  try {
    const raw = sessionStorage.getItem(draftKey(userId));
    const d = raw ? (JSON.parse(raw) as Draft) : null;
    if (!d || typeof d.step !== "number" || !d.form || typeof d.form !== "object") return null;
    /* Only the prefilled sender details is not worth restoring. */
    const f = d.form;
    const started = d.step > 0 || [f.senderAddress, f.originCity, f.receiverName, f.receiverAddress, f.destinationCity].some((v) => typeof v === "string" && v.trim());
    return started ? d : null;
  } catch {
    return null;
  }
}

function writeDraft(userId: string, d: Draft) {
  try {
    sessionStorage.setItem(draftKey(userId), JSON.stringify(d));
  } catch {
    /* storage full or blocked: the draft is a convenience */
  }
}

function clearDraft(userId: string) {
  try {
    sessionStorage.removeItem(draftKey(userId));
  } catch {
    /* nothing to clear */
  }
}

/** Per-step checks, mirroring the server's limits so problems show early. */
function validate(step: number, f: Form): Record<string, string> {
  const e: Record<string, string> = {};
  const need = (k: keyof Form, label: string) => {
    if (!f[k].trim()) e[k] = `${label} is required.`;
  };
  if (step === 0) {
    need("senderName", "Sender name");
    need("senderAddress", "Pickup address");
    need("originCity", "Origin city");
    need("receiverName", "Receiver name");
    need("receiverAddress", "Delivery address");
    need("destinationCity", "Destination city");
  }
  if (step === 1) {
    if (f.weight && !(Number(f.weight) > 0)) e.weight = "Enter a weight above zero.";
    if (f.declaredValue && !(Number(f.declaredValue) >= 0)) e.declaredValue = "Enter a valid amount.";
  }
  if (step === 2) {
    if (f.pickupDate && f.pickupDate < today()) e.pickupDate = "Pickup can't be in the past.";
  }
  return e;
}

function Field({
  id,
  label,
  error,
  optional,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label} {optional && <span className="font-normal text-ink-mute">(optional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export default function ShipPage() {
  const { user } = useAccount();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState<ShipmentRequest | null>(null);
  const [restored, setRestored] = useState(false);
  const [ready, setReady] = useState(false);

  /* Pick up an unfinished booking from earlier in this tab; otherwise start
     with the account holder's details, since most bookings are theirs. */
  useEffect(() => {
    if (!user) return;
    const draft = readDraft(user.id);
    if (draft) {
      setForm({ ...EMPTY, ...draft.form });
      setStep(Math.min(Math.max(draft.step, 0), STEPS.length - 1));
      setRestored(true);
    } else {
      setForm((f) => ({
        ...f,
        senderName: f.senderName || user.name,
        senderPhone: f.senderPhone || user.phone || "",
      }));
    }
    setReady(true);
  }, [user]);

  useEffect(() => {
    if (!user || !ready || done) return;
    writeDraft(user.id, { form, step });
  }, [user, ready, done, form, step]);

  const startOver = () => {
    if (user) clearDraft(user.id);
    setForm({ ...EMPTY, senderName: user?.name ?? "", senderPhone: user?.phone ?? "" });
    setStep(0);
    setErrors({});
    setRestored(false);
  };

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: "" }));
  };

  const input = (k: keyof Form, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      id={k}
      value={form[k]}
      onChange={set(k)}
      aria-invalid={!!errors[k]}
      aria-describedby={errors[k] ? `${k}-error` : undefined}
      className={`${inputCls} ${errors[k] ? "border-red-400" : ""}`}
      {...props}
    />
  );

  const go = (to: number) => {
    if (to > step) {
      const e = validate(step, form);
      if (Object.values(e).some(Boolean)) {
        setErrors(e);
        return;
      }
    }
    setErrors({});
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const payload = useMemo<NewRequest>(
    () => ({
      serviceLevel: form.serviceLevel,
      senderName: form.senderName.trim(),
      senderPhone: form.senderPhone.trim() || undefined,
      senderAddress: form.senderAddress.trim(),
      originCity: form.originCity.trim(),
      receiverName: form.receiverName.trim(),
      receiverPhone: form.receiverPhone.trim() || undefined,
      receiverAddress: form.receiverAddress.trim(),
      destinationCity: form.destinationCity.trim(),
      packageType: form.packageType,
      weight: form.weight ? Number(form.weight) : null,
      dimensions: form.dimensions.trim() || undefined,
      declaredValue: form.declaredValue ? Number(form.declaredValue) : null,
      contents: form.contents.trim() || undefined,
      pickupDate: form.pickupDate || undefined,
      notes: form.notes.trim() || undefined,
    }),
    [form],
  );

  const submit = async () => {
    setBusy(true);
    setSubmitError("");
    try {
      setDone(await createRequest(payload));
      if (user) clearDraft(user.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not submit. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Card className="mx-auto max-w-2xl overflow-hidden">
        <div className="bg-brand-deep px-8 py-10 text-center text-white">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/15 ring-1 ring-white/25">
            <CircleCheck size={28} />
          </span>
          <p className="mt-5 text-2xl font-bold">Booking received</p>
          <p className="mt-2 text-sm text-white/75">Your reference is</p>
          <p className="notranslate mt-1 text-3xl font-bold tracking-[0.12em]">{done.reference}</p>
        </div>
        <div className="px-8 py-7">
          <p className="font-semibold text-ink">What happens next</p>
          <ol className="mt-4 space-y-4">
            {[
              ["Our team reviews your booking", "Usually within one business day. We may contact you if anything needs checking."],
              ["You get a tracking number", "As soon as it's approved — you'll see a notification here."],
              ["Follow it live", "Every pickup, transfer and delivery appears on your dashboard."],
            ].map(([t, b], i) => (
              <li key={t} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-tint text-xs font-bold text-brand-deep">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{t}</p>
                  <p className="text-sm text-ink-soft">{b}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/account/shipments?tab=requests" className={primaryBtn}>
              View my requests
            </Link>
            <button
              type="button"
              className={secondaryBtn}
              onClick={() => {
                setDone(null);
                startOver();
              }}
            >
              Book another
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="New booking" title="Book a shipment" />

      {restored && (
        <p className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink-soft">
          <span>We kept the booking you started. Pick up where you left off.</span>
          <button type="button" onClick={startOver} className="font-semibold text-brand hover:underline">
            Start over
          </button>
        </p>
      )}

      {/* Step indicator */}
      <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Booking steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              disabled={i > step}
              onClick={() => i < step && go(i)}
              aria-current={i === step ? "step" : undefined}
              className="w-full text-left disabled:cursor-default"
            >
              <span className={`block h-1.5 rounded-full transition-colors ${i <= step ? "bg-brand" : "bg-line"}`} />
              <span
                className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${i === step ? "text-ink" : i < step ? "text-brand" : "text-ink-mute"}`}
              >
                {i < step && <Check size={13} strokeWidth={3} />}
                <span className="hidden sm:inline">{i + 1}.</span> {s}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <Card className="p-5 sm:p-8">
        {step === 0 && (
          <div className="grid gap-8 md:grid-cols-2">
            {(
              [
                ["sender", "From", "senderName", "senderPhone", "senderAddress", "originCity", "Pickup address"],
                ["receiver", "To", "receiverName", "receiverPhone", "receiverAddress", "destinationCity", "Delivery address"],
              ] as const
            ).map(([key, heading, nameK, phoneK, addrK, cityK, addrLabel]) => (
              <fieldset key={key} className="space-y-4">
                <legend className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-brand">
                  <MapPin size={15} /> {heading}
                </legend>
                <Field id={nameK} label={key === "sender" ? "Sender name" : "Receiver name"} error={errors[nameK]}>
                  {input(nameK, { maxLength: 120, autoComplete: key === "sender" ? "name" : "off" })}
                </Field>
                <Field id={phoneK} label="Phone" optional>
                  {input(phoneK, { type: "tel", maxLength: 40 })}
                </Field>
                <Field id={addrK} label={addrLabel} error={errors[addrK]}>
                  {input(addrK, { maxLength: 300, placeholder: "Street, unit, postal code" })}
                </Field>
                <Field id={cityK} label={key === "sender" ? "Origin city" : "Destination city"} error={errors[cityK]}>
                  {input(cityK, { maxLength: 120, placeholder: key === "sender" ? "San Francisco" : "Chicago" })}
                </Field>
              </fieldset>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <p className={labelCls}>Package type</p>
              <div className="mt-2.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Package type">
                {PACKAGE_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={form.packageType === t}
                    onClick={() => setForm((f) => ({ ...f, packageType: t }))}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                      form.packageType === t ? "border-brand-deep bg-brand-deep text-white" : "border-line text-ink-soft hover:border-ink-mute"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field id="weight" label="Weight (lb)" optional error={errors.weight}>
                {input("weight", { type: "number", min: 0.01, step: "any", inputMode: "decimal" })}
              </Field>
              <Field id="dimensions" label="Dimensions" optional>
                {input("dimensions", { maxLength: 80, placeholder: "16 × 12 × 8 in" })}
              </Field>
              <Field id="declaredValue" label="Declared value (USD)" optional error={errors.declaredValue}>
                {input("declaredValue", { type: "number", min: 0, step: "any", inputMode: "decimal" })}
              </Field>
            </div>
            <Field id="contents" label="What's inside" optional>
              {input("contents", { maxLength: 300, placeholder: "e.g. Ceramic tableware, 24 pieces" })}
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <p className={labelCls}>Service level</p>
              <div className="mt-2.5 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Service level">
                {SERVICES.map(({ id, icon: Icon, title, body }) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={form.serviceLevel === id}
                    onClick={() => setForm((f) => ({ ...f, serviceLevel: id }))}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      form.serviceLevel === id
                        ? "border-brand-deep bg-brand-tint/60 ring-2 ring-brand-deep"
                        : "border-line hover:border-ink-mute"
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <Icon size={20} className="text-brand" />
                      <span
                        className={`grid h-5 w-5 place-items-center rounded-full border-2 ${form.serviceLevel === id ? "border-brand-deep bg-brand-deep text-white" : "border-line"}`}
                      >
                        {form.serviceLevel === id && <Check size={12} strokeWidth={3} />}
                      </span>
                    </span>
                    <span className="mt-3 block font-semibold text-ink">{title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-ink-soft">{body}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-[220px_minmax(0,1fr)]">
              <Field id="pickupDate" label="Preferred pickup" optional error={errors.pickupDate}>
                {input("pickupDate", { type: "date", min: today() })}
              </Field>
              <Field id="notes" label="Notes for our team" optional>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={set("notes")}
                  maxLength={1000}
                  rows={3}
                  placeholder="Access instructions, handling needs, preferred contact times…"
                  className={inputCls}
                />
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            {(
              [
                [
                  "Route",
                  0,
                  [
                    ["From", `${payload.senderName}${payload.senderPhone ? ` · ${payload.senderPhone}` : ""}`],
                    ["", `${payload.senderAddress}, ${payload.originCity}`],
                    ["To", `${payload.receiverName}${payload.receiverPhone ? ` · ${payload.receiverPhone}` : ""}`],
                    ["", `${payload.receiverAddress}, ${payload.destinationCity}`],
                  ],
                ],
                [
                  "Package",
                  1,
                  [
                    ["Type", payload.packageType],
                    ["Weight", payload.weight ? `${payload.weight} lb` : "Not specified"],
                    ["Dimensions", payload.dimensions ?? "Not specified"],
                    ["Declared value", payload.declaredValue != null ? `$${payload.declaredValue.toLocaleString()}` : "Not specified"],
                    ["Contents", payload.contents ?? "Not specified"],
                  ],
                ],
                [
                  "Service",
                  2,
                  [
                    ["Level", SERVICE_LABEL[payload.serviceLevel]],
                    ["Pickup", payload.pickupDate ? new Date(payload.pickupDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "As soon as possible"],
                    ["Notes", payload.notes ?? "None"],
                  ],
                ],
              ] as const
            ).map(([title, target, rows]) => (
              <div key={title} className="rounded-2xl border border-line">
                <div className="flex items-center justify-between border-b border-line px-5 py-3">
                  <p className="text-sm font-bold uppercase tracking-[0.12em] text-brand">{title}</p>
                  <button type="button" onClick={() => go(target)} className="text-sm font-semibold text-brand hover:underline">
                    Edit
                  </button>
                </div>
                <dl className="divide-y divide-line/70">
                  {rows.map(([k, v], i) => (
                    <div key={i} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 px-5 py-2.5 text-sm">
                      <dt className="text-ink-mute">{k}</dt>
                      <dd className="break-words text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
            <p className="flex items-start gap-2 rounded-xl bg-ocean px-4 py-3 text-xs leading-relaxed text-ink-soft">
              <Box size={15} className="mt-px shrink-0 text-brand" />
              Submitting sends this booking to our team for review. Nothing is charged now; we confirm the details and
              issue your tracking number on approval.
            </p>
            {submitError && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {submitError}
              </p>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          {step > 0 ? (
            <button type="button" onClick={() => go(step - 1)} className={secondaryBtn}>
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <span />
          )}
          {step < 3 ? (
            <button type="button" onClick={() => go(step + 1)} className={primaryBtn}>
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={() => void submit()} disabled={busy} className={primaryBtn}>
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
              {busy ? "Submitting…" : "Submit booking"}
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
