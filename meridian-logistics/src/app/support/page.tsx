import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support | Bellmont Express",
  description: "Get help with tracking, claims, documentation and billing. support@bellmontexpress.com",
};

const TOPICS = [
  { title: "Track a shipment", copy: "Enter your tracking number to see the live map, milestones and journey log.", href: "/tracking", cta: "Open tracking" },
  { title: "Claims", copy: "Report loss or damage within 30 days of delivery. Most claims resolve in under 10 business days.", href: "mailto:support@bellmontexpress.com?subject=Claim", cta: "Start a claim" },
  { title: "Documentation", copy: "Bills of lading, customs paperwork, certificates of origin. Request certified copies for any shipment.", href: "mailto:support@bellmontexpress.com?subject=Documentation%20request", cta: "Request documents" },
  { title: "Billing", copy: "Questions about an invoice, payment terms, or consolidated statements for high-volume accounts.", href: "mailto:support@bellmontexpress.com?subject=Billing", cta: "Contact billing" },
];

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-28 pt-32">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sage">Support</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-bold md:text-6xl">
        Real help, from real people.
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
        Our support team sits inside our operations centers, so the people who
        answer are the people who can act. Reach us any time at{" "}
        <a href="mailto:support@bellmontexpress.com" className="notranslate font-semibold text-sage hover:underline">
          support@bellmontexpress.com
        </a>{" "}
        or use live chat in the corner of every page.
      </p>

      <div className="mt-14 grid gap-5 sm:grid-cols-2">
        {TOPICS.map((t) => (
          <div key={t.title} className="flex flex-col rounded-2xl border border-line p-7">
            <h2 className="text-lg font-semibold">{t.title}</h2>
            <p className="mt-2.5 flex-1 text-sm leading-relaxed text-ink-soft">{t.copy}</p>
            <Link href={t.href} className="mt-5 text-sm font-semibold text-sage hover:underline">
              {t.cta} →
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-2xl bg-ocean p-7 text-sm text-ink-soft">
        <p className="font-semibold text-ink">Support hours</p>
        <p className="mt-1.5">
          Live chat and email: 24/7. Phone escalations: Monday to Saturday, 07:00 to 22:00 in your
          local gateway time zone.
        </p>
      </div>
    </div>
  );
}
