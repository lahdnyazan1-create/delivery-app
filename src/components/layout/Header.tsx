"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Header() {
  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-glass-border px-4 py-3 backdrop-blur-md"
      style={{ background: "var(--nav-bg)" }}
    >
      <Link href="/" className="flex items-center gap-2" aria-label="Zest — الرئيسية">
        <span
          className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-soft text-white shadow-[var(--shadow-glow)]"
          aria-hidden
        >
          <Sparkles className="size-5" />
        </span>
        <span className="bg-gradient-to-r from-primary to-primary-soft bg-clip-text text-xl font-black text-transparent">
          Zest
        </span>
      </Link>
      <ThemeToggle />
    </header>
  );
}
