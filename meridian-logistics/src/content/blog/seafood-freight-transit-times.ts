import type { Block } from "@/lib/blog";

export const body: Block[] = [
  { p: "Seafood is one of the least forgiving products to ship. Quality drops with every hour out of temperature, so transit time is not just a delivery promise: it is part of the product. Seafood shippers that expand nationwide successfully tend to do the same handful of things well. This playbook sets them out, from the first hour after an order arrives to the moment the box is opened." },

  { h: "Why seafood is different" },
  { list: [
    "Fresh fish and shellfish are highly perishable and need to stay very cold, close to freezing without freezing, throughout the journey.",
    "Some fish, such as tuna, mackerel and mahi-mahi, can develop histamine if they are allowed to warm up, which can cause illness even after the fish is cooked. Temperature control is a safety issue, not only a quality one.",
    "Live shellfish need to stay cold and moist but must still be able to breathe, so they cannot simply be packed like fresh fillets.",
    "Frozen seafood must stay frozen solid; partial thawing and refreezing damages texture.",
  ] },
  { p: "Each category needs its own pack-out and its own service rules. Mixing them in one approach is where many problems start." },
  { note: "Follow the food-safety guidance that applies to your products and business, including any requirements for processors and handlers, and confirm the temperature limits for each species you sell." },

  { h: "Shorten the time before the first scan" },
  { p: "A surprising amount of transit time is lost before the carrier ever touches the box. Tightening this window is often the cheapest way to improve freshness." },
  { list: [
    "Pack to a fixed schedule built around the carrier's pickup time, rather than packing orders as they trickle in.",
    "Print labels as soon as orders are confirmed, so packed boxes are ready to hand over immediately.",
    "Keep packed orders in cold storage until the moment of pickup, not on a warm dock.",
    "Set a daily order cut-off that leaves enough time to pack properly before pickup.",
  ] },

  { h: "Build pack-outs for the slowest realistic journey" },
  { p: "Design each pack-out to hold temperature for longer than the advertised transit time, with room for a missed connection or a delivery attempt that fails." },
  { list: [
    "Fresh fish: insulated liner, refrigerant packs sized for the route, and a barrier so fillets never sit directly on frozen packs.",
    "Live shellfish: cold, moist packing that still lets the animals breathe, never sealed airtight and never submerged in fresh water.",
    "Frozen seafood: insulation and enough dry ice to stay frozen solid for the full journey, with the packaging and markings dry ice requires.",
  ] },
  { p: "Test each pack-out on real routes with a temperature logger, in both warm and cool weather, and document the final version so every packer builds it the same way." },

  { h: "Plan carriers by lane" },
  { p: "The fastest service is not always necessary, and the cheapest is rarely safe. Match the service to the distance and the product." },
  { list: [
    "Use the fastest reliable service on long lanes, where transit time matters most.",
    "Use slower, cheaper services on short lanes where they still arrive well inside the safe window.",
    "Compare carriers on each lane using delivered cost and on-time performance, not published rates.",
    "Avoid shipping late in the week, and avoid carrier holidays, so packages do not sit over a weekend.",
  ] },

  { h: "Consolidate to reach distant regions" },
  { p: "Shipping every order individually from one coastal facility to the far side of the country can be slow and expensive. Consolidation can help." },
  { list: [
    "Move product in bulk, under controlled temperature, to a fulfilment point closer to distant customers, and ship the final leg from there.",
    "Group orders for the same region into scheduled shipping days, so pack-outs and services can be tuned for that route.",
  ] },
  { p: "Consolidation works best where order volume in a region is steady enough to keep inventory fresh. For irregular demand, direct shipping with the right express service may still be the better choice." },

  { h: "Watch every milestone" },
  { p: "For perishable freight, knowing about a delay late is almost as bad as not knowing at all. Milestone visibility lets you act while the product is still good." },
  { steps: [
    "Track each handoff: pickup, departure, arrival at hubs, out for delivery, delivered.",
    "Set alerts for exceptions such as missed connections, weather delays and failed delivery attempts.",
    "When a delay appears, contact the carrier, alert the customer, and decide early whether to reship.",
    "Review exceptions weekly to find lanes, services or days of the week that cause repeat problems.",
  ] },

  { h: "Help the customer finish the job" },
  { p: "Even a perfect shipment can spoil on a doorstep. Tell customers when their order will arrive, send a notification on delivery, and print clear handling instructions on the box, such as 'refrigerate immediately' or, for live shellfish, how to store them until cooking." },

  { h: "Measure what matters" },
  { list: [
    "On-time delivery against the window the product can safely travel.",
    "Temperature excursions found in logger tests.",
    "Spoilage, refund and reshipment rates by lane and service.",
    "Time from order to first carrier scan.",
    "Cost per delivered order, including failures.",
  ] },
  { p: "Improving these together, rather than cutting cost alone, is what lets a seafood business grow its reach without growing its complaints." },

  { h: "Where Bellmont helps" },
  { p: "Bellmont compares services and delivery dates across carriers for every order and shows each shipment's handoffs on one live record, so a delayed box of seafood is visible while there is still time to act." },
];
