import type { Metadata } from "next";

export const metadata: Metadata = { title: "لوحة المطعم" };

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
