"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-primary/90 text-white text-center py-2 px-4 text-xs font-bold backdrop-blur-md">
      <WifiOff className="inline-block size-3.5 mr-1 -mt-0.5" />
      أنت غير متصل بالإنترنت. بعض الميزات قد لا تعمل.
    </div>
  );
}
