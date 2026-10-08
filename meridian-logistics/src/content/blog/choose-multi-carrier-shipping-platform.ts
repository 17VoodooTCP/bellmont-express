import type { Block } from "@/lib/blog";

export const body: Block[] = [
  { p: "Working with a single carrier is simple, right up until it becomes expensive. Rates change every year, service quality varies by lane, and when that one carrier has a bad week, every order you ship has a bad week too. A multi-carrier shipping platform changes the question from 'which carrier do we use?' to 'which carrier is right for this shipment?'. This guide explains what these platforms do, how to compare them, and how to roll one out without disrupting customers." },

  { h: "Why single-carrier shipping stops working" },
  { p: "Most growing shippers start with one carrier because it is easy: one account, one label format, one pickup. The problems arrive as volume and geography grow." },
  { list: [
    "Price: no carrier is cheapest everywhere. Rates differ by zone, weight band and service, so a single carrier is often overpriced on some of your lanes.",
    "Performance: on-time performance varies by region and season. A carrier that is excellent on one coast may be weaker on another.",
    "Resilience: weather, peak season and network problems affect carriers differently. Having a second option ready keeps orders moving.",
    "Leverage: when you can move volume between carriers, you negotiate from a stronger position.",
  ] },

  { h: "What a multi-carrier platform actually does" },
  { p: "Different products describe themselves differently, but the useful ones share a core set of capabilities." },
  { list: [
    "Rate shopping: compares live prices and delivery dates across carriers and services for each shipment.",
    "Label creation: produces compliant labels for every carrier from one screen, including the right forms for international and regulated shipments.",
    "Rules and automation: chooses a carrier and service automatically based on conditions you set, such as the cheapest option that still arrives by a certain day.",
    "Tracking: brings tracking events from every carrier into one consistent view, so your team and your customers do not need to know which carrier is involved.",
    "Integrations: connects to your online store, order management or warehouse system, so orders arrive without anyone retyping addresses.",
    "Reporting: shows spend, on-time performance and exceptions by carrier, service and lane.",
  ] },

  { h: "The difference between rate shopping and real savings" },
  { p: "Rate shopping looks at the price a carrier quotes when the label is created. Real savings depend on what the shipment actually costs once it is delivered, which can be quite different." },
  { list: [
    "Dimensional weight: carriers bill the larger of actual weight and dimensional weight, calculated from the box size. A light, bulky box can cost far more than its weight suggests.",
    "Surcharges: residential delivery, delivery-area fees, fuel, additional handling and address corrections are often added after the fact.",
    "Failure costs: a cheaper service that arrives late or damaged produces refunds, reshipments and support time.",
  ] },
  { p: "When you evaluate a platform, check whether it shows these costs up front, and whether its reporting lets you compare what you expected to pay with what the carrier actually invoiced." },
  { note: "Ask any vendor to run a sample of your real historical shipments through their rating. Comparing on your own data is far more reliable than a demo with ideal examples." },

  { h: "Questions to ask before you commit" },
  { p: "Use these questions to separate the platforms that fit your operation from the ones that only look good in a demo." },
  { h: "Carriers and accounts" },
  { list: [
    "Which carriers and services are supported, including regional carriers that may be cheaper on your lanes?",
    "Can you connect your own carrier accounts and keep your negotiated rates, or must you use the platform's rates?",
    "If the platform offers its own discounted rates, what are the terms, and what happens if you leave?",
  ] },
  { h: "Rating accuracy" },
  { list: [
    "Do quoted rates include surcharges such as residential and fuel, or only the base rate?",
    "How does the platform handle dimensional weight, and can you store standard box sizes?",
    "Can it show delivery-date estimates, and how accurate have they proven to be?",
  ] },
  { h: "Automation" },
  { list: [
    "Can rules use the conditions that matter to you, such as destination, weight, order value, product type or required delivery date?",
    "Can a person easily override an automatic choice for an unusual order?",
    "Is there a record of why a particular carrier was chosen, so you can audit decisions later?",
  ] },
  { h: "Tracking and customer experience" },
  { list: [
    "How quickly do carrier tracking events appear, and are they shown in plain language?",
    "Can you send customers branded tracking pages and notifications instead of the carrier's?",
    "Can exceptions, such as a delay or failed delivery, trigger an alert to your team?",
  ] },
  { h: "Data, cost and support" },
  { list: [
    "How is the platform priced: per label, per month, or a percentage of shipping spend?",
    "Can you export your shipment and tracking history if you leave?",
    "What support is available during peak season, when problems cost the most?",
  ] },

  { h: "Designing your shipping rules" },
  { p: "Rules are where most of the value is. Good rules are simple, written down and reviewed regularly. A sensible starting set might look like this." },
  { steps: [
    "Decide the delivery promise for each type of order, such as 'standard orders within five business days' or 'perishables within two days'.",
    "For each promise, let the platform choose the cheapest service that meets the deadline.",
    "Add exceptions for products with special needs, such as fragile items, perishables or regulated goods, so they always use an approved service.",
    "Add a safety rule for high-value orders, such as requiring a signature or a specific carrier.",
    "Review the results monthly and adjust as rates and performance change.",
  ] },

  { h: "Rolling it out without upsetting customers" },
  { p: "Switching shipping systems touches every order, so roll it out in stages." },
  { steps: [
    "Run the new platform alongside your current process for a week, comparing quoted rates and chosen services without shipping through it.",
    "Move a single lane, product line or warehouse first, and keep the old process available as a fallback.",
    "Compare cost per order, on-time delivery and customer contacts against the old process.",
    "Expand to more lanes once the numbers hold up, and train each team before they switch.",
    "Turn off the old process only after a full cycle that includes a busy period.",
  ] },

  { h: "Measuring whether it worked" },
  { p: "Pick a small set of measures before you start, so you can tell whether the change paid off." },
  { list: [
    "Average cost per order, broken down by zone, so savings in one area are not hidden by growth in another.",
    "On-time delivery rate against the promise you made to the customer.",
    "Damage and claim rate.",
    "Customer contacts about shipping, especially 'where is my order' questions.",
    "Time spent by your team on shipping tasks each day.",
  ] },
  { p: "If cost falls but damage or late deliveries rise, the platform is moving cost rather than saving it. The aim is a lower cost for the same or better customer experience." },

  { h: "Where Bellmont fits" },
  { p: "Bellmont compares rates and delivery dates across carriers, applies the rules you set, and shows every shipment's handoffs on one live record, so your team and your customers see the same picture whichever carrier is moving the box." },
];
