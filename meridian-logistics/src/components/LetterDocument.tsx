"use client";

import { LogoMark } from "@/components/Logo";
import { digest, formatFingerprint } from "@/lib/letterApi";
import type { LetterForm } from "@/lib/letterApi";

export type LetterDocumentData = LetterForm & { reference: string; date: string; fingerprint?: string };

const paragraphs = (body: string) => body.split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean);

export default function LetterDocument({ data }: { data: LetterDocumentData }) {
  const verificationId = digest(data.reference, 16);
  const authorizationId = `${data.department.slice(0, 2).toUpperCase()}-${digest(data.reference + data.signerName, 5)}`;
  const issuedAt = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

  return (
    <article id="bellmont-letter" className="letter-sheet relative mx-auto min-h-[11in] w-full max-w-[8.5in] overflow-hidden bg-white px-[0.75in] py-[0.7in] text-[#273027] shadow-xl print:m-0 print:max-w-none print:shadow-none" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-[2.2in] opacity-[0.055]" aria-hidden="true">
        <svg viewBox="0 0 120 120" width="260" height="260"><path d="M27 20h34c21 0 34 9 34 24 0 9-5 16-13 20 10 4 15 11 15 20 0 16-14 26-38 26H27V20Zm17 15v22h16c11 0 18-4 18-11s-7-11-18-11H44Zm0 35v25h18c12 0 19-5 19-13s-7-12-19-12H44Z" fill="var(--sage)"/><path d="M27 20h17v74H27z" fill="var(--ink)"/><path d="M19 96c12-8 24-10 34-6 11 4 22 4 32-4 7-5 14-7 22-5" fill="none" stroke="var(--ink)" strokeWidth="4.5" strokeLinecap="round"/></svg>
      </div>

      <header className="relative flex items-start justify-between gap-8 border-b-2 border-ink pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark size={38} />
            <span className="text-[22px] font-bold tracking-[-0.04em]">Bellmont <em className="font-normal not-italic text-sage">Express</em></span>
          </div>
          <address className="mt-4 not-italic text-[9pt] leading-relaxed text-[#697267]">
            <strong className="text-ink">Bellmont Express</strong><br />1180 Gateway Plaza<br />San Francisco, CA 94105<br />support@bellmontexpress.com
          </address>
        </div>
        <div className="text-right font-sans text-[8.5pt]">
          <h1 className="text-[13pt] font-bold uppercase tracking-[0.08em]">Official correspondence</h1>
          <dl className="mt-3 space-y-1.5">
            {[["Date of issue", data.date], ["Reference", data.reference], ["Department", data.department]].map(([key, value]) => (
              <div key={key} className="flex justify-end gap-4"><dt className="uppercase tracking-[0.1em] text-[#899187]">{key}</dt><dd className="min-w-[1.5in] font-bold text-ink">{value}</dd></div>
            ))}
          </dl>
        </div>
      </header>

      <div className="relative mt-8 flex items-start justify-between gap-8">
        <div><p className="mb-1 font-sans text-[8pt] font-bold uppercase tracking-[0.16em] text-[#899187]">Addressed to</p><p className="text-[14pt] font-bold">{data.recipientName || "Recipient name"}</p>{data.recipientAddress && <p className="mt-1 whitespace-pre-line text-[9.5pt] leading-relaxed text-[#5d675d]">{data.recipientAddress}</p>}</div>
        <div className="border-y border-ink px-2 py-1 text-right font-sans"><p className="text-[8pt] font-bold uppercase tracking-[0.18em]">{data.classification}</p><p className="mt-1 text-[6.5pt] text-[#899187]">Addressee only. Handle with care.</p></div>
      </div>

      {data.subject && <p className="relative mt-8 max-w-[34em] text-[10.5pt]"><span className="font-sans text-[8pt] font-bold uppercase tracking-[0.12em] text-[#697267]">Re: </span><strong>{data.subject}</strong></p>}
      <section className="relative mt-7 max-w-[34em] whitespace-pre-wrap text-[10.5pt] leading-[1.72]">
        {paragraphs(data.body).map((paragraph, index) => <p key={index} className={index ? "mt-4" : ""}>{paragraph}</p>)}
      </section>

      <footer className="relative mt-14 border-t border-[#dfe3dc] pt-5 font-sans">
        <p className="text-[10.5pt]">Yours faithfully,</p>
        <div className="mt-8 border-b border-ink pb-1 text-[14pt] font-bold">{data.signerName || "Authorized signatory"}</div>
        <p className="mt-1 text-[9pt] text-[#697267]">{data.signerTitle} · {data.department}</p>
        <div className="mt-8 rounded-xl border border-[#dfe3dc] bg-[#f6f8f3] p-4 text-[7.5pt] text-[#697267]">
          <p className="font-bold uppercase tracking-[0.16em] text-ink">Secure document</p>
          <p className="mt-1.5 leading-relaxed">Issued by Bellmont Express under reference {data.reference}. Verify unexpected correspondence with support@bellmontexpress.com.</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1.5"><div><dt>Document ID</dt><dd className="font-bold text-ink">{verificationId}</dd></div><div><dt>Authorization</dt><dd className="font-bold text-ink">{authorizationId}</dd></div><div><dt>Generated</dt><dd className="font-bold text-ink">{issuedAt}</dd></div><div><dt>Fingerprint</dt><dd className="font-bold text-ink">{data.fingerprint ? formatFingerprint(data.fingerprint) : "Pending"}</dd></div></dl>
        </div>
        <div className="mt-4 flex justify-between border-t border-[#e5e8e2] pt-2 text-[6.5pt] uppercase tracking-[0.12em] text-[#899187]"><span>Bellmont Express · Controlled correspondence</span><span>{verificationId}</span><span>Page 1 of 1</span></div>
      </footer>
    </article>
  );
}
