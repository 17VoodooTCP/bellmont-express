import type { Block } from "@/lib/blog";

export const body: Block[] = [
  { p: "Food and beverage brands that sell directly to customers face a harder shipping problem than most online retailers. Products are often heavy, sometimes fragile, frequently perishable, and the customer expects them to arrive looking exactly like the photographs. Shipping is not a back-office detail for these brands; it is part of the product. This guide covers the decisions that shape a reliable, affordable shipping operation." },

  { h: "Sort your catalogue by shipping needs" },
  { p: "Start by grouping products by how they need to travel, rather than by what they are. Most catalogues fall into a few groups." },
  { list: [
    "Shelf-stable and durable: dry goods, sealed snacks, coffee, spices. These can usually travel by ground in standard packaging.",
    "Fragile: glass bottles, jars and delicate baked goods. These need protective packaging and careful handling.",
    "Liquids: sauces, oils, drinks. These need leak protection and, for some, protection from freezing in winter.",
    "Temperature-controlled: chilled or frozen products. These need insulation, coolant and faster services.",
    "Regulated: alcohol and some other products have legal restrictions on who can ship them and where. Check the rules for every destination before selling.",
  ] },
  { p: "Once each product sits in a group, you can attach a shipping method to the group instead of deciding order by order. That consistency is what makes an operation scale." },
  { note: "Mixed orders are where most mistakes happen. Decide in advance how you will handle a cart that combines frozen and shelf-stable items: one box, two boxes, or the whole order at the fastest service." },

  { h: "Match the service to the product" },
  { p: "Paying for overnight delivery on a jar of jam that would arrive perfectly by ground is one of the most common ways food brands overspend. Equally, sending fresh products by ground to save money often costs more in spoilage and refunds than it saves." },
  { list: [
    "Ground services suit shelf-stable and durable goods where a few extra days do not matter.",
    "Two-day services suit chilled goods on moderate distances and products where freshness affects quality.",
    "Overnight services suit highly perishable and frozen goods, or long distances where a cold pack-out cannot last longer.",
  ] },
  { p: "The right answer can change by destination. A two-day service may be enough for nearby regions and too slow for the far side of the country. Many brands use a delivery-promise rule: choose the cheapest service that arrives within the time the product can safely travel." },

  { h: "Packaging is part of the product" },
  { p: "Packaging protects the goods, controls shipping cost and shapes the customer's first impression all at once." },
  { h: "Protect the product" },
  { list: [
    "Use dividers or molded inserts for bottles and jars so they cannot knock into each other.",
    "Seal liquids in leak-proof bags, so one broken jar does not ruin a whole order.",
    "Fill empty space so items cannot shift; movement inside the box causes most breakage.",
  ] },
  { h: "Control the cost" },
  { p: "Carriers bill the larger of actual weight and dimensional weight, which is calculated from the box's length, width and height. A large box with a light product inside can cost much more than its weight suggests. Keeping a small range of right-sized boxes is one of the most reliable ways to reduce shipping cost." },
  { h: "Delight the customer" },
  { p: "The unboxing is the first physical contact the customer has with your brand. Clear instructions, such as 'refrigerate on arrival', a simple card, and packaging that is easy to recycle all improve how the order is remembered, at very little cost." },

  { h: "Choosing carriers" },
  { p: "National carriers offer broad coverage and a wide range of services. Regional carriers can be cheaper and faster within their area. Many food brands use a national carrier as the default and add a regional carrier for lanes where it performs better." },
  { p: "Compare carriers on your own routes, using delivered cost and on-time performance rather than published rates. A multi-carrier shipping platform makes this comparison much easier, because it shows rates and delivery dates side by side for each order." },

  { h: "Insurance, claims and what happens when things go wrong" },
  { p: "Some shipments will arrive damaged or late. Planning for that keeps a bad delivery from becoming a lost customer." },
  { list: [
    "Know what each carrier covers by default and what extra protection costs. Default coverage may be limited, and perishable spoilage is often excluded.",
    "Keep photos and records from packing, so claims can be filed quickly with evidence.",
    "Decide your customer policy in advance: when you reship, when you refund, and when you offer a credit.",
    "Track the cost of failures alongside shipping costs, so you can see whether a cheaper service is truly cheaper.",
  ] },

  { h: "Give customers visibility" },
  { p: "Most 'where is my order?' messages disappear when customers can see accurate, up-to-date tracking. Showing tracking on your own branded page keeps customers in your experience rather than sending them to a carrier's site, and proactive delay notices turn an unpleasant surprise into a managed expectation." },
  { steps: [
    "Send an order confirmation that sets a realistic delivery window.",
    "Send a shipping notice with a link to a tracking page.",
    "Send a notice if the shipment is delayed, before the customer has to ask.",
    "For perishables, send a delivery notice so the customer can get the order into the refrigerator promptly.",
  ] },

  { h: "Building a repeatable operation" },
  { p: "As order volume grows, the operation needs to work the same way every day, whoever is packing." },
  { list: [
    "Document each pack-out with photos and quantities.",
    "Set daily cut-off times so orders are packed and handed to the carrier the same day.",
    "Review shipping cost, damage rate and on-time delivery every month.",
    "Revisit carrier choices at least once a year, and before peak season.",
  ] },

  { h: "Where Bellmont helps" },
  { p: "Bellmont brings carrier rates, shipping rules and tracking into one place, so you can send each product with the service it actually needs, and give customers a clear view of where their order is from checkout to doorstep." },
];
