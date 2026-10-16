import type { Metadata } from "next";

/* The page is a client component, so its metadata lives here. */
export const metadata: Metadata = {
  title: "Pricing | Bellmont Express",
  description: "Plans for teams that need clearer rates, safer cold-chain handoffs and one calm place to run every shipment.",
  alternates: { canonical: "/pricing" },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
