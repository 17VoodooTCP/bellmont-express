/**
 * The site's one public address. Everything that prints or shares a link —
 * receipts, QR codes, metadata, the sitemap — uses this, never the address
 * the page happens to be open at, so a Vercel preview or .vercel.app URL
 * never ends up on a customer's document.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://bellmontexpress.com").replace(/\/+$/, "");

/** "bellmontexpress.com", for display. */
export const SITE_HOST = new URL(SITE_URL).host.replace(/^www\./, "");
