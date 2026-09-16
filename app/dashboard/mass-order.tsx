"use client";

import { useMemo, useState } from "react";

type Service = {
  id: number;
  platform: string;
  icon: string;
  name: string;
  type?: string;
  price: string;
  min: string;
  max: string;
  category: string;
};

interface OrderResultItem {
  lineNumber: number;
  serviceId: string;
  serviceName: string;
  link: string;
  quantity: number;
  chargePkr: number;
  status: "Success" | "Failed";
  orderId?: string;
  vexoOrderId?: string;
  error?: string;
}

interface MassOrderBatchResponse {
  success: boolean;
  totalLines: number;
  successfulCount: number;
  failedCount: number;
  totalChargedPkr: number;
  balancePkr: number;
  results: OrderResultItem[];
  error?: string;
}

interface MassOrderPageProps {
  services: Service[];
  walletBalancePkr: number;
  onOrdersCreated: () => void;
  navigate: (page: string) => void;
}

export function MassOrderPage({
  services,
  walletBalancePkr,
  onOrdersCreated,
  navigate,
}: MassOrderPageProps) {
  const [inputText, setInputText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [batchResult, setBatchResult] = useState<MassOrderBatchResponse | null>(null);

  // Quick lookup map for services to compute live client-side estimate
  const serviceMap = useMemo(() => {
    const map = new Map<string, Service>();
    services.forEach((s) => map.set(String(s.id), s));
    return map;
  }, [services]);

  // Live client-side parsing analysis
  const stats = useMemo(() => {
    if (!inputText.trim()) {
      return { totalLines: 0, validLines: 0, estimatedPkr: 0 };
    }

    const lines = inputText.split("\n").map((l) => l.trim()).filter(Boolean);
    let valid = 0;
    let estimatedCost = 0;

    for (const line of lines) {
      let parts: string[] = [];
      if (line.includes("|")) {
        parts = line.split("|").map((p) => p.trim());
      } else if (line.includes(",")) {
        parts = line.split(",").map((p) => p.trim());
      } else {
        const tokens = line.split(/\s+/).filter(Boolean);
        if (tokens.length >= 3) {
          parts = [tokens[0], tokens.slice(1, tokens.length - 1).join(" "), tokens[tokens.length - 1]];
        }
      }

      if (parts.length >= 3) {
        const sId = parts[0];
        const qty = Number(parts[2]);
        if (/^\d+$/.test(sId) && Number.isInteger(qty) && qty > 0) {
          valid++;
          const foundService = serviceMap.get(sId);
          if (foundService) {
            const unitRatePkr = Number(foundService.price) || 0;
            const isPackage =
              foundService.type?.toLowerCase() === "package" ||
              (Number(foundService.min) === 1 && Number(foundService.max) === 1);
            const lineCharge = isPackage ? unitRatePkr * qty : (unitRatePkr * qty) / 1000;
            estimatedCost += lineCharge;
          }
        }
      }
    }

    return {
      totalLines: lines.length,
      validLines: valid,
      estimatedPkr: Math.round(estimatedCost * 100) / 100,
    };
  }, [inputText, serviceMap]);

  function insertSample() {
    const firstService = services[0]?.id || 101;
    const secondService = services[1]?.id || 102;
    setInputText(
      `${firstService} | https://instagram.com/p/SamplePost1 | 1000\n` +
      `${secondService} | https://tiktok.com/@sampleuser/video/123 | 500\n` +
      `${firstService} | https://instagram.com/p/SamplePost2 | 2000`
    );
    setErrorMessage("");
    setBatchResult(null);
  }

  async function handleBatchSubmit() {
    if (!inputText.trim()) {
      setErrorMessage("Please enter your mass orders in the textarea below.");
      return;
    }

    if (stats.validLines === 0) {
      setErrorMessage("None of the lines match the required format: service_id | link | quantity");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/order/mass", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ orders: inputText }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Unable to process mass orders. Please check your balance and try again.");
        return;
      }

      setBatchResult(data);
      onOrdersCreated();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Network error while submitting mass orders.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#0d171a] p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#baff00]/20 bg-[#baff00]/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#baff00]">
            ⚡ Bulk Processing Engine
          </div>
          <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Mass Order Placement</h1>
          <p className="mt-1 text-sm text-slate-400">
            Submit up to 300 orders at once. Automated balance reservation with automatic refunds for failed lines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your Balance</p>
            <p className="text-lg font-black text-[#baff00]">₨{walletBalancePkr.toLocaleString()}</p>
          </div>
          <button
            onClick={() => navigate("Add Funds")}
            className="rounded-2xl bg-white/10 px-4 py-3 text-xs font-black text-white hover:bg-white/20 transition"
          >
            + Add Funds
          </button>
        </div>
      </div>

      {/* Guidelines & Input Card */}
      <div className="rounded-3xl border border-white/10 bg-[#0d171a] p-6">
        <div className="flex flex-col gap-3 pb-4 border-b border-white/10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-black text-white">Order Format Specification</h2>
            <p className="text-xs text-slate-400">
              Enter one order per line: <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[#baff00]">service_id | link | quantity</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={insertSample}
              type="button"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-[#baff00]/40 hover:text-[#baff00] transition"
            >
              📋 Insert Sample Format
            </button>
            <button
              onClick={() => {
                setInputText("");
                setBatchResult(null);
                setErrorMessage("");
              }}
              type="button"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Textarea */}
        <div className="mt-4">
          <textarea
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (errorMessage) setErrorMessage("");
            }}
            rows={10}
            placeholder={`102 | https://instagram.com/p/PostId1 | 1000\n105 | https://tiktok.com/@username/video/123 | 500\n102 | https://instagram.com/p/PostId2 | 2000`}
            className="w-full rounded-2xl border border-white/10 bg-[#07100f] p-4 font-mono text-sm leading-6 text-white placeholder:text-slate-600 outline-none focus:border-[#baff00]/50 transition"
          />
        </div>

        {/* Live Status Bar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs">
          <div className="flex items-center gap-4 text-slate-400">
            <span>
              Lines Entered: <b className="text-white">{stats.totalLines}</b>
            </span>
            <span>
              Valid Syntax: <b className="text-[#baff00]">{stats.validLines}</b>
            </span>
            {stats.estimatedPkr > 0 && (
              <span>
                Est. Total: <b className="text-white font-bold">₨{stats.estimatedPkr.toLocaleString()}</b>
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-500">
            Separators accepted: Pipe (<code>|</code>), Comma (<code>,</code>), or Spaces
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <b>Error:</b> {errorMessage}
          </div>
        )}

        {/* Submit Button */}
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            onClick={() => navigate("Services")}
            type="button"
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-300 hover:text-white transition"
          >
            Browse Service IDs
          </button>
          <button
            onClick={handleBatchSubmit}
            disabled={submitting || stats.validLines === 0}
            className="flex items-center gap-2 rounded-2xl bg-[#baff00] px-6 py-3 text-sm font-black text-[#07100f] transition hover:bg-[#d2ff5a] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_24px_rgba(186,255,0,0.2)]"
          >
            {submitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Processing Orders...</span>
              </>
            ) : (
              <span>⚡ Place {stats.validLines > 0 ? `${stats.validLines} Mass Orders` : "Mass Orders"}</span>
            )}
          </button>
        </div>
      </div>

      {/* Batch Execution Results Modal / Card */}
      {batchResult && (
        <div className="rounded-3xl border border-[#baff00]/30 bg-[#0d171a] p-6 shadow-2xl shadow-black/40 animate-fadeIn">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[#baff00]">Batch Completed</p>
              <h3 className="text-xl font-black text-white">Execution Summary</h3>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 font-bold text-emerald-300">
                ✅ {batchResult.successfulCount} Placed
              </span>
              {batchResult.failedCount > 0 && (
                <span className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-1.5 font-bold text-red-300">
                  ❌ {batchResult.failedCount} Failed
                </span>
              )}
              <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 font-bold text-slate-300">
                Total Charged: ₨{batchResult.totalChargedPkr.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Results Table */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-white/[0.02] text-slate-400">
                <tr>
                  <th className="py-3 px-4">Line #</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Link / Target</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Charge</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Order ID / Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {batchResult.results.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-400">#{item.lineNumber}</td>
                    <td className="py-3.5 px-4">
                      <b className="text-white">{item.serviceName}</b>
                      <p className="font-mono text-[10px] text-slate-500">ID: {item.serviceId}</p>
                    </td>
                    <td className="py-3.5 px-4 max-w-[220px] truncate font-mono text-slate-300" title={item.link}>
                      {item.link}
                    </td>
                    <td className="py-3.5 px-4 font-black text-white">{item.quantity.toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-bold text-[#baff00]">
                      {item.chargePkr > 0 ? `₨${item.chargePkr.toLocaleString()}` : "₨0"}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.status === "Success" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-bold text-emerald-400">
                          ✅ Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 font-bold text-red-400">
                          ❌ Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {item.orderId ? (
                        <span className="font-bold text-white">#{item.orderId}</span>
                      ) : (
                        <span className="text-red-300 text-[11px]">{item.error || "Order failed"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={() => navigate("Orders")}
              className="rounded-2xl bg-[#baff00] px-5 py-2.5 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] transition"
            >
              View in Orders History →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
