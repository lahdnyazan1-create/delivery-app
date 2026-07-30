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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        جاري التحقق من الصلاحيات...
      </div>
    );
  }

  return <>{children}</>;
}
