import type { Metadata } from "next";
import BlogContent from "@/components/BlogContent";
import { summaries } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog | Bellmont Express",
  description: "Guides on freight fundamentals, shipping optimisation, and cold-chain packaging from Bellmont Express.",
};

export default function BlogPage() {
  return <main className="blog-page"><BlogContent posts={summaries()} /></main>;
}
