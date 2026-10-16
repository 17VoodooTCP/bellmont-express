import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, Figtree } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import BellmontChat from "@/components/BellmontChat";
import SiteChrome from "@/components/SiteChrome";
import { WarmOnLoad } from "@/components/ApiWarmth";
import { SITE_URL } from "@/lib/site";
import { jsonLd, organization, website } from "@/lib/structuredData";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

/* Logo wordmark and language names. Variable font, so no weight list is
   needed; italic is requested alongside upright for the wordmark. */
const logo = Figtree({
  variable: "--font-logo",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

/* App-style viewport. viewport-fit=cover lets content use the full screen on
   notched phones (padded back in with safe-area insets), and
   resizes-content makes the on-screen keyboard shrink the layout instead of
   sliding over the chat composer.
   Deliberately no maximum-scale / user-scalable=no: that would block
   pinch-zoom for people who need to enlarge text. Tap-to-zoom is fixed at the
   source instead, by keeping every input at 16px on phones (globals.css). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#ffffff",
};

/* No canonical here: a layout's canonical is inherited by every page that
   doesn't set its own, and "/" would tell Google each of them is a copy of
   the homepage. Each public page declares its own instead. */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Bellmont Express | The Future of Freight",
  description:
    "Bellmont Express moves the world's cargo: ocean, air, road and rail freight with shipment tracking, one platform, zero friction.",
  openGraph: {
    url: SITE_URL,
    siteName: "Bellmont Express",
    title: "Bellmont Express | The Future of Freight",
    description:
      "Ocean, air, road and rail freight with shipment tracking. One platform. Zero friction.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${logo.variable}`}>
        {/* Who Bellmont is, for search engines and AI answers, on every page. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd({ "@graph": [organization, website] }) }}
        />
        {/* Google Translate mounts here, permanently invisible */}
        <div id="google_translate_element" aria-hidden="true" />
        <Script id="gt-init" strategy="afterInteractive">
          {`function googleTranslateElementInit(){new window.google.translate.TranslateElement({pageLanguage:'en',autoDisplay:false},'google_translate_element');}`}
        </Script>
        <Script
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
        {/* Wakes the free-tier API during first paint, so the boot happens
            while the visitor is reading rather than after they click. */}
        <WarmOnLoad />
        <SiteChrome><Nav /></SiteChrome>
        <main>{children}</main>
        <SiteChrome>
          <Footer />
          <BellmontChat />
        </SiteChrome>
      </body>
    </html>
  );
}
