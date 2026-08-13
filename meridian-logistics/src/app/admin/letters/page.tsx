"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import LetterDocument from "@/components/LetterDocument";
import {
  addExecutive, deleteLetterDraft, digest, fingerprint, issueLetter, listExecutives,
  listLetterDrafts, newLetterReference, saveLetterDraft, today,
  type Executive, type LetterDraft, type LetterForm,
} from "@/lib/letterApi";

const BLANK: LetterForm = { recipientName: "", recipientAddress: "", subject: "", body: "", signerName: "", signerTitle: "", department: "Operations", classification: "Private & Confidential" };
const PRESETS = [
  ["general", "General correspondence", "Operations", "", ""],
  ["delivery", "Delivery notice", "Client Services", "Shipment delivery update", "Dear [name],\n\nWe are writing to confirm the latest update on your Bellmont Express shipment.\n\n[Add the shipment detail and next step here.]"],
  ["compliance", "Compliance notice", "Compliance", "Notice regarding your shipment", "Dear [name],\n\nWe are writing regarding your shipment with Bellmont Express.\n\n[Set out the matter, what is required, and by when.]"],
] as const;

export default function AdminLettersPage() {
  const [form, setForm] = useState<LetterForm>(BLANK);
  const [reference, setReference] = useState(newLetterReference);
  const [date] = useState(today);
  const [drafts, setDrafts] = useState<LetterDraft[]>([]);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [draftId, setDraftId] = useState<string | undefined>();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const [d, e] = await Promise.all([listLetterDrafts(), listExecutives()]);
      setDrafts(d.drafts); setExecutives(e.executives);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not load letter data."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const data = useMemo(() => ({ ...form, reference, date }), [form, reference, date]);
  const ready = Boolean(form.recipientName.trim() && form.body.trim() && form.signerName.trim());
  const set = (key: keyof LetterForm) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setBusy("save"); setNotice("");
    try { const { draft } = await saveLetterDraft({ ...form, id: draftId, reference }); setDraftId(draft.id); setNotice("Draft saved."); await load(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not save the draft."); }
    finally { setBusy(""); }
  };

  const print = async () => {
    if (!ready) return;
    setBusy("print");
    try {
      const fp = await fingerprint({ reference, recipient: form.recipientName, subject: form.subject, department: form.department, classification: form.classification, signer: form.signerName, title: form.signerTitle, issued: date });
      await issueLetter({ fingerprint: fp, reference, verificationId: digest(reference, 16), recipientName: form.recipientName, subject: form.subject, department: form.department, classification: form.classification, signerName: form.signerName, signerTitle: form.signerTitle, authorizationId: `${form.department.slice(0, 2).toUpperCase()}-${digest(reference + form.signerName, 5)}`, issuedOn: date });
      document.title = `Bellmont Express - ${reference}`;
      window.print();
      setNotice("Letter registered. Use the print dialog to save it as PDF.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not register the letter."); }
    finally { setBusy(""); }
  };

  const openDraft = (draft: LetterDraft) => { setForm({ recipientName: draft.recipientName, recipientAddress: draft.recipientAddress, subject: draft.subject, body: draft.body, signerName: draft.signerName, signerTitle: draft.signerTitle, department: draft.department, classification: draft.classification }); setReference(draft.reference); setDraftId(draft.id); setNotice(`Opened ${draft.title}.`); };
  const reset = () => { setForm(BLANK); setReference(newLetterReference()); setDraftId(undefined); setNotice(""); };

  const addSavedExecutive = async () => {
    if (!form.signerName.trim()) { setNotice("Fill in the signer first."); return; }
    setBusy("executive");
    try { await addExecutive({ name: form.signerName, title: form.signerTitle, department: form.department }); await load(); setNotice("Signatory saved."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not save signatory."); }
    finally { setBusy(""); }
  };

  const input = "mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-sage";
  return (
    <div className="mx-auto max-w-[1500px] px-5 pb-28 pt-10">
      <style>{`@media print { body * { visibility: hidden !important; } #bellmont-letter, #bellmont-letter * { visibility: visible !important; } #bellmont-letter { position: absolute !important; left: 0; top: 0; width: 100% !important; } @page { size: Letter; margin: 0; } }`}</style>
      <header className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3"><LogoMark size={42} /><div><p className="text-xs font-bold uppercase tracking-[0.28em] text-sage">Bellmont Express Admin</p><h1 className="mt-1 text-3xl font-bold">Letter builder</h1></div></div>
        <Link href="/admin" className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-ink">Back to console</Link>
      </header>
      {notice && <p className="mt-6 rounded-xl bg-sage-tint px-4 py-3 text-sm text-sage-deep print:hidden">{notice}</p>}
      <div className="mt-8 grid items-start gap-7 lg:grid-cols-[380px_minmax(0,1fr)]">
        <section className="space-y-4 print:hidden lg:sticky lg:top-6">
          <div className="rounded-2xl border border-line bg-white p-5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-ink-mute">Document category<select className={input} defaultValue="general" onChange={(e) => { const p = PRESETS.find((x) => x[0] === e.target.value); if (p) setForm((f) => ({ ...f, department: p[2], subject: p[3] || f.subject, body: f.body.trim() ? f.body : p[4] })); }}>{PRESETS.map((p) => <option key={p[0]} value={p[0]}>{p[1]}</option>)}</select></label>
            <label className="mt-4 block text-[11px] font-bold uppercase tracking-widest text-ink-mute">Recipient name<input className={input} value={form.recipientName} onChange={(e) => set("recipientName")(e.target.value)} placeholder="Amara Osei" /></label>
            <label className="mt-4 block text-[11px] font-bold uppercase tracking-widest text-ink-mute">Recipient address<textarea className={input} rows={3} value={form.recipientAddress} onChange={(e) => set("recipientAddress")(e.target.value)} placeholder={'42 Harbour View\nSan Francisco, CA 94105'} /></label>
            <label className="mt-4 block text-[11px] font-bold uppercase tracking-widest text-ink-mute">Subject<input className={input} value={form.subject} onChange={(e) => set("subject")(e.target.value)} placeholder="Shipment delivery update" /></label>
            <label className="mt-4 block text-[11px] font-bold uppercase tracking-widest text-ink-mute">Letter<textarea className={`${input} leading-relaxed`} rows={12} value={form.body} onChange={(e) => set("body")(e.target.value)} placeholder="Dear Ms Osei,\n\nWrite the letter here." /></label>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5">
            {executives.length > 0 && <label className="block text-[11px] font-bold uppercase tracking-widest text-ink-mute">Saved signatory<select className={input} defaultValue="" onChange={(e) => { const ex = executives.find((x) => x.id === e.target.value); if (ex) setForm((f) => ({ ...f, signerName: ex.name, signerTitle: ex.title, department: ex.department })); }}><option value="" disabled>Choose a signatory</option>{executives.map((ex) => <option key={ex.id} value={ex.id}>{ex.name} - {ex.title}</option>)}</select></label>}
            <label className="mt-4 block text-[11px] font-bold uppercase tracking-widest text-ink-mute">Signed by<input className={input} value={form.signerName} onChange={(e) => set("signerName")(e.target.value)} placeholder="Jordan Ellis" /></label>
            <button onClick={() => void addSavedExecutive()} disabled={busy === "executive"} className="mt-2 text-xs font-semibold text-sage hover:underline">{busy === "executive" ? "Saving..." : "Save as reusable signatory"}</button>
            <label className="mt-4 block text-[11px] font-bold uppercase tracking-widest text-ink-mute">Title<input className={input} value={form.signerTitle} onChange={(e) => set("signerTitle")(e.target.value)} placeholder="Client Services Manager" /></label>
            <label className="mt-4 block text-[11px] font-bold uppercase tracking-widest text-ink-mute">Classification<select className={input} value={form.classification} onChange={(e) => set("classification")(e.target.value)}><option>Private & Confidential</option><option>Confidential</option><option>Internal</option><option>Client Services</option></select></label>
            <label className="mt-4 block text-[11px] font-bold uppercase tracking-widest text-ink-mute">Issuing department<input className={input} value={form.department} onChange={(e) => set("department")(e.target.value)} /></label>
          </div>
          <div className="flex flex-wrap gap-2"><button onClick={() => void save()} disabled={busy === "save"} className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold hover:border-ink">{busy === "save" ? "Saving..." : draftId ? "Update draft" : "Save draft"}</button><button onClick={reset} className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold hover:border-ink">Clear</button><button onClick={() => void print()} disabled={!ready || Boolean(busy)} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-sage disabled:opacity-40">{busy === "print" ? "Registering..." : "Print / PDF"}</button></div>
          {drafts.length > 0 && <div className="rounded-2xl border border-line bg-white p-5"><p className="text-xs font-bold uppercase tracking-widest text-ink-mute">Saved drafts</p><ul className="mt-3 space-y-2">{drafts.map((draft) => <li key={draft.id} className="flex items-center gap-2"><button onClick={() => openDraft(draft)} className="min-w-0 flex-1 truncate text-left text-sm font-semibold hover:text-sage">{draft.title}</button><button onClick={() => void deleteLetterDraft(draft.id).then(load)} className="text-xs text-red-600 hover:underline">Delete</button></li>)}</ul></div>}
        </section>
        <section className="rounded-3xl bg-[#e9ede6] p-3 md:p-7"><LetterDocument data={data} /></section>
      </div>
    </div>
  );
}
