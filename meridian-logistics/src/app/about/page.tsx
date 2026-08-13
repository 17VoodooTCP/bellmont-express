import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "About | Bellmont Express",
  description: "Why Bellmont Express exists: one platform for the world's freight, built by operators.",
};

const VALUES = [
  { title: "Visibility is a right", copy: "If it's your cargo, you should never have to ask where it is. Every Bellmont Express shipment reports its position, custody and condition in real time." },
  { title: "Operators first", copy: "Our software is designed at the quay, not in a boardroom. Crane operators, drivers and planners shape every release." },
  { title: "One accountable partner", copy: "Ocean, air, road and rail under a single contract. One invoice, one support line, one company answerable for the outcome." },
  { title: "Lower-carbon by default", copy: "Rail-first intermodal routing and slow-steaming options are built into our quoting engine, not hidden behind a request form." },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-28 pt-32">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sage">About Bellmont Express</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-bold md:text-6xl">
        Freight built the modern world. We&rsquo;re rebuilding freight.
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
        Bellmont Express began with a simple frustration: a container could cross three
        oceans, yet its owner couldn&rsquo;t answer the only question that
        matters: <em>where is it now?</em> Today we run an integrated network
        spanning 180 ports and 40 countries, moving 1.2 million containers a
        year with live, container-level visibility on every one.
      </p>

      <div className="relative mt-14 aspect-[21/9] overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1400&q=70&auto=format&fit=crop"
          alt="Bellmont Express container terminal operations"
          fill
          sizes="100vw"
          className="object-cover"
        />
      </div>

      <div className="mt-20 grid gap-5 sm:grid-cols-2">
        {VALUES.map((v) => (
          <div key={v.title} className="rounded-2xl border border-line p-7">
            <h2 className="text-lg font-semibold">{v.title}</h2>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{v.copy}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
