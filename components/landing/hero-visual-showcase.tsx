"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Social3DIcon } from "@/components/social-3d-icon";
import { fireConfetti } from "./confetti";

interface HeroVisualShowcaseProps {
  hasSession: boolean;
}

type PlatformKey = "instagram" | "tiktok" | "youtube" | "telegram";

interface PlatformConfig {
  key: PlatformKey;
  label: string;
  metricLabel: string;
  baseNumber: number;
  incrementLabel: string;
  ratePer1kUSD: number;
  ratePer1kPKR: number;
  handle: string;
  badge: string;
  gradient: string;
  iconPlatform: string;
  notification: string;
}

const PLATFORMS: Record<PlatformKey, PlatformConfig> = {
  instagram: {
    key: "instagram",
    label: "Instagram",
    metricLabel: "Followers",
    baseNumber: 148520,
    incrementLabel: "+2,480 today",
    ratePer1kUSD: 0.42,
    ratePer1kPKR: 118,
    handle: "@creator.growth",
    badge: "Viral Acceleration",
    gradient: "from-pink-500 via-rose-500 to-amber-500",
    iconPlatform: "instagram",
    notification: "❤️ +1,840 Likes delivered in 22s",
  },
  tiktok: {
    key: "tiktok",
    label: "TikTok",
    metricLabel: "Reel Views",
    baseNumber: 842100,
    incrementLabel: "+48.5K FYP push",
    ratePer1kUSD: 0.08,
    ratePer1kPKR: 22,
    handle: "@tok.viral",
    badge: "FYP Algorithm Push",
    gradient: "from-cyan-400 via-teal-400 to-indigo-500",
    iconPlatform: "tiktok",
    notification: "🚀 Viral Audio & 9.4k Shares active",
  },
  youtube: {
    key: "youtube",
    label: "YouTube",
    metricLabel: "Watch Hours",
    baseNumber: 3940,
    incrementLabel: "98.5% of 4,000h Goal",
    ratePer1kUSD: 2.10,
    ratePer1kPKR: 585,
    handle: "@pro.streamer",
    badge: "Partner Monetization",
    gradient: "from-red-500 via-rose-600 to-orange-500",
    iconPlatform: "youtube",
    notification: "🎬 1,000 High Retention Views started",
  },
  telegram: {
    key: "telegram",
    label: "Telegram",
    metricLabel: "Members",
    baseNumber: 68400,
    incrementLabel: "+940 joined today",
    ratePer1kUSD: 0.35,
    ratePer1kPKR: 98,
    handle: "@crypto_vip_channel",
    badge: "Active Channel",
    gradient: "from-sky-400 via-blue-500 to-indigo-600",
    iconPlatform: "telegram",
    notification: "⚡ 500 Global Post Views added",
  },
};

const QUANTITIES = [1000, 5000, 10000, 25000];

