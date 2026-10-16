import type { Metadata } from "next";
import AdminNotifier from "@/components/admin/AdminNotifier";

/* Belt and braces with robots.txt: if a console URL is ever linked from
   somewhere, it still never appears in search results. */
export const metadata: Metadata = {
  title: "Operations console | Bellmont Express",
  robots: { index: false, follow: false },
};

/* Every console page shares the live alert bell and pop-ups. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AdminNotifier />
    </>
  );
}
