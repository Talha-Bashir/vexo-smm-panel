"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Social3DIcon } from "@/components/social-3d-icon";

export function ViralComparisonSection() {
  const [activeTab, setActiveTab] = useState<"comparison" | "tiktok" | "instagram">("comparison");

  return (
    <section id="features" className="w-full px-[clamp(1rem,4vw,2.5rem)] py-[clamp(3.5rem,6vw,5.5rem)] relative overflow-hidden bg-[#0a0e19]">
      {/* Background glow orbs */}
      <div className="pointer-events-none absolute left-1/4 top-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-[#baff00]/8 blur-[140px]" />
      <div className="pointer-events-none absolute right-10 bottom-10 h-80 w-80 rounded-full bg-emerald-500/8 blur-[130px]" />

      <div className="mx-auto max-w-7xl relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#baff00]/25 bg-[#baff00]/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#baff00]">
            <span>⚡ The Visual Difference</span>
          </div>
          <h2 className="mt-4 text-fluid-h2 font-black tracking-tight text-white">
            See the Algorithmic Surge:{" "}
            <span className="bg-gradient-to-r from-[#baff00] via-lime-300 to-emerald-400 bg-clip-text text-transparent">
              Before vs. After VEXARO
            </span>
          </h2>
          <p className="mt-3 text-fluid-body text-slate-400">
            Social algorithms reward velocity. Here is what happens when you give your content the initial push required to trigger the FYP, Explore feed, and Recommended tabs.
          </p>
        </div>

        {/* Visual Split Cards Grid */}
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* Card 1: WITHOUT VEXARO (The Struggle) */}
          <div className="relative rounded-3xl border border-red-500/20 bg-gradient-to-b from-[#14121a] to-[#0c0c14] p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 px-3 py-1 text-xs font-bold text-rose-400">
                <span>✕</span>
                <span>Without Direct Wholesale Growth</span>
              </span>
              <span className="text-xs font-mono text-slate-500">Stagnant Account</span>
            </div>

            {/* Mock Profile Status */}
            <div className="mt-6 rounded-2xl border border-slate-800/80 bg-[#11131c] p-4 opacity-80">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-400 text-lg font-bold">
                  <span>?</span>
                </div>
                <div>
                  <p className="font-bold text-slate-300 text-sm">@struggling.creator</p>
                  <p className="text-xs text-rose-400 font-semibold">Algorithm Penalty: Low Engagement Velocity</p>
                </div>
              </div>

              {/* Dead stats row */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center border-t border-slate-800/80 pt-3">
                <div>
                  <p className="text-lg font-black text-slate-400">18</p>
                  <p className="text-[10px] text-slate-500 uppercase">Views / Post</p>
                </div>
                <div className="border-x border-slate-800">
                  <p className="text-lg font-black text-slate-400">2</p>
                  <p className="text-[10px] text-slate-500 uppercase">Likes</p>
                </div>
                <div>
                  <p className="text-lg font-black text-slate-400">0</p>
                  <p className="text-[10px] text-slate-500 uppercase">Shares</p>
                </div>
              </div>

              {/* Flatline graph */}
              <div className="mt-4 h-12 w-full flex items-center justify-center bg-slate-900/50 rounded-xl px-2">
                <svg viewBox="0 0 100 20" className="w-full h-8 opacity-40">
                  <path d="M0 10 L 25 11 L 45 9 L 75 10 L 100 10" stroke="#f43f5e" strokeWidth="2" fill="none" />
                </svg>
              </div>
            </div>

            {/* Pain points list - Clean & Scannable */}
            <div className="mt-6 space-y-2.5">
              <div className="flex items-center gap-2.5 rounded-xl border border-red-500/15 bg-rose-500/5 px-3 py-2 text-xs sm:text-sm text-slate-300">
                <span className="text-rose-400 font-black shrink-0">✕</span>
                <span><strong>Stalled Algorithms:</strong> Posts die under 50 views without initial velocity.</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-red-500/15 bg-rose-500/5 px-3 py-2 text-xs sm:text-sm text-slate-300">
                <span className="text-rose-400 font-black shrink-0">✕</span>
                <span><strong>10x Agency Markup:</strong> Middlemen charge $200–$500/mo for manual delays.</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-red-500/15 bg-rose-500/5 px-3 py-2 text-xs sm:text-sm text-slate-300">
                <span className="text-rose-400 font-black shrink-0">✕</span>
                <span><strong>Zero Drop Protection:</strong> Followers vanish with no refills or refunds.</span>
              </div>
            </div>
          </div>

          {/* Card 2: WITH VEXARO (The Algorithmic Surge) */}
          <div className="relative rounded-3xl border border-[#baff00]/35 bg-gradient-to-b from-[#131c15] via-[#0f1712] to-[#0a100d] p-6 sm:p-8 shadow-2xl shadow-[#baff00]/10">
            {/* Ambient corner glow */}
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-[#baff00]/15 blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between pb-4 border-b border-[#baff00]/20">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#baff00]/15 border border-[#baff00]/30 px-3 py-1 text-xs font-black text-[#baff00] uppercase tracking-wide">
                <span>✓</span>
                <span>With VEXARO Automated Engine</span>
              </span>
              <span className="text-xs font-mono font-bold text-[#baff00]">₨120 Wholesale Boost</span>
            </div>

            {/* Active Surge Profile Mockup */}
            <div className="mt-6 rounded-2xl border border-[#baff00]/25 bg-[#121a14]/90 p-4 shadow-lg shadow-[#baff00]/5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#baff00] to-emerald-500 text-black text-lg font-black shadow-md">
                    <span>V</span>
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#baff00] text-[9px] text-black font-bold ring-2 ring-[#121a14]">
                      ✓
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-extrabold text-white text-sm">@vexaro.viral.star</p>
                      <span className="rounded-full bg-[#baff00]/20 text-[#baff00] px-2 py-0.5 text-[9px] font-bold">Verified</span>
                    </div>
                    <p className="text-xs text-emerald-400 font-bold">🚀 FYP Recommendation Engine Triggered</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Social3DIcon platform="tiktok" size={24} glow />
                  <Social3DIcon platform="instagram" size={24} glow />
                </div>
              </div>

              {/* Exploded stats row */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center border-t border-slate-800 pt-3">
                <div>
                  <p className="text-xl sm:text-2xl font-black text-white">485.2K</p>
                  <p className="text-[10px] text-lime-300 font-bold uppercase">Views (+999%)</p>
                </div>
                <div className="border-x border-slate-800">
                  <p className="text-xl sm:text-2xl font-black text-[#baff00]">34.8K</p>
                  <p className="text-[10px] text-emerald-300 font-bold uppercase">Real Likes</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-cyan-400">1,840</p>
                  <p className="text-[10px] text-cyan-300 font-bold uppercase">Saves &amp; Shares</p>
                </div>
              </div>

              {/* Spiking surge graph */}
              <div className="mt-4 h-12 w-full flex items-end bg-[#0c1322] rounded-xl px-2 pb-1 overflow-hidden">
                <svg viewBox="0 0 100 24" className="w-full h-10 overflow-visible">
                  <defs>
                    <linearGradient id="surgeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#baff00" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#baff00" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 22 Q 30 20, 50 14 T 75 6 T 100 1 L 100 24 L 0 24 Z" fill="url(#surgeGrad)" />
                  <path d="M0 22 Q 30 20, 50 14 T 75 6 T 100 1" stroke="#baff00" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <circle cx="100" cy="1" r="3.5" fill="#baff00" className="animate-ping" />
                  <circle cx="100" cy="1" r="2.5" fill="#ffffff" />
                </svg>
              </div>
            </div>

            {/* Benefits list - Punchy & Visual */}
            <div className="mt-6 space-y-2.5">
              <div className="flex items-center gap-2.5 rounded-xl border border-[#baff00]/20 bg-[#baff00]/5 px-3 py-2 text-xs sm:text-sm text-slate-200">
                <span className="text-[#baff00] font-black shrink-0">✓</span>
                <span><strong>Instant 0–15m Ignition:</strong> Sends instant velocity signals to FYP &amp; Explore.</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-[#baff00]/20 bg-[#baff00]/5 px-3 py-2 text-xs sm:text-sm text-slate-200">
                <span className="text-[#baff00] font-black shrink-0">✓</span>
                <span><strong>Wholesale Rates (Save 95%):</strong> Direct provider rates starting from ₨18 / 1k.</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-[#baff00]/20 bg-[#baff00]/5 px-3 py-2 text-xs sm:text-sm text-slate-200">
                <span className="text-[#baff00] font-black shrink-0">✓</span>
                <span><strong>30-Day Auto Refill:</strong> Automated drop shield with 100% money-back safety.</span>
              </div>
            </div>

            <div className="mt-7 pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Ready to boost your metrics?</span>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#baff00] to-lime-400 hover:from-lime-300 hover:to-lime-400 px-5 py-2.5 text-xs font-black text-black shadow-md shadow-[#baff00]/25 transition hover:scale-105"
              >
                <span>Ignite My Profile Now</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
