"use client";

import { useEffect, useState } from "react";

export function SeoManagementView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // SERP preview mode
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  // Ping state
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<any>(null);

  // Form Fields
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [siteUrl, setSiteUrl] = useState("https://vexarosmm.com");

  // OpenGraph & Social
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [ogImage, setOgImage] = useState("/og-image.png");
  const [twitterTitle, setTwitterTitle] = useState("");
  const [twitterDescription, setTwitterDescription] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("@VexaroSMMAdmin");
  const [twitterCard, setTwitterCard] = useState("summary_large_image");

  // Verification
  const [googleVerification, setGoogleVerification] = useState("");
  const [bingVerification, setBingVerification] = useState("");

  // Analytics & Tracking
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState("");
  const [gtmId, setGtmId] = useState("");
  const [metaPixelId, setMetaPixelId] = useState("");
  const [tiktokPixelId, setTiktokPixelId] = useState("");
  const [customHeadScripts, setCustomHeadScripts] = useState("");
  const [customBodyScripts, setCustomBodyScripts] = useState("");

  // Robots & Crawlers
  const [robotsIndex, setRobotsIndex] = useState("true");
  const [robotsFollow, setRobotsFollow] = useState("true");

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        if (s.seo_meta_title !== undefined) setMetaTitle(s.seo_meta_title);
        if (s.seo_meta_description !== undefined) setMetaDescription(s.seo_meta_description);
        if (s.seo_meta_keywords !== undefined) setMetaKeywords(s.seo_meta_keywords);
        if (s.seo_site_url !== undefined) setSiteUrl(s.seo_site_url);

        if (s.seo_og_title !== undefined) setOgTitle(s.seo_og_title);
        if (s.seo_og_description !== undefined) setOgDescription(s.seo_og_description);
        if (s.seo_og_image !== undefined) setOgImage(s.seo_og_image);
        if (s.seo_twitter_title !== undefined) setTwitterTitle(s.seo_twitter_title);
        if (s.seo_twitter_description !== undefined) setTwitterDescription(s.seo_twitter_description);
        if (s.seo_twitter_handle !== undefined) setTwitterHandle(s.seo_twitter_handle);
        if (s.seo_twitter_card !== undefined) setTwitterCard(s.seo_twitter_card);

        if (s.seo_google_site_verification !== undefined) setGoogleVerification(s.seo_google_site_verification);
        if (s.seo_bing_site_verification !== undefined) setBingVerification(s.seo_bing_site_verification);

        if (s.seo_google_analytics_id !== undefined) setGoogleAnalyticsId(s.seo_google_analytics_id);
        if (s.seo_google_tag_manager_id !== undefined) setGtmId(s.seo_google_tag_manager_id);
        if (s.seo_meta_pixel_id !== undefined) setMetaPixelId(s.seo_meta_pixel_id);
        if (s.seo_tiktok_pixel_id !== undefined) setTiktokPixelId(s.seo_tiktok_pixel_id);
        if (s.seo_custom_head_scripts !== undefined) setCustomHeadScripts(s.seo_custom_head_scripts);
        if (s.seo_custom_body_scripts !== undefined) setCustomBodyScripts(s.seo_custom_body_scripts);

        if (s.seo_robots_index !== undefined) setRobotsIndex(s.seo_robots_index);
        if (s.seo_robots_follow !== undefined) setRobotsFollow(s.seo_robots_follow);
      }
    } catch (e: any) {
      setErr(e.message || "Failed to load SEO settings");
    } finally {
      setLoading(false);
    }
  }

  // Smart parser for Google Site Verification
  function handleGoogleVerificationChange(val: string) {
    let clean = val.trim();
    if (clean.includes("content=\"") || clean.includes("content='")) {
      const match = clean.match(/content=["']([^"']+)["']/);
      if (match && match[1]) {
        clean = match[1];
      }
    }
    setGoogleVerification(clean);
  }

  // Smart parser for Bing Webmaster Verification
  function handleBingVerificationChange(val: string) {
    let clean = val.trim();
    if (clean.includes("content=\"") || clean.includes("content='")) {
      const match = clean.match(/content=["']([^"']+)["']/);
      if (match && match[1]) {
        clean = match[1];
      }
    }
    setBingVerification(clean);
  }

  async function handleSave() {
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      const payload: Record<string, string> = {
        seo_meta_title: metaTitle,
        seo_meta_description: metaDescription,
        seo_meta_keywords: metaKeywords,
        seo_site_url: siteUrl,
        seo_og_title: ogTitle,
        seo_og_description: ogDescription,
        seo_og_image: ogImage,
        seo_twitter_title: twitterTitle,
        seo_twitter_description: twitterDescription,
        seo_twitter_handle: twitterHandle,
        seo_twitter_card: twitterCard,
        seo_google_site_verification: googleVerification,
        seo_bing_site_verification: bingVerification,
        seo_google_analytics_id: googleAnalyticsId,
        seo_google_tag_manager_id: gtmId,
        seo_meta_pixel_id: metaPixelId,
        seo_tiktok_pixel_id: tiktokPixelId,
        seo_custom_head_scripts: customHeadScripts,
        seo_custom_body_scripts: customBodyScripts,
        seo_robots_index: robotsIndex,
        seo_robots_follow: robotsFollow,
      };

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update SEO settings");
      }

      setMsg("✓ All SEO meta tags, verification tokens, and tracking configurations saved successfully!");
      setTimeout(() => setMsg(""), 5000);
    } catch (e: any) {
      setErr(e.message || "Failed to save SEO settings");
    } finally {
      setSaving(false);
    }
  }

  async function handlePingSitemaps() {
    setPinging(true);
    setPingResult(null);
    try {
      const res = await fetch("/api/admin/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "ping_sitemap" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to ping search engines");
      }
      setPingResult(data);
    } catch (e: any) {
      alert("Search Engine Ping warning: " + (e.message || "Ping failed"));
    } finally {
      setPinging(false);
    }
  }

  const titleLength = metaTitle.length;
  const descLength = metaDescription.length;

  return (
    <div className="space-y-6">
      {/* 1. Header Card */}
      <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#baff00]/30 bg-[#baff00]/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#cfff62] mb-2">
              <span>🚀 Master SEO Engine &amp; Webmaster Controls</span>
            </div>
            <h2 className="text-2xl font-black text-white">Search Engine Optimization (SEO) &amp; Metadata</h2>
            <p className="mt-1 text-xs text-slate-400 max-w-2xl">
              Control search engine indexing, Google snippet previews, OpenGraph cards, Search Console tokens, and analytics pixels across the entire platform.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePingSitemaps}
              disabled={pinging || saving}
              className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-xs sm:text-sm font-bold text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50 transition cursor-pointer"
            >
              <span>{pinging ? "Pinging Crawlers..." : "🔄 Ping Google Sitemap"}</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 rounded-xl bg-[#baff00] px-6 py-3 text-xs sm:text-sm font-black text-[#07100f] hover:bg-[#d2ff5a] disabled:opacity-50 transition shadow-[0_4px_20px_rgba(186,255,0,0.3)] cursor-pointer"
            >
              <span>{saving ? "Saving Changes..." : "💾 Save SEO Configuration"}</span>
            </button>
          </div>
        </div>

        {msg && <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-400">{msg}</div>}
        {err && <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs font-bold text-rose-400">{err}</div>}

        {/* Ping Results Notification */}
        {pingResult && (
          <div className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-4 text-xs text-slate-200">
            <div className="flex items-center justify-between font-bold text-cyan-300 mb-2">
              <span>✓ Sitemap Ping Notification Sent!</span>
              <button
                type="button"
                onClick={() => setPingResult(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {pingResult.pingResults?.map((r: any, idx: number) => (
                <div key={idx} className="rounded-lg border border-white/5 bg-black/40 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{r.target}</span>
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400">
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">{r.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Interactive Google SERP Simulator */}
      <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 font-black">
              G
            </span>
            <div>
              <h3 className="text-sm font-black text-white">Live Google Search Preview (SERP Simulator)</h3>
              <p className="text-[11px] text-slate-400">
                Real-time preview of how your website appears on Google search results.
              </p>
            </div>
          </div>

          {/* Desktop vs Mobile Switcher */}
          <div className="flex rounded-xl border border-white/10 bg-[#070d0d] p-1">
            <button
              type="button"
              onClick={() => setPreviewMode("desktop")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                previewMode === "desktop" ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              💻 Desktop SERP
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("mobile")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                previewMode === "mobile" ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              📱 Mobile SERP
            </button>
          </div>
        </div>

        {/* The Google Card Simulation */}
        <div className="rounded-xl border border-white/10 bg-[#202124] p-5 font-sans transition-all max-w-2xl shadow-inner">
          {/* Breadcrumb row */}
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#303134] text-xs font-bold text-white border border-white/10 overflow-hidden">
              <span className="text-[11px] font-black text-[#baff00]">V</span>
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-medium text-[#dadce0] leading-none">
                VEXARO SMM Panel
              </div>
              <div className="text-[11px] text-[#bdc1c6] font-mono mt-0.5 truncate">
                {siteUrl || "https://vexarosmm.com"}
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="mt-2.5">
            <span className="text-lg sm:text-xl font-normal text-[#8ab4f8] hover:underline cursor-pointer leading-snug">
              {metaTitle || "VEXARO SMM Panel – Affordable Social Media Marketing Services"}
            </span>
          </div>

          {/* Snippet Description */}
          <div className="mt-1.5 text-[13px] text-[#bdc1c6] leading-relaxed line-clamp-3">
            {metaDescription ||
              "VEXARO SMM (vexarosmm.com) is the #1 cheapest automated SMM panel in Pakistan & Worldwide. Buy Instagram followers, TikTok likes, YouTube watch time & views. Instant delivery with SadaPay, Easypaisa, JazzCash, and Binance Pay."}
          </div>
        </div>

        {/* Length recommendations and health indicators */}
        <div className="grid gap-3 sm:grid-cols-2 pt-2">
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#070d0d] px-4 py-2.5 text-xs">
            <span className="text-slate-400">Title Length:</span>
            <span
              className={`font-mono font-bold ${
                titleLength >= 40 && titleLength <= 65
                  ? "text-emerald-400"
                  : titleLength > 65
                  ? "text-rose-400"
                  : "text-amber-400"
              }`}
            >
              {titleLength} / 60 characters {titleLength >= 40 && titleLength <= 65 ? "✓ (Optimal)" : titleLength > 65 ? "⚠️ (Truncated)" : "⚠️ (Too short)"}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#070d0d] px-4 py-2.5 text-xs">
            <span className="text-slate-400">Description Length:</span>
            <span
              className={`font-mono font-bold ${
                descLength >= 130 && descLength <= 165
                  ? "text-emerald-400"
                  : descLength > 165
                  ? "text-rose-400"
                  : "text-amber-400"
              }`}
            >
              {descLength} / 160 characters {descLength >= 130 && descLength <= 165 ? "✓ (Optimal)" : descLength > 165 ? "⚠️ (Truncated)" : "⚠️ (Add more detail)"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Section 1: Search Essentials */}
      <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#baff00]/15 text-[#baff00] text-sm">
            🔍
          </span>
          <div>
            <h3 className="text-base font-black text-white">Search Engine Essentials</h3>
            <p className="text-xs text-slate-400">
              Fundamental metadata tags read by Googlebot, Bingbot, Yandex, DuckDuckGo, and AI search engines.
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Primary Meta Title (&lt;title&gt;)
              </label>
              <span className="text-[11px] font-mono text-slate-500">{titleLength} chars (50-60 optimal)</span>
            </div>
            <input
              type="text"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="e.g. VEXARO SMM Panel – Cheap SMM Panel in Pakistan & Worldwide"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-4 py-3 text-sm text-white focus:border-[#baff00] outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Primary Meta Description (&lt;meta name="description"&gt;)
              </label>
              <span className="text-[11px] font-mono text-slate-500">{descLength} chars (140-160 optimal)</span>
            </div>
            <textarea
              rows={3}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="Describe your platform services concisely with target keywords..."
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-4 py-3 text-sm text-white focus:border-[#baff00] outline-none resize-y"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Target SEO Keywords (Comma-separated)
              </label>
              <input
                type="text"
                value={metaKeywords}
                onChange={(e) => setMetaKeywords(e.target.value)}
                placeholder="smm panel pakistan, cheap instagram followers, easypaisa smm..."
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-4 py-2.5 text-xs text-white focus:border-[#baff00] outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Canonical Base URL (&lt;link rel="canonical"&gt;)
              </label>
              <input
                type="text"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://vexarosmm.com"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-4 py-2.5 text-xs text-white focus:border-[#baff00] outline-none font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Section 2: Social Media & OpenGraph Sharing */}
      <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400 text-sm">
            📱
          </span>
          <div>
            <h3 className="text-base font-black text-white">Social Sharing &amp; OpenGraph Cards</h3>
            <p className="text-xs text-slate-400">
              Customize social link previews displayed on WhatsApp, Facebook, Twitter / X, Telegram, and Discord.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              OpenGraph Title (og:title)
            </label>
            <input
              type="text"
              value={ogTitle}
              onChange={(e) => setOgTitle(e.target.value)}
              placeholder="Leave empty to fallback to Meta Title"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-4 py-2.5 text-xs text-white focus:border-[#baff00] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Twitter / X Card Type
            </label>
            <select
              value={twitterCard}
              onChange={(e) => setTwitterCard(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-4 py-2.5 text-xs text-white focus:border-[#baff00] outline-none"
            >
              <option value="summary_large_image">summary_large_image (Large Hero Banner)</option>
              <option value="summary">summary (Square Thumbnail)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              OpenGraph Description (og:description)
            </label>
            <input
              type="text"
              value={ogDescription}
              onChange={(e) => setOgDescription(e.target.value)}
              placeholder="Leave empty to fallback to Meta Description"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-4 py-2.5 text-xs text-white focus:border-[#baff00] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Social Share Image URL (og:image)
            </label>
            <input
              type="text"
              value={ogImage}
              onChange={(e) => setOgImage(e.target.value)}
              placeholder="/og-image.png or full HTTPS image URL"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-4 py-2.5 text-xs text-white focus:border-[#baff00] outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Twitter / X Creator Handle
            </label>
            <input
              type="text"
              value={twitterHandle}
              onChange={(e) => setTwitterHandle(e.target.value)}
              placeholder="@VexaroSMMAdmin"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-4 py-2.5 text-xs text-white focus:border-[#baff00] outline-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* 5. Section 3: Webmaster & Search Console Verification */}
      <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 text-sm">
            🛡️
          </span>
          <div>
            <h3 className="text-base font-black text-white">Webmaster &amp; Search Console Verification</h3>
            <p className="text-xs text-slate-400">
              Verify domain ownership in Google Search Console and Bing Webmaster Tools instantly without code deployment.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Google Search Console Token
              </label>
              <a
                href="https://search.google.com/search-console"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-blue-400 hover:underline"
              >
                Open Google Console ↗
              </a>
            </div>
            <input
              type="text"
              value={googleVerification}
              onChange={(e) => handleGoogleVerificationChange(e.target.value)}
              placeholder="e.g. googleb27b1614a9d4e487 or paste full meta tag"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-4 py-2.5 text-xs text-white focus:border-[#baff00] outline-none font-mono"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Paste either the raw token or the entire &lt;meta name="google-site-verification"&gt; tag from Google.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Bing Webmaster Verification
              </label>
              <a
                href="https://www.bing.com/webmasters"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-blue-400 hover:underline"
              >
                Open Bing Webmaster ↗
              </a>
            </div>
            <input
              type="text"
              value={bingVerification}
              onChange={(e) => handleBingVerificationChange(e.target.value)}
              placeholder="e.g. 78E993B01B765B... or paste full meta tag"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-4 py-2.5 text-xs text-white focus:border-[#baff00] outline-none font-mono"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Paste your raw Bing code or full &lt;meta name="msvalidate.01"&gt; tag, or import directly from Google Search Console in Bing Webmasters.
            </p>
          </div>
        </div>
      </div>

      {/* 6. Section 4: Analytics & Tracking Pixels */}
      <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 text-sm">
            📊
          </span>
          <div>
            <h3 className="text-base font-black text-white">Analytics, Pixels &amp; Custom Header Scripts</h3>
            <p className="text-xs text-slate-400">
              Integrate Google Analytics 4, Tag Manager, Facebook Pixel, and custom tracking codes into the root layout.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Google Analytics 4 (GA4) ID
            </label>
            <input
              type="text"
              value={googleAnalyticsId}
              onChange={(e) => setGoogleAnalyticsId(e.target.value.trim())}
              placeholder="G-XXXXXXXXXX"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-4 py-2.5 text-xs text-white focus:border-[#baff00] outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Google Tag Manager (GTM) ID
            </label>
            <input
              type="text"
              value={gtmId}
              onChange={(e) => setGtmId(e.target.value.trim())}
              placeholder="GTM-XXXXXXX"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-4 py-2.5 text-xs text-white focus:border-[#baff00] outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Meta (Facebook) Pixel ID
            </label>
            <input
              type="text"
              value={metaPixelId}
              onChange={(e) => setMetaPixelId(e.target.value.trim())}
              placeholder="e.g. 123456789012345"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-4 py-2.5 text-xs text-white focus:border-[#baff00] outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              TikTok Pixel ID
            </label>
            <input
              type="text"
              value={tiktokPixelId}
              onChange={(e) => setTiktokPixelId(e.target.value.trim())}
              placeholder="e.g. CXXXXXXXXXXXXX"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-4 py-2.5 text-xs text-white focus:border-[#baff00] outline-none font-mono"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Custom &lt;head&gt; Scripts &amp; Tracking Tags
            </label>
            <textarea
              rows={4}
              value={customHeadScripts}
              onChange={(e) => setCustomHeadScripts(e.target.value)}
              placeholder="<!-- Insert custom verification tags, live chat widgets, or tracking snippets -->"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-4 py-3 text-xs text-emerald-300 focus:border-[#baff00] outline-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* 7. Section 5: Crawlers, Robots.txt & Sitemap Status */}
      <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400 text-sm">
            🤖
          </span>
          <div>
            <h3 className="text-base font-black text-white">Crawler Directives &amp; Indexing Controls</h3>
            <p className="text-xs text-slate-400">
              Enable or disable search engine indexing across the entire site with one click.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          <div className="rounded-xl border border-white/5 bg-[#070d0d] p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white">Search Engine Indexing</span>
                <p className="text-[11px] text-slate-400">Allow search crawlers to index and rank your pages.</p>
              </div>
              <button
                type="button"
                onClick={() => setRobotsIndex(robotsIndex === "true" ? "false" : "true")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition cursor-pointer ${
                  robotsIndex === "true" ? "bg-[#baff00]" : "bg-white/20"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-[#07100f] transition ${
                    robotsIndex === "true" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <div className="mt-2 text-[11px] font-mono">
              Status:{" "}
              <strong className={robotsIndex === "true" ? "text-[#baff00]" : "text-rose-400"}>
                {robotsIndex === "true" ? "INDEX (Allow Search Bots)" : "NOINDEX (Block All Bots)"}
              </strong>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-[#070d0d] p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white">Search Engine Link Following</span>
                <p className="text-[11px] text-slate-400">Allow bots to crawl links found on your pages.</p>
              </div>
              <button
                type="button"
                onClick={() => setRobotsFollow(robotsFollow === "true" ? "false" : "true")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition cursor-pointer ${
                  robotsFollow === "true" ? "bg-[#baff00]" : "bg-white/20"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-[#07100f] transition ${
                    robotsFollow === "true" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <div className="mt-2 text-[11px] font-mono">
              Status:{" "}
              <strong className={robotsFollow === "true" ? "text-[#baff00]" : "text-rose-400"}>
                {robotsFollow === "true" ? "FOLLOW (Crawl links)" : "NOFOLLOW"}
              </strong>
            </div>
          </div>
        </div>

        {/* Live System Links */}
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/5 pt-3">
          <span className="text-xs text-slate-400 font-bold">Quick Validation Links:</span>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono text-cyan-300 hover:bg-white/10"
          >
            /sitemap.xml ↗
          </a>
          <a
            href="/robots.txt"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono text-cyan-300 hover:bg-white/10"
          >
            /robots.txt ↗
          </a>
          <a
            href="/llms.txt"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono text-cyan-300 hover:bg-white/10"
          >
            /llms.txt ↗
          </a>
        </div>
      </div>
    </div>
  );
}
