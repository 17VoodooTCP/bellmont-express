"use client";

/* A city input that checks the name as the admin types (after a pause) and
   says what it found, so a typo like "Stanfford, Taxes" is caught at entry
   instead of by a customer looking at a broken tracking map. A match fills
   in the coordinates; no match leaves 0,0 and the form warns before save. */

import { useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { lookupPlace } from "@/lib/geo";

export type CityValue = { city: string; lat: number; lng: number };
export type CityCheck = "idle" | "checking" | "found" | "missing" | "offline";

const located = (v?: CityValue) => !!v && (Math.abs(v.lat) > 0.01 || Math.abs(v.lng) > 0.01);

export default function CityField({
  label,
  value,
  onChange,
  onCheck,
}: {
  label: string;
  value?: CityValue;
  onChange: (v: CityValue) => void;
  /** Reports the check result so the form can warn before saving. */
  onCheck?: (state: CityCheck) => void;
}) {
  const city = value?.city ?? "";
  /* A saved shipment already has coordinates: treat it as found. */
  const [state, setState] = useState<CityCheck>(located(value) ? "found" : "idle");
  const [match, setMatch] = useState("");
  const reportRef = useRef(onCheck);
  useEffect(() => {
    reportRef.current = onCheck;
  });
  const report = (s: CityCheck) => {
    setState(s);
    reportRef.current?.(s);
  };

  /* Look the name up a moment after typing stops. */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const check = (name: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (!name.trim()) {
      setMatch("");
      report("idle");
      return;
    }
    report("checking");
    timer.current = setTimeout(() => {
      lookupPlace(name)
        .then((p) => {
          if (p) {
            setMatch(p.label);
            onChange({ city: name, lat: p.lat, lng: p.lng });
            report("found");
          } else {
            setMatch("");
            report("missing");
          }
        })
        .catch(() => report("offline"));
    }, 700);
  };
  /* Opening an existing shipment whose city never resolved (stored at 0,0)
     flags it straight away, so old typos surface too. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starts a lookup against an external service for the value the form opened with
    if (city.trim() && !located(value)) check(city);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, for the value the form opened with
  }, []);

  const border =
    state === "missing" ? "border-red-400 focus:border-red-500" : state === "found" ? "border-emerald-300 focus:border-ink" : "border-line focus:border-ink";

  return (
    <label className="block text-[11px] font-semibold uppercase tracking-widest text-ink-mute">
      {label}
      <input
        value={city}
        onChange={(e) => {
          onChange({ city: e.target.value, lat: 0, lng: 0 });
          check(e.target.value);
        }}
        placeholder="e.g. Stafford, Texas"
        aria-invalid={state === "missing"}
        className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm font-normal normal-case tracking-normal outline-none ${border}`}
      />
      <span className="mt-1 block min-h-[1rem] text-[11px] font-normal normal-case tracking-normal" aria-live="polite">
        {state === "checking" && (
          <span className="inline-flex items-center gap-1 text-ink-mute">
            <LoaderCircle size={12} className="animate-spin" /> Checking…
          </span>
        )}
        {state === "found" && (
          <span className="inline-flex items-start gap-1 text-emerald-700">
            <CircleCheck size={12} className="mt-px shrink-0" />
            <span className="line-clamp-1">{match || "On the map"}</span>
          </span>
        )}
        {state === "missing" && (
          <span className="inline-flex items-start gap-1 text-red-700">
            <CircleAlert size={12} className="mt-px shrink-0" />
            Can&rsquo;t find this place. Check the spelling (e.g. &ldquo;City, State&rdquo;).
          </span>
        )}
        {state === "offline" && (
          <span className="inline-flex items-start gap-1 text-amber-700">
            <CircleAlert size={12} className="mt-px shrink-0" />
            Couldn&rsquo;t check right now; it will be checked again on save.
          </span>
        )}
      </span>
    </label>
  );
}
