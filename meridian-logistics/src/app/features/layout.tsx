import type { Metadata } from "next";

/* The page is a client component, so its metadata lives here. */
export const metadata: Metadata = {
  title: "Features | Bellmont Express",
  description: "Shipment tracking, weather-aware decisions, simple rules and accountable handoffs: everything you need to move freight right.",
  alternates: { canonical: "/features" },
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
