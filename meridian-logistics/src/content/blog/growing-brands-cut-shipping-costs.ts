import type { Block } from "@/lib/blog";

export const body: Block[] = [
  { p: "Expanding from a regional customer base to nationwide delivery changes the economics of every order. Distances grow, rates rise, transit times stretch, and the shortcuts that worked when most customers were nearby start costing real money. The good news is that shipping cost responds well to a methodical approach. This guide sets out the levers that matter, in roughly the order to pull them." },

  { h: "Know what you actually pay" },
  { p: "Before changing anything, get an accurate picture of current costs. An average cost per order hides most of the useful information, so break it down." },
  { list: [
    "By destination zone. Carriers price by distance band, so a handful of far-away zones often account for a disproportionate share of spend.",
    "By service level. Check how much volume goes on express services and whether those orders truly needed them.",
    "By box size. Compare billed weight with actual weight to see how much dimensional weight is costing you.",
    "By surcharge. Residential, delivery-area, fuel, additional handling and address-correction fees add up quickly and are easy to overlook.",
  ] },
  { p: "Compare the shipping costs you expected when labels were created with what the carriers actually invoiced. The gap is often larger than people expect, and it points directly at problems you can fix." },

  { h: "Right-size your packaging" },
  { p: "Carriers bill the greater of actual weight and dimensional weight, which is calculated from the box's volume. For lightweight products in large boxes, dimensional weight can be the biggest single cost driver." },
  { list: [
    "Keep a small range of box sizes that fit your common orders closely.",
    "Reduce void fill by choosing a box that matches the product, rather than filling a large box.",
    "Review your best-selling items and order combinations, and design packaging around them first.",
  ] },
  { note: "Smaller boxes can also reduce damage, because products have less room to move. Right-sizing often lowers both shipping cost and claims." },

  { h: "Use the right service for each order" },
  { p: "Express services are expensive. Many growing brands default to faster services out of caution, then keep using them out of habit. Set a delivery promise for each type of order, and choose the cheapest service that meets it." },
  { steps: [
    "Decide what delivery time each product type genuinely needs.",
    "For each order, compare the services that meet that deadline.",
    "Choose the cheapest one, and reserve express services for perishable, urgent or high-value orders.",
  ] },
  { p: "Ground services often arrive just as quickly as express services on short distances. Checking the actual delivery estimates, not just the service names, can reveal easy savings." },

  { h: "Compare carriers lane by lane" },
  { p: "No single carrier is cheapest everywhere. Rates and performance vary by region, weight and service. Comparing carriers on each lane, rather than choosing one for everything, usually lowers cost and improves reliability." },
  { list: [
    "National carriers offer broad coverage and a full range of services.",
    "Regional carriers can be cheaper and faster within their territory.",
    "Postal services can be economical for small, light parcels.",
  ] },
  { p: "A multi-carrier shipping platform makes lane-by-lane comparison practical, because it shows rates and delivery dates side by side for each order and can apply rules automatically." },

  { h: "Negotiate from data" },
  { p: "Carriers negotiate with shippers who know their numbers. Before talking to a carrier, gather your volume by zone, weight band and service, and your current effective rates including surcharges. Ask about discounts on the base rate and on the surcharges that affect you most. Being able to move volume to another carrier strengthens your position considerably." },

  { h: "Set shipping thresholds that reflect real costs" },
  { p: "Free shipping and flat rates are powerful for conversion, but they need to be set with real costs in mind." },
  { list: [
    "Set a free-shipping threshold high enough that the average qualifying order covers its shipping cost.",
    "Consider different thresholds or flat rates for distant zones, or for products that are expensive to ship.",
    "Encourage larger orders with bundles, which spread the fixed cost of packing and shipping across more items.",
  ] },

  { h: "Fulfil more efficiently" },
  { p: "Operational habits affect shipping cost too." },
  { list: [
    "Set a daily cut-off time, so orders are packed and handed over the same day rather than missing a pickup.",
    "Batch similar orders so packing is faster and more consistent.",
    "Verify addresses at checkout to avoid address-correction fees and failed deliveries.",
  ] },

  { h: "Consider where your inventory sits" },
  { p: "If a large share of orders travels to the far side of the country, a second fulfilment location closer to those customers can cut both cost and transit time. Before committing, compare the extra storage, handling and inventory costs against the shipping savings, and make sure order volume in that region is steady enough to keep the location stocked." },

  { h: "Measure, then repeat" },
  { p: "Shipping costs change every year and every peak season, so cost reduction is not a one-time project." },
  { list: [
    "Track cost per order by zone each month.",
    "Track on-time delivery and damage rates alongside cost, so savings never come at the customer's expense.",
    "Review carrier choices and shipping rules at least twice a year, including before peak season.",
  ] },
  { p: "A saving that increases damage or late deliveries is not a saving. The goal is a lower cost for the same, or better, customer experience." },

  { h: "Where Bellmont helps" },
  { p: "Bellmont compares rates across carriers for every order, applies the delivery-promise rules you set, and reports cost and on-time performance by lane, so you can see exactly where your shipping money goes as you grow." },
];
