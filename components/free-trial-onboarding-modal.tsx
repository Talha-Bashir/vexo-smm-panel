"use client";

import { useState } from "react";

export type TrialOptionKey = "tiktok_views" | "insta_views" | "tiktok_likes" | "insta_likes";

interface TrialOption {
  key: TrialOptionKey;
  title: string;
  platform: "TikTok" | "Instagram";
  type: "Views" | "Likes";
  quantity: number;
  badge: string;
  defaultServiceId: number;
  placeholder: string;
  icon: string;
}

const TRIAL_OPTIONS: TrialOption[] = [
  {
    key: "tiktok_views",
    title: "TikTok Views",
    platform: "TikTok",
    type: "Views",
    quantity: 1000,
    badge: "1,000 Views",
    defaultServiceId: 4573,
    placeholder: "https://www.tiktok.com/@username/video/7123456789...",
    icon: "tiktok",
  },
  {
    key: "insta_views",
    title: "Instagram Views",
    platform: "Instagram",
    type: "Views",
    quantity: 1000,
    badge: "1,000 Views",
    defaultServiceId: 4575,
    placeholder: "https://www.instagram.com/reel/Cz123456789/...",
    icon: "instagram",
  },
  {
    key: "tiktok_likes",
    title: "TikTok Likes",
    platform: "TikTok",
    type: "Likes",
    quantity: 50,
    badge: "50 Likes",
    defaultServiceId: 4574,
    placeholder: "https://www.tiktok.com/@username/video/7123456789...",
    icon: "tiktok",
  },
  {
    key: "insta_likes",
    title: "Instagram Likes",
    platform: "Instagram",
    type: "Likes",
    quantity: 50,
    badge: "50 Likes",
    defaultServiceId: 4576,
    placeholder: "https://www.instagram.com/p/Cz123456789/...",
    icon: "instagram",
  },
];

interface FreeTrialOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  services: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onOrderCreated: (order: any) => void;
  onNavigateOrders: () => void;
  userName?: string;
}

