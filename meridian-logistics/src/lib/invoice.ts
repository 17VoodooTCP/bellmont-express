import type { Shipment } from "./api";
import { LOGO_SVG_STRING } from "@/components/Logo";

const TYPE_LABEL: Record<string, string> = {
  shipping_fee: "Shipping Fee",
  delay_fee: "Delay Fee",
  customs_fee: "Customs Fee",
  storage_fee: "Storage Fee",
  other: "Service Fee",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* Opens a print-ready, company-style invoice in a new tab.
   The browser's print dialog saves it as a PDF. */
export function openInvoice(shipment: Shipment) {
  const invoices = shipment.invoices ?? [];
  if (!invoices.length) return;

  const total = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const allPaid = invoices.every((i) => i.paid);
  const number = `MER-${shipment.trackingId.replace(/[^A-Z0-9]/g, "")}`;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const rows = invoices
    .map(
      (i, n) => `<tr>
        <td>${n + 1}</td>
        <td><strong>${esc(TYPE_LABEL[i.type ?? "other"] ?? "Service Fee")}</strong><br><span class="mut">${esc(i.description || "")}</span></td>
        <td>${i.createdAt ? new Date(i.createdAt).toLocaleDateString() : ""}</td>
        <td class="r">$${(i.amount || 0).toFixed(2)}</td>
        <td class="r">${i.paid ? '<span class="chip ok">PAID</span>' : '<span class="chip due">DUE</span>'}</td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${number} | Bellmont Express</title>
  <style>
    * { box-sizing: border-box; margin: 0; }
    body { font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif; color: #0a0a0a; padding: 48px; max-width: 820px; margin: 0 auto; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand b { font-size: 26px; letter-spacing: -0.02em; }
    .inv-title { text-align: right; }
    .inv-title h1 { font-size: 30px; letter-spacing: 0.08em; color: #61735a; }
    .mut { color: #6b7280; font-size: 12px; }
    .meta { display: flex; justify-content: space-between; margin-top: 40px; gap: 24px; }
    .meta h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #9ca3af; margin-bottom: 8px; }
    .meta p { font-size: 13.5px; line-height: 1.55; }
    table { width: 100%; border-collapse: collapse; margin-top: 36px; font-size: 13.5px; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; padding: 10px 12px; border-bottom: 2px solid #0a0a0a; }
    td { padding: 13px 12px; border-bottom: 1px solid #ececec; vertical-align: top; }
    .r { text-align: right; }
    th.r { text-align: right; }
    .chip { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; padding: 3px 9px; border-radius: 99px; }
    .chip.ok { background: #dcfce7; color: #15803d; }
    .chip.due { background: #ffedd5; color: #c2410c; }
    .totals { margin-top: 22px; margin-left: auto; width: 260px; font-size: 14px; }
    .totals div { display: flex; justify-content: space-between; padding: 8px 12px; }
    .totals .grand { border-top: 2px solid #0a0a0a; font-weight: 700; font-size: 17px; }
    .stamp { margin-top: 34px; display: inline-block; border: 3px solid ${allPaid ? "#15803d" : "#61735a"}; color: ${allPaid ? "#15803d" : "#61735a"}; font-weight: 800; letter-spacing: 0.2em; padding: 8px 22px; border-radius: 8px; transform: rotate(-3deg); }
    .foot { margin-top: 56px; padding-top: 18px; border-top: 1px solid #ececec; font-size: 11.5px; color: #6b7280; line-height: 1.7; }
    .bar { height: 6px; background: linear-gradient(90deg, #0a0a0a 0 55%, #61735a 55%); border-radius: 3px; margin-top: 18px; }
    @media print { body { padding: 24px; } .no-print { display: none; } }
    .no-print { position: fixed; top: 16px; right: 16px; }
    .no-print button { background: #0a0a0a; color: white; border: 0; border-radius: 99px; padding: 12px 22px; font-weight: 600; cursor: pointer; }
  </style></head><body>
  <div class="no-print"><button onclick="window.print()">Download PDF</button></div>
  <div class="head">
    <div>
      <div class="brand">${LOGO_SVG_STRING}<b>Bellmont Express</b></div>
      <p class="mut" style="margin-top:10px">Bellmont Express · bellmontexpress.com<br>support@bellmontexpress.com</p>
    </div>
    <div class="inv-title">
      <h1>INVOICE</h1>
      <p class="mut" style="margin-top:8px">No. <strong style="color:#0a0a0a">${number}</strong><br>Issued ${today}</p>
    </div>
  </div>
  <div class="bar"></div>
  <div class="meta">
    <div>
      <h2>Billed to</h2>
      <p><strong>${esc(shipment.receiverName || "Customer")}</strong><br>${esc(shipment.receiverAddress || "")}<br>${esc(shipment.destination?.city || "")}</p>
    </div>
    <div>
      <h2>Shipment</h2>
      <p>Tracking <strong>${esc(shipment.trackingId)}</strong><br>${esc(shipment.origin?.city || "")} to ${esc(shipment.destination?.city || "")}<br>${shipment.weight ? `${shipment.weight} lbs · ` : ""}${esc(shipment.packageType || "")}</p>
    </div>
    <div>
      <h2>Payment</h2>
      <p>Status: <strong>${allPaid ? "Paid in full" : "Balance due"}</strong><br>Terms: Net 14 days<br>Currency: USD</p>
    </div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Description</th><th>Date</th><th class="r">Amount</th><th class="r">Status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div><span class="mut">Subtotal</span><span>$${total.toFixed(2)}</span></div>
    <div><span class="mut">Tax</span><span>$0.00</span></div>
    <div class="grand"><span>Total</span><span>$${total.toFixed(2)}</span></div>
  </div>
  <br><span class="stamp">${allPaid ? "PAID" : "PAYMENT DUE"}</span>
  <div class="foot">
    Questions about this invoice? Contact support@bellmontexpress.com and quote invoice number ${number}.
    Unpaid balances may delay release of the shipment. Bellmont Express standard terms of carriage apply.
  </div>
  <script>document.title = "Bellmont Express Invoice ${number}";</script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
