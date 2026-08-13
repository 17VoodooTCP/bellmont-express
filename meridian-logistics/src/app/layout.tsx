import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import BellmontChat from "@/components/BellmontChat";
import SiteChrome from "@/components/SiteChrome";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bellmontexpress.com"),
  alternates: { canonical: "/" },
  title: "Bellmont Express | The Future of Freight",
  description:
    "Bellmont Express moves the world's cargo: ocean, air, road and rail freight with live tracking, one platform, zero friction.",
  openGraph: {
    url: "https://bellmontexpress.com",
    siteName: "Bellmont Express",
    title: "Bellmont Express | The Future of Freight",
    description:
      "Ocean, air, road and rail freight with live tracking. One platform. Zero friction.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>
        {/* Google Translate mounts here, permanently invisible */}
        <div id="google_translate_element" aria-hidden="true" />
        <Script id="gt-init" strategy="afterInteractive">
          {`function googleTranslateElementInit(){new window.google.translate.TranslateElement({pageLanguage:'en',autoDisplay:false},'google_translate_element');}`}
        </Script>
        <Script
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
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
