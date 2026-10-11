"use client";

import { useEffect } from "react";

interface BlogFeedTrackerProps {
  slugs: string[];
}

export function BlogFeedTracker({ slugs }: BlogFeedTrackerProps) {
  useEffect(() => {
    if (!slugs || slugs.length === 0) return;

    // Track feed impressions once per session
    const sessionKey = "vexo_feed_impressions_recorded";
    if (sessionStorage.getItem(sessionKey)) return;

    try {
      fetch("/api/blog/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "impressions", slugs }),
      })
        .then(() => {
          sessionStorage.setItem(sessionKey, "1");
        })
        .catch(() => {});
    } catch {
      // Non-blocking telemetry
    }
  }, [slugs]);

  return null;
}
