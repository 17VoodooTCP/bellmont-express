import type { Block } from "@/lib/blog";

export const body: Block[] = [
  { p: "UPS is one of the most widely used carriers for parcels and time-sensitive shipments, with services ranging from economical ground delivery to early-morning next-day air. For freight teams, especially those moving temperature-sensitive products, the challenge is choosing the service that gets a shipment there inside its safe window at a sensible cost. This guide explains the main options, what drives the price, and how to stay compliant." },

  { h: "A note on 'UPS Freight'" },
  { p: "If you are looking for less-than-truckload (LTL) freight, meaning palletised shipments too large for parcel networks, be aware that UPS sold its LTL business, formerly called UPS Freight, to TFI International in 2021. It now operates as TForce Freight. UPS itself focuses on parcel and express services, plus specialist offerings such as healthcare logistics. The rest of this guide covers UPS parcel and express shipping." },

  { h: "The main UPS services" },
  { p: "UPS services in the United States fall into a few broad tiers. Exact names, delivery commitments and availability vary by origin, destination and account, so always confirm the current options for your lanes." },
  { list: [
    "Ground services: the most economical choice for most parcels, with delivery times that depend on distance. UPS Ground and lower-cost options such as UPS Ground Saver fall here.",
    "Three-day: UPS 3 Day Select offers a defined delivery time at a lower price than two-day or overnight services.",
    "Two-day: UPS 2nd Day Air services, including a morning delivery option in many areas.",
    "Next-day: UPS Next Day Air services, from the more economical Next Day Air Saver to early-morning Next Day Air Early delivery.",
  ] },
  { p: "For perishable products, the right tier depends on how long your pack-out can hold temperature. A pack-out that safely lasts two days can use a two-day service to nearby regions; the same product may need next-day air to reach the far side of the country." },

  { h: "Temperature-sensitive shipping with UPS" },
  { p: "For many food shippers, temperature control comes from their own packaging: an insulated liner and the right coolant, shipped on a service fast enough to arrive before the coolant runs out. UPS also provides specialist temperature-controlled solutions, largely through UPS Healthcare, including offerings under the Temperature True name and priority-handling services for critical shipments. These are typically arranged per account, so speak to UPS about availability, requirements and pricing for your products and lanes." },
  { note: "Whatever the service, design your pack-out for the slowest realistic journey, not the advertised one, and test it with a temperature logger before you scale up." },

  { h: "What drives the cost" },
  { p: "The price of a UPS shipment is made up of several parts. Understanding each one is the key to controlling spend." },
  { list: [
    "Service level: faster services cost more, often significantly more.",
    "Zone: the distance between origin and destination, expressed as a zone number, has a large effect on price.",
    "Billed weight: the greater of actual weight and dimensional weight, which is calculated from the box's size.",
    "Surcharges: common examples include residential delivery, delivery-area surcharges for less accessible locations, a fuel surcharge that changes regularly, additional handling for heavy or awkward packages, and address corrections.",
    "Special handling: shipments containing regulated materials, such as dry ice, may carry additional charges and restrictions.",
  ] },
  { p: "Negotiated rates can differ substantially from published rates, especially for shippers with steady volume. Ask about discounts on both base rates and the surcharges that affect you most." },

  { h: "Staying compliant" },
  { p: "Shipments containing dry ice or other regulated materials must follow carrier rules and, where the package may travel by air, air-transport dangerous-goods requirements. For dry ice this generally means packaging that lets the gas escape, the correct markings including the UN number and net weight of dry ice in kilograms, and a Class 9 label for air. Some services have limits or restrictions on regulated contents." },
  { steps: [
    "Read UPS's current guidance for any regulated material you ship.",
    "Confirm that the service you plan to use accepts it.",
    "Train everyone who packs these shipments, and keep records of the training.",
    "Print labels and markings from a system that includes the required information, rather than writing them by hand.",
  ] },

  { h: "Packaging for UPS networks" },
  { p: "Parcels travel through automated sorting systems, which means they are conveyed, stacked and occasionally dropped. Packaging should be built for that journey." },
  { list: [
    "Use sturdy outer cartons rated for the weight of the contents.",
    "Fill empty space so items cannot shift.",
    "Right-size boxes to reduce dimensional weight and damage.",
    "Avoid irregular shapes where possible, as they may attract additional handling charges.",
  ] },

  { h: "Comparing UPS with other carriers" },
  { p: "No carrier is best on every lane. UPS may be the strongest option in some regions and services, while another national, regional or postal carrier is cheaper or faster elsewhere. Compare carriers on your own routes, using delivered cost and on-time performance rather than published rates, and revisit the comparison regularly." },

  { h: "Where Bellmont helps" },
  { p: "Bellmont shows UPS rates and delivery dates alongside other carriers for every shipment, so you can choose the service that meets your delivery window at the lowest real cost, and follow each package's handoffs on one live record." },
];
