import QRCode from "qrcode";
import type { Shipment } from "./api";
import { STATUS_LABEL, holdMessage } from "./api";
import { LOGO_SVG_STRING } from "@/components/Logo";
import { SITE_URL } from "./site";

/* ── Palette: the brand amber over the receipt's navy ─────────────────── */
const BRAND = "#f6a23a";
const NAVY = "#1d2b59";
const PAPER = "#f3f5f9";
const SUPPORT_EMAIL = "support@bellmontexpress.com";

const escapeHtml = (value: string | undefined) =>
  (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** "Tue, Oct 20, 2026". UTC, because delivery dates are stored as midnight
 *  UTC and a local reading would show the day before in the Americas. */
const formatDay = (value?: string, { local = false } = {}) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    /* A scan is a real moment, so it reads in local time like the history. */
    ...(local ? {} : { timeZone: "UTC" }),
  });
};

const formatStamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

/* ── Code 128 ─────────────────────────────────────────────────────────────
 *
 * The symbology parcel carriers print on labels, and the one UPU S10 ids are
 * normally carried in. Code set B covers printable ASCII, so the bars encode
 * the tracking id exactly — nothing is substituted.
 *
 * Each pattern lists alternating bar/space widths in modules, bar first.
 */
const CODE_128 = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];
const START_B = 104;
const STOP = 106;
/** Clear space either side of the bars, in modules. Scanners need ≥10. */
const QUIET = 12;

/** Code 128-B symbol values for `text`, including start, check and stop. */
export function code128Values(text: string): number[] {
  const values = Array.from(text).map((ch) => {
    const code = ch.charCodeAt(0);
    if (code < 32 || code > 126) throw new Error(`Cannot encode ${JSON.stringify(ch)} in Code 128-B`);
    return code - 32;
  });
  const check = values.reduce((sum, v, i) => sum + v * (i + 1), START_B) % 103;
  return [START_B, ...values, check, STOP];
}

/**
 * The barcode as an SVG of filled rectangles.
 *
 * Drawn with `fill`, never `background`: browsers strip backgrounds when they
 * print, which is why the old CSS-box barcode came out of the printer blank.
 * Vector bars also stay crisp at any printer resolution, where fractional-pixel
 * boxes rounded to uneven widths or vanished.
 */
export function code128Svg(text: string, heightModules = 46): string {
  const rects: string[] = [];
  let x = QUIET;
  for (const value of code128Values(text)) {
    const pattern = CODE_128[value]!;
    for (let i = 0; i < pattern.length; i++) {
      const w = Number(pattern[i]);
      if (i % 2 === 0) rects.push(`<rect x="${x}" y="0" width="${w}" height="${heightModules}"/>`);
      x += w;
    }
  }
  const width = x + QUIET;
  /* preserveAspectRatio="none" scales every module by the same factor, so
     the bar/space ratios a scanner reads are kept exactly. */
  return `<svg class="barcode-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${heightModules}" preserveAspectRatio="none" shape-rendering="crispEdges" role="img" aria-label="Code 128 barcode for ${escapeHtml(text)}"><g fill="#000">${rects.join("")}</g></svg>`;
}

/* ── Icons: inline SVG, because emoji and symbol glyphs vary by printer font ── */
const ICON = (d: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  scissors: ICON(`<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>`),
  arrow: ICON(`<path d="M4 12h16M14 6l6 6-6 6"/>`),
  alert: ICON(`<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>`),
};

/* The milestones a parcel moves through, in order. A hold is shown on the
   step the parcel is held at rather than as a step of its own. */
