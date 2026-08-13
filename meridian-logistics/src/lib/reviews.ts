/* Reviews store: admin-editable, persisted in the browser for now.
   Phase 2 moves this to the PostgreSQL backend so edits are global. */

export type Review = {
  id: string;
  name: string;
  role: string;
  stars: number;
  avatar: string; // URL or data URL from an uploaded file
  quote: string;
};

export const DEFAULT_REVIEWS: Review[] = [
  {
    id: "r1",
    name: "Amara Chen",
    role: "Fleet Manager, Northline Retail",
    stars: 5,
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=70&auto=format&fit=crop",
    quote: "We moved 400 containers through Bellmont Express last quarter. The live map is the first one my team actually trusts. Every handoff shows up in minutes.",
  },
  {
    id: "r2",
    name: "Daniel Okafor",
    role: "Founder, Okafor Imports",
    stars: 5,
    avatar: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=200&q=70&auto=format&fit=crop",
    quote: "The delivery agent called ahead, arrived smiling, and my customs paperwork was already cleared. That's a first in eleven years of importing.",
  },
  {
    id: "r3",
    name: "Marcus Hale",
    role: "COO, Hale Medical Supply",
    stars: 4,
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=70&auto=format&fit=crop",
    quote: "Time-critical air freight, door to door in 41 hours. One late pickup all year, and their support line answered in under a minute.",
  },
];

const KEY = "bellmont_reviews";

export function loadReviews(): Review[] {
  if (typeof window === "undefined") return DEFAULT_REVIEWS;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Review[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch { /* fall back */ }
  return DEFAULT_REVIEWS;
}

export function saveReviews(reviews: Review[]) {
  localStorage.setItem(KEY, JSON.stringify(reviews));
}
