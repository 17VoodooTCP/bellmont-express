"use client";

/* A chat attachment, shown the same way to visitors and agents.

   Images are a thumbnail that opens full size in a viewer with Download and
   Open-in-new-tab. PDFs (and HEIC photos, which most browsers can't draw) are
   a file card with the same two actions.

   Attachments travel as data: URLs. Browsers refuse to open those in a new
   tab, and large ones fail to download, which is why clicking an image used
   to do nothing. Every action here turns the attachment into a Blob first,
   typed by its validated MIME type (see attachmentBlob). */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  attachmentBlob,
  formatBytes,
  isAllowedType,
  isViewableImage,
  safeFilename,
  type ChatAttachment,
} from "@/lib/chatAttachment";

/* Long enough for the new tab to load the file; then the memory is freed. */
const REVOKE_AFTER_MS = 60_000;

function withBlobUrl(att: ChatAttachment, run: (url: string) => void) {
  const blob = attachmentBlob(att);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  run(url);
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
  return true;
}

export function downloadAttachment(att: ChatAttachment) {
  return withBlobUrl(att, (url) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = safeFilename(att.name);
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
}

export function openAttachment(att: ChatAttachment) {
  return withBlobUrl(att, (url) => {
    /* noopener: the new tab gets no handle back to this page. */
    window.open(url, "_blank", "noopener");
  });
}

const Icon = {
  download: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" />
    </svg>
  ),
  open: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  file: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  ),
};

function Viewer({ att, onClose }: { att: ChatAttachment; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    /* Capture phase, so Escape closes the viewer before the chat sheet. */
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      previous?.focus?.();
    };
  }, [onClose]);

  const action =
    "inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/20";

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-[#0c1222]/92 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Image: ${att.name}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex items-center gap-3 px-4 py-3 text-white sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{att.name}</p>
          {att.size ? <p className="text-xs text-white/60">{formatBytes(att.size)}</p> : null}
        </div>
        <button type="button" onClick={() => downloadAttachment(att)} className={action}>
          {Icon.download}
          <span className="hidden sm:inline">Download</span>
        </button>
        <button type="button" onClick={() => openAttachment(att)} className={`${action} hidden sm:inline-flex`}>
          {Icon.open}
          Open in new tab
        </button>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close image"
          className="grid h-10 w-10 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
        >
          {Icon.close}
        </button>
      </div>
      <div
        className="flex min-h-0 flex-1 items-center justify-center px-4 pb-6 sm:px-10"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a data URL, not a static asset */}
        <img src={att.data} alt={att.name} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
      </div>
    </div>,
    document.body,
  );
}

export default function AttachmentView({ att, mine = false }: { att: ChatAttachment; mine?: boolean }) {
  const [viewing, setViewing] = useState(false);
  const close = useCallback(() => setViewing(false), []);

  if (!isAllowedType(att)) {
    return <span className="text-sm italic opacity-80">Attachment type not supported</span>;
  }

  if (isViewableImage(att)) {
    return (
      <>
        <button
          type="button"
          onClick={() => setViewing(true)}
          className="group relative block overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label={`Open image ${att.name}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a data URL, not a static asset */}
          <img src={att.data} alt={att.name} className="block max-h-56 w-auto max-w-full rounded-xl object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-end gap-1.5 bg-gradient-to-t from-black/55 to-transparent px-2.5 pb-2 pt-6 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            Tap to view
          </span>
        </button>
        {viewing && <Viewer att={att} onClose={close} />}
      </>
    );
  }

  /* PDFs and HEIC photos: a file card. */
  const pdf = /pdf$/i.test(att.type);
  const sub = mine ? "text-white/70" : "text-[#6b7793]";
  const btn = mine
    ? "bg-white/15 text-white hover:bg-white/25"
    : "bg-[#f1efe8] text-[#1e2950] hover:bg-[#e8e4d8]";
  return (
    <div className="flex min-w-[220px] max-w-[280px] items-center gap-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${mine ? "bg-white/15" : "bg-[#eef1f7] text-[#49629d]"}`}>
        {Icon.file}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" title={att.name}>{att.name}</p>
        <p className={`text-xs ${sub}`}>
          {pdf ? "PDF" : "Photo"}
          {att.size ? ` · ${formatBytes(att.size)}` : ""}
        </p>
      </div>
      {pdf && (
        <button type="button" onClick={() => openAttachment(att)} aria-label={`Open ${att.name}`} title="Open" className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${btn}`}>
          {Icon.open}
        </button>
      )}
      <button type="button" onClick={() => downloadAttachment(att)} aria-label={`Download ${att.name}`} title="Download" className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${btn}`}>
        {Icon.download}
      </button>
    </div>
  );
}
