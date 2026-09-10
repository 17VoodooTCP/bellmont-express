"use client";

import Link from "next/link";

const POSTS = [
  ["Apr 28, 2026", "14 min", "How to Ship Temperature-Sensitive Freight: Packaging, Dry Ice, Costs & Step-by-Step Guide", "Ship temperature-sensitive freight safely with this complete guide. Cover packaging specs, dry ice quantities, labeling compliance, shipping schedules, and a practical pack-out process.", "/media/bellmont-blog-1.jpg"],
  ["Feb 20, 2026", "20 min", "How to Choose a Multi-Carrier Shipping Platform for Modern Logistics", "Discover how multi-carrier shipping software leads to cost-effective operations that streamline freight management and delivery visibility.", "/media/bellmont-blog-2.jpg"],
  ["Feb 7, 2026", "18 min", "Freight Shipping Solutions: A Guide for DTC Food & Beverage Brands", "Learn how growing brands manage freight shipping with the right packaging, carriers, insurance, and shipment visibility tools.", "/media/bellmont-blog-3.jpg"],
  ["Jan 28, 2026", "10 min", "How to Ship Food Without Dry Ice: Gel Packs, Insulation & Cost Analysis", "Gel packs and insulated containers can replace dry ice for refrigerated food—saving time and money when the route and packaging are right.", "/media/bellmont-blog-4.jpg"],
  ["Jan 14, 2026", "8 min", "How Growing Brands Cut Shipping Costs While Going Nationwide", "A practical look at carrier selection, route planning, minimums, and the operating changes that make nationwide delivery more efficient.", "/media/bellmont-blog-5.jpg"],
  ["Jan 7, 2026", "13 min", "UPS Freight Shipping: Temperature True, Costs & Complete Guide", "Services, temperature strategy, costs, compliance, and how UPS compares with other major carrier options for modern freight teams.", "/media/bellmont-blog-6.jpg"],
  ["Dec 21, 2025", "12 min", "How to Ship Freight to Canada: Licenses, Labeling, Customs & Cold Chain", "A complete guide to cross-border documentation, bilingual labeling, customs requirements, cold-chain packaging, and carrier selection.", "/media/bellmont-blog-7.jpg"],
  ["Dec 14, 2025", "12 min", "FedEx Freight Shipping: Services, Costs, Packaging & Compliance", "Compare FedEx service levels, packaging requirements, delivery windows, and the operational details teams need to plan confidently.", "/media/bellmont-blog-8.jpg"],
  ["Dec 2, 2025", "7 min", "How Seafood Freight Cut Transit Times and Expanded Nationwide", "See how better consolidation, carrier planning, and milestone visibility can help time-sensitive freight move faster with fewer exceptions.", "/media/bellmont-blog-9.jpg"],
];

export default function BlogPage() {
  return <main className="blog-page"><section className="blog-hero"><div className="blog-shell"><h1>The <span>Bellmont</span> Blog</h1><div className="blog-filters"><button>All</button><button>Freight Fundamentals</button><button>Optimization Strategy</button><button>Cold Chain & Packaging</button></div></div></section><section className="blog-list"><div className="blog-shell">{POSTS.map(([date, time, title, copy, image]) => <article className="blog-post" key={title}><div className="blog-post__copy"><div className="blog-meta">{date}　·　◷ {time}</div><h2><Link href="/support">{title}</Link></h2><p>{copy}</p><Link className="blog-read" href="/support">Read Article　→</Link></div><img src={image} alt="" /></article>)}</div></section></main>;
}