const STEPS: Shipment["status"][] = ["pending", "picked_up", "in_transit", "out_for_delivery", "delivered"];
const STEP_LABEL: Record<string, string> = {
  pending: "Booked",
  picked_up: "Picked up",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

const STATUS_TONE: Record<Shipment["status"], { bg: string; fg: string; dot: string }> = {
  pending: { bg: "#eef1f6", fg: "#344054", dot: "#98a2b3" },
  picked_up: { bg: "#eaf0fc", fg: "#1f3f8a", dot: "#3a62c4" },
  in_transit: { bg: "#eaf0fc", fg: "#1f3f8a", dot: "#3a62c4" },
  out_for_delivery: { bg: "#fff4e5", fg: "#8a4f04", dot: BRAND },
  delivered: { bg: "#e7f6ec", fg: "#17663a", dot: "#239152" },
  on_hold: { bg: "#fdecec", fg: "#9b1f1f", dot: "#d23b3b" },
};

/** Short, stable check value printed in the footer so a reprint of the same
 *  receipt can be told apart from an altered one at a glance. Not a security
 *  control — FNV-1a over the fields that matter. */
function checkCode(parts: string[]): string {
  let h = 0x811c9dc5;
  for (const ch of parts.join("|")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).toUpperCase().padStart(8, "0").replace(/(.{4})/, "$1-");
}

export interface ReceiptOptions {
  /** Absolute origin of the site, for the tracking link and QR target. */
  siteOrigin: string;
  /** QR code image for the tracking link, or empty to omit it. */
  qrDataUrl: string;
  /** When the receipt was issued. */
  issuedAt: Date;
}

/** The complete receipt document. Pure, so it can be rendered and tested. */
export function buildReceiptHtml(shipment: Shipment, opts: ReceiptOptions): string {
  const host = new URL(opts.siteOrigin).host.replace(/^www\./, "");
  const tracking = escapeHtml(shipment.trackingId);
  const sender = escapeHtml(shipment.senderName || "Sender");
  const receiver = escapeHtml(shipment.receiverName || "Recipient");
  const originCity = escapeHtml(shipment.origin?.city || "Origin pending");
  const destCity = escapeHtml(shipment.destination?.city || "Destination pending");
  const senderAddress = escapeHtml(shipment.senderAddress || shipment.origin?.city || "");
  const receiverAddress = escapeHtml(shipment.receiverAddress || shipment.destination?.city || "");
  /* The label prints the address on one line, so its line breaks become commas. */
  const receiverLine = receiverAddress.split(/\s*\n+\s*/).filter(Boolean).join(", ");
  const packageType = escapeHtml(shipment.packageType || "Parcel");
  const weight = shipment.weight ? `${shipment.weight} lb` : "—";
  const status = shipment.status;
  const statusLabel = escapeHtml(STATUS_LABEL[status] ?? status.replaceAll("_", " "));
  const tone = STATUS_TONE[status] ?? STATUS_TONE.pending;
  const eta = escapeHtml(formatDay(shipment.estimatedDelivery)) || "To be confirmed";
  /* A delivered parcel is at its destination, whatever the last scan said. */
  const location = status === "delivered"
    ? destCity
    : escapeHtml(shipment.currentLocation?.city || shipment.origin?.city || "—");

  const d = opts.issuedAt;
  /* Local date, to match the "Issued" line — the UTC date is already
     tomorrow for an evening print in the Americas. */
  const ymd = [d.getFullYear() % 100, d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, "0")).join("");
  const receiptNo = `BX-${ymd}-${shipment.trackingId.slice(-6).toUpperCase()}`;
  const issued = d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
  const check = checkCode([shipment.trackingId, receiptNo, shipment.receiverName ?? "", shipment.status, shipment.destination?.city ?? ""]);

  /* Newest first; the fit script trims the oldest if the page runs short. */
  const events = [...(shipment.timeline ?? [])]
    .filter((e) => e && e.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);
  const lastScan = events[0] ? escapeHtml(formatStamp(events[0].timestamp)) : "—";
  /* For a delivered parcel the hero date is when it arrived: the delivery
     scan if there is one, the estimate only as a fallback. */
  const deliveredScan = events.find((e) => e.status === "delivered");
  const heroLabel = status === "delivered" ? "Delivered on" : "Estimated delivery";
  const heroDate =
    status === "delivered" && deliveredScan ? escapeHtml(formatDay(deliveredScan.timestamp, { local: true })) || eta : eta;

  /* ── Progress ── */
  const held = status === "on_hold";
  const current = held ? STEPS.indexOf("in_transit") : Math.max(0, STEPS.indexOf(status));
  const pct = (current / (STEPS.length - 1)) * 100;
  const stepper = STEPS.map((s, i) => {
    const state = i < current || status === "delivered" ? "done" : i === current ? (held ? "held" : "now") : "todo";
    const label = i === current && held ? "On hold" : STEP_LABEL[s];
    return `<li class="step ${state}"><span class="dot"></span><span class="sl">${label}</span></li>`;
  }).join("");

  const hold = held
    ? `<div class="notice" role="note">${ICONS.alert}<div><b>This shipment is on hold.</b> ${escapeHtml(holdMessage(shipment.holdReason))}</div></div>`
    : "";

  const history = events.length
    ? `<ol class="events">${events.map((e, i) => `
        <li class="${i === 0 ? "latest" : ""}">
          <span class="when">${escapeHtml(formatStamp(e.timestamp))}</span>
          <span class="what"><b>${escapeHtml(STATUS_LABEL[e.status as Shipment["status"]] ?? e.status.replaceAll("_", " "))}</b>${e.description ? `<span>${escapeHtml(e.description)}</span>` : ""}</span>
          <span class="where">${escapeHtml(e.location || "")}</span>
        </li>`).join("")}
      </ol>`
    : status === "delivered"
      ? `<p class="empty">No scan history was recorded for this shipment.</p>`
      : `<p class="empty">No scans yet. Each pickup, transfer and delivery will appear at ${escapeHtml(host)}/tracking as it happens.</p>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<!-- Laid out at the sheet's own width, so a phone scales the page to fit
     rather than reflowing or cropping it — on screen and when printing. -->
<meta name="viewport" content="width=816" />
<title>Shipment receipt ${tracking} · Bellmont Express</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet" />
<style>
  :root {
    --navy: ${NAVY}; --amber: ${BRAND};
    --ink: #101828; --ink-2: #344054; --mute: #667085; --faint: #98a2b3;
    --line: #e4e7ec; --wash: #f6f7fa;
    --mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Consolas, monospace;
  }
  * { box-sizing: border-box; }
  /* Print every colour as designed: browsers strip backgrounds by default. */
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { margin: 0; }
  body { padding: 72px 0 40px; background: ${PAPER}; color: var(--ink);
         font: 400 12px/1.5 Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
         -webkit-font-smoothing: antialiased; font-feature-settings: "tnum" 1, "cv11" 1; }

  /* The page is a fixed Letter sheet. A sheet allowed to grow taller than the
     paper prints as a page plus a blank spill page. */
  .sheet { position: relative; width: 8.5in; height: 11in; margin: 0 auto; background: #fff;
           box-shadow: 0 1px 2px rgba(16,24,40,.05), 0 20px 50px rgba(16,24,40,.10); overflow: hidden;
           display: flex; flex-direction: column; padding: 0.5in 0.6in 0.42in; }
  .sheet > * { flex-shrink: 0; }

  .lbl { display: block; font-size: 10.5px; font-weight: 500; color: var(--mute); }
  .mono { font-family: var(--mono); }

  /* ── Header ─────────────────────────────────────────────────────────── */
  .top { display: flex; justify-content: space-between; align-items: center; gap: 24px;
         padding-bottom: 18px; border-bottom: 1px solid var(--line); }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand svg { width: 44px; height: 35px; }
  .wordmark { font-size: 20px; font-weight: 700; font-style: italic; letter-spacing: -.03em; color: #49629d; line-height: 1; }
  .doc { text-align: right; }
  .doc h1 { margin: 0; font-size: 17px; font-weight: 600; letter-spacing: -.01em; color: var(--ink); line-height: 1.2; }
  .doc p { margin: 3px 0 0; font-size: 10.5px; color: var(--mute); }
  .doc p .mono { color: var(--ink-2); font-size: 10.5px; }

  /* ── Summary ────────────────────────────────────────────────────────── */
  .hero { margin-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; }
  .tn { margin-top: 4px; font-family: var(--mono); font-size: 27px; font-weight: 600; letter-spacing: .03em; line-height: 1.1; color: var(--ink); }
  .pill { display: inline-flex; align-items: center; gap: 7px; margin-top: 10px; padding: 4px 11px 4px 9px; border-radius: 999px;
          background: ${tone.bg}; color: ${tone.fg}; font-size: 11px; font-weight: 600; line-height: 1.2; }
  .pill::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: ${tone.dot}; }
  .hero-r { text-align: right; }
  .eta { margin-top: 4px; font-size: 20px; font-weight: 600; letter-spacing: -.01em; line-height: 1.15; color: var(--ink); }

  /* ── Journey ────────────────────────────────────────────────────────── */
  .journey { margin-top: 18px; padding: 16px 22px 14px; border-radius: 12px; background: var(--wash); }
  .ends { display: grid; grid-template-columns: minmax(0,1fr) auto minmax(0,1fr); align-items: center; gap: 18px; }
  .ends .r { text-align: right; }
  .city { margin-top: 2px; font-size: 17px; font-weight: 600; letter-spacing: -.01em; line-height: 1.2;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ends svg { width: 22px; height: 22px; color: var(--faint); }
  .steps { list-style: none; margin: 16px 0 0; padding: 0; position: relative; display: grid; grid-template-columns: repeat(${STEPS.length}, 1fr); }
  .steps::before, .steps::after { content: ""; position: absolute; top: 4px; height: 3px; left: 10%; border-radius: 3px; }
  .steps::before { right: 10%; background: #dfe3ea; }
  .steps::after { width: calc(80% * ${pct.toFixed(2)} / 100); background: ${held ? "#d23b3b" : "var(--navy)"}; }
  .step { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 7px; }
  .dot { width: 11px; height: 11px; border-radius: 50%; background: #fff; border: 2px solid #cfd5df; }
  .done .dot { background: var(--navy); border-color: var(--navy); }
  .now .dot { background: var(--amber); border-color: #fff; box-shadow: 0 0 0 2px var(--amber); }
  .held .dot { background: #d23b3b; border-color: #fff; box-shadow: 0 0 0 2px #d23b3b; }
  .sl { font-size: 10.5px; font-weight: 500; color: var(--faint); white-space: nowrap; }
  .done .sl { color: var(--ink-2); }
  .now .sl, .held .sl { color: var(--ink); font-weight: 600; }
  .held .sl { color: #9b1f1f; }

  .notice { margin-top: 12px; display: flex; gap: 10px; align-items: flex-start; padding: 11px 14px; border-radius: 10px;
            background: #fdf2f2; color: #7a1c1c; font-size: 11.5px; line-height: 1.5; }
  .notice svg { width: 17px; height: 17px; flex: none; margin-top: 1px; color: #c43232; }
  .notice div { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
  .notice b { font-weight: 600; color: #5e1414; }

  /* ── People ─────────────────────────────────────────────────────────── */
  .parties { margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .name { margin-top: 3px; font-size: 13.5px; font-weight: 600; line-height: 1.35; color: var(--ink);
          display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; overflow-wrap: anywhere; }
  .addr { margin-top: 2px; color: var(--ink-2); font-size: 11.5px; line-height: 1.5; white-space: pre-line; overflow-wrap: anywhere;
          display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }

  /* ── Facts ──────────────────────────────────────────────────────────── */
  .facts { margin-top: 18px; display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .facts > div { padding: 10px 0; min-width: 0; }
  .facts > div + div { padding-left: 18px; border-left: 1px solid var(--line); }
  .val { display: block; margin-top: 2px; font-size: 12.5px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* ── History ────────────────────────────────────────────────────────── */
  .history { margin-top: 18px; }
  .history h2 { margin: 0 0 6px; font-size: 13px; font-weight: 600; color: var(--ink); }
  .events { list-style: none; margin: 0; padding: 0; }
  .events li { display: grid; grid-template-columns: 112px minmax(0,1fr) 150px; gap: 16px; align-items: baseline;
               padding: 7px 0; border-bottom: 1px solid var(--line); }
  .events li:last-child { border-bottom: 0; }
  .when { font-size: 11px; color: var(--mute); white-space: nowrap; }
  .what { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--mute); font-size: 11.5px; }
  .what b { font-weight: 600; color: var(--ink); margin-right: 8px; }
  .where { font-size: 11.5px; color: var(--ink-2); text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .latest .when { color: var(--ink-2); }
  .empty { margin: 4px 0 0; color: var(--mute); font-size: 11.5px; }

  .spacer { flex: 1 0 14px; }

  /* ── Detachable label ───────────────────────────────────────────────── */
  .cut { display: flex; align-items: center; gap: 8px; color: var(--faint); font-size: 10px; }
  .cut svg { width: 14px; height: 14px; flex: none; }
  .cut::after { content: ""; flex: 1; border-top: 1px dashed #c4cad6; }
  .label { margin-top: 10px; border: 1.5px solid var(--ink); border-radius: 12px; overflow: hidden; }
  .label-body { display: grid; grid-template-columns: minmax(0,1fr) 128px; }
  .label-main { padding: 14px 18px 12px; border-right: 1.5px solid var(--ink); min-width: 0; }
  .ship-to { min-width: 0; }
  .ship-to .lbl { color: var(--ink-2); }
  .ship-to b { display: block; margin-top: 2px; font-size: 15px; font-weight: 700; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* Address on one line: the label is for the delivery driver, and the
     receipt above already carries it in full. */
  .to-addr { display: block; margin-top: 1px; font-size: 11.5px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .barcode-svg { display: block; width: 100%; height: 60px; margin-top: 10px; }
  .hri { margin-top: 5px; text-align: center; font-family: var(--mono); font-size: 11.5px; font-weight: 500; letter-spacing: .3em; }
  .label-side { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 12px; }
  .label-side img { width: 90px; height: 90px; image-rendering: pixelated; }
  .label-side span { font-size: 10px; color: var(--mute); }
  .label-foot { display: flex; justify-content: space-between; gap: 12px; padding: 7px 18px; background: var(--ink); color: #fff; font-size: 10.5px; }
  .label-foot span:last-child { color: #c9d1e3; }

  /* ── Footer ─────────────────────────────────────────────────────────── */
  .foot { margin-top: 14px; display: flex; justify-content: space-between; gap: 24px; align-items: flex-end; color: var(--mute); font-size: 9.5px; line-height: 1.55; }
  .foot b { color: var(--ink-2); font-weight: 600; }
  .foot .check { text-align: right; white-space: nowrap; }

  .toolbar { position: fixed; inset: 0 0 auto 0; z-index: 10; height: 56px; display: flex; align-items: center; justify-content: center; gap: 10px;
             background: rgba(255,255,255,.95); border-bottom: 1px solid var(--line); }
  .toolbar button { border: 1px solid #d0d5dd; border-radius: 8px; background: #fff; color: var(--ink); padding: 10px 18px; font: 600 12.5px/1 Inter, sans-serif; cursor: pointer; }
  .toolbar button.primary { background: var(--navy); border-color: var(--navy); color: #fff; }

  @page { size: letter portrait; margin: 0; }
  @media print {
    body { padding: 0; background: #fff; }
    /* A hair under 11in so the sheet can never round onto a second page. */
    .sheet { height: 10.99in; box-shadow: none; }
    .toolbar { display: none; }
  }
</style></head><body>
<div class="toolbar">
  <button type="button" class="primary" onclick="window.print()">Print / Save as PDF</button>
  <button type="button" onclick="window.close()">Close</button>
</div>
<main class="sheet">
  <header class="top">
    <div class="brand">${LOGO_SVG_STRING}<span class="wordmark">Bellmont Express</span></div>
    <div class="doc">
      <h1>Shipment receipt</h1>
      <p><span class="mono">${receiptNo}</span> · Issued ${escapeHtml(issued)}</p>
    </div>
  </header>

  <section class="hero">
    <div>
      <span class="lbl">Tracking number</span>
      <div class="tn">${tracking}</div>
      <span class="pill">${statusLabel}</span>
    </div>
    <div class="hero-r">
      <span class="lbl">${heroLabel}</span>
      <div class="eta">${heroDate}</div>
    </div>
  </section>

  <section class="journey" aria-label="Route and progress">
    <div class="ends">
      <div><span class="lbl">From</span><div class="city">${originCity}</div></div>
      ${ICONS.arrow}
      <div class="r"><span class="lbl">To</span><div class="city">${destCity}</div></div>
    </div>
    <ol class="steps">${stepper}</ol>
  </section>
  ${hold}

  <section class="parties">
    <div><span class="lbl">Sender</span><div class="name">${sender}</div><div class="addr">${senderAddress}</div></div>
    <div><span class="lbl">Recipient</span><div class="name">${receiver}</div><div class="addr">${receiverAddress}</div></div>
  </section>

  <section class="facts">
    <div><span class="lbl">Package</span><span class="val">${packageType}</span></div>
    <div><span class="lbl">Weight</span><span class="val">${escapeHtml(weight)}</span></div>
    <div><span class="lbl">Current location</span><span class="val">${location}</span></div>
    <div><span class="lbl">Last update</span><span class="val">${lastScan}</span></div>
  </section>

  <section class="history">
    <h2>Shipment history</h2>
    ${history}
  </section>

  <div class="spacer"></div>

  <div class="cut">${ICONS.scissors}Cut along the line and attach to the package</div>
  <section class="label" aria-label="Shipping label">
    <div class="label-body">
      <div class="label-main">
        <div class="ship-to"><span class="lbl">Ship to</span><b>${receiver}</b><span class="to-addr">${receiverLine}</span></div>
        ${code128Svg(shipment.trackingId)}
        <div class="hri">${tracking}</div>
      </div>
      <div class="label-side">
        ${opts.qrDataUrl ? `<img alt="QR code linking to tracking for ${tracking}" src="${opts.qrDataUrl}" />` : ""}
        <span>Scan to track</span>
      </div>
    </div>
    <div class="label-foot"><span>Bellmont Express · ${escapeHtml(host)}</span><span>${packageType} · ${escapeHtml(weight)} · from ${originCity}</span></div>
  </section>

  <footer class="foot">
    <span>This receipt shows the shipment as it was when issued. For the latest status, visit <b>${escapeHtml(host)}/tracking</b>.<br />
      Questions? Email <b>${SUPPORT_EMAIL}</b> and quote your tracking number.</span>
    <span class="check">Document check <b class="mono">${check}</b><br />Page 1 of 1</span>
  </footer>
</main>
<script>
/* fitToPage: the sheet is one fixed page. Shipment history is the only
   open-ended section, so if the page overflows, its oldest entries go first —
   then the section itself — rather than anything being cut off at the foot.
   Runs once fonts are in (they change heights) and again before printing. */
(function () {
  var sheet = document.querySelector('.sheet');
  function fit() {
    var rows = Array.prototype.slice.call(document.querySelectorAll('.events li'));
    while (sheet.scrollHeight > sheet.clientHeight + 1 && rows.length) rows.pop().remove();
    var list = document.querySelector('.events');
    if (list && !list.querySelector('li')) list.parentNode.remove();
  }
  function whenSet() {
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(fit, fit);
  }
  window.addEventListener('beforeprint', fit);
  /* After load, so the font stylesheet has declared its faces before
     fonts.ready is consulted. */
  if (document.readyState === 'complete') whenSet();
  else window.addEventListener('load', whenSet);
})();
</script>
</body></html>`;
}

