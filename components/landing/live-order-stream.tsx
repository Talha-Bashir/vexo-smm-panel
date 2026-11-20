"use client";

import React, { useState, useEffect } from "react";
import { Social3DIcon } from "@/components/social-3d-icon";

interface StreamOrder {
  id: number;
  city: string;
  flag: string;
  platform: string;
  service: string;
  quantity: string;
  amount: string;
  timeAgo: string;
  latency: string;
}

const INITIAL_ORDERS: StreamOrder[] = [
  {
    id: 92841,
    city: "Lahore",
    flag: "🇵🇰",
    platform: "tiktok",
    service: "High-Retention TikTok Views",
    quantity: "15,000",
    amount: "₨33",
    timeAgo: "2s ago",
    latency: "38ms",
  },
  {
    id: 92842,
    city: "London",
    flag: "🇬🇧",
    platform: "instagram",
    service: "Instant Instagram Likes + Reach",
    quantity: "2,500",
    amount: "$0.38",
    timeAgo: "7s ago",
    latency: "45ms",
  },
  {
    id: 92843,
    city: "Karachi",
    flag: "🇵🇰",
    platform: "instagram",
    service: "Real Active Non-Drop Followers",
    quantity: "5,000",
    amount: "₨590",
    timeAgo: "14s ago",
    latency: "41ms",
  },
  {
    id: 92844,
    city: "Dubai",
    flag: "🇦🇪",
    platform: "youtube",
    service: "Monetization Watchtime Hours",
    quantity: "1,000",
    amount: "$2.10",
    timeAgo: "25s ago",
    latency: "52ms",
  },
  {
    id: 92845,
    city: "Islamabad",
    flag: "🇵🇰",
    platform: "telegram",
    service: "Telegram Channel Members (Zero Drop)",
    quantity: "3,000",
    amount: "₨294",
    timeAgo: "34s ago",
    latency: "36ms",
  },
  {
    id: 92846,
    city: "New York",
    flag: "🇺🇸",
    platform: "spotify",
    service: "USA Algorithmic Stream Plays",
    quantity: "10,000",
    amount: "$4.50",
    timeAgo: "48s ago",
    latency: "49ms",
  },
];

export function LiveOrderStream() {
  const [orders, setOrders] = useState<StreamOrder[]>(INITIAL_ORDERS);
  const [pulseCount, setPulseCount] = useState(14892);

  // Rotate new orders occasionally to simulate real-time live activity
  useEffect(() => {
    const CITIES = [
      { name: "Karachi", flag: "🇵🇰" },
      { name: "Lahore", flag: "🇵🇰" },
      { name: "Rawalpindi", flag: "🇵🇰" },
      { name: "Faisalabad", flag: "🇵🇰" },
      { name: "London", flag: "🇬🇧" },
      { name: "Dubai", flag: "🇦🇪" },
      { name: "Toronto", flag: "🇨🇦" },
      { name: "Sydney", flag: "🇦🇺" },
      { name: "Istanbul", flag: "🇹🇷" },
    ];

    const SERVICES = [
      { platform: "instagram", name: "Instagram Real Followers", qty: "2,000", pkr: "₨236", usd: "$0.84" },
      { platform: "tiktok", name: "TikTok Viral FYP Views", qty: "25,000", pkr: "₨55", usd: "$0.20" },
      { platform: "youtube", name: "YouTube 4k Watchtime", qty: "500", pkr: "₨292", usd: "$1.05" },
      { platform: "telegram", name: "Telegram Active Members", qty: "1,500", pkr: "₨147", usd: "$0.52" },
      { platform: "facebook", name: "Facebook Page Likes", qty: "3,000", pkr: "₨354", usd: "$1.26" },
    ];

    const interval = setInterval(() => {
      const city = CITIES[Math.floor(Math.random() * CITIES.length)];
      const svc = SERVICES[Math.floor(Math.random() * SERVICES.length)];
      const isPak = city.flag === "🇵🇰";

      const newOrder: StreamOrder = {
        id: Math.floor(92850 + Math.random() * 2000),
        city: city.name,
        flag: city.flag,
        platform: svc.platform,
        service: svc.name,
        quantity: svc.qty,
        amount: isPak ? svc.pkr : svc.usd,
        timeAgo: "Just now",
        latency: `${Math.floor(Math.random() * 25) + 30}ms`,
      };

      setOrders((prev) => [newOrder, ...prev.slice(0, 7)]);
      setPulseCount((prev) => prev + 1);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full border-y border-slate-800 bg-[#0a0f1d] py-3.5 px-4 overflow-hidden">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left header tag */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs font-black uppercase tracking-wider text-white">
            Live Global Dispatch:
          </span>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
            {pulseCount.toLocaleString()} Orders Today
          </span>
        </div>

        {/* Marquee ticker of orders */}
        <div className="relative w-full overflow-hidden flex-1 max-w-4xl">
          {/* Gradient fade edges */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-r from-[#0a0f1d] to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-[#0a0f1d] to-transparent" />

          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#111827]/80 px-3 py-1.5 shrink-0 transition hover:border-slate-700"
              >
                <Social3DIcon platform={ord.platform} size={15} />
                <span className="text-[11px] text-slate-300 font-bold whitespace-nowrap">
                  <span>{ord.flag}</span> <span className="text-white font-extrabold">{ord.city}</span>:
                </span>
                <span className="text-[11px] text-lime-300 font-semibold truncate max-w-[140px] sm:max-w-[190px]">
                  +{ord.quantity} {ord.service}
                </span>
                <span className="rounded bg-[#baff00]/15 border border-[#baff00]/30 px-1.5 py-0.5 text-[10px] font-bold text-[#baff00] font-mono">
                  {ord.amount}
                </span>
                <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                  {ord.timeAgo}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
