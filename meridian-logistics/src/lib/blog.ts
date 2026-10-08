/* Blog articles. Server-side only: pages import this and hand the client a
   slim summary (see `summaries()`), so article bodies never ship in the
   homepage or index bundles.

   Reading time is computed from the actual text rather than stated, so it
   stays honest as articles are edited.

   Carrier rules, hazmat requirements and border regulations change; anything
   regulatory here is written at the level that stays true and points readers
   to the carrier or regulator for current specifics. */

import type { Category } from "./blog-categories";
export { CATEGORIES, type Category } from "./blog-categories";

/* Article bodies live one file per article in src/content/blog. */
import { body as shipTemperatureSensitiveFreightBody } from "@/content/blog/ship-temperature-sensitive-freight";
import { body as chooseMultiCarrierShippingPlatformBody } from "@/content/blog/choose-multi-carrier-shipping-platform";
import { body as freightShippingSolutionsDtcFoodBeverageBody } from "@/content/blog/freight-shipping-solutions-dtc-food-beverage";
import { body as shipFoodWithoutDryIceBody } from "@/content/blog/ship-food-without-dry-ice";
import { body as growingBrandsCutShippingCostsBody } from "@/content/blog/growing-brands-cut-shipping-costs";
import { body as upsFreightShippingGuideBody } from "@/content/blog/ups-freight-shipping-guide";
import { body as shipFreightToCanadaBody } from "@/content/blog/ship-freight-to-canada";
import { body as fedexFreightShippingGuideBody } from "@/content/blog/fedex-freight-shipping-guide";
import { body as seafoodFreightTransitTimesBody } from "@/content/blog/seafood-freight-transit-times";

/* h: section heading (also feeds the "On this page" list)
   p: paragraph · list: bullets · steps: numbered steps
   note: a highlighted tip or warning
   table: a comparison table · faq: questions and answers (also emitted as
   FAQPage structured data for search engines) */
export type Block =
  | { h: string }
  | { p: string }
  | { list: string[] }
  | { steps: string[] }
  | { note: string }
  | { table: { caption: string; head: string[]; rows: string[][] } }
  | { faq: { q: string; a: string }[] };

export type Post = {
  slug: string;
  date: string;
  title: string;
  summary: string;
  image: string;
  category: Category;
  body: Block[];
};

export type PostSummary = Omit<Post, "body"> & { minutes: number };

