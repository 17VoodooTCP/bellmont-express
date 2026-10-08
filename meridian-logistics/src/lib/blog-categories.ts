/* Kept apart from lib/blog.ts so client components can import the category
   list without pulling every article body into the browser bundle. */
export const CATEGORIES = [
  "Freight Fundamentals",
  "Optimization Strategy",
  "Cold Chain & Packaging",
] as const;

export type Category = (typeof CATEGORIES)[number];
