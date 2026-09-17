"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("VEXARO Application Error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#07100f] text-white flex items-center justify-center p-4 selection:bg-[#baff00]/20 selection:text-[#baff00]">
      <div className="w-full max-w-lg rounded-3xl border border-rose-500/20 bg-[#0c1618]/90 p-8 sm:p-10 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-2xl font-black text-rose-400 ring-1 ring-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.15)]">
          ⚠️
        </div>
        
        <h1 className="mt-6 text-2xl sm:text-3xl font-black text-white tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-slate-400 leading-relaxed">
          An unexpected error occurred while processing your request. Please try reloading or contact our 24/7 support team.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto rounded-xl bg-[#baff00] px-6 py-3 text-sm font-black text-[#07100f] transition hover:bg-[#a6e600] shadow-[0_0_20px_rgba(186,255,0,0.2)] cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10"
          >
            Go to Home
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-4 text-xs text-slate-500">
          <a href="https://wa.me/923176437013" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition">WhatsApp Support</a>
          <span>•</span>
          <a href="https://t.me/VexaroSMMAdmin" target="_blank" rel="noreferrer" className="hover:text-[#229ed9] transition">Telegram Admin</a>
        </div>
      </div>
    </main>
  );
}
