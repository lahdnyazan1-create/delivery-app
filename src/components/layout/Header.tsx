"use client";

import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-glass-border bg-background/90 px-4 py-3.5 text-center backdrop-blur-md">
      <Link href="/" className="inline-flex items-center justify-center">
        <span className="bg-gradient-to-r from-primary to-primary-soft bg-clip-text text-xl font-black text-transparent">
          Zest Delivery
        </span>
      </Link>
    </header>
  );
}
