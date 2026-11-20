"use client";

import React from "react";
import Link from "next/link";
import { Social3DIcon } from "@/components/social-3d-icon";

interface PlatformCard {
  platform: string;
  name: string;
  iconPlatform: string;
  badge: string;
  startingPrice: string;
  speed: string;
  services: string[];
  glowColor: string;
  filterName: string;
}

const PLATFORM_CARDS: PlatformCard[] = [
  {
    platform: "instagram",
    name: "Instagram",
    iconPlatform: "instagram",
    badge: "Most Popular",
    startingPrice: "$0.002 / 1k (₨0.55)",
    speed: "0–8 min start",
    services: ["Non-Drop Followers", "Reels & Video Views", "Targeted Likes", "Story & Live Streams"],
    glowColor: "rgba(225, 48, 108, 0.25)",
    filterName: "Instagram",
  },
  {
    platform: "tiktok",
    name: "TikTok",
    iconPlatform: "tiktok",
    badge: "FYP Algorithm",
    startingPrice: "$0.001 / 1k (₨0.28)",
    speed: "Instant start",
    services: ["Viral FYP Views", "Real Active Followers", "High-Retention Likes", "Saves & Shares"],
    glowColor: "rgba(37, 244, 238, 0.25)",
    filterName: "TikTok",
  },
  {
    platform: "youtube",
    name: "YouTube",
    iconPlatform: "youtube",
    badge: "Monetization Ready",
    startingPrice: "$0.05 / 1k (₨14)",
    speed: "Stable 24h pacing",
    services: ["4,000 Watch Hours", "Organic Subscribers", "High-Retention Views", "Comment Likes"],
    glowColor: "rgba(255, 0, 0, 0.25)",
    filterName: "YouTube",
  },
  {
    platform: "telegram",
    name: "Telegram",
    iconPlatform: "telegram",
    badge: "Zero Drop",
    startingPrice: "$0.003 / 1k (₨0.85)",
    speed: "Instant start",
    services: ["Public Channel Members", "Group Members", "Auto Post Views", "Message Reactions"],
    glowColor: "rgba(34, 158, 217, 0.25)",
    filterName: "Telegram",
  },
  {
    platform: "facebook",
    name: "Facebook",
    iconPlatform: "facebook",
    badge: "High Trust",
    startingPrice: "$0.004 / 1k (₨1.10)",
    speed: "0–15 min start",
    services: ["Page Follows & Likes", "Video & Reel Views", "Post Reactions", "Group Members"],
    glowColor: "rgba(24, 119, 242, 0.25)",
    filterName: "Facebook",
  },
  {
    platform: "spotify",
    name: "Spotify & Music",
    iconPlatform: "spotify",
    badge: "Algorithmic Royalty",
    startingPrice: "$0.45 / 1k (₨125)",
    speed: "Daily organic delivery",
    services: ["Tier 1 Country Streams", "Artist Followers", "Playlist Saves", "Monthly Listeners"],
    glowColor: "rgba(29, 185, 84, 0.25)",
    filterName: "Other",
  },
];

export function VisualPlatformBento({ onSelectPlatform }: { onSelectPlatform?: (platform: string) => void }) {
  return (
    <section className="w-full px-[clamp(1rem,4vw,2.5rem)] py-[clamp(3.5rem,6vw,5.5rem)] relative overflow-hidden bg-[#0c101d]">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="rounded-full border border-[#baff00]/25 bg-[#baff00]/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#baff00]">
            Wholesale Catalog
          </span>
          <h2 className="mt-4 text-fluid-h2 font-black tracking-tight text-white">
            Choose Your Platform &amp;{" "}
            <span className="bg-gradient-to-r from-[#baff00] via-lime-300 to-emerald-400 bg-clip-text text-transparent">
              Dominate the Feed
            </span>
          </h2>
          <p className="mt-3 text-fluid-body text-slate-400">
            Every service is directly connected to our high-capacity server clusters for unbeatable speed, wholesale rates, and 30-day refill guarantees.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_CARDS.map((card) => (
            <div
              key={card.platform}
              className="group relative rounded-3xl border border-slate-800 bg-[#111827] p-6 transition duration-300 hover:border-[#baff00]/40 hover:shadow-2xl hover:-translate-y-1 overflow-hidden"
              style={{
                boxShadow: `0 0 0 1px rgba(255,255,255,0.03)`,
              }}
            >
              {/* Dynamic hover glow in corner */}
              <div
                className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ backgroundColor: card.glowColor }}
              />

              {/* Card top */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Social3DIcon platform={card.iconPlatform} size={42} glow />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white group-hover:text-[#baff00] transition">
                      {card.name}
                    </h3>
                    <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                      ⚡ {card.speed}
                    </span>
                  </div>
                </div>

                <span className="rounded-full bg-[#baff00]/15 border border-[#baff00]/30 px-2.5 py-1 text-[10px] font-black text-[#baff00] uppercase">
                  {card.badge}
                </span>
              </div>

              {/* Starting rate banner */}
              <div className="mt-4 rounded-xl bg-[#0d131f] border border-slate-800/80 p-2.5 flex items-center justify-between text-xs">
                <span className="text-slate-400">Wholesale Rate:</span>
                <span className="font-extrabold text-[#baff00] font-mono">{card.startingPrice}</span>
              </div>

              {/* Services pills */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {card.services.map((svc) => (
                  <span
                    key={svc}
                    className="rounded-lg bg-slate-800/70 border border-slate-700/60 px-2.5 py-1 text-[11px] font-semibold text-slate-300"
                  >
                    {svc}
                  </span>
                ))}
              </div>

              {/* Action Link */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                <a
                  href="#services"
                  onClick={() => onSelectPlatform?.(card.filterName)}
                  className="text-xs font-bold text-[#baff00] hover:text-white flex items-center gap-1.5 transition"
                >
                  <span>Filter {card.name} Services</span>
                  <span>↓</span>
                </a>
                <Link
                  href="/signup"
                  className="rounded-lg bg-gradient-to-r from-[#baff00] to-lime-400 hover:from-lime-300 hover:to-lime-400 px-3.5 py-1.5 text-[11px] font-black text-black transition shadow-sm"
                >
                  Order Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
