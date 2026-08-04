// src/components/layout/AppShell.tsx
"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";

type AppShellProps = {
  children: React.ReactNode;
  hideHeader?: boolean;
  hideNav?: boolean;
};

export function AppShell({
  children,
  hideHeader = false,
  hideNav = false,
}: AppShellProps) {
  const pathname = usePathname();

  const shouldHideHeader =
    hideHeader ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/driver") ||
    pathname.startsWith("/vendor") ||
    pathname.startsWith("/restaurant");

  const shouldHideNav =
    hideNav ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/driver") ||
    pathname.startsWith("/vendor") ||
    pathname.startsWith("/restaurant");

  return (
    <div className="app-gradient relative mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      {!shouldHideHeader && <Header />}
      <main
        className={`flex flex-1 flex-col px-4 pt-4 ${
          shouldHideNav ? "pb-8" : "pb-28"
        }`}
      >
        {children}
      </main>
      {!shouldHideNav && <BottomNav />}
    </div>
  );
}

