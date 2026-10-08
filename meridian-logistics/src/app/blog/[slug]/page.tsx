import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { POSTS, getPost, headingId, readMinutes, relatedPosts } from "@/lib/blog";

/* Every article is prebuilt at build time; any other slug is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} | Bellmont Express`,
    description: post.summary,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.summary,
      images: [{ url: post.image }],
    },
  };
}

export default async function ArticlePage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = relatedPosts(post, 2);
  const headings = post.body.flatMap((b) => ("h" in b ? [b.h] : []));
  const faqs = post.body.flatMap((b) => ("faq" in b ? b.faq : []));
  /* Lets search engines show the questions and answers directly in results. */
  const faqJsonLd = faqs.length
    ? JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }).replace(/</g, "\\u003c") // escaped so article text can never close the script tag
    : null;

  return (
    <main className="blog-page">
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      )}
      <article className="article">
        <header className="article-hero">
          <div className="article-shell">
            <Link href="/blog" className="article-back">← All articles</Link>
            <p className="article-kicker">{post.category}</p>
            <h1>{post.title}</h1>
            <p className="article-meta">{post.date}　·　◷ {readMinutes(post)} min read</p>
          </div>
        </header>

        <div className="article-shell">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="article-image" src={post.image} alt="" />
          <p className="article-lede">{post.summary}</p>

          {headings.length > 3 && (
            <nav className="article-toc" aria-labelledby="toc-title">
              <p id="toc-title">On this page</p>
              <ol>
                {headings.map((h) => <li key={h}><a href={`#${headingId(h)}`}>{h}</a></li>)}
              </ol>
            </nav>
          )}

          <div className="article-body">
            {post.body.map((block, i) =>
              "h" in block ? <h2 key={i} id={headingId(block.h)}>{block.h}</h2>
              : "p" in block ? <p key={i}>{block.p}</p>
              : "note" in block ? <p key={i} className="article-note">{block.note}</p>
              : "steps" in block ? <ol key={i}>{block.steps.map((item) => <li key={item}>{item}</li>)}</ol>
              : "table" in block ? (
                <div key={i} className="article-table" role="region" aria-label={block.table.caption} tabIndex={0}>
                  <table>
                    <caption>{block.table.caption}</caption>
                    <thead><tr>{block.table.head.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
                    <tbody>{block.table.rows.map((row) => (
                      <tr key={row[0]}>{row.map((c, ci) => ci === 0 ? <th key={ci} scope="row">{c}</th> : <td key={ci}>{c}</td>)}</tr>
                    ))}</tbody>
                  </table>
                </div>
              )
              : "faq" in block ? (
                <div key={i} className="article-faq">
                  {block.faq.map((f) => (
                    <details key={f.q}>
                      <summary>{f.q}</summary>
                      <p>{f.a}</p>
                    </details>
                  ))}
                </div>
              )
              : <ul key={i}>{block.list.map((item) => <li key={item}>{item}</li>)}</ul>
            )}
          </div>

          <aside className="article-cta">
            <p><b>Ship it with Bellmont.</b> Compare rates and see every handoff on one live record.</p>
            <div className="article-cta__actions">
              <Link href="/rates" className="hv2-btn hv2-btn-primary">Check rates <span aria-hidden="true">→</span></Link>
              <Link href="/book-demo" className="hv2-btn hv2-btn-ghost">Book a demo</Link>
            </div>
          </aside>

          {related.length > 0 && (
            <section className="article-related" aria-labelledby="related-title">
              <h2 id="related-title">Keep reading</h2>
              <div className="article-related__grid">
                {related.map((r) => (
                  <Link key={r.slug} href={`/blog/${r.slug}`} className="article-related__card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.image} alt="" />
                    <span className="article-related__meta">{r.category}　·　{r.minutes} min</span>
                    <span className="article-related__title">{r.title}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </article>
    </main>
  );
}
