import type { Metadata } from "next";
import TrackingExperience from "@/components/TrackingExperience";

export const metadata: Metadata = {
  title: "Track a Shipment | Bellmont Express",
  description: "Live route, milestones and journey log for every Bellmont Express shipment.",
};

export default function TrackingPage() {
  return <TrackingExperience />;
}
