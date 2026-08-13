"use client";

import { usePathname } from "next/navigation";

/* Hides the public site chrome (nav, footer, chat) on admin routes so the
   console is its own standalone interface. */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <>{children}</>;
}
