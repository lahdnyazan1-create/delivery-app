"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 bg-primary/90 px-4 py-2 text-center text-xs font-bold text-white backdrop-blur-md">
      <WifiOff className="ms-1 -mt-0.5 inline-block size-3.5" />
      أنت غير متصل بالإنترنت. بعض الميزات قد لا تعمل.
    </div>
  );
}
