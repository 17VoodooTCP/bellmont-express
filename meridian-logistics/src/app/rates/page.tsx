import type { Metadata } from "next";
import RatesContent from "@/components/RatesContent";

export const metadata: Metadata = {
  title: "Shipping Rate Calculator | Bellmont Express",
  description: "Compare overnight, 2-day and ground rates for perishable and standard shipments, and see what Bellmont can save you.",
  alternates: { canonical: "/rates" },
};

export default function RatesPage() {
  return <main className="rates-page"><RatesContent /></main>;
}
