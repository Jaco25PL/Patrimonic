"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

let inAppNavigations = 0;

/** True once the user has navigated within the app, so "back" can safely use history. */
export function hasInAppHistory() {
  return inAppNavigations > 0;
}

export function NavigationTracker() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    inAppNavigations++;
  }, [pathname]);
  return null;
}