export function HeroVisualShowcase({ hasSession }: HeroVisualShowcaseProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey>("instagram");
  const [selectedQuantity, setSelectedQuantity] = useState<number>(5000);
  const [currentMetric, setCurrentMetric] = useState<number>(PLATFORMS.instagram.baseNumber);
  const [isBoosting, setIsBoosting] = useState(false);
  const [boostCount, setBoostCount] = useState(0);

  const cfg = PLATFORMS[selectedPlatform];

  // Update base metric when platform changes
  useEffect(() => {
    setCurrentMetric(cfg.baseNumber + boostCount * selectedQuantity);
  }, [selectedPlatform, boostCount, selectedQuantity, cfg.baseNumber]);

  // Subtle real-time tick to show active delivery
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMetric((prev) => prev + Math.floor(Math.random() * 3) + 1);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateBoost = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    fireConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);

    setIsBoosting(true);
    setBoostCount((prev) => prev + 1);
    setCurrentMetric((prev) => prev + selectedQuantity);

    setTimeout(() => {
      setIsBoosting(false);
    }, 1800);
  };

  const calculatedUSD = ((selectedQuantity / 1000) * cfg.ratePer1kUSD).toFixed(2);
  const calculatedPKR = Math.round((selectedQuantity / 1000) * cfg.ratePer1kPKR);

  return (
    <div className="relative w-full max-w-[min(100%,32rem)] mx-auto lg:max-w-xl">
      {/* Outer ambient glow behind card */}
      <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-[#baff00]/20 via-emerald-500/15 to-lime-400/20 blur-2xl opacity-75 pointer-events-none" />

      {/* Main Glassmorphic Showcase Container */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-700/80 bg-[#111827]/95 p-5 sm:p-7 shadow-2xl backdrop-blur-2xl">
        {/* Top Header Strip with Platform Switcher */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#baff00] animate-pulse shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 truncate">
              Live Simulator &amp; Wholesale Rates
            </span>
          </div>

          <span className="rounded-full bg-[#baff00]/15 border border-[#baff00]/30 px-2.5 py-0.5 text-[10px] font-black text-[#baff00] shrink-0">
            0% FEE • INSTANT
          </span>
        </div>

        {/* Platform Selection Tabs */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {(Object.keys(PLATFORMS) as PlatformKey[]).map((key) => {
            const item = PLATFORMS[key];
            const active = selectedPlatform === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedPlatform(key)}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 px-2 transition cursor-pointer border ${
                  active
                    ? "border-[#baff00] bg-[#baff00]/15 text-white shadow-lg shadow-[#baff00]/20"
                    : "border-slate-800 bg-[#0d131f] text-slate-400 hover:text-white hover:border-slate-700"
                }`}
              >
                <Social3DIcon platform={item.iconPlatform} size={22} glow={active} />
                <span className="text-[11px] font-bold tracking-tight">{item.label}</span>
                {active && (
                  <span className="absolute -bottom-1 h-1 w-6 rounded-full bg-[#baff00]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Live Profile Visual Growth Card */}
        <div className="mt-4 relative overflow-hidden rounded-2xl border border-slate-700/70 bg-gradient-to-b from-[#141d1d] to-[#0c121e] p-4 sm:p-5 shadow-inner">
          {/* Background subtle mesh glow */}
          <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[#baff00]/10 blur-2xl pointer-events-none" />

          {/* Profile header row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-lime-500 to-emerald-600 font-black text-black text-base shadow-md">
                <span>{cfg.label.charAt(0)}</span>
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#baff00] text-[9px] text-black font-black ring-2 ring-[#0c121e]">
                  ✓
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-white text-sm sm:text-base truncate">
                    {cfg.handle}
                  </span>
                  <span className="rounded-full bg-[#baff00]/15 border border-[#baff00]/30 px-2 py-0.5 text-[9px] font-bold text-[#baff00] uppercase">
                    {cfg.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Direct API Node: <span className="text-emerald-400 font-semibold">Active (0-15m)</span>
                </p>
              </div>
            </div>

            {/* Platform 3D badge */}
            <div className="hidden sm:block shrink-0">
              <Social3DIcon platform={cfg.iconPlatform} size={30} glow />
            </div>
          </div>

          {/* Big Live Dynamic Metric Counter */}
          <div className="mt-4 flex items-baseline justify-between gap-2 border-t border-slate-800/80 pt-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Live {cfg.metricLabel}
              </p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight tabular-nums">
                  {currentMetric.toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-400 bg-emerald-500/15 rounded-md px-1.5 py-0.5">
                  <span className="text-[10px]">▲</span>
                  <span>{cfg.incrementLabel}</span>
                </span>
              </div>
            </div>

            {/* Sparkline Visual SVG */}
            <div className="w-24 sm:w-28 h-10 flex items-end">
              <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id={`grad-${cfg.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#baff00" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#baff00" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 32 Q 25 28, 45 18 T 80 10 T 100 4 L 100 40 L 0 40 Z"
                  fill={`url(#grad-${cfg.key})`}
                />
                <path
                  d="M0 32 Q 25 28, 45 18 T 80 10 T 100 4"
                  fill="none"
                  stroke="#baff00"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="100" cy="4" r="3.5" fill="#baff00" className="animate-ping" />
                <circle cx="100" cy="4" r="3" fill="#ffffff" />
              </svg>
            </div>
          </div>

          {/* Floating Live Delivery Notification Pill */}
          <div className="mt-3 flex items-center justify-between rounded-xl bg-[#0b101c]/80 border border-slate-800 px-3 py-1.5 text-[11px] text-slate-300">
            <span className="truncate">{cfg.notification}</span>
            <span className="text-[#baff00] font-mono text-[10px] shrink-0 font-bold ml-2">● Real-time</span>
          </div>
        </div>

        {/* Quantity Selection Buttons */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
            <span>Select Target Volume:</span>
            <span className="text-[#baff00] font-bold">+{selectedQuantity.toLocaleString()} {cfg.metricLabel}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {QUANTITIES.map((qty) => {
              const active = selectedQuantity === qty;
              return (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setSelectedQuantity(qty)}
                  className={`rounded-xl py-2 text-xs font-black transition cursor-pointer border ${
                    active
                      ? "border-[#baff00] bg-[#baff00] text-black shadow-md shadow-[#baff00]/30"
                      : "border-slate-800 bg-[#0d131f] text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  +{qty >= 1000 ? `${qty / 1000}k` : qty}
                </button>
              );
            })}
          </div>
        </div>

        {/* Transparent Wholesale Price & Details Bar */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-[#0d131f] p-3 text-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Wholesale Price</p>
            <p className="mt-0.5 text-sm sm:text-base font-black text-[#baff00]">
              ₨{calculatedPKR} <span className="text-xs font-semibold text-slate-400">(${calculatedUSD})</span>
            </p>
          </div>
          <div className="border-x border-slate-800">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Time</p>
            <p className="mt-0.5 text-sm sm:text-base font-black text-emerald-400">⚡ 0 - 8 mins</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guarantee</p>
            <p className="mt-0.5 text-sm sm:text-base font-black text-white">30-Day Refill</p>
          </div>
        </div>

        {/* Interactive Action Buttons */}
        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={handleSimulateBoost}
            className={`w-full relative overflow-hidden flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#baff00] via-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 py-3.5 text-sm font-black text-black shadow-lg shadow-[#baff00]/30 transition transform active:scale-95 cursor-pointer ${
              isBoosting ? "ring-2 ring-[#baff00] ring-offset-2 ring-offset-[#111827]" : ""
            }`}
          >
            {isBoosting ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                <span>Simulating Viral Surge (+{selectedQuantity.toLocaleString()})...</span>
              </>
            ) : (
              <>
                <span>🚀 Simulate Instant Boost</span>
                <span className="text-xs font-bold opacity-80">(Try It Free)</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <Link
              href={hasSession ? "/dashboard" : "/signup"}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#baff00]/30 bg-[#baff00]/10 hover:bg-[#baff00]/20 py-2.5 text-xs font-black text-[#baff00] transition"
            >
              <span>{hasSession ? "Open Dashboard →" : "Create Account & Boost"}</span>
            </Link>
            {!hasSession && (
              <Link
                href="/login"
                className="rounded-xl border border-slate-800 bg-[#0d131f] hover:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Local Payment Badges in Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Local PKR &amp; Global Crypto Gateways:</span>
          <span className="font-bold text-slate-300">JazzCash • Easypaisa • Binance</span>
        </div>
      </div>
    </div>
  );
}
