import type { Metadata } from "next";

/* The page is a client component, so its metadata lives here. */
export const metadata: Metadata = {
  title: "Book a Demo | Bellmont Express",
  description: "Walk through rates, carrier connections, cold-chain controls and shipment handoffs with the Bellmont Express team.",
  alternates: { canonical: "/book-demo" },
};

export default function BookDemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
