"use client";

import React from "react";
import Link from "next/link";
import { Social3DIcon } from "@/components/social-3d-icon";

interface CreatorStory {
  name: string;
  handle: string;
  role: string;
  avatarImg: string;
  platform: string;
  metric: string;
  metricLabel: string;
  quote: string;
  growthBadge: string;
  timeframe: string;
}

const CREATORS: CreatorStory[] = [
  {
    name: "Zainab Malik",
    handle: "@zainab.vlogs",
    role: "Lifestyle & Fashion",
    avatarImg: "/creators/creator-1.jpg",
    platform: "tiktok",
    metric: "+240K",
    metricLabel: "FYP Followers",
    quote: "10-minute dispatch pushed my Reels straight onto the FYP. Landed two brand sponsorships within 3 weeks!",
    growthBadge: "▲ 4x Brand Deals",
    timeframe: "45 Days",
  },
  {
    name: "Hamza Siddiqui",
    handle: "@digital_reseller_pk",
    role: "Agency Founder",
    avatarImg: "/creators/creator-2.jpg",
    platform: "instagram",
    metric: "₨850K+",
    metricLabel: "Monthly Revenue",
    quote: "Connected our agency portal directly to VEXARO API. 42ms dispatch and our 300+ clients never drop.",
    growthBadge: "▲ Sub-50ms API",
    timeframe: "Automated",
  },
  {
    name: "Farhan Ali",
    handle: "@tech_reviews_ur",
    role: "YouTube Partner",
    avatarImg: "/creators/creator-4.jpg",
    platform: "youtube",
    metric: "4,000h",
    metricLabel: "Watch Time Met",
    quote: "Met the monetization watchtime in under 10 days. WhatsApp support set up organic pacing. Approved!",
    growthBadge: "▲ 100% Monetized",
    timeframe: "10 Days",
  },
  {
    name: "Ayesha Tariq",
    handle: "@deals_and_discounts",
    role: "Telegram Channel Admin",
    avatarImg: "/creators/creator-3.jpg",
    platform: "telegram",
    metric: "+45K",
    metricLabel: "Active Members",
    quote: "Easypaisa & JazzCash deposits credit instantly. Zero drop rate on public channel members and post views.",
    growthBadge: "▲ Zero Drop Shield",
    timeframe: "Non-Drop",
  },
];

export function CreatorProofWall() {
  return (
    <section className="w-full px-[clamp(1rem,4vw,2.5rem)] py-[clamp(3.5rem,6vw,5.5rem)] bg-[#0b0f1a] relative overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-2xl mx-auto">
          <span className="rounded-full border border-[#baff00]/25 bg-[#baff00]/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#baff00]">
            Verified Results
          </span>
          <h2 className="mt-3 text-fluid-h2 font-black tracking-tight text-white">
            Loved by 50,000+ Creators &amp;{" "}
            <span className="bg-gradient-to-r from-[#baff00] via-lime-300 to-emerald-400 bg-clip-text text-transparent">
              Agencies
            </span>
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Real velocity and tangible metrics achieved by creators using our direct wholesale network.
          </p>
        </div>

        {/* Creator Cards Grid with Distinct Real Photos */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CREATORS.map((c) => (
            <div
              key={c.handle}
              className="group relative rounded-3xl border border-slate-800 bg-[#111827] p-5 sm:p-6 transition duration-300 hover:border-[#baff00]/40 hover:bg-[#121b22] flex flex-col justify-between shadow-lg"
            >
              <div>
                {/* Header row with distinct real photo */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={c.avatarImg}
                        alt={c.name}
                        className="h-12 w-12 rounded-2xl object-cover ring-2 ring-[#baff00]/30 shadow-md"
                      />
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#baff00] text-[9px] text-black font-black ring-2 ring-[#111827]">
                        ✓
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-white text-sm">{c.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 block font-mono">{c.handle}</span>
                    </div>
                  </div>

                  <Social3DIcon platform={c.platform} size={24} glow />
                </div>

                {/* Big Metric Badge */}
                <div className="mt-4 rounded-2xl border border-[#baff00]/20 bg-[#baff00]/5 p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-2xl font-black text-white tracking-tight">{c.metric}</p>
                    <span className="rounded bg-[#baff00]/20 text-[#baff00] px-1.5 py-0.5 text-[10px] font-bold font-mono">
                      {c.growthBadge}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold uppercase text-[#baff00] mt-0.5">{c.metricLabel} • {c.timeframe}</p>
                </div>

                {/* Short, punchy quote */}
                <p className="mt-3.5 text-xs leading-relaxed text-slate-300 italic">
                  "{c.quote}"
                </p>
              </div>

              {/* Rating & Role Footer */}
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-semibold">{c.role}</span>
                <div className="flex items-center gap-1">
                  <span className="text-amber-400 font-black">★★★★★</span>
                  <span className="text-[10px] text-emerald-400 font-bold ml-1">Verified</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust highlights banner */}
        <div className="mt-12 rounded-3xl border border-slate-800 bg-gradient-to-r from-[#0f1912] via-[#111827] to-[#0d1712] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-lg sm:text-xl font-black text-white">
              Ready to Accelerate Your Social Media Growth?
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Join thousands of creators who trust VEXARO for direct wholesale rates and 24/7 WhatsApp support.
            </p>
          </div>
          <Link
            href="/signup"
            className="rounded-xl bg-gradient-to-r from-[#baff00] to-lime-400 hover:from-lime-300 hover:to-lime-400 px-7 py-3.5 text-xs sm:text-sm font-black text-black shadow-lg shadow-[#baff00]/25 transition hover:scale-105 shrink-0"
          >
            <span>Create Free Account Now →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
