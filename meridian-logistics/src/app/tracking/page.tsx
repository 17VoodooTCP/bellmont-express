import type { Metadata } from "next";
import TrackingExperience from "@/components/TrackingExperience";

export const metadata: Metadata = {
  title: "Track a Shipment | Bellmont Express",
  description: "Live route, milestones and journey log for every Bellmont Express shipment.",
};

export default function TrackingPage() {
  /* Cream ground taken from the monitoring illustration, so the tracking page
     reads as the same material as the artwork rather than plain white. */
  return (
    <div className="tracking-ground">
      <TrackingExperience />
    </div>
  );
}