export function FreeTrialOnboardingModal({
  isOpen,
  onClose,
  services,
  onOrderCreated,
  onNavigateOrders,
  userName = "Creator",
}: FreeTrialOnboardingModalProps) {
  const [selectedKey, setSelectedKey] = useState<TrialOptionKey>("tiktok_views");
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successOrder, setSuccessOrder] = useState<{ id?: string; quantity: number; title: string } | null>(null);

  if (!isOpen) return null;

  const currentOption = TRIAL_OPTIONS.find((o) => o.key === selectedKey) || TRIAL_OPTIONS[0];

  // Match corresponding service from catalog or fallback to default
  const matchedService =
    services.find((s) => {
      if (!s.category?.includes("Free Test Trial") && Number(s.price) !== 0) return false;
      const name = String(s.name || "").toLowerCase();
      const isPlatform = currentOption.platform.toLowerCase() === "tiktok" ? name.includes("tiktok") : (name.includes("instagram") || name.includes("insta"));
      const isType = currentOption.type === "Views" ? name.includes("view") : name.includes("like");
      return isPlatform && isType;
    }) || { id: currentOption.defaultServiceId, name: `${currentOption.title} [Free Test Trial]`, platform: currentOption.platform, price: "0" };

  async function handleLaunchTrial(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const cleanLink = link.trim();
    if (!cleanLink) {
      setError("Please paste your public post or video URL.");
      return;
    }

    if (!cleanLink.startsWith("http://") && !cleanLink.startsWith("https://")) {
      setError("Link must begin with https:// (e.g. https://www.tiktok.com/...)");
      return;
    }

    setLoading(true);

    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `trial-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: String(matchedService.id),
          link: cleanLink,
          quantity: String(currentOption.quantity),
          idempotencyKey,
          platform: currentOption.platform,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to launch free test trial.");
      }

      const createdOrder = {
        localId: `VEXO-${Date.now()}`,
        orderId: data.orderId ? String(data.orderId) : undefined,
        serviceId: matchedService.id,
        service: matchedService.name,
        platform: currentOption.platform,
        link: cleanLink,
        quantity: currentOption.quantity,
        rate: 0,
        charge: 0,
        status: "Pending",
        createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
      };

      onOrderCreated(createdOrder);
      setSuccessOrder({
        id: data.orderId ? String(data.orderId) : undefined,
        quantity: currentOption.quantity,
        title: currentOption.title,
      });

      try {
        sessionStorage.setItem("vexo_dismissed_trial_modal", "1");
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to place free trial order.");
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    try {
      sessionStorage.setItem("vexo_dismissed_trial_modal", "1");
    } catch {}
    onClose();
  }

  const firstName = userName ? userName.split(" ")[0] : "Creator";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-800 bg-[#111827] p-6 sm:p-8 shadow-2xl shadow-black/80">
        {/* Background ambient glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-5 top-5 rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {successOrder ? (
          /* ================= SUCCESS CELEBRATION VIEW ================= */
          <div className="relative z-10 py-6 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)] border border-emerald-500/30">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Order Dispatched
              </span>
              <h3 className="mt-3 text-2xl font-black text-white">
                Your Free Trial is Active! 🎉
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                We sent <strong>{successOrder.quantity.toLocaleString()} {successOrder.title}</strong> to your link. Delivery begins in 0–15 minutes!
              </p>
            </div>

            {successOrder.id && (
              <div className="inline-block rounded-xl border border-slate-800 bg-[#0d131f] px-4 py-2 font-mono text-xs text-indigo-400">
                Order ID: #{successOrder.id}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateOrders();
                }}
                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-blue-500 transition cursor-pointer"
              >
                Track Live Status in Orders →
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-3 text-xs font-bold text-slate-300 hover:text-white transition"
              >
                Continue to Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* ================= ONBOARDING CLAIM FORM ================= */
          <div className="relative z-10 space-y-5">
            {/* Header */}
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                <span>🎁</span> 1-Time Free Test Trial
              </span>
              <h2 className="mt-2.5 text-2xl font-black text-white tracking-tight sm:text-3xl">
                Welcome, {firstName}! Test Our Speed For Free.
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Experience our real server delivery before adding any funds. Zero risk, no password required.
              </p>
            </div>

            <form onSubmit={handleLaunchTrial} className="space-y-4">
              {/* Option Cards (2x2 Grid) */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Your Free Service:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {TRIAL_OPTIONS.map((opt) => {
                    const isSelected = selectedKey === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setSelectedKey(opt.key);
                          setError("");
                        }}
                        className={`flex flex-col items-start rounded-2xl border p-3 text-left transition cursor-pointer ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-500/15 shadow-md shadow-indigo-500/20"
                            : "border-slate-800 bg-[#0d131f] hover:border-slate-700 hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="text-base font-bold text-white">
                            {opt.platform === "TikTok" ? "🎵" : "📸"}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                              isSelected
                                ? "bg-indigo-500 text-white"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {opt.badge}
                          </span>
                        </div>
                        <p className="mt-2 text-xs font-bold text-white">{opt.title}</p>
                        <p className="text-[10px] text-emerald-400 font-semibold">₨ 0.00 (Free)</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Link Input */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span>Your {currentOption.platform} Post / Video URL:</span>
                  <span className="text-[10px] font-semibold text-emerald-400 lowercase tracking-normal">
                    public links only
                  </span>
                </label>
                <input
                  type="url"
                  value={link}
                  onChange={(e) => {
                    setLink(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder={currentOption.placeholder}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-slate-800 bg-[#0d131f] px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-300">
                  {error}
                </div>
              )}

              {/* CTA Buttons */}
              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-blue-500 transition disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Dispatching order...
                    </span>
                  ) : (
                    <>
                      <span>⚡ Launch Free Trial Now (₨ 0.00)</span>
                      <span>→</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-xl border border-slate-800 bg-slate-800/50 px-4 py-3 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Maybe later
                </button>
              </div>
            </form>

            {/* WhatsApp VIP Channel Footer */}
            <div className="border-t border-slate-800/80 pt-3 text-center">
              <a
                href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 hover:underline"
              >
                <span>💬</span>
                <span>Join Official WhatsApp Channel for Daily Drop Alerts &amp; Codes</span>
                <span className="text-[9px]">↗</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
