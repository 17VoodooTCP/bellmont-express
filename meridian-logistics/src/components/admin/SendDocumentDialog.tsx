"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, FileText, Link2, LoaderCircle, Send, X } from "lucide-react";
import {
  listSentDocuments,
  sendDocument,
  setShipmentOwner,
  withdrawDocument,
  type AdminShipment,
  type SentDocument,
} from "@/lib/adminApi";

const field = "mt-1.5 w-full rounded-xl border border-line px-4 py-2.5 text-sm outline-none focus:border-ink";

const ago = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * The document forwarder, from the console. Sends the shipment's receipt to
 * the customer account it belongs to — linking it to one by email first if it
 * has none — and lists what has already been sent, with a way to withdraw a
 * document sent in error.
 */
export default function SendDocumentDialog({
  shipment,
  onClose,
  onLinked,
}: {
  shipment: AdminShipment;
  onClose: () => void;
  onLinked: (s: AdminShipment) => void;
}) {
  const [current, setCurrent] = useState(shipment);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"" | "link" | "send" | string>("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [history, setHistory] = useState<SentDocument[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await listSentDocuments(shipment._id));
    } catch {
      /* history is a convenience */
    }
  }, [shipment._id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state is set after the request resolves
    void loadHistory();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [loadHistory, onClose]);

  const linked = !!current.ownerId;
  const recipient = history[0]?.user;

  const link = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("link");
    setError("");
    try {
      const s = await setShipmentOwner(current._id, email.trim());
      setCurrent(s);
      onLinked(s);
      setDone(`Linked to ${email.trim()}. They've been notified it's in their account.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not link.");
    } finally {
      setBusy("");
    }
  };

  const send = async () => {
    setBusy("send");
    setError("");
    try {
      const r = await sendDocument({ shipmentId: current._id, message: message.trim() || undefined });
      setDone(`Receipt sent to ${r.recipient.name} (${r.recipient.email}). It's in their documents now.`);
      setMessage("");
      void loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setBusy("");
    }
  };

  const withdraw = async (id: string) => {
    if (!window.confirm("Withdraw this document from the customer's inbox?")) return;
    setBusy(id);
    try {
      await withdrawDocument(id);
      setHistory((h) => h.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not withdraw.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-title"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-7 md:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Document forwarder</p>
            <h2 id="send-title" className="mt-2 text-xl font-bold">
              Send receipt · <span className="notranslate tracking-wide">{current.trackingId}</span>
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink-mute hover:text-ink">
            <X size={20} />
          </button>
        </div>

        {!linked ? (
          <form onSubmit={link} className="mt-6 rounded-2xl border border-line bg-ocean/50 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Link2 size={16} /> Link to a customer first
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              This shipment isn&rsquo;t in any customer&rsquo;s account. Enter the email they registered with.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="customer@example.com"
              className={`${field} notranslate bg-white`}
            />
            <button
              type="submit"
              disabled={busy === "link" || !email.trim()}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand disabled:opacity-50"
            >
              {busy === "link" && <LoaderCircle size={16} className="animate-spin" />} Link customer
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <CircleCheck size={16} /> Linked to a customer account{recipient ? ` — ${recipient.name}` : ""}.
            </p>
            <label className="block text-xs font-semibold uppercase tracking-widest text-ink-mute">
              Message <span className="normal-case tracking-normal">(optional, shown with the document)</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="e.g. Your receipt is attached — keep it with your records."
                className={`${field} normal-case tracking-normal`}
              />
            </label>
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy === "send"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-brand disabled:opacity-50"
            >
              {busy === "send" ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
              Send receipt to customer
            </button>
          </div>
        )}

        {done && (
          <p role="status" className="mt-4 flex items-start gap-2 text-sm font-medium text-emerald-700">
            <CircleCheck size={16} className="mt-0.5 shrink-0" /> {done}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        {history.length > 0 && (
          <div className="mt-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-mute">Already sent</p>
            <ul className="mt-2 divide-y divide-line rounded-2xl border border-line">
              {history.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <FileText size={16} className="shrink-0 text-ink-mute" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{d.title}</span>
                    <span className="block text-xs text-ink-mute">
                      {d.user.email} · {ago(d.createdAt)} · {d.readAt ? "opened" : "not opened yet"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void withdraw(d.id)}
                    disabled={busy === d.id}
                    className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                  >
                    Withdraw
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
