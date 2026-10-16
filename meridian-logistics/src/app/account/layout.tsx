import type { Metadata } from "next";
import AccountProvider from "@/components/account/AccountProvider";
import AccountShell from "@/components/account/AccountShell";

export const metadata: Metadata = {
  title: "Your account | Bellmont Express",
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountProvider>
      <AccountShell>{children}</AccountShell>
    </AccountProvider>
  );
}
