import type { Block } from "@/lib/blog";

export const body: Block[] = [
  { p: "FedEx moves everything from small parcels to full pallets, with services that range from economical ground delivery to first-thing-in-the-morning overnight. Choosing well means matching each shipment to the service that keeps your promise to the customer, at a cost that makes sense. This guide covers the main FedEx options, the packaging and compliance details that keep shipments moving, and how to understand the bill." },

  { h: "Parcel, express and freight" },
  { p: "FedEx serves three broad kinds of shipment, and it helps to know which one you are dealing with." },
  { list: [
    "Ground parcels: everyday packages moving by truck, delivered in a time that depends on distance.",
    "Express parcels: time-definite services that typically use air for longer distances.",
    "Freight: larger, heavier and palletised shipments handled through FedEx's less-than-truckload (LTL) freight network, with its own pricing, packaging rules and booking process.",
  ] },
  { p: "This guide focuses mainly on parcel and express shipping, which is where most direct-to-customer brands operate." },

  { h: "The main FedEx services" },
  { p: "Service names, delivery commitments and availability vary by origin, destination and account, so always check the current options for your lanes." },
  { list: [
    "Ground services: FedEx Ground for business addresses and FedEx Home Delivery for residential addresses, plus economy options for lower-priority shipments.",
    "Three-day: FedEx Express Saver offers a defined delivery time at a lower price than two-day or overnight services.",
    "Two-day: FedEx 2Day and FedEx 2Day A.M.",
    "Overnight: FedEx Standard Overnight, FedEx Priority Overnight, and FedEx First Overnight for the earliest delivery.",
  ] },
  { p: "For perishable shipments, choose the slowest service that still arrives comfortably inside the time your packaging can hold temperature. Paying for first-overnight delivery on a shipment that would arrive safely by standard overnight is a common source of overspend." },

  { h: "Temperature-sensitive shipments" },
  { p: "Most food shippers manage temperature through their own packaging: an insulated liner plus the right coolant, on a service fast enough to arrive before the coolant runs out. FedEx also offers specialised temperature-controlled and healthcare logistics options for products that need tighter control. These are generally arranged per account, so ask FedEx what is available for your products and lanes." },
  { note: "Design your pack-out for the slowest realistic journey rather than the advertised transit time, and validate it with a temperature logger before you ship at scale." },

  { h: "Packaging requirements" },
  { p: "Packages pass through automated sorting, so packaging must stand up to conveyors, stacking and the occasional drop." },
  { list: [
    "Use outer cartons rated for the weight of the contents, and replace boxes that have been reused too many times.",
    "Fill empty space so items cannot shift, and cushion fragile items individually.",
    "Right-size boxes to reduce dimensional weight and damage.",
    "Seal liquids in leak-proof inner packaging.",
    "Avoid irregular shapes and very heavy packages where possible, as they can attract additional handling charges.",
  ] },

  { h: "Shipping regulated contents" },
  { p: "Dry ice and other regulated materials must follow carrier rules and, where shipments may travel by air, dangerous-goods requirements. For dry ice this generally means packaging that allows gas to escape, the correct markings including the UN number and the net weight of dry ice in kilograms, and a Class 9 label for air shipments. Not every service accepts every regulated item." },
  { steps: [
    "Check FedEx's current guidance for each regulated material you ship.",
    "Confirm the service you plan to use accepts it.",
    "Train everyone who packs these shipments.",
    "Generate labels and markings from your shipping system rather than by hand, so required details are never missed.",
  ] },

  { h: "Understanding the bill" },
  { p: "The final cost of a FedEx shipment includes more than the base rate. Reviewing invoices for these items regularly is one of the fastest ways to find savings." },
  { list: [
    "Billed weight: the greater of actual and dimensional weight.",
    "Zone: the distance band between origin and destination.",
    "Residential and delivery-area surcharges for homes and less accessible locations.",
    "A fuel surcharge that changes regularly.",
    "Additional handling for heavy, large or awkwardly shaped packages.",
    "Address corrections, which are avoidable with address validation at checkout.",
  ] },
  { p: "Negotiated rates can be considerably lower than published rates for shippers with consistent volume. Bring your shipping data, broken down by zone, weight and service, to any rate negotiation." },

  { h: "Plan around cut-off times and delivery windows" },
  { p: "Every pickup location has cut-off times, and every service has a delivery commitment. Align your fulfilment schedule with them." },
  { list: [
    "Set an internal cut-off for packing that leaves time before the carrier's pickup.",
    "Know which services deliver on Saturdays in your customers' areas, and what that costs.",
    "Avoid shipping perishables late in the week, so a delay does not strand them over a weekend.",
  ] },

  { h: "Comparing FedEx with other carriers" },
  { p: "No carrier is best on every route. FedEx may be the strongest choice for some lanes and services, while another carrier is cheaper or faster elsewhere. Compare carriers using delivered cost and on-time performance on your own routes, and review the comparison regularly as rates change." },

  { h: "Where Bellmont helps" },
  { p: "Bellmont shows FedEx rates and delivery dates alongside other carriers for each shipment, applies your shipping rules automatically, and tracks every handoff on one live record, so you can choose the right service with confidence." },
];
