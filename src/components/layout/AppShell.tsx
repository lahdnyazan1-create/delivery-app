"use client";

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
  return (
    <div className="app-gradient relative mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      {!hideHeader && <Header />}
      <main
        className={`flex flex-1 flex-col px-4 pt-4 ${
          hideNav ? "pb-8" : "pb-28"
        }`}
      >
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
