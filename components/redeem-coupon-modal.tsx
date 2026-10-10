"use client";

import { useState } from "react";

interface RedeemCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (prizePkr: number, message: string) => void;
}

export default function RedeemCouponModal({
  isOpen,
  onClose,
  onSuccess,
}: RedeemCouponModalProps) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError("Please enter a coupon code.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: cleanCode }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to redeem coupon.");
      }

      onSuccess(Number(data.prizePkr || 0), data.message);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to redeem coupon.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-[#baff00]/30 bg-[#111a1d] p-6 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_30px_rgba(186,255,0,0.15)] animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Hero Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#baff00] via-[#89f500] to-[#00ffcc] text-3xl shadow-[0_0_30px_rgba(186,255,0,0.4)]">
          <span>🎟️</span>
        </div>

        {/* Title & Desc */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#baff00]/40 bg-[#baff00]/10 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#baff00]">
            VEXARO REWARDS
          </div>
          <h3 className="mt-2 text-xl font-black text-white">
            Redeem Promotional Coupon
          </h3>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Enter your voucher or campaign promo code to claim free balance or promotional order credit.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Coupon Code
              </label>
              <span className="text-[10px] font-black text-[#baff00] bg-[#baff00]/10 px-2 py-0.5 rounded border border-[#baff00]/20 tracking-wider">
                🎟️ PROMO
              </span>
            </div>
            <div>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError("");
                }}
                placeholder="e.g. WELCOME50"
                autoFocus
                className="w-full rounded-xl border border-[#baff00]/30 bg-[#0b1316] px-4 py-3 font-mono text-base font-bold tracking-widest uppercase text-white placeholder-slate-600 outline-none transition focus:border-[#baff00] focus:ring-2 focus:ring-[#baff00]/20 sm:text-sm"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              New to VEXARO? Try using coupon <strong className="text-[#baff00]">WELCOME50</strong>!
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-300">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !code.trim()}
              className="flex-1 rounded-xl bg-[#baff00] py-2.5 text-xs font-black text-[#07100f] shadow-[0_0_20px_rgba(186,255,0,0.3)] hover:bg-[#d2ff5a] disabled:opacity-50 transition cursor-pointer"
            >
              {submitting ? "Checking Code..." : "Redeem Voucher →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
