"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export interface ToolPlan {
  duration: string;
  durationDays: number;
  pricePkr: number;
  priceUsd?: number;
  popular?: boolean;
  stockCount?: number;
  inStock?: boolean;
}

export interface ToolProduct {
  id: string;
  name: string;
  category: "ai" | "seo" | "smm_bots" | "streaming";
  categoryLabel: string;
  icon: string;
  badge?: string;
  shortDesc: string;
  features: string[];
  plans: ToolPlan[];
  deliveryType?: "LINK" | "COUPON" | "READY_ACCOUNT" | "LICENSE_KEY";
  productSlug?: string;
  isPartnerBot?: boolean;
}

export interface UserSubscription {
  id: string;
  tool_id: string;
  tool_name: string;
  category: string;
  plan_duration: string;
  price_pkr: number;
  delivery_contact: string;
  status: string;
  license_or_access: string;
  instructions: string;
  delivery_type?: "LINK" | "COUPON" | "READY_ACCOUNT" | "LICENSE_KEY";
  provider_order_code?: string;
  expires_at: string;
  created_at: string;
}

export function SubscriptionsPage({
  walletBalancePkr,
  selectedCurrency,
  currencyRates,
  formatBalance,
  onBalanceUpdated,
  navigate,
}: {
  walletBalancePkr: number;
  selectedCurrency: string;
  currencyRates: Record<string, number>;
  formatBalance: (code: string, rates: Record<string, number>, pkr: number) => string;
  onBalanceUpdated: () => void;
  navigate: (page: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"catalog" | "my_subs">("catalog");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [catalog, setCatalog] = useState<ToolProduct[]>([]);
  const [mySubs, setMySubs] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [partnerBotActive, setPartnerBotActive] = useState<boolean>(false);
  const [isLiveBot, setIsLiveBot] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string>("");

  // Selected plan per tool: { [toolId]: planDuration }
  const [selectedPlans, setSelectedPlans] = useState<Record<string, string>>({});

  // Purchase modal state
  const [purchasingTool, setPurchasingTool] = useState<ToolProduct | null>(null);
  const [deliveryContact, setDeliveryContact] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [purchaseError, setPurchaseError] = useState<string>("");
  const [purchaseSuccess, setPurchaseSuccess] = useState<UserSubscription | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [isRefreshingStock, setIsRefreshingStock] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [stockCounts, setStockCounts] = useState<{ inStock: number; outOfStock: number }>({ inStock: 0, outOfStock: 0 });

  useEffect(() => {
    setMounted(true);
    loadSubscriptions(false);

    // Automatically check live stock from Telegram Bot every 15 seconds
    const interval = setInterval(() => {
      loadSubscriptions(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Lock scroll and handle Escape key when purchase modal is open
  useEffect(() => {
    if (!purchasingTool) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPurchasingTool(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [purchasingTool]);

  function copyToClipboard(text: string, label: string = "Copied to clipboard!") {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(""), 2500);
  }

  async function loadSubscriptions(silent: boolean = false) {
    try {
      if (!silent) setLoading(true);
      else setIsRefreshingStock(true);

      const res = await fetch(`/api/subscriptions?_t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        const nextCatalog: ToolProduct[] = data.catalog || [];
        setCatalog(nextCatalog);
        setMySubs(data.userSubscriptions || []);
        setPartnerBotActive(Boolean(data.partnerBotActive));
        setIsLiveBot(Boolean(data.isLiveBot));
        setStockCounts({
          inStock: typeof data.inStockCount === "number" ? data.inStockCount : nextCatalog.filter(t => t.plans.some(p => p.inStock !== false && (p.stockCount === undefined || p.stockCount > 0))).length,
          outOfStock: typeof data.outOfStockCount === "number" ? data.outOfStockCount : nextCatalog.filter(t => t.plans.every(p => p.inStock === false || (p.stockCount !== undefined && p.stockCount <= 0))).length,
        });
        setLastSyncTime(new Date());

        // Keep purchasingTool updated with live stock if modal is currently open
        setPurchasingTool((prev) => {
          if (!prev) return null;
          const fresh = nextCatalog.find((t) => t.id === prev.id);
          return fresh ? fresh : prev;
        });

        // Initialize default plans
        setSelectedPlans((prev) => {
          const next = { ...prev };
          for (const t of nextCatalog) {
            if (!next[t.id]) {
              const pop = t.plans.find((p: ToolPlan) => p.popular) || t.plans[0];
              if (pop) next[t.id] = pop.duration;
            }
          }
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to load subscriptions:", err);
    } finally {
      setLoading(false);
      setIsRefreshingStock(false);
    }
  }

  const categories = useMemo(() => [
    { id: "all", label: "All Tools" },
    { id: "ai", label: "🤖 AI & Content" },
    { id: "seo", label: "📈 SEO & Marketing" },
    { id: "smm_bots", label: "⚡ SMM Automation Software" },
    { id: "streaming", label: "🎬 Premium & Streaming" },
  ], []);

  const filteredCatalog = useMemo(() => {
    let list = catalog;
    if (categoryFilter !== "all") {
      list = list.filter((t) => t.category === categoryFilter);
    }
    if (inStockOnly) {
      list = list.filter((t) => {
        const currentDuration = selectedPlans[t.id] || t.plans[0]?.duration;
        const plan = t.plans.find((p) => p.duration === currentDuration) || t.plans[0];
        return plan && plan.inStock !== false && (plan.stockCount === undefined || plan.stockCount > 0);
      });
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.shortDesc.toLowerCase().includes(q) ||
        t.categoryLabel.toLowerCase().includes(q)
      );
    }
    return list;
  }, [catalog, categoryFilter, searchQuery, inStockOnly, selectedPlans]);

  function handleSelectPlan(toolId: string, duration: string) {
    setSelectedPlans((prev) => ({ ...prev, [toolId]: duration }));
  }

  function openPurchaseModal(tool: ToolProduct) {
    setPurchasingTool(tool);
    setPurchaseError("");
    setPurchaseSuccess(null);
  }

  async function handleConfirmPurchase() {
    if (!purchasingTool) return;
    setPurchaseError("");

    if (!deliveryContact.trim()) {
      setPurchaseError("Please enter your delivery email address or WhatsApp phone number.");
      return;
    }

    const currentDuration = selectedPlans[purchasingTool.id] || (purchasingTool.plans && purchasingTool.plans[0] ? purchasingTool.plans[0].duration : "");
    const plan = purchasingTool.plans.find((p) => p.duration === currentDuration) || (purchasingTool.plans ? purchasingTool.plans[0] : null);
    if (!plan) return;

    const isPlanOutOfStock = plan.inStock === false || (plan.stockCount !== undefined && plan.stockCount <= 0);
    if (isPlanOutOfStock) {
      setPurchaseError("This tool is currently out of stock in bot inventory. As soon as the bot restocks, it will become available.");
      loadSubscriptions(true);
      return;
    }

    if (walletBalancePkr < plan.pricePkr) {
      setPurchaseError(`Insufficient wallet balance. You need ₨${plan.pricePkr.toLocaleString()}, but your balance is ₨${walletBalancePkr.toLocaleString()}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolId: purchasingTool.id,
          planDuration: plan.duration,
          deliveryContact: deliveryContact.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.outOfStock) {
          loadSubscriptions(true);
        }
        throw new Error(data.error || "Subscription activation failed.");
      }

      setPurchaseSuccess(data.subscription);
      onBalanceUpdated();
      setMySubs((prev) => [data.subscription, ...prev]);
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : "Failed to activate subscription.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-7xl min-w-0 space-y-6">
      {/* Floating Copy Feedback */}
      {copyFeedback && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-500/40 bg-[#0d1f18] px-4 py-2.5 text-xs font-bold text-emerald-300 shadow-2xl flex items-center gap-2">
          <span>✓</span>
          <span>{copyFeedback}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-gradient-to-r from-[#0d1618] via-[#121f21] to-[#0d1618] p-6 sm:p-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#baff00]/30 bg-[#baff00]/10 px-3 py-1 text-xs font-bold text-[#baff00]">
              <span>✨ Premium Digital Subscriptions &amp; Software</span>
            </div>
            {(partnerBotActive || isLiveBot) && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>⚡ Live Telegram Bot API Active (Instant Delivery)</span>
              </div>
            )}
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Tools &amp; Subscriptions Store
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl">
            Get private access to ChatGPT Plus, Canva Pro, Semrush, WhatsApp marketing software, and streaming passes with instant wallet checkout.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-[#0a1110] p-1">
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "catalog"
                ? "bg-[#baff00] text-[#07100f] font-black shadow-md"
                : "text-slate-300 hover:text-white"
            }`}
          >
            🛒 Browse Tools ({catalog.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("my_subs")}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "my_subs"
                ? "bg-[#baff00] text-[#07100f] font-black shadow-md"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <span>🔑 My Subscriptions</span>
            {mySubs.length > 0 && (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                activeTab === "my_subs" ? "bg-[#07100f] text-[#baff00]" : "bg-[#baff00] text-[#07100f]"
              }`}>
                {mySubs.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* VIEW 1: BROWSE CATALOG */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryFilter(c.id)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition border ${
                    categoryFilter === c.id
                      ? "border-[#baff00] bg-[#baff00] text-[#07100f] font-black shadow-sm"
                      : "border-white/10 bg-[#0b1418] text-slate-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {stockCounts.inStock > 0 && (
                <div className="hidden lg:flex items-center gap-2 rounded-xl border border-white/10 bg-[#081013] px-3 py-1.5 text-[11px]">
                  <span className="flex items-center gap-1 font-bold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {stockCounts.inStock} In Stock
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-amber-400 font-semibold">
                    {stockCounts.outOfStock} Awaiting Bot Restock
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setInStockOnly(!inStockOnly)}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition flex items-center gap-1.5 border shrink-0 ${
                  inStockOnly
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 font-black shadow-sm"
                    : "border-white/10 bg-[#0b1418] text-slate-400 hover:text-white"
                }`}
                title="Filter to show only in-stock items"
              >
                <span className={`h-2 w-2 rounded-full ${inStockOnly ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                <span>In Stock Only</span>
              </button>

              <button
                type="button"
                onClick={() => loadSubscriptions(true)}
                disabled={isRefreshingStock}
                className="rounded-xl border border-white/10 bg-[#0b1418] px-3 py-2 text-xs font-bold text-slate-300 hover:text-white transition flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                title="Check live stock from Telegram Bot API"
              >
                <span className={isRefreshingStock ? "animate-spin text-[#baff00]" : "text-emerald-400"}>↻</span>
                <span className="hidden md:inline">
                  {isRefreshingStock ? "Checking Bot Stock..." : "Check Live Stock"}
                </span>
              </button>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tools & subscriptions..."
                  className="w-full rounded-xl border border-white/10 bg-[#0b1418] px-3.5 py-2 text-xs text-white outline-none transition focus:border-[#baff00] placeholder-slate-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2 text-xs text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tools Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 rounded-2xl border border-white/5 bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#0a1110] p-12 text-center">
              <p className="text-sm text-slate-400">No tools found matching this search or category.</p>
              <button
                type="button"
                onClick={() => { setCategoryFilter("all"); setSearchQuery(""); }}
                className="mt-3 rounded-xl bg-[#baff00] px-4 py-2 text-xs font-bold text-[#07100f]"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCatalog.map((tool) => {
                const currentDuration = selectedPlans[tool.id] || tool.plans[0].duration;
                const activePlan = tool.plans.find((p) => p.duration === currentDuration) || tool.plans[0];
                const isOutOfStock = activePlan.inStock === false || (activePlan.stockCount !== undefined && activePlan.stockCount <= 0);

                return (
                  <div
                    key={tool.id}
                    className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0b1418] p-5 shadow-lg transition hover:border-[#baff00]/40 group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-lg bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {tool.categoryLabel}
                          </span>
                          {tool.deliveryType === "LINK" && (
                            <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                              🔗 Instant Link
                            </span>
                          )}
                          {tool.deliveryType === "COUPON" && (
                            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                              🎟️ Instant Coupon
                            </span>
                          )}
                          {tool.deliveryType === "READY_ACCOUNT" && (
                            <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                              👤 Ready Account
                            </span>
                          )}
                        </div>
                        {isOutOfStock ? (
                          <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/30 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                            <span>Out of Stock</span>
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#baff00]/20 px-2.5 py-0.5 text-[10px] font-black text-[#baff00] border border-[#baff00]/30 flex items-center gap-1">
                            {activePlan.stockCount !== undefined && activePlan.stockCount > 0 ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#baff00] animate-pulse" />
                            ) : null}
                            <span>{tool.badge || (activePlan.stockCount ? `${activePlan.stockCount} in Stock` : "Instant")}</span>
                          </span>
                        )}
                      </div>

                      {/* Tool Title & Description */}
                      <h3 className="text-base font-black text-white group-hover:text-[#baff00] transition-colors">
                        {tool.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                        {tool.shortDesc}
                      </p>

                      {/* Features Bullet List */}
                      <div className="mt-4 space-y-1.5 border-t border-white/5 pt-3">
                        {tool.features.map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                            <span className="text-[#baff00] font-black text-[11px] mt-0.5">✓</span>
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pricing & Purchase Area */}
                    <div className="mt-5 border-t border-white/5 pt-4 space-y-3">
                      {/* Plan Duration Selector (if multiple plans) */}
                      {tool.plans.length > 1 && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                            Select Duration:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {tool.plans.map((p) => {
                              const isSelected = p.duration === currentDuration;
                              return (
                                <button
                                  key={p.duration}
                                  type="button"
                                  onClick={() => handleSelectPlan(tool.id, p.duration)}
                                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                    isSelected
                                      ? "bg-[#baff00] text-[#07100f] font-black shadow-sm"
                                      : "border border-white/10 bg-[#121d20] text-slate-300 hover:border-white/20"
                                  }`}
                                >
                                  {p.duration}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Price Display */}
                      <div className="flex items-baseline justify-between gap-2">
                        <div>
                          <span className="text-2xl font-black text-[#baff00]">
                            {selectedCurrency === "USD"
                              ? `$${(activePlan.priceUsd ?? (activePlan.pricePkr / 278)).toFixed(2)}`
                              : `₨${activePlan.pricePkr.toLocaleString()}`}
                          </span>
                          <span className="text-xs text-slate-400 ml-1">
                            / {activePlan.duration}
                          </span>
                        </div>
                        <div className="text-right space-y-0.5">
                          <div>
                            {selectedCurrency === "USD" ? (
                              <span className="text-xs font-semibold text-slate-400">
                                ≈ ₨{activePlan.pricePkr.toLocaleString()} PKR
                              </span>
                            ) : selectedCurrency === "PKR" ? (
                              <span className="text-xs font-semibold text-slate-400">
                                ≈ ${(activePlan.priceUsd ?? (activePlan.pricePkr / 278)).toFixed(2)} USD
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400">
                                ≈ {formatBalance(selectedCurrency, currencyRates, activePlan.pricePkr)}
                              </span>
                            )}
                          </div>
                          {isOutOfStock ? (
                            <span className="inline-block text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                              Out of Stock
                            </span>
                          ) : activePlan.stockCount !== undefined ? (
                            <span className="inline-block text-[10px] font-bold text-emerald-400">
                              ✓ {activePlan.stockCount} in stock
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* CTA Button */}
                      {isOutOfStock ? (
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            disabled
                            className="w-full rounded-xl bg-white/5 py-2.5 text-xs font-bold text-slate-400 cursor-not-allowed border border-white/5 flex items-center justify-center gap-1.5"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400/80" />
                            <span>Sold Out (Awaiting Bot Restock)</span>
                          </button>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                            <span>0 units in bot inventory</span>
                            <button
                              type="button"
                              onClick={() => loadSubscriptions(true)}
                              className="text-[#baff00] hover:underline font-bold flex items-center gap-1"
                            >
                              <span>↻ Check Stock</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openPurchaseModal(tool)}
                          className="w-full rounded-xl bg-[#baff00] py-2.5 text-xs font-black text-[#07100f] transition hover:bg-[#d2ff5a] shadow-[0_4px_14px_rgba(186,255,0,0.2)] flex items-center justify-center gap-1.5"
                        >
                          <span>⚡ Subscribe Now</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: MY ACTIVE SUBSCRIPTIONS */}
      {activeTab === "my_subs" && (
        <div className="space-y-4">
          {mySubs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#0a1110] p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-2xl mb-3">
                🔑
              </div>
              <h3 className="text-base font-bold text-white">No active tool subscriptions yet</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                Explore our catalog of AI tools, SEO software, and streaming subscriptions to boost your digital productivity.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("catalog")}
                className="mt-4 rounded-xl bg-[#baff00] px-5 py-2.5 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] transition"
              >
                Browse Subscriptions Catalog →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mySubs.map((sub) => {
                const expiresDate = new Date(sub.expires_at);
                const isExpired = expiresDate.getTime() < Date.now();
                const daysRemaining = Math.max(0, Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                const isLink = sub.delivery_type === "LINK" || sub.license_or_access?.startsWith("http");
                const isCoupon = sub.delivery_type === "COUPON";
                const isReadyAccount = sub.delivery_type === "READY_ACCOUNT";

                return (
                  <div
                    key={sub.id}
                    className="rounded-2xl border border-white/10 bg-[#0b1418] p-5 space-y-4 shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {sub.category}
                          </span>
                          {isLink && (
                            <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                              🔗 Link
                            </span>
                          )}
                          {isCoupon && (
                            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                              🎟️ Coupon
                            </span>
                          )}
                          {isReadyAccount && (
                            <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                              👤 Ready Account
                            </span>
                          )}
                        </div>
                        <h4 className="mt-1 text-base font-black text-white">{sub.tool_name}</h4>
                        <span className="text-xs text-slate-400">{sub.plan_duration}</span>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isExpired
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-[#baff00]/20 text-[#baff00] border border-[#baff00]/30 font-black"
                      }`}>
                        {isExpired ? "Expired" : `Active (${daysRemaining}d left)`}
                      </span>
                    </div>

                    {/* License & Instructions */}
                    <div className="rounded-xl border border-white/10 bg-[#060c0d] p-3.5 space-y-3 text-xs">
                      {isLink ? (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] uppercase font-bold text-cyan-400">🔗 Activation Link</span>
                            <span className="text-[10px] text-slate-400">Open in browser to claim</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              readOnly
                              value={sub.license_or_access}
                              className="w-full select-all rounded-lg border border-cyan-500/30 bg-[#041217] px-2.5 py-1.5 font-mono text-xs text-cyan-300 outline-none truncate"
                            />
                            <a
                              href={sub.license_or_access}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-black text-[#07100f] hover:bg-cyan-300 transition flex items-center gap-1"
                            >
                              Open ↗
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(sub.license_or_access, "Activation link copied!")}
                              className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:text-white"
                              title="Copy URL"
                            >
                              📋
                            </button>
                          </div>
                        </div>
                      ) : isCoupon ? (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] uppercase font-bold text-amber-400">🎟️ Redeemable Coupon / Promo Code</span>
                            <span className="text-[10px] text-slate-400">Use on official platform</span>
                          </div>
                          <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-[#171304] px-3 py-2 font-mono text-xs font-black text-amber-300">
                            <span className="select-all tracking-wider text-sm">{sub.license_or_access}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(sub.license_or_access, "Coupon code copied!")}
                              className="rounded-lg bg-amber-400 px-2.5 py-1 text-xs font-black text-[#07100f] hover:bg-amber-300 transition"
                            >
                              Copy Code
                            </button>
                          </div>
                        </div>
                      ) : isReadyAccount ? (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] uppercase font-bold text-purple-400">👤 Account Login Credentials</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(sub.license_or_access, "Account credentials copied!")}
                              className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 hover:bg-purple-500/30"
                            >
                              📋 Copy All
                            </button>
                          </div>
                          <div className="rounded-lg border border-purple-500/30 bg-[#120717] p-2.5 font-mono text-xs text-purple-200 select-all whitespace-pre-wrap break-all">
                            {sub.license_or_access}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">License / Access Key</span>
                          <div className="flex items-center justify-between rounded-lg bg-black/40 px-2.5 py-1.5 font-mono text-xs text-[#baff00]">
                            <span className="select-all truncate">{sub.license_or_access}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(sub.license_or_access, "License key copied!")}
                              className="ml-2 text-slate-400 hover:text-white"
                              title="Copy to clipboard"
                            >
                              📋
                            </button>
                          </div>
                        </div>
                      )}

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Setup Instructions</span>
                        <p className="mt-0.5 text-slate-300 leading-relaxed text-[11px]">
                          {sub.instructions}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px] text-slate-400">
                        <div>
                          <span>Delivery to:</span> <strong className="text-white ml-1">{sub.delivery_contact}</strong>
                        </div>
                        <div>
                          <span>Expires:</span> <strong className="text-white ml-1">{expiresDate.toLocaleDateString()}</strong>
                        </div>
                      </div>
                      {sub.provider_order_code && (
                        <div className="text-[10px] text-slate-500 font-mono pt-1">
                          Ref Order: {sub.provider_order_code}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PURCHASE CONFIRMATION MODAL */}
      {mounted && purchasingTool && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 sm:p-6 backdrop-blur-md overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPurchasingTool(null);
          }}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-[#0e1719] p-6 sm:p-8 text-white shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(186,255,0,0.1)] my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {purchaseSuccess ? (
              <div className="text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#baff00]/20 text-3xl shadow-[0_0_20px_rgba(186,255,0,0.3)]">
                  🎉
                </div>
                <h3 className="text-xl font-black text-white">
                  Subscription Activated Successfully!
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your access to <strong className="text-[#baff00]">{purchasingTool.name}</strong> is now live.
                </p>

                <div className="rounded-xl border border-white/10 bg-[#060c0d] p-4 text-left space-y-3 text-xs">
                  {purchaseSuccess.delivery_type === "LINK" || purchaseSuccess.license_or_access?.startsWith("http") ? (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-cyan-400 block mb-1.5">🔗 Direct Activation URL</span>
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={purchaseSuccess.license_or_access}
                          className="w-full select-all rounded-lg border border-cyan-500/30 bg-[#041217] px-2.5 py-2 font-mono text-xs text-cyan-300 outline-none truncate"
                        />
                        <a
                          href={purchaseSuccess.license_or_access}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-black text-[#07100f] hover:bg-cyan-300 transition"
                        >
                          Open Link ↗
                        </a>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(purchaseSuccess.license_or_access, "Activation link copied!")}
                          className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:text-white"
                          title="Copy URL"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                  ) : purchaseSuccess.delivery_type === "COUPON" ? (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1.5">🎟️ Redeemable Coupon Code</span>
                      <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-[#171304] px-3 py-2 font-mono text-base font-black text-amber-300">
                        <span className="select-all tracking-wider">{purchaseSuccess.license_or_access}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(purchaseSuccess.license_or_access, "Coupon code copied!")}
                          className="rounded-lg bg-amber-400 px-3 py-1 text-xs font-black text-[#07100f] hover:bg-amber-300 transition"
                        >
                          Copy Code
                        </button>
                      </div>
                    </div>
                  ) : purchaseSuccess.delivery_type === "READY_ACCOUNT" ? (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase font-bold text-purple-400">👤 Account Credentials</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(purchaseSuccess.license_or_access, "Account credentials copied!")}
                          className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 hover:bg-purple-500/30"
                        >
                          📋 Copy All
                        </button>
                      </div>
                      <div className="rounded-lg border border-purple-500/30 bg-[#120717] p-2.5 font-mono text-xs text-purple-200 select-all whitespace-pre-wrap break-all">
                        {purchaseSuccess.license_or_access}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Your License Key</span>
                      <div className="flex items-center justify-between rounded-lg bg-black/40 px-2.5 py-2 font-mono text-xs text-[#baff00]">
                        <span className="select-all truncate">{purchaseSuccess.license_or_access}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(purchaseSuccess.license_or_access, "License key copied!")}
                          className="ml-2 text-slate-400 hover:text-white"
                          title="Copy to clipboard"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                  )}

                  {purchaseSuccess.instructions && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Instructions</span>
                      <p className="mt-0.5 text-slate-300 text-[11px] leading-relaxed">
                        {purchaseSuccess.instructions}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPurchasingTool(null);
                      setActiveTab("my_subs");
                    }}
                    className="w-full rounded-xl bg-[#baff00] py-3 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] transition shadow-[0_4px_14px_rgba(186,255,0,0.25)]"
                  >
                    View in My Subscriptions →
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#baff00]">
                      ⚡ Instant Wallet Checkout
                    </span>
                    <h3 className="mt-1 text-xl font-black text-white">{purchasingTool.name}</h3>
                    <span className="text-xs text-slate-400">{purchasingTool.categoryLabel}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPurchasingTool(null)}
                    className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white hover:border-white/30 transition"
                    title="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {/* Selected Plan Details & Duration Switcher */}
                  {(() => {
                    const plans = purchasingTool.plans || [];
                    const defaultPlan = plans[0] || { duration: "1 Month", pricePkr: 0, priceUsd: 0, durationDays: 30 };
                    const currentDuration = selectedPlans[purchasingTool.id] || defaultPlan.duration;
                    const plan = plans.find((p) => p.duration === currentDuration) || defaultPlan;
                    const isPlanOutOfStock = plan.inStock === false || (plan.stockCount !== undefined && plan.stockCount <= 0);
                    const safeBalance = Number(walletBalancePkr) || 0;
                    const safePrice = Number(plan.pricePkr) || 0;
                    const canAfford = safeBalance >= safePrice;
                    const priceUsd = plan.priceUsd ?? (safePrice > 0 ? Number((safePrice / 278).toFixed(2)) : 0);

                    return (
                      <>
                        {/* Duration switcher if multiple plans exist */}
                        {plans.length > 1 && (
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                              Select Plan Duration:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {plans.map((p) => {
                                const isSelected = p.duration === plan.duration;
                                return (
                                  <button
                                    key={p.duration}
                                    type="button"
                                    onClick={() => handleSelectPlan(purchasingTool.id, p.duration)}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                      isSelected
                                        ? "bg-[#baff00] text-[#07100f] font-black shadow-sm"
                                        : "border border-white/10 bg-[#121d20] text-slate-300 hover:border-white/20"
                                    }`}
                                  >
                                    {p.duration}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Price & Wallet Breakdown Card */}
                        <div className="rounded-2xl bg-[#070e10] p-4 border border-white/10 space-y-2.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Selected Duration:</span>
                            <span className="font-bold text-white bg-white/5 px-2 py-0.5 rounded border border-white/5">
                              {plan.duration}
                            </span>
                          </div>

                          <div className="flex justify-between items-baseline pt-1 border-t border-white/5">
                            <span className="text-slate-400">Subscription Price:</span>
                            <div className="text-right">
                              <span className="font-bold text-[#baff00] text-base">
                                ₨{safePrice.toLocaleString()} PKR
                              </span>
                              <span className="text-[11px] text-slate-400 ml-1.5">
                                (${priceUsd.toFixed(2)} USD)
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between items-baseline pt-1 border-t border-white/5">
                            <span className="text-slate-400">Your Wallet Balance:</span>
                            <div className="text-right">
                              <span className="font-bold text-white">
                                ₨{safeBalance.toLocaleString()} PKR
                              </span>
                              {selectedCurrency !== "PKR" && formatBalance && (
                                <span className="text-[11px] text-slate-400 ml-1.5">
                                  ({formatBalance(selectedCurrency, currencyRates, safeBalance)})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-1 border-t border-white/5">
                            <span className="text-slate-400">Remaining Balance:</span>
                            <span className={`font-bold ${canAfford ? "text-[#baff00]" : "text-red-400"}`}>
                              ₨{Math.max(0, safeBalance - safePrice).toLocaleString()} PKR
                              {!canAfford && (
                                <span className="text-[10px] text-red-400 ml-1 font-normal">
                                  (Short by ₨{(safePrice - safeBalance).toLocaleString()} PKR)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Live Bot Out of Stock Notice */}
                        {isPlanOutOfStock && (
                          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300 flex items-start gap-2.5">
                            <span className="text-base leading-none">⚠️</span>
                            <div className="flex-1">
                              <p className="font-bold">Currently Out of Stock in Bot Inventory</p>
                              <p className="mt-0.5 text-[11px] text-red-200/80 leading-relaxed">
                                Upstream Telegram bot supplier has 0 units available right now. The platform auto-checks for restocks every 15 seconds.
                              </p>
                              <button
                                type="button"
                                onClick={() => loadSubscriptions(true)}
                                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 px-2.5 py-1 text-[11px] font-bold text-red-200 hover:bg-red-500/30 transition border border-red-500/30"
                              >
                                <span>↻ Check for Bot Restock Now</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Delivery Input */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                            Delivery Email or WhatsApp Number <span className="text-[#baff00]">*</span>
                          </label>
                          <input
                            type="text"
                            value={deliveryContact}
                            onChange={(e) => setDeliveryContact(e.target.value)}
                            placeholder="e.g. user@gmail.com or +923001234567"
                            className="w-full rounded-xl border border-white/15 bg-[#070e10] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#baff00] focus:ring-1 focus:ring-[#baff00]/30 placeholder-slate-500 transition"
                          />
                          <span className="mt-1 block text-[11px] text-slate-400">
                            Instant software credentials, activation links, or promo codes will be dispatched here.
                          </span>
                        </div>

                        {/* Error Notice */}
                        {purchaseError && (
                          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-start gap-2">
                            <span className="text-sm leading-none">⚠️</span>
                            <span>{purchaseError}</span>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => setPurchasingTool(null)}
                            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition"
                          >
                            Cancel
                          </button>

                          {isPlanOutOfStock ? (
                            <button
                              type="button"
                              disabled
                              className="rounded-xl bg-white/5 px-5 py-2.5 text-xs font-bold text-slate-500 cursor-not-allowed border border-white/5 flex items-center gap-1.5"
                            >
                              <span>Sold Out (Auto-restocks)</span>
                            </button>
                          ) : canAfford ? (
                            <button
                              type="button"
                              onClick={handleConfirmPurchase}
                              disabled={isSubmitting}
                              className="rounded-xl bg-[#baff00] px-5 py-2.5 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] disabled:opacity-50 transition shadow-[0_4px_14px_rgba(186,255,0,0.25)] flex items-center gap-1.5"
                            >
                              {isSubmitting ? (
                                <>
                                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                  <span>Activating...</span>
                                </>
                              ) : (
                                <span>Confirm &amp; Pay ₨{safePrice.toLocaleString()} (${priceUsd.toFixed(2)})</span>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setPurchasingTool(null);
                                navigate("Add Funds");
                              }}
                              className="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-black text-[#07100f] hover:bg-amber-300 transition shadow-[0_4px_14px_rgba(251,191,36,0.25)]"
                            >
                              Add Funds to Wallet (₨{(safePrice - safeBalance).toLocaleString()} needed)
                            </button>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