/* Newest first: the homepage shows the first few, so order matters. */
export const POSTS: Post[] = [
  {
    slug: "ship-temperature-sensitive-freight",
    date: "Apr 28, 2026",
    title: "How to Ship Temperature-Sensitive Freight: Packaging, Dry Ice, Costs & Step-by-Step Guide",
    summary: "Ship temperature-sensitive freight safely with this complete guide. Cover packaging specs, dry ice quantities, labeling compliance, shipping schedules, and a practical pack-out process.",
    image: "/media/bellmont-blog-1.jpg",
    category: "Cold Chain & Packaging",
    body: shipTemperatureSensitiveFreightBody,
  },
  {
    slug: "choose-multi-carrier-shipping-platform",
    date: "Feb 20, 2026",
    title: "How to Choose a Multi-Carrier Shipping Platform for Modern Logistics",
    summary: "Discover how multi-carrier shipping software leads to cost-effective operations that streamline freight management and delivery visibility.",
    image: "/media/bellmont-blog-2.jpg",
    category: "Optimization Strategy",
    body: chooseMultiCarrierShippingPlatformBody,
  },
  {
    slug: "freight-shipping-solutions-dtc-food-beverage",
    date: "Feb 7, 2026",
    title: "Freight Shipping Solutions: A Guide for DTC Food & Beverage Brands",
    summary: "Learn how growing brands manage freight shipping with the right packaging, carriers, insurance, and shipment visibility tools.",
    image: "/media/bellmont-blog-3.jpg",
    category: "Freight Fundamentals",
    body: freightShippingSolutionsDtcFoodBeverageBody,
  },
  {
    slug: "ship-food-without-dry-ice",
    date: "Jan 28, 2026",
    title: "How to Ship Food Without Dry Ice: Gel Packs, Insulation & Cost Analysis",
    summary: "Gel packs and insulated containers can replace dry ice for refrigerated food—saving time and money when the route and packaging are right.",
    image: "/media/bellmont-blog-4.jpg",
    category: "Cold Chain & Packaging",
    body: shipFoodWithoutDryIceBody,
  },
  {
    slug: "growing-brands-cut-shipping-costs",
    date: "Jan 14, 2026",
    title: "How Growing Brands Cut Shipping Costs While Going Nationwide",
    summary: "A practical look at carrier selection, route planning, minimums, and the operating changes that make nationwide delivery more efficient.",
    image: "/media/bellmont-blog-5.jpg",
    category: "Optimization Strategy",
    body: growingBrandsCutShippingCostsBody,
  },
  {
    slug: "ups-freight-shipping-guide",
    date: "Jan 7, 2026",
    title: "UPS Freight Shipping: Temperature True, Costs & Complete Guide",
    summary: "Services, temperature strategy, costs, compliance, and how UPS compares with other major carrier options for modern freight teams.",
    image: "/media/bellmont-blog-6.jpg",
    category: "Freight Fundamentals",
    body: upsFreightShippingGuideBody,
  },
  {
    slug: "ship-freight-to-canada",
    date: "Dec 21, 2025",
    title: "How to Ship Freight to Canada: Licenses, Labeling, Customs & Cold Chain",
    summary: "A complete guide to cross-border documentation, bilingual labeling, customs requirements, cold-chain packaging, and carrier selection.",
    image: "/media/bellmont-blog-7.jpg",
    category: "Freight Fundamentals",
    body: shipFreightToCanadaBody,
  },
  {
    slug: "fedex-freight-shipping-guide",
    date: "Dec 14, 2025",
    title: "FedEx Freight Shipping: Services, Costs, Packaging & Compliance",
    summary: "Compare FedEx service levels, packaging requirements, delivery windows, and the operational details teams need to plan confidently.",
    image: "/media/bellmont-blog-8.jpg",
    category: "Freight Fundamentals",
    body: fedexFreightShippingGuideBody,
  },
  {
    slug: "seafood-freight-transit-times",
    date: "Dec 2, 2025",
    title: "How Seafood Freight Cut Transit Times and Expanded Nationwide",
    summary: "See how better consolidation, carrier planning, and milestone visibility can help time-sensitive freight move faster with fewer exceptions.",
    image: "/media/bellmont-blog-9.jpg",
    category: "Optimization Strategy",
    body: seafoodFreightTransitTimesBody,
  },
];

const WORDS_PER_MINUTE = 220;

function wordCount(post: Post): number {
  const text = [post.title, post.summary, ...post.body.flatMap((b) =>
    "h" in b ? [b.h]
    : "p" in b ? [b.p]
    : "note" in b ? [b.note]
    : "steps" in b ? b.steps
    : "table" in b ? [b.table.caption, ...b.table.head, ...b.table.rows.flat()]
    : "faq" in b ? b.faq.flatMap((f) => [f.q, f.a])
    : b.list,
  )].join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}

export function readMinutes(post: Post): number {
  return Math.max(1, Math.round(wordCount(post) / WORDS_PER_MINUTE));
}

/** List data for the index: everything except the article body. */
export function summaries(): PostSummary[] {
  return POSTS.map((post) => {
    const { body, ...rest } = post;
    void body; // deliberately left out of the list data
    return { ...rest, minutes: readMinutes(post) };
  });
}

/** URL-safe id for a heading, used for the "On this page" anchors. */
export function headingId(text: string): string {
  return text.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

/** Up to `n` other articles, same category first, then the newest. */
export function relatedPosts(post: Post, n = 2): PostSummary[] {
  const all = summaries().filter((p) => p.slug !== post.slug);
  const same = all.filter((p) => p.category === post.category);
  const rest = all.filter((p) => p.category !== post.category);
  return [...same, ...rest].slice(0, n);
}
