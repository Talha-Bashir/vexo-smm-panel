"use client";

import { useEffect } from "react";

interface BlogViewTrackerProps {
  slug: string;
}

export function BlogViewTracker({ slug }: BlogViewTrackerProps) {
  useEffect(() => {
    if (!slug) return;

    // Avoid double counting in the same browser session
    const sessionKey = `vexo_viewed_${slug}`;
    if (sessionStorage.getItem(sessionKey)) return;

    try {
      fetch("/api/blog/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "view", slug }),
      })
        .then(() => {
          sessionStorage.setItem(sessionKey, "1");
        })
        .catch(() => {});
    } catch {
      // Non-blocking telemetry
    }
  }, [slug]);

  return null;
}
