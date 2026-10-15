import QRCode from "qrcode";
import type { Shipment } from "./api";
import { LOGO_SVG_STRING } from "@/components/Logo";

const BRAND = "#f6a23a";
const NAVY = "#1d2b59";
const PAPER = "#f8fbff";

const escapeHtml = (value: string | undefined) =>
  (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");

const formatDate = (value?: string) => {
  if (!value) return "Pending confirmation";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending confirmation";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
};

/* Code 39 covers the uppercase letters and digits used by our S10-style
   tracking IDs. Start/stop sentinels are added automatically, so the printed
   bars encode the exact ID shown below them. */
const CODE_39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn",
  "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw",
  "8": "wnnwnnwnn", "9": "nnwwnnwnn", "A": "wnnnnwnnw", "B": "nnwnnwnnw",
  "C": "wnwnnwnnn", "D": "nnnnwwnnw", "E": "wnnnwwnnn", "F": "nnwnwwnnn",
  "G": "nnnnnwwnw", "H": "wnnnnwwnn", "I": "nnwnnwwnn", "J": "nnnnwwwnn",
  "K": "wnnnnnnww", "L": "nnwnnnnww", "M": "wnwnnnnwn", "N": "nnnnwnnww",
  "O": "wnnnwnnwn", "P": "nnwnwnnwn", "Q": "nnnnnnwww", "R": "wnnnnnwwn",
  "S": "nnwnnnwwn", "T": "nnnnwnwwn", "U": "wwnnnnnnw", "V": "nwwnnnnnw",
  "W": "wwwnnnnnn", "X": "nwnnwnnnw", "Y": "wwnnwnnnn", "Z": "nwwnwnnnn",
  "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "$": "nwnwnwnnn",
  "/": "nwnwnnnwn", "+": "nwnnnwnwn", "%": "nnnwnwnwn", "*": "nwnnwnwnn",
};

const barcodeBars = (trackingId: string) => {
  const encoded = `*${trackingId.toUpperCase().replace(/[^A-Z0-9 .$/+%\-]/g, "-")}*`;
  return Array.from(encoded)
    .map((character) => {
      const pattern = CODE_39[character] ?? CODE_39["-"];
      return `${Array.from(pattern).map((width, index) =>
        index % 2 === 0 ? `<i style="width:${width === "w" ? 4 : 1.45}px"></i>` : `<em style="width:${width === "w" ? 4 : 1.45}px"></em>`
      ).join("")}<em style="width:1.45px"></em>`;
    })
    .join("");
};

/** Opens a print-ready shipment receipt. Call only from a user gesture so the
 * browser is allowed to open the print window. */
