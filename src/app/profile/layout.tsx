import type { Metadata } from "next";

export const metadata: Metadata = { title: "حسابي" };

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
