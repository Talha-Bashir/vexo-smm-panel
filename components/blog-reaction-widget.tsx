"use client";

import { useState } from "react";

interface BlogReactionWidgetProps {
  slug: string;
  initialLikes?: number;
  initialShares?: number;
}

export function BlogReactionWidget({
  slug,
  initialLikes = 0,
  initialShares = 0,
}: BlogReactionWidgetProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [shares, setShares] = useState(initialShares);
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadingLike, setLoadingLike] = useState(false);

  async function handleLike() {
    if (liked || loadingLike) return;
    setLoadingLike(true);
    setLiked(true);
    setLikes((prev) => prev + 1);

    try {
      const res = await fetch("/api/blog/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like", slug }),
      });
      const data = await res.json();
      if (data?.likes) {
        setLikes(data.likes);
      }
    } catch {
      // Keep optimistic state
    } finally {
      setLoadingLike(false);
    }
  }

  async function handleShare() {
    try {
      const url = typeof window !== "undefined" ? window.location.href : `https://vexarosmm.com/blog/${slug}`;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
      setShares((prev) => prev + 1);

      fetch("/api/blog/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "share", slug }),
      }).catch(() => {});
    } catch {
      // Clipboard fallback
    }
  }

  function handleShareWhatsApp() {
    const url = typeof window !== "undefined" ? window.location.href : `https://vexarosmm.com/blog/${slug}`;
    const text = `Check out this social media growth guide: ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
    setShares((prev) => prev + 1);
    fetch("/api/blog/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "share", slug }),
    }).catch(() => {});
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1618] p-6 shadow-xl my-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-[#baff00]">
            Reader Feedback &amp; Interaction
          </span>
          <h4 className="text-lg font-black text-white mt-0.5">Did you find this guide helpful?</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Join {likes > 0 ? `${likes.toLocaleString()} readers` : "other readers"} who appreciated this insight.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Helpful / Like Button */}
          <button
            type="button"
            onClick={handleLike}
            disabled={liked || loadingLike}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition cursor-pointer shadow-md ${
              liked
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                : "border border-white/10 bg-white/5 text-slate-300 hover:border-rose-500/40 hover:text-rose-300 active:scale-95"
            }`}
          >
            <span className={`text-sm ${liked ? "scale-125" : ""} transition-transform`}>
              {liked ? "❤️" : "🤍"}
            </span>
            <span>{liked ? "Helpful!" : "Helpful"}</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-mono">
              {likes}
            </span>
          </button>

          {/* Copy Link Button */}
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-bold text-slate-300 hover:border-[#baff00]/40 hover:text-white active:scale-95 transition cursor-pointer"
            title="Copy article link"
          >
            <span>{copied ? "✓" : "🔗"}</span>
            <span>{copied ? "Copied!" : "Share Link"}</span>
          </button>

          {/* WhatsApp Direct Share Button */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-black text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition cursor-pointer"
            title="Share via WhatsApp"
          >
            <span>💬</span>
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
        </div>
      </div>

      {liked && (
        <div className="mt-3 text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
          <span>✓</span>
          <span>Thank you! Your feedback helps us write more actionable growth guides.</span>
        </div>
      )}
    </div>
  );
}
