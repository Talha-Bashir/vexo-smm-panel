"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Social3DIcon } from "@/components/social-3d-icon";

interface ServiceItem {
  id: string;
  name: string;
  platform: string;
  category: string;
  rate_pkr: number;
  rate_usd?: number;
  min: number;
  max: number;
  is_guaranteed?: boolean;
  refill?: boolean;
  description?: string;
  popular?: boolean;
}

const PLATFORMS = [
  { id: "all", label: "All Platforms", icon: "🌐" },
  { id: "subscriptions", label: "App Subscriptions", icon: "⭐" },
  { id: "website", label: "Website", icon: "🌐" },
  { id: "instagram", label: "Instagram", icon: "📸" },
  { id: "tiktok", label: "TikTok", icon: "🎵" },
  { id: "youtube", label: "YouTube", icon: "▶️" },
  { id: "facebook", label: "Facebook", icon: "👍" },
  { id: "telegram", label: "Telegram", icon: "✈️" },
  { id: "twitter", label: "Twitter / X", icon: "🐦" },
  { id: "spotify", label: "Spotify", icon: "🎧" },
];

export function ServicesCatalogClient() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [displayCount, setDisplayCount] = useState(60);
  const [platform, setPlatform] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currency, setCurrency] = useState<"PKR" | "USD">("PKR");
  const [usdRate, setUsdRate] = useState(278);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Debounce search keystrokes to prevent UI thread lockup on typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setDisplayCount(60);
    }, 150);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset pagination when category or platform change
  useEffect(() => {
    setDisplayCount(60);
  }, [platform, selectedCategory]);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((data) => {
        if (data.services && Array.isArray(data.services)) {
          setServices(data.services);
        }
        if (data.usd_to_pkr) {
          setUsdRate(Number(data.usd_to_pkr));
        }
      })
      .catch((err) => console.error("Failed to load services:", err))
      .finally(() => setLoading(false));
  }, []);

  // Unique categories for current platform
  const categories = useMemo(() => {
    const list = new Set<string>();
    services.forEach((s) => {
      if (platform === "all" || s.platform?.toLowerCase() === platform.toLowerCase()) {
        if (s.category) list.add(s.category);
      }
    });
    return Array.from(list).sort();
  }, [services, platform]);

  // Filtered services
  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return services.filter((s) => {
      // Platform filter
      if (platform !== "all" && s.platform?.toLowerCase() !== platform.toLowerCase()) {
        return false;
      }
      // Category filter
      if (selectedCategory !== "all" && s.category !== selectedCategory) {
        return false;
      }
      // Query filter
      if (q) {
        const matchName = s.name.toLowerCase().includes(q);
        const matchId = String(s.id).includes(q);
        const matchCat = (s.category || "").toLowerCase().includes(q);
        if (!matchName && !matchId && !matchCat) return false;
      }
      return true;
    });
  }, [services, platform, selectedCategory, debouncedSearch]);

  function formatPrice(ratePkr: number, rateUsd?: number) {
    if (currency === "USD") {
      const usdVal = rateUsd != null && rateUsd > 0 ? Number(rateUsd) : ratePkr / usdRate;
      return `$${usdVal.toFixed(4)}`;
    }
    return `₨${Number(ratePkr || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <div className="min-h-screen bg-[#070d0d] text-slate-100 flex flex-col selection:bg-[#baff00] selection:text-[#07100f]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070d0d]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#baff00] text-sm font-black text-[#07100f] shadow-[0_0_20px_rgba(186,255,0,0.4)]">
              V
            </span>
            <span className="text-base font-black tracking-tight text-white">
              VEXARO <span className="text-[#baff00]">SMM</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-300">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <Link href="/services" className="text-[#baff00]">Services &amp; Pricing</Link>
            <Link href="/blog" className="hover:text-white transition">Blog</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
          </nav>

          <div className="flex items-center gap-3">
            {/* Currency toggle */}
            <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCurrency("PKR")}
                className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                  currency === "PKR" ? "bg-[#baff00] text-[#07100f]" : "text-slate-400 hover:text-white"
                }`}
              >
                PKR (₨)
              </button>
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                  currency === "USD" ? "bg-[#baff00] text-[#07100f]" : "text-slate-400 hover:text-white"
                }`}
              >
                USD ($)
              </button>
            </div>

            <Link
              href="/login"
              className="hidden sm:inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 transition"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-[#baff00] px-4 py-2 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] transition shadow-[0_0_15px_rgba(186,255,0,0.3)]"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-[#111a1d] to-[#070d0d] px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#baff00]/30 bg-[#baff00]/10 px-4 py-1 text-xs font-black uppercase tracking-wider text-[#cfff62] mb-4">
            <span>⚡ Wholesale Provider Pricing</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Services &amp; Live Rates Catalog
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
            Explore 400+ instant automated social media services with automated drop-refill protection. Pay locally via SadaPay, Easypaisa, JazzCash, or Binance Pay.
          </p>

          {/* Quick Metrics */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {services.length || "400+"} Services Online
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <span>⚡</span> Average Start: 1–15 Mins
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <span>🛡️</span> 30-Day Auto Refill
            </span>
          </div>
        </div>
      </section>

      {/* Main Filter & Search Section */}
      <main className="mx-auto max-w-7xl w-full flex-1 px-4 py-8 sm:px-6 space-y-6">
        {/* Controls Bar */}
        <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-4 sm:p-5 shadow-xl space-y-4">
          {/* Search input */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Service ID, name, or keywords (e.g. 105, Non-Drop, TikTok, Monetization)..."
              className="w-full rounded-xl border border-white/10 bg-[#070d0d] pl-11 pr-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-[#baff00]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕ Clear
              </button>
            )}
          </div>

          {/* Platform Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PLATFORMS.map((p) => {
              const active = platform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPlatform(p.id);
                    setSelectedCategory("all");
                  }}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                    active
                      ? "bg-[#baff00] text-[#07100f] shadow-[0_2px_15px_rgba(186,255,0,0.3)]"
                      : "border border-white/10 bg-[#070d0d] text-slate-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <Social3DIcon platform={p.id} size={18} />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Category Dropdown */}
          {categories.length > 0 && (
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs font-bold text-slate-400 shrink-0">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:max-w-md rounded-xl border border-white/10 bg-[#070d0d] px-3.5 py-2 text-xs font-bold text-white outline-none focus:border-[#baff00]"
              >
                <option value="all">All Categories ({filtered.length} services)</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Results Count & Currency Helper */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 px-1">
          <div>
            Showing <strong className="text-white font-mono">{filtered.length}</strong> services
            {platform !== "all" && <span> in <strong className="text-[#baff00] capitalize">{platform}</strong></span>}
          </div>
          <div className="text-[11px] text-slate-400">
            Rates displayed per <strong className="text-white">1,000 quantity</strong>
          </div>
        </div>

        {/* Services List Table */}
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-12 text-center space-y-3">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#baff00] border-t-transparent"></div>
            <p className="text-xs text-slate-400">Loading wholesale services catalog...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-12 text-center space-y-3">
            <span className="text-3xl">🔍</span>
            <p className="text-sm font-bold text-white">No services matched your search criteria.</p>
            <p className="text-xs text-slate-400">Try searching with a broader keyword or reset the platform filter.</p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPlatform("all");
                setSelectedCategory("all");
              }}
              className="mt-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111a1d] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3.5 sm:px-6">ID</th>
                    <th className="px-4 py-3.5 sm:px-6 min-w-[280px]">Service</th>
                    <th className="px-4 py-3.5 sm:px-6 whitespace-nowrap">Rate / 1k</th>
                    <th className="px-4 py-3.5 sm:px-6 whitespace-nowrap">Min / Max</th>
                    <th className="px-4 py-3.5 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.slice(0, displayCount).map((s) => {
                    const isExpanded = expandedId === s.id;
                    return (
                      <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* ID */}
                        <td className="px-4 py-4 sm:px-6 font-mono font-bold text-slate-400 text-[11px]">
                          #{s.id}
                        </td>

                        {/* Service Title & Badges */}
                        <td className="px-4 py-4 sm:px-6">
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                                <Social3DIcon platform={s.platform || s.category} size={14} />
                                <span>{s.category || s.platform}</span>
                              </span>
                              {s.is_guaranteed && (
                                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                  ✓ Non-Drop Guaranteed
                                </span>
                              )}
                              {s.refill && !s.is_guaranteed && (
                                <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-bold text-cyan-400">
                                  🔄 Auto Refill
                                </span>
                              )}
                              {s.popular && (
                                <span className="rounded-full bg-[#baff00]/10 border border-[#baff00]/30 px-2 py-0.5 text-[10px] font-bold text-[#baff00]">
                                  🔥 Popular
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-white text-xs sm:text-sm leading-snug">
                              {s.name}
                            </span>
                            {s.description && (
                              <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : s.id)}
                                className="block mt-1 text-[11px] text-cyan-400 hover:underline"
                              >
                                {isExpanded ? "▲ Hide Details" : "▼ View Description & Guarantee"}
                              </button>
                            )}
                            {isExpanded && s.description && (
                              <div className="mt-2.5 rounded-xl border border-white/5 bg-[#070d0d] p-3 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                                {s.description}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Rate */}
                        <td className="px-4 py-4 sm:px-6 whitespace-nowrap">
                          <span className="text-sm font-black text-[#baff00] font-mono">
                            {formatPrice(s.rate_pkr, s.rate_usd)}
                          </span>
                          <span className="block text-[10px] text-slate-500">
                            {currency === "PKR"
                              ? `$${(s.rate_usd != null && s.rate_usd > 0 ? Number(s.rate_usd) : s.rate_pkr / usdRate).toFixed(4)} USD`
                              : `₨${Number(s.rate_pkr || 0).toFixed(2)} PKR`}
                          </span>
                        </td>

                        {/* Min / Max */}
                        <td className="px-4 py-4 sm:px-6 whitespace-nowrap font-mono text-[11px] text-slate-300">
                          <div>Min: <strong className="text-white">{s.min?.toLocaleString()}</strong></div>
                          <div>Max: <strong className="text-white">{s.max?.toLocaleString()}</strong></div>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-4 sm:px-6 text-right whitespace-nowrap">
                          <Link
                            href={`/signup?service=${s.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#baff00] px-3.5 py-2 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] transition shadow-sm"
                          >
                            <span>Order</span>
                            <span>→</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length > displayCount && (
              <div className="flex items-center justify-between border-t border-white/10 bg-[#070d0d]/80 p-4">
                <span className="text-xs text-slate-400">
                  Showing <strong className="text-white">{displayCount}</strong> of <strong className="text-white">{filtered.length}</strong> services
                </span>
                <button
                  type="button"
                  onClick={() => setDisplayCount((prev) => prev + 50)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10 hover:border-[#baff00]/40 cursor-pointer"
                >
                  Load More Services (+50)
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-white/10 bg-[#070d0d] px-4 py-8 text-center text-xs text-slate-500 sm:px-6">
        <p>© {new Date().getFullYear()} VEXARO SMM Panel. All rights reserved. Automated Wholesale Social Media Provider.</p>
      </footer>
    </div>
  );
}
