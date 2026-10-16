import AdminNotifier from "@/components/admin/AdminNotifier";

/* Every console page shares the live alert bell and pop-ups. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AdminNotifier />
    </>
  );
}
