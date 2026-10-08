"use client";

/* Closing call to action — pill badge, two-tone headline, a ghost and a solid
   button. Mirrors the pattern the rest of the page already uses (hv2-eyebrow,
   hv2-h2, hv2-btn) rather than inventing a third button style. */

import Link from "next/link";

export default function FinalCta() {
  return (
    <section className="final-cta" aria-labelledby="final-cta-title">
      <div className="hv2-container">
        <span className="hv2-eyebrow final-cta-badge">
          <span className="hv2-eyebrow-dot" />
          Start moving freight smarter
        </span>

        <h2 id="final-cta-title" className="hv2-h2 final-cta-title">
          Ready to see every handoff
          <span> on one live record?</span>
        </h2>

        <p className="hv2-sec-sub final-cta-sub">
          Join the teams who stopped phoning around for status updates. Track a
          live shipment now, or walk through it with us.
        </p>

        <div className="final-cta-actions">
          <Link href="/book-demo" className="hv2-btn hv2-btn-ghost">
            <span aria-hidden="true">🗓</span> Book a demo
          </Link>
          <Link href="/tracking" className="hv2-btn hv2-btn-primary">
            Track a shipment <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