/** The finished receipt for a shipment, QR code included. `issuedAt` is when
 *  the receipt was issued — now, or when it was sent to a customer's inbox. */
export async function receiptHtmlFor(shipment: Shipment, issuedAt = new Date()) {
  /* The public address, not window.location: a receipt printed from a
     .vercel.app or preview URL must still point customers at the real site. */
  const trackUrl = new URL("/tracking", SITE_URL);
  trackUrl.searchParams.set("id", shipment.trackingId);

  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(trackUrl.toString(), {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 300,
      color: { dark: NAVY, light: "#ffffff" },
    });
  } catch {
    // A receipt is still printable without the QR image.
  }
  return buildReceiptHtml(shipment, { siteOrigin: SITE_URL, qrDataUrl, issuedAt });
}

/** Opens a print-ready shipment receipt. Call only from a user gesture so the
 * browser is allowed to open the window. */
export async function openTrackingReceipt(shipment: Shipment, issuedAt = new Date()) {
  // The new document is written into this same-origin blank window. Do not use
  // `noopener` here: some browsers return a null WindowProxy when it is set,
  // making it impossible to populate the print sheet. The window is opened
  // before anything is awaited, while the click still counts as a gesture.
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  const html = await receiptHtmlFor(shipment, issuedAt);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}
