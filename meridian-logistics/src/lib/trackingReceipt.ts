import QRCode from "qrcode";
import type { Shipment } from "./api";
import { STATUS_LABEL } from "./api";
import { LOGO_SVG_STRING } from "@/components/Logo";

/* ── Palette: the brand amber over the receipt's navy ─────────────────── */
const BRAND = "#f6a23a";
const NAVY = "#1d2b59";
const PAPER = "#f8fbff";
const SUPPORT_EMAIL = "support@bellmontexpress.com";

const escapeHtml = (value: string | undefined) =>
  (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

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
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  up: ICON(`<path d="M7 20V5M3.5 8.5 7 5l3.5 3.5M17 20V5M13.5 8.5 17 5l3.5 3.5"/>`),
  dry: ICON(`<path d="M3 12a9 9 0 0 1 18 0Z"/><path d="M12 12v6.5a2 2 0 0 1-4 0"/><path d="M12 3v.5"/>`),
  fragile: ICON(`<path d="M7 3h10l-1 7a4 4 0 0 1-8 0Z"/><path d="M12 14v7M8.5 21h7"/><path d="m11 3 1.5 3-2 2 1.5 2"/>`),
  stack: ICON(`<rect x="5" y="13" width="14" height="7" rx="1"/><path d="M12 3v7M8.5 6.5 12 10l3.5-3.5"/>`),
  scissors: ICON(`<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>`),
  shield: ICON(`<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6Z"/><path d="m9 12 2 2 4-4"/>`),
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
  pending: { bg: "#eef1f7", fg: "#3d4c70", dot: "#7f8bab" },
  picked_up: { bg: "#e8effd", fg: "#21428f", dot: "#3a62c4" },
  in_transit: { bg: "#e8effd", fg: "#21428f", dot: "#3a62c4" },
  out_for_delivery: { bg: "#fff3e0", fg: "#8a4f04", dot: BRAND },
  delivered: { bg: "#e4f5ea", fg: "#17663a", dot: "#239152" },
  on_hold: { bg: "#fdeaea", fg: "#9b1f1f", dot: "#d23b3b" },
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
  const host = new URL(opts.siteOrigin).host;
  const tracking = escapeHtml(shipment.trackingId);
  const sender = escapeHtml(shipment.senderName || "Sender");
  const receiver = escapeHtml(shipment.receiverName || "Recipient");
  const originCity = escapeHtml(shipment.origin?.city || "Origin pending");
  const destCity = escapeHtml(shipment.destination?.city || "Destination pending");
  const senderAddress = escapeHtml(shipment.senderAddress || shipment.origin?.city || "");
  const receiverAddress = escapeHtml(shipment.receiverAddress || shipment.destination?.city || "");
  const packageType = escapeHtml(shipment.packageType || "Parcel");
  const weight = shipment.weight ? `${shipment.weight} lb` : "Not specified";
  const status = shipment.status;
  const statusLabel = escapeHtml(STATUS_LABEL[status] ?? status.replaceAll("_", " "));
  const tone = STATUS_TONE[status] ?? STATUS_TONE.pending;
  const eta = escapeHtml(formatDate(shipment.estimatedDelivery));
  const location = escapeHtml(shipment.currentLocation?.city || shipment.origin?.city || "Origin pending");

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
    .slice(0, 5);
  const lastScan = events[0] ? escapeHtml(formatStamp(events[0].timestamp)) : "Awaiting first scan";

  /* ── Progress stepper ── */
  const held = status === "on_hold";
  const current = held ? STEPS.indexOf("in_transit") : Math.max(0, STEPS.indexOf(status));
  const pct = (current / (STEPS.length - 1)) * 100;
  const stepper = STEPS.map((s, i) => {
    const state = i < current ? "done" : i === current ? (held ? "held" : "now") : "todo";
    const label = i === current && held ? "On hold" : STEP_LABEL[s];
    return `<li class="step ${state}"><span class="node"></span><span class="lbl">${label}</span></li>`;
  }).join("");

  const hold = held && shipment.holdReason
    ? `<div class="notice" role="note"><span class="notice-tag">Hold notice</span><span class="notice-body">${escapeHtml(shipment.holdReason)}</span></div>`
    : "";

  const history = events.length
    ? `<section class="field history"><header class="fh"><span class="no">05</span>Movement history</header>
        <table><thead><tr><th>Date &amp; time</th><th>Event</th><th>Location</th><th>Detail</th></tr></thead><tbody>${events.map((e) => `
          <tr><td class="t">${escapeHtml(formatStamp(e.timestamp))}</td><td class="ev">${escapeHtml(STATUS_LABEL[e.status as Shipment["status"]] ?? e.status.replaceAll("_", " "))}</td><td>${escapeHtml(e.location || "—")}</td><td class="dt">${escapeHtml(e.description || "")}</td></tr>`).join("")}
        </tbody></table></section>`
    : `<section class="field history empty"><header class="fh"><span class="no">05</span>Movement history</header><p>No scans recorded yet. Events appear here and at ${escapeHtml(host)}/tracking as the shipment moves.</p></section>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<!-- Laid out at the sheet's own width, so a phone scales the page to fit
     rather than reflowing or cropping it — on screen and when printing. -->
<meta name="viewport" content="width=816" />
<title>Shipment receipt ${tracking} · Bellmont Express</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet" />
<style>
  :root {
    --navy: ${NAVY}; --navy-2: #2b3f78; --amber: ${BRAND};
    --ink: #121a33; --ink-2: #3b4664; --mute: #6b7591; --faint: #98a1b8;
    --rule: #d9deea; --rule-2: #eceff5; --wash: #f5f7fb;
    --mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Consolas, monospace;
  }
  * { box-sizing: border-box; }
  /* Print every colour as designed: browsers strip backgrounds by default,
     which takes the navy bands, the status colours and the stepper with them. */
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { margin: 0; }
  body { padding: 72px 0 40px; background: ${PAPER}; color: var(--ink);
         font: 400 11px/1.45 Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
         -webkit-font-smoothing: antialiased; font-feature-settings: "tnum" 1, "cv11" 1; }

  /* The page is a fixed Letter sheet. A sheet allowed to grow taller than the
     paper prints as a page plus a blank spill page. */
  .sheet { position: relative; width: 8.5in; height: 11in; margin: 0 auto; background: #fff;
           box-shadow: 0 1px 2px rgba(18,26,51,.06), 0 24px 60px rgba(18,26,51,.14); overflow: hidden;
           display: flex; flex-direction: column; padding: 0.42in 0.5in 0.36in; }
  .sheet > * { flex-shrink: 0; }

  /* ── Masthead ───────────────────────────────────────────────────────── */
  .mast { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand svg { width: 52px; height: 41px; }
  .wordmark { font-size: 22px; font-weight: 700; font-style: italic; letter-spacing: -.03em; color: #49629d; line-height: 1; }
  .tagline { margin-top: 6px; font-size: 8px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: var(--mute); }
  .doc-title { text-align: right; }
  .doc-title h1 { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--navy); line-height: 1; }
  .doc-title p { margin: 6px 0 0; font-size: 8.5px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--mute); }
  .bar { margin-top: 14px; height: 3px; background: var(--navy); }
  .bar + .bar { margin-top: 2px; height: 1.5px; background: linear-gradient(90deg, var(--amber), #ffd56d 50%, var(--amber)); }

  /* ── Document control strip ─────────────────────────────────────────── */
  .control { margin-top: 12px; display: grid; grid-template-columns: 1.15fr 1.25fr 1.35fr 1fr 1.05fr; border: 1px solid var(--rule); border-radius: 6px; }
  .control > div { padding: 8px 11px 9px; min-width: 0; }
  .control > div + div { border-left: 1px solid var(--rule); }
  .k { display: block; font-size: 7.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--mute); }
  .v { display: block; margin-top: 3px; font-size: 11px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .v.mono { font-family: var(--mono); font-size: 11.5px; letter-spacing: .02em; }
  .pill { display: inline-flex; align-items: center; gap: 6px; margin-top: 3px; padding: 2px 8px 2px 7px; border-radius: 999px; background: ${tone.bg}; color: ${tone.fg}; font-size: 9px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
  .pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: ${tone.dot}; }

  /* ── Numbered form fields ───────────────────────────────────────────── */
  .field { border: 1px solid var(--rule); border-radius: 6px; overflow: hidden; }
  .fh { display: flex; align-items: center; gap: 8px; padding: 6px 11px; background: var(--wash); border-bottom: 1px solid var(--rule);
        font-size: 8px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: var(--ink-2); }
  .fh .no { display: inline-grid; place-items: center; width: 17px; height: 15px; border-radius: 3px; background: var(--navy); color: #fff; font-family: var(--mono); font-size: 8px; letter-spacing: 0; }
  .fb { padding: 9px 11px 10px; }

  .parties { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .party .name { font-size: 14px; font-weight: 700; line-height: 1.25; color: var(--ink);
                 display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; overflow-wrap: anywhere; }
  .party .addr { margin-top: 4px; color: var(--ink-2); font-size: 10.5px; line-height: 1.5; white-space: pre-line; overflow-wrap: anywhere;
                 display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; min-height: 47px; }

  /* ── Route and progress ─────────────────────────────────────────────── */
  .route { margin-top: 12px; padding: 13px 16px 12px; border-radius: 6px; background: linear-gradient(115deg, var(--navy), var(--navy-2)); color: #fff; }
  .route-head { display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 16px; }
  .city { font-size: 19px; font-weight: 800; letter-spacing: -.01em; line-height: 1.1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .city-k { display: block; margin-bottom: 3px; font-size: 7.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #aebde0; }
  .route-head .to { text-align: right; }
  .eta { text-align: center; padding-bottom: 2px; }
  .eta b { display: block; font-size: 12px; font-weight: 700; color: #fff; }
  .eta span { font-size: 7.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #ffcf86; }
  .steps { list-style: none; margin: 13px 0 0; padding: 0; position: relative; display: grid; grid-template-columns: repeat(${STEPS.length}, 1fr); }
  .steps::before, .steps::after { content: ""; position: absolute; top: 5px; height: 2px; left: 10%; border-radius: 2px; }
  .steps::before { right: 10%; background: rgba(255,255,255,.18); }
  .steps::after { width: calc(80% * ${pct.toFixed(2)} / 100); background: ${held ? "#ff8f8f" : "var(--amber)"}; }
  .step { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .node { width: 12px; height: 12px; border-radius: 50%; background: var(--navy-2); border: 2px solid rgba(255,255,255,.35); }
  .done .node { background: var(--amber); border-color: var(--amber); }
  .now .node { background: #fff; border-color: var(--amber); box-shadow: 0 0 0 3px rgba(246,162,58,.35); }
  .held .node { background: #fff; border-color: #ff8f8f; box-shadow: 0 0 0 3px rgba(255,143,143,.35); }
  .lbl { font-size: 8px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #9fb0d6; white-space: nowrap; }
  .done .lbl { color: #dbe4f7; } .now .lbl { color: #fff; } .held .lbl { color: #ffb4b4; }

  .notice { margin-top: 10px; display: flex; gap: 12px; align-items: baseline; padding: 8px 12px; border-left: 3px solid #d23b3b; border-radius: 0 6px 6px 0; background: #fdf1f1; color: #7d1a1a; font-size: 10.5px; line-height: 1.45; }
  .notice-tag { flex: none; font-size: 7.5px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #9b1f1f; }
  .notice-body { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }

  /* ── Shipment and delivery facts ────────────────────────────────────── */
  .facts { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .kv { display: grid; grid-template-columns: 1fr 1fr; }
  .kv > div { padding: 8px 11px; min-width: 0; border-bottom: 1px solid var(--rule-2); }
  .kv > div:nth-child(odd) { border-right: 1px solid var(--rule-2); }
  .kv > div:nth-last-child(-n+2) { border-bottom: 0; }

  /* ── Movement history ───────────────────────────────────────────────── */
  .history { margin-top: 12px; }
  .history table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .history th { padding: 6px 11px; text-align: left; font-size: 7.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--mute); border-bottom: 1px solid var(--rule); }
  .history th:nth-child(1) { width: 122px; } .history th:nth-child(2) { width: 104px; } .history th:nth-child(3) { width: 150px; }
  .history td { padding: 6px 11px; font-size: 10px; color: var(--ink-2); border-bottom: 1px solid var(--rule-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .history tr:last-child td { border-bottom: 0; }
  .history td.t { font-family: var(--mono); font-size: 9.5px; color: var(--mute); }
  .history td.ev { font-weight: 700; color: var(--ink); }
  .history.empty p { margin: 0; padding: 10px 11px; color: var(--mute); font-size: 10px; }

  .spacer { flex: 1 0 12px; }

  /* ── Detachable label ───────────────────────────────────────────────── */
  .cut { display: flex; align-items: center; gap: 8px; color: var(--faint); font-size: 7.5px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; }
  .cut svg { width: 13px; height: 13px; flex: none; }
  .cut::after { content: ""; flex: 1; border-top: 1px dashed #b9c1d4; }
  .label { margin-top: 8px; border: 2px solid var(--ink); border-radius: 6px; overflow: hidden; }
  .label-top { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: var(--ink); color: #fff;
               font-size: 8.5px; font-weight: 800; letter-spacing: .2em; text-transform: uppercase; }
  .label-top span:last-child { color: #ffcf86; }
  .label-body { display: grid; grid-template-columns: 1fr 108px; }
  .label-main { padding: 10px 14px 9px; border-right: 2px solid var(--ink); min-width: 0; }
  .label-row { display: grid; grid-template-columns: 1.3fr 1fr; gap: 14px; align-items: end; }
  .ship-to .k { color: var(--ink); }
  .ship-to b { display: block; margin-top: 2px; font-size: 13px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ship-to span { display: block; font-size: 10px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tn { text-align: right; }
  .tn b { display: block; margin-top: 2px; font-family: var(--mono); font-size: 16px; font-weight: 600; letter-spacing: .06em; }
  .barcode-svg { display: block; width: 100%; height: 62px; margin-top: 9px; }
  .hri { margin-top: 4px; text-align: center; font-family: var(--mono); font-size: 11px; font-weight: 600; letter-spacing: .32em; }
  .label-side { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; padding: 8px; }
  .label-side img { width: 88px; height: 88px; image-rendering: pixelated; }
  .label-side span { font-size: 7px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--mute); text-align: center; }
  .handling { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 2px solid var(--ink); }
  .handling div { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 4px; font-size: 7.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--ink); }
  .handling div + div { border-left: 1px solid var(--rule); }
  .handling svg { width: 15px; height: 15px; flex: none; color: var(--ink); }

  /* ── Footer ─────────────────────────────────────────────────────────── */
  .foot { margin-top: 10px; display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: end; color: var(--mute); font-size: 8px; line-height: 1.5; }
  .foot .verify { display: flex; align-items: center; gap: 6px; text-align: right; }
  .foot .verify svg { width: 14px; height: 14px; color: var(--navy); flex: none; }
  .foot b { color: var(--ink-2); font-weight: 700; }
  .foot .mono { font-family: var(--mono); letter-spacing: .04em; }

  .toolbar { position: fixed; inset: 0 0 auto 0; z-index: 10; height: 56px; display: flex; align-items: center; justify-content: center; gap: 10px;
             background: rgba(255,255,255,.95); border-bottom: 1px solid var(--rule); }
  .toolbar button { border: 1px solid #c9d0e0; border-radius: 6px; background: #fff; color: var(--ink); padding: 10px 18px; font: 700 12.5px/1 Inter, sans-serif; cursor: pointer; }
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
  <header class="mast">
    <div>
      <div class="brand">${LOGO_SVG_STRING}<span class="wordmark">Bellmont Express</span></div>
      <div class="tagline">One shared record for every handoff</div>
    </div>
    <div class="doc-title"><h1>Shipment receipt</h1><p>Proof of tender · Customer copy</p></div>
  </header>
  <div class="bar"></div><div class="bar"></div>

  <section class="control">
    <div><span class="k">Receipt no.</span><span class="v mono">${receiptNo}</span></div>
    <div><span class="k">Issued</span><span class="v">${escapeHtml(issued)}</span></div>
    <div><span class="k">Tracking no.</span><span class="v mono">${tracking}</span></div>
    <div><span class="k">Service</span><span class="v">Express parcel</span></div>
    <div><span class="k">Status</span><span class="pill">${statusLabel}</span></div>
  </section>

  <section class="parties">
    <div class="field party"><header class="fh"><span class="no">01</span>Shipper</header>
      <div class="fb"><div class="name">${sender}</div><div class="addr">${senderAddress}</div></div></div>
    <div class="field party"><header class="fh"><span class="no">02</span>Consignee</header>
      <div class="fb"><div class="name">${receiver}</div><div class="addr">${receiverAddress}</div></div></div>
  </section>

  <section class="route" aria-label="Route and progress">
    <div class="route-head">
      <div><span class="city-k">Origin</span><div class="city">${originCity}</div></div>
      <div class="eta"><span>Estimated delivery</span><b>${eta}</b></div>
      <div class="to"><span class="city-k">Destination</span><div class="city">${destCity}</div></div>
    </div>
    <ol class="steps">${stepper}</ol>
  </section>
  ${hold}

  <section class="facts">
    <div class="field"><header class="fh"><span class="no">03</span>Shipment details</header>
      <div class="kv">
        <div><span class="k">Package</span><span class="v">${packageType}</span></div>
        <div><span class="k">Weight</span><span class="v">${escapeHtml(weight)}</span></div>
        <div><span class="k">Origin</span><span class="v">${originCity}</span></div>
        <div><span class="k">Destination</span><span class="v">${destCity}</span></div>
      </div></div>
    <div class="field"><header class="fh"><span class="no">04</span>Delivery</header>
      <div class="kv">
        <div><span class="k">Estimated delivery</span><span class="v">${eta}</span></div>
        <div><span class="k">Current status</span><span class="v">${statusLabel}</span></div>
        <div><span class="k">Current location</span><span class="v">${location}</span></div>
        <div><span class="k">Last scan</span><span class="v">${lastScan}</span></div>
      </div></div>
  </section>

  ${history}

  <div class="spacer"></div>

  <div class="cut">${ICONS.scissors}Detach and affix to package</div>
  <section class="label" aria-label="Shipping label">
    <div class="label-top"><span>Bellmont Express</span><span>Express parcel</span></div>
    <div class="label-body">
      <div class="label-main">
        <div class="label-row">
          <div class="ship-to"><span class="k">Ship to</span><b>${receiver}</b><span>${destCity}</span></div>
          <div class="tn"><span class="k">Tracking no.</span><b>${tracking}</b></div>
        </div>
        ${code128Svg(shipment.trackingId)}
        <div class="hri">${tracking}</div>
      </div>
      <div class="label-side">
        ${opts.qrDataUrl ? `<img alt="QR code linking to tracking for ${tracking}" src="${opts.qrDataUrl}" />` : ""}
        <span>Scan to track</span>
      </div>
    </div>
    <div class="handling">
      <div>${ICONS.up}This side up</div>
      <div>${ICONS.dry}Keep dry</div>
      <div>${ICONS.fragile}Fragile</div>
      <div>${ICONS.stack}Do not stack</div>
    </div>
  </section>

  <footer class="foot">
    <span>This receipt records the shipment as it stood when printed. Live tracking at <b>${escapeHtml(host)}/tracking</b> is the authoritative status.
      Questions: <b>${SUPPORT_EMAIL}</b>.</span>
    <span class="verify">${ICONS.shield}<span>Document check <b class="mono">${check}</b><br />Page 1 of 1</span></span>
  </footer>
</main>
<script>
/* fitToPage: the sheet is one fixed page. Movement history is the only
   open-ended section, so if the page overflows, its oldest rows go first —
   then the table itself — rather than anything being cut off at the foot.
   Runs once fonts are in (they change heights) and again before printing. */
(function () {
  var sheet = document.querySelector('.sheet');
  function fit() {
    var rows = Array.prototype.slice.call(document.querySelectorAll('.history tbody tr'));
    while (sheet.scrollHeight > sheet.clientHeight + 1 && rows.length) rows.pop().remove();
    var table = document.querySelector('.history table');
    if (table && !table.querySelector('tbody tr')) table.parentNode.remove();
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
  const trackUrl = new URL("/tracking", window.location.origin);
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
  return buildReceiptHtml(shipment, { siteOrigin: window.location.origin, qrDataUrl, issuedAt });
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
