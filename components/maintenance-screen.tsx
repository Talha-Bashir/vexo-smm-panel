"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface MaintenanceScreenProps {
  message?: string;
  whatsappNumber?: string;
  telegramUsername?: string;
  supportEmail?: string;
}

export function MaintenanceScreen({
  message = "We are currently performing scheduled maintenance to upgrade our servers and provider networks. We will be back online shortly!",
  whatsappNumber = "923197008275",
  telegramUsername = "VexaroSMMAdmin",
  supportEmail = "support@vexarosmm.com",
}: MaintenanceScreenProps) {
  const [refreshing, setRefreshing] = useState(false);

  const cleanWhatsapp = (whatsappNumber || "923197008275").replace(/[^0-9]/g, "");
  const cleanTelegram = (telegramUsername || "VexaroSMMAdmin").replace(/^@/, "");

  const handleRefresh = () => {
    setRefreshing(true);
    window.location.reload();
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between bg-[#07100f] text-slate-100 overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      {/* Background radial gradients */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-[400px] w-[400px] rounded-full bg-emerald-500/10 blur-[130px]" />

      {/* Header Logo */}
      <header className="relative z-10 flex items-center gap-3">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-2 shadow-lg backdrop-blur-md">
          <Image
            src="/logo.png"
            alt="VEXARO SMM"
            width={40}
            height={40}
            className="h-full w-full object-contain"
            priority
          />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-black tracking-wider text-white">VEXARO SMM</span>
          <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400">System Upgrade</span>
        </div>
      </header>

      {/* Main Maintenance Box */}
      <main className="relative z-10 my-auto max-w-xl w-full text-center">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-black tracking-wide text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)] mb-6 animate-pulse">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
          <span>SCHEDULED MAINTENANCE IN PROGRESS</span>
        </div>

        {/* Big Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
          We&apos;ll Be Back <br />
          <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-[#baff00] bg-clip-text text-transparent">
            Online Shortly
          </span>
        </h1>

        {/* Admin Message */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-[#0e181a]/80 p-5 backdrop-blur-md shadow-xl text-left sm:text-center">
          <p className="text-sm sm:text-base font-medium text-slate-300 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Real-time Status Tiles */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="rounded-xl border border-white/10 bg-[#0b1416]/60 p-3.5 backdrop-blur-sm">
            <div className="text-base">⚡</div>
            <div className="mt-1 text-xs font-black text-white">Infrastructure</div>
            <div className="text-[11px] text-slate-400">High-speed provider optimization</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0b1416]/60 p-3.5 backdrop-blur-sm">
            <div className="text-base">🛡️</div>
            <div className="mt-1 text-xs font-black text-white">Account Safety</div>
            <div className="text-[11px] text-emerald-400 font-semibold">100% Funds &amp; Data Protected</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0b1416]/60 p-3.5 backdrop-blur-sm">
            <div className="text-base">📦</div>
            <div className="mt-1 text-xs font-black text-white">Active Orders</div>
            <div className="text-[11px] text-slate-400">Queued &amp; executing automatically</div>
          </div>
        </div>

        {/* Action Controls & Contact */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-xs sm:text-sm font-black text-[#07100f] hover:bg-amber-300 active:scale-95 transition shadow-[0_0_25px_rgba(251,191,36,0.3)] cursor-pointer"
          >
            <span>{refreshing ? "Checking..." : "🔄 Check System Status"}</span>
          </button>

          {cleanWhatsapp && (
            <a
              href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent("Hello Vexaro Team, I am inquiring regarding the scheduled maintenance.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm font-black text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition"
            >
              <span>💬 WhatsApp Support</span>
            </a>
          )}

          {cleanTelegram && (
            <a
              href={`https://t.me/${cleanTelegram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-xs sm:text-sm font-black text-sky-300 hover:bg-sky-500/20 active:scale-95 transition"
            >
              <span>✈️ Telegram Channel</span>
            </a>
          )}
        </div>

        {supportEmail && (
          <p className="mt-4 text-[11px] text-slate-400">
            For urgent inquiries:{" "}
            <a href={`mailto:${supportEmail}`} className="text-slate-300 underline hover:text-white">
              {supportEmail}
            </a>
          </p>
        )}
      </main>

      {/* Footer & Discreet Staff Access */}
      <footer className="relative z-10 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 w-full max-w-4xl border-t border-white/5 pt-6 text-[11px] text-slate-400">
        <div>
          &copy; {new Date().getFullYear()} VEXARO SMM Panel. All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-amber-400 font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
            Maintenance Mode Active
          </span>
          <span className="text-white/20">|</span>
          <Link
            href="/login"
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:border-amber-400/40 hover:text-white transition"
          >
            <span>🔐 Staff &amp; Admin Access</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
