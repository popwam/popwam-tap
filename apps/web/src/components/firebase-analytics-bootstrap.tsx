"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackFirebaseAnalyticsEvent } from "@/lib/firebase/analytics";

export function FirebaseAnalyticsBootstrap() {
  const pathname = usePathname();
  const lastPathname = useRef<string | null>(null);
  useEffect(() => { void trackFirebaseAnalyticsEvent("app_open", { platform: "web" }); }, []);
  useEffect(() => { if (!pathname || lastPathname.current === pathname) return; lastPathname.current = pathname; void trackFirebaseAnalyticsEvent("screen_view", { platform: "web", screen_name: pathname.slice(0, 80) }); }, [pathname]);
  return null;
}
