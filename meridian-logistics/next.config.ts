import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray package-lock.json in the user profile
  // directory otherwise wins Turbopack's upward lockfile search.
  turbopack: {
    root: __dirname,
  },
  /* Send the production .vercel.app address to the real domain, path and
     query kept, so it never shows in a browser or in Google. Switched on by
     REDIRECT_TO_MAIN_DOMAIN=1 in Vercel once the domain is live: turning it
     on earlier would send visitors to a domain that doesn't answer yet.
     Preview deployments have their own hosts and are unaffected. */
  async redirects() {
    if (process.env.REDIRECT_TO_MAIN_DOMAIN !== "1") return [];
    const target = (process.env.NEXT_PUBLIC_SITE_URL || "https://bellmontexpress.com").replace(/\/+$/, "");
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "bellmont-express.vercel.app" }],
        destination: `${target}/:path*`,
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "flagcdn.com" },
    ],
  },
};

export default nextConfig;
