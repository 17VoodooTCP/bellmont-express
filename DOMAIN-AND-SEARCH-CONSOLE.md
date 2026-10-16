# bellmontexpress.com — domain setup and Google Search Console roadmap

Work through the stages in order. Each one depends on the one before it.

---

## Stage 1 — Connect the domain to Vercel (day 1)

1. **Vercel → your project → Settings → Domains → Add**: enter `bellmontexpress.com`.
   When Vercel asks, also add `www.bellmontexpress.com` and set it to
   **redirect to `bellmontexpress.com`** (the plain domain is the main one).
2. Vercel now shows the DNS records it wants. **Copy the values from that
   screen**; they can differ per project. They usually look like this:

   | Type  | Name / Host | Value                            |
   |-------|-------------|----------------------------------|
   | A     | `@`         | `76.76.21.21`                    |
   | CNAME | `www`       | `cname.vercel-dns.com` (or the one Vercel shows) |

3. At your **domain registrar** (where you bought it), open DNS settings:
   - delete any existing `A` record on `@` and any `CNAME`/`A` on `www`
     (often a "parking page" the registrar added);
   - add the records from step 2;
   - leave `MX` records alone if you use email on the domain.
4. Wait for Vercel's Domains page to show **Valid Configuration** for both
   names. Usually minutes, sometimes a few hours. Vercel issues the HTTPS
   certificate automatically.
5. Check: `https://bellmontexpress.com` opens the site, and
   `https://www.bellmontexpress.com` lands on `https://bellmontexpress.com`.

## Stage 2 — Switch on the .vercel.app redirect (right after Stage 1)

Only do this once Stage 1 shows **Valid Configuration**. Doing it earlier
sends visitors to a domain that doesn't answer yet.

1. **Vercel → Settings → Environment Variables → Add**:
   `REDIRECT_TO_MAIN_DOMAIN` = `1`, environment **Production**.
2. **Deployments → latest → ⋯ → Redeploy**. Redirects are fixed at build
   time, so the variable only applies after a new build.
3. Check: `https://bellmont-express.vercel.app/tracking` should land on
   `https://bellmontexpress.com/tracking`.

What is already done in code (nothing for you to do):
- **Receipts and QR codes** always print `bellmontexpress.com`, whatever
  address the receipt was opened from.
- **Every public page** declares `bellmontexpress.com` as its canonical address.
- **The sitemap and robots.txt** list only `bellmontexpress.com` URLs.
- **The backend (Render)** accepts requests from `bellmontexpress.com` and
  `www.bellmontexpress.com`. No Render change is needed.
- **The Android apps** already allow the new domain and follow the redirect.
  Next time they're rebuilt, their start address will be switched to
  `bellmontexpress.com`.

---

## Stage 3 — Verify the site in Google Search Console (day 1–2)

1. Go to **search.google.com/search-console** and sign in with the Google
   account that should own the site.
2. **Add property → Domain** (the left-hand option, not "URL prefix").
   Enter `bellmontexpress.com`.
   A Domain property covers `https`, `http`, `www` and any subdomain in one go.
3. Google gives you a **TXT record** such as `google-site-verification=…`.
   At your registrar's DNS settings add:

   | Type | Name / Host | Value                              |
   |------|-------------|------------------------------------|
   | TXT  | `@`         | the whole `google-site-verification=…` text |

4. Back in Search Console, click **Verify**. If it fails, wait 30–60 minutes
   and try again. DNS can be slow. **Never delete this TXT record**: it is
   how Google keeps confirming you own the site.
5. Optional: **Settings → Users and permissions** to add a teammate.

## Stage 4 — Submit the sitemap (day 2)

1. Search Console → **Sitemaps**.
2. Enter `sitemap.xml` (the field already shows `https://bellmontexpress.com/`)
   and click **Submit**.
3. Status should read **Success**, with about **19 discovered pages**:
   - 10 main pages: home, tracking, services, features, rates, pricing, blog,
     about, support, book-demo;
   - 9 blog articles.

   New blog posts are added to the sitemap automatically, with no
   resubmitting needed.

## Stage 5 — Ask Google to index the key pages (days 2–5)

Google will find everything through the sitemap, but you can speed up the
most important pages:

1. Paste a URL into the **search bar at the top** of Search Console
   (URL Inspection).
2. Click **Request indexing**.
3. Do this in priority order. There's a daily limit of roughly 10:
   1. `https://bellmontexpress.com/`
   2. `https://bellmontexpress.com/tracking`
   3. `https://bellmontexpress.com/services`
   4. `https://bellmontexpress.com/rates`
   5. `https://bellmontexpress.com/features`
   6. `https://bellmontexpress.com/pricing`
   7. `https://bellmontexpress.com/blog`
   8. then the blog articles, a few per day.

Use **Test live URL** first if a page says "URL is not on Google". It confirms
Google can fetch it and shows the canonical it sees, which should be the
same `bellmontexpress.com` URL.

## Stage 6 — Read the reports (week 1–4)

**Indexing → Pages** fills in over 1–3 weeks. These entries are **expected
and correct**, so don't "fix" them:

| Report reason                     | Pages                        | Why |
|-----------------------------------|------------------------------|-----|
| Excluded by 'noindex' tag         | `/login`, `/account/…`       | Private pages, kept out on purpose |
| Blocked by robots.txt             | `/admin/…`                   | Staff console |
| Page with redirect                | `www.…`, old `.vercel.app` URLs | They forward to the main domain |
| Alternate page with proper canonical tag | `/tracking?id=…`      | One shipment's lookup, not a page |

What **would** need attention:
- **Server error (5xx)**: the backend was asleep or down when Google visited.
- **Not found (404)**: a broken link somewhere.
- **Crawled – currently not indexed** on a main page: usually a content issue.
  Strengthen that page's text, then request indexing again.

Also check:
- **Experience → Core Web Vitals**: speed on real visitors' phones. It needs
  traffic before it shows data.
- **Experience → HTTPS**: should be all green.
- **Security & Manual actions**: should both say "No issues detected".

## Stage 7 — Measure (from week 3)

**Performance → Search results** shows which searches bring people in
(queries), which pages they land on, clicks, impressions and average position.
Check it weekly:
- **High impressions, low clicks:** improve that page's title and description.
- **Position 8–20:** the page is close to page 1, so it's worth expanding.
- **New queries you didn't expect:** ideas for the next blog article.

## Stage 8 — Extra reach (optional, month 1)

- **Bing Webmaster Tools** (bing.com/webmasters): choose **Import from Google
  Search Console**. That's one click and covers Bing, DuckDuckGo and Yahoo.
- **Keep publishing**: one useful article every 2–4 weeks on the topics that
  appear in your Performance report.
- **Links from other sites**: partner sites, directories and industry
  associations linking to `bellmontexpress.com` help it rank.

---

## Timeline at a glance

| When        | What happens |
|-------------|--------------|
| Day 1       | Domain connected, HTTPS live, redirect switched on |
| Day 1–2     | Search Console verified, sitemap submitted |
| Days 2–7    | Key pages requested; first pages appear in Google |
| Weeks 1–3   | Pages report fills in; most of the site indexed |
| Weeks 3–8   | Performance data becomes useful; rankings settle |

Indexing is not instant, and Google decides the pace. A new domain commonly
takes days for the first pages and a few weeks for the whole site.
