import OceanScene from "@/components/OceanScene";
import Reveal from "@/components/Reveal";
import ReviewsSection from "@/components/ReviewsSection";
import RotatingCards from "@/components/RotatingCards";
import PlatformShowcase from "@/components/PlatformShowcase";

const SERVICES = [
  {
    number: "01",
    title: "Ocean Freight",
    eyebrow: "Deep water / 180 ports",
    copy: "The long way around, made legible. Every container carries a live thread from gate-in to discharge.",
    icon: (
      <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden="true">
        <path d="M4 28h32l-4 7H9z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M10 28v-6h20v6M15 22v-5h10v5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Air Freight",
    eyebrow: "High altitude / 48 hours",
    copy: "When the clock becomes part of the cargo, we turn distance into a sequence of clean decisions.",
    icon: (
      <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden="true">
        <path d="M6 26 34 12M34 12l-6 14M34 12l-15 2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Road Freight",
    eyebrow: "Overland / 40 countries",
    copy: "The last moving line on the map. Human dispatch, live telematics, and no silent miles.",
    icon: (
      <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden="true">
        <rect x="4" y="14" width="20" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <path d="M24 18h7l4 5v3h-11z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
        <circle cx="11" cy="28" r="3" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <circle cx="29" cy="28" r="3" fill="none" stroke="currentColor" strokeWidth="2.4" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Rail Freight",
    eyebrow: "Inland / lower carbon",
    copy: "A quieter corridor for heavy things. Intermodal routes that make volume feel almost weightless.",
    icon: (
      <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden="true">
        <rect x="8" y="10" width="24" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <path d="M8 20h24M14 30l-3 4M26 30l3 4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

const STATS = [
  { value: "180+", label: "ports in the visible network" },
  { value: "1.2M", label: "containers given a live thread" },
  { value: "40", label: "countries connected by road" },
  { value: "99.2%", label: "of journeys arriving on time" },
];

const PEOPLE = [
  {
    id: "driver",
    caption: "Final mile",
    title: "A handoff is a human thing",
    body: "Every route eventually becomes a person at a door. We wait, confirm and log the moment the journey changes hands.",
    image: "/media/delivery-driver.webp",
  },
  {
    id: "family-handoff",
    caption: "Recipients",
    title: "The destination is a feeling",
    body: "Freight gets counted in containers. It gets remembered as a door opening, a deadline kept, a promise that made it through.",
    image: "/media/family-handoff.webp",
  },
  {
    id: "dispatch",
    caption: "Dispatch",
    title: "The network has a pulse",
    body: "Crane operators, drivers, planners and agents work from the same living record across four modes and one moving world.",
    image: "/media/dispatch-team.webp",
  },
  {
    id: "recipients",
    caption: "The people who receive",
    title: "Calm is the real delivery",
    body: "When the route is visible, the arrival feels simple. That quiet confidence is what the whole network is built to deliver.",
    image: "/media/happy-family.webp",
  },
  {
    id: "vessel",
    caption: "The long way around",
    title: "Distance, made legible",
    body: "The ocean is only the first chapter. A live record keeps every next handoff in view until the journey becomes yours again.",
    image: "/media/ship-real.webp",
  },
];

export default function Home() {
  return (
    <>
      <OceanScene />

      <section className="manifesto-rail border-y border-line bg-paper" aria-label="Bellmont Express point of view">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 md:grid-cols-[0.8fr_1.5fr_auto] md:items-center md:gap-10 md:py-10">
          <p className="section-kicker">Field note / 001</p>
          <p className="max-w-2xl text-lg leading-snug text-ink-soft md:text-xl">
            We do not move boxes from A to B. We choreograph the distance between
            two important moments.
          </p>
          <span className="hidden text-right text-[10px] font-semibold uppercase tracking-[0.25em] text-ink-mute md:block">
            04 modes<br />01 live record
          </span>
        </div>
      </section>

      <section id="services" className="service-field relative overflow-hidden bg-ink text-paper">
        <div className="service-field__glow pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5 py-28 md:py-36">
          <Reveal>
            <div className="grid gap-8 md:grid-cols-[0.8fr_1.5fr] md:items-end">
              <p className="section-kicker text-sage-soft">The operating system</p>
              <div>
                <h2 className="max-w-3xl text-4xl font-bold leading-[0.98] md:text-6xl">
                  Four ways through the world. One point of view.
                </h2>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-paper/65 md:text-lg">
                  The mode changes. The standard does not. We make the invisible
                  parts of freight visible enough to trust.
                </p>
              </div>
            </div>
          </Reveal>
          <div className="mt-16 grid gap-px overflow-hidden rounded-[2rem] border border-white/15 bg-white/15 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.08}>
                <div className="service-card group relative h-full p-7 md:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs font-semibold tracking-[0.2em] text-sage-soft">{s.number}</span>
                    <div className="text-paper/80 transition-colors group-hover:text-sage-soft">{s.icon}</div>
                  </div>
                  <p className="mt-14 text-[10px] font-semibold uppercase tracking-[0.22em] text-paper/45">{s.eyebrow}</p>
                  <h3 className="mt-3 text-xl font-semibold">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-paper/65">{s.copy}</p>
                  <span className="mt-8 block h-px w-10 bg-sage-soft/60 transition-all group-hover:w-20" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="network" className="stat-band border-y border-sage-deep/30 bg-sage text-ink">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-10 px-5 py-20 md:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="border-l border-ink/20 px-5 first:border-l-0 md:px-8">
                <p className="display text-5xl font-bold md:text-6xl">{s.value}</p>
                <p className="mt-3 max-w-[12rem] text-xs leading-relaxed text-ink/65">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="people" className="relative overflow-hidden bg-paper">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-28 md:py-36 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
          <Reveal>
            <p className="section-kicker text-sage">The human layer</p>
            <h2 className="mt-5 max-w-xl text-4xl font-bold leading-[0.98] md:text-6xl">
              The last hundred metres are still the whole point.
            </h2>
            <p className="mt-7 max-w-md text-base leading-relaxed text-ink-soft">
              A container can cross an ocean flawlessly and still fail at a front
              door. The network only counts when it becomes useful to a person.
            </p>
            <div className="mt-10 flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">
              <span className="h-px w-12 bg-sage" />
              Twelve thousand people, one living record
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="relative">
              <span className="pointer-events-none absolute -right-3 -top-16 hidden text-[8rem] font-bold leading-none text-sage-tint md:block">∞</span>
              <RotatingCards cards={PEOPLE} />
            </div>
          </Reveal>
        </div>
      </section>

      <ReviewsSection />

      <PlatformShowcase />
    </>
  );
}
