"use client";

/* The blog index — header, category filters and article list. Shared by /blog
   and the homepage. Posts arrive as props from the server (titles and
   summaries only), so article bodies never ship in this bundle.

   With a limit set (the homepage), only the newest matching articles show and
   a "View all articles" link leads to /blog. */

import Link from "next/link";
import { useState } from "react";
import { CATEGORIES } from "@/lib/blog-categories";
import type { PostSummary } from "@/lib/blog";

type Filter = "All" | (typeof CATEGORIES)[number];
const FILTERS: Filter[] = ["All", ...CATEGORIES];

export default function BlogContent({ posts, limit }: { posts: PostSummary[]; limit?: number }) {
  const [active, setActive] = useState<Filter>("All");

  const matching = active === "All" ? posts : posts.filter((p) => p.category === active);
  const shown = limit ? matching.slice(0, limit) : matching;
  /* On the homepage there is always more on /blog, whatever the filter. */
  const showViewAll = limit !== undefined && posts.length > limit;

  return <>
    <section className="blog-hero">
      <div className="blog-shell">
        <h1>The <span>Bellmont</span> Blog</h1>
        <div className="blog-filters" role="group" aria-label="Filter articles by topic">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={active === f}
              className={active === f ? "is-active" : undefined}
              onClick={() => setActive(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </section>
    <section className="blog-list">
      <div className="blog-shell">
        <p className="sr-only" aria-live="polite">
          {active === "All" ? `Showing all ${matching.length} articles` : `Showing ${matching.length} ${active} articles`}
        </p>
        {shown.map((post) => (
          <article className="blog-post" key={post.slug}>
            <div className="blog-post__copy">
              <div className="blog-meta">{post.date}　·　◷ {post.minutes} min　·　{post.category}</div>
              <h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2>
              <p>{post.summary}</p>
              <Link className="blog-read" href={`/blog/${post.slug}`}>Read Article　→</Link>
            </div>
            <img src={post.image} alt="" />
          </article>
        ))}
        {showViewAll && (
          <div className="blog-view-all">
            <Link href="/blog" className="hv2-btn hv2-btn-ghost">View all articles <span aria-hidden="true">→</span></Link>
          </div>
        )}
      </div>
    </section>
  </>;
}
