"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { UserRole } from "@/types/database";

interface RequireRoleProps {
  children: React.ReactNode;
  role: UserRole;
}

export function RequireRole({ children, role }: RequireRoleProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAppStore();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    } else if (user?.role !== role) {
      router.replace("/");
    } else {
      setIsAuthorized(true);
    }
  }, [user, isAuthenticated, role, router]);

  if (!isAuthorized) {
    return (
      <div className="app-gradient flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
        <div className="size-12 animate-spin rounded-full border-4 border-glass-border border-t-primary" />
        <p className="animate-pulse text-sm font-semibold text-foreground-muted">
          جاري التحقق من الصلاحيات...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
