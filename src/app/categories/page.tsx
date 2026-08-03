"use client";

import { AppShell } from "@/components/layout/AppShell";
import { CategoriesGrid } from "@/components/home/CategoriesGrid";

export default function CategoriesPage() {
  return (
    <AppShell>
      <h1 className="mb-5 text-2xl font-extrabold">كل الفئات</h1>
      <CategoriesGrid />
    </AppShell>
  );
}
