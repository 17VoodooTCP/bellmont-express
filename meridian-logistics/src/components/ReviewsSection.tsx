"use client";

import { useEffect, useState } from "react";
import Reveal from "./Reveal";
import { loadReviews, Review } from "@/lib/reviews";

export function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
          <path
            d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9z"
            fill={i < n ? "#61735a" : "#e5e7eb"}
          />
        </svg>
      ))}
    </div>
  );
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>(() => loadReviews());

  useEffect(() => {
    // database is the source of truth once the API is awake
    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    fetch(`${api}/api/reviews`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list = Array.isArray(d) ? d : d?.reviews;
        if (Array.isArray(list) && list.length) setReviews(list);
      })
      .catch(() => {});
  }, []);

  return (
    <section id="reviews" className="border-y border-line bg-ocean">
      <div className="mx-auto max-w-6xl px-5 py-24 md:py-32">
        <Reveal>
          <div className="grid gap-7 md:grid-cols-[0.7fr_1.3fr] md:items-end">
            <p className="section-kicker text-sage">Proof of movement</p>
            <div>
              <h2 className="max-w-3xl text-4xl font-bold leading-[0.98] md:text-6xl">
                Good logistics leaves a different kind of trace.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
                The people closest to the cargo notice when the network starts to
                feel calm.
              </p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="review-window mt-12" aria-label="Customer reviews">
            <div className="review-track">
              {[...reviews, ...reviews].map((r, i) => (
                <figure key={`${r.id}-${i}`} className="review-card relative flex w-[min(82vw,22rem)] shrink-0 flex-col rounded-2xl border border-line bg-white p-7 shadow-[0_20px_50px_-36px_rgba(20,23,15,0.4)] md:w-[25rem]">
                  <span className="pointer-events-none absolute right-6 top-3 text-7xl font-bold leading-none text-sage-tint" aria-hidden="true">“</span>
                  <Stars n={r.stars} />
                  <blockquote className="mt-4 min-h-28 flex-1 text-sm leading-relaxed text-ink-soft">
                    &ldquo;{r.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    {/* plain img so uploaded data-URL avatars work too */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.avatar} alt={`Portrait of ${r.name}`} className="h-11 w-11 rounded-full object-cover" />
                    <span>
                      <span className="block text-sm font-semibold">{r.name}</span>
                      <span className="block text-xs text-ink-mute">{r.role}</span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
