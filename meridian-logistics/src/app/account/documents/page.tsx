"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Inbox, LoaderCircle, Printer } from "lucide-react";
import { useAccount } from "@/components/account/AccountProvider";
import {
  Card,
  EmptyState,
  PageHeader,
  ShipmentBadge,
  Skeleton,
  fmtDate,
  primaryBtn,
  secondaryBtn,
  timeAgo,
} from "@/components/account/ui";
import {
  getDocument,
  myDocuments,
  type DocumentFull,
  type DocumentSummary,
} from "@/lib/accountApi";
import { openTrackingReceipt, receiptHtmlFor } from "@/lib/trackingReceipt";

/* The receipt's own toolbar belongs to the print window, not the preview. */
const PREVIEW_CSS =
  "<style>.toolbar{display:none!important}body{padding:0!important;background:#fff!important}.sheet{box-shadow:none!important}</style>";

/**
 * The document drawn at true Letter size and scaled to fit, in a sandboxed
 * frame: scripts may run (the receipt fits itself to one page) but the frame
 * gets an opaque origin, so it cannot reach this page, its storage or the
 * session token.
 */
function ReceiptPreview({ doc }: { doc: DocumentFull }) {
  const [html, setHtml] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let live = true;
    void receiptHtmlFor(doc.payload.shipment, new Date(doc.createdAt)).then((h) => {
      if (live) setHtml(h.replace("</head>", `${PREVIEW_CSS}</head>`));
    });
    return () => {
      live = false;
    };
  }, [doc]);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / 816));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={box} className="relative overflow-hidden rounded-xl border border-line bg-white" style={{ height: 1056 * scale }}>
      {html && (
        <iframe
          title={doc.title}
          srcDoc={html}
          sandbox="allow-scripts"
          onLoad={() => setLoaded(true)}
          style={{ width: 816, height: 1056, border: 0, transform: `scale(${scale})`, transformOrigin: "0 0" }}
        />
      )}
      {/* The receipt draws its fonts and barcode inside the frame; cover the
          blank page until it has. */}
      {!loaded && (
        <div className="absolute inset-0 grid place-items-center bg-white">
          <LoaderCircle className="animate-spin text-ink-mute" />
        </div>
      )}
    </div>
  );
}

function DocumentsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, on } = useAccount();
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<DocumentFull | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState("");
  const openId = params.get("open");

  const load = useCallback(async () => {
    try {
      setDocs((await myDocuments()).documents);
    } catch {
      /* handled by the shell */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state is set after the request resolves
    void load();
    const offs = ["document:new", "document:removed"].map((ev) => on(ev, () => void load()));
    return () => offs.forEach((off) => off());
  }, [user, load, on]);

  /* The URL says which document is open, so notification links and the
     browser's back button both work. */
  useEffect(() => {
    if (!openId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs from the URL, an external source
      setOpen(null);
      return;
    }
    if (!user) return;
    let live = true;
    setOpening(openId);
    setError("");
    getDocument(openId)
      .then((d) => {
        if (!live) return;
        setOpen(d);
        setDocs((list) => list.map((x) => (x.id === d.id ? { ...x, readAt: d.readAt } : x)));
      })
      .catch((err) => live && setError(err instanceof Error ? err.message : "Could not open this document."))
      .finally(() => live && setOpening(null));
    return () => {
      live = false;
    };
  }, [openId, user]);

  const unread = docs.filter((d) => !d.readAt).length;

  if (openId) {
    return (
      <div>
        <button type="button" onClick={() => router.push("/account/documents")} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
          <ArrowLeft size={16} /> All documents
        </button>
        {opening || (!open && !error) ? (
          <Skeleton className="h-[600px]" />
        ) : error ? (
          <Card>
            <EmptyState icon={<FileText size={24} />} title="Document unavailable" body={error} />
          </Card>
        ) : (
          open && (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
              <ReceiptPreview doc={open} />
              {/* On narrower screens the actions come first, not under a page-tall preview. */}
              <div className="order-first space-y-4 xl:sticky xl:top-28 xl:order-none xl:self-start">
                <Card className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-mute">Document</p>
                  <p className="mt-1.5 font-semibold text-ink">{open.title}</p>
                  <p className="mt-1 text-xs text-ink-mute">Sent {fmtDate(open.createdAt, true)}</p>
                  {open.message && (
                    <p className="mt-4 rounded-xl bg-ocean px-4 py-3 text-sm leading-relaxed text-ink-soft">
                      &ldquo;{open.message}&rdquo;
                      <span className="mt-1 block text-xs text-ink-mute">— Bellmont Express</span>
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => void openTrackingReceipt(open.payload.shipment, new Date(open.createdAt))}
                    className={`${primaryBtn} mt-5 w-full`}
                  >
                    <Printer size={16} /> Print / Save as PDF
                  </button>
                  {open.shipmentId && (
                    <button
                      type="button"
                      onClick={() => router.push(`/account/shipments?open=${open.shipmentId}`)}
                      className={`${secondaryBtn} mt-3 w-full`}
                    >
                      View shipment
                    </button>
                  )}
                </Card>
                <p className="px-1 text-xs leading-relaxed text-ink-mute">
                  This receipt shows the shipment as it stood when it was sent. Live tracking always has the latest status.
                </p>
              </div>
            </div>
          )
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Documents" title={`Your documents${unread ? ` · ${unread} new` : ""}`} />
      <Card>
        {loading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : docs.length === 0 ? (
          <EmptyState
            icon={<Inbox size={24} />}
            title="No documents yet"
            body="Receipts and other documents our team sends you arrive here, ready to view, print or save as PDF."
          />
        ) : (
          <ul>
            {docs.map((d) => (
              <li key={d.id} className="border-b border-line last:border-0">
                <button
                  type="button"
                  onClick={() => router.push(`/account/documents?open=${d.id}`)}
                  className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-ocean/60 ${d.readAt ? "" : "bg-brand-tint/30"}`}
                >
                  <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-tint text-brand">
                    <FileText size={20} />
                    {!d.readAt && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-orange-ink" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${d.readAt ? "font-medium text-ink" : "font-bold text-ink"}`}>{d.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-ink-soft">{d.message ?? "Shipment receipt"}</span>
                  </span>
                  {d.shipment && (
                    <span className="hidden sm:block">
                      <ShipmentBadge status={d.shipment.status} />
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-ink-mute">{timeAgo(d.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <DocumentsInner />
    </Suspense>
  );
}
