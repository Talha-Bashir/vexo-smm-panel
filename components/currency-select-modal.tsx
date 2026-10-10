"use client";

import { useState, useEffect, useMemo } from "react";

export interface CurrencyItem {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

export const POPULAR_CURRENCIES = ["PKR", "USD", "AED", "SAR", "INR", "EUR", "GBP"];

export const ALL_CURRENCIES: CurrencyItem[] = [
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨", flag: "🇵🇰" },
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", flag: "🇸🇦" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧" },
  { code: "CAD", name: "Canadian Dollar", symbol: "$", flag: "🇨🇦" },
  { code: "AUD", name: "Australian Dollar", symbol: "$", flag: "🇦🇺" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵" },
  { code: "QAR", name: "Qatari Riyal", symbol: "﷼", flag: "🇶🇦" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك", flag: "🇰🇼" },
  { code: "BHD", name: "Bahraini Dinar", symbol: ".د.ب", flag: "🇧🇭" },
  { code: "OMR", name: "Omani Rial", symbol: "﷼", flag: "🇴🇲" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", flag: "🇹🇷" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", flag: "🇲🇾" },
  { code: "SGD", name: "Singapore Dollar", symbol: "$", flag: "🇸🇬" },
  { code: "THB", name: "Thai Baht", symbol: "฿", flag: "🇹🇭" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", flag: "🇮🇩" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£", flag: "🇪🇬" },
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "$", flag: "🇳🇿" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", flag: "🇨🇭" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", flag: "🇸🇪" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", flag: "🇳🇴" },
  { code: "DKK", name: "Danish Krone", symbol: "kr", flag: "🇩🇰" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", flag: "🇷🇺" },
  { code: "KRW", name: "South Korean Won", symbol: "₩", flag: "🇰🇷" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", flag: "🇧🇷" },
];

interface CurrencySelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCurrency: string;
  onSelectCurrency: (code: string) => void;
  rates?: Record<string, number>;
}

export default function CurrencySelectModal({
  isOpen,
  onClose,
  selectedCurrency,
  onSelectCurrency,
  rates = {},
}: CurrencySelectModalProps) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filteredCurrencies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALL_CURRENCIES;
    return ALL_CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [search]);

  if (!isOpen) return null;

  const handleSelect = (code: string) => {
    onSelectCurrency(code);
    try {
      localStorage.setItem("vexo_currency", code);
    } catch {}
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[#0f191b] p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_40px_rgba(186,255,0,0.1)] flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
          aria-label="Close currency selection"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pr-8 pb-3 border-b border-white/10">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#baff00]/15 text-2xl font-black text-[#baff00] border border-[#baff00]/30 shadow-[0_0_15px_rgba(186,255,0,0.2)]">
            💱
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              Select Display Currency
            </h3>
            <p className="text-xs text-slate-300">
              Service prices & wallet balance will calculate automatically in real-time.
            </p>
          </div>
        </div>

        {/* Quick Popular Picks */}
        {!search && (
          <div className="mt-3.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
              Popular Currencies
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {POPULAR_CURRENCIES.map((code) => {
                const item = ALL_CURRENCIES.find((c) => c.code === code);
                if (!item) return null;
                const isSelected = selectedCurrency === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleSelect(code)}
                    className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? "bg-[#baff00] text-[#07100f] font-black shadow-sm"
                        : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/15 hover:text-white"
                    }`}
                  >
                    <span>{item.flag}</span>
                    <span>{item.code}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Input */}
        <div className="mt-3.5 relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search currency by name or code (e.g. USD, EUR, PKR)..."
            className="h-11 w-full rounded-xl border border-white/15 bg-[#07100f] pl-10 pr-9 text-xs sm:text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#baff00]/50 focus:ring-1 focus:ring-[#baff00]/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white transition cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Scrollable Currency List */}
        <div className="mt-3 overflow-y-auto space-y-1.5 pr-1 max-h-[46vh]">
          {filteredCurrencies.length === 0 ? (
            <div className="py-10 text-center text-xs sm:text-sm text-slate-400">
              <p>No currencies found matching &quot;{search}&quot;</p>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-2 text-xs font-bold text-[#baff00] hover:underline cursor-pointer"
              >
                Clear search filter
              </button>
            </div>
          ) : (
            filteredCurrencies.map((item) => {
              const isSelected = selectedCurrency === item.code;
              const rate = rates[item.code];

              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleSelect(item.code)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition text-left cursor-pointer ${
                    isSelected
                      ? "border-[#baff00]/60 bg-[#baff00]/15 text-white ring-1 ring-[#baff00]/30 shadow-md"
                      : "border-white/5 bg-white/[0.03] text-slate-200 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl sm:text-2xl shrink-0 leading-none">
                      {item.flag}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-white tracking-wide">
                          {item.code}
                        </span>
                        <span className="font-mono text-xs text-[#baff00] font-bold">
                          ({item.symbol})
                        </span>
                        {isSelected && (
                          <span className="rounded-full bg-[#baff00] px-2 py-0.5 text-[9px] font-black uppercase text-[#07100f]">
                            ✓ Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 truncate mt-0.5">
                        {item.name}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-3">
                    {item.code === "PKR" ? (
                      <span className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-200">
                        Base Currency
                      </span>
                    ) : rate ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-mono text-slate-200 font-semibold">
                          1 {item.code} ≈ ₨{rate.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-slate-300">Forex rate</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-mono">Live Rate</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#baff00] animate-pulse" />
            Automatic real-time conversion
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
