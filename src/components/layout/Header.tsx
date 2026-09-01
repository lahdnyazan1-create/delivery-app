"use client";

import Link from "next/link";
import { DaghriLogo } from "@/components/brand/DaghriLogo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Header() {
  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-glass-border px-4 py-3 backdrop-blur-md"
      style={{ background: "var(--nav-bg)" }}
    >
      <Link href="/" className="flex items-center gap-2" aria-label="دُغْري Daghri — الرئيسية">
        <DaghriLogo markSize={40} />
      </Link>
      <ThemeToggle />
    </header>
  );
}