export async function openTrackingReceipt(shipment: Shipment) {
  // The new document is written into this same-origin blank window. Do not use
  // `noopener` here: some browsers return a null WindowProxy when it is set,
  // making it impossible to populate the print sheet.
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  const trackUrl = new URL("/tracking", window.location.origin);
  trackUrl.searchParams.set("id", shipment.trackingId);

  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(trackUrl.toString(), {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 260,
      color: { dark: NAVY, light: "#ffffff" },
    });
  } catch {
    // A receipt is still printable without the QR image.
  }

  const now = new Date();
  const tracking = escapeHtml(shipment.trackingId);
  const sender = escapeHtml(shipment.senderName || "Sender");
  const receiver = escapeHtml(shipment.receiverName || "Recipient");
  const origin = escapeHtml(shipment.origin?.city || "Origin pending");
  const destination = escapeHtml(shipment.destination?.city || "Destination pending");
  const senderAddress = escapeHtml(shipment.senderAddress || "");
  const receiverAddress = escapeHtml(shipment.receiverAddress || "");
  const packageType = escapeHtml(shipment.packageType || "Parcel");
  const status = escapeHtml(shipment.status.replaceAll("_", " "));
  const eta = formatDate(shipment.estimatedDelivery);
  const issuedAt = now.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const html = `<!doctype html>
  <html lang="en"><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bellmont receipt · ${tracking}</title>
  <style>
    * { box-sizing: border-box; }
    :root { color: ${NAVY}; background: ${PAPER}; }
    body { margin: 0; padding: 24px; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: ${PAPER}; color: ${NAVY}; }
    .sheet { width: min(8.5in, 100%); min-height: 10.5in; margin: 0 auto; background: #fff; box-shadow: 0 18px 55px rgba(29,43,89,.15); overflow: hidden; }
    .topline { height: 12px; background: linear-gradient(90deg, ${BRAND}, #ffd56d 44%, ${BRAND}); }
    .pad { padding: 30px 34px; }
    .header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-name { font-size: 20px; font-weight: 700; font-style: italic; letter-spacing: -.04em; color: #49629d; }
    .eyebrow { margin: 0 0 5px; font-size: 10px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #526389; }
    h1 { margin: 0; font-size: 24px; letter-spacing: .06em; text-transform: uppercase; }
    .receipt-meta { text-align: right; }
    .receipt-meta p { margin: 5px 0 0; font-size: 11px; color: #617091; }
    .route { margin-top: 28px; display: grid; grid-template-columns: 1fr 44px 1fr; align-items: stretch; border-top: 1px solid #dfe6f2; border-bottom: 1px solid #dfe6f2; }
    .party { padding: 17px 0; min-width: 0; }
    .party + .party { padding-left: 24px; }
    .party strong { display: block; font-size: 17px; line-height: 1.2; color: ${NAVY}; }
    .party p { margin: 5px 0 0; color: #526389; font-size: 12px; line-height: 1.45; white-space: pre-line; }
    .arrow { display: grid; place-items: center; color: ${BRAND}; font-size: 26px; font-weight: 700; }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); border-bottom: 1px solid #dfe6f2; }
    .meta div { padding: 13px 12px; border-right: 1px solid #dfe6f2; }
    .meta div:last-child { border-right: 0; }
    .meta span { display: block; font-size: 9px; letter-spacing: .12em; font-weight: 800; text-transform: uppercase; color: #6d7c9f; }
    .meta b { display: block; margin-top: 5px; font-size: 12px; color: ${NAVY}; line-height: 1.3; }
    .tracking { margin-top: 26px; padding: 22px; border-radius: 18px; background: linear-gradient(135deg, #1d2b59, #2b417e); color: white; }
    .tracking-grid { display: grid; grid-template-columns: 1fr 120px; gap: 20px; align-items: center; }
    .tracking .eyebrow { color: #c9d5ee; }
    .tracking-id { margin: 4px 0 0; font-size: clamp(25px, 5.2vw, 43px); font-weight: 850; letter-spacing: .045em; line-height: 1; word-break: break-all; }
    .tracking-note { margin: 10px 0 0; font-size: 12px; color: #dce6fb; }
    .qr { padding: 8px; border-radius: 10px; background: white; line-height: 0; }
    .qr img { width: 100%; height: auto; }
    .barcode-wrap { margin-top: 18px; padding: 18px 18px 14px; border: 1px solid #dfe6f2; border-radius: 14px; }
    .bars { display: flex; align-items: stretch; height: 64px; padding: 0 12px; overflow: hidden; }
    .bars i { display: block; flex: 0 0 auto; background: ${NAVY}; height: 100%; }
    .bars em { display: block; flex: 0 0 auto; height: 100%; }
    .barcode-value { margin: 10px 0 0; text-align: center; font-size: 16px; font-weight: 800; letter-spacing: .18em; color: ${NAVY}; }
    .bottom { margin-top: 26px; display: grid; grid-template-columns: 1.12fr .88fr; gap: 18px; }
    .card { border: 1px solid #dfe6f2; border-radius: 14px; overflow: hidden; }
    .card h2 { margin: 0; padding: 11px 14px; background: #eff4fc; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; }
    .card dl { margin: 0; padding: 4px 14px; }
    .card dl div { display: flex; justify-content: space-between; gap: 16px; padding: 9px 0; border-bottom: 1px solid #edf1f8; font-size: 12px; }
    .card dl div:last-child { border-bottom: 0; }
    dt { color: #657493; } dd { margin: 0; text-align: right; font-weight: 700; color: ${NAVY}; text-transform: capitalize; }
    .handling { display: flex; gap: 11px; padding: 14px; }
    .handling div { flex: 1; min-height: 82px; display: grid; place-content: center; gap: 6px; border: 1px solid #dfe6f2; border-radius: 10px; text-align: center; font-size: 9px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #526389; }
    .handling b { color: ${BRAND}; font-size: 20px; }
    .footer { display: flex; justify-content: space-between; gap: 18px; margin-top: 23px; padding-top: 16px; border-top: 1px solid #dfe6f2; color: #6d7c9f; font-size: 10px; line-height: 1.5; }
    .print { position: fixed; top: 16px; right: 16px; border: 0; border-radius: 999px; background: ${NAVY}; color: #fff; padding: 12px 18px; font: 700 13px/1 Inter, sans-serif; cursor: pointer; box-shadow: 0 8px 22px rgba(29,43,89,.22); }
    @page { size: letter portrait; margin: 0; }
    @media print { body { padding: 0; background: #fff; } .sheet { width: 8.5in; min-height: 11in; box-shadow: none; } .print { display: none; } }
    @media (max-width: 560px) { body { padding: 0; } .sheet { min-height: 100vh; } .pad { padding: 22px; } .header, .tracking-grid, .bottom { grid-template-columns: 1fr; } .receipt-meta { text-align: left; } .meta { grid-template-columns: repeat(2, 1fr); } .meta div:nth-child(2) { border-right: 0; } .meta div:nth-child(-n+2) { border-bottom: 1px solid #dfe6f2; } .qr { width: 120px; } }
  </style></head><body>
  <button class="print" onclick="window.print()">Print / Save PDF</button>
  <main class="sheet">
    <div class="topline"></div>
    <div class="pad">
      <header class="header">
        <div><div class="brand">${LOGO_SVG_STRING}<span class="brand-name">Bellmont Express</span></div><p class="eyebrow" style="margin-top:13px">One shared record for every handoff</p></div>
        <div class="receipt-meta"><h1>Shipment receipt</h1><p>Issued ${escapeHtml(issuedAt)}</p><p>bellmont-express.vercel.app</p></div>
      </header>
      <section class="route">
        <div class="party"><p class="eyebrow">Ship from</p><strong>${sender}</strong><p>${senderAddress || origin}</p></div>
        <div class="arrow" aria-hidden="true">→</div>
        <div class="party"><p class="eyebrow">Ship to</p><strong>${receiver}</strong><p>${receiverAddress || destination}</p></div>
      </section>
      <section class="meta">
        <div><span>Origin</span><b>${origin}</b></div>
        <div><span>Destination</span><b>${destination}</b></div>
        <div><span>Package</span><b>${packageType}</b></div>
        <div><span>Weight</span><b>${shipment.weight ? `${shipment.weight} lb` : "Not specified"}</b></div>
      </section>
      <section class="tracking">
        <div class="tracking-grid">
          <div><p class="eyebrow">Tracking number</p><p class="tracking-id">${tracking}</p><p class="tracking-note">Scan the code or enter this exact number at bellmont-express.vercel.app/tracking.</p></div>
          ${qrDataUrl ? `<div class="qr"><img alt="QR code for tracking ${tracking}" src="${qrDataUrl}" /></div>` : ""}
        </div>
      </section>
      <section class="barcode-wrap"><div class="bars" aria-label="Code 39 barcode for ${tracking}">${barcodeBars(shipment.trackingId)}</div><p class="barcode-value">${tracking}</p></section>
      <section class="bottom">
        <div class="card"><h2>Delivery detail</h2><dl><div><dt>Estimated delivery</dt><dd>${escapeHtml(eta)}</dd></div><div><dt>Current status</dt><dd>${status}</dd></div><div><dt>Current location</dt><dd>${escapeHtml(shipment.currentLocation?.city || origin)}</dd></div><div><dt>Service</dt><dd>Bellmont Express</dd></div></dl></div>
        <div class="card"><h2>Handling guidance</h2><div class="handling"><div><b>↑↑</b>This side up</div><div><b>☂</b>Keep dry</div><div><b>⌁</b>Handle with care</div></div></div>
      </section>
      <footer class="footer"><span>This receipt confirms the shipment record at the time it was printed. Live tracking remains the authoritative delivery status.</span><span>Support: support@bellmontexpress.com</span></footer>
    </div>
  </main></body></html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}
