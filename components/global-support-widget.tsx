"use client";

import { useState, useEffect, useRef } from "react";

export function GlobalSupportWidget() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-20 md:bottom-5 lg:bottom-6 right-3 sm:right-5 lg:right-6 z-50 flex flex-col items-end print:hidden select-none"
    >
      {/* Help Popup Drawer */}
      {open && (
        <div className="mb-3.5 w-[clamp(18rem,90vw,22.5rem)] rounded-[26px] border border-[#25d366]/30 bg-[#091316]/95 p-5 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(37,211,102,0.18)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200">
          {/* Header with Admin Presence */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#128c3e] to-[#25d366] text-sm font-black text-[#07100f] shadow-[0_0_15px_rgba(37,211,102,0.4)]">
                TB
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#baff00] opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#baff00] border-2 border-[#091316]" />
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    Talha Bashir
                  </h4>
                  <span className="rounded-full bg-[#baff00]/20 px-1.5 py-0.2 text-[9px] font-extrabold text-[#baff00] border border-[#baff00]/30">
                    Lead Admin
                  </span>
                </div>
                <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                  Online Now · Typical reply &lt; 5 mins
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
              aria-label="Close support dialog"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-300">
            Need instant balance approval, order tracking assistance, or wholesale custom reseller rates? Reach out directly:
          </p>

          <div className="mt-4 flex flex-col gap-2.5">
            {/* WhatsApp Direct */}
            <a
              href="https://wa.me/923176437013"
              target="_blank"
              rel="noreferrer"
              className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-[#25d366] to-[#20ba5a] p-3 text-[#07100f] shadow-[0_6px_20px_rgba(37,211,102,0.35)] hover:shadow-[0_8px_25px_rgba(37,211,102,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#07100f]/15">
                  <svg className="h-5 w-5 text-[#07100f]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347m-5.421 7.403" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-black tracking-tight">WhatsApp Direct Support</div>
                  <div className="text-[10px] font-bold text-[#07100f]/80">+92 317 6437013 · Instant</div>
                </div>
              </div>
              <span className="text-xs font-black opacity-80 group-hover:translate-x-0.5 transition-transform">→</span>
            </a>

            {/* WhatsApp Channel */}
            <a
              href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q"
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-slate-200 hover:border-[#25d366]/40 hover:bg-[#25d366]/10 hover:text-white transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-base">📢</span>
                <div>
                  <div className="text-xs font-bold">Official WhatsApp Channel</div>
                  <div className="text-[10px] text-slate-400">Daily price drops &amp; speed updates</div>
                </div>
              </div>
              <span className="text-xs text-slate-400 group-hover:text-white transition">↗</span>
            </a>

            {/* Telegram Support */}
            <a
              href="https://t.me/VexaroSMMAdmin"
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between gap-3 rounded-xl border border-[#2aa8e8]/30 bg-[#2aa8e8]/10 p-2.5 text-[#2aa8e8] hover:bg-[#2aa8e8] hover:text-white transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2aa8e8]/20 group-hover:bg-white/20 transition">
                  <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.128.832.942z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold">Telegram Support Desk</div>
                  <div className="text-[10px] opacity-80">@VexaroSMMAdmin</div>
                </div>
              </div>
              <span className="text-xs opacity-80 group-hover:opacity-100 transition">↗</span>
            </a>
          </div>

          <div className="mt-3.5 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
            <span>🛡️ 100% Guaranteed Human Support</span>
            <span className="text-emerald-400 font-bold">7 Days a Week</span>
          </div>
        </div>
      )}

      {/* Stylized Floating Support Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="group relative flex items-center gap-2 rounded-full p-1.5 sm:p-2 bg-[#091316]/95 border border-[#25d366]/40 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(37,211,102,0.35)] hover:border-[#baff00] hover:shadow-[0_15px_45px_rgba(37,211,102,0.55),0_0_30px_rgba(186,255,0,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
        aria-label="Open 24/7 customer support"
        title="24/7 Live WhatsApp & Telegram Support"
      >
        {/* Breathing glowing ambient aura */}
        <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#25d366] via-[#10b981] to-[#baff00] opacity-35 blur-sm group-hover:opacity-75 transition duration-500 animate-pulse" />

        {/* Circular Icon Orb */}
        <span className="relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[#128c3e] via-[#25d366] to-[#2ecc71] text-[#07100f] shadow-[0_4px_16px_rgba(37,211,102,0.45)]">
          {/* Double-ring pulsing online dot */}
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#baff00] opacity-80" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#baff00] border-2 border-[#091316]" />
          </span>

          {open ? (
            <svg className="h-5 w-5 text-[#07100f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.8} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6 text-[#07100f]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 012.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 01-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09s.9 2.43 1.03 2.6c.13.17 1.76 2.69 4.27 3.77.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.22-.16-.47-.29z" />
            </svg>
          )}
        </span>

        {/* Text Pill only on xl+ viewports so standard laptops (< xl) have zero horizontal obstruction */}
        <div className="hidden xl:flex flex-col text-left pr-2 relative">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black tracking-tight text-white group-hover:text-[#baff00] transition-colors">
              {open ? "Close Support" : "24/7 Support"}
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 leading-tight">
            ● Online Now
          </span>
        </div>

        {/* Floating Tooltip for screens < xl on hover */}
        <div className="xl:hidden absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-[#091316]/95 border border-[#25d366]/40 text-xs font-bold text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
          24/7 WhatsApp Support
        </div>
      </button>
    </div>
  );
}
